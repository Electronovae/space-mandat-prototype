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
  // la production par tour est affichée en dessous.
  $('research').textContent = R(state.rp, 1);
  $('researchHint').textContent = '+' + R(T.res, 1) + ' points / tour';

  $('confidence').textContent = Math.round(state.confidence) + '%';
  $('year').textContent = state.year;

  renderActivity();
  renderOps();
  renderContracts();
  if ($('tech').classList.contains('active')) renderTree();
}

/* =====================================================================
   CENTRE DE COMMANDEMENT
   ===================================================================== */

/* Carte du système solaire : un astre par entrée de SITES.
   Les positions viennent des classes CSS .s1 … .s10 (css/style.css). */
function renderMap() {
  $('mapSites').innerHTML = SITES.map((S, i) =>
    `<div class="site s${i + 1}">${S.label}<small>${S.d.toFixed(1)}×</small></div>`
  ).join('');
  $('mapCount').textContent = SITES.length + ' sites suivis';
}

/* Liste « Activité en cours » : missions en vol + colonies actives */
function renderActivity() {
  const rows = state.sites
    .map((s, i) => [s, SITES[i]])
    .filter(([s]) => s.mission || s.colonized);

  if (!rows.length) {
    $('activity').innerHTML =
      '<p style="color:var(--muted);font-size:11px">Aucune mission. Ouvrez Opérations pour lancer votre première colonie.</p>';
    return;
  }

  $('activity').innerHTML = rows.map(([s, S]) => {
    if (s.mission) {
      const progress = Math.max(4, 100 - (s.mission.arrival - state.year) / s.mission.duration * 100);
      return `<div class="mission"><div>
          <strong>${S.n}</strong><span>Arrivée estimée · ${s.mission.arrival}</span>
          <div class="bar"><i style="width:${progress}%"></i></div>
        </div><span class="tag orange">EN VOL</span></div>`;
    }
    const nBuildings = Object.values(s.b).reduce((a, b) => a + b, 0);
    return `<div class="mission"><div>
        <strong>${S.n}</strong><span>${Math.round(s.pop)} habitants · ${nBuildings} bâtiment(s)</span>
      </div><span class="tag green">ACTIVE</span></div>`;
  }).join('');
}

/* Bilan du dernier tour (appelé par nextYear) */
function renderBilan({ T, pop0, pop1, conf0 }) {
  const net = T.bud - T.upk;
  const dConf = state.confidence - conf0;
  $('bilan').innerHTML = `
    <div><span>Revenus</span><b class="positive">+${money(T.bud)}</b></div>
    <div><span>Dépenses</span><b class="negative">-${money(T.upk)}</b></div>
    <div><span>Net</span><b class="${net >= 0 ? 'positive' : 'negative'}">${net >= 0 ? '+' : ''}${money(net)}</b></div>
    <div><span>Recherche</span><b class="positive">+${R(T.res, 1)} RP</b></div>
    <div><span>Population</span><b>${Math.round(pop1)} (${pop1 >= pop0 ? '+' : ''}${Math.round(pop1 - pop0)})</b></div>
    <div><span>Confiance</span><b class="${dConf >= 0 ? 'positive' : 'negative'}">${dConf >= 0 ? '+' : ''}${R(dConf, 1)}</b></div>`;
}

/* =====================================================================
   OPÉRATIONS
   ===================================================================== */

/* Texte « effet par unité » d'un bâtiment (doit refléter les formules de mechanics.js) */
function unitTxt(i, a, M) {
  const S = SITES[i], F = siteFactor(i, M), B = BALANCE;
  const sp = k => S.sp[k] || 1;

  switch (a.k) {
    case 'hab':
      return `+${Math.round(B.population.habCap * sp('hab') * (1 + M.cap))} habitants max`;
    case 'farm':
      return `+${Math.round(B.population.farmFood * sp('farm') * (1 + M.food))} rations · +${B.population.farmCap} habitants`;
    case 'lab':
      return `+${R(B.economy.labOutput * sp('lab') * (1 + M.lab) * F, 1)} RP/an · ${B.staffing.perProducer} équipiers`;
    case 'mine':
      return `+${R(B.economy.mineIncome * sp('mine') * (1 + M.mine) * F, 1)}M/an · ${B.staffing.perProducer} équipiers`;
    case 'power':
      return `+${Math.round(B.economy.powerBonus * 100 * (1 + M.power) * sp('power'))} % de production du site`;
    default: {                                   // bâtiment spécial
      const x = S.x, parts = [];
      if (x.budget)   parts.push(`+${R(x.budget * F, 0)}M/an`);
      if (x.research) parts.push(`+${R(x.research * F, 0)} RP/an`);
      if (x.cap)      parts.push(`+${Math.round(x.cap * (1 + M.cap))} habitants`);
      if (x.conf)     parts.push(`+${x.conf} confiance/an`);
      if (x.launch)   parts.push(`−${pc(x.launch)} coût des missions (tous sites)`);
      if (x.build)    parts.push(`−${pc(x.build)} coût des bâtiments (tous sites)`);
      return parts.join(' · ');
    }
  }
}

/* Une ligne de bâtiment dans la carte d'un site */
function buildRow(i, a, j, M, c) {
  const S = SITES[i], s = state.sites[i];
  const n = s.b[a.k] || 0;
  const techId = a.k === 'spec' ? S.st : a.tech;
  const locked = techId && !has(techId);
  const full = c.used >= c.slots;
  const maxed = a.max && n >= a.max;

  let btn;
  if (locked)      btn = `<button class="btn" disabled title="${tname(techId)}">Requiert ${techId}</button>`;
  else if (maxed)  btn = `<button class="btn" disabled>Maximum</button>`;
  else if (full)   btn = `<button class="btn" disabled title="Plus d’habitants = plus d’emplacements">Site plein</button>`;
  else             btn = `<button class="btn" onclick="build(${i},'${a.k}')">Construire · ${money(bCost(i, a))}</button>`;

  const noStaff = a.k === 'hab' || a.k === 'farm' || a.k === 'power';   // pas d'effectif pour ces types
  const total = n
    ? `<span class="tot">total : ${noStaff ? '×' + n : '×' + n + ' · effectif ' + Math.round(c.staff * 100) + ' %'}</span>`
    : '';

  return `<div class="build-row ${locked ? 'lock' : ''} ${a.k === 'spec' ? 'spec' : ''}">
    <div class="build-icon">${a.ic}</div>
    <div class="build-info">
      <strong>${S.nm[j]} <span class="build-count">×${n}${a.max ? '/' + a.max : ''}</span></strong>
      <span>${unitTxt(i, a, M)}</span>${total}
    </div>${btn}</div>`;
}

/* Cartes des 10 sites */
function renderOps() {
  const M = getModifiers();

  $('ops').innerHTML = SITES.map((S, i) => {
    const s = state.sites[i], c = siteCalc(i), F = siteFactor(i, M);
    let body;

    if (s.colonized) {
      body = `<div class="build-list">${ARCH.map((a, j) => buildRow(i, a, j, M, c)).join('')}</div>
        <div class="build-total">TOTAL SITE · <b>+${R(c.bud, 1)}M/an</b> (−${R(c.upk, 1)}M entretien)
          · <b>+${R(c.res, 1)} RP/an</b> · effectif <b>${Math.round(c.staff * 100)} %</b></div>`;
    } else {
      let action;
      if (s.mission)
        action = `<button class="btn warning" disabled>Mission en vol · ${s.mission.arrival}</button>`;
      else if (S.req && !has(S.req))
        action = `<button class="btn" disabled title="${tname(S.req)}">Requiert ${S.req} · ${tname(S.req)}</button>`;
      else
        action = `<button class="btn primary" onclick="launch(${i})">Lancer la mission · ${money(missionCost(i))}</button>`;
      body = `<div class="build-actions">${action}</div>`;
    }

    const popBar = s.colonized
      ? `<div class="popbar"><i style="width:${Math.min(100, c.pop / c.cap * 100)}%"></i></div>` : '';

    return `<article class="site-card ${s.colonized ? 'colonized' : ''}">
      <span class="status ${s.colonized ? 'live' : ''}">${s.colonized ? 'COLONISÉ' : 'NON COLONISÉ'}</span>
      <h3>${S.n}</h3>
      <div class="distance">distance ×${S.d.toFixed(1)} · fenêtre ${duration(i)} ans · rendement ×${R(F, 1)}</div>
      <div class="site-tag">${S.tag}</div>
      <div class="site-meta">
        <div>MISSION<b>${money(missionCost(i))}</b></div>
        <div>POPULATION<b>${Math.round(c.pop)}${s.colonized ? ' / ' + c.cap : ''}</b>${popBar}</div>
        <div>BÂTIMENTS<b>${s.colonized ? c.used + ' / ' + c.slots : 0}</b></div>
      </div>${body}</article>`;
  }).join('');
}

/* =====================================================================
   CONTRATS UN
   ===================================================================== */
function renderContracts() {
  const rewardBonus = getModifiers().reward;
  $('contractsList').innerHTML = CONTRACTS.map((def, i) => {
    const c = state.contracts[i];
    const tagClass = c.done ? 'green' : c.failed ? 'orange' : '';
    const tagText = c.done ? 'RÉUSSI' : c.failed ? 'ÉCHOUÉ' : 'ACTIF';
    return `<div class="contract ${c.done ? 'ok' : ''}">
      <div class="contract-top"><strong>${def.name}</strong><span class="tag ${tagClass}">${tagText}</span></div>
      <p>Échéance : ${def.deadline} · Les objectifs sont évalués automatiquement au passage de l’année.</p>
      <div class="reward">SUCCÈS +${Math.round(def.reward * (1 + rewardBonus))}% confiance&nbsp;&nbsp; / &nbsp;&nbsp;<span style="color:var(--danger)">ÉCHEC ${def.penalty}%</span></div>
    </div>`;
  }).join('');
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
function techNode(t) {
  const done = has(t.id), rd = ready(t);
  const external = t.prerequisites.filter(p => TECH.find(x => x.id === p).branch !== t.branch);
  const status = done ? 'done' : !rd ? 'locked' : state.rp >= t.rp ? 'avail aff' : 'avail';

  return `<div class="tn ${status} ${treeSel === t.id ? 'sel' : ''}" data-id="${t.id}" onclick="selectTech('${t.id}')">
    <div class="tn-id">${t.id}${done ? ' ✓' : ''}</div>
    <div class="tn-name">${t.name}</div>
    <div class="tn-fx">${t.effects}</div>
    <div class="tn-meta"><span>${t.rp} RP</span><span>${t.realism}</span>${external.length ? `<span class="ext">⇠ ${external.join(' ')}</span>` : ''}</div>
  </div>`;
}

function renderTree() {
  const B = BRANCHES.find(b => b[0] === treeBranch);
  const list = TECH.filter(t => t.branch === treeBranch);

  // Onglets des branches
  $('techTabs').innerHTML = BRANCHES.map(b => {
    const l = TECH.filter(t => t.branch === b[0]);
    return `<button class="${b[0] === treeBranch ? 'on' : ''}" style="--c:${b[2]}" onclick="selectBranch('${b[0]}')">
      ${b[1]}<i>${l.filter(t => has(t.id)).length}/${l.length}</i></button>`;
  }).join('');

  // Graphe : une colonne par ère
  $('techGraph').innerHTML = `
    <div class="eras">${ERAS.map(e => `<div>${e}</div>`).join('')}</div>
    <div class="graph" style="--c:${B[2]}">
      ${[1, 2, 3, 4, 5, 6].map(era =>
        `<div class="col">${list.filter(t => t.era === era).map(techNode).join('')}</div>`).join('')}
    </div>
    <svg class="links" id="links"></svg>`;

  $('techCount').textContent = state.tech.length + ' / ' + TECH.length + ' · ' + R(state.rp, 0) + ' RP';
  drawLinks();
  renderTechSide();
}

/* Traits entre prérequis (SVG positionné sur les cartes) */
function drawLinks() {
  const wrap = $('techGraph'), svg = $('links');
  const wr = wrap.getBoundingClientRect();
  const nodes = {};
  svg.setAttribute('width', wrap.scrollWidth);
  svg.setAttribute('height', wrap.scrollHeight);
  wrap.querySelectorAll('.tn').forEach(c => (nodes[c.dataset.id] = c));

  let html = '';
  TECH.filter(t => t.branch === treeBranch).forEach(t => t.prerequisites.forEach(p => {
    const a = nodes[p], z = nodes[t.id];
    if (!a || !z) return;                         // prérequis d'une autre branche : pas de trait
    const ar = a.getBoundingClientRect(), zr = z.getBoundingClientRect();
    const x1 = ar.right - wr.left, y1 = ar.top + ar.height / 2 - wr.top;
    const x2 = zr.left - wr.left,  y2 = zr.top + zr.height / 2 - wr.top;
    const highlighted = treeSel && (treeSel === p || treeSel === t.id);
    html += `<path d="M${x1} ${y1}C${x1 + 30} ${y1},${x2 - 30} ${y2},${x2} ${y2}" fill="none"
      stroke="${has(p) ? '#c9f277' : '#3d6b62'}" stroke-width="${highlighted ? 2.4 : 1.3}"
      opacity="${treeSel && !highlighted ? .15 : .85}"/>`;
  }));
  svg.innerHTML = html;
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
      <p class="muted">Production : <b>${R(T.res, 1)} RP/an</b> · réserve <b>${R(state.rp, 0)} RP</b>.
        Les technologies débloquent aussi des missions (propulsion) et des bâtiments (énergie, vie, matériaux).</p>
      <p class="muted">Sélectionnez une carte pour voir ses effets.</p>`;
    return;
  }

  const B = BRANCHES.find(b => b[0] === t.branch);
  const done = has(t.id), rd = ready(t), affordable = rd && state.rp >= t.rp;

  // Ce que la techno débloque : missions, bâtiments généraux, bâtiments spéciaux
  const unlocks = [
    ...SITES.filter(S => S.req === t.id).map(S => 'Mission vers ' + S.n),
    ...(ARCH.some(a => a.tech === t.id) ? ['Bâtiment : ' + (t.id === 'V01' ? 'serres' : 'centrales')] : []),
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
          : state.rp < t.rp ? `Il manque ${R(t.rp - state.rp, 0)} RP`
          : 'Développer · ' + t.rp + ' RP'}</button>`;

  el.innerHTML = `
    <div class="tn-id" style="color:${B[2]}">${t.id} · ÈRE ${ERAS[t.era - 1].split(' ')[0]} · ${B[1]}</div>
    <h3>${t.name}</h3>
    <p class="muted">${t.description}</p>
    <h4>Effets en jeu</h4><ul>${fxText(FX[t.id]).map(x => `<li>${x}</li>`).join('')}</ul>
    ${unlocks.length ? `<h4>Débloque</h4><ul>${unlocks.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    <h4>Physique</h4><p class="muted">${t.physics}</p>
    <h4>Prérequis</h4><p>${prereqs}</p>
    ${dependants.length ? `<h4>Ouvre</h4><p>${dependants.map(x => x.id).join(' · ')}</p>` : ''}
    ${action}`;
}
