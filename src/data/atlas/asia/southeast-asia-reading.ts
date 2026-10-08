import type {AsiaField} from '../../../lib/atlas-asia-state.ts';
import type {AsiaFocusFieldReading} from '../asia-focus.ts';
import {getAsiaOverview} from '../asia-overview.ts';

// Reuse the existing sourced regional overview rather than a second manuscript.
export function southeastAsiaInitialReadings():Record<AsiaField,AsiaFocusFieldReading>{
 const {reading}=getAsiaOverview('southeast-asia');
 return Object.fromEntries(reading.readings.filter(r=>r.id!=='politics').map(r=>[r.id==='nature'?'natural':r.id,{
  title:r.title,
  takeaway:r.id==='population'?'ジャワ島西部と紅河デルタの人口の濃い帯を、都市の輪郭や産業の国計と分けて読む。':r.paragraphs[0],
  reading:r.paragraphs.join('\n')+(r.id==='population'?'\nジャカルタ、ハノイ、ホーチミン、バンコクの事例で都市の輪郭と周囲の人口格子を比べます。輪郭は行政区域ではなく、人口の色は工場や勤務先を示しません。':''),
  source:r.sources[0],
 }])) as Record<AsiaField,AsiaFocusFieldReading>;
}
