/* =====================================================================
   STATE — état de la partie + génération des effets de technologies
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   Effets des technologies (calculés une fois au chargement)
   FX[id]   → objet d'effets, ex. FX.P01 = { launch: 0.25 }
   t.effects → texte lisible, t.rp → coût réel en points de recherche
   Les tables CYC / OV / BALANCE sont dans config.js.
   --------------------------------------------------------------------- */
const FX = {};
TECH.forEach(t => {
  let effect = OV[t.id];                                   // surcharge manuelle ?
  if (!effect) {
    // sinon : effet du cycle de la branche, renforcé par l'ère
    const [lever, base] = CYC[t.branch][(parseInt(t.id.slice(1)) - 1) % 4];
    const eraMult = 1 + BALANCE.techScaling.eraStep * (t.era - 1);
    const value = base >= 1
      ? Math.round(base * eraMult * 2) / 2                  // arrondi à 0,5
      : Math.round(base * eraMult * 1000) / 1000;           // arrondi à 0,001
    effect = { [lever]: value };
  }
  FX[t.id] = effect;
  t.effects = fxText(effect).join(' · ');
  t.rp = t.cost * BALANCE.research.techCostMult;
});

/* ---------------------------------------------------------------------
   Nouvelle partie
   state.sites[i] = { colonized, pop, b:{hab:n,farm:n,…}, mission:{arrival,duration}|null }
   state.contracts[i] = { done, failed }  (définition dans CONTRACTS, config.js)
   state.tech = liste d'ids de technologies développées
   --------------------------------------------------------------------- */
function fresh() {
  const S = BALANCE.start;
  return {
    year: S.year,
    budget: S.budget,
    rp: S.rp,
    confidence: S.confidence,
    sites: SITES.map(() => ({ colonized: false, pop: 0, b: {}, mission: null })),
    tech: [],
    contracts: CONTRACTS.map(() => ({ done: false, failed: false })),
  };
}

let state = fresh();

/* Helpers de lecture */
const has = id => state.tech.includes(id);                 // techno développée ?
const ready = t => t.prerequisites.every(has);             // prérequis remplis ?
const tname = id => TECH.find(t => t.id === id)?.name || id;
