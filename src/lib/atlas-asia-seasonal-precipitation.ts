/** GPCC monthly normals. Numeric queries always use the original 0.25° cells. */
export const ASIA_SEASONAL_REGION_IDS = ['east-asia', 'southeast-asia', 'south-central-asia'] as const;
export type AsiaSeasonalRegionId = typeof ASIA_SEASONAL_REGION_IDS[number];
export type AsiaSeasonalMonthId = 'm-01'|'m-02'|'m-03'|'m-04'|'m-05'|'m-06'|'m-07'|'m-08'|'m-09'|'m-10'|'m-11'|'m-12';
export const ASIA_SEASONAL_MONTHS = Array.from({length:12}, (_, index) => ({
  id: `m-${String(index + 1).padStart(2, '0')}` as AsiaSeasonalMonthId, month:index + 1, label:`${index + 1}月`,
}));
export const ASIA_SEASONAL_BREAKS = [10, 25, 50, 100, 150, 200, 300] as const;
export const ASIA_SEASONAL_COLORS = ['#f3ead6', '#e2e5c7', '#c8dbc8', '#a6cfcf', '#7ab9cb', '#4c9abd', '#2778a5', '#14537d'] as const;
export const ASIA_SEASONAL_DEFAULT_MONTH:AsiaSeasonalMonthId = 'm-07';
export const ASIA_SEASONAL_SOURCE_SHA256 = '3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5';
export type AsiaSeasonalBounds = [number,number,number,number];
export type AsiaSeasonalCoordinates = [[number,number],[number,number],[number,number],[number,number]];
export type AsiaSeasonalMonthImage = {id:AsiaSeasonalMonthId;month:number;image:string;sha256:string};
export type AsiaSeasonalRegion = {
  width:number;height:number;bounds4326:AsiaSeasonalBounds;imageCoordinates:AsiaSeasonalCoordinates;
  projection:'EPSG:4326';sourceCellDegrees:0.25;firstCellCenter:[number,number];lastCellCenter:[number,number];
  sourceColumnOffset:number;sourceRowOffset:number;rowOrder:'north-to-south';layout:'month-major';noData:-1;
  months:AsiaSeasonalMonthImage[];values:string;valuesSha256:string;uncompressedSha256:string;uncompressedBytes:number;
  display:{width:number;height:number;projection:'EPSG:3857';bounds3857:AsiaSeasonalBounds;resampling:'nearest'};
  countryCodes:string[];countryCoverage:Array<{code:string;sourceCellCenters:number;completeSourceCellCenters:number}>;
};
export type AsiaSeasonalSource = {
  dataset:string;publisher:string;sourceUrl:string;downloadUrl:string;doi:string;period:string;edition:string;
  inputSha256:string;license:string;licenseUrl:string;attribution:string;sourceMethod:string;
  sourceVariable:string;sourceUnit:string;sourceNoData:number;originalResolution:string;
  [key:string]:unknown;
};
export type AsiaSeasonalManifest = {
  schemaVersion:1;period:'1991–2020';unit:'mm/month';months:typeof ASIA_SEASONAL_MONTHS;
  breaks:number[];colors:string[];source:AsiaSeasonalSource;limitations:string[];
  regions:Record<AsiaSeasonalRegionId,AsiaSeasonalRegion>;
  files:Record<string,{sha256:string;bytes:number}>;
  processing:Record<string,unknown>;[key:string]:unknown;
};
export type AsiaSeasonalGrid = {
  width:number;height:number;bounds4326:AsiaSeasonalBounds;sourceCellDegrees:0.25;
  rowOrder:'north-to-south';layout:'month-major';noData:-1;values:Float32Array;
};

export function normalizeAsiaSeasonalMonth(value:unknown):AsiaSeasonalMonthId {
  if (typeof value === 'string' && /^m-(0[1-9]|1[0-2])$/.test(value)) return value as AsiaSeasonalMonthId;
  if ((typeof value === 'number' || typeof value === 'string') && /^(?:0?[1-9]|1[0-2])$/.test(String(value))) {
    return ASIA_SEASONAL_MONTHS[Number(value)-1].id;
  }
  return ASIA_SEASONAL_DEFAULT_MONTH;
}

const object = (value:unknown):value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (left:unknown,right:unknown) => JSON.stringify(left) === JSON.stringify(right);
const hash = (value:unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const safeAsset = (value:unknown) => typeof value === 'string' && /^[a-z0-9-]+(?:\.values\.bin\.gz|\.png)$/.test(value);
const integer = (value:unknown,max:number) => Number.isInteger(value) && Number(value)>0 && Number(value)<=max;
function validateGridMetadata(value:unknown):asserts value is AsiaSeasonalRegion {
  if (!object(value) || !integer(value.width,1440) || !integer(value.height,720)) throw Error('Invalid seasonal grid dimensions');
  const bounds = value.bounds4326;
  if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isFinite)) throw Error('Invalid seasonal grid bounds');
  const [west,south,east,north] = bounds;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north ||
      (east-west)*4 !== value.width || (north-south)*4 !== value.height ||
      bounds.some(coordinate => !Number.isInteger(coordinate*4))) throw Error('Seasonal grid is not aligned to source cells');
  if (value.sourceCellDegrees !== .25 || value.rowOrder !== 'north-to-south' || value.layout !== 'month-major' || value.noData !== -1 || value.projection !== 'EPSG:4326' ||
      !same(value.firstCellCenter,[west+.125,north-.125]) || !same(value.lastCellCenter,[east-.125,south+.125]) ||
      value.sourceColumnOffset !== (west+180)*4 || value.sourceRowOffset !== (90-north)*4 ||
      value.uncompressedBytes !== Number(value.width)*Number(value.height)*12*4) throw Error('Invalid seasonal grid orientation or layout');
}

/** Validate before allocating the numeric cube or selecting asset URLs. */
export function validateAsiaSeasonalManifest(value:unknown):AsiaSeasonalManifest {
  if (!object(value) || value.schemaVersion !== 1 || value.period !== '1991–2020' || value.unit !== 'mm/month' ||
      !same(value.months,ASIA_SEASONAL_MONTHS) || !same(value.breaks,ASIA_SEASONAL_BREAKS) || !same(value.colors,ASIA_SEASONAL_COLORS) ||
      !object(value.source) || value.source.inputSha256 !== ASIA_SEASONAL_SOURCE_SHA256 || value.source.period !== '1991-01-01/2020-12-31' ||
      value.source.license !== 'CC BY 4.0' || value.source.sourceVariable !== 'gpcc_precip' || value.source.sourceUnit !== 'mm/month' ||
      !Array.isArray(value.limitations) || value.limitations.length < 3 || !value.limitations.every(item=>typeof item==='string') ||
      !object(value.regions) || !same(Object.keys(value.regions).sort(),[...ASIA_SEASONAL_REGION_IDS].sort()) || !object(value.files)) throw Error('Invalid seasonal precipitation manifest');
  for (const id of ASIA_SEASONAL_REGION_IDS) {
    const region = value.regions[id]; validateGridMetadata(region);
    const [west,south,east,north] = region.bounds4326;
    if (!same(region.imageCoordinates,[[west,north],[east,north],[east,south],[west,south]]) ||
        !safeAsset(region.values) || !hash(region.valuesSha256) || !hash(region.uncompressedSha256) ||
        !Array.isArray(region.months) || region.months.length !== 12 || !Array.isArray(region.countryCodes) ||
        region.countryCodes.some(code=>typeof code!=='string'||!/^[A-Z]{3}$/.test(code)) || !object(region.display) ||
        !integer(region.display.width,1440) || !integer(region.display.height,1440) || region.display.projection !== 'EPSG:3857' ||
        region.display.resampling !== 'nearest' || !Array.isArray(region.display.bounds3857) || region.display.bounds3857.length !== 4 ||
        !region.display.bounds3857.every(Number.isFinite)) throw Error(`Invalid seasonal assets for ${id}`);
    const earthRadius=6378137, mercator=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))*earthRadius;
    const projected=[west*Math.PI/180*earthRadius,mercator(south),east*Math.PI/180*earthRadius,mercator(north)];
    if (!region.display.bounds3857.every((coordinate,index)=>Math.abs(coordinate-projected[index])<1e-6)) throw Error('Invalid seasonal display projection');
    const assets = [{image:region.values,sha256:region.valuesSha256},...region.months];
    for (let index=0;index<12;index++) {
      const month = region.months[index];
      if (!object(month) || month.id !== ASIA_SEASONAL_MONTHS[index].id || month.month !== index+1 || !safeAsset(month.image) || !hash(month.sha256)) throw Error('Invalid seasonal month images');
    }
    for (const asset of assets) {
      const file=value.files[asset.image];
      if (!object(file) || file.sha256 !== asset.sha256 || !integer(file.bytes,100_000_000)) throw Error('Seasonal asset integrity metadata mismatch');
    }
  }
  return value as AsiaSeasonalManifest;
}

/** Gzip and already-decompressed HTTP payloads use the same explicit LE decoder. */
export async function decodeAsiaSeasonalGrid(bytes:Uint8Array,region:AsiaSeasonalRegion):Promise<AsiaSeasonalGrid> {
  validateGridMetadata(region);
  const buffer = bytes[0]===31 && bytes[1]===139
    ? await new Response(new Blob([Uint8Array.from(bytes)]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    : Uint8Array.from(bytes).buffer;
  if (buffer.byteLength !== region.uncompressedBytes) throw Error('Seasonal grid byte length mismatch');
  if(!hash(region.uncompressedSha256))throw Error('Invalid seasonal grid integrity metadata');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(digest!==region.uncompressedSha256)throw Error('Seasonal grid checksum mismatch');
  const view=new DataView(buffer),values=new Float32Array(region.width*region.height*12);
  for(let index=0;index<values.length;index++) {
    const value=view.getFloat32(index*4,true);
    if (!Number.isFinite(value) || (value<0 && value!==-1)) throw Error('Invalid seasonal precipitation value');
    values[index]=value;
  }
  return {width:region.width,height:region.height,bounds4326:region.bounds4326,sourceCellDegrees:.25,rowOrder:'north-to-south',layout:'month-major',noData:-1,values};
}

export function asiaSeasonalCellAt(grid:AsiaSeasonalGrid,lng:number,lat:number):{column:number;row:number;index:number;center:[number,number]}|null {
  if (!Number.isFinite(lng)||!Number.isFinite(lat)) return null;
  const [west,south,east,north]=grid.bounds4326;
  // Same source convention as GPCC: west/north included, east/south excluded.
  if(lng<west||lng>=east||lat<=south||lat>north)return null;
  const column=Math.floor((lng-west)*4),row=Math.floor((north-lat)*4);
  if(column<0||column>=grid.width||row<0||row>=grid.height)return null;
  return {column,row,index:row*grid.width+column,center:[west+(column+.5)*.25,north-(row+.5)*.25]};
}

export function readAsiaSeasonalSeries(grid:AsiaSeasonalGrid,lng:number,lat:number):Array<number|null>|null {
  const cell=asiaSeasonalCellAt(grid,lng,lat);if(!cell)return null;
  const size=grid.width*grid.height;
  const months=ASIA_SEASONAL_MONTHS.map((_,index)=>{
    const value=grid.values[index*size+cell.index];
    return Number.isFinite(value)&&value>=0?value:null;
  });
  return months.some(value=>value!==null)?months:null;
}

export function readAsiaSeasonalCell(grid:AsiaSeasonalGrid,lng:number,lat:number,month:unknown):number|null {
  const series=readAsiaSeasonalSeries(grid,lng,lat);
  return series?.[Number(normalizeAsiaSeasonalMonth(month).slice(2))-1]??null;
}

export function asiaSeasonalPrecipitationColor(value:number):string|null {
  if(!Number.isFinite(value)||value<0)return null;
  return ASIA_SEASONAL_COLORS[ASIA_SEASONAL_BREAKS.filter(threshold=>value>=threshold).length];
}
