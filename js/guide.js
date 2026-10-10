/* =====================================================================
   GUIDE — tutoriel pas à pas, ANCRÉ DANS LA BARRE LATÉRALE
   ---------------------------------------------------------------------
   v1.5 : plus aucune pop-up par-dessus le jeu. Le guide vit dans la colonne
   de gauche (place libre sous la navigation) ; il se contente de SURLIGNER
   l'élément concerné. Chaque étape = un objectif concret + comment le faire.
   Une étape se valide toute seule quand le joueur fait l'action (done),
   ou avec « Compris » pour les étapes d'explication.
   Relançable depuis « ? Aide ».
   ===================================================================== */
'use strict';

const GUIDE_KEY = 'spacemandat-guide-done';
const viewActive = id => $(id).classList.contains('active');
const anyColony = () => state.sites.some(s => s.colonized);
const firstColony = () => state.sites.findIndex(s => s.colonized);
const siteCard = i => document.querySelector(`.site-card[data-site="${i}"]`);
const navBtn = v => document.querySelector(`.nav button[data-view="${v}"]`);

const GUIDE_STEPS = [
  { title: 'Première mission',
    goal: 'Lancez une mission d’installation vers l’<b>Orbite basse</b>.',
    how: 'Onglet <b>Opérations</b>, bouton « Lancer la mission d’installation ». Elle coûte 15 M et arrive en 1 an.',
    target: () => viewActive('operations') ? siteCard(siteIdx('Orbite basse'))?.querySelector('.btn.primary') : navBtn('operations'),
    done: () => state.sites.some(s => s.mission || s.colonized) },
  { title: 'Faire passer le temps',
    goal: 'Avancez d’un an jusqu’à l’arrivée des colons.',
    how: 'Bouton « Avancer d’un an » en haut, ou touche <b>N</b>. Chaque année : revenus, entretien, croissance.',
    target: () => $('nextYear'),
    done: () => anyColony() },
  { title: 'Loger et nourrir',
    goal: 'Construisez un <b>logement</b> et une <b>serre</b> dans votre colonie.',
    how: 'La population est limitée par les places (logements) et les rations (serres). Plus d’habitants = plus d’emplacements et de travailleurs.',
    target: () => viewActive('operations') ? siteCard(firstColony())?.querySelector('.tiles') : navBtn('operations'),
    done: () => state.sites.some(s => (s.b.hab || 0) + (s.b.farm || 0) >= 2) },
  { title: 'Débloquer l’économie',
    goal: 'Développez <b>M01</b> (mines) ou <b>I01</b> (laboratoires).',
    how: 'Onglet <b>Arbre technologique</b> : les cartes marquées « ★ conseillée » sont de bons choix. Elles se paient en PR.',
    target: () => viewActive('tech') ? document.querySelector('.tn.aff') : navBtn('tech'),
    done: () => has('M01') || has('I01') },
  { title: 'Produire',
    goal: 'Construisez une <b>mine</b> (revenus) ou un <b>laboratoire</b> (PR).',
    how: 'Chacun demande 30 travailleurs et de l’énergie : la ligne « effet réel ici » vous dit ce que le bâtiment rapportera vraiment.',
    target: () => viewActive('operations') ? siteCard(firstColony())?.querySelector('.build-menu') : navBtn('operations'),
    done: () => state.sites.some(s => s.b.mine || s.b.lab) },
  { title: 'Votre cockpit',
    goal: 'Revenez au <b>Centre de commandement</b> chaque année.',
    how: 'La liste « À décider » propose des actions en un clic (construire, rechercher, lancer). À droite : vos objectifs ONU et la subvention qu’ils protègent.',
    target: () => viewActive('command') ? $('todo') : navBtn('command'),
    manual: true },
  { title: 'L’ONU vous finance',
    goal: 'Gardez la confiance de l’ONU.',
    how: 'Elle fixe votre subvention annuelle. Tous les 5 ans, choisissez un objectif parmi 3 ; un échec coûte de la confiance. <b>À 0 %, le mandat est révoqué.</b>',
    target: () => document.querySelector('.hud .metric:nth-child(3)'),
    manual: true },
];

let guideStep = -1;          // -1 = guide inactif

function startGuide(force) {
  let doneBefore = false;
  try { doneBefore = localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) {}
  if (doneBefore && !force) return;
  guideStep = 0;
  guideTick();
}

function endGuide() {
  guideStep = -1;
  try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) {}
  document.querySelectorAll('.guide-target').forEach(e => e.classList.remove('guide-target'));
  const box = $('guide');
  if (box) { box.innerHTML = ''; box.style.display = 'none'; }
}

function guideNext() {
  guideStep++;
  if (guideStep >= GUIDE_STEPS.length) return endGuide();
  guideTick();
}

/* Appelé après chaque render() : valide les étapes faites, met à jour le panneau et le surlignage */
function guideTick() {
  const box = $('guide');
  if (!box || guideStep < 0) return;
  while (guideStep < GUIDE_STEPS.length && GUIDE_STEPS[guideStep].done && GUIDE_STEPS[guideStep].done()) guideStep++;
  if (guideStep >= GUIDE_STEPS.length) return endGuide();

  const step = GUIDE_STEPS[guideStep];
  box.style.display = 'block';
  box.innerHTML = `
    <div class="gd-head"><span>GUIDE · ${guideStep + 1}/${GUIDE_STEPS.length}</span><button class="linkbtn" onclick="endGuide()">passer</button></div>
    <div class="gd-bar"><i style="width:${guideStep / GUIDE_STEPS.length * 100}%"></i></div>
    <h4>${step.title}</h4>
    <p class="gd-goal">${step.goal}</p>
    <p class="gd-how">${step.how}</p>
    ${step.manual ? `<button class="btn primary gd-next" onclick="guideNext()">${guideStep === GUIDE_STEPS.length - 1 ? 'Terminer' : 'Compris →'}</button>` : '<p class="gd-wait">Se valide tout seul quand c’est fait.</p>'}`;

  document.querySelectorAll('.guide-target').forEach(e => e.classList.remove('guide-target'));
  const t = step.target && step.target();
  if (t) t.classList.add('guide-target');
}
