// İskeletli karakter (Meshy, Mixamo kemik adları). Hareketi animasyon değil fizik verir:
// kalça kemiği fizik kalça noktasına, kollar ve bacaklar iki kemikli IK ile el/ayak noktalarına uzanır.
import * as THREE from 'three';
import { clone as cloneSkinned } from '../lib/SkeletonUtils.js';
import { loadModel, recolor } from './models.js';

export const CHAR_URL = 'assets/chars/trucker.glb';
// Oyuncu rengine göre karakter dosyası. Olmayanlar için kırmızı kamyoncu boyanarak kullanılır.
const KARAKTER = ['trucker.glb', 'mavi.glb', null, null];
const KEMIK = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];

// Oyuncu rengine göre tişört ve kepin kırmızısını başka renge çevirir (0: kırmızı, olduğu gibi).
const HEDEF = [null, [63, 167, 255], [255, 210, 63], [123, 211, 137]];
function kirmiziyiBoya(ci) {
  const h = HEDEF[ci % 4]; if (!h) return null;
  return (r, g, b) => {
    if (!(r > 150 && r > g * 2.6 && r > b * 2.6)) return null; // doygun kırmızı: tişört ve kep (ten ve dudak daha az doygun)
    const k = r / 235; return [Math.min(255, h[0] * k), Math.min(255, h[1] * k), Math.min(255, h[2] * k)];
  };
}

const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), m1 = new THREE.Matrix4();

// Kemiği, çocuğu hedef noktaya bakacak şekilde döndürür (dünya uzayında).
function aim(bone, child, hedef) {
  bone.getWorldPosition(v1); child.getWorldPosition(v2);
  const simdi = v2.sub(v1).normalize(), istek = v3.copy(hedef).sub(v1).normalize();
  if (simdi.lengthSq() < 1e-8 || istek.lengthSq() < 1e-8) return;
  q1.setFromUnitVectors(simdi, istek);
  bone.getWorldQuaternion(q2); q2.premultiply(q1);
  bone.parent.getWorldQuaternion(q1); bone.quaternion.copy(q1.invert().multiply(q2));
  bone.updateMatrixWorld(true);
}

// Kemiği dünya uzayındaki bir eksen etrafında döndürür (baş çevirme vb.).
function turn(bone, eksen, aci) {
  bone.getWorldQuaternion(q2); q2.premultiply(q1.setFromAxisAngle(eksen, aci));
  bone.parent.getWorldQuaternion(q1); bone.quaternion.copy(q1.invert().multiply(q2)); bone.updateMatrixWorld(true);
}

// İki kemikli IK: üst kemik (omuz/kalça) → orta (dirsek/diz) → uç (el/ayak). kutup: dirseğin/dizin bakacağı yön.
const E = new THREE.Vector3(), S = new THREE.Vector3(), D = new THREE.Vector3(), N = new THREE.Vector3();
function ik(ust, orta, uc, hedef, kutup, a, b) {
  ust.getWorldPosition(S); D.copy(hedef).sub(S); const d0 = D.length(); if (d0 < 1e-5) return;
  D.divideScalar(d0); const d = Math.min(d0, (a + b) * 0.999);
  const cosA = Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))), sinA = Math.sqrt(1 - cosA * cosA);
  N.copy(kutup).addScaledVector(D, -kutup.dot(D)); if (N.lengthSq() < 1e-6) N.set(0, -1, 0); N.normalize();
  E.copy(S).addScaledVector(D, a * cosA).addScaledVector(N, a * sinA);
  aim(ust, orta, E); aim(orta, uc, hedef);
}

// Bir karakter kopyası üretir. Model yüklenmemişse null döner.
export async function makeRig(ci, parent) {
  const ozel = KARAKTER[ci % 4], m = (ozel && (await loadModel('assets/chars/' + ozel))) || (await loadModel(CHAR_URL)); if (!m) return null;
  const root = new THREE.Group(), model = cloneSkinned(m);
  const boya = !ozel || m !== (await loadModel('assets/chars/' + ozel)) ? kirmiziyiBoya(ci) : null; if (boya) recolor(model, 'rig' + (ci % 4), boya);
  model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false; } });
  root.add(model); root.matrixAutoUpdate = false; parent.add(root);
  const B = {}; model.traverse((o) => { if (o.isBone) { const ad = o.name.replace(/^mixamorig:?/, ''); if (KEMIK.includes(ad)) B[ad] = o; } });
  if (KEMIK.some((k) => !B[k])) { console.warn('karakter iskeleti eksik'); parent.remove(root); return null; }
  root.updateMatrixWorld(true);
  const bind = new Map(KEMIK.map((k) => [k, B[k].quaternion.clone()]));
  // ayakların köke göre duruşu: IK sonrası ayak tabanını yere paralel tutmak için
  const ayak = {}; for (const k of ['LeftFoot', 'RightFoot']) ayak[k] = B[k].getWorldQuaternion(new THREE.Quaternion());
  const w = (k) => B[k].getWorldPosition(new THREE.Vector3());
  const boy = (a, b) => w(a).distanceTo(w(b)), hips = w('Hips');
  return {
    root, B, bind, ayak,
    hipY: hips.y, // modelin ayak tabanından kalça kemiğine yükseklik (ölçek 1)
    kol: [boy('LeftArm', 'LeftForeArm'), boy('LeftForeArm', 'LeftHand')],
    bacak: [boy('LeftUpLeg', 'LeftLeg'), boy('LeftLeg', 'LeftFoot')],
  };
}

const sol = new THREE.Vector3(), ileri = new THREE.Vector3(), yukari = new THREE.Vector3(), kutup = new THREE.Vector3(), M = new THREE.Matrix4(), P = new THREE.Vector3(), SC = new THREE.Vector3(1, 1, 1);
// Karakteri yerleştirir. kalca: kalça kemiğinin dünya konumu; yon: gövdenin dünya yönelimi (+z ileri, +y yukarı);
// hedef: { lh, rh, lf, rf } dünya konumları (el ve ayak kemikleri); bas: baş çevirme açısı (radyan, gövde eksenine göre).
// ek (isteğe bağlı): { egil: gövdeyi öne eğme, basEg: başı öne eğme (eksi: geriye), bilek: [sol, sağ] bilek bükme } — radyan
export function poseRig(r, kalca, yon, hedef, bas = 0, ek = null) {
  for (const [k, q] of r.bind) r.B[k].quaternion.copy(q);
  // kök: kalça kemiği kalça noktasına gelecek biçimde
  P.set(0, -r.hipY, 0).applyQuaternion(yon).add(kalca);
  M.compose(P, yon, SC);
  r.root.parent.updateMatrixWorld(true);
  r.root.matrix.copy(m1.copy(r.root.parent.matrixWorld).invert().multiply(M));
  r.root.updateMatrixWorld(true);
  ileri.set(0, 0, 1).applyQuaternion(yon); yukari.set(0, 1, 0).applyQuaternion(yon); sol.set(1, 0, 0).applyQuaternion(yon);
  if (ek && ek.egil) { turn(r.B.Spine1, sol, ek.egil * 0.6); turn(r.B.Spine2, sol, ek.egil * 0.4); } // gövde: kollar IK'dan önce eğilir
  // kollar: dirsek geriye ve aşağı; bacaklar: diz ileri
  kutup.copy(ileri).multiplyScalar(-1).addScaledVector(yukari, -0.6);
  if (hedef.lh) ik(r.B.LeftArm, r.B.LeftForeArm, r.B.LeftHand, hedef.lh, kutup, r.kol[0], r.kol[1]);
  if (hedef.rh) ik(r.B.RightArm, r.B.RightForeArm, r.B.RightHand, hedef.rh, kutup, r.kol[0], r.kol[1]);
  kutup.copy(ileri);
  if (hedef.lf) ik(r.B.LeftUpLeg, r.B.LeftLeg, r.B.LeftFoot, hedef.lf, kutup, r.bacak[0], r.bacak[1]);
  if (hedef.rf) ik(r.B.RightUpLeg, r.B.RightLeg, r.B.RightFoot, hedef.rf, kutup, r.bacak[0], r.bacak[1]);
  // ayak tabanı yere paralel kalsın
  for (const k of ['LeftFoot', 'RightFoot']) { const f = r.B[k]; q2.copy(yon).multiply(r.ayak[k]); f.parent.getWorldQuaternion(q1); f.quaternion.copy(q1.invert().multiply(q2)); f.updateMatrixWorld(true); }
  if (bas) turn(r.B.Head, yukari, bas);
  if (ek && ek.basEg) turn(r.B.Head, sol, ek.basEg);
  if (ek && ek.bilek) { if (ek.bilek[0]) turn(r.B.LeftHand, sol, ek.bilek[0]); if (ek.bilek[1]) turn(r.B.RightHand, sol, ek.bilek[1]); }
}

