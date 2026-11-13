// Steam kapak görsellerini ve logoyu üretir: arka plan oyun görüntüsü (marketing/raw/hero-*.png), üstünde Luckiest Guy logo.
// Çalıştırma: node marketing/kapak.cjs  → marketing/steam/*.png
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
const R = (f) => path.join(__dirname, f), OUT = R('steam');
const b64 = (f) => fs.readFileSync(R(f)).toString('base64');
const FONT = `@font-face{font-family:LG;src:url(data:font/ttf;base64,${b64('font/LuckiestGuy-Regular.ttf')})}`;
const BAR = `data:image/png;base64,${b64('raw/hero-bar.png')}`, GENIS = `data:image/png;base64,${b64('raw/hero-genis.png')}`;
// logo: iki satır, sarı dolgu, kalın koyu kontur, kırmızı gölge (kabartma)
const logo = (px, extra = '', tek = false) => `<div class="logo${tek ? ' tek' : ''}" style="font-size:${px}px;${extra}"><span>ROAD</span><span>HOGS</span></div>`; // tek: tek satır
const CSS = `${FONT}*{margin:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden;background:transparent}
.bg{position:absolute;inset:0;background-size:cover;background-repeat:no-repeat}
.koyu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,6,4,.55) 0%,rgba(10,6,4,.1) 45%,rgba(10,6,4,.65) 100%)}
.logo{position:absolute;font-family:LG;line-height:.86;text-align:center;color:#ffd23f;transform:rotate(-4deg);display:flex;flex-direction:column;align-items:center;
  -webkit-text-stroke:.09em #1b1206;paint-order:stroke fill;text-shadow:0 .07em 0 #c0392b,0 .12em 0 #1b1206,0 .2em .25em rgba(0,0,0,.6);letter-spacing:.02em}
.logo span:last-child{color:#ff6a3d}.logo.tek{flex-direction:row;justify-content:center;gap:.28em}`;
const sayfa = (w, h, ic) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body style="width:${w}px;height:${h}px">${ic}</body></html>`;
const ISLER = [
  // ad, genişlik, yükseklik, içerik
  ['header_capsule', 920, 430, `<div class="bg" style="background-image:url(${GENIS});background-size:auto 118%;background-position:50% 100%"></div><div class="koyu"></div>${logo(92, 'left:0;right:0;top:16px', true)}`],
  ['small_capsule', 462, 174, `<div class="bg" style="background-image:url(${GENIS});background-size:auto 150%;background-position:50% 80%;filter:brightness(.5)"></div>${logo(64, 'left:0;right:0;top:48px', true)}`],
  ['main_capsule', 1232, 706, `<div class="bg" style="background-image:url(${GENIS});background-size:auto 118%;background-position:50% 100%"></div><div class="koyu"></div>${logo(132, 'left:0;right:0;top:30px', true)}`],
  ['vertical_capsule', 748, 896, `<div class="bg" style="background-image:url(${GENIS});background-size:auto 104%;background-position:33.5% 100%"></div><div class="koyu"></div>${logo(150, 'left:0;right:0;top:34px')}`],
  ['library_capsule', 600, 900, `<div class="bg" style="background-image:url(${GENIS});background-size:auto 104%;background-position:33.5% 100%"></div><div class="koyu"></div>${logo(124, 'left:0;right:0;top:40px')}`],
  ['library_header', 920, 430, `<div class="bg" style="background-image:url(${GENIS});background-size:auto 118%;background-position:50% 100%"></div><div class="koyu"></div>${logo(92, 'left:0;right:0;top:16px', true)}`],
  ['page_background', 1438, 810, `<div class="bg" style="background-image:url(${GENIS});background-position:50% 50%;filter:blur(6px) brightness(.45) saturate(.8)"></div>`],
  ['library_logo', 1280, 720, logo(300, 'left:0;right:0;top:110px')],
  ['community_icon', 184, 184, `<div class="bg" style="background:#1b1206"></div><div class="logo" style="font-size:96px;left:0;right:0;top:40px"><span>RH</span></div>`],
  ['client_icon_256', 256, 256, `<div class="bg" style="background:radial-gradient(circle,#d8432f 0%,#7a1f17 75%);border-radius:48px"></div><div class="logo" style="font-size:130px;left:0;right:0;top:58px"><span>RH</span></div>`],
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [ad, w, h, ic] of ISLER) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.setContent(sayfa(w, h, ic)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    const seffaf = ad === 'library_logo' || ad === 'client_icon_256';
    await p.screenshot({ path: path.join(OUT, ad + (seffaf ? '.png' : '.jpg')), type: seffaf ? 'png' : 'jpeg', quality: seffaf ? undefined : 92, omitBackground: seffaf }); await p.close(); console.log(ad, w + 'x' + h);
  }
  // kütüphane arka planı: yazısız geniş bar görüntüsü olduğu gibi
  fs.copyFileSync(R('raw/hero-genis.png'), path.join(OUT, 'library_hero.png')); console.log('library_hero 3840x1240');
  await b.close();
})();
