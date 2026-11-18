// Dünya ve sabitler: yol, engeller, kamyonun çarpışma kutuları. Hem oda sahibi hem istemci kullanır.

export const $ = (i) => document.getElementById(i), DBG = location.search.includes('debug');
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), rnd = (a, b) => a + Math.random() * (b - a);
export const LEN = 2500, COL = [0xff5a5f, 0x3fa7ff, 0xffd23f, 0x7bd389], ODA = 'kor-kamyon-';
// Yol 280 m'den sonra 2000 m'de bir kendini tekrarlar (dalga boyları 1000 ve 400 m). Sonsuz yolda kamyon 2300 m'yi
// geçince 2000 m geri alınır; yol, engeller, tümsekler, polis ve süsler aynı olduğu için sıçrama görünmez.
export const Z0 = 280, PER = 2000, DONGU = Z0 + PER + 20;
const cxDuz = (z) => { const s = clamp((z - 80) / 200, 0, 1); return s * (26 * Math.sin((z * Math.PI) / 500) + 10 * Math.sin((z * Math.PI) / 200 + 1)); };
// ---------- harita: 0 düz yol, 1 dağ yolu ----------
// Dağ yolu: dar toprak yol, sol (+x) yanda kaya duvarı, sağ (-x) yanda korkuluksuz uçurum; sürekli tırmanır.
export let HARITA = 0; export const haritaSec = (h) => { HARITA = h; };
export const DAG = { yol: 4.4, len: 650, vadi: -22 }; // yarı genişlik (m), uzunluk
const cxDag = (z) => { const s = clamp((z - 30) / 90, 0, 1); return s * (17 * Math.sin(z / 46) + 5 * Math.sin(z / 21 + 2)); }; // keskin S virajlar
const hDag = (z) => { const u = clamp(z, -100, 900); return Math.max(0, u - 20) * 0.075 + 1.6 * Math.sin(u / 37) * clamp((u - 20) / 60, 0, 1); }; // ~45 m tırmanış
// Dağ yolunun kesitleri: 'o' iki yan orman (düzlük), 'u' sağda keskin uçurum, 'y' sağda hafif eğimli yamaç (yoldan çıkıp dönülebilir).
// Solda: ormanda düzlük, ötekilerde yüksek kaya duvarı. Geçişler 24 m'de yumuşar.
const KES = [[-1e9, 'o'], [90, 'u'], [230, 'y'], [360, 'u'], [450, 'o'], [540, 'y'], [1e9, '']];
const yumusak = (z, a) => { const t = clamp((z - a + 12) / 24, 0, 1); return t * t * (3 - 2 * t); };
export function kesit(z) { const w = { u: 0, y: 0, o: 0 }; for (let i = 0; i < KES.length - 1; i++) w[KES[i][1]] += yumusak(z, KES[i][0]) * (1 - yumusak(z, KES[i + 1][0])); return w; }
// yerleşim yerleri (orman düzlüklerinde): yol asfalt, kenarda evler
export const DKOY = [[15, 80], [460, 532]];
// dinlenme tesisleri (erzak): düz yolda yol kenarında, dağda yerleşimlerde. Kamyon burada durunca satıcı yanaşır.
export const TESIS = [[520, 1320, 2020], [48, 496]]; // harita başına z'ler
export const tesisYakin = (h, z) => TESIS[h].find((t) => Math.abs(t - z) < 28);
// Tesis cebi: ana yoldan sağa ayrılan yan yol. Genişliği (m) tesisin ±25 m'sinde tam (CEP), ±60 m'de sıfıra iner.
// Düz yolda döngü kopyası da sayılır (z ve z − 2000).
export const CEP = 10;
export const cepGen = (h, z) => { let en = 0; for (const t of TESIS[h]) for (const zz of h ? [z] : [z, z - 2000]) { const k = clamp((60 - Math.abs(zz - t)) / 35, 0, 1); en = Math.max(en, k * k * (3 - 2 * k)); } return en * CEP; };
export const koyK = (z) => DKOY.reduce((a, [z0, z1]) => Math.max(a, yumusak(z, z0) * (1 - yumusak(z, z1))), 0); // 0 toprak, 1 asfalt
export const karK = (z) => { const t = clamp((z / DAG.len - 0.55) / 0.35, 0, 1); return t * t * (3 - 2 * t); }; // 0 karsız, 1 tam karlı (yolun sonuna doğru)
export const sagBanket = (z) => { const w = kesit(z); return w.y * 9 + w.o * 3.5 + cepGen(1, z); }; // tesis cebi de sayılır // yolun sağında sürülebilir alan (m)
export const solBanket = (z) => kesit(z).o * 3.5;
const ara = (T, d) => { for (let i = 1; i < T.length; i++) if (d <= T[i][0]) { const [x0, y0] = T[i - 1], [x1, y1] = T[i]; return y0 + ((y1 - y0) * (d - x0)) / (x1 - x0); } return T[T.length - 1][1]; };
const DUVAR = [[0, 0], [0.8, 2.5], [1.8, 7], [3.5, 13], [7, 18], [13, 23], [22, 33], [34, 46], [55, 60], [80, 66]];
// yol kenarından d metre dışarıdaki zeminin yola göre yüksekliği (sol: +, sağ: çoğunlukla −)
export const dagSol = (z, d) => { const w = kesit(z), u = d > 0.8 ? 1 + 0.45 * Math.sin(z / 41) + 0.25 * Math.sin(z / 13 + 1) : 1, orman = d < 22 ? 0.02 * d : 0.44 + (d - 22) * 0.7; return ara(DUVAR, d) * u * (1 - w.o) + orman * w.o; };
export const dagSag = (z, d) => { const w = kesit(z), H = hDag(z) - DAG.vadi;
  const fu = -ara([[0, 0], [0.4, 0.8], [1.2, H * 0.35], [2.2, H * 0.75], [3.4, H - 2.5], [9, H]], d), fy = d < 9 ? -0.04 * d : -0.36 - (d - 9) * 0.42, fo = d < 30 ? -0.01 * d : -0.3 - (d - 30) * 0.8;
  return Math.max(-H, w.u * fu + w.y * fy + w.o * fo); };
export const cx = (z) => (HARITA ? cxDag(z) : cxDuz(z));
// zeminin (yol, kaya duvarı, yamaç) bir noktadaki yüksekliği: kamera kayanın içine girmesin diye
export const zeminY = (x, z) => { if (!HARITA) return 0; const e = x - cx(z), h = yH(z); return e > DAG.yol ? h + dagSol(z, e - DAG.yol) : e < -DAG.yol ? h + dagSag(z, -e - DAG.yol) : h; };
export const yH = (z) => (HARITA ? hDag(z) : 0); // yolun yüksekliği
export const egim = (z) => (yH(z + 1) - yH(z - 1)) / 2; // yokuş (tan)
// Dağ yolunda taşlar ve kayalar (x: yol eksenine göre, + sol / kaya duvarı tarafı). Tohumlu: herkes aynısını üretir.
// DTAS: dağınık taşlar { z, x, r }; DTBOLGE: taş bölgeleri { z0, z1 } (uyarı için); DKAYA: büyük kayalar { z, x, r } — çevresinden dolanılır.
export const DTAS = [], DTBOLGE = [], DKAYA = [];
{ let t = 77; const r = () => { t = (t * 1664525 + 1013904223) >>> 0; return t / 4294967296; };
  for (const [z, x] of [[150, 2.4], [255, -2.3], [360, 2.5], [455, -2.2], [560, 2.3]]) DKAYA.push({ z, x, r: 1.55 + r() * 0.3 });
  const kayaArasi = (z0, z1) => DKAYA.some((k) => k.z > z0 - 14 && k.z < z1 + 14); // bölge kayanın dibine düşmesin
  for (let z = 60, i = 0; z < DAG.len - 30; i++) {
    const enine = i % 2 === 0, boy = enine ? 7 + r() * 6 : 22 + r() * 18, yan = r() < 0.5 ? 1 : -1;
    if (!kayaArasi(z, z + boy) && !DKOY.some(([k0, k1]) => z + boy > k0 - 5 && z < k1 + 5)) { // yerleşimlerde (asfalt) taş yok
      DTBOLGE.push({ z0: z, z1: z + boy });
      const n = Math.round(boy * (enine ? 2.2 : 1.1));
      for (let k = 0; k < n; k++) { // enine: yolun her yerine; boyuna: bir kenar şeridine dağılır
        const x = enine ? (r() * 2 - 1) * (DAG.yol - 0.5) : yan * (0.6 + r() * (DAG.yol - 1.1));
        DTAS.push({ z: z + r() * boy, x, r: 0.2 + r() * 0.28 });
      }
    }
    z += kayaArasi(z, z + boy) ? 8 : boy + 18 + r() * 22;
  }
  DTAS.sort((a, b) => a.z - b.z);
}
// Döngü: [Z0, Z0+PER) içindeki bir şeyin z+PER'deki kopyası (görüş mesafesi kadar ileriye: sis 230 m)
export const kopyaZ = (z) => z >= Z0 && z + PER < LEN + 160;
export let tohum = 12345; export const srnd = () => { tohum = (tohum * 1664525 + 1013904223) >>> 0; return tohum / 4294967296; };

// ---------- çarpışma kutuları (kamyon çerçevesi) ----------
export const BOX = [];
export const box = (x0, x1, y0, y1, z0, z1, tag, c) => { const b = { a: [x0, y0, z0], b: [x1, y1, z1], o: [0, 0, 0], tag, c, on: true }; BOX.push(b); return b; };
// kasa: z = ARKA'dan 1'e (kabin önde). Yan kenarlar 5 parça: hasarda biri kırılır, tahta çakılarak onarılır (KENAR).
export const ARKA = -7.5;
box(-1.5, 1.5, 0.5, 1.3, ARKA, 1, 'floor', 0xb9853f); box(-1.5, 1.5, 0.5, 1.3, 1, 3.2, 'floor', 0x8a6a3a);
export const KENAR = [];
for (const s of [1, -1]) for (let i = 0; i < 5; i++) { const z0 = ARKA + (i * (1 - ARKA)) / 5, z1 = ARKA + ((i + 1) * (1 - ARKA)) / 5; KENAR.push({ s, z0, z1, z: (z0 + z1) / 2, kirik: false, b: box(s > 0 ? 1.4 : -1.5, s > 0 ? 1.5 : -1.4, 1.3, 1.8, z0, z1, 'rail', 0x8a8f98) }); }
box(-1.5, 1.5, 1.3, 1.8, ARKA - 0.1, ARKA, 'rail', 0x8a8f98);
box(1.4, 1.5, 1.3, 2.3, 1, 3.2, 'door', 0xd8432f); box(-1.5, -1.4, 1.3, 2.3, 1, 3.2, 'door', 0xd8432f); // kapılar alçak: yan camlar aşağı doğru geniş
box(-1.5, 1.5, 1.3, 2.4, 3.2, 3.5, 'dash', 0x2b2f38); // torpido alçak: ön cam aşağı doğru geniş
box(-1.5, 1.5, 0.5, 2.1, 3.5, 5.3, 'hood', 0xd8432f);
box(0.3, 1.1, 1.3, 1.6, 1.5, 2.3, 'seat', 0x30415d); box(-1.1, -0.3, 1.3, 1.6, 1.5, 2.3, 'seat', 0x30415d);
for (const b of BOX) if (b.a[2] >= 1) b.cab = true; // çekici (kabin): dorseye z=HZ'deki mafsaldan bağlı, dönüşte ona göre açı yapar
export const HZ = 1;
// satıcı arabası: kamyon tesiste durunca sağ yanına yanaşır, üstünde erzak kasaları (oyuncular kasadan üstüne yürür)
// Şezlong (tek): kasanın sol kenarında, ızgarayla aynı sırada; arkalık kabine dayalı, ayaklar arkaya (yola) bakar. Oyuncu E ile uzanır.
// yon: ayakların baktığı yön (+1 kabine, -1 arkaya).
export const SEZ = [[1.08, -4.45, -1]].map(([x, z, yon]) => ({ x, z, yon, boy: 1.15, gen: 0.5, b: box(x - 0.25, x + 0.25, 1.3, 1.58, z - 0.575, z + 0.575, 'sezlong', 0xf2efe6) }));
export const DOK = box(-4.7, -1.5, 0.5, 1.3, -5.2, -1.2, 'dok', 0x8a6a3a); DOK.on = false;
export const TK = box(-1.2, 1.2, 0.5, 2.0, -3.5, 3.5, 'tanker', 0xe9e9e9); TK.on = false;
export const PK = box(-1.0, 1.0, 0.45, 1.3, -2.2, 2.2, 'police', 0xffffff), PK2 = box(-0.85, 0.85, 1.3, 1.85, -1.3, 0.5, 'police', 0x1f3a6b); PK.on = PK2.on = false;
export const SEAT = { 1: [0.7, 1.55, 1.9], 2: [-0.7, 1.55, 1.9] };
export const BOY = 0.7; // karakter boyu çarpanı (fizik bedeni ve model birlikte küçülür)
export const DIREKSIYON = [0.7, 1.95, 2.45], DIR_R = 0.3, DIR_EGIM = -0.5; // direksiyon merkezi (kabin), jant yarıçapı, sürücüye eğimi // 1 şoför (solda), 2 yolcu — koltuklar aynı
export const INLET = [1.25, 2.0, 0.4];
export const WHEEL = [[1.78, 0.55, 2.2, 'sol ön'], [-1.78, 0.55, 2.2, 'sağ ön'], [1.78, 0.55, -5.2, 'sol arka'], [-1.78, 0.55, -5.2, 'sağ arka']];
export const OBS = []; for (let z = 260; z < Z0 + PER - 20; z += 70 + srnd() * 60) OBS.push({ z, x: cx(z) + (srnd() * 9 - 4.5), hit: false });
export const GATE = [640, 1180, 1700, 2150].map((z, i) => ({ z, open: [1, -1, -1, 1][i] })); // yol ayrımı: open = +1 sol şerit açık, -1 sağ şerit açık; kapalı şeritte duvar var
for (const g of GATE) { for (let i = OBS.length - 1; i >= 0; i--) if (Math.abs(OBS[i].z - g.z) < 75) OBS.splice(i, 1); OBS.push({ z: g.z, x: cx(g.z) - g.open * 3.7, w: 3.7, gate: g, hit: false }); } OBS.sort((a, b) => a.z - b.z);
// döngü kopyaları: es = aslının sırası (başa sarılınca çarpılmış hali aslına geçer)
for (const g of GATE.slice()) if (kopyaZ(g.z)) GATE.push({ z: g.z + PER, open: g.open });
OBS.slice().forEach((o, i) => { if (kopyaZ(o.z)) OBS.push({ ...o, z: o.z + PER, hit: false, es: i, gate: o.gate && GATE.find((g) => g.z === o.z + PER) }); });
export const RAIN = [[720, 1040], [1540, 1860]]; // yağmur bölgeleri
export const BUMP = []; for (let z = 190; z < Z0 + PER - 30; z += 150 + ((z * 7) % 90)) { while (OBS.some((o) => Math.abs(o.z - z) < 28)) z += 14; BUMP.push(z); }
for (const z of BUMP.slice()) if (kopyaZ(z)) BUMP.push(z + PER);
export const LIMIT = 50 / 3.6, POLZ = [380, 980, 1450, 1900, 380 + 2000], SEAT_T = 30; // hız sınırı (m/s), radar noktaları, koltukta kalma süresi (sn)
// Aşamalar: 0 eğitim (adım adım öğretir), sonra giderek uzayan ve zorlaşan yollar. olay: o aşamada rastgele gelen sorunlar (isi: hararet hızı).
export const ASAMA = [
  { m: 700, egitim: true, olay: {} },
  { m: 100, olay: { lastik: 1 } },
  { m: 500, olay: { lastik: 1, isi: 0.7, yangin: 1, polis: 1 } },
  { m: 1000, olay: { lastik: 1, isi: 0.8, yangin: 1, polis: 1, haydut: 1, erzak: 1 } },
  { m: 1500, olay: { lastik: 1, isi: 0.85, yangin: 1, polis: 1, haydut: 1, erzak: 1 } },
  { m: 2000, olay: { lastik: 1, isi: 1, yangin: 1, polis: 1, haydut: 1, kenar: 1, erzak: 1 } },
  { m: 2500, olay: { lastik: 1, isi: 1, yangin: 1, polis: 1, haydut: 1, kenar: 1, erzak: 1 } },
  { m: DAG.len, dag: true, olay: { lastik: 1, isi: 1, erzak: 1 } }, // dağ yolu (deneme, hep açık)
  { m: 1e9, sonsuz: true, olay: { lastik: 1, isi: 1, yangin: 1, polis: 1, haydut: 1, erzak: 1 } }, // sonsuz yol: gidebildiğin kadar (hep açık)
];
export const NORMAL = ASAMA.filter((a) => !a.dag && !a.sonsuz).length; // sırayla açılan aşamalar (eğitim dahil)
export const SONSUZ = ASAMA.length - 1;
export const BUMP_V = 8; // m/s (~29 km/s) üstünde tümseğe girilirse lastik patlar
