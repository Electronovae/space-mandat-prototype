# SpaceMandat

Jeu de gestion spatiale (prototype v0.9) : dirigez le programme spatial civil de l'ONU de 2026 jusqu'à l'horizon que vous choisissez (40 à 200 ans, 80 par défaut),
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
  config.js           ⭐ ÉQUILIBRAGE : BALANCE (dont fenêtre de départ), SITES, ARCH, effets des techs, CONTRACT_POOL
  utils.js            helpers de formatage, notifications
  state.js            état de la partie + génération des effets de technologies
  mechanics.js        formules de calcul (revenus, population, coûts…) — sans DOM
  actions.js          actions du joueur, passage d'année, sauvegarde/chargement
  ui.js               affichage
  main.js             démarrage et navigation
```

Les scripts sont des scripts classiques (pas de modules ES) : l'ordre dans `index.html` compte,
et le jeu fonctionne aussi hors serveur (`file://`).

## Équilibrage

Voir [BALANCING.md](BALANCING.md). Presque tout se règle dans `js/config.js`.

## Sauvegarde

Stockée dans le `localStorage` du navigateur (clé `spacemandat-save3`).

## Nouveautés

- **Fenêtre de démarrage** : choix du budget initial (150–1 500 M) et de l'horizon du mandat (40–120 ans),
  avec une estimation de la difficulté. Rouvrable via « Nouvelle partie ». Bornes dans `BALANCE.setup`.
- **37 contrats UN tirés au hasard** (`CONTRACT_POOL`) : 5 au départ, puis un nouveau tous les 7 ans.
  Délais relatifs au moment du tirage, barres de progression, contrats « à maintenir » (`hold`).
  Les contrats de fin de partie (`after`) n'apparaissent qu'au bout de plusieurs décennies, et jamais
  si leur échéance dépasse la fin du mandat.
- **Récompenses variées** : chaque contrat rapporte au hasard de la confiance, de la trésorerie ou des points
  de recherche.
- **Toutes les branches comptent** : chaque astre exige des technologies de plusieurs branches (énergie,
  propulsion, matériaux, vie, information, sociétés) ; labos et mines sont aussi verrouillés.
- **Cartes Opérations** : croissance de population par tour et nombre de tours avant le prochain emplacement.
- **5 exoplanètes** (Proxima b, Barnard b, Teegarden b, Gliese 667 Cc, TRAPPIST-1 e), verrouillées par
  les technologies de propulsion tardives (P09, P12, P13, P14, P17) et affichées dans la bande
  « hors système » de la carte.
