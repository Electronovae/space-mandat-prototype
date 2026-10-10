/* =====================================================================
   GUIDE — tutoriel pas à pas en pop-ups contextuelles
   ---------------------------------------------------------------------
   Remplace l'ancien « pavé » de règles : chaque étape pointe un élément de
   l'interface et explique UNE mécanique au moment où le joueur en a besoin.
   Une étape passe à la suivante soit quand le joueur fait l'action demandée
   (done), soit avec le bouton « Suivant » (étapes sans action).
   Le guide se relance depuis « ? Aide ». Les règles complètes restent dans l'Aide.
   ===================================================================== */
'use strict';

const GUIDE_KEY = 'spacemandat-guide-done';
const viewActive = id => $(id).classList.contains('active');
const anyColony = () => state.sites.some(s => s.colonized);
const firstColony = () => state.sites.findIndex(s => s.colonized);
const siteCard = i => document.querySelector(`.site-card[data-site="${i}"]`);

const GUIDE_STEPS = [
  { target: () => document.querySelector('.hud'),
    title: 'Bienvenue, commandant',
    text: 'Votre mandat : installer des colonies hors de la Terre. Gardez un œil sur ces quatre chiffres, surtout la <b>confiance de l’ONU</b> : à 0 %, le mandat est révoqué.' },
  { target: () => document.querySelector('.nav button[data-view="operations"]'),
    title: 'Opérations',
    text: 'Tout commence ici : ouvrez <b>Opérations</b> pour voir les astres que vous pouvez coloniser.',
    done: () => viewActive('operations') || anyColony() || state.sites.some(s => s.mission) },
  { target: () => siteCard(siteIdx('LAGRANGE 1'))?.querySelector('.btn.primary') || siteCard(siteIdx('LAGRANGE 1')),
    view: 'operations',
    title: 'Première mission d’installation',
    text: 'LAGRANGE 1 est tout proche et ne demande aucune technologie. Lancez la <b>mission d’installation</b> : elle se paie une fois, puis met un certain temps à arriver.',
    done: () => state.sites.some(s => s.mission || s.colonized) },
  { target: () => $('nextYear'),
    title: 'Faire passer le temps',
    text: 'Le jeu avance année par année. Cliquez sur <b>Avancer d’un an</b> (ou touche N) jusqu’à l’arrivée des colons. Chaque année, vous touchez vos revenus et payez l’entretien.',
    done: () => anyColony() },
  { target: () => siteCard(firstColony())?.querySelector('.build-row') || siteCard(firstColony()),
    view: 'operations',
    title: 'Faire grandir la colonie',
    text: 'La population est limitée par les <b>places</b> (logements) et les <b>rations</b> (serres) : le plus faible des deux bloque. Construisez un logement et une serre. Plus d’habitants = plus d’emplacements pour bâtir.',
    done: () => state.sites.some(s => (s.b.hab || 0) + (s.b.farm || 0) >= 2) },
  { target: () => document.querySelector('.nav button[data-view="tech"]'),
    title: 'Revenus et recherche',
    text: 'Les <b>mines</b> rapportent de l’argent, les <b>laboratoires</b> des points de recherche (PR), les <b>centrales</b> l’énergie. Ils se débloquent dans l’<b>Arbre technologique</b> : ouvrez-le.',
    done: () => viewActive('tech') || state.tech.length > 0 },
  { target: () => document.querySelector('.tn.aff') || $('techGraph'),
    view: 'tech',
    title: 'Développer une technologie',
    text: 'Les cartes encadrées sont disponibles. Choisissez-en une et développez-la avec vos PR. Pour démarrer : <b>M01</b> débloque les mines, <b>I01</b> les labos, <b>E01</b> les centrales.',
    done: () => state.tech.length > 0 },
  { target: () => document.querySelector('.nav button[data-view="contracts"]'),
    title: 'Objectifs ONU',
    text: 'L’ONU vous fixe des objectifs avec une échéance. Réussis, ils rapportent confiance, budget ou PR ; ratés, ils coûtent de la confiance. Un nouveau arrive tous les 7 ans (un badge vous prévient).',
    done: () => viewActive('contracts') },
  { target: () => document.querySelector('.hud .metric:nth-child(3)'),
    title: 'À vous de jouer',
    text: 'Dernier conseil : surveillez l’<b>énergie</b> de chaque colonie (sans centrale, la production chute) et la confiance, qui s’érode un peu plus chaque année. Les règles complètes sont dans <b>? Aide</b>.' },
];

let guideStep = -1;          // -1 = guide inactif
let guideShownStep = -2;     // dernière étape affichée (pour ne faire défiler qu'une fois)

function startGuide(force) {
  let doneBefore = false;
  try { doneBefore = localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) {}
  if (doneBefore && !force) return;
  guideStep = 0;
  guideShownStep = -2;
  guideTick();
}

function endGuide() {
  guideStep = -1;
  try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) {}
  document.querySelectorAll('.guide-target').forEach(e => e.classList.remove('guide-target'));
  $('guide').style.display = 'none';
}

function guideNext() {
  guideStep++;
  if (guideStep >= GUIDE_STEPS.length) return endGuide();
  guideTick();
}

/* Appelé après chaque render() : avance si l'action est faite, puis (re)place la pop-up. */
function guideTick() {
  const box = $('guide');
  if (!box || guideStep < 0) return;
  // Avance automatique tant que les étapes sont déjà accomplies
  while (guideStep < GUIDE_STEPS.length && GUIDE_STEPS[guideStep].done && GUIDE_STEPS[guideStep].done()) guideStep++;
  if (guideStep >= GUIDE_STEPS.length) return endGuide();

  const step = GUIDE_STEPS[guideStep];
  document.querySelectorAll('.guide-target').forEach(e => e.classList.remove('guide-target'));
  const visible = !step.view || viewActive(step.view);
  const target = visible && step.target();

  box.innerHTML = `
    <div class="guide-head"><span class="eyebrow">GUIDE · ${guideStep + 1}/${GUIDE_STEPS.length}</span>
      <button class="close" onclick="endGuide()" title="Fermer le guide">×</button></div>
    <h4>${step.title}</h4>
    <p>${step.text}</p>
    ${!visible ? `<p class="muted">Ouvrez l’onglet correspondant pour continuer.</p>` : ''}
    <div class="guide-actions">
      <button class="btn" onclick="endGuide()">Passer le guide</button>
      ${step.done ? '' : `<button class="btn primary" onclick="guideNext()">${guideStep === GUIDE_STEPS.length - 1 ? 'Terminer' : 'Suivant →'}</button>`}
    </div>`;
  box.style.display = 'block';

  if (!target) {                                   // rien à pointer : pop-up en bas à gauche
    box.className = 'guide free';
    box.style.left = box.style.top = '';
    return;
  }
  target.classList.add('guide-target');
  if (guideShownStep !== guideStep) {
    guideShownStep = guideStep;
    const r0 = target.getBoundingClientRect();
    if (r0.top < 0 || r0.bottom > innerHeight) target.scrollIntoView({ block: 'center' });
  }
  // Placement : sous la cible si possible, sinon au-dessus ; jamais hors écran
  const r = target.getBoundingClientRect(), bw = Math.min(340, innerWidth - 24), bh = box.offsetHeight;
  let top = r.bottom + 12;
  if (top + bh > innerHeight - 12) top = Math.max(12, r.top - bh - 12);
  const left = Math.max(12, Math.min(innerWidth - bw - 12, r.left));
  box.className = 'guide';
  box.style.left = left + 'px';
  box.style.top = top + 'px';
}

// La pop-up suit sa cible quand on fait défiler la page ou l'arbre
let guideRaf = 0;
addEventListener('scroll', () => {
  if (guideStep < 0 || guideRaf) return;
  guideRaf = requestAnimationFrame(() => { guideRaf = 0; guideTick(); });
}, { passive: true, capture: true });
