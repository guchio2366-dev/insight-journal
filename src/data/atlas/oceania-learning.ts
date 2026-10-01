import geography from './oceania-countries.json';
import {oceaniaNames,oceaniaSourceRegions} from './oceania';
import {oceaniaPath,oceaniaExtent,projectOceania,oceaniaWidth,oceaniaHeight} from '../../lib/atlas-oceania-geometry';
import {withBase} from '../../lib/urls';
import climateClasses from '../../../public/assets/atlas/oceania-climate-v1/legend.json';
import climateDetail from '../../../public/assets/atlas/oceania-climate-v2/manifest.json';
import cropManifest from '../../../public/assets/atlas/oceania-crops-v1/manifest.json';
import livestockManifest from '../../../public/assets/atlas/oceania-livestock-v1/manifest.json';
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
export type OceaniaLayer={id:string;field:OceaniaField;title:string;period:string;unit:string;kind:'raster'|'mines'|'places'|'cities';image?:string;bounds?:number[];legend:OceaniaLegend[];sources:OceaniaSource[];coverage:string;resolution?:string};
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
const livestockSource:OceaniaSource={title:'GLW4 (2020): Gridded Livestock of the World, sheep and cattle density. CC BY 4.0',url:'https://data.apps.fao.org/catalog/dataset/gridded-livestock-of-the-world-glw4'};
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
 ...livestockManifest.layers.map(l=>({id:l.id,field:'agriculture' as const,title:`${l.title}の密度`,period:'2020年',unit:'頭／km²',kind:'raster' as const,image:`/assets/atlas/oceania-livestock-v1/${l.image}`,bounds:[110,-58,250,25],legend:[...intervalLegend(l.breaks,l.colors,'頭/km²'),zeroLegend,missingLegend],sources:[livestockSource],coverage:'モデル化した家畜密度。斜線は未収録、白は有効な0。太平洋島嶼には欠測が残ります。密度を足して頭数にはしていません。'})),
 {id:'mines',field:'industry',title:'豪州の稼働鉱山と主要鉱種',period:'2025年資料',unit:'地点（生産量ではない）',kind:'mines',legend:mineralGroups.map(g=>({label:g.name,color:g.color,shape:'circle'})),sources:[{title:'Geoscience Australia, Australian Operating Mines Map 2025. CC BY 4.0',url:'https://doi.org/10.26186/150821'}],coverage:'347地点は豪州のみ。鉱種を6群で表示し、元の18区分を保持。点の大きさは生産量・埋蔵量を表しません。'},
 {id:'places',field:'industry',title:'港・加工と島嶼の産業の代表例',period:'各一次資料の時点',unit:'代表地点',kind:'places',legend:[{label:'港・物流の代表',color:'#255c83',shape:'diamond'},{label:'加工・事業地区の代表',color:'#94563c',shape:'diamond'},{label:'都市とサービスの代表',color:'#66528d',shape:'diamond'}],sources:oceaniaIndustryReadingThemes.flatMap(t=>t.sources),coverage:'一次資料で位置を確認した代表地点。施設の全数、現在の稼働状況や生産量を示す分布ではありません。航路や鉱山から港への線は描いていません。'},
 {id:'density',field:'population',title:'人口密度と都市中心',period:'2020年',unit:'人／km²',kind:'raster',image:'/assets/atlas/oceania-population-v2/overview.png',bounds:[110,-58,250,25],legend:[...(populationManifest as any).colors.map((c:string,i:number)=>({color:c.startsWith('#')?c:'#'+c,label:oceaniaPopulationReading.legend[i]})),{label:oceaniaPopulationReading.zeroLabel,color:'#ffffff'},missingLegend,{label:'都市中心の位置',color:'#653e82',shape:'circle' as const}],sources:populationSources.slice(0,4),coverage:'全体と大陸の拡大は有効な1kmセルの5km平均。フィジー・タラワ・タヒチ・サモアは元1km。未収録を無人とは扱いません。都市中心は都市の行政境界と異なります。'},
 {id:'cities',field:'population',title:'都市中心の人口と位置',period:'2020年人口／範囲は2025年固定',unit:'人（都市中心内）',kind:'cities',legend:[{label:'都市中心（円の面積＝人口）',color:'#653e82',shape:'circle'},{label:'未収録は人口0ではない',color:'#e6e3d6',shape:'missing'}],sources:[urbanSource,populationPaper,{title:'GHS-UCDB R2024A user guide',url:'https://doi.org/10.2760/3046391'}],coverage:'62の都市中心を収録。多くの小島は都市中心の定義を満たす対象が未収録です。国全体の人口や居住地全体の代用ではありません。'}
];
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
 const theme=oceaniaThemes.find(t=>t.field===validField&&t.id===q.get('theme'))??oceaniaThemes.find(t=>t.field===validField&&t.countryCodes.includes(place))??getOceaniaTheme({field:validField,theme:''});
 const candidate=oceaniaLayers.find(l=>l.id===q.get('layer')&&l.field===validField);
 const scope=['all','theme','country'].includes(q.get('scope')??'')?q.get('scope') as OceaniaScope:place==='all'?'theme':'country';
 const compare=oceaniaLayers.some(l=>l.id===q.get('compare'))?q.get('compare')!:theme.comparisonLayer;
 return {field:validField,theme:theme.id,layer:candidate?.id??theme.defaultLayer,place,scope:scope==='country'&&place==='all'?'all':scope,comparison:q.get('view')==='comparison',compareLayer:compare};
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
export function oceaniaFrame(state:OceaniaState):number[]{
 if(state.scope==='country'&&['KIR','PYF'].includes(state.place)){
  const b=(climateDetail as any).frames[state.place==='KIR'?'kir-tarawa':'pyf-tahiti'].boundsUnwrapped;
  const [x,y]=projectOceania([b[0],b[3]]),[x2,y2]=projectOceania([b[2],b[1]]);
  const w=Math.max(x2-x,(y2-y)*oceaniaWidth/oceaniaHeight)*1.12,h=w*oceaniaHeight/oceaniaWidth;return [(x+x2-w)/2,(y+y2-h)/2,w,h];
 }
 let selected=state.scope==='country'?oceaniaCountries.filter(c=>c.code===state.place):state.scope==='theme'?oceaniaCountries.filter(c=>getOceaniaTheme(state).countryCodes.includes(c.code)):[];
 if(!selected.length)return [0,0,oceaniaWidth,oceaniaHeight];
 const x=Math.min(...selected.map(c=>c.extent[0])),y=Math.min(...selected.map(c=>c.extent[1])),x2=Math.max(...selected.map(c=>c.extent[2])),y2=Math.max(...selected.map(c=>c.extent[3]));
 let w=Math.max(x2-x,18),h=Math.max(y2-y,18);w=Math.max(w,h*oceaniaWidth/oceaniaHeight);h=w*oceaniaHeight/oceaniaWidth;return [(x+x2-w*1.12)/2,(y+y2-h*1.12)/2,w*1.12,h*1.12];
}
export function renderOceaniaLegend(layer:OceaniaLayer):string{return layer.legend.map(l=>`<span><i class="oceania-legend-mark ${l.shape??'square'}" style="--mark:${escape(l.color)}"></i>${escape(l.label)}</span>`).join('');}
export function renderOceaniaScene(layer:OceaniaLayer,state:OceaniaState,sceneId='primary',screen={width:640,height:350}):string{
 const frame=oceaniaFrame(state),scale=1/Math.min(Math.max(screen.width,1)/frame[2],Math.max(screen.height,1)/frame[3]),clip='oceania-clip-'+sceneId,missing='oceania-missing-'+sceneId;
 const paths=oceaniaCountries.map(c=>`<path d="${c.path}" fill-rule="evenodd" clip-rule="evenodd"/>`).join('');
 let marks='';
 if(layer.kind==='raster'&&layer.image){const b=layer.bounds??[110,-58,250,25];const [x,y]=projectOceania([b[0],b[3]]),[x2,y2]=projectOceania([b[2],b[1]]);marks+=`<image href="${escape(withBase(layer.image))}" x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" clip-path="url(#${clip})" preserveAspectRatio="none"/>`;}
 if(layer.kind==='mines')for(const m of mineData.records){const g=mineralGroups.find(g=>g.match(m.commodity_group))!;const [x,y]=projectOceania([m.longitude,m.latitude]);marks+=`<circle cx="${x}" cy="${y}" r="${3*scale}" fill="${g.color}" stroke="#fff" stroke-width=".6" vector-effect="non-scaling-stroke"><title>${escape(m.name+'：'+m.commodity_group)}</title></circle>`;}
 if(layer.kind==='places')for(const m of oceaniaIndustryRepresentativeMarks){const [x,y]=projectOceania(m.coordinates);const color=m.kind==='port'?'#255c83':m.kind==='processing'?'#94563c':'#66528d';marks+=`<path d="M${x} ${y-7*scale}l${7*scale} ${7*scale}l${-7*scale} ${7*scale}l${-7*scale} ${-7*scale}Z" fill="${color}" stroke="#fff" stroke-width="1.5" vector-effect="non-scaling-stroke"><title>${escape(m.name+'：'+m.note)}</title></path><text x="${x+10*scale}" y="${y+4*scale}" font-size="${14*scale}">${escape(m.name)}</text>`;}
 if(layer.id==='density'||layer.kind==='cities')for(const c of cityData.centres){const [x,y]=projectOceania(c.coordinates);const r=layer.kind==='cities'?Math.sqrt(c.population/5000000)*16:3;marks+=`<circle cx="${x}" cy="${y}" r="${r*scale}" fill="#653e82" fill-opacity=".7" stroke="#fff" stroke-width=".6" vector-effect="non-scaling-stroke"><title>${escape(c.name+'：'+Math.round(c.population).toLocaleString()+'人、2020年・2025年都市範囲')}</title></circle>`;}
 const locators=oceaniaCountries.filter(c=>c.extent[2]-c.extent[0]<12&&c.extent[3]-c.extent[1]<12).map(c=>`<circle data-map-place="${c.code}" class="oceania-island-locator" cx="${(c.extent[0]+c.extent[2])/2}" cy="${(c.extent[1]+c.extent[3])/2}" r="${4*scale}"><title>${escape(c.name+'の位置の目印')}</title></circle>`).join('');
 const inset=state.scope==='country'?`<div class="oceania-context-inset"><svg viewBox="0 0 ${oceaniaWidth} ${oceaniaHeight}" aria-label="オセアニア全体の中の表示範囲">${oceaniaCountries.map(c=>`<path d="${c.path}" fill="${c.code===state.place?'#a15a35':'#d3dfda'}"/>`).join('')}<rect x="${frame[0]}" y="${frame[1]}" width="${frame[2]}" height="${frame[3]}" fill="none" stroke="#9c3d23" stroke-width="8"/></svg><span>全体の中の表示範囲</span></div>`:'';
 const labels=oceaniaCountries.filter(c=>state.scope==='country'?c.code===state.place:state.scope==='all'?['AUS','NZL','PNG','FJI','WSM','KIR','PYF'].includes(c.code):getOceaniaTheme(state).countryCodes.includes(c.code)).map(c=>{const [x,y]=labelCoordinates[c.code]?projectOceania(labelCoordinates[c.code]):[(c.extent[0]+c.extent[2])/2,(c.extent[1]+c.extent[3])/2];return x>=frame[0]&&x<=frame[0]+frame[2]&&y>=frame[1]&&y<=frame[1]+frame[3]?`<text x="${x}" y="${y-8*scale}" text-anchor="middle" font-size="${14*scale}">${escape(c.name)}</text>`:'';}).join('');
 return `<svg viewBox="${frame.join(' ')}" role="img" aria-label="${escape(layer.title+'・'+(oceaniaNames[state.place]??'オセアニア全体'))}" data-scene="${sceneId}"><defs><clipPath id="${clip}">${paths}</clipPath><pattern id="${missing}" width="${7*scale}" height="${7*scale}" patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill="#e6e3d6"/><path d="M0 ${7*scale}L${7*scale} 0" stroke="#b3b0a3" stroke-width="${scale}"/></pattern></defs>${context.map(p=>`<path d="${p}" class="oceania-context"/>`).join('')}<g fill="${layer.kind==='raster'?`url(#${missing})`:'#f0eee3'}">${paths}</g>${marks}${oceaniaCountries.map(c=>`<path data-map-place="${c.code}" class="oceania-country${c.code===state.place?' is-selected':''}" d="${c.path}" fill-rule="evenodd"><title>${escape(c.name)}</title></path>`).join('')}${locators}${labels}</svg>${inset}`;
}
export function oceaniaCoverage(layer:OceaniaLayer,state:OceaniaState):string{
 let text=layer.coverage;const country=oceaniaNames[state.place];
 if(country&&['wheat','coconut','cacao','sheep','cattle'].includes(layer.id)){
  const m=['sheep','cattle'].includes(layer.id)?livestockManifest:cropManifest;const cov=(m.layers.find(l=>l.id===layer.id) as any)?.coverage?.[state.place];
  if(cov?.maskCells===0||cov?.validCells===0)text=`${country}：この粗い格子と境界の診断では有効値を確認できません。生産や家畜が0という意味ではありません。`;
 }
 if(country&&(layer.kind==='cities'||layer.id==='density')){const cov=cityData.countryCoverage[state.place as keyof typeof cityData.countryCoverage];if(cov?.sourceUrbanCentres===0)text+=` ${country}の定義を満たす都市中心は未収録です。人口ゼロを意味しません。`;}
 if(state.scope==='country'&&['KIR','PYF'].includes(state.place))text=`${country}：${state.place==='KIR'?'タラワ':'タヒチ'}周辺の代表範囲に拡大。国・地域全体は「全体」で確認できます。 `+text;
 if(layer.id==='density'&&country){const keys:Record<string,string>={AUS:'australia',NZL:'new-zealand',PNG:'papua-new-guinea',FJI:'fiji',KIR:'tarawa',PYF:'tahiti',WSM:'samoa'};const key=state.scope==='country'?(keys[state.place]??'overview'):'overview';const cov=(populationManifest as any).views[key]?.countryCoverage?.[state.place];if(cov?.landPixels===0)text+=` ${country}は、この表示間隔と陸域境界では島内の画素中心を確保できません。人口ゼロを意味しません。`;}
 return text;
}
