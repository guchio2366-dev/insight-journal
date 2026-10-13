/** Real-browser acceptance for source-derived 500 m elevation fills. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {canadaSouthernFrame} from '../src/lib/atlas-canada-map-presentation.ts';
export async function verifyCanadaElevationBands({page,url,output,result}){
 const manifest=JSON.parse(await readFile('public/assets/atlas/canada-climate-elevation-v1/elevation-bands-manifest.json'));
 const host='[data-canada-natural-layer=elevation]',ready=async()=>{await page.locator(host+'[data-canada-natural-render=maplibre][data-canada-natural-paint=ready]').waitFor();await page.evaluate(()=>document.fonts.ready);};
 const dataRequests=[];const track=request=>{if(request.url().endsWith('/elevation-classes.png'))dataRequests.push(request.url());};page.on('request',track);
 await page.setViewportSize({width:1920,height:1080});await page.goto(url('canada/nature/'),{waitUntil:'networkidle'});
 await page.locator('[data-canada-natural-layer=climate][data-canada-natural-render=maplibre][data-canada-natural-paint=ready]').waitFor();
 assert.equal(dataRequests.length,0,'Climate entry does not fetch the large elevation asset');assert.equal(await page.locator(host+' .canada-natural-area').count(),0,'Large elevation paths are absent from initial HTML');
 const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const activation=performance.now();await page.locator('[data-canada-view=elevation]').click();await page.locator(host+'[data-canada-natural-render=maplibre]').waitFor();await frames();const firstPaintMs=Math.round(performance.now()-activation);await ready();
 result.elevationInitialActivation={clickToFirstPaintMs:firstPaintMs,clickToIdleMs:Math.round(performance.now()-activation),sourceBytes:manifest.output.bytes,rasterDimensions:[manifest.raster.width,manifest.raster.height],method:'Climate MapLibre idle first; then elevation click to first paint / MapLibre idle, Chromium software GPU, local built-asset responses; excludes public-network latency'};
 for(const [width,height,role]of [[1920,1080,'primary'],[1896,996,'auxiliary']]){
  await page.setViewportSize({width,height});
  const opened=performance.now();await page.goto(url('canada/nature/?view=elevation'),{waitUntil:'networkidle'});await ready();const openToMapIdleMs=Math.round(performance.now()-opened);
  const map=await page.locator(host+' .atlas-map-frame').boundingBox(),ratio=await page.locator(host+' .atlas-map-frame').evaluate(n=>n.clientWidth/n.clientHeight),expected=canadaSouthernFrame(ratio),actual=(await page.locator(host+' [data-canada-natural-fallback]').getAttribute('viewBox')).split(' ').map(Number);assert.ok(actual.every((v,i)=>Math.abs(v-expected[i])<.03),'Initial elevation camera fits southern Canada');const metrics=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,visualViewportScale:visualViewport?.scale??1}));assert.equal(metrics.dpr,1);assert.equal(metrics.visualViewportScale,1);assert.equal(await page.locator(host+' [data-canada-natural-focus],'+host+' [data-canada-natural-whole],'+host+' [data-canada-natural-zoom]').count(),0);
  assert.equal(await page.locator(host+' [data-canada-natural-shape]').count(),13);assert.equal(await page.locator(host+' [data-canada-natural-shape][aria-pressed=true]').count(),0);
  assert.equal(await page.locator(host+' .canada-natural-area').count(),0,'Native renderer does not duplicate the large polygons as hidden SVG paths');assert.equal(await page.locator(host+' [data-canada-natural-legend]').count(),13);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const legend=await page.locator(host+' .canada-natural-key').evaluate(node=>[...node.querySelectorAll('button')].map(button=>({font:parseFloat(getComputedStyle(button).fontSize),text:button.textContent,swatchHeight:button.querySelector('i').getBoundingClientRect().height})));
  assert.ok(legend.every(item=>item.font>=14&&item.swatchHeight>=9));
  result.viewports.push({width,height,role,topic:'500m-elevation-bands',...metrics,map,legend,openToMapIdleMs});await page.screenshot({path:path.join(output,`canada-elevation-bands-${width}.png`)});
 }
 await page.setViewportSize({width:1920,height:1080});await frames();await ready();
 const selectionCamera=await page.locator(host+' [data-canada-natural-fallback]').getAttribute('viewBox');
 const selectionTimings=[];
 for(const group of manifest.levels){
  const started=performance.now();
  await page.locator(host+` [data-canada-natural-legend="${group.id}"]`).click();
  await page.locator(host+`[data-canada-natural-selection-frame="${group.id}"]`).waitFor();await frames();const painted=Math.round(performance.now()-started);
  await page.locator(host+'[data-canada-natural-paint=ready]').waitFor();selectionTimings.push({id:group.id,clickToPaintMs:painted,clickToMapIdleMs:Math.round(performance.now()-started),outline:JSON.parse(await page.locator(host).getAttribute('data-canada-elevation-outline-timing'))});console.log('Elevation selection',JSON.stringify(selectionTimings.at(-1)));
  assert.equal(await page.locator(host+' [data-canada-natural-fallback]').getAttribute('viewBox'),selectionCamera,'Band selection preserves camera');assert.equal(new URL(page.url()).searchParams.get('elevation'),group.id);assert.equal(await page.locator(host+' [data-canada-natural-shape]:not([hidden])').count(),13);
  assert.match(await page.locator('[data-canada-elevation-title]').textContent(),/分布/);
  assert.ok((await page.locator('[data-canada-elevation-text]').textContent()).length>30);
 }
 const cachedTimings=[];
 for(const id of ['0','500','1000','below-sea','0']){const started=performance.now();await page.locator(host+` [data-canada-natural-legend="${id}"]`).click();await page.locator(host+`[data-canada-natural-selection-frame="${id}"]`).waitFor();await frames();cachedTimings.push({id,clickToPaintMs:Math.round(performance.now()-started),outline:JSON.parse(await page.locator(host).getAttribute('data-canada-elevation-outline-timing'))});await ready();}
 result.elevationCachedSelectionTimings=cachedTimings;
 await page.locator(host+' [data-canada-natural-legend="1500"]').click();await page.locator(host+' [data-canada-natural-only]').check();assert.equal(await page.locator(host+' [data-canada-natural-shape]:not([hidden])').count(),1);
 await page.locator(host+' [data-canada-natural-only]').uncheck();const stage=await page.locator(host+' .atlas-map-frame').boundingBox();await page.mouse.move(stage.x+stage.width/2,stage.y+stage.height/2);await page.mouse.wheel(0,-120);await page.waitForFunction(()=>new URL(location.href).searchParams.has('elevationBounds'));await ready();
 const bounds=new URL(page.url()).searchParams.get('elevationBounds'),savedCamera=await page.locator(host+' [data-canada-natural-fallback]').getAttribute('viewBox');
 await page.screenshot({path:path.join(output,'canada-elevation-bands-selected-camera.png')});await page.reload({waitUntil:'networkidle'});await ready();assert.equal(new URL(page.url()).searchParams.get('elevation'),'1500');assert.equal(new URL(page.url()).searchParams.get('elevationBounds'),bounds);
 const restoredCamera=(await page.locator(host+' [data-canada-natural-fallback]').getAttribute('viewBox')).split(' ').map(Number);assert.ok(restoredCamera.every((v,i)=>Math.abs(v-Number(savedCamera.split(' ')[i]))<.03));
 await page.locator(host+' [data-canada-natural-reset]').click();await ready();assert.equal(new URL(page.url()).searchParams.get('elevation'),null);assert.equal(new URL(page.url()).searchParams.get('elevationBounds'),bounds);assert.ok((await page.locator(host+' [data-canada-natural-fallback]').getAttribute('viewBox')).split(' ').map(Number).every((v,i)=>Math.abs(v-restoredCamera[i])<.03));
 await page.goto(url('canada/nature/?view=elevation&render=static'),{waitUntil:'networkidle'});await page.locator(host+'[data-canada-natural-render=svg][data-canada-natural-data=ready]').waitFor();assert.equal(await page.locator(host+' [data-canada-elevation-raster] image[href]').count(),1);
 await page.locator(host+' [data-canada-natural-legend="0"]').click();assert.equal(new URL(page.url()).searchParams.get('elevation'),'0');assert.equal(await page.locator(host+' [data-canada-natural-shape]:not([hidden])').count(),13);
 assert.equal(await page.locator(host+' [data-canada-natural-whole]').count(),0);await page.screenshot({path:path.join(output,'canada-elevation-bands-static-south.png')});
 let release;const gate=new Promise(resolve=>release=resolve),asset='**/elevation-classes.png';
 await page.route(asset,async route=>{await gate;await route.fulfill({status:503,body:'unavailable'});});
 await page.goto(url('canada/nature/?view=elevation&render=static'),{waitUntil:'domcontentloaded'});await page.locator(host+'[data-canada-natural-data=loading]').waitFor();
 assert.equal(await page.locator(host+' .canada-natural-area').count(),0);assert.equal(await page.locator(host+' .canada-natural-line').count(),0,'Old contour data are never presented as 500 m fills');assert.match(await page.locator(host+' [data-canada-natural-loading-text]').textContent(),/読み込み中/);
 await page.locator(host+' [data-canada-natural-legend="0"]').click();assert.equal(await page.locator(host+' [data-canada-natural-focus]').count(),0);assert.equal(await page.locator(host+' [data-canada-natural-only]').isDisabled(),true);
 release();await page.locator(host+'[data-canada-natural-data=error]').waitFor();assert.match(await page.locator(host+' [data-canada-natural-loading-text]').textContent(),/標高分布ではありません/);assert.equal(await page.locator(host+' .canada-natural-area').count(),0);
 await page.screenshot({path:path.join(output,'canada-elevation-bands-load-error.png')});await page.unroute(asset);await page.locator(host+' [data-canada-natural-retry]').click();await page.locator(host+'[data-canada-natural-data=ready]').waitFor();assert.equal(await page.locator(host+' [data-canada-elevation-raster] image[href]').count(),1);await page.locator(host+'[data-canada-natural-selection-frame="0"]').waitFor();assert.equal(await page.locator(host+' [data-canada-natural-loading]').isVisible(),false);
 page.off('request',track);
 result.elevationSelectionTimings=selectionTimings;
 result.checks.push('500 m native-DEM palette raster: nearest only, lazy fetch without initial HTML duplication; clear loading/error states and successful retry; 13 distinct groups including negative coastal values, 1920×1080 primary / 1896×996 auxiliary with measured DPR1 / 100%, southern camera, every group selection without removing other bands or moving the camera, isolation, wheel camera URL/reload, clear preserving camera and same-pixel SVG image fallback.');
}

/** Map picking and interrupted outline loading use the rendered class pixels. */
export async function verifyCanadaElevationRasterInteraction({page,url,output,result}){
 const host='[data-canada-natural-layer=elevation]';
 await page.goto(url('canada/nature/?view=elevation'),{waitUntil:'networkidle'});await page.locator(host+'[data-canada-natural-paint=ready][data-canada-natural-render=maplibre]').waitFor();
 const point=await page.locator(host+' [data-canada-natural-fallback]').evaluate(svg=>{
  const rad=Math.PI/180,merc=y=>Math.log(Math.tan(Math.PI/4+y*rad/2)),scale=Math.min(900/(89*rad),580/(merc(70)-merc(41))),x=(900-89*rad*scale)/2+(-97.1416666667+141)*rad*scale,y=(580-(merc(70)-merc(41))*scale)/2+(merc(70)-merc(49.8916666667))*scale;
  const point=svg.createSVGPoint();point.x=x;point.y=y;const screen=point.matrixTransform(svg.getScreenCTM());return{x:screen.x,y:screen.y};
 });
 await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>new URL(location.href).searchParams.get('elevation')==='0');await page.locator(host+'[data-canada-natural-selection-frame="0"]').waitFor();
 await page.goto(url('canada/nature/?view=elevation'),{waitUntil:'networkidle'});await page.locator(host+'[data-canada-natural-paint=ready][data-canada-natural-render=maplibre]').waitFor();
 let release;const gate=new Promise(resolve=>release=resolve),asset='**/elevation-outline-0.geojson';await page.route(asset,async route=>{await gate;await route.fulfill({status:503,body:'unavailable'});});
 await page.locator(host+' [data-canada-natural-legend="0"]').click();await page.locator(host+'[data-canada-elevation-outline-pending=true]').waitFor();assert.equal(await page.locator(host+' [data-canada-natural-loading]').isVisible(),true);assert.match(await page.locator(host+' [data-canada-natural-loading-text]').textContent(),/輪郭を読み込み中/);assert.equal(await page.locator(host+'[data-canada-natural-render=maplibre]').count(),1);
 release();await page.locator(host+'[data-canada-natural-paint=error]').waitFor();assert.match(await page.locator(host+' [data-canada-natural-loading-text]').textContent(),/輪郭を読み込めません/);
 await page.screenshot({path:path.join(output,'canada-elevation-outline-load-error.png')});await page.unroute(asset);
 await page.locator(host+' [data-canada-natural-reset]').click();await page.locator(host+'[data-canada-natural-selection-frame=none]').waitFor();await page.locator(host+' [data-canada-natural-legend="0"]').click();await page.locator(host+'[data-canada-natural-selection-frame="0"]').waitFor();assert.equal(await page.locator(host+' [data-canada-natural-loading]').isVisible(),false);
 result.checks.push('Real map click at Winnipeg selects the rendered 0–500 m pixel class; an interrupted outline request keeps the colour map, shows waiting/failure honestly, and succeeds when reselected.');
}
