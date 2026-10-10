import {latinCountries34,latinMapLayout,projectLatin} from './atlas-latin-america-geometry';
import {latinUrbanPopulations} from '../data/atlas/latin-america/urban-population-2018';
export const latinUrbanRadius=(people:number)=>42*Math.sqrt(people/20_000_000);
export function renderLatinUrbanMap(scope='all',selected=''){
 const height=740,{transform,k,tx,ty,frame}=latinMapLayout(scope,'all',height);
 const context=latinCountries34.map(c=>`<path d="${c.path}" fill="#e8ece5" stroke="#81968b" stroke-width=".65" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
 const cities=latinUrbanPopulations.filter(c=>scope!=='central').map(c=>{const p=projectLatin(c.coordinate),x=p[0]*k+tx,y=p[1]*k+ty,r=latinUrbanRadius(c.population);return `<g role="button" tabindex="0" data-lp-city="${c.id}" aria-pressed="${selected===c.id}" aria-label="${c.name}、2018年都市集積域人口${c.population.toLocaleString('ja-JP')}人" class="latin-city"><circle cx="${x}" cy="${y}" r="${r}" fill="#c06530" fill-opacity=".6" stroke="${selected===c.id?'#192f40':'#79442a'}" stroke-width="${selected===c.id?4:1.3}" data-city-population="${c.population}"/><path d="M${x},${y}l${c.dx},${c.dy}" stroke="#425c55" fill="none"/><text x="${x+c.dx}" y="${y+c.dy}" text-anchor="${c.dx<0?'end':'start'}">${c.name}</text><text x="${x+c.dx}" y="${y+c.dy+18}" text-anchor="${c.dx<0?'end':'start'}" class="latin-city-count">${(c.population/10000).toLocaleString('ja-JP',{maximumFractionDigits:1})}万人</text></g>`;}).join('');
 return `<svg class="latin-map lp-map" data-latin-map data-reading-frame="${frame.join(' ')}" viewBox="0 0 900 ${height}" role="group" aria-label="2018年の都市集積域人口。円の面積で人数を表示"><rect width="900" height="740" fill="#e8f0f3"/><g transform="${transform}">${context}</g>${cities}${scope==='central'?'<text x="28" y="70" font-size="19">中米・カリブの都市域人数は未収録。密度図で居住分布を確認できます。</text>':''}<g data-urban-size-key><text x="25" y="620" font-size="17">円の面積＝都市集積域の人数・2018年</text>${[5000000,10000000,20000000].map((n,i)=>`<circle cx="${85+i*115}" cy="680" r="${latinUrbanRadius(n)}" fill="#c06530" fill-opacity=".6" stroke="#79442a"/><text x="${85+i*115}" y="736" text-anchor="middle" font-size="16">${n/10000}万人</text>`).join('')}</g></svg>`;
}

import {latinRasterFrame} from './atlas-latin-america-geometry';
import {withBase} from './urls';
import density from '../../public/assets/atlas/latin-reading-density-v1/manifest.json';
export function renderLatinReadingDensityMap(scope='all'){
 const {transform,frame,k,tx,ty}=latinMapLayout(scope,'all',740),raster=latinRasterFrame();
 const context=latinCountries34.map(c=>`<path d="${c.path}" fill="#e2e6df" stroke="#84988e" stroke-width=".65" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
 const labels=scope==='central'?'':latinUrbanPopulations.slice(0,5).map(c=>{const p=projectLatin(c.coordinate),x=p[0]*k+tx,y=p[1]*k+ty;return `<g class="latin-city-density-label" pointer-events="none"><circle cx="${x}" cy="${y}" r="3" fill="#253d49"/><path d="M${x},${y}l${c.dx},${c.dy}" stroke="#435e57"/><text x="${x+c.dx}" y="${y+c.dy}" text-anchor="${c.dx<0?'end':'start'}">${c.name}</text></g>`;}).join('');
 return `<svg class="latin-map lp-map" data-latin-map data-reading-frame="${frame.join(' ')}" viewBox="0 0 900 740" role="img" aria-label="2020年の居住人口密度推計。単位は人/km²で、人数ではありません"><rect width="900" height="740" fill="#e8f0f3"/><g transform="${transform}">${context}<image href="${withBase('/assets/atlas/latin-reading-density-v1/density.png')}" x="${raster.x}" y="${raster.y}" width="${raster.width}" height="${raster.height}" preserveAspectRatio="none" style="image-rendering:pixelated"/></g>${labels}</svg>`;
}
export const latinReadingDensityLegend=density.breaks.map((min,i)=>({color:density.colors[i],label:`${min.toLocaleString('ja-JP')}${density.breaks[i+1]!==undefined?'–'+density.breaks[i+1].toLocaleString('ja-JP')+'未満':'以上'}`}));
