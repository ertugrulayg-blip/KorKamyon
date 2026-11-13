# Yol haritası — Steam'e giden yol

Durum işaretleri: ✅ bitti · 🔨 sürüyor · ⬜ sırada · 🙋 proje sahibinin işi

## 1. Temel
- ✅ Kodu modüllere bölmek (`src/`), kütüphaneleri depoya almak (`lib/`)
- ✅ Duman testi (`npm test`) ve her gönderimde çalışan CI
- ✅ Masaüstü sürümü (Electron) ve CI'da Windows `.exe`
- ✅ Yol haritası, karar defteri, çalışma notları
- ⬜ Kodun okunurluğu: uzun satırları açmak, `sim.js`'i alt dosyalara ayırmak (dokundukça)

## 2. Dikey dilim: tek harita, tam cilalı
- ✅ Sanat yönü: ücretsiz (CC0) Kenney low-poly modelleri (bkz. KARARLAR)
- ✅ Model altyapısı (`src/models.js`, `assets/`), grafik kalite seviyeleri (`?kalite=0|1|2`)
- ✅ Çevre: orman, çadır, köy karoları; banket ve yol kenar çizgileri
- ✅ Güneş gölgeleri, darbe sarsıntısı, teker tozu
- ✅ Polis arabası (Car Kit), engeller: arızalı arabalar ve koniler
- ✅ Yol kenarı süsleri: ağaç, kaya, çalı, çiçek, kütük (Nature Kit, toplu çizim)
- ✅ Kamyon ve dorse ayrıntıları (ızgara, farlar, egzoz, tahta kasa, lambalar, plaka), tanker, dönen jantlar (`src/detail.js`)
- ✅ Karakterler: bot, kemer, yelek arması, baş üstünde isim; egzoz dumanı
- ✅ CI: ana dala her birleştirmede Releases sayfasına `.exe` yayınlanır
- ✅ İskeletli karakter (Meshy): oyunda fizikle (IK), barda oturarak; oyuncu renkleri koddan boyanıyor
- ✅ Barda kemik animasyonları: nefes, etrafa bakma, top atarken bilek, biradan yudum, gülme
- ✅ Ayarlar: müzik / efekt / oyuncu sesi, oyuncu başına ses, lobide oyuncu çıkarma; bilgisayarda tuş rehberi (H)
- ✅ Yük dengesi: normal çarpmada sandık düşmez, yalnız hızlı sert çarpmada 0–3 sandık gider
- ✅ Mavi karakter (Meshy)
- ✅ Şoför görüşü: göz tablonun hizasında (gökyüzü ve ağaç tepeleri görünür, yol görünmez); yağmurda cam buğulanır
- ✅ Koltuk 1 dakika; fırlayan koltuk yaylanıp uçar, yenisi yerine düşer
- ✅ Yolcu: korna (haydudu irkiltir), çivi (kovalayan polise), silecek hatası düzeltildi
- ✅ Bar: kupa elde, avuç yukarı top
- ✅ Dört kamyoncu ve haydut (Meshy); haydut lobide barmen, mavi taburenin yanında ayakta, kolları bağlı — 🙋 Meshy'de üretmek; şu an hepsi aynı kamyoncunun boyanmış hali
- ⬜ Haydut için ayrı model; sandık ve alet kutuları; bar sahnesinin cilası
- ⬜ Kıvılcım, egzoz dumanı, fren izi, su/yağ sıçraması
- ⬜ Kalite ayarının menüden seçilmesi; telefonda performans ölçümü — 🙋 gerçek telefonda deneme
- ⬜ Gerçek ses kayıtları ve müzik (CC0 ya da satın alınmış) — 🙋 kulak onayı
- ⬜ Ana menü, ayarlar (ses, grafik, tuşlar), "nasıl oynanır"
- ⬜ Gamepad desteği
- 🙋 Tanıdıklara oynatıp "para verir miydin" diye sormak

## 3. Steam hesabı ve mağaza sayfası
- 🙋 Steamworks hesabı, kayıt ücreti, vergi ve banka bilgisi
- 🙋 İsim kontrolü: "Road Hogs" adında oyun/marka var mı
- ⬜ Mağaza metni, kapak görselleri, ekran görüntüleri
- 🙋 Sayfayı "yakında" olarak yayınlamak (istek listesi birikmeye başlasın)

## 4. Steam ağı
- ⬜ Oda kurma ve arkadaş daveti: Steam lobileri ve Steam ağına geçiş
- ⬜ Sesli sohbetin Steam üzerinden çalışması
- 🙋 İki bilgisayarda Steam açıkken deneme

## 5. İçerik
- ⬜ Yeni haritalar / rastgele üretilen yollar, farklı ortamlar
- ⬜ İlerleme: açılan kamyonlar, kostümler, zorluk seviyeleri
- ⬜ Puan ve rekorlar
- ⬜ Yalnız ve iki kişiyle oynanabilirlik (ölçeklenen zorluk ya da botlar)

## 6. Demo ve çıkış
- ⬜ Demo sürümü, Steam Next Fest
- 🙋 Fragman için oyun görüntüsü çekmek (kurgusu asistandan)
- ⬜ CI'dan Steam'e otomatik yükleme — 🙋 hesap anahtarını depoya gizli olarak eklemek
- ⬜ Erken erişim çıkışı, geri bildirimle güncellemeler
