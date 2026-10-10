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
/* Coût sans plafond : le rang et l'ère s'appliquent à toutes les technologies.
   Ainsi les dernières découvertes restent accessibles, mais demandent un vrai investissement. */
const techRank = t => parseInt(t.id.slice(1), 10);
const techResearchCost = t => Math.round(
  t.cost * BALANCE.research.techCostMult
  * Math.pow(1 + BALANCE.research.rankCostGrowth, techRank(t) - 1)
  * Math.pow(BALANCE.research.eraCostGrowth, t.era - 1) * 2
) / 2;
TECH.forEach(t => {
  const source = OV[t.id] || CYC[t.branch][(techRank(t) - 1) % 4];
  // Les surcharges précises bénéficient elles aussi de la montée en puissance par ère.
  const eraMult = 1 + BALANCE.techScaling.eraStep * (t.era - 1);
  const effect = Object.fromEntries(Object.entries(source).map(([lever, base]) => [
    lever, base >= 1 ? Math.round(base * eraMult * 2) / 2 : Math.round(base * eraMult * 1000) / 1000
  ]));
  FX[t.id] = effect;
  t.effects = fxText(effect).join(' · ');
  t.rp = techResearchCost(t);
});

/* ---------------------------------------------------------------------
   Nouvelle partie
   fresh(budget, horizon) : budget de départ (M) et durée du mandat (années),
   choisis dans la fenêtre de démarrage (valeurs par défaut : BALANCE.setup).
   state.endYear = année de fin du mandat
   state.sites[i] = { colonized, pop, b:{hab:n,farm:n,…}, mission:{arrival,duration}|null }
   state.contracts = contrats tirés : [{ id, from, deadline, done, failed, kind, amount }]
                     (définition dans CONTRACT_POOL, config.js)
   state.tech = liste d'ids de technologies développées
   Les contrats sont tirés par newGame() (actions.js), pas ici.
   --------------------------------------------------------------------- */
function fresh(budget = BALANCE.setup.budget.def, horizon = BALANCE.setup.horizon.def) {
  const S = BALANCE.start;
  return {
    startYear: S.year,
    endYear: S.year + horizon,
    year: S.year,
    budget,
    rp: S.rp,
    confidence: S.confidence,
    sites: SITES.map(() => ({ colonized: false, pop: 0, b: {}, mission: null, project: null })),
    tech: [],
    contracts: [],
    effects: [],        // effets temporaires des événements : { lever, value, until, label }
    event: null,        // événement en attente de décision
    nextEvent: S.year + BALANCE.events.firstMin
             + Math.floor(Math.random() * (BALANCE.events.firstMax - BALANCE.events.firstMin + 1)),
  };
}

/* ---------------------------------------------------------------------
   Objectifs ONU (CONTRACT_POOL, config.js)
   eligibleContracts : écarte ceux déjà proposés, pas encore « débloqués » (def.after),
   ceux dont l'échéance dépasse la fin du mandat, ceux déjà remplis (sauf « hold »,
   qui doit au contraire être vrai au moment du tirage).
   --------------------------------------------------------------------- */
function eligibleContracts(st) {
  const elapsed = st.year - st.startYear;
  const offered = new Set([...st.contracts.map(c => c.id), ...(st.offer || []).map(o => o.id)]);
  return CONTRACT_POOL.filter(d =>
    !offered.has(d.id) &&
    elapsed >= (d.after || 0) &&
    st.year + d.years <= st.endYear &&
    (d.hold ? d.check(st) : !d.check(st)));
}

/* Prépare une proposition { id, tier, kind, amount, penalty } : type de récompense tiré au hasard
   (pondéré), montant et pénalité fixés dès maintenant et multipliés par le palier. */
function makeProposal(st, def, tier = 'medium') {
  const K = BALANCE.contracts, T = K.tiers[tier], elapsed = st.year - st.startYear;
  let roll = Math.random() * Object.values(K.rewardWeights).reduce((a, b) => a + b, 0), kind = 'conf';
  for (const [k, w] of Object.entries(K.rewardWeights)) { if ((roll -= w) < 0) { kind = k; break; } }
  const base = kind === 'conf'
    ? Math.max(3, def.reward * K.rewardValue.conf)
    : def.reward * K.rewardValue[kind] * (1 + elapsed * K.rewardGrowth);
  const amount = kind === 'budget' ? Math.round(base * T.reward / 5) * 5 : Math.round(base * T.reward);
  // Cible et délai propres au palier (les cibles d'argent et de population sont arrondies)
  const target = def.target && def.scale !== false ? (def.target >= 50 ? Math.round(def.target * T.target / 10) * 10 : Math.round(def.target * T.target)) : null;
  const years = Math.max(5, Math.round(def.years * T.time));
  return { id: def.id, tier, kind, amount, target, years, penalty: Math.min(-1, Math.round(def.penalty * T.penalty)) };
}

/* Transforme une proposition en objectif actif */
function addContract(st, p) {
  const def = CONTRACT_BY_ID[p.id];
  const entry = { ...p, from: st.year, deadline: st.year + (p.years || def.years), done: false, failed: false };
  st.contracts.push(entry);
  return entry;
}

/* Tirage direct d'un objectif au hasard (objectifs imposés du début de partie) */
function drawContract(st) {
  const pool = eligibleContracts(st);
  if (!pool.length) return null;
  return addContract(st, makeProposal(st, pool[Math.floor(Math.random() * pool.length)], 'medium'));
}

/* Draft : 3 objectifs de difficulté croissante (récompense de base faible → forte).
   On pioche un objectif dans chaque tiers du pool trié ; le palier multiplie récompense et pénalité. */
function makeOffer(st) {
  const pool = eligibleContracts(st).sort((a, b) => a.reward - b.reward);
  if (!pool.length) return null;
  const n = Math.min(BALANCE.contracts.draftSize, pool.length), tiers = ['easy', 'medium', 'hard'].slice(3 - n);
  const picks = [];
  for (let k = 0; k < n; k++) {
    const lo = Math.floor(k * pool.length / n), hi = Math.floor((k + 1) * pool.length / n);
    const slice = pool.slice(lo, Math.max(hi, lo + 1)).filter(d => !picks.some(p => p.id === d.id));
    if (slice.length) picks.push(makeProposal(st, slice[Math.floor(Math.random() * slice.length)], tiers[k]));
  }
  st.offer = picks;
  return picks;
}

let state = fresh();

/* Helpers de lecture */
const has = id => state.tech.includes(id);                 // techno développée ?
const ready = t => t.prerequisites.every(has);             // prérequis remplis ?
const tname = id => TECH.find(t => t.id === id)?.name || id;
