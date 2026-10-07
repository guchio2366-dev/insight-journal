import test from 'node:test';
import assert from 'node:assert/strict';
import {readWestState,westSearch} from '../../src/lib/atlas-west-asia-state.mjs';
import {westFarmingGeometry,westFarmingProducts,isWestFarmingOverview} from '../../src/lib/atlas-west-asia-farming.mjs';

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
 assert.deepEqual(values,original,'display derivation does not alter source values');
 assert.equal(shape.coverage,'M0,0h2v1H0Z','all positive source cells are retained while zeros, missing and negative cells remain empty');
 assert.deepEqual(westFarmingGeometry(Float32Array.of(0,-9999),{width:2,height:1,noData:-9999}),{coverage:'',outline:'',points:[]});
 assert.throws(()=>westFarmingGeometry(Float32Array.of(1),l),/length/);
});
