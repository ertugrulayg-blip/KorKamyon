// Oyun benzetimi: yalnız oda sahibinde çalışır. Kamyon, oyuncular, tanker, polis, yük, yangın, haydut.
import { ASAMA, BOX, BUMP, BUMP_V, HZ, INLET, LEN, LIMIT, OBS, PK, PK2, POLZ, RAIN, SEAT, SEAT_T, TK, WHEEL, box, clamp, cx, rnd } from './world.js';

export let cpc = 1, cps = 0, tX = 0, tZ = 0; // cpc/cps: kabin açısının cos/sin'i
export const toCab = (x, z) => { tX = x * cpc - (z - HZ) * cps; tZ = HZ + x * cps + (z - HZ) * cpc; }, fromCab = (x, z) => { tX = x * cpc + (z - HZ) * cps; tZ = HZ - x * cps + (z - HZ) * cpc; };

// ---------- oyun durumu (yalnız oda sahibinde) ----------
export const players = new Map();
export const T = { X: 0, Z: 0, th: 0, v: 0, steer: 0, fuel: 100, flat: [0, 0, 0, 0], rep: [0, 0, 0, 0], pax: 0, paz: 0, state: 'lobby', t: 0, nextFlat: 30, lv: 1, hedef: 100, ol: {}, egitim: -1, egT: 0, yildiz: 0, dmg: [0, 0, 0, 0], hitCd: 0, phi: 0, oilCd: 0, autoT: 0, heat: 0, stall: false, rain: 0, wipeT: 0, nFire: 60, nBot: 50, ej: [0, 0, 0], ejT: [0, 0, 0], msg: '', msgT: 0, why: '', gas: 0, br: 0, sig: 0 };
export const TKS = { st: 0, x: 3.3, z: -50, valve: 0, vp: 0, t: 0 };
export const NZ = { p: [0, -5, 0], holder: null, hand: 0, dock: false };
export const AIR = [0, 1.8, -5.55], AH = { p: AIR.slice(), holder: null, hand: 0 }; // basınç hortumu: kasanın arkasındaki kompresörden alınır, patlak lastiğe yaklaştırılır
export const BARR = 9.5, BLIM = BARR - 2.05; // bariyerin yol eksenine uzaklığı; kamyon merkezi eksenden en çok BLIM kadar açılabilir
export const DRL = [-0.95, 1.8, -5.55], DH = { p: DRL.slice(), holder: null, hand: 0 }; // tamir matkabı: kompresörün yanındaki sarı kutudan kabloyla çekilir, hasarlı yere tutulur
export const SPOT = [[1.48, 1.6, -1.2, 'sol ön yan'], [-1.48, 1.6, -1.2, 'sağ ön yan'], [1.48, 1.6, -2.8, 'sol arka yan'], [-1.48, 1.6, -2.8, 'sağ arka yan']]; // hasar alan yerler
export const PC = { st: 0, x: 0, z: -45, hp: 100, t: 0, ram: 5, slip: 0, used: [] }; // polis: 0 yok, 1 yaklaşıyor, 2 kovalıyor, 3 saf dışı
export const OILB = [0.95, 1.8, -5.55], OIL = []; // yağ varili (kasanın arkası) ve yola dökülen yağlar (dünya koordinatı)
export const CR = [[0.6, -1.0], [-0.6, -1.0], [0.6, -3.0], [-0.6, -3.0]].map(([x, z]) => ({ x, z, x0: x, z0: z, vx: 0, vz: 0, lost: false, b: box(-0.3, 0.3, 1.3, 1.9, -0.3, 0.3, 'crate', 0xb07a3a) })); // yük sandıkları: sert sürüşte kayar, korkuluğu aşarsa düşer
export const EXT = [-1.2, 1.75, 0.55], EX = { p: EXT.slice(), holder: null, hand: 0 }; // yangın söndürücü (kasanın sağ ön köşesi)
export const FIRE = { on: false, x: 0, z: 0, hp: 0, t: 0 }, FSPOT = [[0.5, -2.0], [-0.5, -0.3], [0, -4.0], [-0.6, -3.3]];
export const RAD = [0, 1.9, 2.95]; // radyatör kapağı: kabinde, koltukların arasında
export let BOT = null; // haydut
export const diff = () => 1.25 - 0.6 * clamp(T.Z / (T.hedef || LEN), 0, 1); // yol ilerledikçe olaylar sıklaşır
export const tutan = (c) => { for (const p of players.values()) if ((p.pin[0] && p.pin[0].b === c.b) || (p.pin[1] && p.pin[1].b === c.b)) return p; return null; };
export const held = (c) => !!tutan(c);
export const jolt = (vx, vz) => { for (const c of CR) if (!c.lost && !held(c)) { const k = 0.55 + Math.random() * 0.45; c.vx += vx * k; c.vz += vz * k; } }; // her sandık biraz farklı savrulur
export const loseCrate = (c, m) => { c.lost = true; c.b.on = false; say(m); };
export const chase = () => PC.st === 1 || PC.st === 2;
export const run0 = () => T.state === 'run';
// Oyun mesajı: kod (ve isteğe bağlı parametre) olarak gönderilir; her oyuncu kendi dilinde görür (dil.js).
// ---------- aşama ve puan ----------
// oyun: oda sahibinin seçtiği aşama ve açılmış en yüksek aşama (tarayıcıda saklanır)
export const oyun = { lv: 1, acik: (() => { try { return Math.max(1, Math.min(ASAMA.length - 1, +localStorage.getItem('kk-acik') || 1)); } catch (e) { return 1; } })() };
oyun.lv = oyun.acik;
export function asamaSec(lv) { if (T.state === 'lobby' && lv >= 0 && lv <= oyun.acik && lv < ASAMA.length) oyun.lv = lv; }
// Puan: her oyuncuya ayrı. k verilirse final tablosundaki sayaç da artar.
export function puan(pl, n, k) { if (!pl || pl.bot || T.state !== 'run') return; pl.puan = (pl.puan || 0) + n; if (k) pl.ist[k] = (pl.ist[k] || 0) + 1; }
const surucu = () => [...players.values()].find((p) => p.seat === 1);
function carpti(ceza = 30) { const d = surucu(); if (d) { puan(d, -ceza, 'carpma'); d.sure.temiz = 0; } }
export const say = (kod, a) => { T.msg = a === undefined ? kod : kod + '|' + a; T.msgT = 3.5; };

export const R = [0.25, 0.3, 0.25, 0.13, 0.13, 0.15, 0.15]; // kalça, göğüs, kafa, sol el, sağ el, sol ayak, sağ ayak
export const OFF = [[0, 0, 0], [0, 0.4, 0], [0, 0.76, 0], [0.35, 0.2, 0], [-0.35, 0.2, 0], [0.15, -0.5, 0], [-0.15, -0.5, 0]];
export function place(pl, x, y, z) { for (let k = 0; k < 7; k++) { pl.P[k * 3] = x + OFF[k][0]; pl.P[k * 3 + 1] = y + OFF[k][1]; pl.P[k * 3 + 2] = z + OFF[k][2]; } pl.Q.set(pl.P); pl.pin = [null, null]; pl.offT = 0; }
export function mkPlayer(id, name) {
  const used = [...players.values()].map((p) => p.ci);
  const pl = { puan: 0, ist: {}, sure: { surus: 0, yolcu: 0, temiz: 0, enTemiz: 0 }, id, name, ci: [0, 1, 2, 3].find((i) => !used.includes(i)) ?? 0, P: new Float32Array(21), Q: new Float32Array(21), seat: 0, yaw: 0, inp: {}, pin: [null, null], arm: 0.7, gndT: 0, jumpT: 0, stun: 0, punchT: 0, punchCd: 0, punchH: 0, hitDone: true, phase: 0, dead: 0, offT: 0, seatT: 0, seatCd: 0, oilT: 0, onPol: false, lw: 0, lp: 0, ls: 0, lc: 0, lj: false };
  place(pl, rnd(-0.8, 0.8), 1.95, rnd(-4.5, -1.5)); players.set(id, pl); return pl;
}
export function poseSeat(pl) {
  const s = SEAT[pl.seat], P = pl.P, d = pl.seat === 1, set = (k, x, y, z) => { P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z; };
  set(0, s[0], s[1], s[2]); set(1, s[0], s[1] + 0.4, s[2] + 0.04); set(2, s[0], s[1] + 0.76, s[2] + 0.06);
  set(3, s[0] + 0.22, d ? 2.05 : s[1] + 0.25, s[2] + (d ? 0.85 : 0.45)); set(4, s[0] - 0.22, d ? 2.05 : s[1] + 0.25, s[2] + (d ? 0.85 : 0.45));
  set(5, s[0] + 0.15, 1.45, s[2] + 0.7); set(6, s[0] - 0.15, 1.45, s[2] + 0.7);
  for (let i = 0; i < 21; i += 3) { fromCab(P[i], P[i + 2]); P[i] = tX; P[i + 2] = tZ; } pl.Q.set(P); pl.yaw = T.phi;
}
export const d3 = (A, i, B, j) => Math.hypot(A[i] - B[j], A[i + 1] - B[j + 1], A[i + 2] - B[j + 2]);
export function stick(P, a, b, L, wa, rope) {
  const i = a * 3, j = b * 3, dx = P[j] - P[i], dy = P[j + 1] - P[i + 1], dz = P[j + 2] - P[i + 2], d = Math.hypot(dx, dy, dz) || 1e-6;
  if (rope && d <= L) return; const k = (d - L) / d, wb = 1 - wa;
  P[i] += dx * k * wa; P[i + 1] += dy * k * wa; P[i + 2] += dz * k * wa; P[j] -= dx * k * wb; P[j + 1] -= dy * k * wb; P[j + 2] -= dz * k * wb;
}
export const N = [0, 0, 0];
export function collide(P, i, r) {
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
export function dropNozzle() {
  const h = players.get(NZ.holder); NZ.holder = null;
  if (TKS.st === 2 && Math.hypot(NZ.p[0] - INLET[0], NZ.p[1] - INLET[1], NZ.p[2] - INLET[2]) < 0.9) { NZ.dock = true; say('hortumTak'); puan(h, 30, 'yakit'); }
}
export function unseat(q) { const s = SEAT[q.seat]; q.seat = 0; place(q, s[0], 2.1, 0.5); }
export function eject(q) { const s = q.seat; T.ej[s]++; T.ejT[s] = 3.9; unseat(q); for (let i = 0; i < 21; i += 3) { q.P[i + 1] += 0.5; q.Q[i] = q.P[i]; q.Q[i + 1] = q.P[i + 1] - 0.13; q.Q[i + 2] = q.P[i + 2] + 0.045; } q.stun = 1.2; q.seatCd = 3.9; puan(q, -10, 'firlama'); /* koltuk yerine düşünce (3,9 sn) herkes oturabilir */ say('firladi', q.name); }
export function pourOil(pl) { T.oilCd = 6; const z = -8.5; OIL.push([r2(T.X + z * Math.sin(T.th)), r2(T.Z + z * Math.cos(T.th))]); if (OIL.length > 5) OIL.shift();
  if (PC.st === 2 && PC.slip <= 0) { PC.slip = 3; PC.hp -= 35; PC.ram = 4.5; PC.son = pl; puan(pl, 40, 'polis'); say('yagKaydi', pl.name); } else say('yag', pl.name); }
export function hitPlayer(a, q, fx, fz) {
  if (a.bot && q.seat) return;
  if (q.bot) { q.hits++; puan(a, 5); if (q.hits === 3) puan(a, 50, 'haydut'); for (let i = 0; i < 21; i += 3) { q.Q[i] -= fx * 0.055 * q.hits; q.Q[i + 1] -= 0.035 * q.hits; q.Q[i + 2] -= fz * 0.055 * q.hits; } q.stun = 1; q.stealT = 0; q.pin = [null, null]; if (q.hits >= 3 && !(q.outT > 0)) { for (let i = 0; i < 21; i += 3) { q.Q[i] -= fx * 0.2; q.Q[i + 1] -= 0.14; q.Q[i + 2] -= fz * 0.2; } q.outT = 1.3; say('haydutUctu'); } return; } // her şaplakta daha uzağa savrulur
  if (q.seat) { const was = q.seat; unseat(q); q.stun = 0.9; if (was === 1) { if (NZ.holder === a.id) dropNozzle(); a.seat = 1; a.seatT = 0; a.pin = [null, null]; say('direksiyon', a.name); } return; }
  q.Q[6] -= fx * 0.22; q.Q[8] -= fz * 0.22; q.Q[7] -= 0.05; q.Q[3] -= fx * 0.1; q.Q[5] -= fz * 0.1; q.stun = 0.7; q.pin = [null, null]; if (NZ.holder === q.id) dropNozzle();
}
export function stepPlayer(pl, dt) {
  const P = pl.P, Q = pl.Q, I = pl.inp;
  if (I.c !== undefined && I.c !== pl.lc) { pl.lc = I.c; if (T.state === 'run' && pl.seat !== 2) say('tankerYolcu'); else if (T.state === 'run' && TKS.st === 0) { /* tanker: yalnız yolcu */ if (T.fuel >= 50) say('tankerDolu'); else { puan(pl, 10); TKS.st = 1; TKS.z = -50; TKS.x = 3.3; TKS.valve = 0; say('tankerCagirdi', pl.name); } } }
  if (pl.dead > 0) { pl.dead -= dt; if (pl.dead <= 0) place(pl, rnd(-0.8, 0.8), 4, rnd(-4.5, -1.5)); return; }
  if (I.s !== undefined && I.s !== pl.ls) {
    pl.ls = I.s;
    if (pl.seat) unseat(pl);
    else if (pl.seatCd <= 0) for (const s of [1, 2]) { fromCab(SEAT[s][0], SEAT[s][2]); if (!(T.ejT[s] > 0) && ![...players.values()].some((q) => q.seat === s) && Math.hypot(P[0] - tX, P[2] - tZ) < 1.4 && P[1] > 1.5) { pl.seat = s; pl.seatT = 0; pl.pin = [null, null]; if (NZ.holder === pl.id) dropNozzle(); break; } }
  }
  pl.seatCd -= dt;
  if (pl.seat) { if (T.state === 'run' && !(T.cd > 0) && !chase()) pl.seatT += dt; if (pl.seatT >= SEAT_T) eject(pl); else { poseSeat(pl); return; } } // koltukta 30 saniyeden fazla kalan fırlar
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
  const tutDuvar = (k) => pl.pin[k] && pl.pin[k].b && pl.pin[k].b.tag !== 'crate', hold = stand && (tutDuvar(0) || tutDuvar(1)) ? 0 : 1; // kasaya tutunup ayakta duran yürümez; sandık tutan taşıyarak yürür
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
    // sandık: elin yakınındaysa yakalanır (fizik eli kutudan ittiği için çarpışmayı beklemeden)
    { const x = P[i], y = P[i + 1], z = P[i + 2]; let al = null;
      for (const c of CR) { if (c.lost) continue; const b = c.b, dx = x - clamp(x, b.a[0] + b.o[0], b.b[0] + b.o[0]), dy = y - clamp(y, b.a[1] + b.o[1], b.b[1] + b.o[1]), dz = z - clamp(z, b.a[2] + b.o[2], b.b[2] + b.o[2]); if (Math.hypot(dx, dy, dz) < R[3] + 0.16) { al = b; break; } }
      if (al) { pl.pin[h] = { b: al, p: [x - al.o[0], y - al.o[1], z - al.o[2]] }; continue; } }
    for (const q of players.values()) { if (q === pl || q.seat || q.dead > 0) continue; for (const k of [1, 0, 2]) if (d3(P, i, q.P, k * 3) < R[k] + 0.2) { pl.pin[h] = { q, k }; break; } if (pl.pin[h]) break; }
  }
  for (let h = 0; h < 2; h++) { const pin = pl.pin[h]; if (pin && (d3(P, 3, P, 9 + h * 3) > 1.35 || (pin.b && !pin.b.on) || (pin.q && (pin.q.seat || pin.q.dead > 0)))) pl.pin[h] = null; }
  if (pl.punchT > 0 && !pl.hitDone) { const i = 9 + pl.punchH * 3; for (const q of players.values()) if (q !== pl && q.dead <= 0 && d3(P, i, q.P, 6) < 0.48) { pl.hitDone = true; hitPlayer(pl, q, fx, fz); break; } }
  if (I.u && !st && T.state === 'run' && Math.hypot(P[3] - OILB[0], P[5] - OILB[2]) < 1.7) { pl.oilT += dt; if (pl.oilT > 0.5 && T.oilCd <= 0) { pl.oilT = 0; pourOil(pl); } } else pl.oilT = 0; // yağ varili
  if (I.u && !st) { fromCab(RAD[0], RAD[2]); if (Math.hypot(P[3] - tX, P[5] - tZ) < 1.7) { T.heat = Math.max(0, T.heat - dt * 30); T.sogutan = pl; T.coolT = 0.3; } }
  if (I.u && !st) {
    if (TKS.st === 2 && Math.hypot(P[3] - TKS.x, P[4] - 2.3, P[5] - (TKS.z - 2)) < 1.4) { TKS.vp += dt / 1.2; if (TKS.vp >= 1) { TKS.vp = 0; TKS.valve = 25; say('vanaAcildi'); puan(pl, 30, 'yakit'); } }
  }
  pl.offT = P[1] < 0.7 ? pl.offT + dt : 0;
  // kasanın dışına taşmış ama düşmemiş (ayağı korkuluğa takılmış): tutunmuyorsa kısa sürede düşmüş sayılır ve kasaya geri gelir
  const tankerde = TK.on && Math.abs(P[0] - TKS.x) < 1.5 && P[2] > TKS.z - 3.9 && P[2] < TKS.z + 5.4 && P[1] > 1.2; // tankerin üstünde durmak serbest (vana)
  const disari = (Math.abs(P[0]) > 1.62 || P[2] < -6.25 || P[2] > 5.6) && !tankerde, tutunuyor = pl.pin[0] || pl.pin[1];
  pl.disT = disari && !tutunuyor && !pl.seat && !pl.onPol ? (pl.disT || 0) + dt : 0; if (pl.disT > 1.2) pl.offT = 99;
  if (pl.offT > 2.5 || P[2] < -16 || P[2] > 14 || Math.abs(P[0]) > 12) { pl.dead = 2; pl.pin = [null, null]; if (NZ.holder === pl.id) dropNozzle(); if (T.state === 'run') { say('dustu', pl.name); puan(pl, -25, 'dusme'); } }
}
export function stepAir(dt) {
  const h = AH.holder && players.get(AH.holder);
  if (AH.holder && (!h || h.dead > 0 || h.seat || h.stun > 0 || !h.inp.g)) AH.holder = null; // TUT bırakılınca hortum da bırakılır
  if (AH.holder) { const i = 9 + AH.hand * 3; AH.p = [h.P[i], h.P[i + 1], h.P[i + 2]]; if (Math.hypot(AH.p[0] - AIR[0], AH.p[2] - AIR[2]) > 9.5) { AH.holder = null; say('havaKurtuldu'); } }
  else for (let k = 0; k < 3; k++) AH.p[k] += (AIR[k] - AH.p[k]) * Math.min(1, dt * 5); // makaraya geri sarar
  if (AH.holder && T.state === 'run') for (let w = 0; w < 4; w++) if (T.flat[w] && Math.hypot(AH.p[0] - WHEEL[w][0], AH.p[2] - WHEEL[w][2]) < 2.0) { T.rep[w] += dt / 5; if (T.rep[w] >= 1) { T.flat[w] = 0; T.rep[w] = 0; say('lastikSisirdi', h.name); puan(h, 50, 'lastik'); } }
  const dh = DH.holder && players.get(DH.holder);
  if (DH.holder && (!dh || dh.dead > 0 || dh.seat || dh.stun > 0 || !dh.inp.g)) DH.holder = null;
  if (DH.holder) { const i = 9 + DH.hand * 3; DH.p = [dh.P[i], dh.P[i + 1], dh.P[i + 2]]; if (Math.hypot(DH.p[0] - DRL[0], DH.p[2] - DRL[2]) > 9.5) { DH.holder = null; say('matkapKurtuldu'); } }
  else for (let k = 0; k < 3; k++) DH.p[k] += (DRL[k] - DH.p[k]) * Math.min(1, dt * 5); // kablo geri sarar
  if (DH.holder && T.state === 'run') for (let w = 0; w < 4; w++) if (T.dmg[w] > 0 && Math.hypot(DH.p[0] - SPOT[w][0], DH.p[2] - SPOT[w][2]) < 1.5) { T.dmg[w] = Math.max(0, T.dmg[w] - dt * 7); if (!T.dmg[w]) { say('hasarOnardi', dh.name); puan(dh, 40, 'hasar'); } }
}
export function yanginCikar() { const f = FSPOT[(Math.random() * FSPOT.length) | 0]; Object.assign(FIRE, { on: true, x: f[0], z: f[1], hp: 100, t: 0 }); say('yangin'); }
export function haydutGetir() { if (BOT) return; BOT = mkPlayer('haydut', 'HAYDUT'); Object.assign(BOT, { bot: true, ci: 5, stealT: 0, pt: 1, pc: 0, hits: 0 }); place(BOT, rnd(-0.6, 0.6), 3.2, -4.5); say('haydutGeldi'); }
export const haydutVar = () => !!BOT;
export function stepExtras(dt) {
  const run = T.state === 'run' && !(T.cd > 0);
  // söndürücü
  const eh = EX.holder && players.get(EX.holder);
  if (EX.holder && (!eh || eh.dead > 0 || eh.seat || eh.stun > 0 || !eh.inp.g)) EX.holder = null;
  if (EX.holder) { const i = 9 + EX.hand * 3; EX.p = [eh.P[i], eh.P[i + 1], eh.P[i + 2]]; } else for (let k = 0; k < 3; k++) EX.p[k] += (EXT[k] - EX.p[k]) * Math.min(1, dt * 5);
  // yangın
  if (FIRE.on) { FIRE.t += dt; const w = (FIRE.x > 0 ? 0 : 1) + (FIRE.z < -2 ? 2 : 0); if (run) T.dmg[w] += dt * 1.3;
    if (FIRE.t > 22) { FIRE.t = 8; const c = CR.filter((c) => !c.lost).sort((a, b) => Math.hypot(a.x - FIRE.x, a.z - FIRE.z) - Math.hypot(b.x - FIRE.x, b.z - FIRE.z))[0]; if (c && run) loseCrate(c, 'sandikYandi'); }
    if (EX.holder && Math.hypot(EX.p[0] - FIRE.x, EX.p[2] - FIRE.z) < 1.8) { FIRE.hp -= dt * 34; if (FIRE.hp <= 0) { FIRE.on = false; T.nFire = rnd(55, 85) * diff(); say('yanginSondu', eh.name); puan(eh, 60, 'yangin'); } }
    if (!run) FIRE.on = false; }
  else if (run && T.ol.yangin && !BOT && !chase() && !T.stall) { T.nFire -= dt; if (T.nFire <= 0) { yanginCikar(); } }
  // yük sandıkları
  const mu = T.rain ? 2.0 : 2.8; // sürtünme: sandıklar ağır, kolay kaymaz
  for (const c of CR) { if (c.lost) continue;
    const ta = tutan(c);
    if (ta && !ta.seat && ta.dead <= 0) { // taşınıyor: oyuncunun önünde, biraz yukarıda
      const tx = ta.P[3] + Math.sin(ta.yaw) * 0.78, tz = ta.P[5] + Math.cos(ta.yaw) * 0.78, k = Math.min(1, dt * 9);
      puan(ta, dt); c.x += (tx - c.x) * k; c.z += (tz - c.z) * k; c.lift = Math.min(0.35, (c.lift || 0) + dt * 1.5); c.vx = c.vz = 0;
    } else c.lift = Math.max(0, (c.lift || 0) - dt * 2.5); // bırakılınca yere iner
    if (ta || !run) c.vx = c.vz = 0;
    else { const ax = clamp(T.pax, -4.5, 4.5), az = clamp(T.paz, -4.5, 4.5), // ani sıçramalar yükü tümden savurmasın
      sp = Math.hypot(c.vx, c.vz); if (sp < 0.05 && Math.hypot(ax, az) < mu) c.vx = c.vz = 0; else { c.vx += ax * dt; c.vz += az * dt; const s2 = Math.hypot(c.vx, c.vz), f = Math.min(s2, mu * 0.85 * dt); if (s2 > 0) { c.vx -= (c.vx / s2) * f; c.vz -= (c.vz / s2) * f; } } }
    c.x += c.vx * dt; c.z += c.vz * dt;
    for (const o of CR) if (o !== c && !o.lost && Math.abs(o.x - c.x) < 0.62 && Math.abs(o.z - c.z) < 0.62) { if (Math.abs(o.x - c.x) > Math.abs(o.z - c.z)) { c.x = o.x + Math.sign(c.x - o.x || 1) * 0.62; c.vx *= 0.3; } else { c.z = o.z + Math.sign(c.z - o.z || 1) * 0.62; c.vz *= 0.3; } }
    if (c.z < -4.8) { c.z = -4.8; c.vz = 0; } if (c.z > 0.55) { c.z = 0.55; c.vz = 0; }
    if (Math.abs(c.x) > 1.05) { if (Math.abs(c.vx) > 2.6) loseCrate(c, 'sandikDustu'); else { c.x = Math.sign(c.x) * 1.05; c.vx *= -0.25; } } // korkuluğa yavaş çarpan sandık geri seker
    c.b.o[0] = c.x; c.b.o[1] = c.lift || 0; c.b.o[2] = c.z; c.b.on = !c.lost; }
  if (run && T.egitim < 0 && !CR.some((c) => !c.lost)) { T.state = 'over'; T.why = 'yukDokuldu'; }
  // haydut: kasaya atlar, sandıkları aşağı atar; şaplakla kovulur
  if (BOT && (BOT.dead > 0 || !run)) { players.delete(BOT.id); BOT = null; T.nBot = rnd(50, 75) * diff(); }
  if (!BOT) { if (run && T.ol.haydut && !chase() && !FIRE.on) { T.nBot -= dt; if (T.nBot <= 0 && CR.some((c) => !c.lost)) { haydutGetir(); } } }
  else if (BOT.outT > 0) { BOT.outT -= dt; BOT.stun = 1; BOT.inp = {}; if (BOT.outT <= 0) BOT.dead = 1; }
  else { const B = BOT, c = CR.filter((c) => !c.lost).sort((a, b) => Math.hypot(a.x - B.P[0], a.z - B.P[2]) - Math.hypot(b.x - B.P[0], b.z - B.P[2]))[0]; B.pt -= dt;
    let tx = c ? c.x : 3, tz = c ? c.z : B.P[2], near = 0.8;
    const v = [...players.values()].find((q) => q !== B && !q.seat && q.dead <= 0 && Math.hypot(q.P[0] - B.P[0], q.P[2] - B.P[2]) < 1.1);
    if (v && B.pt <= 0.5) { tx = v.P[0]; tz = v.P[2]; near = 0.3; if (B.pt <= 0) { B.pc++; B.pt = 1.6; } }
    const dx = tx - B.P[0], dz = tz - B.P[2], d = Math.hypot(dx, dz) || 1; B.inp = { mx: d > near ? dx / d : dx / d * 0.05, mz: d > near ? dz / d : dz / d * 0.05, p: B.pc };
    if (c && Math.hypot(c.x - B.P[0], c.z - B.P[2]) < 1.0 && B.stun <= 0) { B.stealT += dt; if (B.stealT > 7) { B.stealT = 0; loseCrate(c, 'sandikAtti'); } } else B.stealT = Math.max(0, B.stealT - dt); }
}
export function stepPolice(dt) {
  const S = PC, run = T.state === 'run' && !(T.cd > 0), px = S.x, pz = S.z; T.oilCd -= dt; T.ejT[1] -= dt; T.ejT[2] -= dt;
  if (run && T.ol.polis && S.st === 0) for (let i = 0; i < POLZ.length; i++) if (!S.used[i] && T.Z > POLZ[i] - 45 && T.Z < POLZ[i] + 5 && T.v > LIMIT) { S.used[i] = 1; { const d = surucu(); if (d) puan(d, -20, 'ceza'); } Object.assign(S, { st: 1, x: -2.5, z: -45, hp: 100, t: 0, ram: 5, slip: 0, geri: 0, darbe: 0 }); say('polisGeldi'); break; }
  if (S.st === 1) { S.z += dt * 9; S.x -= S.x * Math.min(1, dt); if (S.z >= -9.4) { S.z = -9.4; S.st = 2; say('polisArkada'); } }
  else if (S.st === 2) { S.t += dt; S.geri = Math.max(0, S.geri - dt * 1.2); S.darbe = Math.max(0, S.darbe - dt * 2.2); // darbe: üstüne atlanınca araç çöker, yavaşlayıp geride kalır
    if (S.slip > 0) { S.slip -= dt; S.z += (-24 - S.z) * Math.min(1, dt * 2.5); } // yağda kayıp geride kalır
    else { const lunge = S.ram < 0.35; S.z += (-9.4 - S.geri + (lunge ? 1.25 : 0) - S.z) * Math.min(1, dt * (lunge ? 9 : 2.2)); S.x += (Math.sin(S.t * 0.7) * 1.3 - S.x) * Math.min(1, dt * 2); S.ram -= dt;
      if (S.ram <= 0 && S.z > -8.5) { S.ram = rnd(5, 8); T.dmg[S.x > 0 ? 2 : 3] += 6; say('polisVurdu'); jolt(0, -1.3); for (const p of players.values()) if (!p.seat) for (let i = 2; i < 21; i += 3) p.Q[i] += 0.06; } }
    for (const p of players.values()) { const inB = !p.seat && p.dead <= 0 && Math.abs(p.P[0] - px) < 1.3 && Math.abs(p.P[2] - pz) < 2.5 && p.P[2] < -6.3 && p.P[1] > 1.3 && p.P[1] < 3.6, on = inB && p.gndT > 0;
      if (inB && S.slip <= 0) for (let i = 0; i < 21; i += 3) { p.P[i] += S.x - px; p.Q[i] += S.x - px; p.P[i + 2] += S.z - pz; p.Q[i + 2] += S.z - pz; } // üstündeki oyuncuyu taşır (yağda kayarken taşımaz: düşer)
      if (on) { S.hp -= dt * 5; S.geri = Math.max(S.geri, 1.2); if (p.airT > 0.2) { S.hp -= 12; S.geri = Math.min(7, S.geri + 3); S.darbe = 1; S.ram = Math.max(S.ram, 2.5); say('polisAtladi', p.name); PC.son = p; puan(p, 25, 'polis'); } } // üstünde biri varken ağırlaşır, atlayınca frenler
      p.airT = p.gndT > 0 ? 0 : (p.airT || 0) + dt; p.onPol = on; }
    if (S.hp <= 0 || !run) { S.st = 3; T.autoT = Math.max(T.autoT, 12); if (run) { say('polisBitti'); puan(S.son, 50); } } }
  else if (S.st === 3) { S.z -= dt * 10; if (S.z < -60) S.st = 0; }
  PK.on = PK2.on = S.st > 0; PK.o[0] = PK2.o[0] = S.x; PK.o[2] = PK2.o[2] = S.z;
}
export function stepTanker(dt) {
  const S = TKS;
  if (S.st === 1) { S.z += dt * 7; if (S.z >= 0) { S.z = 0; S.st = 2; S.t = 0; say('tankerGeldi'); } }
  else if (S.st === 2) { S.t += dt; S.z = Math.sin(S.t * 0.5) * 0.5; S.x = 3.3; S.valve -= dt; if (NZ.dock && S.valve > 0) T.fuel = Math.min(100, T.fuel + 14 * dt); if (T.fuel >= 100 || S.t > 75) { S.st = 3; NZ.dock = false; NZ.holder = null; say('tankerGidiyor'); } }
  else if (S.st === 3) { S.z -= dt * 6; if (S.z < -50) S.st = 0; }
  TK.on = S.st > 0; TK.o[0] = S.x; TK.o[2] = S.z;
  const h = NZ.holder && players.get(NZ.holder);
  if (NZ.holder) {
    if (!h || h.dead > 0 || h.seat || S.st !== 2) NZ.holder = null;
    else { const i = 9 + NZ.hand * 3; NZ.p = [h.P[i], h.P[i + 1], h.P[i + 2]]; if (Math.hypot(NZ.p[0] - S.x, NZ.p[1] - 2, NZ.p[2] - (S.z + 1)) > 7.5) { NZ.holder = null; say('yakitKurtuldu'); } }
  }
  if (!NZ.holder) NZ.p = NZ.dock ? INLET.slice() : [S.x - 1.3, 2.2, S.z + 1];
}
export function stepTruck(dt) {
  const y = [...players.values()].find((p) => p.seat === 2), yi = y ? y.inp : null; // yolcunun şoföre işareti: 1 sol, 2 sağ, 3 yavaş
  T.sig = yi ? yi.sg || ((yi.mx || 0) > 0.5 ? 1 : (yi.mx || 0) < -0.5 ? 2 : (yi.mz || 0) < -0.5 ? 3 : (yi.mz || 0) > 0.5 ? 4 : 0) : 0; // 1 sol, 2 sağ, 3 yavaş, 4 hızlan
  if (T.state === 'lobby') { T.v = 0; T.pax = T.paz = 0; return; }
  if (T.state === 'run' && T.cd > 0) { T.cd -= dt; T.v = 0; T.pax = T.paz = 0; T.gas = T.br = 0; if (T.cd > 0) return; T.cd = 0; T.v = 8; say('yolaCiktiniz'); } // başlangıç geri sayımı: kamyon bekler
  T.t += dt; T.msgT -= dt; T.wipeT -= dt; T.rain = run0() && RAIN.some(([a, b]) => T.Z > a && T.Z < b) ? 1 : 0;
  const d = [...players.values()].find((p) => p.seat === 1), run = T.state === 'run';
  if (run && !(T.cd > 0)) { // süre puanları: sürüş (2/sn), yolculuk (1/sn), en uzun çarpmasız sürüş
    if (d && T.v > 2) { d.sure.surus += dt; d.sure.temiz += dt; d.sure.enTemiz = Math.max(d.sure.enTemiz, d.sure.temiz); puan(d, dt * 2); }
    const y = [...players.values()].find((p) => p.seat === 2); if (y) { y.sure.yolcu += dt; puan(y, dt); } }
  let si = d ? clamp(d.inp.mx || 0, -1, 1) : 0, gas = d && run ? Math.max(0, d.inp.mz || 0) : 0, br = d ? Math.max(0, -(d.inp.mz || 0)) : run ? 0 : 1;
  T.autoT -= dt; const auto = run && (chase() || (T.autoT > 0 && !d)); // kovalamaca bitince şoför koltuğa dönene dek (en çok 12 sn) sürmeye devam eder
  // polis kovalarken kamyon kendi gider: yolu izler, engelden kaçar
  if (auto) { const ob = OBS.find((o) => !o.hit && o.z > T.Z + 3 && o.z < T.Z + 70), off = ob ? (ob.x - cx(ob.z) > 0 ? -3.6 : 3.6) : 0;
    si = clamp((Math.atan2(cx(T.Z + 16) + off - T.X, 16) - T.th - T.phi) * 3, -1, 1); const vt = chase() ? 13 : 8; gas = T.v < vt ? 1 : 0; br = T.v > vt + 2 ? 0.6 : 0; }
  T.steer += (si - T.steer) * Math.min(1, dt * 3.5);
  let bias = 0, vmax = 20; for (let w = 0; w < 4; w++) if (T.flat[w]) { vmax -= 6; bias += Math.sign(WHEEL[w][0]) * 0.2 + Math.sin(T.t * 7) * 0.05; }
  if (run) { T.heat = clamp(T.heat + dt * (0.5 + gas * 1.1) * (1 + 0.6 * T.Z / T.hedef) * (T.ol.isi || 0), 0, 100); if (T.heat >= 70) T.isiUyari = true; if (T.isiUyari && T.heat < 40) { T.isiUyari = false; puan(T.sogutan, 30, 'su'); } if (T.heat >= 100 && !T.stall) { T.stall = true; say('motorStop'); } if (T.stall && T.heat < 55) { T.stall = false; say('motorCalisti'); } if (T.stall) gas = 0; }
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
      if (run && T.hitCd <= 0) { T.hitCd = 0.9; const c2 = [0, 1, 2, 3].filter((w) => Math.sign(SPOT[w][0]) === sd), w = c2[T.dmg[c2[0]] <= T.dmg[c2[1]] ? 0 : 1]; T.dmg[w] += clamp(8 + lat * 4, 8, 28); T.v *= 0.75; carpti(); jolt(sd * clamp(1.3 + lat * 0.35, 1.3, 3.1), 0); /* sert girişte yük daha çok savrulur */ say('bariyer', w); for (const p of players.values()) if (!p.seat) for (let i = 0; i < 21; i += 3) p.Q[i] -= sd * 0.08; } } }
  T.pax = -T.v * omt * 0.55 + (off ? Math.sin(T.t * 23) * 3 : 0); T.paz = -((T.v - ov) / dt) * 0.6;
  if (!run) return;
  T.fuel = Math.max(0, T.fuel - dt * (0.45 + gas * 0.75));
  for (const o of OBS) if (!o.hit && o.z - T.Z > -6 && o.z - T.Z < 5.6 && Math.abs(o.x - T.X) < (o.w || 1.5) + 1) { o.hit = true; jolt(0, 2.2); carpti(); if (o.gate) { T.v *= 0.3; T.dmg[o.x > T.X ? 0 : 1] += 18; say('kapaliSerit'); } else { T.v *= 0.4; say('engel'); } for (const p of players.values()) if (!p.seat) for (let i = 2; i < 21; i += 3) p.Q[i] -= 0.1; }
  for (const b of BUMP) if (oz < b && T.Z >= b && Math.abs(T.X - cx(b)) < 7) {
    for (const p of players.values()) if (!p.seat) for (let i = 1; i < 21; i += 3) p.Q[i] -= T.v > BUMP_V ? 0.14 : 0.05;
    if (auto) {} else if (T.v > BUMP_V) { jolt((Math.random() < 0.5 ? -1 : 1) * 1.7, 0); const c = [0, 1, 2, 3].filter((w) => !T.flat[w]); if (c.length) { const w = c.includes(0) || c.includes(1) ? c.filter((w) => w < 2)[(Math.random() * c.filter((w) => w < 2).length) | 0] : c[0]; T.flat[w] = 1; say('tumsekPat', w); carpti(20); } }
    else say('tumsekYavas');
  }
  if (T.ol.lastik && !FIRE.on && !BOT && !chase()) T.nextFlat -= dt; if (T.nextFlat <= 0) { const c = [0, 1, 2, 3].filter((w) => !T.flat[w]); if (c.length > 2) { const w = c[(Math.random() * c.length) | 0]; T.flat[w] = 1; say('lastikPat', w); } T.nextFlat = rnd(35, 60) * diff(); }
  if (T.egitim >= 0) {}
  else if (T.dmg[0] + T.dmg[1] + T.dmg[2] + T.dmg[3] >= 100) { T.state = 'over'; T.why = 'hurda'; }
  else if (T.Z >= T.hedef && T.egitim < 0) bitir();
  else if (T.t > 6 && T.v < 0.4) { T.state = 'over'; T.why = T.fuel <= 0 ? 'yakitBitti' : 'durdu'; }
}
// Aşama bitti: yıldız, ödül puanı, sonraki aşamanın kilidi
export function bitir() {
  const kalan = CR.filter((c) => !c.lost).length, can = 100 - T.dmg.reduce((a, b) => a + b, 0);
  T.state = 'win'; T.why = 'hedef|' + kalan; T.yildiz = 1 + (kalan === CR.length ? 1 : 0) + (can >= 50 ? 1 : 0);
  for (const p of players.values()) if (!p.bot) p.puan += 100 + kalan * 25;
  if (T.lv >= 1 && T.lv + 1 > oyun.acik && T.lv + 1 < ASAMA.length) { oyun.acik = T.lv + 1; try { localStorage.setItem('kk-acik', oyun.acik); } catch (e) {} }
  oyun.lv = Math.min(ASAMA.length - 1, T.lv === 0 ? 1 : T.lv + 1);
}
export function startGame(lv = oyun.lv) {
  resetGame(); const a = ASAMA[lv]; Object.assign(T, { state: 'run', v: 0, cd: 5, lv, hedef: a.m, ol: a.olay, egitim: a.egitim ? 0 : -1, egT: 0, autoT: a.egitim ? 1e9 : 0 });
  for (const p of players.values()) Object.assign(p, { puan: 0, ist: {}, sure: { surus: 0, yolcu: 0, temiz: 0, enTemiz: 0 } });
}
export function resetGame() {
  Object.assign(T, { X: 0, Z: 0, th: 0, v: 0, steer: 0, fuel: 100, flat: [0, 0, 0, 0], rep: [0, 0, 0, 0], state: 'lobby', t: 0, cd: 0, dmg: [0, 0, 0, 0], hitCd: 0, phi: 0, oilCd: 0, autoT: 0, heat: 0, stall: false, rain: 0, wipeT: 0, nFire: rnd(65, 90), nBot: rnd(75, 105), isiUyari: false, sogutan: null, yildiz: 0, egitim: -1, egT: 0, ol: {}, ej: [0, 0, 0], ejT: [0, 0, 0], nextFlat: rnd(35, 50), msg: '', msgT: 0, why: '', sig: 0 });
  Object.assign(TKS, { st: 0, z: -50, valve: 0, vp: 0 }); NZ.holder = null; NZ.dock = false; AH.holder = null; AH.p = AIR.slice(); DH.holder = null; DH.p = DRL.slice(); Object.assign(PC, { st: 0, z: -45, hp: 100, slip: 0, used: [], geri: 0, darbe: 0 }); OIL.length = 0; if (BOT) { players.delete(BOT.id); BOT = null; } FIRE.on = false; EX.holder = null; EX.p = EXT.slice(); for (const c of CR) Object.assign(c, { x: c.x0, z: c.z0, vx: 0, vz: 0, lift: 0, lost: false }); for (const p of players.values()) { p.seatT = 0; p.seatCd = 0; } for (const o of OBS) o.hit = false;
}
export function simStep(dt) { stepAir(dt);
  cpc = Math.cos(T.phi); cps = Math.sin(T.phi);
  stepTruck(dt); stepTanker(dt); stepPolice(dt); stepExtras(dt);
  const L = [...players.values()]; for (const p of L) stepPlayer(p, dt);
  for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) { const p = L[a], q = L[b]; if (p.seat || q.seat || p.dead > 0 || q.dead > 0) continue; for (const k of [0, 1]) { const i = k * 3, dx = q.P[i] - p.P[i], dy = q.P[i + 1] - p.P[i + 1], dz = q.P[i + 2] - p.P[i + 2], d = Math.hypot(dx, dy, dz) || 1e-6; if (d < 0.56) { const s = ((0.56 - d) / d) * 0.5; p.P[i] -= dx * s; p.P[i + 2] -= dz * s; q.P[i] += dx * s; q.P[i + 2] += dz * s; } } }
}
export const r2 = (v) => Math.round(v * 100) / 100;
export const snap = () => ({ t: 's', T: { lv: T.state === 'lobby' ? oyun.lv : T.lv, ac: oyun.acik, hd: T.hedef, yz: T.yildiz, eg: T.egitim, X: T.X, Z: T.Z, th: T.th, v: T.v, st: T.steer, f: T.fuel, fl: T.flat, rp: T.rep, dm: T.dmg.map(Math.ceil), ph: Math.round(T.phi * 1000) / 1000, ht: Math.round(T.heat), sl: T.stall ? 1 : 0, rn: T.rain, wp: T.wipeT > 0 ? 1 : 0, ej: T.ej, s: T.state, cd: Math.ceil(T.cd || 0), m: T.msgT > 0 ? T.msg : '', g: T.gas, b: T.br, why: T.why, sg: T.sig, oh: OBS.map((o, i) => (o.hit ? i : -1)).filter((i) => i >= 0) }, k: [TKS.st, TKS.x, TKS.z, TKS.valve > 0 ? 1 : 0, TKS.vp], n: [NZ.p[0], NZ.p[1], NZ.p[2], NZ.dock ? 1 : 0], a: [r2(AH.p[0]), r2(AH.p[1]), r2(AH.p[2]), AH.holder ? 1 : 0], d: [r2(DH.p[0]), r2(DH.p[1]), r2(DH.p[2]), DH.holder ? 1 : 0], q: [PC.st, r2(PC.x), r2(PC.z), Math.max(0, Math.ceil(PC.hp)), PC.slip > 0 ? 1 : 0, PC.used.slice(), T.oilCd > 0 ? Math.ceil(T.oilCd) : 0, r2(PC.darbe || 0)], ol: OIL, cr: CR.map((c) => (c.lost ? 0 : [r2(c.x), r2(c.z), r2(c.lift || 0)])), fr: FIRE.on ? [FIRE.x, FIRE.z, Math.ceil(FIRE.hp)] : 0, x: [r2(EX.p[0]), r2(EX.p[1]), r2(EX.p[2]), EX.holder ? 1 : 0], p: [...players.values()].map((p) => ({ pu: Math.round(p.puan || 0), ...(T.state === 'over' || T.state === 'win' ? { ist: { ...p.ist, surus: Math.round(p.sure.surus), yolcu: Math.round(p.sure.yolcu), temiz: Math.round(p.sure.enTemiz) } } : {}), bt: p.bot ? 1 : 0, id: p.id, n: p.name, c: p.ci, s: p.seat, st: p.seat ? Math.max(0, Math.ceil(SEAT_T - p.seatT)) : 0, y: r2(p.yaw), d: p.dead > 0 ? 1 : 0, h: (p.pin[0] ? 1 : 0) | (p.pin[1] ? 2 : 0), P: Array.from(p.P, r2) })) });
