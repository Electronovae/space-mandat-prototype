/* Bot de partie sans navigateur : joue une stratégie gloutonne avec le VRAI moteur
   (config, state, mechanics, actions) pour mesurer l'équilibrage.
   Usage : node scripts/bot.js [budget] [horizon] [graine] */
'use strict';
const fs = require('fs');
const vm = require('vm');
const root = require('path').resolve(__dirname, '..');

function makeGame(seed) {
  let x = seed || 1;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const el = () => ({ textContent: '', innerHTML: '', style: {}, classList: { add(){}, remove(){}, contains(){ return false; } }, addEventListener(){}, value: '' });
  const ctx = {
    console, JSON, Object, Array, Number, String,
    Math: Object.assign(Object.create(Math), { random: rnd }),
    document: { getElementById: el, querySelector: el, querySelectorAll: () => [] },
    setTimeout: () => 0, clearTimeout: () => {},
    localStorage: { setItem(){}, getItem(){ return null; }, removeItem(){} },
  };
  ctx.global = ctx;
  vm.createContext(ctx);
  for (const f of ['js/data/techs.js','js/config.js','js/utils.js','js/state.js','js/mechanics.js','js/actions.js','js/events.js'])
    vm.runInContext(fs.readFileSync(`${root}/${f}`, 'utf8'), ctx, { filename: f });
  vm.runInContext(`var treeSel = null; render = () => {}; globalThis.showEndReport = () => {}; globalThis.showDraft = () => {}; globalThis.showEvent = () => {}; toast = () => {}; if (typeof renderBilan === 'undefined') globalThis.renderBilan = () => {};
    globalThis.__g = { get state(){ return state; }, acceptOffer, resolveEvent, buildMega, MEGA, getModifiers, siteFactor, newGame, launch, build, researchTech, nextYear, siteCalc, totals,
      missionCost, bCost, missingReqs, ready, has, TECH, SITES, ARCH, CONTRACT_BY_ID };`, ctx);
  return ctx.__g;
}

function play(budget, horizon, seed, log = false) {
  const g = makeGame(seed);
  g.newGame(budget, horizon);
  const st = () => g.state;
  // Technologies utiles en priorité : prérequis des sites et des bâtiments
  const wanted = new Set();
  g.SITES.forEach(S => [].concat(S.req || []).forEach(id => wanted.add(id)));
  g.ARCH.forEach(a => a.tech && wanted.add(a.tech));
  const rows = [];
  for (let y = 0; y < horizon; y++) {
    // Recherche : la moins chère disponible, en privilégiant les technos utiles
    for (let k = 0; k < 5; k++) {
      const av = g.TECH.filter(t => !g.has(t.id) && g.ready(t) && st().rp >= t.rp)
        .sort((a, b) => (wanted.has(b.id) - wanted.has(a.id)) || a.rp - b.rp);
      if (!av.length) break;
      g.researchTech(av[0].id);
    }
    // Réserve pour la prochaine mission accessible (un joueur épargne pour s'étendre)
    const next = g.SITES.map((S, i) => i).filter(i => !st().sites[i].colonized && !st().sites[i].mission && !g.missingReqs(i).length)
      .sort((a, b) => g.missionCost(a) - g.missionCost(b))[0];
    const reserve = next === undefined ? 40 : Math.min(g.missionCost(next), 40 + st().budget * 0.6);
    // Bâtiments
    st().sites.forEach((s, i) => {
      if (!s.colonized) return;
      for (let k = 0; k < 4; k++) {
        const c = g.siteCalc(i);
        if (c.used >= c.slots) break;
        const pick = c.energyRatio < 1 && g.has('E01') && (s.b.mine || s.b.lab) ? 'power'
          : (c.pop >= c.cap - 3 || c.staff < 0.9) ? (c.limit === 'food' ? 'farm' : 'hab')
          : (s.b.mine || 0) <= (s.b.lab || 0) ? 'mine' : (g.has('S01') && !s.b.gov) ? 'gov' : 'lab';
        const a = g.ARCH.find(z => z.k === pick);
        if (a.tech && !g.has(a.tech)) { const alt = g.ARCH.find(z => z.k === 'hab'); if (st().budget < g.bCost(i, alt) + reserve) break; g.build(i, 'hab'); continue; }
        if (st().budget < g.bCost(i, a) + reserve) break;
        g.build(i, pick);
      }
    });
    // Mégastructures : dès que la techno est là et qu'il reste une marge
    g.MEGA.forEach(m => { if (!st().mega[m.id] && g.has(m.tech) && st().budget > m.cost * 1.2) g.buildMega(m.id); });
    // Gros projets : dès que la techno et le budget le permettent
    st().sites.forEach((s, i) => {
      if (!s.colonized || s.b.spec || s.project || !g.has(g.SITES[i].st)) return;
      const c = g.siteCalc(i), a = g.ARCH[5];
      if (c.used < c.slots && st().budget > g.bCost(i, a) + 80) g.build(i, 'spec');
    });
    // Missions : la moins chère accessible si la réserve le permet
    const cand = g.SITES.map((S, i) => i).filter(i => !st().sites[i].colonized && !st().sites[i].mission && !g.missingReqs(i).length)
      .sort((a, b) => g.missionCost(a) - g.missionCost(b));
    if (cand.length && st().budget > g.missionCost(cand[0]) + 60) g.launch(cand[0]);
    const T = g.totals();
    rows.push({ mega: Object.keys(st().mega || {}).filter(k => st().mega[k].done).length, an: st().year, budget: Math.round(st().budget), net: +(T.bud - T.upk).toFixed(1), rp: +T.res.toFixed(1),
      pop: Math.round(T.pop), conf: +st().confidence.toFixed(1), col: st().sites.filter(s => s.colonized).length, tech: st().tech.length });
    if (st().event) { if (!g.resolveEvent(0)) g.resolveEvent(1); }   // le bot paie s'il peut
    if (st().offer) g.acceptOffer(Math.min(+(process.env.TIER ?? 1), st().offer.length - 1));   // palier choisi (TIER=0,1,2 ; défaut : ambitieux)
    g.nextYear();
  }
  const cs = st().contracts;
  return { g, budget, horizon, fin: rows.at(-1), jalons: rows.filter((_, k) => [0, 4, 9, 19, 39, 59, 79, 119].includes(k)),
    contrats: { total: cs.length, ok: cs.filter(c => c.done).length, ko: cs.filter(c => c.failed).length } };
}

if (require.main === module) {
  const [b = 500, h = 80, s = 1] = process.argv.slice(2).map(Number);
  const r = play(b, h, s);
  console.log(`Budget ${b} · horizon ${h} · contrats ${JSON.stringify(r.contrats)}`);
  console.table(r.jalons);
}
module.exports = { play, makeGame };
