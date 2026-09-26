import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {isVerifiedFarmingGrid} from '../../scripts/lib/atlas-numeric-release.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('数値地図だけを寸法・値・ハッシュで検証し、文字列のID判定から区別する',()=>{
 const raw=Buffer.from('f'.repeat(32)),bytes=gzipSync(raw),name='sample.values.gz';
 const m={lookup:{encoding:'float32-le-gzip',noData:-1},files:{[name]:{bytes:bytes.length,sha256:hash(bytes)}},regions:{east:{layers:[{grid:name,width:8,height:1}]}}};
 assert.equal(isVerifiedFarmingGrid(name,bytes,m),true);
 assert.equal(isVerifiedFarmingGrid('statistics.json.gz',bytes,m),false);
 assert.equal(isVerifiedFarmingGrid(name,bytes,{}),false);
 assert.throws(()=>isVerifiedFarmingGrid(name,Buffer.from('PRIVATE_SENTINEL'),m),/hash mismatch/);
 m.regions.east.layers[0].width=9;assert.throws(()=>isVerifiedFarmingGrid(name,bytes,m),/dimensions mismatch/);
 m.regions.east.layers[0].width=8;const bad=Buffer.alloc(32,255),invalid=gzipSync(bad);m.files[name]={bytes:invalid.length,sha256:hash(invalid)};assert.throws(()=>isVerifiedFarmingGrid(name,invalid,m),/Invalid numeric/);
});
