import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

for (const field of ['', 'agriculture/', 'nature/', 'industry/', 'population/']) {
  test(`欧州 ${field || '概況'} はニュース・地図・解説と共通の分野移動を備える`, () => {
    const window = new Window();
    const doc = window.document;
    doc.write(readFileSync(new URL(`../../dist/atlas/europe/${field}index.html`, import.meta.url), 'utf8'));
    assert.equal(doc.querySelectorAll('[data-news-region="europe"]').length, 1);
    assert.equal(doc.querySelector('[data-news-rail] h2').textContent, '欧州のニュース');
    assert.deepEqual([...doc.querySelectorAll('.eu-field-nav a')].map(a=>a.textContent), ['農林業','自然環境','主要産業','人口']);
    assert.ok(doc.querySelector('[data-atlas-shell] .eu-workspace'));
    assert.equal(doc.querySelectorAll('.eu-region-buttons button').length, 5);
    assert.ok(doc.querySelector('.eu-read-panel,.europe-side'));
    if (!field) assert.equal(doc.querySelectorAll('[data-europe-country-select] option').length,46);
    if (field) {
      assert.equal(doc.querySelectorAll('.eu-read-panel select').length, 0);
      assert.equal(doc.querySelector('[data-eu-country]'),null);
      assert.equal(doc.querySelector('[data-eu-subject]'),null);
      assert.ok(doc.querySelector('.eu-map-stage [data-eu-annotations]'));
      assert.ok(doc.querySelector('.eu-map-stage [data-eu-zoom="in"]'));
      assert.equal(doc.querySelectorAll('[data-eu-config]').length, 1);
      const shell=doc.querySelector('[data-atlas-shell]');
      const workspace=doc.querySelector('.eu-workspace');
      const statistics=doc.querySelector('[data-eu-statistics]');
      assert.equal(statistics.parentElement,shell.parentElement);
      assert.ok([...shell.parentElement.children].indexOf(statistics)>[...shell.parentElement.children].indexOf(shell));
      assert.equal(doc.querySelector('.eu-read-panel [data-eu-statistics]'),null);
      assert.equal(doc.querySelector('.eu-read-panel .eu-climate-plot svg'),null);
      assert.ok(doc.querySelector('.eu-breadcrumb [data-base-map]'));
    }
    if (field==='nature/') {
      assert.deepEqual([...doc.querySelectorAll('[data-eu-topic-field="nature"] button')].map(b=>b.textContent), ['気候区分','水資源','地形','標高（等高線）']);
      assert.equal(doc.querySelector('[data-eu-climate-reader] h2').textContent,'都市の気候');
      assert.ok(doc.querySelector('[data-eu-climate-statistics] [data-city-card="london"] .eu-climate-plot svg'));
      assert.ok(doc.querySelector('.eu-read-panel [data-city-reading="london"]'));
      assert.match(doc.querySelector('[data-eu-climate-scope]').textContent,/イギリス.*首都ロンドン/);
      const cityList=doc.querySelector('.eu-map-panel [data-eu-city-list]');
      assert.equal(cityList.hidden,false);
      assert.equal(cityList.querySelectorAll('[data-eu-city-select]').length,24);
      assert.deepEqual([...cityList.querySelectorAll('[aria-pressed="true"]')].map(button=>button.dataset.euCitySelect),['london']);
      const jump=doc.querySelector('[data-eu-climate-statistics-link]');
      assert.equal(doc.getElementById(jump.getAttribute('href').slice(1)),doc.querySelector('[data-eu-climate-statistics]'));
      assert.equal(doc.querySelector('[data-eu-compare]'),null);
      assert.ok(doc.querySelectorAll('[data-eu-static-codes] text').length>=15);
    }
    if (field==='agriculture/') {
      const toggles=doc.querySelector('.eu-map-stage [data-eu-farming-toggles]');
      assert.equal(toggles.hidden,false);
      assert.deepEqual([...toggles.querySelectorAll('[data-eu-toggle]')].map(button=>button.dataset.euToggle),['crop','livestock']);
      assert.ok([...toggles.querySelectorAll('button')].every(button=>button.getAttribute('aria-pressed')==='true'&&!button.disabled));
      const list=doc.querySelector('.eu-map-panel [data-eu-farming-list]');
      assert.equal(list.hidden,false);
      assert.deepEqual([...list.querySelectorAll('h3')].map(heading=>heading.textContent),['作物','畜産','林業']);
      assert.equal(list.querySelectorAll('[data-eu-layer][aria-pressed="true"]').length,0);
      assert.equal(doc.querySelector('[data-eu-overview]').hidden,true);
      assert.equal(doc.querySelector('[data-eu-single]').hidden,true);
      assert.equal(doc.querySelector('[data-eu-farming-statistics]').hidden,false);
    }
    if (field==='industry/') assert.ok(doc.querySelector('.eu-map-stage [data-eu-topic-field="industry"]'));
    if (field==='population/') {
      const planned=[...doc.querySelectorAll('[data-eu-topic-field="population"] button:disabled')];
      assert.equal(planned.length,2);
      assert.ok(planned.every(b=>b.textContent.includes('準備中')));
      assert.ok(!doc.querySelector('[data-eu-topic-field="population"]').textContent.includes('投票'));
    }
    window.happyDOM.abort();
  });
}
