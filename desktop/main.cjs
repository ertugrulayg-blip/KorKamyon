// Masaüstü sürümü (Electron): oyunu yerel bir sunucudan pencerede açar. Çalıştırma: npm run desktop
const { app, BrowserWindow, session, Menu } = require('electron'), http = require('http'), fs = require('fs'), path = require('path');
const KOK = path.join(__dirname, '..');
const steam = require('./steam.cjs'); // Steam varsa lobi ve Steam üzerinden bağlantı; yoksa PeerJS
steam.arayuzAc();
const TUR = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
// ES modülleri file:// üzerinden yüklenemediği için dosyalar yalnız bu bilgisayardan erişilen bir sunucuyla verilir
const sunucu = http.createServer((q, r) => {
  const yol = decodeURIComponent(q.url.split('?')[0]), f = path.join(KOK, yol === '/' ? 'index.html' : yol);
  if (!f.startsWith(KOK + path.sep)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': TUR[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
});
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  session.defaultSession.setPermissionRequestHandler((wc, izin, cb) => cb(izin === 'media')); // sesli sohbet için mikrofon
  sunucu.listen(0, '127.0.0.1', () => {
    const w = new BrowserWindow({ width: 1280, height: 720, minWidth: 800, minHeight: 500, backgroundColor: '#101418', title: 'Road Hogs', autoHideMenuBar: true, webPreferences: { contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'preload.cjs') } });
    steam.baslat(w);
    w.loadURL(`http://localhost:${sunucu.address().port}/`);
    w.webContents.on('before-input-event', (e, k) => { if (k.type === 'keyDown' && k.key === 'F11') w.setFullScreen(!w.isFullScreen()); });
    w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
});
app.on('window-all-closed', () => app.quit());
