# Équilibrage : prototype SpaceMandat

## v1.2 : mesures (bot glouton qui choisit l'objectif « Ambitieux »)

| Budget de départ | Colonies en 2045 | Colonies en 2065 | Revenu net final |
|---|---|---|---|
| 200 M | 3 | 6 | +1 200 M/an |
| 500 M | 4 | 7 | +3 100 M/an |
| 1 200 M | 5 | 9 | +5 600 M/an |

Le bot réussit encore 80 à 90 % des objectifs, même « Audacieux » : il joue sans erreur, un humain fera moins bien, mais c'est le premier réglage à revoir en test (`BALANCE.contracts.tiers`). La fin de partie manque encore de dépenses utiles quand le budget dépasse quelques milliers de M.

## v1.1 : diagnostic « difficulté étrange »

Mesuré avec `node scripts/bot.js` (bot glouton, vrai moteur, 80 ans) :

| Avant v1.1 | Budget 200 | Budget 1 200 |
|---|---|---|
| Colonies en 2065 | 6 | 10 |
| Revenu net en 2105 | +6 800 M/an | +11 200 M/an |
| Confiance | 100 % dès 2045 | 100 % dès 2045 |

Le budget de départ ne changeait presque rien, l'économie explosait en fin de partie et la confiance n'était jamais un enjeu. Causes et corrections (`js/config.js`) :

- **Confiance** : les technologies cumulaient jusqu'à +6/an sans plafond, et la population rapportait linéairement. → plafond `caps.conf = 1`, gain de population logarithmique (`popGain`), érosion croissante (`driftGrowth = 0,02`/an écoulé), récompenses de confiance des objectifs × 0,6. Un joueur passif est maintenant révoqué vers la 40e année.
- **Distance** : rendement en `d^(1,35 + far)` sans plafond sur `far` (une mine sur Gliese 667 Cc rapportait ~1 600 M/an pour 500 M). → `exponent = 1,15`, `caps.far = 0,12`.
- **Gros projet** : coût ×4, rentabilité sur 75 ans. → `costs.projectMult = 2,5`.
- **Fin de partie** : bilan chiffré à l'horizon, révocation à 0 % de confiance (`confidence.revoke`).

Après v1.1 : 4 colonies en 2065 avec 200 M contre 9 avec 500 M (le budget pèse sur le tempo), revenu net final ~1 000 à 2 400 M/an. Ces valeurs restent à valider en jeu réel.


## Recherche et arbre technologique

- **Avant v5 :** coût réel = `cost × 3`, donc 12–60 RP pour les coûts de base présents dans l’arbre. Les effets de cycle utilisaient un pas d’ère de 25 %.
- **v5 :** coût = `cost × 2,5 × 1,18^(rang−1) × 1,38^(ère−1)`, arrondi au demi-RP. Il n’existe plus de plafond de niveau ou de points de recherche par technologie : une technologie est achetable une fois ses prérequis remplis et son coût payé.
- Exemples (coût de base 4) : rang 1 / ère I = **10 RP** ; rang 10 / ère III ≈ **85 RP** ; rang 18 / ère VI ≈ **885 RP**. La fin de l’arbre est donc un investissement de mandat, pas une formalité.
- Les effets de cycle sont renforcés : le pas d’ère passe de **+25 % à +55 %**, et les bases de cycle sont généralement augmentées d’environ **×1,5 à ×2** (selon le levier). Les surcharges `OV` sont elles aussi mises à l’échelle par l’ère.

## Compatibilité et limites

La logique de construction n’a pas été réécrite. La variable locale `S` de `actions.js` reste la définition du site utilisée pour les bâtiments et les Gros projets. Les plafonds de réduction des coûts/durées (`BALANCE.caps`) restent en place : ils empêchent les bonus cumulés de rendre les missions ou bâtiments gratuits, sans limiter la recherche elle-même.

La simulation de référence est volontairement simplifiée et ne reproduit pas les 15 sites, les contrats ONU ni toutes les branches de prérequis. Elle sert à comparer des trajectoires économiques sur 80 ans.
