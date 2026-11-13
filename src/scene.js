// Sahne: three.js nesneleri (kamyon, dünya, araçlar). Çizim döngüsü hud.js içinde.
import * as THREE from 'three';
import { KENNEY, loadModel, scatter, spawn } from './models.js';
import { ui } from './state.js';
import { BOX, BUMP, HZ, INLET, LEN, OBS, POLZ, TK, WHEEL, clamp, cx, srnd } from './world.js';
import { AIR, BARR, CR, DRL, EXT, OILB, RAD, SPOT } from './sim.js';

// ---------- görüntü ----------
export const ren = new THREE.WebGLRenderer({ antialias: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio)); document.body.appendChild(ren.domElement);
ren.shadowMap.enabled = ui.kalite > 0; ren.shadowMap.type = THREE.PCFSoftShadowMap;
export const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fd4ff); scene.fog = new THREE.Fog(0x9fd4ff, 70, 230);
export const cam = new THREE.PerspectiveCamera(62, 1, 0.05, 400);
scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x7a8a5c, 1.25)); export const sun = new THREE.DirectionalLight(0xfff1d6, 2.0); sun.position.set(9, 20, -7); scene.add(sun);
// güneş gölgesi: kamyon hep sahnenin ortasında olduğu için gölge alanı sabit
sun.castShadow = ui.kalite > 0; sun.shadow.mapSize.set(ui.kalite > 1 ? 2048 : 1024, ui.kalite > 1 ? 2048 : 1024); Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 30, bottom: -34, near: 1, far: 70 }); sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
export const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o }), UP = new THREE.Vector3(0, 1, 0), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
export const ZEMIN = 0x377e59; // zemin rengi: model karolarının çimiyle aynı olmalı
export const BG = new THREE.BoxGeometry(1, 1, 1), SG = new THREE.SphereGeometry(1, 16, 12), CG = new THREE.CylinderGeometry(1, 1, 1, 10);
export const boxMesh = (b, par) => { const m = new THREE.Mesh(BG, M(b.c)); m.scale.set(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]); m.position.set((b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2, (b.a[2] + b.b[2]) / 2); m.castShadow = m.receiveShadow = true; par.add(m); b.mesh = m; return m; };
export const add = (par, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = !mat.transparent && !mat.isMeshBasicMaterial; m.receiveShadow = !mat.transparent; par.add(m); return m; };
export const truck = new THREE.Group(); scene.add(truck);
export const cabG = new THREE.Group(); cabG.position.z = HZ; truck.add(cabG); export const cabIn = new THREE.Group(); cabIn.position.z = -HZ; cabG.add(cabIn); // çekici: mafsal etrafında döner
for (const b of BOX) if (b !== TK && b.tag !== 'police' && b.tag !== 'crate') boxMesh(b, b.cab ? cabIn : truck);
add(truck, CG, M(0x333333), 0, 0.9, HZ, 0.22, 0.5, 0.22); // mafsal pimi
export const marks = WHEEL.map((w) => add(truck, CG, new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true }), Math.sign(w[0]) * 1.05, 1.32, clamp(w[2], -5.4, 0.55), 0.42, 0.03, 0.42)); // patlak lastik için durulacak yer
export const wheels = WHEEL.map((w, i) => { const par = i < 2 ? cabIn : truck, m = add(par, CG, M(0x222222), w[0], w[1], w[2], 0.55, 0.44, 0.55); m.rotation.z = Math.PI / 2; add(par, CG, M(0x8d8d92), w[0] - Math.sign(w[0]) * 0.12, w[1], w[2], 0.12, 0.3, 0.12).rotation.z = Math.PI / 2; return m; }); // tekerler gövdeden dışarıda, aksla bağlı
// koltuklar: oturak + sırtlık tek grup; koltuk fırlatınca grup havaya uçar (hud.js)
export const koltuk = [null, [0.7, 1.95, 0.9], [-0.7, 2.3, 1.0]].map((k, s) => { if (!k) return null;
  const g = new THREE.Group(); g.position.set(k[0], 1.3, 1.9); cabIn.add(g); g.userData.ev = g.position.clone();
  const otur = BOX.filter((b) => b.tag === 'seat')[s - 1].mesh; otur.position.sub(g.position); g.add(otur);
  add(g, BG, M(0x30415d), 0, k[1] - 1.3, -0.45, 0.8, k[2], 0.12); add(g, CG, M(0x888888), 0, -0.15, 0, 0.05, 0.3, 0.05); // sırtlık, yay
  return g; });
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
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }), 0, 3.0, 3.38); glass.scale.set(0.29, 0.155, 1); glass.visible = false; glass.renderOrder = 4;
add(truck, CG, M(0x2a3d2f), OILB[0], 1.65, OILB[2] - 0.1, 0.26, 0.7, 0.26); add(truck, CG, M(0xffd23f), OILB[0], 1.65, OILB[2] - 0.1, 0.27, 0.14, 0.27); add(truck, CG, M(0x111111), OILB[0], 2.01, OILB[2] - 0.1, 0.2, 0.02, 0.2); // yağ varili
export function mkPolice(g) { const kutu = new THREE.Group(), isik = []; g.add(kutu); // model gelene kadar kutu gövde görünür
  loadModel(KENNEY + 'car/police.glb').then((m) => { if (!m) return; const c = m.clone(); c.scale.setScalar(1.45); g.add(c); kutu.visible = false; isik.forEach((l) => { l.position.set(l.position.x * 0.8, 2.02, -0.25); l.scale.set(0.5, 0.14, 0.26); }); });
  add(kutu, BG, M(0xf2f2f2), 0, 0.875, 0, 2.0, 0.85, 4.4); add(kutu, BG, M(0x1f3a6b), 0, 0.9, 0, 2.03, 0.24, 4.43); add(kutu, BG, M(0x26364f), 0, 1.575, -0.4, 1.7, 0.55, 1.8); add(kutu, BG, M(0x222222), 0, 0.75, 2.26, 1.9, 0.5, 0.14);
  for (const x of [-1, 1]) for (const z of [-1.4, 1.4]) add(kutu, CG, M(0x222222), x, 0.42, z, 0.42, 0.3, 0.42).rotation.z = Math.PI / 2;
  isik.push(add(g, BG, new THREE.MeshBasicMaterial({ color: 0xff2d2d }), 0.36, 1.94, -0.4, 0.62, 0.16, 0.3), add(g, BG, new THREE.MeshBasicMaterial({ color: 0x2d6bff }), -0.36, 1.94, -0.4, 0.62, 0.16, 0.3)); return isik; }
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
// tankerin gövdesi, kabini ve tekerleri detail.js içinde kurulur
export const valve = add(tanker, new THREE.TorusGeometry(0.22, 0.05, 8, 16), M(0xd8432f), 0, 2.3, -2); valve.rotation.x = Math.PI / 2; add(tanker, CG, M(0x555555), 0, 2.15, -2, 0.05, 0.3, 0.05);
export const nozzle = add(scene, CG, M(0xffd23f), 0, -5, 0, 0.08, 0.35, 0.08); export const hoseMat = M(0x222222);
export const pivot = new THREE.Group(), world = new THREE.Group(); pivot.add(world); scene.add(pivot);
{ const zemin = add(world, new THREE.PlaneGeometry(900, LEN + 900), M(ZEMIN), 0, -0.05, LEN / 2); zemin.rotation.x = -Math.PI / 2; zemin.castShadow = false; }
// Yol boyunca uzanan tekrar eden parçaları (çizgi, ray, direk) z'ye göre 200 m'lik dilimlere böler.
// Her dilim ayrı bir InstancedMesh olur; three.js görüş alanı dışındaki dilimleri çizmez.
class Dilimli {
  constructor(geo, mat, { golge = false, boy = 200 } = {}) { this.geo = geo; this.mat = mat; this.golge = golge; this.boy = boy; this.dilim = new Map(); }
  ekle(o) { // o: konumu, dönüşü ve ölçeği ayarlanmış Object3D
    o.updateMatrix(); const k = Math.floor(o.position.z / this.boy);
    if (!this.dilim.has(k)) this.dilim.set(k, []);
    this.dilim.get(k).push(o.matrix.clone());
  }
  bitir(parent) {
    for (const L of this.dilim.values()) {
      const im = new THREE.InstancedMesh(this.geo, this.mat, L.length); L.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = this.golge; im.receiveShadow = true; im.computeBoundingSphere(); parent.add(im);
    }
  }
}
{ const pos = [], idx = []; let n = 0; for (let z = -80; z <= LEN + 120; z += 4, n++) { const c = cx(z); pos.push(c + 6.5, 0, z, c - 6.5, 0, z); if (n) { const a = n * 2; idx.push(a - 2, a, a - 1, a - 1, a, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); const yol = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x4a4d55, side: THREE.DoubleSide })); yol.receiveShadow = true; world.add(yol);
  // banket (toprak şerit) ve kenar çizgileri
  const bp = [], bi = []; let k = 0; for (let z = -80; z <= LEN + 120; z += 4, k++) { const c = cx(z); bp.push(c + 8.2, -0.02, z, c - 8.2, -0.02, z); if (k) { const a = k * 2; bi.push(a - 2, a, a - 1, a - 1, a, a + 1); } }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bg.setIndex(bi); bg.computeVertexNormals(); const banket = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: 0x9a8a66, side: THREE.DoubleSide })); banket.receiveShadow = true; world.add(banket);
  // kenar çizgileri
  const kenar = new Dilimli(BG, new THREE.MeshBasicMaterial({ color: 0xf2f2ea })), o = new THREE.Object3D();
  for (let z = -80; z < LEN + 120; z += 4) for (const sd of [-1, 1]) {
    const x0 = cx(z), x1 = cx(z + 4);
    o.position.set((x0 + x1) / 2 + sd * 6.1, 0.02, z + 2); o.rotation.set(0, Math.atan2(x1 - x0, 4), 0); o.scale.set(0.16, 0.02, Math.hypot(4, x1 - x0) + 0.03); kenar.ekle(o);
  }
  kenar.bitir(world); }
{ // orta şerit çizgileri
  const orta = new Dilimli(BG, new THREE.MeshBasicMaterial({ color: 0xffffff })), o = new THREE.Object3D();
  for (let z = -80; z < LEN + 120; z += 9) { o.position.set(cx(z), 0.02, z); o.scale.set(0.25, 0.02, 3.5); o.rotation.set(0, Math.atan2(cx(z + 1) - cx(z), 1), 0); orta.ekle(o); }
  orta.bitir(world);
}
// yol kenarı süsleri: bariyerle manzara karoları arasındaki şeride ağaç, kaya, çalı, çiçek (Nature Kit). Düşük kalitede yok.
if (ui.kalite > 0) { let t2 = 987654321; const r = () => { t2 = (t2 * 1664525 + 1013904223) >>> 0; return t2 / 4294967296; }, N = KENNEY + 'nature/', yer = {};
  const TUR = [['grass_large', 16, 3.2, 0], ['grass', 10, 3.2, 0], ['plant_bush', 7, 4, 0], ['plant_bushLarge', 5, 4.5, 0], ['plant_bushDetailed', 4, 4, 0], ['flower_redA', 4, 3.4, 0], ['flower_yellowA', 4, 3.4, 0], ['flower_purpleA', 4, 3.4, 0], ['rock_smallA', 3, 3, 0], ['rock_smallB', 3, 3, 0], ['rock_smallC', 2, 3, 0], ['rock_largeA', 2, 3.2, 1], ['rock_largeB', 2, 3.2, 1], ['stump_round', 2, 3.5, 0], ['log_stack', 1.5, 3.5, 1], ['mushroom_redGroup', 1.5, 3, 0], ['tree_oak', 2.5, 5.2, 1], ['tree_default', 2.5, 4.6, 1], ['tree_detailed', 2, 4.8, 1], ['tree_fat', 2, 5, 1], ['tree_pineRoundA', 2.5, 5.2, 1], ['tree_pineTallA', 2, 5.2, 1]];
  const top = TUR.reduce((a, t) => a + t[1], 0) / (ui.kalite > 1 ? 0.62 : 0.34); // geri kalan olasılık: boş
  for (let z = -60; z < LEN + 140; z += 2.6) for (const sd of [-1, 1]) { let u = r() * top; const d = 10.7 + r() * 3.6, ry = r() * 6.28, bs = 0.8 + r() * 0.45;
    if (sd < 0 && POLZ.some((p) => Math.abs(p - z) < 9)) continue; // radar polisinin önünü kapatma
    for (const t of TUR) { if ((u -= t[1]) < 0) { (yer[t[0]] = yer[t[0]] || []).push([cx(z) + sd * (t[3] ? Math.max(d, 11.6) : d), 0, z, t[2] * bs, ry]); break; } } }
  for (const t of TUR) if (yer[t[0]]) scatter(N + t[0] + '.glb', world, yer[t[0]], { golge: !!t[3] }); }
// yol kenarı manzarası: Kenney karoları (orman, çadır, boş arazi) ve yer yer küçük köyler. Modeller gelene kadar boş görünür.
{ const R = KENNEY + 'racing/', C = KENNEY + 'city/', KARO = [R + 'decoration-forest.glb', R + 'decoration-forest.glb', R + 'decoration-forest.glb', R + 'decoration-empty.glb', R + 'decoration-tents.glb'], BINA = ['building-small-a', 'building-small-b', 'building-small-c', 'building-small-d', 'building-garage'];
  for (let z = -70; z < LEN + 160; z += 16.5) for (const sd of [-1, 1]) { const ry = Math.atan2(cx(z + 1) - cx(z), 1), koy = ((z / 16.5) | 0) % 19 === (sd > 0 ? 6 : 14);
    for (let sira = 0; sira < (ui.kalite > 1 ? 2 : 1); sira++) { if (ui.kalite < 1 && ((z / 16.5) | 0) % 2) { srnd(); continue; } const x = cx(z) + sd * (22.5 + sira * 16.2), r = srnd();
      if (koy && sira === 0) for (let b = 0; b < 2; b++) spawn(C + BINA[(r * 5 + b * 2) % 5 | 0] + '.glb', world, x - sd * 3 + (b ? sd * 7 : 0), 0, z + (b ? 4 : -3.5), 7.5, ry + (sd > 0 ? -Math.PI / 2 : Math.PI / 2));
      else if (sira === 0 || r < 0.6) spawn(KARO[(r * 97) % KARO.length | 0], world, x, 0.01, z, 1.62, ry + ((r * 4) | 0) * Math.PI / 2); } } }

{ // yol kenarı bariyerleri: ray ve direkler
  const ray = new Dilimli(BG, M(0xc9ced6), { golge: true }), direk = new Dilimli(BG, M(0x7d828c), { golge: true }), o = new THREE.Object3D();
  for (let z = -80; z < LEN + 120; z += 4) for (const sd of [1, -1]) {
    const x0 = cx(z), x1 = cx(z + 4), off = sd * BARR;
    o.rotation.set(0, Math.atan2(x1 - x0, 4), 0);
    o.position.set((x0 + x1) / 2 + off, 0.68, z + 2); o.scale.set(0.1, 0.34, Math.hypot(4, x1 - x0) + 0.05); ray.ekle(o);
    o.position.set(x0 + off + sd * 0.1, 0.42, z); o.scale.set(0.14, 0.84, 0.14); direk.ekle(o);
  }
  ray.bitir(world); direk.bitir(world); }
export const tex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
export const polPark = POLZ.map((z) => { const g = new THREE.Group(); g.position.set(cx(z) - BARR - 1.9, 0, z); g.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); mkPolice(g); world.add(g); // radar: bariyerin dışında bekleyen polis + hız levhası
  const zs = z - 75, xs = cx(zs) + BARR + 0.9; add(world, BG, M(0x888888), xs, 1.3, zs, 0.12, 2.6, 0.12); const lv = add(world, new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, map: tex(128, 128, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); c.lineWidth = 13; c.strokeStyle = '#d8232a'; c.stroke(); c.fillStyle = '#111'; c.font = '900 62px system-ui,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('50', 64, 68); }) }), xs, 3.0, zs - 0.08); lv.rotation.y = Math.PI; return g; });
export const oilM = Array.from({ length: 5 }, () => { const m = add(world, CG, new THREE.MeshBasicMaterial({ color: 0x15110d, transparent: true, opacity: 0.85 }), 0, 0.03, 0, 2.3, 0.02, 2.9); m.visible = false; return m; });
export const obsMesh = OBS.map((o) => { const g = new THREE.Group(); g.position.set(o.x, 0, o.z);
  if (o.gate) { add(g, BG, M(0xd8232a), 0, 0.9, 0, 7.4, 1.8, 0.6); for (const k of [-2.6, -0.85, 0.9, 2.65]) add(g, BG, M(0xffffff), k, 0.9, -0.02, 0.85, 1.8, 0.6); add(g, BG, M(0xffd23f), 0, 2.3, 0, 7.4, 0.5, 0.2);
    for (let k = 1; k <= 9; k++) { const z = o.z - k * 6; spawn(KENNEY + 'car/cone.glb', world, cx(z), 0, z, 1.15); } world.add(g); return g; }
  { const kutu = new THREE.Group(), i = OBS.indexOf(o), sd = i % 2 ? 1 : -1; g.add(kutu); // arızalı araba: yola yan durmuş, önünde koniler (model gelmezse kırmızı-beyaz bariyer kalır)
    spawn(KENNEY + 'car/' + ['sedan', 'taxi', 'van', 'suv', 'hatchback-sports'][i % 5] + '.glb', g, 0, 0, 0, 1.5, sd * (Math.PI / 2 + 0.25)).then((c) => { if (!c) return; kutu.visible = false; for (const x of [-2.4, 0, 2.4]) spawn(KENNEY + 'car/cone.glb', g, x, 0, -2.6, 1.15); });
    add(kutu, BG, M(0xff5a5f), 0, 0.6, 0, 3, 1.2, 0.5); add(kutu, BG, M(0xffffff), 0, 0.6, 0.02, 1, 1.2, 0.5); world.add(g); return g; } add(g, BG, M(0xff5a5f), 0, 0.6, 0, 3, 1.2, 0.5); add(g, BG, M(0xffffff), 0, 0.6, 0.02, 1, 1.2, 0.5); world.add(g); return g; });
// hedef çizgisi: aşamanın uzunluğuna göre hud.js taşır
export const bitis = new THREE.Group(); world.add(bitis);
add(bitis, BG, M(0x222222), 10, 4, 0, 0.5, 8, 0.5); add(bitis, BG, M(0x222222), -10, 4, 0, 0.5, 8, 0.5); add(bitis, BG, M(0xffe14d), 0, 7.5, 0, 20.5, 1.4, 0.4);
add(bitis, new THREE.PlaneGeometry(13, 1.6), new THREE.MeshBasicMaterial({ map: tex(256, 32, (g, w, h) => { for (let x = 0; x < 16; x++) for (let y = 0; y < 2; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#f2f2ea'; g.fillRect(x * 16, y * 16, 16, 16); } }) }), 0, 0.03, 0).rotation.x = -Math.PI / 2;
for (const z of BUMP) { const g = new THREE.Group(); g.position.set(cx(z), 0, z); g.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); for (let k = -3; k <= 3; k++) add(g, BG, M(k % 2 ? 0x222222 : 0xffd23f), k * 1.9, 0.08, 0, 1.9, 0.16, 0.9); world.add(g);
  const zs = z - 35, xs = cx(zs) - 10.4; add(world, BG, M(0x888888), xs, 1.2, zs, 0.12, 2.4, 0.12); const lv = add(world, BG, M(0xffd23f), xs, 2.7, zs, 1.1, 1.1, 0.08); lv.rotation.z = Math.PI / 4; }
