import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {Window} from 'happy-dom';

// Test the built CSS cascade, not browser geometry: visual QA uses /atlas/qa/.
// Formatting also avoids Happy DOM's parser limitation with minified @media.
const styles = new Map();
async function openField(field, width, attributes = {}) {
  const window = new Window({width, height:768, settings:{disableCSSFileLoading:true}});
  window.document.write(await readFile(`dist/atlas/north-america/${field}/index.html`, 'utf8'));
  for (const [name, value] of Object.entries(attributes)) window.document.querySelector('.atlas-explorer').setAttribute(name, value);
  for (const node of window.document.querySelectorAll('style, link[rel=stylesheet]')) {
    const path = node.tagName === 'LINK' ? `dist/${node.getAttribute('href').split('/insight-journal/')[1]}` : null;
    const key = path ?? node.textContent;
    if (!styles.has(key)) styles.set(key, (await transform(path ? await readFile(path, 'utf8') : node.textContent, {loader:'css'})).code);
    const style = window.document.createElement('style');
    style.textContent = styles.get(key);
    node.replaceWith(style);
  }
  const css = (selector, property) => window.getComputedStyle(window.document.querySelector(selector))
    .getPropertyValue(property).replace(/\s+/g, '');
  // Happy DOM does not expose grid placement shorthands in computed styles.
  // Check matching active declarations instead; browser QA checks placement.
  function declarations(selector, property) {
    const element = window.document.querySelector(selector);
    const values = [];
    function visit(rules) {
      for (const rule of rules) {
        if (rule.media && !window.matchMedia(rule.conditionText).matches) continue;
        if (rule.cssRules) visit(rule.cssRules);
        if (rule.selectorText && element.matches(rule.selectorText)) {
          const value = rule.style.getPropertyValue(property);
          if (value) values.push(value.replace(/\s+/g, ''));
        }
      }
    }
    for (const sheet of window.document.styleSheets) visit(sheet.cssRules);
    return values;
  }
  return {window, css, declarations};
}

for (const field of ['nature', 'industry', 'population']) {
  test(`${field}: laptop keeps news, map and reading side by side at both breakpoint edges`, async () => {
    for (const width of [1200, 1280, 1366, 1440, 1599]) {
      const {window, css, declarations} = await openField(field, width);
      try {
        assert.equal(css('.atlas-desktop-shell', 'grid-template-columns'), 'clamp(220px,19vw,340px)minmax(0,1fr)', `${width}px news`);
        assert.equal(css('.atlas-primary-grid', 'grid-template-columns'), 'minmax(0,1.65fr)minmax(320px,1fr)', `${width}px grid`);
        const reading = `[data-field-national=${field === 'nature' ? 'natural' : field}]`;
        assert.ok(!declarations(reading, 'grid-column').includes('1'), `${width}px reading must not be forced below map`);
        if (field === 'nature') {
          assert.ok(declarations(reading, 'grid-area').includes('1/2/3'));
          assert.ok(declarations('.atlas-climate-overview', 'grid-area').includes('2/1'));
        }
        window.document.querySelector('.atlas-desktop-shell').classList.add('is-reading-news');
        assert.equal(css('.atlas-desktop-shell', 'grid-template-columns'), 'clamp(380px,32vw,520px)minmax(0,1fr)');
        assert.equal(css('.atlas-primary-grid', 'grid-template-columns'), 'minmax(0,1.65fr)minmax(320px,1fr)');
      } finally { await window.happyDOM.close(); }
    }
  });
  test(`${field}: monitor and mobile retain their existing layouts`, async () => {
    for (const width of [390, 1199, 1600, 1920]) {
      const {window, css} = await openField(field, width);
      try {
        if (width < 1200) {
          assert.equal(css('.atlas-desktop-shell', 'display'), 'flex');
          assert.equal(css('.atlas-desktop-shell', 'flex-direction'), 'column');
        } else {
          assert.equal(css('.atlas-desktop-shell', 'grid-template-columns'), 'clamp(300px,23vw,380px)minmax(0,1fr)');
          assert.equal(css('.atlas-primary-grid', 'grid-template-columns'), 'minmax(0,1.8fr)minmax(280px,1fr)');
        }
      } finally { await window.happyDOM.close(); }
    }
  });
}

test('agriculture keeps its existing laptop fallback and corn story layout', async () => {
  const {window, css} = await openField('agriculture', 1366);
  try {
    assert.equal(css('.atlas-desktop-shell', 'grid-template-columns'), 'clamp(300px,23vw,380px)minmax(0,1fr)');
    assert.equal(css('.atlas-primary-grid', 'grid-template-columns'), 'minmax(0,1fr)');
  } finally { await window.happyDOM.close(); }
  const corn = await openField('agriculture', 1366, {'data-corn-index':''});
  try {
    assert.equal(corn.css('.atlas-desktop-shell', 'grid-template-columns'), 'clamp(220px,19vw,340px)minmax(0,1fr)');
    assert.equal(corn.css('.atlas-primary-grid', 'grid-template-columns'), 'minmax(0,1.65fr)minmax(320px,1fr)');
    assert.ok(corn.declarations('[data-field-national=agriculture]', 'grid-area').includes('1/2'));
  } finally { await corn.window.happyDOM.close(); }
});
