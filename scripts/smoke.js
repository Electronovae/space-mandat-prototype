/* Smoke test v4: exercise building and demolition without a browser. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const root = require('path').resolve(__dirname, '..');
const context = {
  console, Math, JSON,
  document: { getElementById: () => ({ textContent:'', style:{}, classList:{}, addEventListener(){}, onclick:null }) },
  setTimeout: () => 0, clearTimeout: () => {},
  localStorage: { setItem(){}, getItem(){ return null; } },
};
context.global = context;
vm.createContext(context);
for (const file of ['js/data/techs.js','js/config.js','js/utils.js','js/state.js','js/mechanics.js','js/actions.js']) {
  vm.runInContext(fs.readFileSync(`${root}/${file}`, 'utf8'), context, { filename: file });
}
vm.runInContext(`globalThis.__api = { getState: () => state, build, demolish, setRender: fn => { render = fn; }, setToast: fn => { toast = fn; } };`, context);
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
api.demolish(0, 'mine');
if (b.mine) throw new Error('destruction de la mine échouée');
console.log('OK: mine, labo, centrale, Gros projet construits; mine détruite.');
