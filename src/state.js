// Modüller arası paylaşılan değişken durum (ağ kimliği, arayüz ayarları).
export const net = { isHost: false, myId: '', odaKodu: '', mic: null, micOk: false };
const KQ = new URLSearchParams(location.search).get('kalite'), KS = localStorage.getItem('kk-kalite');
// kalite: 0 düşük (gölge yok, seyrek manzara) · 1 orta · 2 yüksek. Varsayılan: telefonda orta, bilgisayarda yüksek. ?kalite=0 ile zorlanabilir.
export const ui = { kalite: KQ !== null ? +KQ : KS !== null ? +KS : matchMedia('(pointer:coarse)').matches ? 1 : 2, camMode: -1, musOn: localStorage.getItem('kk-muz') !== '0', mouseL: false };
