/** Display palettes only: original classes, source rasters and measurements stay unchanged. */
export const canadaAnnualRainColors=['#edf5fa','#d1e7f1','#a6cfe2','#75afce','#4389b5','#226493','#113e64'];
export const canadaAnnualRainColor=(id:string)=>canadaAnnualRainColors[Number(id.replace(/^p/,''))];
export const canadaElevationColors:Record<string,string>={'500':'#b9c6a1','1000':'#929e76','2000':'#717c50','3000':'#59613b','4000':'#42462b','5000':'#2b2f1b'};
