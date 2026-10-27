/** Display classes only: retain every 250 mm source band, contour and lookup value.
 * The checked-in SEA grid starts at 660 mm; only 1.08% of its valid cells are
 * below 1,000 mm. Finer dry classes would obscure the 1,000–4,000 mm differences.
 * The final class is open-ended, not a cap on the original or smoothed values.
 */
export const southeastRainfallBreaks=[1000,1500,2000,2500,3000,4000] as const;
export const southeastRainfallColors=[
 '#e4f0fa','#bfddec','#8fc6e1','#63add2','#4396c2','#1f679e','#0f4679',
] as const;
export const southeastRainfallMissingColor='#d2ceca';

/** Lower bounds are inclusive; upper bounds are exclusive. */
export function southeastRainfallColor(millimetres:number):string{
 if(!Number.isFinite(millimetres)||millimetres<0)return southeastRainfallMissingColor;
 return southeastRainfallColors[southeastRainfallBreaks.filter(value=>millimetres>=value).length];
}

export function southeastRainfallLegend(){
 return southeastRainfallColors.map((color,index)=>{
  const lower=index===0?0:southeastRainfallBreaks[index-1];
  const upper=index<southeastRainfallBreaks.length?southeastRainfallBreaks[index]:null;
  const lo=lower.toLocaleString('ja-JP'),hi=upper?.toLocaleString('ja-JP');
  return {color,lower,upper,
   label:upper===null?`${lo}以上`:index===0?`${hi}未満`:`${lo}以上${hi}未満`,
   shortLabel:upper===null?`${lo}以上`:index===0?`${hi}未満`:`${lo}–${hi}`,
  };
 });
}
