// Lobi sahnesi (kamyoncu barı) ve kamyoncu karakter modeli.
import * as THREE from 'three';
import { COL, clamp, rnd, srnd } from './world.js';
import { BG, CG, M, SG, UP, add, ren, scene, tex, v1, v2 } from './scene.js';
import { makeRig, poseRig } from './rig.js';

// ---------- lobi: kamyoncu barı (oyun başlayana kadar herkes taburede; salon tarafından bakılır) ----------
export const bar = new THREE.Scene(); bar.background = new THREE.Color(0x060504); bar.fog = new THREE.FogExp2(0x0b0806, 0.035);
export const barCam = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
export const MB = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });
export const glow = (c, op) => MB(c, { transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
export const seg = (g, mat, a, b, r) => { const m = new THREE.Mesh(CG, mat); v1.set(a[0], a[1], a[2]); v2.set(b[0], b[1], b[2]); const L = v1.distanceTo(v2); m.position.copy(v1).add(v2).multiplyScalar(0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, v2.sub(v1).divideScalar(L)); g.add(m); return m; };
export const quad = (par, mat, a, b, c, d) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3)); g.setIndex([0, 1, 2, 2, 1, 3]); const m = new THREE.Mesh(g, mat); par.add(m); return m; };
bar.add(new THREE.AmbientLight(0x5a5070, 1.9));
export const barLamp = [-2.3, 2.3].map((x) => { const l = new THREE.PointLight(0xffa550, 12, 11, 2); l.position.set(x, 2.75, 0.4); bar.add(l);
  add(bar, new THREE.ConeGeometry(0.3, 0.26, 14, 1, true), M(0x1d3a2a, { side: THREE.DoubleSide }), x, 2.95, 0.4); add(bar, SG, MB(0xffe2b0, { fog: false }), x, 2.86, 0.4, 0.07); add(bar, CG, M(0x111111), x, 4.0, 0.4, 0.012, 2, 0.012); return l; });
add(bar, BG, M(0x2a1a10), 0, -0.05, -2, 18, 0.1, 18); add(bar, BG, M(0x1c130d), 0, 2.5, 2.7, 18, 5.2, 0.2); add(bar, BG, M(0x1c130d), -7, 2.5, -2, 0.2, 5.2, 18); add(bar, BG, M(0x1c130d), 7, 2.5, -2, 0.2, 5.2, 18);
for (let z = -6; z < 2.6; z += 0.9) add(bar, BG, M(0x1f130b), 0, 0.003, z, 14, 0.01, 0.03); // döşeme tahtası araları
add(bar, BG, M(0x3a2415), 0, 0.55, 0.45, 12, 1.1, 0.8); add(bar, BG, M(0x7a4d28), 0, 1.13, 0.4, 12.2, 0.06, 1.0); add(bar, CG, M(0xb08a3a), 0, 0.3, -0.05, 0.03, 12, 0.03).rotation.z = Math.PI / 2;
// arka raf: şişeler, neon
add(bar, BG, M(0x24170e), 0, 1.5, 2.45, 9, 3, 0.3); for (const y of [1.45, 2.05, 2.65]) add(bar, BG, M(0x5a3a20), 0, y, 2.25, 8.6, 0.05, 0.3);
{ const BC = [0x2f6b3a, 0x6b3a1a, 0x9a7a2a, 0x3a5a7a, 0x8a2a2a, 0xd8d0b0]; let n = 0; for (const y of [1.45, 2.05]) for (let x = -4; x <= 4; x += 0.36 + srnd() * 0.2) { const c = M(BC[n++ % 6]), hh = 0.26 + srnd() * 0.14; add(bar, CG, c, x, y + 0.03 + hh / 2, 2.22, 0.055, hh, 0.055); add(bar, CG, c, x, y + 0.08 + hh, 2.22, 0.02, 0.12, 0.02); } }
export const neon = add(bar, new THREE.PlaneGeometry(4.4, 1.1), MB(0xffffff, { transparent: true, fog: false, map: tex(512, 128, (g, w, h) => { g.font = '900 50px system-ui,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff2d6f'; g.shadowBlur = 22; g.fillStyle = '#ff8fb3'; for (let i = 0; i < 3; i++) g.fillText('ROAD HOGS BAR', w / 2, h / 2); }) }), 0, 3.5, 2.28); neon.rotation.y = Math.PI;
{ const l = new THREE.PointLight(0xff3070, 7, 8, 2); l.position.set(0, 3.4, 1.6); bar.add(l); }
// yan duvarlarda panjurlu pencereler: ışık sağdan ve soldan vurur
for (const s of [-1, 1]) { const x = s * 6.88, z0 = -3.0, z1 = -0.8;
  add(bar, BG, MB(0xd6e4ff, { fog: false }), x, 2.4, (z0 + z1) / 2, 0.02, 1.6, z1 - z0); add(bar, BG, M(0x0c0907), x - s * 0.04, 2.4, (z0 + z1) / 2, 0.05, 1.6, 0.08);
  for (let k = 0; k < 6; k++) add(bar, BG, M(0x0c0907), x - s * 0.05, 1.72 + k * 0.27, (z0 + z1) / 2, 0.05, 0.11, z1 - z0 + 0.06);
  for (let k = 0; k < 6; k++) { const y = 1.75 + k * 0.26; quad(bar, glow(0xc4d6ff, 0.045), [x, y, z0], [x, y, z1], [x - s * 5.4, y - 2.6, z0 + 0.5], [x - s * 5.4, y - 2.6, z1 + 0.5]); }
  const l = new THREE.DirectionalLight(s < 0 ? 0xbcd0ff : 0xffe0b8, 2.4); l.position.set(s * 6, 3.2, -2); l.target.position.set(0, 1, -0.6); bar.add(l); bar.add(l.target); }
export const dust = (() => { const n = 160, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random(), s = i % 2 ? 1 : -1; p[i * 3] = s * (6.8 - u * 5.2); p[i * 3 + 1] = 2.5 - u * 2.5 + rnd(-0.6, 0.6); p[i * 3 + 2] = rnd(-3, -0.6) + u * 0.5; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdde8ff, size: 0.035, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); bar.add(m); return m; })();
// küllük, sigara, duman
add(bar, CG, M(0x8d8d92), 0, 1.18, 0.5, 0.14, 0.04, 0.14); add(bar, CG, M(0xf2ead8), 0.06, 1.22, 0.5, 0.012, 0.17, 0.012).rotation.z = Math.PI / 2 - 0.2; add(bar, SG, MB(0xff6a1a, { fog: false }), 0.145, 1.238, 0.5, 0.017);
export const smT = tex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
export const smoke = Array.from({ length: 20 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smT, transparent: true, depthWrite: false, color: 0xd8d0c8, fog: false })); bar.add(s); return s; });
// ---------- kamyoncu tipi (barda ve oyunda aynı) ----------
export const SKIN = [0xd9a37c, 0xc68e63, 0xe0b08f, 0xb97f55], HAIR = [0x2a1c12, 0x111111, 0x6b6b6b, 0x4a2a14];
export const leather = new THREE.MeshPhongMaterial({ color: 0x15110d, shininess: 45, specular: 0x3a3028 }), jean = M(0x26344d), dark = M(0x0b0908), steel = M(0x777777);
export function faceParts(h, k, sk, col, hr) { // kafa yarıçapı 0.21 kabul edilir; +z yüzün baktığı yön
  add(h, SG, sk, 0, -0.02, 0.2, 0.05); add(h, SG, sk, 0.21, 0, 0, 0.03, 0.06, 0.04); add(h, SG, sk, -0.21, 0, 0, 0.03, 0.06, 0.04);
  if (k % 2) add(h, BG, dark, 0, 0.05, 0.185, 0.34, 0.075, 0.06); // güneş gözlüğü
  else for (const s of [-1, 1]) { add(h, SG, MB(0xffffff), s * 0.08, 0.05, 0.185, 0.035, 0.025, 0.02); add(h, SG, dark, s * 0.08, 0.05, 0.2, 0.016); add(h, BG, hr, s * 0.085, 0.105, 0.195, 0.11, 0.03, 0.04).rotation.z = s * -0.45; }
  if (k === 0 || k === 2) add(h, SG, hr, 0, -0.13, 0.07, 0.2, 0.17, 0.17); // sakal
  add(h, BG, hr, 0, -0.075, 0.2, k % 2 ? 0.24 : 0.16, 0.05, 0.05); // bıyık
  if (k === 0) { add(h, CG, col, 0, 0.17, 0, 0.217, 0.13, 0.217); add(h, BG, col, 0, 0.12, 0.26, 0.28, 0.03, 0.22); } // kep
  else if (k === 2) { add(h, CG, col, 0, 0.13, 0, 0.22, 0.09, 0.22); add(h, SG, col, 0.1, 0.1, -0.22, 0.05); } // bandana
  else if (k === 3) { add(h, CG, M(0x3a2414), 0, 0.14, 0, 0.38, 0.03, 0.38); add(h, CG, M(0x3a2414), 0, 0.24, 0, 0.19, 0.2, 0.19); add(h, CG, col, 0, 0.17, 0, 0.195, 0.04, 0.195); } // kovboy şapkası
}
// Duruşlar (yerel eksen: +z kişinin baktığı yön). ry: gövde dönüşü (0 = bara dönük), hy: kafanın gövdeye göre dönüşü.
export const LEG = (s) => [[s * 0.21, 0.87, 0.45], [s * 0.21, 0.36, 0.38]];
export const POSE = [
  { ry: Math.PI, z: -0.5, hy: 0.25, lean: -0.1, legs: [[[0.25, 0.5, 0.4], [0.28, 0.08, 0.62]], LEG(-1)], arms: [[[0.53, 1.26, 0.1], [0.46, 1.2, 0.5]], [[-0.6, 1.27, -0.42], [-0.76, 1.22, -0.2]]], mug: [-0.95, -0.75], ball: 1 }, // sırtı barda, bir ayağı yerde, elinde beyzbol topu
  { ry: -Math.PI / 2, z: -0.7, hy: -1.1, lean: 0, legs: [LEG(1), LEG(-1)], arms: [[[0.66, 1.25, 0.02], [0.74, 1.24, 0.3]], [[-0.52, 1.3, 0.12], [-0.25, 1.02, 0.42]]], mug: [0.92, 0.42] }, // yan oturmuş, dirseği tezgâhta, bakıyor
  { ry: 0.5, z: -0.7, hy: 1.75, lean: 0.06, legs: [LEG(1), LEG(-1)], arms: [[[0.54, 1.3, 0.3], [0.28, 1.23, 0.72]], [[-0.54, 1.3, 0.3], [-0.28, 1.23, 0.72]]], mug: [0.3, 1.1] }, // bara dönük, omzunun üstünden bakıyor
  { ry: Math.PI, z: -0.7, hy: 0, lean: 0, legs: [[[0.3, 0.87, 0.42], [0.34, 0.36, 0.36]], [[-0.3, 0.87, 0.42], [-0.34, 0.36, 0.36]]], arms: [[[0.52, 1.3, 0.2], [-0.1, 1.4, 0.42]], [[-0.52, 1.3, 0.2], [0.1, 1.33, 0.44]]], mug: [0.6, -0.95] }, // salona dönük, kollar bağlı
];
export function trucker(ci, name) {
  const k = ci % 4, ps = POSE[k], g = new THREE.Group(), sk = M(SKIN[k]), col = M(COL[k]), hr = M(HAIR[k]);
  add(g, CG, M(0x5a1f1a), 0, 0.78, 0, 0.25, 0.08, 0.25); add(g, CG, steel, 0, 0.39, 0, 0.04, 0.78, 0.04); add(g, CG, steel, 0, 0.02, 0, 0.26, 0.04, 0.26); add(g, new THREE.TorusGeometry(0.22, 0.02, 6, 20), steel, 0, 0.33, 0).rotation.x = Math.PI / 2;
  const n0 = g.children.length; // bundan sonra eklenen bacaklar iskeletli model gelince gizlenir
  ps.legs.forEach((L, i) => { const s = i ? -1 : 1; seg(g, jean, [s * 0.16, 0.9, 0], L[0], 0.115); seg(g, jean, L[0], L[1], 0.09); add(g, BG, dark, L[1][0], L[1][1] - 0.04, L[1][2] + 0.07, 0.15, 0.11, 0.32); });
  const bacak = g.children.slice(n0);
  const b = new THREE.Group(); b.position.y = 0.9; b.rotation.x = ps.lean; g.add(b); const Y = -0.9; // gövde kalçadan eğilir
  add(b, SG, leather, 0, 1.4 + Y, -0.03, 0.46, 0.54, 0.37); const belly = add(b, SG, col, 0, 1.2 + Y, 0.15, 0.37, 0.39, 0.33); add(b, BG, dark, 0, 0.98 + Y, 0.3, 0.5, 0.05, 0.12); add(b, BG, M(0xc9a23a), 0, 0.98 + Y, 0.37, 0.1, 0.07, 0.02);
  add(b, CG, sk, 0, 1.88 + Y, 0, 0.11, 0.14, 0.11);
  const eller = [];
  ps.arms.forEach((A, i) => { const s = i ? -1 : 1, e = [A[0][0], A[0][1] + Y, A[0][2]], hnd = [A[1][0], A[1][1] + Y, A[1][2]]; add(b, SG, leather, s * 0.42, 1.68 + Y, 0, 0.15); seg(b, leather, [s * 0.44, 1.66 + Y, 0], e, 0.115); seg(b, leather, e, hnd, 0.1); eller.push(add(b, SG, sk, hnd[0], hnd[1], hnd[2] + 0.02, 0.085)); });
  const h = new THREE.Group(); h.position.set(0, 2.05 + Y, 0.02); b.add(h); add(h, SG, sk, 0, 0, 0, 0.21, 0.235, 0.21); faceParts(h, k, sk, col, hr);
  const kupa = new THREE.Group(); kupa.position.set(ps.mug[0], 1.25, ps.mug[1]); g.add(kupa); add(kupa, CG, M(0xe9a824, { transparent: true, opacity: 0.85 }), 0, 0, 0, 0.07, 0.18, 0.07); add(kupa, CG, M(0xffffff), 0, 0.105, 0, 0.072, 0.035, 0.072);
  const ns = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, fog: false, map: tex(256, 64, (c, w, hh) => { c.font = '900 34px system-ui,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(name, w / 2, hh / 2); c.fillStyle = '#' + COL[k].toString(16).padStart(6, '0'); c.fillText(name, w / 2, hh / 2); }) })); ns.position.set(0, 2.62, 0); ns.scale.set(1.3, 0.325, 1); g.add(ns); ns.visible = !location.search.includes('temiz'); // ?temiz: tanıtım görselleri için isimsiz
  let ball = null; if (ps.ball) { const A = ps.arms[0][1]; ball = new THREE.Group(); ball.userData.y0 = A[1] + Y + 0.125; ball.position.set(A[0], ball.userData.y0, A[2] + 0.02); b.add(ball); add(ball, SG, M(0xf4efe2), 0, 0, 0, 0.045); for (const r of [0.6, -0.6]) add(ball, new THREE.TorusGeometry(0.04, 0.004, 4, 16), M(0xc0392b), 0, 0, 0).rotation.set(r, r, 0); } // beyzbol topu
  g.rotation.y = ps.ry; g.userData = { ns, h, belly, k, ps, ball, eller, kupa, kupa0: kupa.position.clone() };
  // iskeletli model: yüklenince eski kutu gövde gizlenir (top, kupa, tabure ve isim kalır)
  makeRig(ci, g).then((r) => { if (!r) return; for (const m of bacak) m.visible = false; for (const c of b.children) if (c !== ball) c.visible = false; g.userData.rig = r; g.userData.b = b; });
  return g;
}
export const truckers = new Map(); export let barT = 0;
export const setBarT = (t) => { barT = t; }; // test/tanıtım: zamanı dondurmak için
// ---------- barda iskeletli karakterler: kemiklerle hareket ----------
// Kalça taburede, bacaklar sarkar. Üstüne zamanla değişen katmanlar: nefes, etrafa bakma, top atıp tutma (bilekle),
// biradan yudum alma (kupayı ağzına götürür, başını geriye atar), kollar bağlıyken arada bir gülme.
const BK = new THREE.Vector3(), BQ = new THREE.Quaternion(), BH = { lh: new THREE.Vector3(), rh: new THREE.Vector3(), lf: new THREE.Vector3(), rf: new THREE.Vector3() }, AG = new THREE.Vector3(), ON = new THREE.Vector3(), AQ2 = new THREE.Vector3(), EK = { egil: 0, basEg: 0, bilek: [0, 0] };
const yumusak = (x) => x * x * (3 - 2 * x), aralik = (x, a, b) => yumusak(Math.min(1, Math.max(0, (x - a) / (b - a))));
// top: döngü 2,5 sn; u<0.72 havada. El atışta yukarı fırlar (bilek bükülür), inişte topu karşılayıp yumuşatır.
export function topEli(t) {
  const u = (t * 0.4) % 1;
  const atis = u < 0.06 ? Math.sin((u / 0.06) * Math.PI) : 0; // ani yukarı itiş
  const karsila = u > 0.6 && u < 0.9 ? Math.sin(((u - 0.6) / 0.3) * Math.PI) : 0; // inen topa doğru kalkıp birlikte çöker
  return { dy: atis * 0.1 + karsila * 0.05 - (u > 0.72 && u < 0.85 ? (0.85 - u) * 0.5 : 0), bilek: -atis * 0.9 + karsila * 0.35, u };
}
// Mavi (ince uzun) oturmaz: taburenin yanında, sırtını tezgâha yaslamış, kollar göğsünde bağlı, salona bakar.
// oturanların bacakları: [uyluk, baldır] oranları (sol, sağ) — biraz farklı olsun ki cansız durmasın
// ağzın başa göre öne uzaklığı (sakallar farklı): kırmızı, mavi, sarı, yeşil
const AGIZ = [0.25, 0.22, 0.44, 0.25];
// kupa boyu: iri elli sarıda kupa da büyük (yoksa yumruğun içinde kaybolur)
const KUPA = [1, 1, 1.35, 1];
const OTUR = [[[0.95, 0.9], [1.0, 0.6]], null, [[0.95, 0.95], [0.9, 0.8]], [[0.95, 0.9], [0.95, 0.92]]];
const KY = new THREE.Vector3(), KA = new THREE.Vector3(), KK = new THREE.Vector3(), KV = new THREE.Vector3(), KP = new THREE.Vector3(), KB = new THREE.Vector3(), KQ = new THREE.Quaternion();
const AQ = new THREE.Quaternion(), AY = new THREE.Vector3(0, 1, 0), AX = new THREE.Vector3(1, 0, 0), AT = new THREE.Vector3();
function ayakta(u, g, t) {
  const r = u.rig, gx = g.position.x + 0.62, hy = r.hipY - 0.04;
  AQ.setFromAxisAngle(AY, Math.PI + 0.35 + Math.sin(t * 0.21) * 0.06).multiply(BQ.setFromAxisAngle(AX, -0.12)); // salona dönük, hafif geriye yaslı
  BK.set(gx, hy, -0.2);
  const yer = (v, x, y, z) => v.set(x, y, z).applyQuaternion(AQ).add(BK); // gövdeye göre konum → dünya
  const nefes = Math.sin(t * 1.5) * 0.012;
  BH.lf.set(gx + 0.1, 0.13, -0.5); BH.rf.set(gx - 0.18, 0.13, -0.42);
  EK.egil = nefes; EK.basEg = 0.05 + Math.sin(t * 0.33) * 0.06; EK.bilek[0] = EK.bilek[1] = 0; EK.kolBagla = nefes || true; // kollar çapraz: her el öbür dirseğe
  poseRig(r, BK, AQ, BH, u.h.rotation.y * 0.7 - 0.2, EK); EK.kolBagla = false;
  u.ns.position.copy(g.worldToLocal(AT.set(gx, 2.55, -0.2))); // isim kendi başının üstünde
}
function barRig(u, g, t) {
  if (u.k === 1) return ayakta(u, g, t);
  const b = u.b, ps = u.ps, k = u.k; b.updateWorldMatrix(true, false);
  // kalça: uyluklar minderin (üstü 0,82) hemen üstünde kalacak yükseklikte
  BK.set(0, 0.04 + u.rig.kalcaBacak, 0); b.localToWorld(BK); b.getWorldQuaternion(BQ);
  u.eller[0].getWorldPosition(BH.lh); u.eller[1].getWorldPosition(BH.rh);
  EK.otur = OTUR[k];
  if (k === 2) { // sarı: tam yan dönük oturur; sağ dirseği tezgâhta, sol eli dizinde, kupası sağ elinin yanında
    BQ.setFromAxisAngle(AY, Math.PI / 2); const gx = BK.x;
    BH.rh.set(gx + 0.12, 1.21, 0.3); BH.lh.set(gx + 0.3, 0.98, -0.18);
    u.kupa0.copy(g.worldToLocal(AT.set(gx + 0.32, 1.25, 0.38)));
  }
  if (k === 3) { // yeşil (yaşlı usta): rahat kamyoncu oturuşu — alçak, dizler açık, ayaklar halkada, dirsekler dizlerde, öne eğik
    BK.y -= 0.06; EK.otur = null; EK.dizDisa = true;
    const yer = (v, x, y, z) => v.set(x, y, z).applyQuaternion(BQ).add(BK);
    yer(BH.lf, 0.3, -0.5, 0.22); yer(BH.rf, -0.3, -0.5, 0.22); BH.lf.y = BH.rf.y = 0.43; // ayaklar taburenin halkasında (0,33) duruyor
    // kollar uyluklarda (dizlere yakın), arada bir ağır ağır dizini tıpışlar; gülerken sağ eliyle dizine vurur
    const l = (t + 2) % 7, gul = l < 1.6 ? Math.sin((l / 1.6) * Math.PI) : 0, vur = l < 1.6 ? Math.max(0, Math.sin(l * 9)) * 0.12 * gul : 0;
    const tip = Math.max(0, Math.sin(t * 5.2)) * 0.035 * (Math.sin(t * 0.4) > 0.6 ? 1 : 0); // ritim tutar gibi
    EK.elDiz = { f: [0.72, 0.75], dy: [tip, vur] };
  }
  // nefes ve hafif sallanma
  EK.egil = Math.sin(t * 1.6 + k) * 0.025 + Math.sin(t * 0.37 + k * 2) * 0.04 + (k === 3 ? 0.1 : 0); EK.basEg = Math.sin(t * 0.3 + k) * 0.08 - (k === 3 ? 0.12 : 0); EK.bilek[0] = EK.bilek[1] = 0;
  let bas = k === 2 ? 0.55 + Math.sin(t * 0.45 + 1) * 0.35 : u.h.rotation.y; // sarı arada salona (kameraya) ters ters bakar
  if (k === 3) { bas += Math.sin(t * 0.23) * 0.45; EK.basEg += Math.max(0, Math.sin(t * 0.7)) * Math.sin(t * 6) * 0.05; } // yaşlı: etrafa bakınır, arada başını sallar
  // top atma (sol el)
  if (u.ball) { const e = topEli(t); BH.lh.y += e.dy; EK.bilek[0] = e.bilek; bas = bas * 0.4 + 0.25; EK.basEg = -0.25 * (1 - Math.abs(e.u * 2 - 0.7)); } // gözü topta
  // bira: önce kupanın yolu hesaplanır (yerinden ağzın önüne, orada yudum için eğilir), el kupayı yanından kavrar.
  const el = u.ball || k === 2 ? 1 : 0, eh = el ? BH.rh : BH.lh, d = (t + k * 3.1) % 9;
  const elde = k === 0; // kırmızının sırtı tezgâhta: kupayı hep sağ elinde, dizinin üstünde tutar
  let ic = null;
  if (k !== 3) {
    const uzan = elde ? 1 : aralik(d, 0, 0.6) * (1 - aralik(d, 3.0, 3.6)); // el kupaya gider / bırakır
    const kaldir = aralik(d, 0.6, 1.3) * (1 - aralik(d, 2.5, 3.1)); // kupa ağza kalkar
    const yudum = aralik(d, 1.25, 1.6) * (1 - aralik(d, 2.2, 2.55)); // kupa ağızda eğilir, baş geriye
    const yan = ON.set(el ? -1 : 1, 0, 0).applyQuaternion(BQ), ileri = AQ2.set(0, 0, 1).applyQuaternion(BQ);
    // kupanın duruş yeri: kırmızıda dizinin üstü, ötekilerde tezgâh
    const yer = elde ? KY.set(-0.2, 0.02, 0.36).applyQuaternion(BQ).add(BK) : KY.copy(u.kupa0).applyMatrix4(g.matrixWorld);
    // ağzın önü: başın önünde, çene hizasında (baş kemiği kafatasının altındadır)
    const agiz = u.rig.B.Head.getWorldPosition(KA).addScaledVector(ileri, AGIZ[k]).addScaledVector(yan, 0.03); agiz.y += 0.07;
    const kupa = KK.copy(yer).lerp(agiz, kaldir); kupa.y += Math.sin(kaldir * Math.PI) * 0.06; // hafif yay çizerek kalkar
    // eğim: kupanın ağzı yüze doğru yatar (yan eksen etrafında)
    KQ.setFromAxisAngle(yan, (el ? 1 : -1) * (kaldir * 0.25 + yudum * 1.05));
    // el: avuç kupaya bakar, parmaklar öne (biraz içe) doğru kupayı sarar; bilek kupanın dış yanında
    const avuc = KV.copy(yan).negate(), parmak = KP.copy(ileri).addScaledVector(yan, -0.3).applyQuaternion(KQ).normalize();
    const uz = (u.rig.el && u.rig.el[el] ? u.rig.el[el].uzun : 0.07) * 0.9;
    const bilek = KB.copy(kupa).addScaledVector(yan, 0.05).addScaledVector(parmak, -uz); bilek.y -= 0.04; // kupanın alt yarısından tutar, ağzı elin üstünde görünsün
    eh.lerp(bilek, uzan);
    if (k === 2) EK.egil += kaldir * 0.3; // kısa kollu iri sarı: kupaya doğru öne eğilir, yudumda başı daha az geriye gider
    EK.basEg -= yudum * (k === 2 ? 0.25 : 0.45) + kaldir * 0.08; bas *= 1 - kaldir; EK.kolDisa = true;
    EK.tut = { i: el, parmak, avuc, a: uzan }; ic = { el, uzan, kupa, bilek, KQ };
  }
  // kollar bağlı olan (yeşil): arada bir kahkaha, omuzlar sarsılır
  // yeşil: arada bir kahkaha — başını geriye atar, omuzları sarsılır (eller rig.js'te uyluklarda)
  if (k === 3) { const l = (t + 2) % 7; if (l < 1.6) { const g = Math.sin((l / 1.6) * Math.PI), s = Math.sin(l * 22) * 0.05 * (1 - l / 1.6); EK.egil += s - 0.14 * g; EK.basEg -= 0.4 * g; } }
  EK.avuc = u.ball ? [AVUC(), 0] : null; // topu tutan elin avucu yukarı baksın
  poseRig(u.rig, BK, BQ, BH, bas, EK); EK.kolBagla = false; EK.otur = null; EK.dizDisa = false; EK.elDiz = false; EK.kolDisa = false; EK.avuc = null; EK.tut = null;
  // kupa elle birlikte: elin vardığı yere göre kaydırılır (IK yetişemese de kupa elde kalır); el uzanmamışsa yerinde durur
  u.kupa.position.copy(u.kupa0); u.kupa.quaternion.identity(); u.kupa.scale.setScalar(KUPA[k]);
  if (ic) {
    const B = u.rig.B, h = ic.el ? B.RightHand : B.LeftHand; h.getWorldPosition(AG);
    if (ic.uzan > 0.98 || elde) ic.kupa.add(AG.sub(ic.bilek));
    { u.kupa.position.copy(g.worldToLocal(AT.copy(ic.kupa))); g.getWorldQuaternion(AQ).invert(); u.kupa.quaternion.copy(AQ.multiply(ic.KQ)); }
  }
  // top avuçta durur
  if (u.ball) { const h = u.rig.B.LeftHand; h.getWorldPosition(AG); h.getWorldQuaternion(AQ); AT.set(0, 1, 0).applyQuaternion(AQ); u.avuc = (u.avuc || new THREE.Vector3()).copy(AG).addScaledVector(AT, 0.1); u.avuc.y += 0.06; } // avuç ortası: bilekten parmaklara doğru (kemik +y yönü)
}
const AVUC = () => -2.0; // sol ön kolu bu kadar çevirince avuç yukarı bakar (yakın çekimle bulundu)
// ---------- barmen: haydut tezgâhın arkasında ----------
// Tezgâhı bezle siler, sinsi sinsi etrafa bakar, arada ellerini ovuşturur. Oturan oyuncuların arasında görünecek yerde durur.
const barmen = { g: new THREE.Group(), rig: null, x: 0 };
bar.add(barmen.g); const bez = add(barmen.g, BG, M(0xe8e2d0), 0, 0, 0, 0.16, 0.03, 0.12);
makeRig(0, barmen.g, 'haydut.glb').then((r) => { barmen.rig = r; });
const MD1 = new THREE.Vector3(), MD2 = new THREE.Vector3(), MD3 = new THREE.Vector3(), MD4 = new THREE.Vector3(), MD5 = new THREE.Vector3(), MD6 = new THREE.Vector3();
const MK = new THREE.Vector3(), MQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), MH = { lh: new THREE.Vector3(), rh: new THREE.Vector3(), lf: new THREE.Vector3(), rf: new THREE.Vector3() }, MEK = { egil: 0, basEg: 0, bilek: [0, 0] };
function drawBarmen(t, n) {
  const r = barmen.rig; bez.visible = !!r; if (!r) return;
  barmen.x += ((n % 2 ? 0.85 : 0) - barmen.x) * 0.03; const x = barmen.x, z = 1.38; // oyuncu sayısına göre taburelerin arasına geçer
  const ovus = (t % 11) > 8.2, k = ovus ? Math.min(1, ((t % 11) - 8.2) * 2) * Math.min(1, (11 - (t % 11)) * 2) : 0; // son 2,8 sn: eller ovuşturulur
  MK.set(x, r.hipY, z);
  // Barmen salona (-z) bakar: sağ eli +x yanında (kameradan bakınca solda), sol eli -x yanında.
  // Sağ el tezgâhı daire çizerek siler; sol el tezgâhın kenarına dayanır.
  const a = t * 2.4;
  MH.rh.set(x + 0.26 + Math.cos(a) * 0.13, 1.2, 0.86 + Math.sin(a) * 0.08);
  MH.lh.set(x - 0.3, 1.2, 0.96);
  // el ovuşturma: iki el göğsün önünde buluşur, sağ el sol elin üstünde ileri geri kayar
  if (k > 0) { const o = Math.sin(t * 14) * 0.035; MH.rh.lerp(MK.clone().set(x + 0.045, 1.28 + o, z - 0.26), k); MH.lh.lerp(MK.clone().set(x - 0.045, 1.28 - o, z - 0.26), k); }
  MH.lf.set(x + 0.14, 0.13, z + 0.02); MH.rf.set(x - 0.14, 0.13, z + 0.02);
  MEK.egil = 0.22 * (1 - k) + Math.sin(t * 1.4) * 0.02; MEK.basEg = -0.12 + Math.sin(t * 0.9) * 0.05 - k * 0.15; MEK.bilek[0] = MEK.bilek[1] = 0;
  // eller: silen elin avucu tezgâha bakar, parmaklar ileri; ovuştururken avuçlar birbirine
  MEK.tut = [{ i: 1, parmak: MD1.set(-0.25, -0.35, -1).lerp(MD3.set(0, 0.8, -0.6), k), avuc: MD2.set(0, -1, 0).lerp(MD3.set(-1, 0, 0), k), a: 1 }, { i: 0, parmak: MD4.set(0.2, -0.4, -1).lerp(MD6.set(0, 0.8, -0.6), k), avuc: MD5.set(0, -1, 0).lerp(MD6.set(1, 0, 0), k), a: 1 }];
  // sinsi bakışlar: arada hızla sağa sola döner
  const g = t % 5, bas = g < 0.5 ? 0.6 * Math.sin((g / 0.5) * Math.PI) : g > 2.5 && g < 3 ? -0.6 * Math.sin(((g - 2.5) / 0.5) * Math.PI) : Math.sin(t * 0.5) * 0.12;
  poseRig(r, MK, MQ, MH, bas, MEK);
  bez.position.set(MH.rh.x - 0.02, 1.165, MH.rh.z - 0.07); bez.rotation.y = a * 0.3; /* bez avucun altında */ bez.visible = k < 0.5;
}
export function drawBar(V, dt) {
  barT += dt; const a = innerWidth / innerHeight; if (barCam.aspect !== a) { barCam.aspect = a; barCam.fov = a < 1 ? 70 : 50; barCam.updateProjectionMatrix(); }
  const d = clamp(3.7 / (Math.tan(barCam.fov * Math.PI / 360) * a), 4.7, 12); barCam.position.set(Math.sin(barT * 0.15) * 0.35, 1.75, -0.6 - d); barCam.lookAt(0, 1.25, -0.4);
  const ids = new Set(), mid = (V.p.length - 1) / 2; drawBarmen(barT, V.p.length);
  V.p.forEach((p, i) => { ids.add(p.id); let g = truckers.get(p.id); if (g && g.userData.k !== p.c % 4) { bar.remove(g); truckers.delete(p.id); g = null; } /* karakter değişti */ if (!g) { g = trucker(p.c, p.n); truckers.set(p.id, g); bar.add(g); }
    const u = g.userData; g.position.set((mid - i) * 1.7, 0, u.ps.z);
    u.h.rotation.y = u.ps.hy + Math.sin(barT * 0.45 + u.k * 2.1) * 0.22; u.h.rotation.x = 0.08 + Math.sin(barT * 0.3 + u.k) * 0.05; u.belly.scale.z = 0.33 * (1 + Math.sin(barT * 1.6 + u.k) * 0.05);
    if (u.rig) barRig(u, g, barT);
    if (u.ball) { const t = Math.min(1, ((barT * 0.4) % 1) / 0.72); u.ball.rotation.x = t * Math.PI * 2;
      if (u.rig && u.avuc) { u.ball.position.copy(u.b.worldToLocal(u.avuc.clone())); u.ball.position.y += 1.9 * t * (1 - t); } // avuçtan kalkar, avuca iner
      else u.ball.position.y = u.ball.userData.y0 + 1.9 * t * (1 - t); } }); // topu yavaşça atıp tutar
  for (const [id, g] of truckers) if (!ids.has(id)) { bar.remove(g); truckers.delete(id); }
  smoke.forEach((s, i) => { const u = (barT * 0.22 + i / smoke.length) % 1; s.position.set(0.145 + Math.sin(u * 6 + i) * 0.12 * u + u * 0.15, 1.26 + u * 1.7, 0.5 + Math.cos(u * 4 + i * 2) * 0.08 * u); const z = 0.06 + u * 0.55; s.scale.set(z, z, 1); s.material.opacity = 0.34 * (1 - u) * Math.min(1, u * 10); });
  dust.position.set(Math.sin(barT * 0.13) * 0.15, Math.sin(barT * 0.2) * 0.12, 0);
  neon.material.opacity = Math.sin(barT * 31) > 0.97 || Math.sin(barT * 2.3) > 0.985 ? 0.35 : 1;
  barLamp.forEach((l, i) => (l.intensity = 12 + Math.sin(barT * 9 + i * 3) * 0.5));
  ren.render(bar, barCam);
}
export const pm = new Map();
export const qY = new THREE.Quaternion(), v3 = new THREE.Vector3();
export function limbV(m, a, b, r) { const L = a.distanceTo(b) || 0.01; m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, v3.copy(b).sub(a).divideScalar(L)); }
const ARMA = new THREE.MeshBasicMaterial({ transparent: true, map: tex(128, 128, (c) => { c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#15110d'; c.stroke(); c.fillStyle = '#15110d'; c.font = '900 64px system-ui,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RH', 64, 68); }) }); // yelek arması
export function playerMesh(ci) { // bardaki kamyoncunun aynısı. Gövde+göbek+kafa tek katı parça (o.body); eller, ayaklar ve uzuvlar fizik noktalarını izler
  const k = ci % 4, g = new THREE.Group(), sk = M(SKIN[k]), col = M(COL[k]), o = { g, s: [], l: [] }, b = (o.body = new THREE.Group()); g.add(b);
  add(b, SG, jean, 0, 0, 0, 0.27, 0.24, 0.25); add(b, SG, leather, 0, 0.42, -0.02, 0.4, 0.46, 0.33); add(b, SG, col, 0, 0.24, 0.16, 0.33, 0.33, 0.29); add(b, BG, col, 0, 0.47, -0.31, 0.34, 0.28, 0.06);
  add(b, CG, sk, 0, 0.86, 0, 0.1, 0.12, 0.1); for (const sd of [-1, 1]) add(b, SG, leather, sd * 0.36, 0.66, 0, 0.14);
  const hd = new THREE.Group(); hd.position.set(0, 1.0, 0.02); hd.scale.setScalar(1.1); add(hd, SG, sk, 0, 0, 0, 0.21, 0.235, 0.21); faceParts(hd, k, sk, col, M(HAIR[k])); b.add(hd);
  // kemer, toka, yeleğin sırtındaki arma
  add(b, CG, dark, 0, 0.07, 0, 0.275, 0.07, 0.255); add(b, BG, M(0xd9b23a), 0, 0.07, 0.25, 0.1, 0.075, 0.03);
  add(b, new THREE.PlaneGeometry(0.3, 0.3), ARMA, 0, 0.47, -0.345).rotation.y = Math.PI;
  [[0.13, sk], [0.13, sk], [0.16, dark], [0.16, dark]].forEach(([r, m]) => o.s.push(add(g, SG, m, 0, 0, 0, r)));
  for (const k of [2, 3]) o.s[k].scale.set(0.15, 0.13, 0.25); // ayaklar: bot biçimi (yönü hud.js çevirir)
  for (let i = 0; i < 4; i++) o.l.push(add(g, CG, i < 2 ? leather : jean, 0, 0, 0, 1));
  scene.add(g); return o;
}
export function limb(m, P, a, b, r) { v1.set(P[a], P[a + 1], P[a + 2]); v2.set(P[b], P[b + 1], P[b + 2]); const L = v1.distanceTo(v2) || 0.01; m.position.copy(v1).add(v2).multiplyScalar(0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, v2.sub(v1).divideScalar(L)); }
