import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { Window } from 'happy-dom';
import { sectors } from '../../src/data/atlas/world-industry/index.ts';

const compiled = await build({ entryPoints: ['src/scripts/world-industry.ts'], bundle: true, write: false, format: 'iife', platform: 'browser' });
const html = (await readFile('dist/atlas/industry/world/index.html', 'utf8')).replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
function page(search = '') {
  const window = new Window({ url: `https://example.com/insight-journal/atlas/industry/world/${search}`, settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  const errors = []; window.addEventListener('error', e => errors.push(e.message));
  window.document.write(html); window.eval(compiled.outputFiles[0].text);
  return { window, document: window.document, errors };
}
test('existing regional comparison links once to world pilot under deployment base', async () => {
  const comparison = await readFile('dist/atlas/industry/index.html', 'utf8');
  assert.match(comparison, /data-world-industry-entry[^>]*href="\/insight-journal\/atlas\/industry\/world\/"/);
  assert.match(await readFile('dist/sitemap.xml', 'utf8'), /https:\/\/guchio2366-dev.github.io\/insight-journal\/atlas\/industry\/world\//);
  assert.match(html, /バリューフロー/);
  assert.match(html, /個別企業の取引・数量を示しません/);
});
test('seven sectors, every stage and every site stay synchronized with their cards and stable map', async () => {
  const { window, document, errors } = page();
  try {
    for (const sector of sectors) {
      document.querySelector(`[data-wi-sector="${sector.id}"]`).click();
      const panel = document.querySelector(`[data-wi-panel="${sector.id}"]`);
      assert.equal(panel.hidden, false);
      assert.equal(document.querySelectorAll('[data-wi-panel]:not([hidden])').length, 1);
      const positions = [...panel.querySelectorAll('[data-wi-label]')].map(n => n.getAttribute('transform'));
      for (const stage of sector.stages) {
        panel.querySelector(`[data-wi-stage="${stage.id}"]`).click();
        assert.equal(panel.querySelectorAll('[data-wi-place]:not([hidden])').length, sector.sites.filter(s => s.stage === stage.id).length);
        assert.equal(panel.querySelector('[data-wi-stage-note]').textContent, stage.note);
        assert.equal(panel.querySelectorAll('[data-wi-line]:not([hidden])').length, 0);
      }
      panel.querySelector('[data-wi-stage=all]').click();
      for (const site of sector.sites) {
        panel.querySelector(`[data-wi-place="${site.id}"]`).click();
        assert.equal(panel.querySelector(`[data-wi-card="${site.id}"]`).hidden, false);
        assert.equal(panel.querySelector(`[data-wi-map-summary="${site.id}"]`).hidden, false);
        assert.equal(panel.querySelector(`[data-wi-site="${site.id}"]`).getAttribute('aria-pressed'), 'true');
        assert.equal(new URL(window.location.href).searchParams.get('site'), site.id);
      }
      for (const link of sector.links) {
        panel.querySelector(`[data-wi-link="${link.id}"]`).click();
        assert.equal(panel.querySelectorAll('[data-wi-line]:not([hidden])').length, 1);
        assert.equal(panel.querySelector(`[data-wi-line="${link.id}"]`).hasAttribute('hidden'), false);
        assert.equal(panel.querySelector(`[data-wi-evidence="${link.id}"]`).hidden, false);
      }
      assert.deepEqual([...panel.querySelectorAll('[data-wi-label]')].map(n => n.getAttribute('transform')), positions);
    }
    assert.deepEqual(errors, []);
  } finally { await window.happyDOM.close(); }
});
test('deep links restore exact site and invalid parameters fall back safely', async () => {
  const sector = sectors.find(s => s.id === 'gas'), site = sector.sites.at(-1), link = sector.links[0];
  const restored = page(`?sector=gas&site=${site.id}&link=${link.id}`);
  const invalid = page('?sector=missing&site=missing&stage=missing&link=missing');
  try {
    assert.equal(restored.document.querySelector(`[data-wi-card="${site.id}"]`).hidden, false);
    assert.equal(restored.document.querySelector(`[data-wi-line="${link.id}"]`).hasAttribute('hidden'), false);
    assert.equal(invalid.document.querySelector('[data-wi-panel=semiconductor]').hidden, false);
    assert.deepEqual(invalid.errors, []);
  } finally { await restored.window.happyDOM.close(); await invalid.window.happyDOM.close(); }
});
