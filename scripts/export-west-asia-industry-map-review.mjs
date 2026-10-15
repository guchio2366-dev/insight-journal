// Static layer review only. This is deliberately not a browser screenshot.
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import geography from '../public/assets/atlas/west-asia-v1/geography.json' with {type:'json'};
import data from '../src/data/atlas/west-asia.json' with {type:'json'};
import {westIndustryCatalog as catalog} from '../src/data/atlas/west-asia-industry-catalog.mjs';
import {westIndustryMapSectorCopy as sectorCopy} from '../src/data/atlas/west-asia-industry-map.mjs';
import {westIndustryFrame as frame,westIndustryPath,projectWestIndustry,layoutWestIndustryAnnotations,clusterWestIndustryLocations,layoutWestIndustryPointSymbols,westIndustryMapLocations} from '../src/lib/atlas-west-asia-industry.mjs';
const output=process.env.WEST_ASIA_LAYER_REVIEW_OUTPUT??'/tmp/west-asia-readability-layers';
await mkdir(output,{recursive:true});
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const neighbors=['RUS','UKR','BGR','GRC','LBY','SDN','AFG','PAK','TKM','UZB'];
const records=[];
for(const width of [1050,750,340])for(const sector of ['resources','manufacturing','services']){
 const height=width*.987,items=catalog.filter(i=>i.sectors.includes(sector)),groups=clusterWestIndustryLocations(items,sector,width,frame),symbols=layoutWestIndustryPointSymbols(groups,width,height,frame),notes=layoutWestIndustryAnnotations(sector,width,height,frame);
 const font=width<500?11:13,small=width<500?9:10,line=width<500?12:14;
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height+64}" viewBox="0 0 ${width} ${height+64}"><rect width="100%" height="100%" fill="#e4eff0"/><defs><clipPath id="map"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#map)"><g transform="scale(${width/1000} ${height/987})">`;
 for(const f of geography.features.filter(f=>f.properties.target||neighbors.includes(f.properties.code)))svg+=`<path d="${westIndustryPath(f.geometry)}" fill="#f0efe3" stroke="#a8b8ad" stroke-width=".75" vector-effect="non-scaling-stroke" fill-rule="evenodd"/>`;
 svg+='</g><g font-family="Noto Sans CJK JP, sans-serif">';
 for(const c of data.countries.filter(c=>['TUR','IRN','SAU','IRQ','OMN','EGY','YEM'].includes(c.code))){const p=projectWestIndustry(c.center);svg+=`<text x="${p[0]/1000*width}" y="${p[1]/987*height}" text-anchor="middle" fill="#7b8578" font-size="${font}" stroke="#f8faf1" stroke-width="3" paint-order="stroke">${escape(c.name)}</text>`;}
 for(const g of symbols){
  const i=catalog.find(i=>i.id===g.industry),x=g.x,y=g.y,r=g.radius,hq=g.stage==='企業本社',processing=!hq&&(sector==='manufacturing'||/製造|精製|精錬|加工|液化|製鋼/.test(g.stage));
  if(Math.hypot(...g.offset)>.1)svg+=`<circle cx="${g.anchorScreen[0]}" cy="${g.anchorScreen[1]}" r="1.5" fill="#718078"/><line x1="${g.anchorScreen[0]}" y1="${g.anchorScreen[1]}" x2="${x}" y2="${y}" stroke="#718078" stroke-width=".65"/>`;
  svg+=`<g transform="translate(${x} ${y})" fill="${i.color}" stroke="#fffdf4" stroke-width="1.2">`;
  svg+=hq?`<path d="M0 ${-r*1.2} L${r*1.2} 0 L0 ${r*1.2} L${-r*1.2} 0 Z"/>`:processing?`<rect x="${-r}" y="${-r}" width="${r*2}" height="${r*2}"/>`:`<circle r="${r}"/>`;
  if(g.members.length>1)svg+=`<text dy="3" text-anchor="middle" fill="#fff" stroke="none" font-size="9" font-weight="700">${g.members.length}</text>`;
  svg+='</g>';
 }
 for(const n of notes)svg+=`<g transform="translate(${n.x} ${n.y})" fill="#314c40" stroke="#fffef5" stroke-width="3" paint-order="stroke"><text y="${line-2}" font-size="${small+2}" font-weight="650">${escape(n.title)}</text><text y="${line*2-2}" font-size="${small}">${escape(n.place)}</text></g>`;
 const stageKey=sector==='services'?'● サービス・通過点':sector==='manufacturing'?'■ 加工・製造　◇ 企業本社':'● 採取・産地　■ 燃料製造・加工';
 svg+=`</g></g><rect y="${height-54}" width="${width}" height="118" fill="#fffef6"/><g font-family="Noto Sans CJK JP, sans-serif" fill="#315040" font-size="${small}"><text x="8" y="${height-36}" font-weight="650">${escape(sectorCopy[sector].title)}</text><text x="8" y="${height-19}">${stageKey}</text><text x="8" y="${height-4}">数字は掲載地点数。生産量ではありません。</text><text x="8" y="${height+23}">静的レイヤー出力（実ページの画面ではありません）</text></g></svg>`;
 const stem=width+'-'+sector;await writeFile(path.join(output,stem+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(output,stem+'.png'));
 records.push({sector,width,height,sourceLocations:items.reduce((n,i)=>n+westIndustryMapLocations(i,sector).length,0),symbols:groups.length,annotations:notes.length,industryControlsInsideMap:0,maxSymbolOffset:Math.max(...symbols.map(g=>Math.hypot(...g.offset)))});
}
await writeFile(path.join(output,'layer-review.json'),JSON.stringify({type:'static-layer-export-not-browser-screenshot',base:'6f3d4a27c17bf205220d0eb44563975af2bcbdad',records},null,2)+'\n');
console.log(output);
