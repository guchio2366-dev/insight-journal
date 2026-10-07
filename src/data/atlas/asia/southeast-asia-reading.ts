import type {AsiaField} from '../../../lib/atlas-asia-state.ts';
import type {AsiaFocusFieldReading} from '../asia-focus.ts';
import {getAsiaOverview} from '../asia-overview.ts';

// Reuse the existing sourced regional overview rather than a second manuscript.
export function southeastAsiaInitialReadings():Record<AsiaField,AsiaFocusFieldReading>{
 const {reading}=getAsiaOverview('southeast-asia');
 return Object.fromEntries(reading.readings.filter(r=>r.id!=='politics').map(r=>[r.id==='nature'?'natural':r.id,{title:r.title,takeaway:r.paragraphs[0],reading:r.paragraphs.join('\n'),source:r.sources[0]}])) as Record<AsiaField,AsiaFocusFieldReading>;
}
