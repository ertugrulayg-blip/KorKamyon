// Oyun sayfasına Steam köprüsü: window.steam. Yalnız masaüstü sürümünde vardır.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('steam', {
  durum: () => ipcRenderer.invoke('steam:durum'),
  odaKur: () => ipcRenderer.invoke('steam:kur'),
  odayaGir: (lobi) => ipcRenderer.invoke('steam:gir', lobi),
  davet: () => ipcRenderer.invoke('steam:davet'),
  ayril: () => ipcRenderer.invoke('steam:ayril'),
  gonder: (kime, metin) => ipcRenderer.send('steam:gonder', kime, metin),
  paket: (f) => ipcRenderer.on('steam:paket', (e, kimden, metin) => f(kimden, metin)),
  olay: (f) => ipcRenderer.on('steam:olay', (e, o) => f(o)),
});
