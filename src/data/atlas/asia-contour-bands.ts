type ContourPart={file:string;sha256:string;featureCount:number};
export type AsiaContourBands={
 interval:number;breaks:number[];colors:string[];
 labels:{id:string;text:string;value:number;coordinate:[number,number]}[];
 sourceGrid:string;sourceGridSHA256:string;method:string;
} & ({file:string;lineFile:string;bandParts?:never;lineParts?:never}
 | {file?:never;lineFile?:never;bandParts:ContourPart[];lineParts:ContourPart[]});
export function contourBandFiles(bands:AsiaContourBands,kind:'band'|'line'){
 return kind==='band'?(bands.bandParts?.map(part=>part.file)??[bands.file!]):(bands.lineParts?.map(part=>part.file)??[bands.lineFile!]);
}
export function contourBandLabels(bands:AsiaContourBands){
 return bands.colors.map((color,i)=>({color,label:`${bands.breaks[i].toLocaleString('ja-JP')}–${bands.breaks[i+1].toLocaleString('ja-JP')}`}));
}
