/* =====================================================================
   ACTIONS — ce que le joueur peut faire (modifie `state`, puis re-rend l'UI)
   ===================================================================== */
'use strict';

const SAVE_KEY = 'spacemandat-save3';   // v3 : horizon variable + contrats tirés au hasard

/* Démarre une nouvelle partie avec le budget et l'horizon choisis (fenêtre de démarrage).
   Les contrats sont tirés ici, une fois `state` en place (certains contrats lisent l'état global). */
function newGame(budget, horizon) {
  state = fresh(budget, horizon);
  for (let k = 0; k < BALANCE.contracts.initial; k++) drawContract(state);
  treeSel = null;
  render();
  toast('Mandat ' + state.startYear + '–' + state.endYear + ' · ' + state.contracts.length + ' contrats UN tirés.');
}

/* Lancer une mission de colonisation vers le site i */
function launch(i) {
  const s = state.sites[i], S = SITES[i], cost = missionCost(i);
  if (s.colonized || s.mission) return;
  const miss = missingReqs(i);
  if (miss.length) { toast('Technologies requises : ' + miss.map(tname).join(', ')); return; }
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
     6. évaluation des contrats, puis éventuel nouveau contrat tiré au hasard
     7. bilan affiché
   --------------------------------------------------------------------- */
function nextYear() {
  if (state.year >= state.endYear) { toast('Fin du mandat atteinte.'); return; }

  const T = totals(), M = getModifiers();
  const pop0 = T.pop, conf0 = state.confidence;

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
    s.pop = stepPop(s.pop, siteCalc(i).cap, M);
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

  // 6. Contrats (définitions dans CONTRACT_POOL, config.js)
  state.contracts.forEach(c => {
    if (c.done || c.failed) return;
    const def = CONTRACT_BY_ID[c.id];
    const ok = def.check(state);
    let result = null;
    if (def.hold) {                                  // à maintenir jusqu'à l'échéance
      if (!ok) result = 'fail';
      else if (state.year >= c.deadline) result = 'win';
    } else if (ok) result = 'win';
    else if (state.year > c.deadline) result = 'fail';

    if (result === 'win') {
      c.done = true;
      const pay = contractPayout(c);
      if (pay.kind === 'budget') state.budget += pay.amount;
      else if (pay.kind === 'rp') state.rp += pay.amount;
      else state.confidence = Math.min(100, state.confidence + pay.amount);
      toast('Contrat réussi : ' + def.name + ' · ' + payoutText(pay));
    } else if (result === 'fail') {
      c.failed = true;
      state.confidence = Math.max(0, state.confidence + def.penalty);
      toast('Contrat échoué : ' + def.name);
    }
  });

  // Nouveau contrat tiré au hasard tous les N ans (tant qu'il n'y en a pas trop d'actifs)
  const K = BALANCE.contracts;
  const active = state.contracts.filter(c => !c.done && !c.failed).length;
  if ((state.year - state.startYear) % K.offerEvery === 0 && active < K.maxActive) {
    const c = drawContract(state);
    if (c) toast('Nouveau contrat UN : ' + CONTRACT_BY_ID[c.id].name);
  }

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
  if (!raw) { toast('Aucune sauvegarde (les anciennes ne sont plus compatibles).'); return false; }
  state = JSON.parse(raw);
  render();
  toast('Sauvegarde chargée.');
  return true;
}
