import { mercatorPoint } from './atlas-asia-state.ts';

export type AsiaNumericGrid = { width:number; height:number; bounds3857:number[]; values:Int16Array|Float32Array; noData:number };
export async function decodeAsiaNumericGrid(bytes:Uint8Array, record:{width:number;height:number;bounds3857:number[]}, encoding:'int16'|'float32', noData:number):Promise<AsiaNumericGrid> {
  if (!Number.isInteger(record.width)||!Number.isInteger(record.height)||record.width<1||record.height<1||record.width>4096||record.height>4096) throw Error('Invalid grid dimensions');
  if(record.bounds3857.length!==4||record.bounds3857.some(v=>!Number.isFinite(v))||record.bounds3857[0]>=record.bounds3857[2]||record.bounds3857[1]>=record.bounds3857[3])throw Error('Invalid grid extent');
  const buffer=bytes[0]===0x1f&&bytes[1]===0x8b
    ?await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    :Uint8Array.from(bytes).buffer;
  const size=encoding==='int16'?2:4;
  if(buffer.byteLength!==record.width*record.height*size)throw Error('Grid byte length mismatch');
  const view=new DataView(buffer),values=encoding==='int16'?new Int16Array(record.width*record.height):new Float32Array(record.width*record.height);
  for(let i=0;i<values.length;i++)values[i]=encoding==='int16'?view.getInt16(i*2,true):view.getFloat32(i*4,true);
  return {...record,values,noData};
}
export function readAsiaNumericCell(grid:AsiaNumericGrid,lng:number,lat:number):number|null {
  if(!Number.isFinite(lng)||!Number.isFinite(lat)||Math.abs(lat)>85)return null;
  const [x,y]=mercatorPoint(lng,lat),[west,south,east,north]=grid.bounds3857;
  if(x<west||x>=east||y<=south||y>north)return null;
  const col=Math.floor((x-west)/(east-west)*grid.width),row=Math.floor((north-y)/(north-south)*grid.height);
  const value=grid.values[row*grid.width+col];
  return Number.isFinite(value)&&value!==grid.noData?value:null;
}
