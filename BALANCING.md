# Guide d'équilibrage

Tout est commenté dans `js/config.js`. Résumé : **quoi modifier pour quel effet**.

| Je veux…                                   | Je modifie (dans `js/config.js`)                          |
|--------------------------------------------|-----------------------------------------------------------|
| Plus / moins de budget au départ           | `BALANCE.start.budget`                                    |
| Accélérer la recherche globale             | `BALANCE.research.baseRate`, `BALANCE.economy.labOutput`  |
| Rendre les technos plus chères             | `BALANCE.research.techCostMult` (ou `cost` dans techs.js) |
| Favoriser les astres lointains             | `BALANCE.distance.exponent` (plus haut = plus rentables)  |
| Rendre une mission plus chère / plus longue| `SITES[i].c` (coût) · `SITES[i].w` (durée)                |
| Changer la spécialité d'un astre           | `SITES[i].sp` et `SITES[i].x`                             |
| Changer le coût d'un type de bâtiment      | `ARCH[...].c`                                             |
| Freiner l'enchaînement de bâtiments        | `BALANCE.costs.buildGrowth`                               |
| Ajuster l'entretien                        | `BALANCE.economy.upkeepRate`                              |
| Croissance / capacité de population        | `BALANCE.population.*`                                    |
| Besoin en équipage                         | `BALANCE.staffing.*`                                      |
| Nombre d'emplacements de bâtiments         | `BALANCE.colony.baseSlots`, `popPerSlot`                  |
| Érosion de la confiance                    | `BALANCE.confidence.drift`                                |
| Changer l'effet d'UNE technologie          | `OV` (surcharge par id)                                   |
| Changer l'effet d'UNE branche entière      | `CYC` (cycle de 4 effets par branche)                     |
| Faire grimper l'effet des techs avec l'ère | `BALANCE.techScaling.eraStep`                             |
| Plafonner les bonus de réduction de coût   | `BALANCE.caps`                                            |
| Modifier les contrats de l'ONU             | `CONTRACTS`                                               |

## Points d'attention

- **Contrat n°3** (« Maintenir 65 % jusqu'en 2070 ») : il est validé dès le premier passage d'année si la confiance ≥ 65 %.
  C'est le comportement du prototype d'origine ; à corriger dans `CONTRACTS[2].check` si l'intention est de tenir jusqu'à 2070.
- Les valeurs affichées (`unitTxt` dans `ui.js`) sont recalculées depuis `BALANCE` : pas besoin de les modifier à la main.
- Après un changement de structure de l'état, l'ancienne sauvegarde peut devenir incompatible : changer `SAVE_KEY` dans `actions.js`.
- Pour tester vite : dans la console du navigateur, `state.budget = 99999` puis `render()`.
