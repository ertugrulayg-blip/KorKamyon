// Model yükleyici: glTF/GLB dosyalarını bir kez indirir, kopyalarını sahneye yerleştirir.
import { GLTFLoader } from '../lib/GLTFLoader.js';

const loader = new GLTFLoader(), cache = new Map();
export const KENNEY = 'assets/kenney/';

// Modeli yükler; bulunamazsa null döner (oyun modelsiz de çalışır).
export function loadModel(url) {
  if (!cache.has(url)) {
    cache.set(url, new Promise((res) => loader.load(url, (g) => {
      g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      res(g.scene);
    }, undefined, () => { console.warn('model yüklenemedi: ' + url); res(null); })));
  }
  return cache.get(url);
}

// Modelin bir kopyasını (geometri paylaşılır) verilen yere koyar.
export async function spawn(url, parent, x, y, z, s = 1, ry = 0) {
  const m = await loadModel(url); if (!m) return null;
  const c = m.clone(); c.position.set(x, y, z); c.scale.setScalar(s); c.rotation.y = ry; parent.add(c); return c;
}

// Modelin dokusundaki bir renk ailesini değiştirerek yeni görünüm üretir (ör. mor kamyonet → beyaz polis aracı).
// degistir(r, g, b) → [r, g, b] ya da null (dokunma). Aynı malzeme için sonuç önbelleğe alınır.
const boyali = new Map();
export function recolor(obj, ad, degistir) {
  obj.traverse((o) => {
    if (!o.isMesh || !o.material.map || !o.material.map.image) return;
    const key = ad + o.material.uuid;
    if (!boyali.has(key)) {
      const img = o.material.map.image, c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) { const n = degistir(p[i], p[i + 1], p[i + 2]); if (n) { p[i] = n[0]; p[i + 1] = n[1]; p[i + 2] = n[2]; } }
      g.putImageData(d, 0, 0);
      const m = o.material.clone(), t = o.material.map.clone(); t.image = c; t.needsUpdate = true; m.map = t; boyali.set(key, m);
    }
    o.material = boyali.get(key);
  });
  return obj;
}
// Mor tonlarını beyaza çevirir (gölgelendirme korunur).
export const morBeyaz = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 30 || !(b >= g && r > g + 12 && b > g + 25)) return null; const v = 150 + (mx / 255) * 100; return [v, v, v + 5]; };
