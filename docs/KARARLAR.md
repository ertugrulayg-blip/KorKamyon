# Karar defteri

Yeni kararlar en üste eklenir. Her kayıt: tarih, karar, neden.

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
- **Sanat yönü:** hazır low-poly paket (hangisi?) mı, özel sipariş mi. Dikey dilime başlamadan verilecek.
- **İsim:** "Road Hogs" kalıcı mı; marka/Steam araması sahibinde.
- **Fiyat ve çıkış biçimi:** erken erişim mi, tam sürüm mü.
