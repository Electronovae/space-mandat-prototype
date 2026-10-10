# SpaceMandat

Jeu de gestion spatiale (prototype v1.1) : dirigez le programme spatial civil de l’ONU de 2026 jusqu'à l'horizon que vous choisissez (40 à 200 ans, 80 par défaut),
colonisez 15 astres (dont 5 exoplanètes de fin de partie), développez 108 technologies et gardez la confiance de l'ONU.

100 % statique : HTML + CSS + JavaScript, **aucune dépendance, aucun build**. 

## Lancer le jeu

**En local** : double-cliquer sur `index.html`.

**Sur GitHub Pages** :

Le prototype est dispo ici :  https://electronovae.github.io/space-mandat-prototype/

## Structure

```
index.html            page unique (structure + ordre de chargement des scripts)
css/style.css         styles (palette dans :root)
js/
  data/techs.js       les 108 technologies (nom, ère, coût, prérequis, textes)
  config.js           ⭐ ÉQUILIBRAGE : BALANCE (dont fenêtre de départ), SITES, ARCH, MEGA, effets des techs, CONTRACT_POOL
  utils.js            helpers de formatage, notifications
  state.js            état de la partie + génération des effets de technologies
  mechanics.js        formules de calcul (revenus, population, coûts…) — sans DOM
  actions.js          actions du joueur, passage d'année, sauvegarde/chargement
  ui.js               affichage
  events.js           événements aléatoires (pool, choix, effets temporaires)
  guide.js            guide pas à pas (pop-ups contextuelles)
  main.js             démarrage et navigation
scripts/
  smoke.js            test rapide du moteur (node scripts/smoke.js)
  bot.js              partie jouée par un bot avec le vrai moteur (node scripts/bot.js 500 80)
  simulate.js         ancienne simulation simplifiée (indépendante du moteur)
```

Les scripts sont des scripts classiques (pas de modules ES) : l'ordre dans `index.html` compte,
et le jeu fonctionne aussi hors serveur (`file://`).

## Équilibrage

Voir [BALANCING.md](BALANCING.md). Presque tout se règle dans `js/config.js`.

## Sauvegarde

Stockée dans le `localStorage` du navigateur (clé `spacemandat-save3`).

## Nouveautés

- **Fenêtre de démarrage** : choix du budget initial (150 à 2 000 M) et de l'horizon du mandat (40 à 200 ans),
  avec une estimation de la difficulté. Rouvrable via « Nouvelle partie ». Bornes dans `BALANCE.setup`.
- **37 contrats ONU tirés au hasard** (`CONTRACT_POOL`) : 5 au départ, puis un nouveau tous les 7 ans.
  Délais relatifs au moment du tirage, barres de progression, contrats « à maintenir » (`hold`).
  Les contrats de fin de partie (`after`) n'apparaissent qu'au bout de plusieurs décennies, et jamais
  si leur échéance dépasse la fin du mandat.
- **Récompenses variées** : chaque contrat rapporte au hasard de la confiance, de la trésorerie ou des points
  de recherche.
- **Toutes les branches comptent** : chaque astre exige des technologies de plusieurs branches (énergie,
  propulsion, matériaux, vie, information, sociétés) ; labos et mines sont aussi verrouillés.
- **Cartes Opérations** : croissance de population par an et nombre de années avant le prochain emplacement.
- **5 exoplanètes** (Proxima b, Barnard b, Teegarden b, Gliese 667 Cc, TRAPPIST-1 e), verrouillées par
  les technologies de propulsion tardives (P09, P12, P13, P14, P17) et affichées dans la bande
  « au-delà du système » de la carte.

## Version 1.0 — énergie et Gros projets

- Chaque colonie affiche son bilan énergétique : les centrales produisent, les bâtiments consomment et un déficit réduit la production jusqu'à construction d'une centrale.
- Le bâtiment propre à chaque astre est désormais un **Gros projet** : investissement élevé, chantier de cinq ans, prérequis technologique et gain majeur à l'achèvement.
- La simulation de tendance se lance avec `node scripts/simulate.js`.

## Version 1.1 : retours de test (Julien C.)

- **Guide pas à pas** : le pavé de règles est remplacé par 9 pop-ups qui pointent l'interface et avancent quand le joueur fait l'action. Relançable depuis « ? Aide », qui garde les règles en sections repliables.
- **Notifications empilées** et **journal de l'année** dans le bilan : plus aucun événement perdu. Badge sur l'onglet Objectifs pour les nouveaux objectifs.
- **Vocabulaire** : « Objectifs ONU » (au lieu de contrats, pour ne plus confondre avec les missions), « mission d'installation », points de recherche notés **PR**, « année » partout.
- **Opérations** : astres classés par distance ; une carte non colonisée montre seulement la mission (coût, trajet, colons) ; une colonie montre population, emplacements, travailleurs, et chaque bâtiment affiche son entretien, son énergie et ses travailleurs. Le facteur bloquant (places ou rations) est indiqué.
- **Rations** : les serres ne demandent plus de technologie ; logements = places, serres = rations (le logement affichait un gain qu'il ne donnait pas).
- **Arbre** : bandeaux d'ères, liens mis en évidence au survol (orange = prérequis, vert = ce que la carte ouvre), flèches.
- **Bouton « Avancer d'un an »** flottant en bas à droite ; la touche N ne marche plus derrière une fenêtre.
- **Fin de partie** : bilan chiffré à la fin du mandat, révocation si la confiance tombe à 0 %.
- **Équilibrage** : voir [BALANCING.md](BALANCING.md).
