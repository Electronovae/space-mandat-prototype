# Journal des modifications

## v1.5 : cockpit actionnable, gouvernance, orbite basse

- **Réglages** : travailleurs +50 % (mine/labo 30, centrale 15, Gros projet 45), un emplacement tous les 13 habitants au lieu de 20 (+50 %). Pour compenser : mine 3 → 4 M/an, gigantisme 5 % → 2 % par bâtiment, mégastructures plus chères (2 000 à 22 000 M).
- **Valeurs affichées = effet réel** : chaque ligne de construction simule le bâtiment sur la colonie (places et rations, travailleurs, énergie, entretien, filons) et affiche « effet réel ici : population max +30 (limité par les rations) · +2,1 M/an net… ».
- **Gouvernance** : nouveau bâtiment (S01, 2 par astre) : PR + confiance, 20 travailleurs, 1 énergie.
- **Orbite basse** : nouvelle destination, la plus proche (15 M, 1 an), labos +20 %, Gros projet « Station orbitale internationale ».
- **12 objectifs ONU** de plus (orbite basse, gouvernance, énergie, rations, Gros projets, PR, revenu, population, réseau énergétique, mégastructures, et deux objectifs « à tenir » : aucune colonie en manque d'énergie, toutes à plein effectif).
- **Cockpit actionnable** : « À décider » propose des actions en un clic (construire la serre ou le logement qui manque, la centrale, rechercher la techno conseillée, lancer une mission, un Gros projet, une mégastructure), avec un bouton « Voir » à côté. Les objectifs ONU en cours et la subvention qu'ils protègent sont affichés sur le Centre de commandement.
- **Tutoriel** : refait, ancré dans la barre latérale (plus aucune pop-up sur le jeu), 7 étapes « objectif + comment », validées automatiquement quand l'action est faite ; l'élément concerné est seulement surligné.
- **Bugs** : contenu principal décalé de ~115 px sur les vues courtes (`.main { margin: auto }`) ; plantage de l'événement « Percée scientifique » quand aucune techno n'est disponible.

## v1.4 : mégastructures et draft honnête

- **Mégastructures** (nouvel onglet) : 6 projets de civilisation, payés au lancement, chantier de 6 à 15 ans, effets appliqués au-delà des plafonds des technologies, points au bilan final.
  Réseau énergétique interplanétaire (E05, 600 M) · Anneau orbital terrestre (M06, 1 500 M) · Cité orbitale de l'ONU (S07, 2 500 M) · Calculateur matriochka (I12, 5 000 M) · Essaim de Dyson (E09, 9 000 M) · Vaisseau-monde (P18, 14 000 M).
- **Énergie unifiée** : une fois le réseau achevé, toutes les colonies partagent un seul bilan énergétique ; le surplus d'un astre couvre le déficit d'un autre.
- **Draft** : un objectif « Ambitieux » ou « Audacieux » ne peut plus être proposé s'il est déjà rempli à plus de 30 % (60 % pour « Facile »). Vérifié sur 40 parties : 0 cas sur 525 propositions.
- Bot : 3 à 5 mégastructures achevées en 80 ans ; la trésorerie de fin de partie ne dort plus (8 000 à 28 000 M au lieu de 30 000 à 80 000 M).

## v1.3 : retours de Florian

- **Bug** : les boutons « Rechercher », « Objectifs » et « Voir » de la liste « À décider » ne faisaient rien (JavaScript mal échappé dans l'attribut onclick). Remplacés par `goToView()` / `goToTech()`.
- **Recherches conseillées** : jusqu'à 5 technologies développables tout de suite, chacune avec sa raison (débloque les mines, Gros projet de Mars, objectif ONU, ouvre la route de Cérès…). Affichées dans « À décider », en tête du panneau de l'arbre, et marquées « ★ conseillée » sur les cartes et les onglets.
- **Gros projets exigeants** : 30 travailleurs et 6 d'énergie en permanence (plus seulement pendant le chantier). Leur effet global suit leur efficacité (min de l'effectif et de l'énergie de la colonie), signalée sur la carte et dans « À décider ».
- **Entretien** : les mines et les Gros projets à revenus n'en ont plus. En contrepartie, les filons s'appauvrissent : la k-ième mine d'une colonie rapporte 0,88^(k−1).

## v1.2 : rendre le prototype convaincant

Constats (bot + partie test) : effectif toujours à 120 %, chaque planète exigeait 4 à 6 branches, objectifs ONU validés « en passant » et sans enjeu, Gros projets anecdotiques, premier écran sans décision.

- **Tunnel du tour** : le Centre de commandement suit ① Rapport de l'année, ② À décider (liste cliquable : énergie, travailleurs, population bloquée, emplacements libres, Gros projet disponible, technos abordables, missions possibles, objectifs bientôt échus), ③ Avancer.
- **Draft ONU** : tous les 5 ans, 3 objectifs Facile / Ambitieux / Audacieux ; le palier relève la cible, raccourcit le délai, et multiplie récompense et pénalité. Refuser coûte 3 de confiance. Le premier draft s'ouvre au lancement.
- **Subvention ONU** : chaque année, 0,3 M par point de confiance au-dessus de 20 %, croissant avec le temps. La confiance devient de l'argent.
- **Travailleurs** : 20 par mine/labo, 10 par centrale, plus de bonus de sureffectif.
- **Gros projets** : un seul par astre, effet global fort (L1 −35 % trajets, Lune +100 % énergie, Phobos −30 % bâtiments, Cérès −35 % missions, Vesta +50 % mines, Europe +40 % labos…), coût ×3.
- **Recherche orientée** : chaque astre demande la propulsion + une seule branche (Mars : Vie, Cérès/Phobos : Matériaux, Vesta/Titan : Énergie, Europe : Information, Triton : Sociétés).
- **Gigantisme** : +5 % d'entretien par bâtiment présent dans la colonie (freine l'emballement de fin de partie). Plafonds labos/mines à +150 %.
- **Événements aléatoires** (`js/events.js`) : un tous les 2 à 7 ans, 14 au total. Mauvais : explosion de centrale, épidémie, filon épuisé, scandale budgétaire, tempête solaire, crise financière, avarie en vol. Bons : percée scientifique (techno offerte), agronomie spatiale, gisement exceptionnel, mécène, vague d'enthousiasme, baby-boom, coopération internationale. La plupart proposent un choix (payer pour limiter les dégâts, ou encaisser) ; les effets temporaires sont listés dans le rapport.
- **Lisibilité** : bâtiments construits en tuiles (emplacements libres visibles), menu de construction repliable, Opérations triées (colonies, en route, accessibles, verrouillées repliées), carte cliquable.

## v1.1 : retours de test

Bugs
- Notifications : un seul toast, chaque message écrasait le précédent (d'où « pas de notif de nouveau contrat »). Toasts empilés + journal de l'année + badge.
- Rations : serres verrouillées par V01 et logement affichant +40 habitants quand les rations plafonnaient le gain. Serres libres, places et rations séparées, limite affichée.
- Touche N active derrière la fenêtre de démarrage et les autres fenêtres.
- Gros projet multiplié par l'effectif alors qu'il ne demande aucun travailleur.
- Estimation de difficulté du setup : un mandat plus long était jugé plus difficile ; coquille « mondes mondes ».
- Tutoriel : dates en dur (2026 à 2106), mention d'un « risque » de mission inexistant.
- Chargement d'anciennes sauvegardes : champs manquants complétés.
- Destruction d'un Gros projet : confirmation demandée.

Équilibrage et fin de partie : voir BALANCING.md (v1.1).

Retours de Florian (10/10)
- Technologies : chaque effet de cycle combine désormais deux leviers et des valeurs de base plus fortes (ex. P02 : −12 % trajets et −5 % missions) ; multiplicateur par ère 0,55 → 0,2 pour éviter l'emballement de fin de partie.
- Panneau d'une technologie : nouvelle section « Dans votre partie » qui montre l'effet concret sur la partie en cours (revenu, PR, confiance, population, « Mars 5 → 4 ans », coût de mission).
- Bandeau « Cycle du mandat » remis sous le HUD, sans suivre le défilement.
- Bouton « Détruire » agrandi.
- Ligne « Briefing » supprimée (le guide en pop-ups prend le relais).

## v5 — arbre technologique renforcé

- Suppression de la limite implicite de recherche par techno : aucune limite de niveau ou de points par technologie n’est appliquée.
- Coûts de recherche fortement croissants : multiplicateur de départ **3 → 2,5**, puis croissance composée par rang **+18 %** et par ère **×1,38**. Arrondi au demi-RP.
- Effets technologiques rendus nettement plus forts : pas d’ère **+25 % → +55 %** ; cycles augmentés et `OV` mis à l’échelle par l’ère.
- `scripts/simulate.js` mis à jour pour intégrer la formule de coût et une stratégie qui réinvestit ses RP.
- `scripts/smoke.js` mis à jour en v5 ; le test conserve la construction/destruction des bâtiments et la compatibilité de `S` dans `actions.js`.
- Vocabulaire conservé en français : RP, ONU, année/an, Gros projet.
