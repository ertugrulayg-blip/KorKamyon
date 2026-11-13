// Girdi: klavye, fare, dokunmatik.
import { net, ui } from './state.js';
import { $, DBG, clamp, rnd } from './world.js';
import { T, place, players, resetGame, startGame } from './sim.js';
import { ren } from './scene.js';
import { initSnd } from './audio.js';

// ---------- girdi ----------
export const TOUCH = matchMedia('(pointer:coarse)').matches;
export const key = {}, cnt = { p: 0, s: 0, c: 0, w: 0 }, tb = {}, joy = { x: 0, y: 0 };
addEventListener('keydown', (e) => { if (e.repeat || $('menu').style.display !== 'none') return; key[e.code] = 1; if (e.code === 'KeyK') cnt.p++; if (e.code === 'KeyE') cnt.s++; if (e.code === 'KeyT') cnt.c++; if (e.code === 'KeyW') cnt.w++; initSnd(); if (e.code === 'KeyN') { ui.musOn = !ui.musOn; localStorage.setItem('kk-muz', ui.musOn ? '1' : '0'); } if (e.code === 'Enter') hostStart(); if (e.code === 'KeyM' && net.mic) { const tr = net.mic.getAudioTracks()[0]; if (tr) tr.enabled = !tr.enabled; } if (DBG && e.code === 'KeyC') ui.camMode = ui.camMode >= 2 ? -1 : ui.camMode + 1; if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', (e) => (key[e.code] = 0));
addEventListener('pointerdown', initSnd); ren.domElement.addEventListener('mousedown', (e) => { if (e.button === 0) ui.mouseL = true; else cnt.p++; }); addEventListener('mouseup', (e) => { if (e.button === 0) ui.mouseL = false; }); addEventListener('contextmenu', (e) => e.preventDefault());
ren.domElement.addEventListener('dblclick', () => matchMedia('(pointer:coarse)').matches && hostStart());
{ const j = $('joy'), nub = j.firstElementChild, mv = (e) => { e.preventDefault(); const r = j.getBoundingClientRect(), t = e.targetTouches[0]; if (!t) { joy.x = joy.y = 0; nub.style.transform = ''; return; } const h = r.width / 2; let x = (t.clientX - r.left - h) / (h * 0.8), y = (t.clientY - r.top - h) / (h * 0.8); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joy.x = x; joy.y = -y; nub.style.transform = `translate(${x * 75}%,${y * 75}%)`; };
  const d = $('dir'), wh = d.lastElementChild, dv = (e) => { e.preventDefault(); const r = d.getBoundingClientRect(), t = e.targetTouches[0]; const x = t ? clamp((t.clientX - r.left - r.width / 2) / (r.width * 0.4), -1, 1) : 0; joy.x = x; joy.y = 0; wh.style.transform = `rotate(${x * 110}deg)`; };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) { j.addEventListener(ev, mv, { passive: false }); d.addEventListener(ev, dv, { passive: false }); }
  for (const b of $('dok').querySelectorAll('b[data-k]')) { const k = b.dataset.k, up = (e) => { e.preventDefault(); b.classList.remove('bas'); tb[k] = 0; }; b.addEventListener('touchstart', (e) => { e.preventDefault(); b.classList.add('bas'); if (k in cnt) cnt[k]++; else tb[k] = 1; }, { passive: false }); b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false }); } }
{ let k = +localStorage.getItem('kk-boy') || 1; const set = () => { k = clamp(Math.round(k * 10) / 10, 0.5, 1.7); $('dok').style.setProperty('--k', k); localStorage.setItem('kk-boy', k); }; set(); // tuş boyutu: A− / A+
  for (const b of $('boy').children) b.addEventListener('touchstart', (e) => { e.preventDefault(); k += b.dataset.z * 0.1; set(); }, { passive: false }); }
export const readInput = () => ({ mx: clamp((key.KeyA || key.ArrowLeft ? 1 : 0) - (key.KeyD || key.ArrowRight ? 1 : 0) - joy.x, -1, 1), mz: clamp((key.KeyW || key.ArrowUp ? 1 : 0) - (key.KeyS || key.ArrowDown ? 1 : 0) + joy.y + (tb.ga ? 1 : 0) - (tb.fr ? 1 : 0), -1, 1), sg: tb.sl ? 1 : tb.sr ? 2 : tb.yv ? 3 : 0, j: key.Space || tb.j ? 1 : 0, g: key.KeyJ || ui.mouseL || tb.g ? 1 : 0, u: key.KeyF || tb.u ? 1 : 0, p: cnt.p, s: cnt.s, c: cnt.c, w: cnt.w });
export function hostStart() { if (!net.isHost) return; if (T.state === 'lobby') startGame(); else if (T.state !== 'run') { resetGame(); for (const p of players.values()) { p.seat = 0; p.dead = 0; place(p, rnd(-0.8, 0.8), 1.95, rnd(-4.5, -1.5)); } } }
