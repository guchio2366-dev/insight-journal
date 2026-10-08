import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Window} from 'happy-dom';

const output=await build({entryPoints:['src/scripts/atlas-asia-farming-panel.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {renderSouthCentralFarmConnections}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const window=new Window();globalThis.document=window.document;
const root=window.document.createElement('main');root.innerHTML='<section data-south-central-farm-connections hidden><div data-south-central-world-share></div></section>';
const section=root.querySelector('[data-south-central-farm-connections]');
const content=()=>root.querySelector('[data-south-central-world-share]');

test('the regional default identifies country examples and draws only a sourced world-share series',()=>{
 renderSouthCentralFarmConnections(root,'south-central-asia',true,'overview',undefined);
 assert.equal(section.hidden,false);
 assert.match(content().textContent,/インドの米（籾米）は、2024年に世界生産量の26\.6％/);
 assert.match(content().textContent,/カザフスタンの小麦/);
 assert.equal(content().querySelectorAll('svg.sc-share-chart').length,1);
 assert.equal(content().querySelectorAll('tbody tr').length,10);
 assert.doesNotMatch(content().textContent,/輸出量|国内向け/);
});

test('country and item selection update the series, while unsupported items show no invented graph',()=>{
 renderSouthCentralFarmConnections(root,'south-central-asia',true,'wheat',{code:'KAZ',name:'カザフスタン'});
 assert.match(content().textContent,/カザフスタンの小麦は、2024年に世界生産量の2\.3％/);
 assert.equal(content().querySelectorAll('svg.sc-share-chart').length,1);
 renderSouthCentralFarmConnections(root,'south-central-asia',true,'cotton',{code:'KAZ',name:'カザフスタン'});
 assert.match(content().textContent,/未収録/);
 assert.equal(content().querySelectorAll('svg').length,0);
 renderSouthCentralFarmConnections(root,'east-asia',true,'wheat',{code:'KAZ',name:'カザフスタン'});
 assert.equal(section.hidden,true);
});
