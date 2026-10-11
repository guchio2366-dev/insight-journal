import test from 'node:test';
import assert from 'node:assert/strict';
import {pewSurfaceColor,pewSurfaceColors} from '../../src/lib/atlas-europe-pew-surface.ts';

test('national religious surfaces use each published Pew category and keep missing countries uncoloured',()=>{
  assert.equal(pewSurfaceColor('CZE','unaffiliated'),pewSurfaceColors.unaffiliated[3]);
  assert.equal(pewSurfaceColor('KOS','muslim'),pewSurfaceColors.muslim[4]);
  assert.equal(pewSurfaceColor('LTU','muslim'),pewSurfaceColors.muslim[0]);
  assert.equal(pewSurfaceColor('AND','christian'),undefined);
});
