// Tanıtım görüntüleri: oyunu başlıksız tarayıcıda yüksek kalitede açıp sahneler kurar, 1920x1080 ekran görüntüsü alır.
// Çalıştırma: node marketing/cek.cjs [en|tr]  → marketing/raw/<dil>-*.png
const { chromium } = require('playwright'), { spawn } = require('child_process'), path = require('path');
const DIL = process.argv[2] || 'en', OUT = path.join(__dirname, 'raw'), PORT = 8820;
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'serve.js')], { env: { ...process.env, PORT }, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 700));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ locale: DIL === 'tr' ? 'tr-TR' : 'en-US', viewport: { width: 1920, height: 1080 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const ev = (f, a) => p.evaluate(f, a), bekle = (ms) => p.waitForTimeout(ms);
  const cek = async (ad, ms = 5000) => { await bekle(ms); await p.screenshot({ path: path.join(OUT, `${DIL}-${ad}.png`) }); console.log('çekildi', ad); };
  const temiz = () => ev(() => { document.getElementById('dugmeler').style.display = 'none'; });
  await p.addInitScript((d) => { try { localStorage.setItem('kk-dil', d); localStorage.setItem('kk-tuslar', '1'); } catch (e) {} }, DIL);
  await p.goto(`http://localhost:${PORT}/?debug&tek&kalite=2`); await bekle(1500);
  await ev((d) => { document.getElementById('ad').value = d === 'tr' ? 'Ertuğrul' : 'Big Joe'; }, DIL); await p.click('#kur'); await bekle(1200); await temiz();
  const adlar = DIL === 'tr' ? ['Mehmet', 'Ayşe', 'Hasan'] : ['Slim', 'Rusty', 'Doc'];
  await ev((a) => a.forEach((n, i) => G.mkPlayer('p' + i, n)), adlar);
  await cek('1-bar', 14000);
  // yola çık: dört kişi, koltuklar dolu, kasada iş var
  await ev(() => { G.startGame(6); G.T.cd = 0.01; const T = G.T; T.autoT = 9999; T.nFire = T.nBot = T.nextFlat = 999; G.PC.used = [1, 1, 1, 1, 1]; T.Z = 300; T.X = G.cx(300); }); await bekle(2500);
  const yerles = () => ev(() => { const P = (id) => G.players.get(id), ben = [...G.players.keys()][0];
    const s1 = P('p0'), s2 = P('p1'); s1.seat = 1; s1.seatT = 0; s2.seat = 2; s2.seatT = 0; for (const q of G.players.values()) q.seatCd = 0;
    G.place(P(ben), 0.6, 1.95, -2.3); G.place(P('p2'), -0.5, 1.95, -3.8); });
  await yerles();
  await ev(() => { const T = G.T; T.nFire = 0; T.flat = [0, 0, 1, 0]; T.dmg = [0, 0, 0, 14]; }); await bekle(1500);
  await ev(() => { G.EX.holder = 'p2'; G.EX.hand = 0; G.players.get('p2').inp = { g: 1 }; G.T.nBot = 0; }); await cek('2-kasa', 6000);
  // polis kovalamacası, biri polisin tavanında
  await ev(() => { const T = G.T; T.nFire = T.nBot = 999; G.FIRE.on = false; T.Z = 1250; T.X = G.cx(1250); Object.assign(G.PC, { st: 2, x: 0.3, z: -9.4, hp: 64, slip: 0, ram: 9, geri: 0, darbe: 0, t: 0 }); }); await bekle(1500);
  await ev(() => { const ben = [...G.players.keys()][0]; G.place(G.players.get(ben), G.PC.x, 3.4, G.PC.z); }); await cek('3-polis', 5500);
  // şoför ve yolcu görüşleri
  await ev(() => { G.PC.st = 0; const T = G.T; T.Z = 600; T.X = G.cx(600); T.th = Math.atan2(G.cx(601) - G.cx(599), 2); T.phi = 0; const ben = [...G.players.keys()][0], me = G.players.get(ben); G.players.get('p0').seat = 0; G.place(G.players.get('p0'), 0, 1.95, -2); G.place(me, 0.7, 2.1, 1.2); });
  await bekle(600); await p.keyboard.press('KeyE'); await bekle(800); await ev(() => { G.players.get('p1').inp = { mx: 1 }; }); await cek('4-sofor', 5000);
  await ev(() => { G.players.get('p1').inp = {}; G.players.get('p1').seat = 0; G.place(G.players.get('p1'), 0, 1.95, -3); }); await p.keyboard.press('KeyE'); await bekle(600);
  await ev(() => { const ben = [...G.players.keys()][0], me = G.players.get(ben); me.seatCd = 0; me.stun = 0; G.place(me, -0.7, 2.1, 1.2); const T = G.T; T.Z = 1120; T.X = G.cx(1120); T.th = Math.atan2(G.cx(1121) - G.cx(1119), 2); });
  await bekle(600); await p.keyboard.press('KeyE'); await cek('5-yolcu', 5000);
  await p.keyboard.press('KeyE'); await bekle(600);
  // tanker ve yağmur
  await ev(() => { const T = G.T; T.Z = 800; T.X = G.cx(800); T.fuel = 35; Object.assign(G.TKS, { st: 2, x: 3.3, z: 0, t: 0, valve: 20 }); G.NZ.dock = true; const ben = [...G.players.keys()][0]; G.place(G.players.get(ben), 1.0, 1.95, 0.2); G.place(G.players.get('p2'), 1.0, 1.95, -1.6); });
  await cek('6-tanker', 6000);
  console.log('hatalar', errs.slice(0, 3)); await b.close(); srv.kill();
})();
