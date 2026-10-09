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
