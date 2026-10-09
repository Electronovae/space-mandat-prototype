/* =====================================================================
   MAIN — point d'entrée : navigation, boutons, démarrage
   ===================================================================== */
'use strict';

function closeTutorial() {
  $('tutorial').style.display = 'none';
}

/* Navigation latérale : affiche la vue correspondant au bouton cliqué */
document.querySelectorAll('.nav button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $(btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'tech') renderTree();   // le graphe se mesure une fois visible
  };
});

/* Boutons de l'en-tête */
$('nextYear').onclick = nextYear;
$('save').onclick = save;
$('load').onclick = load;
$('newGame').onclick = openSetup;

/* Fenêtre de démarrage (budget + horizon) */
$('setupBudget').oninput = updateSetup;
$('setupHorizon').oninput = updateSetup;
document.querySelectorAll('.chips button').forEach(b => {
  b.onclick = () => setSetup(b.parentElement.dataset.for, b.dataset.v);
});
$('setupStart').onclick = startGame;
$('setupCancel').onclick = () => { $('setup').style.display = 'none'; };
$('setupLoad').onclick = () => {
  if (load()) { gameStarted = true; $('setup').style.display = 'none'; }
};

/* Démarrage : on affiche d'abord la fenêtre de démarrage ; la partie
   (et ses contrats tirés au hasard) commence quand le joueur la valide. */
render();
openSetup();
