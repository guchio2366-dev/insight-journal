import assert from 'node:assert/strict';
import sharp from 'sharp';
import {religionDominantColors} from '../src/lib/atlas-population-religion.ts';

// A downloaded GeoJSON and ready DOM do not imply that MapLibre's source
// worker has painted its tiles. Test the composited screen, not HTML markers.
// The layer uses opacity .95; allow its blend and edge antialiasing. Three
// large color areas exclude labels and the six small story badges alone.
export async function waitForUsReligionPaint(page,{timeout=30000}={}){
 const frame=page.locator('[data-map-frame]');
 const palette=Object.entries(religionDominantColors).filter(([id])=>id!=='unreported').map(([id,hex])=>({id,rgb:[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16))}));
 const started=Date.now();let result;
 while(Date.now()-started<timeout){
  assert.equal(await page.locator('[data-fallback]').isVisible(),false,'religion paint must use the actual WebGL map');
  const bytes=await frame.screenshot({type:'png',animations:'disabled'});
  const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const counts=Object.fromEntries(palette.map(c=>[c.id,0]));
  for(let i=0;i<data.length;i+=info.channels){
   const color=palette.find(c=>c.rgb.every((value,k)=>Math.abs(data[i+k]-value)<=18));
   if(color)counts[color.id]++;
  }
  const colorAreas=Object.values(counts).filter(n=>n>=1000).length,total=Object.values(counts).reduce((a,b)=>a+b,0);
  result={counts,colorAreas,total,minimumAreaPixels:1000,minimumColorAreas:3,minimumTotalPixels:20000,elapsedMs:Date.now()-started};
  if(colorAreas>=3&&total>=20000)return result;
  await page.waitForTimeout(250);
 }
 assert.fail('US religion county colors did not paint: '+JSON.stringify(result));
}
