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

// Central Asia uses the same measured contours and 250 mm geometry, but a
// regional color key. A 9,750 mm combined-region legend conceals the dry
// lowlands and mountain margins that this focused map is meant to compare.
export const centralRainfallStops=[
 {lower:0,color:'#f7f4e6'},
 {lower:250,color:'#e1e4b9'},
 {lower:500,color:'#bad8a8'},
 {lower:750,color:'#8acdae'},
 {lower:1000,color:'#5dbdb2'},
 {lower:1500,color:'#359ba9'},
 {lower:2000,color:'#286b95'},
] as const;
export function centralRainfallColor(lower:number){
 return [...centralRainfallStops].reverse().find(stop=>lower>=stop.lower)!.color;
}
export function centralRainfallLegend(){
 return centralRainfallStops.map((stop,i)=>({color:stop.color,label:i===centralRainfallStops.length-1?'2,000以上':`${stop.lower.toLocaleString('ja-JP')}–${centralRainfallStops[i+1].lower.toLocaleString('ja-JP')}`}));
}
