// Ses: tümü WebAudio ile sentezlenir.
import { ui } from './state.js';

// ---- Ses: hepsi WebAudio ile sentezlenir (ses dosyası yok). Oda sahibinden gelen duruma (V) bakarak her istemcide çalar. ----
export let AC = null, SND = null;
export function initSnd() {
  if (AC) { if (AC.state === 'suspended' && !document.hidden) AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const out = AC.createDynamicsCompressor(); out.connect(AC.destination);
  const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const G = (v, to) => { const g = AC.createGain(); g.gain.value = v; g.connect(to); return g; };
  const F = (type, f, q, to) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; };
  const O = (type, f, to) => { const o = AC.createOscillator(); o.type = type; o.frequency.value = f; o.connect(to); o.start(); return o; };
  const N = (to) => { const s = AC.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(to); s.start(); return s; };
  const master = G(0.9 * ui.ses.efekt, out), mg = G(0, out), mlp = F('lowpass', 2200, 0.5, mg); // efektler master'dan, müzik ayrı yoldan çıkar (ayrı ses ayarı)
  const eg = G(0, master), ef = F('lowpass', 250, 1.5, eg), e1 = O('sawtooth', 40, ef), e2 = O('square', 20, ef); // motor
  const rg = G(0, master), rf = F('lowpass', 400, 0.7, rg); N(rf); // gaz / yol uğultusu
  const bg = G(0, master); N(F('bandpass', 2400, 5, bg)); // fren
  const ag = G(0, master), af = F('bandpass', 3000, 1.5, ag); N(af); const cg = G(0, master); O('sawtooth', 31, F('lowpass', 180, 2, cg)); // basınçlı hava tıslaması + kompresör
  const fg = G(0, master), fm = G(0.55, fg); N(F('lowpass', 520, 1, fm)); const gur = O('sine', 150, G(0.5, fm)); O('sine', 6.5, G(0.45, fm.gain)); O('sine', 9.3, G(40, gur.frequency)); // yakıt: lıkır lıkır
  const dg = G(0, master), df = F('bandpass', 1500, 2.5, dg); O('sawtooth', 205, df); O('sawtooth', 311, df); N(G(0.25, df)); // matkap
  const fig = G(0, master), fim = G(0.5, fig); N(F('bandpass', 2600, 0.8, fim)); O('square', 11, G(0.5, fim.gain)); const rng = G(0, master); N(F('highpass', 4500, 0.5, rng)); // yangın çıtırtısı, yağmur
  const sg = G(0, master), so = O('triangle', 760, sg); O('sine', 0.7, G(130, so.frequency)); // siren
  SND = { fig, rng, sg, dg, master, mg, mlp, eg, ef, e1, e2, rg, rf, bg, ag, af, cg, fg, gur, nb };
  document.addEventListener('visibilitychange', () => (document.hidden ? AC.suspend() : AC.resume()));
}
export function tone(f, t0, dur, vol, type = 'sine', to = SND.master, f2 = 0) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(to); o.start(t0); o.stop(t0 + dur + 0.05); }
export function burst(t0, dur, vol, type, f, to = SND.master) { const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = SND.nb; s.loop = true; fl.type = type; fl.frequency.value = f; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(fl); fl.connect(g); g.connect(to); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05); }
export const horn = (t0, dur) => { for (const f of [185, 233]) tone(f, t0, dur, 0.16, 'sawtooth', SND.master, f * 0.985); };
// Müzik: Mi'de 12 ölçülük blues, shuffle. Barda ağır, yolda hızlı.
export const BARS = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], WALK = [0, 0, 4, 4, 7, 7, 9, 7], PENTA = [0, 3, 5, 7, 10, 12, 15], st = (n) => Math.pow(2, n / 12);
export function musStep(i, t0, road) {
  const S = SND, e = i % 8, root = BARS[((i / 8) | 0) % 12], bt = 60 / (road ? 128 : 84);
  tone(82.4 * st(root + WALK[e]), t0, bt * 0.5, 0.2, 'triangle', S.mg);
  if (e % 4 === 0) tone(110, t0, 0.14, 0.35, 'sine', S.mg, 42); // kick
  if (e % 4 === 2) { burst(t0, 0.13, road ? 0.16 : 0.09, 'bandpass', 1900, S.mg); for (const n of [4, 10, 14]) tone(164.8 * st(root + n), t0, bt * 0.45, 0.045, road ? 'sawtooth' : 'triangle', S.mlp); } // trampet + akor
  burst(t0, 0.035, e % 2 ? 0.035 : 0.07, 'highpass', 7000, S.mg); // hi-hat
  if (Math.random() < (road ? 0.4 : 0.28)) { const n = PENTA[(Math.random() * PENTA.length) | 0]; tone((road ? 329.6 : 659.3) * st(n), t0, bt * (e % 2 ? 0.3 : 0.6), road ? 0.06 : 0.05, road ? 'square' : 'triangle', S.mlp); } // doğaçlama ezgi
  return bt * (e % 2 ? 0.34 : 0.66);
}
export const sm = { fh: 0, ext: 0, dm: 0, drl: 0, s: '', cd: 0, fl: [0, 0, 0, 0], rp: 0, oh: 0, m: '', infl: 0, mode: -1, step: 0, nt: 0 };
export function sfx(V, dt) {
  if (!SND || AC.state !== 'running') return;
  const t = V.T, S = SND, now = AC.currentTime, run = t.s === 'run', roll = run && !t.cd, set = (p, v, tc = 0.08) => p.setTargetAtTime(v, now, tc);
  const rpm = roll ? t.v * 3.2 + t.g * 24 : 0;
  set(S.e1.frequency, 36 + rpm); set(S.e2.frequency, 18 + rpm / 2); set(S.ef.frequency, 200 + rpm * 5 + t.g * 450); set(S.eg.gain, run ? 0.05 + (roll ? t.g * 0.05 : 0) : 0, 0.25);
  set(S.rg.gain, roll ? 0.01 + t.v * 0.002 + t.g * 0.06 : 0, 0.15); set(S.rf.frequency, 280 + t.v * 35 + t.g * 500);
  set(S.bg.gain, roll && t.b > 0.1 && t.v > 2 ? 0.045 * t.b : 0);
  const rp = t.rp.reduce((a, b) => a + b, 0); if (rp > sm.rp + 1e-5) sm.infl = 0.3; else sm.infl -= dt; sm.rp = rp;
  const fh = V.fr ? V.fr[2] : 0; if (fh && fh < sm.fh) sm.ext = 0.4; else sm.ext -= dt; sm.fh = fh; set(S.fig.gain, run && V.fr ? 0.16 : 0, 0.15); set(S.rng.gain, run && t.rn ? 0.05 : 0, 0.5);
  const inf = run && (sm.infl > 0 || sm.ext > 0 || t.ht > 88); set(S.ag.gain, inf ? 0.2 : 0, 0.04); set(S.cg.gain, run && sm.infl > 0 ? 0.12 : 0, 0.1); if (inf) set(S.af.frequency, 2000 + Math.max(...t.rp) * 4000, 0.2);
  const dm = t.dm.reduce((a, b) => a + b, 0); if (dm < sm.dm) sm.drl = 0.4; else sm.drl -= dt; sm.dm = dm; set(S.dg.gain, run && sm.drl > 0 ? 0.11 : 0, 0.03);
  set(S.sg.gain, run && (V.q[0] === 1 || V.q[0] === 2) ? 0.045 : 0, 0.15);
  const fill = run && V.k[3] && V.n[3] && t.f < 100; set(S.fg.gain, fill ? 0.3 : 0, 0.1); if (fill) set(S.gur.frequency, 110 + t.f * 2.2, 0.3);
  if (run && t.cd !== sm.cd) { if (t.cd > 0) tone(520, now, 0.16, 0.25, 'square'); else if (sm.cd > 0) { tone(1040, now, 0.5, 0.25, 'square'); horn(now + 0.1, 0.9); } } sm.cd = run ? t.cd : 0;
  t.fl.forEach((f, i) => { if (f && !sm.fl[i]) { burst(now, 0.4, 0.7, 'lowpass', 1100); tone(140, now, 0.35, 0.5, 'sine', S.master, 38); burst(now + 0.05, 1.4, 0.12, 'bandpass', 4200); } }); sm.fl = t.fl.slice(); // patlama + sönme tıslaması
  if (t.oh.length > sm.oh) { burst(now, 0.5, 0.8, 'lowpass', 700); tone(95, now, 0.45, 0.6, 'sine', S.master, 30); burst(now + 0.03, 0.3, 0.2, 'highpass', 3500); } sm.oh = t.oh.length;
  if (t.m !== sm.m) { const m = (sm.m = t.m);
    if (m.includes('sandı')) { tone(320, now, 0.5, 0.3, 'triangle', S.master, 70); burst(now + 0.35, 0.25, 0.5, 'lowpass', 500); }
    else if (m.includes('uçtu')) { tone(300, now, 0.5, 0.25, 'square', S.master, 1100); burst(now, 0.2, 0.4, 'lowpass', 900); }
    else if (m.includes('Haydut kasaya')) for (let i = 0; i < 3; i++) tone(i % 2 ? 392 : 311, now + i * 0.16, 0.16, 0.2, 'sawtooth');
    else if (m.includes('Kasada yangın')) { burst(now, 0.9, 0.5, 'bandpass', 1400); tone(180, now, 0.7, 0.2, 'sawtooth', S.master, 420); }
    else if (m.includes('söndürdü') || m.includes('yeniden çalıştı')) { tone(660, now, 0.2, 0.2); tone(990, now + 0.12, 0.4, 0.2); }
    else if (m.includes('stop etti')) { for (let i = 0; i < 4; i++) tone(90 - i * 12, now + i * 0.16, 0.14, 0.4, 'sawtooth'); burst(now + 0.6, 1.2, 0.3, 'bandpass', 3500); }
    else if (m.includes('saf dışı')) { burst(now, 1.1, 0.8, 'lowpass', 500); tone(120, now, 0.9, 0.5, 'sine', S.master, 28); [0, 4, 7, 12].forEach((n, i) => tone(523 * st(n), now + 0.5 + i * 0.12, 0.3, 0.18, 'square')); }
    else if (m.includes('yağ döktü')) { burst(now, 0.7, 0.4, 'lowpass', 650); tone(260, now, 0.5, 0.15, 'sine', S.master, 80); if (m.includes('kaydı')) burst(now + 0.3, 1.2, 0.3, 'bandpass', 2900); }
    else if (m.includes('atladı')) { burst(now, 0.3, 0.7, 'lowpass', 900); tone(150, now, 0.3, 0.5, 'sine', S.master, 45); tone(700, now, 0.25, 0.07, 'square', S.master, 480); }
    else if (m.includes('fırladı')) { tone(200, now, 0.55, 0.25, 'square', S.master, 950); burst(now, 0.15, 0.3, 'bandpass', 1200); }
    else if (m.includes('Bariyer') || m.includes('vurdu') || m.includes('Kapalı şerid')) { burst(now, 0.45, 0.7, 'lowpass', 800); tone(110, now, 0.4, 0.5, 'sine', S.master, 36); burst(now + 0.02, 0.5, 0.25, 'bandpass', 2600); tone(640, now, 0.5, 0.08, 'square', S.master, 520); }
    else if (m.includes('onardı')) { tone(660, now, 0.2, 0.2); tone(990, now + 0.1, 0.2, 0.2); tone(1320, now + 0.2, 0.45, 0.2); }
    else if (m.includes('Tümse')) { tone(75, now, 0.3, 0.5, 'sine', S.master, 34); burst(now, 0.18, 0.3, 'lowpass', 500); }
    else if (m.includes('şişirdi')) { tone(880, now, 0.25, 0.2); tone(1320, now + 0.12, 0.45, 0.2); }
    else if (m.includes('Vana')) { burst(now, 0.08, 0.4, 'bandpass', 900); tone(300, now, 0.2, 0.15, 'square', S.master, 140); }
    else if (m.includes('takıldı')) { burst(now, 0.05, 0.5, 'bandpass', 1500); burst(now + 0.09, 0.05, 0.4, 'bandpass', 2300); }
    else if (m.includes('çağırdı')) for (let i = 0; i < 2; i++) for (let j = 0; j < 6; j++) tone(j % 2 ? 480 : 620, now + i * 0.55 + j * 0.06, 0.06, 0.12, 'square');
    else if (m.includes('Tanker ayrılıyor')) horn(now, 0.5);
    else if (m.includes('kurtuldu')) burst(now, 0.5, 0.3, 'bandpass', 3800); }
  if (t.s !== sm.s) { if (t.s === 'win') [0, 4, 7, 12, 16].forEach((n, i) => tone(329.6 * st(n), now + i * 0.14, i === 4 ? 0.9 : 0.25, 0.2, 'square')); if (t.s === 'over') { tone(300, now, 1.4, 0.3, 'sawtooth', S.master, 55); [7, 3, 0].forEach((n, i) => tone(196 * st(n), now + i * 0.3, 0.5, 0.18, 'triangle')); } sm.s = t.s; }
  const mode = t.s === 'lobby' ? 0 : roll ? 1 : -1; if (mode !== sm.mode) { sm.mode = mode; sm.step = 0; sm.nt = now + 0.15; }
  set(S.mg.gain, ui.musOn ? (mode ? 1 : 0.9) * 0.9 * ui.ses.muzik : 0, 0.1); set(S.master.gain, 0.9 * ui.ses.efekt, 0.1);
  if (mode >= 0 && ui.musOn) { if (sm.nt < now) sm.nt = now + 0.05; while (sm.nt < now + 0.2) sm.nt += musStep(sm.step++, sm.nt, mode); }
}
