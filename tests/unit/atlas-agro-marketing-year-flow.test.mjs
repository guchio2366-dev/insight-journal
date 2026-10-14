import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build, stop} from 'esbuild';

const raw = readFileSync('scripts/data/wasde0926.txt');
const generated = JSON.parse(readFileSync('src/data/atlas/agro-marketing-year-flow.json'));
const result = await build({entryPoints:['src/data/atlas/agro-marketing-year-flow.ts'],bundle:true,
  platform:'node',format:'esm',write:false,logLevel:'silent'});
const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
after(() => stop());

test('canonical flow rows retain exact historical country and World quantities from the same publisher table', () => {
  const text = raw.toString('utf8');
  const sha256 = createHash('sha256').update(raw).digest('hex');
  assert.equal(generated.records.length, 22);
  const allowed = new Set(['USA','CAN','MEX','BRA','ARG','PRY','AUS','CHN','IND','KAZ','NZL','IDN']);
  for (const row of generated.records) {
    assert.ok(allowed.has(row.countryCode));
    assert.equal(row.year, '2024/25');
    assert.equal(row.unit, row.seriesId==='cotton-lint-production'?'百万480ポンド俵':'百万t');
    assert.equal(row.source.sha256, sha256);
    const marker = `WASDE - 675 - ${row.source.page}`;
    const start = text.indexOf(marker);
    const next = text.indexOf('WASDE - 675 - ', start + marker.length);
    const page = text.slice(start, next < 0 ? undefined : next);
    if(row.seriesId==='cotton-lint-production'){
      assert.equal(row.source.worldPage,26);
      const labelMap={'Beginning Stocks':'beginningStocks','Production':'production','Imports':'imports',
        'Domestic Use':'domesticUse','Exports, Total':'exports','Ending Stocks':'endingStocks','Unaccounted 2/':'lossAdjustment'};
      for(const [label,key] of Object.entries(labelMap)){
        const originalLine=page.split(/\r?\n/).find(line=>line.trimStart().startsWith(label+' '));
        assert.ok(row.rawLines.includes(originalLine));
        const first=originalLine.match(/-?\d+\.\d+/)[0];
        assert.equal(row.rawValues[key],first);assert.equal(row[key],Number(first));
      }
      const globalStart=text.indexOf('WASDE - 675 - 26');
      const globalEnd=text.indexOf('WASDE - 675 - 27',globalStart);
      const globalPage=text.slice(globalStart,globalEnd),historical=globalPage.slice(globalPage.indexOf('2024/25'),globalPage.indexOf('2025/26'));
      assert.ok(historical.includes(row.worldRawLine));assert.ok(historical.includes(row.countryWorldRawLine));
      assert.equal(row.imports,0);assert.equal(row.worldTableImportsRawValue,'3/');
      assert.equal(row.importsQuality,'publisher-rounded-0.00-not-strict-zero');
      assert.equal(row.lossAdjustment,-0.04);
      assert.equal(row.production,14.41);assert.equal(row.worldProduction,119.53);
    }else{
      const historical = page.slice(page.indexOf('2024/25'), page.indexOf('2025/26'));
      assert.ok(historical.includes(row.rawLine), `${row.countryCode}/${row.seriesId} in historical block`);
      assert.ok(historical.includes(row.worldRawLine), 'same-page World row, not a national sum');
      const values = row.rawLine.match(/-?\d+\.\d+/g).map(Number);
      assert.deepEqual(values, [row.beginningStocks,row.production,row.imports,...(row.domesticSubset ? [row.domesticSubset.value] : []),
        row.domesticUse,row.exports,row.endingStocks]);
    }
    assert.equal(row.worldProduction, row.worldRawLine.match(/-?\d+\.\d+/g).map(Number)[1]);
    assert.equal(row.worldProduction, Number(row.worldProductionRawValue));
    if(row.domesticSubset){
      assert.ok(row.domesticSubset.value <= row.domesticUse);
      assert.equal(row.domesticSubset.isWithinDomesticUse, true, 'a domestic subset is not an additional use');
    }
    const balance = row.beginningStocks + row.production + row.imports - row.domesticUse - row.exports - row.endingStocks;
    assert.ok(Math.abs(balance - row.roundingGap) < 1e-9);
    assert.ok(Math.abs(row.roundingGap-(row.lossAdjustment??0)) <= row.roundingTolerance);
    assert.equal(row.exportDestinations, null, 'calendar-year partners cannot stand in for this marketing year');
    assert.equal(row.periodStart, null); assert.equal(row.periodEnd, null);
    assert.match(row.notes.join(' '), /共通暦年と呼ばない/);
    assert.match(row.notes.join(' '), /再輸出/);
    assert.equal(api.agroMarketingYearFlow(row.countryCode,row.seriesId).rawLine,row.rawLine);
  }
  assert.equal(api.agroMarketingYearFlow('USA','maize-production').production,378.27);
  assert.equal(api.agroMarketingYearFlow('USA','maize-production').worldProduction,1235.03);
  assert.equal(api.agroMarketingYearFlow('CAN','wheat-production').exports,29.35);
  assert.equal(api.agroMarketingYearFlow('MEX','soybean-production').exports,0,'published zero remains zero');
  const rice=api.agroMarketingYearFlow('USA','rice-milled-production');
  assert.equal(rice.label,'米（精米換算）');
  assert.equal(rice.production,7.05);assert.equal(rice.worldProduction,542.30);
  assert.equal(rice.exports,2.87);assert.equal(rice.domesticSubset,null);
  assert.match(rice.notes.join(' '),/このモジュールで籾やブッシェルから換算した量ではない/);
  for (const [country,series] of [['RUS','wheat-production'],['EU','wheat-production'],['IDN','maize-production'],
    ['NZL','wheat-production'],['CAN','rice-milled-production'],['CAN','soybean-production'],
    ['USA','rice-production'],['USA','qcl-328-production']]) {
    assert.equal(api.agroMarketingYearFlow(country,series),undefined,'absent rows and excluded products stay absent');
  }
});

test('native Node TypeScript import loads the JSON with its required import attribute',()=>{
  const result=execFileSync(process.execPath,['--input-type=module','--eval',
    `import {agroMarketingYearFlow,agroMarketingYearFlows} from './src/data/atlas/agro-marketing-year-flow.ts';
    console.log(JSON.stringify({count:agroMarketingYearFlows.length,corn:agroMarketingYearFlow('USA','maize-production').production,rice:agroMarketingYearFlow('USA','rice-milled-production').label}));`],{encoding:'utf8'});
  assert.deepEqual(JSON.parse(result),{count:22,corn:378.27,rice:'米（精米換算）'});
});

test('offline extraction is deterministic and rejects a changed source or inconsistent balance', () => {
  execFileSync('python3', ['-c', `
from pathlib import Path
import hashlib,json,runpy
module=runpy.run_path('scripts/prepare-agro-marketing-year-flow.py')
parse=module['parse']
raw=Path('scripts/data/wasde0926.txt').read_bytes()
assert parse(raw)==json.loads(Path('src/data/atlas/agro-marketing-year-flow.json').read_text())
altered=raw.replace(b'378.27',b'379.27',1)
try:parse(altered)
except ValueError:pass
else:raise AssertionError('Changed source revision must fail')
parse.__globals__['SHA256']=hashlib.sha256(altered).hexdigest()
try:parse(altered)
except ValueError as error:assert 'balance difference' in str(error)
else:raise AssertionError('Inconsistent commodity balance must fail')
`], {stdio:'pipe'});
});
