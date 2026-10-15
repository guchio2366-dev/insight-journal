// Local visual QA of the regional data/layout contract, not a browser screenshot.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {southIndustrySectors} from '../src/data/atlas/south-asia-industry-sectors.ts';
import {southIndustryMapView,southIndustryMapBounds} from '../src/data/atlas/south-asia-industry-cartography.ts';
import {southIndustryLabelLayout} from '../src/lib/atlas-south-asia-industry-labels.ts';
const out=path.resolve(process.argv[2]??'review-artifacts/south-asia-sector-readability');
await mkdir(out,{recursive:true});
const geo=JSON.parse(await readFile('public/assets/atlas/asia-population-v1/south-central-asia.geography.json','utf8'));
const countries=new Set(['AFG','BGD','BTN','IND','LKA','MDV','NPL','PAK']);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const merc=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-85,Math.min(85,lat))*Math.PI/360));
export function southPreviewProjection(width,height){
 const [west,south,east,north]=southIndustryMapBounds,x0=west*Math.PI/180,x1=east*Math.PI/180,y0=merc(south),y1=merc(north);
 const scale=Math.min((width-40)/(x1-x0),(height-40)/(y1-y0));
 return ([lng,lat])=>({x:width/2+(lng*Math.PI/180-(x0+x1)/2)*scale,y:height/2+((y0+y1)/2-merc(lat))*scale});
}
const report={base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),renderer:'Static SVG/Sharp; regional helpers, not the shared MapLibre runtime',images:[]};
let figures='';
for(const size of [{width:960,height:640,name:'desktop'},{width:360,height:520,name:'mobile'}])for(const sector of southIndustrySectors){
 const view=southIndustryMapView(sector.id),project=southPreviewProjection(size.width,size.height);
 const paths=geo.features.map(feature=>{
  const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[];
  const d=polygons.flatMap(polygon=>polygon.map(ring=>ring.map((coordinate,i)=>{const p=project(coordinate);return (i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2);}).join('')+'Z')).join('');
  return '<path d="'+d+'" fill="'+(countries.has(feature.properties.code)?'#e8ebdf':'#f1f0e9')+'" stroke="#b3bdb5" stroke-width=".7" fill-rule="evenodd"/>';
 }).join('');
 const layout=southIndustryLabelLayout(view.labels,project,size,view.sites.map(site=>site.point));
 const points=view.sites.map(site=>{const p=project(site.point),color=view.groups.find(group=>group.id===site.group).color;return '<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="'+color+'" stroke="#fffdf5" stroke-width="1.2"><title>'+escape(site.name+' · '+site.scaleLabel+' · '+site.kind+' · '+site.evidenceYear)+'</title></circle>';}).join('');
 const labels=layout.filter(item=>item.placement).map(({label,placement})=>'<g><text x="'+(placement.box.left+5)+'" y="'+(placement.box.top+12)+'" font-weight="600">'+escape(label.industry)+'</text><text x="'+(placement.box.left+5)+'" y="'+(placement.box.top+26)+'">'+escape(label.place)+'</text></g>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+size.width+'" height="'+size.height+'" viewBox="0 0 '+size.width+' '+size.height+'" role="img" aria-label="'+escape('南アジア '+sector.title)+'"><rect width="100%" height="100%" fill="#edf3f3"/><defs><clipPath id="map"><rect width="'+size.width+'" height="'+size.height+'"/></clipPath></defs><g clip-path="url(#map)">'+paths+points+'<g font-family="Noto Sans CJK JP, sans-serif" font-size="11" fill="#263f3a" stroke="#fffef8" stroke-width="3" paint-order="stroke" stroke-linejoin="round">'+labels+'</g></g></svg>';
 const stem=size.name+'-'+sector.id;await writeFile(path.join(out,stem+'.svg'),svg);
 const png=await sharp(Buffer.from(svg)).png().toBuffer();await writeFile(path.join(out,stem+'.png'),png);
 report.images.push({file:stem+'.png',viewport:size,sector:sector.id,sourceSites:view.sites.length,summaryLabels:view.labels.length,namedLabels:layout.filter(item=>item.placement).length,namedGroups:[...new Set(layout.filter(item=>item.placement).map(item=>item.label.group))],groups:[...view.groupIds],guides:0,sha256:createHash('sha256').update(png).digest('hex')});
 figures+='<section><h2>'+escape(sector.title)+' · '+size.width+'×'+size.height+'</h2><p>'+escape(view.reading)+'</p><div class="key">'+view.groups.map(group=>'<span><i style="background:'+group.color+'"></i>'+escape(group.title)+'</span>').join('')+'</div><img width="'+size.width+'" height="'+size.height+'" src="'+stem+'.png" alt="'+escape(view.reading)+'"><p>確認した所在地'+view.sites.length+'例。規模・工程・一次資料は元の45地点データと82指標に保持。地図上に数値や選択肢を重ねません。</p></section>';
}
await writeFile(path.join(out,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>南アジア・三分野別地図 QA</title><style>body{font:15px/1.7 sans-serif;max-width:1040px;margin:24px auto;padding:0 12px;color:#263f3a;background:#fffef8}section{margin:28px 0 56px}h2{font-size:21px}.key{display:flex;flex-wrap:wrap;gap:6px 20px;margin:12px 0}.key i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}img{max-width:100%;height:auto;border:1px solid #bbc8bf}</style><h1>南アジア・三分野別地図</h1><p>地域固有モデルの静的SVGプレビューです。共通MapLibre描画には未接続で、実ブラウザーの画面検証とは区別します。境界は既存のNatural Earth基図、点は既存の案内位置です。点数・大きさは生産量を表しません。</p>'+figures+'</html>');
await writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
