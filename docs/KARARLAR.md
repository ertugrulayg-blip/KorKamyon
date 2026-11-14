# Karar defteri

Yeni kararlar en üste eklenir. Her kayıt: tarih, karar, neden.

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
