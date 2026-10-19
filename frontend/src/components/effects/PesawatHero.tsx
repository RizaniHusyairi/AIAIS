'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Pesawat 3D yang melayang di langit hero beranda.
 *
 * Modelnya `public/models/pesawat_biru.glb`, diekspor dari
 * `asset/pesawat_biru.blend` dengan roda dibuang (pesawat sedang terbang) dan
 * gelombang ekor di-bake menjadi tekstur — node Math prosedural di Blender
 * tidak terbawa ke glTF.
 *
 * Alur geraknya: masuk dari kiri bawah seperti baru lepas landas, lalu
 * menjelajah di tempat dengan ayunan naik-turun dan kemiringan halus.
 * Kursor memiringkannya sedikit; menggulir halaman membuatnya menanjak keluar
 * dari hero.
 *
 * Catatan desain:
 *   - Hanya dirender di layar `lg` ke atas. Di bawahnya hero bertumpuk satu
 *     kolom sehingga tidak ada langit kosong, dan ponsel dilayani PWA.
 *   - three.js dimuat dinamis supaya tidak membebani bundel awal beranda.
 *   - Dengan "kurangi gerak", pesawat digambar diam di posisi jelajahnya.
 *   - Loop berhenti saat hero keluar layar atau tab tidak aktif.
 */

/** Posisi jelajah sebagai pecahan lebar/tinggi hero — langit di atas menara. */
const POS_X = 0.5;
const POS_Y = 0.15;
const MASUK_MS = 2800;

export default function PesawatHero({ className = '' }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [layarLebar, setLayarLebar] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setLayarLebar(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !layarLebar) return;

    let batal = false;
    let bersihkan: (() => void) | undefined;

    (async () => {
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      if (batal) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        // Tanpa WebGL hero tetap utuh; pesawat sekadar hiasan.
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      host.appendChild(canvas);

      const scene = new THREE.Scene();
      // FOV sempit agar pesawat tidak terdistorsi saat berada jauh dari tengah layar.
      const camera = new THREE.PerspectiveCamera(20, 1, 1, 400);
      camera.position.set(0, 0, 120);

      scene.add(new THREE.HemisphereLight('#eaf4ff', '#7d8fb0', 2.2));
      // Matahari dari kiri atas, searah cahaya foto langit di belakangnya.
      const sun = new THREE.DirectionalLight('#fff4e0', 2.6);
      sun.position.set(-40, 60, 50);
      scene.add(sun);
      const rim = new THREE.DirectionalLight('#9cc7ff', 1.1);
      rim.position.set(50, -10, -40);
      scene.add(rim);

      // `pivot` menerima posisi & skala layar, `badan` menerima sikap terbang.
      const pivot = new THREE.Group();
      const badan = new THREE.Group();
      badan.rotation.order = 'YZX';
      pivot.add(badan);
      scene.add(pivot);

      let w = 1, h = 1, skala = 1, siap = false;
      let raf = 0, terlihat = true, mulai = 0;
      const kursor = { x: 0, y: 0, tx: 0, ty: 0 };

      /** Titik dunia pada bidang z = 0 yang jatuh di pecahan layar (fx, fy). */
      const keDunia = (fx: number, fy: number) => {
        const tinggi = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
        return { x: (fx - 0.5) * tinggi * camera.aspect, y: (0.5 - fy) * tinggi, tinggi };
      };

      const ukur = () => {
        const rect = host.getBoundingClientRect();
        w = Math.max(1, rect.width);
        h = Math.max(1, rect.height);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        // Panjang tampak pesawat ±19% lebar hero, dibatasi agar tidak menabrak judul.
        const px = Math.min(340, Math.max(220, w * 0.19));
        skala = (px / h) * keDunia(0, 0).tinggi / 12;
      };

      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

      const pose = (now: number) => {
        const t = now / 1000;
        const masuk = reduceMotion ? 1 : easeOut(Math.min(1, (now - mulai) / MASUK_MS));
        const gulir = Math.min(1, Math.max(0, window.scrollY / Math.max(1, h)));

        kursor.x += (kursor.tx - kursor.x) * 0.04;
        kursor.y += (kursor.ty - kursor.y) * 0.04;

        // Lintasan masuk: dari kiri bawah, menanjak ke posisi jelajah.
        const fx = POS_X - (1 - masuk) * 0.32 + gulir * 0.3;
        const fy = POS_Y + (1 - masuk) * 0.42 - gulir * 0.75;
        const p = keDunia(fx, fy);
        const ayun = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.012 + Math.sin(t * 0.37) * 0.008;
        pivot.position.set(p.x, p.y + ayun * p.tinggi, 0);
        pivot.scale.setScalar(skala * (0.62 + 0.38 * masuk));

        // Hidung ke kanan dan sedikit ke arah penonton; menanjak lebih curam saat
        // masih lepas landas atau saat halaman digulir.
        const gerak = reduceMotion ? 0 : 1;
        badan.rotation.y = -0.5 + kursor.x * 0.12 + Math.sin(t * 0.31) * 0.03 * gerak;
        badan.rotation.z = 0.1 + (1 - masuk) * 0.16 + gulir * 0.22 + kursor.y * 0.06 + Math.sin(t * 0.9 + 0.6) * 0.025 * gerak;
        badan.rotation.x = 0.16 + Math.sin(t * 0.55) * 0.05 * gerak - kursor.x * 0.08;
      };

      const gambar = (now: number) => {
        if (!siap) return;
        pose(now);
        renderer.render(scene, camera);
      };

      const loop = (now: number) => {
        raf = 0;
        if (batal || !terlihat || document.hidden) return;
        gambar(now);
        raf = requestAnimationFrame(loop);
      };
      const bangun = () => {
        if (reduceMotion) { gambar(performance.now()); return; }
        if (!raf) raf = requestAnimationFrame(loop);
      };

      const onPointer = (e: PointerEvent) => {
        if (w <= 1 || h <= 1) return;
        kursor.tx = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth - 0.5) * 2));
        kursor.ty = Math.max(-1, Math.min(1, (e.clientY / window.innerHeight - 0.5) * 2));
      };
      const onResize = () => { ukur(); bangun(); };

      ukur();
      const ro = new ResizeObserver(onResize);
      ro.observe(host);
      const io = new IntersectionObserver((entri) => { terlihat = entri[0].isIntersecting; bangun(); });
      io.observe(host);
      document.addEventListener('visibilitychange', bangun);
      window.addEventListener('scroll', bangun, { passive: true });
      if (!reduceMotion) window.addEventListener('pointermove', onPointer, { passive: true });

      new GLTFLoader().load('/models/pesawat_biru.glb', (gltf) => {
        if (batal) return;
        const model = gltf.scene;
        // Pusatkan model di pivot supaya rotasi berporos di tengah badan pesawat.
        const pusat = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
        model.position.sub(pusat);
        badan.add(model);
        siap = true;
        mulai = performance.now();
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 700ms ease-out';
        requestAnimationFrame(() => { canvas.style.opacity = '1'; });
        bangun();
      }, undefined, () => { /* Gagal memuat: hero tetap tanpa pesawat. */ });

      bersihkan = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener('visibilitychange', bangun);
        window.removeEventListener('scroll', bangun);
        window.removeEventListener('pointermove', onPointer);
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as InstanceType<typeof THREE.MeshStandardMaterial>;
            std.map?.dispose();
            m.dispose();
          });
        });
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      };
      if (batal) bersihkan();
    })();

    return () => {
      batal = true;
      bersihkan?.();
    };
  }, [layarLebar, reduceMotion]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none ${className}`}
    />
  );
}
