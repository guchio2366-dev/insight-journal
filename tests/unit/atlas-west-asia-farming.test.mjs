import test from 'node:test';
import assert from 'node:assert/strict';
import {readWestState,westSearch} from '../../src/lib/atlas-west-asia-state.mjs';
import {westFarmingGeometry,westFarmingOverlap,westFarmingProducts,isWestFarmingOverview} from '../../src/lib/atlas-west-asia-farming.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {westProductionSelection,westTopics} from '../../src/data/atlas/west-asia-topics.mjs';

test('保存済み重量候補の選択は欠測を0扱いせず、飼養頭数と国別生産を混同しない',()=>{
 const data=JSON.parse(readFileSync('public/assets/atlas/west-asia-v1/data.json','utf8'));
 const chosen=westProductionSelection(data);
 assert.equal(chosen.length,10);
 assert.deepEqual(chosen.slice(0,3).map(row=>row.id),['wheat','cattle-milk','barley']);
 assert.equal(chosen.find(row=>row.id==='rice').reported,7);
 assert.equal(chosen.find(row=>row.id==='buffalo-milk').missing,14);
 assert.equal(chosen.some(row=>row.id==='pork-meat'),false);
 assert.ok(chosen.every(row=>westTopics.find(topic=>topic.id===row.id)?.faoElement==='5510'));
});

test('中東の農畜産は未選択の同時分布から始まり、既存小麦URLと比較復帰を維持する',()=>{
 const data={countries:[{code:'SAU'}],cities:[],urban:{cities:[]}};
 const initial=readWestState('','agriculture',data);
 assert.equal(initial.topic,'farming-overview');assert.equal(initial.country,'');
 assert.deepEqual(westFarmingProducts.map(p=>p.id),['wheat','barley','sheep','goat','cattle']);
 const wheat=readWestState('?topic=wheat&country=SAU&at=46,24&map=10,20,400,300&year=2021','agriculture',data);
 assert.equal(wheat.topic,'wheat');assert.deepEqual(readWestState(westSearch(wheat),'agriculture',data),wheat);
 assert.equal(isWestFarmingOverview({id:'wheat-irrigated',layer:'wheat-irrigated'}),true);
 assert.equal(isWestFarmingOverview({id:'forest',layer:'forest'}),false);
 assert.equal(isWestFarmingOverview({id:'dates',faoItem:'577'}),false,'national production is not an invented crop area');
});

test('0・欠測・負値を分布にせず、隣接正値の内部境界を省き、代表点を元格子に置く',()=>{
 const l={width:4,height:2,noData:-9999};
 const values=Float32Array.of(2,3,0,-9999,0,0,-1,NaN),original=values.slice();
 const shape=westFarmingGeometry(values,l,1);
 assert.equal(shape.outline.includes('M1,0V1'),false,'no internal boundary between adjacent positive cells');
 assert.ok(shape.outline.includes('M2,0V1'));
 assert.ok(shape.points.every(p=>values[Math.floor(p.y)*l.width+Math.floor(p.x)]===p.value&&p.value>0));
 assert.equal(shape.threshold,2);
 assert.equal(shape.strongCoverage,'M0,0h2v1H0Z');
 assert.equal(shape.strongOutline,shape.outline);
 assert.ok(shape.strongPoints.every(p=>p.value>=shape.threshold));
 assert.deepEqual(values,original,'display derivation does not alter source values');
 assert.equal(shape.coverage,'M0,0h2v1H0Z','all positive source cells are retained while zeros, missing and negative cells remain empty');
 assert.deepEqual(westFarmingGeometry(Float32Array.of(0,-9999),{width:2,height:1,noData:-9999}),{coverage:'',strongCoverage:'',threshold:null,outline:'',strongOutline:'',points:[],strongPoints:[]});
 const graded=westFarmingGeometry(Float32Array.of(1,2,3,4),{width:4,height:1,noData:-9999},1);
 assert.notEqual(graded.strongOutline,graded.outline,'濃い輪郭は弱い正値域まで囲まない');
 assert.ok(graded.strongOutline.includes('M2,0H3'),'強いセルだけが濃い輪郭に残る');
 assert.equal(westFarmingOverlap(Float32Array.of(5,1,4),Float32Array.of(7,8,2),4,6,3,1),'M0,0h1v1H0Z');
 assert.throws(()=>westFarmingGeometry(Float32Array.of(1),l),/length/);
});

test('系列内で強調しても小麦の主要産地とイエメンの山羊密度域が消えない',()=>{
 const data=JSON.parse(readFileSync('public/assets/atlas/west-asia-v1/data.json','utf8'));
 const grid=id=>{const layer=data.layers.find(row=>row.id===id),raw=gunzipSync(readFileSync('public/assets/atlas/west-asia-v1/'+layer.grid));return {layer,values:new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength))};};
 const count=(layer,values,threshold,[west,south,east,north])=>{
  const mercX=lon=>6378137*lon*Math.PI/180,mercY=lat=>6378137*Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)),b=layer.bounds3857;
  const left=Math.max(0,Math.floor((mercX(west)-b[0])/(b[2]-b[0])*layer.width)),right=Math.min(layer.width,Math.ceil((mercX(east)-b[0])/(b[2]-b[0])*layer.width));
  const top=Math.max(0,Math.floor((b[3]-mercY(north))/(b[3]-b[1])*layer.height)),bottom=Math.min(layer.height,Math.ceil((b[3]-mercY(south))/(b[3]-b[1])*layer.height));
  let n=0;for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(values[y*layer.width+x]>=threshold)n++;return n;
 };
 const wheat=grid('wheat'),wheatThreshold=westFarmingGeometry(wheat.values,wheat.layer).threshold;
 for(const [place,bounds,minimum] of [['トルコ周辺',[26,36,45,42],10000],['イラン高原周辺',[44,25,62,40],10000],['イラク周辺',[38,29,49,38],5000],['エジプト周辺',[25,22,36,32],1000]])assert.ok(count(wheat.layer,wheat.values,wheatThreshold,bounds)>minimum,place);
 const goat=grid('goat'),goatThreshold=westFarmingGeometry(goat.values,goat.layer).threshold;
 assert.ok(count(goat.layer,goat.values,goatThreshold,[42,12,54,19])>5000,'イエメン周辺');
 const quantile=(values,p)=>{const positive=Array.from(values).filter(value=>value>0).sort((a,b)=>a-b);return positive[Math.floor((positive.length-1)*p)];};
 for(const [name,{layer,values},regions] of [['小麦',wheat,[['トルコ周辺',[26,36,45,42]],['イラン高原周辺',[44,25,62,40]],['イラク周辺',[38,29,49,38]],['エジプト周辺',[25,22,36,32]]]],['山羊',goat,[['イエメン周辺',[42,12,54,19]]]]]){
  const loose=quantile(values,.67),strict=quantile(values,.8);
  for(const [place,bounds] of regions){const broad=count(layer,values,loose,bounds),narrow=count(layer,values,strict,bounds);assert.ok(narrow>0&&narrow/broad>.4,`${name}の${place}は上位33%と20%のどちらでも代表域を保つ`);}
 }
});
