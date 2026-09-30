import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

const source=(await transform(await readFile(new URL('../../src/scripts/atlas-overview-links.ts',import.meta.url),'utf8'),{loader:'ts',format:'iife'})).code;
function setup(search='',destination='/insight-journal/atlas/europe/overview/') {
  const w=new Window({url:`https://example.com/insight-journal/atlas/europe/nature/${search}`,settings:{enableJavaScriptEvaluation:true}});
  w.document.body.innerHTML=`<a data-atlas-overview-link href="${destination}">概要</a><button>選択</button>`;
  w.eval(source);
  return {w,link:w.document.querySelector('a')};
}
test('概要リンクは現在の選択国だけを引き継ぎ、地図固有の状態を持ち込まない',async()=>{
  const {w,link}=setup('?place=FRA&city=paris&layer=climate&topic=water');
  try {
    assert.equal(new URL(link.href).search,'?country=FRA');
    w.history.replaceState({},'','?place=DEU');
    link.dispatchEvent(new w.FocusEvent('focusin',{bubbles:true}));
    assert.equal(new URL(link.href).search,'?country=DEU');
    w.history.replaceState({},'','?place=');
    w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(new URL(link.href).search,'');
  } finally {await w.happyDOM.close();}
});
test('西アジアのcountryとカナダの固定リンクを扱い、不正な国コードを引き継がない',async()=>{
  const {w,link}=setup('?country=TUR','/insight-journal/atlas/north-america/overview/?country=CAN');
  try {
    assert.equal(new URL(link.href).search,'?country=TUR');
    w.history.replaceState({},'','?place=not-a-country');
    w.dispatchEvent(new w.PopStateEvent('popstate'));
    assert.equal(new URL(link.href).search,'?country=CAN');
  } finally {await w.happyDOM.close();}
});
