// Eğitim: oyunun her işini sırayla öğretir. Yalnız oda sahibinde çalışır; adım numarası T.egitim ile istemcilere gider.
// Kamyon eğitim boyunca kimse şoför koltuğunda değilse kendi kendine yavaşça gider; eğitimde oyun bitmez.
import { CR, FIRE, T, bitir, haydutGetir, haydutVar, players, say, yanginCikar } from './sim.js';

const otur = (s) => [...players.values()].some((p) => p.seat === s);
// her adım: bas() başlarken, bitti() tamamlanınca bir sonrakine geçilir; en az 4 sn okunur
export const ADIM = [
  { bas() {}, bitti: () => T.egT > 16 || (otur(1) && T.egT > 8) }, // koltuklar ve sürüş
  { bas() { T.flat[2] = 1; say('lastikPat', 2); }, bitti: () => !T.flat[2] }, // lastik
  { bas() { T.dmg[3] = Math.max(T.dmg[3], 15); }, bitti: () => T.dmg[3] <= 0 }, // matkap
  { bas() { T.heat = 92; T.isiUyari = true; }, bitti: () => T.heat < 40 }, // hararet
  { bas() { yanginCikar(); }, bitti: () => !FIRE.on }, // yangın
  { bas() {}, bitti: () => T.egT > 14 }, // sandık taşıma
  { bas() { T.fuel = Math.min(T.fuel, 35); }, bitti: () => T.fuel >= 90 }, // tanker
  { bas() { haydutGetir(); }, bitti: () => !haydutVar() && T.egT > 2 }, // haydut
  { bas() { T.hedef = T.Z + 120; }, bitti: () => false }, // hedefe sür
];

export function stepEgitim(dt) {
  if (T.state !== 'run' || T.egitim < 0 || T.cd > 0) return;
  T.egT += dt; T.heat = T.egitim === 3 ? T.heat : Math.min(T.heat, 20); T.fuel = T.egitim === 6 ? T.fuel : Math.max(T.fuel, 60);
  for (const c of CR) if (c.lost) { c.lost = false; c.x = c.x0; c.z = c.z0; c.vx = c.vz = 0; } // eğitimde yük kaybolmaz
  const a = ADIM[T.egitim];
  if (T.egitim === ADIM.length - 1) { if (T.Z >= T.hedef) bitir(); return; }
  if (T.egT > 4 && a.bitti()) { T.egitim++; T.egT = 0; ADIM[T.egitim].bas(); say('egTamam'); }
}
