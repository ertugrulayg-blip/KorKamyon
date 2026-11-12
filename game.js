// Road Hogs — 2-4 kişilik ortak oyun. Oda sahibi fiziği hesaplar, diğerleri girdi yollar (PeerJS).
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
box(-1.5, 1.5, 0.5, 1.3, -6, 1, 'floor', 0xb9853f); box(-1.5, 1.5, 0.5, 1.3, 1, 3.2, 'floor', 0x8a6a3a);
box(1.4, 1.5, 1.3, 1.8, -6, 1, 'rail', 0x8a8f98); box(-1.5, -1.4, 1.3, 1.8, -6, 1, 'rail', 0x8a8f98); box(-1.5, 1.5, 1.3, 1.8, -6.1, -6, 'rail', 0x8a8f98);
box(1.4, 1.5, 1.3, 2.7, 1, 3.2, 'door', 0xd8432f); box(-1.5, -1.4, 1.3, 2.7, 1, 3.2, 'door', 0xd8432f);
box(-1.5, 1.5, 1.3, 2.7, 3.2, 3.5, 'dash', 0x2b2f38);
box(-1.5, 1.5, 0.5, 2.1, 3.5, 5.3, 'hood', 0xd8432f);
box(0.3, 1.1, 1.3, 1.6, 1.5, 2.3, 'seat', 0x30415d); box(-1.1, -0.3, 1.3, 2.0, 1.5, 2.3, 'seat', 0x30415d);
for (const b of BOX) if (b.a[2] >= 1) b.cab = true; // çekici (kabin): dorseye z=HZ'deki mafsaldan bağlı, dönüşte ona göre açı yapar
const HZ = 1; let cpc = 1, cps = 0, tX = 0, tZ = 0; // cpc/cps: kabin açısının cos/sin'i
const toCab = (x, z) => { tX = x * cpc - (z - HZ) * cps; tZ = HZ + x * cps + (z - HZ) * cpc; }, fromCab = (x, z) => { tX = x * cpc + (z - HZ) * cps; tZ = HZ - x * cps + (z - HZ) * cpc; };
const TK = box(-1.2, 1.2, 0.5, 2.0, -3.5, 3.5, 'tanker', 0xe9e9e9); TK.on = false;
const PK = box(-1.0, 1.0, 0.45, 1.3, -2.2, 2.2, 'police', 0xffffff), PK2 = box(-0.85, 0.85, 1.3, 1.85, -1.3, 0.5, 'police', 0x1f3a6b); PK.on = PK2.on = false;
const SEAT = { 1: [0.7, 1.55, 1.9], 2: [-0.7, 2.0, 1.9] }; // 1 şoför (solda, kısa), 2 yolcu
const INLET = [1.25, 2.0, 0.4];
const WHEEL = [[1.78, 0.55, 2.2, 'sol ön'], [-1.78, 0.55, 2.2, 'sağ ön'], [1.78, 0.55, -4, 'sol arka'], [-1.78, 0.55, -4, 'sağ arka']];
const OBS = []; for (let z = 260; z < LEN - 60; z += 70 + srnd() * 60) OBS.push({ z, x: cx(z) + (srnd() * 9 - 4.5), hit: false });
const GATE = [640, 1180, 1700, 2150].map((z, i) => ({ z, open: [1, -1, -1, 1][i] })); // yol ayrımı: open = +1 sol şerit açık, -1 sağ şerit açık; kapalı şeritte duvar var
for (const g of GATE) { for (let i = OBS.length - 1; i >= 0; i--) if (Math.abs(OBS[i].z - g.z) < 75) OBS.splice(i, 1); OBS.push({ z: g.z, x: cx(g.z) - g.open * 3.7, w: 3.7, gate: g, hit: false }); } OBS.sort((a, b) => a.z - b.z);
const RAIN = [[720, 1040], [1540, 1860]]; // yağmur bölgeleri
const BUMP = []; for (let z = 190; z < LEN - 80; z += 150 + ((z * 7) % 90)) { while (OBS.some((o) => Math.abs(o.z - z) < 28)) z += 14; BUMP.push(z); }
const LIMIT = 50 / 3.6, POLZ = [520, 980, 1450, 1900, 2280], SEAT_T = 120; // hız sınırı (m/s), radar noktaları, koltukta kalma süresi (sn)
const BUMP_V = 8; // m/s (~29 km/s) üstünde tümseğe girilirse lastik patlar

// ---------- oyun durumu (yalnız oda sahibinde) ----------
const players = new Map();
const T = { X: 0, Z: 0, th: 0, v: 0, steer: 0, fuel: 100, flat: [0, 0, 0, 0], rep: [0, 0, 0, 0], pax: 0, paz: 0, state: 'lobby', t: 0, nextFlat: 30, dmg: [0, 0, 0, 0], hitCd: 0, phi: 0, oilCd: 0, autoT: 0, heat: 0, stall: false, rain: 0, wipeT: 0, nFire: 60, nBot: 50, msg: '', msgT: 0, why: '', gas: 0, br: 0, sig: 0 };
const TKS = { st: 0, x: 3.3, z: -50, valve: 0, vp: 0, t: 0 };
const NZ = { p: [0, -5, 0], holder: null, hand: 0, dock: false };
const AIR = [0, 1.8, -5.55], AH = { p: AIR.slice(), holder: null, hand: 0 }; // basınç hortumu: kasanın arkasındaki kompresörden alınır, patlak lastiğe yaklaştırılır
const BARR = 9.5, BLIM = BARR - 2.05; // bariyerin yol eksenine uzaklığı; kamyon merkezi eksenden en çok BLIM kadar açılabilir
const DRL = [-0.95, 1.8, -5.55], DH = { p: DRL.slice(), holder: null, hand: 0 }; // tamir matkabı: kompresörün yanındaki sarı kutudan kabloyla çekilir, hasarlı yere tutulur
const SPOT = [[1.48, 1.6, -1.2, 'sol ön yan'], [-1.48, 1.6, -1.2, 'sağ ön yan'], [1.48, 1.6, -2.8, 'sol arka yan'], [-1.48, 1.6, -2.8, 'sağ arka yan']]; // hasar alan yerler
const PC = { st: 0, x: 0, z: -45, hp: 100, t: 0, ram: 5, slip: 0, used: [] }; // polis: 0 yok, 1 yaklaşıyor, 2 kovalıyor, 3 saf dışı
const OILB = [0.95, 1.8, -5.55], OIL = []; // yağ varili (kasanın arkası) ve yola dökülen yağlar (dünya koordinatı)
const CR = [[0.6, -1.0], [-0.6, -1.0], [0.6, -3.0], [-0.6, -3.0]].map(([x, z]) => ({ x, z, x0: x, z0: z, vx: 0, vz: 0, lost: false, b: box(-0.3, 0.3, 1.3, 1.9, -0.3, 0.3, 'crate', 0xb07a3a) })); // yük sandıkları: sert sürüşte kayar, korkuluğu aşarsa düşer
const EXT = [-1.2, 1.75, 0.55], EX = { p: EXT.slice(), holder: null, hand: 0 }; // yangın söndürücü (kasanın sağ ön köşesi)
const FIRE = { on: false, x: 0, z: 0, hp: 0, t: 0 }, FSPOT = [[0.5, -2.0], [-0.5, -0.3], [0, -4.0], [-0.6, -3.3]];
const RAD = [0, 1.9, 2.95]; // radyatör kapağı: kabinde, koltukların arasında
let BOT = null; // haydut
const diff = () => 1.25 - 0.6 * clamp(T.Z / LEN, 0, 1); // yol ilerledikçe olaylar sıklaşır
const held = (c) => { for (const p of players.values()) if ((p.pin[0] && p.pin[0].b === c.b) || (p.pin[1] && p.pin[1].b === c.b)) return true; return false; };
const jolt = (vx, vz) => { for (const c of CR) if (!c.lost && !held(c)) { c.vx += vx; c.vz += vz; } };
const loseCrate = (c, m) => { c.lost = true; c.b.on = false; say(m); };
const chase = () => PC.st === 1 || PC.st === 2;
const run0 = () => T.state === 'run';
const say = (m) => { T.msg = m; T.msgT = 3.5; };

const R = [0.25, 0.3, 0.25, 0.13, 0.13, 0.15, 0.15]; // kalça, göğüs, kafa, sol el, sağ el, sol ayak, sağ ayak
const OFF = [[0, 0, 0], [0, 0.4, 0], [0, 0.76, 0], [0.35, 0.2, 0], [-0.35, 0.2, 0], [0.15, -0.5, 0], [-0.15, -0.5, 0]];
function place(pl, x, y, z) { for (let k = 0; k < 7; k++) { pl.P[k * 3] = x + OFF[k][0]; pl.P[k * 3 + 1] = y + OFF[k][1]; pl.P[k * 3 + 2] = z + OFF[k][2]; } pl.Q.set(pl.P); pl.pin = [null, null]; pl.offT = 0; }
function mkPlayer(id, name) {
  const used = [...players.values()].map((p) => p.ci);
  const pl = { id, name, ci: [0, 1, 2, 3].find((i) => !used.includes(i)) ?? 0, P: new Float32Array(21), Q: new Float32Array(21), seat: 0, yaw: 0, inp: {}, pin: [null, null], arm: 0.7, gndT: 0, jumpT: 0, stun: 0, punchT: 0, punchCd: 0, punchH: 0, hitDone: true, phase: 0, dead: 0, offT: 0, seatT: 0, seatCd: 0, oilT: 0, onPol: false, lw: 0, lp: 0, ls: 0, lc: 0, lj: false };
  place(pl, rnd(-0.8, 0.8), 1.95, rnd(-4.5, -1.5)); players.set(id, pl); return pl;
}
function poseSeat(pl) {
  const s = SEAT[pl.seat], P = pl.P, d = pl.seat === 1, set = (k, x, y, z) => { P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z; };
  set(0, s[0], s[1], s[2]); set(1, s[0], s[1] + 0.4, s[2] + 0.04); set(2, s[0], s[1] + 0.76, s[2] + 0.06);
  set(3, s[0] + 0.22, d ? 2.05 : s[1] + 0.25, s[2] + (d ? 0.85 : 0.45)); set(4, s[0] - 0.22, d ? 2.05 : s[1] + 0.25, s[2] + (d ? 0.85 : 0.45));
  set(5, s[0] + 0.15, 1.45, s[2] + 0.7); set(6, s[0] - 0.15, 1.45, s[2] + 0.7);
  for (let i = 0; i < 21; i += 3) { fromCab(P[i], P[i + 2]); P[i] = tX; P[i + 2] = tZ; } pl.Q.set(P); pl.yaw = T.phi;
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
    let x = P[i], y = P[i + 1], z = P[i + 2]; if (b.cab) { toCab(x, z); x = tX; z = tZ; }
    const qx = clamp(x, ax, bx), qy = clamp(y, ay, by), qz = clamp(z, az, bz), dx = x - qx, dy = y - qy, dz = z - qz, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; x += dx * k; y += dy * k; z += dz * k; N[0] = dx / d; N[1] = dy / d; N[2] = dz / d; }
    else {
      const pen = [x - ax, bx - x, y - ay, by - y, z - az, bz - z]; let m = 0; for (let k = 1; k < 6; k++) if (pen[k] < pen[m]) m = k;
      N[0] = N[1] = N[2] = 0;
      if (m === 0) { x = ax - r; N[0] = -1; } else if (m === 1) { x = bx + r; N[0] = 1; } else if (m === 2) { y = ay - r; N[1] = -1; } else if (m === 3) { y = by + r; N[1] = 1; } else if (m === 4) { z = az - r; N[2] = -1; } else { z = bz + r; N[2] = 1; }
    }
    if (b.cab) { fromCab(x, z); x = tX; z = tZ; const n0 = N[0] * cpc + N[2] * cps; N[2] = -N[0] * cps + N[2] * cpc; N[0] = n0; }
    P[i] = x; P[i + 1] = y; P[i + 2] = z;
    hit = b;
  }
  return hit;
}
function dropNozzle() {
  NZ.holder = null;
  if (TKS.st === 2 && Math.hypot(NZ.p[0] - INLET[0], NZ.p[1] - INLET[1], NZ.p[2] - INLET[2]) < 0.9) { NZ.dock = true; say('Hortum depoya takıldı! Vanayı aç'); }
}
function unseat(q) { const s = SEAT[q.seat]; q.seat = 0; place(q, s[0], 2.1, 0.5); }
function eject(q) { unseat(q); for (let i = 0; i < 21; i += 3) { q.P[i + 1] += 0.5; q.Q[i] = q.P[i]; q.Q[i + 1] = q.P[i + 1] - 0.13; q.Q[i + 2] = q.P[i + 2] + 0.045; } q.stun = 1.2; q.seatCd = 8; say(q.name + ' koltuktan fırladı! 🪑'); }
function pourOil(pl) { T.oilCd = 6; const z = -8.5; OIL.push([r2(T.X + z * Math.sin(T.th)), r2(T.Z + z * Math.cos(T.th))]); if (OIL.length > 5) OIL.shift();
  if (PC.st === 2 && PC.slip <= 0) { PC.slip = 3; PC.hp -= 35; PC.ram = 4.5; say(pl.name + ' yola yağ döktü — polis kaydı! 🛢'); } else say(pl.name + ' yola yağ döktü 🛢'); }
function hitPlayer(a, q, fx, fz) {
  if (a.bot && q.seat) return;
  if (q.bot) { q.hits++; for (let i = 0; i < 21; i += 3) { q.Q[i] -= fx * 0.055 * q.hits; q.Q[i + 1] -= 0.035 * q.hits; q.Q[i + 2] -= fz * 0.055 * q.hits; } q.stun = 1; q.stealT = 0; q.pin = [null, null]; if (q.hits >= 3 && !(q.outT > 0)) { for (let i = 0; i < 21; i += 3) { q.Q[i] -= fx * 0.2; q.Q[i + 1] -= 0.14; q.Q[i + 2] -= fz * 0.2; } q.outT = 1.3; say('🥷 Haydut kamyondan uçtu! 👋'); } return; } // her şaplakta daha uzağa savrulur
  if (q.seat) { const was = q.seat; unseat(q); q.stun = 0.9; if (was === 1) { if (NZ.holder === a.id) dropNozzle(); a.seat = 1; a.seatT = 0; a.pin = [null, null]; say(a.name + ' direksiyona geçti!'); } return; }
  q.Q[6] -= fx * 0.22; q.Q[8] -= fz * 0.22; q.Q[7] -= 0.05; q.Q[3] -= fx * 0.1; q.Q[5] -= fz * 0.1; q.stun = 0.7; q.pin = [null, null]; if (NZ.holder === q.id) dropNozzle();
}
function stepPlayer(pl, dt) {
  const P = pl.P, Q = pl.Q, I = pl.inp;
  if (I.c !== undefined && I.c !== pl.lc) { pl.lc = I.c; if (T.state === 'run' && TKS.st === 0) { if (T.fuel >= 50) say('Depo yarıdan dolu: tanker gelmez (%50 altında çağır)'); else { TKS.st = 1; TKS.z = -50; TKS.x = 3.3; TKS.valve = 0; say(pl.name + ' tankeri çağırdı ☎'); } } }
  if (pl.dead > 0) { pl.dead -= dt; if (pl.dead <= 0) place(pl, rnd(-0.8, 0.8), 4, rnd(-4.5, -1.5)); return; }
  if (I.s !== undefined && I.s !== pl.ls) {
    pl.ls = I.s;
    if (pl.seat) unseat(pl);
    else if (pl.seatCd <= 0) for (const s of [1, 2]) { fromCab(SEAT[s][0], SEAT[s][2]); if (![...players.values()].some((q) => q.seat === s) && Math.hypot(P[0] - tX, P[2] - tZ) < 1.4 && P[1] > 1.5) { pl.seat = s; pl.seatT = 0; pl.pin = [null, null]; if (NZ.holder === pl.id) dropNozzle(); break; } }
  }
  pl.seatCd -= dt;
  if (pl.seat) { if (T.state === 'run' && !(T.cd > 0) && !chase()) pl.seatT += dt; if (pl.seatT >= SEAT_T) eject(pl); else { poseSeat(pl); return; } } // koltukta 2 dakikadan fazla kalan fırlar
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
  const hold = stand && ((pl.pin[0] && pl.pin[0].b) || (pl.pin[1] && pl.pin[1].b)) ? 0 : 1; // kasaya tutunup ayakta duran yürümez
  const g = stand ? 0.25 : pinned ? 0.04 : 0.02, tv = 4.3 * dt * hold;
  for (const i of [0, 3]) { P[i] += (mx * tv - (P[i] - Q[i])) * g; P[i + 2] += (mz * tv - (P[i + 2] - Q[i + 2])) * g; }
  if (stand) {
    const wd = -Math.cos(pl.phase) * 0.14 * ml * hold; // yalpa: gövde basan ayağın üstüne yatar
    { const c = (Math.min(P[16], P[19]) + 0.5 - P[1]) * 0.3; P[1] += c; Q[1] += c * 0.65; } // Q'ya da uygula: yay enerji pompalamasın (inişte zıplatıyordu)
    P[3] += (P[0] + mx * 0.1 + lx * wd - P[3]) * 0.15; { const c = (P[1] + 0.4 - P[4]) * 0.3; P[4] += c; Q[4] += c * 0.65; } P[5] += (P[2] + mz * 0.1 + lz * wd - P[5]) * 0.15;
    P[6] += (P[3] - P[6]) * 0.12; { const c = (P[4] + 0.36 - P[7]) * 0.3; P[7] += c; Q[7] += c * 0.65; } P[8] += (P[5] - P[8]) * 0.12;
    pl.phase += ml * hold * dt * 9;
    for (let s = 0; s < 2; s++) {
      const i = 15 + s * 3, sd = s ? -1 : 1, ph = pl.phase + s * Math.PI, sw = Math.sin(ph) * 0.28 * ml * hold;
      P[i] += (P[0] + lx * sd * 0.17 + fx * sw - P[i]) * 0.35; P[i + 2] += (P[2] + lz * sd * 0.17 + fz * sw - P[i + 2]) * 0.35;
      const up = Math.cos(ph); if (ml * hold > 0.1 && up > 0) { const c = (P[34 - i] + up * 0.16 - P[i + 1]) * 0.4; P[i + 1] += c; Q[i + 1] += c; } // kalkan ayak: konum düzeltmesi, hız eklemez (eskiden zıplatıyordu)
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
      if (pin.b) { tX = pin.b.o[0] + pin.p[0]; tZ = pin.b.o[2] + pin.p[2]; if (pin.b.cab) fromCab(tX, tZ); P[ji] = tX; P[ji + 1] = pin.b.o[1] + pin.p[1]; P[ji + 2] = tZ; stick(P, 1, j, pl.arm, 1, 1); }
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
        if (it === 3 && isHand && I.g && !st && pl.punchT <= 0 && NZ.holder !== pl.id && AH.holder !== pl.id && DH.holder !== pl.id && EX.holder !== pl.id) { if (b.cab) toCab(P[i], P[i + 2]); else { tX = P[i]; tZ = P[i + 2]; } pl.pin[k - 3] = { b, p: [tX - b.o[0], P[i + 1] - b.o[1], tZ - b.o[2]] }; }
      }
      if (P[i + 1] < R[k]) { P[i + 1] = R[k]; P[i + 2] -= T.v * dt * 0.15; Q[i] += (P[i] - Q[i]) * 0.1; }
    }
  }
  if (fg) pl.gndT = 0.12;
  if (I.g && !st && pl.punchT <= 0) for (let h = 0; h < 2; h++) {
    if (pl.pin[h]) continue; const i = 9 + h * 3;
    if (NZ.holder == null && TKS.st === 2 && d3(P, i, NZ.p, 0) < 0.55) { NZ.holder = pl.id; NZ.hand = h; NZ.dock = false; continue; }
    if (NZ.holder === pl.id) continue;
    const hasT = AH.holder === pl.id || DH.holder === pl.id || EX.holder === pl.id;
    if (!hasT && AH.holder == null && d3(P, i, AH.p, 0) < 0.65) { AH.holder = pl.id; AH.hand = h; continue; }
    if (!hasT && DH.holder == null && d3(P, i, DH.p, 0) < 0.65) { DH.holder = pl.id; DH.hand = h; continue; }
    if (!hasT && EX.holder == null && d3(P, i, EX.p, 0) < 0.65) { EX.holder = pl.id; EX.hand = h; continue; }
    if (hasT) continue;
    for (const q of players.values()) { if (q === pl || q.seat || q.dead > 0) continue; for (const k of [1, 0, 2]) if (d3(P, i, q.P, k * 3) < R[k] + 0.2) { pl.pin[h] = { q, k }; break; } if (pl.pin[h]) break; }
  }
  for (let h = 0; h < 2; h++) { const pin = pl.pin[h]; if (pin && (d3(P, 3, P, 9 + h * 3) > 1.35 || (pin.b && !pin.b.on) || (pin.q && (pin.q.seat || pin.q.dead > 0)))) pl.pin[h] = null; }
  if (pl.punchT > 0 && !pl.hitDone) { const i = 9 + pl.punchH * 3; for (const q of players.values()) if (q !== pl && q.dead <= 0 && d3(P, i, q.P, 6) < 0.48) { pl.hitDone = true; hitPlayer(pl, q, fx, fz); break; } }
  if (I.u && !st && T.state === 'run' && Math.hypot(P[3] - OILB[0], P[5] - OILB[2]) < 1.4) { pl.oilT += dt; if (pl.oilT > 0.8 && T.oilCd <= 0) { pl.oilT = 0; pourOil(pl); } } else pl.oilT = 0; // yağ varili
  if (I.w !== undefined && I.w !== pl.lw) { pl.lw = I.w; if (pl.seat === 2) T.wipeT = 2.5; }
  if (I.u && !st) { fromCab(RAD[0], RAD[2]); if (Math.hypot(P[3] - tX, P[5] - tZ) < 1.3) { T.heat = Math.max(0, T.heat - dt * 30); T.coolT = 0.3; } }
  if (I.u && !st) {
    if (TKS.st === 2 && Math.hypot(P[3] - TKS.x, P[4] - 2.3, P[5] - (TKS.z - 2)) < 1.4) { TKS.vp += dt / 1.2; if (TKS.vp >= 1) { TKS.vp = 0; TKS.valve = 25; say('Vana açıldı ⛽'); } }
  }
  pl.offT = P[1] < 0.7 ? pl.offT + dt : 0;
  if (pl.offT > 2.5 || P[2] < -16 || P[2] > 14 || Math.abs(P[0]) > 12) { pl.dead = 2; pl.pin = [null, null]; if (NZ.holder === pl.id) dropNozzle(); if (T.state === 'run') say(pl.name + ' kamyondan düştü!'); }
}
function stepAir(dt) {
  const h = AH.holder && players.get(AH.holder);
  if (AH.holder && (!h || h.dead > 0 || h.seat || h.stun > 0 || !h.inp.g)) AH.holder = null; // TUT bırakılınca hortum da bırakılır
  if (AH.holder) { const i = 9 + AH.hand * 3; AH.p = [h.P[i], h.P[i + 1], h.P[i + 2]]; if (Math.hypot(AH.p[0] - AIR[0], AH.p[2] - AIR[2]) > 9.5) { AH.holder = null; say('Basınç hortumu elinden kurtuldu!'); } }
  else for (let k = 0; k < 3; k++) AH.p[k] += (AIR[k] - AH.p[k]) * Math.min(1, dt * 5); // makaraya geri sarar
  if (AH.holder && T.state === 'run') for (let w = 0; w < 4; w++) if (T.flat[w] && Math.hypot(AH.p[0] - WHEEL[w][0], AH.p[2] - WHEEL[w][2]) < 2.0) { T.rep[w] += dt / 5; if (T.rep[w] >= 1) { T.flat[w] = 0; T.rep[w] = 0; say(h.name + ' lastiği şişirdi 🛞'); } }
  const dh = DH.holder && players.get(DH.holder);
  if (DH.holder && (!dh || dh.dead > 0 || dh.seat || dh.stun > 0 || !dh.inp.g)) DH.holder = null;
  if (DH.holder) { const i = 9 + DH.hand * 3; DH.p = [dh.P[i], dh.P[i + 1], dh.P[i + 2]]; if (Math.hypot(DH.p[0] - DRL[0], DH.p[2] - DRL[2]) > 9.5) { DH.holder = null; say('Matkap elinden kurtuldu!'); } }
  else for (let k = 0; k < 3; k++) DH.p[k] += (DRL[k] - DH.p[k]) * Math.min(1, dt * 5); // kablo geri sarar
  if (DH.holder && T.state === 'run') for (let w = 0; w < 4; w++) if (T.dmg[w] > 0 && Math.hypot(DH.p[0] - SPOT[w][0], DH.p[2] - SPOT[w][2]) < 1.5) { T.dmg[w] = Math.max(0, T.dmg[w] - dt * 7); if (!T.dmg[w]) say(dh.name + ' hasarı onardı 🔧'); }
}
function stepExtras(dt) {
  const run = T.state === 'run' && !(T.cd > 0);
  // söndürücü
  const eh = EX.holder && players.get(EX.holder);
  if (EX.holder && (!eh || eh.dead > 0 || eh.seat || eh.stun > 0 || !eh.inp.g)) EX.holder = null;
  if (EX.holder) { const i = 9 + EX.hand * 3; EX.p = [eh.P[i], eh.P[i + 1], eh.P[i + 2]]; } else for (let k = 0; k < 3; k++) EX.p[k] += (EXT[k] - EX.p[k]) * Math.min(1, dt * 5);
  // yangın
  if (FIRE.on) { FIRE.t += dt; const w = (FIRE.x > 0 ? 0 : 1) + (FIRE.z < -2 ? 2 : 0); if (run) T.dmg[w] += dt * 1.3;
    if (FIRE.t > 22) { FIRE.t = 8; const c = CR.filter((c) => !c.lost).sort((a, b) => Math.hypot(a.x - FIRE.x, a.z - FIRE.z) - Math.hypot(b.x - FIRE.x, b.z - FIRE.z))[0]; if (c && run) loseCrate(c, '🔥 Bir sandık yandı!'); }
    if (EX.holder && Math.hypot(EX.p[0] - FIRE.x, EX.p[2] - FIRE.z) < 1.8) { FIRE.hp -= dt * 34; if (FIRE.hp <= 0) { FIRE.on = false; T.nFire = rnd(55, 85) * diff(); say(eh.name + ' yangını söndürdü 🧯'); } }
    if (!run) FIRE.on = false; }
  else if (run) { T.nFire -= dt; if (T.nFire <= 0) { const f = FSPOT[(Math.random() * FSPOT.length) | 0]; Object.assign(FIRE, { on: true, x: f[0], z: f[1], hp: 100, t: 0 }); say('🔥 Kasada yangın! Sağ öndeki söndürücüyü TUT, ateşe götür'); } }
  // yük sandıkları
  const mu = T.rain ? 1.4 : 2.2;
  for (const c of CR) { if (c.lost) continue;
    if (held(c) || !run) c.vx = c.vz = 0;
    else { const ax = T.pax, az = T.paz, sp = Math.hypot(c.vx, c.vz); if (sp < 0.05 && Math.hypot(ax, az) < mu) c.vx = c.vz = 0; else { c.vx += ax * dt; c.vz += az * dt; const s2 = Math.hypot(c.vx, c.vz), f = Math.min(s2, mu * 0.85 * dt); if (s2 > 0) { c.vx -= (c.vx / s2) * f; c.vz -= (c.vz / s2) * f; } } }
    c.x += c.vx * dt; c.z += c.vz * dt;
    for (const o of CR) if (o !== c && !o.lost && Math.abs(o.x - c.x) < 0.62 && Math.abs(o.z - c.z) < 0.62) { if (Math.abs(o.x - c.x) > Math.abs(o.z - c.z)) { c.x = o.x + Math.sign(c.x - o.x || 1) * 0.62; c.vx *= 0.3; } else { c.z = o.z + Math.sign(c.z - o.z || 1) * 0.62; c.vz *= 0.3; } }
    if (c.z < -4.8) { c.z = -4.8; c.vz = 0; } if (c.z > 0.55) { c.z = 0.55; c.vz = 0; }
    if (Math.abs(c.x) > 1.05) { if (Math.abs(c.vx) > 1.5) loseCrate(c, '📦 Bir sandık yola düştü! Sandıkları TUT'); else { c.x = Math.sign(c.x) * 1.05; c.vx = 0; } }
    c.b.o[0] = c.x; c.b.o[2] = c.z; c.b.on = !c.lost; }
  if (run && !CR.some((c) => !c.lost)) { T.state = 'over'; T.why = 'Bütün yük yola döküldü!'; }
  // haydut: kasaya atlar, sandıkları aşağı atar; şaplakla kovulur
  if (BOT && (BOT.dead > 0 || !run)) { players.delete(BOT.id); BOT = null; T.nBot = rnd(50, 75) * diff(); }
  if (!BOT) { if (run && !chase()) { T.nBot -= dt; if (T.nBot <= 0 && CR.some((c) => !c.lost)) { BOT = mkPlayer('haydut', 'HAYDUT'); Object.assign(BOT, { bot: true, ci: 5, stealT: 0, pt: 1, pc: 0, hits: 0 }); place(BOT, rnd(-0.6, 0.6), 3.2, -4.5); say('🥷 Haydut kasaya atladı! Şaplakla kovun'); } } }
  else if (BOT.outT > 0) { BOT.outT -= dt; BOT.stun = 1; BOT.inp = {}; if (BOT.outT <= 0) BOT.dead = 1; }
  else { const B = BOT, c = CR.filter((c) => !c.lost).sort((a, b) => Math.hypot(a.x - B.P[0], a.z - B.P[2]) - Math.hypot(b.x - B.P[0], b.z - B.P[2]))[0]; B.pt -= dt;
    let tx = c ? c.x : 3, tz = c ? c.z : B.P[2], near = 0.8;
    const v = [...players.values()].find((q) => q !== B && !q.seat && q.dead <= 0 && Math.hypot(q.P[0] - B.P[0], q.P[2] - B.P[2]) < 1.1);
    if (v && B.pt <= 0.5) { tx = v.P[0]; tz = v.P[2]; near = 0.3; if (B.pt <= 0) { B.pc++; B.pt = 1.6; } }
    const dx = tx - B.P[0], dz = tz - B.P[2], d = Math.hypot(dx, dz) || 1; B.inp = { mx: d > near ? dx / d : dx / d * 0.05, mz: d > near ? dz / d : dz / d * 0.05, p: B.pc };
    if (c && Math.hypot(c.x - B.P[0], c.z - B.P[2]) < 1.0 && B.stun <= 0) { B.stealT += dt; if (B.stealT > 7) { B.stealT = 0; loseCrate(c, '🥷 Haydut bir sandığı aşağı attı!'); } } else B.stealT = Math.max(0, B.stealT - dt); }
}
function stepPolice(dt) {
  const S = PC, run = T.state === 'run' && !(T.cd > 0), px = S.x, pz = S.z; T.oilCd -= dt;
  if (run && S.st === 0) for (let i = 0; i < POLZ.length; i++) if (!S.used[i] && T.Z > POLZ[i] - 45 && T.Z < POLZ[i] + 5 && T.v > LIMIT) { S.used[i] = 1; Object.assign(S, { st: 1, x: -2.5, z: -45, hp: 100, t: 0, ram: 5, slip: 0 }); say('🚓 Hız sınırını aştınız! Polis peşinizde'); break; }
  if (S.st === 1) { S.z += dt * 9; S.x -= S.x * Math.min(1, dt); if (S.z >= -9.4) { S.z = -9.4; S.st = 2; say('🚓 Polis arkanızda! Yağ dökün ya da üstüne atlayın'); } }
  else if (S.st === 2) { S.t += dt;
    if (S.slip > 0) { S.slip -= dt; S.z += (-24 - S.z) * Math.min(1, dt * 2.5); } // yağda kayıp geride kalır
    else { const lunge = S.ram < 0.35; S.z += (-9.4 + (lunge ? 1.25 : 0) - S.z) * Math.min(1, dt * (lunge ? 9 : 2.2)); S.x += (Math.sin(S.t * 0.7) * 1.3 - S.x) * Math.min(1, dt * 2); S.ram -= dt;
      if (S.ram <= 0 && S.z > -8.5) { S.ram = rnd(5, 8); T.dmg[S.x > 0 ? 2 : 3] += 6; say('GÜM! Polis arkadan vurdu'); jolt(0, -1.3); for (const p of players.values()) if (!p.seat) for (let i = 2; i < 21; i += 3) p.Q[i] += 0.06; } }
    for (const p of players.values()) { const inB = !p.seat && p.dead <= 0 && Math.abs(p.P[0] - px) < 1.3 && Math.abs(p.P[2] - pz) < 2.5 && p.P[2] < -6.3 && p.P[1] > 1.3 && p.P[1] < 3.6, on = inB && p.gndT > 0;
      if (inB && S.slip <= 0) for (let i = 0; i < 21; i += 3) { p.P[i] += S.x - px; p.Q[i] += S.x - px; p.P[i + 2] += S.z - pz; p.Q[i + 2] += S.z - pz; } // üstündeki oyuncuyu taşır (yağda kayarken taşımaz: düşer)
      if (on) { S.hp -= dt * 5; if (p.airT > 0.3) { S.hp -= 12; say(p.name + ' polis arabasının üstüne atladı! 💥'); } }
      p.airT = p.gndT > 0 ? 0 : (p.airT || 0) + dt; p.onPol = on; }
    if (S.hp <= 0 || !run) { S.st = 3; T.autoT = 12; if (run) say('🚓 Polis aracı saf dışı! Kurtuldunuz 🎉 Şoför koltuğa!'); } }
  else if (S.st === 3) { S.z -= dt * 10; if (S.z < -60) S.st = 0; }
  PK.on = PK2.on = S.st > 0; PK.o[0] = PK2.o[0] = S.x; PK.o[2] = PK2.o[2] = S.z;
}
function stepTanker(dt) {
  const S = TKS;
  if (S.st === 1) { S.z += dt * 7; if (S.z >= 0) { S.z = 0; S.st = 2; S.t = 0; say('Tanker solunda! Hortumu al, vanayı aç'); } }
  else if (S.st === 2) { S.t += dt; S.z = Math.sin(S.t * 0.5) * 0.5; S.x = 3.3; S.valve -= dt; if (NZ.dock && S.valve > 0) T.fuel = Math.min(100, T.fuel + 14 * dt); if (T.fuel >= 100 || S.t > 75) { S.st = 3; NZ.dock = false; NZ.holder = null; say('Tanker ayrılıyor'); } }
  else if (S.st === 3) { S.z -= dt * 6; if (S.z < -50) S.st = 0; }
  TK.on = S.st > 0; TK.o[0] = S.x; TK.o[2] = S.z;
  const h = NZ.holder && players.get(NZ.holder);
  if (NZ.holder) {
    if (!h || h.dead > 0 || h.seat || S.st !== 2) NZ.holder = null;
    else { const i = 9 + NZ.hand * 3; NZ.p = [h.P[i], h.P[i + 1], h.P[i + 2]]; if (Math.hypot(NZ.p[0] - S.x, NZ.p[1] - 2, NZ.p[2] - (S.z + 1)) > 7.5) { NZ.holder = null; say('Hortum elinden kurtuldu!'); } }
  }
  if (!NZ.holder) NZ.p = NZ.dock ? INLET.slice() : [S.x - 1.3, 2.2, S.z + 1];
}
function stepTruck(dt) {
  const y = [...players.values()].find((p) => p.seat === 2), yi = y ? y.inp : null; // yolcunun şoföre işareti: 1 sol, 2 sağ, 3 yavaş
  T.sig = yi ? yi.sg || ((yi.mx || 0) > 0.5 ? 1 : (yi.mx || 0) < -0.5 ? 2 : (yi.mz || 0) < -0.5 ? 3 : 0) : 0;
  if (T.state === 'lobby') { T.v = 0; T.pax = T.paz = 0; return; }
  if (T.state === 'run' && T.cd > 0) { T.cd -= dt; T.v = 0; T.pax = T.paz = 0; T.gas = T.br = 0; if (T.cd > 0) return; T.cd = 0; T.v = 8; say('Yola çıktınız! Kamyon durmasın'); } // başlangıç geri sayımı: kamyon bekler
  T.t += dt; T.msgT -= dt; T.wipeT -= dt; T.rain = run0() && RAIN.some(([a, b]) => T.Z > a && T.Z < b) ? 1 : 0;
  const d = [...players.values()].find((p) => p.seat === 1), run = T.state === 'run';
  let si = d ? clamp(d.inp.mx || 0, -1, 1) : 0, gas = d && run ? Math.max(0, d.inp.mz || 0) : 0, br = d ? Math.max(0, -(d.inp.mz || 0)) : run ? 0 : 1;
  T.autoT -= dt; const auto = run && (chase() || (T.autoT > 0 && !d)); // kovalamaca bitince şoför koltuğa dönene dek (en çok 12 sn) sürmeye devam eder
  // polis kovalarken kamyon kendi gider: yolu izler, engelden kaçar
  if (auto) { const ob = OBS.find((o) => !o.hit && o.z > T.Z + 3 && o.z < T.Z + 70), off = ob ? (ob.x - cx(ob.z) > 0 ? -3.6 : 3.6) : 0;
    si = clamp((Math.atan2(cx(T.Z + 16) + off - T.X, 16) - T.th - T.phi) * 3, -1, 1); const vt = chase() ? 13 : 8; gas = T.v < vt ? 1 : 0; br = T.v > vt + 2 ? 0.6 : 0; }
  T.steer += (si - T.steer) * Math.min(1, dt * 3.5);
  let bias = 0, vmax = 20; for (let w = 0; w < 4; w++) if (T.flat[w]) { vmax -= 6; bias += Math.sign(WHEEL[w][0]) * 0.2 + Math.sin(T.t * 7) * 0.05; }
  if (run) { T.heat = clamp(T.heat + dt * (0.5 + gas * 1.1) * (1 + 0.6 * T.Z / LEN), 0, 100); if (T.heat >= 100 && !T.stall) { T.stall = true; say('🌡 Motor hararetten stop etti! Su dökün'); } if (T.stall && T.heat < 55) { T.stall = false; say('Motor yeniden çalıştı 👍'); } if (T.stall) gas = 0; }
  if (T.fuel <= 0) gas = 0; T.gas = gas; T.br = br;
  const off = Math.abs(T.X - cx(T.Z)) > 7;
  const slow = T.v < 8.4; // ~30 km/s altı: kendi kendine neredeyse hiç yavaşlamaz, fren yumuşak
  let a = gas * 3.2 - br * (slow ? 2.5 : 7) - (slow ? 0.06 : 0.5 + T.v * 0.02) - (off ? (slow ? 1 : 5) : 0) - (T.v > vmax ? 4 : 0); if (!run) a = -6;
  const ov = T.v; T.v = Math.max(0, T.v + a * dt); if (run && T.t < 6) T.v = Math.max(T.v, 7);
  const LT = 5, omt = (T.v / LT) * Math.sin(T.phi), thc = T.th + T.phi; // dorse çekicinin peşinden gecikmeli döner
  const om = (T.steer + bias) * T.v * 0.05 * (12 / (12 + T.v)); // hız arttıkça direksiyon yumuşar
  const oz = T.Z; T.X += (Math.sin(thc) * T.v - omt * Math.cos(T.th) * HZ) * dt; T.Z += (Math.cos(thc) * T.v + omt * Math.sin(T.th) * HZ) * dt; T.th += omt * dt; T.phi = clamp(T.phi + (om - omt) * dt, -0.7, 0.7);
  { const c = cx(T.Z), e = T.X - c; T.hitCd -= dt; // yol kenarı bariyerleri: kamyon dışarı çıkamaz, çarptıkça hasar alır
    if (Math.abs(e) > BLIM) { const sd = Math.sign(e), rd = Math.atan2(cx(T.Z + 1) - cx(T.Z - 1), 2), hc = T.th + T.phi, lat = Math.max(0, Math.sin(hc - rd) * T.v * sd);
      T.X = c + sd * BLIM; if (sd * (hc - rd) > 0) T.phi -= (hc - rd) * 0.6; // bariyer boyunca sıyırır
      if (run && T.hitCd <= 0) { T.hitCd = 0.9; const c2 = [0, 1, 2, 3].filter((w) => Math.sign(SPOT[w][0]) === sd), w = c2[T.dmg[c2[0]] <= T.dmg[c2[1]] ? 0 : 1]; T.dmg[w] += clamp(8 + lat * 4, 8, 28); T.v *= 0.75; jolt(sd * 2.3, 0); say('GÜM! Bariyere çarptınız: ' + SPOT[w][3] + ' hasarlı'); for (const p of players.values()) if (!p.seat) for (let i = 0; i < 21; i += 3) p.Q[i] -= sd * 0.08; } } }
  T.pax = -T.v * omt * 0.55 + (off ? Math.sin(T.t * 23) * 3 : 0); T.paz = -((T.v - ov) / dt) * 0.6;
  if (!run) return;
  T.fuel = Math.max(0, T.fuel - dt * (0.45 + gas * 0.75));
  for (const o of OBS) if (!o.hit && o.z - T.Z > -6 && o.z - T.Z < 5.6 && Math.abs(o.x - T.X) < (o.w || 1.5) + 1) { o.hit = true; jolt(0, 2.2); if (o.gate) { T.v *= 0.3; T.dmg[o.x > T.X ? 0 : 1] += 18; say('GÜM! Kapalı şeride girdiniz'); } else { T.v *= 0.4; say('GÜM! Engele çarptınız'); } for (const p of players.values()) if (!p.seat) for (let i = 2; i < 21; i += 3) p.Q[i] -= 0.1; }
  for (const b of BUMP) if (oz < b && T.Z >= b && Math.abs(T.X - cx(b)) < 7) {
    for (const p of players.values()) if (!p.seat) for (let i = 1; i < 21; i += 3) p.Q[i] -= T.v > BUMP_V ? 0.14 : 0.05;
    if (auto) {} else if (T.v > BUMP_V) { jolt((Math.random() < 0.5 ? -1 : 1) * 1.7, 0); const c = [0, 1, 2, 3].filter((w) => !T.flat[w]); if (c.length) { const w = c.includes(0) || c.includes(1) ? c.filter((w) => w < 2)[(Math.random() * c.filter((w) => w < 2).length) | 0] : c[0]; T.flat[w] = 1; say('PAT! Tümseğe hızlı girdiniz: ' + WHEEL[w][3] + ' lastik patladı'); } }
    else say('Tümsek yavaş geçildi 👍');
  }
  T.nextFlat -= dt; if (T.nextFlat <= 0) { const c = [0, 1, 2, 3].filter((w) => !T.flat[w]); if (c.length > 2) { const w = c[(Math.random() * c.length) | 0]; T.flat[w] = 1; say('PAT! Lastik patladı: ' + WHEEL[w][3]); } T.nextFlat = rnd(35, 60) * diff(); }
  if (T.dmg[0] + T.dmg[1] + T.dmg[2] + T.dmg[3] >= 100) { T.state = 'over'; T.why = 'Kamyon hurdaya döndü!'; }
  else if (T.Z >= LEN) { T.state = 'win'; T.why = 'Hedefe ulaştınız! 🏁 Teslim edilen yük: ' + CR.filter((c) => !c.lost).length + '/4'; }
  else if (T.t > 6 && T.v < 0.4) { T.state = 'over'; T.why = T.fuel <= 0 ? 'Yakıt bitti, kamyon durdu!' : 'Kamyon durdu!'; }
}
function startGame() { resetGame(); T.state = 'run'; T.v = 0; T.cd = 5; }
function resetGame() {
  Object.assign(T, { X: 0, Z: 0, th: 0, v: 0, steer: 0, fuel: 100, flat: [0, 0, 0, 0], rep: [0, 0, 0, 0], state: 'lobby', t: 0, cd: 0, dmg: [0, 0, 0, 0], hitCd: 0, phi: 0, oilCd: 0, autoT: 0, heat: 0, stall: false, rain: 0, wipeT: 0, nFire: rnd(45, 70), nBot: rnd(40, 60), nextFlat: rnd(25, 40), msg: '', msgT: 0, why: '', sig: 0 });
  Object.assign(TKS, { st: 0, z: -50, valve: 0, vp: 0 }); NZ.holder = null; NZ.dock = false; AH.holder = null; AH.p = AIR.slice(); DH.holder = null; DH.p = DRL.slice(); Object.assign(PC, { st: 0, z: -45, hp: 100, slip: 0, used: [] }); OIL.length = 0; if (BOT) { players.delete(BOT.id); BOT = null; } FIRE.on = false; EX.holder = null; EX.p = EXT.slice(); for (const c of CR) Object.assign(c, { x: c.x0, z: c.z0, vx: 0, vz: 0, lost: false }); for (const p of players.values()) { p.seatT = 0; p.seatCd = 0; } for (const o of OBS) o.hit = false;
}
function simStep(dt) { stepAir(dt);
  cpc = Math.cos(T.phi); cps = Math.sin(T.phi);
  stepTruck(dt); stepTanker(dt); stepPolice(dt); stepExtras(dt);
  const L = [...players.values()]; for (const p of L) stepPlayer(p, dt);
  for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) { const p = L[a], q = L[b]; if (p.seat || q.seat || p.dead > 0 || q.dead > 0) continue; for (const k of [0, 1]) { const i = k * 3, dx = q.P[i] - p.P[i], dy = q.P[i + 1] - p.P[i + 1], dz = q.P[i + 2] - p.P[i + 2], d = Math.hypot(dx, dy, dz) || 1e-6; if (d < 0.56) { const s = ((0.56 - d) / d) * 0.5; p.P[i] -= dx * s; p.P[i + 2] -= dz * s; q.P[i] += dx * s; q.P[i + 2] += dz * s; } } }
}
const r2 = (v) => Math.round(v * 100) / 100;
const snap = () => ({ t: 's', T: { X: T.X, Z: T.Z, th: T.th, v: T.v, st: T.steer, f: T.fuel, fl: T.flat, rp: T.rep, dm: T.dmg.map(Math.ceil), ph: Math.round(T.phi * 1000) / 1000, ht: Math.round(T.heat), sl: T.stall ? 1 : 0, rn: T.rain, wp: T.wipeT > 0 ? 1 : 0, s: T.state, cd: Math.ceil(T.cd || 0), m: T.msgT > 0 ? T.msg : '', g: T.gas, b: T.br, why: T.why, sg: T.sig, oh: OBS.map((o, i) => (o.hit ? i : -1)).filter((i) => i >= 0) }, k: [TKS.st, TKS.x, TKS.z, TKS.valve > 0 ? 1 : 0, TKS.vp], n: [NZ.p[0], NZ.p[1], NZ.p[2], NZ.dock ? 1 : 0], a: [r2(AH.p[0]), r2(AH.p[1]), r2(AH.p[2]), AH.holder ? 1 : 0], d: [r2(DH.p[0]), r2(DH.p[1]), r2(DH.p[2]), DH.holder ? 1 : 0], q: [PC.st, r2(PC.x), r2(PC.z), Math.max(0, Math.ceil(PC.hp)), PC.slip > 0 ? 1 : 0, PC.used.slice(), T.oilCd > 0 ? Math.ceil(T.oilCd) : 0], ol: OIL, cr: CR.map((c) => (c.lost ? 0 : [r2(c.x), r2(c.z)])), fr: FIRE.on ? [FIRE.x, FIRE.z, Math.ceil(FIRE.hp)] : 0, x: [r2(EX.p[0]), r2(EX.p[1]), r2(EX.p[2]), EX.holder ? 1 : 0], p: [...players.values()].map((p) => ({ bt: p.bot ? 1 : 0, id: p.id, n: p.name, c: p.ci, s: p.seat, st: p.seat ? Math.max(0, Math.ceil(SEAT_T - p.seatT)) : 0, y: r2(p.yaw), d: p.dead > 0 ? 1 : 0, P: Array.from(p.P, r2) })) });

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
const cabG = new THREE.Group(); cabG.position.z = HZ; truck.add(cabG); const cabIn = new THREE.Group(); cabIn.position.z = -HZ; cabG.add(cabIn); // çekici: mafsal etrafında döner
for (const b of BOX) if (b !== TK && b.tag !== 'police' && b.tag !== 'crate') boxMesh(b, b.cab ? cabIn : truck);
add(truck, CG, M(0x333333), 0, 0.9, HZ, 0.22, 0.5, 0.22); // mafsal pimi
const marks = WHEEL.map((w) => add(truck, CG, new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true }), Math.sign(w[0]) * 1.05, 1.32, clamp(w[2], -5.4, 0.55), 0.42, 0.03, 0.42)); // patlak lastik için durulacak yer
const wheels = WHEEL.map((w, i) => { const par = i < 2 ? cabIn : truck, m = add(par, CG, M(0x222222), w[0], w[1], w[2], 0.55, 0.44, 0.55); m.rotation.z = Math.PI / 2; add(par, CG, M(0x8d8d92), w[0] - Math.sign(w[0]) * 0.12, w[1], w[2], 0.12, 0.3, 0.12).rotation.z = Math.PI / 2; return m; }); // tekerler gövdeden dışarıda, aksla bağlı
add(cabIn, BG, M(0x30415d), 0.7, 1.95, 1.45, 0.8, 0.9, 0.12); add(cabIn, BG, M(0x30415d), -0.7, 2.3, 1.45, 0.8, 1.0, 0.12);
add(truck, CG, M(0xffd23f), INLET[0], 1.65, INLET[2], 0.09, 0.7, 0.09); add(truck, CG, M(0x222222), INLET[0], 2.0, INLET[2], 0.16, 0.08, 0.16);
const swheel = new THREE.Group(); swheel.position.set(0.7, 2.05, 2.85); swheel.rotation.x = -0.5; cabIn.add(swheel);
add(swheel, new THREE.TorusGeometry(0.3, 0.045, 8, 24), M(0x111111), 0, 0, 0); add(swheel, BG, M(0x111111), 0, 0, 0, 0.6, 0.06, 0.04); add(swheel, BG, M(0xd8432f), 0, 0.15, 0, 0.06, 0.3, 0.04);
const pedG = add(cabIn, BG, M(0x7bd389), 0.5, 1.5, 3.1, 0.16, 0.3, 0.06), pedB = add(cabIn, BG, M(0xff5a5f), 0.85, 1.5, 3.1, 0.2, 0.3, 0.06);
const gauge = add(cabIn, CG, M(0xf5f0e8), 0.7, 2.45, 3.18, 0.16, 0.02, 0.16); gauge.rotation.x = Math.PI / 2;
const needle = add(cabIn, BG, M(0xd8432f), 0.7, 2.45, 3.16, 0.02, 0.14, 0.02);
add(truck, BG, M(0x2e6da4), AIR[0], 1.55, AIR[2] - 0.1, 0.6, 0.5, 0.45); add(truck, CG, M(0xd8432f), AIR[0], 1.55, AIR[2] - 0.1, 0.2, 0.62, 0.2).rotation.z = Math.PI / 2; add(truck, CG, M(0xf5f0e8), AIR[0] - 0.18, 1.82, AIR[2] - 0.1, 0.09, 0.03, 0.09).rotation.x = Math.PI / 2; // kompresör
const airTip = add(scene, CG, M(0xff8a1f), 0, 0, 0, 0.06, 0.3, 0.06), airHose = add(scene, CG, M(0xc0392b), 0, 0, 0, 1), airA = new THREE.Vector3(AIR[0], AIR[1] - 0.1, AIR[2]);
add(truck, BG, M(0xf2b632), DRL[0], 1.55, DRL[2] - 0.1, 0.6, 0.5, 0.45); add(truck, BG, M(0x222222), DRL[0], 1.55, DRL[2] - 0.1, 0.62, 0.12, 0.47); add(truck, CG, M(0x222222), DRL[0] + 0.18, 1.82, DRL[2] - 0.1, 0.09, 0.03, 0.09).rotation.x = Math.PI / 2; // tamir kutusu
const drill = new THREE.Group(); scene.add(drill); add(drill, BG, M(0xf2b632), 0, 0, 0, 0.13, 0.17, 0.32); add(drill, BG, M(0x222222), 0, -0.17, -0.08, 0.1, 0.22, 0.1); add(drill, CG, M(0x444444), 0, 0, 0.2, 0.05, 0.08, 0.05).rotation.x = Math.PI / 2;
const drBit = add(drill, CG, M(0xcfd3da), 0, 0, 0.34, 0.018, 0.22, 0.018); drBit.rotation.x = Math.PI / 2; add(drBit, BG, M(0x777777), 0, 0, 0, 2.2, 0.5, 0.6);
const drCable = add(scene, CG, M(0x111111), 0, 0, 0, 1), drA = new THREE.Vector3(DRL[0], DRL[1] - 0.1, DRL[2]);
const dmgMark = SPOT.map((p) => add(truck, CG, new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true }), Math.sign(p[0]) * 1.05, 1.32, p[2], 0.42, 0.03, 0.42)); // tamir için durulacak yer
const dmgDent = SPOT.map((p) => { const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); add(g, BG, M(0x1d1a18), 0, 0, 0, 0.16, 0.56, 1.3); add(g, BG, M(0x1d1a18), 0, -0.05, 0.3, 0.2, 0.3, 0.3).rotation.y = 0.5; add(g, BG, M(0x6b3a1a), 0, 0.1, -0.35, 0.19, 0.2, 0.25).rotation.y = -0.4; truck.add(g); return g; });
const mkTag = (x, y, z) => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.position.set(x, y, z); sp.scale.set(1.7, 0.85, 1); sp.visible = false; sp.renderOrder = 5; truck.add(sp); return { sp, c, tx, v: -1 }; };
const dmgTag = SPOT.map((p) => mkTag(Math.sign(p[0]) * 2.3, 2.5, p[2]));
const hpTag = WHEEL.map((w) => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.position.set(Math.sign(w[0]) * 2.7, 1.7, w[2]); sp.scale.set(1.7, 0.85, 1); sp.visible = false; sp.renderOrder = 5; truck.add(sp); return { sp, c, tx, v: -1 }; });
// buğulu ön cam: yalnız şoför kamerasında görünür, dışarısı hayal meyal seçilir
const glass = add(cabIn, new THREE.PlaneGeometry(10, 4), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, map: (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgba(226,234,240,0.92)'; g.fillRect(0, 0, 256, 256);
  g.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 26; i++) { const x = srnd() * 256, y = srnd() * 256, r = 18 + srnd() * 46, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }), 0, 4.7, 3.52); glass.visible = false; glass.renderOrder = 4;
add(truck, CG, M(0x2a3d2f), OILB[0], 1.65, OILB[2] - 0.1, 0.26, 0.7, 0.26); add(truck, CG, M(0xffd23f), OILB[0], 1.65, OILB[2] - 0.1, 0.27, 0.14, 0.27); add(truck, CG, M(0x111111), OILB[0], 2.01, OILB[2] - 0.1, 0.2, 0.02, 0.2); // yağ varili
function mkPolice(g) { add(g, BG, M(0xf2f2f2), 0, 0.875, 0, 2.0, 0.85, 4.4); add(g, BG, M(0x1f3a6b), 0, 0.9, 0, 2.03, 0.24, 4.43); add(g, BG, M(0x26364f), 0, 1.575, -0.4, 1.7, 0.55, 1.8); add(g, BG, M(0x222222), 0, 0.75, 2.26, 1.9, 0.5, 0.14);
  for (const x of [-1, 1]) for (const z of [-1.4, 1.4]) add(g, CG, M(0x222222), x, 0.42, z, 0.42, 0.3, 0.42).rotation.z = Math.PI / 2;
  return [add(g, BG, new THREE.MeshBasicMaterial({ color: 0xff2d2d }), 0.36, 1.94, -0.4, 0.62, 0.16, 0.3), add(g, BG, new THREE.MeshBasicMaterial({ color: 0x2d6bff }), -0.36, 1.94, -0.4, 0.62, 0.16, 0.3)]; }
const pol = new THREE.Group(); pol.visible = false; scene.add(pol); const polL = mkPolice(pol);
const crM = CR.map(() => { const g = new THREE.Group(); add(g, BG, M(0xb07a3a), 0, 1.6, 0, 0.6, 0.6, 0.6); add(g, BG, M(0x7a4d28), 0, 1.6, 0, 0.62, 0.1, 0.62); add(g, BG, M(0x7a4d28), 0, 1.6, 0, 0.1, 0.62, 0.62); add(g, BG, M(0x7a4d28), 0, 1.6, 0, 0.62, 0.62, 0.1); truck.add(g); return g; }); // yük sandıkları
const exM = new THREE.Group(); scene.add(exM); add(exM, CG, M(0xd8232a), 0, 0, 0, 0.1, 0.46, 0.1); add(exM, CG, M(0x222222), 0, 0.27, 0, 0.04, 0.1, 0.04); add(exM, BG, M(0x222222), 0, 0.3, 0.09, 0.04, 0.04, 0.2); add(truck, BG, M(0x555555), EXT[0] - 0.14, EXT[1], EXT[2], 0.05, 0.5, 0.3); // söndürücü + askısı
const fireG = new THREE.Group(); fireG.visible = false; truck.add(fireG); const flames = [0xff7a1a, 0xffc21a, 0xff4a1a, 0xffe07a].map((c, i) => add(fireG, new THREE.ConeGeometry(0.28, 0.9, 7), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }), [0, 0.25, -0.22, 0.05][i], 1.75, [0, 0.15, 0.1, -0.22][i]));
add(cabIn, CG, M(0x555555), RAD[0], 1.6, RAD[2], 0.07, 0.6, 0.07); add(cabIn, CG, M(0x3fa7ff), RAD[0], 1.93, RAD[2], 0.13, 0.08, 0.13); // radyatör su kapağı
const steam = Array.from({ length: 6 }, () => add(cabIn, SG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }), 0, 2.3, 4.5, 0.3));
// şoförün sisi: ilerisini örten yatay sis örtüsü (yalnız şoför kamerasında)
const fogS = add(scene, new THREE.PlaneGeometry(600, 300), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, map: (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 1024; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, 'rgba(214,230,244,0)'); gr.addColorStop(0.009, 'rgba(214,230,244,0.98)'); gr.addColorStop(1, 'rgba(214,230,244,1)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 1024); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }), 0, 2.4, 158); fogS.rotation.x = -Math.PI / 2; fogS.visible = false; fogS.renderOrder = 3;
const cam2 = new THREE.PerspectiveCamera(50, 1.6, 1, 400); cam2.position.set(0, 46, 8); cam2.lookAt(0, 0, 72); // yolcunun ileri görüş penceresi
const rainP = (() => { const n = 500, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = srnd() * 50 - 25; pos[i * 3 + 1] = srnd() * 16; pos[i * 3 + 2] = srnd() * 60 - 20; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdfeaf5, size: 0.09, transparent: true, opacity: 0.7, fog: false })); p.visible = false; scene.add(p); return p; })();
const SKY = new THREE.Color(0x9fd4ff), GRAY = new THREE.Color(0x76858f); let rainK = 0;
const tanker = new THREE.Group(); scene.add(tanker);
boxMesh({ a: [-1.2, 0.5, -3.5], b: [1.2, 2.0, 3.5], c: 0xe9e9e9 }, tanker); boxMesh({ a: [-1.2, 0.5, 3.5], b: [1.2, 2.6, 5.2], c: 0x2e6da4 }, tanker);
for (const z of [-2.5, 2.5, 4.4]) for (const x of [-1.02, 1.02]) add(tanker, CG, M(0x222222), x, 0.55, z, 0.55, 0.35, 0.55).rotation.z = Math.PI / 2;
const valve = add(tanker, new THREE.TorusGeometry(0.22, 0.05, 8, 16), M(0xd8432f), 0, 2.3, -2); valve.rotation.x = Math.PI / 2; add(tanker, CG, M(0x555555), 0, 2.15, -2, 0.05, 0.3, 0.05);
const nozzle = add(scene, CG, M(0xffd23f), 0, -5, 0, 0.08, 0.35, 0.08); let hose = null; const hoseMat = M(0x222222);
const pivot = new THREE.Group(), world = new THREE.Group(); pivot.add(world); scene.add(pivot);
add(world, new THREE.PlaneGeometry(900, LEN + 900), M(0x6fae5c), 0, -0.03, LEN / 2).rotation.x = -Math.PI / 2;
{ const pos = [], idx = []; let n = 0; for (let z = -80; z <= LEN + 120; z += 4, n++) { const c = cx(z); pos.push(c + 6.5, 0, z, c - 6.5, 0, z); if (n) { const a = n * 2; idx.push(a - 2, a, a - 1, a - 1, a, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); world.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x4a4d55, side: THREE.DoubleSide }))); }
{ const cnt = Math.floor((LEN + 200) / 9), im = new THREE.InstancedMesh(BG, new THREE.MeshBasicMaterial({ color: 0xffffff }), cnt), o = new THREE.Object3D(); for (let i = 0; i < cnt; i++) { const z = -80 + i * 9; o.position.set(cx(z), 0.02, z); o.scale.set(0.25, 0.02, 3.5); o.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } world.add(im);
  const tr = new THREE.InstancedMesh(new THREE.ConeGeometry(2.2, 7, 7), M(0x2d8a5e), 420); for (let i = 0; i < 420; i++) { const z = srnd() * (LEN + 200) - 60, sd = srnd() < 0.5 ? -1 : 1; o.position.set(cx(z) + sd * (11 + srnd() * 70), 3.5, z); const s = 0.7 + srnd() * 0.9; o.scale.set(s, s, s); o.rotation.y = 0; o.updateMatrix(); tr.setMatrixAt(i, o.matrix); } world.add(tr); }
{ const n = Math.floor((LEN + 200) / 4), rail = new THREE.InstancedMesh(BG, M(0xc9ced6), n * 2), post = new THREE.InstancedMesh(BG, M(0x7d828c), n * 2), o = new THREE.Object3D(); // yol kenarı bariyerleri
  for (let i = 0; i < n; i++) for (let sd = 0; sd < 2; sd++) { const z = -80 + i * 4, x0 = cx(z), x1 = cx(z + 4), off = sd ? -BARR : BARR; o.rotation.set(0, Math.atan2(x1 - x0, 4), 0);
    o.position.set((x0 + x1) / 2 + off, 0.68, z + 2); o.scale.set(0.1, 0.34, Math.hypot(4, x1 - x0) + 0.05); o.updateMatrix(); rail.setMatrixAt(i * 2 + sd, o.matrix);
    o.position.set(x0 + off + (sd ? -0.1 : 0.1), 0.42, z); o.scale.set(0.14, 0.84, 0.14); o.updateMatrix(); post.setMatrixAt(i * 2 + sd, o.matrix); }
  world.add(rail); world.add(post); }
const tex = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const polPark = POLZ.map((z) => { const g = new THREE.Group(); g.position.set(cx(z) - BARR - 1.9, 0, z); g.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); mkPolice(g); world.add(g); // radar: bariyerin dışında bekleyen polis + hız levhası
  const zs = z - 75, xs = cx(zs) + BARR + 0.9; add(world, BG, M(0x888888), xs, 1.3, zs, 0.12, 2.6, 0.12); const lv = add(world, new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ transparent: true, map: tex(128, 128, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 58, 0, 7); c.fill(); c.lineWidth = 13; c.strokeStyle = '#d8232a'; c.stroke(); c.fillStyle = '#111'; c.font = '900 62px system-ui,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('50', 64, 68); }) }), xs, 3.0, zs - 0.08); lv.rotation.y = Math.PI; return g; });
const oilM = Array.from({ length: 5 }, () => { const m = add(world, CG, new THREE.MeshBasicMaterial({ color: 0x15110d, transparent: true, opacity: 0.85 }), 0, 0.03, 0, 2.3, 0.02, 2.9); m.visible = false; return m; });
const obsMesh = OBS.map((o) => { const g = new THREE.Group(); g.position.set(o.x, 0, o.z);
  if (o.gate) { add(g, BG, M(0xd8232a), 0, 0.9, 0, 7.4, 1.8, 0.6); for (const k of [-2.6, -0.85, 0.9, 2.65]) add(g, BG, M(0xffffff), k, 0.9, -0.02, 0.85, 1.8, 0.6); add(g, BG, M(0xffd23f), 0, 2.3, 0, 7.4, 0.5, 0.2);
    for (let k = 1; k <= 9; k++) { const z = o.z - k * 6; add(world, new THREE.ConeGeometry(0.28, 0.75, 8), M(0xff7a1a), cx(z), 0.38, z); } world.add(g); return g; } add(g, BG, M(0xff5a5f), 0, 0.6, 0, 3, 1.2, 0.5); add(g, BG, M(0xffffff), 0, 0.6, 0.02, 1, 1.2, 0.5); world.add(g); return g; });
{ const c = cx(LEN); add(world, BG, M(0x222222), c + 10, 4, LEN, 0.5, 8, 0.5); add(world, BG, M(0x222222), c - 10, 4, LEN, 0.5, 8, 0.5); add(world, BG, M(0xffe14d), c, 7.5, LEN, 20.5, 1.4, 0.4); }
for (const z of BUMP) { const g = new THREE.Group(); g.position.set(cx(z), 0, z); g.rotation.y = Math.atan2(cx(z + 1) - cx(z), 1); for (let k = -3; k <= 3; k++) add(g, BG, M(k % 2 ? 0x222222 : 0xffd23f), k * 1.9, 0.08, 0, 1.9, 0.16, 0.9); world.add(g);
  const zs = z - 35, xs = cx(zs) - 10.4; add(world, BG, M(0x888888), xs, 1.2, zs, 0.12, 2.4, 0.12); const lv = add(world, BG, M(0xffd23f), xs, 2.7, zs, 1.1, 1.1, 0.08); lv.rotation.z = Math.PI / 4; }
// ---------- lobi: kamyoncu barı (oyun başlayana kadar herkes taburede; salon tarafından bakılır) ----------
const bar = new THREE.Scene(); bar.background = new THREE.Color(0x060504); bar.fog = new THREE.FogExp2(0x0b0806, 0.035);
const barCam = new THREE.PerspectiveCamera(50, 1, 0.1, 60);
const MB = (c, o) => new THREE.MeshBasicMaterial({ color: c, ...o });
const glow = (c, op) => MB(c, { transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
const seg = (g, mat, a, b, r) => { const m = new THREE.Mesh(CG, mat); v1.set(a[0], a[1], a[2]); v2.set(b[0], b[1], b[2]); const L = v1.distanceTo(v2); m.position.copy(v1).add(v2).multiplyScalar(0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, v2.sub(v1).divideScalar(L)); g.add(m); return m; };
const quad = (par, mat, a, b, c, d) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3)); g.setIndex([0, 1, 2, 2, 1, 3]); const m = new THREE.Mesh(g, mat); par.add(m); return m; };
bar.add(new THREE.AmbientLight(0x5a5070, 1.9));
const barLamp = [-2.3, 2.3].map((x) => { const l = new THREE.PointLight(0xffa550, 12, 11, 2); l.position.set(x, 2.75, 0.4); bar.add(l);
  add(bar, new THREE.ConeGeometry(0.3, 0.26, 14, 1, true), M(0x1d3a2a, { side: THREE.DoubleSide }), x, 2.95, 0.4); add(bar, SG, MB(0xffe2b0, { fog: false }), x, 2.86, 0.4, 0.07); add(bar, CG, M(0x111111), x, 4.0, 0.4, 0.012, 2, 0.012); return l; });
add(bar, BG, M(0x2a1a10), 0, -0.05, -2, 18, 0.1, 18); add(bar, BG, M(0x1c130d), 0, 2.5, 2.7, 18, 5.2, 0.2); add(bar, BG, M(0x1c130d), -7, 2.5, -2, 0.2, 5.2, 18); add(bar, BG, M(0x1c130d), 7, 2.5, -2, 0.2, 5.2, 18);
for (let z = -6; z < 2.6; z += 0.9) add(bar, BG, M(0x1f130b), 0, 0.003, z, 14, 0.01, 0.03); // döşeme tahtası araları
add(bar, BG, M(0x3a2415), 0, 0.55, 0.45, 12, 1.1, 0.8); add(bar, BG, M(0x7a4d28), 0, 1.13, 0.4, 12.2, 0.06, 1.0); add(bar, CG, M(0xb08a3a), 0, 0.3, -0.05, 0.03, 12, 0.03).rotation.z = Math.PI / 2;
// arka raf: şişeler, neon
add(bar, BG, M(0x24170e), 0, 1.5, 2.45, 9, 3, 0.3); for (const y of [1.45, 2.05, 2.65]) add(bar, BG, M(0x5a3a20), 0, y, 2.25, 8.6, 0.05, 0.3);
{ const BC = [0x2f6b3a, 0x6b3a1a, 0x9a7a2a, 0x3a5a7a, 0x8a2a2a, 0xd8d0b0]; let n = 0; for (const y of [1.45, 2.05]) for (let x = -4; x <= 4; x += 0.36 + srnd() * 0.2) { const c = M(BC[n++ % 6]), hh = 0.26 + srnd() * 0.14; add(bar, CG, c, x, y + 0.03 + hh / 2, 2.22, 0.055, hh, 0.055); add(bar, CG, c, x, y + 0.08 + hh, 2.22, 0.02, 0.12, 0.02); } }
const neon = add(bar, new THREE.PlaneGeometry(4.4, 1.1), MB(0xffffff, { transparent: true, fog: false, map: tex(512, 128, (g, w, h) => { g.font = '900 50px system-ui,Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff2d6f'; g.shadowBlur = 22; g.fillStyle = '#ff8fb3'; for (let i = 0; i < 3; i++) g.fillText('ROAD HOGS BAR', w / 2, h / 2); }) }), 0, 3.5, 2.28); neon.rotation.y = Math.PI;
{ const l = new THREE.PointLight(0xff3070, 7, 8, 2); l.position.set(0, 3.4, 1.6); bar.add(l); }
// yan duvarlarda panjurlu pencereler: ışık sağdan ve soldan vurur
for (const s of [-1, 1]) { const x = s * 6.88, z0 = -3.0, z1 = -0.8;
  add(bar, BG, MB(0xd6e4ff, { fog: false }), x, 2.4, (z0 + z1) / 2, 0.02, 1.6, z1 - z0); add(bar, BG, M(0x0c0907), x - s * 0.04, 2.4, (z0 + z1) / 2, 0.05, 1.6, 0.08);
  for (let k = 0; k < 6; k++) add(bar, BG, M(0x0c0907), x - s * 0.05, 1.72 + k * 0.27, (z0 + z1) / 2, 0.05, 0.11, z1 - z0 + 0.06);
  for (let k = 0; k < 6; k++) { const y = 1.75 + k * 0.26; quad(bar, glow(0xc4d6ff, 0.045), [x, y, z0], [x, y, z1], [x - s * 5.4, y - 2.6, z0 + 0.5], [x - s * 5.4, y - 2.6, z1 + 0.5]); }
  const l = new THREE.DirectionalLight(s < 0 ? 0xbcd0ff : 0xffe0b8, 2.4); l.position.set(s * 6, 3.2, -2); l.target.position.set(0, 1, -0.6); bar.add(l); bar.add(l.target); }
const dust = (() => { const n = 160, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random(), s = i % 2 ? 1 : -1; p[i * 3] = s * (6.8 - u * 5.2); p[i * 3 + 1] = 2.5 - u * 2.5 + rnd(-0.6, 0.6); p[i * 3 + 2] = rnd(-3, -0.6) + u * 0.5; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdde8ff, size: 0.035, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); bar.add(m); return m; })();
// küllük, sigara, duman
add(bar, CG, M(0x8d8d92), 0, 1.18, 0.5, 0.14, 0.04, 0.14); add(bar, CG, M(0xf2ead8), 0.06, 1.22, 0.5, 0.012, 0.17, 0.012).rotation.z = Math.PI / 2 - 0.2; add(bar, SG, MB(0xff6a1a, { fog: false }), 0.145, 1.238, 0.5, 0.017);
const smT = tex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const smoke = Array.from({ length: 20 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smT, transparent: true, depthWrite: false, color: 0xd8d0c8, fog: false })); bar.add(s); return s; });
// ---------- kamyoncu tipi (barda ve oyunda aynı) ----------
const SKIN = [0xd9a37c, 0xc68e63, 0xe0b08f, 0xb97f55], HAIR = [0x2a1c12, 0x111111, 0x6b6b6b, 0x4a2a14];
const leather = new THREE.MeshPhongMaterial({ color: 0x15110d, shininess: 45, specular: 0x3a3028 }), jean = M(0x26344d), dark = M(0x0b0908), steel = M(0x777777);
function faceParts(h, k, sk, col, hr) { // kafa yarıçapı 0.21 kabul edilir; +z yüzün baktığı yön
  add(h, SG, sk, 0, -0.02, 0.2, 0.05); add(h, SG, sk, 0.21, 0, 0, 0.03, 0.06, 0.04); add(h, SG, sk, -0.21, 0, 0, 0.03, 0.06, 0.04);
  if (k % 2) add(h, BG, dark, 0, 0.05, 0.185, 0.34, 0.075, 0.06); // güneş gözlüğü
  else for (const s of [-1, 1]) { add(h, SG, MB(0xffffff), s * 0.08, 0.05, 0.185, 0.035, 0.025, 0.02); add(h, SG, dark, s * 0.08, 0.05, 0.2, 0.016); add(h, BG, hr, s * 0.085, 0.105, 0.195, 0.11, 0.03, 0.04).rotation.z = s * -0.45; }
  if (k === 0 || k === 2) add(h, SG, hr, 0, -0.13, 0.07, 0.2, 0.17, 0.17); // sakal
  add(h, BG, hr, 0, -0.075, 0.2, k % 2 ? 0.24 : 0.16, 0.05, 0.05); // bıyık
  if (k === 0) { add(h, CG, col, 0, 0.17, 0, 0.217, 0.13, 0.217); add(h, BG, col, 0, 0.12, 0.26, 0.28, 0.03, 0.22); } // kep
  else if (k === 2) { add(h, CG, col, 0, 0.13, 0, 0.22, 0.09, 0.22); add(h, SG, col, 0.1, 0.1, -0.22, 0.05); } // bandana
  else if (k === 3) { add(h, CG, M(0x3a2414), 0, 0.14, 0, 0.38, 0.03, 0.38); add(h, CG, M(0x3a2414), 0, 0.24, 0, 0.19, 0.2, 0.19); add(h, CG, col, 0, 0.17, 0, 0.195, 0.04, 0.195); } // kovboy şapkası
}
// Duruşlar (yerel eksen: +z kişinin baktığı yön). ry: gövde dönüşü (0 = bara dönük), hy: kafanın gövdeye göre dönüşü.
const LEG = (s) => [[s * 0.21, 0.87, 0.45], [s * 0.21, 0.36, 0.38]];
const POSE = [
  { ry: Math.PI, z: -0.5, hy: 0.25, lean: -0.1, legs: [[[0.25, 0.5, 0.4], [0.28, 0.08, 0.62]], LEG(-1)], arms: [[[0.53, 1.26, 0.1], [0.46, 1.2, 0.5]], [[-0.6, 1.27, -0.42], [-0.76, 1.22, -0.2]]], mug: [-0.95, -0.75], ball: 1 }, // sırtı barda, bir ayağı yerde, elinde beyzbol topu
  { ry: -Math.PI / 2, z: -0.7, hy: -1.1, lean: 0, legs: [LEG(1), LEG(-1)], arms: [[[0.66, 1.25, 0.02], [0.74, 1.24, 0.3]], [[-0.52, 1.3, 0.12], [-0.25, 1.02, 0.42]]], mug: [0.92, 0.42] }, // yan oturmuş, dirseği tezgâhta, bakıyor
  { ry: 0.5, z: -0.7, hy: 1.75, lean: 0.06, legs: [LEG(1), LEG(-1)], arms: [[[0.54, 1.3, 0.3], [0.28, 1.23, 0.72]], [[-0.54, 1.3, 0.3], [-0.28, 1.23, 0.72]]], mug: [0.3, 1.1] }, // bara dönük, omzunun üstünden bakıyor
  { ry: Math.PI, z: -0.7, hy: 0, lean: 0, legs: [[[0.3, 0.87, 0.42], [0.34, 0.36, 0.36]], [[-0.3, 0.87, 0.42], [-0.34, 0.36, 0.36]]], arms: [[[0.52, 1.3, 0.2], [-0.1, 1.4, 0.42]], [[-0.52, 1.3, 0.2], [0.1, 1.33, 0.44]]], mug: [0.6, -0.95] }, // salona dönük, kollar bağlı
];
function trucker(ci, name) {
  const k = ci % 4, ps = POSE[k], g = new THREE.Group(), sk = M(SKIN[k]), col = M(COL[k]), hr = M(HAIR[k]);
  add(g, CG, M(0x5a1f1a), 0, 0.78, 0, 0.25, 0.08, 0.25); add(g, CG, steel, 0, 0.39, 0, 0.04, 0.78, 0.04); add(g, CG, steel, 0, 0.02, 0, 0.26, 0.04, 0.26); add(g, new THREE.TorusGeometry(0.22, 0.02, 6, 20), steel, 0, 0.33, 0).rotation.x = Math.PI / 2;
  ps.legs.forEach((L, i) => { const s = i ? -1 : 1; seg(g, jean, [s * 0.16, 0.9, 0], L[0], 0.115); seg(g, jean, L[0], L[1], 0.09); add(g, BG, dark, L[1][0], L[1][1] - 0.04, L[1][2] + 0.07, 0.15, 0.11, 0.32); });
  const b = new THREE.Group(); b.position.y = 0.9; b.rotation.x = ps.lean; g.add(b); const Y = -0.9; // gövde kalçadan eğilir
  add(b, SG, leather, 0, 1.4 + Y, -0.03, 0.46, 0.54, 0.37); const belly = add(b, SG, col, 0, 1.2 + Y, 0.15, 0.37, 0.39, 0.33); add(b, BG, dark, 0, 0.98 + Y, 0.3, 0.5, 0.05, 0.12); add(b, BG, M(0xc9a23a), 0, 0.98 + Y, 0.37, 0.1, 0.07, 0.02);
  add(b, CG, sk, 0, 1.88 + Y, 0, 0.11, 0.14, 0.11);
  ps.arms.forEach((A, i) => { const s = i ? -1 : 1, e = [A[0][0], A[0][1] + Y, A[0][2]], hnd = [A[1][0], A[1][1] + Y, A[1][2]]; add(b, SG, leather, s * 0.42, 1.68 + Y, 0, 0.15); seg(b, leather, [s * 0.44, 1.66 + Y, 0], e, 0.115); seg(b, leather, e, hnd, 0.1); add(b, SG, sk, hnd[0], hnd[1], hnd[2] + 0.02, 0.085); });
  const h = new THREE.Group(); h.position.set(0, 2.05 + Y, 0.02); b.add(h); add(h, SG, sk, 0, 0, 0, 0.21, 0.235, 0.21); faceParts(h, k, sk, col, hr);
  add(g, CG, M(0xe9a824, { transparent: true, opacity: 0.85 }), ps.mug[0], 1.25, ps.mug[1], 0.07, 0.18, 0.07); add(g, CG, M(0xffffff), ps.mug[0], 1.355, ps.mug[1], 0.072, 0.035, 0.072);
  const ns = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, fog: false, map: tex(256, 64, (c, w, hh) => { c.font = '900 34px system-ui,Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#000'; c.strokeText(name, w / 2, hh / 2); c.fillStyle = '#' + COL[k].toString(16).padStart(6, '0'); c.fillText(name, w / 2, hh / 2); }) })); ns.position.set(0, 2.62, 0); ns.scale.set(1.3, 0.325, 1); g.add(ns);
  let ball = null; if (ps.ball) { const A = ps.arms[0][1]; ball = new THREE.Group(); ball.userData.y0 = A[1] + Y + 0.125; ball.position.set(A[0], ball.userData.y0, A[2] + 0.02); b.add(ball); add(ball, SG, M(0xf4efe2), 0, 0, 0, 0.045); for (const r of [0.6, -0.6]) add(ball, new THREE.TorusGeometry(0.04, 0.004, 4, 16), M(0xc0392b), 0, 0, 0).rotation.set(r, r, 0); } // beyzbol topu
  g.rotation.y = ps.ry; g.userData = { h, belly, k, ps, ball }; return g;
}
const truckers = new Map(); let barT = 0;
function drawBar(V, dt) {
  barT += dt; const a = innerWidth / innerHeight; if (barCam.aspect !== a) { barCam.aspect = a; barCam.fov = a < 1 ? 70 : 50; barCam.updateProjectionMatrix(); }
  const d = clamp(3.7 / (Math.tan(barCam.fov * Math.PI / 360) * a), 4.7, 12); barCam.position.set(Math.sin(barT * 0.15) * 0.35, 1.75, -0.6 - d); barCam.lookAt(0, 1.25, -0.4);
  const ids = new Set(), mid = (V.p.length - 1) / 2;
  V.p.forEach((p, i) => { ids.add(p.id); let g = truckers.get(p.id); if (!g) { g = trucker(p.c, p.n); truckers.set(p.id, g); bar.add(g); }
    const u = g.userData; g.position.set((mid - i) * 1.7, 0, u.ps.z);
    u.h.rotation.y = u.ps.hy + Math.sin(barT * 0.45 + u.k * 2.1) * 0.22; u.h.rotation.x = 0.08 + Math.sin(barT * 0.3 + u.k) * 0.05; u.belly.scale.z = 0.33 * (1 + Math.sin(barT * 1.6 + u.k) * 0.05);
    if (u.ball) { const t = Math.min(1, ((barT * 0.4) % 1) / 0.72); u.ball.position.y = u.ball.userData.y0 + 1.9 * t * (1 - t); u.ball.rotation.x = t * Math.PI * 2; } }); // topu yavaşça atıp tutar
  for (const [id, g] of truckers) if (!ids.has(id)) { bar.remove(g); truckers.delete(id); }
  smoke.forEach((s, i) => { const u = (barT * 0.22 + i / smoke.length) % 1; s.position.set(0.145 + Math.sin(u * 6 + i) * 0.12 * u + u * 0.15, 1.26 + u * 1.7, 0.5 + Math.cos(u * 4 + i * 2) * 0.08 * u); const z = 0.06 + u * 0.55; s.scale.set(z, z, 1); s.material.opacity = 0.34 * (1 - u) * Math.min(1, u * 10); });
  dust.position.set(Math.sin(barT * 0.13) * 0.15, Math.sin(barT * 0.2) * 0.12, 0);
  neon.material.opacity = Math.sin(barT * 31) > 0.97 || Math.sin(barT * 2.3) > 0.985 ? 0.35 : 1;
  barLamp.forEach((l, i) => (l.intensity = 12 + Math.sin(barT * 9 + i * 3) * 0.5));
  ren.render(bar, barCam);
}
const pm = new Map();
const qY = new THREE.Quaternion(), v3 = new THREE.Vector3();
function limbV(m, a, b, r) { const L = a.distanceTo(b) || 0.01; m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, v3.copy(b).sub(a).divideScalar(L)); }
function playerMesh(ci) { // bardaki kamyoncunun aynısı. Gövde+göbek+kafa tek katı parça (o.body); eller, ayaklar ve uzuvlar fizik noktalarını izler
  const k = ci % 4, g = new THREE.Group(), sk = M(SKIN[k]), col = M(COL[k]), o = { g, s: [], l: [] }, b = (o.body = new THREE.Group()); g.add(b);
  add(b, SG, jean, 0, 0, 0, 0.27, 0.24, 0.25); add(b, SG, leather, 0, 0.42, -0.02, 0.4, 0.46, 0.33); add(b, SG, col, 0, 0.24, 0.16, 0.33, 0.33, 0.29); add(b, BG, col, 0, 0.47, -0.31, 0.34, 0.28, 0.06);
  add(b, CG, sk, 0, 0.86, 0, 0.1, 0.12, 0.1); for (const sd of [-1, 1]) add(b, SG, leather, sd * 0.36, 0.66, 0, 0.14);
  const hd = new THREE.Group(); hd.position.set(0, 1.0, 0.02); hd.scale.setScalar(1.1); add(hd, SG, sk, 0, 0, 0, 0.21, 0.235, 0.21); faceParts(hd, k, sk, col, M(HAIR[k])); b.add(hd);
  [[0.13, sk], [0.13, sk], [0.16, dark], [0.16, dark]].forEach(([r, m]) => o.s.push(add(g, SG, m, 0, 0, 0, r)));
  for (let i = 0; i < 4; i++) o.l.push(add(g, CG, i < 2 ? leather : jean, 0, 0, 0, 1));
  scene.add(g); return o;
}
function limb(m, P, a, b, r) { v1.set(P[a], P[a + 1], P[a + 2]); v2.set(P[b], P[b + 1], P[b + 2]); const L = v1.distanceTo(v2) || 0.01; m.position.copy(v1).add(v2).multiplyScalar(0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(UP, v2.sub(v1).divideScalar(L)); }
// ---- Ses: hepsi WebAudio ile sentezlenir (ses dosyası yok). Oda sahibinden gelen duruma (V) bakarak her istemcide çalar. ----
let AC = null, SND = null, musOn = localStorage.getItem('kk-muz') !== '0';
function initSnd() {
  if (AC) { if (AC.state === 'suspended' && !document.hidden) AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const out = AC.createDynamicsCompressor(); out.connect(AC.destination);
  const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const G = (v, to) => { const g = AC.createGain(); g.gain.value = v; g.connect(to); return g; };
  const F = (type, f, q, to) => { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; };
  const O = (type, f, to) => { const o = AC.createOscillator(); o.type = type; o.frequency.value = f; o.connect(to); o.start(); return o; };
  const N = (to) => { const s = AC.createBufferSource(); s.buffer = nb; s.loop = true; s.connect(to); s.start(); return s; };
  const master = G(0.9, out), mg = G(musOn ? 1 : 0, master), mlp = F('lowpass', 2200, 0.5, mg);
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
function tone(f, t0, dur, vol, type = 'sine', to = SND.master, f2 = 0) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur); g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.connect(g); g.connect(to); o.start(t0); o.stop(t0 + dur + 0.05); }
function burst(t0, dur, vol, type, f, to = SND.master) { const s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain(); s.buffer = SND.nb; s.loop = true; fl.type = type; fl.frequency.value = f; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); s.connect(fl); fl.connect(g); g.connect(to); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05); }
const horn = (t0, dur) => { for (const f of [185, 233]) tone(f, t0, dur, 0.16, 'sawtooth', SND.master, f * 0.985); };
// Müzik: Mi'de 12 ölçülük blues, shuffle. Barda ağır, yolda hızlı.
const BARS = [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], WALK = [0, 0, 4, 4, 7, 7, 9, 7], PENTA = [0, 3, 5, 7, 10, 12, 15], st = (n) => Math.pow(2, n / 12);
function musStep(i, t0, road) {
  const S = SND, e = i % 8, root = BARS[((i / 8) | 0) % 12], bt = 60 / (road ? 128 : 84);
  tone(82.4 * st(root + WALK[e]), t0, bt * 0.5, 0.2, 'triangle', S.mg);
  if (e % 4 === 0) tone(110, t0, 0.14, 0.35, 'sine', S.mg, 42); // kick
  if (e % 4 === 2) { burst(t0, 0.13, road ? 0.16 : 0.09, 'bandpass', 1900, S.mg); for (const n of [4, 10, 14]) tone(164.8 * st(root + n), t0, bt * 0.45, 0.045, road ? 'sawtooth' : 'triangle', S.mlp); } // trampet + akor
  burst(t0, 0.035, e % 2 ? 0.035 : 0.07, 'highpass', 7000, S.mg); // hi-hat
  if (Math.random() < (road ? 0.4 : 0.28)) { const n = PENTA[(Math.random() * PENTA.length) | 0]; tone((road ? 329.6 : 659.3) * st(n), t0, bt * (e % 2 ? 0.3 : 0.6), road ? 0.06 : 0.05, road ? 'square' : 'triangle', S.mlp); } // doğaçlama ezgi
  return bt * (e % 2 ? 0.34 : 0.66);
}
const sm = { fh: 0, ext: 0, dm: 0, drl: 0, s: '', cd: 0, fl: [0, 0, 0, 0], rp: 0, oh: 0, m: '', infl: 0, mode: -1, step: 0, nt: 0 };
function sfx(V, dt) {
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
  set(S.mg.gain, musOn ? (mode ? 1 : 0.9) : 0, 0.1);
  if (mode >= 0 && musOn) { if (sm.nt < now) sm.nt = now + 0.05; while (sm.nt < now + 0.2) sm.nt += musStep(sm.step++, sm.nt, mode); }
}
const RP = {}, cT = { X: 0, Z: 0, th: 0 }, camP = new THREE.Vector3(0, 9.5, -10.5), camL = new THREE.Vector3(0, 1.5, -1); let V = null, camMode = -1, hudT = 0, lastHud = '', cpD = 1, spD = 0, camM = '', camB = 0;
const cabPt = (v, x, y, z) => v.set(x * cpD + (z - HZ) * spD, y, HZ - x * spD + (z - HZ) * cpD); // kabin içindeki nokta → kamyon çerçevesi
function draw(V, dt) {
  const t = V.T, [qs, qx, qz, qhp, qsl, qu, qo] = V.q, ch = t.s === 'run' && (qs === 1 || qs === 2); sfx(V, dt);
  cabG.rotation.y = t.ph; cpD = Math.cos(t.ph); spD = Math.sin(t.ph);
  pol.visible = qs > 0 && t.s !== 'lobby'; pol.position.set(qx, 0, qz); pol.rotation.y = qsl ? pol.rotation.y + dt * 7 : qs === 3 ? 0.6 : 0; { const f = Math.sin(performance.now() / 90) > 0; polL[0].visible = f; polL[1].visible = !f; }
  crM.forEach((g, i) => { const c = V.cr[i]; g.visible = !!c; if (c) g.position.set(c[0], 0, c[1]); });
  exM.position.set(V.x[0], V.x[1], V.x[2]); exM.rotation.x = V.x[3] ? 1.2 : 0;
  fireG.visible = !!V.fr; if (V.fr) { fireG.position.set(V.fr[0], 0, V.fr[1]); const k = 0.45 + V.fr[2] / 180; flames.forEach((f, i) => { const s = k * (0.75 + 0.35 * Math.sin(performance.now() / (70 + i * 23) + i * 2)); f.scale.set(s, s * (1.1 + 0.3 * Math.sin(performance.now() / 50 + i)), s); f.position.y = 1.3 + 0.45 * f.scale.y; }); }
  steam.forEach((m, i) => { const on = t.ht > 70 && t.s === 'run'; m.visible = on; if (on) { const u = (performance.now() / 1400 + i / 6) % 1; m.position.set(Math.sin(i * 2.3) * 0.5, 2.2 + u * 2.6, 4.5 - u * 1.2); m.scale.setScalar(0.2 + u * 0.55); m.material.opacity = 0.55 * (1 - u) * Math.min(1, (t.ht - 70) / 15); } });
  rainK += ((t.rn && t.s === 'run' ? 1 : 0) - rainK) * 0.04; scene.fog.color.copy(SKY).lerp(GRAY, rainK); scene.background.copy(scene.fog.color); scene.fog.near = 70 - 45 * rainK; scene.fog.far = 230 - 140 * rainK;
  rainP.visible = rainK > 0.1; if (rainP.visible) { const a = rainP.geometry.attributes.position; for (let i = 1; i < a.array.length; i += 3) { a.array[i] -= dt * 26; if (a.array[i] < 0) a.array[i] += 16; } a.needsUpdate = true; }
  polPark.forEach((g, i) => (g.visible = !qu[i])); oilM.forEach((m, i) => { const o = V.ol[i]; m.visible = !!o; if (o) m.position.set(o[0], 0.03, o[1]); });
  if (isHost) { cT.X = t.X; cT.Z = t.Z; cT.th = t.th; } else { cT.th += (t.th - cT.th) * 0.25; cT.X += Math.sin(cT.th) * t.v * dt; cT.Z += Math.cos(cT.th) * t.v * dt; cT.X += (t.X - cT.X) * 0.15; cT.Z += (t.Z - cT.Z) * 0.15; if (Math.abs(t.Z - cT.Z) > 30) { cT.X = t.X; cT.Z = t.Z; } }
  pivot.rotation.y = -cT.th; world.position.set(-cT.X, 0, -cT.Z);
  wheels.forEach((w, i) => { w.rotation.x += t.v * dt / 0.55; w.scale.x = w.scale.z = t.fl[i] ? 0.42 : 0.55; w.position.y = t.fl[i] ? 0.42 : 0.55; w.material.color.setHex(t.fl[i] ? 0x8a2a1e : 0x222222); });
  marks.forEach((m, i) => { m.visible = !!t.fl[i] && t.s === 'run'; m.material.opacity = 0.55 + 0.4 * Math.sin(performance.now() / 150); });
  if (V.a) { airTip.position.set(V.a[0], V.a[1], V.a[2]); v2.copy(airTip.position); limbV(airHose, airA, v2, 0.035); }
  if (V.d) { drill.position.set(V.d[0], V.d[1], V.d[2]); drill.rotation.y = V.d[3] ? Math.atan2(V.d[0], 0.6) : 0; v2.copy(drill.position); limbV(drCable, drA, v2, 0.022); if (sm.drl > 0) drBit.rotation.y += dt * 40; }
  SPOT.forEach((p, i) => { const d = t.dm[i], on = d > 0 && t.s === 'run', g = dmgTag[i]; dmgDent[i].visible = d > 0; dmgMark[i].visible = on; dmgMark[i].material.opacity = 0.55 + 0.4 * Math.sin(performance.now() / 150); g.sp.visible = on; if (!on) return; g.sp.material.opacity = 0.65 + 0.35 * Math.sin(performance.now() / 120);
    if (d !== g.v) { g.v = d; const x = g.c.getContext('2d'); x.clearRect(0, 0, 128, 64); x.font = '900 44px system-ui,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#000'; x.strokeText('-' + d, 64, 34); x.fillStyle = '#ff7a4a'; x.fillText('-' + d, 64, 34); g.tx.needsUpdate = true; } });
  hpTag.forEach((g, i) => { const on = !!t.fl[i] && t.s === 'run'; g.sp.visible = on; if (!on) return; const p = Math.floor(t.rp[i] * 100); g.sp.material.opacity = 0.65 + 0.35 * Math.sin(performance.now() / 120);
    if (p !== g.v) { g.v = p; const x = g.c.getContext('2d'); x.clearRect(0, 0, 128, 64); x.font = '900 44px system-ui,Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = '#000'; x.strokeText('%' + p, 64, 34); x.fillStyle = p < 35 ? '#ff5a5f' : p < 70 ? '#ffd23f' : '#7bd389'; x.fillText('%' + p, 64, 34); g.tx.needsUpdate = true; } });
  swheel.rotation.z = -t.st * 2.2; pedG.position.z = 3.1 + t.g * 0.06; pedB.position.z = 3.1 + t.b * 0.06; needle.rotation.z = (t.f / 100 - 0.5) * -2.4;
  obsMesh.forEach((m, i) => (m.visible = !t.oh.includes(i)));
  const [ks, kx, kz, kv] = V.k; tanker.visible = ks > 0; tanker.position.set(kx, 0, kz); valve.rotation.z += kv ? dt * 4 : 0;
  nozzle.visible = ks > 0; nozzle.position.set(V.n[0], V.n[1], V.n[2]);
  if (hose) { scene.remove(hose); hose.geometry.dispose(); hose = null; }
  if (ks > 0) { const a = new THREE.Vector3(kx, 2, kz + 1), b = nozzle.position, pts = []; const sag = Math.max(0.1, (7.5 - a.distanceTo(b)) * 0.18); for (let i = 0; i <= 6; i++) { const u = i / 6; pts.push(a.clone().lerp(b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * sag, 0))); } hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.06, 6), hoseMat); scene.add(hose); }
  const me = V.p.find((p) => p.id === myId), seen = new Set();
  for (const p of V.p) {
    seen.add(p.id); let o = pm.get(p.id); if (!o) { o = playerMesh(p.c); pm.set(p.id, o); if (p.bt) { add(o.body, SG, M(0x111111), 0, 1.03, 0.01, 0.265, 0.3, 0.265); add(o.body, BG, new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, 1.07, 0.25, 0.26, 0.05, 0.05); } RP[p.id] = Float32Array.from(p.P); }
    const P = RP[p.id]; for (let i = 0; i < 21; i++) P[i] = isHost || p.s || Math.abs(p.P[i] - P[i]) > 3 ? p.P[i] : P[i] + (p.P[i] - P[i]) * 0.4;
    o.g.visible = !p.d;
    const B = o.body; B.position.set(P[0], P[1], P[2]); v1.set(P[6] - P[0], P[7] - P[1], P[8] - P[2]); if (v1.lengthSq() < 1e-6) v1.set(0, 1, 0); B.quaternion.setFromUnitVectors(UP, v1.normalize()).multiply(qY.setFromAxisAngle(UP, p.y));
    o.s.forEach((m, k) => m.position.set(P[9 + k * 3], P[10 + k * 3], P[11 + k * 3]));
    for (let k = 0; k < 4; k++) { const sd = k % 2 ? -1 : 1; v1.set(sd * (k < 2 ? 0.38 : 0.15), k < 2 ? 0.62 : -0.04, 0).applyQuaternion(B.quaternion).add(B.position); v2.set(P[9 + k * 3], P[10 + k * 3], P[11 + k * 3]); limbV(o.l[k], v1, v2, k < 2 ? 0.1 : 0.115); }
  }
  for (const [id, o] of pm) if (!seen.has(id)) { scene.remove(o.g); pm.delete(id); delete RP[id]; }
  const seat = camMode >= 0 ? camMode : me ? me.s : 0;
  if (ch) { v1.set(0, 14, -25); v2.set(0, 1, -5.5); } // kovalamaca: kamera uzaklaşır, kamyon ve polis birlikte görünür
  else { v1.set(0, 9.5, -10.5); v2.set(0, 1.5, -1); } // herkes yukarıdan bakar; şoförün ilerisi sisli, yolcunun ileri penceresi var
  { const m = ch ? 'c' : 'n'; if (m !== camM) { if (camM && (m === 'c' || camM === 'c')) camB = 1.6; camM = m; } const k = camB > 0 ? 0.07 : 1; camB -= dt; camP.lerp(v1, k); camL.lerp(v2, k); cam.position.copy(camP); cam.lookAt(camL); }
  glass.visible = false; fogS.visible = seat === 1 && !ch && t.s === 'run'; fogS.position.z = 150 + (t.rn && !t.wp ? 5.8 : 7.6);
  if (t.s === 'lobby') drawBar(V, dt); else ren.render(scene, cam);
  { const pip = seat === 2 && !ch && t.s === 'run', el = $('ileri'); if (pip) { const W = innerWidth, H = innerHeight, w = Math.round(Math.min(340, W * 0.34)), h = Math.round(w * 0.62), x = 12, y = TOUCH ? 150 : 175; fogS.visible = false;
      ren.setScissorTest(true); ren.setViewport(x, H - y - h, w, h); ren.setScissor(x, H - y - h, w, h); cam2.aspect = w / h; cam2.updateProjectionMatrix(); ren.render(scene, cam2); ren.setScissorTest(false); ren.setViewport(0, 0, W, H);
      if (el.style.display !== 'block') el.style.display = 'block'; el.style.width = w + 'px'; el.style.height = h + 'px'; el.style.top = y + 'px'; } else if (el.style.display !== 'none') el.style.display = 'none'; }
  if ((hudT -= dt) > 0) return; hudT = 0.1;
  const dk = $('dok'), pr = t.s === 'lobby' ? 'L' : String(seat); if (dk.dataset.r !== pr) { dk.dataset.r = pr; joy.x = joy.y = 0; for (const k in tb) tb[k] = 0; }
  { const nb = BUMP.find((z) => z > t.Z - 1), d = nb === undefined ? 1e9 : nb - t.Z, el = $('tumsek'), on = t.s === 'run' && seat !== 1 && d < 110 && !ch;
    el.style.display = on ? 'block' : 'none'; if (on) { const hz = t.v > BUMP_V; el.className = hz ? 'hizli' : ''; el.textContent = '⚠ TÜMSEK ' + Math.max(0, Math.round(d)) + ' m' + (hz ? ' — YAVAŞLA! (' + Math.round(BUMP_V * 3.6) + ' km/s altı)' : ' — hız uygun'); } }
  { const el = $('isaret'), sg = t.s === 'run' ? t.sg : 0; el.style.display = sg ? 'block' : 'none'; el.className = seat === 1 ? 'sofor' : ''; el.textContent = ['', '⬅ SOLA', 'SAĞA ➡', '🐢 YAVAŞ'][sg || 0]; }
  const rol = t.s === 'lobby' ? '<b>🍺 KAMYONCU BARI</b><br>Ekip toplanıyor…' : seat === 1 ? '<b>🚚 ŞOFÖRSÜN</b><br>Sis içindesin: yalnız kamyonun burnunu görürsün, yolcuyu dinle!<br>A/D direksiyon · W gaz · S fren · E kalk' : seat === 2 ? '<b>👀 YOLCUSUN</b><br>İlerisini sağdaki pencereden yalnız sen görürsün: şoföre tarif et!<br>A/D sola/sağa işareti · S yavaşla · W silecek · E kalk · T tanker çağır' : '<b>📦 KASADASIN</b><br>WASD yürü · Boşluk zıpla / tutunurken tırman<br>J veya sol tık TUT · K veya sağ tık ŞAPLAK<br>E koltuğa otur · F kullan (vana, yağ, su) · T tanker çağır';
  let af = '';
  if (t.s === 'lobby') af += `<div>Oda kodu: <span class="uyari">${odaKodu}</span> · ${V.p.length}/4 oyuncu</div><div style="font-size:18px">${isHost ? 'Herkes hazırsa ENTER (ya da ekrana çift dokun) ile başlat' : 'Oda sahibinin başlatması bekleniyor'}</div><div style="font-size:16px">Yola çıkınca: şoför koltuğu solda, yolcu sağda. Dolu şoför koltuğunu almak için şoförün kafasına şaplak at!</div>`;
  if (t.s === 'run' && t.cd) af += `<div class="buyuk">${t.cd}</div><div>Yerlerinizi alın, kamyon kalkıyor!</div>`;
  if (t.s === 'over' || t.s === 'win') af += `<div class="buyuk">${t.s === 'win' ? '🏁 BAŞARDINIZ!' : '💥 OYUN BİTTİ'}</div><div>${t.why}</div><div style="font-size:18px">${isHost ? 'ENTER: yeniden' : ''}</div>`;
  if (t.m) af += `<div>${t.m}</div>`;
  let gv = ''; const cap = (s) => s[0].toUpperCase() + s.slice(1), U = TOUCH ? 'KULLAN' : 'F'; // görev listesi: sağda, kısa satırlar
  if (t.s === 'run' && !t.cd) { const hy = V.p.some((p) => p.bt);
    if (ch) gv += `<div class="k">🚓 Polis %${qhp}</div>`;
    else if (seat !== 1) { const i = POLZ.findIndex((z, i) => !qu[i] && z > t.Z - 5), d = i < 0 ? 1e9 : POLZ[i] - t.Z; if (d < 170) gv += `<div${t.v > LIMIT ? ' class="k"' : ''}>🚓 Radar ${Math.max(0, Math.round(d))} m</div>`; }
    if (seat === 2 && !ch) { const g = GATE.find((g) => g.z > t.Z + 4 && g.z < t.Z + 230); if (g) gv += `<div>🚧 ${Math.round(g.z - t.Z)} m ${g.open > 0 ? '⬅ SOL' : 'SAĞ ➡'}</div>`; }
    if (t.sl) gv += `<div class="k">🌡 Motor stop</div>`; else if (t.ht >= 70) gv += `<div>🌡 Hararet %${t.ht}</div>`;
    if (V.fr) gv += `<div class="k">🔥 Yangın</div>`;
    if (hy) gv += `<div class="k">🥷 Haydut</div>`;
    if (t.rn) gv += `<div>🌧 ${seat === 2 ? 'Silecek' + (t.wp ? ' ✓' : TOUCH ? '' : ' (W)') : 'Yağmur'}</div>`;
    if (t.f < 25) gv += `<div class="k">⛽ Yakıt az</div>`;
    if (ks === 2) gv += `<div>⛽ ${V.n[3] ? (kv ? 'Doluyor' : 'Vanayı aç') : 'Hortumu tak'}${V.k[4] > 0 ? ' %' + Math.round(V.k[4] * 100) : ''}</div>`;
    t.fl.forEach((f, i) => { if (f) gv += `<div>🛞 ${cap(WHEEL[i][3])}</div>`; });
    t.dm.forEach((d, i) => { if (d) gv += `<div>🔧 ${cap(SPOT[i][3].replace(' yan', ''))} −${d}</div>`; }); }
  const hp = Math.max(0, 100 - t.dm.reduce((a, b) => a + b, 0)), sl = me && me.st && t.s === 'run' && !t.cd ? me.st : 0, h = rol + af + gv + hp + sl + t.ht + V.cr.join() + Math.round(t.f) + Math.round(t.Z / 10) + Math.round(t.v);
  if (h !== lastHud) { lastHud = h; $('rol').innerHTML = (TOUCH ? rol.split('<br>').slice(0, 2).join('<br>') : rol) + (sl ? `<br><span style="color:${sl <= 15 ? '#ff5a5f' : '#ffe14d'}">⏱ Koltuk fırlatmasına ${(sl / 60) | 0}:${String(sl % 60).padStart(2, '0')}</span>` : '') + (micOk ? '<br>🎙 M: mikrofon aç/kapa' : '<br>🔇 mikrofon yok') + (TOUCH ? '' : '<br>🎵 N: müzik aç/kapa'); $('afis').innerHTML = af; $('gorev').innerHTML = gv; $('afis').className = t.s === 'lobby' ? 'alt' : t.s !== 'run' || t.cd ? 'orta' : ''; $('yakit').firstChild.style.width = t.f + '%'; $('yakit').firstChild.style.background = t.f < 25 ? '#ff5a5f' : '#7bd389'; $('can').firstChild.style.width = hp + '%'; $('can').firstChild.style.background = hp < 35 ? '#ff5a5f' : '#3fa7ff'; $('bilgi').innerHTML = `🔧%${hp} 🌡%${t.ht} 📦${V.cr.filter((c) => c).length}/4<br>${Math.max(0, Math.round(LEN - t.Z))} m · ${Math.round(t.v * 3.6)} km/s`; $('oda').textContent = 'Oda ' + odaKodu; }
}
const fit = () => { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.fov = innerWidth < innerHeight ? 80 : 62; cam.updateProjectionMatrix(); }; addEventListener('resize', fit); fit();

// ---------- girdi ----------
const TOUCH = matchMedia('(pointer:coarse)').matches;
const key = {}, cnt = { p: 0, s: 0, c: 0, w: 0 }, tb = {}, joy = { x: 0, y: 0 }; let mouseL = false;
addEventListener('keydown', (e) => { if (e.repeat || $('menu').style.display !== 'none') return; key[e.code] = 1; if (e.code === 'KeyK') cnt.p++; if (e.code === 'KeyE') cnt.s++; if (e.code === 'KeyT') cnt.c++; if (e.code === 'KeyW') cnt.w++; initSnd(); if (e.code === 'KeyN') { musOn = !musOn; localStorage.setItem('kk-muz', musOn ? '1' : '0'); } if (e.code === 'Enter') hostStart(); if (e.code === 'KeyM' && mic) { const tr = mic.getAudioTracks()[0]; if (tr) tr.enabled = !tr.enabled; } if (DBG && e.code === 'KeyC') camMode = camMode >= 2 ? -1 : camMode + 1; if (e.code === 'Space') e.preventDefault(); });
addEventListener('keyup', (e) => (key[e.code] = 0));
addEventListener('pointerdown', initSnd); ren.domElement.addEventListener('mousedown', (e) => { if (e.button === 0) mouseL = true; else cnt.p++; }); addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; }); addEventListener('contextmenu', (e) => e.preventDefault());
ren.domElement.addEventListener('dblclick', () => matchMedia('(pointer:coarse)').matches && hostStart());
{ const j = $('joy'), nub = j.firstElementChild, mv = (e) => { e.preventDefault(); const r = j.getBoundingClientRect(), t = e.targetTouches[0]; if (!t) { joy.x = joy.y = 0; nub.style.transform = ''; return; } const h = r.width / 2; let x = (t.clientX - r.left - h) / (h * 0.8), y = (t.clientY - r.top - h) / (h * 0.8); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joy.x = x; joy.y = -y; nub.style.transform = `translate(${x * 75}%,${y * 75}%)`; };
  const d = $('dir'), wh = d.lastElementChild, dv = (e) => { e.preventDefault(); const r = d.getBoundingClientRect(), t = e.targetTouches[0]; const x = t ? clamp((t.clientX - r.left - r.width / 2) / (r.width * 0.4), -1, 1) : 0; joy.x = x; joy.y = 0; wh.style.transform = `rotate(${x * 110}deg)`; };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) { j.addEventListener(ev, mv, { passive: false }); d.addEventListener(ev, dv, { passive: false }); }
  for (const b of $('dok').querySelectorAll('b[data-k]')) { const k = b.dataset.k, up = (e) => { e.preventDefault(); b.classList.remove('bas'); tb[k] = 0; }; b.addEventListener('touchstart', (e) => { e.preventDefault(); b.classList.add('bas'); if (k in cnt) cnt[k]++; else tb[k] = 1; }, { passive: false }); b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false }); } }
{ let k = +localStorage.getItem('kk-boy') || 1; const set = () => { k = clamp(Math.round(k * 10) / 10, 0.5, 1.7); $('dok').style.setProperty('--k', k); localStorage.setItem('kk-boy', k); }; set(); // tuş boyutu: A− / A+
  for (const b of $('boy').children) b.addEventListener('touchstart', (e) => { e.preventDefault(); k += b.dataset.z * 0.1; set(); }, { passive: false }); }
const readInput = () => ({ mx: clamp((key.KeyA || key.ArrowLeft ? 1 : 0) - (key.KeyD || key.ArrowRight ? 1 : 0) - joy.x, -1, 1), mz: clamp((key.KeyW || key.ArrowUp ? 1 : 0) - (key.KeyS || key.ArrowDown ? 1 : 0) + joy.y + (tb.ga ? 1 : 0) - (tb.fr ? 1 : 0), -1, 1), sg: tb.sl ? 1 : tb.sr ? 2 : tb.yv ? 3 : 0, j: key.Space || tb.j ? 1 : 0, g: key.KeyJ || mouseL || tb.g ? 1 : 0, u: key.KeyF || tb.u ? 1 : 0, p: cnt.p, s: cnt.s, c: cnt.c, w: cnt.w });
function hostStart() { if (!isHost) return; if (T.state === 'lobby') startGame(); else if (T.state !== 'run') { resetGame(); for (const p of players.values()) { p.seat = 0; p.dead = 0; place(p, rnd(-0.8, 0.8), 1.95, rnd(-4.5, -1.5)); } } }

// ---------- ağ + ses ----------
let peer, isHost = false, myId = '', hostConn = null, odaKodu = '', mic = null, micOk = false; const conns = {};
async function getMic() { try { if (DBG) throw 0; mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); micOk = true; } catch (e) { const ac = new (window.AudioContext || window.webkitAudioContext)(); mic = ac.createMediaStreamDestination().stream; } }
const playAudio = (id, s) => { let a = document.getElementById('au' + id); if (!a) { a = document.createElement('audio'); a.id = 'au' + id; a.autoplay = true; document.body.appendChild(a); } a.srcObject = s; };
const callPeer = (id) => { const c = peer.call(id, mic); if (c) c.on('stream', (s) => playAudio(id, s)); };
const durum = (m) => ($('durum').textContent = m);
function begin() { $('menu').style.display = 'none'; $('hud').style.display = 'block'; let last = performance.now(), acc = 0, fc = 0;
  const frame = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; fc++; const I = readInput();
    if (isHost) { const me = players.get(myId); if (me) me.inp = I; acc += dt; while (acc >= 1 / 60) { simStep(1 / 60); acc -= 1 / 60; } V = snap(); if (fc % 3 === 0) for (const id in conns) if (conns[id].open) conns[id].send(V); }
    else if (hostConn && hostConn.open && fc % 2 === 0) hostConn.send({ t: 'i', ...I });
    if (V && !document.hidden) draw(V, dt); };
  const loop = (now) => { requestAnimationFrame(loop); frame(now); }; requestAnimationFrame(loop);
  // Sekme arka plandayken tarayıcı çizim döngüsünü durdurur; oda sahibi dursa herkes donar. İşçi zamanlayıcısı kısılmaz.
  try { const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),33)'], { type: 'text/javascript' }))); w.onmessage = () => document.hidden && frame(performance.now()); } catch (e) {}
  addEventListener('blur', () => { for (const k in key) key[k] = 0; mouseL = false; }); }
async function go(kod, host) {
  initSnd();
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
if (DBG) window.G = { cx, hitPlayer, CR, FIRE, EX, GATE, RAIN, jolt, get BOT() { return BOT; }, PC, OIL, POLZ, pourOil, eject, T, TKS, NZ, AH, AIR, DH, DRL, SPOT, BLIM, players, OBS, BUMP, key, cnt, startGame, mkPlayer, place, simStep, WHEEL, INLET, get V() { return V; }, set cam(v) { camMode = v; } };
