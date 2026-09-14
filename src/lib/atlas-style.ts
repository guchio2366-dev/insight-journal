import type { StyleSpecification } from 'maplibre-gl';

type NatureData = {manifest:any;cities:any[];aquifers:any;contours:any;overlays:any};
const emptyCollection={type:'FeatureCollection',features:[]};

// All fields share one MapLibre instance and one geographic projection.
export function createAtlasStyle(config:{assetBase:string;natureAssetBase?:string},manifest:any,base:any,crops:any,land:any,nature?:NatureData):StyleSpecification {
  const kind=(name:string):any=>['==',['get','kind'],name];
  const cityFeatures=nature?.cities.map(city=>({type:'Feature',properties:{id:city.id,nameJa:city.nameJa,kind:'city'},geometry:{type:'Point',coordinates:[city.longitude,city.latitude]}}))??[];
  const natureAssetBase=config.natureAssetBase??config.assetBase;
  return {version:8,sources:{
    base:{type:'geojson',data:base},crops:{type:'geojson',data:crops},land:{type:'geojson',data:land},
    relief:{type:'image',url:config.assetBase+'relief.webp',coordinates:manifest.reliefCoordinates},
    climate:{type:'image',url:natureAssetBase+'koppen-1991-2020.png',coordinates:nature?.manifest.imageCoordinates??manifest.reliefCoordinates},
    cities:{type:'geojson',data:{type:'FeatureCollection',features:cityFeatures}},
    aquifers:{type:'geojson',data:nature?.aquifers??emptyCollection},
    contours:{type:'geojson',data:nature?.contours??emptyCollection},
    'nature-overlays':{type:'geojson',data:nature?.overlays??emptyCollection},
    'nature-highlight':{type:'geojson',data:emptyCollection},
    'agriculture-relation-context':{type:'geojson',data:emptyCollection},
    'crop-context':{type:'geojson',data:emptyCollection}
  },layers:[
    {id:'ocean',type:'background',paint:{'background-color':'#c1e1ed'}},
    {id:'land-fill',type:'fill',source:'base',filter:kind('land'),paint:{'fill-color':'#efebd8'}},
    {id:'relief',type:'raster',source:'relief',paint:{'raster-opacity':1,'raster-fade-duration':0}},
    {id:'climate-raster',type:'raster',source:'climate',layout:{visibility:'none'},paint:{'raster-opacity':1,'raster-resampling':'nearest','raster-fade-duration':0}},
    {id:'contour-land-fill',type:'fill',source:'base',filter:kind('land'),layout:{visibility:'none'},paint:{'fill-color':'#faf8f0','fill-opacity':0.98}},
    {id:'aquifers-fill',type:'fill',source:'aquifers',layout:{visibility:'none'},paint:{'fill-color':'#b4a5c6','fill-opacity':0.32}},
    {id:'aquifers-pattern',type:'fill',source:'aquifers',layout:{visibility:'none'},paint:{'fill-color':'#887496','fill-opacity':0.65}},
    {id:'aquifers-outline',type:'line',source:'aquifers',layout:{visibility:'none'},paint:{'line-color':'#807091','line-width':1.2,'line-opacity':0.9}},
    {id:'land-picking',type:'fill',source:'land',paint:{'fill-opacity':0}},
    {id:'crops-fill',type:'fill',source:'crops',filter:['!=',['get','id'],'corn-soybean'],paint:{'fill-color':['get','color'],'fill-opacity':0.62}},
    {id:'crops-outline',type:'line',source:'crops',filter:['!=',['get','id'],'corn-soybean'],paint:{'line-color':['get','color'],'line-opacity':0.85,'line-width':1}},
    {id:'crops-overlap',type:'fill',source:'crops',filter:['==',['get','id'],'corn-soybean'],paint:{'fill-color':'#c8b756','fill-opacity':0.18}},
    {id:'crop-relation-highlight',type:'line',source:'crops',filter:['==',['get','id'],'__no-relation__'],layout:{visibility:'none'},paint:{'line-color':'#263f4c','line-width':['interpolate',['linear'],['zoom'],2,0.85,4,1.35,6,2.2],'line-opacity':0.95}},
    {id:'state-lines',type:'line',source:'base',filter:kind('state'),paint:{'line-color':'#506f73','line-opacity':0.42,'line-width':0.65}},
    {id:'country-lines',type:'line',source:'base',filter:kind('land'),paint:{'line-color':'#4c7b8a','line-width':0.9,'line-opacity':0.75}},
    {id:'rivers',type:'line',source:'base',filter:kind('river'),paint:{'line-color':'#5799b5','line-width':['interpolate',['linear'],['zoom'],2,0.5,6,1.5],'line-opacity':0.86}},
    {id:'lakes',type:'fill',source:'base',filter:kind('lake'),paint:{'fill-color':'#a5d2e6'}},
    {id:'lakes-outline',type:'line',source:'base',filter:kind('lake'),paint:{'line-color':'#5799b5','line-width':0.65}},
    {id:'agriculture-relation-line',type:'line',source:'agriculture-relation-context',filter:['!=',['geometry-type'],'Point'],layout:{visibility:'none'},paint:{'line-color':'#263f4c','line-width':1.8,'line-dasharray':[4,3]}},
    {id:'agriculture-relation-point',type:'circle',source:'agriculture-relation-context',filter:['==',['geometry-type'],'Point'],layout:{visibility:'none'},paint:{'circle-radius':7,'circle-color':'#fffdf4','circle-stroke-color':'#263f4c','circle-stroke-width':2}},
    {id:'contours-secondary',type:'line',source:'contours',filter:['==',['get','index'],false],layout:{visibility:'none'},paint:{'line-color':'#ad927b','line-width':0.6,'line-opacity':0.7}},
    {id:'contours-index',type:'line',source:'contours',filter:['==',['get','index'],true],layout:{visibility:'none'},paint:{'line-color':'#875d40','line-width':['interpolate',['linear'],['zoom'],2,0.7,6,1.15],'line-opacity':0.82}},
    {id:'contours-hit',type:'line',source:'contours',layout:{visibility:'none'},paint:{'line-color':'#000','line-width':10,'line-opacity':0}},
    {id:'current-lines',type:'line',source:'nature-overlays',filter:kind('current'),layout:{visibility:'none'},paint:{'line-color':['match',['get','temperature'],'cold','#1686ae','warm','#d4543f','#5b7f91'],'line-width':2.2,'line-opacity':0.9}},
    {id:'upwelling-line',type:'line',source:'nature-overlays',filter:kind('upwelling'),layout:{visibility:'none'},paint:{'line-color':'#1686ae','line-width':1.2,'line-dasharray':[2,2],'line-opacity':0.75}},
    {id:'reservoir-points',type:'circle',source:'nature-overlays',filter:kind('reservoir'),layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],2,3,6,6],'circle-color':'#fdfdf8','circle-stroke-color':'#286e91','circle-stroke-width':2}},
    {id:'city-points',type:'circle',source:'cities',layout:{visibility:'none'},paint:{'circle-radius':['interpolate',['linear'],['zoom'],2,4,6,7],'circle-color':'#fffdf4','circle-stroke-color':'#263f4c','circle-stroke-width':2}},
    {id:'crop-context-line',type:'line',source:'crop-context',layout:{visibility:'none'},paint:{'line-color':'#66442f','line-width':1.8,'line-dasharray':[4,3]}},
    {id:'nature-highlight-line',type:'line',source:'nature-highlight',layout:{visibility:'none'},paint:{'line-color':'#263f4c','line-width':2.1}},
    {id:'nature-highlight-point',type:'circle',source:'nature-highlight',filter:kind('city'),layout:{visibility:'none'},paint:{'circle-radius':10,'circle-color':'#fff','circle-opacity':0,'circle-stroke-color':'#263f4c','circle-stroke-width':3}}
  ]};
}

export function setFieldLayers(map:{setLayoutProperty:(id:string,key:string,value:string)=>unknown;setPaintProperty?:(id:string,key:string,value:unknown)=>unknown},field:string,natureMode='climate',cropsVisible=true) {
  const agriculture=field==='agriculture', natural=field==='natural';
  for(const id of ['crops-fill','crops-outline','crops-overlap','crop-relation-highlight'])map.setLayoutProperty(id,'visibility',agriculture&&cropsVisible?'visible':'none');
  for(const id of ['agriculture-relation-line','agriculture-relation-point'])map.setLayoutProperty(id,'visibility',agriculture?'visible':'none');
  map.setLayoutProperty('climate-raster','visibility',natural&&natureMode==='climate'?'visible':'none');
  map.setLayoutProperty('city-points','visibility',natural&&natureMode==='climate'?'visible':'none');
  for(const id of ['aquifers-fill','aquifers-pattern','aquifers-outline','reservoir-points'])map.setLayoutProperty(id,'visibility',natural&&natureMode==='water'?'visible':'none');
  for(const id of ['contour-land-fill','contours-secondary','contours-index','contours-hit'])map.setLayoutProperty(id,'visibility',natural&&natureMode==='contour'?'visible':'none');
  for(const id of ['current-lines','upwelling-line'])map.setLayoutProperty(id,'visibility',natural?'visible':'none');
  for(const id of ['crop-context-line','nature-highlight-line','nature-highlight-point'])map.setLayoutProperty(id,'visibility',natural?'visible':'none');
  map.setLayoutProperty('relief','visibility',(field==='population'||natural&&(natureMode==='climate'||natureMode==='contour'))?'none':'visible');
  map.setPaintProperty?.('relief','raster-opacity',natural?(natureMode==='water'?0.15:0.65):1);
  map.setPaintProperty?.('land-fill','fill-color',natural?'#faf9f3':'#efebd8');
  map.setPaintProperty?.('ocean','background-color',natural?'#e4eff0':'#c1e1ed');
  map.setLayoutProperty('land-picking','visibility',field!=='population'&&!agriculture&&(!natural||natureMode==='landform')?'visible':'none');
  const waterVisible=field!=='population'&&(!natural||natureMode==='water'||natureMode==='landform');
  for(const id of ['rivers','lakes','lakes-outline'])map.setLayoutProperty(id,'visibility',waterVisible?'visible':'none');
}
