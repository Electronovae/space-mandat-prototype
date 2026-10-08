# SpaceMandat

Jeu de gestion spatiale (prototype v0.9) : dirigez le programme spatial civil de l'ONU de 2026 à 2106,
colonisez 10 astres, développez 108 technologies et gardez la confiance de l'ONU.

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
  config.js           ⭐ ÉQUILIBRAGE : BALANCE, SITES, ARCH, effets des techs, contrats
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

Stockée dans le `localStorage` du navigateur (clé `spacemandat-save2`).
