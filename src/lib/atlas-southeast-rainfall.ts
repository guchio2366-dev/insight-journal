/** 250 mm source bands stay unchanged; this ramp gives wet areas a visible range. */
const stops:[number,[number,number,number]][]=[
 [0,[228,240,250]],[2000,[143,198,225]],[4000,[67,150,194]],
 [6000,[31,103,158]],[8000,[15,70,121]],[10000,[7,46,91]],[12250,[1,24,55]],
];

export function southeastRainfallColor(millimetres:number):string{
 const upper=stops.findIndex(([value])=>value>=millimetres);
 if(upper<0)return '#011837';
 if(upper<=0)return '#e4f0fa';
 const [max,b]=stops[upper],[min,a]=stops[upper-1],fraction=(millimetres-min)/(max-min);
 return '#'+a.map((value,index)=>Math.round(value+(b[index]-value)*fraction).toString(16).padStart(2,'0')).join('');
}
