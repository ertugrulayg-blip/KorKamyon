// Dil desteği: Türkçe ve İngilizce. Oyun içi mesajlar oda sahibinden kod olarak gelir ("kod|parametre"),
// her oyuncu kendi dilinde görür. Sabit sayfa metinleri index.html'de data-t / data-tp öznitelikleriyle çevrilir.

const KAYIT = 'kk-dil';
export let DIL = (() => { try { const k = localStorage.getItem(KAYIT); if (k === 'tr' || k === 'en') return k; } catch (e) {} return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'; })();

const teker = { tr: ['sol ön', 'sağ ön', 'sol arka', 'sağ arka'], en: ['front left', 'front right', 'rear left', 'rear right'] };
const yan = { tr: ['sol ön', 'sağ ön', 'sol arka', 'sağ arka'], en: ['front left', 'front right', 'rear left', 'rear right'] };
const yuzde = (n) => (DIL === 'tr' ? '%' + n : n + '%');

const S = {
  tr: {
    // menü ve sabit metinler
    menuAciklama: 'Şoför önünü göremez, yolcu tarif eder, kasadakiler yakıt, lastik, yangın ve polisle uğraşır. Kamyon durursa oyun biter. 2–4 kişi.',
    haydutAd: 'HAYDUT', adin: 'Adın', odaKur: 'Oda kur', kod: 'KOD', katil: 'Katıl', oyuncu: 'Oyuncu',
    tuslar: '⌨ Tuşlar', ayarlar: '⚙ Ayarlar', kapat: 'Kapat (Esc)', ses: 'SES', oyuncular: 'OYUNCULAR', dilBaslik: 'DİL / LANGUAGE', ileri: '👀 İLERİSİ',
    // aşamalar, eğitim, puan
    asamaSec: 'Aşama seç', sadeceSahip: 'Aşamayı oda sahibi seçer', egitimKisa: 'Eğitim', ilkKez: 'İlk kez mi? Eğitimle başlayın — her işi tek tek gösterir.', basla: '▶ Başla',
    asamaAd: (n, m) => (n ? 'Aşama ' + n : '🎓 Eğitim') + ' · ' + m + ' m', egBaslik: (i, n) => '🎓 Eğitim ' + i + '/' + n,
    eg: [
      'Herkes yerine! Şoför sol koltuğa, yolcu sağ koltuğa otursun (yanına git, E). Şoför yolu göremez: yolcu A/D ile yön, S ile yavaşla, W ile hızlan gösterir. Kamyon şimdilik kendi gidiyor.',
      '🛞 Lastik patladı! Kasanın arkasındaki mavi kompresörden hortumu TUT (J), sarı işaretli lastiğin yanına götür ve bekle.',
      '🔧 Kasa hasar aldı! Sarı kutudan matkabı TUT, turuncu işaretin yanına götür.',
      '🌡 Motor ısındı! Kabinde iki koltuğun arasındaki mavi işaretin yanına git, F\'ye basılı tut.',
      '🔥 Kasada yangın! Sağ öndeki kırmızı söndürücüyü TUT ve ateşe götür.',
      '📦 Sert virajda sandıklar kayar. Bir sandığa TUT ile yapış, basılı tutup yürüyerek taşı.',
      '⛽ Yakıt azaldı! Yolcu T ile tankeri çağırsın. Sarı hortumu depo ağzına (sol ön) bırak, tankerin üstüne çıkıp vanada F\'ye bas.',
      '🥷 Haydut kasaya atladı! Yanına git ve 3 kez şaplak at (K).',
      '🏁 Hazırsınız! Şoför koltuğa geçsin ve hedef çizgisine sürün.',
    ],
    asamaTamam: (n) => '🏁 AŞAMA ' + n + ' TAMAMLANDI!', egitimTamam: '🎓 EĞİTİM TAMAMLANDI!', yeniAsama: (m) => '🔓 Yeni aşama açıldı: ' + m + ' m',
    sonraki: 'ENTER: sonraki aşama', puanAd: 'puan',
    ist: { surus: (v) => '🚚 ' + dk(v) + ' sürüş', yolcu: (v) => '👀 ' + dk(v) + ' yolculuk', temiz: (v) => '🛡 ' + v + ' sn çarpmasız', lastik: (v) => '🛞 ' + v + ' lastik', hasar: (v) => '🔧 ' + v + ' tamir', yangin: (v) => '🔥 ' + v + ' yangın', su: (v) => '🌡 ' + v + ' soğutma', yakit: (v) => '⛽ ' + v + ' yakıt işi', haydut: (v) => '🥷 ' + v + ' haydut', polis: (v) => '🚓 ' + v + ' polis', carpma: (v) => '💥 ' + v + ' çarpma', dusme: (v) => '🤕 ' + v + ' düşme', firlama: (v) => '🪑 ' + v + ' fırlama', ceza: (v) => '🚨 ' + v + ' hız cezası' },
    ses_mod: 'Sesli sohbet', mod_kapali: 'Kapalı', mod_acik: 'Açık mikrofon', mod_bas: 'Bas-konuş (V)',
    mik_kapali: '🎙 Sohbete katıl', mik_acik: '🎙 Mikrofon açık', mik_sessiz: '🔇 Susturuldu', mik_bas: '🎙 Bas-konuş: V', mik_konus: '🔴 Konuşuyor', mik_izin: '🚫 Mikrofon izni yok',
    koptun: 'Oda sahibiyle bağlantı koptu.',
    ey_su: '🌡 Motora su dök', ey_yag: '🛢 Yola yağ dök', ey_vana: '⛽ Vanayı aç', ey_bekle: (s) => ' (' + s + ' sn)',
    muzik: 'Müzik', efekt: 'Efektler', oyuncuSes: 'Oyuncu sesleri', sesKisi: 'Ses', sen: ' (sen)', cikar: 'Çıkar', yalnizLobi: 'Yalnızca lobide',
    cikarSor: (a) => a + ' odadan çıkarılsın mı?', cikarNot: 'Oyuncu çıkarmak yalnızca lobide yapılabilir.',
    b_tut: 'TUT', b_saplak: 'ŞAPLAK', b_zipla: 'ZIPLA', b_kullan: 'KULLAN', b_otur: 'OTUR', b_kalk: 'KALK', b_fren: 'FREN', b_gaz: 'GAZ', b_dir: '◀ DİREKSİYON ▶', b_hareket: 'HAREKET', b_tanker: 'TANKER',
    b_sol: '⬅<br>SOLA DÖN', b_yavas: '🐢<br>YAVAŞLA', b_hizlan: '⏩<br>HIZLAN', b_sag: '➡<br>SAĞA DÖN',
    // bağlantı
    mikIzin: 'Mikrofon izni isteniyor…', baglaniyor: 'Bağlanıyor…', baglanamadi: 'Bağlanılamadı. Wi-Fi yerine mobil veriyle (ya da tersi) tekrar dene.',
    baglantiHata: (a) => 'Bağlantı hatası: ' + a, odaDolu: 'Oda dolu (4 kişi)', sahipAyrildi: 'Oda sahibi ayrıldı', kodYaz: '4 harfli oda kodunu yaz', davet: '👥 Arkadaş davet et', steamNot: 'Steam: odayı kur, sonra üstteki «Arkadaş davet et» düğmesiyle çağır. Arkadaşların Steam arkadaş listesinden «Oyuna katıl» da diyebilir.', steamHata: 'Steam odası kurulamadı ya da odaya girilemedi. Steam açık mı?', atildin: 'Oda sahibi seni odadan çıkardı.',
    // roller ve ekran
    rolBar: '<b>🍺 KAMYONCU BARI</b><br>Ekip toplanıyor…',
    rolSofor: '<b>🚚 ŞOFÖRSÜN</b><br>Boyun kısa: tablonun üstünden yolu göremezsin, yolcuyu dinle!<br>A/D direksiyon · W gaz · S fren · E kalk',
    rolYolcu: '<b>👀 YOLCUSUN</b><br>Yolu yalnız sen görürsün: şoföre tarif et!<br>A/D sola/sağa işareti · S yavaşla · W hızlan · T tanker çağır · E kalk',
    rolKasa: '<b>📦 KASADASIN</b><br>WASD yürü · Boşluk zıpla / tutunurken tırman<br>J veya sol tık TUT · K veya sağ tık ŞAPLAK<br>E koltuğa otur · F kullan (vana, yağ, su)',
    odaKodu: 'Oda kodu', kisi: 'oyuncu', baslatHost: 'Herkes hazırsa ENTER (ya da ekrana çift dokun) ile başlat', baslatBekle: 'Oda sahibinin başlatması bekleniyor',
    lobiIpucu: 'Yola çıkınca: şoför koltuğu solda, yolcu sağda. Dolu şoför koltuğunu almak için şoförün kafasına şaplak at!',
    geriSayim: 'Yerlerinizi alın, kamyon kalkıyor!', basardiniz: '🏁 BAŞARDINIZ!', oyunBitti: '💥 OYUN BİTTİ', enterYeniden: 'ENTER: yeniden',
    tumsek: (d, hizli, sinir) => '⚠ TÜMSEK ' + d + ' m' + (hizli ? ' — YAVAŞLA! (' + sinir + ' km/s altı)' : ' — hız uygun'),
    isaret: ['', '⬅ SOLA', 'SAĞA ➡', '🐢 YAVAŞ', '⏩ HIZLAN'],
    g_polis: (n) => '🚓 Polis ' + yuzde(n), g_radar: (d) => '🚓 Polis ' + d + ' m', g_ayrim: (d, sol) => '🚧 ' + d + ' m ' + (sol ? '⬅ SOL' : 'SAĞ ➡'),
    g_motor: '🌡 Motor stop', g_hararet: (n) => '🌡 Hararet ' + yuzde(n), g_yangin: '🔥 Yangın', g_haydut: '🥷 Haydut', g_yagmur: '🌧 Yağmur', g_yakit: '⛽ Yakıt az · yolcu tanker çağırsın',
    g_doluyor: 'Doluyor', g_vana: 'Vanayı aç', g_hortum: 'Hortumu tak', g_lastik: (i) => '🛞 ' + buyuk(teker.tr[i]), g_hasar: (i, d) => '🔧 ' + buyuk(yan.tr[i]) + ' −' + d,
    koltukSure: (s) => '⏱ Koltuk fırlatmasına ' + s, mikVar: '🎙 M: mikrofon aç/kapa', mikYok: '🔇 mikrofon yok', muzikTus: '🎵 N: müzik aç/kapa', oda: 'Oda', kmh: 'km/s', yuzde,
    // oyun mesajları (oda sahibinden kodla gelir)
    m: {
      egTamam: '✅ Tamam! Sıradaki görev', yolaCiktiniz: 'Yola çıktınız! Kamyon durmasın',
 hortumTak: 'Hortum depoya takıldı! Vanayı aç', firladi: (a) => a + ' koltuktan fırladı! 🪑',
      yagKaydi: (a) => a + ' yola yağ döktü — polis kaydı! 🛢', yag: (a) => a + ' yola yağ döktü 🛢', haydutUctu: '🥷 Haydut kamyondan uçtu! 👋', direksiyon: (a) => a + ' direksiyona geçti!',
      tankerYolcu: '📻 Tankeri yalnız yolcu telsizle çağırabilir', tankerDolu: 'Depo yarıdan dolu: tanker gelmez (%50 altında çağır)', tankerCagirdi: (a) => a + ' tankeri çağırdı ☎',
      vanaAcildi: 'Vana açıldı ⛽', dustu: (a) => a + ' kamyondan düştü!', havaKurtuldu: 'Basınç hortumu elinden kurtuldu!', lastikSisirdi: (a) => a + ' lastiği şişirdi 🛞',
      matkapKurtuldu: 'Matkap elinden kurtuldu!', hasarOnardi: (a) => a + ' hasarı onardı 🔧', yanginSondu: (a) => a + ' yangını söndürdü 🧯',
      yangin: '🔥 Kasada yangın! Sağ öndeki söndürücüyü TUT, ateşe götür', haydutGeldi: '🥷 Haydut kasaya atladı! Şaplakla kovun',
      polisGeldi: '🚓 Polis sizi gördü! Peşinizde', polisArkada: '🚓 Polis arkanızda! Yağ dökün ya da üstüne atlayın', polisVurdu: 'GÜM! Polis arkadan vurdu',
      polisAtladi: (a) => a + ' polis arabasının üstüne atladı! 💥', polisBitti: '🚓 Polis aracı saf dışı! Kurtuldunuz 🎉 Şoför koltuğa!',
      tankerGeldi: 'Tanker solunda! Hortumu al, vanayı aç', tankerGidiyor: 'Tanker ayrılıyor', yakitKurtuldu: 'Hortum elinden kurtuldu!',
      motorStop: '🌡 Motor hararetten stop etti! Su dökün', motorCalisti: 'Motor yeniden çalıştı 👍',
      bariyer: (i) => 'GÜM! Bariyere çarptınız: ' + yan.tr[i] + ' yan hasarlı', kapaliSerit: 'GÜM! Kapalı şeride girdiniz', engel: 'GÜM! Engele çarptınız',
      tumsekPat: (i) => 'PAT! Tümseğe hızlı girdiniz: ' + teker.tr[i] + ' lastik patladı', tumsekYavas: 'Tümsek yavaş geçildi 👍', lastikPat: (i) => 'PAT! Lastik patladı: ' + teker.tr[i],
      sandikYandi: '🔥 Bir sandık yandı!', sandikDustu: '📦 Bir sandık yola düştü! Sandıkları TUT', sandikAtti: '🥷 Haydut bir sandığı aşağı attı!',
      // oyun sonu sebepleri
      yukDokuldu: 'Bütün yük yola döküldü!', hurda: 'Kamyon hurdaya döndü!', hedef: (n) => 'Hedefe ulaştınız! 🏁 Teslim edilen yük: ' + n + '/4', yakitBitti: 'Yakıt bitti, kamyon durdu!', durdu: 'Kamyon durdu!',
    },
  },
  en: {
    menuAciklama: "The driver can't see the road, the passenger gives directions, the crew in the back fights fuel, flat tyres, fires and the police. If the truck stops, it's game over. 2–4 players.",
    haydutAd: 'BANDIT', adin: 'Your name', odaKur: 'Create room', kod: 'CODE', katil: 'Join', oyuncu: 'Player',
    tuslar: '⌨ Controls', ayarlar: '⚙ Settings', kapat: 'Close (Esc)', ses: 'SOUND', oyuncular: 'PLAYERS', dilBaslik: 'DİL / LANGUAGE', ileri: '👀 AHEAD',
    asamaSec: 'Choose a stage', sadeceSahip: 'The host picks the stage', egitimKisa: 'Tutorial', ilkKez: 'First time? Start with the tutorial — it walks you through every job.', basla: '▶ Start',
    asamaAd: (n, m) => (n ? 'Stage ' + n : '🎓 Tutorial') + ' · ' + m + ' m', egBaslik: (i, n) => '🎓 Tutorial ' + i + '/' + n,
    eg: [
      "Take your places! The driver sits on the left, the passenger on the right (walk up, press E). The driver can't see the road: the passenger signals with A/D, S to slow down, W to speed up. For now the truck drives itself.",
      '🛞 Flat tyre! GRAB (J) the air hose from the blue compressor at the back, take it to the tyre with the yellow marker and hold it there.',
      '🔧 The truck is damaged! GRAB the drill from the yellow box and take it to the orange marker.',
      '🌡 The engine is overheating! In the cab, stand by the blue marker between the seats and hold F.',
      '🔥 Fire in the back! GRAB the red extinguisher at the front right and take it to the flames.',
      '📦 Crates slide in hard turns. GRAB a crate and keep holding while you walk to carry it.',
      '⛽ Fuel is low! The passenger calls the tanker with T. Drop the yellow nozzle into the filler cap (front left), climb on the tanker and press F at the valve.',
      '🥷 A bandit jumped on! Walk up to him and slap him 3 times (K).',
      "🏁 You're ready! Driver, take the wheel and drive to the finish line.",
    ],
    asamaTamam: (n) => '🏁 STAGE ' + n + ' COMPLETE!', egitimTamam: '🎓 TUTORIAL COMPLETE!', yeniAsama: (m) => '🔓 New stage unlocked: ' + m + ' m',
    sonraki: 'ENTER: next stage', puanAd: 'pts',
    ist: { surus: (v) => '🚚 ' + dk(v) + ' driving', yolcu: (v) => '👀 ' + dk(v) + ' navigating', temiz: (v) => '🛡 ' + v + ' s crash-free', lastik: (v) => '🛞 ' + v + ' tyres', hasar: (v) => '🔧 ' + v + ' repairs', yangin: (v) => '🔥 ' + v + ' fires', su: (v) => '🌡 ' + v + ' cool-downs', yakit: (v) => '⛽ ' + v + ' refuel jobs', haydut: (v) => '🥷 ' + v + ' bandits', polis: (v) => '🚓 ' + v + ' police hits', carpma: (v) => '💥 ' + v + ' crashes', dusme: (v) => '🤕 ' + v + ' falls', firlama: (v) => '🪑 ' + v + ' ejections', ceza: (v) => '🚨 ' + v + ' speeding' },
    ses_mod: 'Voice chat', mod_kapali: 'Off', mod_acik: 'Open mic', mod_bas: 'Push to talk (V)',
    mik_kapali: '🎙 Join voice chat', mik_acik: '🎙 Mic on', mik_sessiz: '🔇 Muted', mik_bas: '🎙 Push to talk: V', mik_konus: '🔴 Talking', mik_izin: '🚫 No mic permission',
    koptun: 'Lost connection to the host.',
    ey_su: '🌡 Pour water on the engine', ey_yag: '🛢 Spill oil on the road', ey_vana: '⛽ Open the valve', ey_bekle: (s) => ' (' + s + ' s)',
    muzik: 'Music', efekt: 'Effects', oyuncuSes: 'Player voices', sesKisi: 'Volume', sen: ' (you)', cikar: 'Kick', yalnizLobi: 'Lobby only',
    cikarSor: (a) => 'Kick ' + a + ' from the room?', cikarNot: 'Players can only be kicked in the lobby.',
    b_tut: 'GRAB', b_saplak: 'SLAP', b_zipla: 'JUMP', b_kullan: 'USE', b_otur: 'SIT', b_kalk: 'STAND', b_fren: 'BRAKE', b_gaz: 'GAS', b_dir: '◀ STEERING ▶', b_hareket: 'MOVE', b_tanker: 'TANKER',
    b_sol: '⬅<br>TURN LEFT', b_yavas: '🐢<br>SLOW DOWN', b_hizlan: '⏩<br>SPEED UP', b_sag: '➡<br>TURN RIGHT',
    mikIzin: 'Asking for microphone access…', baglaniyor: 'Connecting…', baglanamadi: 'Could not connect. Try mobile data instead of Wi-Fi (or the other way round).',
    baglantiHata: (a) => 'Connection error: ' + a, odaDolu: 'Room is full (4 players)', sahipAyrildi: 'The host left', kodYaz: 'Type the 4-letter room code', davet: '👥 Invite friends', steamNot: 'Steam: create a room, then use the «Invite friends» button at the top. Friends can also click «Join Game» in their Steam friends list.', steamHata: 'Could not create or join the Steam room. Is Steam running?', atildin: 'The host kicked you from the room.',
    rolBar: '<b>🍺 TRUCKERS\' BAR</b><br>The crew is gathering…',
    rolSofor: "<b>🚚 YOU'RE DRIVING</b><br>You're too short to see over the dashboard. Listen to your passenger!<br>A/D steer · W gas · S brake · E stand up",
    rolYolcu: "<b>👀 YOU'RE THE PASSENGER</b><br>Only you can see the road: guide the driver!<br>A/D left/right sign · S slow down · W speed up · T call tanker · E stand up",
    rolKasa: "<b>📦 YOU'RE IN THE BACK</b><br>WASD walk · Space jump / climb while holding<br>J or left click GRAB · K or right click SLAP<br>E sit down · F use (valve, oil, water)",
    odaKodu: 'Room code', kisi: 'players', baslatHost: "Press ENTER (or double-tap the screen) when everyone's ready", baslatBekle: 'Waiting for the host to start',
    lobiIpucu: "On the road: driver's seat on the left, passenger on the right. Slap the driver on the head to take a taken driver's seat!",
    geriSayim: 'Take your places, the truck is leaving!', basardiniz: '🏁 YOU MADE IT!', oyunBitti: '💥 GAME OVER', enterYeniden: 'ENTER: play again',
    tumsek: (d, hizli, sinir) => '⚠ SPEED BUMP ' + d + ' m' + (hizli ? ' — SLOW DOWN! (under ' + sinir + ' km/h)' : ' — speed OK'),
    isaret: ['', '⬅ LEFT', 'RIGHT ➡', '🐢 SLOW', '⏩ FASTER'],
    g_polis: (n) => '🚓 Police ' + yuzde(n), g_radar: (d) => '🚓 Police ' + d + ' m', g_ayrim: (d, sol) => '🚧 ' + d + ' m ' + (sol ? '⬅ LEFT' : 'RIGHT ➡'),
    g_motor: '🌡 Engine stalled', g_hararet: (n) => '🌡 Overheating ' + yuzde(n), g_yangin: '🔥 Fire', g_haydut: '🥷 Bandit', g_yagmur: '🌧 Rain', g_yakit: '⛽ Low fuel · passenger, call the tanker',
    g_doluyor: 'Filling', g_vana: 'Open the valve', g_hortum: 'Connect the hose', g_lastik: (i) => '🛞 ' + buyuk(teker.en[i]), g_hasar: (i, d) => '🔧 ' + buyuk(yan.en[i]) + ' −' + d,
    koltukSure: (s) => '⏱ Seat ejects in ' + s, mikVar: '🎙 M: mute/unmute mic', mikYok: '🔇 no microphone', muzikTus: '🎵 N: music on/off', oda: 'Room', kmh: 'km/h', yuzde,
    m: {
      egTamam: '✅ Done! Next task', yolaCiktiniz: "You're on the road! Don't let the truck stop",
 hortumTak: 'Hose connected! Open the valve', firladi: (a) => a + ' got ejected from the seat! 🪑',
      yagKaydi: (a) => a + ' spilled oil — the police car skids! 🛢', yag: (a) => a + ' spilled oil on the road 🛢', haydutUctu: '🥷 The bandit flew off the truck! 👋', direksiyon: (a) => a + ' took the wheel!',
      tankerYolcu: '📻 Only the passenger can radio the tanker', tankerDolu: "Tank is over half full: the tanker won't come (call below 50%)", tankerCagirdi: (a) => a + ' called the tanker ☎',
      vanaAcildi: 'Valve open ⛽', dustu: (a) => a + ' fell off the truck!', havaKurtuldu: 'The air hose slipped out of your hand!', lastikSisirdi: (a) => a + ' pumped up the tyre 🛞',
      matkapKurtuldu: 'The drill slipped out of your hand!', hasarOnardi: (a) => a + ' fixed the damage 🔧', yanginSondu: (a) => a + ' put out the fire 🧯',
      yangin: '🔥 Fire in the back! GRAB the extinguisher at the front right and take it to the flames', haydutGeldi: '🥷 A bandit jumped on! Slap him off',
      polisGeldi: '🚓 The police spotted you! They are on your tail', polisArkada: '🚓 Police right behind you! Spill oil or jump on their car', polisVurdu: 'BANG! The police rammed you',
      polisAtladi: (a) => a + ' jumped on the police car! 💥', polisBitti: "🚓 Police car wrecked! You're free 🎉 Driver, back to your seat!",
      tankerGeldi: 'Tanker on your left! Grab the hose, open the valve', tankerGidiyor: 'Tanker is leaving', yakitKurtuldu: 'The hose slipped out of your hand!',
      motorStop: '🌡 Engine overheated and stalled! Pour water on it', motorCalisti: 'Engine running again 👍',
      bariyer: (i) => 'BANG! You hit the barrier: ' + yan.en[i] + ' side damaged', kapaliSerit: 'BANG! You drove into the closed lane', engel: 'BANG! You hit an obstacle',
      tumsekPat: (i) => 'POP! Too fast over the bump: ' + teker.en[i] + ' tyre burst', tumsekYavas: 'Speed bump taken slowly 👍', lastikPat: (i) => 'POP! Flat tyre: ' + teker.en[i],
      sandikYandi: '🔥 A crate burned up!', sandikDustu: '📦 A crate fell off! GRAB the crates', sandikAtti: '🥷 The bandit threw a crate off!',
      yukDokuldu: 'All the cargo fell off!', hurda: 'The truck is wrecked!', hedef: (n) => 'You reached the destination! 🏁 Cargo delivered: ' + n + '/4', yakitBitti: 'Out of fuel, the truck stopped!', durdu: 'The truck stopped!',
    },
  },
};
const dk = (s) => ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0');
function buyuk(s) { return s[0].toLocaleUpperCase(DIL === 'tr' ? 'tr' : 'en') + s.slice(1); }

// Metni getirir; işlevse parametrelerle çağırır.
export function L(k, ...a) { const v = S[DIL][k] ?? S.tr[k]; return typeof v === 'function' ? v(...a) : v; }
// "kod|parametre" biçimindeki oyun mesajını çevirir.
export function mesaj(s) {
  if (!s) return ''; const i = s.indexOf('|'), k = i < 0 ? s : s.slice(0, i), a = i < 0 ? undefined : s.slice(i + 1);
  const v = S[DIL].m[k] ?? S.tr.m[k]; if (v === undefined) return s;
  return typeof v === 'function' ? v(/^\d+$/.test(a) ? +a : a) : v;
}
export const mesajKod = (s) => (s ? s.split('|')[0] : '');

// index.html'deki sabit metinleri seçili dile çevirir: data-t (içerik), data-tp (placeholder). Tuş rehberi .dil-tr / .dil-en blokları.
export function sayfayiCevir() {
  document.documentElement.lang = DIL;
  for (const el of document.querySelectorAll('[data-t]')) el.innerHTML = L(el.dataset.t);
  for (const el of document.querySelectorAll('[data-tp]')) el.placeholder = L(el.dataset.tp);
  for (const b of document.querySelectorAll('[data-dil]')) b.classList.toggle('secili', b.dataset.dil === DIL);
}
const dinleyici = [];
export const dilDegisince = (f) => dinleyici.push(f);
export function dilSec(d) { if (d !== 'tr' && d !== 'en') return; DIL = d; try { localStorage.setItem(KAYIT, d); } catch (e) {} sayfayiCevir(); for (const f of dinleyici) f(); }
