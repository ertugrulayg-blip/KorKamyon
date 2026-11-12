# Yol haritası — Steam'e giden yol

Durum işaretleri: ✅ bitti · 🔨 sürüyor · ⬜ sırada · 🙋 proje sahibinin işi

## 1. Temel
- ✅ Kodu modüllere bölmek (`src/`), kütüphaneleri depoya almak (`lib/`)
- ✅ Duman testi (`npm test`) ve her gönderimde çalışan CI
- ✅ Masaüstü sürümü (Electron) ve CI'da Windows `.exe`
- ✅ Yol haritası, karar defteri, çalışma notları
- ⬜ Kodun okunurluğu: uzun satırları açmak, `sim.js`'i alt dosyalara ayırmak (dokundukça)

## 2. Dikey dilim: tek harita, tam cilalı
- ⬜ Sanat yönü kararı ve model paketi seçimi (bkz. KARARLAR)
- ⬜ Kamyon, dorse, karakterler, polis, tanker, çevre modelleri
- ⬜ Işık, gölge, toz/duman/kıvılcım efektleri, ekran sarsıntısı
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
