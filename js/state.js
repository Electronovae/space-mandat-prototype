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
  const source = OV[t.id] || (() => {
    const [lever, base] = CYC[t.branch][(techRank(t) - 1) % 4];
    return { [lever]: base };
  })();
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
  };
}

/* ---------------------------------------------------------------------
   Tirage d'un contrat au hasard dans CONTRACT_POOL (le contrat est ajouté à st.contracts)
   Sont écartés : les contrats déjà proposés, ceux pas encore « débloqués » (def.after),
   ceux dont l'échéance dépasse la fin du mandat, ceux déjà remplis (sauf « hold »,
   qui doit au contraire être vrai au moment du tirage).
   Retourne l'entrée créée, ou null s'il ne reste rien d'éligible.
   --------------------------------------------------------------------- */
function drawContract(st) {
  const elapsed = st.year - st.startYear;
  const pool = CONTRACT_POOL.filter(d =>
    !st.contracts.some(c => c.id === d.id) &&
    elapsed >= (d.after || 0) &&
    st.year + d.years <= st.endYear &&
    (d.hold ? d.check(st) : !d.check(st)));
  if (!pool.length) return null;
  const def = pool[Math.floor(Math.random() * pool.length)];
  // Type de récompense tiré au hasard (pondéré), montant fixé dès maintenant
  const K = BALANCE.contracts;
  let roll = Math.random() * Object.values(K.rewardWeights).reduce((a, b) => a + b, 0), kind = 'conf';
  for (const [k, w] of Object.entries(K.rewardWeights)) { if ((roll -= w) < 0) { kind = k; break; } }
  const amount = kind === 'conf'
    ? def.reward
    : Math.round(def.reward * K.rewardValue[kind] * (1 + elapsed * K.rewardGrowth) / (kind === 'budget' ? 5 : 1)) * (kind === 'budget' ? 5 : 1);
  const entry = { id: def.id, from: st.year, deadline: st.year + def.years, done: false, failed: false, kind, amount };
  st.contracts.push(entry);
  return entry;
}

let state = fresh();

/* Helpers de lecture */
const has = id => state.tech.includes(id);                 // techno développée ?
const ready = t => t.prerequisites.every(has);             // prérequis remplis ?
const tname = id => TECH.find(t => t.id === id)?.name || id;
