'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Download, RotateCcw, Pause, Play, Plus, Minus, ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';

type View = 'perspective' | 'front' | 'apron' | 'side' | 'entrance' | 'corridor';
type Actions = { view: (view: View) => void; zoom: (scale: number) => void; rotate: (angle: number) => void; auto: (value: boolean) => void };
const VIEWS: { id: View; label: string }[] = [
  { id: 'perspective', label: 'Perspektif' }, { id: 'front', label: 'Sisi depan' },
  { id: 'apron', label: 'Sisi apron' }, { id: 'side', label: 'Lengkung atap' },
  { id: 'entrance', label: 'Kanopi depan' }, { id: 'corridor', label: 'Selasar' },
];

export default function TerminalViewer() {
  const host = useRef<HTMLDivElement>(null);
  const actions = useRef<Actions | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [auto, setAuto] = useState(false);
  const [view, setView] = useState<View>('perspective');

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      queueMicrotask(() => setStatus('error'));
      return;
    }
    let disposed = false, visible = true, frame = 0, dirty = true;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3f3');
    const camera = new THREE.PerspectiveCamera(37, 1, 1, 1400);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 80;
    controls.maxDistance = 570;
    controls.minPolarAngle = 0.12;
    controls.maxPolarAngle = Math.PI / 2 - 0.035;
    controls.autoRotateSpeed = 0.6;
    controls.target.set(0, 4, 6);
    scene.add(new THREE.HemisphereLight('#effbff', '#798c85', 2.8));
    const sun = new THREE.DirectionalLight('#fff3dc', 3.8);
    sun.position.set(-80, 150, 70); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -155, right: 155, top: 155, bottom: -155, near: 1, far: 440 });
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = 0.35;
    sun.shadow.bias = -0.001;
    scene.add(sun);

    function render() {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      if (controls.update() || dirty || controls.autoRotate) {
        renderer.render(scene, camera); dirty = false;
      }
      frame = requestAnimationFrame(render);
    }
    function wake() { dirty = true; if (!frame) frame = requestAnimationFrame(render); }
    function setView(next: View) {
      controls.autoRotate = false;
      setAuto(false);
      const closeUp = next === 'entrance' || next === 'corridor';
      controls.minDistance = closeUp ? 8 : 80;
      controls.maxPolarAngle = closeUp ? Math.PI / 2 : Math.PI / 2 - 0.035;
      camera.near = closeUp ? 0.15 : 1;
      camera.updateProjectionMatrix();
      if (closeUp) {
        if (next === 'corridor') {
          controls.target.set(18, 3, 45.4);
          camera.position.set(61, 3.25, 49.3);
        } else {
          controls.target.set(8, 4.4, 42);
          camera.position.set(63, 13, camera.aspect < 0.85 ? 116 : 96);
        }
        camera.lookAt(controls.target); controls.update(); wake();
        return;
      }
      controls.target.set(0, 4, 6);
      // Kamera dijauhkan pada layar tegak agar seluruh terminal tetap terlihat.
      const distance = camera.aspect < 0.85 ? 440 : 300;
      const positions = {
        perspective: new THREE.Vector3(0.67, 0.5, 0.78), front: new THREE.Vector3(0, 0.35, 1),
        apron: new THREE.Vector3(-0.3, 0.48, -1), side: new THREE.Vector3(1, 0.26, 0.15),
      };
      camera.position.copy(positions[next].normalize().multiplyScalar(distance).add(controls.target));
      camera.lookAt(controls.target); controls.update(); wake();
    }
    function resize() {
      const { width, height } = element!.getBoundingClientRect();
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix(); renderer.setSize(width, height); wake();
    }
    resize();
    // Inisialisasi ditunda agar perubahan state tidak berjalan langsung di efek.
    queueMicrotask(() => { if (!disposed) setView('perspective'); });
    const observer = new ResizeObserver(resize); observer.observe(element);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; wake(); });
    intersection.observe(element);
    document.addEventListener('visibilitychange', wake);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function stopAuto() { controls.autoRotate = false; setAuto(false); wake(); }
    function motionChanged() { if (reducedMotion.matches) stopAuto(); }
    reducedMotion.addEventListener('change', motionChanged);
    controls.addEventListener('start', stopAuto);
    actions.current = {
      view: setView,
      zoom: scale => { const offset = camera.position.clone().sub(controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * scale, controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(offset); wake(); },
      rotate: angle => { camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(controls.target); wake(); },
      auto: value => { controls.autoRotate = value; wake(); },
    };
    function disposeObject(object: THREE.Object3D) {
      const materials = new Set<THREE.Material>();
      object.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
        }
      });
      materials.forEach(material => material.dispose());
    }
    new GLTFLoader().load('/models/apt-pranoto.glb', gltf => {
      if (disposed) { disposeObject(gltf.scene); return; }
      gltf.scene.traverse(child => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
      scene.add(gltf.scene); renderer.shadowMap.needsUpdate = true;
      setStatus('ready'); wake();
    }, undefined, () => { if (!disposed) setStatus('error'); });
    wake();
    return () => {
      disposed = true; cancelAnimationFrame(frame); actions.current = null;
      observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', wake);
      reducedMotion.removeEventListener('change', motionChanged);
      controls.dispose(); disposeObject(scene); sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  const button = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-40';
  const ready = status === 'ready';
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2" aria-label="Sudut pandang">
          {VIEWS.map(item => <button key={item.id} type="button" disabled={!ready} aria-pressed={view === item.id} className={`${button} ${view === item.id ? '!border-sky-600 !bg-sky-50 !text-sky-800' : ''}`} onClick={() => { setView(item.id); actions.current?.view(item.id); }}>{item.label}</button>)}
        </div>
        <a href="/models/apt-pranoto.glb" download className={button}><Download size={16} /> Unduh GLB</a>
      </div>
      <div className="relative">
        <div ref={host} className="h-[450px] w-full overflow-hidden sm:h-[580px]" tabIndex={0} role="region" aria-label="Model 3D terminal. Gunakan panah kiri atau kanan untuk memutar, tombol plus dan minus untuk zoom." onKeyDown={event => {
          if (event.target !== event.currentTarget || !ready) return;
          if (['ArrowLeft', 'ArrowRight', '+', '=', '-'].includes(event.key)) {
            event.preventDefault();
            if (event.key.startsWith('Arrow')) actions.current?.rotate(event.key === 'ArrowLeft' ? -0.16 : 0.16);
            else actions.current?.zoom(event.key === '-' ? 1.12 : 0.88);
          }
        }} />
        {status !== 'ready' && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 p-8 text-center text-slate-600">
          {status === 'loading' ? <><LoaderCircle className="animate-spin" />Memuat model terminal…</> : <><p>Model 3D tidak dapat ditampilkan. Periksa koneksi dan dukungan WebGL peramban Anda.</p><p>Berkas GLB tetap tersedia melalui tombol unduh.</p></>}
        </div>}
        <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600">APT PRANOTO · MODEL KONSEP</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white p-4">
        <p className="max-w-sm text-sm text-slate-500">Seret untuk memutar. Gulir atau cubit dua jari untuk memperbesar.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!ready} className={button} aria-label="Putar ke kiri" onClick={() => actions.current?.rotate(-0.2)}><ArrowLeft size={17} /></button>
          <button type="button" disabled={!ready} className={button} aria-label="Putar ke kanan" onClick={() => actions.current?.rotate(0.2)}><ArrowRight size={17} /></button>
          <button type="button" disabled={!ready} className={button} aria-label="Perkecil" onClick={() => actions.current?.zoom(1.15)}><Minus size={17} /></button>
          <button type="button" disabled={!ready} className={button} aria-label="Perbesar" onClick={() => actions.current?.zoom(0.85)}><Plus size={17} /></button>
          <button type="button" disabled={!ready} className={button} aria-pressed={auto} onClick={() => { actions.current?.auto(!auto); setAuto(!auto); }}>{auto ? <Pause size={17} /> : <Play size={17} />}{auto ? 'Jeda' : 'Putar otomatis'}</button>
          <button type="button" disabled={!ready} className={button} aria-label="Atur ulang tampilan" onClick={() => { actions.current?.auto(false); setAuto(false); setView('perspective'); actions.current?.view('perspective'); }}><RotateCcw size={17} /></button>
        </div>
      </div>
    </div>
  );
}
