# Guide d'équilibrage

Tout est commenté dans `js/config.js`. Résumé : **quoi modifier pour quel effet**.

| Je veux…                                   | Je modifie (dans `js/config.js`)                          |
|--------------------------------------------|-----------------------------------------------------------|
| Bornes / défaut du budget et de l'horizon  | `BALANCE.setup.budget` · `BALANCE.setup.horizon`          |
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
| Modifier / ajouter un contrat de l'ONU     | `CONTRACT_POOL` (utiliser `cSite` ou `cNum`)              |
| Nombre de contrats au départ / rythme      | `BALANCE.contracts.*`                                     |
| Rendre une exoplanète plus / moins accessible | `SITES[i]` (`exo:true`) : `d`, `c`, `w`, `req`         |

## Points d'attention

- **Contrats « à maintenir »** (`hold:true`) : échec dès que la condition est rompue, réussite à l'échéance
  (l'ancien contrat « 65 % jusqu'en 2070 » était validé dès le premier tour).
- **Contrats tirés au hasard** : un contrat déjà rempli au moment du tirage est écarté ; `after` retarde
  l'apparition des contrats ambitieux ; l'échéance doit tenir dans l'horizon choisi.
- **Exoplanètes** : distance ×11 à ×26 → missions à ~1 400–5 700 M (avant bonus) et rendement ×29 à ×97.
  Elles sont accessibles via P09 (~440 RP cumulés), P12 (~1 000), P13 (~1 230), P14 (~1 700), P17 (~2 400).
  Avec un horizon de 40 ans, elles sont hors de portée en pratique.
- Les valeurs affichées (`unitTxt` dans `ui.js`) sont recalculées depuis `BALANCE` : pas besoin de les modifier à la main.
- Après un changement de structure de l'état, l'ancienne sauvegarde peut devenir incompatible : changer `SAVE_KEY` dans `actions.js` (déjà passé à `spacemandat-save3`).
- Pour tester vite : dans la console du navigateur, `state.budget = 99999` puis `render()`.
