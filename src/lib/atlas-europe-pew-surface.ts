import {pew2020EuropeGroups,pew2020EuropeRow} from '../data/atlas/europe/pew-religion-2020.ts';

export const pewSurfaceGroups=['christian','muslim','unaffiliated'] as const;
export type PewSurfaceGroup=(typeof pewSurfaceGroups)[number];
export const pewSurfaceBreaks=[10,25,50,75] as const;
export const pewSurfaceColors:Record<PewSurfaceGroup,readonly string[]>={
  christian:['#e9edf3','#c2d1df','#90adc7','#6089ac','#2d5c85'],
  muslim:['#eaf2ed','#c9dfd0','#9ec7ad','#6ca685','#367954'],
  unaffiliated:['#f2edf2','#dfcddd','#c5a9c3','#a680a5','#754e7b'],
};

/** A country is coloured only when Pew published this group's national share. */
export function pewSurfaceColor(code:string,group:PewSurfaceGroup):string|undefined {
  const row=pew2020EuropeRow(code);
  const index=pew2020EuropeGroups.findIndex(item=>item.id===group);
  if(!row||index<0)return undefined;
  const published=row.shares[index];
  // A reported upper bound belongs in the first class, without claiming 0%.
  if(published==='<0.1')return pewSurfaceColors[group][0];
  const value=Number(published);
  if(!Number.isFinite(value))return undefined;
  let band=0;while(band<pewSurfaceBreaks.length&&value>=pewSurfaceBreaks[band])band++;
  return pewSurfaceColors[group][band];
}
