# Journal des changements — v3

## Fait
- Déplacement de « Avancer d’un an → » hors de l’en-tête vers une barre d’action dédiée,
visible immédiatement sous le résumé Budget / Recherche / Confiance / Année.
- Ajout du raccourci clavier `N` pour avancer d’une année (désactivé dans les champs de saisie).
- Recherche déplafonnée dans `scripts/simulate.js` : rendement des laboratoires avec courbe
d’apprentissage progressive jusqu’à +75 %, donnant des trajectoires mid/end-game différenciées.
- Rééquilibrage économique de la stratégie Recherche : 3,6 RP/an par labo, laboratoire à
22 M, entretien v3 à 5,5 % et revenu démographique à 0,08 M/habitant/an.
- Énergie : plancher de déficit relevé de 25 % à 35 % ; la stratégie Prudente retarde puis
construit ses centrales progressivement au lieu de rester bloquée à 25 % de couverture.
- Simulation 80 ans relancée et tableau avant/après ajouté dans `BALANCING.md`.
- Vocabulaire français conservé : ONU, an, Mine, LAGRANGE 1, Gros projet.

## Simulation : points finaux avant → après

| Stratégie | PR avant | PR après | Budget avant | Budget après | Énergie avant → après |
|---|---:|---:|---:|---:|---:|
| Prudente | 496 | 1 414 | 458 M | 279 M | 25 % → 100 % |
| Croissance | 496 | 1 176 | 110 M | 479 M | 100 % → 100 % |
| Recherche | 1 045 | 2 259 | -104 M | -98 M | 100 % → 100 % |
| Production | 496 | 1 724 | 514 M | 726 M | 100 % → 100 % |
| Projets | 496 | 1 532 | 320 M | 271 M | 100 % → 100 % |

## Limites

- La simulation reste une approximation volontaire : elle ne joue pas l’arbre technologique,
les contrats ONU, les délais de mission ni la population de chaque astre.
- Pas de test navigateur automatisé ni de test visuel multi-écrans.

## Correctif v4 — bâtiments
- **Cause exacte :** la fonction `build()` dans `js/actions.js` utilisait `S.n` et `S.nm[...]` pour les notifications, mais ne définissait plus la variable locale `S` après le refactor v3. Le premier clic de construction levait donc `ReferenceError: S is not defined`, après la mutation de l’état (budget débité / bâtiment ajouté), interrompant le rendu et donnant l’impression que les bâtiments ne fonctionnaient plus. Le chemin du Gros projet était atteint par le même défaut.
- Correction : restauration de `const S = SITES[i]` dans `build()`.
- Ajout de `scripts/smoke.js` pour tester mine, labo, centrale, Gros projet et destruction dans Node.
