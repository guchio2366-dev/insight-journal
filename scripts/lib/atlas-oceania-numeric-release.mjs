import {createHash} from 'node:crypto';
import {isVerifiedFarmingGrid} from './atlas-numeric-release.mjs';

// Only the independently checked fixed Oceania v1 source-derived binary grids
// qualify. Ordinary text, identifiers and all other privacy rules stay active.
const hashes={
 'wheat.values.gz':'f33a98f2b1b6ca87cdb4920c3ea8942afeb129bfc3979dae32fc31d3de1b843a',
 'coconut.values.gz':'a96f2ec26cc15b12d7e38931916b20fedc72942eab819e90ceaa4c601776c98f',
 'cacao.values.gz':'f7fec4ccb2b7a4e537dd08b1bf484e5daaea40d8aa920258784637c75010ef8c'
};
export function isVerifiedOceaniaCropGrid(name,bytes,manifest){
 if(!hashes[name]||manifest?.region!=='oceania'||manifest?.year!==2020||manifest?.source?.sha256!=='34895a332ba7ff9d9732a81fe9da7063458d197f3c72ce3a405329c41f94ade2')return false;
 if(createHash('sha256').update(bytes).digest('hex')!==hashes[name])throw Error('Pinned Oceania numeric asset hash mismatch: '+name);
 const layer=manifest.layers?.find(x=>x.grid===name);
 if(!layer||layer.width!==1680||layer.height!==996||layer.year!==2020||layer.unitEnglish!=='harvested hectares per source cell'||manifest.lookup?.noData!==-1)return false;
 return isVerifiedFarmingGrid(name,bytes,{...manifest,regions:{oceania:{layers:[layer]}}});
}
