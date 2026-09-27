import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const root = new URL('../../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('農業概況の12品目と地図内の名前を、実際に配信する格子に照合する', () => {
  const config = json('src/data/atlas/europe/crop-overview.json');
  const labels = json('src/data/atlas/europe/crop-overview-labels.json');
  const manifest = json('public/assets/atlas/europe/crop-overview-v1/manifest.json');
  assert.equal(config.crops.length, 12);
  assert.deepEqual(new Set(labels.map(l => l.id)), new Set(config.crops.map(c => c.id)));
  const image = readFileSync(new URL(manifest.image.path, root));
  assert.equal(sha(image), manifest.image.sha256);
  const grids = manifest.inputs.map(input => {
    const raw = readFileSync(new URL(input.path, root));
    assert.equal(sha(raw), input.sha256, input.id);
    const bytes = gunzipSync(raw);
    assert.equal(bytes.byteLength, 1080 * 492 * 4, input.id);
    return { id: input.id, values: new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4), scale: Math.sqrt(input.positiveCellP90Ha) };
  });
  for (const label of labels) {
    const [lon, lat] = label.coordinate;
    const index = Math.floor((73 - lat) * 12) * 1080 + Math.floor((lon + 25) * 12);
    const ranked = grids.map(g => ({ id: g.id, score: Math.max(0, g.values[index]) / g.scale })).sort((a, b) => b.score - a.score);
    assert.equal(ranked[0].id, label.id, `${label.name}の表示位置は別の品目を着色していない`);
    assert.ok(ranked[0].score > 0, label.name);
  }
});
