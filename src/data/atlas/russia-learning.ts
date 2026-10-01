import geography from './russia-countries.json';
import disputed from './russia-disputed-areas.json';
import climateClasses from '../../../public/assets/atlas/russia-climate-v1/legend.json';
import climateDisplayClasses from '../../../public/assets/atlas/russia-climate-v1/display-classes.json';
import cropManifest from '../../../public/assets/atlas/russia-crops-v1/manifest.json';
import attribution from '../../../public/assets/atlas/russia-crops-v1/attribution.json';
import livestockManifest from '../../../public/assets/atlas/russia-livestock-v1/manifest.json';
import populationManifest from '../../../public/assets/atlas/russia-population-v1/manifest.json';
import centres from '../../../public/assets/atlas/russia-population-v1/centres.json';
import {russiaIndustryMarks,russiaIndustryReadings} from './russia-industry-reading';
import {russiaPath,projectRussia,russiaWidth,russiaHeight,russiaFrameForBounds} from '../../lib/atlas-russia-geometry';
import {withBase} from '../../lib/urls';

export type RussiaField='nature'|'agriculture'|'industry'|'population';
export type RussiaState={field:RussiaField;theme:string;layer:string;place:string;scope:'all'|'theme'|'region';comparison:boolean;compareLayer:string};
export type RussiaSource={title:string;url:string;note?:string};
export type RussiaLegend={label:string;color:string;shape?:'square'|'circle'|'diamond'|'missing'|'disputed';sizePopulation?:number};
export type RussiaLayer={id:string;field:RussiaField;title:string;period:string;unit:string;kind:'raster'|'places'|'cities';image?:string;bounds?:number[];legend:RussiaLegend[];sources:RussiaSource[];coverage:string;resolution?:string};
export type RussiaTheme={id:string;field:RussiaField;title:string;takeaway:string;explanation:string;social:string;regionCodes:string[];defaultLayer:string;comparisonLayer:string;sources:RussiaSource[]};
export const russiaFields:Record<RussiaField,{label:string;title:string}>={nature:{label:'自然環境',title:'寒さと生育期、広い国土の違いを読む'},agriculture:{label:'農林畜産業',title:'小麦と牛の分布を、気候・市場とつなぐ'},industry:{label:'主要産業',title:'資源の場所と、加工・港・市場をつなぐ'},population:{label:'人口・社会',title:'西の集積と、シベリア・極東の都市を読む'}};
const allPath=russiaPath(geography.features.find(f=>f.properties.kind==='russia')!.geometry);
const contexts=geography.features.filter(f=>f.properties.kind==='context').map(f=>russiaPath(f.geometry)).filter(Boolean);
const disputes=disputed.features.map(f=>({name:f.properties.sourceLabel,path:russiaPath(f.geometry)})).filter(f=>f.path);
export const russiaRegions=[
 {code:'west',name:'欧州側・ウラル付近',bounds:[18,40,67,76],label:[43,59],path:allPath,extent:russiaFrameForBounds([18,40,67,76])},
 {code:'siberia',name:'シベリア',bounds:[60,44,130,81],label:[96,61],path:allPath,extent:russiaFrameForBounds([60,44,130,81])},
 {code:'far-east',name:'極東',bounds:[125,42,191,77],label:[153,61],path:allPath,extent:russiaFrameForBounds([125,42,191,77])},
];
const climateSource:RussiaSource={title:'Beck et al. (2023), High-resolution (1 km) Köppen-Geiger maps for 1901–2099. 1991–2020・0.1°広域原本、CC BY 4.0',url:'https://doi.org/10.1038/s41597-023-02549-6'};
const cropSource:RussiaSource={title:attribution.citation,url:'https://doi.org/10.7910/DVN/SWPENT',note:attribution.requiredAdaptationText};
const livestockSource:RussiaSource={title:'FAO GLW4（2020年）・CC BY 4.0',url:'https://data.fao.org/catalog/dataset/9d1e149b-d63f-4213-978b-317a8eb42d02',note:'CGIAR配布の5分格子Float32変換版。元FAO Float64 TIFFとのビット一致を意味しません。密度を頭数へ換算していません。'};
const livestockDistribution:RussiaSource={title:'CGIAR Climate Action Data Hub GLW4 2020：配布・変換履歴',url:'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/'};
const populationSource:RussiaSource={title:populationManifest.populationCitation+' 2020年モデル人口・CC BY 4.0',url:(populationManifest as any).populationCitationPersistentDoi??'https://doi.org/10.2905/JRC.CXKEDRR'};
const urbanSource:RussiaSource={title:'Mari Rivero et al. (2026), GHS-UCDB R2024A V1.2：2020年人口・2025年固定都市範囲、CC BY 4.0',url:'https://doi.org/10.2905/JRC.05RDPR0'};
const ghslReferenceSource:RussiaSource={title:populationManifest.referencePublication,url:populationManifest.referencePublicationDoi};
const boundarySources:RussiaSource[]=[{title:'Natural Earth Admin 0 Countries 1:50m v5.1.2・Public domain',url:geography.source.url,note:'固定資料の既定de facto形状。現在の境界や支配状況を確定する図ではありません。クリミアを含む形状とUCDBのUkraine割当を混同せず、国別合計を作りません。'},{title:'Natural Earth係争地レイヤーと境界表示方針',url:'https://www.naturalearthdata.com/about/disputed-boundaries-policy/',note:'クリミア・千島列島の係争区分は同資料の原形状を細い斜線で重ねています。分類・名称は出典に従い、帰属を判断しません。'}];
const giews:RussiaSource={title:'FAO GIEWS Russian Federation Country Brief（2026年4月10日）',url:'https://www.fao.org/giews/countrybrief/country.jsp?code=RUS',note:'年ごとの土壌水分、栽培品目の選択と出荷制度の説明に使用。2020年分布や1991–2020年気候と対象年を混ぜません。'};
const missing:RussiaLegend={label:'未収録・分類なし',color:'#e6e3d6',shape:'missing'};
const zero:RussiaLegend={label:'0（有効値）',color:'#ffffff'};
const agricultureZero:RussiaLegend={label:'0（有効値）',color:'#'+cropManifest.legend.zeroColor};
const disputeLegend:RussiaLegend={label:'資料上の係争区分',color:'#f1efe8',shape:'disputed'};
const intervals=(breaks:number[],colors:string[]):RussiaLegend[]=>colors.map((color,i)=>({color:'#'+color,label:i===0?`0より大〜${breaks[0].toLocaleString()}未満`:i===colors.length-1?`${breaks.at(-1)!.toLocaleString()}以上`:`${breaks[i-1].toLocaleString()}〜${breaks[i].toLocaleString()}未満`}));
const industryColors:Record<string,string>={resource:'#a17436',processing:'#965541',port:'#2e6980',city:'#6d5488'};
const industryNames:Record<string,string>={resource:'資源・加工地域の代表位置',processing:'加工の代表位置',port:'港湾の代表位置',city:'都市・物流の代表位置'};
export const russiaLayers:RussiaLayer[]=[
 {id:'climate',field:'nature',title:'ケッペン＝ガイガー気候区分',period:'1991–2020年',unit:'気候の分類',kind:'raster',image:'/assets/atlas/russia-climate-v1/climate.png',bounds:[18,40,191,83],legend:[...climateClasses.filter(c=>climateDisplayClasses.ids.includes(c.id)).map(c=>({label:`${c.code} ${c.name}`,color:c.color})),missing,disputeLegend],sources:[climateSource],coverage:'0.1°原セルの広域区分。拡大しても情報は細かくなりません。長期気候の分類で、今の天候や年降水量ではありません。',resolution:'元0.1°・補間なし'},
 ...cropManifest.layers.map(l=>({id:l.id,field:'agriculture' as const,title:`${l.title}の収穫面積`,period:'2020年',unit:'ha／元5分セル',kind:'raster' as const,image:`/assets/atlas/russia-crops-v1/${l.image}`,bounds:l.boundsUnwrapped,legend:[...intervals(l.breaks,l.colors),agricultureZero,missing,disputeLegend],sources:[cropSource],coverage:'モデル化した収穫面積で、生産量や現在の農場ではありません。斜線の未収録を栽培ゼロと読み替えません。'})),
 ...livestockManifest.layers.map(l=>({id:l.id,field:'agriculture' as const,title:`${l.title}の推計密度`,period:'2020年',unit:'頭/km²',kind:'raster' as const,image:`/assets/atlas/russia-livestock-v1/${l.image}`,bounds:l.boundsUnwrapped,legend:[...intervals(l.breaks,l.colors),agricultureZero,missing,disputeLegend],sources:[livestockSource,livestockDistribution],coverage:'5分格子のモデル密度。表示範囲の頭数や今の飼育数ではありません。未収録と有効な0を区別します。'})),
 {id:'places',field:'industry',title:'資源・加工、港と都市の代表例',period:'各一次資料の2024–2025年等',unit:'代表位置・数量を表さない',kind:'places',legend:[...new Set(russiaIndustryMarks.map(m=>m.kind))].map(kind=>({label:industryNames[kind],color:industryColors[kind],shape:'diamond' as const})).concat([disputeLegend as any]),sources:russiaIndustryMarks.flatMap(m=>m.sources),coverage:'一次資料で確認した代表例です。都市・地域や港沖の位置を使い、個別施設の正確な位置や全国の生産量・埋蔵量分布を示しません。'},
 {id:'density',field:'population',title:'人口密度と都市中心',period:'2020年',unit:'人/km²・2025年都市範囲',kind:'raster',image:'/assets/atlas/russia-population-v1/overview.png',bounds:[18,40,191,83],legend:[...intervals([1,10,100,500,2000,10000],['f0f1e8','dce8df','b0d2cc','7ab5bb','438b9f','28627f','173b60']),zero,missing,{label:'都市中心の位置',color:'#653e82',shape:'circle'},disputeLegend],sources:[populationSource,urbanSource,ghslReferenceSource],coverage:'元1kmの有効セルを5km平均した2020年モデル人口。未収録は無人を意味しません。都市中心は市の行政境界と異なります。',resolution:'有効元セルの5km平均'},
 {id:'cities',field:'population',title:'都市中心の人口規模',period:'2020年人口／2025年都市範囲',unit:'人・円の面積が人口に比例',kind:'cities',legend:[{label:'100万人',color:'#653e82',shape:'circle',sizePopulation:1000000},{label:'1,000万人',color:'#653e82',shape:'circle',sizePopulation:10000000},disputeLegend],sources:[urbanSource,ghslReferenceSource],coverage:'原本でRussiaに割り当てられた253都市中心。クリミアの都市はUkraine割当のためこの点群に含めません。市の行政人口や全国全人口ではありません。'}
];
const commonSocial='気候や資源だけで暮らしは決まりません。生産設備、交通網、雇用、公共サービスや制度を合わせて読みます。異なる年の資料から、現在の状況を推定して埋めることはしません。';
export const russiaThemes:RussiaTheme[]=[
 {id:'winter-and-south',field:'nature',title:'寒さと南部の生育期',takeaway:'寒冷な国土の中でも、小麦の分布は南部に偏る。生育期の気候に、経営・輸送・市場を加えて読む。',explanation:'気候区分の冷帯・寒帯と、小麦の2020年収穫面積を同じ範囲で確かめます。南西部と西シベリア南部に正の収穫面積がある一方、北東部の未収録を栽培ゼロとは断定できません。長期の気候分類は、播種時期の水分や特定年の天候を直接示す資料ではありません。',social:commonSocial,regionCodes:['west','siberia','far-east'],defaultLayer:'climate',comparisonLayer:'wheat',sources:[climateSource,cropSource,giews]},
 {id:'northern-work',field:'nature',title:'寒冷地の産業と設備',takeaway:'寒冷地にも資源の採掘・加工拠点がある。資源の場所に、設備・交通・働く人を重ねて読む。',explanation:'北部の気候を資源・加工の代表例と並べます。産業点は一次資料で確認した都市・地域や港の代表位置であり、鉱床の広がりや生産量ではありません。地図上の近さだけで輸送経路や因果関係を決めず、地点別の説明と対象年を確かめます。',social:commonSocial,regionCodes:['siberia','far-east'],defaultLayer:'climate',comparisonLayer:'places',sources:[climateSource,...russiaIndustryMarks.flatMap(m=>m.sources)]},
 {id:'wheat-and-water',field:'agriculture',title:'小麦と生育期・出荷',takeaway:'南西部から西シベリア南部の小麦を確かめ、気候と水分、経営・出荷先をつなげて考える。',explanation:'小麦の正の収穫面積があるロストフ付近とオムスク付近を地図で確認できます。色は元5分セルの2020年モデル収穫面積で、収量や国・州の平均ではありません。FAOの2026年4月資料は土壌水分、栽培品目の選択と出荷制度が生産・輸出に関わると説明しています。異なる対象年の説明を現在の生産量の代わりには使いません。',social:commonSocial,regionCodes:['west','siberia'],defaultLayer:'wheat',comparisonLayer:'climate',sources:[cropSource,climateSource,giews]},
 {id:'cattle-and-feed',field:'agriculture',title:'牛と飼料・都市',takeaway:'牛の推計密度と小麦・人口を見比べ、飼料、加工、輸送や市場のつながりを考える。',explanation:'牛は頭/km²、小麦は元5分セルの収穫面積haで、単位も推計方法も違います。分布の重なりは関係を調べる入口です。この資料だけで個々の飼料供給、乳製品工場への出荷、牧畜の方式を特定できません。北東部でも牛の正の値と小麦の未収録があり、資料の未収録を生産の不在と読み替えないことが大切です。',social:commonSocial,regionCodes:['west','siberia','far-east'],defaultLayer:'cattle',comparisonLayer:'density',sources:[livestockSource,livestockDistribution,populationSource]},
 ...russiaIndustryReadings.map(t=>({...t,field:'industry' as const})),
 {id:'western-concentration',field:'population',title:'西の集積と東の都市',takeaway:'人口は西に厚く分布し、シベリア・極東にも都市が点在する。気候に加え、雇用と交通の役割を読む。',explanation:'2020年のモデル人口密度と2025年固定都市範囲内の2020年人口を区別して読みます。モスクワ周辺の連続した人口分布と、ノヴォシビルスク、ヤクーツク、ウラジオストクなど東側の都市中心を確かめます。都市点や人口分布だけから現在の雇用・移動・行政人口を推定せず、産業の一次資料の対象年と役割を合わせて考えます。',social:commonSocial,regionCodes:['west','siberia','far-east'],defaultLayer:'density',comparisonLayer:'places',sources:[populationSource,urbanSource,...russiaIndustryMarks.flatMap(m=>m.sources)]},
 {id:'cities-and-footprint',field:'population',title:'都市の範囲と人口',takeaway:'密度の格子と都市中心の円は、範囲と単位が違う。同じ場所で両方を比べて読む。',explanation:'密度は有効な元1kmセルの5km平均、比例円は2025年に固定された都市中心の範囲内の2020年モデル人口です。都市行政境界、市の人口、全国総人口とは一致しません。原本のRussia割当253都市を保持し、Ukraine割当のクリミアの都市を移していません。境界図と都市の国区分の違いは出典欄にも示しています。',social:commonSocial,regionCodes:['west','siberia','far-east'],defaultLayer:'cities',comparisonLayer:'density',sources:[urbanSource,populationSource]},
];
export function getRussiaTheme(state:{field:RussiaField;theme:string}):RussiaTheme{return russiaThemes.find(t=>t.field===state.field&&t.id===state.theme)??russiaThemes.find(t=>t.field===state.field)!;}
export function getRussiaLayer(id:string,_state?:RussiaState):RussiaLayer{return russiaLayers.find(l=>l.id===id)??russiaLayers[0];}
export function createRussiaState(search:string,field:RussiaField='nature'):RussiaState{
 const query=new URLSearchParams(search),validField=Object.hasOwn(russiaFields,field)?field:'nature',place=russiaRegions.some(r=>r.code===query.get('place'))?query.get('place')!:'all';
 const theme=russiaThemes.find(t=>t.field===validField&&t.id===query.get('theme'))??russiaThemes.find(t=>t.field===validField&&t.regionCodes.includes(place))??getRussiaTheme({field:validField,theme:''});
 const layer=russiaLayers.find(l=>l.field===validField&&l.id===query.get('layer'))?.id??theme.defaultLayer,compareLayer=russiaLayers.some(l=>l.id===query.get('compare'))?query.get('compare')!:theme.comparisonLayer;
 const candidate=query.get('scope'),scope=['all','theme','region'].includes(candidate??'')?candidate as RussiaState['scope']:place==='all'?'all':'region';
 return {field:validField,place,theme:theme.id,layer,compareLayer,scope:scope==='region'&&place==='all'?'all':scope,comparison:query.get('view')==='comparison'};
}
export function russiaFrame(state:RussiaState):number[]{
 if(state.scope==='region')return russiaRegions.find(r=>r.code===state.place)?.extent??[0,0,russiaWidth,russiaHeight];
 if(state.scope==='theme'){const selected=russiaRegions.filter(r=>getRussiaTheme(state).regionCodes.includes(r.code));if(selected.length<3&&selected.length)return russiaFrameForBounds([Math.min(...selected.map(r=>r.bounds[0])),Math.min(...selected.map(r=>r.bounds[1])),Math.max(...selected.map(r=>r.bounds[2])),Math.max(...selected.map(r=>r.bounds[3]))]);}
 return [0,0,russiaWidth,russiaHeight];
}
const escape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const cityNames:Record<string,string>={Moscow:'モスクワ','Saint Petersburg':'サンクトペテルブルク',Novosibirsk:'ノヴォシビルスク',Yakutsk:'ヤクーツク',Vladivostok:'ウラジオストク',Norilsk:'ノリリスク'};
export function renderRussiaLegend(layer:RussiaLayer):string{return layer.legend.map(l=>`<span>${l.sizePopulation?`<svg width="36" height="36" viewBox="-18 -18 36 36" aria-hidden="true"><circle r="${Math.sqrt(l.sizePopulation/15000000)*18}" fill="${l.color}" fill-opacity=".65" stroke="#fff" stroke-width=".5"/></svg>`:`<i class="russia-legend-mark ${l.shape??'square'}" style="--mark:${escape(l.color)}"></i>`}${escape(l.label)}</span>`).join('');}
export function renderRussiaScene(layer:RussiaLayer,state:RussiaState,sceneId='primary',screen={width:640,height:320}):string{
 const frame=russiaFrame(state),scale=1/Math.min(Math.max(screen.width,1)/frame[2],Math.max(screen.height,1)/frame[3]),clip='russia-clip-'+sceneId,missingId='russia-missing-'+sceneId,disputedId='russia-disputed-'+sceneId;
 let marks='';if(layer.kind==='raster'&&layer.image){const b=layer.bounds??[18,40,191,83],[x,y]=projectRussia([b[0],b[3]]),[x2,y2]=projectRussia([b[2],b[1]]);marks+=`<image href="${escape(withBase(layer.image))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" preserveAspectRatio="none" clip-path="url(#${clip})"/>`;}
 const inFrame=(p:number[])=>p[0]>=frame[0]&&p[0]<=frame[0]+frame[2]&&p[1]>=frame[1]&&p[1]<=frame[1]+frame[3];
 const safeStart=(x:number,label:string)=>Math.max(frame[0]+4*scale,Math.min(x,frame[0]+frame[2]-(label.length*14+8)*scale));
 if(layer.kind==='places')for(const m of russiaIndustryMarks){const [x,y]=projectRussia(m.coordinates);if(!inFrame([x,y]))continue;const label=m.name.split('：')[0];marks+=`<path d="M${x} ${y-6*scale}l${6*scale} ${6*scale}l${-6*scale} ${6*scale}l${-6*scale} ${-6*scale}Z" fill="${industryColors[m.kind]}" stroke="#fff" stroke-width="1" vector-effect="non-scaling-stroke"><title>${escape(m.name+'：'+m.note)}</title></path><text x="${safeStart(x+9*scale,label)}" y="${y+4*scale}" font-size="${14*scale}">${escape(label)}</text>`;}
 if(layer.id==='density'||layer.kind==='cities')for(const c of centres.centres){const [x,y]=projectRussia(c.coordinates);if(!inFrame([x,y]))continue;const radius=layer.kind==='cities'?Math.sqrt(c.population/15000000)*18:2.3;marks+=`<circle cx="${x}" cy="${y}" r="${radius*scale}" fill="#653e82" fill-opacity=".65" stroke="#fff" stroke-width=".5" vector-effect="non-scaling-stroke"><title>${escape((cityNames[c.name]??c.name)+'：'+Math.round(c.population).toLocaleString()+'人、2020年・2025年都市範囲')}</title></circle>`;if(cityNames[c.name])marks+=`<text x="${safeStart(x+5*scale,cityNames[c.name])}" y="${y-6*scale}" font-size="${14*scale}">${escape(cityNames[c.name])}</text>`;}
 const regionLabels=layer.kind==='places'||layer.id==='density'||layer.kind==='cities'?'':russiaRegions.filter(r=>state.scope!=='region'||r.code===state.place).map(r=>{const [x,y]=projectRussia(r.label),half=(r.name.length*7+4)*scale,anchor=Math.max(frame[0]+half,Math.min(x,frame[0]+frame[2]-half));return `<text x="${anchor}" y="${y}" text-anchor="middle" font-size="${14*scale}">${escape(r.name)}</text>`;}).join('');
 const inset=state.scope==='all'?'':`<div class="russia-context-inset"><svg viewBox="0 0 ${russiaWidth} ${russiaHeight}" aria-label="全域の中の表示範囲"><path d="${allPath}" fill="#d3dfda"/><rect x="${frame[0]}" y="${frame[1]}" width="${frame[2]}" height="${frame[3]}" fill="none" stroke="#9c3d23" stroke-width="8"/></svg><span>全域の中の表示範囲</span></div>`;
 return `<svg viewBox="${frame.join(' ')}" role="img" aria-label="${escape(layer.title+'・'+(state.scope==='region'?russiaRegions.find(r=>r.code===state.place)?.name:'ロシア全域'))}"><defs><clipPath id="${clip}-frame"><rect x="${frame[0]}" y="${frame[1]}" width="${frame[2]}" height="${frame[3]}"/></clipPath><clipPath id="${clip}"><path d="${allPath}" fill-rule="evenodd" clip-rule="evenodd"/></clipPath><pattern id="${missingId}" width="${7*scale}" height="${7*scale}" patternUnits="userSpaceOnUse"><rect width="${7*scale}" height="${7*scale}" fill="#e6e3d6"/><path d="M0 ${7*scale}L${7*scale} 0" stroke="#b4b2a6" stroke-width=".5" vector-effect="non-scaling-stroke"/></pattern><pattern id="${disputedId}" width="${9*scale}" height="${9*scale}" patternUnits="userSpaceOnUse"><path d="M0 ${9*scale}L${9*scale} 0" stroke="#455d65" stroke-width=".8" vector-effect="non-scaling-stroke"/></pattern></defs><g clip-path="url(#${clip}-frame)"><g class="russia-context">${contexts.map(path=>`<path d="${path}"/>`).join('')}</g><path d="${allPath}" fill="${layer.kind==='raster'?`url(#${missingId})`:'#f8f7ef'}" fill-rule="evenodd"/>${marks}<path d="${allPath}" class="russia-region" fill-rule="evenodd"/>${disputes.map(d=>`<path d="${d.path}" fill="url(#${disputedId})" fill-rule="evenodd" stroke="#455d65" stroke-width=".6" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"><title>${escape(d.name+'：Natural Earthの係争区分')}</title></path>`).join('')}${regionLabels}</g></svg>${inset}`;
}
export function russiaCoverage(layer:RussiaLayer,state:RussiaState):string{
 const region=state.scope==='region'?russiaRegions.find(r=>r.code===state.place):undefined;
 return `${region?region.name+'の学習用表示窓。区分は行政境界ではありません。 ':''}${layer.coverage} 境界は固定資料の区分。係争区分は細い斜線で示し、国計へ集計しません。`;
}
export function getRussiaComparisonReading(state:RussiaState):{message:string;sources:RussiaSource[]}{
 const original=getRussiaLayer(state.layer),compare=getRussiaLayer(state.compareLayer),theme=getRussiaTheme(state),name=state.scope==='region'?russiaRegions.find(r=>r.code===state.place)?.name:'ロシア全域';
 let message=theme.explanation;
 if(state.layer===state.compareLayer)message='同じ分布を同じ範囲で並べています。別の分布を選ぶと、年・単位・範囲を確認しながら比較できます。';
 else if([state.layer,state.compareLayer].includes('cities')&&[state.layer,state.compareLayer].includes('density'))message='格子は有効元セルの5km平均密度、円は2025年固定都市範囲内の2020年人口です。密度の色と円の大きさを同じ量として読みません。クリミアの都市は原本のUkraine割当を維持し、Russiaの253点に移していません。';
 else if([state.layer,state.compareLayer].includes('places'))message='代表産業地点と元の分布を同じ範囲で確かめます。点は全国の全施設・生産量ではありません。資源の所在地に加え、一次資料に示された加工・交通・市場の役割を読みます。年や範囲の違いから現在の移動や輸送経路を推定しません。';
 else if([state.layer,state.compareLayer].includes('climate')&&[state.layer,state.compareLayer].includes('wheat')){const location=state.scope!=='region'?'南西部と西シベリア南部':state.place==='west'?'南西部のロストフ付近':state.place==='siberia'?'西シベリア南部のオムスク・アルタイ付近':'極東のアムール付近';message=`1991–2020年の気候分類と2020年のモデル収穫面積を比べます。${location}の正の収穫面積を確かめ、生育期と水分に経営・輸送・市場を加えて読みます。未収録は栽培ゼロを意味せず、気候区分だけから収量は求められません。`;}
 else if([state.layer,state.compareLayer].includes('cattle')&&[state.layer,state.compareLayer].includes('climate'))message='1991–2020年の気候分類と2020年の牛のモデル密度を比べます。寒冷な区分にも牛の正の値があります。畜種や飼料、飼育設備・輸送・市場の違いを調べる入口であり、気候区分だけから飼育頭数や牧畜方式を決める図ではありません。';
 else if([state.layer,state.compareLayer].includes('cattle')&&[state.layer,state.compareLayer].includes('wheat'))message='2020年の小麦収穫面積（ha／元5分セル）と牛のモデル密度（頭/km²）を比べます。値の大小を直接比べず、正の値・有効な0・未収録を区別して分布の重なりを確かめます。飼料の供給先や牧畜方式をこの2層だけで特定しません。';
 else if([state.layer,state.compareLayer].includes('density')&&[state.layer,state.compareLayer].includes('climate'))message='長期気候の分類と2020年モデル人口の5km平均密度を比べます。同じ気候区分でも人口分布には違いがあります。雇用、交通、公共サービスや歴史を調べるための比較であり、現在の人口や移住の原因をこの2層だけで決めません。';
 else if([state.layer,state.compareLayer].includes('cities'))message='都市中心の円は2025年固定都市範囲内の2020年人口です。もう一方の分布の単位・年・資料範囲と区別して位置関係を確かめます。都市行政人口、農畜産物の出荷先や生産量を円から求めることはできません。';
 else if([state.layer,state.compareLayer].includes('density'))message='人口層は有効元1kmセルの5km平均密度、農畜産層は2020年のモデル分布です。場所の重なりを確かめ、飼料・加工・輸送や市場を調べる入口にします。密度を生産量や出荷先の代用にはせず、未収録を不在と読み替えません。';
 return {message:`${name}：${message}`,sources:[...original.sources,...compare.sources,...theme.sources,...boundarySources]};
}
export const russiaBoundarySources=boundarySources;
