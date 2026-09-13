// The existing EPSG:4326 geometries are reused; copy-selection bounds are never drawn.
export function relationContextFeatures(ids:readonly string[],base:any[],land:any[],overlays:any[]){
  return ids.flatMap(id=>{
    const [kind,name]=id.split(':');
    return kind==='landform'?land.filter(f=>f.properties.name===name):[...base,...overlays].filter(f=>['river','lake','reservoir'].includes(f.properties.kind)&&(f.properties.name===name||f.properties.id===name));
  });
}
export function fallbackProject(p:readonly number[]){
  const merc=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));
  return [(p[0]+128)/64*1800,(merc(52)-merc(p[1]))/(merc(52)-merc(22))*1084];
}
export function fallbackGeometryPath(geometry:any):string{
  const line=(points:number[][],close=false)=>points.map((p,i)=>{const xy=fallbackProject(p);return `${i?'L':'M'}${xy[0].toFixed(1)},${xy[1].toFixed(1)}`;}).join('')+(close?'Z':'');
  switch(geometry.type){
    case 'Polygon':return geometry.coordinates.map((ring:number[][])=>line(ring,true)).join('');
    case 'MultiPolygon':return geometry.coordinates.flatMap((polygon:number[][][])=>polygon.map(ring=>line(ring,true))).join('');
    case 'LineString':return line(geometry.coordinates);
    case 'MultiLineString':return geometry.coordinates.map((points:number[][])=>line(points)).join('');
    default:return '';
  }
}
