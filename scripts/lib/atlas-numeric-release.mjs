import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

// Repeated float32 bytes can happen to spell 32 hexadecimal characters. Only
// verified numeric assets may bypass the text-only identifier heuristic.
export function isVerifiedFarmingGrid(name,bytes,manifest){
 const file=manifest?.files?.[name];
 const layer=Object.values(manifest?.regions??{}).flatMap(r=>r.layers??[]).find(l=>l.grid===name);
 if(!layer||!file||manifest?.lookup?.encoding!=='float32-le-gzip')return false;
 if(file.bytes!==bytes.length||file.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('Numeric atlas asset hash mismatch: '+name);
 const data=gunzipSync(bytes);
 if(!Number.isInteger(layer.width)||layer.width<1||!Number.isInteger(layer.height)||layer.height<1||data.length!==layer.width*layer.height*4)throw Error('Numeric atlas asset dimensions mismatch: '+name);
 for(let i=0;i<data.length;i+=4){const v=data.readFloatLE(i);if(!Number.isFinite(v)||(v<0&&v!==manifest.lookup.noData))throw Error('Invalid numeric atlas value: '+name);}
 return true;
}
