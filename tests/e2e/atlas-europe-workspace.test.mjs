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
    assert.deepEqual([...doc.querySelectorAll('.eu-field-nav a')].map(a=>a.textContent), ['欧州概況','農林業','自然環境','主要産業','人口']);
    assert.ok(doc.querySelector('[data-atlas-shell] .eu-workspace'));
    assert.equal(doc.querySelectorAll('.eu-region-buttons button').length, 5);
    assert.ok(doc.querySelector('.eu-read-panel,.europe-side'));
    if (!field) assert.equal(doc.querySelectorAll('[data-europe-country-select] option').length,46);
    if (field) {
      assert.equal(doc.querySelectorAll('[data-eu-country]').length, 1);
      assert.ok(doc.querySelector('.eu-read-panel [data-eu-country]'));
      assert.ok(doc.querySelector('.eu-read-panel [data-eu-subject]'));
      assert.ok(doc.querySelector('.eu-map-stage [data-eu-zoom="in"]'));
      assert.equal(doc.querySelectorAll('[data-eu-config]').length, 1);
    }
    if (field==='nature/') assert.deepEqual([...doc.querySelectorAll('[data-eu-topic-field="nature"] button')].map(b=>b.textContent), ['気候区分','水資源','地形','標高（等高線）']);
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
