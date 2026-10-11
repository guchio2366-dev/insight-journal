import manifest from '../../public/assets/atlas/latin-water-terrain-v1/manifest.json';
import {latinReadingGeography,latinRainfallReading,latinElevationReading,renderLatinLandformAreas,renderLatinFoundationAnnotations,renderLatinRainfallReadingLegend,renderLatinLandformLegend} from './atlas-latin-nature-reading';
import {latinCountries,latinMapLayout,projectLatin} from './atlas-latin-america-geometry';
import {withBase} from './urls';
export type LatinFoundationSection='rivers'|'rainfall'|'terrain'|'elevation';
export const latinFoundationSections:LatinFoundationSection[]=['rivers','rainfall','terrain','elevation'];
export const latinFoundationManifest=manifest;
const names:Record<string,string>={'Amazonas':'アマゾン川','Paraná':'パラナ川','Orinoco':'オリノコ川','Magdalena':'マグダレナ川','São  Francisco':'サンフランシスコ川','Uruguay':'ウルグアイ川','Tocantins':'トカンチンス川','Madeira':'マデイラ川','Negro':'ネグロ川','Panama Canal':'パナマ運河','Usumacinta':'ウスマシンタ川','San Juan':'サンフアン川','Bío-Bío':'ビオビオ川'};
export const latinFoundationRivers=latinReadingGeography.rivers.map(r=>({...r,displayName:names[r.name]??r.name}));
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const titles={rivers:'河川・運河の分布',rainfall:'年降水量の平年分布',terrain:'地形地域の名称と概略範囲',elevation:'標高の等高線と線間の色'};
export const foundationTitle=(section:LatinFoundationSection)=>titles[section];
export function renderLatinFoundationMap(section:LatinFoundationSection,scope='all',place='all',selectedRiver:string|null=null,labelScale=1,loadAsset=true):string{
 const layout=latinMapLayout(scope,place),id='latin-foundation-'+section;
 const outlines=latinCountries.map(c=>`<path d="${c.path}" fill-rule="evenodd"/>`).join('');
 const base=`<defs><clipPath id="${id}-land" clip-rule="evenodd">${outlines}</clipPath></defs><g transform="${layout.transform}"><g fill="#e2e5df">${outlines}</g>`;
 const asset=withBase(section==='rainfall'?latinRainfallReading.png:section==='elevation'?latinElevationReading.png:'/assets/atlas/latin-water-terrain-v1/'+section+'.png');
 const image=section==='terrain'?renderLatinLandformAreas(id+'-land'):section==='rivers'?'':`<image data-foundation-asset="${asset}" ${loadAsset?`href="${asset}"`:''} x="0" y="0" width="900" height="580"/>`;
 const riverLayer=section==='rivers'||section==='terrain'?`<g clip-path="url(#${id}-land)">${latinFoundationRivers.map(r=>`<path d="${r.path}" class="latin-foundation-river-line" data-river-line="${r.id}" stroke="${r.id===selectedRiver?'#bb5c2d':'#2d749c'}" stroke-width="${r.id===selectedRiver?2.6:['Amazonas','Paraná','Orinoco','Magdalena','São  Francisco'].includes(r.name)?1.7:.85}"/>`).join('')}${section==='rivers'?latinFoundationRivers.map(r=>`<path d="${r.path}" class="latin-foundation-river-hit" data-foundation-river="${r.id}" role="button" tabindex="0" aria-label="${escape(r.displayName)}の解説" aria-pressed="${r.id===selectedRiver}"/>`).join(''):''}</g>`:'';
 const riverLabelBoxes:number[][]=[];
 const label=(r:typeof latinFoundationRivers[number],selected=false)=>{
  const offsets:Record<string,[number,number,string]>={'Magdalena':[-10,-12,'end'],'Orinoco':[10,-12,'start'],'Paraná':[-10,17,'end'],'São  Francisco':[10,12,'start']};
  const [dx,dy,anchor]=offsets[r.name]??[8,selected?-14:-5,'start'],[x,y]=projectLatin(r.labelCoordinate),unit=labelScale/layout.k;
  const sx=x*layout.k+layout.tx,sy=y*layout.k+layout.ty,width=([...r.displayName].reduce((sum,c)=>sum+(c.charCodeAt(0)>255?12:6.8),4))*labelScale,height=14*labelScale;
  const candidates=[dy,dy-20,dy+20,dy-40,dy+40].map(offset=>{const tx=sx+dx*labelScale,ty=sy+offset*labelScale;return {tx,ty,box:[anchor==='end'?tx-width:tx,ty-height,width,height]};});
  const position=candidates.find(({box:b})=>b[0]>=8&&b[0]+b[2]<=892&&b[1]>=8&&b[1]+b[3]<=572&&!riverLabelBoxes.some(a=>b[0]<a[0]+a[2]+4&&b[0]+b[2]>a[0]-4&&b[1]<a[1]+a[3]+3&&b[1]+b[3]>a[1]-3));
  if(!position)return '';
  riverLabelBoxes.push(position.box);
  const lx=(position.tx-layout.tx)/layout.k,ly=(position.ty-layout.ty)/layout.k;
  return `<g pointer-events="none"><path d="M${x},${y}L${lx},${ly}" class="latin-foundation-label-leader"/><text data-foundation-river-label="${r.id}" x="${lx}" y="${ly}" text-anchor="${anchor}" font-size="${12*unit}" class="latin-foundation-river-label${selected?' is-selected':''}">${escape(r.displayName)}</text></g>`;
 };
 const labels=section==='rivers'?(scope==='central'?['Usumacinta','Motagua','Lempa','San Juan','Panama Canal']:scope==='south'?['Amazonas','Paraná','Orinoco','Magdalena','São  Francisco','Madeira','Negro','Tocantins','Uruguay']:['Amazonas','Paraná','Orinoco','Magdalena','São  Francisco','Usumacinta']).map(name=>{
  const r=latinFoundationRivers.find(r=>r.name===name);if(!r||r.id===selectedRiver)return '';
  return label(r);
 }).join(''):'';
 const selected=section==='rivers'?latinFoundationRivers.find(r=>r.id===selectedRiver):null;
 const selectedLabel=selected?label(selected,true):'';
 return `<svg class="latin-nature-map latin-foundation-map" viewBox="0 0 900 580" role="group" aria-label="${titles[section]}。${section==='rivers'?'河川線を選ぶと右に解説。':'国境は位置参照。数値と読み方は右の解説と下の凡例。'}"><title>${titles[section]}</title>${base}${image}${riverLayer}<g fill="none" stroke="#707e77" stroke-width="0.55" pointer-events="none">${outlines}</g>${labels}${selectedLabel}</g>${renderLatinFoundationAnnotations(section,scope,place,labelScale,riverLabelBoxes)}</svg>`;
}
export function renderLatinFoundationLegend(section:LatinFoundationSection):string{
 if(section==='rainfall')return renderLatinRainfallReadingLegend();
 if(section==='terrain')return renderLatinLandformLegend();
 if(section==='rivers')return '<p>青線：Natural Earth 1:1,000万の河川・運河・湖内中心線。細い灰線：国境。橙線：選択した線。他の河川も残ります。</p>';
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
 if(section==='rivers')return `<h2>${r?escape(r.displayName):'中南米の河川の全体像'}</h2><p>${r?`選択した線を橙色で強調しています。原資料の名称は「${escape(r.name)}」、分類は ${r.sourceClasses.map(escape).join(' / ')} です。`:`地図範囲から抽出した${latinFoundationRivers.length}名称の河川・運河・湖内中心線のうち、対象国に重なる部分を表示しています。線をクリック、またはキーボードで選ぶと、この欄にその名称と資料上の分類を表示します。`}</p><p>アマゾン川、オリノコ川、パラナ川などの位置を、国境を越えて読みます。選択しても他の河川線を消しません。細い灰線は位置参照の国境です。</p><p>この資料は縮尺1:1,000万の地図線です。主要河川を太めに示し、支流との地図上の接続を地域拡大で追えます。すべての支流・水路を網羅せず、流域面積、流量、本流の判定、流向・河口を証明する図ではありません。矢印や流域の面を推測で追加していません。</p><h3>地下水と流域</h3><p>地下水の得やすさ、年に利用できる量、残量を区別できる資料は未整備です。流域の面データも取得拒否のため未整備で、河川線を流域に置き換えていません。</p>${r?'<button type="button" data-foundation-overview>全体の解説に戻る</button>':''}`;
 if(section==='rainfall')return '<h2>中南米の年降水量</h2><p>GPCC/DWDの1991–2020年の月別降水量平年値を、12か月そろったセルだけ合計しました。地図の線と青の境界は250mm/年間隔です。濃い青の多雨域と、西岸の乾燥域・南端を比べます。</p><p>元資料は雨量計から補間した0.25度格子です。格子間を線形補間して等雨量線を作りました。局地の山谷、都市内の差、小島の雨量をこの細さで確定できません。線は観測地点を直接結んだ実測線ではありません。</p><p>年降水量は雨の供給を表します。河川流量、蒸発を差し引いた利用可能量、地下水涵養量や残量とは別です。雨の季節は「気候区分」の都市雨温図で確認できます。</p><h3>欠測と尺度</h3><p>1か月でも欠測なら年値も欠測です。正常な0は有効値として保持し、海域・欠測・格子で未解像の沿岸を灰地で示しています。国平均、水量、面積割合は計算していません。</p>';
 if(section==='terrain')return '<h2>山脈・高原・盆地・平原の地域名</h2><p>アンデス山脈は南米西側を南北に連なり、その東にはアマゾン盆地、ブラジル高原、南部にはグランチャコ・パンパ等のラプラタ平原の地域が広がります。地図の色面はNatural Earthの地形地域名の概略範囲です。</p><p>アンデス、アマゾン盆地、ブラジル高原、リャノス、グランチャコ、パンパ、アルティプラノ、パタゴニアを同じ地図に示しています。ラプラタ平原の厳密な単一境界を推測して追加してはいません。アマゾン盆地の名称面を、測定された低地の標高範囲や水文学的流域境界とは扱いません。</p><p>原資料は物理地理の地名を置くための概略ポリゴンです。地質、土地被覆、標高階級の分類や面積計算には使いません。都市名と河川を位置参照にし、高さは「標高」タブの500m線と段階色で読みます。</p>';
 return `<h2>中南米の標高の全体像</h2><p>NOAA NCEIのETOPO 2022 surfaceモデルから、500m間隔の等高線と線間の色を作りました。${section==='terrain'?'灰の濃淡は高さの段階、青線は別資料の河川線です。陰影起伏図や地質・地形分類図ではありません。':'低地から高地へ色が変わります。西側のアンデスの高地と内陸の低地を、輪郭だけの国境と比べます。'}</p><p>高さはEGM2008のジオイド基準で、単位はmです。2022年はモデルの版で、すべての地点の観測年を意味しません。60秒の元格子を、広域表示用に3セルごと（0.05度）に間引きました。個々の山頂の高さや局所の斜面を測る図ではありません。</p><p>同じ間引き格子から線形補間した等高線と線間の色です。${section==='terrain'?'500mの段階を灰の濃淡で示します。':'線を挟んだ色は500mの標高帯を示します。'}地図に国・地区のクリック操作はありません。</p><h3>海岸と欠測</h3><p>元モデルは海底も含みます。国境輪郭の一般化で沿岸に残る海面以下・陸海混合セルは独立した最初の色で示します。その値を陸域の最低標高とは扱いません。灰地は欠測・未解像で、海岸や小島に元格子以上の精度はありません。</p>`;
}
