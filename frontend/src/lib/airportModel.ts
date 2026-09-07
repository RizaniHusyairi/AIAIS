import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Sumber: foto pengguna, diterima 5 September 2026: 28.jpg, 40.jpg,
 * 58.jpg, 15.jpg, APT_1668.JPG, APT_2135.JPG, APT_2949.JPG.
 * Rekonstruksi visual, bukan hasil survei. Satuan dan jumlah modul fasad
 * merupakan perkiraan; interior serta bangunan pendukung tidak dimodelkan.
 * Foto hanya menjadi acuan bentuk, tidak disertakan sebagai tekstur publik.
 * Detail selasar dan kanopi: APT_1672.JPG dan APT_1679.JPG dari pengguna.
 * Susunan halaman depan: DJI_0020.JPG dan DJI_0039.JPG, 7 September 2026.
 */
export function createAirportModel() {
  const model = new THREE.Group();
  model.name = 'Terminal APT Pranoto — rekonstruksi visual';
  model.userData = { source: 'Foto referensi pengguna, 2026-09-05', accuracy: 'Proporsi perkiraan; bukan gambar teknis atau denah navigasi.' };
  const materials = {
    roof: new THREE.MeshStandardMaterial({ color: '#a69e96', roughness: 0.72, metalness: 0.28, side: THREE.DoubleSide }),
    frame: new THREE.MeshStandardMaterial({ color: '#eeeae0', roughness: 0.48, metalness: 0.18 }),
    shell: new THREE.MeshStandardMaterial({ color: '#deded8', roughness: 0.48, metalness: 0.22, side: THREE.DoubleSide }),
    glass: new THREE.MeshStandardMaterial({ color: '#237c91', roughness: 0.24, metalness: 0.48 }),
    darkGlass: new THREE.MeshStandardMaterial({ color: '#194f60', roughness: 0.22, metalness: 0.4 }),
    concrete: new THREE.MeshStandardMaterial({ color: '#c3c8c4', roughness: 0.95 }),
    road: new THREE.MeshStandardMaterial({ color: '#67777b', roughness: 1 }),
    grass: new THREE.MeshStandardMaterial({ color: '#76977a', roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#427c68', roughness: 1, side: THREE.DoubleSide }),
    trunk: new THREE.MeshStandardMaterial({ color: '#928878', roughness: 1 }),
    red: new THREE.MeshStandardMaterial({ color: '#b85e4c', roughness: 1 }),
    yellow: new THREE.MeshStandardMaterial({ color: '#efd27b', roughness: 1 }),
    ceiling: new THREE.MeshStandardMaterial({ color: '#64696a', roughness: 0.64, metalness: 0.3, side: THREE.DoubleSide }),
    silver: new THREE.MeshStandardMaterial({ color: '#adb5b7', roughness: 0.32, metalness: 0.7 }),
    paving: new THREE.MeshStandardMaterial({ color: '#465158', roughness: 0.4, metalness: 0.12 }),
    joint: new THREE.MeshStandardMaterial({ color: '#28343a', roughness: 0.8 }),
    skylight: new THREE.MeshStandardMaterial({ color: '#a7ddeb', roughness: 0.2, metalness: 0.15, side: THREE.DoubleSide }),
    lamp: new THREE.MeshStandardMaterial({ color: '#fff2c9', emissive: '#ffe3a3', emissiveIntensity: 1.8, roughness: 0.25 }),
    sign: new THREE.MeshStandardMaterial({ color: '#f1b32e', roughness: 0.5 }),
  };
  type MaterialKey = keyof typeof materials;
  const batches = new Map<string, { part: string; material: MaterialKey; geometries: THREE.BufferGeometry[] }>();
  // Foto 28.jpg memperlihatkan kedua tepi luar fasad melebar ke atas.
  // Satu deformasi untuk kaca, dinding, dan rangka menjaga sambungannya rapat;
  // tepi atas tetap bertemu atap, sedangkan kaki fasad masuk sekitar 18%.
  function facadeScaleAtHeight(y: number) {
    return 0.82 + 0.18 * THREE.MathUtils.clamp(y / 21, 0, 1);
  }
  // Foto drone menunjukkan kanopi sempit yang terpisah dari terminal.
  // Lengkung yang sama mengikat atap, kolom, lantai, rambu, dan marka jalan.
  const forecourtBend = (x: number) => 10 * (x / 94) ** 2;
  const forecourtZ = (x: number, z: number) => 39 + (z - 20) * 0.55 + forecourtBend(x);
  function add(part: string, material: MaterialKey, geometry: THREE.BufferGeometry, matrix?: THREE.Matrix4) {
    if (matrix) geometry.applyMatrix4(matrix);
    if (part === 'Terminal' && material !== 'concrete') {
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        positions.setZ(i, positions.getZ(i) * facadeScaleAtHeight(positions.getY(i)));
      }
      geometry.computeVertexNormals();
    }
    if (['Kanopi', 'Selasar', 'Rambu'].includes(part)) {
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        positions.setZ(i, forecourtZ(positions.getX(i), positions.getZ(i)));
      }
      geometry.computeVertexNormals();
    }
    if (part === 'Pintu') {
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        positions.setZ(i, 23.5 * facadeScaleAtHeight(positions.getY(i)) + positions.getZ(i) - 20.7);
      }
      geometry.computeVertexNormals();
    }
    // Semua bentuk diseragamkan agar dapat digabung menjadi sedikit draw call.
    const plain = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    geometry.dispose();
    plain.deleteAttribute('uv');
    const key = `${part}:${material}`;
    if (!batches.has(key)) batches.set(key, { part, material, geometries: [] });
    batches.get(key)!.geometries.push(plain);
  }
  function box(part: string, mat: MaterialKey, x: number, y: number, z: number, w: number, h: number, d: number) {
    add(part, mat, new THREE.BoxGeometry(w, h, d), new THREE.Matrix4().makeTranslation(x, y, z));
  }
  function beam(part: string, mat: MaterialKey, a: number[], b: number[], radius = 0.22) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const direction = to.clone().sub(from);
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    add(part, mat, new THREE.CylinderGeometry(radius, radius, direction.length(), 6),
      new THREE.Matrix4().compose(from.add(to).multiplyScalar(0.5), rotation, new THREE.Vector3(1, 1, 1)));
  }
  function surface(part: string, mat: MaterialKey, rows: THREE.Vector3[][]) {
    const vertices: number[] = [];
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < rows[i].length - 1; j++) {
        const a = rows[i][j], b = rows[i + 1][j], c = rows[i + 1][j + 1], d = rows[i][j + 1];
        for (const p of [a, b, d, b, c, d]) vertices.push(p.x, p.y, p.z);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    add(part, mat, geometry);
  }

  box('Lanskap', 'grass', 0, -1.6, 13, 244, 3, 194);
  box('Lanskap', 'concrete', 0, 0, -58, 235, 0.22, 46);
  box('Lanskap', 'concrete', 0, 0.02, 84, 226, 0.12, 35);
  for (let x = -108; x <= 108; x += 12) {
    box('Lanskap', 'frame', x, 0.14, 83, 0.12, 0.05, 8);
  }
  for (const x of [-58, 0, 58]) {
    box('Lanskap', 'grass', x, 0.22, 72, 43, 0.5, 3);
  }

  box('Terminal', 'concrete', 0, 0.45, 0, 184, 0.9, 49);
  box('Terminal', 'frame', 0, 3, 0, 180, 5.1, 46);
  box('Terminal', 'darkGlass', 0, 12.7, 0, 180, 14.5, 45.8);
  for (const side of [-1, 1]) {
    const z = side * 23.15;
    box('Terminal', 'glass', 0, 13.6, z, 180, 13.7, 0.18);
    box('Terminal', 'darkGlass', 0, 3.1, side * 23.3, 174, 4.4, 0.18);
    for (let x = -90; x <= 90; x += 3) beam('Terminal', 'frame', [x, 6.7, z + side * 0.2], [x, 20.7, z + side * 0.2], 0.075);
    for (const y of [6.7, 11.2, 15.8, 20.5]) box('Terminal', 'frame', 0, y, z + side * 0.25, 181, 0.16, 0.18);
    box('Terminal', 'frame', 0, 5.9, z + side * 0.5, 184, 0.8, 1.2);
    for (let x = -90; x < 90; x += 12) {
      beam('Terminal', 'frame', [x, 6.3, side * 24], [x + 6, 20.5, side * 24], 0.27);
      beam('Terminal', 'frame', [x + 6, 20.5, side * 24], [x + 12, 6.3, side * 24], 0.27);
      beam('Terminal', 'frame', [x, 0.9, side * 23.9], [x, 5.8, side * 23.9], 0.4);
    }
    // Dua bidang atap melebar ke luar, mengikuti siluet pada foto udara.
    const roofRows = [-94, -90, 0, 90, 94].map(x => Array.from({ length: 17 }, (_, j) => {
      const t = j / 16;
      return new THREE.Vector3(x, 21 + 1.6 * t * t, side * (1 + 28 * t));
    }));
    surface('Atap', 'roof', roofRows);
    beam('Atap', 'frame', [-94, 22.6, side * 29], [94, 22.6, side * 29], 0.22);
    for (let x = -92; x <= 92; x += 4) {
      beam('Atap', 'roof', [x, 21.1, side], [x, 22.7, side * 29], 0.06);
    }
    for (const end of [-1, 1]) {
      box('Terminal', 'glass', end * 90.2, 11, side * 13.325, 0.18, 20, 19.65);
      for (let z0 = 5; z0 <= 23; z0 += 3) beam('Terminal', 'frame', [end * 90.4, 1, side * z0], [end * 90.4, 21, side * z0], 0.1);
      for (const y of [1, 6, 11, 16, 20.7]) beam('Terminal', 'frame', [end * 90.5, y, side * 3.5], [end * 90.5, y, side * 23.15], 0.12);
      // Pita melengkung di kedua ujung adalah ciri paling khas terminal.
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 22.6, side * 29), new THREE.Vector3(0, 21.9, side * 17),
        new THREE.Vector3(0, 19.3, side * 7), new THREE.Vector3(0, 13, side * 3.1),
        new THREE.Vector3(0, 6, side * 4.3), new THREE.Vector3(0, 1.3, side * 10.5),
      ]);
      const points = curve.getPoints(48);
      surface('Atap', 'shell', [end * 90.7, end * 94.2].map(x => points.map(p => new THREE.Vector3(x, p.y, p.z))));
      for (const x of [end * 90.7, end * 94.2]) {
        surface('Atap', 'shell', points.map((p, index) => {
          const tangent = curve.getTangent(index / 48);
          const normal = new THREE.Vector3(0, -tangent.z, tangent.y).multiplyScalar(1.3);
          return [-1, 1].map(sign => new THREE.Vector3(x, p.y + normal.y * sign, p.z + normal.z * sign));
        }));
      }
      const rim = points.map(p => new THREE.Vector3(end * 94.2, p.y, p.z));
      add('Atap', 'roof', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim), 48, 0.19, 5, false));
    }
  }
  box('Atap', 'frame', 0, 21.1, 0, 181, 0.2, 1.4);

  // Selasar yang menempel pada gedung dan taman terbuka di depannya.
  box('Penghubung', 'roof', 0, 5.85, 23.8, 182, 0.28, 6.8);
  box('Penghubung', 'concrete', 0, 0.35, 23.8, 184, 0.3, 6.8);
  for (const x of [-80, -30, 30, 80]) {
    box('Taman depan', 'grass', x, 0.1, 32.5, 23, 0.25, 8);
    for (const dx of [-8, 0, 8]) {
      box('Taman depan', 'concrete', x + dx, 0.25, 33, 3, 0.4, 2);
      add('Taman depan', 'leaf', new THREE.SphereGeometry(1.1, 8, 5), new THREE.Matrix4().makeTranslation(x + dx, 1, 33));
    }
  }
  // Dua penghubung beratap kaca melintasi taman, seperti terlihat dari udara.
  for (const x of [-60, 60]) {
    const start = 21, finish = forecourtZ(x, 22);
    box('Penghubung', 'concrete', x, 0.45, (start + finish) / 2, 8.6, 0.3, finish - start);
    const roofPoint = (z: number, angle: number) => new THREE.Vector3(x + 4 * Math.cos(angle), 5.8 + 0.7 * ((z - start) / (finish - start)) + 0.8 * Math.sin(angle), z);
    const rows = Array.from({ length: 13 }, (_, i) => {
      const z = start + (finish - start) * i / 12;
      return Array.from({ length: 13 }, (_, j) => roofPoint(z, j * Math.PI / 12));
    });
    surface('Penghubung', 'skylight', rows);
    for (let i = 0; i <= 12; i += 2) {
      const z = start + (finish - start) * i / 12;
      const curve = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, j) => roofPoint(z, j * Math.PI / 12)));
      add('Penghubung', 'silver', new THREE.TubeGeometry(curve, 12, 0.065, 6, false));
      for (const side of [-1, 1]) beam('Penghubung', 'frame', [x + side * 4, 0.6, z], [x + side * 4, roofPoint(z, 0).y, z], 0.12);
    }
    for (const side of [-1, 1]) beam('Penghubung', 'frame', [x + side * 4, 5.8, start], [x + side * 4, 6.5, finish], 0.14);
  }

  // Bidang jalan disegmentasi agar lengkungnya tetap halus setelah diekspor.
  const roadRows = Array.from({ length: 65 }, (_, i) => {
    const x = -112 + i * 3.5;
    return [72, 50].map(z => new THREE.Vector3(x, 0.15, forecourtZ(x, z)));
  });
  surface('Halaman depan', 'concrete', roadRows);
  for (let x = -105; x < 108; x += 7) {
    beam('Halaman depan', 'frame', [x, 0.2, forecourtZ(x, 62)], [x + 3.5, 0.2, forecourtZ(x + 3.5, 62)], 0.055);
  }

  // Modul plafon mengikuti lengkung kanopi; skylight benar-benar menggantikan
  // bidang atap di tengah, sehingga tidak tertutup lapisan atap lama.
  const canopyHeight = (x: number, z: number) => 6.25 + 1.25 * (x / 94) ** 4 + (z - 20) * 0.025;
  function canopyPanel(material: MaterialKey, x0: number, x1: number, z0: number, z1: number, offset: number) {
    surface('Kanopi', material, [x0, x1].map(x => [z0, z1].map(z => new THREE.Vector3(x, canopyHeight(x, z) + offset, z))));
  }
  for (let x = -94; x < 94; x += 4) {
    for (const [z0, z1] of [[20, 29], [33, 43]]) {
      canopyPanel('roof', x, x + 4, z0, z1, 0.2);
      canopyPanel('ceiling', x, x + 4, z0, z1, -0.2);
      for (const z of [z0, z1]) {
        surface('Kanopi', 'shell', [x, x + 4].map(px => [-0.2, 0.2].map(offset => new THREE.Vector3(px, canopyHeight(px, z) + offset, z))));
      }
      beam('Kanopi', 'joint', [x, canopyHeight(x, z0) - 0.22, z0], [x, canopyHeight(x, z1) - 0.22, z1], 0.016);
    }
    canopyPanel('skylight', x + 0.07, x + 3.93, 29, 33, 0.05);
    beam('Kanopi', 'silver', [x, canopyHeight(x, 29), 29], [x, canopyHeight(x, 33), 33], 0.075);
    beam('Kanopi', 'ceiling', [x, canopyHeight(x, 31) - 0.1, 31], [x + 4, canopyHeight(x + 4, 31) - 0.1, 31], 0.13);
    for (const z of [23, 26, 36, 39]) {
      beam('Kanopi', 'joint', [x, canopyHeight(x, z) - 0.22, z], [x + 4, canopyHeight(x + 4, z) - 0.22, z], 0.016);
    }
    // Cakram emisi memberi kesan downlight tanpa ratusan lampu dinamis.
    for (const z of [25.5, 37]) {
      const y = canopyHeight(x + 2, z) - 0.24;
      add('Kanopi', 'silver', new THREE.CylinderGeometry(0.19, 0.19, 0.06, 12), new THREE.Matrix4().makeTranslation(x + 2, y, z));
      add('Kanopi', 'lamp', new THREE.CylinderGeometry(0.145, 0.145, 0.025, 12), new THREE.Matrix4().makeTranslation(x + 2, y - 0.037, z));
    }
  }
  for (const end of [-94, 94]) {
    for (const [z0, z1] of [[20, 29], [33, 43]]) {
      surface('Kanopi', 'shell', [z0, z1].map(z => [-0.2, 0.2].map(offset => new THREE.Vector3(end, canopyHeight(end, z) + offset, z))));
    }
  }
  for (let x = -84; x <= 84; x += 12) {
    for (const direction of [-1, 1]) {
      beam('Kanopi', 'frame', [x, 0.55, 39.5], [x + direction * 3.4, canopyHeight(x + direction * 3.4, 41) - 0.2, 41], 0.3);
    }
    beam('Selasar', 'silver', [x, 0.55, 35.5], [x, canopyHeight(x, 35.5) - 0.2, 35.5], 0.46);
    beam('Selasar', 'silver', [x - 1, 0.55, 23], [x + 0.8, canopyHeight(x + 0.8, 24) - 0.2, 24], 0.48);
    for (const z of [23, 35.5, 39.5]) {
      add('Selasar', 'silver', new THREE.CylinderGeometry(0.58, 0.58, 0.12, 12), new THREE.Matrix4().makeTranslation(z === 23 ? x - 1 : x, 0.6, z));
    }
    for (const y of [1.8, 3.2, 4.6]) {
      add('Selasar', 'joint', new THREE.TorusGeometry(0.462, 0.012, 4, 12).rotateX(Math.PI / 2), new THREE.Matrix4().makeTranslation(x, y, 35.5));
    }
  }

  // Segmen pendek menjaga alas lantai mengikuti lengkung, bukan memotongnya.
  for (let x = -92; x <= 92; x += 4) box('Selasar', 'joint', x, 0.31, 31.2, 4, 0.4, 22.4);
  for (let x = -93; x < 94; x += 2) {
    for (let z = 21; z < 43; z += 2) box('Selasar', z > 29 && z < 33 ? 'silver' : 'paving', x, 0.52, z, 1.975, 0.04, 1.975);
  }
  for (let x = -93; x <= 93; x += 2) box('Selasar', x % 4 === -1 || x % 4 === 3 ? 'joint' : 'frame', x, 0.35, 42.8, 2, 0.65, 0.35);
  for (let x = -90; x <= 90; x += 6) {
    beam('Selasar', 'red', [x, 0.1, 57], [x, 1.35, 57], 0.09);
    beam('Selasar', 'frame', [x, 0.9, 57], [x, 1.12, 57], 0.095);
  }
  for (let x = -92; x <= 92; x += 4) {
    box('Selasar', 'red', x, 0.24, 47.8, 4, 0.08, 9.1);
    box('Selasar', 'yellow', x, 0.3, 52.15, 4, 0.025, 0.18);
    box('Selasar', 'joint', x, 0.29, 53.2, 4, 0.035, 0.45);
  }
  for (let x = -93; x < 94; x += 0.65) box('Selasar', 'silver', x, 0.315, 53.2, 0.04, 0.02, 0.42);
  for (const x of [-60, 0, 60]) {
    box('Selasar', 'yellow', x + 5, 0.31, 47.8, 3.5, 0.025, 9);
    for (let dx = -3; dx <= 3; dx++) box('Selasar', 'frame', x + dx * 0.9, 0.32, 48, 0.42, 0.025, 10);
    // Detail pintu mengacu pada bukaan foto; ruang di belakangnya tidak direka.
    for (const dx of [-2.1, 2.1]) {
      box('Pintu', 'glass', x + dx, 2.6, 20.7, 3.9, 4.1, 0.12);
      for (const edge of [-1.95, 0, 1.95]) box('Pintu', 'silver', x + dx + edge, 2.6, 20.8, 0.09, 4.15, 0.1);
      box('Pintu', 'silver', x + dx, 4.7, 20.8, 4.05, 0.2, 0.16);
      box('Pintu', 'frame', x + dx, 2.35, 20.81, 3.9, 0.1, 0.02);
      for (const handle of [-0.22, 0.22]) beam('Pintu', 'silver', [x + dx + handle, 1.8, 20.95], [x + dx + handle, 2.5, 20.95], 0.035);
    }
  }
  for (const x of [-72, -36, 36, 72]) {
    for (let seat = 0; seat < 4; seat++) {
      const px = x + (seat - 1.5) * 0.85;
      box('Selasar', 'red', px, 1.1, 34.5, 0.75, 0.13, 0.75);
      box('Selasar', 'red', px, 1.5, 34.85, 0.75, 0.8, 0.1);
    }
    for (const dx of [-1, 1]) beam('Selasar', 'silver', [x + dx, 0.55, 34.5], [x + dx, 1.05, 34.5], 0.065);
    box('Selasar', 'silver', x + 4, 1.02, 36, 2.2, 1, 1.6);
    for (const dx of [-0.6, 0, 0.6]) add('Selasar', 'leaf', new THREE.SphereGeometry(0.7, 8, 5), new THREE.Matrix4().makeTranslation(x + 4 + dx, 1.8, 36));
  }

  // Tulisan geometri tetap tajam saat diperbesar dan ikut tersimpan di GLB.
  const letters: Record<string, string[]> = {
    A: ['01110','10001','10001','11111','10001','10001','10001'],
    B: ['11110','10001','10001','11110','10001','10001','11110'],
    D: ['11110','10001','10001','10001','10001','10001','11110'],
    E: ['11111','10000','10000','11110','10000','10000','11111'],
    G: ['01111','10000','10000','10111','10001','10001','01110'],
    K: ['10001','10010','10100','11000','10100','10010','10001'],
    N: ['10001','11001','11001','10101','10011','10011','10001'],
    R: ['11110','10001','10001','11110','10100','10010','10001'],
    T: ['11111','00100','00100','00100','00100','00100','00100'],
  };
  function signText(text: string, x: number, y: number, z: number) {
    const pixel = 0.038;
    for (let index = 0; index < text.length; index++) {
      letters[text[index]]?.forEach((row, rowIndex) => [...row].forEach((bit, column) => {
        if (bit === '1') box('Rambu', 'joint', x + (index * 6 + column) * pixel, y - rowIndex * pixel, z, pixel * 0.92, pixel * 0.92, 0.025);
      }));
    }
  }
  for (const x of [-54, 0, 54]) {
    box('Rambu', 'silver', x, 4.8, 40.8, 7.2, 0.85, 0.2);
    box('Rambu', 'sign', x, 4.8, 40.92, 7, 0.7, 0.05);
    for (const dx of [-2.7, 2.7]) beam('Rambu', 'silver', [x + dx, 5.2, 40.8], [x + dx, canopyHeight(x + dx, 40.8) - 0.2, 40.8], 0.027);
    signText('KEBERANGKATAN', x - 2.9, 4.93, 41.04);
    signText('KEDATANGAN', x + 0.5, 4.93, 41.04);
    box('Rambu', 'joint', x + 0.15, 4.8, 40.96, 0.025, 0.58, 0.025);
    beam('Rambu', 'joint', [x - 3.34, 4.78, 40.98], [x - 3.05, 4.78, 40.98], 0.025);
    for (const dy of [-0.12, 0.12]) beam('Rambu', 'joint', [x - 3.34, 4.78, 40.98], [x - 3.2, 4.78 + dy, 40.98], 0.025);
    beam('Rambu', 'joint', [x + 3.1, 4.65, 40.98], [x + 3.1, 4.98, 40.98], 0.025);
    for (const dx of [-0.12, 0.12]) beam('Rambu', 'joint', [x + 3.1, 4.98, 40.98], [x + 3.1 + dx, 4.84, 40.98], 0.025);
  }

  // Empat garbarata mengacu pada deretan yang terlihat di foto udara.
  // Pangkal tetap menembus fasad yang kini masuk ke dalam, tanpa menggeser kabin.
  const bridgeStart = -23.15 * facadeScaleAtHeight(3.1) + 0.5;
  const bridgeCenter = (-55.5 + bridgeStart) / 2;
  const bridgeLength = bridgeStart + 55.5;
  for (const x of [-69, -23, 23, 69]) {
    box('Garbarata', 'glass', x, 5, bridgeCenter, 4.8, 3.6, bridgeLength);
    box('Garbarata', 'frame', x, 3.1, bridgeCenter, 5.3, 0.45, bridgeLength + 1);
    box('Garbarata', 'roof', x, 7, bridgeCenter, 5.5, 0.45, bridgeLength + 1);
    for (const side of [-1, 1]) {
      for (let z = -54; z < bridgeStart; z += 3) beam('Garbarata', 'frame', [x + side * 2.48, 3.3, z], [x + side * 2.48, 6.8, z], 0.09);
    }
    box('Garbarata', 'frame', x, 4.1, -56, 6, 6.1, 4.5);
    box('Garbarata', 'darkGlass', x, 5, -58.3, 4.5, 2.8, 0.18);
    beam('Garbarata', 'concrete', [x, 0.2, -46], [x, 3.2, -46], 0.6);
    box('Lanskap', 'yellow', x, 0.2, -68, 0.22, 0.06, 17);
  }
  for (let x = -84; x <= 84; x += 14) {
    const z = forecourtZ(x, 75), h = 6 + Math.cos(x) * 0.6;
    beam('Lanskap', 'trunk', [x, 0.5, z], [x + 0.4, h, z], 0.19);
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      const rows = [0, 0.3, 0.65, 1].map(t => {
        const length = t * 3.6, width = Math.sin(t * Math.PI) * 0.65;
        return [-1, 1].map(s => new THREE.Vector3(x + 0.4 + Math.cos(angle) * length + Math.sin(angle) * width * s,
          h + Math.sin(t * Math.PI) * 1.1 - t * 0.9,
          z + Math.sin(angle) * length - Math.cos(angle) * width * s));
      });
      surface('Lanskap', 'leaf', rows);
    }
  }
  const groups = new Map<string, THREE.Group>();
  for (const { part, material, geometries } of batches.values()) {
    if (!groups.has(part)) {
      const group = new THREE.Group(); group.name = part; groups.set(part, group); model.add(group);
    }
    const geometry = mergeGeometries(geometries);
    geometries.forEach(g => g.dispose());
    if (!geometry) throw new Error('Geometri terminal tidak dapat digabungkan.');
    const mesh = new THREE.Mesh(geometry, materials[material]);
    mesh.name = `${part} ${material}`; mesh.castShadow = true; mesh.receiveShadow = true;
    groups.get(part)!.add(mesh);
  }
  return model;
}

export function disposeAirportModel(model: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  model.traverse(object => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    }
  });
  materials.forEach(material => material.dispose());
}
