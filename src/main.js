// Giriş noktası: ağ (PeerJS), mikrofon, ana döngü.
import { net, ui } from './state.js';
import { L, dilSec, sayfayiCevir } from './dil.js';
import { $, BUMP, DBG, GATE, INLET, OBS, ODA, POLZ, RAIN, WHEEL, cx } from './world.js';
import { asamaSec, oyun, AH, AIR, BLIM, BOT, CR, DH, DRL, EX, FIRE, NZ, OIL, PC, SPOT, T, TKS, eject, hitPlayer, jolt, mkPlayer, place, players, pourOil, simStep, snap, startGame } from './sim.js';
import { stepEgitim } from './egitim.js';
import { cam, ren, scene } from './scene.js';
import { initSnd } from './audio.js';
import { cnt, key, readInput } from './input.js';
import { draw } from './hud.js';
import { cagriEkle, kanalEkle, kanalSil, sesBaslat, sesleriUygula } from './sohbet.js';
import { initPanel } from './panel.js';
import { katilIstegi, steamDurum, steamPeer } from './steam.js';

// ---------- ağ + ses ----------
// İki ağ: web sürümünde PeerJS (oda kodu), masaüstünde Steam açıksa Steam lobisi (steam.js). İkisi de aynı Peer biçiminde.
// Sesli sohbet her zaman PeerJS ile gider; Steam'de ayrı bir ses eşi (sesPeer) kurulur, kimliği Steam numarasından türer.
export let V = null; // oda sahibinden gelen son durum
export let peer, hostConn = null; export const conns = {}; let sonDurum = 0, sonKontrol = 0;
let steam = null, sesPeer = null; // steam: { ad, id } masaüstünde Steam açıksa
const sesId = (id) => (steam ? ODA + 'ses-' + id : id), oyuncuId = (pid) => (steam ? String(pid).replace(ODA + 'ses-', '') : pid);
export const callPeer = (id) => {
  if (!sesPeer) return;
  const ara = () => { const c = sesPeer.call(sesId(id), net.mic); if (c) { cagriEkle(c); c.on('stream', (s) => kanalEkle(id, s)); } };
  if (sesPeer.open) ara(); else sesPeer.on('open', ara);
};
const cevapla = (c) => { c.answer(net.mic); cagriEkle(c); c.on('stream', (s) => kanalEkle(oyuncuId(c.peer), s)); };
export const durum = (m) => ($('durum').textContent = m);
// Oda sahibi bir oyuncuyu çıkarır: ona haber verir, bağlantıyı kapatır; aynı adla bu oturumda yeniden giremez.
const yasakli = new Set();
function kick(id) {
  const p = players.get(id); if (!net.isHost || !p || id === net.myId) return;
  yasakli.add(p.name); const c = conns[id]; if (c) { try { c.send({ t: 'kick' }); } catch (e) {} setTimeout(() => c.close(), 300); delete conns[id]; }
  players.delete(id); kanalSil(id);
}
// Bağlantısı kopan oyuncu: kapanma olayı gelmese de (internet gidince gelmeyebilir) 7 sn ses çıkmayınca odadan düşer.
const ZAMAN_ASIMI = 7000;
function dusur(id) {
  const c = conns[id]; delete conns[id]; if (c) try { c.close(); } catch (e) {}
  const p = players.get(id); if (p) { if (NZ.holder === p.id) NZ.holder = null; if (AH.holder === p.id) AH.holder = null; if (DH.holder === p.id) DH.holder = null; if (EX.holder === p.id) EX.holder = null; }
  players.delete(id); kanalSil(id);
}
export function begin() { $('menu').style.display = 'none'; $('hud').style.display = 'block'; $('dugmeler').style.display = 'flex'; initPanel({ getV: () => V, kick }); sesleriUygula(); sonDurum = 0; let last = performance.now(), acc = 0, fc = 0;
  const frame = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; fc++; const I = readInput();
    if (net.isHost) { if (now - sonKontrol > 1000) { sonKontrol = now; const su = performance.now(); for (const id in conns) if (su - (conns[id].son || su) > ZAMAN_ASIMI) dusur(id); } const me = players.get(net.myId); if (me) me.inp = I; acc += dt; while (acc >= 1 / 60) { simStep(1 / 60); stepEgitim(1 / 60); acc -= 1 / 60; } V = snap(); if (fc % 3 === 0) for (const id in conns) if (conns[id].open) conns[id].send(V); }
    else { if (hostConn && hostConn.open && fc % 2 === 0) hostConn.send({ t: 'i', ...I }); if (sonDurum && performance.now() - sonDurum > 9000) { try { sessionStorage.setItem('kk-mesaj', 'koptun'); } catch (e) {} location.reload(); } } // oda sahibinden 9 sn haber yok: bağlantı koptu
    if (V && !document.hidden) draw(V, dt); };
  const loop = (now) => { requestAnimationFrame(loop); frame(now); }; requestAnimationFrame(loop);
  // Sekme arka plandayken tarayıcı çizim döngüsünü durdurur; oda sahibi dursa herkes donar. İşçi zamanlayıcısı kısılmaz.
  try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),33)'], { type: 'text/javascript' }))); w.onmessage = () => document.hidden && frame(performance.now()); } catch (e) {}
  addEventListener('blur', () => { for (const k in key) key[k] = 0; ui.mouseL = false; }); }
export async function go(kod, host, lobiNo = null) {
  initSnd(); sesBaslat();
  const name = ($('ad').value.trim() || L('oyuncu')).slice(0, 12); localStorage.setItem('kk-ad', name); durum(L('baglaniyor'));
  if (location.search.includes('tek')) { net.isHost = true; net.myId = 'ben'; net.odaKodu = 'TEK'; mkPlayer(net.myId, name); $('kod').value = ''; return begin(); } // ağsız tek kişilik deneme
  // ?yerel: ofis ağında 0.peerjs.com engelli; deneme için yerel sunucu (npx peer --port 9000 --path /kk)
  const PO = location.search.includes("yerel") ? { host: "localhost", port: 9000, path: "/kk", secure: false } : {};
  const zam = setTimeout(() => $('menu').style.display !== 'none' && durum(L('baglanamadi')), 12000);
  if (steam) { // Steam: lobi numarası verilmişse ona katıl, yoksa yeni lobi kur
    net.isHost = !lobiNo; net.odaKodu = 'Steam';
    peer = steamPeer(lobiNo);
    peer.on('error', () => { clearTimeout(zam); durum(L('steamHata')); });
    peer.on('open', (id) => { sesPeer = new Peer(sesId(id), PO); sesPeer.on('call', cevapla); sesPeer.on('error', () => {}); }); // ses bağlanamazsa oyun yine sürer
  } else {
    net.isHost = host; net.odaKodu = kod || Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPRSTUVYZ'[(Math.random() * 21) | 0]).join('');
    peer = net.isHost ? new Peer(ODA + net.odaKodu, PO) : new Peer(PO); sesPeer = peer;
    // Aynı kodu yazan herkes aynı odada buluşur: oda yoksa kurulur, varsa katılınır.
    peer.on('error', (e) => { if (e.type === 'peer-unavailable' && !net.isHost) { clearTimeout(zam); peer.destroy(); go(net.odaKodu, true); } else if (e.type === 'unavailable-id' && net.isHost) { clearTimeout(zam); peer.destroy(); go(net.odaKodu, false); } else durum(L('baglantiHata', e.type)); });
    peer.on('call', cevapla);
  }
  peer.on('open', (id) => { net.myId = id; clearTimeout(zam);
    if (net.isHost) { mkPlayer(id, name); peer.on('connection', (c) => { c.on('data', (d) => { if (d.t === 'hi') { if (yasakli.has(String(d.name).slice(0, 12))) { c.send({ t: 'kick' }); return setTimeout(() => c.close(), 300); } if (players.size >= 4) return c.send({ t: 'full' }); conns[c.peer] = c; c.son = performance.now(); mkPlayer(c.peer, String(d.name).slice(0, 12)); c.send({ t: 'w', peers: [net.myId, ...Object.keys(conns).filter((i) => i !== c.peer)] }); } else if (d.t === 'i') { c.son = performance.now(); const p = players.get(c.peer); if (p) p.inp = d; } }); c.on('close', () => dusur(c.peer)); c.on('error', () => dusur(c.peer)); }); begin(); }
    else { hostConn = peer.connect(steam ? peer.sahip : ODA + net.odaKodu, { serialization: 'json' }); hostConn.on('open', () => hostConn.send({ t: 'hi', name })); hostConn.on('data', (d) => { if (d.t === 's') { V = d; sonDurum = performance.now(); } else if (d.t === 'w') { d.peers.forEach(callPeer); begin(); } else if (d.t === 'full') durum(L('odaDolu')); else if (d.t === 'kick') { try { sessionStorage.setItem('kk-mesaj', 'atildin'); } catch (e) {} location.reload(); } }); hostConn.on('close', () => { $('menu').style.display = 'flex'; durum(L('sahipAyrildi')); }); } });
}
sayfayiCevir(); for (const b of document.querySelectorAll('[data-dil]')) b.onclick = () => dilSec(b.dataset.dil); // dil seçimi: menüde ve ayarlarda
$('ad').value = localStorage.getItem('kk-ad') || ''; try { const msj = sessionStorage.getItem('kk-mesaj'); if (msj) { durum(L(msj)); sessionStorage.removeItem('kk-mesaj'); } } catch (e) {} $('kur').onclick = () => { if (steam) return go('', true); const k = $('kod').value.trim().toUpperCase(); go(k.length === 4 ? k : '', true); }; $('katil').onclick = () => { const k = $('kod').value.trim().toUpperCase(); if (k.length === 4) go(k, false); else durum(L('kodYaz')); };
if (DBG) window.G = { oyun, asamaSec, dusur, conns, get barSahne() { return import('./bar.js'); }, kick, kamera: cam, ren, scene, cx, hitPlayer, CR, FIRE, EX, GATE, RAIN, jolt, get BOT() { return BOT; }, PC, OIL, POLZ, pourOil, eject, T, TKS, NZ, AH, AIR, DH, DRL, SPOT, BLIM, players, OBS, BUMP, key, cnt, startGame, mkPlayer, place, simStep, WHEEL, INLET, get V() { return V; }, set cam(v) { ui.camMode = v; } };

// Masaüstünde Steam açıksa: oda Steam lobisiyle kurulur, arkadaşlar davetle ya da Steam arkadaş listesinden "Oyuna katıl" ile gelir.
steamDurum().then((st) => {
  if (!st || location.search.includes('tek')) return;
  steam = st; document.body.classList.add('steam');
  if (!$('ad').value) $('ad').value = st.ad.slice(0, 12);
  $('davetBtn').onclick = () => peer && peer.davet && peer.davet();
  // oyun açıkken gelen katılma isteği: menüdeysek hemen, oyundaysak sayfa yenilenip katılınır
  katilIstegi((lobi) => { if ($('menu').style.display !== 'none') go('', false, lobi); else { try { sessionStorage.setItem('kk-katil', lobi); } catch (e) {} location.reload(); } });
  let lobi = st.bekleyen; try { lobi = lobi || sessionStorage.getItem('kk-katil'); sessionStorage.removeItem('kk-katil'); } catch (e) {}
  if (lobi) go('', false, lobi);
});
