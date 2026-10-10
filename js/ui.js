/* =====================================================================
   UI — affichage (génère le HTML à partir de `state` et de la config)
   ---------------------------------------------------------------------
   Rien ici n'influence l'équilibrage : les chiffres affichés viennent
   de mechanics.js / config.js.
   ===================================================================== */
'use strict';

// État de l'interface de l'arbre technologique
let treeBranch = 'E';      // branche affichée (lettre)
let treeSel = null;        // id de la techno sélectionnée (panneau de droite)

/* =====================================================================
   RENDU GLOBAL
   ===================================================================== */
function render() {
  const T = totals();
  const net = T.bud - T.upk;

  // --- HUD ---
  $('budget').textContent = money(state.budget);
  $('budgetHint').textContent = (net >= 0 ? '+' : '') + R(net, 1) + 'M / an (net)';

  // Recherche : la valeur principale est la RÉSERVE de points,
  // la production par an est affichée en dessous.
  $('research').textContent = R(state.rp, 1);
  $('researchHint').textContent = '+' + R(T.res, 1) + ' PR / an';

  const conf = state.confidence;
  $('confidence').textContent = Math.round(conf) + '%';
  $('confidence').className = 'val ' + (conf < BALANCE.confidence.warn ? 'negative' : '');
  $('confidenceHint').textContent = (T.conf >= 0 ? '+' : '') + R(T.conf, 1) + ' / an · 0 % = révocation';
  $('year').textContent = state.year;
  $('horizonHint').textContent = 'fin du mandat : ' + state.endYear + ' (' + Math.max(0, state.endYear - state.year) + ' ans)';
  $('mandateLen').textContent = (state.endYear - state.startYear) + ' ans';
  $('dockYear').textContent = state.year;
  $('dockHint').textContent = state.over ? 'Mandat terminé' : 'vers ' + (state.year + 1) + ' · touche N';
  $('nextYear').textContent = state.over ? 'Voir le bilan' : 'Avancer d’un an  →';
  if ($('helpEnd')) $('helpEnd').textContent = state.endYear;

  // Badge des nouveaux objectifs (effacé quand on ouvre l'onglet)
  if ($('contracts').classList.contains('active')) state.contracts.forEach(c => delete c.isNew);
  const nNew = state.contracts.filter(c => c.isNew).length;
  $('navBadge').textContent = nNew ? nNew : '';
  $('navBadge').style.display = nNew ? '' : 'none';

  renderMap();
  renderActivity();
  renderOps();
  renderContracts();
  if ($('tech').classList.contains('active')) renderTree();
  if (typeof guideTick === 'function') guideTick();
}

/* =====================================================================
   CENTRE DE COMMANDEMENT
   ===================================================================== */

/* Carte du système solaire : un astre par entrée de SITES (hors exo).
   Les positions viennent des classes CSS .s1 … .s10 (css/style.css).
   Les exoplanètes (SITES[i].exo) sont affichées dans la bande « au-delà du système »
   sous la carte ; leur état (verrouillée / en vol / colonisée) est mis à jour à chaque render(). */
/* Astres du système classés du plus proche au plus lointain (Opérations et carte) */
const anyColonyNow = () => state.sites.some(s => s.colonized);
const sitesByDistance = () => SITES.map((S, i) => [S, i]).sort(([a], [b]) => a.d - b.d);

function renderMap() {
  const inSystem = sitesByDistance().filter(([S]) => !S.exo);
  const outside  = sitesByDistance().filter(([S]) => S.exo);

  $('mapSites').innerHTML = inSystem.map(([S, i], k) => {
    const s = state.sites[i];
    const st = s.colonized ? 'colonie' : s.mission ? 'en route' : duration(i) + ' an' + (duration(i) > 1 ? 's' : '');
    return `<div class="site s${k + 1} ${s.colonized ? 'on' : s.mission ? 'fly' : ''}" title="${S.n} · ${S.tag}">${S.label}<small>${st}</small></div>`;
  }).join('');

  $('mapExo').innerHTML = outside.map(([S, i]) => {
    const s = state.sites[i];
    const miss = missingReqs(i);
    const cls = s.colonized ? 'on' : s.mission ? 'fly' : miss.length ? 'lock' : '';
    const st = s.colonized ? 'colonisée' : s.mission ? 'en route · ' + s.mission.arrival
             : miss.length ? miss.length + ' techno' + (miss.length > 1 ? 's' : '') + ' manquante' + (miss.length > 1 ? 's' : '')
             : 'accessible';
    return `<div class="exo-chip ${cls}" title="${S.n} · ${S.tag}">${S.label}<small>${S.ly} al · ${st}</small></div>`;
  }).join('');

  $('mapCount').textContent = nColonies(state) + ' colonie' + (nColonies(state) > 1 ? 's' : '') + ' / ' + SITES.length + ' astres';
}

/* Liste « Activité en cours » : missions en vol + colonies actives */
function renderActivity() {
  const rows = state.sites
    .map((s, i) => [s, SITES[i]])
    .filter(([s]) => s.mission || s.colonized);

  if (!rows.length) {
    $('activity').innerHTML =
      '<p style="color:var(--muted);font-size:11px">Aucune mission. Ouvrez Opérations pour lancer votre première mission d’installation.</p>';
    return;
  }

  $('activity').innerHTML = rows.map(([s, S]) => {
    if (s.mission) {
      const progress = Math.max(4, 100 - (s.mission.arrival - state.year) / s.mission.duration * 100);
      return `<div class="mission"><div>
          <strong>${S.n}</strong><span>Mission d’installation · arrivée en ${s.mission.arrival}</span>
          <div class="bar"><i style="width:${progress}%"></i></div>
        </div><span class="tag orange">EN ROUTE</span></div>`;
    }
    const nBuildings = Object.values(s.b).reduce((a, b) => a + b, 0);
    return `<div class="mission"><div>
        <strong>${S.n}</strong><span>${Math.round(s.pop)} habitants · ${nBuildings} bâtiment${nBuildings > 1 ? 's' : ''}${s.project ? ' · chantier ' + s.project.progress + '/' + s.project.duration : ''}</span>
      </div><span class="tag green">COLONIE</span></div>`;
  }).join('');
}

/* Bilan de l’année (appelé par nextYear) + journal des événements */
function renderBilan({ T, pop0, pop1, conf0, events = [] }) {
  const net = T.bud - T.upk;
  const dConf = state.confidence - conf0;
  $('bilan').innerHTML = `
    <div><span>Revenus</span><b class="positive">+${money(T.bud)}</b></div>
    <div><span>Entretien</span><b class="negative">-${money(T.upk)}</b></div>
    <div><span>Net</span><b class="${net >= 0 ? 'positive' : 'negative'}">${net >= 0 ? '+' : ''}${money(net)}</b></div>
    <div><span>Recherche</span><b class="positive">+${R(T.res, 1)} PR</b></div>
    <div><span>Population</span><b>${Math.round(pop1)} (${pop1 >= pop0 ? '+' : ''}${Math.round(pop1 - pop0)})</b></div>
    <div><span>Confiance</span><b class="${dConf >= 0 ? 'positive' : 'negative'}">${dConf >= 0 ? '+' : ''}${R(dConf, 1)}</b></div>`;
  $('events').innerHTML = `<h4>Événements ${state.year - 1} → ${state.year}</h4>` + (events.length
    ? '<ul>' + events.map(e => `<li class="${e.kind}">${e.text}</li>`).join('') + '</ul>'
    : '<p class="muted">Rien de notable cette année.</p>');
}

/* =====================================================================
   OPÉRATIONS
   ===================================================================== */

/* Texte « effet par unité » d'un bâtiment (doit refléter les formules de mechanics.js) */
function unitTxt(i, a, M, c) {
  const S = SITES[i], F = siteFactor(i, M), B = BALANCE;
  const sp = k => S.sp[k] || 1;

  switch (a.k) {
    case 'hab': {
      const gain = Math.round(B.population.habCap * sp('hab') * (1 + M.cap));
      const warn = c && c.limit === 'food' ? ` <em class="warn">· les rations bloquent déjà : construisez plutôt une serre</em>` : '';
      return `+${gain} places${warn}`;
    }
    case 'farm': {
      const warn = c && c.limit === 'places' && c.pop >= c.cap - 1 ? ` <em class="warn">· les places bloquent : construisez plutôt un logement</em>` : '';
      return `+${Math.round(B.population.farmFood * sp('farm') * (1 + M.food))} rations/an${warn}`;
    }
    case 'lab':
      return `+${R(B.economy.labOutput * sp('lab') * (1 + M.lab) * F, 1)} PR/an à plein effectif`;
    case 'mine':
      return `+${R(B.economy.mineIncome * sp('mine') * (1 + M.mine) * F, 1)}M/an à plein effectif`;
    case 'power':
      return `+${R(B.economy.energy.powerPerCentral * sp('power'), 0)} énergie/an · +${Math.round(B.economy.powerBonus * 100 * (1 + M.power) * sp('power'))} % de production`;
    default:
      return projectTxt(i, M);
  }
}

/* Effet d'un Gros projet achevé (affiché aussi sur les astres non colonisés) */
function projectTxt(i, M = getModifiers()) {
  const S = SITES[i], x = S.x, F = siteFactor(i, M), parts = [];
  if (x.budget)   parts.push(`+${R(x.budget * F, 0)}M/an`);
  if (x.research) parts.push(`+${R(x.research * F, 0)} PR/an`);
  if (x.cap)      parts.push(`+${Math.round(x.cap * (1 + M.cap))} places`);
  if (x.conf)     parts.push(`+${x.conf} confiance/an`);
  if (x.launch)   parts.push(`−${pc(x.launch)} coût des missions (tous astres)`);
  if (x.build)    parts.push(`−${pc(x.build)} coût des bâtiments (tous astres)`);
  return parts.join(' · ');
}

/* Ligne de coûts récurrents d'un bâtiment : entretien, énergie, travailleurs */
function runTxt(i, a, M) {
  const parts = [`entretien ${R(upkeepOf(i, a), 1)}M/an`];
  const e = energyUseOf(a.k);
  if (a.k === 'power') parts.push('produit l’énergie');
  else if (e) parts.push(`consomme ${R(e, 1)} énergie${a.k === 'spec' ? ' pendant le chantier' : ''}`);
  const w = workersOf(a.k);
  if (w) parts.push(`${Math.round(w * (1 - M.crew))} travailleurs`);
  else if (a.k === 'spec') parts.push('sans travailleurs');
  return parts.join(' · ');
}

/* Une ligne de bâtiment dans la carte d'un site */
function buildRow(i, a, j, M, c) {
  const S = SITES[i], s = state.sites[i];
  const n = s.b[a.k] || 0;
  const techId = a.k === 'spec' ? S.st : a.tech;
  const locked = techId && !has(techId);
  const projectRunning = a.project && s.project && !s.project.done;
  const full = c.used >= c.slots;
  const maxed = a.max && n >= a.max;

  let btn;
  if (projectRunning) btn = `<button class="btn" disabled>Chantier · ${s.project.progress}/${s.project.duration} ans${c.energyRatio < 1 ? ' · en pause (énergie)' : ''}</button>`;
  else if (maxed)       btn = `<button class="btn" disabled>Maximum atteint</button>`;
  else if (locked)      btn = `<button class="btn" onclick="openTech('${techId}')" title="Voir ${tname(techId)} dans l’arbre">Requiert ${techId}</button>`;
  else if (full)        btn = `<button class="btn" disabled title="Un emplacement s’ouvre tous les ${BALANCE.colony.popPerSlot} habitants">Aucun emplacement libre</button>`;
  else                  btn = `<button class="btn ${state.budget >= bCost(i, a) ? '' : 'short'}" onclick="build(${i},'${a.k}')">Construire · ${money(bCost(i, a))}</button>`;

  if (n) btn += ` <button class="btn danger" onclick="demolish(${i},'${a.k}')" title="Détruire un exemplaire, sans remboursement">✕ Détruire</button>`;
  const info = ARCH_INFO[a.k];

  return `<div class="build-row ${locked ? 'lock' : ''} ${a.k === 'spec' ? 'spec' : ''}">
    <div class="build-icon">${a.ic}</div>
    <div class="build-info">
      <strong>${S.nm[j]} <span class="build-cat">${info.cat}</span> <span class="build-count">×${n}${a.max ? '/' + a.max : ''}</span></strong>
      <span>${unitTxt(i, a, M, c)}</span>
      <span class="run">${runTxt(i, a, M)}</span>
    </div><div class="build-btns">${btn}</div></div>`;
}

/* Puces de prérequis d'un astre : une par technologie, colorée selon sa branche,
   verte quand elle est développée ; un clic ouvre la technologie dans l'arbre. */
function reqChips(i) {
  const ids = siteReqs(i);
  if (!ids.length) return '<span class="muted" style="font-size:10px">aucun, accessible dès maintenant</span>';
  return ids.map(id => {
    const br = BRANCHES.find(b => b[0] === id[0]);
    return `<a class="req ${has(id) ? 'ok' : ''}" style="--c:${br[2]}" title="${br[1]} · ${tname(id)}${has(id) ? ' (développée)' : ''}" onclick="openTech('${id}')">${id}${has(id) ? ' ✓' : ''}</a>`;
  }).join('');
}

/* Ouvre l'arbre technologique sur une technologie donnée */
function openTech(id) {
  document.querySelector('.nav button[data-view="tech"]').click();
  jumpToTech(id);
}

/* Cartes des sites (du plus proche au plus lointain) */
function renderOps() {
  const M = getModifiers();
  let sepDone = false;

  $('ops').innerHTML = sitesByDistance().map(([S, i]) => {
    const s = state.sites[i], c = siteCalc(i), F = siteFactor(i, M);
    let meta, body;

    if (s.colonized) {
      // Population : croissance, ou ce qui la bloque
      const g = popGrowth(i), t = turnsToNextSlot(i);
      const blocked = c.limit === 'food' ? 'bloquée par les rations : construisez une serre'
                                         : 'bloquée par les places : construisez un logement';
      const popNote = g > 0.05 ? `<small class="up">+${R(g, 1)} / an</small>`
                    : g < -0.05 ? `<small class="down">${R(g, 1)} / an</small>`
                    : `<small class="down">${blocked}</small>`;
      const slotNote = c.used < c.slots ? `<small class="up">${c.slots - c.used} libre${c.slots - c.used > 1 ? 's' : ''}</small>`
                     : t !== null ? `<small>+1 dans ${t} an${t > 1 ? 's' : ''}</small>`
                     : `<small class="down">la population doit grandir</small>`;
      const staffNote = c.need ? `<small class="${c.staff < 1 ? 'down' : 'up'}">effectif ${Math.round(Math.min(c.staff, 1) * 100)} %${c.staff < 1 ? ' : production réduite' : ''}</small>` : '<small>aucun requis</small>';
      meta = `
        <div>POPULATION <span class="tip" title="Limitée par les places (logements) et les rations (serres) : le plus faible des deux bloque.">ⓘ</span><b>${Math.round(c.pop)} / ${c.cap}</b>
          <div class="popbar"><i style="width:${Math.min(100, c.pop / Math.max(1, c.cap) * 100)}%"></i></div>${popNote}</div>
        <div>EMPLACEMENTS <span class="tip" title="Chaque bâtiment occupe un emplacement. +1 emplacement tous les ${BALANCE.colony.popPerSlot} habitants.">ⓘ</span><b>${c.used} / ${c.slots}</b>${slotNote}</div>
        <div>TRAVAILLEURS <span class="tip" title="Habitants nécessaires pour faire tourner mines, labos et centrales à plein régime.">ⓘ</span><b>${Math.round(c.pop)} / ${Math.round(c.need)}</b>${staffNote}</div>`;
      body = `<div class="build-list">${ARCH.map((a, j) => buildRow(i, a, j, M, c)).join('')}</div>
        <div class="build-total">
          <div>ÉNERGIE <b>${R(c.energyProduced, 1)} produite / ${R(c.energyRequired, 1)} consommée</b> · <b class="${c.energyRatio < 1 ? 'negative' : 'positive'}">${Math.round(c.energyRatio * 100)} % couvert</b>${c.energyRatio < 1 && ((s.b.mine || 0) + (s.b.lab || 0) + (s.b.spec || 0) || s.project) ? ' <em class="warn">· mines, labos et Gros projet ralentis : construisez une centrale</em>' : ''}</div>
          <div>VIVRES <b>${c.places} places</b> · <b>${c.food} rations/an</b> → population max <b>${c.cap}</b></div>
          <div>BILAN <b class="positive">+${R(c.bud, 1)}M/an</b> revenus · <b class="negative">−${R(Math.abs(c.upk), 1)}M/an</b> entretien · <b class="positive">+${R(c.res, 1)} PR/an</b></div>
        </div>`;
    } else {
      // Pas encore de colonie : seules les infos de la mission comptent
      meta = `
        <div>MISSION<b>${money(missionCost(i))}</b><small>paiement unique</small></div>
        <div>TRAJET<b>${duration(i)} an${duration(i) > 1 ? 's' : ''}</b><small>${s.mission ? 'arrivée en ' + s.mission.arrival : 'puis la colonie démarre'}</small></div>
        <div>À L’ARRIVÉE<b>${BALANCE.colony.arrivalPop} colons</b><small>${BALANCE.colony.baseSlots} emplacements</small></div>`;
      let action;
      if (s.mission) {
        const progress = Math.max(4, 100 - (s.mission.arrival - state.year) / s.mission.duration * 100);
        action = `<div class="bar"><i style="width:${progress}%"></i></div><button class="btn warning" disabled>Mission en route · arrivée en ${s.mission.arrival}</button>`;
      } else if (missingReqs(i).length)
        action = `<button class="btn" disabled>${missingReqs(i).length} technologie${missingReqs(i).length > 1 ? 's' : ''} manquante${missingReqs(i).length > 1 ? 's' : ''}</button>`;
      else
        action = `<button class="btn primary ${state.budget >= missionCost(i) ? '' : 'short'}" onclick="launch(${i})">Lancer la mission d’installation · ${money(missionCost(i))}</button>`;
      body = s.mission ? `<div class="build-actions">${action}</div>`
                       : `<div class="reqs"><span>PRÉREQUIS</span>${reqChips(i)}</div><div class="build-actions">${action}</div>`;
    }

    let sep = '';
    if (S.exo && !sepDone) { sepDone = true; sep = `<div class="ops-sep">ESPACE INTERSTELLAIRE · exoplanètes, propulsion avancée requise</div>`; }
    const where = S.exo ? `${S.ly} années-lumière · ` : '';
    const status = s.colonized ? ['live', 'COLONIE'] : s.mission ? ['fly', 'EN ROUTE'] : ['', 'NON COLONISÉ'];

    return sep + `<article class="site-card ${s.colonized ? 'colonized' : ''} ${S.exo ? 'exo' : ''}" data-site="${i}">
      <span class="status ${status[0]}">${status[1]}</span>
      <h3>${S.n}</h3>
      <div class="distance">${where}rendement ×${R(F, 1)} <span class="tip" title="Plus un astre est loin, plus ses mines, labos et Gros projet rapportent (mais coûtent et s’entretiennent plus cher).">ⓘ</span> · ${S.tag}</div>
      <div class="site-tag">✦ Gros projet : <b>${S.nm[5]}</b> · ${projectTxt(i, M)}${has(S.st) ? '' : ' · requiert ' + S.st}</div>
      <div class="site-meta">${meta}</div>${body}</article>`;
  }).join('');
}

/* =====================================================================
   CONTRATS ONU
   ===================================================================== */
function renderContracts() {
  const rank = c => (c.done || c.failed ? 1 : 0);
  const list = [...state.contracts].sort((a, b) => rank(a) - rank(b) || a.deadline - b.deadline);

  if (!list.length) {
    $('contractsList').innerHTML = '<p class="muted">Aucun objectif pour l’instant.</p>';
    return;
  }

  $('contractsList').innerHTML = list.map(c => {
    const def = CONTRACT_BY_ID[c.id];
    const tagClass = c.done ? 'green' : c.failed ? 'orange' : '';
    const tagText = c.done ? 'RÉUSSI' : c.failed ? 'ÉCHOUÉ' : c.isNew ? 'NOUVEAU' : 'EN COURS';
    const left = c.deadline - state.year;
    const pay = contractPayout(c);

    let note = def.hold
      ? `À tenir sans interruption jusqu’en ${c.deadline}`
      : `À réussir avant la fin de ${c.deadline}`;
    if (!c.done && !c.failed) note += left > 0 ? ` · encore ${left} an${left > 1 ? 's' : ''}` : ' · dernière année !';

    // Barre de progression pour les objectifs chiffrés
    let prog = '';
    if (def.val) {
      const cur = def.val(state);
      const pctDone = Math.max(0, Math.min(100, cur / def.target * 100));
      prog = `<div class="bar"><i style="width:${c.done ? 100 : pctDone}%"></i></div>
        <div class="prog">${Number.isInteger(cur) || cur >= 100 ? Math.round(cur) : R(cur, 1)} / ${def.target} ${def.unit}</div>`;
    }

    return `<div class="contract ${c.done ? 'ok' : ''} ${c.failed ? 'ko' : ''} ${c.isNew ? 'new' : ''}">
      <div class="contract-top"><strong>${def.name}</strong><span class="tag ${tagClass}">${tagText}</span></div>
      <p>${note}</p>${prog}
      <div class="reward">SUCCÈS <b class="pay ${pay.kind}">${payoutText(pay)}</b>&nbsp;&nbsp; / &nbsp;&nbsp;<span style="color:var(--danger)">ÉCHEC ${def.penalty} confiance</span></div>
    </div>`;
  }).join('');
}

/* =====================================================================
   FENÊTRE DE DÉMARRAGE (budget + horizon)
   ---------------------------------------------------------------------
   Affichée au lancement et via le bouton « Nouvelle partie ».
   Bornes / valeurs par défaut : BALANCE.setup (config.js).
   ===================================================================== */
let gameStarted = false;   // false tant que le joueur n'a pas validé la fenêtre

function openSetup() {
  const B = BALANCE.setup;
  for (const [id, cfg] of [['setupBudget', B.budget], ['setupHorizon', B.horizon]]) {
    const el = $(id);
    el.min = cfg.min; el.max = cfg.max; el.step = cfg.step;
    if (!gameStarted || !el.value) el.value = cfg.def;
  }
  $('setupCancel').style.display = gameStarted ? '' : 'none';
  $('setupLoad').style.display = localStorage.getItem(SAVE_KEY) ? '' : 'none';
  updateSetup();
  $('setup').style.display = 'flex';
}

function updateSetup() {
  const budget = +$('setupBudget').value, horizon = +$('setupHorizon').value;
  const y0 = BALANCE.start.year;
  $('setupBudgetVal').textContent = budget + ' M';
  $('setupHorizonVal').textContent = horizon + ' ans · ' + y0 + ' → ' + (y0 + horizon);

  // Le budget de départ fixe le rythme des premières décennies (missions + premiers bâtiments).
  // L'horizon ne rend pas la partie plus dure : il change ce qu'on peut viser.
  const [label, color] = budget < 300 ? ['Exigeant', 'var(--orange)']
                       : budget < 700 ? ['Équilibré', 'var(--cyan)']
                       : budget < 1200 ? ['Confortable', 'var(--lime)']
                       : ['Très confortable', 'var(--lime)'];
  const budgetTxt = budget < 300 ? 'Peu de marge : une ou deux colonies proches avant de devoir attendre les revenus. '
                  : budget < 700 ? 'De quoi lancer deux ou trois colonies proches et leurs premiers bâtiments. '
                  : 'Une expansion rapide dès les premières années. ';
  const horizonTxt = horizon < 60 ? 'Mandat court : le système interne est l’objectif réaliste, les exoplanètes sont hors de portée.'
                   : horizon < 100 ? 'Les exoplanètes restent un défi sur cet horizon.'
                   : 'Mandat long : les exoplanètes deviennent atteignables, mais la confiance s’érode davantage avec le temps.';
  $('setupHint').innerHTML = `Difficulté : <b style="color:${color}">${label}</b>. ${budgetTxt}${horizonTxt}`;
}

function setSetup(id, v) { $(id).value = v; updateSetup(); }

function startGame() {
  const first = !gameStarted;
  newGame(+$('setupBudget').value, +$('setupHorizon').value);
  gameStarted = true;
  $('setup').style.display = 'none';
  $('endReport').style.display = 'none';
  if (first) setTimeout(() => startGuide(false), 250);   // guide pas à pas : 1re partie (si pas déjà suivi)
}

/* =====================================================================
   BILAN DE FIN DE MANDAT (fin de l'horizon ou révocation)
   ===================================================================== */
function showEndReport() {
  const sc = mandateScore();
  const revoked = state.over === 'revoked';
  const won = state.contracts.filter(c => c.done).length, failed = state.contracts.filter(c => c.failed).length;
  $('endReportBody').innerHTML = `
    <div class="eyebrow">${revoked ? 'MANDAT RÉVOQUÉ' : 'FIN DU MANDAT'} · ${state.year}</div>
    <h2 style="margin:8px 0 10px">${revoked ? 'L’ONU vous retire sa confiance' : 'Bilan de votre mandat'}</h2>
    <p class="muted">${revoked
      ? `La confiance est tombée à 0 % après ${state.year - state.startYear} ans. Le programme passe à une autre direction.`
      : `${state.endYear - state.startYear} ans de programme spatial, ${won} objectif${won > 1 ? 's' : ''} réussi${won > 1 ? 's' : ''}, ${failed} échoué${failed > 1 ? 's' : ''}.`}</p>
    <table class="score">${sc.parts.map(([k, n, w]) => `<tr><td>${k}</td><td>${n}</td><td>× ${w}</td><td><b>${n * w}</b></td></tr>`).join('')}
      <tr class="tot"><td colspan="3">Score du mandat</td><td><b>${sc.total}</b></td></tr></table>
    <div class="setup-actions">
      <button class="btn" onclick="$('endReport').style.display='none'">Consulter la partie</button>
      <button class="btn primary" onclick="$('endReport').style.display='none'; openSetup()">Nouvelle partie →</button>
    </div>`;
  $('endReport').style.display = 'flex';
}

/* =====================================================================
   ARBRE TECHNOLOGIQUE
   ===================================================================== */

function selectTech(id) { treeSel = id; renderTree(); }
function selectBranch(letter) { treeBranch = letter; treeSel = null; renderTree(); }
function jumpToTech(id) {                       // clic sur un prérequis du panneau latéral
  treeBranch = TECH.find(x => x.id === id).branch;
  treeSel = id;
  renderTree();
}

/* Une carte de technologie dans le graphe */
let treeHover = null;      // id survolé : met ses liens en évidence

function techNode(t) {
  const done = has(t.id), rd = ready(t);
  const external = t.prerequisites.filter(p => TECH.find(x => x.id === p).branch !== t.branch);
  const status = done ? 'done' : !rd ? 'locked' : state.rp >= t.rp ? 'avail aff' : 'avail';

  return `<div class="tn ${status} ${treeSel === t.id ? 'sel' : ''}" data-id="${t.id}" onclick="selectTech('${t.id}')"
      onmouseenter="hoverTech('${t.id}')" onmouseleave="hoverTech(null)">
    <div class="tn-id">${t.id}${done ? ' ✓' : ''}</div>
    <div class="tn-name">${t.name}</div>
    <div class="tn-fx">${t.effects}</div>
    <div class="tn-meta"><span>${t.rp} PR</span>${external.length ? `<span class="ext" title="Prérequis dans une autre branche">autre branche : ${external.join(' ')}</span>` : ''}</div>
  </div>`;
}

function hoverTech(id) { treeHover = id; drawLinks(); }

function renderTree() {
  const B = BRANCHES.find(b => b[0] === treeBranch);
  const list = TECH.filter(t => t.branch === treeBranch);

  // Onglets des branches
  $('techTabs').innerHTML = BRANCHES.map(b => {
    const l = TECH.filter(t => t.branch === b[0]);
    return `<button class="${b[0] === treeBranch ? 'on' : ''}" style="--c:${b[2]}" onclick="selectBranch('${b[0]}')">
      ${b[1]}<i>${l.filter(t => has(t.id)).length}/${l.length}</i></button>`;
  }).join('');

  // Ère atteinte = la plus haute ère où au moins une techno est développée
  const reached = Math.max(1, ...state.tech.map(id => TECH.find(t => t.id === id).era));

  // Graphe : une colonne par ère, avec un bandeau d'ère bien visible
  $('techGraph').innerHTML = `
    <div class="eras">${ERAS.map((e, k) => {
      const [num, name] = e.split(' · ');
      return `<div class="era ${k + 1 <= reached ? 'reached' : ''}"><span>ÈRE ${num}</span><b>${name}</b></div>`;
    }).join('')}</div>
    <div class="graph" style="--c:${B[2]}">
      ${[1, 2, 3, 4, 5, 6].map(era =>
        `<div class="col">${list.filter(t => t.era === era).map(techNode).join('')}</div>`).join('')}
    </div>
    <svg class="links" id="links"></svg>`;

  $('techCount').textContent = state.tech.length + ' / ' + TECH.length + ' · ' + R(state.rp, 0) + ' PR';
  drawLinks();
  renderTechSide();
}

/* Traits entre prérequis (SVG positionné sur les cartes).
   Au repos : traits discrets. Au survol ou à la sélection : les liens de la carte
   ressortent (prérequis en orange, technologies ouvertes en vert), les autres s'effacent. */
function drawLinks() {
  const wrap = $('techGraph'), svg = $('links');
  if (!svg) return;
  const wr = wrap.getBoundingClientRect();
  const nodes = {};
  svg.setAttribute('width', wrap.scrollWidth);
  svg.setAttribute('height', wrap.scrollHeight);
  wrap.querySelectorAll('.tn').forEach(c => {
    nodes[c.dataset.id] = c;
    c.classList.remove('rel');
  });

  const focus = treeHover || treeSel;
  let html = `<defs>
    <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#5f8f86"/></marker>
    <marker id="arrHi" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#c9f277"/></marker>
    <marker id="arrPre" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="#ff9d5c"/></marker></defs>`;
  TECH.filter(t => t.branch === treeBranch).forEach(t => t.prerequisites.forEach(p => {
    const a = nodes[p], z = nodes[t.id];
    if (!a || !z) return;                         // prérequis d'une autre branche : indiqué sur la carte
    const ar = a.getBoundingClientRect(), zr = z.getBoundingClientRect();
    const x1 = ar.right - wr.left, y1 = ar.top + ar.height / 2 - wr.top;
    const x2 = zr.left - wr.left - 2, y2 = zr.top + zr.height / 2 - wr.top;
    const isPre = focus && t.id === focus;        // p est un prérequis de la carte en focus
    const isNext = focus && p === focus;          // t est ouverte par la carte en focus
    if (isPre) a.classList.add('rel');
    if (isNext) z.classList.add('rel');
    const color = isPre ? '#ff9d5c' : isNext ? '#c9f277' : has(p) ? '#5f8f86' : '#33554f';
    const marker = isPre ? 'arrPre' : isNext ? 'arrHi' : 'arr';
    html += `<path d="M${x1} ${y1}C${x1 + 26} ${y1},${x2 - 26} ${y2},${x2} ${y2}" fill="none"
      stroke="${color}" stroke-width="${isPre || isNext ? 2.6 : 1.2}" marker-end="url(#${marker})"
      opacity="${focus && !(isPre || isNext) ? .12 : .9}"/>`;
  }));
  svg.innerHTML = html;
}

/* ---------------------------------------------------------------------
   Impact concret d'une technologie sur la partie EN COURS
   On l'ajoute temporairement, on recalcule, on l'enlève : le joueur voit
   « +4,2M/an », « Mars : 5 → 4 ans » plutôt qu'un pourcentage abstrait.
   --------------------------------------------------------------------- */
function techSnapshot() {
  const T = totals();
  const caps = state.sites.map((s, i) => s.colonized ? siteCalc(i).cap : 0).reduce((a, b) => a + b, 0);
  const missions = SITES.map((S, i) => state.sites[i].colonized ? null : { cost: missionCost(i), dur: duration(i) });
  const builds = state.sites.map((s, i) => s.colonized ? bCost(i, ARCH[0]) : null);
  return { net: T.bud - T.upk, res: T.res, conf: T.conf, caps, missions, builds };
}

function techImpact(id) {
  const before = techSnapshot();
  state.tech.push(id);
  let after;
  try { after = techSnapshot(); } finally { state.tech.pop(); }

  const out = [], sign = v => (v >= 0 ? '+' : '') ;
  const dNet = after.net - before.net, dRes = after.res - before.res, dConf = after.conf - before.conf, dCap = after.caps - before.caps;
  if (Math.abs(dNet) >= 0.05) out.push(`Revenu net : <b>${sign(dNet)}${R(dNet, 1)}M/an</b>`);
  if (Math.abs(dRes) >= 0.05) out.push(`Recherche : <b>${sign(dRes)}${R(dRes, 1)} PR/an</b>`);
  if (Math.abs(dConf) >= 0.005) out.push(`Confiance : <b>${sign(dConf)}${R(dConf, 2)}/an</b>`);
  if (Math.abs(dCap) >= 0.5) out.push(`Population max (toutes colonies) : <b>${sign(dCap)}${Math.round(dCap)} habitants</b>`);

  // Missions : on montre l'astre accessible le plus proche, et les trajets raccourcis
  const open = SITES.map((S, i) => i).filter(i => before.missions[i]).sort((a, b) => SITES[a].d - SITES[b].d);
  const cheaper = open.find(i => before.missions[i].cost - after.missions[i].cost >= 0.5);
  if (cheaper !== undefined)
    out.push(`Mission vers ${SITES[cheaper].n} : <b>${money(before.missions[cheaper].cost)} → ${money(after.missions[cheaper].cost)}</b>`);
  const faster = open.filter(i => after.missions[i].dur < before.missions[i].dur);
  if (faster.length)
    out.push('Trajets raccourcis : ' + faster.slice(0, 3).map(i => `<b>${SITES[i].n} ${before.missions[i].dur} → ${after.missions[i].dur} ans</b>`).join(', ')
      + (faster.length > 3 ? ` et ${faster.length - 3} autre${faster.length > 4 ? 's' : ''}` : ''));
  const bi = state.sites.findIndex(s => s.colonized);
  if (bi >= 0 && before.builds[bi] - after.builds[bi] >= 0.5)
    out.push(`Logement sur ${SITES[bi].n} : <b>${money(before.builds[bi])} → ${money(after.builds[bi])}</b>`);
  return out;
}

function techImpactHtml(id) {
  const out = techImpact(id);
  if (out.length) return '<ul class="impact">' + out.map(x => `<li>${x}</li>`).join('') + '</ul>';
  const fx = FX[id];
  return `<p class="muted">Aucun effet immédiat${!anyColonyNow() ? ' : il se verra une fois des colonies installées' : ''}${fx.reward ? ' ; s’applique aux prochaines récompenses d’objectifs' : ''}${fx.crew ? ' ; réduit les travailleurs requis' : ''}.</p>`;
}

/* Panneau de droite : bonus actifs (rien de sélectionné) ou détail d'une techno */
function renderTechSide() {
  const t = TECH.find(x => x.id === treeSel);
  const el = $('techSide');
  const T = totals(), M = getModifiers();

  if (!t) {
    const active = fxText(Object.fromEntries(Object.entries(M).filter(([k]) => k !== 'far' || M.far)));
    el.innerHTML = `<h3>Bonus actifs</h3>
      ${active.length
        ? '<ul>' + active.map(x => `<li>${x}</li>`).join('') + '</ul>'
        : '<p class="muted">Aucune technologie développée.</p>'}
      <p class="muted">Production : <b>${R(T.res, 1)} PR/an</b> · réserve <b>${R(state.rp, 0)} PR</b>.
        Les technologies débloquent aussi des missions (propulsion) et des bâtiments (énergie, vie, matériaux).</p>
      <p class="muted">Sélectionnez une carte pour voir ses effets. Survolez-la pour voir ses liens : <span style="color:var(--orange)">orange</span> = prérequis, <span style="color:var(--lime)">vert</span> = ce qu’elle ouvre.</p>`;
    return;
  }

  const B = BRANCHES.find(b => b[0] === t.branch);
  const done = has(t.id), rd = ready(t), affordable = rd && state.rp >= t.rp;

  // Ce que la techno débloque : missions, bâtiments généraux, bâtiments spéciaux
  const unlocks = [
    ...SITES.filter(S => [].concat(S.req || []).includes(t.id)).map(S => 'Requise pour la mission d’installation vers ' + S.n),
    ...ARCH.filter(a => a.tech === t.id).map(a => 'Bâtiment : ' + ({ farm: 'serres', power: 'centrales', lab: 'laboratoires', mine: 'mines' }[a.k] || a.k)),
    ...SITES.filter(S => S.st === t.id).map(S => S.nm[5] + ' · ' + S.n),
  ];
  const dependants = TECH.filter(x => x.prerequisites.includes(t.id));

  const prereqs = t.prerequisites.length
    ? t.prerequisites.map(p =>
        `<a class="pre ${has(p) ? 'ok' : ''}" onclick="jumpToTech('${p}')">${p} · ${tname(p)}</a>`).join('')
    : '<span class="muted">Aucun</span>';

  const action = done
    ? '<div class="tag green">DÉVELOPPÉE</div>'
    : `<button class="btn ${affordable ? 'primary' : ''}" ${affordable ? '' : 'disabled'} onclick="researchTech('${t.id}')">
        ${!rd ? 'Prérequis manquants'
          : state.rp < t.rp ? `Il manque ${R(t.rp - state.rp, 0)} PR`
          : 'Développer · ' + t.rp + ' PR'}</button>`;

  el.innerHTML = `
    <div class="tn-id" style="color:${B[2]}">${t.id} · ÈRE ${ERAS[t.era - 1]} · ${B[1]}</div>
    <h3>${t.name}</h3>
    <p class="muted">${t.description}</p>
    <h4>Effets en jeu</h4><ul>${fxText(FX[t.id]).map(x => `<li>${x}</li>`).join('')}</ul>
    ${done ? '' : `<h4>Dans votre partie</h4>${techImpactHtml(t.id)}`}
    ${unlocks.length ? `<h4>Débloque</h4><ul>${unlocks.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    <h4>Physique</h4><p class="muted">${t.physics}</p>
    <h4>Prérequis</h4><p>${prereqs}</p>
    ${dependants.length ? `<h4>Ouvre</h4><p>${dependants.map(x => x.id).join(' · ')}</p>` : ''}
    ${action}`;
}
