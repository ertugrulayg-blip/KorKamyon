// Kör Kamyon — 2-4 kişilik ortak oyun. Oda sahibi fiziği hesaplar, diğerleri girdi yollar (PeerJS).
// Eksenler (kamyon çerçevesi): +z ileri, +y yukarı, +x SOL (three sağ-elli olduğundan +z'ye bakınca +x solda kalır).
import * as THREE from 'three';

const $ = (i) => document.getElementById(i), DBG = location.search.includes('debug');
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), rnd = (a, b) => a + Math.random() * (b - a);
const LEN = 2500, COL = [0xff5a5f, 0x3fa7ff, 0xffd23f, 0x7bd389], ODA = 'kor-kamyon-';
const cx = (z) => { const s = clamp((z - 80) / 200, 0, 1); return s * (26 * Math.sin(z / 160) + 10 * Math.sin(z / 57 + 1)); };
let tohum = 12345; const srnd = () => { tohum = (tohum * 1664525 + 1013904223) >>> 0; return tohum / 4294967296; };

// ---------- çarpışma kutuları (kamyon çerçevesi) ----------
const BOX = [];
const box = (x0, x1, y0, y1, z0, z1, tag, c) => { const b = { a: [x0, y0, z0], b: [x1, y1, z1], o: [0, 0, 0], tag, c, on: true }; BOX.push(b); return b; };
box(-1.5, 1.5, 0.5, 1.3, -6, 3.2, 'floor', 0xb9853f);
box(1.4, 1.5, 1.3, 1.8, -6, 1, 'rail', 0x8a8f98); box(-1.5, -1.4, 1.3, 1.8, -6, 1, 'rail', 0x8a8f98); box(-1.5, 1.5, 1.3, 1.8, -6.1, -6, 'rail', 0x8a8f98);
box(1.4, 1.5, 1.3, 2.7, 1, 3.2, 'door', 0xd8432f); box(-1.5, -1.4, 1.3, 2.7, 1, 3.2, 'door', 0xd8432f);
box(-1.5, 1.5, 1.3, 2.7, 3.2, 3.5, 'dash', 0x2b2f38);
box(-1.5, 1.5, 0.5, 2.1, 3.5, 5.3, 'hood', 0xd8432f);
box(0.3, 1.1, 1.3, 1.6, 1.5, 2.3, 'seat', 0x30415d); box(-1.1, -0.3, 1.3, 2.0, 1.5, 2.3, 'seat', 0x30415d);
const TK = box(-1.2, 1.2, 0.5, 2.0, -3.5, 3.5, 'tanker', 0xe9e9e9); TK.on = false;
const SEAT = { 1: [0.7, 1.55, 1.9], 2: [-0.7, 2.0, 1.9] }; // 1 şoför (solda, kısa), 2 yolcu
const INLET = [1.25, 2.0, 0.4];
const WHEEL = [[1.55, 0.55, 2.2, 'sol ön'], [-1.55, 0.55, 2.2, 'sağ ön'], [1.55, 0.55, -4, 'sol arka'], [-1.55, 0.55, -4, 'sağ arka']];
const OBS = []; for (let z = 260; z < LEN - 60; z += 70 + srnd() * 60) OBS.push({ z, x: cx(z) + (srnd() * 9 - 4.5), hit: false });
const BUMP = []; for (let z = 190; z < LEN - 80; z += 150 + ((z * 7) % 90)) { while (OBS.some((o) => Math.abs(o.z - z) < 28)) z += 14; BUMP.push(z); }
const BUMP_V = 8; // m/s (~29 km/s) üstünde tümseğe girilirse lastik patlar

// ---------- oyun durumu (yalnız oda sahibinde) ----------
const players = new Map();
const T = { X: 0, Z: 0, th: 0, v: 0, steer: 0, fuel: 100, flat: [0, 0, 0, 0], rep: [0, 0, 0, 0], pax: 0, paz: 0, state: 'lobby', t: 0, nextFlat: 30, msg: '', msgT: 0, why: '', gas: 0, br: 0, sig: 0 };
const TKS = { st: 0, x: 2.9, z: -50, valve: 0, vp: 0, t: 0 };
const NZ = { p: [0, -5, 0], holder: null, hand: 0, dock: false };
const say = (m) => { T.msg = m; T.msgT = 3.5; };

const R = [0.25, 0.3, 0.25, 0.13, 0.13, 0.15, 0.15]; // kalça, göğüs, kafa, sol el, sağ el, sol ayak, sağ ayak
const OFF = [[0, 0, 0], [0, 0.4, 0], [0, 0.76, 0], [0.35, 0.2, 0], [-0.35, 0.2, 0], [0.15, -0.5, 0], [-0.15, -0.5, 0]];
function place(pl, x, y, z) { for (let k = 0; k < 7; k++) { pl.P[k * 3] = x + OFF[k][0]; pl.P[k * 3 + 1] = y + OFF[k][1]; pl.P[k * 3 + 2] = z + OFF[k][2]; } pl.Q.set(pl.P); pl.pin = [null, null]; pl.offT = 0; }
function mkPlayer(id, name) {
  const used = [...players.values()].map((p) => p.ci);
  const pl = { id, name, ci: [0, 1, 2, 3].find((i) => !used.includes(i)) ?? 0, P: new Float32Array(21), Q: new Float32Array(21), seat: 0, yaw: 0, inp: {}, pin: [null, null], arm: 0.7, gndT: 0, jumpT: 0, stun: 0, punchT: 0, punchCd: 0, punchH: 0, hitDone: true, phase: 0, dead: 0, offT: 0, lp: 0, ls: 0, lc: 0, lj: false };
  place(pl, rnd(-0.8, 0.8), 1.95, rnd(-4.5, -1.5)); players.set(id, pl); return pl;
}
function poseSeat(pl) {
  const s = SEAT[pl.seat], P = pl.P, d = pl.seat === 1, set = (k, x, y, z) => { P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z; };
  set(0, s[0], s[1], s[2]); set(1, s[0], s[1] + 0.4, s[2] + 0.04); set(2, s[0], s[1] + 0.76, s[2] + 0.06);
  set(3, s[0] + 0.22, d ? 2.05 : s[1] + 0.25, s[2] + (d ? 0.85 : 0.45)); set(4, s[0] - 0.22, d ? 2.05 : s[1] + 0.25, s[2] + (d ? 0.85 : 0.45));
  set(5, s[0] + 0.15, 1.45, s[2] + 0.7); set(6, s[0] - 0.15, 1.45, s[2] + 0.7); pl.Q.set(P); pl.yaw = 0;
}
const d3 = (A, i, B, j) => Math.hypot(A[i] - B[j], A[i + 1] - B[j + 1], A[i + 2] - B[j + 2]);
function stick(P, a, b, L, wa, rope) {
  const i = a * 3, j = b * 3, dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2], d = Math.hypot(dx, dy, dz) || 1e-6;
  if (rope && d <= L) return; const k = (d - L) / d, wb = 1 - wa;
  P[i] += dx * k * wa; P[i + 1] += dy * k * wa; P[i + 2] += dz * k * wa; P[j] -= dx * k * wb; P[j + 1] -= dy * k * wb; P[j + 2] -= dz * k * wb;
}
const N = [0, 0, 0];
function collide(P, i, r) {
  let hit = null;
  for (const b of BOX) {
    if (!b.on) continue;
    const ax = b.a[0] + b.o[0], bx = b.b[0] + b.o[0], ay = b.a[1] + b.o[1], by = b.b[1] + b.o[1], az = b.a[2] + b.o[2], bz = b.b[2] + b.o[2];
    const x = P[i], y = P[i + 1], z = P[i + 2], qx = clamp(x, ax, bx), qy = clamp(y, ay, by), qz = clamp(z, az, bz), dx = x - qx, dy = y - qy, dz = z - qz, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; P[i] += dx * k; P[i + 1] += dy * k; P[i + 2] += dz * k; N[0] = dx / d; N[1] = dy / d; N[2] = dz / d; }
    else {
      const pen = [x - ax, bx - x, y - ay, by - y, z - az, bz - z]; let m = 0; for (let k = 1; k < 6; k++) if (pen[k] < pen[m]) m = k;
      N[0] = N[1] = N[2] = 0;
      if (m === 0) { P[i] = ax - r; N[0] = -1; } else if (m === 1) { P[i] = bx + r; N[0] = 1; } else if (m === 2) { P[i + 1] = ay - r; N[1] = -1; } else if (m === 3) { P[i + 1] = by + r; N[1] = 1; } else if (m === 4) { P[i + 2] = az - r; N[2] = -1; } else { P[i + 2] = bz + r; N[2] = 1; }
    }
    hit = b;
  }
  return hit;
}
function dropNozzle() {
  NZ.holder = null;
  if (TKS.st === 2 && Math.hypot(NZ.p[0] - INLET[0], NZ.p[1] - INLET[1], NZ.p[2] - INLET[2]) < 0.9) { NZ.dock = true; say('Hortum depoya takıldı! Vanayı aç'); }
}
function unseat(q) { const s = SEAT[q.seat]; q.seat = 0; place(q, s[0], 2.1, 0.5); }
function hitPlayer(a, q, fx, fz) {
  if (q.seat) { const was = q.seat; unseat(q); q.stun = 0.9; if (was === 1) { if (NZ.holder === a.id) dropNozzle(); a.seat = 1; a.pin = [null, null]; say(a.name + ' direksiyona geçti!'); } return; }
  q.Q[6] -= fx * 0.22; q.Q[8] -= fz * 0.22; q.Q[7] -= 0.05; q.Q[3] -= fx * 0.1; q.Q[5] -= fz * 0.1; q.stun = 0.7; q.pin = [null, null]; if (NZ.holder === q.id) dropNozzle();
}
function stepPlayer(pl, dt) {
  const P = pl.P, Q = pl.Q, I = pl.inp;
  if (I.c !== undefined && I.c !== pl.lc) { pl.lc = I.c; if (T.state === 'run' && TKS.st === 0) { TKS.st = 1; TKS.z = -50; TKS.x = 2.9; TKS.valve = 0; say(pl.name + ' tankeri çağırdı ☎'); } }
  if (pl.dead > 0) { pl.dead -= dt; if (pl.dead <= 0) place(pl, rnd(-0.8, 0.8), 4, rnd(-4.5, -1.5)); return; }
  if (I.s !== undefined && I.s !== pl.ls) {
    pl.ls = I.s;
    if (pl.seat) unseat(pl);
    else for (const s of [1, 2]) if (![...players.values()].some((q) => q.seat === s) && Math.hypot(P[0] - SEAT[s][0], P[2] - SEAT[s][2]) < 1.4 && P[1] > 1.5) { pl.seat = s; pl.pin = [null, null]; if (NZ.holder === pl.id) dropNozzle(); break; }
  }
  if (pl.seat) { poseSeat(pl); return; }
  const st = pl.stun > 0; pl.stun -= dt; pl.gndT -= dt; pl.jumpT -= dt; pl.punchCd -= dt; pl.punchT -= dt;
  const mx = st ? 0 : I.mx || 0, mz = st ? 0 : I.mz || 0, ml = Math.min(1, Math.hypot(mx, mz));
  if (ml > 0.1) { let d = Math.atan2(mx, mz) - pl.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); pl.yaw += d * 0.25; }
  const fx = Math.sin(pl.yaw), fz = Math.cos(pl.yaw), lx = fz, lz = -fx;
  if (!I.g || st) { pl.pin[0] = pl.pin[1] = null; if (NZ.holder === pl.id) dropNozzle(); }
  const pinned = pl.pin[0] || pl.pin[1], gnd = pl.gndT > 0, stand = gnd && !st && pl.jumpT <= 0;
  for (let i = 0; i < 21; i += 3) {
    const vx = (P[i] - Q[i]) * 0.99, vy = (P[i + 1] - Q[i + 1]) * 0.995, vz = (P[i + 2] - Q[i + 2]) * 0.99;
    Q[i] = P[i]; Q[i + 1] = P[i + 1]; Q[i + 2] = P[i + 2];
    P[i] += vx + T.pax * dt * dt; P[i + 1] += vy - 22 * dt * dt; P[i + 2] += vz + T.paz * dt * dt;
  }
  const g = stand ? 0.25 : pinned ? 0.04 : 0.02, tv = 4.3 * dt;
  for (const i of [0, 3]) { P[i] += (mx * tv - (P[i] - Q[i])) * g; P[i + 2] += (mz * tv - (P[i + 2] - Q[i + 2])) * g; }
  if (stand) {
    { const c = ((P[16] + P[19]) / 2 + 0.5 - P[1]) * 0.3; P[1] += c; Q[1] += c * 0.65; } // Q'ya da uygula: yay enerji pompalamasın (inişte zıplatıyordu)
    P[3] += (P[0] + mx * 0.1 - P[3]) * 0.15; { const c = (P[1] + 0.4 - P[4]) * 0.3; P[4] += c; Q[4] += c * 0.65; } P[5] += (P[2] + mz * 0.1 - P[5]) * 0.15;
    P[6] += (P[3] - P[6]) * 0.12; { const c = (P[4] + 0.36 - P[7]) * 0.3; P[7] += c; Q[7] += c * 0.65; } P[8] += (P[5] - P[8]) * 0.12;
    pl.phase += ml * dt * 10;
    for (let s = 0; s < 2; s++) {
      const i = 15 + s * 3, sd = s ? -1 : 1, ph = pl.phase + s * Math.PI, sw = Math.sin(ph) * 0.28 * ml;
      P[i] += (P[0] + lx * sd * 0.17 + fx * sw - P[i]) * 0.35; P[i + 2] += (P[2] + lz * sd * 0.17 + fz * sw - P[i + 2]) * 0.35;
      if (ml > 0.1 && Math.cos(ph) > 0) P[i + 1] += 0.02;
    }
    if (I.j && !pl.lj) { for (let i = 1; i < 21; i += 3) Q[i] = P[i] - 6.6 * dt; pl.jumpT = 0.3; pl.gndT = 0; }
  }
  pl.lj = !!I.j;
  if (I.p !== undefined && I.p !== pl.lp) { pl.lp = I.p; if (pl.punchCd <= 0 && !st) { pl.punchT = 0.16; pl.punchCd = 0.4; pl.punchH ^= 1; pl.hitDone = false; } }
  const climb = pinned && I.j; pl.arm += ((climb ? 0.2 : 0.7) - pl.arm) * 0.12;
  for (let h = 0; h < 2; h++) {
    if (pl.pin[h]) continue; const i = 9 + h * 3, sd = h ? -1 : 1; let tx, ty, tz, k;
    if (pl.punchT > 0 && h === pl.punchH) { tx = P[3] + fx * 0.95; ty = P[4] + 0.05; tz = P[5] + fz * 0.95; k = 0.6; }
    else if (I.g && !st) { const up = gnd ? -0.6 : 0.5; tx = P[3] + fx * 0.5 + lx * sd * 0.2; ty = P[4] + up; tz = P[5] + fz * 0.5 + lz * sd * 0.2; k = 0.3; }
    else { tx = P[3] + lx * sd * 0.36; ty = P[4] - 0.42; tz = P[5] + lz * sd * 0.36; k = 0.1; }
    P[i] += (tx - P[i]) * k; P[i + 1] += (ty - P[i + 1]) * k; P[i + 2] += (tz - P[i + 2]) * k;
  }
  if (climb) { const h = pl.pin[0] ? 9 : 12; P[4] += (P[h + 1] + 0.45 - P[4]) * 0.07; }
  let fg = false;
  for (let it = 0; it < 4; it++) {
    stick(P, 0, 1, 0.4, 0.5, 0); stick(P, 1, 2, 0.36, 0.3, 0);
    for (let h = 0; h < 2; h++) {
      const pin = pl.pin[h], j = 3 + h, ji = j * 3;
      if (!pin) { stick(P, 1, j, 0.7, 0.15, 1); continue; }
      if (pin.b) { P[ji] = pin.b.o[0] + pin.p[0]; P[ji + 1] = pin.b.o[1] + pin.p[1]; P[ji + 2] = pin.b.o[2] + pin.p[2]; stick(P, 1, j, pl.arm, 1, 1); }
      else {
        const qP = pin.q.P, qi = pin.k * 3, dx = qP[qi] - P[3], dy = qP[qi + 1] - P[4], dz = qP[qi + 2] - P[5], d = Math.hypot(dx, dy, dz) || 1e-6;
        if (d > pl.arm) { const k = ((d - pl.arm) / d) * 0.5; P[3] += dx * k; P[4] += dy * k; P[5] += dz * k; qP[qi] -= dx * k; qP[qi + 1] -= dy * k; qP[qi + 2] -= dz * k; }
        P[ji] = qP[qi]; P[ji + 1] = qP[qi + 1]; P[ji + 2] = qP[qi + 2];
      }
      Q[ji] = P[ji]; Q[ji + 1] = P[ji + 1]; Q[ji + 2] = P[ji + 2];
    }
    stick(P, 0, 5, 0.52, 0.3, 1); stick(P, 0, 6, 0.52, 0.3, 1);
    for (let k = 0; k < 7; k++) {
      const i = k * 3, isHand = k === 3 || k === 4;
      if (isHand && pl.pin[k - 3]) continue;
      const ox = P[i], oy = P[i + 1], oz = P[i + 2], b = collide(P, i, R[k]);
      if (b) {
        // derin iç içe geçmede itme hıza dönüşmesin (tanker kenarına inince fırlatıyordu)
        const ex = P[i] - ox, ey = P[i + 1] - oy, ez = P[i + 2] - oz, el = Math.hypot(ex, ey, ez);
        if (el > 0.04) { const f = 1 - 0.04 / el; Q[i] += ex * f; Q[i + 1] += ey * f; Q[i + 2] += ez * f; }
        if (N[1] > 0.5) { if (k >= 5 || k === 0) fg = true; Q[i] += (P[i] - Q[i]) * 0.12; Q[i + 2] += (P[i + 2] - Q[i + 2]) * 0.12; }
        if (it === 3 && isHand && I.g && !st && pl.punchT <= 0 && NZ.holder !== pl.id) pl.pin[k - 3] = { b, p: [P[i] - b.o[0], P[i + 1] - b.o[1], P[i + 2] - b.o[2]] };
      }
      if (P[i + 1] < R[k]) { P[i + 1] = R[k]; P[i + 2] -= T.v * dt * 0.15; Q[i] += (P[i] - Q[i]) * 0.1; }
    }
  }
  if (fg) pl.gndT = 0.12;
  if (I.g && !st && pl.punchT <= 0) for (let h = 0; h < 2; h++) {
    if (pl.pin[h]) continue; const i = 9 + h * 3;
    if (NZ.holder == null && TKS.st === 2 && d3(P, i, NZ.p, 0) < 0.55) { NZ.holder = pl.id; NZ.hand = h; NZ.dock = false; continue; }
    if (NZ.holder === pl.id) continue;
    for (const q of players.values()) { if (q === pl || q.seat || q.dead > 0) continue; for (const k of [1, 0, 2]) if (d3(P, i, q.P, k * 3) < R[k] + 0.2) { pl.pin[h] = { q, k }; break; } if (pl.pin[h]) break; }
  }
  for (let h = 0; h < 2; h++) { const pin = pl.pin[h]; if (pin && (d3(P, 3, P, 9 + h * 3) > 1.35 || (pin.b && !pin.b.on) || (pin.q && (pin.q.seat || pin.q.dead > 0)))) pl.pin[h] = null; }
  if (pl.punchT > 0 && !pl.hitDone) { const i = 9 + pl.punchH * 3; for (const q of players.values()) if (q !== pl && q.dead <= 0 && d3(P, i, q.P, 6) < 0.48) { pl.hitDone = true; hitPlayer(pl, q, fx, fz); break; } }
  if (I.u && !st) {
    if (pinned && !gnd) for (let w = 0; w < 4; w++) if (T.flat[w] && Math.hypot(P[3] - WHEEL[w][0], P[4] - WHEEL[w][1], P[5] - WHEEL[w][2]) < 1.9) { T.rep[w] += dt / 4; if (T.rep[w] >= 1) { T.flat[w] = 0; T.rep[w] = 0; say(pl.name + ' lastiği tamir etti 🔧'); } }
    if (TKS.st === 2 && Math.hypot(P[3] - TKS.x, P[4] - 2.3, P[5] - (TKS.z - 2)) < 1.4) { TKS.vp += dt / 1.2; if (TKS.vp >= 1) { TKS.vp = 0; TKS.valve = 25; say('Vana açıldı ⛽'); } }
  }
  pl.offT = P[1] < 0.7 ? pl.offT + dt : 0;
  if (pl.offT > 2.5 || P[2] < -16 || P[2] > 14 || Math.abs(P[0]) > 12) { pl.dead = 2; pl.pin = [null, null]; if (NZ.holder === pl.id) dropNozzle(); if (T.state === 'run') say(pl.name + ' kamyondan düştü!'); }
}
function stepTanker(dt) {
  const S = TKS;
  if (S.st === 1) { S.z += dt * 7; if (S.z >= 0) { S.z = 0; S.st = 2; S.t = 0; say('Tanker solunda! Hortumu al, vanayı aç'); } }
  else if (S.st === 2) { S.t += dt; S.z = Math.sin(S.t * 0.5) * 0.8; S.x = 2.9 + Math.sin(S.t * 0.8) * 0.12; S.valve -= dt; if (NZ.dock && S.valve > 0) T.fuel = Math.min(100, T.fuel + 14 * dt); if (T.fuel >= 100 || S.t > 75) { S.st = 3; NZ.dock = false; NZ.holder = null; say('Tanker ayrılıyor'); } }
  else if (S.st === 3) { S.z -= dt * 6; if (S.z < -50) S.st = 0; }
  TK.on = S.st > 0; TK.o[0] = S.x; TK.o[2] = S.z;
  const h = NZ.holder && players.get(NZ.holder);
  if (NZ.holder) {
    if (!h || h.dead > 0 || h.seat || S.st !== 2) NZ.holder = null;
    else { const i = 9 + NZ.hand * 3; NZ.p = [h.P[i], h.P[i + 1], h.P[i + 2]]; if (Math.hypot(NZ.p[0] - S.x, NZ.p[1] - 2, NZ.p[2] - (S.z + 1)) > 7.5) { NZ.holder = null; say('Hortum elinden kurtuldu!'); } }
  }
  if (!NZ.holder) NZ.p = NZ.dock ? INLET.slice() : [S.x - 0.9, 2.2, S.z + 1];
}
function stepTruck(dt) {
  const y = [...players.values()].find((p) => p.seat === 2), yi = y ? y.inp : null; // yolcunun şoföre işareti: 1 sol, 2 sağ, 3 yavaş
  T.sig = yi ? yi.sg || ((yi.mx || 0) > 0.5 ? 1 : (yi.mx || 0) < -0.5 ? 2 : (yi.mz || 0) < -0.5 ? 3 : 0) : 0;
  if (T.state === 'lobby') { T.v = 0; T.pax = T.paz = 0; return; }
  T.t += dt; T.msgT -= dt;
  const d = [...players.values()].find((p) => p.seat === 1), run = T.state === 'run';
  const si = d ? clamp(d.inp.mx || 0, -1, 1) : 0; let gas = d && run ? Math.max(0, d.inp.mz || 0) : 0; const br = d ? Math.max(0, -(d.inp.mz || 0)) : run ? 0 : 1;
  T.steer += (si - T.steer) * Math.min(1, dt * 3.5);
  let bias = 0, vmax = 20; for (let w = 0; w < 4; w++) if (T.flat[w]) { vmax -= 6; bias += Math.sign(WHEEL[w][0]) * 0.2 + Math.sin(T.t * 7) * 0.05; }
  if (T.fuel <= 0) gas = 0; T.gas = gas; T.br = br;
  const off = Math.abs(T.X - cx(T.Z)) > 7;
  let a = gas * 3.2 - br * 7 - 0.5 - T.v * 0.02 - (off ? 5 : 0) - (T.v > vmax ? 4 : 0); if (!run) a = -6;
  const ov = T.v; T.v = Math.max(0, T.v + a * dt); if (run && T.t < 6) T.v = Math.max(T.v, 7);
  const om = (T.steer + bias) * T.v * 0.05 * (12 / (12 + T.v)); // hız arttıkça direksiyon yumuşar
  const oz = T.Z; T.th += om * dt; T.X += Math.sin(T.th) * T.v * dt; T.Z += Math.cos(T.th) * T.v * dt;
  T.pax = -T.v * om * 0.55 + (off ? Math.sin(T.t * 23) * 3 : 0); T.paz = -((T.v - ov) / dt) * 0.6;
  if (!run) return;
  T.fuel = Math.max(0, T.fuel - dt * (0.45 + gas * 0.75));
  for (const o of OBS) if (!o.hit && o.z - T.Z > -6 && o.z - T.Z < 5.6 && Math.abs(o.x - T.X) < 2.5) { o.hit = true; T.v *= 0.4; say('GÜM! Engele çarptınız'); for (const p of players.values()) if (!p.seat) for (let i = 2; i < 21; i += 3) p.Q[i] -= 0.1; }
  for (const b of BUMP) if (oz < b && T.Z >= b && Math.abs(T.X - cx(b)) < 7) {
    for (const p of players.values()) if (!p.seat) for (let i = 1; i < 21; i += 3) p.Q[i] -= T.v > BUMP_V ? 0.14 : 0.05;
    if (T.v > BUMP_V) { const c = [0, 1, 2, 3].filter((w) => !T.flat[w]); if (c.length) { const w = c.includes(0) || c.includes(1) ? c.filter((w) => w < 2)[(Math.random() * c.filter((w) => w < 2).length) | 0] : c[0]; T.flat[w] = 1; say('PAT! Tümseğe hızlı girdiniz: ' + WHEEL[w][3] + ' lastik patladı'); } }
    else say('Tümsek yavaş geçildi 👍');
  }
  T.nextFlat -= dt; if (T.nextFlat <= 0) { const c = [0, 1, 2, 3].filter((w) => !T.flat[w]); if (c.length > 2) { const w = c[(Math.random() * c.length) | 0]; T.flat[w] = 1; say('PAT! Lastik patladı: ' + WHEEL[w][3]); } T.nextFlat = rnd(35, 60); }
  if (T.Z >= LEN) { T.state = 'win'; T.why = 'Hedefe ulaştınız! 🏁'; }
  else if (T.t > 6 && T.v < 0.4) { T.state = 'over'; T.why = T.fuel <= 0 ? 'Yakıt bitti, kamyon durdu!' : 'Kamyon durdu!'; }
}
function startGame() { resetGame(); T.state = 'run'; T.v = 8; say('Yola çıktınız! Kamyon durmasın'); }
function resetGame() {
  Object.assign(T, { X: 0, Z: 0, th: 0, v: 0, steer: 0, fuel: 100, flat: [0, 0, 0, 0], rep: [0, 0, 0, 0], state: 'lobby', t: 0, nextFlat: rnd(25, 40), msg: '', msgT: 0, why: '', sig: 0 });
  Object.assign(TKS, { st: 0, z: -50, valve: 0, vp: 0 }); NZ.holder = null; NZ.dock = false; for (const o of OBS) o.hit = false;
}
function simStep(dt) {
  stepTruck(dt); stepTanker(dt);
  const L = [...players.values()]; for (const p of L) stepPlayer(p, dt);
  for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) { const p = L[a], q = L[b]; if (p.seat || q.seat || p.dead > 0 || q.dead > 0) continue; for (const k of [0, 1]) { const i = k * 3, dx = q.P[i] - p.P[i], dy = q.P[i + 1] - p.P[i + 1], dz = q.P[i + 2] - p.P[i + 2], d = Math.hypot(dx, dy, dz) || 1e-6; if (d < 0.56) { const s = ((0.56 - d) / d) * 0.5; p.P[i] -= dx * s; p.P[i + 2] -= dz * s; q.P[i] += dx * s; q.P[i + 2] += dz * s; } } }
}
const r2 = (v) => Math.round(v * 100) / 100;
const snap = () => ({ t: 's', T: { X: T.X, Z: T.Z, th: T.th, v: T.v, st: T.steer, f: T.fuel, fl: T.flat, rp: T.rep, s: T.state, m: T.msgT > 0 ? T.msg : '', g: T.gas, b: T.br, why: T.why, sg: T.sig, oh: OBS.map((o, i) => (o.hit ? i : -1)).filter((i) => i >= 0) }, k: [TKS.st, TKS.x, TKS.z, TKS.valve > 0 ? 1 : 0, TKS.vp], n: [NZ.p[0], NZ.p[1], NZ.p[2], NZ.dock ? 1 : 0], p: [...players.values()].map((p) => ({ id: p.id, n: p.name, c: p.ci, s: p.seat, y: r2(p.yaw), d: p.dead > 0 ? 1 : 0, P: Array.from(p.P, r2) })) });

// ---------- görüntü ----------
const ren = new THREE.WebGLRenderer({ antialias: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio)); document.body.appendChild(ren.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9fd4ff); scene.fog = new THREE.Fog(0x9fd4ff, 70, 230);
const cam = new THREE.PerspectiveCamera(62, 1, 0.05, 400);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b7a5a, 1.5)); const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(5, 12, -4); scene.add(sun);
const M = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...o }), UP = new THREE.Vector3(0, 1, 0), v1 = new THREE.Vector3(), v2 = new THREE.Vector3();
const BG = new THREE.BoxGeometry(1, 1, 1), SG = new THREE.SphereGeometry(1, 16, 12), CG = new THREE.CylinderGeometry(1, 1, 1, 10);
const boxMesh = (b, par) => { const m = new THREE.Mesh(BG, M(b.c)); m.scale.set(b.b[0] - b.a[0], b.b[1] - b.a[1], b.b[2] - b.a[2]); m.position.set((b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2, (b.a[2] + b.b[2]) / 2); par.add(m); return m; };
const add = (par, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
const truck = new THREE.Group(); scene.add(truck);
for (const b of BOX) if (b !== TK) boxMesh(b, truck);
const wheels = WHEEL.map((w) => { const m = add(truck, CG, M(0x222222), w[0], w[1], w[2], 0.55, 0.4, 0.55); m.rotation.z = Math.PI / 2; return m; });
add(truck, BG, M(0x30415d), 0.7, 1.95, 1.45, 0.8, 0.9, 0.12); add(truck, BG, M(0x30415d), -0.7, 2.3, 1.45, 0.8, 1.0, 0.12);
add(truck, CG, M(0xffd23f), INLET[0], 1.65, INLET[2], 0.09, 0.7, 0.09); add(truck, CG, M(0x222222), INLET[0], 2.0, INLET[2], 0.16, 0.08, 0.16);
const swheel = new THREE.Group(); swheel.position.set(0.7, 2.05, 2.85); swheel.rotation.x = -0.5; truck.add(swheel);
add(swheel, new THREE.TorusGeometry(0.3, 0.045, 8, 24), M(0x111111), 0, 0, 0); add(swheel, BG, M(0x111111), 0, 0, 0, 0.6, 0.06, 0.04); add(swheel, BG, M(0xd8432f), 0, 0.15, 0, 0.06, 0.3, 0.04);
const pedG = add(truck, BG, M(0x7bd389), 0.5, 1.5, 3.1, 0.16, 0.3, 0.06), pedB = add(truck, BG, M(0xff5a5f), 0.85, 1.5, 3.1, 0.2, 0.3, 0.06);
const gauge = add(truck, CG, M(0xf5f0e8), 0.7, 2.45, 3.18, 0.16, 0.02, 0.16); gauge.rotation.x = Math.PI / 2;
const needle = add(truck, BG, M(0xd8432f), 0.7, 2.45, 3.16, 0.02, 0.14, 0.02);
const tanker = new THREE.Group(); scene.add(tanker);
boxMesh({ a: [-1.2, 0.5, -3.5], b: [1.2, 2.0, 3.5], c: 0xe9e9e9 }, tanker); boxMesh({ a: [-1.2, 0.5, 3.5], b: [1.2, 2.6, 5.2], c: 0x2e6da4 }, tanker);
for (const z of [-2.5, 2.5, 4.4]) for (const x of [-1.25, 1.25]) add(tanker, CG, M(0x222222), x, 0.55, z, 0.55, 0.35, 0.55).rotation.z = Math.PI / 2;
const valve = add(tanker, new THREE.TorusGeometry(0.22, 0.05, 8, 16), M(0xd8432f), 0, 2.3, -2); valve.rotation.x = Math.PI / 2; add(tanker, CG, M(0x555555), 0, 2.15, -2, 0.05, 0.3, 0.05);
const nozzle = add(scene, CG, M(0xffd23f), 0, -5, 0, 0.08, 0.35, 0.08); let hose = null; const hoseMat = M(0x222222);
const pivot = new THREE.Group(), world = new THREE.Group(); pivot.add(world); scene.add(pivot);
add(world, new THREE.PlaneGeometry(900, LEN + 900), M(0x6fae5c), 0, -0.03, LEN / 2).rotation.x = -Math.PI / 2;
{ const pos = [], idx = []; let n = 0; for (let z = -80; z <= LEN + 120; z += 4, n++) { const c = cx(z); pos.push(c + 6.5, 0, z, c - 6.5, 0, z); if (n) { const a = n * 2; idx.push(a - 2, a, a - 1, a - 1, a, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); world.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x4a4d55, side: THREE.DoubleSide }))); }
{ const cnt = Math.floor((LEN + 200) / 9), im = new THREE.InstancedMesh(BG, new THREE.MeshBasicMaterial({ color: 0xffffff }), cnt), o = new THREE.Object3D(); for (let i = 0; i < cnt; i++) { const z = -80 + i * 9; o.position.set(cx(z), 0.02, z); o.scale.set(0.25, 0.02, 3.5); o.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } world.add(im);
  const tr = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 7, 7), M(0x2d8a5e), 420); for (let i = 0; i < 420; i++) { const z = srnd() * (LEN + 200) - 60, sd = srnd() < 0.5 ? -1 : 1; o.position.set(cx(z) + sd * (11 + srnd() * 70), 3.5, z); const s = 0.7 + srnd() * 0.9; o.scale.set(s, s, s); o.rotation.y = 0; o.updateMatrix(); tr.setMatrixAt(i, o.matrix); } world.add(tr); }
const obsMesh = OBS.map((o) => { const g = new THREE.Group(); g.position.set(o.x, 0, o.z); add(g, BG, M(0xff5a5f), 0, 0.6, 0, 3, 1.2, 0.5); add(g, BG, M(0xffffff), 0, 0.6, 0.02, 1, 1.2, 0.5); world.add(g); return g; });
{ const c = cx(LEN); add(world, BG, M(0x222222), c + 7, 4, LEN, 0.5, 8, 0.5); add(world, BG, M(0x222222), c - 7, 4, LEN, 0.5, 8, 0.5); add(world, BG, M(0xffe14d), c, 7.5, LEN, 14.5, 1.4, 0.4); }
for (const z of BUMP) { const g = new THREE.Group(); g.position.set(cx(z), 0, z); g.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); for (let k = -3; k <= 3; k++) add(g, BG, M(k % 2 ? 0x222222 : 0xffd23f), k * 1.9, 0.08, 0, 1.9, 0.16, 0.9); world.add(g);
  const zs = z - 35, xs = cx(zs) - 7.6; add(world, BG, M(0x888888), xs, 1.2, zs, 0.12, 2.4, 0.12); const lv = add(world, BG, M(0xffd23f), xs, 2.7, zs, 1.1, 1.1, 0.08); lv.rotation.z = Math.PI / 4; }
const pm = new Map();
function playerMesh(ci) {
  const g = new THREE.Group(), m = M(COL[ci]), d = M(new THREE.Color(COL[ci]).multiplyScalar(0.75)), o = { g, s: [], l: [], e: [] };
  [0.27, 0.32, 0.27, 0.14, 0.14, 0.16, 0.16].forEach((r, k) => o.s.push(add(g, SG, k >= 3 ? d : m, 0, 0, 0, r)));
  for (let i = 0; i < 5; i++) o.l.push(add(g, CG, i === 4 ? m : d, 0, 0, 0, 1)); for (let i = 0; i < 2; i++) o.e.push(add(g, SG, M(0x111111), 0, 0, 0, 0.05));
  scene.add(g); return o;
}
function limb(m, P, a, b, r) { v1.set(P[a], P[a + 1], P[a + 2]); v2.set(P[b], P[b + 1], P[b + 2]); const L = v1.distanceTo(v2) || 0.01; m.position.copy(v1).add(v2).multiplyScalar(0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, v2.sub(v1).divideScalar(L)); }
const RP = {}, cT = { X: 0, Z: 0, th: 0 }; let V = null, camMode = -1, hudT = 0, lastHud = '';
function draw(V, dt) {
  const t = V.T;
  if (isHost) { cT.X = t.X; cT.Z = t.Z; cT.th = t.th; } else { cT.th += (t.th - cT.th) * 0.25; cT.X += Math.sin(cT.th) * t.v * dt; cT.Z += Math.cos(cT.th) * t.v * dt; cT.X += (t.X - cT.X) * 0.15; cT.Z += (t.Z - cT.Z) * 0.15; if (Math.abs(t.Z - cT.Z) > 30) { cT.X = t.X; cT.Z = t.Z; } }
  pivot.rotation.y = -cT.th; world.position.set(-cT.X, 0, -cT.Z);
  wheels.forEach((w, i) => { w.rotation.x += t.v * dt / 0.55; w.scale.x = w.scale.z = t.fl[i] ? 0.42 : 0.55; w.position.y = t.fl[i] ? 0.42 : 0.55; w.material.color.setHex(t.fl[i] ? 0x8a2a1e : 0x222222); });
  swheel.rotation.z = t.st * 2.2; pedG.position.z = 3.1 + t.g * 0.06; pedB.position.z = 3.1 + t.b * 0.06; needle.rotation.z = (t.f / 100 - 0.5) * -2.4;
  obsMesh.forEach((m, i) => (m.visible = !t.oh.includes(i)));
  const [ks, kx, kz, kv] = V.k; tanker.visible = ks > 0; tanker.position.set(kx, 0, kz); valve.rotation.z += kv ? dt * 4 : 0;
  nozzle.visible = ks > 0; nozzle.position.set(V.n[0], V.n[1], V.n[2]);
  if (hose) { scene.remove(hose); hose.geometry.dispose(); hose = null; }
  if (ks > 0) { const a = new THREE.Vector3(kx, 2, kz + 1), b = nozzle.position, pts = []; const sag = Math.max(0.1, (7.5 - a.distanceTo(b)) * 0.18); for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push(a.clone().lerp(b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * sag, 0))); } hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.06, 6), hoseMat); scene.add(hose); }
  const me = V.p.find((p) => p.id === myId), seen = new Set();
  for (const p of V.p) {
    seen.add(p.id); let o = pm.get(p.id); if (!o) { o = playerMesh(p.c); pm.set(p.id, o); RP[p.id] = Float32Array.from(p.P); }
    const P = RP[p.id]; for (let i = 0; i < 21; i++) P[i] = isHost || p.s || Math.abs(p.P[i] - P[i]) > 3 ? p.P[i] : P[i] + (p.P[i] - P[i]) * 0.4;
    o.g.visible = !p.d && !(p === me && p.s && camMode < 0);
    o.s.forEach((m, k) => m.position.set(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]));
    limb(o.l[0], P, 3, 9, 0.09); limb(o.l[1], P, 3, 12, 0.09); limb(o.l[2], P, 0, 15, 0.11); limb(o.l[3], P, 0, 18, 0.11); limb(o.l[4], P, 0, 3, 0.27);
    const fx = Math.sin(p.y), fz = Math.cos(p.y); o.e.forEach((m, k) => m.position.set(P[6] + fx * 0.24 + fz * (k ? -0.09 : 0.09), P[7] + 0.05, P[8] + fz * 0.24 - fx * (k ? -0.09 : 0.09)));
  }
  for (const [id, o] of pm) if (!seen.has(id)) { scene.remove(o.g); pm.delete(id); delete RP[id]; }
  const seat = camMode >= 0 ? camMode : me ? me.s : 0;
  if (seat === 1) { cam.position.set(0.7, 2.3, 1.85); cam.lookAt(0.7, 1.85, 3.2); }
  else if (seat === 2) { cam.position.set(-0.7, 3.0, 2.0); cam.lookAt(-0.4, 2.3, 30); }
  else { cam.position.set(0, 9.5, -10.5); cam.lookAt(0, 1.5, -1); }
  ren.render(scene, cam);
  if ((hudT -= dt) > 0) return; hudT = 0.1;
  const dk = $('dok'); if (dk.dataset.r !== String(seat)) { dk.dataset.r = seat; joy.x = joy.y = 0; for (const k in tb) tb[k] = 0; }
  { const nb = BUMP.find((z) => z > t.Z - 1), d = nb === undefined ? 1e9 : nb - t.Z, el = $('tumsek'), on = t.s === 'run' && seat !== 1 && d < 110;
    el.style.display = on ? 'block' : 'none'; if (on) { const hz = t.v > BUMP_V; el.className = hz ? 'hizli' : ''; el.textContent = '⚠ TÜMSEK ' + Math.max(0, Math.round(d)) + ' m' + (hz ? ' — YAVAŞLA! (' + Math.round(BUMP_V * 3.6) + ' km/s altı)' : ' — hız uygun'); } }
  { const el = $('isaret'), sg = t.s === 'run' ? t.sg : 0; el.style.display = sg ? 'block' : 'none'; el.className = seat === 1 ? 'sofor' : ''; el.textContent = ['', '⬅ SOLA', 'SAĞA ➡', '🐢 YAVAŞ'][sg || 0]; }
  const rol = seat === 1 ? '<b>🚚 ŞOFÖRSÜN</b><br>Önünü göremezsin, yolcuyu dinle!<br>A/D direksiyon · W gaz · S fren · E kalk' : seat === 2 ? '<b>👀 YOLCUSUN</b><br>Yolu yalnız sen görüyorsun: şoföre tarif et!<br>A/D sola/sağa işareti · S yavaşla · E kalk · T tanker çağır' : '<b>📦 KASADASIN</b><br>WASD yürü · Boşluk zıpla / tutunurken tırman<br>J veya sol tık TUT · K veya sağ tık ŞAPLAK<br>E koltuğa otur · F tamir / vana · T tanker çağır';
  let af = '';
  if (t.s === 'lobby') af += `<div>Oda kodu: <span class="uyari">${odaKodu}</span> · ${V.p.length}/4 oyuncu</div><div style="font-size:18px">${isHost ? 'Herkes hazırsa ENTER (ya da ekrana çift dokun) ile başlat' : 'Oda sahibinin başlatması bekleniyor'}</div><div style="font-size:16px">Şoför koltuğu solda, yolcu sağda. Dolu şoför koltuğunu almak için şoförün kafasına şaplak at!</div>`;
  if (t.s === 'over' || t.s === 'win') af += `<div class="buyuk">${t.s === 'win' ? '🏁 BAŞARDINIZ!' : '💥 OYUN BİTTİ'}</div><div>${t.why}</div><div style="font-size:18px">${isHost ? 'ENTER: yeniden' : ''}</div>`;
  if (t.m) af += `<div>${t.m}</div>`;
  if (t.s === 'run') { if (t.f < 25) af += `<div class="uyari">⛽ YAKIT AZ! ${ks ? '' : 'T ile tankeri ara'}</div>`; t.fl.forEach((f, i) => { if (f) af += `<div class="uyari">🛞 ${WHEEL[i][3]} lastik patlak${t.rp[i] > 0 ? ' — tamir %' + Math.round(t.rp[i] * 100) : ' (tutunup in, F ile tamir et)'}</div>`; }); if (ks === 2) af += `<div style="font-size:18px">${V.n[3] ? (kv ? 'Yakıt doluyor…' : 'Hortum takılı: tankerin üstündeki vanayı F ile aç') : 'Tankerden sarı hortum ucunu TUT, sol öndeki depo ağzına bırak'}${V.k[4] > 0 ? ' · vana %' + Math.round(V.k[4] * 100) : ''}</div>`; }
  const h = rol + af + Math.round(t.f) + Math.round(t.Z / 10) + Math.round(t.v);
  if (h !== lastHud) { lastHud = h; $('rol').innerHTML = (TOUCH ? rol.split('<br>').slice(0, 2).join('<br>') : rol) + (micOk ? '<br>🎙 M: mikrofon aç/kapa' : '<br>🔇 mikrofon yok'); $('afis').innerHTML = af; $('yakit').firstChild.style.width = t.f + '%'; $('yakit').firstChild.style.background = t.f < 25 ? '#ff5a5f' : '#7bd389'; $('bilgi').textContent = `Kalan ${Math.max(0, Math.round(LEN - t.Z))} m · ${Math.round(t.v * 3.6)} km/s`; $('oda').textContent = 'Oda ' + odaKodu; }
}
const fit = () => { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = innerWidth < innerHeight ? 80 : 62; cam.updateProjectionMatrix(); }; addEventListener('resize', fit); fit();

// ---------- girdi ----------
const TOUCH = matchMedia('(pointer:coarse)').matches;
const key = {}, cnt = { p: 0, s: 0, c: 0 }, tb = {}, joy = { x: 0, y: 0 }; let mouseL = false;
addEventListener('keydown', (e) => { if (e.repeat || $('menu').style.display !== 'none') return; key[e.code] = 1; if (e.code === 'KeyK') cnt.p++; if (e.code === 'KeyE') cnt.s++; if (e.code === 'KeyT') cnt.c++; if (e.code === 'Enter') hostStart(); if (e.code === 'KeyM' && mic) { const tr = mic.getAudioTracks()[0]; if (tr) tr.enabled = !tr.enabled; } if (DBG && e.code === 'KeyC') camMode = camMode >= 2 ? -1 : camMode + 1; if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', (e) => (key[e.code] = 0));
ren.domElement.addEventListener('mousedown', (e) => { if (e.button === 0) mouseL = true; else cnt.p++; }); addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; }); addEventListener('contextmenu', (e) => e.preventDefault());
ren.domElement.addEventListener('dblclick', () => matchMedia('(pointer:coarse)').matches && hostStart());
{ const j = $('joy'), nub = j.firstElementChild, mv = (e) => { e.preventDefault(); const r = j.getBoundingClientRect(), t = e.targetTouches[0]; if (!t) { joy.x = joy.y = 0; nub.style.transform = ''; return; } const h = r.width / 2; let x = (t.clientX - r.left - h) / (h * 0.8), y = (t.clientY - r.top - h) / (h * 0.8); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joy.x = x; joy.y = -y; nub.style.transform = `translate(${x * 75}%,${y * 75}%)`; };
  const d = $('dir'), wh = d.lastElementChild, dv = (e) => { e.preventDefault(); const r = d.getBoundingClientRect(), t = e.targetTouches[0]; const x = t ? clamp((t.clientX - r.left - r.width / 2) / (r.width * 0.4), -1, 1) : 0; joy.x = x; joy.y = 0; wh.style.transform = `rotate(${x * 110}deg)`; };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) { j.addEventListener(ev, mv, { passive: false }); d.addEventListener(ev, dv, { passive: false }); }
  for (const b of $('dok').querySelectorAll('b[data-k]')) { const k = b.dataset.k, up = (e) => { e.preventDefault(); b.classList.remove('bas'); tb[k] = 0; }; b.addEventListener('touchstart', (e) => { e.preventDefault(); b.classList.add('bas'); if (k in cnt) cnt[k]++; else tb[k] = 1; }, { passive: false }); b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false }); } }
const readInput = () => ({ mx: clamp((key.KeyA || key.ArrowLeft ? 1 : 0) - (key.KeyD || key.ArrowRight ? 1 : 0) - joy.x, -1, 1), mz: clamp((key.KeyW || key.ArrowUp ? 1 : 0) - (key.KeyS || key.ArrowDown ? 1 : 0) + joy.y + (tb.ga ? 1 : 0) - (tb.fr ? 1 : 0), -1, 1), sg: tb.sl ? 1 : tb.sr ? 2 : tb.yv ? 3 : 0, j: key.Space || tb.j ? 1 : 0, g: key.KeyJ || mouseL || tb.g ? 1 : 0, u: key.KeyF || tb.u ? 1 : 0, p: cnt.p, s: cnt.s, c: cnt.c });
function hostStart() { if (!isHost) return; if (T.state === 'lobby') startGame(); else if (T.state !== 'run') { resetGame(); for (const p of players.values()) { p.seat = 0; p.dead = 0; place(p, rnd(-0.8, 0.8), 1.95, rnd(-4.5, -1.5)); } } }

// ---------- ağ + ses ----------
let peer, isHost = false, myId = '', hostConn = null, odaKodu = '', mic = null, micOk = false; const conns = {};
async function getMic() { try { if (DBG) throw 0; mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); micOk = true; } catch (e) { const ac = new (window.AudioContext || window.webkitAudioContext)(); mic = ac.createMediaStreamDestination().stream; } }
const playAudio = (id, s) => { let a = document.getElementById('au' + id); if (!a) { a = document.createElement('audio'); a.id = 'au' + id; a.autoplay = true; document.body.appendChild(a); } a.srcObject = s; };
const callPeer = (id) => { const c = peer.call(id, mic); if (c) c.on('stream', (s) => playAudio(id, s)); };
const durum = (m) => ($('durum').textContent = m);
function begin() { $('menu').style.display = 'none'; $('hud').style.display = 'block'; let last = performance.now(), acc = 0, fc = 0;
  const frame = (now) => { requestAnimationFrame(frame); const dt = Math.min(0.1, (now - last) / 1000); last = now; fc++; const I = readInput();
    if (isHost) { const me = players.get(myId); if (me) me.inp = I; acc += dt; while (acc >= 1 / 60) { simStep(1 / 60); acc -= 1 / 60; } V = snap(); if (fc % 3 === 0) for (const id in conns) if (conns[id].open) conns[id].send(V); }
    else if (hostConn && hostConn.open && fc % 2 === 0) hostConn.send({ t: 'i', ...I });
    if (V) draw(V, dt); };
  requestAnimationFrame(frame); }
async function go(kod, host) {
  const name = ($('ad').value.trim() || 'Oyuncu').slice(0, 12); localStorage.setItem('kk-ad', name); if (!mic) { durum('Mikrofon izni isteniyor…'); await getMic(); } durum('Bağlanıyor…');
  if (location.search.includes('tek')) { isHost = true; myId = 'ben'; odaKodu = 'TEK'; mkPlayer(myId, name); $('kod').value = ''; return begin(); } // ağsız tek kişilik deneme
  isHost = host; odaKodu = kod || Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPRSTUVYZ'[(Math.random() * 21) | 0]).join('');
  // ?yerel: ofis ağında 0.peerjs.com engelli; deneme için yerel sunucu (npx peer --port 9000 --path /kk)
  const PO = location.search.includes("yerel") ? { host: "localhost", port: 9000, path: "/kk", secure: false } : {};
  peer = isHost ? new Peer(ODA + odaKodu, PO) : new Peer(PO);
  const zam = setTimeout(() => $('menu').style.display !== 'none' && durum('Bağlanılamadı. Wi-Fi yerine mobil veriyle (ya da tersi) tekrar dene.'), 12000);
  // Aynı kodu yazan herkes aynı odada buluşur: oda yoksa kurulur, varsa katılınır.
  peer.on('error', (e) => { if (e.type === 'peer-unavailable' && !isHost) { clearTimeout(zam); peer.destroy(); go(odaKodu, true); } else if (e.type === 'unavailable-id' && isHost) { clearTimeout(zam); peer.destroy(); go(odaKodu, false); } else durum('Bağlantı hatası: ' + e.type); });
  peer.on('call', (c) => { c.answer(mic); c.on('stream', (s) => playAudio(c.peer, s)); });
  peer.on('open', (id) => { myId = id;
    if (isHost) { mkPlayer(id, name); peer.on('connection', (c) => { c.on('data', (d) => { if (d.t === 'hi') { if (players.size >= 4) return c.send({ t: 'full' }); conns[c.peer] = c; mkPlayer(c.peer, String(d.name).slice(0, 12)); c.send({ t: 'w', peers: [myId, ...Object.keys(conns).filter((i) => i !== c.peer)] }); } else if (d.t === 'i') { const p = players.get(c.peer); if (p) p.inp = d; } }); c.on('close', () => { delete conns[c.peer]; const p = players.get(c.peer); if (p && NZ.holder === p.id) NZ.holder = null; players.delete(c.peer); }); }); begin(); }
    else { hostConn = peer.connect(ODA + odaKodu, { serialization: 'json' }); hostConn.on('open', () => hostConn.send({ t: 'hi', name })); hostConn.on('data', (d) => { if (d.t === 's') V = d; else if (d.t === 'w') { d.peers.forEach(callPeer); begin(); } else if (d.t === 'full') durum('Oda dolu (4 kişi)'); }); hostConn.on('close', () => { $('menu').style.display = 'flex'; durum('Oda sahibi ayrıldı'); }); } });
}
$('ad').value = localStorage.getItem('kk-ad') || ''; $('kur').onclick = () => { const k = $('kod').value.trim().toUpperCase(); go(k.length === 4 ? k : '', true); }; $('katil').onclick = () => { const k = $('kod').value.trim().toUpperCase(); if (k.length === 4) go(k, false); else durum('4 harfli oda kodunu yaz'); };
if (DBG) window.G = { T, TKS, NZ, players, OBS, BUMP, key, cnt, startGame, mkPlayer, place, simStep, WHEEL, INLET, get V() { return V; }, set cam(v) { camMode = v; } };
