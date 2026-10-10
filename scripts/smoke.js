/* Smoke test v1.1 : construction, destruction, rations, fin de mandat, sans navigateur. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const root = require('path').resolve(__dirname, '..');
const context = {
  console, Math, JSON,
  document: { getElementById: () => ({ textContent:'', style:{}, classList:{}, addEventListener(){}, onclick:null }), createElement: () => ({}) },
  setTimeout: () => 0, clearTimeout: () => {},
  localStorage: { setItem(){}, getItem(){ return null; } },
};
context.global = context;
vm.createContext(context);
for (const file of ['js/data/techs.js','js/config.js','js/utils.js','js/state.js','js/mechanics.js','js/actions.js','js/events.js']) {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, 'utf8'), context, { filename: file });
}
vm.runInContext(`var treeSel = null; globalThis.renderBilan = () => {}; globalThis.showEndReport = () => {}; globalThis.showDraft = () => {}; globalThis.showEvent = () => {};
  globalThis.__api = { getState: () => state, build, demolish, siteCalc, nextYear, newGame, acceptOffer, resolveEvent, setRender: fn => { render = fn; }, setToast: fn => { toast = fn; } };`, context);
const api = context.__api;
api.setRender(() => {});
api.setToast(() => {});
const st = api.getState();
st.sites[0].colonized = true;
st.sites[0].pop = 100;
st.budget = 5000;
st.tech.push('I01', 'M01', 'E01');
for (const kind of ['mine', 'lab', 'power', 'spec']) api.build(0, kind);
const b = st.sites[0].b;
for (const kind of ['mine', 'lab', 'power']) if (b[kind] !== 1) throw new Error(`construction échouée: ${kind}`);
if (!st.sites[0].project || st.sites[0].project.done) throw new Error('chantier du Gros projet absent');
if (context.__api.getState().tech.length !== 3) throw new Error('technologies de test absentes');
api.demolish(0, 'mine');
if (b.mine) throw new Error('destruction de la mine échouée');
if (context.__api.getState().rp !== undefined && context.__api.getState().rp > 16) throw new Error('état RP inattendu');
// Serre constructible sans technologie, et rations comptées séparément des places
st.sites[1].colonized = true; st.sites[1].pop = 15;
api.build(1, 'farm');
if (st.sites[1].b.farm !== 1) throw new Error('serre non constructible sans technologie');
const c1 = api.siteCalc(1);
if (c1.limit !== 'places' || c1.food <= c1.places) throw new Error('limite places/rations incorrecte');
// Fin de mandat et révocation
api.newGame(500, 40);
let events = 0;
if (!api.getState().offer || api.getState().offer.length !== 3) throw new Error('draft initial absent');
for (let k = 0; k < 40 && !api.getState().over; k++) {
  if (api.getState().event) { events++; if (!api.resolveEvent(1)) api.resolveEvent(0); }   // option gratuite
  if (api.getState().offer) api.acceptOffer(0);
  api.nextYear();
}
if (events < 3) throw new Error('trop peu d’événements aléatoires : ' + events);
if (!api.getState().over) throw new Error('la partie ne se termine pas');
console.log('OK: bâtiments construits/détruits, serre sans techno, limite rations, ' + events + ' événements, fin de mandat (' + api.getState().over + ' en ' + api.getState().year + ').');
