// Görsel ayrıntılar: kamyon, dorse ve tankerin süslemeleri. Çarpışma kutularına dokunmaz; yalnız görüntü ekler.
// Küçük parçalar malzemeye göre tek ağda birleştirilir (Batch) ki çizim çağrısı sayısı artmasın.
import * as THREE from 'three';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';
import { BOX, HZ, WHEEL } from './world.js';
import { cabIn, tanker, truck, wheels } from './scene.js';

const KUTU = new THREE.BoxGeometry(1, 1, 1), SIL = new THREE.CylinderGeometry(1, 1, 1, 16), KURE = new THREE.SphereGeometry(1, 14, 10);
const O = new THREE.Object3D();

// malzemeler
const L = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o }), B = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });
const krom = new THREE.MeshPhongMaterial({ color: 0xcfd5dc, shininess: 110, specular: 0xffffff });
const koyu = L(0x23262b), celik = L(0x6f757d), lastik = L(0x1b1b1d), kirmizi = L(0xd8432f), koyuKirmizi = L(0xa52f20), beyaz = L(0xf1f1ec);
const cam = L(0x9fd4ff, { transparent: true, opacity: 0.25 }), koyuCam = L(0x1c2a3a);
const far = B(0xfff1c2), stop = B(0xff3b30), sinyal = B(0xffa21a);

// Aynı malzemeli parçaları toplayıp tek ağ yapar.
class Batch {
  constructor(parent) { this.parent = parent; this.grup = new Map(); }
  put(mat, geo, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    O.position.set(x, y, z); O.scale.set(sx, sy, sz); O.rotation.set(rx, ry, rz); O.updateMatrix();
    if (!this.grup.has(mat)) this.grup.set(mat, []);
    this.grup.get(mat).push(geo.clone().applyMatrix4(O.matrix)); return this;
  }
  box(mat, x, y, z, sx, sy, sz, ry = 0, rz = 0) { return this.put(mat, KUTU, x, y, z, sx, sy, sz, 0, ry, rz); }
  // eksen: 'x' | 'y' | 'z' — silindirin uzandığı yön
  cyl(mat, x, y, z, r, boy, eksen = 'y') { return this.put(mat, SIL, x, y, z, r, boy, r, eksen === 'z' ? Math.PI / 2 : 0, 0, eksen === 'x' ? Math.PI / 2 : 0); }
  done() {
    for (const [mat, gs] of this.grup) {
      const m = new THREE.Mesh(mergeGeometries(gs), mat);
      m.castShadow = !mat.transparent && !mat.isMeshBasicMaterial; m.receiveShadow = !mat.transparent; this.parent.add(m);
    }
  }
}

// tuvalden doku
function doku(w, h, ciz) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; ciz(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- dorse ----------
{
  // kasa tabanı: tahta döşeme
  const taban = BOX.find((b) => b.tag === 'floor' && !b.cab);
  if (taban && taban.mesh) {
    taban.mesh.material = L(0xffffff, { map: doku(256, 512, (g, w, h) => {
      const n = 9; for (let i = 0; i < n; i++) { const ton = 150 + ((i * 37) % 40); g.fillStyle = `rgb(${ton + 30},${ton - 15},${ton - 75})`; g.fillRect((i * w) / n, 0, w / n + 1, h); }
      g.strokeStyle = 'rgba(60,35,15,0.55)'; g.lineWidth = 2; for (let i = 1; i < n; i++) { g.beginPath(); g.moveTo((i * w) / n, 0); g.lineTo((i * w) / n, h); g.stroke(); }
      g.fillStyle = 'rgba(40,25,10,0.5)'; for (let i = 0; i < n; i++) for (let y = 20; y < h; y += 120) g.fillRect((i + 0.5) * (w / n) - 2, y + ((i * 53) % 60), 4, 4); // çiviler
    }) });
  }
  const d = new Batch(truck);
  // şasi kirişleri, aks, destek ayakları
  for (const x of [-0.75, 0.75]) d.box(koyu, x, 0.38, -2.6, 0.22, 0.24, 7.2);
  d.cyl(koyu, 0, WHEEL[2][1], WHEEL[2][2], 0.09, 3.6, 'x');
  for (const x of [-0.95, 0.95]) d.box(celik, x, 0.26, 0.25, 0.12, 0.5, 0.12).box(celik, x, 0.03, 0.25, 0.3, 0.05, 0.3);
  for (const s of [-1, 1]) {
    const x = s * WHEEL[2][0], z = WHEEL[2][2];
    // çamurluk ve paçalık
    d.box(koyu, x, 1.17, z, 0.5, 0.07, 1.3).box(koyu, x, 1.06, z + 0.74, 0.5, 0.07, 0.34, 0, 0).box(koyu, x, 1.06, z - 0.74, 0.5, 0.07, 0.34);
    d.box(lastik, x, 0.52, z - 0.9, 0.46, 0.62, 0.04);
    // korkuluk dikmeleri ve yan reflektörler
    for (let k = -5.5; k <= 0.6; k += 1) d.box(celik, s * 1.535, 1.3, k, 0.07, 1.04, 0.1);
    for (let k = -5.75, i = 0; k <= 0.8; k += 0.5, i++) d.box(i % 2 ? beyaz : kirmizi, s * 1.506, 0.7, k, 0.02, 0.11, 0.4);
    d.box(krom, s * 1.46, 0.42, -1.4, 0.05, 0.05, 3.4); // yan koruma demiri
    // arka lambalar
    d.box(stop, s * 1.18, 0.74, -6.03, 0.36, 0.17, 0.05).box(sinyal, s * 0.82, 0.74, -6.03, 0.2, 0.17, 0.05);
  }
  d.box(koyu, 0, 0.42, -6.13, 2.95, 0.16, 0.14); // arka tampon
  d.done();
  // plaka
  const plaka = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.24), B(0xffffff, { map: doku(256, 80, (g, w, h) => { g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h); g.fillStyle = '#1b3f9c'; g.fillRect(0, 0, 30, h); g.strokeStyle = '#111'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#111'; g.font = '900 50px system-ui,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RH 2026', w / 2 + 14, h / 2 + 3); }) }));
  plaka.position.set(0, 0.74, -6.035); plaka.rotation.y = Math.PI; truck.add(plaka);
}

// ---------- çekici (kabin) ----------
{
  const k = new Batch(cabIn);
  // ızgara, tampon, farlar
  k.box(koyu, 0, 1.3, 5.31, 2.0, 1.1, 0.06);
  for (let i = 0; i < 6; i++) k.box(krom, 0, 0.86 + i * 0.18, 5.35, 1.9, 0.05, 0.03);
  k.box(krom, 0, 1.9, 5.33, 2.2, 0.08, 0.08).box(krom, 0, 0.62, 5.45, 3.3, 0.34, 0.24);
  for (const s of [-1, 1]) {
    k.cyl(krom, s * 1.2, 1.35, 5.3, 0.25, 0.06, 'z').cyl(far, s * 1.2, 1.35, 5.325, 0.2, 0.06, 'z').box(sinyal, s * 1.2, 0.98, 5.32, 0.32, 0.1, 0.05);
    k.box(krom, s * 0.9, 0.62, 5.6, 0.12, 0.5, 0.08); // tampon dikmesi
    // ön çamurluk, basamak
    const x = s * WHEEL[0][0], z = WHEEL[0][2];
    k.box(kirmizi, x, 1.17, z, 0.5, 0.08, 1.3).box(kirmizi, x, 1.05, z + 0.74, 0.5, 0.08, 0.36).box(kirmizi, x, 1.05, z - 0.74, 0.5, 0.08, 0.36);
    k.box(krom, s * 1.62, 0.92, 3.2, 0.26, 0.06, 0.5);
    // kaput yan havalandırması
    for (let i = 0; i < 4; i++) k.box(koyu, s * 1.506, 1.55, 3.95 + i * 0.3, 0.02, 0.34, 0.12);
    // kapı: cam görünümü, beyaz şerit, kol
    k.box(koyuCam, s * 1.506, 2.33, 2.1, 0.02, 0.5, 1.7).box(beyaz, s * 1.506, 1.62, 2.1, 0.02, 0.1, 2.2).box(krom, s * 1.515, 1.95, 1.35, 0.03, 0.05, 0.22);
    // ön cam direği, ayna
    k.box(koyu, s * 1.44, 3.0, 3.42, 0.09, 0.62, 0.09).box(krom, s * 1.62, 2.78, 3.3, 0.3, 0.04, 0.04).box(koyu, s * 1.8, 2.78, 3.28, 0.06, 0.36, 0.2);
    // egzoz bacası
    k.cyl(krom, s * 1.64, 2.5, HZ - 0.08, 0.085, 2.6).cyl(koyu, s * 1.64, 2.1, HZ - 0.08, 0.115, 0.9).cyl(koyu, s * 1.64, 3.8, HZ - 0.08, 0.1, 0.06);
  }
  k.cyl(koyu, 0, WHEEL[0][1], WHEEL[0][2], 0.09, 3.6, 'x'); // ön aks
  // kaput şeridi ve arması, ön cam çerçevesi ve camı, silecekler
  k.box(koyuKirmizi, 0, 2.105, 4.4, 0.7, 0.02, 1.76).box(krom, 0, 2.16, 5.12, 0.1, 0.1, 0.22);
  k.box(koyu, 0, 3.33, 3.42, 2.97, 0.07, 0.09).box(cam, 0, 3.0, 3.42, 2.8, 0.6, 0.02);
  for (const x of [-0.6, 0.6]) k.box(koyu, x, 2.82, 3.45, 0.7, 0.03, 0.03, 0, 0.35);
  k.done();
}

// ---------- tekerler: jant ve bijonlar (dönüş görünsün) ----------
for (const w of wheels) {
  const j = new Batch(w); // lastiğin yerel ekseni: y = aks
  j.cyl(krom, 0, 0, 0, 0.6, 1.04).cyl(koyu, 0, 0, 0, 0.22, 1.1);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; j.box(koyu, Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4, 0.13, 1.08, 0.13); }
  j.done();
}

// ---------- tanker ----------
{
  const t = new Batch(tanker), mavi = L(0x2e6da4), acikMavi = L(0x4a8fca), govde = new THREE.MeshPhongMaterial({ color: 0xe6e9ec, shininess: 60, specular: 0x9aa4ad }), izgara = L(0x4b5057), sari = L(0xffd23f);
  t.box(koyu, 0, 0.58, 0, 2.0, 0.2, 7.0); // şasi
  // elips kesitli tank, uç kapakları, kuşaklar; üstünde yürüme platformu (oyuncuların bastığı düzlem y=2.0)
  t.put(govde, SIL, 0, 1.26, -0.05, 1.2, 6.5, 0.72, Math.PI / 2).put(govde, KURE, 0, 1.26, 3.2, 1.2, 0.72, 0.42).put(govde, KURE, 0, 1.26, -3.3, 1.2, 0.72, 0.42);
  for (const z of [-2.2, 0, 2.2]) t.put(kirmizi, SIL, 0, 1.26, z, 1.225, 0.14, 0.735, Math.PI / 2);
  t.box(izgara, 0, 1.985, -0.1, 1.76, 0.05, 6.3);
  for (const x of [-0.9, 0.9]) t.box(sari, x, 1.99, -0.1, 0.07, 0.06, 6.3);
  for (const z of [0.2, 1.7]) t.cyl(krom, 0, 2.04, z, 0.3, 0.08).cyl(koyu, 0, 2.09, z, 0.1, 0.05); // dolum kapakları
  // arka: merdiven, tehlike levhası, lambalar
  for (const x of [-0.25, 0.25]) t.box(krom, x, 1.25, -3.76, 0.04, 1.5, 0.04);
  for (let y = 0.7; y < 2; y += 0.3) t.box(krom, 0, y, -3.76, 0.5, 0.035, 0.035);
  t.box(sinyal, 0.75, 1.25, -3.72, 0.42, 0.42, 0.03, 0, Math.PI / 4).box(koyu, 0, 0.5, -3.6, 2.3, 0.14, 0.12);
  for (const s of [-1, 1]) t.box(stop, s * 0.95, 0.72, -3.56, 0.3, 0.14, 0.05);
  // kabin
  t.box(mavi, 0, 1.45, 4.35, 2.3, 1.7, 1.7).box(acikMavi, 0, 2.34, 4.25, 2.2, 0.1, 1.5).box(koyuCam, 0, 1.87, 5.21, 2.0, 0.6, 0.04).box(koyu, 0, 1.06, 5.21, 1.5, 0.56, 0.05);
  for (let i = 0; i < 4; i++) t.box(krom, 0, 0.86 + i * 0.13, 5.24, 1.4, 0.04, 0.03);
  t.box(krom, 0, 0.62, 5.29, 2.45, 0.28, 0.2).box(sinyal, 0, 2.44, 4.6, 0.5, 0.1, 0.14).cyl(krom, 1.0, 2.3, 3.56, 0.07, 1.7);
  for (const s of [-1, 1]) {
    t.box(far, s * 0.92, 1.06, 5.225, 0.3, 0.22, 0.05).box(koyuCam, s * 1.16, 1.87, 4.5, 0.03, 0.55, 0.9).box(koyu, s * 1.32, 1.95, 5.0, 0.06, 0.34, 0.2);
    // tekerler (arkada çift aks), jantlar, çamurluklar
    for (const z of [-2.7, -1.5, 4.4]) t.cyl(lastik, s * 1.02, 0.55, z, 0.55, 0.36, 'x').cyl(krom, s * 1.02, 0.55, z, 0.32, 0.39, 'x').cyl(koyu, s * 1.02, 0.55, z, 0.12, 0.42, 'x');
    t.box(koyu, s * 1.02, 1.16, -2.1, 0.4, 0.06, 2.6).box(mavi, s * 1.02, 1.16, 4.4, 0.4, 0.06, 1.3);
  }
  t.done();
  // yan yazı
  const yazi = doku(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = '#c9302c'; g.font = '900 96px system-ui,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('YAKIT', w / 2, h / 2 + 6); });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), L(0xffffff, { map: yazi, transparent: true })); p.position.set(s * 1.212, 1.28, 0.6); p.rotation.y = s * Math.PI / 2; tanker.add(p); }
}

// egzoz bacalarının ağzı (kabin içi koordinat): duman buradan çıkar
export const BACA = [[1.64, 3.85, HZ - 0.08], [-1.64, 3.85, HZ - 0.08]];
