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
    if (btn.dataset.view === 'contracts') render();  // efface le badge « nouveaux objectifs »
    else if (typeof guideTick === 'function') guideTick();
    window.scrollTo({ top: 0 });
  };
});

/* Boutons de l'en-tête */
$('nextYear').onclick = nextYear;
/* Touche N : uniquement en jeu (pas derrière une fenêtre ouverte, pas dans un champ) */
const modalOpen = () => [...document.querySelectorAll('.modal')].some(m => m.style.display === 'flex');
document.addEventListener('keydown', e => {
  if (!e.key || e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || modalOpen() || !gameStarted) return;
  nextYear();
});
window.addEventListener('resize', () => { if (typeof guideTick === 'function') guideTick(); });
$('save').onclick = save;
$('newGame').onclick = openSetup;
$('help').onclick = () => { $('tutorial').style.display = 'flex'; };

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
$('load').onclick = () => { if (load()) gameStarted = true; };

/* Démarrage : on affiche d'abord la fenêtre de démarrage ; la partie
   (et ses contrats tirés au hasard) commence quand le joueur la valide. */
render();
openSetup();
