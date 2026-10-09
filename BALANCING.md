# Équilibrage — prototype SpaceMandat v5

## Recherche et arbre technologique

- **Avant v5 :** coût réel = `cost × 3`, donc 12–60 RP pour les coûts de base présents dans l’arbre. Les effets de cycle utilisaient un pas d’ère de 25 %.
- **v5 :** coût = `cost × 2,5 × 1,18^(rang−1) × 1,38^(ère−1)`, arrondi au demi-RP. Il n’existe plus de plafond de niveau ou de points de recherche par technologie : une technologie est achetable une fois ses prérequis remplis et son coût payé.
- Exemples (coût de base 4) : rang 1 / ère I = **10 RP** ; rang 10 / ère III ≈ **85 RP** ; rang 18 / ère VI ≈ **885 RP**. La fin de l’arbre est donc un investissement de mandat, pas une formalité.
- Les effets de cycle sont renforcés : le pas d’ère passe de **+25 % à +55 %**, et les bases de cycle sont généralement augmentées d’environ **×1,5 à ×2** (selon le levier). Les surcharges `OV` sont elles aussi mises à l’échelle par l’ère.

## Compatibilité et limites

La logique de construction n’a pas été réécrite. La variable locale `S` de `actions.js` reste la définition du site utilisée pour les bâtiments et les Gros projets. Les plafonds de réduction des coûts/durées (`BALANCE.caps`) restent en place : ils empêchent les bonus cumulés de rendre les missions ou bâtiments gratuits, sans limiter la recherche elle-même.

La simulation de référence est volontairement simplifiée et ne reproduit pas les 15 sites, les contrats ONU ni toutes les branches de prérequis. Elle sert à comparer des trajectoires économiques sur 80 ans.
