import reviewRivers from '../../public/assets/atlas/latin-review-v3/major-rivers.json';
import manifest from '../../public/assets/atlas/latin-water-terrain-v1/manifest.json';
import {latinReadingGeography,latinRainfallReading,latinElevationReading,renderLatinLandformAreas,renderLatinFoundationAnnotations,renderLatinRainfallReadingLegend,renderLatinLandformLegend,renderLatinSeaContext} from './atlas-latin-nature-reading';
import {latinCountries,latinMapLayout,projectLatin} from './atlas-latin-america-geometry';
import {withBase} from './urls';
export type LatinFoundationSection='rivers'|'rainfall'|'terrain'|'elevation';
export const latinFoundationSections:LatinFoundationSection[]=['rivers','rainfall','terrain','elevation'];
export const latinFoundationManifest=manifest;
const names:Record<string,string>={'Amazonas':'アマゾン川','Paraná':'パラナ川','Orinoco':'オリノコ川','Magdalena':'マグダレナ川','São  Francisco':'サンフランシスコ川','Uruguay':'ウルグアイ川','Tocantins':'トカンチンス川','Madeira':'マデイラ川','Negro':'ネグロ川','Panama Canal':'パナマ運河','Usumacinta':'ウスマシンタ川','San Juan':'サンフアン川','Bío-Bío':'ビオビオ川'};
export const latinFoundationRivers=latinReadingGeography.rivers.map(r=>({...r,displayName:names[r.name]??r.name}));

export const latinReviewRivers=reviewRivers.features.map(f=>{
 const lines=(f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.coordinates) as number[][][];
 const longest=[...lines].sort((a,b)=>b.length-a.length)[0];
 return {id:f.properties.atlasId,name:f.properties.name,displayName:f.properties.name==='Negro'?`ネグロ川（${{'amazon':'アマゾン','argentina-patagonia':'アルゼンチン','uruguay':'ウルグアイ'}[f.properties.geographicRegion]??f.properties.geographicRegion}）`:names[f.properties.name]??f.properties.name,sourceClasses:[f.properties.featurecla],path:lines.map(line=>line.map((p,i)=>{const [x,y]=projectLatin(p);return `${i?'L':'M'}${x.toFixed(4)},${y.toFixed(4)}`;}).join('')).join(''),labelCoordinate:longest[Math.floor(longest.length/2)],defaultVisible:f.properties.defaultVisible,sourceFeatureIndex:f.properties.sourceFeatureIndex,properties:f.properties};
});
export const resolveLatinRiver=(id:string|null)=>latinReviewRivers.filter(r=>r.id===id||latinFoundationRivers.find(old=>old.id===id)?.name===r.name);
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const titles={rivers:'河川・運河の分布',rainfall:'年降水量の平年分布',terrain:'地形地域の名称と概略範囲',elevation:'標高の等高線と線間の色'};
export const foundationTitle=(section:LatinFoundationSection)=>titles[section];
export function renderLatinFoundationMap(section:LatinFoundationSection,scope='all',place='all',selectedRiver:string|null=null,labelScale=1,loadAsset=true):string{
 const height=850,layout=latinMapLayout(scope,place,height),frame=layout.frame,id='latin-foundation-'+section;
 const outlines=latinCountries.map(c=>`<path d="${c.path}" fill-rule="evenodd"/>`).join('');
 const base=`<defs><clipPath id="${id}-land" clip-rule="evenodd">${outlines}</clipPath></defs><g transform="${layout.transform}"><g fill="#e2e5df">${outlines}</g>`;
 const asset=withBase(section==='rainfall'?latinRainfallReading.png:section==='elevation'?latinElevationReading.png:'/assets/atlas/latin-water-terrain-v1/'+section+'.png');
 const image=section==='terrain'?renderLatinLandformAreas(id+'-land'):section==='rivers'?`<image data-foundation-dem data-foundation-asset="${withBase('/assets/atlas/latin-review-v3/river-hillshade.png')}" ${loadAsset?`href="${withBase('/assets/atlas/latin-review-v3/river-hillshade.png')}"`:''} x="0" y="0" width="900" height="580" clip-path="url(#${id}-land)"/>`:`<image data-foundation-asset="${asset}" ${loadAsset?`href="${asset}"`:''} x="0" y="0" width="900" height="580"/>`;
 const selectedIds=new Set(resolveLatinRiver(selectedRiver).map(r=>r.id));
 const displayedRivers=latinReviewRivers.filter(r=>scope!=='all'||r.defaultVisible||selectedIds.has(r.id));
 const riverLayer=section==='rivers'||section==='terrain'?`<g clip-path="url(#${id}-land)">${displayedRivers.map(r=>`<path d="${r.path}" class="latin-foundation-river-line" data-river-line="${r.id}" stroke="${selectedIds.has(r.id)?'#bb5c2d':'#2d749c'}" stroke-width="${selectedIds.has(r.id)?2.6:['Amazonas','Paraná','Orinoco','Magdalena','São  Francisco'].includes(r.name)?1.7:.85}"/>`).join('')}${section==='rivers'?displayedRivers.map(r=>`<path d="${r.path}" class="latin-foundation-river-hit" data-foundation-river="${r.id}" role="button" tabindex="0" aria-label="${escape(r.displayName)}の解説" aria-pressed="${selectedIds.has(r.id)}"/>`).join(''):''}</g>`:'';
 const riverLabelBoxes:number[][]=[];
 const label=(r:typeof latinReviewRivers[number],selected=false)=>{
  const offsets:Record<string,[number,number,string]>={'Magdalena':[-10,-12,'end'],'Orinoco':[10,-12,'start'],'Paraná':[-10,17,'end'],'São  Francisco':[10,12,'start']};
  const [dx,dy,anchor]=offsets[r.name]??[8,selected?-14:-5,'start'],[x,y]=projectLatin(r.labelCoordinate),unit=labelScale/layout.k;
  const sx=x*layout.k+layout.tx,sy=y*layout.k+layout.ty,width=([...r.displayName].reduce((sum,c)=>sum+(c.charCodeAt(0)>255?12:6.8),4))*labelScale,labelHeight=14*labelScale;
  const candidates=[dy,dy-20,dy+20,dy-40,dy+40].map(offset=>{const tx=sx+dx*labelScale,ty=sy+offset*labelScale;return {tx,ty,box:[anchor==='end'?tx-width:tx,ty-labelHeight,width,labelHeight]};});
  const position=candidates.find(({box:b})=>b[0]>=8&&b[0]+b[2]<=892&&b[1]>=8&&b[1]+b[3]<=height-8&&!riverLabelBoxes.some(a=>b[0]<a[0]+a[2]+4&&b[0]+b[2]>a[0]-4&&b[1]<a[1]+a[3]+3&&b[1]+b[3]>a[1]-3));
  if(!position)return '';
  riverLabelBoxes.push(position.box);
  const lx=(position.tx-layout.tx)/layout.k,ly=(position.ty-layout.ty)/layout.k;
  return `<g pointer-events="none"><path d="M${x},${y}L${lx},${ly}" class="latin-foundation-label-leader"/><text data-foundation-river-label="${latinFoundationRivers.find(old=>old.name===r.name)?.id??r.id}" x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="${12*unit}" class="latin-foundation-river-label${selected?' is-selected':''}">${escape(r.displayName)}</text></g>`;
 };
 const labels=section==='rivers'?(scope==='central'?['Usumacinta','Motagua','Lempa','San Juan','Panama Canal']:scope==='south'?['Amazonas','Paraná','Orinoco','Magdalena','São  Francisco','Madeira','Negro','Tocantins','Uruguay']:['Amazonas','Paraná','Orinoco','Magdalena','São  Francisco','Usumacinta']).map(name=>{
  const r=displayedRivers.find(r=>r.name===name);if(!r||selectedIds.has(r.id))return '';
  return label(r);
 }).join(''):'';
 const selectedLabels=new Set<string>();
 const selectedLabel=section==='rivers'?displayedRivers.filter(r=>selectedIds.has(r.id)).map(r=>{const key=r.name==='Negro'?r.properties.geographicRegion:r.name;if(selectedLabels.has(key))return '';selectedLabels.add(key);return label(r,true);}).join(''):'';
 return `<svg class="latin-nature-map latin-foundation-map" data-reading-frame="${frame.join(' ')}" viewBox="0 0 900 ${height}" role="group" aria-label="${titles[section]}。${section==='rivers'?'河川線を選ぶと右に解説。':'国境は位置参照。数値と読み方は右の解説と下の凡例。'}"><title>${titles[section]}</title>${base}${image}${section==='terrain'?renderLatinSeaContext(id):''}${riverLayer}<g fill="none" stroke="#707e77" stroke-width="0.55" pointer-events="none">${outlines}</g>${labels}${selectedLabel}</g>${renderLatinFoundationAnnotations(section,scope,place,labelScale,riverLabelBoxes,height)}</svg>`;
}
export function renderLatinFoundationLegend(section:LatinFoundationSection):string{
 if(section==='rainfall')return renderLatinRainfallReadingLegend();
 if(section==='terrain')return renderLatinLandformLegend();
 if(section==='rivers')return '<p>青線：Natural Earth 1:1,000万の主要河川・湖内中心線。薄い灰の起伏：ETOPO2022 DEMの陰影（航空写真ではありません）。細い灰線：国境。橙線：選択した線。他の河川も残ります。</p>';
 const data=section==='rainfall'?manifest.rainfall:manifest.elevation,colors=section==='terrain'?manifest.elevation.terrainColors.slice(1):section==='elevation'?data.colors.slice(1):data.colors;
 const ticks=section==='rainfall'?[0,2500,5000,7500]:[0,1500,3000,4500,6000];
 const colorBar=colors.map(c=>`<span style="flex:1;background:${c}"></span>`).join('');
 const maximum=data.levels.at(-1)!;
 const below=section==='terrain'?manifest.elevation.terrainColors[0]:manifest.elevation.colors[0];
 const subzero=section==='rainfall'?'':`<div class="latin-foundation-extra-key"><span><i data-foundation-subzero style="background:${below}"></i>0m未満（沿岸の陸海混合を含む）</span><span><i style="background:#e2e5df"></i>欠測・未解像</span></div>`;
 return `<div class="latin-foundation-scale" aria-label="${section==='rainfall'?'降水量：薄い青から濃い青へ250mm間隔':'標高：500m間隔。低地から高地へ'}"><div class="latin-foundation-colorbar" aria-hidden="true">${colorBar}</div><div class="latin-foundation-ticks">${[...ticks,maximum].map(t=>`<span style="left:${100*t/maximum}%;transform:translateX(${t===0?'0':t===maximum?'-100':'-50'}%)">${t.toLocaleString('ja-JP')}</span>`).join('')}</div></div>${subzero}<p>${section==='rainfall'?'mm/年 · 1991–2020年平年値。線と青の境界は250mm間隔、濃い青ほど多雨。':'m · EGM2008基準。線と色の境界は500m間隔。2022年はモデルの版。'}灰地：欠測・格子で未解像。細線：国境。</p>`;
}
export function renderLatinFoundationReading(section:LatinFoundationSection,riverId:string|null=null):string{
 const r=latinFoundationRivers.find(r=>r.id===riverId);
 if(section==='rivers'){
 const selected=resolveLatinRiver(riverId),legacy=latinFoundationRivers.find(r=>r.id===riverId),title=selected[0]?.displayName??legacy?.displayName??'中南米の主要河川';
 return `<h2>${escape(title)}</h2><p>${selected.length?`原資料の個別の線${selected.length}件を橙色で強調しています。名称：${escape(selected[0].name)}。選択しても他の主要河川を残します。`:'全域では32本の主要な地図線を表示。地域表示では採用66件の個別線を確認できます。青線を選ぶと原資料の分類を読みます。'}</p>${selected.length>1?'<p>同名の線は別々の原地物です。同じ水系・同じ本流として統合していません。旧URLのNegroはアマゾン・アルゼンチン・ウルグアイの別水系を含むため、名称だけから一つの流域を指定できません。</p>':''}<p>アマゾン川、オリノコ川、パラナ川などを、薄いDEM起伏と国境を背景に読みます。陰影はNOAA ETOPO2022の高さから作成した地形表現で、航空写真ではありません。</p><p>Natural Earthの縮尺1:1,000万の個別線を保持しています。地図の表示順位は水文学的な本流・支流次数ではありません。座標の並びから流向を推測していません。流量、河口、全支流の接続はこの線資料だけでは確定できません。</p>${selected.length?`<ul>${selected.map(v=>`<li>${escape(v.properties.featurecla)} · 原地物 #${v.sourceFeatureIndex} · ${v.properties.relationEvidence==='documented-named-amazon-tributary'?'文献にアマゾン川の支流として記載（接続頂点は未取得）':'水系の接続は未確定'}</li>`).join('')}</ul>`:''}<h3>地下水と流域</h3><p>地下水の得やすさ、年に利用できる量、残量を区別できる資料は未整備です。流域の面データも未整備で、河川線を流域に置き換えていません。</p>${riverId?'<button type="button" data-foundation-overview>全体の解説に戻る</button>':''}`;
 }
 if(section==='rainfall')return '<h2>中南米の年降水量</h2><p>GPCC/DWDの1991–2020年の月別降水量平年値を、12か月そろったセルだけ合計しました。地図の線と青の境界は250mm/年間隔です。濃い青の多雨域と、西岸の乾燥域・南端を比べます。</p><p>元資料は雨量計から補間した0.25度格子です。格子間を線形補間して等雨量線を作りました。局地の山谷、都市内の差、小島の雨量をこの細さで確定できません。線は観測地点を直接結んだ実測線ではありません。</p><p>年降水量は雨の供給を表します。河川流量、蒸発を差し引いた利用可能量、地下水涵養量や残量とは別です。雨の季節は「気候区分」の都市雨温図で確認できます。</p><h3>欠測と尺度</h3><p>1か月でも欠測なら年値も欠測です。正常な0は有効値として保持し、海域・欠測・格子で未解像の沿岸を灰地で示しています。国平均、水量、面積割合は計算していません。</p>';
 if(section==='terrain')return '<h2>山脈・高原・盆地・平原の地域名</h2><p>アンデス山脈は南米西側を南北に連なり、その東にはアマゾン盆地、ブラジル高原、南部にはグランチャコ・パンパ等のラプラタ平原の地域が広がります。地図の色面はNatural Earthの地形地域名の概略範囲です。</p><p>アンデス、アマゾン盆地、ブラジル高原、リャノス、グランチャコ、パンパ、アルティプラノ、パタゴニアに、中米のマヤ山脈・チアパス山地・モスキート海岸を加えています。モスキート海岸は海岸地域名で、測定した低地の標高範囲ではありません。中米火山帯とカリブの山地の面資料は未取得です。ラプラタ平原の厳密な単一境界を推測して追加してはいません。アマゾン盆地の名称面を、測定された低地の標高範囲や水文学的流域境界とは扱いません。</p><p>海上の2本の矢印は、NASAの南米西岸・NOAAの貿易風の説明に基づく方向の模式表示です。観測した風速・流速・現在の風向や正確な流路ではありません。<a href="https://eol.jsc.nasa.gov/Collections/EarthObservatory/articles/SouthAmericasWestCoastWonders.htm">NASA：フンボルト海流</a> · <a href="https://www.nesdis.noaa.gov/about/k-12-education/atmosphere/what-are-trade-winds">NOAA：貿易風</a>。原資料は物理地理の地名を置くための概略ポリゴンです。地質、土地被覆、標高階級の分類や面積計算には使いません。都市名と河川を位置参照にし、高さは「標高」タブの500m線と段階色で読みます。</p>';
 return `<h2>中南米の標高の全体像</h2><p>NOAA NCEIのETOPO 2022 surfaceモデルから、500m間隔の等高線と線間の色を作りました。${section==='terrain'?'灰の濃淡は高さの段階、青線は別資料の河川線です。陰影起伏図や地質・地形分類図ではありません。':'低地から高地へ色が変わります。西側のアンデスの高地と内陸の低地を、輪郭だけの国境と比べます。'}</p><p>高さはEGM2008のジオイド基準で、単位はmです。2022年はモデルの版で、すべての地点の観測年を意味しません。60秒の元格子を、広域表示用に3セルごと（0.05度）に間引きました。個々の山頂の高さや局所の斜面を測る図ではありません。</p><p>同じ間引き格子から線形補間した等高線と線間の色です。${section==='terrain'?'500mの段階を灰の濃淡で示します。':'線を挟んだ色は500mの標高帯を示します。'}地図に国・地区のクリック操作はありません。</p><h3>海岸と欠測</h3><p>元モデルは海底も含みます。国境輪郭の一般化で沿岸に残る海面以下・陸海混合セルは独立した最初の色で示します。その値を陸域の最低標高とは扱いません。灰地は欠測・未解像で、海岸や小島に元格子以上の精度はありません。</p>`;
}
