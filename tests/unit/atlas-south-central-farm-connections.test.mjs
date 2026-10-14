import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const output=await build({entryPoints:['src/scripts/atlas-asia-farming-panel.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {renderSouthCentralFarmConnections}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const window=new Window();globalThis.document=window.document;
const root=window.document.createElement('main');root.innerHTML='<section data-south-central-farm-connections hidden><h3 data-south-central-supply-title></h3><div data-south-central-supply></div><h3 data-south-central-destinations-title></h3><div data-south-central-destinations></div><div data-south-central-world-share></div></section>';
const section=root.querySelector('[data-south-central-farm-connections]');
const content=()=>root.querySelector('[data-south-central-world-share]');

test('the regional default identifies country examples and draws only a sourced world-share series',()=>{
 renderSouthCentralFarmConnections(root,'south-central-asia',true,'overview',undefined);
 assert.equal(section.hidden,false);
 assert.match(content().textContent,/地域全体.*未集計/);
 assert.doesNotMatch(content().textContent,/インドの米|カザフスタンの小麦/);
 assert.equal(content().querySelectorAll('svg.sc-share-chart').length,0);
 assert.match(root.querySelector('[data-south-central-supply] details').textContent,/国別参考例/);
});

test('country and item selection update the series, while unsupported items show no invented graph',()=>{
 renderSouthCentralFarmConnections(root,'south-central-asia',true,'wheat',{code:'KAZ',name:'カザフスタン'});
 assert.match(content().textContent,/カザフスタンの小麦：18,576,694\.15\s*t（2024年）/);
 assert.match(content().textContent,/世界生産量の2\.3％/);
 assert.match(content().textContent,/World 798,481,711\.07\s*t/);
 assert.equal(content().querySelectorAll('svg.sc-share-chart').length,1);
 renderSouthCentralFarmConnections(root,'south-central-asia',true,'cotton',{code:'KAZ',name:'カザフスタン'});
 assert.match(content().textContent,/未収録/);
 assert.doesNotMatch(content().textContent,/18,576,694\.15|798,481,711\.07|2\.3％/,'unsupported cotton must not reuse the wheat quantities or world share');
 assert.equal(content().querySelectorAll('svg').length,0);
 renderSouthCentralFarmConnections(root,'east-asia',true,'wheat',{code:'KAZ',name:'カザフスタン'});
 assert.equal(section.hidden,true);
});

test('Central Asia gives a sourced cotton processing path without inventing trade destinations',()=>{
 renderSouthCentralFarmConnections(root,'south-central-asia',true,'overview',undefined,{country:'KAZ',product:'wheat-production'},'central-asia');
 assert.match(root.querySelector('[data-south-central-supply]').textContent,/ウズベキスタン.*灌漑地.*紡績.*縫製/);
 assert.match(root.querySelector('[data-south-central-destinations]').textContent,/未収録/);
 assert.equal(root.querySelector('[data-south-central-destinations] .sc-flow-pie'),null);
 assert.match(content().textContent,/カザフスタンの小麦/);
});
