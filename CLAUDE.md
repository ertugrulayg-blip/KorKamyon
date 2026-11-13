# Road Hogs — çalışma notları

2–4 kişilik ortak tarayıcı oyunu: kamyon durmadan hedefe varmalı. Şoförün ilerisi sisli, yolcu tarif eder,
kasadakiler lastik, yakıt, hasar, yangın, haydut ve polisle uğraşır. Hedef: Steam'de yayınlamak.

## Çalışma düzeni
- Proje sahibi yalnızca fikir ve geri bildirim verir; kod, görsel, ses, paketleme ve belgeler asistanın işidir.
- Sahibi Türkçe yazar; yanıtlar ve oyun içi metinler Türkçe.
- Değişiklikler dalda yapılır. `main`'e birleştirme (yayın) her seferinde sahibinin açık onayıyla olur.
- `main`'e birleşince web sürümü GitHub Pages'te, PC sürümü Releases sayfasında (`.exe`) kendiliğinden güncellenir.
- Ücretli model/ses gerekiyorsa sahibine "şunu satın al" denir; o alır.
- Asistan sesi duyamaz, oyunu "hissedemez", çok oyunculu deneyemez: bunlar sahibinin testine bırakılır ve açıkça söylenir.
- Büyük kararlar `docs/KARARLAR.md`'ye, plan `docs/YOL-HARITASI.md`'ye yazılır. Oturum başında ikisini de oku.

## Komutlar
- `node serve.js` → http://localhost:8765 (tek kişilik deneme: `?debug&tek`)
- `npm test` → duman testi (`test/smoke.cjs`, Playwright; görüntüler `test/out/`)
- `npm run desktop` → Electron penceresi; `npm run dist` → Windows `.exe` (CI de üretir)

## Yapı (derleme adımı yok, tarayıcı ES modülleri)
- `index.html` — menü, HUD iskeleti, CSS, dokunmatik tuşlar. `src/main.js?v=N` sürümü her yayında artırılır.
- `src/world.js` — sabitler, yol (`cx`), engeller, çarpışma kutuları. Herkes aynı dünyayı üretir (`srnd` tohumlu).
- `src/sim.js` — oyun benzetimi, **yalnız oda sahibinde** çalışır; `snap()` durumu istemcilere yollar.
- `src/scene.js` — three.js nesneleri. `src/bar.js` — lobi ve karakter modeli. `src/audio.js` — sentez ses.
- `src/input.js` — klavye/dokunmatik. `src/hud.js` — `draw(V, dt)`: çizim ve ekran yazıları.
- `src/main.js` — PeerJS ağı, mikrofon, ana döngü. `src/state.js` — paylaşılan `net` ve `ui`.
- `src/detail.js` — kamyon, dorse, tanker süslemeleri (yalnız görüntü; `Batch` ile tek ağda birleştirilir). hud.js yükler.
- `src/rig.js` — iskeletli karakter (`assets/chars/trucker.glb`): kalça fizik noktasına, kollar/bacaklar iki kemikli IK ile el/ayak noktalarına bağlanır. Model yüklenemezse eski kutu karakter görünür.
- `src/panel.js` — ayarlar (ses seviyeleri, oyuncu listesi, oda sahibi için lobide çıkarma) ve tuş rehberi. Ses ayarları `ui.ses`, `localStorage kk-ses`.
- Karakter dosyaları oyuncu rengine göre `rig.js` içindeki `KARAKTER` listesinde; olmayan renk kırmızı modelin boyanmış hali.
- `src/models.js` — glTF model yükleyici (`loadModel`, `spawn`, `recolor`). `assets/kenney/` — CC0 modeller.
- `lib/` — three.js, GLTFLoader ve PeerJS kopyaları. `desktop/` — Electron sarmalayıcı.
- Modüller sırayla bağımlıdır: world → sim → models → scene → detail → rig → bar → audio → input → hud → panel → main. Geri yönde import ekleme.
- Grafik kalitesi `ui.kalite` (0/1/2, `?kalite=N`). Yazılım GL'de yüksek kalite ~4 kare/sn: testler `kalite=0` ile koşar, ekran görüntüsü için `kalite=2` kullan ve uzun bekle.
- Dış siteler bu ortamdan kapalı; GitHub'daki açık depolar `git clone` ile alınabiliyor. kenney.nl robotları reddediyor (zorlama).

## Bilinmesi gerekenler
- Koordinatlar kamyon (dorse) çerçevesindedir: +z ileri, +y yukarı, **+x SOL**. Dünya kamyonun altında kayar.
- Çekici dorseye `HZ` mafsalından bağlıdır; kabin kutuları `b.cab` ile işaretli, `toCab/fromCab` ile dönüştürülür.
- Yeni oyun durumu eklerken: `T`/ilgili nesne → `resetGame()` → `snap()` → `hud.js` (çizim) → gerekiyorsa `audio.js`.
- Ağ: oda sahibi 60 Hz benzetir, 20 Hz durum yollar; istemciler yalnız girdi yollar. Ücretsiz PeerJS sunucusu kullanılıyor.
- `?debug` ile `window.G` üzerinden durum kurcalanabilir (testler bunu kullanır). `G.kamera` sahne kamerası (`G.cam` ayrı: kamera kipini değiştiren ayarlayıcı).
- Kod sıkışık yazılmıştır (uzun satırlar). Yeni kodu okunur yaz; eskisini dokunduğun yerde aç.
