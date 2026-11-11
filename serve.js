// Yerel deneme sunucusu: node serve.js → http://localhost:8765
const http = require("http"), fs = require("fs"), path = require("path");
const TUR = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
http.createServer((q, r) => {
  const f = path.join(__dirname, q.url.split("?")[0] === "/" ? "index.html" : path.basename(q.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end("yok"); } r.writeHead(200, { "Content-Type": TUR[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(d); });
}).listen(8765, () => console.log("http://localhost:8765"));
