import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { initOceaniaAtlas } from '../../src/scripts/atlas-oceania.ts';
const html = () => readFileSync(new URL('../../dist/atlas/oceania/index.html', import.meta.url),'utf8');
function setup(query='') {
  const win = new Window({url:'https://example.test/insight-journal/atlas/oceania/'+query});
  win.document.write(html());
  const root = win.document.querySelector('[data-oceania-atlas]');
  const dispose = initOceaniaAtlas(root);
  return {win,root,dispose};
}
test('サイトマップに入口があり、静的HTMLでも国名と地図を読める', () => {
  const {win,root,dispose} = setup();
  assert.equal(root.querySelectorAll('[data-country-button]').length,25);
  assert.equal(root.querySelectorAll('[data-map-country]').length,25);
  assert.ok(root.querySelector('[data-country-button="TUV"]'));
  assert.ok(root.querySelector('noscript'));
  assert.ok(root.querySelector('a[href="/insight-journal/atlas/"]'));
  assert.ok(readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8').includes('/insight-journal/atlas/oceania/'));
  dispose(); win.happyDOM.abort();
});
test('直接URL、矛盾する地域、小島の選択、全体復帰と履歴復元', () => {
  const {win,root,dispose} = setup('?region=polynesia&place=FJI&keep=yes#source');
  const map = root.querySelector('svg');
  assert.equal(root.querySelector('[data-region-button="melanesia"]').getAttribute('aria-pressed'),'true');
  assert.equal(root.querySelector('[data-selection-name]').textContent,'フィジー');
  assert.ok(Number(map.getAttribute('viewBox').split(' ')[2]) < 250);
  root.querySelector('[data-region-button="micronesia"]').click();
  assert.equal(root.querySelector('[data-country-button="FJI"]').hidden,true);
  root.querySelector('[data-country-button="NRU"]').click();
  assert.ok(win.location.search.includes('place=NRU'));
  assert.ok(win.location.search.includes('keep=yes'));
  assert.equal(win.location.hash,'#source');
  assert.ok(Number(map.getAttribute('viewBox').split(' ')[2]) < 5);
  root.querySelector('[data-region-button="all"]').click();
  assert.equal(map.getAttribute('viewBox'),map.dataset.defaultFrame);
  assert.equal(new URLSearchParams(win.location.search).has('place'),false);
  // Simulate browser history's URL plus popstate; native back/forward is also checked in Chromium.
  win.history.replaceState(null,'','?region=polynesia&place=TUV');
  win.dispatchEvent(new win.PopStateEvent('popstate'));
  assert.equal(root.querySelector('[data-selection-name]').textContent,'ツバル');
  assert.equal(root.querySelector('[data-country-button="TUV"]').getAttribute('aria-pressed'),'true');
  dispose(); win.happyDOM.abort();
});
test('無効なURL値と他地域の国を受け入れず、地図上からも選択できる', () => {
  const {win,root,dispose} = setup('?region=__proto__&place=USA');
  assert.equal(root.querySelector('svg').getAttribute('viewBox'),root.querySelector('svg').dataset.defaultFrame);
  root.querySelector('[data-map-country="KIR"]').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  assert.equal(root.querySelector('[data-selection-name]').textContent,'キリバス');
  assert.ok(win.location.search.includes('place=KIR'));
  dispose(); win.happyDOM.abort();
});
