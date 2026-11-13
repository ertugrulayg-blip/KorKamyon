// Ayarlar paneli (ses seviyeleri, oyuncular, oyuncu çıkarma) ve tuş rehberi.
import { net, sesKaydet, sesSeviye, ui } from './state.js';
import { DIL, L, dilDegisince, dilSec, sayfayiCevir } from './dil.js';
import { mikKipi, sesModu, sesleriUygula } from './sohbet.js';
import { $, COL } from './world.js';
import { TOUCH } from './input.js';

let getV = () => null, kickFn = null;
const acik = (id) => !$(id).classList.contains('kapali');
export const panelAcik = () => acik('ayar') || acik('tuslar');

// Oyuncuların sesli sohbet ses seviyesini <audio> öğelerine uygular.

function kaydirici(etiket, deger, degisti) {
  const s = document.createElement('label'); s.className = 'kay';
  s.innerHTML = `<span>${etiket}</span><input type="range" min="0" max="100" step="5"><b></b>`;
  const g = s.querySelector('input'), y = s.querySelector('b');
  g.value = Math.round(deger * 100); y.textContent = g.value;
  g.oninput = () => { y.textContent = g.value; degisti(g.value / 100); };
  return s;
}

// Oyuncu listesi: ses seviyesi ve (oda sahibi için, lobide) çıkarma düğmesi
let listeIz = '';
function oyuncuListesi() {
  const V = getV(), el = $('oyuncular'); if (!V) return;
  const lobide = V.T.s === 'lobby', iz = DIL + V.p.map((p) => p.id + p.n).join() + lobide + net.isHost;
  if (iz === listeIz) return; listeIz = iz; el.innerHTML = '';
  for (const p of V.p) {
    if (p.bt) continue;
    const sat = document.createElement('div'); sat.className = 'oyuncu';
    const ad = document.createElement('span'); ad.className = 'ad'; ad.textContent = p.n + (p.id === net.myId ? L('sen') : ''); ad.style.color = '#' + COL[p.c % 4].toString(16).padStart(6, '0'); sat.appendChild(ad);
    if (p.id !== net.myId) {
      sat.appendChild(kaydirici('🔊', ui.ses.kisi[p.id] ?? 1, (v) => { ui.ses.kisi[p.id] = v; sesleriUygula(); }));
      if (net.isHost) {
        const b = document.createElement('button'); b.textContent = L('cikar'); b.className = 'cikar';
        if (lobide) b.onclick = () => { if (confirm(L('cikarSor', p.n))) kickFn(p.id); }; else { b.disabled = true; b.title = L('yalnizLobi'); }
        sat.appendChild(b);
      }
    }
    el.appendChild(sat);
  }
  if (net.isHost && !lobide) { const n = document.createElement('div'); n.className = 'not'; n.textContent = L('cikarNot'); el.appendChild(n); }
}

export function ayarAc(ac = !acik('ayar')) { $('ayar').classList.toggle('kapali', !ac); if (ac) { $('tuslar').classList.add('kapali'); listeIz = ''; oyuncuListesi(); } }
export function tuslarAc(ac = !acik('tuslar')) { $('tuslar').classList.toggle('kapali', !ac); if (ac) $('ayar').classList.add('kapali'); }

export function initPanel(opts) {
  getV = opts.getV; kickFn = opts.kick;
  const sesler = () => { const s = $('sesler'); s.innerHTML = '';
    s.appendChild(kaydirici(L('muzik'), ui.ses.muzik, (v) => { ui.ses.muzik = v; sesKaydet(); }));
    s.appendChild(kaydirici(L('efekt'), ui.ses.efekt, (v) => { ui.ses.efekt = v; sesKaydet(); }));
    s.appendChild(kaydirici(L('oyuncuSes'), ui.ses.oyuncu, (v) => { ui.ses.oyuncu = v; sesKaydet(); sesleriUygula(); }));
    // sesli sohbet kipi
    const k = document.createElement('div'); k.className = 'kay'; k.innerHTML = `<span>${L('ses_mod')}</span><div class="kip"></div>`; s.appendChild(k);
    for (const m of ['kapali', 'acik', 'bas']) { const b = document.createElement('button'); b.textContent = L('mod_' + m); b.className = mikKipi() === m ? 'secili' : ''; b.onclick = async () => { await sesModu(m); sesler(); }; k.lastChild.appendChild(b); } };
  sesler(); dilDegisince(() => { sesler(); listeIz = ''; if (acik('ayar')) oyuncuListesi(); });
  $('ayarBtn').onclick = () => ayarAc(); $('tusBtn').onclick = () => tuslarAc();
  for (const b of document.querySelectorAll('.pkapat')) b.onclick = () => { ayarAc(false); tuslarAc(false); };
  if (TOUCH) $('tusBtn').style.display = 'none'; // tuş rehberi yalnız klavye için
  setInterval(() => acik('ayar') && oyuncuListesi(), 500);
  addEventListener('keydown', (e) => {
    if (e.repeat || $('menu').style.display !== 'none' || e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.code === 'KeyH') tuslarAc(); else if (e.code === 'KeyO') ayarAc(); else if (e.code === 'Escape' && panelAcik()) { ayarAc(false); tuslarAc(false); }
  });
  // bilgisayarda ilk açılışta tuş rehberi kendiliğinden gelir
  let ilk = true; try { ilk = !localStorage.getItem('kk-tuslar'); localStorage.setItem('kk-tuslar', '1'); } catch (e) {}
  if (!TOUCH && ilk) tuslarAc(true);
}
