// Modüller arası paylaşılan değişken durum (ağ kimliği, arayüz ayarları).
export const net = { isHost: false, myId: '', odaKodu: '', mic: null, micOk: false };
const KQ = new URLSearchParams(location.search).get('kalite'), KS = localStorage.getItem('kk-kalite');
// kalite: 0 düşük (gölge yok, seyrek manzara) · 1 orta · 2 yüksek. Varsayılan: telefonda orta, bilgisayarda yüksek. ?kalite=0 ile zorlanabilir.
// ses ayarları (0..1): müzik, efektler, oyuncuların sesli sohbeti; kisi: oyuncu kimliğine göre ayrı seviye (bu oturum için)
// mod: sesli sohbet kipi ('kapali' varsayılan: oyuncu isteyince açar)
const SES = (() => { try { return { muzik: 0.8, efekt: 1, oyuncu: 1, mod: 'kapali', ...JSON.parse(localStorage.getItem('kk-ses') || '{}'), kisi: {} }; } catch (e) { return { muzik: 0.8, efekt: 1, oyuncu: 1, mod: 'kapali', kisi: {} }; } })();
export const sesKaydet = () => { try { localStorage.setItem('kk-ses', JSON.stringify({ muzik: SES.muzik, efekt: SES.efekt, oyuncu: SES.oyuncu, mod: SES.mod })); } catch (e) {} };
export const sesSeviye = (id) => Math.min(1, SES.oyuncu * (SES.kisi[id] ?? 1));
export const ui = { kalite: KQ !== null ? +KQ : KS !== null ? +KS : matchMedia('(pointer:coarse)').matches ? 1 : 2, camMode: -1, musOn: localStorage.getItem('kk-muz') !== '0', mouseL: false, ses: SES };
