import retained from '../data/atlas/shared-world-statistics.json';
import type {AsiaFarmObservation,AsiaFarmStatistics} from '../data/atlas/asia-farming';

type WorldObservation={rawValue:string;unit:string;flag:string;note:string|null;archiveSha256:string};
const domains:Record<string,string>={Production_Crops_Livestock:'QCL',Forestry:'FO',Inputs_LandUse:'RL'};
const world=retained.world as Record<string,WorldObservation>;
export function validFarmValue(row:AsiaFarmObservation|undefined):number|null {
 return row&&row.value!==null&&Number.isFinite(row.value)&&row.value>=0&&!['M','L'].includes(row.flag)?row.value:null;
}
/** Require the exact publisher snapshot as well as the observation key. */
export function farmWorldComparison(data:AsiaFarmStatistics,row:AsiaFarmObservation|undefined){
 const value=validFarmValue(row);if(value===null||!row)return null;
 const total=world[`${domains[row.domain]}:${row.item}:${row.elementCode}:${row.year}:${row.unit}`];
 if(!total||['M','L'].includes(total.flag)||total.rawValue.trim()==='')return null;
 const input=data.inputs?.find(source=>source.file===`${row.domain}_E_All_Data_(Normalized).zip`);
 if(input?.sha256!==total.archiveSha256)return null;
 const denominator=Number(total.rawValue);
 if(!Number.isFinite(denominator)||denominator<=0)return null;
 return {value:denominator,rawValue:total.rawValue,flag:total.flag,share:value/denominator*100};
}
