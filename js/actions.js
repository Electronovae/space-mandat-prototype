/* =====================================================================
   ACTIONS — ce que le joueur peut faire (modifie `state`, puis re-rend l'UI)
   ===================================================================== */
'use strict';

const SAVE_KEY = 'spacemandat-save3';   // v3 : horizon variable + contrats tirés au hasard

/* Démarre une nouvelle partie avec le budget et l'horizon choisis (fenêtre de démarrage).
   Les contrats sont tirés ici, une fois `state` en place (certains contrats lisent l'état global). */
function newGame(budget, horizon) {
  state = fresh(budget, horizon);
  for (let k = 0; k < BALANCE.contracts.initial; k++) {
    const c = drawContract(state);
    if (c) c.isNew = true;                 // badge « nouveau » dans l'onglet Objectifs
  }
  makeOffer(state);                        // premier draft : le joueur choisit un 3e objectif
  treeSel = null;
  render();
  toast('Mandat ' + state.startYear + ' → ' + state.endYear + ' · ' + state.contracts.length + ' objectifs ONU imposés, un à choisir.');
}

/* Draft ONU : accepter la proposition k, ou refuser toute l'offre */
function acceptOffer(k) {
  const p = state.offer && state.offer[k];
  if (!p) return;
  const c = addContract(state, p);
  c.isNew = true;
  state.offer = null;
  toast('Objectif accepté : ' + contractName(c), 'info');
  render();
}
function refuseOffer() {
  if (!state.offer) return;
  state.offer = null;
  state.confidence = Math.max(0, state.confidence - BALANCE.contracts.refusePenalty);
  toast('Offre de l’ONU refusée · −' + BALANCE.contracts.refusePenalty + ' confiance', 'bad');
  render();
}

/* Journal de l'année : chaque événement est notifié (toasts empilés) ET listé dans le bilan,
   pour qu'aucune information ne soit perdue quand plusieurs choses arrivent la même année. */
let yearEvents = [];
function logEvent(text, kind = '') {
  yearEvents.push({ text, kind });
  toast(text, kind);
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
  toast('Mission d’installation lancée vers ' + S.n + ' · arrivée en ' + s.mission.arrival);
  render();
}

/* Construire un bâtiment de type k (clé de ARCH) sur le site i */
function build(i, k) {
  const s = state.sites[i], S = SITES[i];
  const a = ARCH.find(x => x.k === k);
  const c = siteCalc(i), cost = bCost(i, a);
  const techId = k === 'spec' ? SITES[i].st : a.tech;      // techno requise éventuelle

  if (!s.colonized) return;
  if (k === 'spec' && s.project && !s.project.done) { toast('Un Gros projet est déjà en chantier.'); return; }
  if (k === 'spec' && s.b.spec >= a.max) { toast('Nombre maximal de Gros projets atteint.'); return; }
  if (techId && !has(techId)) { toast('Technologie requise : ' + tname(techId)); return; }
  if (c.used >= c.slots)      { toast('Plus d’emplacement libre : la colonie doit grandir (ou détruisez un bâtiment).'); return; }
  if (state.budget < cost)    { toast('Budget insuffisant pour ce bâtiment.'); return; }

  state.budget -= cost;
  if (a.project) {
    const years = BALANCE.costs.projectYears;
    s.project = { done: false, progress: 0, duration: years, name: S.nm[ARCH.indexOf(a)] };
    toast('Gros projet lancé sur ' + S.n + ' · chantier de ' + years + ' ans.');
  } else {
    s.b[k] = (s.b[k] || 0) + 1;
    toast(S.nm[ARCH.indexOf(a)] + ' construit · ' + S.n);
  }
  render();
}


/* Détruire un bâtiment : libère un emplacement sans remboursement. */
function demolish(i, k) {
  const s = state.sites[i];
  if (!s || !s.colonized || !(s.b[k] > 0)) return;
  const a = ARCH.find(x => x.k === k);
  const label = a ? SITES[i].nm[ARCH.indexOf(a)] : 'Bâtiment';
  // Un Gros projet coûte très cher : on demande confirmation
  if (k === 'spec' && typeof confirm === 'function' && !confirm('Détruire « ' + label + ' » ? Aucun remboursement.')) return;
  s.b[k]--;
  if (!s.b[k]) delete s.b[k];
  toast(label + ' détruit · emplacement libéré.');
  render();
}

/* Développer une technologie (dépense des points de recherche) */
function researchTech(id) {
  const t = TECH.find(x => x.id === id);
  if (!t || has(id)) return;
  if (!ready(t))        { toast('Prérequis manquants.'); return; }
  if (state.rp < t.rp)  { toast('Points de recherche (PR) insuffisants.'); return; }

  state.rp -= t.rp;
  state.tech.push(id);
  toast(t.id + ' · ' + t.name + ' : ' + t.effects);
  render();
}

/* ---------------------------------------------------------------------
   Passage d'une année (= une année)
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
  if (state.over) { showEndReport(); return; }
  if (state.event) { showEvent(); return; }                         // l'événement doit être tranché
  if (state.offer && state.offer.length) { showDraft(); return; }   // le draft ONU aussi

  refreshProjectEfficiency();
  const T = totals(), M = getModifiers();
  const pop0 = T.pop, conf0 = state.confidence;
  yearEvents = [];

  // 1. Budget
  state.budget += T.bud - T.upk;
  if (state.budget < 0) {
    state.budget = 0;
    state.confidence -= BALANCE.economy.deficitConfPenalty;
    logEvent('Déficit : la confiance de l’ONU baisse.', 'bad');
  }

  // 2. Recherche
  state.rp += T.res;

  // Chantier des Gros projets : 5 années, achevé seulement si le bilan énergétique est suffisant.
  state.sites.forEach((s, i) => {
    if (!s.colonized || !s.project || s.project.done) return;
    const energy = siteCalc(i).energyRatio;
    if (energy < 1) return;
    s.project.progress++;
    if (s.project.progress >= s.project.duration) {
      s.project.done = true;
      s.b.spec = (s.b.spec || 0) + 1;
      s.project = null;
      logEvent('Gros projet achevé : ' + SITES[i].nm[5] + ' (' + SITES[i].n + ')', 'good');
    }
  });

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
      logEvent('Colonie établie : ' + SITES[i].n + ' · vous pouvez y construire', 'good');
    }
  });

  // 6. Contrats (définitions dans CONTRACT_POOL, config.js)
  state.contracts.forEach(c => {
    if (c.done || c.failed) return;
    const def = CONTRACT_BY_ID[c.id];
    const ok = contractOk(c);
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
      logEvent('Objectif réussi : ' + contractName(c) + ' · ' + payoutText(pay), 'good');
    } else if (result === 'fail') {
      c.failed = true;
      const pen = c.penalty ?? def.penalty;
      state.confidence = Math.max(0, state.confidence + pen);
      logEvent('Objectif échoué : ' + contractName(c) + ' · ' + pen + ' confiance', 'bad');
    }
  });

  // Tous les N ans : l'ONU propose un draft de 3 objectifs (tant qu'il n'y en a pas trop d'actifs)
  const K = BALANCE.contracts;
  const active = state.contracts.filter(c => !c.done && !c.failed).length;
  if ((state.year - state.startYear) % K.offerEvery === 0 && active < K.maxActive && makeOffer(state))
    logEvent('L’ONU propose de nouveaux objectifs : choisissez-en un', 'info');

  // Effets temporaires qui s'achèvent, puis éventuel événement aléatoire
  (state.effects || []).filter(e => e.until === state.year).forEach(e => logEvent('Fin de l’effet : ' + e.label, 'info'));
  state.effects = (state.effects || []).filter(e => e.until > state.year);
  if (state.nextEvent && state.year >= state.nextEvent && state.year < state.endYear) {
    const ev = rollEvent(state);
    if (ev) logEvent('Événement : ' + EVENT_BY_ID[ev.id].name, EVENT_BY_ID[ev.id].kind);
  }

  // Alerte confiance, révocation, fin de mandat
  const C = BALANCE.confidence;
  if (state.confidence <= C.revoke) state.over = 'revoked';
  else if (state.year >= state.endYear) state.over = 'end';
  else if (state.confidence < C.warn && conf0 >= C.warn)
    logEvent('Alerte : confiance de l’ONU sous ' + C.warn + ' %. À 0 %, le mandat est révoqué.', 'bad');

  // 7. Bilan de l'année
  renderBilan({ T, pop0, pop1: totals().pop, conf0, events: yearEvents });
  render();
  if (state.over) showEndReport();
  else if (state.event) showEvent();
  else if (state.offer) showDraft();
}

/* Score de fin de mandat (affiché dans le bilan final). Détail renvoyé pour l'affichage. */
function mandateScore(st = state) {
  const won = st.contracts.filter(c => c.done).length;
  const parts = [
    ['Colonies', nColonies(st), 100],
    ['Mondes hors du système', nExoWorlds(st), 250],
    ['Habitants', Math.round(totalPop(st)), 1],
    ['Technologies', st.tech.length, 10],
    ['Objectifs réussis', won, 60],
    ['Confiance finale', Math.round(st.confidence), 5],
  ];
  return { parts, total: parts.reduce((t, [, n, w]) => t + n * w, 0) };
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
  // Compatibilité avec les sauvegardes antérieures
  state.sites.forEach(s => { if (s.project === undefined) s.project = null; s.b = s.b || {}; });
  state.contracts = state.contracts || [];
  state.effects = state.effects || [];
  if (state.nextEvent === undefined) state.nextEvent = state.year + 3;
  render();
  toast('Sauvegarde chargée.');
  return true;
}
