/* =====================================================================
   CONFIG — TOUT CE QUI SE RÉGLE POUR L'ÉQUILIBRAGE EST ICI
   ---------------------------------------------------------------------
   Sommaire :
     1. BALANCE   constantes globales (économie, population, confiance…)
     2. SITES     les 10 astres colonisables
     3. ARCH      les 6 types de bâtiments
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
    budget: 420,        // M disponibles au départ
    rp: 12,             // réserve de points de recherche au départ
    confidence: 72,     // confiance de l'ONU (0–100)
  },
  endYear: 2106,        // fin du mandat (80 ans)

  // --- Recherche ------------------------------------------------------
  research: {
    baseRate: 4,        // RP/an produits sans aucun labo (avant bonus de techs)
    techCostMult: 4,    // coût réel d'une techno = cost (techs.js) × cette valeur
  },

  // --- Distance -------------------------------------------------------
  // Facteur de rendement d'un site  F = distance ^ (exponent + bonus tech "far").
  // F multiplie les revenus des mines/labos/bâtiments spéciaux.
  // Le COÛT (missions, bâtiments, entretien) est lui proportionnel à la distance
  // (exposant 1) → comme exponent > 1, les astres lointains sont plus rentables.
  distance: {
    exponent: 1.35,
  },

  // --- Colonies -------------------------------------------------------
  colony: {
    arrivalPop: 15,     // population à l'arrivée de la mission
    arrivalConf: 3,     // + confiance gagnée quand une colonie est établie
    baseSlots: 3,       // emplacements de bâtiments au départ
    popPerSlot: 20,     // +1 emplacement tous les N habitants
  },

  // --- Population -----------------------------------------------------
  // capacité = (baseCap + hab×habCap×spéc + serres×farmCap + spécial.cap) × (1+bonus cap)
  // nourriture = baseFood + logements × habFood + serres × farmFood × spéc × (1+bonus food)
  // La capacité réelle = min(capacité, nourriture)
  population: {
    baseCap: 30,        // habitants max sans aucun bâtiment
    habCap: 40,         // habitants max par logement
    farmCap: 10,        // habitants max par serre
    baseFood: 40,       // rations sans bâtiment
    habFood: 30,        // rations fournies par logement (évite que la nourriture bloque la capacité)
    farmFood: 60,       // rations par serre
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
    labOutput: 3,       // RP/an par labo (× spéc × F × effectif × énergie)
    popTax: 0.03,       // M/an par habitant (non multiplié par F)
    powerBonus: 0.15,   // +15 % de production du site par centrale (× spéc × (1+bonus power))
    upkeepRate: 0.07,   // entretien/an = Σ(nb bâtiments × coût de base × distance) × 7 %
    deficitConfPenalty: 2, // perte de confiance si le budget passe sous 0 (le budget est remis à 0)
  },

  // --- Coûts ----------------------------------------------------------
  costs: {
    buildGrowth: 0.12,  // chaque bâtiment déjà construit du même type : +12 % au suivant
  },

  // --- Confiance ONU (variation annuelle) ----------------------------
  confidence: {
    drift: -0.4,        // érosion naturelle par an
    perPop: 0.002,      // + par habitant (toutes colonies)
  },

  // --- Plafonds des bonus cumulés des technologies -------------------
  // (évite des coûts négatifs ou des trajets instantanés)
  caps: {
    launch: 0.6,        // réduction max du coût des missions
    build: 0.5,         // réduction max du coût des bâtiments
    travel: 0.6,        // réduction max de la durée des trajets
    crew: 0.5,          // réduction max de l'équipage requis
  },

  // --- Progression des effets de technologies ------------------------
  // effet = valeur_de_base × (1 + eraStep × (ère − 1)), voir CYC ci-dessous
  techScaling: {
    eraStep: 0.25,
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
     req    techno de propulsion requise pour lancer la mission (null = aucune)
     st     techno requise pour construire le bâtiment spécial
     sp     spécialités : multiplicateurs par type de bâtiment
            (clés : hab, farm, lab, mine, power)
     tag    texte de présentation
     nm     noms des 6 bâtiments, dans l'ordre de ARCH :
            [logement, serre, labo, mine, énergie, spécial]
     x      effets du bâtiment spécial (par exemplaire, max 3) :
              budget    M/an  (× F × effectif × énergie)
              research  RP/an (× F × effectif × énergie)
              cap       habitants max
              conf      confiance/an
              launch    −% coût des missions (TOUS les sites)
              build     −% coût des bâtiments (TOUS les sites)
   --------------------------------------------------------------------- */
const SITES = [
  { n:'Lune',     label:'LUNE',     d:1.2, c:30,  w:2,  req:null,  st:'M01', sp:{mine:1.3},            tag:'Hélium-3 · mines +30 %',
    nm:['Base souterraine','Serre en lave-tube','Labo lunaire','Mine de régolithe','Champ solaire polaire','Extracteur d’hélium-3'], x:{budget:9} },

  { n:'Mars',     label:'MARS',     d:1.8, c:55,  w:5,  req:'P02', st:'M02', sp:{hab:1.3, farm:1.2},   tag:'Atmosphère · habitats +30 %',
    nm:['Habitat enterré','Serre pressurisée','Observatoire martien','Mine de perchlorates','Ferme solaire','Dôme pressurisé'], x:{cap:110, conf:0.3} },

  { n:'Cérès',    label:'CERES',    d:2.5, c:75,  w:7,  req:'P03', st:'M04', sp:{mine:1.4},            tag:'Eau · mines +40 %',
    nm:['Cavité habitée','Serre sous glace','Labo cryogénique','Mine de volatils','Réacteur compact','Raffinerie d’eau'], x:{launch:0.06} },

  { n:'Vesta',    label:'VESTA',    d:2.7, c:70,  w:7,  req:'P03', st:'M03', sp:{mine:1.5},            tag:'Métaux · mines +50 %',
    nm:['Habitat de basalte','Serre en cratère','Labo de géologie','Mine de fer-nickel','Collecteur solaire','Fonderie de basalte'], x:{build:0.04} },

  { n:'Europe',   label:'EUROPE',   d:3.4, c:100, w:10, req:'P05', st:'M05', sp:{lab:1.5},             tag:'Océan · labos +50 %',
    nm:['Station sous glace','Serre thermale','Labo d’astrobiologie','Mine de sels','Réacteur à fission','Sonde sous-glaciaire'], x:{research:8} },

  { n:'Titan',    label:'TITAN',    d:4.1, c:120, w:12, req:'P06', st:'M05', sp:{mine:1.6, power:1.3}, tag:'Hydrocarbures · mines +60 %',
    nm:['Dôme chauffé','Serre à lampes','Labo prébiotique','Puits de méthane','Turbine atmosphérique','Usine d’hydrocarbures'], x:{budget:14} },

  { n:'Triton',   label:'TRITON',   d:6.2, c:180, w:17, req:'P07', st:'I04', sp:{lab:1.3},             tag:'Avant-poste profond · prestige',
    nm:['Cellule cryogénique','Serre isolée','Labo de plasma','Mine d’azote','Réacteur autonome','Relais profond'], x:{research:4, conf:0.6} },

  { n:'L1 Terre', label:'L1',       d:1.1, c:24,  w:1,  req:null,  st:'M02', sp:{power:1.4},           tag:'Transit · énergie +40 %',
    nm:['Anneau habité','Serre orbitale','Labo en microgravité','Atelier d’astéroïdes','Panneaux solaires','Station de transit'], x:{launch:0.05} },

  { n:'Phobos',   label:'PHOBOS',   d:1.9, c:60,  w:6,  req:'P02', st:'M03', sp:{mine:1.2},            tag:'Chantier · bâtiments moins chers',
    nm:['Hangar pressurisé','Serre blindée','Labo de bord','Carrière de régolithe','Collecteur solaire','Chantier orbital'], x:{build:0.05} },

  { n:'Ganymède', label:'GANYMÈDE', d:3.8, c:110, w:11, req:'P05', st:'V04', sp:{hab:1.4},             tag:'Bouclier magnétique · habitats +40 %',
    nm:['Cité enterrée','Serre sous bouclier','Labo magnétosphérique','Mine de glace','Réacteur à fission','Cité-bouclier'], x:{cap:150, research:3} },
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
  { k:'farm',  ic:'♧', c:18, tech:'V01' },       // serre : nourriture + un peu de capacité
  { k:'lab',   ic:'⚗', c:30 },                   // labo : recherche
  { k:'mine',  ic:'⛏', c:25 },                   // mine : budget
  { k:'power', ic:'⚡', c:28, tech:'E01' },       // énergie : bonus % de production du site
  { k:'spec',  ic:'✦', c:50, max:3 },            // spécial : effet propre à chaque astre (SITES[i].x)
];


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
   6. CONTRATS DE L'ONU
   ---------------------------------------------------------------------
     name      libellé affiché
     deadline  année limite (échec si dépassée, évalué au passage d'année)
     reward    + confiance si réussi (× (1 + bonus tech "reward"))
     penalty   confiance perdue si échec (valeur négative)
     check     fonction (state) → true quand l'objectif est atteint

   ⚠ Le 3e contrat ("Maintenir 65 % jusqu'en 2070") est évalué comme les autres :
     il est validé dès le 1er passage d'année si la confiance ≥ 65.
     Comportement hérité du prototype, à corriger si besoin (ex. ne valider
     qu'à l'année deadline).
   --------------------------------------------------------------------- */
const CONTRACTS = [
  { name:'Coloniser Mars avant 2040',
    deadline:2040, reward:20, penalty:-10,
    check: s => s.sites[SITES.findIndex(x => x.n === 'Mars')].colonized },

  { name:'Atteindre 3 sites avant 2055',
    deadline:2055, reward:25, penalty:-12,
    check: s => s.sites.filter(x => x.colonized).length >= 3 },

  { name:'Maintenir 65% de confiance jusqu’en 2070',
    deadline:2070, reward:30, penalty:-15,
    check: s => s.confidence >= 65 },
];
