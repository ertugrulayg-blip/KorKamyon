// İskeletli karakter (Meshy, Mixamo kemik adları). Hareketi animasyon değil fizik verir:
// kalça kemiği fizik kalça noktasına, kollar ve bacaklar iki kemikli IK ile el/ayak noktalarına uzanır.
import * as THREE from 'three';
import { clone as cloneSkinned } from '../lib/SkeletonUtils.js';
import { loadModel, recolor } from './models.js';

export const CHAR_URL = 'assets/chars/trucker.glb';
// Oyuncu rengine göre karakter dosyası. Olmayanlar için kırmızı kamyoncu boyanarak kullanılır.
const KARAKTER = ['trucker.glb', 'mavi.glb', 'sari.glb', 'yesil.glb'];
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
// dosya verilirse (ör. 'haydut.glb') o model boyanmadan kullanılır.
export async function makeRig(ci, parent, dosya = null) {
  const ozel = dosya || KARAKTER[ci % 4], mo = ozel && (await loadModel('assets/chars/' + ozel)), m = mo || (await loadModel(CHAR_URL)); if (!m) return null;
  const root = new THREE.Group(), model = cloneSkinned(m);
  const boya = mo || dosya ? null : kirmiziyiBoya(ci); if (boya) recolor(model, 'rig' + (ci % 4), boya); // kendi modeli olmayan renk: kırmızı kamyoncu boyanır
  model.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = false; } });
  root.add(model); root.matrixAutoUpdate = false; parent.add(root);
  const B = {}; model.traverse((o) => { if (o.isBone) { const ad = o.name.replace(/^mixamorig:?/, ''); if (KEMIK.includes(ad)) B[ad] = o; } });
  if (KEMIK.some((k) => !B[k])) { console.warn('karakter iskeleti eksik'); parent.remove(root); return null; }
  root.updateMatrixWorld(true);
  const bind = new Map(KEMIK.map((k) => [k, B[k].quaternion.clone()]));
  // ayakların köke göre duruşu: IK sonrası ayak tabanını yere paralel tutmak için
  const kokQ = root.getWorldQuaternion(new THREE.Quaternion()).invert(), ayak = {}; // kök, döndürülmüş bir grubun içinde olabilir: ayak duruşu köke göre saklanır
  for (const k of ['LeftFoot', 'RightFoot']) ayak[k] = kokQ.clone().multiply(B[k].getWorldQuaternion(new THREE.Quaternion()));
  const w = (k) => B[k].getWorldPosition(new THREE.Vector3());
  const boy = (a, b) => w(a).distanceTo(w(b)), hips = w('Hips');
  return {
    root, B, bind, ayak, el: elOlc(model, B),
    hipY: hips.y - root.getWorldPosition(new THREE.Vector3()).y, // modelin ayak tabanından kalça kemiğine yükseklik (ölçek 1)
    kalcaBacak: hips.y - w('LeftUpLeg').y, // kalça kemiği ile uyluk başı arası
    bacakBoy: hips.y - w('LeftFoot').y, // kalça kemiğinden ayak bileğine (ayakta dik dururken)
    kol: [boy('LeftArm', 'LeftForeArm'), boy('LeftForeArm', 'LeftHand')],
    bacak: [boy('LeftUpLeg', 'LeftLeg'), boy('LeftLeg', 'LeftFoot')],
  };
}

// El ölçüsü (bağ pozunda, bir kez): el kemiğine bağlı köşelerden parmak yönü, avuç normali ve bilekten avuç ortasına uzaklık.
// Yönler el kemiğinin kendi ekseninde saklanır; böylece her modelde (kemik eksenleri farklı) el bir nesneyi doğru kavrar.
function elOlc(model, B) {
  let mesh = null; model.traverse((o) => { if (o.isSkinnedMesh && !mesh) mesh = o; });
  const sonuc = [null, null]; if (!mesh) return sonuc;
  model.updateMatrixWorld(true);
  const kalca = B.Hips.getWorldPosition(new THREE.Vector3());
  const pos = mesh.geometry.attributes.position, si = mesh.geometry.attributes.skinIndex, sw = mesh.geometry.attributes.skinWeight;
  for (const [i, ad] of [[0, 'LeftHand'], [1, 'RightHand']]) {
    const kemik = B[ad], bi = mesh.skeleton.bones.indexOf(kemik); if (bi < 0) continue;
    const bilek = kemik.getWorldPosition(new THREE.Vector3()), noktalar = [], v = new THREE.Vector3();
    for (let n = 0; n < pos.count; n++) {
      let a = 0; for (let j = 0; j < 4; j++) if (si.getComponent(n, j) === bi) a += sw.getComponent(n, j);
      if (a > 0.6) { mesh.getVertexPosition(n, v); noktalar.push(v.clone().applyMatrix4(mesh.matrixWorld)); }
    }
    if (noktalar.length < 8) continue;
    const orta = noktalar.reduce((t, q) => t.add(q), new THREE.Vector3()).divideScalar(noktalar.length);
    const parmak = orta.clone().sub(bilek); const uzun = parmak.length(); parmak.normalize();
    // avuç normali: köşe dağılımının en ince ekseni (parmak yönüne dik). Kovaryansın en küçük özvektörü, ters üs yöntemiyle.
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const q of noktalar) { const d = [q.x - orta.x, q.y - orta.y, q.z - orta.z]; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) C[r][c] += d[r] * d[c]; }
    const M3 = new THREE.Matrix3().set(C[0][0], C[0][1], C[0][2], C[1][0], C[1][1], C[1][2], C[2][0], C[2][1], C[2][2]);
    const tr = C[0][0] + C[1][1] + C[2][2]; M3.elements[0] += tr * 1e-6; M3.elements[4] += tr * 1e-6; M3.elements[8] += tr * 1e-6;
    const ters = M3.clone().invert(), avuc = new THREE.Vector3(0.3, 0.5, 0.8);
    for (let k = 0; k < 40; k++) { avuc.applyMatrix3(ters); avuc.addScaledVector(parmak, -avuc.dot(parmak)).normalize(); }
    // işaret: bağ pozunda (kollar aşağı) avuç gövdeye, kalçaya doğru bakar
    if (avuc.dot(v.copy(kalca).sub(bilek).setY(0)) < 0) avuc.negate();
    const qt = kemik.getWorldQuaternion(new THREE.Quaternion()).invert();
    sonuc[i] = { parmak: parmak.applyQuaternion(qt), avuc: avuc.applyQuaternion(qt), uzun };
  }
  return sonuc;
}

// Eli dünya yönüne çevirir: parmaklar 'parmak', avuç 'avuc' yönüne baksın. a: 0..1 karışım (0: IK'nın verdiği duruş).
const EM1 = new THREE.Matrix4(), EM2 = new THREE.Matrix4(), EQ = new THREE.Quaternion(), EX = new THREE.Vector3(), EY = new THREE.Vector3(), EZ = new THREE.Vector3();
function eliCevir(r, i, parmak, avuc, a = 1) {
  const o = r.el && r.el[i]; if (!o || a <= 0) return;
  const kemik = i ? r.B.RightHand : r.B.LeftHand;
  EX.copy(o.parmak); EZ.crossVectors(EX, o.avuc).normalize(); EY.crossVectors(EZ, EX); EM1.makeBasis(EX, EY, EZ); // yerel taban
  EX.copy(parmak).normalize(); EY.copy(avuc).addScaledVector(EX, -avuc.dot(EX)).normalize(); EZ.crossVectors(EX, EY); EY.crossVectors(EZ, EX); EM2.makeBasis(EX, EY, EZ); // istenen
  EQ.setFromRotationMatrix(EM2.multiply(EM1.transpose()));
  kemik.getWorldQuaternion(q2); q2.slerp(EQ, a);
  kemik.parent.getWorldQuaternion(q1); kemik.quaternion.copy(q1.invert().multiply(q2)); kemik.updateMatrixWorld(true);
}

const BY = new THREE.Vector3(), BI = new THREE.Vector3();
const KL = new THREE.Vector3(), KR = new THREE.Vector3(), KO = new THREE.Vector3(), KY = new THREE.Vector3(), KI = new THREE.Vector3();
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
  if (ek && ek.egil) { turn(r.B.Spine1, sol, ek.egil * 0.6); turn(r.B.Spine2, sol, ek.egil * 0.4); }
  if (ek && ek.egil) sol.set(1, 0, 0).applyQuaternion(yon); // (turn eksen vektörünü değiştirmez; açıklık için) // gövde: kollar IK'dan önce eğilir
  // kollar: dirsek geriye ve aşağı; bacaklar: diz ileri
  // kollar göğüste bağlı: bilekler modelin kendi omuzlarına göre karşı dirseğe gider (her model farklı boyda)
  if (ek && ek.kolBagla) {
    r.B.LeftArm.getWorldPosition(KL); r.B.RightArm.getWorldPosition(KR);
    const gen = KL.distanceTo(KR); KO.copy(KL).add(KR).multiplyScalar(0.5); KY.copy(KL).sub(KR).normalize(); KI.crossVectors(KY, yukari).normalize(); // KY: sola, KI: ileri
    if (KI.dot(ileri) < 0) KI.negate();
    const n = ek.kolBagla === true ? 0 : ek.kolBagla; // nefes/sarsıntı payı
    hedef.lh.copy(KO).addScaledVector(KY, -gen * 0.12).addScaledVector(yukari, -gen * 0.42 + n).addScaledVector(KI, gen * 0.5);
    hedef.rh.copy(KO).addScaledVector(KY, gen * 0.12).addScaledVector(yukari, -gen * 0.55 + n).addScaledVector(KI, gen * 0.56);
    BY.copy(KY); BI.copy(KI);
  }
  // dirsek: normalde geriye ve aşağı; kollar bağlıyken (ek.kolDisa / ek.kolBagla) yana ve aşağı
  const disa = ek && (ek.kolDisa || ek.kolBagla);
  kutup.copy(ileri).multiplyScalar(disa ? 0.2 : -1).addScaledVector(yukari, -0.6); if (disa) kutup.addScaledVector(sol, 1);
  if (hedef.lh) ik(r.B.LeftArm, r.B.LeftForeArm, r.B.LeftHand, hedef.lh, kutup, r.kol[0], r.kol[1]);
  if (disa) kutup.addScaledVector(sol, -2);
  if (hedef.rh) ik(r.B.RightArm, r.B.RightForeArm, r.B.RightHand, hedef.rh, kutup, r.kol[0], r.kol[1]);
  // ek.avuc: [sol, sağ] ön kolu kendi ekseni etrafında çevirir (avuç yukarı/aşağı). Yarısı ön kolda, yarısı bilekte: deri burulmasın
  if (ek && ek.avuc) for (const [i, on, el] of [[0, r.B.LeftForeArm, r.B.LeftHand], [1, r.B.RightForeArm, r.B.RightHand]]) { const a = ek.avuc[i]; if (!a) continue;
    el.getWorldPosition(KL); on.getWorldPosition(KR); KY.copy(KL).sub(KR).normalize(); turn(on, KY, a * 0.5); turn(el, KY, a * 0.5); }
  // kollar bağlıyken eller öbür kolun dirseğini kavrar: parmaklar karşı yana, avuç gövdeye bakar (bilek kırık durmasın)
  if (ek && ek.kolBagla) {
    eliCevir(r, 0, KL.copy(BY).negate().addScaledVector(BI, -0.35), KR.copy(BI).negate());
    eliCevir(r, 1, KL.copy(BY).addScaledVector(BI, -0.35), KR.copy(BI).negate());
  }
  kutup.copy(ileri);
  const dizDisa = ek && ek.dizDisa; // dizler iki yana açık oturuş
  // oturuş: uyluk yatay öne, baldır dik aşağı (ek.otur: [sol, sağ] için [uyluk, baldır] oranları)
  if (ek && ek.otur) for (const [k, h, i] of [['LeftUpLeg', hedef.lf, 0], ['RightUpLeg', hedef.rf, 1]]) { const o = ek.otur[i]; r.B[k].getWorldPosition(h).addScaledVector(ileri, r.bacak[0] * o[0]).addScaledVector(yukari, -r.bacak[1] * o[1]); kutup.copy(ileri).addScaledVector(yukari, 0.3); }
  if (dizDisa) kutup.copy(ileri).addScaledVector(sol, 1.1).addScaledVector(yukari, 0.3);
  if (hedef.lf) ik(r.B.LeftUpLeg, r.B.LeftLeg, r.B.LeftFoot, hedef.lf, kutup, r.bacak[0], r.bacak[1]);
  if (dizDisa) kutup.addScaledVector(sol, -2.2);
  if (hedef.rf) ik(r.B.RightUpLeg, r.B.RightLeg, r.B.RightFoot, hedef.rf, kutup, r.bacak[0], r.bacak[1]);
  // ek.elDiz: eller uyluğun üstüne konur (bacaklar yerleştikten sonra, kollar yeniden IK). true: dizlerde;
  // { f: [sol, sağ] uyluk boyunca yer (0 kalça, 1 diz), dy: [sol, sağ] eli kaldırma } — avuç uyluğa, parmaklar dize bakar
  if (ek && ek.elDiz) {
    const f = ek.elDiz.f || [1, 1], dy = ek.elDiz.dy || [0, 0];
    kutup.copy(ileri).multiplyScalar(-0.3).addScaledVector(yukari, -0.6).addScaledVector(sol, 0.8);
    for (const [i, ust, diz, kol, on, el, h] of [[0, 'LeftUpLeg', 'LeftLeg', 'LeftArm', 'LeftForeArm', 'LeftHand', hedef.lh], [1, 'RightUpLeg', 'RightLeg', 'RightArm', 'RightForeArm', 'RightHand', hedef.rh]]) {
      r.B[ust].getWorldPosition(KL); r.B[diz].getWorldPosition(KR); KY.subVectors(KR, KL).normalize(); // uyluk yönü
      h.copy(KL).lerp(KR, f[i]).addScaledVector(yukari, 0.09 + dy[i]).addScaledVector(ileri, -0.03);
      ik(r.B[kol], r.B[on], r.B[el], h, kutup, r.kol[0], r.kol[1]);
      KI.copy(yukari).negate(); eliCevir(r, i, KY.addScaledVector(sol, i ? 0.25 : -0.25), KI, 1 - Math.min(1, dy[i] * 6)); // kalkan el serbest kalır
      kutup.addScaledVector(sol, -1.6);
    }
  }
  // ayak tabanı yere paralel kalsın
  for (const k of ['LeftFoot', 'RightFoot']) { const f = r.B[k]; q2.copy(yon).multiply(r.ayak[k]); f.parent.getWorldQuaternion(q1); f.quaternion.copy(q1.invert().multiply(q2)); f.updateMatrixWorld(true); }
  if (bas) turn(r.B.Head, yukari, bas);
  if (ek && ek.basEg) turn(r.B.Head, sol, ek.basEg);
  // ek.tut: { i: 0 sol / 1 sağ, parmak, avuc, a } ya da bunların listesi — eli dünya yönüne çevirir (kupa kavrama, tezgâh silme)
  if (ek && ek.tut) for (const t of [].concat(ek.tut)) eliCevir(r, t.i, t.parmak, t.avuc, t.a); // tek nesne ya da [sol, sağ]
  if (ek && ek.bilek) { if (ek.bilek[0]) turn(r.B.LeftHand, sol, ek.bilek[0]); if (ek.bilek[1]) turn(r.B.RightHand, sol, ek.bilek[1]); }
}

