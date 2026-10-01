import test from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {createAsiaReadingDock} from '../../src/scripts/atlas-asia-reading-dock.ts';

const state={field:'natural',place:'JPN',city:'tokyo',camera:null,back:null};
function fixture(body){
 const window=new Window();
 window.document.body.innerHTML=`<div data-asia-atlas><section data-reading-dock><h2 data-reading-dock-title>東アジアの気候</h2><p data-reading-dock-summary>地域の概論</p><div data-reading-dock-links><button data-dock-compare="natural"></button><button data-dock-compare="agriculture"></button></div></section><details data-reading-details>${body}</details></div>`;
 const root=window.document.querySelector('[data-asia-atlas]');
 return {root,dock:createAsiaReadingDock(root),window};
}

test('詳説を閉じたままでも選んだ都市の要点と比較入口を読める',()=>{
 const {root,dock,window}=fixture('<article data-city-panel="tokyo"><h2>東京の気候</h2><p class="city-takeaway">夏の雨と冬の乾燥を読み分ける。</p></article><section data-overview hidden><h2>地域の概論</h2></section>');
 dock.render(state);
 assert.equal(root.querySelector('[data-reading-details]').open,false);
 assert.equal(root.querySelector('[data-reading-dock-title]').textContent,'東京の気候');
 assert.equal(root.querySelector('[data-reading-dock-summary]').textContent,'夏の雨と冬の乾燥を読み分ける。');
 assert.equal(root.querySelector('[data-dock-compare="natural"]').hidden,true);
 assert.equal(root.querySelector('[data-dock-compare="agriculture"]').hidden,false);
 window.happyDOM.abort();
});

test('民族居住域と気候凡例へ切り替えると以前の都市の要点を残さない',()=>{
 const {root,dock,window}=fixture('<section data-settlement-reading><div data-settlement-overview><h2>民族の居住域</h2><p class="asia-takeaway">研究資料の集団と居住域を区別する。</p></div></section><section data-class-reading hidden><h3>Cfa 温暖湿潤</h3><p data-class-description>乾季がなく夏が暑い。</p></section><article data-city-panel="tokyo" hidden><h2>東京の気候</h2></article>');
 dock.render({...state,field:'population',city:null,topic:'ethnicity'});
 assert.equal(root.querySelector('[data-reading-dock-title]').textContent,'民族の居住域');
 root.querySelector('[data-settlement-reading]').hidden=true;
 root.querySelector('[data-class-reading]').hidden=false;
 dock.render({...state,city:null});
 assert.equal(root.querySelector('[data-reading-dock-title]').textContent,'Cfa 温暖湿潤');
 assert.equal(root.querySelector('[data-reading-dock-summary]').textContent,'乾季がなく夏が暑い。');
 window.happyDOM.abort();
});
