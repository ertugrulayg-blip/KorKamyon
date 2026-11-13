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
- ✅ Koltuk 30 saniye; fırlayan koltuk yaylanıp uçar, yenisi yerine düşer
- ✅ Yolcu yalnız yön anlatır (sola, sağa, yavaşla, hızlan) ve tanker çağırır; korna, çivi ve silecek kaldırıldı
- ✅ Yolcu kendi koltuğundan yolu görür (ileri penceresi kalktı); tankeri yalnız yolcu çağırır
- ✅ Bar: kupa elde, avuç yukarı top
- ✅ Dört kamyoncu ve haydut (Meshy); haydut lobide barmen, mavi taburenin yanında ayakta, kolları bağlı — 🙋 Meshy'de üretmek; şu an hepsi aynı kamyoncunun boyanmış hali
- ⬜ Haydut için ayrı model; sandık ve alet kutuları; bar sahnesinin cilası
- ⬜ Kıvılcım, egzoz dumanı, fren izi, su/yağ sıçraması
- ⬜ Kalite ayarının menüden seçilmesi; telefonda performans ölçümü — 🙋 gerçek telefonda deneme
- ⬜ Gerçek ses kayıtları ve müzik (CC0 ya da satın alınmış) — 🙋 kulak onayı
- ⬜ Ana menü, ayarlar (ses, grafik, tuşlar), "nasıl oynanır"
- ⬜ Gamepad desteği
- 🙋 Tanıdıklara oynatıp "para verir miydin" diye sormak

## Oyun testi geri bildirimi (13.11, Alper)
- ✅ Bağlantısı kopan oyuncu 7 sn içinde odadan düşer; oda sahibinden 9 sn haber alamayan istemci menüye döner
- ✅ Sandıklar tutulup taşınabilir
- ✅ Koltuk yerine düşünce (4 sn) fırlayan dahil herkes hemen oturabilir
- ✅ Tankerin üstünde durunca ölme hatası (vana açılamıyordu) düzeltildi
- ✅ Hararet, yağ ve vana: işaret ve ekranda "F" ipucu; etki alanı genişledi
- ✅ Sesli sohbet isteğe bağlı (varsayılan kapalı), açık mikrofon ya da bas-konuş (V); her oyuncunun sesi ayrı ayarlanır (WebAudio, iPhone dahil)
- 🙋 Sesli sohbet ve kopma: gerçek iki-üç cihazla denenmeli

## Aşamalar, eğitim, puan (13.11 geri bildirimi)
- ✅ Aşamalar: Eğitim, 100, 500, 1000, 1500, 2000, 2500 m. Her aşama yeni olaylar açar, bitirince sonraki açılır (`ASAMA` world.js, `kk-acik`)
- ✅ Eğitim: 9 adım, her işi tek tek tetikleyip öğretir; kamyon kendi gider, oyun bitmez (`src/egitim.js`)
- ✅ Olaylar daha geç başlar ve üst üste binmez (yangın, haydut, lastik, polis birbirini bekler)
- ✅ Oyuncu puanları ve sayaçlar; anlık "+50" balonu; final: yıldızlar, konfeti, madalyalı sıralama tablosu
- 🙋 Puan değerleri ve aşama zorluğu: oynayıp ayarlanmalı

## 3. Steam hesabı ve mağaza sayfası
- 🙋 Steamworks hesabı, vergi formu (W-8BEN tamamlandı), banka bilgisi, kayıt ücreti
- 🙋 İsim kontrolü: "Road Hogs" adında oyun/marka var mı (Overwatch'taki "Roadhog" karakterine dikkat)
- 🙋 Meshy lisansının ticari kullanım hakkı
- ✅ İngilizce sürüm (`src/dil.js`): tüm arayüz, ekran yazıları, tuş rehberi ve oyun mesajları
- ✅ Mağaza metinleri İngilizce ve Türkçe (`marketing/STEAM-SAYFASI.md`)
- ✅ Kapak görselleri, logo, simgeler ve 6 ekran görüntüsü (`marketing/steam/`, betikler `marketing/*.cjs`) — ⏸ oyun tamamlanınca yeniden üretilecek
- ✅ Tanıtım sayfası (`tanitim/`, GitHub Pages'te `/tanitim/`)
- ⬜ Fragman — 🙋 oyun kaydı
- ⬜ Sistem gereksinimleri — 🙋 düşük donanımda deneme
- 🙋 Sayfayı "yakında" olarak yayınlamak

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
