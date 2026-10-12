/** Canada display palettes: 250 mm continuous-source isohyets and brown 500 m elevation classes. */
export const canadaAnnualRainColors=["#eff7fb", "#d7eaf5", "#b9d9ed", "#98c7e1", "#77b4d7", "#559ecb", "#3888bd", "#2173ac", "#126197", "#0b5082", "#08406e", "#07365e", "#062d50", "#052545", "#041e3b", "#031930"];
export const canadaAnnualRainColor=(id:string)=>canadaAnnualRainColors[Number(id.replace(/^p/,''))];
export const canadaElevationColors:Record<string,string>={"0": "#f6eedf", "500": "#e9d6b6", "1000": "#d9b987", "1500": "#c79b65", "2000": "#b3804d", "2500": "#9e683b", "3000": "#87532f", "3500": "#72402b", "4000": "#603027", "4500": "#4e2522", "5000": "#3e1b1c", "5500": "#2d1419"};
