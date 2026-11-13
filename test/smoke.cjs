// Duman testi: oyunu tek kişilik hata ayıklama kipinde (?debug&tek) başlıksız tarayıcıda açar, ana sistemleri tetikler.
// Çalıştırma: node test/smoke.cjs   (playwright gerekir; ekran görüntüleri test/out/ altına yazılır)
const { chromium } = require('playwright'), { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const PORT = 8791, OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'serve.js')], { env: { ...process.env, PORT }, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 700));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  const errs = [], fail = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const ok = (ad, kosul, ek = '') => { console.log((kosul ? '  ✓ ' : '  ✗ ') + ad + (ek ? '  ' + ek : '')); if (!kosul) fail.push(ad); };
  // olana(f): koşul sağlanana dek (en çok 25 sn) bekler; yavaş makinelerde sabit bekleme sürelerine güvenmemek için
  const olana = async (f, ms = 25000) => { for (const t0 = Date.now(); Date.now() - t0 < ms; await p.waitForTimeout(250)) if (await p.evaluate(f)) return true; return false; };
  const ev = (f, a) => p.evaluate(f, a), bekle = (ms) => p.waitForTimeout(ms), shot = (n) => p.screenshot({ path: path.join(OUT, n + '.png') });
  try {
    await p.goto(`http://localhost:${PORT}/?debug&tek&kalite=0`); await bekle(1200); await p.click('#kur'); await bekle(1500);
    ok('tuş rehberi ilk açılışta görünür', await olana(() => !document.getElementById('tuslar').classList.contains('kapali')));
    await p.keyboard.press('Escape'); await p.keyboard.press('KeyO'); ok('ayarlar paneli açılır', await olana(() => !document.getElementById('ayar').classList.contains('kapali')));
    await ev(() => G.mkPlayer('misafir', 'Misafir')); await bekle(800); ok('oyuncu listesinde çıkar düğmesi', await olana(() => !!document.querySelector('#oyuncular .cikar')));
    await ev(() => G.kick('misafir')); ok('oyuncu çıkarıldı', await olana(() => !G.players.has('misafir'))); await p.keyboard.press('Escape');
    ok('lobi açıldı', await olana(() => G.T.state === 'lobby' && G.players.size === 1)); await shot('1-lobi');
    ok('lobide aşama seçimi görünür', await olana(() => document.getElementById('asama').style.display === 'block')); await ev(() => { G.oyun.acik = 6; G.asamaSec(6); });
    await p.keyboard.press('Enter'); await bekle(2000); ok('geri sayım: kamyon bekliyor', await olana(() => G.T.state === 'run' && G.T.cd > 0 && G.T.v === 0));
    await bekle(3800); ok('kamyon yola çıktı', await olana(() => G.T.v > 6 && G.T.Z > 1), await ev(() => 'v=' + G.T.v.toFixed(1)));
    const sabit = () => ev(() => { const T = G.T; T.state = 'run'; T.why = ''; T.autoT = 9999; T.nextFlat = T.nFire = T.nBot = 999; T.fuel = 90; T.heat = 0; T.dmg = [0, 0, 0, 0]; T.flat = [0, 0, 0, 0]; G.PC.used = [1, 1, 1, 1, 1]; for (const c of G.CR) Object.assign(c, { lost: false, x: c.x0, z: c.z0, vx: 0, vz: 0 }); });
    await sabit(); await shot('2-yol');
    await ev(() => G.jolt(6, 0)); await bekle(1200); ok('sert sarsıntıda sandık düşer', await olana(() => G.CR.filter((c) => c.lost).length >= 1)); await sabit();
    await ev(() => { G.T.nFire = 0; }); await bekle(600); ok('yangın çıktı', await olana(() => G.FIRE.on)); await ev(() => { G.FIRE.hp = 0.1; G.EX.holder = 'ben'; G.EX.p = [G.FIRE.x, 1.8, G.FIRE.z]; G.players.get('ben').inp.g = 1; });
    await ev(() => { G.FIRE.on = false; G.T.nFire = 999; G.T.nBot = 0; }); await bekle(1500); ok('haydut geldi', await olana(() => !!G.BOT));
    await ev(() => { const me = G.players.get('ben'); for (let i = 0; i < 3; i++) G.hitPlayer(me, G.BOT, 1, 0); }); await bekle(2500); ok('üç şaplakta haydut gitti', await olana(() => !G.BOT)); await sabit();
    await ev(() => { G.T.heat = 99.9; }); await bekle(800); ok('hararetten motor stop etti', await olana(() => G.T.stall)); await sabit(); await ev(() => { G.T.stall = false; });
    await ev(() => { const T = G.T; G.PC.used = []; T.Z = 480; T.X = G.cx(480); T.th = Math.atan2(G.cx(481) - G.cx(479), 2); T.phi = 0; T.v = 16; }); for (let i = 0; i < 30 && !(await ev(() => G.PC.st === 2)); i++) await bekle(500); ok('hız sınırı aşıldı: polis kovalıyor', await olana(() => G.PC.st === 2), await ev(() => 'st=' + G.PC.st)); await shot('3-polis');
    await ev(() => G.pourOil(G.players.get('ben'))); await bekle(500); ok('yağda polis kaydı', await olana(() => G.PC.slip > 0 && G.PC.hp < 100)); await ev(() => { G.PC.hp = 0; }); await bekle(4500); ok('polis saf dışı', await olana(() => G.PC.st === 3 || G.PC.st === 0));
    await sabit(); await ev(() => { G.T.fuel = 30; Object.assign(G.TKS, { st: 2, x: 3.3, z: 0, t: 0, valve: 0, vp: 0 }); const me = G.players.get('ben'); me.dead = 0; G.place(me, 3.3, 2.6, -2.0); }); await bekle(1800);
    ok('tankerin üstünde durulabilir', await ev(() => G.players.get('ben').dead <= 0)); await ev(() => { G.TKS.st = 0; });
    await ev(() => { const c = G.CR[2], me = G.players.get('ben'); me.dead = 0; G.place(me, c.x, 1.95, c.z - 0.75); me.yaw = 0; }); await bekle(300); await p.keyboard.down('KeyJ'); await bekle(400); await p.keyboard.down('KeyS'); await bekle(1200); await p.keyboard.up('KeyS');
    ok('sandık taşınır', await olana(() => G.CR[2].z < -3.6 && G.CR[2].lift > 0.2)); await p.keyboard.up('KeyJ');
    await ev(() => { G.mkPlayer('kopuk', 'Kopuk'); G.conns.kopuk = { son: performance.now() - 8000, close() {} }; }); ok('bağlantısı kopan oyuncu düşer', await olana(() => !G.players.has('kopuk')));
    await sabit(); await ev(() => { const me = G.players.get('ben'); me.dead = 0; me.seatCd = 0; G.place(me, 0.7, 2.1, 1.2); }); await bekle(400); await p.keyboard.press('KeyE'); await bekle(1000); ok('şoför koltuğuna oturdu', await olana(() => G.players.get('ben').seat === 1)); await shot('4-sofor');
    await ev(() => { G.players.get('ben').seatT = 119.5; }); await bekle(1500); ok('2 dakikada koltuk fırlattı', await olana(() => G.players.get('ben').seat === 0));
    await ev(() => { G.T.dmg = [40, 30, 20, 15]; }); await bekle(500); ok('can bitince oyun biter', await olana(() => G.T.state === 'over'));
    await p.keyboard.press('Enter'); await bekle(600); ok('yeniden: lobiye döndü', await olana(() => G.T.state === 'lobby'));
  } catch (e) { fail.push('istisna: ' + e.message); console.log(e); }
  ok('tarayıcı hatası yok', errs.length === 0, errs.slice(0, 5).join(' | '));
  await b.close(); srv.kill(); console.log(fail.length ? `BAŞARISIZ: ${fail.length}` : 'HEPSİ GEÇTİ'); process.exit(fail.length ? 1 : 0);
})();
