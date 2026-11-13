// Steam ağı (yalnız masaüstü sürümünde, Steam açıkken). PeerJS'in Peer / DataConnection biçimini taklit eder;
// böylece main.js'teki oda sahibi / istemci akışı iki ağda da aynı kalır.
// Köprü: desktop/preload.cjs → window.steam. Oyuncu kimliği Steam numarasıdır (metin olarak).

const kopru = () => (typeof window !== 'undefined' && window.steam) || null;
let bilgi = null;

// Steam kullanılabiliyor mu? { ok, ad, id, bekleyen } — bekleyen: oyun "Oyuna katıl" ile açıldıysa lobi numarası
export async function steamDurum() {
  const k = kopru(); if (!k) return null;
  if (!bilgi) {
    try { bilgi = await k.durum(); } catch (e) { bilgi = { ok: false }; }
    if (bilgi && bilgi.ok) k.ayril(); // sayfa yenilendiyse eski lobiden çık
  }
  return bilgi && bilgi.ok ? bilgi : null;
}

// Basit olay yayıcı (PeerJS'teki on('...') gibi)
class Yayici {
  constructor() { this.d = {}; }
  on(ad, f) { (this.d[ad] = this.d[ad] || []).push(f); return this; }
  yay(ad, ...a) { for (const f of this.d[ad] || []) f(...a); }
}

// Bir oyuncuyla bağlantı. send() nesneyi JSON olarak Steam'e yollar.
class Baglanti extends Yayici {
  constructor(peer) { super(); this.peer = peer; this.open = true; }
  send(d) { if (this.open) kopru().gonder(this.peer, JSON.stringify(d)); }
  close() { if (!this.open) return; this.open = false; this.yay('close'); }
}

// Peer benzeri nesne. Oda sahibi lobi kurar; istemci lobiye girip lobi sahibine bağlanır.
// lobiNo verilirse o lobiye girer, verilmezse yeni lobi kurar.
export function steamPeer(lobiNo) {
  const k = kopru(), p = new Yayici(), conns = new Map();
  p.lobi = null; p.sahip = null; p.destroyed = false;
  p.call = () => null; // ses PeerJS üzerinden ayrı kurulur (sohbet.js)
  p.destroy = () => { p.destroyed = true; for (const c of conns.values()) c.close(); conns.clear(); k.ayril(); };
  p.connect = (id) => { const c = new Baglanti(id); conns.set(id, c); setTimeout(() => c.yay('open'), 0); return c; };
  p.davet = () => k.davet();

  k.paket((kimden, metin) => {
    if (p.destroyed) return;
    let d; try { d = JSON.parse(metin); } catch (e) { return; }
    let c = conns.get(kimden);
    if (!c || !c.open) { // tanımadığımız biri: oda sahibiysek yeni bağlantı
      if (kimden === p.sahip && c) return;
      if (p.sahip !== bilgi.id) return;
      c = new Baglanti(kimden); conns.set(kimden, c); p.yay('connection', c);
    }
    c.yay('data', d);
  });
  k.olay((o) => {
    if (p.destroyed) return;
    if (o.t === 'ayrildi') { const c = conns.get(o.id); if (c) { conns.delete(o.id); c.close(); } }
    else if (o.t === 'katil') p.yay('katilIstegi', o.lobi);
  });

  (lobiNo ? k.odayaGir(lobiNo) : k.odaKur()).then((l) => {
    p.lobi = l.lobi; p.sahip = l.sahip;
    p.yay('open', bilgi.id);
  }).catch((e) => p.yay('error', { type: 'steam-lobi' }));
  return p;
}

// Oyun açıkken gelen "Oyuna katıl" istekleri (menüdeyken)
export function katilIstegi(f) { const k = kopru(); if (k) k.olay((o) => o.t === 'katil' && f(o.lobi)); }
