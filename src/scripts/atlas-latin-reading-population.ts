import {renderLatinUrbanMap,renderLatinReadingDensityMap,latinReadingDensityLegend,latinPopulationLocators,renderLatinPopulationDotLegend} from '../lib/atlas-latin-reading-population';
import {latinUrbanPopulations,latinUrbanSource} from '../data/atlas/latin-america/urban-population-2018';
import {renderLatinCulturePatterns,renderCulturePatternLegend,culturePatternReading,latinMunicipalParda} from '../lib/atlas-latin-culture-patterns';
import {geographicSelection} from '../data/atlas/latin-america/culture-geographic-distributions';
import {majorSelection} from '../data/atlas/latin-america/culture-major-compositions';
import {latinCultureGroups,latinCultureRegions,latinCultureNational,latinCultureOverview,latinCultureCoverage,type LatinCultureSection} from '../data/atlas/latin-america/culture-reading';
import {latinCultureSupplementReading} from '../lib/atlas-latin-culture-supplement';
import {latinCultureSupplementSelection} from '../data/atlas/latin-america/culture-supplement-2018';
import {initLatinMapCamera} from './atlas-latin-reading-map';
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function initLatinReadingPopulation(root:HTMLElement){
 if(root.dataset.latinPopulationReady==='1')return;root.dataset.latinPopulationReady='1';
 const q=<T extends HTMLElement=HTMLElement>(name:string)=>root.querySelector<T>(`[data-lp-${name}]`)!;
 let scope='all',layer='urban',section='population',city='',choice='',cultureOnly=false;
 const read=()=>{const p=new URLSearchParams(location.search);scope=['all','central','south'].includes(p.get('scope')!)?p.get('scope')!:'all';layer=p.get('layer')==='spatial'?'spatial':'urban';section=['ethnicity','religion'].includes(p.get('section')!)?p.get('section')!:'population';city=latinPopulationLocators.some(c=>c.id===p.get('city'))?p.get('city')!:'';choice=p.get('group')??'';cultureOnly=p.get('cultureOnly')==='1';};
 const write=()=>{const url=new URL(location.href);for(const key of ['place','only','fallback','from','sourceLayer','sourcePlace','sourceScope','sourceOnly','sourceFallback','sourceCase'])url.searchParams.delete(key);url.searchParams.set('scope',scope);url.searchParams.set('layer',layer);city?url.searchParams.set('city',city):url.searchParams.delete('city');choice?url.searchParams.set('group',choice):url.searchParams.delete('group');cultureOnly?url.searchParams.set('cultureOnly','1'):url.searchParams.delete('cultureOnly');history.pushState(null,'',url);};
 const render=()=>{
  q<HTMLSelectElement>('scope-select').value=scope;q<HTMLSelectElement>('layer-select').value=layer;q('layer-label').hidden=section!=='population';root.dataset.lpLayer=layer;
  const heading=q('reading-title'),overview=q('overview'),body=q('reading-body'),legend=q('target-legend');
  if(section==='population'){
   const host=q('target-map');host.innerHTML=layer==='urban'?renderLatinUrbanMap(scope,city):renderLatinReadingDensityMap(scope);initLatinMapCamera(host);
   q('map-heading').textContent=layer==='urban'?'人口集中の点表示・2020年':'居住人口密度推計・2020年';
   const selected=latinPopulationLocators.find(c=>c.id===city);
   heading.textContent=selected&&layer==='urban'?`${selected.name}：都市位置と人口資料`:'沿岸・河川・高地への人口集中';
   overview.textContent=selected&&layer==='urban'?selected.population===null?'都市位置のみ。2018年都市集積域人口は未収録です。周辺の点表示は2020年の推計密度です。':`2018年の都市集積域人口は${selected.population.toLocaleString('ja-JP')}人。市の行政界の人口と、地図の2020年推計密度とは別です。`:'サンパウロ、リオデジャネイロ、ブエノスアイレス、リマ、ボゴタの都市集積域には1,000万人を超える人口が集まります。沿岸だけでなく高原にも大都市があります。';
   body.innerHTML=`<h3>解説：仕事と交通が人口を集める</h3><p>${escape(selected&&layer==='urban'?selected.reason:'港と道路、行政・工業・サービスの仕事が都市の集積を支えます。リマの乾燥した海岸、ボゴタの高原にも大都市があるため、気候の温暖さや雨の量だけで集積は説明できません。')}</p><p>${escape(layer==='urban'?'点の色と大きさは2020年の周辺人口密度（人/km²）です。格子の中心に一つずつ置いた記号で、実際の住宅の点や一定人数を表しません。保存格子に人数と有効面積が残っていないため、人数へ換算・合算していません。':'密度は人/km²。保存済み2020年表示格子を5段階に再分類しました。元格子の人数と有効面積がこの配信格子に残っていないため、人数に換算・合算していません。')}</p><p><a href="${latinUrbanSource.url}">国連 WUP2018・都市域の採用人数</a></p><div class="latin-city-list">${latinPopulationLocators.map(c=>`<button type="button" data-lp-city="${c.id}" aria-pressed="${city===c.id}">${c.name}</button>`).join('')}</div>`;
   legend.innerHTML=layer==='urban'?renderLatinPopulationDotLegend():`<p>色＝居住人口密度推計・2020年（人/km²）</p><ul class="lp-density-legend">${latinReadingDensityLegend.map(b=>`<li><i style="background:${b.color}"></i>${b.label}</li>`).join('')}</ul><p>0は有効な0。透明：欠測・対象外。表示約14km、集計元10km等積格子。人数の図ではありません。</p>`;
   q('status').textContent=layer==='urban'?'密度：GHSL2020・CC BY4.0。南米7都市の選択人数：国連WUP2018。中米・カリブ13都市：Natural Earthの位置のみ（人数未収録）。':'GHSL2020・CC BY4.0。配信原値は変更していません。';
  }else{
   const kind=section as LatinCultureSection,groups=latinCultureGroups[kind],host=root.querySelector<HTMLElement>(`[data-lc-map="${section}"]`)!;
   const supplement=kind==='ethnicity'?latinCultureSupplementReading(choice):null;
   const [regionId,groupId]=choice.split(':'),region=latinCultureRegions.find(r=>r.id===regionId),index=groups.findIndex(g=>g.id===groupId),valid=(region||regionId==='PAN'&&kind==='ethnicity')&&index>=0;
   const major=(kind==='ethnicity'&&latinMunicipalParda.some(c=>choice==='municipal:'+c.id)?{kind:'municipal',id:choice}:undefined)??majorSelection(kind,choice)??geographicSelection(kind,choice)??(kind==='religion'&&choice==='distribution:moravian'?{kind:'distribution',id:'moravian'}:undefined);if(!valid&&!supplement&&!major)choice='';if(major?.kind!=='distribution')cultureOnly=false;
   host.innerHTML=renderLatinCulturePatterns(kind,scope,choice,cultureOnly);initLatinMapCamera(host);
   const reading=culturePatternReading(kind,choice,cultureOnly);
   q('map-heading').textContent=kind==='ethnicity'?'民族・人種の地域分布を一枚で読む':'宗教の地域分布を一枚で読む';
   heading.textContent=supplement?supplement.title:valid?`${region?.name??'パナマ全国'}：${groups[index].name}`:reading.title;
   overview.textContent=supplement?supplement.overview:valid?`${region?.name??'パナマ全国'}の公表人数は${(region?(kind==='ethnicity'?region.identity:region.religion)[index]:latinCultureNational.ethnicity[1].values[index]).toLocaleString('ja-JP')}人です。${region?'チリ2024年・州全体の集計':'パナマ2023年・全国の別設問指標'}。`:reading.overview;
   const selection=supplement?latinCultureSupplementSelection(choice):null;
   body.innerHTML=selection?`<h3>解説：資料の設問と範囲を確かめる</h3><p>${escape(selection.data.definition)}</p><p>${escape(selection.data.denominator)}</p><p>全国・行政区分の値から、民族の居住域を描いていません。</p><p><a href="#latin-culture-statistics">詳しい統計は地図下へ</a> · <a href="${selection.data.termsUrl}">${escape(selection.data.terms)}</a></p>`:valid?`<h3>解説：以前の統計選択を読む</h3><p>${escape(latinCultureOverview[kind].explanation)}</p><p><a href="#latin-culture-statistics">原表と利用条件は地図下へ</a></p>`:reading.body;
   legend.innerHTML=renderCulturePatternLegend(kind,choice,scope,cultureOnly);
   q('status').textContent=kind==='ethnicity'?'行政区別の公表値＋面を持たない地域記述の参照。2012–23年、2026年現在値ではありません。民族は10%以上を表示。ブラジル3市のpardaは2022年の原集計。':'州・地区の所属を同時表示。2005–24年、現在値ではありません。宗教は5%以上。年齢・元教派は選択地域の右欄へ。';
   for(const table of root.querySelectorAll<HTMLElement>('[data-lc-supplement-source]')){
    const country=table.dataset.lcSupplementSource!;const detail=table.querySelector<HTMLElement>('[data-lc-supplement-detail]');if(detail)detail.innerHTML=latinCultureSupplementReading(choice.startsWith(country+':')?choice:country+':national')!.body;
    if(selection&&selection.data.country===country)(table as HTMLDetailsElement).open=true;
   }
  }
 };
 root.addEventListener('change',e=>{const t=e.target as HTMLSelectElement;if(t.matches('[data-lp-scope-select]'))scope=t.value;else if(t.matches('[data-lp-layer-select]'))layer=t.value;else if(t.matches('[data-lc-isolate]'))cultureOnly=(t as unknown as HTMLInputElement).checked;else return;render();write();});
 const choose=(target:Element)=>{const cityButton=target.closest<HTMLElement>('[data-lp-city]'),culture=target.closest<HTMLElement>('[data-lc-select]');if(cityButton){city=cityButton.dataset.lpCity!;layer='urban';}else if(culture)choice=culture.dataset.lcSelect!;else return;render();write();};
 root.addEventListener('click',e=>{if(e.target instanceof Element&&!e.defaultPrevented){if(e.target.closest('[data-lc-reset]')){choice='';cultureOnly=false;render();write();}else choose(e.target);}});root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target instanceof SVGElement&&e.target.matches('[data-lp-city],[data-lc-select]')){e.preventDefault();choose(e.target);}});
 const restore=()=>{read();render();};window.addEventListener('popstate',restore);window.addEventListener('latin-section-change',restore);read();render();
}
