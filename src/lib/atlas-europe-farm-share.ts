import { europeFarmWorldShare, europeFarmYears, type EuropeFarmStatistics } from '../data/atlas/europe/farming-statistics';
export type EuropeFarmSharePoint = {year:number;value:number|null};
export function europeFarmShareSeries(data:EuropeFarmStatistics,code:string,metric:string):EuropeFarmSharePoint[]{
  return europeFarmYears.map(year=>({year,value:europeFarmWorldShare(data,code,metric,year)?.value??null}));
}
/** Each missing publisher observation terminates the path; it is never a zero. */
export function europeFarmShareSegments(points:EuropeFarmSharePoint[]):EuropeFarmSharePoint[][]{
  const segments:EuropeFarmSharePoint[][]=[];let current:EuropeFarmSharePoint[]=[];
  for(const point of points){
    if(point.value===null){if(current.length)segments.push(current);current=[];}
    else current.push(point);
  }
  if(current.length)segments.push(current);
  return segments;
}
