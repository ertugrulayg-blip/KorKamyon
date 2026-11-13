// Steam bağlantısı (Electron ana süreci). steamworks.js ile Steam lobisi ve Steam üzerinden oyuncular arası veri.
// Oyun sayfası bu dosyayla preload.cjs köprüsü (window.steam) üzerinden konuşur.
// Steam açık değilse ya da kütüphane yoksa hiçbir şey yapmaz: oyun web sürümündeki gibi PeerJS ile bağlanır.
const { ipcMain } = require('electron');

// Steam uygulama numarası. 480, Valve'ın herkese açık deneme numarasıdır (Spacewar).
// Steamworks'te Road Hogs'un kendi numarası (App ID) alınınca buraya yazılır.
const APP_ID = Number(process.env.ROADHOGS_APPID) || 480;

let sw = null, istemci = null;
try {
  sw = require('steamworks.js');
  istemci = sw.init(APP_ID);
} catch (e) {
  console.log('Steam kullanılamıyor:', e && e.message);
  sw = null; istemci = null;
}

const acik = () => !!istemci;
let lobi = null, pencere = null, bekleyen = null;

// Steam arkadaş listesinden "Oyuna katıl" ile oyun kapalıyken açılırsa: komut satırında +connect_lobby <numara> gelir.
const arg = process.argv.indexOf('+connect_lobby');
if (arg >= 0 && process.argv[arg + 1]) bekleyen = process.argv[arg + 1];

function olay(o) { if (pencere && !pencere.isDestroyed()) pencere.webContents.send('steam:olay', o); }

// Steam arayüzü (Shift+Tab) Electron penceresinde çizilebilsin: uygulama hazır olmadan çağrılmalı.
function arayuzAc() { if (sw) try { sw.electronEnableSteamOverlay(); } catch (e) {} }

function baslat(w) {
  pencere = w;
  if (!acik()) return;
  const C = sw.SteamCallback;

  // Lobideki biri bize bağlanmak isterse kabul et (yalnız bir lobideyken).
  istemci.callback.register(C.P2PSessionRequest, (v) => { if (lobi) istemci.networking.acceptP2PSession(v.remote); });

  // Oyun açıkken arkadaşın davetini kabul etmek ya da arkadaş listesinden "Oyuna katıl".
  istemci.callback.register(C.GameLobbyJoinRequested, (v) => olay({ t: 'katil', lobi: String(v.lobby_steam_id) }));

  // Lobiden ayrılan, bağlantısı kopan ya da atılan oyuncu (1: ayrıldı, 2: koptu, 3: atıldı, 4: yasaklandı).
  istemci.callback.register(C.LobbyChatUpdate, (v) => {
    if (!lobi || String(v.lobby) !== String(lobi.id)) return;
    if (v.member_state_change >= 1) olay({ t: 'ayrildi', id: String(v.user_changed) });
  });

  // Gelen paketleri sürekli oku ve oyun sayfasına aktar.
  setInterval(() => {
    let n;
    while ((n = istemci.networking.isP2PPacketAvailable()) > 0) {
      const p = istemci.networking.readP2PPacket(n);
      if (pencere && !pencere.isDestroyed()) pencere.webContents.send('steam:paket', String(p.steamId.steamId64), p.data.toString('utf8'));
    }
  }, 5);
}

function lobidenCik() { if (lobi) { try { lobi.leave(); } catch (e) {} lobi = null; } }
const lobiBilgi = () => ({ lobi: String(lobi.id), sahip: String(lobi.getOwner().steamId64), uyeler: lobi.getMembers().map((m) => String(m.steamId64)) });

ipcMain.handle('steam:durum', () => {
  if (!acik()) return { ok: false };
  const ben = istemci.localplayer.getSteamId();
  const b = bekleyen; bekleyen = null;
  return { ok: true, ad: istemci.localplayer.getName(), id: String(ben.steamId64), bekleyen: b, appId: APP_ID };
});
ipcMain.handle('steam:kur', async () => {
  lobidenCik();
  lobi = await istemci.matchmaking.createLobby(1 /* yalnız arkadaşlar */, 4);
  lobi.setData('oyun', 'road-hogs');
  istemci.localplayer.setRichPresence('connect', '+connect_lobby ' + String(lobi.id)); // arkadaş listesinde "Oyuna katıl"
  return lobiBilgi();
});
ipcMain.handle('steam:gir', async (e, numara) => {
  lobidenCik();
  lobi = await istemci.matchmaking.joinLobby(BigInt(numara));
  istemci.localplayer.setRichPresence('connect', '+connect_lobby ' + String(lobi.id));
  return lobiBilgi();
});
ipcMain.handle('steam:davet', () => { if (lobi) lobi.openInviteDialog(); });
ipcMain.handle('steam:ayril', () => { lobidenCik(); if (acik()) istemci.localplayer.setRichPresence('connect', null); });
ipcMain.on('steam:gonder', (e, kime, metin) => {
  if (!acik()) return;
  try { istemci.networking.sendP2PPacket(BigInt(kime), 2 /* güvenilir */, Buffer.from(metin, 'utf8')); } catch (err) {}
});

module.exports = { arayuzAc, baslat };
