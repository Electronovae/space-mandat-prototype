/* Simulation de référence sans DOM : stratégies simplifiées, reproductible. */
'use strict';

const BALANCE = {
  baseRate: 6, startBudget: 500, startRP: 16, startPop: 15,
  mine: 3.2, lab: 3.6, upkeep: .055, power: 12, labUse: 2, mineUse: 1,
  farmUse: 1, powerBonus: .15, growthFlat: 3, growthRate: .05,
  deficitFloor: .35
};

function run(years, strategy) {
  let budget = BALANCE.startBudget, rp = BALANCE.startRP, pop = 0;
  let colonies = 0, mines = 0, labs = 0, farms = 0, powers = 0, projects = 0;
  const curve = [];
  for (let y = 1; y <= years; y++) {
    // Les investissements sont bornés par la trésorerie : aucune stratégie ne reçoit de bonus gratuit.
    if (colonies === 0 && budget >= 60 && rp >= 6) { budget -= 60; colonies = 1; pop += BALANCE.startPop; }
    const targetFarms = strategy === 'croissance' ? 3 : strategy === 'prudente' ? 1 : 2;
    if (colonies && farms < targetFarms && budget >= 30) { budget -= 30; farms++; }
    const targetLabs = strategy === 'recherche' ? 3 : strategy === 'projets' ? 2 : strategy === 'croissance' ? 1 : 2;
    if (colonies && labs < targetLabs && budget >= 45) { budget -= 45; labs++; }
    const targetMines = strategy === 'production' ? 4 : strategy === 'croissance' ? 2 : 1;
    if (colonies && mines < targetMines && budget >= 38) { budget -= 38; mines++; }
    // La stratégie prudente dimensionne l'énergie progressivement : pertinente, jamais bloquante.
    const requiredBeforePower = labs * BALANCE.labUse + mines * BALANCE.mineUse + farms * BALANCE.farmUse + pop * .1;
    const desiredPowers = strategy === 'prudente'
      ? (y < 12 ? 0 : Math.max(1, Math.ceil(requiredBeforePower / BALANCE.power)))
      : Math.max(1, Math.ceil(requiredBeforePower / BALANCE.power));
    if (colonies && powers < desiredPowers && budget >= 45) { budget -= 45; powers++; }
    if (strategy === 'projets' && colonies && projects < 1 && budget >= 300 && powers >= 1) { budget -= 420; projects++; }

    const produced = powers * BALANCE.power;
    const used = labs * BALANCE.labUse + mines * BALANCE.mineUse + farms * BALANCE.farmUse + pop * .1;
    const ratio = used ? Math.max(BALANCE.deficitFloor, Math.min(1, produced / used)) : 1;
    const energy = ratio * (1 + powers * BALANCE.powerBonus);
    const income = (mines * BALANCE.mine + pop * .08) * energy;
    // Rendement progressif : les labos apprennent et les technologies ne plafonnent pas à 496 RP.
    const learning = 1 + Math.min(.75, y * .012);
    const research = (BALANCE.baseRate + labs * BALANCE.lab * learning) * energy;
    const upkeep = (mines * 25 + labs * 22 + farms * 18 + powers * 28 + projects * 90) * BALANCE.upkeep;
    budget += income - upkeep;
    rp += research;
    pop = Math.min(pop + BALANCE.growthFlat + pop * BALANCE.growthRate, colonies * (30 + farms * 10));
    curve.push({ an: y, budget: Math.round(budget), rp: Math.round(rp), pop: Math.round(pop), energie: Math.round(ratio * 100), net: Math.round(income - upkeep) });
  }
  return { strategy, fin: curve.at(-1), milieux: curve.filter(x => [10, 20, 40, 60, 80].includes(x.an)) };
}

for (const strategy of ['prudente', 'croissance', 'recherche', 'production', 'projets']) {
  console.log(JSON.stringify(run(80, strategy)));
}
