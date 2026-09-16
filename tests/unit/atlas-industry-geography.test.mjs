import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/data/atlas/industry-geography.ts';export * from './src/data/atlas/industry-regions.ts';export * from './src/data/atlas/industry-reading-sections.ts';export * from './src/data/atlas/industry-catalog.ts';export * from './src/lib/atlas-industry-markers.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const d=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('州一覧に全拠点を一度ずつ含め、採掘・製造と州を混同しない',()=>{
 const groups=d.industryStateGroups(d.industryRegions);
 assert.deepEqual(groups.flatMap(g=>g.regions.map(r=>r.id)).sort(),d.industryRegions.map(r=>r.id).sort());
 assert.equal(groups.length,new Set(groups.map(g=>g.id)).size);
 const nevada=groups.find(g=>g.id==='32');assert.deepEqual(nevada.industries,['金などの鉱物採掘','商業・物流','観光・娯楽']);
 assert.ok(groups.find(g=>g.id==='39').industries.includes('金属'));
 assert.ok(groups.find(g=>g.id==='36').industries.includes('鉄道車両'));
 for(const g of groups)assert.ok(g.coordinates.every(Number.isFinite));
});
test('説明の地域リンクは選択分野に属し、全分野には地域比較の総論がある',()=>{
 for(const sector of d.industrySectors){
  const overview=d.industryReadingSections(sector.id);assert.ok(overview.length>=3);
  for(const id of ['all',...d.industrySubsectors[sector.id].map(s=>s.id)]){
   const sections=d.industryReadingSections(id==='all'?sector.id:id);assert.ok(sections.length>=2);
   for(const section of sections)for(const regionId of section.regions){
    const r=d.industryRegions.find(r=>r.id===regionId);assert.ok(r,regionId);
    assert.ok(sector.id==='all'||r.sector===sector.id);assert.ok(id==='all'||r.subsector===id);
   }
  }
 }
 assert.equal(d.industrySymbol('manufacturing','aerospace'),'航');assert.equal(d.industrySymbol('resources','mining'),'鉱');
});
test('全産業の州ラベルはPC図で重ならず、座標は変更しない',()=>{
 const groups=d.industryStateGroups(d.industryRegions),w=900,h=620,merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
 const mh=w/(1800/1084),top=(h-mh)/2;
 const points=groups.map(g=>({id:g.id,x:(g.coordinates[0]+128)/64*w,y:top+(merc(52)-merc(g.coordinates[1]))/(merc(52)-merc(22))*mh,radius:4,width:148,height:28+Math.ceil(g.industries.join('・').length/12)*16}));
 const before=JSON.stringify(points),boxes=d.placeIndustryEconomicLabels(points,w,h);assert.equal(JSON.stringify(points),before);
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j];assert.ok(a.left+a.width<=b.left||b.left+b.width<=a.left||a.top+a.height<=b.top||b.top+b.height<=a.top,`${a.id}/${b.id} overlap`);
 }
});
