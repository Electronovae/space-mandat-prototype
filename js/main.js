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

/* Démarrage */
renderMap();
render();
setTimeout(() => { $('tutorial').style.display = 'flex'; }, 500);   // tutoriel après 0,5 s
