// Girdi: klavye, fare, dokunmatik.
import { net, ui } from './state.js';
import { $, DBG, clamp, rnd } from './world.js';
import { T, place, players, resetGame, startGame } from './sim.js';
import { ren } from './scene.js';
import { initSnd } from './audio.js';

// ---------- girdi ----------
export const TOUCH = matchMedia('(pointer:coarse)').matches;
export const key = {}, cnt = { p: 0, s: 0, c: 0, w: 0, q: 0, r: 0 }, tb = {}, joy = { x: 0, y: 0 };
addEventListener('keydown', (e) => { if (e.repeat || $('menu').style.display !== 'none') return; key[e.code] = 1; if (e.code === 'KeyK') cnt.p++; if (e.code === 'KeyE') cnt.s++; if (e.code === 'KeyT') ui.telsizAc = true; if (/^(Digit|Numpad)[1-4]$/.test(e.code)) ui.telsizTus = +e.code.slice(-1); initSnd(); if (e.code === 'KeyN') { ui.musOn = !ui.musOn; localStorage.setItem('kk-muz', ui.musOn ? '1' : '0'); } if (e.code === 'Enter') hostStart(); if (DBG && e.code === 'KeyX') ui.camMode = ui.camMode >= 2 ? -1 : ui.camMode + 1; if (e.code === 'KeyC') kameraDegis(); if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', (e) => (key[e.code] = 0));
addEventListener('pointerdown', initSnd); ren.domElement.addEventListener('mousedown', (e) => { if (e.button === 0) ui.mouseL = true; else cnt.p++; }); addEventListener('mouseup', (e) => { if (e.button === 0) ui.mouseL = false; }); addEventListener('contextmenu', (e) => e.preventDefault());
ren.domElement.addEventListener('dblclick', () => matchMedia('(pointer:coarse)').matches && hostStart());
{ const j = $('joy'), nub = j.firstElementChild, mv = (e) => { e.preventDefault(); const r = j.getBoundingClientRect(), t = e.targetTouches[0]; if (!t) { joy.x = joy.y = 0; nub.style.transform = ''; return; } const h = r.width / 2; let x = (t.clientX - r.left - h) / (h * 0.8), y = (t.clientY - r.top - h) / (h * 0.8); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joy.x = x; joy.y = -y; nub.style.transform = `translate(${x * 75}%,${y * 75}%)`; };
  const d = $('dir'), wh = d.lastElementChild, dv = (e) => { e.preventDefault(); const r = d.getBoundingClientRect(), t = e.targetTouches[0]; const x = t ? clamp((t.clientX - r.left - r.width / 2) / (r.width * 0.4), -1, 1) : 0; joy.x = x; joy.y = 0; wh.style.transform = `rotate(${x * 110}deg)`; };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) { j.addEventListener(ev, mv, { passive: false }); d.addEventListener(ev, dv, { passive: false }); }
  for (const b of $('dok').querySelectorAll('b[data-k]')) { const k = b.dataset.k, up = (e) => { e.preventDefault(); b.classList.remove('bas'); tb[k] = 0; }; b.addEventListener('touchstart', (e) => { e.preventDefault(); b.classList.add('bas'); if (k === 't') ui.telsizAc = true; else if (k in cnt) cnt[k]++; else tb[k] = 1; }, { passive: false }); b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false }); } }
{ let k = +localStorage.getItem('kk-boy') || 1; const set = () => { k = clamp(Math.round(k * 10) / 10, 0.5, 1.7); $('dok').style.setProperty('--k', k); localStorage.setItem('kk-boy', k); }; set(); // tuş boyutu: A− / A+
  for (const b of $('boy').children) b.addEventListener('touchstart', (e) => { e.preventDefault(); k += b.dataset.z * 0.1; set(); }, { passive: false }); }
export const readInput = () => bakisaGore({ mx: clamp((key.KeyA || key.ArrowLeft ? 1 : 0) - (key.KeyD || key.ArrowRight ? 1 : 0) - joy.x, -1, 1), mz: clamp((key.KeyW || key.ArrowUp ? 1 : 0) - (key.KeyS || key.ArrowDown ? 1 : 0) + joy.y + (tb.ga ? 1 : 0) - (tb.fr ? 1 : 0), -1, 1), sg: tb.sl ? 1 : tb.sr ? 2 : tb.yv ? 3 : tb.hz ? 4 : 0, j: key.Space || tb.j ? 1 : 0, g: key.KeyJ || ui.mouseL || tb.g ? 1 : 0, u: key.KeyF || tb.u ? 1 : 0, p: cnt.p, s: cnt.s, c: cnt.c, w: cnt.w, q: cnt.q, r: cnt.r, kr: ui.karakter });
export function hostStart() { if (!net.isHost) return; if (T.state === 'lobby') startGame(); else if (T.state !== 'run') { resetGame(); for (const p of players.values()) { p.seat = 0; p.dead = 0; place(p, rnd(-0.8, 0.8), 1.95, rnd(-4.5, -1.5)); } } }

// ---------- birinci şahıs kamera ----------
// C (dokunmatikte 🎥) kamerayı karakterin gözüne alır. Fare (tıklayınca kilitlenir) ya da ekranı kaydırma bakışı çevirir.
// Kasadayken W baktığın yöne yürütür; bakış yönü oda sahibine gider, eller ve şaplak o yöne uzanır.
export function kameraDegis() {
  ui.kamera = (ui.kamera + 1) % 3; ui.bakisIlk = true; try { localStorage.setItem('kk-kamera', ui.kamera); } catch (e) {}
  if (!ui.kamera) { if (document.pointerLockElement) document.exitPointerLock(); }
  else if (!TOUCH && !document.pointerLockElement) try { fareSus(); ren.domElement.requestPointerLock(); } catch (e) {} // tuşa basmak kullanıcı hareketi sayılır: fare hemen kilitlenir
}
const cevir = (dx, dy, k) => { ui.bakis -= dx * k; ui.egim = clamp(ui.egim - dy * k, -1.2, 1.0); };
ren.domElement.addEventListener('click', () => { if (ui.kamera && ui.fpAktif && !TOUCH && !document.pointerLockElement) { fareSus(); ren.domElement.requestPointerLock?.(); } });
// fare kilitli değilken de (ör. kilit reddedildiyse) oyun alanında fareyi oynatmak bakışı çevirir
addEventListener('mousemove', (e) => {
  if (!ui.fpAktif) return;
  let dx = e.movementX || (FARE.x === null ? 0 : e.clientX - FARE.x), dy = e.movementY || (FARE.y === null ? 0 : e.clientY - FARE.y); FARE.x = e.clientX; FARE.y = e.clientY; // movementX gelmezse konum farkı
  if (performance.now() < FARE.sus) return; // fare kilitlenirken tarayıcı sahte büyük hareketler yollar: kısa süre yok say
  if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return; // imleç ışınlanması gibi sahte sıçramalar
  const t = e.target; if (document.pointerLockElement !== ren.domElement && t && t.closest && t.closest('button, b, input, select, label, .panel:not(.kapali), #telsiz')) return; // kilitsizken düğme ve panellerin üstünde bakış dönmez
  cevir(dx, dy, 0.0025);
});
const FARE = { x: null, y: null, sus: 0 };
const fareSus = () => { FARE.sus = performance.now() + 250; FARE.x = FARE.y = null; };
document.addEventListener('pointerlockchange', fareSus);
{ let son = null; // dokunmatik: joystick ve tuşlar dışında ekranı kaydırmak bakışı çevirir
  ren.domElement.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; son = { id: t.identifier, x: t.clientX, y: t.clientY }; }, { passive: true });
  ren.domElement.addEventListener('touchmove', (e) => { if (!son || !ui.kamera) return; for (const t of e.changedTouches) if (t.identifier === son.id) { cevir(t.clientX - son.x, t.clientY - son.y, 0.006); son.x = t.clientX; son.y = t.clientY; } }, { passive: true });
  ren.domElement.addEventListener('touchend', () => { son = null; }, { passive: true }); }
// hareket girdisini bakış yönüne çevirir (yalnız kasada, birinci şahısta): W ileri, A/D yana
function bakisaGore(I) {
  if (!ui.fpAktif) return I;
  const h = ui.bakis, s = Math.sin(h), c = Math.cos(h), mx = I.mx, mz = I.mz;
  I.mx = mz * s + mx * c; I.mz = mz * c - mx * s; I.yw = Math.round(h * 100) / 100; if (ui.kamera === 1) I.fp = 1; return I;
}
$('kamBtn').addEventListener('click', kameraDegis);
