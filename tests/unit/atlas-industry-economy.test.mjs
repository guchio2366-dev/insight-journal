import test from 'node:test';
import assert from 'node:assert/strict';
import {industryTrendGeometry,industryDistributionRows} from '../../src/lib/atlas-industry-charts.ts';
// Bundle the app's extensionless TypeScript imports exactly as the site does.
import {build} from 'esbuild';
const result=await build({stdin:{contents:`export * from './src/data/atlas/industry-detail-statistics.ts'; export * from './src/data/atlas/industry-regional-economy.ts'; export * from './src/data/atlas/industry-regions.ts'; export * from './src/data/atlas/industry-catalog.ts';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const data=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('欠測・調査変更と飛び年を結ばず、単年・ゼロも有限座標で描く',()=>{
 const g=industryTrendGeometry([{year:2018,value:20},{year:2019,value:10},{year:2020,value:null},{year:2021,value:15},{year:2023,value:12}]);
 assert.equal((g.path.match(/M/g)||[]).length,3);assert.equal((g.path.match(/L/g)||[]).length,1);
 assert.equal(g.min,0);assert.ok(!/NaN|Infinity/.test(g.path));
 assert.ok(!/NaN|Infinity/.test(industryTrendGeometry([{year:2024,value:0}]).path));
});
test('世界の上位5か国外でも米国を残し、残余と分母を一致させる',()=>{
 const rows=[60,50,40,30,20,10,5].map((value,i)=>({id:i===6?'US':String(i),name:String(i),value}));
 const display=industryDistributionRows(rows,250,'US');
 assert.equal(display.find(r=>r.id==='US').share,2);assert.equal(display.find(r=>r.id==='other').value,45);
 assert.equal(display.reduce((s,r)=>s+r.value,0),250);assert.equal(display.reduce((s,r)=>s+r.share,0),100);
 assert.throws(()=>industryDistributionRows(rows,200));assert.throws(()=>industryDistributionRows([{id:'x',name:'X',value:-1}],10));
});
test('製造業3分野の原分類を混ぜず、2022年の欠測をゼロにしない',()=>{
 for(const [id,code] of [['aerospace','3364'],['shipbuilding','3366'],['railway','3365']]){
  const s=data.industryDetailSeries('manufacturing',id);
  assert.ok(s.economic.scope.includes(code));assert.ok(!s.economic.scope.includes('3364–9'));
  assert.equal(s.economic.points.find(p=>p.year===2022).value,null);
  assert.ok(s.economic.points.find(p=>p.year===2023).value>0);
 }
 assert.equal(data.industryDetailSeries('manufacturing','aerospace').economic.points[0].value,253.281062);
});
test('公的資料の全輸出先の合計と世界総数を別の分母で検算する',()=>{
 for(const field of ['auto','aerospace','shipbuilding','railway','electronics','machinery','metals','chemicals','food','other-manufacturing','oil-gas','mining','utilities']){
  const d=data.industryExportDistribution(field);assert.equal(d.year,2024);
  assert.ok(Math.abs(d.rows.reduce((s,r)=>s+r.value,0)-d.total)<1e-6);
  industryDistributionRows(d.rows,d.total);
 }
 const world=data.industryWorldDistribution('auto');assert.equal(world.year,2020);assert.equal(world.total,76363.718);
 assert.equal(data.industryWorldDistribution('aerospace'),null);assert.equal(data.industryExportDistribution('finance'),null);
});
test('円の面積は原値に比例し、比較対象は都市圏で重複除去し、秘匿値を除く',()=>{
 assert.equal(data.economicCircleRadius(25,100)**2/data.economicCircleRadius(100,100)**2,.25);
 const rs=data.industryRegions,c=data.industryRegionalComparison(rs,'services','finance');
 assert.equal(c.total,2);assert.equal(c.points[0].placeId,'dallas');assert.ok(!c.points.some(p=>p.placeId==='newyork'));
 const duplicate={...rs.find(r=>r.placeId==='dallas'&&r.subsector==='finance'),id:'duplicate',placeId:'fortworth'};
 assert.equal(data.industryRegionalComparison([...rs,duplicate],'services','finance').total,2);
 assert.equal(data.industryRegionalComparison(rs,'all','all'),null);assert.equal(data.industryRegionalComparison(rs,'services','all'),null);
 assert.equal(data.industryRegionalComparison(rs,'manufacturing','aerospace'),null);
});
test('サービス7分野の文字を固定し、分類には航空宇宙・造船・鉄道車両が独立する',()=>{
 assert.deepEqual(['finance','information','professional','trade-logistics','tourism','health-education','other-services'].map(s=>data.industrySymbol('services',s)),['金','情','専','商','観','医','そ']);
 for(const s of ['aerospace','shipbuilding','railway'])assert.ok(data.industryRegions.some(r=>r.subsector===s));
});


test('狭幅の隣接する都市圏名を分離し、円の位置と面積を変えない',async()=>{
 const {placeIndustryEconomicLabels}=await import('../../src/lib/atlas-industry-markers.ts');
 const points=[{id:'dallas',x:169,y:134,radius:32,width:90,height:34},{id:'sanantonio',x:159,y:157,radius:16.4,width:90,height:34}];
 const before=JSON.stringify(points),labels=placeIndustryEconomicLabels(points,344,220),[a,b]=labels;
 assert.equal(JSON.stringify(points),before);
 assert.ok(a.left+a.width<=b.left||b.left+b.width<=a.left||a.top+a.height<=b.top||b.top+b.height<=a.top);
 for(const label of labels){assert.ok(label.left>=0&&label.left+label.width<=344);assert.ok(label.top>=0&&label.top+label.height<=220);}
});
