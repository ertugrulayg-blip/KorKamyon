// Yerel deneme sunucusu: node serve.js → http://localhost:8765  (PORT ortam değişkeniyle değiştirilebilir)
const http = require("http"), fs = require("fs"), path = require("path");
const TUR = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".woff2": "font/woff2" };
const KOK = __dirname, PORT = +process.env.PORT || 8765;
http.createServer((q, r) => {
  const yol = decodeURIComponent(q.url.split("?")[0]), f = path.join(KOK, yol === "/" ? "index.html" : yol);
  if (!f.startsWith(KOK + path.sep)) { r.writeHead(403); return r.end("yasak"); } // klasör dışına çıkılamaz
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end("yok"); } r.writeHead(200, { "Content-Type": TUR[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(d); });
}).listen(PORT, () => console.log("http://localhost:" + PORT));
