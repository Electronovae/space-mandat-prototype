/* =====================================================================
   MECHANICS — les formules du jeu (aucun accès au DOM)
   ---------------------------------------------------------------------
   Toutes les valeurs numériques viennent de BALANCE / SITES / ARCH
   (config.js). Pour équilibrer, modifier config.js plutôt que ce fichier.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   Bonus cumulés des technologies  (M = "modifiers")
   Somme des effets de toutes les technos développées, plus les effets
   "tous sites" des bâtiments spéciaux (réduction coût missions/bâtiments).
   Les plafonds sont dans BALANCE.caps.
   --------------------------------------------------------------------- */
function getModifiers() {
  const m = { ...ZERO };

  state.tech.forEach(id => {
    for (const lever in FX[id]) m[lever] += FX[id][lever];
  });

  // Bâtiments spéciaux : certains réduisent les coûts sur TOUS les sites
  state.sites.forEach((s, i) => {
    if (!s.colonized) return;
    const nSpec = s.b.spec || 0;
    m.launch += nSpec * (SITES[i].x.launch || 0);
    m.build  += nSpec * (SITES[i].x.build  || 0);
  });

  const caps = BALANCE.caps;
  m.launch = Math.min(caps.launch, m.launch);
  m.build  = Math.min(caps.build,  m.build);
  m.travel = Math.min(caps.travel, m.travel);
  m.crew   = Math.min(caps.crew,   m.crew);
  return m;
}

/* Facteur de rendement d'un site : distance ^ (exposant + bonus "far") */
const siteFactor = (i, M = getModifiers()) =>
  Math.pow(SITES[i].d, BALANCE.distance.exponent + M.far);

/* ---------------------------------------------------------------------
   Calcul complet d'un site colonisé
   Retourne : pop, cap (capacité), slots/used (emplacements), staff (effectif),
              bud (revenu M/an), res (recherche RP/an), upk (entretien M/an),
              conf (confiance/an apportée par les bâtiments spéciaux)
   --------------------------------------------------------------------- */
function siteCalc(i) {
  const S = SITES[i], s = state.sites[i];
  const M = getModifiers(), F = siteFactor(i, M);
  const n  = k => s.b[k] || 0;          // nombre de bâtiments de type k
  const sp = k => S.sp[k] || 1;         // multiplicateur de spécialité du site
  const x  = S.x;                        // effets du bâtiment spécial
  const B  = BALANCE;

  if (!s.colonized) {
    return { pop:0, cap:0, slots:0, used:0, staff:1, bud:0, res:0, upk:0, conf:0 };
  }

  // Capacité d'accueil et nourriture → la plus faible des deux limite la population
  const cap  = (B.population.baseCap
              + n('hab')  * B.population.habCap * sp('hab')
              + n('farm') * B.population.farmCap
              + n('spec') * (x.cap || 0)) * (1 + M.cap);
  const food = B.population.baseFood
             + n('farm') * B.population.farmFood * sp('farm') * (1 + M.food);

  // Effectif : population disponible / équipage nécessaire
  const need  = ((n('lab') + n('mine')) * B.staffing.perProducer
               + n('power') * B.staffing.perPower) * (1 - M.crew);
  const staff = need > 0
    ? Math.max(B.staffing.min, Math.min(B.staffing.max, s.pop / need))
    : 1;

  // Bonus de production des centrales
  const energy = 1 + n('power') * B.economy.powerBonus * (1 + M.power) * sp('power');

  // Revenus : mines + spécial (budget), × distance × effectif × énergie, + impôt par habitant
  const bud = (n('mine') * B.economy.mineIncome * sp('mine') * (1 + M.mine)
             + n('spec') * (x.budget || 0)) * F * staff * energy
             + s.pop * B.economy.popTax;

  // Recherche : labos + spécial
  const res = (n('lab') * B.economy.labOutput * sp('lab') * (1 + M.lab)
             + n('spec') * (x.research || 0)) * F * staff * energy;

  // Entretien : chaque bâtiment coûte (coût de base × distance × taux)
  const upk = ARCH.reduce((t, a) => t + n(a.k) * a.c * S.d * B.economy.upkeepRate, 0);

  return {
    pop: s.pop,
    cap: Math.round(Math.min(cap, food)),
    slots: B.colony.baseSlots + Math.floor(s.pop / B.colony.popPerSlot),
    used: Object.values(s.b).reduce((a, b) => a + b, 0),
    staff, bud, res, upk,
    conf: n('spec') * (x.conf || 0),
  };
}

/* ---------------------------------------------------------------------
   Totaux annuels, tous sites confondus
   bud = revenus · upk = entretien · res = recherche · pop = population
   conf = variation annuelle de confiance
   --------------------------------------------------------------------- */
function totals() {
  const M = getModifiers();
  const t = {
    bud: M.flat,
    upk: 0,
    res: BALANCE.research.baseRate + M.rate,
    pop: 0,
    conf: BALANCE.confidence.drift + M.conf,
  };
  SITES.forEach((_, i) => {
    const c = siteCalc(i);
    t.bud += c.bud; t.upk += c.upk; t.res += c.res; t.pop += c.pop; t.conf += c.conf;
  });
  t.conf += t.pop * BALANCE.confidence.perPop;
  return t;
}

/* ---------------------------------------------------------------------
   Coûts et durées
   --------------------------------------------------------------------- */
// Mission : coût de base × distance × (1 − bonus launch)
const missionCost = i => SITES[i].c * SITES[i].d * (1 - getModifiers().launch);

// Durée du trajet : fenêtre × (1 − bonus travel), au moins 1 an
const duration = i => Math.max(1, Math.round(SITES[i].w * (1 - getModifiers().travel)));

// Bâtiment : coût de base × distance × (1 − bonus build) × (1 + 12 % par exemplaire déjà construit)
const bCost = (i, a) =>
  a.c * SITES[i].d * (1 - getModifiers().build)
  * (1 + BALANCE.costs.buildGrowth * (state.sites[i].b[a.k] || 0));
