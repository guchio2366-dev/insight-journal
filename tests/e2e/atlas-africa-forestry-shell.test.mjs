import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

test('Africa forestry retains the Africa field order and farming return route in its shared frame',async()=>{
 const window=new Window({url:'https://example.com/insight-journal/atlas/africa/agriculture/forestry/',settings:{disableCSSFileLoading:true,disableJavaScriptFileLoading:true,enableJavaScriptEvaluation:false}});
 try {
  window.document.write(await readFile('dist/atlas/africa/agriculture/forestry/index.html','utf8'));
  const document=window.document,root=document.querySelector('[data-regional-forestry]');
  assert.ok(root.querySelector('.africa-desktop-shell[data-atlas-shell]'));
  assert.equal(document.querySelector('[data-africa-atlas]'),null,'forestry must not initialize the unrelated Africa interactive map');
  const fields=[...root.querySelectorAll('.africa-fields>a')];
  assert.equal(fields.length,5);
  assert.deepEqual(fields.map(link=>new URL(link.href).pathname+new URL(link.href).search),[
   '/insight-journal/atlas/africa/overview/','/insight-journal/atlas/africa/?field=agriculture','/insight-journal/atlas/africa/?field=nature','/insight-journal/atlas/africa/?field=industry','/insight-journal/atlas/africa/?field=population',
  ]);
  assert.equal(fields[1].getAttribute('aria-current'),'page');
  const subfields=[...root.querySelectorAll('.africa-main>.forest-subfields>a')];
  assert.deepEqual(subfields.map(link=>link.textContent),['農畜産','林業']);
  assert.equal(new URL(subfields[0].href).search,'?field=agriculture&topic=farming');
  assert.equal(subfields[1].getAttribute('aria-current'),'page');
  assert.ok(root.querySelector('.forest-reading .forest-example-choices'));
  assert.equal(root.querySelector('.forest-map-column .forest-example-choices'),null);
 } finally {await window.happyDOM.close();}
});
