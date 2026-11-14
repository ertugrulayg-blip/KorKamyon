// Çizim döngüsü ve ekran yazıları: oda sahibinden gelen durumu (V) ekrana yansıtır.
import * as THREE from 'three';
import { DIL, L, mesaj, mesajKod } from './dil.js';
import { net, ui } from './state.js';
import { $, ASAMA, BUMP, BUMP_V, COL, GATE, HZ, LEN, LIMIT, POLZ, WHEEL, cx } from './world.js';
import { OILB, RAD, SPOT, asamaSec } from './sim.js';
import { BG, CG, GRAY, M, SG, SKY, UP, add, airA, airHose, airTip, bitis, cabG, cabIn, cam, cam2, crM, dmgDent, dmgMark, dmgTag, drA, drBit, drCable, drill, exM, fireG, flames, fogS, glass, hoseMat, hpTag, koltuk, marks, needle, nozzle, obsMesh, oilM, pedB, pedG, pivot, pol, polL, polPark, rainP, ren, scene, steam, swheel, tanker, truck, v1, v2, valve, wheels, world } from './scene.js';
import { BACA } from './detail.js';
import { makeRig, poseRig } from './rig.js';
import { drawBar, limbV, playerMesh, pm, qY } from './bar.js';
import { sfx, sm } from './audio.js';
import { TOUCH, hostStart, joy, tb } from './input.js';

export let rainK = 0; export let hose = null;
const RK = new THREE.Vector3(); // iskeletin çizilen kalça noktası
const RH = { lh: new THREE.Vector3(), rh: new THREE.Vector3(), lf: new THREE.Vector3(), rf: new THREE.Vector3() }; // iskelet hedefleri: eller ve ayaklar
const duman = Array.from({ length: 14 }, () => { const m = add(scene, SG, new THREE.MeshBasicMaterial({ color: 0x4a4a4e, transparent: true, opacity: 0.4, depthWrite: false }), 0, 0, 0, 0.15); m.visible = false; return m; });
// oyuncunun başının üstündeki isim
function isimEtiketi(ad, renk) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.font = '900 36px system-ui,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 7; g.strokeStyle = '#000'; g.strokeText(ad, 128, 34); g.fillStyle = renk; g.fillText(ad, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, fog: false })); s.scale.set(1.5, 0.375, 1); s.renderOrder = 6; return s; }
// polis aracı darbe alınca: yaylar çöker, burnu dalar, sarsılır, kıvılcım saçar; hasarlıysa kaputtan duman tüter
const kivilcim = Array.from({ length: 14 }, () => { const m = add(scene, SG, new THREE.MeshBasicMaterial({ color: 0xffd23f }), 0, 0, 0, 0.05); m.visible = false; return m; });
const polDuman = Array.from({ length: 16 }, () => { const m = add(scene, SG, new THREE.MeshBasicMaterial({ color: 0x55575c, transparent: true, opacity: 0.5, depthWrite: false }), 0, 0, 0, 0.2); m.visible = false; return m; });
const pd = { son: 0, acc: 0, i: 0 };
function polDarbe(qs, qd, hp, dt) {
  pol.scale.set(1, 1 - 0.18 * qd, 1); pol.rotation.x = 0.14 * qd; pol.rotation.z = Math.sin(performance.now() / 35) * 0.06 * qd; pol.position.y = -0.08 * qd;
  if (qd > pd.son + 0.5) for (const k of kivilcim) { k.visible = true; k.userData = { t: 0, v: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 3, (Math.random() - 0.5) * 6) }; k.position.set(pol.position.x + (Math.random() - 0.5) * 1.2, 1.95, pol.position.z + (Math.random() - 0.5) * 1.6); }
  pd.son = qd;
  for (const k of kivilcim) if (k.visible) { const u = k.userData; u.t += dt; if (u.t > 0.5) { k.visible = false; continue; } u.v.y -= 14 * dt; k.position.addScaledVector(u.v, dt); }
  pd.acc += pol.visible && qs === 2 && hp < 70 ? dt * (70 - hp) * 0.25 : 0;
  while (pd.acc > 1) { pd.acc -= 1; const m = polDuman[pd.i++ % polDuman.length]; m.visible = true; m.userData.t = 0; m.position.set(pol.position.x + (Math.random() - 0.5) * 0.6, 1.3, pol.position.z + 1.5); m.material.color.setHex(hp < 35 ? 0x26272a : 0x6a6c70); }
  for (const m of polDuman) if (m.visible) { const u = (m.userData.t += dt) / 1.1; if (u >= 1) { m.visible = false; continue; } m.position.y += dt * 1.8; m.position.z -= dt * 6; m.scale.setScalar(0.2 + u * 0.7); m.material.opacity = 0.5 * (1 - u); }
}
// eylem yerleri: yanıp sönen işaretler (radyatör, yağ varili, tanker vanası)
const isaretMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, depthWrite: false });
const radIsaret = add(cabIn, CG, isaretMat(0x3fa7ff), RAD[0], 1.33, RAD[2], 0.55, 0.03, 0.55), yagIsaret = add(truck, CG, isaretMat(0xffd23f), OILB[0] - 0.05, 1.32, OILB[2] + 0.5, 0.5, 0.03, 0.5), vanaIsaret = add(tanker, CG, isaretMat(0xff5a5f), 0, 2.03, -2, 0.6, 0.03, 0.6);
const EV = new THREE.Vector3();
// ---------- aşama seçimi, eğitim, puan, final ----------
function asamaPanel(t) {
  const el = $('asama'), goster = t.s === 'lobby';
  if (!goster) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
  const iz = [t.lv, t.ac, net.isHost, DIL].join(); if (el.dataset.iz === iz && el.style.display === 'block') return; el.dataset.iz = iz; el.style.display = 'block';
  let h = `<div class="baslik">${L(net.isHost ? 'asamaSec' : 'sadeceSahip')}</div><div class="kutular">`;
  ASAMA.forEach((a, i) => { const kilit = i > t.ac; h += `<button data-lv="${i}" class="${i === t.lv ? 'secili' : ''}${kilit ? ' kilitli' : ''}" ${!net.isHost || kilit ? 'disabled' : ''}><b>${i || '🎓'}</b><span>${kilit ? '🔒' : i ? a.m + ' m' : L('egitimKisa')}</span></button>`; });
  h += '</div>' + (t.ac <= 1 ? `<div class="ipucu">${L('ilkKez')}</div>` : '') + (net.isHost ? `<button class="basla">${L('basla')}</button>` : '');
  el.innerHTML = h;
  for (const b of el.querySelectorAll('button[data-lv]')) b.onclick = () => asamaSec(+b.dataset.lv);
  const bb = el.querySelector('.basla'); if (bb) bb.onclick = () => hostStart();
}
function egitimYazi(t) {
  const el = $('egitim'), on = t.s === 'run' && t.eg >= 0 && !t.cd, metin = on ? `<b>${L('egBaslik', t.eg + 1, L('eg').length)}</b>${L('eg')[t.eg]}` : '';
  if (el.dataset.m !== metin + DIL) { el.dataset.m = metin + DIL; el.innerHTML = metin; el.style.display = on ? 'block' : 'none'; document.body.classList.toggle('egitimde', on); }
}
let sonPuan = null;
function puanBalon(t, me) { // puan değişince "+50" balonu (sürüşteki küçük artışlar için değil)
  if (!me || t.s !== 'run') { sonPuan = null; return; }
  const p = me.pu || 0; if (sonPuan === null) sonPuan = p; const d = p - sonPuan; sonPuan = p;
  if (Math.abs(d) < 5) return;
  const b = document.createElement('div'); b.className = 'balon ' + (d > 0 ? 'arti' : 'eksi'); b.textContent = (d > 0 ? '+' : '−') + Math.abs(d); $('hud').appendChild(b); setTimeout(() => b.remove(), 1600);
}
let sonDurumKonfeti = '';
function konfeti(t) {
  if (t.s === sonDurumKonfeti) return; sonDurumKonfeti = t.s; if (t.s !== 'win') return;
  const r = ['#ffd23f', '#ff6a3d', '#3fa7ff', '#7bd389', '#ff5a5f', '#ffffff'];
  for (let i = 0; i < 110; i++) { const k = document.createElement('i'); k.className = 'konfeti'; k.style.left = Math.random() * 100 + 'vw'; k.style.background = r[i % r.length]; k.style.animationDelay = Math.random() * 1.2 + 's'; k.style.animationDuration = 2.4 + Math.random() * 1.6 + 's'; document.body.appendChild(k); setTimeout(() => k.remove(), 4500); }
}
const NEG = ['carpma', 'dusme', 'firlama', 'ceza'], SIRA = ['surus', 'yolcu', 'temiz', 'lastik', 'hasar', 'yangin', 'su', 'yakit', 'haydut', 'polis', 'carpma', 'dusme', 'firlama', 'ceza'];
function sonEkran(t, V) {
  const win = t.s === 'win', yaz = L('ist');
  let h = `<div class="buyuk">${win ? (t.lv === 0 ? L('egitimTamam') : L('asamaTamam', t.lv)) : L('oyunBitti')}</div>`;
  if (win && t.lv > 0) h += `<div class="yildiz">${'★'.repeat(t.yz || 1)}<i>${'★'.repeat(3 - (t.yz || 1))}</i></div>`;
  h += `<div>${mesaj(t.why)}</div>`;
  if (win && t.lv > 0 && t.ac === t.lv + 1) h += `<div class="uyari">${L('yeniAsama', ASAMA[t.lv + 1].m)}</div>`;
  const oy = V.p.filter((p) => !p.bt).sort((a, b) => (b.pu || 0) - (a.pu || 0));
  h += '<table class="tablo">' + oy.map((p, i) => {
    const ist = p.ist || {}, cip = SIRA.filter((k) => ist[k] > 0 && (k !== 'temiz' || ist[k] >= 5)).map((k) => `<span class="${NEG.includes(k) ? 'neg' : ''}">${yaz[k](ist[k])}</span>`).join('');
    return `<tr><td class="sira">${['🥇', '🥈', '🥉'][i] || i + 1 + '.'}</td><td class="ad" style="color:#${COL[p.c % 4].toString(16).padStart(6, '0')}">${p.n}</td><td class="pu">${p.pu || 0} <small>${L('puanAd')}</small></td><td class="cip">${cip}</td></tr>`;
  }).join('') + '</table>';
  return h + `<div style="font-size:18px">${net.isHost ? (win ? L('sonraki') : L('enterYeniden')) : ''}</div>`;
}
const SARS = ['bariyer', 'kapaliSerit', 'engel', 'tumsekPat', 'lastikPat', 'polisVurdu', 'polisAtladi']; // ekranı sarsan olaylar
const fx = { m: '', shake: 0, acc: 0, i: 0, eg: 0, j: 0 }, dust = Array.from({ length: 28 }, () => { const m = add(scene, SG, new THREE.MeshBasicMaterial({ color: 0xb9b2a6, transparent: true, opacity: 0.5, depthWrite: false }), 0, 0, 0, 0.2); m.visible = false; return m; }); // darbe sarsıntısı, teker tozu
export const RP = {}, cT = { X: 0, Z: 0, th: 0 }, camP = new THREE.Vector3(0, 9.5, -10.5), camL = new THREE.Vector3(0, 1.5, -1); export let hudT = 0, lastHud = '', cpD = 1, spD = 0, camM = '', camB = 0;
export const cabPt = (v, x, y, z) => v.set(x * cpD + (z - HZ) * spD, y, HZ - x * spD + (z - HZ) * cpD); // kabin içindeki nokta → kamyon çerçevesi
export function draw(V, dt) {
  const t = V.T, [qs, qx, qz, qhp, qsl, qu, qo, qd = 0] = V.q, ch = t.s === 'run' && (qs === 1 || qs === 2); sfx(V, dt);
  { const hd = t.hd || LEN; bitis.position.set(cx(hd), 0, hd); bitis.rotation.y = Math.atan2(cx(hd + 1) - cx(hd - 1), 2); }
  cabG.rotation.y = t.ph; cpD = Math.cos(t.ph); spD = Math.sin(t.ph);
  pol.visible = qs > 0 && t.s !== 'lobby'; pol.position.set(qx, 0, qz); pol.rotation.y = qsl ? pol.rotation.y + dt * 7 : qs === 3 ? 0.6 : 0;
  polDarbe(qs, qd, qhp, dt); { const f = Math.sin(performance.now() / 90) > 0; polL[0].visible = f; polL[1].visible = !f; }
  crM.forEach((g, i) => { const c = V.cr[i]; g.visible = !!c; if (c) g.position.set(c[0], c[2] || 0, c[1]); });
  exM.position.set(V.x[0], V.x[1], V.x[2]); exM.rotation.x = V.x[3] ? 1.2 : 0;
  fireG.visible = !!V.fr; if (V.fr) { fireG.position.set(V.fr[0], 0, V.fr[1]); const k = 0.45 + V.fr[2] / 180; flames.forEach((f, i) => { const s = k * (0.75 + 0.35 * Math.sin(performance.now() / (70 + i * 23) + i * 2)); f.scale.set(s, s * (1.1 + 0.3 * Math.sin(performance.now() / 50 + i)), s); f.position.y = 1.3 + 0.45 * f.scale.y; }); }
  steam.forEach((m, i) => { const on = t.ht > 70 && t.s === 'run'; m.visible = on; if (on) { const u = (performance.now() / 1400 + i / 6) % 1; m.position.set(Math.sin(i * 2.3) * 0.5, 2.2 + u * 2.6, 4.5 - u * 1.2); m.scale.setScalar(0.2 + u * 0.55); m.material.opacity = 0.55 * (1 - u) * Math.min(1, (t.ht - 70) / 15); } });
  rainK += ((t.rn && t.s === 'run' ? 1 : 0) - rainK) * 0.04; scene.fog.color.copy(SKY).lerp(GRAY, rainK); scene.background.copy(scene.fog.color); scene.fog.near = 70 - 45 * rainK; scene.fog.far = 230 - 140 * rainK;
  rainP.visible = rainK > 0.1; if (rainP.visible) { const a = rainP.geometry.attributes.position; for (let i = 1; i < a.array.length; i += 3) { a.array[i] -= dt * 26; if (a.array[i] < 0) a.array[i] += 16; } a.needsUpdate = true; }
  polPark.forEach((g, i) => (g.visible = !qu[i])); oilM.forEach((m, i) => { const o = V.ol[i]; m.visible = !!o; if (o) m.position.set(o[0], 0.03, o[1]); });
  if (net.isHost) { cT.X = t.X; cT.Z = t.Z; cT.th = t.th; } else { cT.th += (t.th - cT.th) * 0.25; cT.X += Math.sin(cT.th) * t.v * dt; cT.Z += Math.cos(cT.th) * t.v * dt; cT.X += (t.X - cT.X) * 0.15; cT.Z += (t.Z - cT.Z) * 0.15; if (Math.abs(t.Z - cT.Z) > 30) { cT.X = t.X; cT.Z = t.Z; } }
  pivot.rotation.y = -cT.th; world.position.set(-cT.X, 0, -cT.Z);
  wheels.forEach((w, i) => { w.rotation.x += t.v * dt / 0.55; w.scale.x = w.scale.z = t.fl[i] ? 0.42 : 0.55; w.position.y = t.fl[i] ? 0.42 : 0.55; w.material.color.setHex(t.fl[i] ? 0x8a2a1e : 0x222222); });
  marks.forEach((m, i) => { m.visible = !!t.fl[i] && t.s === 'run'; m.material.opacity = 0.55 + 0.4 * Math.sin(performance.now() / 150); });
  if (V.a) { airTip.position.set(V.a[0], V.a[1], V.a[2]); v2.copy(airTip.position); limbV(airHose, airA, v2, 0.035); }
  if (V.d) { drill.position.set(V.d[0], V.d[1], V.d[2]); drill.rotation.y = V.d[3] ? Math.atan2(V.d[0], 0.6) : 0; v2.copy(drill.position); limbV(drCable, drA, v2, 0.022); if (sm.drl > 0) drBit.rotation.y += dt * 40; }
  SPOT.forEach((p, i) => { const d = t.dm[i], on = d > 0 && t.s === 'run', g = dmgTag[i]; dmgDent[i].visible = d > 0; dmgMark[i].visible = on; dmgMark[i].material.opacity = 0.55 + 0.4 * Math.sin(performance.now() / 150); g.sp.visible = on; if (!on) return; g.sp.material.opacity = 0.65 + 0.35 * Math.sin(performance.now() / 120);
    if (d !== g.v) { g.v = d; const x = g.c.getContext('2d'); x.clearRect(0, 0, 128, 64); x.font = '900 44px system-ui,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#000'; x.strokeText('-' + d, 64, 34); x.fillStyle = '#ff7a4a'; x.fillText('-' + d, 64, 34); g.tx.needsUpdate = true; } });
  hpTag.forEach((g, i) => { const on = !!t.fl[i] && t.s === 'run'; g.sp.visible = on; if (!on) return; const p = Math.floor(t.rp[i] * 100); g.sp.material.opacity = 0.65 + 0.35 * Math.sin(performance.now() / 120);
    if (p !== g.v) { g.v = p; const x = g.c.getContext('2d'); x.clearRect(0, 0, 128, 64); x.font = '900 44px system-ui,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#000'; x.strokeText(L('yuzde', p), 64, 34); x.fillStyle = p < 35 ? '#ff5a5f' : p < 70 ? '#ffd23f' : '#7bd389'; x.fillText(L('yuzde', p), 64, 34); g.tx.needsUpdate = true; } });
  swheel.rotation.z = -t.st * 2.2; pedG.position.z = 3.1 + t.g * 0.06; pedB.position.z = 3.1 + t.b * 0.06; needle.rotation.z = (t.f / 100 - 0.5) * -2.4;
  obsMesh.forEach((m, i) => (m.visible = !t.oh.includes(i)));
  const [ks, kx, kz, kv] = V.k; tanker.visible = ks > 0; tanker.position.set(kx, 0, kz); valve.rotation.z += kv ? dt * 4 : 0;
  nozzle.visible = ks > 0; nozzle.position.set(V.n[0], V.n[1], V.n[2]);
  if (hose) { scene.remove(hose); hose.geometry.dispose(); hose = null; }
  if (ks > 0) { const a = new THREE.Vector3(kx, 2, kz + 1), b = nozzle.position, pts = []; const sag = Math.max(0.1, (7.5 - a.distanceTo(b)) * 0.18); for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push(a.clone().lerp(b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * sag, 0))); } hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.06, 6), hoseMat); scene.add(hose); }
  const me = V.p.find((p) => p.id === net.myId), seen = new Set();
  for (const p of V.p) {
    seen.add(p.id); let o = pm.get(p.id); if (!o) { o = playerMesh(p.c); pm.set(p.id, o); if (p.bt) { add(o.body, SG, M(0x111111), 0, 1.03, 0.01, 0.265, 0.3, 0.265); add(o.body, BG, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 1.07, 0.25, 0.26, 0.05, 0.05); } makeRig(p.c, scene, p.bt ? 'haydut.glb' : null).then((r) => { if (!r) return; if (!pm.has(p.id)) { scene.remove(r.root); return; } o.rig = r; o.body.visible = false; o.s.forEach((m) => (m.visible = false)); o.l.forEach((m) => (m.visible = false)); }); o.tag = isimEtiketi(p.bt ? L('haydutAd') : p.n, p.bt ? '#ff5a5f' : '#' + COL[p.c % 4].toString(16).padStart(6, '0')); o.g.add(o.tag); RP[p.id] = Float32Array.from(p.P); }
    const P = RP[p.id]; for (let i = 0; i < 21; i++) P[i] = net.isHost || p.s || Math.abs(p.P[i] - P[i]) > 3 ? p.P[i] : P[i] + (p.P[i] - P[i]) * 0.4;
    o.g.visible = !p.d;
    const B = o.body; B.position.set(P[0], P[1], P[2]); v1.set(P[6] - P[0], P[7] - P[1], P[8] - P[2]); if (v1.lengthSq() < 1e-6) v1.set(0, 1, 0); B.quaternion.setFromUnitVectors(UP, v1.normalize()).multiply(qY.setFromAxisAngle(UP, p.y));
    o.s.forEach((m, k) => m.position.set(P[9 + k * 3], P[10 + k * 3], P[11 + k * 3])); o.s[2].rotation.y = o.s[3].rotation.y = p.y;
    o.tag.position.set(P[6], P[7] + 0.62, P[8]);
    if (o.rig) { const icde = p === me && (camM === 's' || camM === 'y'); o.rig.root.visible = !p.d && !icde; o.tag.visible = !icde; /* koltuktan bakan kendini görmez */ if (!p.d) {
        // Fizik bedeni kısa bacaklı (kalça ayaktan 0,5 m yukarıda); uzun bacaklı modeller çömelik durmasın diye
        // ayakta dik dururken çizilen gövde kaldırılır. Ayaklar ve tutunan eller fizikteki yerinde kalır, boştaki eller gövdeyle kalkar.
        const ayak = Math.min(P[16], P[19]), dik = v1.set(P[6] - P[0], P[7] - P[1], P[8] - P[2]).normalize().y;
        const ister = !p.s && dik > 0.75 && ayak < P[1] ? Math.min(0.45, Math.max(0, o.rig.bacakBoy * 0.95 - (P[1] - ayak))) : 0;
        o.kalk = (o.kalk || 0) + (ister - (o.kalk || 0)) * 0.25; const k = o.kalk;
        RK.copy(B.position); RK.y += k; o.tag.position.y += k; // isim de başın üstünde kalsın
        RH.lh.set(P[9], P[10] + (p.h & 1 ? 0 : k), P[11]); RH.rh.set(P[12], P[13] + (p.h & 2 ? 0 : k), P[14]); RH.lf.set(P[15], P[16], P[17]); RH.rf.set(P[18], P[19], P[20]);
        poseRig(o.rig, RK, B.quaternion, RH);
      } }
    for (let k = 0; k < 4; k++) { const sd = k % 2 ? -1 : 1; v1.set(sd * (k < 2 ? 0.38 : 0.15), k < 2 ? 0.62 : -0.04, 0).applyQuaternion(B.quaternion).add(B.position); v2.set(P[9 + k * 3], P[10 + k * 3], P[11 + k * 3]); limbV(o.l[k], v1, v2, k < 2 ? 0.1 : 0.115); }
  }
  for (const [id, o] of pm) if (!seen.has(id)) { scene.remove(o.g); if (o.rig) scene.remove(o.rig.root); pm.delete(id); delete RP[id]; }
  const seat = ui.camMode >= 0 ? ui.camMode : me ? me.s : 0;
  if (ch) { v1.set(0, 14, -25); v2.set(0, 1, -5.5); } // kovalamaca: kamera uzaklaşır, kamyon ve polis birlikte görünür
  else if (seat === 1 && t.s === 'run') { cabPt(v1, 0.7, 2.62, 1.95); cabPt(v2, 0.7, 3.05, 14); }
  else if (seat === 2 && t.s === 'run') { cabPt(v1, -0.7, 3.0, 2.0); cabPt(v2, -0.4, 2.3, 30); } // yolcu: kendi koltuğundan yolu net görür // şoför: boyu kısa, göz tablonun hizasında — gökyüzü ve ağaç tepeleri görünür, yol görünmez
  else { v1.set(0, 9.5, -10.5); v2.set(0, 1.5, -1); } // diğerleri yukarıdan bakar; yolcunun ileri penceresi var
  { const m = ch ? 'c' : seat === 1 && t.s === 'run' ? 's' : seat === 2 && t.s === 'run' ? 'y' : 'n'; if (m !== camM) { if (camM && (m === 'c' || camM === 'c')) camB = 1.6; camM = m; } const k = camB > 0 ? 0.07 : 1; camB -= dt; if (m === 's' || m === 'y') { camP.copy(v1); camL.copy(v2); } camP.lerp(v1, k); camL.lerp(v2, k); cam.position.copy(camP); cam.lookAt(camL); }
  // koltuk fırlatma: koltuk yerinden fırlar, takla atar, birkaç saniye sonra yerine düşer
  for (const s of [1, 2]) { const g = koltuk[s], u = g.userData, e = t.ej ? t.ej[s] : 0;
    if (u.son === undefined) u.son = e; if (e !== u.son) { u.son = e; u.t = 0; }
    if (u.t !== undefined) { u.t += dt; const a = u.t, ev = u.ev;
      if (a < 2.2) { g.position.set(ev.x + a * 1.4 * Math.sign(ev.x), ev.y + 10 * a - 4.5 * a * a, ev.z - a * 2.6); g.rotation.set(-a * 6, a * 2.5, a * 3.5); g.visible = true; } // yaylanıp 5 m yükselir, takla atar
      else if (a < 3.4) g.visible = false;
      else if (a < 3.9) { const k = (a - 3.4) / 0.5; g.visible = true; g.position.set(ev.x, ev.y + 3 * (1 - k) * (1 - k), ev.z); g.rotation.set(0, (1 - k) * 2, 0); }
      else { g.position.copy(ev); g.rotation.set(0, 0, 0); g.visible = true; delete u.t; } } } // yeni koltuk yukarıdan yerine düşer
  // darbe sarsıntısı ve teker tozu
  if (t.m !== fx.m) { fx.m = t.m; if (SARS.includes(mesajKod(t.m))) fx.shake = 0.55; }
  if (fx.shake > 0) { fx.shake = Math.max(0, fx.shake - dt * 1.6); cam.position.x += (Math.random() - 0.5) * fx.shake; cam.position.y += (Math.random() - 0.5) * fx.shake * 0.7; }
  { const run = t.s === 'run' && !t.cd, off = Math.abs(t.X - cx(t.Z)) > 6.3; fx.acc += run ? dt * t.v * (off ? 3.2 : 0.55) : 0;
    while (fx.acc > 1) { fx.acc -= 1; const d = dust[fx.i++ % dust.length], w = WHEEL[2 + (fx.i & 1)]; d.visible = true; d.userData.t = 0; d.userData.L = off ? 0.9 : 0.5; d.userData.s = off ? 1 : 0.45; d.position.set(w[0] * 0.97 + (Math.random() - 0.5) * 0.3, 0.15, w[2] - 0.5); d.userData.vx = (Math.random() - 0.5) * 1.2 + Math.sign(w[0]) * 0.5; d.userData.vz = -t.v * 0.55; d.material.color.setHex(off ? 0x8a7350 : 0xb9b2a6); }
    // egzoz dumanı: bacalardan çıkar, geriye savrulur
    fx.eg += run ? dt * (2.5 + t.g * 9) : 0;
    while (fx.eg > 1) { fx.eg -= 1; const d = duman[fx.j++ % duman.length], b = BACA[fx.j & 1]; cabPt(d.position, b[0], b[1], b[2]); d.visible = true; d.userData.t = 0; d.userData.vz = -t.v * 0.35 - 0.3; }
    for (const d of duman) if (d.visible) { const u = (d.userData.t += dt) / 0.9; if (u >= 1) { d.visible = false; continue; } d.position.y += dt * 1.6; d.position.z += d.userData.vz * dt; d.scale.setScalar(0.12 + u * 0.4); d.material.opacity = 0.42 * (1 - u); }
    for (const d of dust) if (d.visible) { const u = (d.userData.t += dt) / d.userData.L; if (u >= 1) { d.visible = false; continue; } d.position.x += d.userData.vx * dt; d.position.y += dt * 1.1; d.position.z += d.userData.vz * dt; d.scale.setScalar((0.18 + u * 0.75) * d.userData.s); d.material.opacity = (d.userData.s < 1 ? 0.3 : 0.5) * (1 - u); } }
  fogS.visible = false; glass.visible = camM === 's' && !!t.rn; // yağmurda şoförün camı buğulanır
  if (t.s === 'lobby') drawBar(V, dt); else ren.render(scene, cam);
  { const pip = false, el = $('ileri'); if (pip) { const W = innerWidth, H = innerHeight, w = Math.round(Math.min(340, W * 0.34)), h = Math.round(w * 0.62), x = 12, y = TOUCH ? 150 : 175; fogS.visible = false;
      ren.setScissorTest(true); ren.setViewport(x, H - y - h, w, h); ren.setScissor(x, H - y - h, w, h); cam2.aspect = w / h; cam2.updateProjectionMatrix(); ren.render(scene, cam2); ren.setScissorTest(false); ren.setViewport(0, 0, W, H);
      if (el.style.display !== 'block') el.style.display = 'block'; el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.top = y + 'px'; } else if (el.style.display !== 'none') el.style.display = 'none'; }
  // yakındaki eylem: ipucu ve işaretler
  { const nabiz = 0.45 + 0.4 * Math.sin(performance.now() / 140), run = t.s === 'run' && !t.cd, mp = me && !me.s && !me.d ? (RP[me.id] || me.P) : null;
    const suGerek = run && (t.ht >= 60 || t.sl), yagGerek = run && qs === 2, vanaGerek = run && ks === 2 && V.n[3] && !kv;
    radIsaret.visible = suGerek; yagIsaret.visible = yagGerek; vanaIsaret.visible = vanaGerek; for (const m of [radIsaret, yagIsaret, vanaIsaret]) m.material.opacity = nabiz;
    let ey = '';
    if (mp) { const yak = (x, z, r) => Math.hypot(mp[3] - x, mp[5] - z) < r;
      if (suGerek && (cabPt(EV, RAD[0], 0, RAD[2]), yak(EV.x, EV.z, 1.7))) ey = L('ey_su');
      else if (yagGerek && yak(OILB[0], OILB[2], 1.7)) ey = L('ey_yag') + (qo ? L('ey_bekle', qo) : '');
      else if (vanaGerek && Math.hypot(mp[3] - kx, mp[4] - 2.3, mp[5] - (kz - 2)) < 1.4) ey = L('ey_vana'); }
    const el = $('eylem'), metin = ey ? `<kbd>${TOUCH ? L('b_kullan') : 'F'}</kbd>${ey}` : ''; if (el.dataset.m !== metin) { el.dataset.m = metin; el.innerHTML = metin; el.style.display = ey ? 'block' : 'none'; } }
  asamaPanel(t); egitimYazi(t); puanBalon(t, me); konfeti(t);
  if ((hudT -= dt) > 0) return; hudT = 0.1;
  const dk = $('dok'), pr = t.s === 'lobby' ? 'L' : String(seat); if (dk.dataset.r !== pr) { dk.dataset.r = pr; joy.x = joy.y = 0; for (const k in tb) tb[k] = 0; }
  { const nb = BUMP.find((z) => z > t.Z - 1), d = nb === undefined ? 1e9 : nb - t.Z, el = $('tumsek'), on = t.s === 'run' && seat !== 1 && d < 110 && !ch;
    el.style.display = on ? 'block' : 'none'; if (on) { const hz = t.v > BUMP_V; el.className = hz ? 'hizli' : ''; el.textContent = L('tumsek', Math.max(0, Math.round(d)), hz, Math.round(BUMP_V * 3.6)); } }
  { const el = $('isaret'), sg = t.s === 'run' ? t.sg : 0; el.style.display = sg ? 'block' : 'none'; el.className = seat === 1 ? 'sofor' : ''; el.textContent = L('isaret')[sg || 0]; }
  const rol = t.s === 'lobby' ? L('rolBar') : seat === 1 ? L('rolSofor') : seat === 2 ? L('rolYolcu') : L('rolKasa');
  let af = '';
  if (t.s === 'lobby') af += `<div class="uyari">${L('asamaAd', t.lv, ASAMA[t.lv].m)}</div><div>${L('odaKodu')}: <span class="uyari">${net.odaKodu}</span> · ${V.p.length}/4 ${L('kisi')}</div><div style="font-size:18px">${net.isHost ? L('baslatHost') : L('baslatBekle')}</div><div style="font-size:16px">${L('lobiIpucu')}</div>`;
  if (t.s === 'run' && t.cd) af += `<div class="buyuk">${t.cd}</div><div>${L('geriSayim')}</div>`;
  if (t.s === 'over' || t.s === 'win') af += sonEkran(t, V);
  if (t.m) af += `<div>${mesaj(t.m)}</div>`;
  let gv = ''; // görev listesi: sağda, kısa satırlar
  if (t.s === 'run' && !t.cd) { const hy = V.p.some((p) => p.bt);
    if (ch) gv += `<div class="k">${L('g_polis', qhp)}</div>`;
    else if (seat !== 1) { const i = POLZ.findIndex((z, i) => !qu[i] && z > t.Z - 5), d = i < 0 ? 1e9 : POLZ[i] - t.Z; if (d < 170) gv += `<div${t.v > LIMIT ? ' class="k"' : ''}>${L('g_radar', Math.max(0, Math.round(d)))}</div>`; }
    if (seat === 2 && !ch) { const g = GATE.find((g) => g.z > t.Z + 4 && g.z < t.Z + 230); if (g) gv += `<div>${L('g_ayrim', Math.round(g.z - t.Z), g.open > 0)}</div>`; }
    if (t.sl) gv += `<div class="k">${L('g_motor')}</div>`; else if (t.ht >= 70) gv += `<div>${L('g_hararet', t.ht)}</div>`;
    if (V.fr) gv += `<div class="k">${L('g_yangin')}</div>`;
    if (hy) gv += `<div class="k">${L('g_haydut')}</div>`;
    if (t.rn) gv += `<div>${L('g_yagmur')}</div>`;
    if (t.f < 25) gv += `<div class="k">${L('g_yakit')}</div>`;
    if (ks === 2) gv += `<div>⛽ ${V.n[3] ? (kv ? L('g_doluyor') : L('g_vana')) : L('g_hortum')}${V.k[4] > 0 ? ' ' + L('yuzde', Math.round(V.k[4] * 100)) : ''}</div>`;
    t.fl.forEach((f, i) => { if (f) gv += `<div>${L('g_lastik', i)}</div>`; });
    t.dm.forEach((d, i) => { if (d) gv += `<div>${L('g_hasar', i, d)}</div>`; }); }
  const hp = Math.max(0, 100 - t.dm.reduce((a, b) => a + b, 0)), sl = me && me.st && t.s === 'run' && !t.cd ? me.st : 0, h = DIL + (me ? me.pu : 0) + rol + af + gv + hp + sl + t.ht + V.cr.join() + Math.round(t.f) + Math.round(t.Z / 10) + Math.round(t.v);
  if (h !== lastHud) { lastHud = h; $('rol').innerHTML = (TOUCH ? rol.split('<br>').slice(0, 2).join('<br>') : rol) + (sl ? `<br><span style="color:${sl <= 15 ? '#ff5a5f' : '#ffe14d'}">${L('koltukSure', ((sl / 60) | 0) + ':' + String(sl % 60).padStart(2, '0'))}</span>` : '') + (TOUCH ? '' : '<br>' + L('muzikTus')); $('afis').innerHTML = af; $('gorev').innerHTML = gv; $('afis').className = t.s === 'lobby' ? 'alt' : t.s !== 'run' || t.cd ? 'orta' : ''; $('yakit').firstChild.style.width = t.f + '%'; $('yakit').firstChild.style.background = t.f < 25 ? '#ff5a5f' : '#7bd389'; $('can').firstChild.style.width = hp + '%'; $('can').firstChild.style.background = hp < 35 ? '#ff5a5f' : '#3fa7ff'; $('bilgi').innerHTML = `🔧${L('yuzde', hp)} 🌡${L('yuzde', t.ht)} 📦${V.cr.filter((c) => c).length}/4<br>${Math.max(0, Math.round((t.hd || LEN) - t.Z))} m · ⭐${me ? me.pu || 0 : 0} · ${Math.round(t.v * 3.6)} ${L('kmh')}`; $('oda').textContent = L('oda') + ' ' + net.odaKodu; }
}
export const fit = () => { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = innerWidth < innerHeight ? 80 : 62; cam.updateProjectionMatrix(); }; addEventListener('resize', fit); fit();
