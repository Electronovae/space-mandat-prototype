/* =====================================================================
   ÉVÉNEMENTS ALÉATOIRES — un tous les 2 à 7 ans (BALANCE.events)
   ---------------------------------------------------------------------
   Chaque événement :
     id, name, kind ('good' | 'bad'), weight (probabilité relative)
     pick(st)     → astre concerné (index) ou true si l'événement est possible, null sinon
     text(st, i)  → récit affiché
     options(st, i) → choix proposés : [{ label, detail, cost?, apply(st, i) → résumé }]
                    (un seul choix = événement subi, le bouton sert d'accusé de réception)
   Effets temporaires : addEffect(st, levier, valeur, années, libellé), lus par getModifiers().
   Leviers possibles : ceux de ZERO (config.js), dont grant (subvention ONU).
   ===================================================================== */
'use strict';

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const randomOf = arr => arr[Math.floor(Math.random() * arr.length)];
const colonies = (st, f = () => true) => st.sites.map((s, i) => i).filter(i => st.sites[i].colonized && f(st.sites[i], i));
const pickColony = (st, f) => { const l = colonies(st, f); return l.length ? randomOf(l) : null; };
const scaleM = st => 1 + 0.04 * (st.year - st.startYear);          // les montants suivent l'ampleur du programme

function addEffect(st, lever, value, years, label) {
  st.effects = st.effects || [];
  st.effects.push({ lever, value, until: st.year + years, label });
}

function removeBuilding(st, i, k) {
  const s = st.sites[i];
  if (!s.b[k]) return false;
  s.b[k]--; if (!s.b[k]) delete s.b[k];
  return true;
}

const EVENTS = [
  // ------------------------------ MAUVAIS ------------------------------
  { id: 'explosion', name: 'Explosion d’une centrale', kind: 'bad', weight: 3,
    pick: st => pickColony(st, s => s.b.power > 0),
    text: (st, i) => `Une surchauffe a détruit une centrale sur ${SITES[i].n}. L’équipe propose une reconstruction d’urgence.`,
    options: (st, i) => {
      const cost = Math.round(bCost(i, ARCH[4]) * 1.5);
      return [
        { label: 'Reconstruire d’urgence', detail: `la centrale est conservée`, cost,
          apply: st => `Centrale reconstruite sur ${SITES[i].n} (−${cost}M).` },
        { label: 'Encaisser la perte', detail: 'une centrale en moins',
          apply: st => { removeBuilding(st, i, 'power'); return `Centrale perdue sur ${SITES[i].n}.`; } },
      ];
    } },

  { id: 'epidemie', name: 'Épidémie', kind: 'bad', weight: 3,
    pick: st => pickColony(st, s => s.pop >= 30),
    text: (st, i) => `Un virus inconnu se propage dans la colonie de ${SITES[i].n}.`,
    options: (st, i) => {
      const cost = Math.round(12 * SITES[i].d * scaleM(st));
      return [
        { label: 'Quarantaine stricte', detail: '−10 % d’habitants', cost,
          apply: st => { st.sites[i].pop *= 0.9; return `Quarantaine sur ${SITES[i].n} : épidémie contenue.`; } },
        { label: 'Laisser faire', detail: '−35 % d’habitants, −3 confiance',
          apply: st => { st.sites[i].pop *= 0.65; st.confidence = Math.max(0, st.confidence - 3); return `L’épidémie a frappé ${SITES[i].n}.`; } },
      ];
    } },

  { id: 'filon', name: 'Un filon s’épuise', kind: 'bad', weight: 3,
    pick: st => pickColony(st, s => s.b.mine > 0),
    text: (st, i) => `Le gisement principal de ${SITES[i].n} est à sec : une mine ne produit plus rien.`,
    options: (st, i) => {
      const cost = Math.round(bCost(i, ARCH[3]) * 0.8);
      return [
        { label: 'Forer un nouveau puits', detail: 'la mine est conservée', cost,
          apply: st => `Nouveau puits foré sur ${SITES[i].n}.` },
        { label: 'Fermer la mine', detail: 'une mine en moins, emplacement libéré',
          apply: st => { removeBuilding(st, i, 'mine'); return `Mine fermée sur ${SITES[i].n}.`; } },
      ];
    } },

  { id: 'scandale', name: 'Scandale budgétaire', kind: 'bad', weight: 2,
    pick: st => st.budget > 100 || null,
    text: st => 'La presse révèle des dépassements de coûts dans le programme. L’ONU exige des comptes.',
    options: st => {
      const cost = Math.round(st.budget * 0.15);
      return [
        { label: 'Audit indépendant', detail: '15 % de la trésorerie', cost,
          apply: st => 'L’audit blanchit le programme.' },
        { label: 'Minimiser l’affaire', detail: '−8 confiance',
          apply: st => { st.confidence = Math.max(0, st.confidence - 8); return 'L’affaire laisse des traces : −8 confiance.'; } },
      ];
    } },

  { id: 'tempete', name: 'Tempête solaire', kind: 'bad', weight: 2,
    pick: st => colonies(st).length > 0 || null,
    text: st => 'Une éjection de masse coronale frappe le système : les centrales tournent au ralenti pendant 4 ans.',
    options: st => [
      { label: 'Subir', detail: '−40 % d’énergie produite, 4 ans',
        apply: st => { addEffect(st, 'energy', -0.4, 4, 'Tempête solaire : −40 % d’énergie'); return 'Centrales ralenties par la tempête.'; } },
    ] },

  { id: 'crise', name: 'Crise financière sur Terre', kind: 'bad', weight: 2,
    pick: st => st.year - st.startYear >= 8 || null,
    text: st => 'Les marchés s’effondrent : les États membres réduisent leur contribution à l’ONU.',
    options: st => [
      { label: 'Serrer les dents', detail: 'subvention ONU −50 % pendant 5 ans',
        apply: st => { addEffect(st, 'grant', -0.5, 5, 'Crise financière : subvention −50 %'); return 'La subvention de l’ONU est divisée par deux.'; } },
    ] },

  { id: 'retard', name: 'Avarie en vol', kind: 'bad', weight: 2,
    pick: st => { const l = st.sites.map((s, i) => i).filter(i => st.sites[i].mission); return l.length ? randomOf(l) : null; },
    text: (st, i) => `Le vaisseau en route vers ${SITES[i].n} signale une avarie de propulsion.`,
    options: (st, i) => {
      const cost = Math.round(missionCost(i) * 0.3);
      return [
        { label: 'Mission de secours', detail: 'aucun retard', cost, apply: st => `Avarie réparée, ${SITES[i].n} toujours en vue.` },
        { label: 'Réparer en vol', detail: '+2 ans de trajet',
          apply: st => { st.sites[i].mission.arrival += 2; st.sites[i].mission.duration += 2; return `Arrivée sur ${SITES[i].n} repoussée à ${st.sites[i].mission.arrival}.`; } },
      ];
    } },

  // ------------------------------ BONS ------------------------------
  { id: 'percee', name: 'Percée scientifique', kind: 'good', weight: 3,
    pick: st => TECH.some(t => !st.tech.includes(t.id) && t.prerequisites.every(p => st.tech.includes(p))) || null,
    text: st => 'Un laboratoire universitaire publie un résultat inattendu, directement exploitable par le programme.',
    options: st => [
      { label: 'Intégrer la découverte', detail: 'une technologie disponible offerte',
        apply: st => {
          const av = TECH.filter(t => !st.tech.includes(t.id) && t.prerequisites.every(p => st.tech.includes(p)))
            .sort((a, b) => b.rp - a.rp).slice(0, 3);        // parmi les plus chères disponibles
          if (!av.length) {                                  // plus rien à offrir : des PR à la place
            const g = Math.round(80 * scaleM(st)); st.rp += g;
            return `Pas de technologie disponible : +${g} PR à la place.`;
          }
          const t = randomOf(av); st.tech.push(t.id);
          return `Technologie offerte : ${t.id} · ${t.name} (${t.rp} PR).`;
        } },
    ] },

  { id: 'rations', name: 'Agronomie spatiale', kind: 'good', weight: 2,
    pick: st => colonies(st).length > 0 || null,
    text: st => 'Une nouvelle souche de céréales pousse deux fois plus vite en apesanteur.',
    options: st => [
      { label: 'Généraliser', detail: '+30 % de rations pendant 10 ans',
        apply: st => { addEffect(st, 'food', 0.3, 10, 'Agronomie spatiale : +30 % de rations'); return 'Rations augmentées dans toutes les colonies.'; } },
    ] },

  { id: 'gisement', name: 'Gisement exceptionnel', kind: 'good', weight: 2,
    pick: st => pickColony(st, s => s.b.mine > 0),
    text: (st, i) => `Les foreurs de ${SITES[i].n} tombent sur un filon d’une richesse rare.`,
    options: (st, i) => [
      { label: 'Exploiter', detail: '+60 % de revenus des mines pendant 8 ans (toutes colonies)',
        apply: st => { addEffect(st, 'mine', 0.6, 8, `Gisement de ${SITES[i].n} : +60 % mines`); return `Le filon de ${SITES[i].n} dope les revenus.`; } },
      { label: 'Vendre la concession', detail: 'trésorerie immédiate',
        apply: st => { const g = Math.round(80 * SITES[i].d * scaleM(st)); st.budget += g; return `Concession vendue : +${g}M.`; } },
    ] },

  { id: 'mecene', name: 'Mécène privé', kind: 'good', weight: 2,
    pick: st => true,
    text: st => 'Un milliardaire passionné d’espace veut financer le programme… avec son nom sur la prochaine base.',
    options: st => {
      const g = Math.round(60 * scaleM(st));
      return [
        { label: 'Accepter le don', detail: `+${g}M, −2 confiance (image)`,
          apply: st => { st.budget += g; st.confidence = Math.max(0, st.confidence - 2); return `Don accepté : +${g}M.`; } },
        { label: 'Refuser poliment', detail: '+2 confiance',
          apply: st => { st.confidence = Math.min(100, st.confidence + 2); return 'L’opinion salue votre indépendance.'; } },
      ];
    } },

  { id: 'enthousiasme', name: 'Vague d’enthousiasme', kind: 'good', weight: 2,
    pick: st => colonies(st).length > 0 || null,
    text: st => 'Un documentaire sur vos colonies bat des records d’audience.',
    options: st => [
      { label: 'Profiter de l’élan', detail: '+6 confiance',
        apply: st => { st.confidence = Math.min(100, st.confidence + 6); return 'L’opinion est derrière le programme.'; } },
    ] },

  { id: 'babyboom', name: 'Baby-boom', kind: 'good', weight: 2,
    pick: st => pickColony(st, s => s.pop >= 20),
    text: (st, i) => `Les naissances explosent sur ${SITES[i].n}.`,
    options: (st, i) => [
      { label: 'Fêter ça', detail: '+25 % d’habitants (dans la limite de la capacité ×1,2)',
        apply: st => { const c = siteCalc(i); st.sites[i].pop = Math.min(c.cap * 1.2, st.sites[i].pop * 1.25); return `Population en hausse sur ${SITES[i].n}.`; } },
    ] },

  { id: 'cooperation', name: 'Coopération internationale', kind: 'good', weight: 2,
    pick: st => true,
    text: st => 'Plusieurs agences spatiales proposent de mutualiser leurs lanceurs.',
    options: st => [
      { label: 'Signer l’accord', detail: '−30 % sur le coût des missions pendant 6 ans',
        apply: st => { addEffect(st, 'launch', 0.3, 6, 'Coopération : −30 % missions'); return 'Missions moins chères pendant 6 ans.'; } },
    ] },
];
const EVENT_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));

/* Tire l'événement de l'année (appelé par nextYear quand state.nextEvent est atteint) */
function rollEvent(st) {
  const E = BALANCE.events;
  st.nextEvent = st.year + rint(E.minGap, E.maxGap);
  const pool = EVENTS.map(e => ({ e, site: e.pick(st) })).filter(x => x.site !== null && x.site !== false && x.site !== undefined);
  if (!pool.length) return null;
  let roll = Math.random() * pool.reduce((t, x) => t + x.e.weight, 0);
  const hit = pool.find(x => (roll -= x.e.weight) < 0) || pool[0];
  st.event = { id: hit.e.id, site: typeof hit.site === 'number' ? hit.site : null, year: st.year };
  return st.event;
}

/* Le joueur choisit l'option k de l'événement en attente */
function resolveEvent(k) {
  const ev = state.event;
  if (!ev) return;
  const def = EVENT_BY_ID[ev.id], opt = def.options(state, ev.site)[k];
  if (!opt) return;
  if (opt.cost && state.budget < opt.cost) { toast('Budget insuffisant pour cette option.', 'bad'); return false; }
  if (opt.cost) state.budget -= opt.cost;
  const summary = opt.apply(state, ev.site);
  state.event = null;
  toast(def.name + ' : ' + summary, def.kind);
  if (typeof yearEvents !== 'undefined') yearEvents.push({ text: '→ ' + summary, kind: def.kind });
  if (typeof renderEventLog === 'function') renderEventLog();
  render();
  return true;
}

/* Effets temporaires encore actifs (les expirés sont retirés au passage de l'année) */
const activeEffects = (st = state) => (st.effects || []).filter(e => e.until > st.year);
