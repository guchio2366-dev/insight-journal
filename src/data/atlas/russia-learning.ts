import geography from './russia-countries.json';
import disputed from './russia-disputed-areas.json';
import climateClasses from '../../../public/assets/atlas/russia-climate-v1/legend.json';
import climateDisplayClasses from '../../../public/assets/atlas/russia-climate-v1/display-classes.json';
import cropManifest from '../../../public/assets/atlas/russia-crops-v1/manifest.json';
import attribution from '../../../public/assets/atlas/russia-crops-v1/attribution.json';
import livestockManifest from '../../../public/assets/atlas/russia-livestock-v1/manifest.json';
import farmingManifest from '../../../public/assets/atlas/russia-farming-overlay-v1/manifest.json';
import populationManifest from '../../../public/assets/atlas/russia-population-v1/manifest.json';
import centres from '../../../public/assets/atlas/russia-population-v1/centres.json';
import {russiaIndustryMarks,russiaIndustryReadings} from './russia-industry-reading';
import {russiaPath,projectRussia,russiaWidth,russiaHeight,russiaFrameForBounds} from '../../lib/atlas-russia-geometry';
import {withBase} from '../../lib/urls';

export type RussiaField='nature'|'agriculture'|'industry'|'population';
export type RussiaState={field:RussiaField;theme:string;layer:string;place:string;scope:'all'|'theme'|'region';comparison:boolean;compareLayer:string};
export type RussiaSource={title:string;url:string;note?:string};
export type RussiaLegend={label:string;color:string;shape?:'square'|'circle'|'diamond'|'missing'|'disputed';sizePopulation?:number};
export type RussiaLayer={id:string;field:RussiaField;title:string;period:string;unit:string;kind:'raster'|'places'|'cities'|'farming';image?:string;bounds?:number[];legend:RussiaLegend[];sources:RussiaSource[];coverage:string;resolution?:string};
export type RussiaTheme={id:string;field:RussiaField;title:string;takeaway:string;explanation:string;social:string;regionCodes:string[];defaultLayer:string;comparisonLayer:string;sources:RussiaSource[]};
export const russiaFields:Record<RussiaField,{label:string;title:string}>={nature:{label:'自然環境',title:'寒さと生育期、広い国土の違いを読む'},agriculture:{label:'農林畜産業',title:'小麦と牛の分布を、気候・市場とつなぐ'},industry:{label:'主要産業',title:'資源の場所と、加工・港・市場をつなぐ'},population:{label:'人口・社会',title:'西の集積と、シベリア・極東の都市を読む'}};
export const russiaOverviewReadings:Record<RussiaField,{title:string;takeaway:string;explanation:string}>={
 nature:{title:'ロシアの自然環境を読む',takeaway:'欧州側からシベリア・極東までの気候区分を、生育期・水利用・暮らしとのつながりから比べます。',explanation:'1991–2020年の気候区分を全域で表示します。場所やテーマを選ぶと理由の説明に切り替わり、全域の分布は残ります。気候分類は年降水量や現在の天候ではありません。都市の雨温図、水資源、地形・標高の分布資料は未整備です。'},
 agriculture:{title:'ロシアの農林業を読む',takeaway:'小麦の正の収穫面積は南西部のロストフ付近と西シベリア南部のオムスク付近で確認できます。牛も両地域に分布し、東部のヤクーツク付近には低密度の正値があります。',explanation:'寒冷な国土の中で、南部の生育期と水分を小麦の分布に重ねて読みます。設備・経営・輸送・市場も関わり、分布の重なりだけで飼料の供給先は決まりません。2020年のモデル分布で、緑の面は小麦の収穫面積（ha／元5分セル）、青い点の濃さは牛の密度（頭／km²）です。点は個体数ではなく、互いに足せる量でもありません。品目を選ぶとその数量色を強調し、他の分布と表示範囲を残します。輪郭は正の値がある元セルの外周で、実際の農場境界ではありません。保存済み資料は小麦・牛の2品目で、上位10品目の網羅性は未整備です。未収録を栽培・飼育ゼロとは扱いません。林業の分布資料は未整備です。'},
 industry:{title:'ロシアの主要産業を読む',takeaway:'資源・加工地域、都市・物流、港湾の代表位置を、交通・市場・制度とのつながりから比べます。',explanation:'一次資料で位置と役割を確認した代表例を全域で表示します。地点の数や記号の大きさは生産量・埋蔵量・GDP比を示しません。地域やテーマを選ぶと説明が切り替わり、他の代表位置も残ります。施設全数や全国生産量の分布資料は未整備です。'},
 population:{title:'ロシアの人口分布を読む',takeaway:'欧州側の集積とシベリア・極東の居住を、都市・交通・公共サービスとのつながりから比べます。',explanation:'全域の2020年モデル人口密度と都市中心の位置を表示します。密度と都市中心の人口は単位・範囲が異なり、市の行政人口や現在の人口とは一致しません。地域を選んでも他地域の分布は残ります。人種・民族・宗教の分布資料は未整備です。'},
};
const allPath=russiaPath(geography.features.find(f=>f.properties.kind==='russia')!.geometry);
const contexts=geography.features.filter(f=>f.properties.kind==='context').map(f=>russiaPath(f.geometry)).filter(Boolean);
const disputes=disputed.features.map(f=>({name:f.properties.sourceLabel,path:russiaPath(f.geometry)})).filter(f=>f.path);
export const russiaRegions=[
 {code:'west',name:'欧州側・ウラル付近',bounds:[18,40,67,76],label:[43,59],path:allPath,extent:russiaFrameForBounds([18,40,67,76])},
 {code:'siberia',name:'シベリア',bounds:[60,44,130,81],label:[96,61],path:allPath,extent:russiaFrameForBounds([60,44,130,81])},
 {code:'far-east',name:'極東',bounds:[125,42,191,77],label:[153,61],path:allPath,extent:russiaFrameForBounds([125,42,191,77])},
];
// Representative source-cell positions, not farm locations or national rankings.
export const russiaFarmingPlaces=[
 {id:'rostov-wheat',product:'wheat',name:'ロストフ付近',coordinates:[40,47],offset:-38},
 {id:'omsk-wheat',product:'wheat',name:'オムスク付近',coordinates:[73,54],offset:28},
 {id:'ufa-cattle',product:'cattle',name:'ウファ付近',coordinates:[56,54.7],offset:-36},
 {id:'yakutsk-cattle',product:'cattle',name:'ヤクーツク付近',coordinates:[129.7,62],offset:30},
] as const;
export function getRussiaFarmingGeography(layerId:string):string{
 if(layerId==='wheat')return '南西部のロストフ付近と西シベリア南部のオムスク付近に小麦の収穫面積があります。寒冷な国土の中で、南部の生育期と播種時の水分を確かめ、経営・輸送・市場を合わせて読みます。小麦の食用や飼料としての利用を考えるときも、分布の重なりだけでは出荷先を特定できません。';
 if(layerId==='cattle')return '牛の正の密度はウラル南部のウファ付近で確認でき、東部のヤクーツク付近にも低密度の正値があります。飼料を得る条件、冬の飼育設備、加工・輸送・市場を合わせ、肉や乳としての利用との関係を考えます。この地図だけでは個々の牧場の用途や供給先は分かりません。';
 return '南西部と西シベリア南部の小麦は、生育期と水分に経営・輸送・市場を重ねて読みます。牛はウラル南部のウファ付近にも分布し、寒冷な東部にも正の密度があります。小麦の食用・飼料利用と牛の肉・乳の利用を考え、飼料を得る条件や飼育設備との関係を比べます。';
}
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
 {id:'farming-all',field:'agriculture',title:'小麦と牛の分布',period:'2020年',unit:'小麦 ha／元5分セル ・ 牛 頭／km²',kind:'farming',legend:[{label:'小麦の収穫面積（緑の面）',color:'#4f7e3d'},{label:'牛の密度（青い点）',color:'#376d91'},agricultureZero,missing,disputeLegend],sources:[cropSource,livestockSource,livestockDistribution],coverage:'保存済みの小麦・牛の2品目を同時表示。上位10品目の網羅性は未整備です。面と点は別々の単位・数量階級を示し、合計や優劣を表しません。品目を選んでも他の分布を残します。有効な0と未収録はそれぞれの凡例で区別します。'},
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
 {id:'wheat-and-water',field:'agriculture',title:'小麦と生育期・出荷',takeaway:'南西部から西シベリア南部の小麦を確かめ、気候と水分、経営・出荷先をつなげて考える。',explanation:'全域の地図では、小麦の正の収穫面積があるロストフ付近とオムスク付近を確認できます。地域を選んだときは表示窓内の例を読みます。色は元5分セルの2020年モデル収穫面積で、収量や国・州の平均ではありません。FAOの2026年4月資料は土壌水分、栽培品目の選択と出荷制度が生産・輸出に関わると説明しています。異なる対象年の説明を現在の生産量の代わりには使いません。',social:commonSocial,regionCodes:['west','siberia'],defaultLayer:'wheat',comparisonLayer:'climate',sources:[cropSource,climateSource,giews]},
 {id:'cattle-and-feed',field:'agriculture',title:'牛と飼料・都市',takeaway:'牛の推計密度と小麦・人口を見比べ、飼料、加工、輸送や市場のつながりを考える。',explanation:'牛は頭/km²、小麦は元5分セルの収穫面積haで、単位も推計方法も違います。分布の重なりは関係を調べる入口です。この資料だけで個々の飼料供給、乳製品工場への出荷、牧畜の方式を特定できません。北東部でも牛の正の値と小麦の未収録があり、資料の未収録を生産の不在と読み替えないことが大切です。',social:commonSocial,regionCodes:['west','siberia','far-east'],defaultLayer:'cattle',comparisonLayer:'density',sources:[livestockSource,livestockDistribution,populationSource]},
 ...russiaIndustryReadings.map(t=>({...t,field:'industry' as const})),
 {id:'western-concentration',field:'population',title:'西の集積と東の都市',takeaway:'人口は西に厚く分布し、シベリア・極東にも都市が点在する。気候に加え、雇用と交通の役割を読む。',explanation:'2020年のモデル人口密度と2025年固定都市範囲内の2020年人口を区別して読みます。モスクワ周辺の連続した人口分布と、ノヴォシビルスク、ヤクーツク、ウラジオストクなど東側の都市中心を確かめます。都市点や人口分布だけから現在の雇用・移動・行政人口を推定せず、産業の一次資料の対象年と役割を合わせて考えます。',social:commonSocial,regionCodes:['west','siberia','far-east'],defaultLayer:'density',comparisonLayer:'places',sources:[populationSource,urbanSource,...russiaIndustryMarks.flatMap(m=>m.sources)]},
 {id:'cities-and-footprint',field:'population',title:'都市の範囲と人口',takeaway:'密度の格子と都市中心の円は、範囲と単位が違う。同じ場所で両方を比べて読む。',explanation:'密度は有効な元1kmセルの5km平均、比例円は2025年に固定された都市中心の範囲内の2020年モデル人口です。都市行政境界、市の人口、全国総人口とは一致しません。原本のRussia割当253都市を保持し、Ukraine割当のクリミアの都市を移していません。境界図と都市の国区分の違いは出典欄にも示しています。',social:commonSocial,regionCodes:['west','siberia','far-east'],defaultLayer:'cities',comparisonLayer:'density',sources:[urbanSource,populationSource]},
];
export function getRussiaTheme(state:{field:RussiaField;theme:string}):RussiaTheme{return russiaThemes.find(t=>t.field===state.field&&t.id===state.theme)??russiaThemes.find(t=>t.field===state.field)!;}
export function getRussiaLayer(id:string,_state?:RussiaState):RussiaLayer{return russiaLayers.find(l=>l.id===id)??russiaLayers[0];}
export function createRussiaState(search:string,field:RussiaField='nature'):RussiaState{
 const query=new URLSearchParams(search),validField=Object.hasOwn(russiaFields,field)?field:'nature',place=russiaRegions.some(r=>r.code===query.get('place'))?query.get('place')!:'all';
 const theme=russiaThemes.find(t=>t.field===validField&&t.id===query.get('theme'))??russiaThemes.find(t=>t.field===validField&&t.defaultLayer===query.get('layer')&&(place==='all'||t.regionCodes.includes(place)))??russiaThemes.find(t=>t.field===validField&&t.regionCodes.includes(place))??getRussiaTheme({field:validField,theme:''});
 const layer=russiaLayers.find(l=>l.field===validField&&l.id===query.get('layer'))?.id??(validField==='agriculture'?'farming-all':theme.defaultLayer),compareLayer=russiaLayers.some(l=>l.id===query.get('compare'))?query.get('compare')!:theme.comparisonLayer;
 const candidate=query.get('scope'),scope=['all','theme','region'].includes(candidate??'')?candidate as RussiaState['scope']:place==='all'?'all':'region';
 return {field:validField,place,theme:theme.id,layer,compareLayer,scope:scope==='region'&&place==='all'?'all':scope,comparison:query.get('view')==='comparison'};
}
export function russiaFrame(state:RussiaState):number[]{
 if(state.scope==='region')return russiaRegions.find(r=>r.code===state.place)?.extent??[0,0,russiaWidth,russiaHeight];
 if(state.scope==='theme'){const selected=russiaRegions.filter(r=>getRussiaTheme(state).regionCodes.includes(r.code));if(selected.length<3&&selected.length)return russiaFrameForBounds([Math.min(...selected.map(r=>r.bounds[0])),Math.min(...selected.map(r=>r.bounds[1])),Math.max(...selected.map(r=>r.bounds[2])),Math.max(...selected.map(r=>r.bounds[3]))]);}
 return [0,0,russiaWidth,russiaHeight];
}
export function russiaScopeName(state:RussiaState):string{
 if(state.scope==='all')return 'ロシア全域';
 if(state.scope==='region')return russiaRegions.find(r=>r.code===state.place)?.name??'ロシア全域';
 const theme=getRussiaTheme(state),regions=russiaRegions.filter(r=>theme.regionCodes.includes(r.code)).map(r=>r.name);
 return `${theme.title}（${regions.join('、')}）`;
}
const escape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const cityNames:Record<string,string>={Moscow:'モスクワ','Saint Petersburg':'サンクトペテルブルク',Novosibirsk:'ノヴォシビルスク',Yakutsk:'ヤクーツク',Vladivostok:'ウラジオストク',Norilsk:'ノリリスク'};
export function renderRussiaLegend(layer:RussiaLayer):string{
 if(layer.field==='agriculture')return renderRussiaFarmingLegend(layer);
 return layer.legend.map(l=>`<span>${l.sizePopulation?`<svg width="36" height="36" viewBox="-18 -18 36 36" aria-hidden="true"><circle r="${Math.sqrt(l.sizePopulation/15000000)*18}" fill="${l.color}" fill-opacity=".65" stroke="#fff" stroke-width=".5"/></svg>`:`<i class="russia-legend-mark ${l.shape??'square'}" style="--mark:${escape(l.color)}"></i>`}${escape(l.label)}</span>`).join('');
}
export function renderRussiaFarmingKey(layer:RussiaLayer):string{
 return `<span data-farming-key="wheat"><i class="russia-legend-mark ${layer.id==='cattle'?'farming-outline':'square'}" style="--mark:#4f7e3d"></i><strong>小麦</strong> · ${layer.id==='cattle'?'緑の輪郭':'緑の面'}</span><span data-farming-key="cattle"><i class="russia-legend-mark square" style="--mark:#376d91"></i><strong>牛</strong> · ${layer.id==='cattle'?'数量色':'青い点'}<small>名称は代表位置の例</small></span>`;
}
function renderRussiaFarmingLegend(layer:RussiaLayer):string{
 const focusedCattle=layer.id==='cattle';
 const group=(id:string,title:string,items:RussiaLegend[],shape='square',alphas:number[]=[])=>`<section class="russia-farming-legend-group" data-farming-legend="${id}"><h3>${title}</h3><div>${items.map((item,index)=>`<span><i class="russia-legend-mark ${shape}" style="--mark:${escape(item.color)};--mark-opacity:${(alphas[index]??255)/255}"></i>${escape(item.label)}</span>`).join('')}</div></section>`;
 const crop=cropManifest.layers[0],cattle=livestockManifest.layers[0],texture=farmingManifest.layers.find(l=>l.id==='cattle')!;
 const compact=(items:RussiaLegend[])=>items.map(item=>({...item,label:item.label.replace('0より大','0超')}));
 const cropKey=focusedCattle?[{label:'正の収穫面積の輪郭',color:'#'+crop.colors.at(-1)}]:compact(intervals(crop.breaks,crop.colors));
 const cattleKey=compact(intervals(cattle.breaks,focusedCattle?cattle.colors:texture.colors));
 return group('wheat',`小麦 · ha／元5分セル（${focusedCattle?'緑の輪郭':'緑の面'}）`,cropKey,focusedCattle?'farming-outline':'square')
  +group('cattle',`牛 · 頭／km²（${focusedCattle?'数量色':'青い点の濃さ'}）`,cattleKey,focusedCattle?'square':'farming-dot',focusedCattle?[]:texture.alphas)
  +`<p class="russia-farming-status-key"><i class="russia-legend-mark square" style="--mark:#f6f5eb"></i>${focusedCattle?'牛':'小麦'}の白い面＝有効0、<i class="russia-legend-mark missing" style="--mark:#f2f1e8"></i>${focusedCattle?'牛':'小麦'}の灰色斜線＝未収録。${focusedCattle?'小麦の輪郭は正の収穫面積の範囲です。':`<br><i class="russia-legend-mark farming-zero"></i>牛の有効0は点を描きません。<i class="russia-legend-mark farming-missing"></i>薄い逆向き斜線＝牛の未収録。青い点は個体数ではありません。`}輪郭の外を生産ゼロとは判断しません。</p><p class="russia-farming-status-key"><i class="russia-legend-mark disputed" style="--mark:#f1efe8"></i>資料上の係争区分</p>`;
}
export function renderRussiaScene(layer:RussiaLayer,state:RussiaState,sceneId='primary',screen={width:640,height:320}):string{
 const frame=russiaFrame(state),scale=1/Math.min(Math.max(screen.width,1)/frame[2],Math.max(screen.height,1)/frame[3]),clip='russia-clip-'+sceneId,missingId='russia-missing-'+sceneId,disputedId='russia-disputed-'+sceneId;
 let farmingDefs='';
 let marks='';if(layer.kind==='raster'&&layer.image){const b=layer.bounds??[18,40,191,83],[x,y]=projectRussia([b[0],b[3]]),[x2,y2]=projectRussia([b[2],b[1]]);marks+=`<image href="${escape(withBase(layer.image))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" preserveAspectRatio="none" clip-path="url(#${clip})"/>`;}
 if(layer.field==='agriculture'){
  marks='';
  const cattleFocus=layer.id==='cattle',quantity=getRussiaLayer(cattleFocus?'cattle':'wheat');
  const image=(path:string,product:string,mode:string,opacity:number)=>{const [x,y]=projectRussia([18,83]),[x2,y2]=projectRussia([191,40]);return `<image data-farming-product="${product}" data-farming-mode="${mode}" href="${escape(withBase(path))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" opacity="${opacity}" preserveAspectRatio="none" clip-path="url(#${clip})"/>`;};
  marks+=image(quantity.image!,cattleFocus?'cattle':'wheat','quantity',1);
  if(!cattleFocus){
   const [x,y]=projectRussia([18,83]),[x2,y2]=projectRussia([191,40]),maskId=`russia-cattle-missing-${sceneId}`,patternId=maskId+'-pattern',opacity=layer.id==='wheat'?.22:.85;
   farmingDefs=`<mask id="${maskId}" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}"><image href="${escape(withBase('/assets/atlas/russia-farming-overlay-v1/cattle-missing.png'))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" preserveAspectRatio="none"/></mask><pattern id="${patternId}" width="${9*scale}" height="${9*scale}" patternUnits="userSpaceOnUse"><path d="M0 0L${9*scale} ${9*scale}" stroke="#999d92" stroke-opacity=".45" stroke-width=".45" vector-effect="non-scaling-stroke"/></pattern>`;
   marks+=`<g data-farming-product="cattle" data-farming-mode="missing" opacity="${opacity}" clip-path="url(#${clip})"><rect x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" fill="url(#${patternId})" mask="url(#${maskId})"/></g>`;
   marks+=image('/assets/atlas/russia-farming-overlay-v1/cattle-texture.png','cattle','texture',opacity);
  }
  marks+=image('/assets/atlas/russia-farming-overlay-v1/wheat-outline.png','wheat','outline',cattleFocus?.8:layer.id==='wheat'?1:.65);
 }
 const inFrame=(p:number[])=>p[0]>=frame[0]&&p[0]<=frame[0]+frame[2]&&p[1]>=frame[1]&&p[1]<=frame[1]+frame[3];
 const safeStart=(x:number,label:string)=>Math.max(frame[0]+4*scale,Math.min(x,frame[0]+frame[2]-(label.length*14+8)*scale));
 const annotations:number[][]=[];
 if(layer.kind==='places')for(const m of russiaIndustryMarks){const [x,y]=projectRussia(m.coordinates);if(!inFrame([x,y]))continue;const label=m.name.split('：')[0];annotations.push([safeStart(x+9*scale,label),y-16*scale,(label.length*14+8)*scale,24*scale]);marks+=`<path d="M${x} ${y-6*scale}l${6*scale} ${6*scale}l${-6*scale} ${6*scale}l${-6*scale} ${-6*scale}Z" fill="${industryColors[m.kind]}" stroke="#fff" stroke-width="1" vector-effect="non-scaling-stroke"><title>${escape(m.name+'：'+m.note)}</title></path><text x="${safeStart(x+9*scale,label)}" y="${y+4*scale}" font-size="${14*scale}">${escape(label)}</text>`;}
 if(layer.id==='density'||layer.kind==='cities')for(const c of centres.centres){const [x,y]=projectRussia(c.coordinates);if(!inFrame([x,y]))continue;const radius=layer.kind==='cities'?Math.sqrt(c.population/15000000)*18:2.3;marks+=`<circle cx="${x}" cy="${y}" r="${radius*scale}" fill="#653e82" fill-opacity=".65" stroke="#fff" stroke-width=".5" vector-effect="non-scaling-stroke"><title>${escape((cityNames[c.name]??c.name)+'：'+Math.round(c.population).toLocaleString()+'人、2020年・2025年都市範囲')}</title></circle>`;if(cityNames[c.name]){annotations.push([safeStart(x+5*scale,cityNames[c.name]),y-23*scale,(cityNames[c.name].length*14+8)*scale,24*scale]);marks+=`<text x="${safeStart(x+5*scale,cityNames[c.name])}" y="${y-6*scale}" font-size="${14*scale}">${escape(cityNames[c.name])}</text>`;}}
 if(layer.field==='agriculture'){
  for(const place of russiaFarmingPlaces){
   const [x,y]=projectRussia([...place.coordinates]);if(!inFrame([x,y]))continue;
   const crop=place.product==='wheat',color=crop?'#4f7e3d':'#376d91',label=(crop?'小麦':'牛')+'｜'+place.name,width=(label.length*14+18)*scale,height=26*scale;
   const left=Math.max(frame[0]+4*scale,Math.min(x-width/2,frame[0]+frame[2]-width-4*scale));
   let top=Math.max(frame[1]+8*scale,Math.min(y+place.offset*scale-height/2,frame[1]+frame[3]-height-54*scale));
   for(let attempt=0;attempt<=annotations.length;attempt++){
    const obstacle=annotations.find(([bx,by,bw,bh])=>left<bx+bw+4*scale&&left+width+4*scale>bx&&top<by+bh+4*scale&&top+height+4*scale>by);
    if(!obstacle)break;top=Math.max(frame[1]+8*scale,obstacle[1]-height-6*scale);
   }
   annotations.push([left,top,width,height]);
   const opacity=layer.id==='wheat'&&!crop?.55:layer.id==='cattle'&&crop?.7:1;
   const icon=crop?'<path d="M0 7V-7M0-4L-4-7M0 0L-4-3M0 4L-4 1M0-2L4-5M0 2L4-1" fill="none" stroke="currentColor" stroke-width="1.7"/>':'<path d="M-5-3L-8-6M5-3L8-6M-5-2L-8 0M5-2L8 0M-5-3Q0-5 5-3L4 5Q0 8-4 5Z" fill="#eef5f8" stroke="currentColor" stroke-width="1.4"/><circle cx="-2" cy="1" r=".8" fill="currentColor"/><circle cx="2" cy="1" r=".8" fill="currentColor"/>';
   marks+=`<g class="russia-farming-place" data-farming-place="${place.id}" data-place-product="${place.product}" opacity="${opacity}" style="color:${color}"><title>${escape(label+'：2020年の保存格子で正の値がある代表位置。実際の農場境界・全国順位ではありません。')}</title><path d="M${x} ${y}L${left+width/2} ${top+height/2}" stroke="${color}" stroke-width=".8" vector-effect="non-scaling-stroke"/><g transform="translate(${x},${y}) scale(${scale})">${icon}</g><rect x="${left}" y="${top}" width="${width}" height="${height}" rx="${3*scale}" fill="#fffef7" fill-opacity=".92" stroke="${color}" stroke-opacity=".5" stroke-width=".6" vector-effect="non-scaling-stroke"/><text x="${left+width/2}" y="${top+height/2}" text-anchor="middle" dominant-baseline="central" font-size="${14*scale}" fill="${color}">${escape(label)}</text></g>`;
  }
  for(const region of russiaRegions){const [x,y]=projectRussia([region.label[0],region.label[1]+9]);if(inFrame([x,y]))marks+=`<text class="russia-farming-geography-label" x="${x}" y="${y}" text-anchor="middle" font-size="${13*scale}">${escape(region.name)}</text>`;}
 }
  const regionMarkers=(layer.field==='agriculture'?[]:russiaRegions.filter(r=>state.scope==='all'||(state.scope==='region'?r.code===state.place:getRussiaTheme(state).regionCodes.includes(r.code)))).map(r=>{
   const [x,y]=projectRussia(r.label);if(!inFrame([x,y]))return '';
   // Keep selection labels above the nearby city and industry annotations; the geographic dot stays fixed.
   const gaps=layer.kind==='places'?{west:76,siberia:64,'far-east':24}:layer.id==='density'||layer.kind==='cities'?{west:44,siberia:8,'far-east':38}:{west:24,siberia:8,'far-east':24};
   const farming=layer.field==='agriculture',width=(r.name.length*14+(farming?20:28))*scale,height=(farming?28:44)*scale,hitHeight=44*scale,gap=gaps[r.code as keyof typeof gaps]*scale;
   const left=Math.max(frame[0]+4*scale,Math.min(x-width/2,frame[0]+frame[2]-width-4*scale));
   let top=Math.max(frame[1]+4*scale,y-height-gap);
   for(let attempt=0;attempt<=annotations.length;attempt++){
    const obstacle=annotations.find(([bx,by,bw,bh])=>left<bx+bw&&left+width>bx&&top<by+bh&&top+height>by);
    if(!obstacle)break;
    const next=Math.max(frame[1]+4*scale,obstacle[1]-height-4*scale);if(next===top)break;top=next;
   }
   annotations.push([left,top,width,height]);
   const selected=state.place===r.code;
   return `<g class="russia-region-marker${farming?' russia-farming-region-marker':''}" data-selected="${selected}"><path class="russia-region-marker-leader" d="M${x} ${y}L${left+width/2} ${top+height}"/><circle class="russia-region-marker-point" data-map-place="${r.code}" aria-hidden="true" cx="${x}" cy="${y}" r="${4*scale}"/><g data-region-marker data-map-place="${r.code}" role="button" tabindex="0" aria-pressed="${selected}" aria-label="${escape(r.name+'を選ぶ（学習地域）')}"><title>${escape(r.name+'の学習用表示窓を選択。行政境界ではありません。')}</title>${farming?`<rect data-region-hit-area x="${left}" y="${top-(hitHeight-height)/2}" width="${width}" height="${hitHeight}" fill="transparent"/>`:''}<rect class="russia-region-marker-label" x="${left}" y="${top}" width="${width}" height="${height}" rx="${(farming?3:5)*scale}"/><text x="${left+width/2}" y="${top+height/2}" text-anchor="middle" dominant-baseline="central" font-size="${14*scale}">${escape(r.name)}</text></g></g>`;
  }).join('');
 const inset=state.scope==='all'?'':`<div class="russia-context-inset"><svg viewBox="0 0 ${russiaWidth} ${russiaHeight}" aria-label="全域の中の表示範囲"><path d="${allPath}" fill="#d3dfda"/><rect x="${frame[0]}" y="${frame[1]}" width="${frame[2]}" height="${frame[3]}" fill="none" stroke="#9c3d23" stroke-width="8"/></svg><span>全域の中の表示範囲</span></div>`;
 return `<svg viewBox="${frame.join(' ')}" role="group" aria-label="${escape(layer.title+'・'+russiaScopeName(state))}"><defs><clipPath id="${clip}-frame"><rect x="${frame[0]}" y="${frame[1]}" width="${frame[2]}" height="${frame[3]}"/></clipPath><clipPath id="${clip}"><path d="${allPath}" fill-rule="evenodd" clip-rule="evenodd"/></clipPath><pattern id="${missingId}" width="${7*scale}" height="${7*scale}" patternUnits="userSpaceOnUse"><rect width="${7*scale}" height="${7*scale}" fill="${layer.field==='agriculture'?'#f2f1e8':'#e6e3d6'}"/><path d="M0 ${7*scale}L${7*scale} 0" stroke="${layer.field==='agriculture'?'#d3d4c8':'#b4b2a6'}" stroke-width=".5" vector-effect="non-scaling-stroke"/></pattern>${farmingDefs}<pattern id="${disputedId}" width="${9*scale}" height="${9*scale}" patternUnits="userSpaceOnUse"><path d="M0 ${9*scale}L${9*scale} 0" stroke="#455d65" stroke-width=".8" vector-effect="non-scaling-stroke"/></pattern></defs><g clip-path="url(#${clip}-frame)"><g class="russia-context">${contexts.map(path=>`<path d="${path}"/>`).join('')}</g><path d="${allPath}" fill="${layer.kind==='raster'||layer.kind==='farming'?`url(#${missingId})`:'#f8f7ef'}" fill-rule="evenodd"/>${marks}<path d="${allPath}" class="russia-region" fill-rule="evenodd"/>${disputes.map(d=>`<path d="${d.path}" fill="url(#${disputedId})" fill-rule="evenodd" stroke="#455d65" stroke-width=".6" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"><title>${escape(d.name+'：Natural Earthの係争区分')}</title></path>`).join('')}${regionMarkers}</g></svg>${inset}<div class="russia-map-captions"><span class="russia-region-marker-note">${layer.field==='agriculture'?'代表位置の例 · 学習地域は左上で選択':'名称付きマーカーで学習地域を選択（行政境界ではありません）'}</span></div>`;
}
export function russiaCoverage(layer:RussiaLayer,state:RussiaState):string{
 const region=state.scope==='region'?russiaRegions.find(r=>r.code===state.place):undefined;
 return `${region?region.name+'の学習用表示窓。区分は行政境界ではありません。 ':''}${layer.coverage} 境界は固定資料の区分。係争区分は細い斜線で示し、国計へ集計しません。`;
}
export function getRussiaComparisonReading(state:RussiaState):{message:string;sources:RussiaSource[]}{
 const original=getRussiaLayer(state.layer),compare=getRussiaLayer(state.compareLayer),theme=getRussiaTheme(state),name=russiaScopeName(state);
 let message=theme.explanation;
 if(state.layer===state.compareLayer)message='同じ分布を同じ範囲で並べています。別の分布を選ぶと、年・単位・範囲を確認しながら比較できます。';
 else if([state.layer,state.compareLayer].includes('cities')&&[state.layer,state.compareLayer].includes('density'))message='格子は有効元セルの5km平均密度、円は2025年固定都市範囲内の2020年人口です。密度の色と円の大きさを同じ量として読みません。クリミアの都市は原本のUkraine割当を維持し、Russiaの253点に移していません。';
 else if([state.layer,state.compareLayer].includes('places'))message='代表産業地点と元の分布を同じ範囲で確かめます。点は全国の全施設・生産量ではありません。資源の所在地に加え、一次資料に示された加工・交通・市場の役割を読みます。年や範囲の違いから現在の移動や輸送経路を推定しません。';
 else if([state.layer,state.compareLayer].includes('climate')&&[state.layer,state.compareLayer].includes('wheat')){const visible=state.scope==='all'?russiaRegions.map(r=>r.code):state.scope==='region'?[state.place]:theme.regionCodes;const location=visible.includes('west')&&visible.includes('siberia')?'南西部と西シベリア南部':visible.includes('west')?'南西部のロストフ付近':visible.includes('siberia')?'西シベリア南部のオムスク・アルタイ付近':'極東のアムール付近';message=`1991–2020年の気候分類と2020年のモデル収穫面積を比べます。${location}の正の収穫面積を確かめ、生育期と水分に経営・輸送・市場を加えて読みます。未収録は栽培ゼロを意味せず、気候区分だけから収量は求められません。`;}
 else if([state.layer,state.compareLayer].includes('cattle')&&[state.layer,state.compareLayer].includes('climate'))message='1991–2020年の気候分類と2020年の牛のモデル密度を比べます。寒冷な区分にも牛の正の値があります。畜種や飼料、飼育設備・輸送・市場の違いを調べる入口であり、気候区分だけから飼育頭数や牧畜方式を決める図ではありません。';
 else if([state.layer,state.compareLayer].includes('cattle')&&[state.layer,state.compareLayer].includes('wheat'))message='2020年の小麦収穫面積（ha／元5分セル）と牛のモデル密度（頭/km²）を比べます。値の大小を直接比べず、正の値・有効な0・未収録を区別して分布の重なりを確かめます。飼料の供給先や牧畜方式をこの2層だけで特定しません。';
 else if([state.layer,state.compareLayer].includes('density')&&[state.layer,state.compareLayer].includes('climate'))message='長期気候の分類と2020年モデル人口の5km平均密度を比べます。同じ気候区分でも人口分布には違いがあります。雇用、交通、公共サービスや歴史を調べるための比較であり、現在の人口や移住の原因をこの2層だけで決めません。';
 else if([state.layer,state.compareLayer].includes('cities'))message='都市中心の円は2025年固定都市範囲内の2020年人口です。もう一方の分布の単位・年・資料範囲と区別して位置関係を確かめます。都市行政人口、農畜産物の出荷先や生産量を円から求めることはできません。';
 else if([state.layer,state.compareLayer].includes('density'))message='人口層は有効元1kmセルの5km平均密度、農畜産層は2020年のモデル分布です。場所の重なりを確かめ、飼料・加工・輸送や市場を調べる入口にします。密度を生産量や出荷先の代用にはせず、未収録を不在と読み替えません。';
 return {message:`${name}：${message}`,sources:[...original.sources,...compare.sources,...(original.field==='agriculture'||compare.field==='agriculture'?getRussiaLayer('farming-all').sources:[]),...theme.sources,...boundarySources]};
}
export const russiaBoundarySources=boundarySources;
