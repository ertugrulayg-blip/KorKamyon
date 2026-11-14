// Dünya ve sabitler: yol, engeller, kamyonun çarpışma kutuları. Hem oda sahibi hem istemci kullanır.

export const $ = (i) => document.getElementById(i), DBG = location.search.includes('debug');
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), rnd = (a, b) => a + Math.random() * (b - a);
export const LEN = 2500, COL = [0xff5a5f, 0x3fa7ff, 0xffd23f, 0x7bd389], ODA = 'kor-kamyon-';
export const cx = (z) => { const s = clamp((z - 80) / 200, 0, 1); return s * (26 * Math.sin(z / 160) + 10 * Math.sin(z / 57 + 1)); };
export let tohum = 12345; export const srnd = () => { tohum = (tohum * 1664525 + 1013904223) >>> 0; return tohum / 4294967296; };

// ---------- çarpışma kutuları (kamyon çerçevesi) ----------
export const BOX = [];
export const box = (x0, x1, y0, y1, z0, z1, tag, c) => { const b = { a: [x0, y0, z0], b: [x1, y1, z1], o: [0, 0, 0], tag, c, on: true }; BOX.push(b); return b; };
box(-1.5, 1.5, 0.5, 1.3, -6, 1, 'floor', 0xb9853f); box(-1.5, 1.5, 0.5, 1.3, 1, 3.2, 'floor', 0x8a6a3a);
box(1.4, 1.5, 1.3, 1.8, -6, 1, 'rail', 0x8a8f98); box(-1.5, -1.4, 1.3, 1.8, -6, 1, 'rail', 0x8a8f98); box(-1.5, 1.5, 1.3, 1.8, -6.1, -6, 'rail', 0x8a8f98);
box(1.4, 1.5, 1.3, 2.7, 1, 3.2, 'door', 0xd8432f); box(-1.5, -1.4, 1.3, 2.7, 1, 3.2, 'door', 0xd8432f);
box(-1.5, 1.5, 1.3, 2.7, 3.2, 3.5, 'dash', 0x2b2f38);
box(-1.5, 1.5, 0.5, 2.1, 3.5, 5.3, 'hood', 0xd8432f);
box(0.3, 1.1, 1.3, 1.6, 1.5, 2.3, 'seat', 0x30415d); box(-1.1, -0.3, 1.3, 2.0, 1.5, 2.3, 'seat', 0x30415d);
for (const b of BOX) if (b.a[2] >= 1) b.cab = true; // çekici (kabin): dorseye z=HZ'deki mafsaldan bağlı, dönüşte ona göre açı yapar
export const HZ = 1;
export const TK = box(-1.2, 1.2, 0.5, 2.0, -3.5, 3.5, 'tanker', 0xe9e9e9); TK.on = false;
export const PK = box(-1.0, 1.0, 0.45, 1.3, -2.2, 2.2, 'police', 0xffffff), PK2 = box(-0.85, 0.85, 1.3, 1.85, -1.3, 0.5, 'police', 0x1f3a6b); PK.on = PK2.on = false;
export const SEAT = { 1: [0.7, 1.55, 1.9], 2: [-0.7, 2.0, 1.9] }; // 1 şoför (solda, kısa), 2 yolcu
export const INLET = [1.25, 2.0, 0.4];
export const WHEEL = [[1.78, 0.55, 2.2, 'sol ön'], [-1.78, 0.55, 2.2, 'sağ ön'], [1.78, 0.55, -4, 'sol arka'], [-1.78, 0.55, -4, 'sağ arka']];
export const OBS = []; for (let z = 260; z < LEN - 60; z += 70 + srnd() * 60) OBS.push({ z, x: cx(z) + (srnd() * 9 - 4.5), hit: false });
export const GATE = [640, 1180, 1700, 2150].map((z, i) => ({ z, open: [1, -1, -1, 1][i] })); // yol ayrımı: open = +1 sol şerit açık, -1 sağ şerit açık; kapalı şeritte duvar var
for (const g of GATE) { for (let i = OBS.length - 1; i >= 0; i--) if (Math.abs(OBS[i].z - g.z) < 75) OBS.splice(i, 1); OBS.push({ z: g.z, x: cx(g.z) - g.open * 3.7, w: 3.7, gate: g, hit: false }); } OBS.sort((a, b) => a.z - b.z);
export const RAIN = [[720, 1040], [1540, 1860]]; // yağmur bölgeleri
export const BUMP = []; for (let z = 190; z < LEN - 80; z += 150 + ((z * 7) % 90)) { while (OBS.some((o) => Math.abs(o.z - z) < 28)) z += 14; BUMP.push(z); }
export const LIMIT = 50 / 3.6, POLZ = [380, 980, 1450, 1900, 2280], SEAT_T = 30; // hız sınırı (m/s), radar noktaları, koltukta kalma süresi (sn)
// Aşamalar: 0 eğitim (adım adım öğretir), sonra giderek uzayan ve zorlaşan yollar. olay: o aşamada rastgele gelen sorunlar (isi: hararet hızı).
export const ASAMA = [
  { m: 700, egitim: true, olay: {} },
  { m: 100, olay: { lastik: 1 } },
  { m: 500, olay: { lastik: 1, isi: 0.7, yangin: 1, polis: 1 } },
  { m: 1000, olay: { lastik: 1, isi: 0.8, yangin: 1, polis: 1, haydut: 1 } },
  { m: 1500, olay: { lastik: 1, isi: 0.85, yangin: 1, polis: 1, haydut: 1 } },
  { m: 2000, olay: { lastik: 1, isi: 1, yangin: 1, polis: 1, haydut: 1 } },
  { m: 2500, olay: { lastik: 1, isi: 1, yangin: 1, polis: 1, haydut: 1 } },
];
export const BUMP_V = 8; // m/s (~29 km/s) üstünde tümseğe girilirse lastik patlar
