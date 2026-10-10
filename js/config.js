/* =====================================================================
   CONFIG — TOUT CE QUI SE RÉGLE POUR L'ÉQUILIBRAGE EST ICI
   ---------------------------------------------------------------------
   Sommaire :
     1. BALANCE   constantes globales (économie, population, confiance…)
     2. SITES     les 15 astres colonisables (10 du système + 5 exoplanètes)
     3. ARCH      les 6 types de bâtiments (certains verrouillés par une technologie)
     4. BRANCHES / ERAS
     5. CYC / OV  effets des technologies
     6. CONTRACTS contrats de l'ONU
   Les formules qui utilisent ces valeurs sont dans mechanics.js.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. BALANCE — constantes globales
   Unités : budget en M (millions) · recherche en RP (points) · temps en années
   --------------------------------------------------------------------- */
const BALANCE = {

  // --- Début de partie ------------------------------------------------
  start: {
    year: 2026,
    budget: 500,        // M disponibles au départ
    rp: 16,             // réserve de points de recherche au départ
    confidence: 51,     // confiance de l'ONU (0–100)
  },

  // --- Fenêtre de démarrage (choix du joueur) --------------------------
  // Bornes et valeurs par défaut des curseurs « budget » et « horizon ».
  // L'année de fin du mandat = start.year + horizon (stockée dans state.endYear).
  setup: {
    budget:  { min: 150, max: 2000, step: 50, def: 500 },   // M disponibles au départ
    horizon: { min: 40,  max: 200,  step: 5,  def: 80  },   // durée du mandat en années
  },

  // --- Contrats de l'ONU (tirés au hasard dans CONTRACT_POOL) ----------
  contracts: {
    initial: 5,         // contrats tirés au début de la partie
    offerEvery: 7,      // un nouveau contrat est proposé tous les N ans…
    maxActive: 6,       // …tant qu'il y en a moins de N d'actifs
    // Type de récompense, tiré au hasard à la proposition du contrat :
    //   conf   = + confiance ONU (reward points)
    //   budget = + trésorerie (M)        rp = + points de recherche
    rewardWeights: { conf: 4, budget: 3, rp: 3 },   // probabilités relatives
    rewardValue:   { conf: 0.6, budget: 12, rp: 1.6 }, // confiance, M ou PR par point de `reward` du contrat
    rewardGrowth:  0.025,                           // les montants en M / RP gonflent de +2,5 % par an de mandat
  },

  // --- Recherche ------------------------------------------------------
  research: {
    baseRate: 6,        // RP/an produits sans aucun labo (avant bonus de techs)
    techCostMult: 2.5,  // multiplicateur de départ ; le coût augmente ensuite avec l'ère et le rang
    eraCostGrowth: 1.38, // surcharge composée par ère : la fin de l'arbre devient volontairement chère
    rankCostGrowth: 0.18, // surcharge par rang dans une branche : aucune limite de recherche par techno
  },

  // --- Distance -------------------------------------------------------
  // Facteur de rendement d'un site  F = distance ^ (exponent + bonus tech "far").
  // F multiplie les revenus des mines/labos/bâtiments spéciaux.
  // Le COÛT (missions, bâtiments, entretien) est lui proportionnel à la distance
  // (exposant 1) → comme exponent > 1, les astres lointains restent plus rentables.
  distance: {
    exponent: 1.15,     // 1,35 avant : les astres lointains rapportaient trop (emballement de fin de partie)
  },

  // --- Colonies -------------------------------------------------------
  colony: {
    arrivalPop: 15,     // population à l'arrivée de la mission
    arrivalConf: 3,     // + confiance gagnée quand une colonie est établie
    baseSlots: 3,       // emplacements de bâtiments au départ
    popPerSlot: 20,     // +1 emplacement tous les N habitants
  },

  // --- Population -----------------------------------------------------
  // Deux limites séparées, lisibles par le joueur :
  //   places  = (baseCap + logements×habCap×spéc + Gros projet.cap) × (1+bonus cap)   → les LOGEMENTS
  //   rations = (baseFood + serres×farmFood×spéc) × (1+bonus food)                   → les SERRES
  // Population maximale réelle = min(places, rations) : l'interface indique laquelle bloque.
  population: {
    baseCap: 30,        // capacité d'accueil de base (habitants max, sans bâtiment)
    habCap: 40,         // places ajoutées par logement (habitants)
    baseFood: 40,       // rations produites sans serre (1 ration nourrit 1 habitant par an)
    farmFood: 60,       // rations produites par serre
    growthFlat: 3,      // habitants gagnés par an (fixe)
    growthRate: 0.05,   // + % de la population actuelle par an (× (1+bonus grow))
    declineRate: 0.92,  // si pop > capacité : pop × 0.92 par an (jusqu'à la capacité)
  },

  // --- Équipage / effectif -------------------------------------------
  // besoin = (labos+mines)×perProducer + centrales×perPower, × (1 − bonus crew)
  // effectif = population / besoin, borné entre min et max.
  // L'effectif multiplie la production des mines/labos/spéciaux.
  staffing: {
    perProducer: 8,     // équipiers requis par labo ou mine
    perPower: 4,        // équipiers requis par centrale
    min: 0.2,           // effectif plancher (20 %)
    max: 1.2,           // effectif plafond (120 %, suréquipement)
  },

  // --- Économie -------------------------------------------------------
  economy: {
    mineIncome: 3,      // M/an par mine (× spéc × F × effectif × énergie)
    labOutput: 3.6,       // RP/an par labo (× spéc × F × effectif × énergie)
    popTax: 0.08,       // M/an par habitant (non multiplié par F)
    powerBonus: 0.15,   // bonus de production par centrale, après bilan énergétique
    energy: {
      powerPerCentral: 12,  // unités d'énergie produites/an par centrale
      labUse: 2, mineUse: 1, farmUse: 1, habUse: 0.1, projectUse: 4,
      deficitFloor: 0.35,  // une colonie déficitaire conserve au moins 35 % de sa production
    },
    upkeepRate: 0.055,   // entretien/an = Σ(nb bâtiments × coût de base × distance) × 5,5 %
    deficitConfPenalty: 2, // perte de confiance si le budget passe sous 0 (le budget est remis à 0)
  },

  // --- Coûts ----------------------------------------------------------
  costs: {
    buildGrowth: 0.12,  // chaque bâtiment déjà construit du même type : +12 % au suivant
    projectMult: 2.5,   // Gros projet = coût de base × 2,5 (×4 avant : jamais rentable)
    projectYears: 5,    // durée du chantier d'un Gros projet
  },

  // --- Confiance ONU (variation annuelle) ----------------------------
  // L'opinion s'habitue : l'érosion augmente avec le temps, et la population
  // rapporte de moins en moins (logarithme) → la confiance reste un enjeu toute la partie.
  confidence: {
    drift: -0.4,        // érosion naturelle par an au début du mandat
    driftGrowth: 0.02,  // érosion supplémentaire par année écoulée (−2/an au bout de 80 ans)
    popGain: 0.8,       // + popGain × log10(1 + population / 100) par an
    revoke: 0,          // confiance ≤ revoke → mandat révoqué (fin de partie)
    warn: 20,           // seuil d'alerte affiché au joueur
  },

  // --- Plafonds des bonus cumulés des technologies -------------------
  // (évite des coûts négatifs ou des trajets instantanés)
  caps: {
    launch: 0.6,        // réduction max du coût des missions
    build: 0.5,         // réduction max du coût des bâtiments
    travel: 0.6,        // réduction max de la durée des trajets
    crew: 0.5,          // réduction max de l'équipage requis
    far: 0.12,          // bonus max sur l'exposant de distance (sans plafond : emballement)
    conf: 1.0,          // confiance/an max apportée par les technologies (atteignait +6/an)
  },

  // --- Progression des effets de technologies ------------------------
  // effet = valeur_de_base × (1 + eraStep × (ère − 1)), voir CYC ci-dessous
  techScaling: {
    eraStep: 0.55,
  },
};


/* ---------------------------------------------------------------------
   2. SITES — les astres colonisables (l'ORDRE compte : index utilisé partout)
   ---------------------------------------------------------------------
     n      nom affiché
     label  nom court sur la carte du système solaire
     d      distance (multiplie coûts ET rendements, voir BALANCE.distance)
     c      coût de base de la mission (× d × (1 − bonus launch))
     w      fenêtre de trajet en années (× (1 − bonus travel), min 1 an)
     req    technologies requises pour lancer la mission : liste d'ids, idéalement de PLUSIEURS
            branches (propulsion pour le trajet, mais aussi énergie, matériaux, vie, information,
            sociétés). null ou [] = aucune. Le panneau « Prérequis » de chaque astre les affiche.
     st     techno requise pour construire le Gros projet
     sp     spécialités : multiplicateurs par type de bâtiment
            (clés : hab, farm, lab, mine, power)
     tag    texte de présentation
     nm     noms des 6 bâtiments, dans l'ordre de ARCH :
            [logement, serre, labo, mine, énergie, spécial]
     exo    true = planète hors système solaire (fin de partie, carte « au-delà du système »)
     ly     distance en années-lumière (affichage seulement, pour les exo)
     x      effets du Gros projet (par exemplaire achevé, max 3) :
              budget    M/an  (× F × effectif × énergie)
              research  RP/an (× F × effectif × énergie)
              cap       habitants max
              conf      confiance/an
              launch    −% coût des missions (TOUS les sites)
              build     −% coût des bâtiments (TOUS les sites)
   --------------------------------------------------------------------- */
const SITES = [
  { n:'Lune',     label:'LUNE',     d:1.2, c:30,  w:2,  req:['M01'],  st:'M01', sp:{mine:1.3},            tag:'Hélium-3 · mines +30 %',
    nm:['Base souterraine','Serre en lave-tube','Labo lunaire','Mine de régolithe','Champ solaire polaire','Extracteur d’hélium-3'], x:{budget:9} },

  { n:'Mars',     label:'MARS',     d:1.8, c:55,  w:5,  req:['P02','V03','E02','S01'], st:'M02', sp:{hab:1.3, farm:1.2},   tag:'Atmosphère · habitats +30 %',
    nm:['Habitat enterré','Serre pressurisée','Observatoire martien','Mine de perchlorates','Ferme solaire','Dôme pressurisé'], x:{cap:110, conf:0.3} },

  { n:'Cérès',    label:'CERES',    d:2.5, c:75,  w:7,  req:['P03','M04','I03','S02'], st:'M04', sp:{mine:1.4},            tag:'Eau · mines +40 %',
    nm:['Cavité habitée','Serre sous glace','Labo cryogénique','Mine de volatils','Réacteur compact','Raffinerie d’eau'], x:{launch:0.06} },

  { n:'Vesta',    label:'VESTA',    d:2.7, c:70,  w:7,  req:['P03','M04','E03','S03'], st:'M03', sp:{mine:1.5},            tag:'Métaux · mines +50 %',
    nm:['Habitat de basalte','Serre en cratère','Labo de géologie','Mine de fer-nickel','Collecteur solaire','Fonderie de basalte'], x:{build:0.04} },

  { n:'Europe',   label:'EUROPE',   d:3.4, c:100, w:10, req:['P05','V05','I04','S04'], st:'M05', sp:{lab:1.5},             tag:'Océan · labos +50 %',
    nm:['Station sous glace','Serre thermale','Labo d’astrobiologie','Mine de sels','Réacteur à fission','Sonde sous-glaciaire'], x:{research:8} },

  { n:'Titan',    label:'TITAN',    d:4.1, c:120, w:12, req:['P06','E05','M05','V05','I05'], st:'M05', sp:{mine:1.6, power:1.3}, tag:'Hydrocarbures · mines +60 %',
    nm:['Dôme chauffé','Serre à lampes','Labo prébiotique','Puits de méthane','Turbine atmosphérique','Usine d’hydrocarbures'], x:{budget:14} },

  { n:'Triton',   label:'TRITON',   d:6.2, c:180, w:17, req:['P07','E06','M06','I05','S05'], st:'I04', sp:{lab:1.3},             tag:'Avant-poste profond · prestige',
    nm:['Cellule cryogénique','Serre isolée','Labo de plasma','Mine d’azote','Réacteur autonome','Relais profond'], x:{research:4, conf:0.6} },

  { n:'LAGRANGE 1', label:'LAGRANGE 1',       d:1.1, c:24,  w:1,  req:null,  st:'M02', sp:{power:1.4},           tag:'Transit · énergie +40 %',
    nm:['Anneau habité','Serre orbitale','Labo en microgravité','Mine d’astéroïdes','Panneaux solaires','Station de transit'], x:{launch:0.05} },

  { n:'Phobos',   label:'PHOBOS',   d:1.9, c:60,  w:6,  req:['P02','M02','I01'], st:'M03', sp:{mine:1.2},            tag:'Chantier · bâtiments moins chers',
    nm:['Hangar pressurisé','Serre blindée','Labo de bord','Carrière de régolithe','Collecteur solaire','Chantier orbital'], x:{build:0.05} },

  { n:'Ganymède', label:'GANYMÈDE', d:3.8, c:110, w:11, req:['P05','V04','E03','S04'], st:'V04', sp:{hab:1.4},             tag:'Bouclier magnétique · habitats +40 %',
    nm:['Cité enterrée','Serre sous bouclier','Labo magnétosphérique','Mine de glace','Réacteur à fission','Cité-bouclier'], x:{cap:150, research:3} },

  /* --- Hors système solaire (fin de partie) -----------------------------
     Distances énormes : missions très chères et très longues, mais rendement
     F = d^1,35 très élevé. Verrouillées par des technologies des SIX branches
     (ères 4 à 6) : compter ~1 350 RP cumulés pour Proxima b, jusqu'à ~3 400 RP
     pour TRAPPIST-1 e. */
  { n:'Proxima b',     label:'PROXIMA',   exo:true, ly:4.2,  d:11, c:220, w:22, req:['P09','E08','M08','V08','I08','S08'], st:'I09', sp:{lab:1.3},                 tag:'Premier monde voisin · 4,2 al · labos +30 %',
    nm:['Dôme sous tempête stellaire','Serre sous bouclier','Observatoire de Proxima','Mine de silicates','Collecteur d’éruptions','Relais interstellaire'], x:{research:10, conf:0.5} },

  { n:'Barnard b',     label:'BARNARD',   exo:true, ly:6.0,  d:13, c:240, w:26, req:['P12','E09','M09','V09','I09','S09'], st:'M09', sp:{mine:1.5},                tag:'Monde glacé · 6 al · mines +50 %',
    nm:['Cité sous la glace','Serre géothermique','Labo cryogénique profond','Mine de métaux lourds','Réacteur à fusion','Foreuse autonome'], x:{budget:30} },

  { n:'Teegarden b',   label:'TEEGARDEN', exo:true, ly:12.5, d:16, c:270, w:30, req:['P13','E10','M10','V10','I10','S10'], st:'E09', sp:{hab:1.3, power:1.2},      tag:'Monde tempéré · 12,5 al · habitats +30 %',
    nm:['Cité-jardin','Serre océanique','Labo planétaire','Mine d’éléments rares','Centrale à fusion','Anneau d’énergie'], x:{cap:200, budget:20} },

  { n:'Gliese 667 Cc', label:'GJ 667',    exo:true, ly:23.6, d:20, c:320, w:34, req:['P14','E12','M12','V12','I12','S12'], st:'V09', sp:{hab:1.4, farm:1.3},       tag:'Zone habitable · 23,6 al · habitats +40 %',
    nm:['Arcologie','Serre continentale','Labo de biosphère','Mine orbitale','Réacteur de fusion','Terraformeur'], x:{cap:260, conf:0.8} },

  { n:'TRAPPIST-1 e',  label:'TRAPPIST',  exo:true, ly:40.7, d:26, c:380, w:40, req:['P17','E16','M14','V14','I14','S14'], st:'S09', sp:{hab:1.5, farm:1.4, lab:1.2}, tag:'Le grand projet · 40,7 al · habitats +50 %',
    nm:['Métropole planétaire','Biome synthétique','Institut interstellaire','Mine de fond de puits','Réseau de fusion','Capitale de l’humanité'], x:{cap:350, research:12, conf:1.2} },
];



/* ---------------------------------------------------------------------
   3. ARCH — les 6 types de bâtiments (même liste sur chaque site)
   ---------------------------------------------------------------------
     k     clé (utilisée dans state.sites[i].b)
     ic    icône
     c     coût de base (× distance × (1 − bonus build) × (1 + 12 % par exemplaire))
     tech  techno requise pour construire (optionnel)
     max   nombre maximum par site (optionnel)
   L'ordre doit correspondre à SITES[i].nm.
   --------------------------------------------------------------------- */
const ARCH = [
  { k:'hab',   ic:'⌂', c:20 },                   // logement : capacité d'accueil
  { k:'farm',  ic:'♧', c:18 },                  // serre : rations (plus de techno requise : on se retrouvait bloqué)
  { k:'lab',   ic:'⚗', c:22, tech:'I01' },       // labo : recherche (Automatisation industrielle)
  { k:'mine',  ic:'⛏', c:25, tech:'M01' },       // mine : budget (ISRU lunaire)
  { k:'power', ic:'⚡', c:28, tech:'E01' },       // énergie : bonus % de production du site
  { k:'spec',  ic:'✦', c:180, max:3, project:true },  // Gros projet : coût élevé, chantier pluriannuel, sans travailleurs
];


// Nom générique et rôle de chaque type de bâtiment (affiché à côté du nom propre à l'astre)
const ARCH_INFO = {
  hab:   { cat: 'Logement',    role: 'places pour les habitants' },
  farm:  { cat: 'Serre',       role: 'rations pour nourrir la colonie' },
  lab:   { cat: 'Laboratoire', role: 'points de recherche' },
  mine:  { cat: 'Mine',        role: 'revenus (vente des ressources)' },
  power: { cat: 'Centrale',    role: 'énergie pour les autres bâtiments' },
  spec:  { cat: 'Gros projet', role: 'bonus majeur propre à l’astre' },
};


/* ---------------------------------------------------------------------
   4. BRANCHES & ÈRES (affichage de l'arbre technologique)
   --------------------------------------------------------------------- */
// [lettre, nom, couleur]
const BRANCHES = [
  ['E', 'Énergie',         '#c9f277'],
  ['P', 'Propulsion',      '#67d7cf'],
  ['M', 'Matériaux',       '#ff9d5c'],
  ['V', 'Vie & Biosphère', '#c39bff'],
  ['I', 'Information',     '#ff7da5'],
  ['S', 'Sociétés',        '#8ed3ff'],
];
const ERAS = [
  'I · Orbite', 'II · Système interne', 'III · Système externe',
  'IV · Seuil interstellaire', 'V · Expansion', 'VI · Mégastructures',
];


/* ---------------------------------------------------------------------
   5. EFFETS DES TECHNOLOGIES
   ---------------------------------------------------------------------
   Leviers disponibles (clés d'effet) :
     rate    +RP/an                      lab     +% production des labos
     mine    +% revenus des mines        flat    +M/an fixes
     launch  −% coût des missions        travel  −% durée des trajets
     build   −% coût des bâtiments       cap     +% capacité d'accueil
     grow    +% croissance démographique food    +% production alimentaire
     power   +% effet des centrales      conf    +confiance/an
     far     +bonus à l'exposant de distance (0.03 = +3 pts)
     crew    −% équipage requis          reward  +% récompense des contrats

   Règle par défaut : chaque branche répète un cycle de 4 effets.
   La techno n°N de la branche utilise l'effet CYC[branche][(N−1) % 4] :
     E01→1er, E02→2e, E03→3e, E04→4e, E05→1er, …
   Valeur finale = valeur × (1 + eraStep × (ère − 1)).
     · si valeur ≥ 1 (ex. flat, rate) : arrondie à 0,5
     · sinon : arrondie à 0,001
   Pour surcharger une techno précise, utiliser OV (prioritaire sur CYC).
   --------------------------------------------------------------------- */
const CYC = {
  E: [['power',  0.08], ['mine',   0.06], ['flat',   1.5],  ['lab',    0.05]],
  P: [['launch', 0.04], ['travel', 0.05], ['far',    0.03], ['launch', 0.03]],
  M: [['build',  0.03], ['mine',   0.06], ['build',  0.025],['flat',   1.5]],
  V: [['cap',    0.08], ['food',   0.08], ['grow',   0.1],  ['conf',   0.15]],
  I: [['lab',    0.08], ['rate',   1],    ['crew',   0.05], ['rate',   1]],
  S: [['conf',   0.2],  ['flat',   2],    ['reward', 0.15], ['conf',   0.15]],
};

// Surcharges : remplacent entièrement l'effet d'une techno (peut contenir plusieurs leviers).
const OV = {
  E01: { power: 0.2, flat: 1 },
  E04: { lab: 0.3 },
  P01: { launch: 0.25 },
  P03: { travel: 0.15 },
  P08: { travel: 0.3 },
  M01: { build: 0.08, launch: 0.08 },
  M04: { mine: 0.2 },
  V01: { grow: 0.2, food: 0.1 },
  V04: { cap: 0.2 },
  I02: { rate: 2, crew: 0.1 },
  S01: { conf: 0.5 },
  S02: { flat: 3 },
};

// Objet "tous leviers à zéro" : point de départ du calcul des bonus (mechanics.js → getModifiers)
const ZERO = {
  rate:0, lab:0, mine:0, flat:0, launch:0, travel:0, build:0,
  cap:0, grow:0, food:0, power:0, conf:0, far:0, crew:0, reward:0,
};


/* ---------------------------------------------------------------------
   6. CONTRATS DE L'ONU — pool tiré au hasard
   ---------------------------------------------------------------------
   Au début de la partie, BALANCE.contracts.initial contrats sont tirés au hasard
   dans CONTRACT_POOL ; un nouveau est proposé tous les BALANCE.contracts.offerEvery
   ans (tant que moins de maxActive sont actifs). Un contrat n'est jamais proposé
   deux fois dans la même partie.

     id        identifiant unique
     name      libellé affiché
     years     délai accordé à partir de la proposition (échéance = année de tirage + years)
     reward    récompense de base (× (1 + bonus tech "reward")). Le TYPE (confiance, trésorerie ou
               points de recherche) est tiré au hasard à la proposition, voir BALANCE.contracts ;
               pour conf = points de confiance, sinon converti en M ou en RP
     penalty   confiance perdue si échec (par défaut −reward/2)
     after     (optionnel) n'est proposé qu'au bout de N ans de mandat (contrats de fin de partie)
     hold      (optionnel) true = condition à MAINTENIR jusqu'à l'échéance : échec dès qu'elle
               est rompue, réussite à l'échéance. (Corrige l'ancien contrat « 65 % jusqu'en 2070 »
               qui était validé dès le premier tour.)
     check     fonction (state) → true quand l'objectif est atteint
     val/target/unit  (contrats chiffrés) valeur courante, cible et unité : alimentent la
               barre de progression ; check = val >= target

   Un contrat déjà rempli au moment du tirage est écarté, de même que ceux dont
   l'échéance dépasserait la fin du mandat (selon l'horizon choisi au départ).
   --------------------------------------------------------------------- */

// --- Helpers de lecture de l'état (utilisés par les contrats) ---------
const siteIdx   = n => SITES.findIndex(x => x.n === n);
const colonised = (...names) => s => names.every(n => s.sites[siteIdx(n)].colonized);
const anyColonised = (...names) => s => names.some(n => s.sites[siteIdx(n)].colonized);
const nColonies = s => s.sites.filter(x => x.colonized).length;
const nExoWorlds = s => s.sites.filter((x, i) => x.colonized && SITES[i].exo).length;
const nBuildings = s => s.sites.reduce((t, x) => t + Object.values(x.b).reduce((a, b) => a + b, 0), 0);
const nSpecials = s => s.sites.reduce((t, x) => t + (x.b.spec || 0), 0);
const totalPop = s => s.sites.reduce((t, x) => t + x.pop, 0);
// totals() vient de mechanics.js (appelé à l'exécution, donc disponible)
const netIncome = () => { const T = totals(); return T.bud - T.upk; };

// --- Fabriques de contrats --------------------------------------------
const cSite = (id, name, years, reward, check, extra = {}) =>
  ({ id, name, years, reward, penalty: -Math.round(reward / 2), check, ...extra });
const cNum = (id, name, years, reward, val, target, unit, extra = {}) =>
  ({ id, name, years, reward, penalty: -Math.round(reward / 2), val, target, unit,
     check: s => val(s) >= target, ...extra });

const CONTRACT_POOL = [
  // --- Colonisation d'astres précis ---
  cSite('lune',    'Établir une colonie sur la Lune',                  15, 12, colonised('Lune')),
  cSite('mars',    'Coloniser Mars',                                   30, 20, colonised('Mars')),
  cSite('phobos',  'Ouvrir le chantier orbital de Phobos',             35, 12, colonised('Phobos'),            { after: 10 }),
  cSite('ceinture','Coloniser Cérès et Vesta (ceinture d’astéroïdes)', 40, 18, colonised('Cérès', 'Vesta'),    { after: 10 }),
  cSite('jupiter', 'Installer un monde jovien (Europe ou Ganymède)',   50, 22, anyColonised('Europe', 'Ganymède'), { after: 15 }),
  cSite('titan',   'Coloniser Titan',                                  55, 22, colonised('Titan'),             { after: 15 }),
  cSite('triton',  'Atteindre Triton, aux confins du système',         60, 28, colonised('Triton'),            { after: 20 }),

  // --- Nombre de colonies ---
  cNum('col3',  'Atteindre 3 colonies',   30, 15, nColonies, 3,  'colonies'),
  cNum('col5',  'Atteindre 5 colonies',   45, 22, nColonies, 5,  'colonies', { after: 10 }),
  cNum('col8',  'Atteindre 8 colonies',   60, 28, nColonies, 8,  'colonies', { after: 20 }),
  cNum('col12', 'Atteindre 12 colonies',  70, 32, nColonies, 12, 'colonies', { after: 30 }),

  // --- Fin de partie : au-delà du système ---
  cNum('exo1', 'Premier monde hors du système solaire', 45, 30, nExoWorlds, 1, 'monde', { after: 35 }),
  cNum('exo2', 'Deux mondes hors du système solaire',   45, 35, nExoWorlds, 2, 'mondes', { after: 45 }),

  // --- Population ---
  cNum('pop100', '100 habitants hors de la Terre',   25, 10, totalPop, 100,  'hab.'),
  cNum('pop500', '500 habitants hors de la Terre',   40, 18, totalPop, 500,  'hab.', { after: 10 }),
  cNum('pop1500','1 500 habitants hors de la Terre', 55, 25, totalPop, 1500, 'hab.', { after: 25 }),

  // --- Économie ---
  cNum('bud1000', 'Constituer une réserve de 1 000 M',  30, 12, s => s.budget, 1000, 'M'),
  cNum('bud4000', 'Constituer une réserve de 4 000 M',  50, 20, s => s.budget, 4000, 'M', { after: 15 }),
  cNum('net30',   'Dégager +30 M/an de revenu net',     35, 14, netIncome, 30,  'M/an'),
  cNum('net120',  'Dégager +120 M/an de revenu net',    55, 24, netIncome, 120, 'M/an', { after: 20 }),

  // --- Recherche ---
  cNum('tech15', 'Développer 15 technologies',  30, 12, s => s.tech.length, 15, 'technos'),
  cNum('tech40', 'Développer 40 technologies',  50, 20, s => s.tech.length, 40, 'technos', { after: 10 }),
  cNum('tech80', 'Développer 80 technologies',  65, 28, s => s.tech.length, 80, 'technos', { after: 25 }),
  cNum('rp25',   'Produire 25 PR/an',           35, 14, () => totals().res, 25, 'PR/an'),
  cSite('fusion', 'Maîtriser la fusion magnétique (E04)',           40, 14, s => s.tech.includes('E04')),
  cSite('voile',  'Maîtriser la voile laser (P07)',        45, 16, s => s.tech.includes('P07')),
  cSite('ascens', 'Construire l’ascenseur spatial (M06)',  50, 16, s => s.tech.includes('M06'), { after: 5 }),
  cSite('biosyn', 'Maîtriser la biologie synthétique (V07)', 55, 18, s => s.tech.includes('V07'), { after: 10 }),
  cSite('iagen',  'Mettre au point l’IA générale alignée (I07)', 55, 18, s => s.tech.includes('I07'), { after: 10 }),
  cSite('multi',  'Adopter les constitutions multi-habitat (S07)', 60, 20, s => s.tech.includes('S07'), { after: 15 }),
  cSite('bussard','Maîtriser le ramjet de Bussard (P09)',  60, 24, s => s.tech.includes('P09'), { after: 20 }),

  // --- Confiance ---
  cSite('hold65', 'Maintenir 65 % de confiance pendant 30 ans', 30, 25, s => s.confidence >= 65, { hold: true }),
  cSite('hold50', 'Ne jamais passer sous 50 % de confiance pendant 45 ans', 45, 20, s => s.confidence >= 50, { hold: true }),
  cNum('conf85', 'Atteindre 85 % de confiance', 40, 18, s => s.confidence, 85, '%'),

  // --- Bâtiments ---
  cNum('b10',  'Construire 10 bâtiments au total', 25, 8,  nBuildings, 10, 'bâtiments'),
  cNum('b30',  'Construire 30 bâtiments au total', 45, 16, nBuildings, 30, 'bâtiments', { after: 10 }),
  cNum('spec', 'Construire un Gros projet',   25, 10, nSpecials,  1,  'bâtiment'),
];

const CONTRACT_BY_ID = Object.fromEntries(CONTRACT_POOL.map(c => [c.id, c]));
