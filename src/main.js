// Giriş noktası: ağ (PeerJS), mikrofon, ana döngü.
import { net, sesSeviye, ui } from './state.js';
import { $, BUMP, DBG, GATE, INLET, OBS, ODA, POLZ, RAIN, WHEEL, cx } from './world.js';
import { AH, AIR, BLIM, BOT, CR, DH, DRL, EX, FIRE, NZ, OIL, PC, SPOT, T, TKS, eject, hitPlayer, jolt, mkPlayer, place, players, pourOil, simStep, snap, startGame } from './sim.js';
import { cam, ren, scene } from './scene.js';
import { initSnd } from './audio.js';
import { cnt, key, readInput } from './input.js';
import { draw } from './hud.js';
import { initPanel, sesleriUygula } from './panel.js';

// ---------- ağ + ses ----------
export let V = null; // oda sahibinden gelen son durum
export let peer, hostConn = null; export const conns = {};
export async function getMic() { try { if (DBG) throw 0; net.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); net.micOk = true; } catch (e) { const ac = new (window.AudioContext || window.webkitAudioContext)(); net.mic = ac.createMediaStreamDestination().stream; } }
export const playAudio = (id, s) => { let a = document.getElementById('au' + id); if (!a) { a = document.createElement('audio'); a.id = 'au' + id; a.autoplay = true; document.body.appendChild(a); } a.srcObject = s; a.volume = sesSeviye(id); };
export const callPeer = (id) => { const c = peer.call(id, net.mic); if (c) c.on('stream', (s) => playAudio(id, s)); };
export const durum = (m) => ($('durum').textContent = m);
// Oda sahibi bir oyuncuyu çıkarır: ona haber verir, bağlantıyı kapatır; aynı adla bu oturumda yeniden giremez.
const yasakli = new Set();
function kick(id) {
  const p = players.get(id); if (!net.isHost || !p || id === net.myId) return;
  yasakli.add(p.name); const c = conns[id]; if (c) { try { c.send({ t: 'kick' }); } catch (e) {} setTimeout(() => c.close(), 300); delete conns[id]; }
  players.delete(id); document.getElementById('au' + id)?.remove();
}
export function begin() { $('menu').style.display = 'none'; $('hud').style.display = 'block'; $('dugmeler').style.display = 'flex'; initPanel({ getV: () => V, kick }); sesleriUygula(); let last = performance.now(), acc = 0, fc = 0;
  const frame = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; fc++; const I = readInput();
    if (net.isHost) { const me = players.get(net.myId); if (me) me.inp = I; acc += dt; while (acc >= 1 / 60) { simStep(1 / 60); acc -= 1 / 60; } V = snap(); if (fc % 3 === 0) for (const id in conns) if (conns[id].open) conns[id].send(V); }
    else if (hostConn && hostConn.open && fc % 2 === 0) hostConn.send({ t: 'i', ...I });
    if (V && !document.hidden) draw(V, dt); };
  const loop = (now) => { requestAnimationFrame(loop); frame(now); }; requestAnimationFrame(loop);
  // Sekme arka plandayken tarayıcı çizim döngüsünü durdurur; oda sahibi dursa herkes donar. İşçi zamanlayıcısı kısılmaz.
  try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),33)'], { type: 'text/javascript' }))); w.onmessage = () => document.hidden && frame(performance.now()); } catch (e) {}
  addEventListener('blur', () => { for (const k in key) key[k] = 0; ui.mouseL = false; }); }
export async function go(kod, host) {
  initSnd();
  const name = ($('ad').value.trim() || 'Oyuncu').slice(0, 12); localStorage.setItem('kk-ad', name); if (!net.mic) { durum('Mikrofon izni isteniyor…'); await getMic(); } durum('Bağlanıyor…');
  if (location.search.includes('tek')) { net.isHost = true; net.myId = 'ben'; net.odaKodu = 'TEK'; mkPlayer(net.myId, name); $('kod').value = ''; return begin(); } // ağsız tek kişilik deneme
  net.isHost = host; net.odaKodu = kod || Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPRSTUVYZ'[(Math.random() * 21) | 0]).join('');
  // ?yerel: ofis ağında 0.peerjs.com engelli; deneme için yerel sunucu (npx peer --port 9000 --path /kk)
  const PO = location.search.includes("yerel") ? { host: "localhost", port: 9000, path: "/kk", secure: false } : {};
  peer = net.isHost ? new Peer(ODA + net.odaKodu, PO) : new Peer(PO);
  const zam = setTimeout(() => $('menu').style.display !== 'none' && durum('Bağlanılamadı. Wi-Fi yerine mobil veriyle (ya da tersi) tekrar dene.'), 12000);
  // Aynı kodu yazan herkes aynı odada buluşur: oda yoksa kurulur, varsa katılınır.
  peer.on('error', (e) => { if (e.type === 'peer-unavailable' && !net.isHost) { clearTimeout(zam); peer.destroy(); go(net.odaKodu, true); } else if (e.type === 'unavailable-id' && net.isHost) { clearTimeout(zam); peer.destroy(); go(net.odaKodu, false); } else durum('Bağlantı hatası: ' + e.type); });
  peer.on('call', (c) => { c.answer(net.mic); c.on('stream', (s) => playAudio(c.peer, s)); });
  peer.on('open', (id) => { net.myId = id;
    if (net.isHost) { mkPlayer(id, name); peer.on('connection', (c) => { c.on('data', (d) => { if (d.t === 'hi') { if (yasakli.has(String(d.name).slice(0, 12))) { c.send({ t: 'kick' }); return setTimeout(() => c.close(), 300); } if (players.size >= 4) return c.send({ t: 'full' }); conns[c.peer] = c; mkPlayer(c.peer, String(d.name).slice(0, 12)); c.send({ t: 'w', peers: [net.myId, ...Object.keys(conns).filter((i) => i !== c.peer)] }); } else if (d.t === 'i') { const p = players.get(c.peer); if (p) p.inp = d; } }); c.on('close', () => { delete conns[c.peer]; const p = players.get(c.peer); if (p && NZ.holder === p.id) NZ.holder = null; players.delete(c.peer); }); }); begin(); }
    else { hostConn = peer.connect(ODA + net.odaKodu, { serialization: 'json' }); hostConn.on('open', () => hostConn.send({ t: 'hi', name })); hostConn.on('data', (d) => { if (d.t === 's') V = d; else if (d.t === 'w') { d.peers.forEach(callPeer); begin(); } else if (d.t === 'full') durum('Oda dolu (4 kişi)'); else if (d.t === 'kick') { try { sessionStorage.setItem('kk-mesaj', 'Oda sahibi seni odadan çıkardı.'); } catch (e) {} location.reload(); } }); hostConn.on('close', () => { $('menu').style.display = 'flex'; durum('Oda sahibi ayrıldı'); }); } });
}
$('ad').value = localStorage.getItem('kk-ad') || ''; try { const msj = sessionStorage.getItem('kk-mesaj'); if (msj) { durum(msj); sessionStorage.removeItem('kk-mesaj'); } } catch (e) {} $('kur').onclick = () => { const k = $('kod').value.trim().toUpperCase(); go(k.length === 4 ? k : '', true); }; $('katil').onclick = () => { const k = $('kod').value.trim().toUpperCase(); if (k.length === 4) go(k, false); else durum('4 harfli oda kodunu yaz'); };
if (DBG) window.G = { kick, kamera: cam, ren, scene, cx, hitPlayer, CR, FIRE, EX, GATE, RAIN, jolt, get BOT() { return BOT; }, PC, OIL, POLZ, pourOil, eject, T, TKS, NZ, AH, AIR, DH, DRL, SPOT, BLIM, players, OBS, BUMP, key, cnt, startGame, mkPlayer, place, simStep, WHEEL, INLET, get V() { return V; }, set cam(v) { ui.camMode = v; } };
