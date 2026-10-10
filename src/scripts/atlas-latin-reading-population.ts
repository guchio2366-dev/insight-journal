import {renderLatinUrbanMap,renderLatinReadingDensityMap,latinReadingDensityLegend} from '../lib/atlas-latin-reading-population';
import {latinUrbanPopulations,latinUrbanSource} from '../data/atlas/latin-america/urban-population-2018';
import {renderLatinCultureMap} from '../lib/atlas-latin-reading-culture';
import {latinCultureGroups,latinCultureRegions,latinCultureNational,latinCultureOverview,latinCultureCoverage,type LatinCultureSection} from '../data/atlas/latin-america/culture-reading';
import {latinCultureSupplementReading,latinCultureSupplementLinks} from '../lib/atlas-latin-culture-supplement';
import {initLatinMapCamera} from './atlas-latin-reading-map';
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function initLatinReadingPopulation(root:HTMLElement){
 if(root.dataset.latinPopulationReady==='1')return;root.dataset.latinPopulationReady='1';
 const q=<T extends HTMLElement=HTMLElement>(name:string)=>root.querySelector<T>(`[data-lp-${name}]`)!;
 let scope='all',layer='urban',section='population',city='',choice='';
 const read=()=>{const p=new URLSearchParams(location.search);scope=['all','central','south'].includes(p.get('scope')!)?p.get('scope')!:'all';layer=p.get('layer')==='spatial'?'spatial':'urban';section=['ethnicity','religion'].includes(p.get('section')!)?p.get('section')!:'population';city=latinUrbanPopulations.some(c=>c.id===p.get('city'))?p.get('city')!:'';choice=p.get('group')??'';};
 const write=()=>{const url=new URL(location.href);for(const key of ['place','only','fallback','from','sourceLayer','sourcePlace','sourceScope','sourceOnly','sourceFallback','sourceCase'])url.searchParams.delete(key);url.searchParams.set('scope',scope);url.searchParams.set('layer',layer);city?url.searchParams.set('city',city):url.searchParams.delete('city');choice?url.searchParams.set('group',choice):url.searchParams.delete('group');history.pushState(null,'',url);};
 const render=()=>{
  q<HTMLSelectElement>('scope-select').value=scope;q<HTMLSelectElement>('layer-select').value=layer;q('layer-label').hidden=section!=='population';root.dataset.lpLayer=layer;
  const heading=q('reading-title'),overview=q('overview'),body=q('reading-body'),legend=q('target-legend');
  if(section==='population'){
   const host=q('target-map');host.innerHTML=layer==='urban'?renderLatinUrbanMap(scope,city):renderLatinReadingDensityMap(scope);initLatinMapCamera(host);
   q('map-heading').textContent=layer==='urban'?'都市集積域の人数・2018年':'居住人口密度推計・2020年';
   const selected=latinUrbanPopulations.find(c=>c.id===city);
   heading.textContent=selected&&layer==='urban'?`${selected.name}の都市集積域`:'沿岸・河川・高地への人口集中';
   overview.textContent=selected&&layer==='urban'?`2018年の都市集積域人口は${selected.population.toLocaleString('ja-JP')}人。市の行政界の人口とは異なります。`:'サンパウロ、リオデジャネイロ、ブエノスアイレス、リマ、ボゴタの都市集積域には1,000万人を超える人口が集まります。沿岸だけでなく高原にも大都市があります。';
   body.innerHTML=`<h3>解説：仕事と交通が人口を集める</h3><p>${escape(selected&&layer==='urban'?selected.reason:'港と道路、行政・工業・サービスの仕事が都市の集積を支えます。リマの乾燥した海岸、ボゴタの高原にも大都市があるため、気候の温暖さや雨の量だけで集積は説明できません。')}</p><p>${escape(layer==='urban'?latinUrbanSource.definition:'密度は人/km²。保存済み2020年表示格子を5段階に再分類しました。元格子の人数と有効面積がこの配信格子に残っていないため、人数に換算・合算していません。')}</p><p><a href="${latinUrbanSource.url}">国連 WUP2018・都市域の採用人数</a></p><div class="latin-city-list">${latinUrbanPopulations.map(c=>`<button type="button" data-lp-city="${c.id}" aria-pressed="${city===c.id}">${c.name}</button>`).join('')}</div>`;
   legend.innerHTML=layer==='urban'?'<p>円の面積＝都市集積域の人数・2018年。7都市を収録。小さな円を0人と解釈しません。国境面は選択できません。</p>':`<p>色＝居住人口密度推計・2020年（人/km²）</p><ul class="lp-density-legend">${latinReadingDensityLegend.map(b=>`<li><i style="background:${b.color}"></i>${b.label}</li>`).join('')}</ul><p>0は有効な0。透明：欠測・対象外。表示約14km、集計元10km等積格子。人数の図ではありません。</p>`;
   q('status').textContent=layer==='urban'?'国連WUP2018・CC BY3.0 IGO。都市域の定義は国ごとに異なり、現在人口ではありません。中米・カリブの都市人数は未収録。':'GHSL2020・CC BY4.0。配信原値は変更していません。';
  }else{
   const kind=section as LatinCultureSection,groups=latinCultureGroups[kind],info=latinCultureOverview[kind],host=root.querySelector<HTMLElement>(`[data-lc-map="${section}"]`)!;
   const supplement=kind==='ethnicity'?latinCultureSupplementReading(choice):null;
   const [regionId,groupId]=choice.split(':'),region=latinCultureRegions.find(r=>r.id===regionId),index=groups.findIndex(g=>g.id===groupId),valid=(region||regionId==='PAN'&&kind==='ethnicity')&&index>=0;
   if(!valid&&!supplement)choice='';host.innerHTML=renderLatinCultureMap(kind,scope,choice);initLatinMapCamera(host);
   q('map-heading').textContent=kind==='ethnicity'?'帰属・自己認識の州別計数と全国補助統計':'宗教・信条の州別計数';heading.textContent=supplement?supplement.title:valid?`${region?.name??'パナマ全国'}：${groups[index].name}`:info.title;
   overview.textContent=supplement?supplement.overview:valid?`${region?.name??'パナマ全国'}の公表人数は${(region?(kind==='ethnicity'?region.identity:region.religion)[index]:latinCultureNational.ethnicity[1].values[index]).toLocaleString('ja-JP')}人です。${region?'チリ2024年・州全体の集計':'パナマ2023年・全国の別設問指標'}。`:info.overview;
   body.innerHTML=supplement?supplement.body:`${kind==='ethnicity'?latinCultureSupplementLinks(choice):''}<h3>解説：設問と統計範囲を保って読む</h3><p>${escape(info.explanation)}</p><p>${escape(kind==='ethnicity'?'チリ：全年齢、設問ごとの未回答を分母から除外。パナマ：最終通常居住者4,064,780人。先住民とアフリカ系は別設問で、足し合わせません。':'チリ：宗教・信条の設問に回答した15歳以上の通常居住者。掲載3分類以外の回答もあるため、残差を新しい宗教として作りません。')}</p><p>${escape(latinCultureCoverage)}</p><div>${groups.map(g=>`<p><strong style="color:${g.color}">${g.name}</strong></p>`).join('')}</div><details open><summary>原典・利用条件</summary>${latinCultureNational[kind].map(r=>`<p>${r.name}・${r.year}年：<a href="${r.source}">国勢調査原典</a> · <a href="${r.licenseUrl}">${r.license}</a></p>`).join('')}<p>抽出・日本語表示・記号配置はInsight Journal。全国割合から居住域を描いていません。</p></details>`;
   legend.innerHTML=`<div class="latin-culture-key">${groups.map(g=>`<span><i style="background:${g.color}"></i>${g.name}</span>`).join('')}</div><p>${kind==='ethnicity'?'丸＝チリ州別計数／色四角＝パナマ全国の別設問／＋四角＝グアテマラ・コロンビアの資料別統計。':'丸＝チリ州別計数。'}位置・面積は人数や居住域を示しません。</p>`;q('status').textContent=kind==='ethnicity'?'部分収録：チリ6州／パナマ全国／グアテマラ全国6分類／コロンビア33行政区分。中南米全域の整備完了を意味しません。':'宗教・信条はチリ2024全国・代表6州の3分類のみ。その他は未収録。中南米全域の整備完了を意味しません。';
  }
 };
 root.addEventListener('change',e=>{const t=e.target as HTMLSelectElement;if(t.matches('[data-lp-scope-select]'))scope=t.value;else if(t.matches('[data-lp-layer-select]'))layer=t.value;else return;render();write();});
 const choose=(target:Element)=>{const cityButton=target.closest<HTMLElement>('[data-lp-city]'),culture=target.closest<HTMLElement>('[data-lc-select]');if(cityButton){city=cityButton.dataset.lpCity!;layer='urban';}else if(culture)choice=culture.dataset.lcSelect!;else return;render();write();};
 root.addEventListener('click',e=>{if(e.target instanceof Element&&!e.defaultPrevented)choose(e.target);});root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target instanceof SVGElement&&e.target.matches('[data-lp-city],[data-lc-select]')){e.preventDefault();choose(e.target);}});
 const restore=()=>{read();render();};window.addEventListener('popstate',restore);window.addEventListener('latin-section-change',restore);read();render();
}
