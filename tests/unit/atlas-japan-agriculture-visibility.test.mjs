import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleJapanFarmProducts} from '../../src/lib/atlas-japan-agriculture-visibility.ts';
import {japanAgricultureProducts,japanAgricultureSites,japanAgricultureReading,getJapanAgricultureReading} from '../../src/data/atlas/japan-agriculture-v2.ts';
const state={field:'agriculture',topic:'wheat',site:'tokachi-farming',city:null,prefecture:null,feature:null,camera:null,returnTo:null};
test('混在する産地は作物・畜産の非表示側だけを除き、品目選択では他の分布を消さない',()=>{
 const ids=japanAgricultureSites.find(s=>s.id==='tokachi-farming').products;
 assert.deepEqual(visibleJapanFarmProducts(ids,{showCrops:false}),['milk','beef']);
 assert.deepEqual(visibleJapanFarmProducts(ids,{showLivestock:false}),['wheat','potato']);
 assert.deepEqual(visibleJapanFarmProducts(ids,{showCrops:false,showLivestock:false}),[]);
 const all=japanAgricultureProducts.map(p=>p.id);assert.equal(visibleJapanFarmProducts(all,{}).length,10);
 assert.deepEqual(visibleJapanFarmProducts(all,{showCrops:false}),['milk','beef','pork']);
 assert.equal(japanAgricultureSites.filter(s=>visibleJapanFarmProducts(s.products,{showCrops:false,showLivestock:false}).length).length,0);
 assert.match(getJapanAgricultureReading('wheat','tokachi-farming').title,/十勝/);
});
test('森林の制約は森林の原資料と時点を説明し、農畜産の取得失敗を流用しない',()=>{
 const forest=japanAgricultureReading.forest;
 assert.match(forest.gap,/JRC GFC2020 v3.*4–6km/);assert.match(forest.gap,/2022年3月31日.*2024年/);assert.doesNotMatch(forest.gap,/米・小麦|豚|403/);
});
