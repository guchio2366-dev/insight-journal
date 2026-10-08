import {themeById,type AfricaCoordinate,type AfricaTheme} from './africa-themes.ts';

export type AfricaIndustryLocationKind='resource'|'manufacturing'|'transport'|'city';
export type AfricaIndustryLocation={
 id:string;
 label:string;
 kind:AfricaIndustryLocationKind;
 coordinates:AfricaCoordinate;
 title:string;
 reading:string;
 note:string;
 scope:string;
 sources:readonly {label:string;url:string}[];
 themeId:string;
};

export const africaIndustryLocationOverview={
 title:'資源・製造業と、都市の仕事・交通を読む',
 reading:'銅鉱業と製造業の既存事例に、都市と仕事・交通・公共サービスの事例を重ねます。地図の点を選ぶと、その位置を読む説明と出典が表示されます。',
 scope:'点は事例を読む代表位置です。鉱山・工場・空港の正確な施設位置や境界ではなく、点の数や大きさは生産量・埋蔵量・雇用・都市人口を表しません。点の間を結ぶ輸送路や取引量も収録していません。',
 missing:'収録する資源事例はザンビアの銅です。原油や複数の鉱物の産地・生産量、都市別のサービス業統計は未収録です。都市の事例は立地を読む説明であり、都市別産業構成の統計ではありません。',
 sections:[
  {id:'mineral-manufacturing',label:'銅鉱業・製造業の事例',themeIds:['copperbelt-connections','casablanca-manufacturing']},
  {id:'city-work-connections',label:'都市と仕事・交通の事例',themeIds:['urban-connections','nile-settlements']}
 ]
} as const;

function location(themeId:string,markId:string,kind:AfricaIndustryLocationKind):AfricaIndustryLocation {
 const theme=themeById(themeId);
 if(!theme)throw new Error(`Unknown Africa industry source theme: ${themeId}`);
 const mark=theme.marks.find(item=>item.id===markId);
 if(!mark||mark.coordinates.length!==2||typeof mark.coordinates[0]!=='number'||typeof mark.coordinates[1]!=='number'){
  throw new Error(`Africa industry location must reuse an existing point: ${themeId}/${markId}`);
 }
 return {
  id:mark.id,label:mark.label,kind,coordinates:mark.coordinates as AfricaCoordinate,
  title:theme.title,reading:theme.takeaway,note:mark.note,
  scope:africaIndustryLocationOverview.scope,
  sources:themeSources(theme),themeId:theme.id
 };
}

function themeSources(theme:AfricaTheme){
 return [{label:theme.sourceLabel,url:theme.source},...(theme.evidenceSources??[])];
}

// Reuse only the approved source text and its representative point coordinates.
// Urban readings describe shared geographic relationships, not measurements of
// each city's service economy. No new facility, deposit or transport geometry is
// inferred. The Nile's approximate river line is deliberately not copied here.
export const africaIndustryLocations:readonly AfricaIndustryLocation[]=[
 location('copperbelt-connections','zambia-copperbelt','resource'),
 location('copperbelt-connections','zambia-northwest','resource'),
 location('copperbelt-connections','lusaka','city'),
 location('casablanca-manufacturing','casablanca-industry','manufacturing'),
 location('casablanca-manufacturing','casablanca-airport','transport'),
 location('urban-connections','lagos','city'),
 location('urban-connections','accra','city'),
 location('urban-connections','nairobi','city'),
 location('nile-settlements','cairo','city'),
 location('nile-settlements','alexandria','city'),
 location('nile-settlements','luxor','city')
];

export function africaIndustryLocationById(id:string):AfricaIndustryLocation|undefined {
 return africaIndustryLocations.find(item=>item.id===id);
}
