import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

test('4分野を直接開け、初期地図・解説・凡例がJavaScriptなしでも同じ主題を示す',()=>{
  for (const field of ['nature','agriculture','industry','population']) {
    const window=new Window();const doc=window.document;
    doc.write(readFileSync(new URL(`../../dist/atlas/europe/${field}/index.html`,import.meta.url),'utf8'));
    assert.ok(doc.querySelector('[data-eu-static]'));
    assert.equal(doc.querySelectorAll('[data-eu-country] option').length,46);
    assert.equal(doc.querySelectorAll('[data-city-card]').length,24);
    assert.equal(doc.querySelectorAll('[data-city-card="kyiv"] tbody tr').length,12);
    assert.ok(doc.querySelector('[data-city-card="rome"]').textContent.includes('欠測'));
    const active=field==='nature'?'climate':field==='agriculture'?'wheat':field==='population'?'subject':null;
    if(active)assert.ok(doc.querySelector(`[data-eu-${active}-image]`).getAttribute('href'));
    assert.equal(doc.querySelectorAll('[data-eu-field]').length,4);
    assert.equal(doc.querySelectorAll('[data-eu-subject] option').length,29);
    assert.ok(doc.querySelector('a[href="https://doi.org/10.7910/DVN/SWPENT"]'));
    assert.ok(doc.querySelector('[data-eu-field="wheat"]'));
    assert.equal(doc.querySelector('meta[name="robots"]'),null);
    const climateReader=field==='nature'||field==='agriculture';
    assert.equal(doc.querySelector('[data-eu-climate-reader]').hidden,!climateReader);
    assert.equal(doc.querySelector('[data-eu-subject-reader]').hidden,climateReader);
    assert.equal(doc.querySelector('[data-eu-subject-legend]').hidden,climateReader);
    assert.equal(doc.querySelector('[data-eu-climate-legend]').hidden,field!=='nature');
    assert.equal(doc.querySelector('[data-eu-wheat-legend]').hidden,field!=='agriculture');
    assert.equal(doc.querySelector('.eu-read-panel').getAttribute('aria-labelledby'),climateReader?'eu-city-heading':'eu-subject-title');
    assert.equal(doc.querySelectorAll('[data-eu-point]:not([hidden])').length,climateReader?24:0);
    if(!climateReader){
      const title=field==='industry'?'産業の拠点':'人口密度';
      assert.equal(doc.querySelector('[data-eu-map-title]').textContent,title);
      assert.equal(doc.querySelector('[data-eu-subject-title]').textContent,title);
      assert.ok(doc.querySelector('[data-eu-legend-title]').textContent.includes(title));
      assert.ok(doc.querySelector('[data-eu-subject-note]').textContent.length>30);
      assert.equal(doc.querySelector('[data-eu-layer="climate"]').getAttribute('aria-pressed'),'false');
      assert.equal(doc.querySelector('[data-eu-climate-image]').getAttribute('href'),null);
      assert.ok(doc.querySelectorAll('[data-eu-feature-point]:not([hidden])').length>0);
      if(field==='industry'){
        assert.equal(doc.querySelectorAll('[data-eu-feature-point]:not([hidden])').length,14);
        assert.equal(doc.querySelectorAll('[data-eu-feature] option').length,15);
        assert.match(doc.querySelector('[data-eu-subject-note]').textContent,/生産量・雇用の大小を表しません/);
      }else{
        assert.equal(doc.querySelectorAll('[data-eu-legend-items] .eu-swatch').length,8);
        assert.match(doc.querySelector('[data-eu-legend-title]').textContent,/2020.*人\/km²/);
        assert.match(doc.querySelector('[data-eu-legend-items]').textContent,/0を含む.*データなし/);
      }
    }
    window.happyDOM.abort();
  }
  const sitemap=readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8');
  assert.ok(sitemap.includes('/atlas/europe/nature/'));
  assert.ok(sitemap.includes('/atlas/europe/agriculture/'));
  assert.ok(sitemap.includes('/atlas/europe/industry/'));
  assert.ok(sitemap.includes('/atlas/europe/population/'));
});
