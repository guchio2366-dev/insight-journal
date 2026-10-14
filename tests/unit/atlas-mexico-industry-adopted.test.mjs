import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {adoptedIndustries,adoptedSources,adoptedGroups,adoptedShare,adoptedMapColor,readAdoptedState,writeAdoptedState,placeAdoptedLabels} from '../../src/lib/atlas-mexico-industry-adopted.ts';

const ids=['oil-gas','refining','silver','copper','gold','zinc','steel','automotive','auto-parts','computers','electronic-components','communications','displays','refrigeration','home-appliances','machinery','chemicals','pharmaceuticals','food','feed','meat','beer','tequila','medical','aerospace','apparel','tourism','logistics','professional','finance','digital','bpm','construction','real-estate'];
const find=id=>adoptedIndustries.find(i=>i.id===id);
test('All 34 adopted products have complete source, map-state and three-column contracts',()=>{
 assert.deepEqual(new Set(adoptedIndustries.map(i=>i.id)),new Set(ids));
 const keys=Array.from({length:32},(_,n)=>String(n+1).padStart(2,'0'));
 for(const item of adoptedIndustries){
  assert.ok(item.label.length>0);
  for(const text of ['overview','why','process','boundary'])assert.ok(item[text].length>5,`${item.id}:${text}`);
  assert.deepEqual(item.map.values.map(v=>v.state).sort(),keys,item.id);
  assert.ok(item.map.definition&&item.map.unit&&item.map.year);
  let sum=0;
  for(const row of item.map.values){
   assert.ok(['available','zero','confidential','unknown','unretrieved'].includes(row.status));
   if(['available','zero'].includes(row.status)){assert.ok(Number.isFinite(row.value));assert.ok(row.value>=0);sum+=row.value;if(row.status==='zero')assert.equal(row.value,0);else assert.ok(row.value>0);}
   else assert.equal(row.value,null,`${item.id}:${row.state} missing is not zero`);
  }
  if(item.map.nationalTotal)assert.ok(sum<=item.map.nationalTotal*1.00001,`${item.id} public-state sum <= independent country denominator`);
  const sourceIds=[...item.map.sourceIds];
  for(const r of item.map.regions){assert.ok(keys.includes(r.state));assert.ok(r.stage&&r.note);sourceIds.push(...r.sourceIds);}
  for(const section of ['domestic','world','trade']){
   assert.ok(item.statistics[section].length,`${item.id}:${section}`);
   for(const metric of item.statistics[section]){
    assert.ok(metric.label&&metric.year&&metric.unit&&metric.definition);
    if(metric.status!=='unconfirmed')assert.ok(metric.sourceIds.length,`${item.id}:${metric.label} observed source`);
    assert.equal(metric.value===null,metric.status==='unconfirmed',`${item.id}:${metric.label}`);
    if(metric.value!==null)assert.ok(Number.isFinite(metric.value));
    if(metric.denominator){assert.ok(metric.denominator.value>0);if(metric.unit==='%'){assert.equal(adoptedShare(metric),null);assert.ok(metric.value<=100);}else{assert.equal(metric.unit,metric.denominator.unit,`${item.id}:${metric.label}: dimensional share`);assert.ok(adoptedShare(metric)>=0);}}
    sourceIds.push(...metric.sourceIds);
   }
  }
  for(const id of sourceIds){assert.ok(adoptedSources[id],`${item.id} references ${id}`);assert.match(adoptedSources[id].url,/^https:\/\//);}
 }
 assert.equal(find('refining').sectors.length,2);
 assert.equal(adoptedGroups('resources').length,6);
 assert.equal(adoptedGroups('manufacturing').length,9);
 assert.equal(adoptedGroups('services').length,8);
});

test('Response SCIAN order determines CE national values, independently of query request order',()=>{
 const expected={automotive:136982,'auto-parts':1203759,computers:52946,'electronic-components':247502,communications:56412,displays:60020,refrigeration:72409,'home-appliances':73144,machinery:233161,chemicals:286099,pharmaceuticals:88829,food:1214261,feed:34910,meat:132735,beer:16214,tequila:15096,medical:212561,aerospace:45915,apparel:296915,tourism:438724,logistics:1273482,professional:680712,finance:647493,digital:92366,bpm:62857,construction:711553,'real-estate':332650};
 for(const [id,value]of Object.entries(expected))assert.equal(find(id).map.nationalTotal,value,id);
 assert.equal(find('silver').map.nationalTotal,7221026.44);
 assert.equal(find('copper').map.nationalTotal,777106.15);
 const oil=find('oil-gas');assert.equal(oil.map.nationalTotal,undefined);assert.match(oil.map.unit,/FOB/);assert.equal(oil.map.values.filter(v=>v.value!==null).length,4);
 assert.equal(find('refining').map.values.filter(v=>v.status==='zero').length,0);
});

test('Country/product trade ratios and manufacturing boundaries retain their units and missingness',()=>{
 const retail=find('pharmaceuticals');assert.match(retail.statistics.trade.map(i=>i.definition).join(' '),/3004/);
 assert.ok(find('refrigeration').statistics.trade.some(i=>i.value===6560));
 const crude=find('steel');assert.match(crude.boundary,/粗鋼|鋼材/);
 assert.equal(adoptedMapColor(null,'confidential',100,100),'url(#ma-confidential)');
 assert.equal(adoptedMapColor(null,'unknown',100,100),'url(#ma-unknown)');
 assert.equal(adoptedMapColor(null,'unretrieved',100,100),'url(#ma-unretrieved)');
 assert.equal(adoptedMapColor(0,'zero',100,100),'#ffffff');
});

test('Source snapshots match all four independently retained provenance manifests',async()=>{
 const folder='public/assets/atlas/mexico-industry-adopted/';
 for(const file of ['resources-manifest.json','manufacturing-provenance.json','food-precision-provenance.json','services-provenance.json']){
  const manifest=JSON.parse(await readFile(folder+file,'utf8'));
  const entries=manifest.inputFiles??manifest.archived??Object.entries(manifest.files).map(([file,sha256])=>({file,sha256}));
  for(const entry of entries){const relative=entry.path??entry.file;const path=relative.startsWith('public/')?relative:folder+relative;const raw=await readFile(path);assert.equal(createHash('sha256').update(raw).digest('hex'),entry.sha256,path);if(entry.bytes!==undefined)assert.equal(raw.length,entry.bytes);}
 }
});

test('Industry URL validation, old aliases, manual camera and unknown query parameters survive history',()=>{
 const state=readAdoptedState(new URL('https://example.com/?metric=transport&state=05&only=1&industryFrame=10,20,720,464&fallback=1'));
 assert.deepEqual(state,{sector:'manufacturing',industry:'automotive',state:'05',only:true,frame:[10,20,720,464]});
 const url=writeAdoptedState(new URL('https://example.com/?metric=transport&fallback=1&legacy=1&exportOverlay=1'),state);
 assert.equal(url.searchParams.get('fallback'),'1');assert.equal(url.searchParams.has('metric'),false);assert.equal(url.searchParams.has('legacy'),false);assert.deepEqual(readAdoptedState(url),state);
 assert.deepEqual(readAdoptedState(new URL('https://example.com/?sector=resources&subsector=automotive&state=99&only=1&industryFrame=NaN,0,1,1')),{sector:'resources',industry:null,state:null,only:false,frame:null});
});

test('Deterministic screen label slots remain bounded and disjoint at desktop and portrait dimensions',()=>{
 for(const [width,height,lw,lh]of [[1000,645,118,46],[750,483,118,46],[358,231,94,39]]){
  const peers=Array.from({length:9},(_,n)=>({id:String(n),points:[[width*.55+(n%3)*8,height*.4+Math.floor(n/3)*9]]}));
  const boxes=placeAdoptedLabels(peers,width,height,lw,lh);
  assert.equal(boxes.size,9);assert.deepEqual([...boxes], [...placeAdoptedLabels(peers.slice().reverse(),width,height,lw,lh)]);
  const list=[...boxes.values()];for(const b of list){assert.ok(b[0]>=0&&b[1]>=0&&b[2]<=width&&b[3]<=height);}
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++)assert.ok(list[i][2]<=list[j][0]||list[j][2]<=list[i][0]||list[i][3]<=list[j][1]||list[j][3]<=list[i][1]);
 }
});
