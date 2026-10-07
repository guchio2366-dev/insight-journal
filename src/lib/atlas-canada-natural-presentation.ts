/** Display palettes; rainfall retains original bands, elevation uses native-grid 500 m bands. */
export const canadaAnnualRainColors=['#edf5fa','#d1e7f1','#a6cfe2','#75afce','#4389b5','#226493','#113e64'];
export const canadaAnnualRainColor=(id:string)=>canadaAnnualRainColors[Number(id.replace(/^p/,''))];
export const canadaElevationColors:Record<string,string>={'0':'#edf4de','500':'#dbe8c4','1000':'#c7d6a7','1500':'#b3c18d','2000':'#9cab74','2500':'#87955f','3000':'#73814d','3500':'#606d3d','4000':'#4e5b30','4500':'#3e4a25','5000':'#303c1b','5500':'#243010'};
