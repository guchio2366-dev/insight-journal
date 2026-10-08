import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

// Built DOM/cascade and controller integration. Native QA owns pixel dimensions,
// navigation row coordinates, canvas visibility, and scroll-to-source reachability.
const fields=['agriculture','nature','industry','population'];
const regions=['europe','asia/east-asia','asia/southeast-asia','asia/south-central-asia','asia/south-asia','asia/central-asia','west-asia'];
const cssCache=new Map();
const configurations={
  europe:{root:'[data-europe-detail]',nav:'.eu-field-nav',grid:'.eu-layout',frame:'.eu-map-stage',reading:'.eu-read-panel',stats:'[data-eu-statistics]'},
  asia:{root:'[data-asia-atlas]',nav:'.asia-field-tabs',grid:'.asia-layout',frame:'.asia-map-frame',reading:'.asia-reading-panel',stats:'[data-asia-statistics]'},
  west:{root:'[data-west-atlas]',nav:'.atlas-tabs',grid:'.atlas-primary-grid',frame:'.atlas-map-frame',reading:'.west-reading',stats:'[data-west-comparison]'}
};
const configuration=region=>configurations[region==='europe'?'europe':region==='west-asia'?'west':'asia'];
async function loadStyles(w){
  for(const node of w.document.querySelectorAll('style,link[rel=stylesheet]')){
    const path=node.tagName==='LINK'?`dist/${node.getAttribute('href').split('/insight-journal/')[1]}`:null;
    const key=path??node.textContent;
    if(!cssCache.has(key))cssCache.set(key,(await transform(path?await readFile(path,'utf8'):node.textContent,{loader:'css'})).code);
    const style=w.document.createElement('style');style.textContent=cssCache.get(key);node.replaceWith(style);
  }
}
async function page(region,field,width=1366,styles=false){
  const w=new Window({width,height:768,url:`https://example.com/insight-journal/atlas/${region}/${field}/`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
  w.document.write(await readFile(`dist/atlas/${region}/${field}/index.html`,'utf8'));
  if(styles)await loadStyles(w);
  return w;
}

test('all seven regional workspaces retain five main destinations and one map/reading/news frame',async()=>{
  for(const region of regions)for(const field of fields){
    const w=await page(region,field),d=w.document,c=configuration(region),root=d.querySelector(c.root);
    try{
      assert.ok(root,`${region}/${field}: regional root`);
      const nav=root.querySelector(c.nav),links=[...nav.querySelectorAll(':scope > a')];
      assert.deepEqual(links.map(a=>a.textContent.trim()),['概要','農林業','自然環境','主要産業','人口']);
      assert.deepEqual(links.map(a=>new URL(a.href).pathname),['overview',...fields].map(f=>`/insight-journal/atlas/${region}/${f}/`));
      assert.equal(nav.querySelector('[aria-current=page]').getAttribute('href'),`/insight-journal/atlas/${region}/${field}/`);
      assert.equal(d.querySelectorAll('[data-news-rail]').length,1);
      assert.equal(d.querySelectorAll('[data-map-surface]').length,1);
      const grid=root.querySelector(c.grid),frame=root.querySelector(c.frame),reading=root.querySelector(c.reading);
      assert.ok(grid.contains(frame)&&grid.contains(reading),`${region}: map and reading share the main grid`);
      assert.ok(frame.compareDocumentPosition(reading)&4,`${region}: reading follows the map`);
      assert.ok(d.querySelector('[data-map-surface]').closest('[data-atlas-shell]'));
      const stats=root.querySelector(c.stats)??d.querySelector(c.stats);
      assert.ok(stats&&!reading.contains(stats),`${region}: statistics are outside the right reading column`);
      assert.ok(grid.compareDocumentPosition(stats)&4,`${region}: statistics follow the complete main grid`);
      if(region==='europe')assert.equal(stats.parentElement,d.querySelector('[data-atlas-shell]'),'Europe statistics occupy the map and reading width within the shell');
      if(region.startsWith('asia/')){
        assert.equal(stats.parentElement,d.querySelector('[data-atlas-shell]'),'Asia statistics span the news/map/reading shell');
        const compactEastFarm=region==='asia/east-asia'&&field==='agriculture';
        assert.equal(root.querySelector('[data-reading-details]').open,!compactEastFarm,'East Asia farming keeps detailed reading in its compact right panel');
        if(compactEastFarm)assert.ok(root.querySelector('[data-reading-dock]').contains(root.querySelector('[data-farming-selector]')),'East Asia farming topic picker remains visible');
        assert.equal(root.querySelector('.asia-reading-scroll').tabIndex,0);
      }
    }finally{await w.happyDOM.close();}
  }
});

test('regional agriculture, nature/water and population controls preserve the learning hierarchy and missingness',async()=>{
  for(const region of regions)for(const field of ['agriculture','nature','population']){
    const w=await page(region,field),d=w.document;
    try{
      if(region==='europe'){
        const group=d.querySelector(`[data-eu-topic-field="${field}"]`);
        assert.ok(group,`${region}/${field}: subject group`);
        const buttons=[...group.querySelectorAll('button')];
        assert.equal(buttons.length,field==='agriculture'?2:field==='nature'?4:3);
        if(field==='nature')assert.ok(d.querySelectorAll('[data-eu-water-options] button').length>=3);
        if(field==='population'){
          assert.equal(buttons.filter(b=>b.disabled).length,0,'Published bounded case studies are enabled');
          assert.deepEqual(buttons.slice(1).map(button=>button.textContent),['人種・民族（事例）','宗教（事例）']);
          const cases=d.querySelector('[data-culture-case]');
          assert.deepEqual([...cases.options].filter(option=>option.value).map(option=>option.value),['england-wales-2021','croatia-national-2021'],'Two source cases do not imply complete European coverage');
          assert.equal(cases.value,'','The overview placeholder does not automatically select a source case');
          assert.equal(d.querySelector('[data-eu-culture-host]').hidden,true,'Default European population remains the density map');
        }
      }else if(region==='west-asia'){
        assert.equal(d.querySelectorAll('[data-west-standard-group]').length,field==='agriculture'?2:field==='nature'?4:3);
        if(field==='nature'){
          const waterTopics=[...d.querySelectorAll('[data-west-subgroup="水資源"] button')];
          assert.deepEqual(waterTopics.map(button=>button.textContent),['河川・地下水','年降水量の分布','河川の流域']);
          assert.deepEqual(waterTopics.map(button=>button.dataset.westTopicButton),['rivers','annual-precipitation','basins']);
          assert.ok(waterTopics.every(button=>!button.disabled),'annual precipitation and river topics remain available');
          assert.equal(d.querySelector('.west-subtabs [data-west-topic-button="precipitation"]'),null,'station monthly values remain in city climographs rather than the water tabs');
          assert.equal(d.querySelector('[data-west-unavailable="降水量"]'),null,'measured rainfall no longer uses the unavailable placeholder');
          assert.equal(d.querySelectorAll('[data-west-chart]').length,18,'the topic retains all 18 original station normal series');
        }
      }else{
        const selector=field==='agriculture'?'[data-farm-group]':field==='nature'?'[data-natural-group]':'[data-population-group]';
        assert.equal(d.querySelectorAll(selector).length,field==='agriculture'?2:field==='nature'?4:3);
        if(field==='nature'){
          const waterTopics=[...d.querySelectorAll('[data-water-topics] button')];
          assert.deepEqual(waterTopics.map(button=>button.dataset.waterView),['water','precipitation','basins']);
          assert.deepEqual(waterTopics.map(button=>button.textContent),['河川・地下水','年降水量','河川の流域']);
          assert.ok(waterTopics.every(button=>!button.disabled),'annual precipitation and river topics remain enabled; monthly values are retained in city climographs');
        }
      }
    }finally{await w.happyDOM.close();}
  }
});

test('regional desktop CSS keeps normal maps at the reference aspect and keyboard-accessible right reading',async()=>{
  for(const region of regions)for(const width of [1180,1366]){
    const w=await page(region,'nature',width,true),d=w.document,c=configuration(region);
    try{
      assert.equal(w.getComputedStyle(d.querySelector('[data-atlas-shell]')).display,'grid',`${region} ${width}: side-by-side shell`);
      const compactAspect=width<1200&&(region==='europe'||region.startsWith('asia/'));
      assert.equal(Number.parseFloat(w.getComputedStyle(d.querySelector(c.frame)).aspectRatio),region==='europe'?1.42:compactAspect?1.65:1.55,`${region} ${width}: normal map reference aspect`);
      assert.equal((w.getComputedStyle(d.querySelector(c.grid)).gridTemplateColumns.match(/minmax\(/g)??[]).length,2,`${region} ${width}: map and reading retain two desktop tracks`);
      assert.ok(!['none','hidden'].includes(w.getComputedStyle(d.querySelector(c.reading)).display));
    }finally{await w.happyDOM.close();}
  }
});

const mapController=await readFile('src/scripts/atlas-overview-map.ts','utf8');
const overviewController=(await readFile('src/scripts/atlas-country-overview.ts','utf8')).replace(/^import .* from ['"]\.\/atlas-overview-map['"];?\r?\n/m,'');
const overviewLayout=(await readFile('src/scripts/atlas-regional-overview-layout.ts','utf8')).replace('export function','function');
const interactiveOverview=(await transform(`${mapController}\n${overviewController}\n${overviewLayout}\nconst root=document.querySelector('[data-country-overview]');initRegionalOverviewLayout(root);initCountryOverview(root);`,{loader:'ts',format:'iife'})).code;
// Asia's six dedicated overviews are exercised by atlas-asia-overview.test.mjs.
test('Europe shared overview relocation preserves original country summary, destinations and restored selection',async()=>{
  for(const region of ['europe']){
    const w=new Window({width:1366,height:768,url:`https://example.com/insight-journal/atlas/${region}/overview/`,settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
    try{
      w.document.body.innerHTML=(await readFile(`dist/atlas/${region}/overview/index.html`,'utf8')).replace(/<script(?![^>]*type="application\/json")[^>]*>[\s\S]*?<\/script>/g,'');
      const d=w.document,picker=d.querySelector('[data-overview-country]'),summary=d.querySelector('[data-overview-place-summary]'),intro=d.querySelector('.overview-region-intro');
      const config=JSON.parse(d.querySelector('[data-overview-config]').textContent),stage=d.querySelector('[data-overview-map-stage]');
      Object.defineProperty(stage,'clientWidth',{value:645});Object.defineProperty(stage,'clientHeight',{value:416});
      w.eval(interactiveOverview);
      await loadStyles(w);
      const header=d.querySelector('.regional-overview-heading'),body=d.querySelector('.regional-overview-body');
      assert.deepEqual([...d.querySelectorAll('.country-overview-fields > a')].map(a=>a.textContent.trim()),['概要','農林業','自然環境','主要産業','人口']);
      assert.equal(Number.parseFloat(w.getComputedStyle(stage).aspectRatio),1.55,'overview retains the same normal-map reference aspect');
      assert.equal((w.getComputedStyle(d.querySelector('.overview-map-reading')).gridTemplateColumns.match(/minmax\(/g)??[]).length,2,'overview map and reading stay side by side');
      assert.equal(header.querySelector('[data-overview-place-summary]'),summary,'original controller-owned summary is relocated');
      assert.equal(header.querySelector('.overview-region-intro'),intro,'the introduction is moved, without a stale duplicate');
      assert.equal(d.querySelectorAll('.overview-region-intro').length,1);assert.equal(body.tabIndex,0);
      const check=country=>{
        assert.equal(picker.value,country.code);
        assert.equal(new URL(w.location.href).searchParams.get('country'),country.code);
        assert.equal(header.querySelector('[data-overview-place-title]').textContent,country.name);
        assert.deepEqual([...d.querySelectorAll('[data-overview-map-country][aria-pressed=true]')].map(e=>e.dataset.overviewMapCountry),[country.code]);
        assert.ok(d.querySelector(`[data-overview-map-country="${country.code}"]`).getAttribute('aria-label').includes(country.name),'the selected map shape names the restored country');
        const current=d.querySelector('[data-overview-current-link]');
        assert.ok(current,'the overview current-page link remains controller-owned');
        assert.equal(current.getAttribute('aria-current'),'page');
        assert.equal(new URL(current.href).searchParams.get('country'),country.code,'overview return retains the current country');
        for(const field of config.fields){
          const link=d.querySelector(`[data-overview-field="${field.id}"]`);
          assert.equal(link.getAttribute('href'),country&&field.countryHrefs?.[country.code]||field.href,'field destinations use current country routing');
        }
      };
      const first=config.countries[0],second=config.countries[1];
      for(const country of [first,second]){picker.value=country.code;picker.dispatchEvent(new w.Event('change'));check(country);}
      w.history.back();await w.happyDOM.waitUntilComplete();check(first);
      w.history.forward();await w.happyDOM.waitUntilComplete();check(second);
    }finally{await w.happyDOM.close();}
  }
});

