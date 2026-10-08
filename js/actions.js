/* =====================================================================
   ACTIONS — ce que le joueur peut faire (modifie `state`, puis re-rend l'UI)
   ===================================================================== */
'use strict';

const SAVE_KEY = 'spacemandat-save2';

/* Lancer une mission de colonisation vers le site i */
function launch(i) {
  const s = state.sites[i], S = SITES[i], cost = missionCost(i);
  if (s.colonized || s.mission) return;
  if (S.req && !has(S.req)) { toast('Technologie requise : ' + tname(S.req)); return; }
  if (state.budget < cost)  { toast('Budget insuffisant pour cette mission.'); return; }

  state.budget -= cost;
  s.mission = { arrival: state.year + duration(i), duration: duration(i) };
  toast('Mission lancée vers ' + S.n + ' · arrivée ' + s.mission.arrival);
  render();
}

/* Construire un bâtiment de type k (clé de ARCH) sur le site i */
function build(i, k) {
  const s = state.sites[i];
  const a = ARCH.find(x => x.k === k);
  const c = siteCalc(i), cost = bCost(i, a);
  const techId = k === 'spec' ? SITES[i].st : a.tech;      // techno requise éventuelle

  if (!s.colonized) return;
  if (techId && !has(techId)) { toast('Technologie requise : ' + tname(techId)); return; }
  if (c.used >= c.slots)      { toast('Site plein : augmentez la population.'); return; }
  if (state.budget < cost)    { toast('Budget insuffisant pour ce bâtiment.'); return; }

  state.budget -= cost;
  s.b[k] = (s.b[k] || 0) + 1;
  toast(SITES[i].nm[ARCH.indexOf(a)] + ' construit · ' + SITES[i].n);
  render();
}

/* Développer une technologie (dépense des points de recherche) */
function researchTech(id) {
  const t = TECH.find(x => x.id === id);
  if (!t || has(id)) return;
  if (!ready(t))        { toast('Prérequis manquants.'); return; }
  if (state.rp < t.rp)  { toast('Points de recherche insuffisants.'); return; }

  state.rp -= t.rp;
  state.tech.push(id);
  toast(t.id + ' · ' + t.name + ' : ' + t.effects);
  render();
}

/* ---------------------------------------------------------------------
   Passage d'une année (= un « tour »)
   Ordre des opérations :
     1. revenus − entretien   (déficit → budget remis à 0 et perte de confiance)
     2. + recherche
     3. évolution de la population de chaque colonie
     4. variation de confiance, année + 1
     5. arrivée des missions (nouvelle colonie)
     6. évaluation des contrats
     7. bilan affiché
   --------------------------------------------------------------------- */
function nextYear() {
  if (state.year >= BALANCE.endYear) { toast('Fin du mandat atteinte.'); return; }

  const T = totals(), M = getModifiers();
  const pop0 = T.pop, conf0 = state.confidence;
  const P = BALANCE.population;

  // 1. Budget
  state.budget += T.bud - T.upk;
  if (state.budget < 0) {
    state.budget = 0;
    state.confidence -= BALANCE.economy.deficitConfPenalty;
    toast('Déficit : la confiance de l’UN baisse.');
  }

  // 2. Recherche
  state.rp += T.res;

  // 3. Population : décroît vers la capacité si dépassée, sinon croît
  state.sites.forEach((s, i) => {
    if (!s.colonized) return;
    const cap = siteCalc(i).cap;
    s.pop = s.pop > cap
      ? Math.max(cap, s.pop * P.declineRate)
      : Math.min(cap, s.pop + P.growthFlat + s.pop * P.growthRate * (1 + M.grow));
  });

  // 4. Confiance et année
  state.confidence = Math.max(0, Math.min(100, state.confidence + T.conf));
  state.year++;

  // 5. Arrivée des missions
  state.sites.forEach((s, i) => {
    if (s.mission && s.mission.arrival <= state.year) {
      s.mission = null;
      s.colonized = true;
      s.pop = BALANCE.colony.arrivalPop;
      state.confidence = Math.min(100, state.confidence + BALANCE.colony.arrivalConf);
      toast('Colonie établie : ' + SITES[i].n);
    }
  });

  // 6. Contrats (définitions dans CONTRACTS, config.js)
  CONTRACTS.forEach((def, i) => {
    const c = state.contracts[i];
    if (c.done || c.failed) return;
    if (def.check(state)) {
      c.done = true;
      state.confidence = Math.min(100, state.confidence + def.reward * (1 + M.reward));
      toast('Contrat réussi : ' + def.name);
    } else if (state.year > def.deadline) {
      c.failed = true;
      state.confidence = Math.max(0, state.confidence + def.penalty);
      toast('Contrat échoué : ' + def.name);
    }
  });

  // 7. Bilan du tour
  renderBilan({ T, pop0, pop1: totals().pop, conf0 });
  render();
}

/* ---------------------------------------------------------------------
   Sauvegarde locale (localStorage du navigateur)
   --------------------------------------------------------------------- */
function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  toast('État sauvegardé localement.');
}

function load() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) { toast('Aucune sauvegarde (les anciennes ne sont plus compatibles).'); return; }
  state = JSON.parse(raw);
  render();
  toast('Sauvegarde chargée.');
}
