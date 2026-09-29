import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

test('アジア3地域の分野ページは一つの地図・ニュース欄・解説欄を持ち、初期表示がURLと一致する', async () => {
  const labels = {'east-asia':'東アジア','southeast-asia':'東南アジア','south-central-asia':'南・中央アジア'};
  const sitemap = await readFile('dist/sitemap.xml','utf8');
  for (const [region,label] of Object.entries(labels)) for (const field of ['nature','agriculture','industry','population']) {
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
      assert.equal(all('.atlas-tabs a').length,4,'implemented fields are offered');
      assert.equal(all('[data-natural-group]').length,4);
      assert.equal(q('[data-natural-group=climate]').getAttribute('aria-pressed'),'true');
      assert.equal(q('[data-industry-panel]').hidden,field!=='industry');
      assert.equal(q('[data-industry-legend]').hidden,field!=='industry');
      assert.equal(config.industryBase,'/insight-journal/assets/atlas/asia-industry-v1/');
      assert.ok(config.industry.topics.length>20);
      assert.ok(config.industry.powerCount>800);
      assert.equal(config.industry.details,undefined,'facility index stays in the lazy dataset');
      assert.ok(Buffer.byteLength(JSON.stringify(config.industry))<30000,'initial industry config contains only topic/file metadata');
      assert.equal(config.waterBase,'/insight-journal/assets/atlas/asia-water-v1/');
      assert.ok(Buffer.byteLength(JSON.stringify(config.water))<4000,'water geometry and numeric grids remain lazy assets');
      assert.equal(q('[data-hydrology-panel]').hidden,true);
      assert.equal(q('[data-hydrology-legend]').hidden,true);
      for(const id of ['landform','climate','terrain','water'])assert.ok(q(`button[data-natural-group="${id}"]`));
      for(const id of ['water','basins','precipitation'])assert.ok(q(`button[data-natural-topic="${id}"]`));
      assert.equal(all('[data-industry-topic] optgroup').length,5);
      assert.equal(q('[data-population-reading]').hidden,field!=='population');
      assert.equal(q('[data-population-legend]').hidden,field!=='population');
      assert.equal(config.populationBase,'/insight-journal/assets/atlas/asia-population-v1/');
      assert.equal(config.socialBase,'/insight-journal/assets/atlas/asia-social-v1/');
      assert.ok(config.social.adminCount>=16);
      assert.ok(Buffer.byteLength(JSON.stringify(config.social))<30000,'social geometry, counts and series stay in lazy assets');
      assert.equal(q('[data-social-panel]').hidden,true);
      assert.equal(q('[data-trade-panel]').hidden,true);assert.ok(q('[data-trade-chapter]')&&q('[data-farm-trade]'));
      assert.equal(config.tradeBase,'/insight-journal/assets/atlas/asia-trade-v1/');assert.ok(config.trade.covered>=5);assert.ok(config.industry.topics.some(t=>t.id==='trade-exports'));
      assert.ok(Buffer.byteLength(JSON.stringify(config.tradeChapters))<8000);
      assert.ok(q('[data-population-topic] option[value="national-age-old"]'));
      assert.ok(q('[data-social-metric]')&&q('[data-social-area]')&&q('[data-social-density]'));
      assert.ok(config.population.cities.length>=12);
      assert.match(q('[data-population-reading]').textContent,/2025年の資料が定めた同じ範囲/);
      assert.equal(q('[data-overview]').hidden,field!=='nature');
      assert.equal(q('[data-rice-reading]').hidden,true);
      assert.equal(q('[data-farm-overview-reading]').hidden,field!=='agriculture');
      assert.equal(all('[data-farm-kind]').length,0);
      assert.ok(all('[data-industry-feature]').length>=4&&all('[data-industry-feature]').length<=6);assert.equal(all('[data-farm-toggle]').length,2);assert.ok(q('[data-industry-all]'));for(const b of all('[data-industry-feature]'))assert.ok(config.industry.topics.some(t=>t.id===b.dataset.industryFeature));
      assert.equal(all('[data-industry-subsector]').length,0);
      assert.equal(all('[data-population-group]').length,3);
      assert.equal(q('[data-population-group=voting]'),null);
      assert.equal(all('[data-population-subgroup]').length,0);
      assert.ok(config.presentation.settlements.ethnicity&&config.presentation.settlements.religion);
      assert.ok(q('[data-map-annotations]'));
      assert.equal(q('.asia-map-frame').nextElementSibling,q('[data-farm-overview-legend]'));
      assert.equal(config.presentation.rainfall.interval,250);assert.equal(config.presentation.terrain.interval,500);
      assert.ok(config.farmInsight.rivers.length>=2);assert.equal(q('[data-farm-water]'),null);
      assert.ok(config.social.topics.some(t=>t.key==='overview'));
      assert.ok(q('[data-social-quick-key]'));
      assert.ok(config.presentation.farming.products.some(p=>p.kind==='crop')&&config.presentation.farming.products.some(p=>p.kind==='livestock'));
      assert.ok(q('[data-industry-topic]').closest('.asia-reading-panel'));
      assert.ok(q('[data-population-topic]').closest('.asia-reading-panel'));
      assert.ok(q('[data-farming-topic]').closest('.asia-reading-panel'));
      assert.equal(q('[data-city-picker]').hidden,field!=='nature');
      assert.equal(q('[data-climate-legend]').hidden,field!=='nature');
      assert.equal(q('[data-agriculture-legend]').hidden,true);
      assert.equal(q('.asia-reading-scroll').getAttribute('tabindex'),'0');
      assert.ok(q('[data-place-reading]')&&q('[data-place-story]')&&q('[data-place-story-bridges]'));
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


test('南アジア・中央アジアは別URLと初期範囲を持ち、元資料の範囲を変更しない',async()=>{
 for(const [id,label] of [['south-asia','南アジア'],['central-asia','中央アジア']])for(const field of ['nature','agriculture','industry','population']){
  const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
  try{
   window.document.write(await readFile(`dist/atlas/asia/${id}/${field}/index.html`,'utf8'));
   const q=s=>window.document.querySelector(s),cfg=JSON.parse(q('[data-asia-config]').textContent);
   assert.equal(cfg.label,label);assert.equal(cfg.regionId,'south-central-asia');assert.notDeepEqual(cfg.bounds,cfg.dataBounds);
   assert.equal(cfg.climate.image.includes('south-central-asia'),true);
   assert.ok(q('link[rel=canonical]').href.endsWith(`/atlas/asia/${id}/${field}/`));
   assert.ok(q('[data-focus-link="'+id+'"][aria-current="page"]'));
   assert.ok((await readFile('dist/sitemap.xml','utf8')).includes(`/atlas/asia/${id}/${field}/`));
  }finally{await window.happyDOM.close();}
 }
});
