/** The main map and relocated inset share coordinates, coast, data and paint. */
export function japanBaseStyle(geography:any,prefectures:any,population:any,assetBase:string){
 const japan={type:'FeatureCollection',features:geography.features.filter((f:any)=>f.properties.code==='JPN')};
 const parallels={type:'FeatureCollection',features:[25,30,35,40,45].map(lat=>({type:'Feature',properties:{lat},geometry:{type:'LineString',coordinates:[[122.5,lat],[146.3,lat]]}}))};
 return {version:8 as const,sources:{'japan-land':{type:'geojson',data:japan},'japan-prefectures':{type:'geojson',data:prefectures},'japan-population':{type:'image',url:assetBase+population.image,coordinates:population.imageCoordinates},'japan-parallels':{type:'geojson',data:parallels}},layers:[
 {id:'japan-ocean',type:'background',paint:{'background-color':'#e6eef0'}},
 {id:'japan-land',type:'fill',source:'japan-land',paint:{'fill-color':'#f1eddf'}},
 {id:'japan-parallels',type:'line',source:'japan-parallels',paint:{'line-color':'#9dafab','line-opacity':.45,'line-width':.6,'line-dasharray':[4,5]}},
 {id:'japan-prefecture-fill',type:'fill',source:'japan-prefectures',layout:{visibility:'none'},paint:{'fill-color':'#d2ceca'}},
 {id:'japan-population',type:'raster',source:'japan-population',layout:{visibility:'none'},paint:{'raster-resampling':'nearest','raster-fade-duration':0}},
 {id:'japan-prefecture-border',type:'line',source:'japan-prefectures',paint:{'line-color':'#779087','line-width':.55,'line-opacity':.55}},
 {id:'japan-coast',type:'line',source:'japan-land',paint:{'line-color':'#547568','line-width':.9}},
 {id:'japan-prefecture-selected',type:'line',source:'japan-prefectures',filter:['==',['get','id'],''],paint:{'line-color':'#a74830','line-width':2}},
 ]};
}
