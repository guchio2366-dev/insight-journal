import {latinCountries34,latinMapLayout,projectLatin,latinRasterFrame} from './atlas-latin-america-geometry';
import {latinUrbanPopulations} from '../data/atlas/latin-america/urban-population-2018';
import central from '../../public/assets/atlas/latin-review-v3/population/central-caribbean-locators.json';
import dots from '../../public/assets/atlas/latin-review-v3/population/manifest.json';
import density from '../../public/assets/atlas/latin-reading-density-v1/manifest.json';
import {withBase} from './urls';
export const latinUrbanRadius=(people:number)=>42*Math.sqrt(people/20_000_000);
export const latinPopulationLocators=[...latinUrbanPopulations.map(c=>({...c,population:c.population as number|null})),...central.cities.map(c=>({...c,population:null,dx:8,dy:-8,reason:'Natural Earthの都市位置を示します。対応する2018年都市集積域人口は未収録です。'}))];
export const latinPopulationDots=dots;
function locators(scope:string,selected:string,k:number,tx:number,ty:number){
 const boxes:number[][]=[];
 return latinPopulationLocators.filter(c=>scope==='central'?c.population===null:scope==='south'?c.population!==null:true).map(c=>{
  const p=projectLatin(c.coordinate),x=p[0]*k+tx,y=p[1]*k+ty;if(x<8||x>892||y<8||y>842)return '';
  const width=c.name.length*14+18,candidates=[[8,-8],[8,20],[-width-8,-8],[-width-8,20],[8,-26],[8,38]],pos=candidates.find(([dx,dy])=>x+dx>6&&x+dx+width<894&&y+dy>14&&y+dy<842&&!boxes.some(b=>x+dx<b[0]+b[2]&&x+dx+width>b[0]&&y+dy-15<b[1]+b[3]&&y+dy>b[1]));
  let label='';if(pos){boxes.push([x+pos[0],y+pos[1]-15,width,19]);label=`<text x="${x+pos[0]}" y="${y+pos[1]}" class="latin-population-place-label" font-size="14" stroke="#fffefa" stroke-width="3" paint-order="stroke">▸ ${c.name}</text>`;}
  return `<g data-lp-city="${c.id}" role="button" tabindex="0" aria-pressed="${selected===c.id}" aria-label="${c.name}の位置と資料を読む" data-city-locator data-population-status="${c.population===null?'unavailable':'UN-2018-agglomeration'}"><circle cx="${x}" cy="${y}" r="9" fill="#fffefa" opacity=".85"/><circle cx="${x}" cy="${y}" r="4" fill="${selected===c.id?'#b94c26':'#554071'}" stroke="#fff" stroke-width="1"/>${label}</g>`;
 }).join('');
}
function populationMap(scope:string,selected:string,dotView:boolean){
 const height=850,{transform,k,tx,ty,frame}=latinMapLayout(scope,'all',height),raster=latinRasterFrame();
 const context=latinCountries34.map(c=>`<path d="${c.path}" fill="#edf0e9" fill-rule="evenodd"/>`).join(''),borders=latinCountries34.map(c=>`<path d="${c.path}" fill="none" fill-rule="evenodd" stroke="#8b9d94" stroke-width=".6" vector-effect="non-scaling-stroke"/>`).join('');
 return `<svg class="latin-map lp-map" data-latin-map data-reading-frame="${frame.join(' ')}" viewBox="0 0 900 ${height}" role="group" aria-label="2020年の推計人口密度。点は表示格子中心で、住居や一定人数を示しません"><defs><clipPath id="lp-review-land">${context}</clipPath></defs><rect width="900" height="${height}" fill="#e8f0f3"/><g transform="${transform}">${context}<image data-population-density-view="${dotView?'dots':'raster'}" href="${withBase(dotView?'/assets/atlas/latin-review-v3/population/density-dots.svg':'/assets/atlas/latin-reading-density-v1/density.png')}" x="${raster.x}" y="${raster.y}" width="${raster.width}" height="${raster.height}" preserveAspectRatio="none" clip-path="url(#lp-review-land)"/>${borders}</g>${locators(scope,selected,k,tx,ty)}</svg>`;
}
export function renderLatinUrbanMap(scope='all',selected=''){return populationMap(scope,selected,true);}
export function renderLatinReadingDensityMap(scope='all'){return populationMap(scope,'',false);}
export const latinReadingDensityLegend=density.breaks.map((min,i)=>({color:density.colors[i],label:`${min.toLocaleString('ja-JP')}${density.breaks[i+1]!==undefined?'–'+density.breaks[i+1].toLocaleString('ja-JP')+'未満':'以上'}`}));
export function renderLatinPopulationDotLegend(){return `<ul class="latin-population-dot-legend">${dots.classes.map(c=>`<li><i style="background:${c.color}"></i>${c.label}</li>`).join('')}</ul><p>色・大きさ＝2020年の周辺推計密度（人/km²）。点は表示格子の中心で、実際の住居位置や一定人数ではありません。約14kmの表示格子／集約元10km等面積格子。都市位置は固定サイズ。人数は右欄の別資料へ。</p>`;}
