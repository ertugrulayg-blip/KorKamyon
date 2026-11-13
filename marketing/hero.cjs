// Bar sahnesini büyük ve yazısız çeker (Steam kütüphane arka planı vb. için). node marketing/hero.cjs <genişlik> <yükseklik> <ad>
const { chromium } = require('playwright'), { spawn } = require('child_process'), path = require('path');
const [W, H, AD] = [+process.argv[2], +process.argv[3], process.argv[4]], PORT = 8821;
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, '..', 'serve.js')], { env: { ...process.env, PORT }, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 700));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }), ctx = await b.newContext({ locale: 'en-US', viewport: { width: W, height: H } }), p = await ctx.newPage();
  await p.addInitScript(() => { try { localStorage.setItem('kk-tuslar', '1'); } catch (e) {} });
  await p.goto(`http://localhost:${PORT}/?debug&tek&temiz&kalite=2`); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.getElementById('ad').value = 'Big Joe'; }); await p.click('#kur'); await p.waitForTimeout(1000);
  await p.evaluate(() => { ['Slim', 'Rusty', 'Doc'].forEach((n, i) => G.mkPlayer('p' + i, n)); document.getElementById('hud').style.visibility = 'hidden'; document.getElementById('dugmeler').style.display = 'none'; });
  await p.waitForTimeout(+process.argv[5] || 16000); await p.screenshot({ path: path.join(__dirname, 'raw', AD + '.png') }); await b.close(); srv.kill();
})();
