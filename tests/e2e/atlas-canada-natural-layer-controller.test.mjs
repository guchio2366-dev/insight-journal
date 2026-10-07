import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { bundleCanadaSource } from '../fixtures/bundle-canada-source.mjs';
import { transform } from '@astrojs/compiler-rs';
import { experimental_AstroContainer } from 'astro/container';

const native = await bundleCanadaSource('src/scripts/atlas-canada-natural-layer.ts', { globalName: 'NaturalLayerNative' });
const projectionCode = await bundleCanadaSource('src/lib/atlas-canada-landform-map.ts', { format: 'esm', platform: 'node' });
const projection = await import(`data:text/javascript;base64,${Buffer.from(projectionCode).toString('base64')}`);
const contourCode = await bundleCanadaSource('src/lib/atlas-canada-natural-layer.ts', { format: 'esm', platform: 'node' });
const contourHelper = await import(`data:text/javascript;base64,${Buffer.from(contourCode).toString('base64')}`);
const contourGeometry = JSON.parse(await readFile('public/assets/atlas/canada-climate-elevation-v1/elevation-contours.geojson', 'utf8'));
const contourAnchors = contourHelper.canadaNaturalContourLabels(contourGeometry);
const stations = JSON.parse(await readFile('src/data/atlas/canada/climate.json', 'utf8')).stations;
const width = 600, height = 367;
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
let ssrComponent;
async function renderNaturalSSR(props) {
  if (!ssrComponent) {
    const compiled = transform(await readFile('src/components/atlas/CanadaNaturalLayerMap.astro', 'utf8'), { filename: 'CanadaNaturalLayerMap.astro' });
    assert.ok(!compiled.diagnostics.some(item => item.severity === 'error'));
    const modules = new Map([
      ['astro/runtime/server/index.js', import.meta.resolve('astro/runtime/server/index.js')],
      ['../../data/atlas/canada/climate-labels.json',dataModule(`export default ${await readFile('src/data/atlas/canada/climate-labels.json','utf8')};`)],
      ['../../data/atlas/natural-environment',dataModule(await bundleCanadaSource('src/data/atlas/natural-environment.ts',{format:'esm',platform:'node'}))],
      ['../../data/atlas/regional-countries.json', dataModule(`export default ${await readFile('src/data/atlas/regional-countries.json', 'utf8')};`)],
      ['maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url', dataModule('export default "/worker.js";')],
      ['../../lib/atlas-canada-landform-map', dataModule(projectionCode)],
      ['../../lib/atlas-canada-natural-layer', dataModule(contourCode)],
      ['../../lib/atlas-canada-natural-presentation',dataModule(await bundleCanadaSource('src/lib/atlas-canada-natural-presentation.ts',{format:'esm',platform:'node'}))],
    ]);
    // Standalone SSR has no Vite CSS/worker asset pipeline. Geometry and
    // component rendering run unchanged; unused compiler import metadata is inert.
    let code = compiled.code.replace(', createMetadata as $$createMetadata', '').replace(/^import ".*\.css";\n/gm, '');
    code = 'const $$createMetadata = () => ({});\n' + code;
    for (const [from, to] of modules) code = code.split(JSON.stringify(from)).join(JSON.stringify(to));
    ssrComponent = (await import(dataModule(code))).default;
  }
  const container = await experimental_AstroContainer.create();
  return container.renderToString(ssrComponent, { props });
}
const groupSets = {
  climate: [{ id: 'Dfb', name: 'Dfb', color: '#6aa45b', description: 'Continental climate' }, { id: 'ET', name: 'ET', color: '#b5adc9', description: 'Tundra climate' }],
  elevation: [{ id: '500', name: '500 m', color: '#8a734e', description: '500 m contour' }, { id: '1000', name: '1000 m', color: '#5c4838', description: '1000 m contour' }],
};
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function wheelEvent(w, deltaY, clientX = 200, clientY = 100) {
  const event = new w.WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
  // Happy DOM's WheelEvent omits the inherited MouseEvent coordinates.
  Object.defineProperty(event, 'clientX', { value: clientX }); Object.defineProperty(event, 'clientY', { value: clientY });
  return event;
}
function hostMarkup(layer) {
  const groups = groupSets[layer], cities = layer === 'climate' ? stations : [];
  const contourLabels = layer === 'elevation' ? contourAnchors.filter(label => groups.some(group => group.id === label.id)) : [];
  const config = { layer, groups, stations: cities, contourLabels, geometryUrl: '/source.geojson', workerUrl: '/worker.js', context: { type: 'FeatureCollection', features: [] } };
  return `<section data-canada-natural-layer="${layer}"><div data-canada-natural-stage>
    <svg data-canada-natural-fallback tabindex="0">${groups.map(group => `<g data-canada-natural-shape="${group.id}" tabindex="0" role="button"><path d="M100,100L200,100L200,200Z"></path></g>`).join('')}<g data-canada-natural-static-stations></g></svg>
    <div data-canada-natural-live hidden></div><div data-canada-natural-static-contours></div>${contourLabels.map(label => `<span data-canada-natural-contour-label="${label.key}" data-canada-natural-contour-id="${label.id}" hidden>${label.elevationM} m</span>`).join('')}${cities.map(city => `<button data-canada-natural-city="${city.id}" aria-label="${escape(city.name)} climate normals"><i></i><span>${escape(city.name)}</span></button>`).join('')}
    <button data-canada-natural-reset>Reset</button><button data-canada-natural-zoom="in">+</button><button data-canada-natural-zoom="out">-</button><button data-canada-natural-focus>Focus</button>
    </div>${groups.map(group => `<button data-canada-natural-legend="${group.id}">${group.name}</button>`).join('')}
    <input type="checkbox" data-canada-natural-only><p data-canada-natural-status></p><script type="application/json" data-canada-natural-config>${JSON.stringify(config).replace(/</g, '\\u003c')}</script></section>`;
}
function page() {
  const w = new Window({ url: 'https://example.com/insight-journal/atlas/north-america/canada/nature/?render=static', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  w.document.body.innerHTML = hostMarkup('climate') + hostMarkup('elevation');
  for (const stage of w.document.querySelectorAll('[data-canada-natural-stage]')) {
    Object.defineProperty(stage, 'clientWidth', { value: width }); Object.defineProperty(stage, 'clientHeight', { value: height });
  }
  // Explicit static rendering must retain the SSR geometry without a fetch.
  w.fetch = () => { throw new Error('Static rendering unexpectedly requested a network geometry'); };
  w.eval(native);
  const controllers = {}, events = [];
  for (const name of ['canada-natural-select', 'canada-natural-only', 'canada-natural-camera', 'canada-natural-reset', 'canada-natural-city']) w.document.addEventListener(name, event => events.push({ name, detail: JSON.parse(JSON.stringify(event.detail)) }));
  for (const layer of ['climate', 'elevation']) controllers[layer] = w.NaturalLayerNative.initCanadaNaturalLayer(w.document.querySelector(`[data-canada-natural-layer="${layer}"]`));
  const host = layer => w.document.querySelector(`[data-canada-natural-layer="${layer}"]`);
  const q = (layer, selector) => host(layer).querySelector(selector);
  return { w, controllers, events, host, q, async close() { for (const controller of Object.values(controllers)) controller.destroy(); await w.happyDOM.close(); } };
}
const frame = svg => svg.getAttribute('viewBox').split(/\s+/).map(Number);
const validBounds = bounds => {
  assert.equal(bounds.length, 4); assert.ok(bounds.every(Number.isFinite));
  assert.ok(bounds[0] < bounds[2] && bounds[1] < bounds[3]);
  assert.ok(bounds[0] >= -180 && bounds[2] <= 180 && bounds[1] >= -85.051 && bounds[3] <= 85.051);
};

test('No-JS contour SVG defines every original projected vertex once and references it for visible and 9px hit strokes', async () => {
  const manifest = JSON.parse(await readFile('public/assets/atlas/canada-climate-elevation-v1/elevation-manifest.json','utf8'));
  const html = await renderNaturalSSR({ layer:'elevation', geometry:contourGeometry, groups:manifest.levels, geometryUrl:'/elevation-contours.geojson', hidden:false, selected:'500', only:true });
  const w = new Window({url:'https://example.com/?render=static',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  try {
    w.document.body.innerHTML = html;
    const root = w.document.querySelector('[data-canada-natural-layer="elevation"]'), svg = root.querySelector('svg');
    assert.equal(root.hidden,false);
    assert.equal(svg.querySelectorAll('defs path[data-canada-natural-geometry]').length,manifest.levels.length);
    let vertices = 0;
    for (const group of manifest.levels) {
      const shape = root.querySelector(`[data-canada-natural-shape="${group.id}"]`), visual = shape.querySelector('.canada-natural-line'), hit = shape.querySelector('.canada-natural-line-hit');
      assert.equal(visual.localName,'use'); assert.equal(hit.localName,'use');
      assert.equal(visual.getAttribute('href'),hit.getAttribute('href'));
      const definition = w.document.getElementById(visual.getAttribute('href').slice(1));
      assert.equal(definition.closest('defs'),svg.querySelector('defs'));
      assert.equal(definition.dataset.canadaNaturalGeometry,group.id);
      const expected = contourGeometry.features.filter(feature=>String(feature.properties.id)===group.id).map(feature=>contourHelper.canadaNaturalPath(feature.geometry)).join('');
      assert.equal(definition.getAttribute('d'),expected);
      assert.equal(html.split(expected).length-1,1,'the coordinate string is serialized once, including with JavaScript disabled');
      assert.equal(shape.querySelectorAll('[d]').length,0,'instances reference geometry instead of repeating a path');
      assert.equal(hit.getAttribute('stroke-width'),'9'); assert.equal(hit.getAttribute('pointer-events'),'stroke');
      assert.equal(visual.getAttribute('stroke'),JSON.parse(root.querySelector('[data-canada-natural-config]').textContent).groups.find(g=>g.id===group.id).color);
      assert.equal(Number(visual.getAttribute('stroke-width')),contourHelper.canadaNaturalContourWidth(Number(group.id)));
      assert.equal(Number(visual.getAttribute('stroke-opacity')),contourHelper.canadaNaturalContourOpacity(Number(group.id)));
      for (const element of [definition,visual,hit]) assert.equal(element.getAttribute('vector-effect'),'non-scaling-stroke');
      assert.equal(shape.hasAttribute('hidden'),group.id!=='500');
      vertices += (definition.getAttribute('d').match(/[ML]/g)??[]).length;
    }
    const sourceVertices = contourGeometry.features.flatMap(feature=>contourHelper.canadaNaturalParts(feature.geometry)).reduce((total,part)=>total+part.length,0);
    assert.equal(vertices,sourceVertices,'every source contour vertex is retained');
    const config = JSON.parse(root.querySelector('[data-canada-natural-config]').textContent);
    assert.ok(!('geometry' in config)); assert.equal(config.geometryUrl,'/elevation-contours.geojson');
    const stage=root.querySelector('[data-canada-natural-stage]');Object.defineProperty(stage,'clientWidth',{value:width});Object.defineProperty(stage,'clientHeight',{value:height});
    w.eval(native);const controller=w.NaturalLayerNative.initCanadaNaturalLayer(root), events=[];root.addEventListener('canada-natural-select',event=>events.push(event.detail));
    root.querySelector('[data-canada-natural-shape="1000"] .canada-natural-line-hit').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
    assert.equal(events.at(-1).id,'1000','a use hit instance delegates selection to its owning group');
    const group=root.querySelector('[data-canada-natural-shape="500"]');group.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(events.at(-1).id,'500');
    controller.render({selected:'1000',only:true});assert.equal(root.querySelectorAll('[data-canada-natural-shape]:not([hidden])').length,1);
    assert.equal(root.querySelector('[data-canada-natural-shape="1000"]').classList.contains('is-selected'),true);
    controller.destroy();
  } finally { await w.happyDOM.close(); }
});

test('Natural SSR keeps station coordinates and names while excluding repeated monthly chart values from map configuration', async () => {
  const geometry = {type:'FeatureCollection',features:[{type:'Feature',properties:{id:'Dfb'},geometry:{type:'Polygon',coordinates:[[[-100,50],[-90,50],[-90,60],[-100,50]]]}}]};
  const html = await renderNaturalSSR({layer:'climate',geometry,groups:[groupSets.climate[0]],geometryUrl:'/koppen.geojson',stations,hidden:false});
  const w = new Window();
  try {
    w.document.body.innerHTML=html;
    const config=JSON.parse(w.document.querySelector('[data-canada-natural-config]').textContent);
    assert.deepEqual(config.stations,stations.map(({id,name,coordinates})=>({id,name,coordinates})));
    assert.ok(config.stations.every(station=>Object.keys(station).length===3));
    assert.equal(w.document.querySelectorAll('[data-canada-natural-static-city]').length,5);
    assert.ok(!('geometry' in config));assert.equal(w.document.querySelectorAll('.canada-natural-area').length,1);
    assert.equal(w.document.querySelectorAll('defs [data-canada-natural-geometry]').length,0,'polygon geometry is unchanged');
  } finally { await w.happyDOM.close(); }
});

test('Deferred climate startup preserves visible SSR without a request until the parent activates the layer', async () => {
  const geometry = { type: 'FeatureCollection', features: groupSets.climate.map((group, index) => ({
    type: 'Feature', properties: { id: group.id },
    geometry: { type: 'Polygon', coordinates: [[[-100 + index * 10, 50], [-90 + index * 10, 50], [-90 + index * 10, 60], [-100 + index * 10, 50]]] },
  })) };
  const geometryUrl = '/insight-journal/assets/atlas/canada-climate-elevation-v1/koppen.geojson';
  const html = await renderNaturalSSR({ layer: 'climate', geometry, groups: groupSets.climate, geometryUrl, stations, hidden: false });
  // Only WebGL is replaced. The real SSR component, controller and geometry
  // loader run on a water URL, before the parent applies its restored mode.
  const mapStub = `export function setWorkerUrl(){}; export function setWorkerCount(){};
    export class Map {
      constructor(options){this.options=options;this.bounds=options.bounds;this.canvas=document.createElement('canvas');options.container.append(this.canvas);(window.__naturalMaps??=[]).push(this);this.touchZoomRotate={disableRotation(){}};this.keyboard={disableRotation(){}};}
      on(){return this;} once(name,listener){if(name==='load')queueMicrotask(listener);return this;}
      getCanvas(){return this.canvas;} setFilter(){} resize(){} remove(){}
      fitBounds(bounds){this.bounds=bounds;}
      getBounds(){return {getWest:()=>this.bounds[0][0],getSouth:()=>this.bounds[0][1],getEast:()=>this.bounds[1][0],getNorth:()=>this.bounds[1][1]};}
      project(coordinates){return {x:(coordinates[0]+145)/95*600,y:(85-coordinates[1])/45*367};}
    }`;
  const filename = path.resolve('src/scripts/atlas-canada-natural-layer.ts');
  const bundle = await build({
    stdin: { contents: await readFile(filename, 'utf8'), resolveDir: path.dirname(filename), sourcefile: filename, loader: 'ts' },
    tsconfigRaw: { compilerOptions: {} }, bundle: true, write: false, platform: 'browser', format: 'iife', globalName: 'DeferredNaturalLayer',
    plugins: [{ name: 'natural-layer-webgl-boundary', setup(builder) {
      builder.onResolve({ filter: /^maplibre-gl$/ }, () => ({ path: 'maplibre', namespace: 'natural-map-stub' }));
      builder.onLoad({ filter: /.*/, namespace: 'natural-map-stub' }, () => ({ contents: mapStub, loader: 'js' }));
      builder.onResolve({ filter: /^\./ }, args => ({ path: path.resolve(args.resolveDir, args.path + '.ts'), namespace: 'natural-local-source' }));
      builder.onLoad({ filter: /.*/, namespace: 'natural-local-source' }, async args => ({ contents: await readFile(args.path, 'utf8'), loader: 'ts', resolveDir: path.dirname(args.path) }));
    } }],
  });
  const w = new Window({ url: 'https://example.com/insight-journal/atlas/north-america/canada/nature/?view=water', settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  let controller;
  try {
    w.document.body.innerHTML = html;
    const root = w.document.querySelector('[data-canada-natural-layer="climate"]');
    const stage = root.querySelector('[data-canada-natural-stage]'), fallback = root.querySelector('[data-canada-natural-fallback]');
    Object.defineProperties(stage, { clientWidth: { value: width }, clientHeight: { value: height } });
    const sourcePath = fallback.querySelector('.canada-natural-area').getAttribute('d'), requests = [];
    w.fetch = async url => { requests.push(String(url)); return { ok: true, json: async () => geometry }; };
    w.eval(bundle.outputFiles[0].text);
    assert.equal(root.hidden, false, 'the server initially exposes climate even for a restored water URL');
    controller = w.DeferredNaturalLayer.initCanadaNaturalLayer(root, { deferStart: true });
    assert.deepEqual(requests, [], 'construction must not request climate geometry before the parent chooses its mode');
    assert.equal(root.dataset.canadaNaturalRender, 'svg');
    assert.equal(fallback.querySelector('.canada-natural-area').getAttribute('d'), sourcePath, 'deferred startup retains the server geometry');
    assert.ok(frame(fallback).every(Number.isFinite), 'the visible SSR map is drawn at positive layout dimensions');

    root.hidden = true;
    const selection = { selected: 'Dfb', only: true, city: 'ottawa' };
    controller.render(selection);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.deepEqual(requests, [], 'a hidden climate render during water restoration must not fetch');
    assert.equal(w.__naturalMaps, undefined);

    root.hidden = false;
    controller.render(selection);
    controller.render(selection);
    for (let attempt = 0; attempt < 100 && root.dataset.canadaNaturalRender !== 'maplibre'; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.deepEqual(requests, ['https://example.com' + geometryUrl], 'activation requests the configured climate geometry once');
    assert.equal(root.dataset.canadaNaturalRender, 'maplibre', w.happyDOM.virtualConsolePrinter.readAsString());
    assert.equal(w.__naturalMaps.length, 1, 'render and visibility changes share one renderer');
    assert.deepEqual(JSON.parse(JSON.stringify(w.__naturalMaps[0].options.style.sources['canada-natural-groups'].data.features.map(feature => feature.properties.id))), ['Dfb', 'ET']);
    assert.equal(root.querySelector('[data-canada-natural-shape="Dfb"]').getAttribute('aria-pressed'), 'true');
    assert.equal(root.querySelector('[data-canada-natural-shape="ET"]').hasAttribute('hidden'), true, 'the parent selection survives asynchronous activation');
    assert.equal(root.querySelector('[data-canada-natural-live]').hidden, false);
    assert.equal(fallback.getAttribute('aria-hidden'), 'true');
    controller.render(selection);
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(requests.length, 1, 'later redraws do not refetch the active layer');
  } finally { controller?.destroy(); await w.happyDOM.close(); }
});

test('Sparse contour labels are exact source vertices at the original EGM2008 height, with 500 m visually lighter than major lines', () => {
  assert.equal(contourAnchors.length, 8);
  assert.deepEqual(new Set(contourAnchors.map(label => label.id)), new Set(contourGeometry.features.map(feature => String(feature.properties.id))));
  for (const label of contourAnchors) {
    const feature = contourGeometry.features.find(feature => String(feature.properties.id) === label.id);
    assert.equal(label.elevationM, feature.properties.elevation_m);
    assert.ok(contourHelper.canadaNaturalParts(feature.geometry).some(part => part.some(coordinate => coordinate[0] === label.coordinates[0] && coordinate[1] === label.coordinates[1])), `${label.key} stays on its original contour vertex`);
  }
  assert.equal(contourHelper.canadaNaturalContourLabels({type:'FeatureCollection',features:[{type:'Feature',properties:{id:'500',elevation_m:1000},geometry:{type:'LineString',coordinates:[[-120,50],[-119,51]]}}]}).length,0,'a mismatched height must never become a numeric label');
  assert.ok(contourHelper.canadaNaturalContourWidth(500) < contourHelper.canadaNaturalContourWidth(1000));
  assert.ok(contourHelper.canadaNaturalContourOpacity(500) < contourHelper.canadaNaturalContourOpacity(1000));
});

test('Contour labels share the map projection and follow selection, only display, zoom and edge filtering without changing source heights', async () => {
  const p = page();
  try {
    const svg = p.q('elevation','[data-canada-natural-fallback]'), activeFrame = frame(svg);
    const visible = () => [...p.host('elevation').querySelectorAll('[data-canada-natural-contour-label]:not([hidden])')];
    assert.ok(visible().length >= 2);
    assert.equal(p.q('elevation','[data-canada-natural-static-contours]').hasAttribute('hidden'),true,'JS uses the same HTML labels with either renderer instead of duplicating the SSR text');
    const ratio = Math.min(width/activeFrame[2],height/activeFrame[3]), left = (width-activeFrame[2]*ratio)/2, top = (height-activeFrame[3]*ratio)/2;
    for (const element of visible()) {
      const label = contourAnchors.find(label=>label.key===element.dataset.canadaNaturalContourLabel), point = projection.projectCanadaLandform(label.coordinates);
      assert.equal(element.textContent,`${label.elevationM} m`);
      assert.ok(Math.abs(parseFloat(element.style.left)-((point[0]-activeFrame[0])*ratio+left))<1e-6);
      assert.ok(Math.abs(parseFloat(element.style.top)-((point[1]-activeFrame[1])*ratio+top))<1e-6);
    }
    p.controllers.elevation.render({selected:'500',only:true});
    assert.ok(visible().length); assert.ok(visible().every(element=>element.dataset.canadaNaturalContourId==='500'&&element.classList.contains('is-selected')));
    p.controllers.elevation.render({selected:'1000',only:true});
    assert.equal(visible().length,1); assert.equal(visible()[0].textContent,'1000 m');
    const before = [...visible()].map(element=>[element.style.left,element.style.top]);
    p.controllers.elevation.zoom('in');
    assert.notDeepEqual([...visible()].map(element=>[element.style.left,element.style.top]),before,'numeric labels move with the camera');
    p.controllers.elevation.render({selected:'1000',only:true,bounds:[-80,40,-60,60]});
    assert.equal(visible().length,0,'labels outside the restored viewport remain hidden');
    p.controllers.elevation.render({selected:'1000',only:true,bounds:null});
    assert.equal(visible().length,1); assert.equal(visible()[0].textContent,'1000 m');
  } finally { await p.close(); }
});

test('Natural layer selection, isolation and city events stay host-owned and keep climate and elevation separate', async () => {
  const p = page();
  try {
    p.q('climate', '[data-canada-natural-legend="Dfb"]').click();
    assert.deepEqual(p.events.at(-1), { name: 'canada-natural-select', detail: { layer: 'climate', id: 'Dfb' } });
    assert.equal(p.q('climate', '[data-canada-natural-shape="Dfb"]').getAttribute('aria-pressed'), 'false', 'selection is applied by the host render');
    p.controllers.climate.render({ selected: 'Dfb', only: true, city: 'ottawa' });
    assert.equal(p.q('climate', '[data-canada-natural-shape="Dfb"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual([...p.host('climate').querySelectorAll('[data-canada-natural-shape]:not([hidden])')].map(shape => shape.dataset.canadaNaturalShape), ['Dfb']);
    assert.equal(p.q('climate', '[data-canada-natural-only]').checked, true);
    assert.equal(p.host('elevation').querySelectorAll('[data-canada-natural-shape]:not([hidden])').length, 2);
    p.q('climate', '[data-canada-natural-shape="Dfb"]').dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.deepEqual(p.events.at(-1).detail, { layer: 'climate', id: 'Dfb' });
    const only = p.q('climate', '[data-canada-natural-only]'); only.checked = false; only.dispatchEvent(new p.w.Event('change'));
    assert.deepEqual(p.events.at(-1), { name: 'canada-natural-only', detail: { layer: 'climate', only: false } });
    p.q('elevation', '[data-canada-natural-legend="1000"]').click();
    assert.deepEqual(p.events.at(-1).detail, { layer: 'elevation', id: '1000' });
    p.controllers.elevation.render({ selected: '1000', only: true });
    assert.equal(p.host('elevation').querySelectorAll('[data-canada-natural-shape]:not([hidden])').length, 1);
    p.q('climate', '[data-canada-natural-city="vancouver"]').click();
    assert.deepEqual(p.events.at(-1), { name: 'canada-natural-city', detail: { layer: 'climate', id: 'vancouver' } });
    p.controllers.climate.render({ selected: 'Dfb', only: false, city: 'vancouver' });
    assert.equal(p.q('climate', '[data-canada-natural-city="vancouver"]').getAttribute('aria-pressed'), 'true');
    assert.equal(p.q('climate', '[data-canada-natural-legend="Dfb"]').getAttribute('aria-pressed'), 'true', 'city selection does not change classification');
    const activeFrame = frame(p.q('climate', '[data-canada-natural-fallback]'));
    const ratio = Math.min(width / activeFrame[2], height / activeFrame[3]), offsetX = (width - activeFrame[2] * ratio) / 2, offsetY = (height - activeFrame[3] * ratio) / 2;
    assert.equal(stations.length, 5);
    for (const station of stations) {
      const [x, y] = projection.projectCanadaLandform(station.coordinates), button = p.q('climate', `[data-canada-natural-city="${station.id}"]`);
      assert.ok(Math.abs(parseFloat(button.style.left) - ((x - activeFrame[0]) * ratio + offsetX)) < 1e-6, `${station.id} stays at its real longitude`);
      assert.ok(Math.abs(parseFloat(button.style.top) - ((y - activeFrame[1]) * ratio + offsetY)) < 1e-6, `${station.id} stays at its real latitude`);
    }
    p.controllers.climate.render({ selected: null, only: true });
    assert.equal(p.q('climate', '[data-canada-natural-only]').checked, false);
    assert.equal(p.q('climate', '[data-canada-natural-only]').disabled, true);
    assert.equal(p.host('climate').querySelectorAll('[data-canada-natural-shape]:not([hidden])').length, 2);
    p.controllers.climate.destroy(); const count = p.events.length;
    p.q('climate', '[data-canada-natural-legend="ET"]').click(); assert.equal(p.events.length, count);
  } finally { await p.close(); }
});

test('Selected city names win collisions on every redraw while all real coordinate markers and accessible names remain', async () => {
  const p = page();
  try {
    const western = ['vancouver', 'winnipeg', 'regina'];
    const buttons = [...p.host('climate').querySelectorAll('[data-canada-natural-city]')];
    const positions = new Map(buttons.map(button => [button.dataset.canadaNaturalCity, [button.style.left, button.style.top]]));
    for (const button of buttons) Object.defineProperty(button.querySelector('span'), 'offsetWidth', { configurable: true, value: 70 });
    p.controllers.climate.render({selected:null,only:false,city:'ottawa'});
    // Southern viewport expands marker spacing; verify actual overlaps instead of assuming Vancouver must be hidden.
    for(const button of buttons){const text=button.querySelector('span');if(text.hidden)continue;const x=parseFloat(button.style.left),y=parseFloat(button.style.top),left=x-6+parseFloat(text.style.left),cy=y-12+parseFloat(text.style.top);for(const other of buttons.filter(b=>b!==button)){const mx=parseFloat(other.style.left),my=parseFloat(other.style.top);assert.ok(!(left<mx+6&&left+70>mx-6&&cy-11<my+12&&cy+11>my-12));}}
    for (const button of buttons) {
      // Browser widths collapse when a span is hidden. Mimic that to detect
      // stale measurements when a previously hidden city is selected.
      Object.defineProperty(button.querySelector('span'), 'offsetWidth', { value: 250 });
      Object.defineProperty(button, 'offsetHeight', { value: 30 });
    }
    for (const city of western) for (let redraw = 0; redraw < 3; redraw++) {
      p.controllers.climate.render({ selected: 'Dfb', only: false, city });
      const selected = p.q('climate', `[data-canada-natural-city="${city}"]`);
      assert.equal(selected.querySelector('span').hidden, false, 'the selected name is always visible');
      assert.equal(selected.style.zIndex, '2', 'the selected name is above neighboring label backgrounds');
      const text=selected.querySelector('span'), x=parseFloat(selected.style.left), y=parseFloat(selected.style.top);
      const textBox=[x-6+parseFloat(text.style.left),y-12+parseFloat(text.style.top)-11,x-6+parseFloat(text.style.left)+250,y-12+parseFloat(text.style.top)+11];
      for (const button of buttons.filter(button=>button!==selected)) {
        const mx=parseFloat(button.style.left),my=parseFloat(button.style.top);
        assert.ok(!(textBox[0]<mx+6&&textBox[2]>mx-6&&textBox[1]<my+12&&textBox[3]>my-12),'selected text does not cover any other real marker button');
      }
      // Nonselected names may remain when the southern viewport leaves enough space.
      for (const button of buttons) {
        assert.equal(button.hidden, false, 'in-frame coordinate markers remain interactive');
        assert.equal(button.querySelector('i').hidden, false, 'the point glyph remains visible');
        assert.deepEqual([button.style.left, button.style.top], positions.get(button.dataset.canadaNaturalCity), 'label priority never moves a geographic point');
        assert.ok(button.getAttribute('aria-label').includes(stations.find(station => station.id === button.dataset.canadaNaturalCity).name));
      }
    }
  } finally { await p.close(); }
});

test('Static natural layer pan, wheel and zoom save ordered geographic bounds and restore a camera URL without emitting an edit', async () => {
  const p = page();
  try {
    const svg = p.q('climate', '[data-canada-natural-fallback]'), full = frame(svg), elevationFull = frame(p.q('elevation', '[data-canada-natural-fallback]'));
    p.q('climate', '[data-canada-natural-zoom="in"]').click(); assert.ok(frame(svg)[2] < full[2]);
    assert.equal(p.events.at(-1).name, 'canada-natural-camera'); assert.equal(p.events.at(-1).detail.layer, 'climate'); validBounds(p.events.at(-1).detail.bounds);
    const previous = frame(svg), saved = p.events.at(-1).detail.bounds;
    const url = new URL(p.w.location.href); url.searchParams.set('climateBounds', saved.join(',')); p.w.history.replaceState(null, '', url.href);
    p.controllers.climate.reset(); const count = p.events.length;
    p.controllers.climate.render({ selected: null, only: false, bounds: new URL(p.w.location.href).searchParams.get('climateBounds').split(',').map(Number) });
    assert.equal(p.events.length, count, 'restoring a saved URL does not append a camera history entry');
    assert.ok(frame(svg).every((value, index) => Math.abs(value - previous[index]) < .001));
    svg.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); validBounds(p.events.at(-1).detail.bounds);
    const beforeDrag = frame(svg); svg.setPointerCapture = () => {};
    for (const [type, x] of [['pointerdown', 200], ['pointermove', 250], ['pointerup', 250]]) svg.dispatchEvent(new p.w.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: x, clientY: 180, bubbles: true }));
    assert.ok(frame(svg)[0] < beforeDrag[0]); validBounds(p.events.at(-1).detail.bounds);
    const wheel = wheelEvent(p.w, -80), beforeWheel = frame(svg);
    p.q('climate', '[data-canada-natural-stage]').dispatchEvent(wheel);
    assert.equal(wheel.defaultPrevented, true, 'the map owns wheel behavior and prevents page scrolling'); assert.ok(frame(svg)[2] < beforeWheel[2], JSON.stringify({beforeWheel, afterWheel:frame(svg)}));
    await new Promise(resolve => setTimeout(resolve, 150)); validBounds(p.events.at(-1).detail.bounds);
    p.q('climate', '[data-canada-natural-reset]').click(); assert.deepEqual(frame(svg), full);
    assert.deepEqual(p.events.at(-1), { name: 'canada-natural-reset', detail: { layer: 'climate' } });
    assert.deepEqual(frame(p.q('elevation', '[data-canada-natural-fallback]')), elevationFull, 'climate camera operations do not move elevation');
    p.q('climate', '[data-canada-natural-stage]').dispatchEvent(wheelEvent(p.w, -40));
    p.q('climate', '[data-canada-natural-reset]').click(); const resetCount = p.events.length;
    await new Promise(resolve => setTimeout(resolve, 150)); assert.equal(p.events.length, resetCount, 'reset cancels a pending wheel camera commit');
    assert.equal(p.host('climate').dataset.canadaNaturalRender, 'svg');
  } finally { await p.close(); }
});
