/** User-operated PC regression cases for the existing sandboxed CI browser. */
import assert from 'node:assert/strict';

const map = {agriculture: '[data-agriculture-map]', nature: '[data-mexico-nature-main-map]', industry: '[data-mi-map="primary"]', population: '[data-population-map]'};

async function settled(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-mexico-workspace]');
    if (!node) return false;
    const key = {agriculture: 'agricultureReady', nature: 'mexicoNatureReady', industry: 'miReady', population: 'populationReady'}[node.dataset.mexicoField];
    return ['1', 'true'].includes(node.dataset[key]);
  });
  await page.evaluate(async () => {await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));});
}

async function reveal(locator) {
  // Open real disclosure controls; do not change DOM visibility to make tests pass.
  const outermostClosed = locator.locator('xpath=ancestor::details[not(@open)][last()]');
  while (await outermostClosed.count()) await outermostClosed.locator(':scope > summary').click();
}
async function click(page, selector) {const locator = page.locator(selector).first(); await reveal(locator); await locator.click(); await settled(page);}
async function select(page, selector, value) {const locator = page.locator(selector).first(); await reveal(locator); await locator.selectOption(value); await settled(page);}
async function check(page, selector, value) {const locator = page.locator(selector).first(); await reveal(locator); await locator.setChecked(value); await settled(page);}
async function text(page, selector) {return (await page.locator(selector).first().textContent())?.trim() ?? '';}
async function frame(page, field) {return page.locator(map[field]).getAttribute('viewBox');}

async function populationNationalLayout(page) {
  if (await page.locator('[data-locality-frame]:visible').count()) {
    const layout = await page.evaluate(() => {
      const root = document.querySelector('[data-mexico-field="population"]');
      const box = node => {const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      const frame=root.querySelector('[data-locality-frame]'), settings=root.querySelector('[data-population-display-settings]');
      const canvas=frame.querySelector('canvas'), pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let paintedPixels=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)paintedPixels++;
      return {map:box(frame),canvas:{...box(canvas),paintedPixels},landStates:frame.querySelectorAll('use').length,settings:{open:settings.open,box:box(settings)},dataset:{...root.dataset},state:root.querySelector('[data-population-state]').value,view:root.querySelector('[data-population-view]').value,legend:root.querySelector('[data-locality-legend]').textContent,total:root.querySelector('[data-locality-total]').textContent,labels:[...root.querySelectorAll('[data-locality-labels] text')].map(node=>({text:node.textContent,...box(node)}))};
    });
    assert.equal(layout.dataset.localityPopulationReady,'true');
    assert.equal(layout.dataset.localityVisiblePopulation,'126014024');
    assert.equal(layout.dataset.localityVisibleCount,'189432');
    assert.equal(layout.dataset.localityMarkCount,'8359');
    assert.equal(layout.dataset.localityMode,'cluster');
    assert.equal(layout.state,'');assert.equal(layout.view,'locality');
    assert.equal(layout.landStates,32);assert(layout.canvas.width>250&&layout.canvas.height>160);assert(layout.canvas.paintedPixels>1000,'The actual population point layer must paint visible pixels');
    assert.match(layout.legend,/面積.*人数/s);assert.match(layout.legend,/代表位置/);
    assert.equal(layout.settings.open,false);assert(layout.settings.box.top>=layout.map.bottom-1.5);
    assert(layout.labels.length>0&&layout.labels.every(label=>label.left>=layout.map.left-1.5&&label.right<=layout.map.right+1.5&&label.top>=layout.map.top-1.5&&label.bottom<=layout.map.bottom+1.5),'Locality labels must fit the map');
    return layout;
  }
  const layout = await page.evaluate(() => {
    const svg = document.querySelector('[data-population-map]');
    const bounds = node => {const box = node.getBoundingClientRect(); return {left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height};};
    const map = bounds(svg), clip = {...map}, ancestors = [];
    for (let node = svg.parentElement; node && !node.classList.contains('atlas-map-column'); node = node.parentElement) {
      const style = getComputedStyle(node), box = bounds(node);
      if (/(hidden|clip|auto|scroll)/.test(style.overflowX)) {clip.left = Math.max(clip.left, box.left); clip.right = Math.min(clip.right, box.right);}
      if (/(hidden|clip|auto|scroll)/.test(style.overflowY)) {clip.top = Math.max(clip.top, box.top); clip.bottom = Math.min(clip.bottom, box.bottom);}
      ancestors.push({tag: node.tagName, className: node.className, box, overflowX: style.overflowX, overflowY: style.overflowY});
    }
    const shapes = [...svg.querySelectorAll('path[data-population-state-shape]')].map(node => ({state: node.getAttribute('data-population-state-shape'), ...bounds(node)}));
    const labels = [...svg.querySelectorAll('[data-population-state-label]')].filter(node => !node.closest('[hidden]') && getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().width > 0).map(node => {
      const label = node.querySelector('text') ?? node, matrix = label.getScreenCTM();
      return {text: label.textContent.trim(), screenFontSize: parseFloat(getComputedStyle(label).fontSize) * Math.hypot(matrix.a, matrix.b), ...bounds(label)};
    });
    const settings = document.querySelector('details[data-population-display-settings]');
    const controls = [...document.querySelectorAll('select[data-population-view],select[data-population-state]')].map(node => ({inSettings: settings?.contains(node) ?? false, inMapFrame: Boolean(node.closest('#mexico-population-distribution'))}));
    return {map, clip, ancestors, shapes, labels, settings: settings ? {open: settings.open, box: bounds(settings), summary: settings.querySelector('summary')?.textContent} : null, controls, preserveAspectRatio: svg.getAttribute('preserveAspectRatio')};
  });
  assert.equal(layout.shapes.length, 32);
  for (const shape of layout.shapes) assert(shape.left >= layout.clip.left - 1.5 && shape.right <= layout.clip.right + 1.5 && shape.top >= layout.clip.top - 1.5 && shape.bottom <= layout.clip.bottom + 1.5, `State ${shape.state} is clipped in the nationwide population map`);
  assert(layout.labels.length > 0 && layout.labels.every(label => /[ぁ-んァ-ヶ一-龯]/u.test(label.text) && !/^[A-Za-z.\s]+$/.test(label.text)), 'Nationwide population labels must use readable Japanese place names');
  assert(layout.settings && !layout.settings.open, 'Initial population display controls must be in a closed disclosure');
  assert(layout.settings.box.top >= layout.map.bottom - 1.5, 'Population selectors must be below the map');
  assert.equal(layout.controls.length, 2);
  assert(layout.controls.every(control => control.inSettings && !control.inMapFrame), 'Population selectors must belong to the disclosure below the map');
  return layout;
}

async function religionOverviewLayout(page) {
  const layout = await page.locator('[data-population-overview-category="religion"]').evaluate(root => {
    const box = node => {const r = node.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom};};
    const cards = [...root.querySelectorAll('.population-overview-card')].map(node => ({...box(node), title: node.querySelector('.population-overview-card-title')?.textContent, svg: box(node.querySelector('svg')), text: node.textContent, stateCount: node.querySelectorAll('use[data-overview-state]').length}));
    const denominators = [...root.querySelectorAll('[data-population-overview-denominator="religion"]')].map(node => ({text: node.textContent, ...box(node)}));
    return {container: box(root), cards, denominators};
  });
  assert.equal(layout.cards.length, 3);
  const ordered = [...layout.cards].sort((a, b) => a.x - b.x);
  assert(Math.max(...ordered.map(card => card.y)) - Math.min(...ordered.map(card => card.y)) <= 2, 'PC religion maps must share one row');
  assert(Math.max(...ordered.map(card => card.width)) - Math.min(...ordered.map(card => card.width)) <= 2, 'PC religion maps must have equal-width cards');
  for (const [index, card] of ordered.entries()) {
    assert.equal(card.stateCount, 32); assert(card.svg.width > 100 && card.svg.height > 60, 'Religion overview map must remain readable');
    if (index) assert(ordered[index - 1].right <= card.x + .5, 'Religion overview cards must not overlap');
    assert(card.right <= layout.container.right + 1, 'Religion overview must fit the PC map column');
    assert(!card.text.includes('分母：'), 'The common religion denominator must not repeat in each card');
  }
  assert.equal(layout.denominators.length, 1, 'Religion overview must show the common denominator once');
  assert.match(layout.denominators[0].text, /全.*人口|全.*住民/);
  return layout;
}

async function cityClimateReadingLayout(page, requestedId) {
  const layout = await page.evaluate(requestedId => {
    const plot = [...document.querySelectorAll('section[data-mexico-climate-plot]')].find(node => requestedId ? node.getAttribute('data-mexico-climate-plot') === requestedId : !node.hidden);
    if (!plot) throw new Error('The selected city climate plot is missing');
    const id = plot.getAttribute('data-mexico-climate-plot');
    const box = node => {if (!node) return null; const r = node.getBoundingClientRect(); return {top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height};};
    const svg = plot.querySelector('svg'), figure = plot.querySelector(':scope > .atlas-climate-plot') ?? svg;
    const reading = plot.querySelector('[data-mexico-climate-city-reading]'), heading = reading?.querySelector('[data-mexico-climate-city-class]'), explanation = reading?.querySelector('[data-mexico-climate-city-explanation]');
    const observations = plot.querySelector('details[data-mexico-climate-city-observations]');
    return {id, hidden: plot.hidden, chart: box(svg), reading: box(reading), heading: box(heading), explanation: box(explanation), panel: box(plot.closest('.mexico-reading')), classification: heading?.textContent.trim(), explanationText: explanation?.textContent.trim(), directlyAfterChart: figure?.nextElementSibling === reading, observations: observations ? {open: observations.open, reading: observations.querySelector('[data-mexico-climate-observation-reading]')?.textContent.trim(), rows: observations.querySelectorAll('tbody tr').length, sourceLinks: [...observations.querySelectorAll('a[href]')].map(link => ({text: link.textContent, href: link.getAttribute('href')})), text: observations.textContent, afterReading: Boolean(reading?.compareDocumentPosition(observations) & Node.DOCUMENT_POSITION_FOLLOWING)} : null};
  }, requestedId);
  assert(!layout.hidden && layout.chart?.height > 0 && layout.heading?.height > 0 && layout.explanation?.height > 0, 'The plot, city classification and explanation must be rendered');
  assert(layout.directlyAfterChart, 'The city classification and explanation must directly follow its diagram');
  assert(layout.reading.top >= layout.chart.bottom - 1.5 && layout.reading.top - layout.chart.bottom <= 32, 'The city reading must sit immediately below the plot');
  assert(layout.heading.bottom <= layout.panel.bottom + 1.5 && layout.explanation.top < layout.panel.bottom, 'The city classification and start of its explanation must be visible in the reading panel');
  const expected = layout.id === 'mexico-city-tacubaya' ? ['温帯', '亜湿潤', 'C(w1)(w)'] : ['半乾燥', '高温', "BS1(h')hw"];
  for (const word of expected) assert(layout.classification?.includes(word), `Missing city classification: ${word}`);
  assert((layout.explanationText?.length ?? 0) > 30 && /[ぁ-んァ-ヶ一-龯]/u.test(layout.explanationText), 'City classification needs a Japanese explanation');
  assert(layout.observations && !layout.observations.open && layout.observations.afterReading, 'Observed values and source notes must be in the following closed disclosure');
  assert((layout.observations.reading?.length ?? 0) > 30);
  assert.equal(layout.observations.rows, 12); assert(layout.observations.sourceLinks.length > 0);
  assert.match(layout.observations.text, /1991[–—-]2020/);
  return layout;
}

export async function inspectMexicoInitialPresentation(page, field) {
  if (field === 'population') return {populationNationalLayout: await populationNationalLayout(page)};
  if (field === 'nature') return {cityClimateReadingLayout: await cityClimateReadingLayout(page)};
  return null;
}

async function legibleNumericTicks(page) {
  const ticks = await page.locator('.mexico-quantitative-ticks > span').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return {text: node.textContent, x: box.x, y: box.y, width: box.width, height: box.height};
  }));
  assert(ticks.length >= 6);
  for (const [index, a] of ticks.entries()) for (const b of ticks.slice(index + 1)) {
    assert(!(Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 0), `Numeric legend labels overlap: ${a.text} / ${b.text}`);
  }
  return ticks;
}
function query(page, key) {return new URL(page.url()).searchParams.get(key);}

async function snapshot(page) {
  return page.evaluate(() => {
    const node = document.querySelector('[data-mexico-workspace]'), url = new URL(location.href); url.searchParams.sort();
    const controls = [...node.querySelectorAll('select,input[type="checkbox"]')].map(element => ({selector: [...element.attributes].filter(attr => attr.name.startsWith('data-')).map(attr => `[${attr.name}${attr.value ? `="${attr.value}"` : ''}]`).join(''), value: element.value, ...(element.type === 'checkbox' ? {checked: element.checked} : {})}));
    const frames = [...node.querySelectorAll('[data-agriculture-map],[data-mexico-nature-main-map],[data-mi-map],[data-population-map]')].map(element => ({id: element.getAttribute('data-mi-map') ?? element.tagName, viewBox: element.getAttribute('viewBox')}));
    return {url: url.href, field: node.dataset.mexicoField, controls, frames};
  });
}
async function restored(page, expected, label) {await settled(page); assert.deepEqual(await snapshot(page), expected, label);}
async function reload(page) {const before = await snapshot(page); await page.reload({waitUntil: 'domcontentloaded'}); await restored(page, before, 'Reload must preserve URL, controls and camera');}
async function history(page, action) {
  const before = await snapshot(page); await action(); const after = await snapshot(page);
  assert.notEqual(after.url, before.url, 'Operation must create a distinct navigable state');
  await page.goBack(); await restored(page, before, 'Back must restore the previous state');
  await page.goForward(); await restored(page, after, 'Forward must restore the selected state');
}
function steps(page, evidence) {
  return async (name, action) => {
    const record = {name, status: 'running', beforeUrl: page.url()}; evidence.steps.push(record);
    try {record.details = await action(); record.state = await snapshot(page); record.status = 'passed';}
    catch (error) {record.status = 'failed'; record.failure = String(error); throw error;}
  };
}
async function zoom(page, field, inSelector, outSelector, resetSelector) {
  const initial = await frame(page, field);
  await click(page, inSelector); const enlarged = await frame(page, field); assert.notEqual(enlarged, initial, 'Zoom must change the map viewBox');
  await reload(page); await click(page, outSelector); await click(page, resetSelector);
  assert.equal(await frame(page, field), initial, 'Reset must restore the national viewBox');
  return {initial, enlarged, reset: await frame(page, field)};
}

async function agriculture({page, evidence}) {
  const step = steps(page, evidence);
  await step('Compact livestock badges and comparable production-value order',async()=>{
    const layout=await page.evaluate(()=>({icons:[...document.querySelectorAll('.atlas-livestock-marker i')].map(node=>{const r=node.getBoundingClientRect();return {width:r.width,height:r.height};}),order:[...document.querySelectorAll('[data-crop-key] [data-crop-select]')].map(node=>node.getAttribute('data-crop-select')),groups:[...document.querySelectorAll('.atlas-receipt-group')].map(group=>[...group.querySelectorAll('.atlas-bar-row strong')].map(node=>parseFloat(node.textContent)))}));
    const desktop=await page.evaluate(()=>matchMedia('(min-width:960px)').matches),iconLimit=desktop?20:30;
    assert(layout.icons.length>0&&layout.icons.every(icon=>icon.width<=iconLimit&&icon.height<=iconLimit));
    assert.equal(layout.order[0],'corn');assert(layout.order.indexOf('wheat')>layout.order.indexOf('vegetables'));assert(layout.order.indexOf('rice')>layout.order.indexOf('coffee'));
    assert(layout.groups.every(values=>values.every((value,index)=>index===0||value<=values[index-1])));
    assert.equal(await page.locator('[data-mexico-state-selection],[data-mexico-forest-states]').count(),0);return layout;
  });
  await step('All crop and livestock distributions remain after crop selection', async () => {
    await click(page, '[data-crop-select="corn"]');
    assert.match(await text(page, '#agri-reading-heading'), /とうもろこし/);
    const distribution = await page.evaluate(() => {
      const node = document.querySelector('[data-mexico-agriculture-atlas]');
      const paths = [...node.querySelectorAll('[data-mexico-crop-zones] path')].map(path => ({id: path.getAttribute('data-crop-zone'), hidden: !!path.closest('[hidden]'), opacity: getComputedStyle(path).fillOpacity, stroke: getComputedStyle(path).stroke, strokeWidth: getComputedStyle(path).strokeWidth}));
      const labels = [...node.querySelectorAll('[data-crop-label]')].filter(label => !label.closest('[hidden]')).map(label => ({id: label.getAttribute('data-crop-label'), fill: getComputedStyle(label).fill, sourceFill: getComputedStyle(node.querySelector(`[data-mexico-crop-zones] [data-crop-zone="${label.getAttribute('data-crop-label')}"]`)).fill}));
      return {paths, labels, livestock: node.querySelectorAll('[data-livestock-markers] button').length,livestockOpacity:[...node.querySelectorAll('[data-livestock-markers] button')].map(button=>Number(getComputedStyle(button).opacity))};
    });
    assert(distribution.paths.length >= 10 && distribution.paths.every(path => !path.hidden && Number(path.opacity) > 0));
    assert(distribution.livestock > 0);assert(distribution.livestockOpacity.every(value=>value>0&&value<1));
    const corn = distribution.paths.find(path => path.id === 'corn'); assert(corn && corn.stroke !== 'none' && parseFloat(corn.strokeWidth) > 0);
    assert(distribution.labels.length > 0 && distribution.labels.every(label => label.fill === label.sourceFill), 'Labels must match their crop colors');
    return distribution;
  });
  await step('Every crop keeps a visible selected map label after collision layout', async () => {
    const ids = await page.locator('[data-crop-select]').evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute('data-crop-select')))]);
    assert.equal(ids.length, 11);
    for (const id of ids) {
      await click(page, `[data-crop-select="${id}"]`);
      assert(await page.locator(`[data-crop-label="${id}"]:visible`).count() > 0, `${id}: selected crop label must remain visible`);
    }
    await click(page, '[data-crop-select="corn"]');
    return {verifiedCropIds: ids};
  });
  await step('PC camera zoom, pan, reload and reset', async () => {
    await zoom(page, 'agriculture', '[data-map-action="in"]', '[data-map-action="out"]', '[data-map-action="fit"]');
    await click(page, '[data-map-action="in"]'); const before = await frame(page, 'agriculture');
    await page.locator(map.agriculture).scrollIntoViewIfNeeded();
    const box = await page.locator(map.agriculture).boundingBox();
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5); await page.mouse.down();
    await page.mouse.move(box.x + box.width * .5 + 35, box.y + box.height * .5 + 12, {steps: 6}); await page.mouse.up(); await settled(page);
    assert.notEqual(await frame(page, 'agriculture'), before, 'PC drag must pan the zoomed map');
    await reload(page);
  });
  await step('Livestock, layer toggles and browser history', async () => {
    await history(page, () => click(page, '[data-livestock-select="beef"]'));
    assert.match(await text(page, '#agri-reading-heading'), /肉牛/);
    await check(page, '[data-agri-layer][value="crops"]', false); assert.equal(query(page, 'crops'), '0');
    await check(page, '[data-agri-layer][value="crops"]', true);
    await click(page, '[data-crop-select="corn"]');
  });
  await step('Agriculture → nature comparison → exact source selection and camera', async () => {
    const before = await snapshot(page);
    await click(page, '[data-agriculture-nature-comparison="corn"]');
    assert.equal(query(page, 'from'), 'agriculture'); assert.equal(query(page, 'sourceAgriItem'), 'corn');
    assert(await page.locator('[data-mexico-nature-comparison]').isVisible());
    await click(page, '[data-mexico-nature-source-return]');
    await restored(page, before, 'Comparison return must preserve agriculture item/layers/state/camera');
    await reload(page);
  });
}

async function climate({page, evidence, captureStepImage}) {
  const step = steps(page, evidence);
  await step('Climate map labels select the full source code and Japanese explanation', async () => {
    const label = page.locator('[data-mexico-nature-label-code^="BS"]').first();
    const code = await label.getAttribute('data-mexico-nature-label-code'); await label.click(); await settled(page);
    assert((await text(page, '[data-mexico-nature-feature-title]')).includes(code));
    assert((await text(page, '[data-mexico-nature-feature-body]')).length > 20);
    assert.equal(await page.locator('[data-mexico-nature-layer=climate] .is-selected-feature').count(),0);
    assert.equal(await page.locator('[data-mexico-nature-state].is-selected').count(),0);
    assert(await page.locator('[data-mexico-climate-class-reading]').textContent().then(text=>text.includes('21の原分類')));
    return {sourceCode: code, title: await text(page, '[data-mexico-nature-feature-title]')};
  });
  await step('Both city plots and Japanese reading follow selection, reload and history', async () => {
    const ids = await page.locator('svg [data-mexico-climate-city]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-mexico-climate-city')));
    assert.equal(ids.length, 2);
    const layouts = [];
    for (const id of ids) {
      await click(page, `svg [data-mexico-climate-city="${id}"]`);
      assert(await page.locator(`[data-mexico-climate-plot="${id}"]`).isVisible());
      assert((await text(page, `[data-mexico-climate-city-reading="${id}"]`)).length > 30);
      assert.match(await text(page, `[data-mexico-climate-plot="${id}"]`), /1991[–—-]2020/);
      layouts.push(await cityClimateReadingLayout(page, id));
      const city=await page.locator(`[data-mexico-climate-plot="${id}"]`).getAttribute('data-climate-city-name');assert.equal(await text(page,'[data-mexico-climate-heading]'),`${city}の雨温図`);
    }
    await reload(page);
    await history(page, () => click(page, `svg [data-mexico-climate-city="${ids[0]}"]`));
    return {cityReadingLayouts: layouts};
  });
  await step('Relief and climate switching retain a usable map and camera controls', async () => {
    await click(page, 'button[data-mexico-nature-view="relief"]');
    assert(await page.locator('[data-mexico-nature-relief-background] image').isVisible());
    const label=page.locator('.mexico-nature-landform-name').first();await label.focus();await label.press('Enter');await settled(page);
    const selected=page.locator('[data-mexico-nature-layer=relief] .is-selected-feature').first();assert(await selected.count()>0);
    await selected.evaluate(node=>node.focus({preventScroll:true}));
    const focus=await selected.evaluate(node=>({outline:getComputedStyle(node).outlineStyle,stroke:getComputedStyle(node).stroke,width:getComputedStyle(node).strokeWidth}));
    assert.equal(focus.outline,'none');assert.notEqual(focus.stroke,'none');assert(parseFloat(focus.width)>0);
    assert.equal(await label.evaluate(node=>getComputedStyle(node).outlineStyle),'none');await captureStepImage('relief-selected');
    await zoom(page, 'nature', '[data-mexico-nature-zoom="in"]', '[data-mexico-nature-zoom="out"]', '[data-mexico-nature-reset]');
    await history(page, () => click(page, 'button[data-mexico-nature-view="climate"]'));
  });
}

async function hydrologyReady(page, category) {
  await page.waitForFunction(category => {
    const node = document.querySelector('[data-mexico-field="nature"]');
    return node?.dataset.mexicoHydrologyReady === 'true' && (!category || node.dataset.mexicoPreparedCategory === category);
  }, category, {timeout: 45_000});
}
async function water({page, evidence, captureStepImage}) {
  const step = steps(page, evidence);
  await step('Water peer tabs preserve the ten original groundwater classes and meaning', async () => {
    await click(page, 'button[data-mexico-nature-category="rivers-groundwater"]'); await hydrologyReady(page);
    assert.equal(await page.locator('[data-mexico-nature-water-tabs] button').count(), 3);
    const options = await page.locator('select[data-mexico-groundwater-class] option').allTextContents(); assert.equal(options.length, 11);
    assert.equal(await page.locator('select[data-mexico-groundwater-class]').inputValue(), 'all');
    assert.match(await text(page, '[data-mexico-nature-period]'), /1996.*2008/);
    assert.match(await text(page, '[data-mexico-hydrology-body]'), /固結|非固結/);
    await captureStepImage('groundwater');
    return {options, period: await text(page, '[data-mexico-nature-period]')};
  });
  await step('Annual precipitation surface, units, period and image load', async () => {
    await click(page, 'button[data-mexico-nature-category="precipitation"]'); await hydrologyReady(page, 'precipitation');
    assert.match(await text(page, '[data-mexico-quantitative-legend]'), /mm\/年/);
    assert.match(await text(page, '[data-mexico-nature-period]'), /1991[–—-]2020/);
    assert.match(await page.locator('image[data-mexico-numeric-image]').getAttribute('href'), /gpcc.*annual\.png/);
    await legibleNumericTicks(page);
    return {legend: await text(page, '[data-mexico-quantitative-legend]')};
  });
  await step('Three representative domestic basin systems expose their evidence limit', async () => {
    await click(page, 'button[data-mexico-nature-category="basins"]'); await hydrologyReady(page, 'basins');
    assert.equal(await page.locator('button[data-mexico-basin-system]').count(),0);
    assert.equal(await page.locator('image[data-mexico-basin-system-image]').count(),3);assert.equal(await page.locator('image[data-mexico-basin-system-image].is-muted').count(),0);
    assert.equal(await page.locator('[data-mexico-basin-label]').count(),3);await captureStepImage('basins-all');
    const point=await page.locator('path[data-mexico-basin-system="bravo"]').evaluate(node=>{
      const box=node.getBBox(),matrix=node.getScreenCTM();
      for(let y=1;y<20;y++)for(let x=1;x<20;x++){
        const local=new DOMPoint(box.x+box.width*x/20,box.y+box.height*y/20);
        if(!node.isPointInFill(local))continue;
        const screen=local.matrixTransform(matrix);
        if(document.elementFromPoint(screen.x,screen.y)===node)return {x:screen.x,y:screen.y};
      }
      throw new Error('No visible basin geometry is available for a real pointer click');
    });
    await page.mouse.click(point.x,point.y);await hydrologyReady(page,'basins');
    assert.equal(query(page,'waterFeature'),'basins:bravo');
    await click(page,'button[data-mexico-basin-overview]');await hydrologyReady(page,'basins');
    await page.locator('path[data-mexico-basin-system="lerma-chapala-santiago"]').press('Enter');await hydrologyReady(page,'basins');
    assert.equal(query(page,'waterFeature'),'basins:lerma-chapala-santiago');
    await click(page,'button[data-mexico-basin-overview]');await hydrologyReady(page,'basins');
    for (const id of ['bravo', 'lerma-chapala-santiago', 'grijalva-usumacinta']) {
      await click(page, `text[data-mexico-basin-system="${id}"]`); await hydrologyReady(page, 'basins');
      assert.equal(await page.locator(`text[data-mexico-basin-system="${id}"]`).getAttribute('aria-pressed'), 'true');
      const contrast = await page.locator(`text[data-mexico-basin-system="${id}"]`).evaluate(node => {
        const style = getComputedStyle(node);
        const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;}).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        const foreground = luminance(style.fill), background = luminance(style.stroke);
        return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
      });
      assert(contrast >= 4.5, `${id}: selected basin name has insufficient text contrast (${contrast})`);
      assert.equal(await page.locator('g[data-mexico-prepared-surface]').getAttribute('data-mexico-basin-system'), id);
      await captureStepImage(`basin-${id}`);
    }
    assert.match(await text(page, '#mexico-nature-map-desc'), /未確認/);
    assert.match(await text(page, '[data-mexico-hydrology-body]'), /国外|国内|国境/);
    await history(page, async () => {await click(page, 'button[data-mexico-nature-category="precipitation"]'); await hydrologyReady(page, 'precipitation');});
    await hydrologyReady(page, 'precipitation'); await reload(page); await hydrologyReady(page, 'precipitation');
  });
}

async function elevation({page, evidence}) {
  const step = steps(page, evidence);
  await step('All 500m contours and metre legend load without state or line selection', async () => {
    await click(page, 'button[data-mexico-nature-category="elevation"]'); await hydrologyReady(page, 'elevation');
    assert.match(await text(page,'[data-mexico-hydrology-legend]'),/0 m未満.*0–500 m.*5,000 m以上.*500m間隔/s);assert.equal(await page.locator('[data-mexico-elevation-bands] [data-elevation-band]').count(),12);
    const levels=await page.locator('[data-elevation-m]').evaluateAll(nodes=>nodes.map(node=>({level:Number(node.getAttribute('data-elevation-m')),members:Number(node.getAttribute('data-source-member-count')),pointer:getComputedStyle(node).pointerEvents,role:node.getAttribute('role')})));
    assert.deepEqual(levels.map(row=>row.level).sort((a,b)=>a-b),Array.from({length:11},(_,i)=>i*500));assert.equal(levels.reduce((sum,row)=>sum+row.members,0),5490);assert(levels.every(row=>row.pointer==='none'&&row.role==='img'));
    assert(await page.locator('[data-mexico-nature-state-select]').isDisabled());
    const paths = await page.locator('path[data-mexico-nature-state]').evaluateAll(nodes => nodes.map(node => ({disabled: node.getAttribute('aria-disabled'), tabIndex: node.getAttribute('tabindex'), pointerEvents: getComputedStyle(node).pointerEvents})));
    assert.equal(paths.length, 32); assert(paths.every(node => node.disabled === 'true' && node.tabIndex === '-1' && node.pointerEvents === 'none'));
    return {legend:await text(page,'[data-mexico-hydrology-legend]'),statePaths:paths.length};
  });
  await step('Elevation zoom and reload, with state selection retained in other tabs', async () => {
    await zoom(page, 'nature', '[data-mexico-nature-zoom="in"]', '[data-mexico-nature-zoom="out"]', '[data-mexico-nature-reset]'); await hydrologyReady(page, 'elevation');
    const state = query(page, 'state');
    await click(page, 'button[data-mexico-nature-view="climate"]'); assert(await page.locator('[data-mexico-nature-state-select]').isEnabled()); assert.equal(query(page, 'state'), state);
    await history(page, async () => {await click(page, 'button[data-mexico-nature-category="elevation"]'); await hydrologyReady(page, 'elevation');});
    await hydrologyReady(page, 'elevation');
  });
}

async function industry({page, evidence}) {
  const step = steps(page, evidence);
  await step('Industry labels remain separate and connected to their source state', async () => {
    await page.waitForFunction(()=>document.querySelector('[data-mexico-field="industry"]')?.dataset.miLabelLayoutReady==='true');
    assert.equal(await page.locator('[data-mi-state-select]').inputValue(),'');assert.equal(query(page,'state'),null);assert.equal(await page.locator('[data-mi-map=primary] [aria-pressed=true]').count(),0);
    const height=await page.locator('.mexico-map-frame').first().evaluate(node=>node.getBoundingClientRect().height);assert(height<500,'Industry map must use the shared aspect ratio');
    const labels = await page.locator('[data-mi-reading-markers] [data-mi-region-label]').evaluateAll(nodes => nodes.filter(node => !node.closest('[hidden]') && node.getBoundingClientRect().width > 0).map(node => {
      const box = node.getBoundingClientRect(), matrix = node.getScreenCTM();
      return {name: node.textContent, x: box.x, y: box.y, width: box.width, height: box.height, screenFontSize: parseFloat(getComputedStyle(node).fontSize) * Math.hypot(matrix.a, matrix.b), leader: node.parentElement.querySelector('[data-mi-region-leader]')?.getAttribute('d')};
    }));
    assert(labels.length >= 8, 'All-sector overview is missing state labels');
    const controls=await page.locator('[data-mi-map="primary"]').evaluate(svg=>[...svg.closest('.mexico-map-frame').querySelectorAll('[data-mi-map-action]')].map(button=>{const box=button.getBoundingClientRect();return{x:box.x,y:box.y,width:box.width,height:box.height};}));
    for (const [index, a] of labels.entries()) {
      assert.match(a.leader, /^M0,0L/); assert(Math.abs(a.screenFontSize - 14) < .5);
      for (const b of labels.slice(index + 1)) assert(!(Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > .5 && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > .5), `Industry labels overlap: ${a.name} / ${b.name}`);
      for(const b of controls)assert(!(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.5&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>.5),`Map controls obscure ${a.name}`);
    }
    await zoom(page, 'industry', '[data-mi-map-action="in"]', '[data-mi-map-action="out"]', '[data-mi-map-action="fit"]');
    return labels;
  });
  await step('Sector, industry and state selection', async () => {
    await click(page, 'button[data-industry-sector="manufacturing"]');
    await click(page, 'button[data-industry-subsector="transport"][data-owner-sector="manufacturing"]');
    await select(page, '[data-mi-state-select]', '05');
    assert.equal(query(page, 'metric'), 'transport'); assert.equal(query(page, 'state'), '05');
    assert(await page.locator('[data-mi-industry-panel="manufacturing:transport"]').isVisible());
  });
  await step('Selected-state camera, only-state display and reset', async () => {
    const before = await frame(page, 'industry'); await click(page, '[data-mi-zoom]'); assert.notEqual(await frame(page, 'industry'), before);
    await check(page, '[data-mi-only]', true); await reload(page); await check(page, '[data-mi-only]', false);
    await click(page, '[data-mi-all]'); assert.equal(await frame(page, 'industry'), before);
  });
  await step('Two industry metrics compare and return, including browser history', async () => {
    const before = await snapshot(page);
    await history(page, () => click(page, '[data-mi-electronics-link]'));
    assert(await page.locator('[data-mi-figure="secondary"]').isVisible()); assert.equal(query(page, 'compare'), 'electronics');
    await click(page, '[data-mi-return]'); await restored(page, before, 'Industry comparison return must preserve the original selection');
  });
  await step('Industry population comparison retains period and source direction', async () => {
    await click(page, '[data-mi-population-link]'); assert.equal(query(page, 'compare'), 'population'); assert.equal(query(page, 'from'), 'industry');
    assert.match(await text(page, '[data-mi-period-note]'), /2020.*2025|2025.*2020/); await reload(page);
  });
}

async function population({page, evidence}) {
  const step = steps(page, evidence);
  await step('Nationwide locality population loads without selecting a state',async()=>{
    await page.waitForFunction(()=>document.querySelector('[data-mexico-field="population"]')?.dataset.localityPopulationReady==='true');
    return populationNationalLayout(page);
  });
  await step('A population cluster expands into official locality positions, reloads and returns nationwide',async()=>{
    const requests=[];const record=request=>{if(request.url().includes('mexico-population-localities-v1'))requests.push(request.url());};page.on('request',record);
    try{
      await page.locator('[data-locality-reading] details[data-locality-ranked] > summary').click();await settled(page);
      await click(page,'[data-locality-list] button');
      assert(await page.locator('[data-locality-selection]').isVisible());
      await click(page,'[data-locality-selection-zoom]');
      await page.waitForFunction(()=>{const root=document.querySelector('[data-mexico-field="population"]');return root.dataset.localityPopulationReady==='true'&&root.dataset.localityMode==='locality';});
      assert(requests.some(url=>/localities-\d\d.json.gz$/.test(url)),'Expanding must fetch original source points');
      assert(requests.filter(url=>/localities-\d\d.json.gz$/.test(url)).length<32,'Expansion must not fetch the entire country');
      await click(page,'[data-locality-list] button');
      assert.match(await text(page,'[data-locality-selected-description]'),/コード\d{9}/);
      const originalFrame=await page.locator('[data-locality-map]').getAttribute('viewBox');await page.reload();
      await page.waitForFunction(()=>document.querySelector('[data-mexico-field="population"]')?.dataset.localityPopulationReady==='true');
      assert.equal(await page.locator('[data-locality-map]').getAttribute('viewBox'),originalFrame);
      await click(page,'[data-locality-action="fit"]');
      await page.waitForFunction(()=>document.querySelector('[data-mexico-field="population"]')?.dataset.localityVisiblePopulation==='126014024');
      assert.equal(query(page,'localityFrame'),null);assert.equal(query(page,'state'),null);
      return {requests,originalFrame};
    }finally{page.off('request',record);}
  });
  // Retain the existing state density, comparisons and cultural regression cases.
  await select(page,'[data-population-view]','density');
  await step('Nationwide initial population, state selection, scale comparison and return', async () => {
    assert.equal(await page.locator('[data-population-state]').inputValue(), ''); assert.equal(query(page, 'state'), null);
    assert.match(await text(page, '[data-population-selected-name]'), /全国/);
    await select(page, '[data-population-state]', '09');
    await history(page, () => select(page, '[data-population-view]', 'population'));
    const before = await snapshot(page); await click(page, '[data-population-scale-link]'); assert.equal(query(page, 'compare'), 'scale');
    await click(page, '[data-population-return]'); await restored(page, before, 'Scale comparison return must preserve population mode and state');
  });
  await step('Population camera survives reload and resets', () => zoom(page, 'population', '[data-population-map-action="in"]', '[data-population-map-action="out"]', '[data-population-map-action="fit"]'));
  await step('Population → nature and industry → source return', async () => {
    const before = await snapshot(page);
    await click(page, '[data-population-nature-link]'); assert.equal(query(page, 'from'), 'population'); assert.equal(query(page, 'sourceView'), 'population');
    await click(page, '[data-mexico-nature-source-return]'); await restored(page, before, 'Nature return must preserve the population source');
    await click(page, '[data-population-industry-link]'); assert.equal(query(page, 'from'), 'population'); assert.equal(query(page, 'sourceView'), 'population');
    await click(page, '[data-mi-return]'); await restored(page, before, 'Industry return must preserve the population source');
  });
  await step('Clear state returns to nationwide statistics and survives reload/history', async () => {
    await history(page, () => click(page, '[data-population-reset]'));
    assert.equal(query(page, 'state'), null); assert.equal(await page.locator('[data-population-state]').inputValue(), '');
    assert.match(await text(page, '[data-population-selected-name]'), /全国/); await reload(page);
  });
  await step('Nationwide population comparison returns without inventing a selected state', async () => {
    const before = await snapshot(page);
    await click(page, '[data-population-industry-link]'); assert.equal(query(page, 'sourceState'), '');
    await click(page, '[data-mi-return]'); await restored(page, before, 'Nationwide comparison return must keep state empty');
  });
  await step('Ordinary field navigation opens national population even from a selected agriculture state',async()=>{
    await click(page,'.mexico-fields a[href*="/agriculture/"]');await click(page,'[data-crop-select="corn"]');await select(page,'[data-agriculture-state]','08');
    await click(page,'.mexico-fields a[href*="/population/"]');assert.equal(query(page,'state'),null);assert.equal(query(page,'reading'),'overview');assert.equal(await page.locator('[data-population-state]').inputValue(),'');
    assert.equal(await text(page,'[data-population-reading-heading]'),'全国の人口分布');await reload(page);
  });

}

const commonReligionBins = [
  {min: 0, max: 1, color: '#edf3df'}, {min: 1, max: 5, color: '#d1e6c6'}, {min: 5, max: 10, color: '#a1ceb1'},
  {min: 10, max: 25, color: '#70b3a5'}, {min: 25, max: 50, color: '#41958e'}, {min: 50, max: 75, color: '#24756f'}, {min: 75, max: null, color: '#154d49'},
];
async function composition({page, evidence}) {
  const step = steps(page, evidence);
  const config = JSON.parse(await text(page, '[data-population-composition-config]'));
  await step('Ethnicity nationwide entrance, detail and count/share comparison return', async () => {
    await click(page, 'button[data-population-category="ethnicity"]'); assert(await page.locator('[data-population-overview-category="ethnicity"]').isVisible());
    await click(page, '[data-population-overview-category="ethnicity"] [data-population-overview-metric]');
    assert.equal(query(page, 'state'), null); assert.match(await text(page, '[data-population-composition-selected-name]'), /全国/);
    await select(page, '[data-population-state]', '20'); await select(page, '[data-population-view]', 'count');
    const before = await snapshot(page); await click(page, '[data-population-composition-compare]'); assert.equal(query(page, 'compositionCompare'), 'scale');
    await click(page, '[data-population-composition-return]'); await restored(page, before, 'Composition return must preserve source metric, state and measure');
  });
  await step('Three nationwide religion maps use identical absolute-share bands', async () => {
    await click(page, 'button[data-population-category="religion"]');
    const cards = page.locator('[data-population-overview-category="religion"] [data-population-overview-metric]'); assert.equal(await cards.count(), 3);
    const colors = await cards.evaluateAll(nodes => nodes.map(node => ({id: node.getAttribute('data-population-overview-metric'), states: [...node.querySelectorAll('[data-overview-state]')].map(path => ({state: path.getAttribute('data-overview-state'), fill: path.getAttribute('fill')}))})));
    for (const card of colors) {
      assert.equal(card.states.length, 32); const metric = config.metrics.find(item => item.id === card.id);
      for (const area of card.states) {const row = metric.states[area.state], share = row.count / row.denominator * 100; const bin = commonReligionBins.find(bin => share >= bin.min && (bin.max === null || share < bin.max)); assert.equal(area.fill, bin.color, `${card.id}/${area.state}: nationwide color must encode the common absolute-share band`);}
    }
    return {metricIds: colors.map(card => card.id), statesPerMap: 32, commonBins: commonReligionBins, layout: await religionOverviewLayout(page)};
  });
  await step('All eight religion details retain their own bands, actual shares and denominators', async () => {
    const metrics = config.metrics.filter(metric => metric.category === 'religion'); assert.equal(metrics.length, 8);
    await click(page, '[data-population-overview-category="religion"] [data-population-overview-metric="catholic"]');
    const verified = [];
    for (const metric of metrics) {
      await select(page, '[data-population-composition-metric]', metric.id);
      assert.equal(query(page, 'state'), null); assert.equal(query(page, 'compositionMetric'), metric.id);
      const precision = metric.sharePrecision ?? 1, percent = metric.nationalCount / metric.nationalDenominator * 100;
      const expected = percent === 0 ? '0%' : percent < 10 ** -precision ? `<${(10 ** -precision).toLocaleString('ja-JP', {maximumFractionDigits: precision})}%` : `${percent.toLocaleString('ja-JP', {minimumFractionDigits: precision, maximumFractionDigits: precision})}%`;
      assert.equal(await text(page, '[data-population-composition-share]'), expected);
      assert.equal(await text(page, '[data-population-composition-denominator]'), metric.nationalDenominator.toLocaleString('ja-JP'));
      const labels = await page.locator('[data-population-composition-color-key] li').allTextContents();
      if (metric.shareBins) assert.deepEqual(labels.map(label => label.trim()), [...metric.shareBins.map(bin => bin.label), '欠測・秘匿・未取得']);
      verified.push({metric: metric.id, nationalShare: expected, denominator: metric.nationalDenominator, labels});
    }
    await reload(page); return verified;
  });
  await step('Return to the nationwide religion entrance through browser history and reload', async () => {
    await history(page, () => click(page, '[data-population-national]')); await reload(page);
    assert(await page.locator('[data-population-overview-category="religion"]').isVisible());
  });
}

export const mexicoPCOperationCases = [
  {country: 'mexico', field: 'agriculture', id: 'selection-roundtrip', run: agriculture},
  {country: 'mexico', field: 'nature', id: 'climate-and-relief', run: climate},
  {country: 'mexico', field: 'nature', id: 'water-and-precipitation', run: water, captureWorkspace: true},
  {country: 'mexico', field: 'nature', id: 'elevation', run: elevation, captureWorkspace: true},
  {country: 'mexico', field: 'industry', id: 'comparison-roundtrip', run: industry, captureWorkspace: true},
  {country: 'mexico', field: 'population', id: 'distribution-roundtrip', run: population},
  {country: 'mexico', field: 'population', id: 'composition-roundtrip', run: composition, captureWorkspace: true, captureSelectors: {map: '[data-population-overview-maps]'}},
];
