import {decodeWestGrid} from './atlas-west-asia-state.mjs';

export const westAnnualPrecipitationId='annual-precipitation';
export const westPrecipitationManifestPath='../west-asia-precipitation-v1/manifest.json';
const bounds=[23,10,64,45];
const inputSha256='3bd80d05df52572f6409b594ae26b43e9045147cb3c25254cddb5a934c16e5c5';
const validHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const same=(left,right)=>Array.isArray(left)&&left.length===right.length&&left.every((value,i)=>value===right[i]);

/** Extend the runtime copy only; the existing West Asia publisher snapshot stays intact. */
export function westPrecipitationLayer(manifest,data){
 const lookup=manifest?.lookup,files=manifest?.files;
 if(manifest?.schemaVersion!==1||manifest.inputSha256!==inputSha256||manifest.inputMd5!=='d701c717e08ce6ad457c9f4004984d65'||manifest.period!=='1991-01-01/2020-12-31'||manifest.edition!=='2025'||manifest.originalResolution!=='0.25° regular latitude/longitude grid'||manifest.license!=='CC BY 4.0'||!same(manifest.bounds,bounds)||!same(data?.bounds,bounds)||manifest.width!==1000||manifest.height!==987||data.width!==1000||data.height!==987||lookup?.width!==1000||lookup.height!==987||lookup.encoding!=='little-endian float32 row-major gzip'||lookup.nodata!==-1||lookup.uncompressedBytes!==1000*987*4||!validHash(lookup.uncompressedSha256))throw Error('西アジアの年降水量の出典・格子契約を確認できませんでした。');
 if(!same(manifest.breaks,[100,250,500,750,1000,1500,2000])||!same(manifest.colors,['#f3ead6','#e2e5c7','#c8dbc8','#a6cfcf','#7ab9cb','#4c9abd','#2778a5','#14537d'])||!Array.isArray(manifest.bounds3857)||manifest.bounds3857.length!==4||manifest.bounds3857.some((value,i)=>!Number.isFinite(value)||Math.abs(value-data.bounds3857[i])>1e-6)||!files||Object.keys(files).sort().join(',')!=='precipitation.png,values.bin.gz'||Object.values(files).some(file=>!validHash(file?.sha256)||!Number.isInteger(file?.bytes)||file.bytes<=0))throw Error('西アジアの年降水量の表示・配信契約を確認できませんでした。');
 return Object.freeze({id:westAnnualPrecipitationId,image:'../west-asia-precipitation-v1/precipitation.png',grid:'../west-asia-precipitation-v1/values.bin.gz',width:manifest.width,height:manifest.height,bounds:[...manifest.bounds],bounds3857:[...manifest.bounds3857],breaks:[...manifest.breaks],colors:[...manifest.colors],noData:lookup.nodata,year:'1991–2020',unit:'mm／年',source:'GPCC／DWD・降水量平年値 v2025',sourceUrl:manifest.doi,license:manifest.license,method:'雨量計観測に基づく0.25°原格子の月別平年値を、12か月が揃う格子だけ合計しています。表示格子は原格子の最近傍値で、画像と地点照会に同じfloat32値を使います。小国・海岸の未収録を近隣値で補いません。現在の水利用可能量を示す図ではありません。',manifestPath:westPrecipitationManifestPath,compressedSha256:files['values.bin.gz'].sha256,compressedBytes:files['values.bin.gz'].bytes,uncompressedSha256:lookup.uncompressedSha256,uncompressedBytes:lookup.uncompressedBytes,countryCoverage:manifest.countryCoverage});
}

/** Accept transport-decompressed gzip while checking the appropriate published hash. */
export async function decodeWestPrecipitationGrid(buffer,layer){
 const bytes=new Uint8Array(buffer),compressed=bytes[0]===0x1f&&bytes[1]===0x8b;
 const expectedBytes=compressed?layer.compressedBytes:layer.uncompressedBytes;
 const expectedHash=compressed?layer.compressedSha256:layer.uncompressedSha256;
 if(bytes.byteLength!==expectedBytes)throw Error('年降水量の配信サイズが記録と一致しません。');
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 const hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
 if(hash!==expectedHash)throw Error('年降水量の配信ハッシュが記録と一致しません。');
 const values=await decodeWestGrid(buffer,layer);
 if(values.some(value=>value<0&&value!==-1))throw Error('年降水量に未定義の欠測値があります。');
 return values;
}
