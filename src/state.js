// Modüller arası paylaşılan değişken durum (ağ kimliği, arayüz ayarları).
export const net = { isHost: false, myId: '', odaKodu: '', mic: null, micOk: false };
export const ui = { camMode: -1, musOn: localStorage.getItem('kk-muz') !== '0', mouseL: false };
