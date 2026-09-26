import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

test('アジア3地域の分野ページは一つの地図・ニュース欄・解説欄を持ち、初期表示がURLと一致する', async () => {
  const labels = {'east-asia':'東アジア','southeast-asia':'東南アジア','south-central-asia':'南・中央アジア'};
  const sitemap = await readFile('dist/sitemap.xml','utf8');
  for (const [region,label] of Object.entries(labels)) for (const field of ['nature','agriculture','population']) {
    const window = new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
    try {
      const html = await readFile(`dist/atlas/asia/${region}/${field}/index.html`,'utf8');
      window.document.write(html);
      const q = s=>window.document.querySelector(s), all = s=>window.document.querySelectorAll(s);
      assert.equal(all('[data-map-surface]').length,1);
      const config=JSON.parse(q('[data-asia-config]').textContent);
      assert.equal(config.climateBase,'/insight-journal/assets/atlas/asia-climate-v2/');
      assert.equal(config.climate.gridEncoding,'uint8-gzip');
      assert.ok(config.climate.width>2000);
      assert.equal(all('[data-news-rail]').length,1);
      assert.equal(q('[data-news-rail]').dataset.newsRegion,region);
      assert.match(q('[data-news-rail]').textContent,new RegExp(`${label}のニュース`));
      assert.ok(q('[data-map-surface]').closest('[data-atlas-shell]'));
      assert.equal(q('[data-map-surface]').getAttribute('tabindex'),'0');
      assert.equal(q('.atlas-tabs [aria-current="page"]').getAttribute('href'),`/insight-journal/atlas/asia/${region}/${field}/`);
      assert.equal(all('.atlas-tabs a').length,3,'only implemented fields are offered');
      assert.equal(q('[data-population-reading]').hidden,field!=='population');
      assert.equal(q('[data-population-legend]').hidden,field!=='population');
      assert.equal(config.populationBase,'/insight-journal/assets/atlas/asia-population-v1/');
      assert.ok(config.population.cities.length>=12);
      assert.match(q('[data-population-reading]').textContent,/2025年の資料が定めた同じ範囲/);
      assert.equal(q('[data-overview]').hidden,field!=='nature');
      assert.equal(q('[data-rice-reading]').hidden,field!=='agriculture');
      assert.equal(q('[data-city-picker]').hidden,field!=='nature');
      assert.equal(q('[data-climate-legend]').hidden,field!=='nature');
      assert.equal(q('[data-agriculture-legend]').hidden,field!=='agriculture');
      assert.equal(q('.asia-reading-scroll').getAttribute('tabindex'),'0');
      for(const card of all('[data-city-panel]')) assert.ok(card.querySelector('.asia-climate-diagram'));
      assert.ok(q('[data-city-panel]').compareDocumentPosition(q('[data-class-reading]')) & 4,'city diagrams precede classification notes');
      assert.ok(sitemap.includes(`/atlas/asia/${region}/${field}/`));
      assert.ok(q('link[rel="canonical"]').href.endsWith(`/atlas/asia/${region}/${field}/`));
      assert.ok(!sitemap.includes(`/atlas/asia/${region}/</loc>`),'legacy duplicate is excluded');
      assert.equal(q('[data-country-select] option[value="IRN"]'),null);
      assert.equal(q('[data-country-select] option[value="RUS"]'),null);
    } finally { await window.happyDOM.close(); }
  }
});

test('旧アジア地域ページは自然環境の正規URLを示す', async () => {
  for(const region of ['east-asia','southeast-asia','south-central-asia']) {
    const html=await readFile(`dist/atlas/asia/${region}/index.html`,'utf8');
    assert.match(html,new RegExp(`<link rel="canonical" href="https://guchio2366-dev.github.io/insight-journal/atlas/asia/${region}/nature/"`));
  }
});
