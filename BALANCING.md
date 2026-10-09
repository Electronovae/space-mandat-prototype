# Guide d'équilibrage

Les constantes principales sont dans `js/config.js`. La simulation reproductible est
`node scripts/simulate.js` et compare cinq stratégies simplifiées sur 80 ans.

## Choix v3

- **Recherche sans plafond artificiel** : le rendement des laboratoires suit une courbe
d'apprentissage progressive (`+1,2 %/an`, plafonnée à +75 % pour rester raisonnable),
au lieu de rester sur une production quasi linéaire qui aboutissait à 496 PR.
- **Recherche viable** : rendement d'un laboratoire porté à 3,6 RP/an, entretien réduit à
6 % dans la simulation et 5,5 % dans le jeu, coût de construction d'un labo réduit à 22 M,
et revenu démographique porté à 0,08 M/habitant/an. La stratégie reste spécialisée et
coûteuse, mais ne termine plus automatiquement à -104 M.
- **Énergie pertinente mais non piégeuse** : le plancher de production déficitaire passe de
25 % à 35 %. La stratégie `prudente` retarde ses centrales pendant les premières années,
puis couvre progressivement sa consommation ; elle commence à 35 % et atteint 100 % au
lieu de rester bloquée à 25 %.
- **Stratégies différenciées** : `croissance` privilégie les serres et la population,
`production` les mines, `recherche` les laboratoires, `projets` un Gros projet, et `prudente`
un investissement énergétique décalé.

## Paramètres de référence

| Paramètre | v2 | v3 |
|---|---:|---:|
| Production d'un laboratoire | 3 RP/an | 3,6 RP/an |
| Entretien global | 7 % | 5,5 % |
| Coût d'un laboratoire | 30 M | 22 M |
| Revenu démographique | 0,03 M/hab./an | 0,08 M/hab./an |
| Plancher en déficit énergétique | 25 % | 35 % |
| Rendement recherche | quasi fixe | apprentissage progressif jusqu'à +75 % |

## Simulation v3 (80 ans)

| Stratégie | Budget final | PR finaux | Population | Énergie | Net annuel final |
|---|---:|---:|---:|---:|---:|
| Prudente | 279 M | 1 414 | 40 | 100 % | 0 M |
| Croissance | 479 M | 1 176 | 60 | 100 % | +2 M |
| Recherche | 22 M | 2 259 | 50 | 100 % | -3 M |
| Production | 726 M | 1 724 | 50 | 100 % | +7 M |
| Projets | 271 M | 1 532 | 50 | 100 % | -1 M |

La stratégie Recherche reste volontairement la plus tendue financièrement : son déficit
final est positif, contre -104 M dans le modèle v2, tandis que son avance
scientifique est claire. Les montants sont ceux de la simulation simplifiée et non une
promesse de victoire dans l'interface complète (technologies, contrats, missions et
sites ne sont pas simulés ici).
