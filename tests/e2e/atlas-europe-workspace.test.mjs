import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const europeHtml = async field => {
  if (!process.env.EUROPE_TEST_BASE) return readFileSync(new URL(`../../dist/atlas/europe/${field}index.html`, import.meta.url), 'utf8');
  const response = await fetch(new URL(field, process.env.EUROPE_TEST_BASE));
  assert.equal(response.status, 200);
  return response.text();
};

for (const field of ['', 'agriculture/', 'nature/', 'industry/', 'population/']) {
  test(`欧州 ${field || '概況'} はニュース・地図・解説と共通の分野移動を備える`, async () => {
    const window = new Window();
    const doc = window.document;
    doc.write(await europeHtml(field));
    assert.equal(doc.querySelectorAll('[data-news-region="europe"]').length, 1);
    assert.equal(doc.querySelector('[data-news-rail] h2').textContent, '欧州のニュース');
    assert.deepEqual([...doc.querySelectorAll('.eu-field-nav a:not([data-atlas-overview-link])')].map(a=>a.textContent), ['農林業','自然環境','主要産業','人口']);
    const overview=doc.querySelector('.eu-field-nav > a:first-child');
    assert.equal(overview.textContent,'概要');
    assert.equal(overview.getAttribute('href'),'/insight-journal/atlas/europe/overview/');
    assert.ok(overview.hasAttribute('data-atlas-overview-link'));
    assert.equal(overview.hasAttribute('data-eu-field'),false,'概要は地図主題ではなく独立ページへ移動する');
    assert.ok(doc.querySelector('[data-atlas-shell] .eu-workspace'));
    assert.equal(doc.querySelectorAll('.eu-region-buttons button').length, 5);
    assert.ok(doc.querySelector('.eu-read-panel,.europe-side'));
    if (!field) assert.equal(doc.querySelectorAll('[data-europe-country-select] option').length,46);
    if (field) {
      assert.equal(doc.querySelectorAll('.eu-read-panel select').length, 3,'Case controls move to the map only when the runtime activates the census case');
      assert.equal(doc.querySelector('[data-eu-culture-host]').hidden,true);
      assert.equal(doc.querySelector('[data-eu-country]'),null);
      assert.equal(doc.querySelector('[data-eu-subject]'),null);
      assert.ok(doc.querySelector('.eu-map-stage [data-eu-annotations]'));
      assert.ok(doc.querySelector('.eu-map-stage [data-eu-zoom="in"]'));
      assert.deepEqual([...doc.querySelectorAll('.eu-map-buttons button')].map(button=>button.hasAttribute('data-eu-reset')?'overview':button.dataset.euZoom??'renderer'),['overview','in','out','renderer']);
      assert.equal(doc.querySelector('[data-eu-map-legend]').previousElementSibling,doc.querySelector('.eu-map-stage'));
      assert.match(doc.querySelector('[data-eu-map-legend] .eu-water-note').textContent,/地下水.*未確認.*未収録/);
      const waterMask=doc.querySelector('[data-eu-water-mask="caspian-sea"]');
      assert.ok(waterMask);
      assert.equal(waterMask.getAttribute('fill'),'#e7eff1');
      assert.equal(waterMask.parentElement.style.display,field==='nature/'?'':'none');
      assert.ok(doc.querySelector('[data-eu-climate-image]').compareDocumentPosition(waterMask)&4,'水面を気候画像より上に描く');
      assert.equal(doc.querySelectorAll('[data-eu-config]').length, 1);
      const shell=doc.querySelector('[data-atlas-shell]');
      const statistics=doc.querySelector('[data-eu-statistics]');
      assert.equal(statistics.parentElement,shell.parentElement);
      assert.ok([...shell.parentElement.children].indexOf(statistics)>[...shell.parentElement.children].indexOf(shell));
      assert.equal(doc.querySelector('.eu-read-panel [data-eu-statistics]'),null);
      assert.equal(doc.querySelectorAll('[data-eu-climate-statistics] [data-eu-city-chart] svg').length,0);
      assert.equal(doc.querySelectorAll('.eu-read-panel [data-eu-city-chart] svg').length,24);
      assert.equal(doc.querySelectorAll('[data-eu-city-chart]').length,24,'Each station has one chart beside its selected reading');
      assert.equal(doc.querySelectorAll('[data-eu-climate-statistics] [data-city-card] table').length,24,'Monthly tables remain synchronized below the workspace');
      const ids=[...doc.querySelectorAll('[id]')].map(element=>element.id);
      assert.equal(new Set(ids).size,ids.length,'Station/chart and source headings retain unique IDs');
      assert.ok(doc.querySelector('.eu-breadcrumb [data-base-map]'));
    }
    if (field==='nature/') {
      assert.deepEqual([...doc.querySelectorAll('[data-eu-topic-field="nature"] button')].map(b=>b.textContent), ['気候区分','水資源','地形','標高（等高線）']);
      assert.equal(doc.querySelector('[data-eu-topic-field="nature"]').getAttribute('role'),'tablist');
      assert.equal(doc.querySelectorAll('[data-eu-topic-field="nature"] [role="tab"][tabindex="0"]').length,1);
      assert.equal(doc.querySelector('[data-eu-water-options]').getAttribute('role'),'tablist');
      assert.equal(doc.querySelector('[data-eu-climate-reader] h2').textContent,'ロンドンの気候と農畜産');
      const londonChart=doc.querySelector('.eu-read-panel [data-city-reading="london"] [data-eu-city-chart="london"] svg');
      assert.ok(londonChart);
      assert.deepEqual([...londonChart.querySelectorAll('.atlas-climate-month')].map(label=>label.textContent),Array.from({length:12},(_,i)=>String(i+1)));
      assert.equal(londonChart.querySelector('.atlas-climate-axis-title').textContent,'月');
      assert.match(doc.querySelector('[data-city-reading="london"] .eu-city-selected-note').textContent,/Cfb.*最寒1月.*5\.7.*最暖7月.*19\.0/);
      assert.equal(doc.querySelector('[data-city-reading="london"] .eu-city-reading-details').open,false);
      assert.match(doc.querySelector('[data-eu-climate-statistics] h2').textContent,/月別の数値.*年間の要約/);
      assert.ok(doc.querySelector('[data-eu-climate-statistics] [data-city-card="london"] table'));
      assert.ok(doc.querySelector('[data-eu-climate-statistics] [data-city-card="london"] .eu-summary'));
      assert.ok(doc.querySelector('.eu-read-panel [data-city-reading="london"]'));
      assert.match(doc.querySelector('[data-city-reading="london"] .eu-city-chart-meta').textContent,/イギリス.*首都ロンドン/);
      const cityList=doc.querySelector('.eu-map-panel [data-eu-city-list]');
      assert.equal(cityList.hidden,false);
      assert.equal(cityList.querySelectorAll('[data-eu-city-choice] option').length,24);
      assert.equal(cityList.querySelector('[data-eu-city-choice]').value,'london');
      const key=doc.querySelector('.eu-read-panel [data-eu-climate-legend]');
      assert.equal(key.open,false,'Full 17-class key is available in a native disclosure without displacing the selected station plot');
      assert.equal(key.querySelectorAll('.eu-legend-grid>div').length,17);
      assert.match(key.querySelector('summary').textContent,/1991–2020.*17/);
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
      assert.deepEqual([...list.querySelectorAll('[data-eu-farming-children]:not([hidden]) h3')].map(heading=>heading.textContent),['作物','畜産']);
      assert.equal(list.querySelector('[data-eu-farming-children="forest"]').hidden,true);
      assert.equal(list.querySelectorAll('[data-eu-layer][aria-pressed="true"]').length,0);
      assert.equal(doc.querySelector('[data-eu-overview]').hidden,true);
      assert.equal(doc.querySelector('[data-eu-single]').hidden,true);
      assert.equal(doc.querySelector('[data-eu-farming-statistics]').hidden,false);
    }
    if (field==='industry/') {
      const topics=doc.querySelector('[data-eu-topic-field="industry"]');
      assert.deepEqual([...topics.querySelectorAll('[data-eu-topic-feature]')].map(button=>button.textContent),['資源・素材代表地点','機械・輸送代表地点','技術・医薬代表地点','物流・サービス代表地点']);
      assert.deepEqual([...topics.querySelectorAll('button:not([data-eu-topic-feature])')].map(button=>button.dataset.euTopic),['hubs','manufacturing','industry','services']);
      assert.ok(doc.querySelector('.eu-reader-body').open);
      assert.ok(doc.querySelector('.eu-read-panel [data-eu-subject-legend]').open);
    }
    if (field==='population/') {
      const chooser=doc.querySelector('[data-eu-layer-choice="population"]');
      assert.ok(chooser);
      assert.deepEqual([...chooser.options].map(option=>option.value),['density','urban','age','growth']);
      assert.equal(chooser.value,'density');
      assert.ok(chooser.closest('[data-eu-topic-field="population"]'));
      assert.ok(doc.querySelector('.eu-reader-body').open);
      const planned=[...doc.querySelectorAll('[data-eu-topic-field="population"] button:disabled')];
      assert.equal(planned.length,0);
      assert.deepEqual([...doc.querySelectorAll('[data-eu-topic-field="population"] button')].map(b=>b.textContent),['人口分布','人種・民族（事例）','宗教（事例）']);
      assert.match(doc.querySelector('.eu-culture-kicker').textContent,/地域事例/);
      assert.deepEqual([...doc.querySelector('[data-culture-case]').options].map(option=>option.textContent),['イングランド・ウェールズ・行政区','クロアチア・全国値']);
      assert.ok(!doc.querySelector('[data-eu-topic-field="population"]').textContent.includes('投票'));
    }
    window.happyDOM.abort();
  });
}
