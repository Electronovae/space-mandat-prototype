/* =====================================================================
   UTILS — petits helpers sans lien avec les règles du jeu
   ===================================================================== */
'use strict';

const $ = id => document.getElementById(id);            // raccourci getElementById
const pc = v => Math.round(v * 100) + ' %';             // 0.25 → "25 %"
const R = (n, d = 0) => Number(n).toFixed(d);           // arrondi en texte (d décimales)
const money = n => Math.round(n) + 'M';                 // 420 → "420M"

/** Affiche un message temporaire. Les messages s'EMPILENT (avant, chacun écrasait le précédent
    et les notifications de fin d'année se perdaient). kind : '' | 'good' | 'bad' | 'info'. */
function toast(text, kind = '') {
  const box = $('toast');
  if (!box || !box.appendChild) return;
  const el = document.createElement('div');
  el.className = 'toast-item ' + kind;
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();       // pas plus de 4 à l'écran
  setTimeout(() => el.remove(), 3600 + Math.min(2400, box.children.length * 400));
}

/**
 * Transforme un objet d'effets ({launch:.25, flat:1}) en liste de textes lisibles.
 * Pour changer le libellé d'un levier, modifier la table LABELS ci-dessous.
 */
const FX_LABELS = {
  rate:   v => `+${v} PR/an`,
  lab:    v => `+${pc(v)} production des labos`,
  mine:   v => `+${pc(v)} revenus des mines`,
  flat:   v => `+${v}M/an`,
  launch: v => `−${pc(v)} coût des missions`,
  travel: v => `−${pc(v)} durée des trajets`,
  build:  v => `−${pc(v)} coût des bâtiments`,
  cap:    v => `+${pc(v)} capacité d’accueil`,
  grow:   v => `+${pc(v)} croissance démographique`,
  food:   v => `+${pc(v)} production alimentaire`,
  power:  v => `+${pc(v)} effet des centrales`,
  conf:   v => `+${R(v, 2)} confiance/an`,
  far:    v => `+${R(v * 100, 0)} pts de bonus de distance`,
  crew:   v => `−${pc(v)} équipage requis`,
  reward: v => `+${pc(v)} récompenses d’objectifs`,
  energy: v => `+${pc(v)} énergie produite par les centrales`,
};

function fxText(effects) {
  return Object.keys(effects)
    .filter(k => effects[k] && FX_LABELS[k])
    .map(k => FX_LABELS[k](+R(effects[k], 3)));
}

/* Texte d'une récompense d'objectif : { kind, amount } → « +20 confiance », « +240M », « +32 PR » */
const PAYOUT_LABELS = {
  conf:   a => `+${Math.round(a)} confiance`,
  budget: a => `+${Math.round(a)}M de trésorerie`,
  rp:     a => `+${Math.round(a)} PR`,
};
const payoutText = p => PAYOUT_LABELS[p.kind](p.amount);
