import type { StyleSpecification } from 'maplibre-gl';

// All fields share these sources and one geographic projection.
export function createAtlasStyle(config:{assetBase:string},manifest:any,base:any,crops:any,land:any):StyleSpecification {
    const kind=(name:string):any=>['==',['get','kind'],name];
    return {version:8,sources:{
      base:{type:'geojson',data:base},crops:{type:'geojson',data:crops},land:{type:'geojson',data:land},
      relief:{type:'image',url:config.assetBase+'relief.webp',coordinates:manifest.reliefCoordinates}
    },layers:[
      {id:'ocean',type:'background',paint:{'background-color':'#c1e1ed'}},
      {id:'land-fill',type:'fill',source:'base',filter:kind('land'),paint:{'fill-color':'#efebd8'}},
      {id:'relief',type:'raster',source:'relief',paint:{'raster-opacity':1,'raster-fade-duration':0}},
      {id:'land-picking',type:'fill',source:'land',paint:{'fill-opacity':0}},
      {id:'crops-fill',type:'fill',source:'crops',filter:['!=',['get','id'],'corn-soybean'],paint:{'fill-color':['get','color'],'fill-opacity':0.62}},
      {id:'crops-outline',type:'line',source:'crops',filter:['!=',['get','id'],'corn-soybean'],paint:{'line-color':['get','color'],'line-opacity':0.85,'line-width':1}},
      {id:'crops-overlap',type:'fill',source:'crops',filter:['==',['get','id'],'corn-soybean'],paint:{'fill-color':'#c8b756','fill-opacity':0.18}},
      {id:'state-lines',type:'line',source:'base',filter:kind('state'),paint:{'line-color':'#506f73','line-opacity':0.42,'line-width':0.65}},
      {id:'country-lines',type:'line',source:'base',filter:kind('land'),paint:{'line-color':'#4c7b8a','line-width':0.9,'line-opacity':0.75}},
      {id:'rivers',type:'line',source:'base',filter:kind('river'),paint:{'line-color':'#5799b5','line-width':['interpolate',['linear'],['zoom'],2,0.5,6,1.5],'line-opacity':0.86}},
      {id:'lakes',type:'fill',source:'base',filter:kind('lake'),paint:{'fill-color':'#a5d2e6'}},
      {id:'lakes-outline',type:'line',source:'base',filter:kind('lake'),paint:{'line-color':'#5799b5','line-width':0.65}}
    ]};
}

export function setFieldLayers(map:{setLayoutProperty:(id:string,key:string,value:string)=>unknown},field:string,cropsVisible=true) {
  for(const id of ['crops-fill','crops-outline','crops-overlap']) map.setLayoutProperty(id,'visibility',field==='agriculture'&&cropsVisible?'visible':'none');
}
