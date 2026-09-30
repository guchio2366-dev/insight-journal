import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {project,frame} from '../../src/lib/atlas-europe-view.ts';
import {layoutClimateCodes} from '../../src/lib/atlas-climate-code-labels.ts';
import {boxesOverlap,layoutNatureLabels} from '../../src/lib/atlas-nature-labels.ts';

const json=path=>JSON.parse(readFileSync(new URL('../../'+path,import.meta.url)));
const labels=json('src/data/atlas/europe/map-labels.json');
const legend=json('src/data/atlas/europe/climate-legend.json');
const cities=json('src/data/atlas/europe/climate-cities.json');
const grid=gunzipSync(readFileSync(new URL('../../public/assets/atlas/europe/climate-v1/classes.bin.gz',import.meta.url)));
const classify=coordinate=>{const [x,y]=project(coordinate);return grid[Math.floor(y/frame.height*1502)*1800+Math.floor(x/frame.width*1800)];};

test('カスピ海の水面を覆い、周辺陸地と気候記号の地点を覆わない',()=>{
  const water=json('src/data/atlas/europe/climate-water.json');
  assert.equal(water.features.length,1);
  assert.match(water.source.url,/natural-earth-vector\/v5\.1\.2\/geojson\/ne_110m_ocean\.geojson$/);
  const ring=water.features[0].geometry.coordinates[0];
  const inside=([x,y])=>{
    let hit=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++){
      const [a,b]=ring[i],[c,d]=ring[j];
      if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
    }
    return hit;
  };
  for(const point of [[51,38],[51,42],[51,46]])assert.equal(inside(point),true,`水面: ${point}`);
  for(const point of [[45,42],[57,42],[51,50]])assert.equal(inside(point),false,`陸地: ${point}`);
  for(const label of labels.labels)for(const point of [label.coordinate,...label.alternatives])assert.equal(inside(point),false,`${label.id}を水面に表示しない`);
});

test('欧州の気候記号と全代替アンカーは元の分類格子に一致する',()=>{
  const image=readFileSync(new URL('../../public'+labels.source,import.meta.url));
  assert.equal(createHash('sha256').update(image).digest('hex'),labels.sha256);
  assert.equal(new Set(labels.labels.map(l=>l.id)).size,labels.labels.length);
  for(const l of labels.labels)for(const coordinate of [l.coordinate,...l.alternatives])assert.equal(classify(coordinate),legend.find(c=>c.code===l.code).id,`${l.id}: ${coordinate}`);
  for(const city of cities){const id=classify(city.coordinates);assert.equal(labels.cityClasses[city.id],legend.find(c=>c.id===id)?.code,city.id);}
});

test('欧州の都市名と気候記号はスマートフォンとPCで操作欄や互いを覆わない',()=>{
  const major=['london','paris','berlin','warsaw','kyiv','moscow','madrid','lisbon','rome','athens','reykjavik','bergen','oslo','helsinki','budapest'];
  const compact=['london','paris','moscow','madrid','rome','athens','reykjavik','helsinki'];
  for(const width of [360,660,950]){
    const height=width<500?450:width/1.2,bounds={left:5,top:5,right:width-5,bottom:height-32};
    const scale=Math.min(width/frame.width,(height-50)/frame.height);
    const at=c=>{const [x,y]=project(c);return {x:(width-frame.width*scale)/2+x*scale,y:15+y*scale};};
    const obstacles=[{left:width-55,top:10,right:width-8,bottom:150}];
    const places=layoutNatureLabels(cities.filter(c=>(width<500?compact:major).includes(c.id)).map(c=>({id:c.id,anchor:at(c.coordinates),width:c.name.length*13+18,height:width<500?44:32})),bounds,obstacles);
    const codes=layoutClimateCodes(labels.labels.filter(l=>!l.detail).map(l=>({id:l.id,code:l.code,anchors:[l.coordinate,...l.alternatives].map(at),width:l.code.length*10+4,height:21})),bounds,[...obstacles,...places]);
    assert.ok(codes.length>=8,`codes at ${width}`);
    const all=[...places,...codes];
    for(const [i,box] of all.entries()){
      assert.ok(box.left>=bounds.left&&box.right<=bounds.right&&box.top>=bounds.top&&box.bottom<=bounds.bottom);
      assert.ok(!obstacles.some(o=>boxesOverlap(box,o,0)));
      assert.ok(!all.slice(i+1).some(o=>boxesOverlap(box,o,0)),`${width}: ${box.id}`);
    }
  }
});
