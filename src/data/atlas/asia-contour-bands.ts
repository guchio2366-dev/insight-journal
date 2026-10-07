export type AsiaContourBands={
 file:string;lineFile:string;interval:number;breaks:number[];colors:string[];
 labels:{id:string;text:string;value:number;coordinate:[number,number]}[];
 sourceGrid:string;sourceGridSHA256:string;method:string;
};
export function contourBandLabels(bands:AsiaContourBands){
 return bands.colors.map((color,i)=>({color,label:`${bands.breaks[i].toLocaleString('ja-JP')}–${bands.breaks[i+1].toLocaleString('ja-JP')}`}));
}
