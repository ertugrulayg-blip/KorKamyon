# Karakterler

- `govde.glb` — proje sahibinin Meshy AI ile ürettiği tombul motorcu ("Chunky Cartoon Biker", image-to-3D).
  `tools/govde_iskelet.py` (Blender) ile: köşeler birleştirilip 1,2 milyon yüzden 20 bin yüze sadeleştirildi, doku yeni UV'ye
  2048 olarak yeniden pişirildi (Meshy'nin parçalı ağı sadeleşince çatlak gibi delikler açıyordu), boyu 1,43 m'ye ölçeklendi,
  iskelet (Mixamo kemik adları, 18 kemik) elle yerleştirildi, ağırlıklar kemiklere uzaklıkla verildi. Asıl dosya proje sahibinin Drive'ında.
- Oyuncu renkleri kotun maviliği koddan boyanarak verilir; haydut (kara kot, kırmızı tişört) ve barmen (kahverengi pantolon) aynı gövdeyi kullanır (`src/rig.js`).
- Eski modeller (trucker, mavi, sarı, yeşil, haydut) git geçmişinde.
- Lisans: Meshy'nin ticari kullanım şartları proje sahibi tarafından kontrol edilecek (Steam öncesi).
