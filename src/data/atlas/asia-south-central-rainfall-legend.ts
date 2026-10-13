import type {AsiaContourBands} from './asia-contour-bands';

// Generated polygons remain at 250 mm intervals. Adjacent intervals with the
// same color are presented once so the legend follows the visual encoding.
export function southCentralRainfallLegend(bands:AsiaContourBands){
 const grouped:{color:string;lower:number;upper:number}[]=[];
 for(let i=0;i<bands.colors.length;i++){
  const last=grouped.at(-1);
  if(last?.color===bands.colors[i])last.upper=bands.breaks[i+1];
  else grouped.push({color:bands.colors[i],lower:bands.breaks[i],upper:bands.breaks[i+1]});
 }
 return grouped.map(({color,lower,upper})=>({color,label:`${lower.toLocaleString('ja-JP')}–${upper.toLocaleString('ja-JP')}`}));
}

// South Asia keeps every 250 mm polygon and contour. Only the display colors
// are grouped, so the very wet mountain margin does not set the whole key.
export const southRainfallStops=[
 {lower:0,color:'#edf6fa'},
 {lower:250,color:'#d2e9f1'},
 {lower:500,color:'#acd6e6'},
 {lower:750,color:'#79bcd9'},
 {lower:1000,color:'#4e9fc9'},
 {lower:1500,color:'#2f7fb6'},
 {lower:2000,color:'#1b5f9c'},
 {lower:3000,color:'#173f75'},
] as const;
export function southRainfallColor(lower:number){
 return [...southRainfallStops].reverse().find(stop=>lower>=stop.lower)!.color;
}
export function southRainfallLegend(){
 return southRainfallStops.map((stop,i)=>({color:stop.color,label:i===southRainfallStops.length-1?'3,000以上':`${stop.lower.toLocaleString('ja-JP')}–${southRainfallStops[i+1].lower.toLocaleString('ja-JP')}`}));
}

// Central Asia uses the same measured contours and 250 mm geometry, but a
// regional color key. A 9,750 mm combined-region legend conceals the dry
// lowlands and mountain margins that this focused map is meant to compare.
export const centralRainfallStops=[
 {lower:0,color:'#f1f8fa'},
 {lower:250,color:'#d9edf4'},
 {lower:500,color:'#b9dcea'},
 {lower:750,color:'#8fc6dd'},
 {lower:1000,color:'#63a9cb'},
 {lower:1500,color:'#397fae'},
 {lower:2000,color:'#245584'},
] as const;
export function centralRainfallColor(lower:number){
 return [...centralRainfallStops].reverse().find(stop=>lower>=stop.lower)!.color;
}
export function centralRainfallLegend(){
 return centralRainfallStops.map((stop,i)=>({color:stop.color,label:i===centralRainfallStops.length-1?'2,000以上':`${stop.lower.toLocaleString('ja-JP')}–${centralRainfallStops[i+1].lower.toLocaleString('ja-JP')}`}));
}
