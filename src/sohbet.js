// Sesli sohbet: isteğe bağlı mikrofon (kapalı / açık / bas-konuş) ve oyuncu başına ses seviyesi.
// Bağlantılar her zaman sessiz bir ses parçasıyla kurulur; oyuncu mikrofonu açınca parça gerçeğiyle değiştirilir
// (yeniden bağlanmadan). Uzaktaki sesler WebAudio kazancından geçer, böylece her oyuncunun sesi ayrı ayarlanır (iPhone dahil).
import { net, sesKaydet, sesSeviye, ui } from './state.js';
import { $ } from './world.js';
import { L, dilDegisince } from './dil.js';

let ctx = null, gercek = null, ptt = false, susturuldu = false, izinYok = false;
const kanal = new Map(), cagrilar = new Set();

// Kullanıcı tıklamasıyla (oda kur / katıl) çağrılır: ses bağlamını açar, sessiz parçayı hazırlar.
export function sesBaslat() {
  if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (!net.mic) net.mic = ctx ? ctx.createMediaStreamDestination().stream : new MediaStream();
  if (ui.ses.mod && ui.ses.mod !== 'kapali') sesModu(ui.ses.mod); // daha önce açtıysa yine açar (izin bir kez sorulur)
  dugme();
}

function parcaDegistir(c) {
  try { const s = c.peerConnection && c.peerConnection.getSenders().find((x) => !x.track || x.track.kind === 'audio'); if (s && gercek) s.replaceTrack(gercek); } catch (e) {}
}
export function cagriEkle(c) { if (!c) return; cagrilar.add(c); c.on('close', () => cagrilar.delete(c)); if (gercek) setTimeout(() => parcaDegistir(c), 0); }

// Uzaktaki oyuncunun sesi. <audio> öğesi Chrome'da WebAudio'ya veri akması için gerekli; sesi kazanç düğümünden çıkar.
export function kanalEkle(id, stream) {
  kanalSil(id);
  const a = document.createElement('audio'); a.id = 'au' + id; a.autoplay = true; a.playsInline = true; a.srcObject = stream; document.body.appendChild(a);
  let g = null;
  if (ctx) try { const src = ctx.createMediaStreamSource(stream); g = ctx.createGain(); src.connect(g); g.connect(ctx.destination); a.muted = true; } catch (e) { g = null; }
  kanal.set(id, { a, g }); sesleriUygula();
}
export function kanalSil(id) { const k = kanal.get(id); if (!k) return; k.a.remove(); if (k.g) try { k.g.disconnect(); } catch (e) {} kanal.delete(id); }
export function sesleriUygula() { for (const [id, k] of kanal) { const v = sesSeviye(id); if (k.g) k.g.gain.value = v; else k.a.volume = Math.min(1, v); } }

// Mikrofon kipi: 'kapali' | 'acik' | 'bas'
export async function sesModu(m) {
  ui.ses.mod = m; sesKaydet(); izinYok = false;
  if (m !== 'kapali' && !gercek) {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      gercek = s.getAudioTracks()[0]; net.mic = s; net.micOk = true; for (const c of cagrilar) parcaDegistir(c);
    } catch (e) { izinYok = true; ui.ses.mod = 'kapali'; sesKaydet(); }
  }
  uygula();
}
function uygula() { if (gercek) gercek.enabled = ui.ses.mod === 'acik' ? !susturuldu : ui.ses.mod === 'bas' ? ptt : false; dugme(); }
export function basKonus(v) { if (ptt === v) return; ptt = v; uygula(); }
export function sustur() { if (ui.ses.mod === 'acik') { susturuldu = !susturuldu; uygula(); } }

// Üstteki mikrofon düğmesi: kapalıyken açar, açıkken susturur, bas-konuşta basılı tutulur.
function dugme() {
  const b = $('mikBtn'); if (!b) return; const m = ui.ses.mod || 'kapali';
  b.textContent = izinYok ? L('mik_izin') : m === 'kapali' ? L('mik_kapali') : m === 'acik' ? (susturuldu ? L('mik_sessiz') : L('mik_acik')) : ptt ? L('mik_konus') : L('mik_bas');
  b.classList.toggle('canli', !!gercek && gercek.enabled);
}
export const mikKipi = () => ui.ses.mod || 'kapali';
{
  const b = $('mikBtn');
  b.addEventListener('click', () => { if (mikKipi() === 'kapali') sesModu('acik'); else if (mikKipi() === 'acik') sustur(); });
  b.addEventListener('pointerdown', (e) => { if (mikKipi() === 'bas') { e.preventDefault(); basKonus(true); } });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => mikKipi() === 'bas' && basKonus(false));
  const yaziyor = (e) => e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range';
  addEventListener('keydown', (e) => { if ($('menu').style.display !== 'none' || yaziyor(e)) return; if (e.code === 'KeyV' && mikKipi() === 'bas') basKonus(true); if (e.code === 'KeyM' && !e.repeat) sustur(); });
  addEventListener('keyup', (e) => { if (e.code === 'KeyV') basKonus(false); });
  addEventListener('blur', () => basKonus(false));
  dilDegisince(dugme);
}
