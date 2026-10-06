import {reading,type Reading} from './africa-reading.ts';
import {themeById,type AfricaTheme} from './africa-themes.ts';

export type AfricaRiverId='nile'|'congo';
export type AfricaRiverReading={
 id:AfricaRiverId;
 label:string;
 sourceName:string;
 featureIds:readonly string[];
 reading:Reading;
 theme?:AfricaTheme;
};

export const africaRiverSelectedColor='#165a80';

// These IDs identify existing Natural Earth river/lake centreline features.
// They do not identify catchments, tributaries, or a complete river system.
// Keep the approved explanations and their sources as the original objects.
export const africaRivers:readonly AfricaRiverReading[]=[
 {id:'nile',label:'ナイル川',sourceName:'Nile',featureIds:['ne50-river-0047','ne50-river-0298'],reading:reading.nature.find(item=>item.title==='ナイル：雨と利用できる水を分ける')!,theme:themeById('nile-water')},
 {id:'congo',label:'コンゴ川',sourceName:'Congo',featureIds:['ne50-river-0157','ne50-river-0263'],reading:reading.nature.find(item=>item.title==='コンゴ盆地：湿潤な環境と森林')!},
];

export function africaRiverById(id:string):AfricaRiverReading|undefined {
 return africaRivers.find(river=>river.id===id);
}

export function africaRiverForFeature(feature:{id?:unknown;properties?:Record<string,unknown>}):AfricaRiverReading|undefined {
 const properties=feature.properties??{},id=String(properties.id??feature.id??'');
 return africaRivers.find(river=>river.featureIds.includes(id)&&properties.sourceName===river.sourceName);
}
