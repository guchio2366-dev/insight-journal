import countries from '../data/atlas/latin-america/country-index.json';
export const latinLearningFields = ['nature','agriculture','industry','population'] as const;
export type LatinLearningField = typeof latinLearningFields[number];
export type LatinLearningScope = 'all'|'central'|'south'|'country';
export interface LatinLearningSelection {field:LatinLearningField;layer:string;place:string;scope:LatinLearningScope;only:boolean;fallback?:boolean;case?:string;section?:string}
export interface LatinLearningState extends LatinLearningSelection {fallback:boolean;source?:LatinLearningSelection}
const scopes:LatinLearningScope[]=['all','central','south','country'];
const places=new Set(countries.map(country=>country.code));
const sourceLayers:Record<LatinLearningField,string[]>={nature:['climate'],agriculture:['all','bana','coff','soyb','cattle'],industry:['ores','manufactures','canal'],population:['spatial','density','population','scale']};
const agricultureAliases:Record<string,string>={banana:'bana',coffee:'coff',soy:'soyb'};
const canonicalLayer=(field:LatinLearningField,value:string|null)=>field==='agriculture'&&value?agricultureAliases[value]??value:value;
const validPlace=(value:string|null)=>value&&places.has(value)?value:'all';
const validScope=(value:string|null,place:string):LatinLearningScope=>scopes.includes(value as LatinLearningScope)&&!(value==='country'&&place==='all')?value as LatinLearningScope:'all';
const validCase=(value:string|null)=>value&&/^[a-z0-9-]{1,60}$/.test(value)?value:undefined;
const sections:Record<LatinLearningField,readonly string[]>={nature:['climate','water','rivers','rainfall','basins','terrain','elevation'],agriculture:['agriculture','forestry'],industry:['industry'],population:['population','ethnicity','religion']};
const validSection=(field:LatinLearningField,value:string|null|undefined)=>value&&sections[field]?.includes(value)&&value!==sections[field][0]?value:undefined;
export function readLatinLearningState(search:string,field:LatinLearningField,allowedLayers:readonly string[],defaultLayer:string):LatinLearningState {
 const params=new URLSearchParams(search),place=validPlace(params.get('place'));
 const requestedLayer=canonicalLayer(field,params.get('layer'));
 const layer=allowedLayers.includes(requestedLayer??'')?requestedLayer!:defaultLayer;
 const state:LatinLearningState={field,layer,place,scope:validScope(params.get('scope'),place),only:params.get('only')==='1'&&place!=='all',fallback:params.get('fallback')==='1'||params.get('renderer')==='svg'};
 if(field==='nature'&&validCase(params.get('case')))state.case=validCase(params.get('case'));
 const section=validSection(field,params.get('section'));if(section)state.section=section;
 const from=params.get('from') as LatinLearningField, sourceLayer=canonicalLayer(from,params.get('sourceLayer'));
 if(latinLearningFields.includes(from)&&sourceLayer&&sourceLayers[from].includes(sourceLayer)){
  const sourcePlace=validPlace(params.get('sourcePlace'));
  state.source={field:from,layer:sourceLayer,place:sourcePlace,scope:validScope(params.get('sourceScope'),sourcePlace),only:params.get('sourceOnly')==='1'&&sourcePlace!=='all',fallback:params.has('sourceFallback')?params.get('sourceFallback')==='1':state.fallback};
  if(from==='nature'&&validCase(params.get('sourceCase')))state.source.case=validCase(params.get('sourceCase'));
  const sourceSection=validSection(from,params.get('sourceSection'));if(sourceSection)state.source.section=sourceSection;
 }
 return state;
}
/** Canonical query string, without a leading '?'. */
export function writeLatinLearningState(state:LatinLearningState):string {
 const params=new URLSearchParams({layer:canonicalLayer(state.field,state.layer)!,place:state.place,scope:state.scope});
 if(state.only&&state.place!=='all')params.set('only','1');
 if(state.fallback)params.set('fallback','1');
 if(state.field==='nature'&&state.case)params.set('case',state.case);
 const section=validSection(state.field,state.section);if(section)params.set('section',section);
 if(state.source){
  params.set('from',state.source.field);params.set('sourceLayer',canonicalLayer(state.source.field,state.source.layer)!);
  params.set('sourcePlace',state.source.place);params.set('sourceScope',state.source.scope);
  params.set('sourceFallback',(state.source.fallback??state.fallback)?'1':'0');
  if(state.source.field==='nature'&&state.source.case)params.set('sourceCase',state.source.case);
  if(state.source.only&&state.source.place!=='all')params.set('sourceOnly','1');
  const sourceSection=validSection(state.source.field,state.source.section);if(sourceSection)params.set('sourceSection',sourceSection);
 }
 return params.toString();
}
export function latinLearningUrl(base:string,state:LatinLearningState):string {
 return `${base.replace(/\/?$/,'/')}${state.field}/?${writeLatinLearningState(state)}`;
}
export function latinSourceReturnUrl(base:string,state:LatinLearningState):string {
 if(!state.source)return latinLearningUrl(base,{...state,source:undefined});
 return latinLearningUrl(base,{...state.source,fallback:state.source.fallback??state.fallback});
}
export function latinComparisonState(state:LatinLearningState,targetField:LatinLearningField,targetLayer:string):LatinLearningState {
 return {field:targetField,layer:targetLayer,place:state.place,scope:state.scope,only:state.only,fallback:state.fallback,
  source:{field:state.field,layer:state.layer,place:state.place,scope:state.scope,only:state.only,fallback:state.fallback,...(state.field==='nature'&&state.case?{case:state.case}:{}),...(state.section?{section:state.section}:{})}};
}
