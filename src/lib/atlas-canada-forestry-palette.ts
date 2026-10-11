/** Display styling only: source class codes and held raster pixels stay untouched. */
export const canadaForestryDisplayPalette={needleleaf:'#254b42',mixed:'#609575',broadleaf:'#a5bf64',taiga:'#e1dba6'} as const;
export function canadaForestryDisplayRgb(id:string){
 const hex=canadaForestryDisplayPalette[id as keyof typeof canadaForestryDisplayPalette];
 if(!hex)throw new Error('Unknown Canada forest class '+id);
 return [1,3,5].map(index=>parseInt(hex.slice(index,index+2),16));
}
export function canadaForestryColorFilter(id:string){
 const rgb=canadaForestryDisplayRgb(id).map(value=>value/255);
 return `0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 1 0`;
}
