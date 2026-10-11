import data from '../../../../data-source/atlas/latin-reading/geographic-distributions-20261011.json';
import type {MajorSection} from './culture-major-compositions';
import type {LatinGeometry} from '../../../lib/atlas-latin-america-geometry';
export type GeographicValue={group:string;native:string;percent:number|null};
export type GeographicRegion={id:string;country:string;name:string;year:number;source:string;kind:string;units:string[];denominator:string;note:string;values:GeographicValue[];population?:number;rawCounts?:Record<string,number>;rawPercent?:Record<string,number>};
export const geographicRegions:Record<MajorSection,GeographicRegion[]> = data.regions;
export const geographicSources=data.sources;
export const geographicGeometry=data.geometry as {id:string;country:string;name:string;geometry:LatinGeometry}[];
export const geographicLedger=data.geometryLedger;
export const geographicUnmapped=data.unmapped;
export const geographicRegion=(section:MajorSection,id:string)=>geographicRegions[section].find(r=>r.id===id);
export function geographicSelection(section:MajorSection,choice:string){return choice.startsWith('region:')&&geographicRegion(section,choice.slice(7))?{kind:'region',id:choice.slice(7)}:undefined;}
