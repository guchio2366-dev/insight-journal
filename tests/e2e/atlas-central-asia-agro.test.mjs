import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Window} from 'happy-dom';

test('built Central Asian entrances include the region adapter exactly once and keep the existing five-country map',async()=>{
 for(const suffix of ['', 'nature/', 'agriculture/', 'population/']){
  const html=readFileSync(`dist/atlas/asia/central-asia/${suffix}index.html`,'utf8');
  const w=new Window();try{
   w.document.body.innerHTML=html;
   const d=w.document,root=d.querySelector('[data-asia-atlas]');
   assert.equal(d.querySelectorAll('[data-asia-atlas]').length,1);
   assert.equal(root.dataset.focus,'central-asia');
   const scripts=[...d.querySelectorAll('script[src]')].filter(n=>n.src.includes('CentralAsiaAgriculturePage.'));
   assert.equal(scripts.length,1);
   assert(existsSync('dist/'+new URL(scripts[0].src,'http://localhost').pathname.replace('/insight-journal/','')));
   const config=JSON.parse(root.querySelector('[data-asia-config]').textContent);
   assert.deepEqual(config.countries.map(c=>c.code).sort(),['KAZ','KGZ','TJK','TKM','UZB']);
   assert.deepEqual(config.farming.layers.filter(l=>l.kind!=='forest').map(l=>l.id).sort(),['cattle','cotton','goat','maize','sheep','wheat']);
   assert.equal(root.querySelectorAll('.asia-map-frame').length,1);
   assert(root.querySelector('[data-south-central-farm-connections]'));
   assert(root.querySelector('[data-agro-statistics]'));
  }finally{await w.happyDOM.close();}
 }
});

test('South Asia, combined Asia, Japan and the separate central industry page do not receive the adapter',()=>{
 for(const file of ['atlas/asia/south-asia/agriculture/','atlas/asia/south-central-asia/agriculture/','atlas/asia/central-asia/industry/','atlas/japan/agriculture/']){
  const html=readFileSync(`dist/${file}index.html`,'utf8');
  assert(!html.includes('/_astro/CentralAsiaAgriculturePage.'));
 }
});
