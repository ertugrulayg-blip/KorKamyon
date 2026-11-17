# Karar defteri

Yeni kararlar en üste eklenir. Her kayıt: tarih, karar, neden.

## 2026-11-16 — Tesisler yan yolda (cep)
- Tesis artık ana yolun üstünde değil: sağa ayrılan 120 m'lik yan yol (cep, `cepGen`, genişlik `CEP` = 10 m; ±25 m'de tam, ±60 m'de sıfır). Düz yolda sağ bariyer cebin dışından dolanır, dağda yerleşimlerde sağ banket genişler. Satıcı yalnız kamyon cebin içinde durunca yanaşır; ana yolda durmak sayılmaz.
- Düz yol tesisleri 520 / 1320 / 2020 m (polis noktaları ve yol ayrımlarıyla çakışmasın diye).
- Kapılar alçaldı (2,7 → 2,3): yan camlar aşağı doğru geniş.

## 2026-11-16 — Erzak, durma payı, koltuk kuralları, kamera döndürme
- Kamyon durunca oyun hemen bitmez: 20 sn pay (`DUR_SURE`, `T.durT`); sayaç ekranda. Hız 1,5 m/sn'yi geçince sıfırlanır.
- Erzak (1000 m ve sonrası, sonsuz, dağ): ortak tokluk (`T.tok`, 0,4/sn azalır; bitince ekip %55 hızla yürür). Depo (eski yağ varilinin yeri): F ile meyve yenir (muz +10, portakal +15). Et çiğ yenmez: barbeküde F basılı 3 sn → +45. Başlangıç: 4 muz, 3 portakal, 2 et. Haydut 9 sn'de bir 2 erzak çalar.
- Tesisler (`TESIS`: düz yolda 450/1150/1750 m, dağda yerleşimler): kamyon önünde durunca satıcı arabası sağ yana yanaşır (`DOK` çarpışma kutusu; o yandaki korkuluk açılır), tezgâhtan 3 kasa alınır (her biri +2 muz +1 portakal +1 et), depoya bırakılır. Oyuncuların yere inmesi yok (yer fiziği yok): araba kasa hizasında.
- Yağ varili kalktı: yağı yalnız yolcu, kabindeki kolla döker (kamyonun arkasından).
- Koltuk: E en yakın boş koltuğa oturtur (1,25 m); kalkılan koltuğa 5 sn oturulmaz, öbürüne oturulur.
- Kamera: koltukta C içeriden ↔ uzaktan; uzak kamerada fare (tıklayıp kilitleyince) kamyonun çevresinde döndürür, yürüme yönü kameraya göre. Torpido alçaldı (2,7 → 2,4), ön cam aşağı doğru büyüdü.

## 2026-11-16 — Şoför mahalli: baş çevirme ve gerçek görüntülü aynalar
- Koltuktayken (şoför ve yolcu) fare ya da ekranı kaydırma başı çevirir (±115°, `ui.sBakis/sEgim`); oturunca baş öne döner.
- İki yan ayna gerçek görüntü verir: kabinin dışında geriye bakan iki kamera render hedefine çizer (256×384, kare başına biri yenilenir; yalnız içeriden bakarken). Görüntü sağ-sol ters çevrilir. Sağ ayna uzak olduğu için büyük.
- Gösterge paneli (hız, yakıt, hararet), tavan, güneşlik, direkler, sallanan zar. Tavan ve direkler yalnız içeriden bakarken görünür (üstten bakışta koltuktakileri kapatmasın).

## 2026-11-16 — Dağ yolunun son biçimi (sahibiyle görüntü üzerinden ayarlandı)
- Kenarlar üç tip kesit (`kesit(z)`, world.js): iki yanı orman düzlüğü, sağda keskin uçurum (yalnız burada düşülür), sağda hafif yamaç (9 m sürülebilir). Yan profiller `dagSol/dagSag`.
- Güneşli açık gökyüzü. Dağ yol boyunca yeşil → kayalık → karlı (`karK`); karda direksiyon geç tepki verir ve kamyon hafif kayar.
- İki yerleşim (`DKOY`): yol asfalt, çizgili, kenarda koddan çizilen ahşap dağ kulübeleri (karlı bölümde çatılar beyaz); asfaltta sarsıntı ve taş yok.
- Üçgenli (flat-shaded) görünüm istenmedi: yüzeyler pürüzsüz. Dağla ilgili görsel değişikliklerde önce görüntü gönderilip onay alınır.

## 2026-11-16 — Dağ yolunun görünümü ve düşüş
- (16.11 düzeltme) Köşeli/üçgen low-poly görünüm kaldırıldı: sahibi referanstaki dağın yapısını istemişti, üçgenleri değil. Yüzeyler pürüzsüz gölgeli, renk köşe başına yumuşak geçişli (dik yer kaya turuncusu, yatık yer yeşil, geniş ton lekeleri); yamaçlarda orman.
- (ilk hali) Görünüm sahibinin gönderdiği referansa göre: köşeli low-poly kayalar (dik yüzler turuncu-kiremit, düz yüzler zeytin yeşili), katman katman uzak dağlar, gün batımı pusu (`SIS`, `haritaIsik`), keskin S virajlar. Saç tokası virajlar yolun z'ye göre tanımlı olması yüzünden yapılamıyor.
- Uçurumdan çıkan kamyon ~3 sn yer çekimiyle düşer ve devrilir; kamera vadinin üstünde sabit kalır.
- Taşlar dağınık bölgelerde (enine/boyuna); tekerlek altından geçince sarsar. Yolun yarısını kapatan 5 büyük kaya.

## 2026-11-15 — Dağ yolu (deneme), lastik kuralı, kamera kipleri
- Aşama seçiminde "⛰ Dağ yolu" (650 m, hep açık): ayrı harita (`HARITA` = 1, world.js). Dar toprak yol (yarı genişlik 4,4 m), solda kaya duvarı (çarpınca hasar), sağda korkuluksuz uçurum (düşen kamyon = oyun biter, `ucurum`). Yol ~45 m tırmanır: yokuşta kamyon zorlanır, motor ısınır, yakıt çabuk biter, kasadakiler ve sandıklar geriye kayar; toprak sürekli sarsar; taş sıraları (`DTAS`) hızlı geçilince lastik patlatır. Polis, haydut, yangın yok (deneme).
- Çizim: dünya grubu yol yüksekliği kadar indirilir, yokuşta eğilir (`pivot.rotation.x`); dağ sahnesi ilk seçilişte kurulur, düz yolun nesneleri gizlenir.
- Lastik kendiliğinden patlamaz: yalnız bariyer/kaya duvarı sürtünmesinde (%35) ve tümsek/taşa hızlı girişte.
- Kamera: C ile üstten → birinci şahıs → üçüncü şahıs. Göz kalçadan alınıp yumuşatılır; birinci şahısta eldivenler önde görünür.
Neden: sahibinin 15.11 akşam notları (kamera baş döndürüyor, lastik çok sık, dağ yolu denemesi, sandıklar kolay düşüyor).

## 2026-11-15 — Şoför yolu görür, birinci şahıs kamera, yolcunun işleri, uzun kasa, yeni gövde
- Şoförün yolu görememesi kaldırıldı; şoför ön camdan bakar. Zor yollar (polisli bölüm, dağ, engebeli toprak) ileride şoförü zorlayacak.
- Kasadakiler C ile birinci şahıs kameraya geçebilir (fareyle bakış, W baktığın yöne). Deneme amaçlı; yukarıdan bakış varsayılan.
- Yolcu (yardımcı şoför): T ile telsizi açıp frekansı 1–4 ile tuşlayarak tankeri çağırır; polis peşteyken F ile kabindeki yağ kolunu çeker.
- Kasa 1,5 m uzadı; yan kenarlar darbede kırılır, tahta yığınından tahta alınıp çakılarak onarılır (arıza dışı iş).
- Yakıt çubuğu büyük ve yazılı, azalınca uyarı; polis yarı yarıya ve en az 2 dk arayla; ayarlarda grafik kalitesi ve mikrofon seçimi.
- Oyuncu karakterleri tek gövde: Meshy'nin tıknaz "vinyl oyuncak" kamyoncusu, iskelet Blender'da (14 değil 40 bin yüz: azaltınca gövde yeleğin içinden taşıyordu). Kısa bacaklı gövde oyunda fiziğin kalçasından aşağı çizilir.
Neden: sahibinin 15.11 notları ve arkadaşının oyun testi.

## 2026-11-14 — Lobide karakter seçimi; yeni karakter tarzı; iskelet Blender'da
- Lobide herkes karakterini seçer (aşama panelinin üstünde). Oda sahibi denetler: başkasının aldığı karakter verilmez. Seçim girdiyle gider (`kr`), tarayıcıda hatırlanır (`kk-karakter`).
- Şapka/maske gibi aksesuarlar da lobide seçilecek; yeni modeller gelince eklenecek.
- Karakter tarzı değişecek: herkes aynı tıknaz gövdede (kafa-gövde tek parça, kısa bacak, eldiven eller), farkı renk, yelek ve aksesuar. Meshy ile üretilecek; Meshy'nin otomatik iskeleti beğenilmediği için iskelet ve ağırlıklar bu ortamda Blender (bpy 5.3, başsız) ile kurulacak, kemik adları oyunun beklediği Mixamo adları.
Neden: sahibi gerçekçi modellerin sorun çıkardığını, Gang Beasts / Pummel Party tarzı ama onlara benzemeyen tek tip gövde istediğini söyledi.

## 2026-11-14 — Sonsuz yol
- Aşama seçiminde "∞ Sonsuz" (hep açık): bitiş yok, kamyon durana ya da hurdaya dönene kadar gider. Son ekranda gidilen mesafe ve rekor (oda sahibinin bilgisayarında, `kk-rekor`).
- Nasıl: yol 280 m'den sonra 2000 m'de bir kendini tekrarlar (`cx` dalga boyları 1000 ve 400 m). Engeller, tümsekler, yol ayrımları, polis noktaları ve yol kenarı süsleri [280, 2280) aralığında üretilir, 2280'den sonrası bunların kopyasıdır. Kamyon 2300 m'yi geçince 2000 m geri alınır (`donguBasa`); yağ lekeleri, çarpılmış engeller ve polis noktası durumu taşınır. Toplam mesafe `T.Z + tur × 2000`.
- Zorluk sonsuz yolda 5 km'de en üst düzeye çıkar (olay aralıkları 0,45 kata kadar kısalır).
- Yan etki: yolun virajları biraz değişti (dalga boyları 1005/358 m idi), ilk polis 380 m, son polis 2380 m; orta şerit çizgileri 9 yerine 10 m arayla. Polis levhasında "50" yerine 🚓.
Neden: sahibi "gidebildiği kadar gitsin" diye sonsuz yol tercihi istedi. Ayrı bir sonsuz yol üretmek yerine döngü seçildi: dünya bir kez kuruluyor, ağ ve çizim aynı kalıyor.

## 2026-11-14 — Kaos geri artırıldı, polis hızdan bağımsız
- Olaylar daha erken ve sık: ilk lastik 18–28 sn, ilk yangın 40–55 sn, ilk haydut 50–65 sn; tekrarlar lastik 22–38, yangın 35–55, haydut 35–50 sn (yol ilerledikçe `diff()` ile sıklaşır).
- Lastik artık yangın, haydut ya da polis sırasında da patlayabilir; yangın, haydut ve polis birbirini beklemeye devam eder.
- Aşamalar: 100 m'de lastik; 500 m'de lastik, ısınma, yangın, polis; 1000 m'den itibaren haydut da var.
- Polis hız sınırına bakmaz: kamyon polis noktasının yanından geçince kovalar (hız cezası kalktı). İlk polis 380 m'ye alındı ki 500 m aşamasında da görülsün.
- Koltuktan kalkan (kendisi, fırlatılan ya da direksiyonu kaptıran) 5 sn oturamaz: otur-kalk yaparak sürüş olmasın.
- Dönüşte savrulma %35 arttı (yana ivme katsayısı 0,55 → 0,75).
Neden: sahibinin son oyununda kaos fazla azalmış, oyun sıkıcı gelmiş; şoför sürekli otur-kalk yaparak sürebiliyormuş.

## 2026-11-13 — Steam görselleri bekletiliyor
Steam kapakları, ekran görüntüleri ve mağaza metni oyun tamamlanana kadar güncellenmeyecek; mevcut hali `marketing/` altında taslak olarak duruyor.
Neden: sahibi önce oyunun bitmesini istiyor. Oyun bitince `marketing/*.cjs` betikleriyle yeniden üretilir.

## 2026-11-13 — Aşamalar ve puanlama
Oyun tek uzun yol yerine aşamalara bölündü (Eğitim, 100, 500, 1000, 1500, 2000, 2500 m). Yol aynı 2500 m'lik yol; aşama yalnız hedef çizgisinin yerini ve açık olayları belirler.
Puanlar: sürüş 2/sn, yolculuk 1/sn, sandık taşıma 1/sn; lastik 50, tamir 40, yangın 60, soğutma 30, yakıt işleri 30 (çağırma 10), haydut kovma 50 (+5 şaplak), polis yağ 40 / atlayış 25 / saf dışı 50; çarpma −30, hızlı tümsek −20, hız cezası −20, düşme −25, koltuktan fırlama −10; aşama sonu herkese 100 + sandık başına 25.
Neden: sahibi oyunun çok hızlı kaosa döndüğünü, ilerleme ve başarı hissi gerektiğini söyledi. Değerler tahmini, oynayarak ayarlanacak.

## 2026-11-13 — Şoför görüşü: sis yerine alçak göz
Şoför artık kendi koltuğundan bakar; göz tablonun üst kenarının biraz altında. Yol hiç görünmez, gökyüzü ve uzaktaki ağaç tepeleri görünür (virajları sezebilir).
Neden: sahibi sis plakasını beğenmedi, "boyu kısa gibi" bir görüş istedi. Diğer oyuncular yukarıdan bakmaya devam ediyor.

## 2026-11-13 — Karakterler: Meshy + fizikle IK
Karakterler Meshy AI ile üretiliyor (iskeletli GLB). Hareket animasyonla değil fizikle: kemikler fizik noktalarına IK ile bağlanır.
Neden: sahibi sallanan, düşen fizik hareketini komik buluyor ve korunmasını istedi. Meshy'nin hazır animasyonları (yürüme, koşma) şimdilik kullanılmıyor.
Barda karakterler taburede oturur; eller eski pozların el noktalarına uzanır, bacaklar sarkar.
Açık: Meshy'nin ticari kullanım şartları (sahibi kontrol edecek).

## 2026-11-12 — Sanat yönü: Kenney CC0 low-poly
Görseller Kenney'nin ücretsiz, kamu malı (CC0) modelleriyle yapılıyor; ilk parti GitHub'daki başlangıç kitlerinden alındı (`assets/kenney/KAYNAK.md`).
Neden: sahibi "şimdilik bedava kaynaklarla ilerleyelim" dedi; Kenney'nin tüm paketleri aynı tarzda olduğu için tutarlı görünüyor.
Kısıt: kenney.nl otomatik indirmeyi reddediyor; başka paket gerekirse sahibi indirip depoya yükler.
Sahibi Car Kit 3.1 ve Nature Kit 2.1'i indirip yükledi; depoya yalnızca kullanılan modeller alınıyor (zip'ler depoda tutulmuyor, gerekirse yeniden yüklenir).
Nature Kit'in nane yeşili malzemeleri `models.js`'te koyu yeşile çevriliyor; eski paketlerin metalik=1 değeri sıfırlanıyor.
Kamyonun kendisi model değil, koddan çizilmeye devam ediyor: çarpışma kutuları (kasa, korkuluk, koltuklar) görüntüyle birebir örtüşmek zorunda.

## 2026-11-12 — Grafik kalite seviyeleri
0 düşük (gölge yok, seyrek manzara), 1 orta (telefon varsayılanı), 2 yüksek (bilgisayar varsayılanı). Testler 0'da koşar.
Neden: yazılım tabanlı test ortamı ve zayıf telefonlar gölge + yoğun manzarayı kaldırmıyor.

## 2026-11-12 — İş bölümü
Proje sahibi fikir ve geri bildirim verir, gerekirse model/ses satın alır, Steam hesabını ve gerçek oyun testlerini yürütür.
Geri kalan her şey (kod, görsel yerleştirme, ses bağlama, paketleme, mağaza metinleri) asistanda.
Neden: ekipte başka kimse yok.

## 2026-11-12 — Motor değiştirilmiyor
Oyun three.js + tarayıcı teknolojisiyle kalıyor; Steam için Electron ile paketleniyor.
Neden: oyun çalışıyor ve seviliyor; Unity/Godot'a geçiş her şeyi baştan yazmak demek. Tarayıcı sürümü demo ve paylaşım için de değerli.
Yeniden bakılacak durum: performans ya da Steam ağı Electron'da çözülemezse.

## 2026-11-12 — Derleme adımı yok
Kod, tarayıcının doğrudan yüklediği ES modülleri olarak duruyor; paketleyici (Vite vb.) eklenmedi.
Neden: GitHub Pages'te olduğu gibi çalışıyor, kurulum gerektirmiyor. Model ve ses dosyaları çoğalınca yeniden değerlendirilecek.

## 2026-11-12 — Kütüphaneler depoda
three.js (0.160) ve PeerJS (1.5.4) `lib/` altında; unpkg bağımlılığı kalktı.
Neden: masaüstü sürümü çevrimdışı açılabilmeli, üçüncü taraf bir dağıtım ağı çökünce oyun kapanmamalı.

## 2026-11-12 — Yayın akışı
Her değişiklik dalda yapılır, duman testi geçer, sahibin onayıyla `main`'e birleştirilir. `main` GitHub Pages'te yayınlanır.

## Açık kararlar
- **İsim:** "Road Hogs" kalıcı mı; marka/Steam araması sahibinde.
- **Fiyat ve çıkış biçimi:** erken erişim mi, tam sürüm mü.

## Steam bağlantısı (2026-11-13)
- Masaüstü sürümünde Steam açıksa oda **Steam lobisiyle** kurulur (yalnız arkadaşlar, 4 kişi). Arkadaşlar davetle ya da Steam arkadaş listesinden "Oyuna katıl" ile gelir; oda kodu gizlenir. Veri Steam'in aktarma ağından (P2P, güvenilir paket) gider. Ayrı sunucu yok: oda sahibi benzetir, eskisi gibi.
- Kütüphane: **steamworks.js** (MIT, Electron için hazır). Steamworks SDK'sı depoya konmaz (SDK sözleşmesi; gereken dll'ler kütüphanenin içinde geliyor).
- Steam yoksa (web, ya da Steam kapalı) PeerJS ve oda kodu aynen çalışır. Steam sürümüyle web sürümü birbirine bağlanamaz.
- Sesli sohbet Steam'de de PeerJS (WebRTC) ile; ses eşinin kimliği Steam numarasından türer. Steam'in kendi sesine geçiş sonraki iş.
- App ID: şimdilik Valve'ın deneme numarası 480. Steamworks (KYC + Steam Direct) bitince `desktop/steam.cjs` içindeki `APP_ID` değişir.

## Yolcu tarifi kapandı, karakterler küçüldü (2026-11)
- Şoför yolu görüyor; yolcunun A/D/W/S yol işaretleri kapatıldı (`T.sig = 0`). Yolcunun işi yağ kolu, telsiz ve soğutma pompası.
- Oyun içi karakterler 0.7 boyunda: `BOY` (world.js) fizik bedeninin ölçülerini, oturma pozunu ve modelin ölçeğini (`makeRig(..., BOY)`) birlikte küçültür. Bar sahnesindeki karakterler eski boyda.

## Yeni karakter ve levye (2026-11)
- Tüm karakterler sahibinin Meshy'de ürettiği tombul motorcu. Eski modeller (trucker, mavi, sarı, yeşil, haydut) silindi, git geçmişinde.
- Oyuncu rengi kot pantolonda; haydut kara kot + kırmızı tişört, barmen kahverengi pantolon.
- Şaplak yerine levye: herkesin sağ elinde, darbe 10 can (haydut 18). Darbede kan sıçrar, yerde leke kalır; ayarlardan kapatılabilir (mağaza yaş sınıfı için).
