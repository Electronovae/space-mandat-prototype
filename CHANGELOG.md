# Journal des modifications

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
