// Sahne: three.js nesneleri (kamyon, dünya, araçlar). Çizim döngüsü hud.js içinde.
import * as THREE from 'three';
import { BOX, BUMP, HZ, INLET, LEN, OBS, POLZ, TK, WHEEL, clamp, cx, srnd } from './world.js';
import { AIR, BARR, CR, DRL, EXT, OILB, RAD, SPOT } from './sim.js';

// ---------- görüntü ----------
export const ren = new THREE.WebGLRenderer({ antialias: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio)); document.body.appendChild(ren.domElement);
export const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fd4ff); scene.fog = new THREE.Fog(0x9fd4ff, 70, 230);
export const cam = new THREE.PerspectiveCamera(62, 1, 0.05, 400);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a5a, 1.5)); export const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(5, 12, -4); scene.add(sun);
export const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o }), UP = new THREE.Vector3(0, 1, 0), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
export const BG = new THREE.BoxGeometry(1, 1, 1), SG = new THREE.SphereGeometry(1, 16, 12), CG = new THREE.CylinderGeometry(1, 1, 1, 10);
export const boxMesh = (b, par) => { const m = new THREE.Mesh(BG, M(b.c)); m.scale.set(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]); m.position.set((b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2, (b.a[2] + b.b[2]) / 2); par.add(m); return m; };
export const add = (par, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
export const truck = new THREE.Group(); scene.add(truck);
export const cabG = new THREE.Group(); cabG.position.z = HZ; truck.add(cabG); export const cabIn = new THREE.Group(); cabIn.position.z = -HZ; cabG.add(cabIn); // çekici: mafsal etrafında döner
for (const b of BOX) if (b !== TK && b.tag !== 'police' && b.tag !== 'crate') boxMesh(b, b.cab ? cabIn : truck);
add(truck, CG, M(0x333333), 0, 0.9, HZ, 0.22, 0.5, 0.22); // mafsal pimi
export const marks = WHEEL.map((w) => add(truck, CG, new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true }), Math.sign(w[0]) * 1.05, 1.32, clamp(w[2], -5.4, 0.55), 0.42, 0.03, 0.42)); // patlak lastik için durulacak yer
export const wheels = WHEEL.map((w, i) => { const par = i < 2 ? cabIn : truck, m = add(par, CG, M(0x222222), w[0], w[1], w[2], 0.55, 0.44, 0.55); m.rotation.z = Math.PI / 2; add(par, CG, M(0x8d8d92), w[0] - Math.sign(w[0]) * 0.12, w[1], w[2], 0.12, 0.3, 0.12).rotation.z = Math.PI / 2; return m; }); // tekerler gövdeden dışarıda, aksla bağlı
add(cabIn, BG, M(0x30415d), 0.7, 1.95, 1.45, 0.8, 0.9, 0.12); add(cabIn, BG, M(0x30415d), -0.7, 2.3, 1.45, 0.8, 1.0, 0.12);
add(truck, CG, M(0xffd23f), INLET[0], 1.65, INLET[2], 0.09, 0.7, 0.09); add(truck, CG, M(0x222222), INLET[0], 2.0, INLET[2], 0.16, 0.08, 0.16);
export const swheel = new THREE.Group(); swheel.position.set(0.7, 2.05, 2.85); swheel.rotation.x = -0.5; cabIn.add(swheel);
add(swheel, new THREE.TorusGeometry(0.3, 0.045, 8, 24), M(0x111111), 0, 0, 0); add(swheel, BG, M(0x111111), 0, 0, 0, 0.6, 0.06, 0.04); add(swheel, BG, M(0xd8432f), 0, 0.15, 0, 0.06, 0.3, 0.04);
export const pedG = add(cabIn, BG, M(0x7bd389), 0.5, 1.5, 3.1, 0.16, 0.3, 0.06), pedB = add(cabIn, BG, M(0xff5a5f), 0.85, 1.5, 3.1, 0.2, 0.3, 0.06);
export const gauge = add(cabIn, CG, M(0xf5f0e8), 0.7, 2.45, 3.18, 0.16, 0.02, 0.16); gauge.rotation.x = Math.PI / 2;
export const needle = add(cabIn, BG, M(0xd8432f), 0.7, 2.45, 3.16, 0.02, 0.14, 0.02);
add(truck, BG, M(0x2e6da4), AIR[0], 1.55, AIR[2] - 0.1, 0.6, 0.5, 0.45); add(truck, CG, M(0xd8432f), AIR[0], 1.55, AIR[2] - 0.1, 0.2, 0.62, 0.2).rotation.z = Math.PI / 2; add(truck, CG, M(0xf5f0e8), AIR[0] - 0.18, 1.82, AIR[2] - 0.1, 0.09, 0.03, 0.09).rotation.x = Math.PI / 2; // kompresör
export const airTip = add(scene, CG, M(0xff8a1f), 0, 0, 0, 0.06, 0.3, 0.06), airHose = add(scene, CG, M(0xc0392b), 0, 0, 0, 1), airA = new THREE.Vector3(AIR[0], AIR[1] - 0.1, AIR[2]);
add(truck, BG, M(0xf2b632), DRL[0], 1.55, DRL[2] - 0.1, 0.6, 0.5, 0.45); add(truck, BG, M(0x222222), DRL[0], 1.55, DRL[2] - 0.1, 0.62, 0.12, 0.47); add(truck, CG, M(0x222222), DRL[0] + 0.18, 1.82, DRL[2] - 0.1, 0.09, 0.03, 0.09).rotation.x = Math.PI / 2; // tamir kutusu
export const drill = new THREE.Group(); scene.add(drill); add(drill, BG, M(0xf2b632), 0, 0, 0, 0.13, 0.17, 0.32); add(drill, BG, M(0x222222), 0, -0.17, -0.08, 0.1, 0.22, 0.1); add(drill, CG, M(0x444444), 0, 0, 0.2, 0.05, 0.08, 0.05).rotation.x = Math.PI / 2;
export const drBit = add(drill, CG, M(0xcfd3da), 0, 0, 0.34, 0.018, 0.22, 0.018); drBit.rotation.x = Math.PI / 2; add(drBit, BG, M(0x777777), 0, 0, 0, 2.2, 0.5, 0.6);
export const drCable = add(scene, CG, M(0x111111), 0, 0, 0, 1), drA = new THREE.Vector3(DRL[0], DRL[1] - 0.1, DRL[2]);
export const dmgMark = SPOT.map((p) => add(truck, CG, new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true }), Math.sign(p[0]) * 1.05, 1.32, p[2], 0.42, 0.03, 0.42)); // tamir için durulacak yer
export const dmgDent = SPOT.map((p) => { const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); add(g, BG, M(0x1d1a18), 0, 0, 0, 0.16, 0.56, 1.3); add(g, BG, M(0x1d1a18), 0, -0.05, 0.3, 0.2, 0.3, 0.3).rotation.y = 0.5; add(g, BG, M(0x6b3a1a), 0, 0.1, -0.35, 0.19, 0.2, 0.25).rotation.y = -0.4; truck.add(g); return g; });
export const mkTag = (x, y, z) => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.position.set(x, y, z); sp.scale.set(1.7, 0.85, 1); sp.visible = false; sp.renderOrder = 5; truck.add(sp); return { sp, c, tx, v: -1 }; };
export const dmgTag = SPOT.map((p) => mkTag(Math.sign(p[0]) * 2.3, 2.5, p[2]));
export const hpTag = WHEEL.map((w) => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.position.set(Math.sign(w[0]) * 2.7, 1.7, w[2]); sp.scale.set(1.7, 0.85, 1); sp.visible = false; sp.renderOrder = 5; truck.add(sp); return { sp, c, tx, v: -1 }; });
// buğulu ön cam: yalnız şoför kamerasında görünür, dışarısı hayal meyal seçilir
export const glass = add(cabIn, new THREE.PlaneGeometry(10, 4), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgba(226,234,240,0.92)'; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 26; i++) { const x = srnd() * 256, y = srnd() * 256, r = 18 + srnd() * 46, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }), 0, 4.7, 3.52); glass.visible = false; glass.renderOrder = 4;
add(truck, CG, M(0x2a3d2f), OILB[0], 1.65, OILB[2] - 0.1, 0.26, 0.7, 0.26); add(truck, CG, M(0xffd23f), OILB[0], 1.65, OILB[2] - 0.1, 0.27, 0.14, 0.27); add(truck, CG, M(0x111111), OILB[0], 2.01, OILB[2] - 0.1, 0.2, 0.02, 0.2); // yağ varili
export function mkPolice(g) { add(g, BG, M(0xf2f2f2), 0, 0.875, 0, 2.0, 0.85, 4.4); add(g, BG, M(0x1f3a6b), 0, 0.9, 0, 2.03, 0.24, 4.43); add(g, BG, M(0x26364f), 0, 1.575, -0.4, 1.7, 0.55, 1.8); add(g, BG, M(0x222222), 0, 0.75, 2.26, 1.9, 0.5, 0.14);
  for (const x of [-1, 1]) for (const z of [-1.4, 1.4]) add(g, CG, M(0x222222), x, 0.42, z, 0.42, 0.3, 0.42).rotation.z = Math.PI / 2;
  return [add(g, BG, new THREE.MeshBasicMaterial({ color: 0xff2d2d }), 0.36, 1.94, -0.4, 0.62, 0.16, 0.3), add(g, BG, new THREE.MeshBasicMaterial({ color: 0x2d6bff }), -0.36, 1.94, -0.4, 0.62, 0.16, 0.3)]; }
export const pol = new THREE.Group(); pol.visible = false; scene.add(pol); export const polL = mkPolice(pol);
export const crM = CR.map(() => { const g = new THREE.Group(); add(g, BG, M(0xb07a3a), 0, 1.6, 0, 0.6, 0.6, 0.6); add(g, BG, M(0x7a4d28), 0, 1.6, 0, 0.62, 0.1, 0.62); add(g, BG, M(0x7a4d28), 0, 1.6, 0, 0.1, 0.62, 0.62); add(g, BG, M(0x7a4d28), 0, 1.6, 0, 0.62, 0.62, 0.1); truck.add(g); return g; }); // yük sandıkları
export const exM = new THREE.Group(); scene.add(exM); add(exM, CG, M(0xd8232a), 0, 0, 0, 0.1, 0.46, 0.1); add(exM, CG, M(0x222222), 0, 0.27, 0, 0.04, 0.1, 0.04); add(exM, BG, M(0x222222), 0, 0.3, 0.09, 0.04, 0.04, 0.2); add(truck, BG, M(0x555555), EXT[0] - 0.14, EXT[1], EXT[2], 0.05, 0.5, 0.3); // söndürücü + askısı
export const fireG = new THREE.Group(); fireG.visible = false; truck.add(fireG); export const flames = [0xff7a1a, 0xffc21a, 0xff4a1a, 0xffe07a].map((c, i) => add(fireG, new THREE.ConeGeometry(0.28, 0.9, 7), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }), [0, 0.25, -0.22, 0.05][i], 1.75, [0, 0.15, 0.1, -0.22][i]));
add(cabIn, CG, M(0x555555), RAD[0], 1.6, RAD[2], 0.07, 0.6, 0.07); add(cabIn, CG, M(0x3fa7ff), RAD[0], 1.93, RAD[2], 0.13, 0.08, 0.13); // radyatör su kapağı
export const steam = Array.from({ length: 6 }, () => add(cabIn, SG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), 0, 2.3, 4.5, 0.3));
// şoförün sisi: ilerisini örten yatay sis örtüsü (yalnız şoför kamerasında)
export const fogS = add(scene, new THREE.PlaneGeometry(600, 300), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, map: (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 1024; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, 'rgba(214,230,244,0)'); gr.addColorStop(0.009, 'rgba(214,230,244,0.98)'); gr.addColorStop(1, 'rgba(214,230,244,1)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 1024); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }), 0, 2.4, 158); fogS.rotation.x = -Math.PI / 2; fogS.visible = false; fogS.renderOrder = 3;
export const cam2 = new THREE.PerspectiveCamera(50, 1.6, 1, 400); cam2.position.set(0, 46, 8); cam2.lookAt(0, 0, 72); // yolcunun ileri görüş penceresi
export const rainP = (() => { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = srnd() * 50 - 25; pos[i * 3 + 1] = srnd() * 16; pos[i * 3 + 2] = srnd() * 60 - 20; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfeaf5, size: 0.09, transparent: true, opacity: 0.7, fog: false })); p.visible = false; scene.add(p); return p; })();
export const SKY = new THREE.Color(0x9fd4ff), GRAY = new THREE.Color(0x76858f);
export const tanker = new THREE.Group(); scene.add(tanker);
boxMesh({ a: [-1.2, 0.5, -3.5], b: [1.2, 2.0, 3.5], c: 0xe9e9e9 }, tanker); boxMesh({ a: [-1.2, 0.5, 3.5], b: [1.2, 2.6, 5.2], c: 0x2e6da4 }, tanker);
for (const z of [-2.5, 2.5, 4.4]) for (const x of [-1.02, 1.02]) add(tanker, CG, M(0x222222), x, 0.55, z, 0.55, 0.35, 0.55).rotation.z = Math.PI / 2;
export const valve = add(tanker, new THREE.TorusGeometry(0.22, 0.05, 8, 16), M(0xd8432f), 0, 2.3, -2); valve.rotation.x = Math.PI / 2; add(tanker, CG, M(0x555555), 0, 2.15, -2, 0.05, 0.3, 0.05);
export const nozzle = add(scene, CG, M(0xffd23f), 0, -5, 0, 0.08, 0.35, 0.08); export const hoseMat = M(0x222222);
export const pivot = new THREE.Group(), world = new THREE.Group(); pivot.add(world); scene.add(pivot);
add(world, new THREE.PlaneGeometry(900, LEN + 900), M(0x6fae5c), 0, -0.03, LEN / 2).rotation.x = -Math.PI / 2;
{ const pos = [], idx = []; let n = 0; for (let z = -80; z <= LEN + 120; z += 4, n++) { const c = cx(z); pos.push(c + 6.5, 0, z, c - 6.5, 0, z); if (n) { const a = n * 2; idx.push(a - 2, a, a - 1, a - 1, a, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); world.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x4a4d55, side: THREE.DoubleSide }))); }
{ const cnt = Math.floor((LEN + 200) / 9), im = new THREE.InstancedMesh(BG, new THREE.MeshBasicMaterial({ color: 0xffffff }), cnt), o = new THREE.Object3D(); for (let i = 0; i < cnt; i++) { const z = -80 + i * 9; o.position.set(cx(z), 0.02, z); o.scale.set(0.25, 0.02, 3.5); o.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } world.add(im);
  const tr = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 7, 7), M(0x2d8a5e), 420); for (let i = 0; i < 420; i++) { const z = srnd() * (LEN + 200) - 60, sd = srnd() < 0.5 ? -1 : 1; o.position.set(cx(z) + sd * (11 + srnd() * 70), 3.5, z); const s = 0.7 + srnd() * 0.9; o.scale.set(s, s, s); o.rotation.y = 0; o.updateMatrix(); tr.setMatrixAt(i, o.matrix); } world.add(tr); }
{ const n = Math.floor((LEN + 200) / 4), rail = new THREE.InstancedMesh(BG, M(0xc9ced6), n * 2), post = new THREE.InstancedMesh(BG, M(0x7d828c), n * 2), o = new THREE.Object3D(); // yol kenarı bariyerleri
  for (let i = 0; i < n; i++) for (let sd = 0; sd < 2; sd++) { const z = -80 + i * 4, x0 = cx(z), x1 = cx(z + 4), off = sd ? -BARR : BARR; o.rotation.set(0, Math.atan2(x1 - x0, 4), 0);
    o.position.set((x0 + x1) / 2 + off, 0.68, z + 2); o.scale.set(0.1, 0.34, Math.hypot(4, x1 - x0) + 0.05); o.updateMatrix(); rail.setMatrixAt(i * 2 + sd, o.matrix);
    o.position.set(x0 + off + (sd ? -0.1 : 0.1), 0.42, z); o.scale.set(0.14, 0.84, 0.14); o.updateMatrix(); post.setMatrixAt(i * 2 + sd, o.matrix); }
  world.add(rail); world.add(post); }
export const tex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
export const polPark = POLZ.map((z) => { const g = new THREE.Group(); g.position.set(cx(z) - BARR - 1.9, 0, z); g.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); mkPolice(g); world.add(g); // radar: bariyerin dışında bekleyen polis + hız levhası
  const zs = z - 75, xs = cx(zs) + BARR + 0.9; add(world, BG, M(0x888888), xs, 1.3, zs, 0.12, 2.6, 0.12); const lv = add(world, new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, map: tex(128, 128, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); c.lineWidth = 13; c.strokeStyle = '#d8232a'; c.stroke(); c.fillStyle = '#111'; c.font = '900 62px system-ui,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('50', 64, 68); }) }), xs, 3.0, zs - 0.08); lv.rotation.y = Math.PI; return g; });
export const oilM = Array.from({ length: 5 }, () => { const m = add(world, CG, new THREE.MeshBasicMaterial({ color: 0x15110d, transparent: true, opacity: 0.85 }), 0, 0.03, 0, 2.3, 0.02, 2.9); m.visible = false; return m; });
export const obsMesh = OBS.map((o) => { const g = new THREE.Group(); g.position.set(o.x, 0, o.z);
  if (o.gate) { add(g, BG, M(0xd8232a), 0, 0.9, 0, 7.4, 1.8, 0.6); for (const k of [-2.6, -0.85, 0.9, 2.65]) add(g, BG, M(0xffffff), k, 0.9, -0.02, 0.85, 1.8, 0.6); add(g, BG, M(0xffd23f), 0, 2.3, 0, 7.4, 0.5, 0.2);
    for (let k = 1; k <= 9; k++) { const z = o.z - k * 6; add(world, new THREE.ConeGeometry(0.28, 0.75, 8), M(0xff7a1a), cx(z), 0.38, z); } world.add(g); return g; } add(g, BG, M(0xff5a5f), 0, 0.6, 0, 3, 1.2, 0.5); add(g, BG, M(0xffffff), 0, 0.6, 0.02, 1, 1.2, 0.5); world.add(g); return g; });
{ const c = cx(LEN); add(world, BG, M(0x222222), c + 10, 4, LEN, 0.5, 8, 0.5); add(world, BG, M(0x222222), c - 10, 4, LEN, 0.5, 8, 0.5); add(world, BG, M(0xffe14d), c, 7.5, LEN, 20.5, 1.4, 0.4); }
for (const z of BUMP) { const g = new THREE.Group(); g.position.set(cx(z), 0, z); g.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); for (let k = -3; k <= 3; k++) add(g, BG, M(k % 2 ? 0x222222 : 0xffd23f), k * 1.9, 0.08, 0, 1.9, 0.16, 0.9); world.add(g);
  const zs = z - 35, xs = cx(zs) - 10.4; add(world, BG, M(0x888888), xs, 1.2, zs, 0.12, 2.4, 0.12); const lv = add(world, BG, M(0xffd23f), xs, 2.7, zs, 1.1, 1.1, 0.08); lv.rotation.z = Math.PI / 4; }
