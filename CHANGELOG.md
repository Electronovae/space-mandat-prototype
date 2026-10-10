# Journal des modifications

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

## v5 — arbre technologique renforcé

- Suppression de la limite implicite de recherche par techno : aucune limite de niveau ou de points par technologie n’est appliquée.
- Coûts de recherche fortement croissants : multiplicateur de départ **3 → 2,5**, puis croissance composée par rang **+18 %** et par ère **×1,38**. Arrondi au demi-RP.
- Effets technologiques rendus nettement plus forts : pas d’ère **+25 % → +55 %** ; cycles augmentés et `OV` mis à l’échelle par l’ère.
- `scripts/simulate.js` mis à jour pour intégrer la formule de coût et une stratégie qui réinvestit ses RP.
- `scripts/smoke.js` mis à jour en v5 ; le test conserve la construction/destruction des bâtiments et la compatibilité de `S` dans `actions.js`.
- Vocabulaire conservé en français : RP, ONU, année/an, Gros projet.
