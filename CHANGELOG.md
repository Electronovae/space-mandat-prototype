# Journal des modifications

## v5 — arbre technologique renforcé

- Suppression de la limite implicite de recherche par techno : aucune limite de niveau ou de points par technologie n’est appliquée.
- Coûts de recherche fortement croissants : multiplicateur de départ **3 → 2,5**, puis croissance composée par rang **+18 %** et par ère **×1,38**. Arrondi au demi-RP.
- Effets technologiques rendus nettement plus forts : pas d’ère **+25 % → +55 %** ; cycles augmentés et `OV` mis à l’échelle par l’ère.
- `scripts/simulate.js` mis à jour pour intégrer la formule de coût et une stratégie qui réinvestit ses RP.
- `scripts/smoke.js` mis à jour en v5 ; le test conserve la construction/destruction des bâtiments et la compatibilité de `S` dans `actions.js`.
- Vocabulaire conservé en français : RP, ONU, année/an, Gros projet.
