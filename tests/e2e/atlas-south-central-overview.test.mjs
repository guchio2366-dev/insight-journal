import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';

const config=region=>{
 const window=new Window({settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
 window.document.body.innerHTML=readFileSync(`dist/atlas/asia/${region}/overview/index.html`,'utf8');
 const data=JSON.parse(window.document.querySelector('[data-ao-config]').textContent);
 window.happyDOM.abort();return data;
};

test('South/Central overview keeps India as the detailed national industry target',()=>{
 for(const region of ['south-central-asia','south-asia','central-asia']){
  const countries=config(region).countries;
  for(const country of countries){
   const industry=country.readings.find(r=>r.id==='industry'),copy=industry.paragraphs.join(' ');
   if(country.code==='IND'){assert.match(copy,/GDPの.*％/);assert.match(copy,/製造業/);}
   else{assert.match(copy,/国別産業の詳しい対象はインド/);assert.doesNotMatch(copy,/GDPの[\d,.]+％/);}
  }
 }
});

test('regional readings expose the compared South/Central places and sourced production shares',()=>{
 const html=readFileSync('dist/atlas/asia/south-central-asia/overview/index.html','utf8');
 const data=config('south-central-asia');
 const india=data.countries.find(c=>c.code==='IND').readings.find(r=>r.id==='agriculture').paragraphs.join(' ');
 const kazakh=data.countries.find(c=>c.code==='KAZ').readings.find(r=>r.id==='agriculture').paragraphs.join(' ');
 assert.match(html,/ベンガルの雨季|雨の季節と、山地から低地へ届く水/);
 assert.match(india,/米（籾米）.*2015年.*2024年/);
 assert.match(kazakh,/小麦.*2015年.*2024年/);
 assert.match(html,/HS52.*ロシア、中国、トルコ/);
});
