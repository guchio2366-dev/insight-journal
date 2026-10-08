export const westNaturalAssets='../west-asia-natural-presentation-v1/';
export const westWaterOverview='water-overview';
export const westRepresentativeBasins=['1060034260','2060073570'];
export const westWaterPickModes=[['all','すべて'],['rivers','河川・湖'],['groundwater','地下水'],['rainfall','年降水量'],['basins','流域']];
const hashes={rainfall:'a38c40a4c9b81b59c4fc16eef047e18fef61aa2fd0d2d3d4f37336bc92d8373a',elevation:'0a88c86e19fdf7d04c275c7b44a82da8a10365d59b650e15050f06b6951764fc'};
export function westNaturalKind(topic){return ['annual-precipitation',westWaterOverview].includes(topic.id)?'rainfall':['terrain','contours'].includes(topic.id)?'elevation':null;}
export function westGeometryVisible(geometry,bounds=[23,10,64,45]){
 const extent=[Infinity,Infinity,-Infinity,-Infinity];
 const visit=coordinates=>{if(typeof coordinates?.[0]==='number'){extent[0]=Math.min(extent[0],coordinates[0]);extent[1]=Math.min(extent[1],coordinates[1]);extent[2]=Math.max(extent[2],coordinates[0]);extent[3]=Math.max(extent[3],coordinates[1]);}else if(Array.isArray(coordinates))coordinates.forEach(visit);};
 if(geometry.type==='GeometryCollection')return geometry.geometries.some(g=>westGeometryVisible(g,bounds));visit(geometry.coordinates);
 return extent[0]<=bounds[2]&&extent[2]>=bounds[0]&&extent[1]<=bounds[3]&&extent[3]>=bounds[1];
}
export function validateWestNaturalManifest(manifest){
 if(manifest?.schemaVersion!==1||manifest.region!=='west-asia')throw Error('自然環境の地域を確認できませんでした。');
 for(const [kind,interval] of [['rainfall',250],['elevation',500]]){
  const m=manifest.layers?.[kind];
  if(!m||m.interval!==interval||m.width!==1000||m.height!==987||m.sourceGridSHA256!==hashes[kind]||m.bounds?.join(',')!=='23,10,64,45'||!Array.isArray(m.breaks)||m.breaks.length<2||m.breaks.some((n,i)=>!Number.isFinite(n)||n%interval!==0||i&&n-m.breaks[i-1]!==interval)||m.colors?.length!==m.breaks.length-1||m.validCellCount+m.maskedCellCount!==1000*987||m.thresholdRule!=='lower inclusive, upper exclusive')throw Error('自然環境の階級・格子を確認できませんでした。');
  for(const key of ['bandSHA256','lineSHA256','bandRawSHA256','lineRawSHA256'])if(!/^[a-f0-9]{64}$/.test(m[key]))throw Error('自然環境の配信記録がありません。');
  if(m.file!==kind+'-bands.json.gz'||m.lineFile!==kind+'-lines.json.gz')throw Error('自然環境のファイル名を確認できませんでした。');
  for(const [key,suffix] of [['bandChunks','bands'],['lineChunks','lines']])if(!Array.isArray(m[key])||!m[key].length||m[key].some((chunk,i)=>chunk.file!==`${kind}-${suffix}.${String(i).padStart(2,'0')}.txt`||!Number.isInteger(chunk.bytes)||chunk.bytes<=0||chunk.bytes>32768||!/^[a-f0-9]{64}$/.test(chunk.sha256)))throw Error('自然環境の分割配信を確認できませんでした。');
 }
 return manifest;
}
export async function assembleWestNaturalChunks(contents,records){
 if(contents.length!==records.length)throw Error('自然環境の配信ファイルが不足しています。');
 const chunks=await Promise.all(contents.map(async(content,i)=>{
  const value=content.trim();if(!/^[A-Za-z0-9+/]*={0,2}$/.test(value))throw Error('自然環境の配信形式が一致しません。');
  const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0)),digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  if(bytes.length!==records[i].bytes||[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')!==records[i].sha256)throw Error('自然環境の分割配信ハッシュが一致しません。');return bytes;
 }));
 const bytes=new Uint8Array(chunks.reduce((sum,c)=>sum+c.length,0));let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
export async function decodeWestNaturalCollection(buffer,metadata,lines=false){
 const bytes=new Uint8Array(buffer),compressed=bytes[0]===0x1f&&bytes[1]===0x8b;
 const expected=metadata[(lines?'line':'band')+(compressed?'SHA256':'RawSHA256')];
 const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);
 if([...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')!==expected)throw Error('自然環境の配信ハッシュが一致しません。');
 const raw=compressed?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes);
 const collection=JSON.parse(raw);
 if(collection.type!=='FeatureCollection'||!Array.isArray(collection.features)||collection.features.length!==metadata[lines?'lineCount':'bandCount'])throw Error('自然環境の形状数が一致しません。');
 for(const f of collection.features){
  const p=f.properties;
  if(lines?(f.geometry.type!=='LineString'||!metadata.breaks.slice(1,-1).includes(p.value)):(f.geometry.type!=='Polygon'||!metadata.breaks.slice(0,-1).includes(p.lower)||p.upper-p.lower!==metadata.interval||p.color!==metadata.colors[metadata.breaks.indexOf(p.lower)]))throw Error('自然環境の形状と凡例が一致しません。');
 }
 return collection;
}
export function westGroundwaterReading(properties){
 const code=Number(properties.HYGEO2),category={'1':'広い地下水盆','2':'複雑な地質構造','3':'局所的・浅い帯水層'}[String(code)[0]]??'原資料の区分';
 const ranges={11:'2未満',12:'2〜20',13:'20〜100',14:'100〜300',15:'300超',22:'20未満',23:'20〜100',24:'100〜300',25:'300超',33:'100未満',34:'100超'};
 return {title:category,description:'涵養区分：'+(ranges[code]??'区分値なし')+' mm／年。WHYMAPの広域区分で、地下水の残存量・取水量ではありません。'};
}
const names={Nile:'ナイル川',Euphrates:'ユーフラテス川',Firat:'ユーフラテス川', 'Al Furat':'ユーフラテス川',Tigris:'ティグリス川',Dicle:'ティグリス川',Jordan:'ヨルダン川','Shatt al Arab':'シャット・アル・アラブ川'};
export function westWaterFeatureReading(name,lake=false){
 return {title:names[name]??name??(lake?'湖':'河川'),description:'Natural Earth v5.1.2に収録された'+(lake?'湖の輪郭':'河川・水路')+'です。'+(lake?'面積の色は湖の深さや貯水量ではありません。':'線の太さは流量や取水量ではありません。')+(name&&names[name]?'原資料の名称：'+name+'。':'')};
}
