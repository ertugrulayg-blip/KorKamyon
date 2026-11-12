// Duman testi: oyunu tek kişilik hata ayıklama kipinde (?debug&tek) başlıksız tarayıcıda açar, ana sistemleri tetikler.
// Çalıştırma: node test/smoke.cjs   (playwright gerekir; ekran görüntüleri test/out/ altına yazılır)
const { chromium } = require('playwright'), { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const PORT = 8791, OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'serve.js')], { env: { ...process.env, PORT }, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 700));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = [], fail = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const ok = (ad, kosul, ek = '') => { console.log((kosul ? '  ✓ ' : '  ✗ ') + ad + (ek ? '  ' + ek : '')); if (!kosul) fail.push(ad); };
  const ev = (f, a) => p.evaluate(f, a), bekle = (ms) => p.waitForTimeout(ms), shot = (n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  try {
    await p.goto(`http://localhost:${PORT}/?debug&tek&kalite=0`); await bekle(1200); await p.click('#kur'); await bekle(1500);
    ok('lobi açıldı', await ev(() => G.T.state === 'lobby' && G.players.size === 1)); await shot('1-lobi');
    await p.keyboard.press('Enter'); await bekle(2000); ok('geri sayım: kamyon bekliyor', await ev(() => G.T.state === 'run' && G.T.cd > 0 && G.T.v === 0));
    await bekle(3800); ok('kamyon yola çıktı', await ev(() => G.T.v > 6 && G.T.Z > 1), await ev(() => 'v=' + G.T.v.toFixed(1)));
    const sabit = () => ev(() => { const T = G.T; T.autoT = 9999; T.nextFlat = T.nFire = T.nBot = 999; T.fuel = 90; T.heat = 0; T.dmg = [0, 0, 0, 0]; T.flat = [0, 0, 0, 0]; G.PC.used = [1, 1, 1, 1, 1]; for (const c of G.CR) Object.assign(c, { lost: false, x: c.x0, z: c.z0, vx: 0, vz: 0 }); });
    await sabit(); await shot('2-yol');
    await ev(() => G.jolt(2.6, 0)); await bekle(1200); ok('sert sarsıntıda sandık düşer', await ev(() => G.CR.filter((c) => c.lost).length >= 1)); await sabit();
    await ev(() => { G.T.nFire = 0; }); await bekle(600); ok('yangın çıktı', await ev(() => G.FIRE.on)); await ev(() => { G.FIRE.hp = 0.1; G.EX.holder = 'ben'; G.EX.p = [G.FIRE.x, 1.8, G.FIRE.z]; G.players.get('ben').inp.g = 1; });
    await ev(() => { G.T.nBot = 0; }); await bekle(1500); ok('haydut geldi', await ev(() => !!G.BOT));
    await ev(() => { const me = G.players.get('ben'); for (let i = 0; i < 3; i++) G.hitPlayer(me, G.BOT, 1, 0); }); await bekle(2500); ok('üç şaplakta haydut gitti', await ev(() => !G.BOT)); await sabit();
    await ev(() => { G.T.heat = 99.9; }); await bekle(800); ok('hararetten motor stop etti', await ev(() => G.T.stall)); await sabit(); await ev(() => { G.T.stall = false; });
    await ev(() => { const T = G.T; G.PC.used = []; T.Z = 480; T.X = G.cx(480); T.th = Math.atan2(G.cx(481) - G.cx(479), 2); T.phi = 0; T.v = 16; }); for (let i = 0; i < 30 && !(await ev(() => G.PC.st === 2)); i++) await bekle(500); ok('hız sınırı aşıldı: polis kovalıyor', await ev(() => G.PC.st === 2), await ev(() => 'st=' + G.PC.st)); await shot('3-polis');
    await ev(() => G.pourOil(G.players.get('ben'))); await bekle(500); ok('yağda polis kaydı', await ev(() => G.PC.slip > 0 && G.PC.hp < 100)); await ev(() => { G.PC.hp = 0; }); await bekle(4500); ok('polis saf dışı', await ev(() => G.PC.st === 3 || G.PC.st === 0));
    await sabit(); await ev(() => { const me = G.players.get('ben'); me.dead = 0; me.seatCd = 0; G.place(me, 0.7, 2.1, 1.2); }); await bekle(400); await p.keyboard.press('KeyE'); await bekle(1000); ok('şoför koltuğuna oturdu', await ev(() => G.players.get('ben').seat === 1)); await shot('4-sofor');
    await ev(() => { G.players.get('ben').seatT = 119.5; }); await bekle(1500); ok('2 dakikada koltuk fırlattı', await ev(() => G.players.get('ben').seat === 0));
    await ev(() => { G.T.dmg = [40, 30, 20, 15]; }); await bekle(500); ok('can bitince oyun biter', await ev(() => G.T.state === 'over'));
    await p.keyboard.press('Enter'); await bekle(600); ok('yeniden: lobiye döndü', await ev(() => G.T.state === 'lobby'));
  } catch (e) { fail.push('istisna: ' + e.message); console.log(e); }
  ok('tarayıcı hatası yok', errs.length === 0, errs.slice(0, 5).join(' | '));
  await b.close(); srv.kill(); console.log(fail.length ? `BAŞARISIZ: ${fail.length}` : 'HEPSİ GEÇTİ'); process.exit(fail.length ? 1 : 0);
})();
