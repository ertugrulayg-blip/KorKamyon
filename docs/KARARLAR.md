# Karar defteri

Yeni kararlar en üste eklenir. Her kayıt: tarih, karar, neden.

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
