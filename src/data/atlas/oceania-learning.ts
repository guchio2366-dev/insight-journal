import geography from './oceania-countries.json';
import {oceaniaNames,oceaniaSourceRegions} from './oceania';
import {oceaniaPath,oceaniaExtent,projectOceania,oceaniaWidth,oceaniaHeight} from '../../lib/atlas-oceania-geometry';
import {withBase} from '../../lib/urls';
import climateClasses from '../../../public/assets/atlas/oceania-climate-v1/legend.json';
import climateDetail from '../../../public/assets/atlas/oceania-climate-v2/manifest.json';
import cropManifest from '../../../public/assets/atlas/oceania-crops-v1/manifest.json';
import livestockManifest from '../../../public/assets/atlas/oceania-livestock-v1/manifest.json';
import farmingManifest from '../../../public/assets/atlas/oceania-farming-overlay-v1/manifest.json';
import populationManifest from '../../../public/assets/atlas/oceania-population-v2/manifest.json';
import cityData from '../../../public/assets/atlas/oceania-population-v1/centres.json';
import mineData from '../../../public/assets/atlas/oceania-industry-v1/mines.json';
import {oceaniaNatureReadings} from './oceania-nature-reading';
import {oceaniaFarmingReadings,oceaniaMapspamAttribution} from './oceania-farming-reading';
import {oceaniaIndustryReadingThemes,oceaniaIndustryRepresentativeMarks} from './oceania-industry-reading';
import {oceaniaPopulationReading} from './oceania-population-reading';
export {oceaniaPopulationReading};

export type OceaniaField='nature'|'agriculture'|'industry'|'population';
export type OceaniaScope='all'|'theme'|'country';
export type OceaniaState={field:OceaniaField;theme:string;layer:string;place:string;scope:OceaniaScope;comparison:boolean;compareLayer:string};
export type OceaniaSource={title:string;url:string;note?:string};
export type OceaniaLegend={label:string;color:string;shape?:'square'|'circle'|'diamond'|'missing'};
export type OceaniaLayer={id:string;field:OceaniaField;title:string;period:string;unit:string;kind:'raster'|'mines'|'places'|'cities'|'industry'|'farming';image?:string;bounds?:number[];legend:OceaniaLegend[];sources:OceaniaSource[];coverage:string;resolution?:string};
export type OceaniaTheme={id:string;field:OceaniaField;title:string;takeaway:string;explanation:string;countryCodes:string[];defaultLayer:string;comparisonLayer:string;sources:OceaniaSource[]};
export const oceaniaFields:Record<OceaniaField,{label:string;title:string}>={
 nature:{label:'自然環境',title:'乾燥する大陸と、湿潤な沿岸・島々'},
 agriculture:{label:'農林畜産業',title:'小麦・家畜・熱帯作物の分布を読む'},
 industry:{label:'主要産業',title:'資源と加工、港と市場をつなげて読む'},
 population:{label:'人口・社会',title:'沿岸の集積と、海を隔てた暮らし'}
};
export const oceaniaCountries=geography.features.filter(f=>f.properties.kind==='oceania').map(f=>({code:f.properties.code,name:oceaniaNames[f.properties.code],region:oceaniaSourceRegions[f.properties.subregion],path:oceaniaPath(f.geometry),extent:oceaniaExtent(f.geometry)})).sort((a,b)=>a.name.localeCompare(b.name,'ja'));
const context=geography.features.filter(f=>f.properties.kind==='context').map(f=>oceaniaPath(f.geometry));
// Country-name anchors use the principal land or named local frame, not an extent centre distorted by remote islands.
const labelCoordinates:Record<string,[number,number]>={AUS:[134,-25],NZL:[173,-41],PNG:[145,-6],FJI:[178,-18],WSM:[188.2,-13.8],KIR:[173,1.45],PYF:[210.5,-17.65]};
const broadClimateIds=[1,2,3,4,5,6,7,8,9,11,12,14,15,16,26,27,29];
const missingLegend:OceaniaLegend={label:'未収録・分類なし',color:'#e6e3d6',shape:'missing'};
const zeroLegend:OceaniaLegend={label:'0（有効値）',color:'#f6f5eb'};
const populationSources:OceaniaSource[]=oceaniaPopulationReading.sources.map(s=>({title:'citation' in s?s.citation:s.title,url:'doi' in s?s.doi:s.url,note:'note' in s?s.note:'period' in s?s.period:undefined}));
const climateLegend=(ids:number[])=>[...climateClasses.filter(c=>ids.includes(c.id)).map(c=>({label:`${c.code} ${c.name}`,color:c.color})),missingLegend];
const intervalLegend=(breaks:number[],colors:string[],unit:string):OceaniaLegend[]=>colors.map((color,i)=>({color:'#'+color,label:i===0?`0より大〜${breaks[0].toLocaleString()}未満`:i===colors.length-1?`${breaks.at(-1)!.toLocaleString()}以上`:`${breaks[i-1].toLocaleString()}〜${breaks[i].toLocaleString()}未満`}));
const climateSource:OceaniaSource={title:'Beck et al. (2023), High-resolution (1 km) Köppen-Geiger maps for 1901–2099, Scientific Data 10, 724. 1991–2020原本・CC BY 4.0',url:'https://doi.org/10.1038/s41597-023-02549-6'};
const cropSource:OceaniaSource={title:oceaniaMapspamAttribution.citation,url:'https://doi.org/10.7910/DVN/SWPENT',note:oceaniaMapspamAttribution.requiredAdaptationText};
const livestockSource:OceaniaSource={title:'FAO (2024), GLW 4: Gridded Livestock Density (Global – 2020 – 10 km). CC BY 4.0',url:'https://data.fao.org/catalog/dataset/9d1e149b-d63f-4213-978b-317a8eb42d02',note:'CGIAR Climate Action Data Hubが2026-06-23に配布した5分格子のZarr（Float32変換版）から2020年推計密度（頭/km²）を抽出。FAOの元TIFF（Float64）とのビット単位の一致を意味しません。密度を頭数には換算していません。'};
const livestockDistribution:OceaniaSource={title:'CGIAR Climate Action Data Hub：GLW4 2020の配布元・変換履歴・Zarr',url:'https://cgiar-climate-data-hub.github.io/catalog/glw4-2020/'};
const populationSource:OceaniaSource={title:(populationManifest as any).populationCitation??'Schiavina, Freire and MacManus (2023), GHS-POP R2023A, population 2020. CC BY 4.0',url:(populationManifest as any).populationDoi??'https://doi.org/10.2905/2FF68A52-5B5B-4A22-8F40-C41DA8332CFE'};
const populationPaper:OceaniaSource={title:'Pesaresi et al. (2024), Advances on the Global Human Settlement Layer by joint assessment of Earth Observation and population survey data',url:'https://doi.org/10.1080/17538947.2024.2390454'};
const urbanSource:OceaniaSource={title:'Mari Rivero et al. (2026), GHS-UCDB R2024A V1.2, JRC. 2020年人口・2025年固定都市範囲。CC BY 4.0',url:'https://doi.org/10.2905/JRC.05RDPR0'};
const mineralGroups=[
 {id:'gold',name:'金・銀',color:'#b78629',match:(v:string)=>v.startsWith('Precious')},
 {id:'iron',name:'鉄鉱石',color:'#934c3c',match:(v:string)=>v==='Iron ore'},
 {id:'coal',name:'石炭',color:'#333f4b',match:(v:string)=>v==='Coal'},
 {id:'base',name:'銅・亜鉛・鉛など',color:'#357f86',match:(v:string)=>v.startsWith('Base metals')},
 {id:'battery',name:'リチウム・ニッケルなど',color:'#716391',match:(v:string)=>v.startsWith('Battery')},
 {id:'other',name:'その他の鉱種',color:'#6e7f4c',match:()=>true}
];
export const oceaniaLayers:OceaniaLayer[]=[
 {id:'climate',field:'nature',title:'ケッペン＝ガイガー気候区分',period:'1991–2020年',unit:'気候の分類',kind:'raster',image:'/assets/atlas/oceania-climate-v1/climate.png',bounds:[110,-58,250,25],legend:climateLegend(broadClimateIds),sources:[climateSource],coverage:'全体は0.1°原本。国の拡大は1km原本の詳細へ切替。一部の小島は原本にも分類がなく、気候を推定して埋めていません。',resolution:'全体0.1°／国の詳細1km'},
 ...cropManifest.layers.map(l=>({id:l.id,field:'agriculture' as const,title:`${l.title}の収穫面積`,period:'2020年',unit:'ha／元5分セル',kind:'raster' as const,image:`/assets/atlas/oceania-crops-v1/${l.image}`,bounds:[110,-58,250,25],legend:[...intervalLegend(l.breaks,l.colors,'ha'),zeroLegend,missingLegend],sources:[cropSource],coverage:'モデル化した収穫面積。作付面積や生産量とは異なります。斜線は未収録、白は有効な0。粗い格子では小島が未収録になる場合があります。'})),
 ...livestockManifest.layers.map(l=>({id:l.id,field:'agriculture' as const,title:`${l.title}の密度`,period:'2020年',unit:'頭／km²',kind:'raster' as const,image:`/assets/atlas/oceania-livestock-v1/${l.image}`,bounds:[110,-58,250,25],legend:[...intervalLegend(l.breaks,l.colors,'頭/km²'),zeroLegend,missingLegend],sources:[livestockSource,livestockDistribution],coverage:'モデル化した家畜密度。斜線は未収録、白は有効な0。太平洋島嶼には欠測が残ります。密度を足して頭数にはしていません。'})),
 {id:'mines',field:'industry',title:'豪州の稼働鉱山と主要鉱種',period:'2025年資料',unit:'地点（生産量ではない）',kind:'mines',legend:mineralGroups.map(g=>({label:g.name,color:g.color,shape:'circle'})),sources:[{title:'Geoscience Australia, Australian Operating Mines Map 2025. CC BY 4.0',url:'https://doi.org/10.26186/150821'}],coverage:'347地点は豪州のみ。鉱種を6群で表示し、元の18区分を保持。点の大きさは生産量・埋蔵量を表しません。'},
 {id:'places',field:'industry',title:'港・加工と島嶼の産業の代表例',period:'各一次資料の時点',unit:'代表地点',kind:'places',legend:[{label:'港・物流の代表',color:'#255c83',shape:'diamond'},{label:'加工・事業地区の代表',color:'#94563c',shape:'diamond'},{label:'都市とサービスの代表',color:'#66528d',shape:'diamond'}],sources:oceaniaIndustryReadingThemes.flatMap(t=>t.sources),coverage:'一次資料で位置を確認した代表地点。施設の全数、現在の稼働状況や生産量を示す分布ではありません。航路や鉱山から港への線は描いていません。'},
 {id:'density',field:'population',title:'人口密度と都市中心',period:'2020年',unit:'人／km²',kind:'raster',image:'/assets/atlas/oceania-population-v2/overview.png',bounds:[110,-58,250,25],legend:[...(populationManifest as any).colors.map((c:string,i:number)=>({color:c.startsWith('#')?c:'#'+c,label:oceaniaPopulationReading.legend[i]})),{label:oceaniaPopulationReading.zeroLabel,color:'#ffffff'},missingLegend,{label:'都市中心の位置',color:'#653e82',shape:'circle' as const}],sources:populationSources.slice(0,4),coverage:'全体と大陸の拡大は有効な1kmセルの5km平均。フィジー・タラワ・タヒチ・サモアは元1km。未収録を無人とは扱いません。都市中心は都市の行政境界と異なります。'},
 {id:'cities',field:'population',title:'都市中心の人口と位置',period:'2020年人口／範囲は2025年固定',unit:'人（都市中心内）',kind:'cities',legend:[{label:'都市中心（円の面積＝人口）',color:'#653e82',shape:'circle'},{label:'未収録は人口0ではない',color:'#e6e3d6',shape:'missing'}],sources:[urbanSource,populationPaper,{title:'GHS-UCDB R2024A user guide',url:'https://doi.org/10.2760/3046391'}],coverage:'62の都市中心を収録。多くの小島は都市中心の定義を満たす対象が未収録です。国全体の人口や居住地全体の代用ではありません。'}
];
oceaniaLayers.push({id:'farming-all',field:'agriculture',title:'小麦・ココナツ・カカオ・羊・牛の全分布',period:'2020年',unit:'作物：ha／元5分セル · 家畜：頭／km²',kind:'farming',legend:[],sources:oceaniaLayers.filter(l=>l.field==='agriculture').flatMap(l=>l.sources),coverage:'保存済み3作物・2畜産を同じ表示窓に重ねます。収穫面積と密度は足し合わせません。全国の上位10品目・順位・網羅性を示すものではありません。未収録を農業ゼロとは扱いません。林業と国別の生産・貿易統計は未整備です。'});
const industryComponents=oceaniaLayers.filter(layer=>layer.field==='industry');
oceaniaLayers.push({id:'industry-all',field:'industry',title:'鉱山・港・加工とサービスの全分布',period:'2025年鉱山資料／代表例は各一次資料の時点',unit:'地点（生産量ではない）',kind:'industry',legend:industryComponents.flatMap(layer=>layer.legend),sources:industryComponents.flatMap(layer=>layer.sources),coverage:industryComponents.map(layer=>layer.coverage).join(' ')});
export const oceaniaThemes:OceaniaTheme[]=[
 ...oceaniaNatureReadings.map(r=>({...r,field:'nature' as const,defaultLayer:'climate',comparisonLayer:r.id==='pacificislands'?'coconut':'wheat'})),
 ...oceaniaFarmingReadings.map(r=>({...r,field:'agriculture' as const,defaultLayer:r.id==='livestock'?'sheep':r.id==='tropical-crops'?'coconut':'wheat',comparisonLayer:'climate'})),
 ...oceaniaIndustryReadingThemes.map((r,i)=>({...r,field:'industry' as const,defaultLayer:i===0?'mines':'places',comparisonLayer:'density'})),
 {id:'coasts',field:'population',title:'沿岸と内陸の居住',takeaway:oceaniaPopulationReading.message,explanation:oceaniaPopulationReading.contexts.australia+' '+oceaniaPopulationReading.contexts['papua-new-guinea'],countryCodes:['AUS','NZL','PNG'],defaultLayer:'density',comparisonLayer:'places',sources:populationSources},
 {id:'island-society',field:'population',title:'海を隔てた島の暮らし',takeaway:oceaniaPopulationReading.takeaway,explanation:oceaniaPopulationReading.contexts.tarawa+' '+oceaniaPopulationReading.contexts.samoa,countryCodes:['FJI','WSM','KIR','PYF','SLB','TON','TUV'],defaultLayer:'density',comparisonLayer:'places',sources:populationSources}
];
export function getOceaniaTheme(state:Pick<OceaniaState,'field'|'theme'>):OceaniaTheme{return oceaniaThemes.find(t=>t.id===state.theme&&t.field===state.field)??oceaniaThemes.find(t=>t.field===state.field)!;}
export function createOceaniaState(search:string,field:OceaniaField='nature'):OceaniaState{
 const q=new URLSearchParams(search);const validField=Object.hasOwn(oceaniaFields,field)?field:'nature';
 const place=oceaniaCountries.some(c=>c.code===q.get('place'))?q.get('place')!:'all';
 const candidateTheme=validField==='agriculture'?(['sheep','cattle'].includes(q.get('layer')??'')?'livestock':['coconut','cacao'].includes(q.get('layer')??'')?'tropical-crops':q.get('layer')==='wheat'?'wheat':null):null;
 const theme=oceaniaThemes.find(t=>t.field===validField&&t.id===candidateTheme)??oceaniaThemes.find(t=>t.field===validField&&t.id===q.get('theme'))??oceaniaThemes.find(t=>t.field===validField&&t.countryCodes.includes(place))??getOceaniaTheme({field:validField,theme:''});
 const candidate=oceaniaLayers.find(l=>l.id===q.get('layer')&&l.field===validField);
 const scope=['all','theme','country'].includes(q.get('scope')??'')?q.get('scope') as OceaniaScope:'all';
 const compare=oceaniaLayers.some(l=>l.id===q.get('compare'))?q.get('compare')!:theme.comparisonLayer;
 return {field:validField,theme:theme.id,layer:candidate?.id??(validField==='industry'?'industry-all':validField==='agriculture'?'farming-all':theme.defaultLayer),place,scope:scope==='country'&&place==='all'?'all':scope,comparison:q.get('view')==='comparison',compareLayer:compare};
}
function rasterDetail(layer:OceaniaLayer,state?:OceaniaState):OceaniaLayer{
 if(!state||state.scope!=='country'||state.place==='all')return layer;
 if(layer.id==='climate'){
  const key=state.place==='KIR'?'kir-tarawa':state.place==='PYF'?'pyf-tahiti':state.place.toLowerCase();const frame=(climateDetail as any).frames?.[key];if(!frame)return layer;
  return {...layer,image:`/assets/atlas/oceania-climate-v2/${frame.image}`,bounds:frame.boundsUnwrapped,legend:climateLegend(frame.actualClassIds),resolution:'1km原本を最近傍表示'};
 }
 if(layer.id==='density'){
  const key:Record<string,string>={AUS:'australia',NZL:'new-zealand',PNG:'papua-new-guinea',FJI:'fiji',KIR:'tarawa',PYF:'tahiti',WSM:'samoa'};const frame=(populationManifest as any).views?.[key[state.place]];if(!frame)return layer;
  return {...layer,image:`/assets/atlas/oceania-population-v2/${frame.image}`,bounds:frame.boundsUnwrapped,resolution:frame.sourceCellKm===1?'元1km':'有効元セルの5km平均'};
 }
 return layer;
}
export function getOceaniaLayer(id:string,state?:OceaniaState):OceaniaLayer{return rasterDetail(oceaniaLayers.find(l=>l.id===id)??oceaniaLayers[0],state);}
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function oceaniaFocusName(state:OceaniaState):string|undefined{
 if(state.scope!=='country')return undefined;
 return ({KIR:'タラワ周辺',PYF:'タヒチ周辺',NZL:'北島・南島周辺'} as Record<string,string>)[state.place];
}
export function oceaniaFrame(state:OceaniaState):number[]{
 if(state.scope==='country'&&['KIR','PYF','NZL'].includes(state.place)){
  const b=state.place==='NZL'?[165.5,-48.5,179.5,-33.5]:(climateDetail as any).frames[state.place==='KIR'?'kir-tarawa':'pyf-tahiti'].boundsUnwrapped;
  const [x,y]=projectOceania([b[0],b[3]]),[x2,y2]=projectOceania([b[2],b[1]]);
  const w=Math.max(x2-x,(y2-y)*oceaniaWidth/oceaniaHeight)*1.12,h=w*oceaniaHeight/oceaniaWidth;return [(x+x2-w)/2,(y+y2-h)/2,w,h];
 }
 let selected=state.scope==='country'?oceaniaCountries.filter(c=>c.code===state.place):state.scope==='theme'?oceaniaCountries.filter(c=>getOceaniaTheme(state).countryCodes.includes(c.code)):[];
 if(!selected.length)return [0,0,oceaniaWidth,oceaniaHeight];
 const x=Math.min(...selected.map(c=>c.extent[0])),y=Math.min(...selected.map(c=>c.extent[1])),x2=Math.max(...selected.map(c=>c.extent[2])),y2=Math.max(...selected.map(c=>c.extent[3]));
 let w=Math.max(x2-x,18),h=Math.max(y2-y,18);w=Math.max(w,h*oceaniaWidth/oceaniaHeight);h=w*oceaniaHeight/oceaniaWidth;return [(x+x2-w*1.12)/2,(y+y2-h*1.12)/2,w*1.12,h*1.12];
}
export function renderOceaniaLegend(layer:OceaniaLayer):string{if(layer.field==='agriculture')return renderOceaniaFarmingLegend(layer);return layer.legend.map(l=>`<span><i class="oceania-legend-mark ${l.shape??'square'}" style="--mark:${escape(l.color)}"></i>${escape(l.label)}</span>`).join('');}
export const oceaniaFarmingPlaces=[
 {id:'wheat-southwest',product:'wheat',country:'AUS',name:'豪州南西部',coordinates:[117,-32],offset:[0,32]},
 {id:'cattle-east',product:'cattle',country:'AUS',name:'豪州東部',coordinates:[149,-25],offset:[0,32]},
 {id:'sheep-nz',product:'sheep',country:'NZL',name:'NZ南島',coordinates:[172,-43.5],offset:[30,30]},
 {id:'cacao-png',product:'cacao',country:'PNG',name:'PNG',coordinates:[145,-5.2],offset:[-58,-36]},
 {id:'coconut-solomon',product:'coconut',country:'SLB',name:'ソロモン',coordinates:[160,-9.5],offset:[62,14]},
] as const;
const farmingTitles:Record<string,string>={wheat:'小麦',coconut:'ココナツ',cacao:'カカオ',sheep:'羊',cattle:'牛'};
const farmingColors:Record<string,string>={wheat:'#4f7e3d',coconut:'#80528e',cacao:'#93542f',sheep:'#a3702e',cattle:'#376d91'};
export function getOceaniaFarmingGeography(layerId:string,place='all'):string{
 const wheat='豪州南西部・南東部の小麦の帯は、雨と水利用、土壌を手がかりに読みます。半乾燥域も含み、気候だけで産地は決まりません。栽培技術と経営に、収穫後の貯蔵・集荷・市場への輸送をつなげて考えます。';
 const livestock='豪州の内陸と周縁部、NZの羊・牛を見比べ、牧草と水、干ばつへの備え、飼料・飼養管理の違いを読みます。加工・流通・販売価格も経営に関わります。羊毛と食肉、牛の乳と肉の用途は、この密度図だけでは分けられません。';
 const tropical='PNG・ソロモン諸島などメラネシアのココナツとカカオを、暖かさや雨、島内の集荷と加工、市場への接続から読みます。カカオは収穫後の発酵・乾燥が品質に関わります。道路・港への実際の輸送経路は描いていません。';
 const newZealand='NZの羊・牛は、豪州の小麦帯とは異なる牧畜のまとまりとして読めます。保存した2020年の家畜密度からは、乳牛と肉牛、羊毛と食肉の内訳も、乳製品・食肉の加工地や輸出先も分かりません。生産から加工・流通へのつながりを考える際は、その違いを別の資料で確かめる必要があります。';
 if(place==='NZL'&&['farming-all','sheep','cattle'].includes(layerId))return newZealand;
 if(layerId==='farming-all'&&['PNG','SLB','VUT','FJI'].includes(place))return tropical;
 if(layerId==='farming-all'&&['AUS','NZL'].includes(place))return wheat+'\n\n'+livestock;
 return layerId==='wheat'?wheat:layerId==='coconut'||layerId==='cacao'?tropical:layerId==='sheep'||layerId==='cattle'?livestock:wheat+'\n\n'+livestock+'\n\n'+tropical;
}
export function renderOceaniaFarmingKey(layer:OceaniaLayer):string{
 return farmingManifest.layers.map(item=>{const quantity=item.id===(layer.id==='farming-all'?'wheat':layer.id),crop=item.kind==='crop';return `<span data-farming-key="${item.id}"><i class="oceania-legend-mark ${quantity?'square':crop?'farming-outline':'farming-dot'}" style="--mark:${farmingColors[item.id]};--mark-opacity:1"></i><strong>${farmingTitles[item.id]}</strong> · ${quantity?'数量色':crop?'輪郭':'点'}</span>`;}).join('');
}
function renderOceaniaFarmingLegend(layer:OceaniaLayer):string{
 const focused=layer.id==='farming-all'?'wheat':layer.id;
 const groups=farmingManifest.layers.map(item=>{
  const quantity=item.id===focused,crop=item.kind==='crop',shape=quantity?'square':crop?'farming-outline':'farming-dot';
  const entries=quantity||!crop?intervalLegend(item.breaks,item.colors,item.unit):[{label:'正の収穫面積の輪郭',color:'#'+item.colors.at(-1)}];
  const alphas='alphas' in item?item.alphas:[];
  return `<section class="oceania-farming-legend-group" data-farming-legend="${item.id}"><h3>${farmingTitles[item.id]} · ${crop?'ha／元5分セル':'頭／km²'}（${quantity?'数量色':crop?'輪郭':'点の濃さ'}）</h3><div>${entries.map((entry,index)=>`<span><i class="oceania-legend-mark ${shape}" style="--mark:${escape(entry.color)};--mark-opacity:${quantity||crop?1:(alphas[index]??255)/255}"></i>${escape(entry.label.replace('0より大','0超'))}</span>`).join('')}</div></section>`;
 });
 return groups.join('')+`<p class="oceania-farming-status-key">${farmingTitles[focused]}の白い面＝有効0、灰色斜線＝未収録。ほかの作物の輪郭は正値の範囲で、外側を生産ゼロとは判断しません。家畜の有効0は点を描きません。薄い逆向き斜線は家畜の未収録です。点は個体数ではなく、元の密度階級を示します。名称は保存格子で正の値がある代表位置の例です。</p>`;
}
function renderOceaniaFarmingMarks(layer:OceaniaLayer,state:OceaniaState,sceneId:string,clip:string,scale:number):{marks:string;defs:string}{
 const frame=oceaniaFrame(state),focused=layer.id==='farming-all'?'wheat':layer.id,cropFocus=['wheat','coconut','cacao'].includes(layer.id);
 const [x,y]=projectOceania([110,25]),[x2,y2]=projectOceania([250,-58]);
 const image=(name:string,product:string,mode:string,opacity:number)=>`<image data-farming-product="${product}" data-farming-mode="${mode}" href="${escape(withBase('/assets/atlas/oceania-farming-overlay-v1/'+name))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" opacity="${opacity}" preserveAspectRatio="none" clip-path="url(#${clip})"/>`;
 const quantity=farmingManifest.layers.find(item=>item.id===focused)!;
 let marks=image(quantity.quantityImage!,focused,'quantity',1),defs='';
 for(const item of farmingManifest.layers){
  if(item.kind==='crop'){marks+=image(item.image,item.id,'outline',item.id===layer.id?1:.75);continue;}
  if(item.id===focused)continue;
  const opacity=cropFocus?.22:.85,mask=`oceania-${item.id}-missing-${sceneId}`,pattern=mask+'-pattern';
  defs+=`<mask id="${mask}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}"><image href="${escape(withBase('/assets/atlas/oceania-farming-overlay-v1/'+item.missingImage))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" preserveAspectRatio="none"/></mask><pattern id="${pattern}" width="${9*scale}" height="${9*scale}" patternUnits="userSpaceOnUse"><path d="M0 0L${9*scale} ${9*scale}" stroke="#999d92" stroke-opacity=".35" stroke-width=".45" vector-effect="non-scaling-stroke"/></pattern>`;
  marks+=`<g data-farming-product="${item.id}" data-farming-mode="missing" opacity="${opacity}" clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" fill="url(#${pattern})" mask="url(#${mask})"/></g>`;
  marks+=image(item.image,item.id,'texture',opacity);
 }
 const boxes:number[][]=[];
 for(const place of oceaniaFarmingPlaces){
  const [px,py]=projectOceania([...place.coordinates]);if(px<frame[0]||px>frame[0]+frame[2]||py<frame[1]||py>frame[1]+frame[3])continue;
  const color=farmingColors[place.product],label=farmingTitles[place.product]+'｜'+place.name,w=(label.length*14+18)*scale,h=26*scale;
  const left=Math.max(frame[0]+4*scale,Math.min(px+place.offset[0]*scale-w/2,frame[0]+frame[2]-w-4*scale));
  let top=Math.max(frame[1]+8*scale,Math.min(py+place.offset[1]*scale-h/2,frame[1]+frame[3]-h-8*scale));
  for(let attempt=0;attempt<=boxes.length;attempt++){const obstacle=boxes.find(([bx,by,bw,bh])=>left<bx+bw+4*scale&&left+w+4*scale>bx&&top<by+bh+4*scale&&top+h+4*scale>by);if(!obstacle)break;top=Math.max(frame[1]+8*scale,obstacle[1]-h-6*scale);}
  boxes.push([left,top,w,h]);
  const icons:Record<string,string>={
   wheat:'<path d="M0 7V-7M0-4L-4-7M0 0L-4-3M0 4L-4 1M0-2L4-5M0 2L4-1" fill="none" stroke="currentColor" stroke-width="1.7"/>',
   coconut:'<path d="M0 7L1-4M1-4Q-6-9-7-3M1-4Q7-9 8-3M1-4Q-2-11 2-9" fill="none" stroke="currentColor" stroke-width="1.6"/>',
   cacao:'<ellipse cx="0" cy="0" rx="4" ry="7" fill="#f8ede7" stroke="currentColor" stroke-width="1.5"/><path d="M0-6V6" stroke="currentColor" stroke-width="1.2"/>',
   sheep:'<path d="M-5-3Q-7-6-3-6Q0-9 3-6Q7-6 5-3L5 4Q0 8-5 4Z" fill="#fff3d8" stroke="currentColor" stroke-width="1.4"/><circle cx="-2" cy="1" r=".8" fill="currentColor"/><circle cx="2" cy="1" r=".8" fill="currentColor"/>',
   cattle:'<path d="M-5-3L-8-6M5-3L8-6M-5-3Q0-5 5-3L4 5Q0 8-4 5Z" fill="#eef5f8" stroke="currentColor" stroke-width="1.4"/><circle cx="-2" cy="1" r=".8" fill="currentColor"/><circle cx="2" cy="1" r=".8" fill="currentColor"/>'
  };
  const annotationOpacity=cropFocus&&place.product!==layer.id?0.32:1;
  marks+=`<g class="oceania-farming-place" data-farming-place="${place.id}" data-place-product="${place.product}" opacity="${annotationOpacity}" style="color:${color}"><title>${escape(label+'：2020年の保存格子で正の値がある代表位置。実際の農場境界・全国順位ではありません。')}</title><path d="M${px} ${py}L${left+w/2} ${top+h/2}" stroke="${color}" stroke-width=".8" vector-effect="non-scaling-stroke"/><g transform="translate(${px},${py}) scale(${scale})">${icons[place.product]}</g><rect x="${left}" y="${top}" width="${w}" height="${h}" rx="${3*scale}" fill="#fffef7" fill-opacity=".92" stroke="${color}" stroke-opacity=".5" stroke-width=".6" vector-effect="non-scaling-stroke"/><text x="${left+w/2}" y="${top+h/2}" text-anchor="middle" dominant-baseline="central" font-size="${14*scale}" fill="${color}">${escape(label)}</text></g>`;
 }
 return {marks,defs};
}

export function renderOceaniaScene(layer:OceaniaLayer,state:OceaniaState,sceneId='primary',screen={width:640,height:350}):string{
 const frame=oceaniaFrame(state),scale=1/Math.min(Math.max(screen.width,1)/frame[2],Math.max(screen.height,1)/frame[3]),clip='oceania-clip-'+sceneId,missing='oceania-missing-'+sceneId;
 const paths=oceaniaCountries.map(c=>`<path d="${c.path}" fill-rule="evenodd" clip-rule="evenodd"/>`).join('');
 let marks='',farmingDefs='';
 if(layer.kind==='raster'&&layer.image){const b=layer.bounds??[110,-58,250,25];const [x,y]=projectOceania([b[0],b[3]]),[x2,y2]=projectOceania([b[2],b[1]]);marks+=`<image href="${escape(withBase(layer.image))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" clip-path="url(#${clip})" preserveAspectRatio="none"/>`;}
 if(layer.field==='agriculture'){const farming=renderOceaniaFarmingMarks(layer,state,sceneId,clip,scale);marks=farming.marks;farmingDefs=farming.defs;}
 if(layer.kind==='mines'||layer.kind==='industry')for(const m of mineData.records){const g=mineralGroups.find(g=>g.match(m.commodity_group))!;const [x,y]=projectOceania([m.longitude,m.latitude]);marks+=`<circle cx="${x}" cy="${y}" r="${3*scale}" fill="${g.color}" stroke="#fff" stroke-width=".6" vector-effect="non-scaling-stroke"><title>${escape(m.name+'：'+m.commodity_group)}</title></circle>`;}
 if(layer.kind==='places'||layer.kind==='industry')for(const m of oceaniaIndustryRepresentativeMarks){const [x,y]=projectOceania(m.coordinates);const color=m.kind==='port'?'#255c83':m.kind==='processing'?'#94563c':'#66528d';marks+=`<path d="M${x} ${y-7*scale}l${7*scale} ${7*scale}l${-7*scale} ${7*scale}l${-7*scale} ${-7*scale}Z" fill="${color}" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"><title>${escape(m.name+'：'+m.note)}</title></path><text x="${x+10*scale}" y="${y+4*scale}" font-size="${14*scale}">${escape(m.name)}</text>`;}
 if(layer.id==='density'||layer.kind==='cities')for(const c of cityData.centres){const [x,y]=projectOceania(c.coordinates);const r=layer.kind==='cities'?Math.sqrt(c.population/5000000)*16:3;marks+=`<circle cx="${x}" cy="${y}" r="${r*scale}" fill="#653e82" fill-opacity=".7" stroke="#fff" stroke-width=".6" vector-effect="non-scaling-stroke"><title>${escape(c.name+'：'+Math.round(c.population).toLocaleString()+'人、2020年・2025年都市範囲')}</title></circle>`;}
 const locators=(layer.field==='agriculture'?[]:oceaniaCountries).filter(c=>c.extent[2]-c.extent[0]<12&&c.extent[3]-c.extent[1]<12).map(c=>`<circle data-map-place="${c.code}" class="oceania-island-locator" cx="${(c.extent[0]+c.extent[2])/2}" cy="${(c.extent[1]+c.extent[3])/2}" r="${4*scale}" aria-label="${escape(c.name+'の位置の目印')}"/>`).join('');
 const inset=state.scope==='country'?`<div class="oceania-context-inset"><svg viewBox="0 0 ${oceaniaWidth} ${oceaniaHeight}" aria-label="オセアニア全体の中の表示範囲">${oceaniaCountries.map(c=>`<path d="${c.path}" fill="${c.code===state.place?'#a15a35':'#d3dfda'}"/>`).join('')}<rect x="${frame[0]}" y="${frame[1]}" width="${frame[2]}" height="${frame[3]}" fill="none" stroke="#9c3d23" stroke-width="8"/></svg><span>全体の中の表示範囲</span></div>`:'';
 const labels=layer.field==='agriculture'?'':state.scope==='country'&&['KIR','PYF'].includes(state.place)?'':oceaniaCountries.filter(c=>state.scope==='country'?c.code===state.place:state.scope==='all'?['AUS','NZL','PNG','FJI','WSM','KIR','PYF'].includes(c.code):getOceaniaTheme(state).countryCodes.includes(c.code)).map(c=>{const [x,y]=labelCoordinates[c.code]?projectOceania(labelCoordinates[c.code]):[(c.extent[0]+c.extent[2])/2,(c.extent[1]+c.extent[3])/2];return x>=frame[0]&&x<=frame[0]+frame[2]&&y>=frame[1]&&y<=frame[1]+frame[3]?`<text x="${x}" y="${y-8*scale}" text-anchor="middle" font-size="${14*scale}">${escape(c.name)}</text>`:'';}).join('');
 return `<svg viewBox="${frame.join(' ')}" role="img" aria-label="${escape(layer.title+'・'+(state.scope==='country'?(oceaniaNames[state.place]??'オセアニア全体'):state.scope==='theme'?getOceaniaTheme(state).title:'オセアニア全体'))}" data-scene="${sceneId}"><defs><clipPath id="${clip}">${paths}</clipPath><pattern id="${missing}" width="${7*scale}" height="${7*scale}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="#e6e3d6"/><path d="M0 ${7*scale}L${7*scale} 0" stroke="#b3b0a3" stroke-width="${scale}"/></pattern>${farmingDefs}</defs>${context.map(p=>`<path d="${p}" class="oceania-context"/>`).join('')}<g fill="${layer.kind==='raster'||layer.kind==='farming'?`url(#${missing})`:'#f0eee3'}">${paths}</g>${marks}${oceaniaCountries.map(c=>`<path ${layer.field==='agriculture'?'':`data-map-place="${c.code}"`} class="oceania-country${c.code===state.place?' is-selected':''}" d="${c.path}" fill-rule="evenodd" aria-label="${escape(c.name+(layer.field==='agriculture'?'の輪郭':'を選ぶ'))}"/>`).join('')}${locators}${labels}</svg>${inset}`;
}
export function oceaniaCoverage(layer:OceaniaLayer,state:OceaniaState):string{
 let text=layer.coverage;const country=oceaniaNames[state.place];
 if(country&&['wheat','coconut','cacao','sheep','cattle'].includes(layer.id)){
  const m=['sheep','cattle'].includes(layer.id)?livestockManifest:cropManifest;const cov=(m.layers.find(l=>l.id===layer.id) as any)?.coverage?.[state.place];
  if(cov?.maskCells===0||cov?.validCells===0)text=`${country}：この粗い格子と境界の診断では有効値を確認できません。生産や家畜が0という意味ではありません。`;
 }
 if(country&&(layer.kind==='cities'||layer.id==='density')){const cov=cityData.countryCoverage[state.place as keyof typeof cityData.countryCoverage];if(cov?.sourceUrbanCentres===0)text+=` ${country}の定義を満たす都市中心は未収録です。人口ゼロを意味しません。`;}
 const focus=oceaniaFocusName(state);if(focus)text=`${country}：${focus}の代表範囲に拡大。離島を含む国・地域全体は「全体」で確認できます。 `+text;
 if(layer.id==='density'&&country){const keys:Record<string,string>={AUS:'australia',NZL:'new-zealand',PNG:'papua-new-guinea',FJI:'fiji',KIR:'tarawa',PYF:'tahiti',WSM:'samoa'};const key=state.scope==='country'?(keys[state.place]??'overview'):'overview';const cov=(populationManifest as any).views[key]?.countryCoverage?.[state.place];if(cov?.landPixels===0)text+=` ${country}は、この表示間隔と陸域境界では島内の画素中心を確保できません。人口ゼロを意味しません。`;}
 return text;
}

export const oceaniaOverviewReadings={
  nature:{title:'オセアニアの自然環境を読む',takeaway:'大陸の乾燥、沿岸の気候、山地と島々を、水利用・暮らしとのつながりから比べます。',explanation:'気候区分の分布を共通の土台にします。地図直下の地域・項目を選ぶと、その場所の自然条件と農業・交通・制度をつなぐ説明に切り替わります。水資源・地形・標高の詳しい分布資料は未整備です。'},
  agriculture:{title:'オセアニアの農林業を読む',takeaway:'小麦、羊・牛、メラネシアの熱帯作物を、自然条件と技術・加工・市場へのつながりから比べます。',explanation:'保存済みの2020年3作物・2畜産を同時表示します。作物はha／元5分セルのモデル収穫面積、家畜は頭／km²のモデル密度です。品目選択ではその数量色を表示し、ほかの作物の正値輪郭と家畜の点を残します。作物選択では家畜を薄くします。輪郭や点は農場境界・個体ではありません。代表名称は保存格子の正値かつ陸域内の例示位置です。白い数量面は有効0、灰色斜線は未収録です。元の数量・年・単位・解像度とCC BY 4.0の帰属を保持し、補間・国計・量の足し合わせは行いません。保存5品目は全国の上位10品目・順位を意味しません。林業、国別生産・貿易・世界シェアと推移は未整備です。'},
  industry:{title:'オセアニアの主要産業を読む',takeaway:'鉱物資源と、加工・港・サービスの代表地点を、交通や市場・協議とのつながりから読みます。',explanation:'豪州の稼働鉱山と島々の加工・港・サービスの代表例を同時に表示します。丸は鉱種別の鉱山、ひし形は港・加工・サービスの代表地点です。地図直下の項目を選ぶと地域の説明に切り替わります。地点の数や記号の大きさは生産量を表しません。'},
  population:{title:'オセアニアの人口分布を読む',takeaway:'沿岸と内陸、大陸と小さな島の居住を、交通・公共サービス・制度と合わせて比べます。',explanation:'人口密度と都市中心を切り替え、地図直下の項目や国・地域を選んで暮らしの背景を読みます。未収録は無人を意味せず、都市中心は国全体の人口の代用ではありません。人種・民族と宗教の地域分布資料は未整備です。'},
 };
