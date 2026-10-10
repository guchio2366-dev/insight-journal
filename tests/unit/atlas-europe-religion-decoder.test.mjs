import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeReligionTable, religionTableCsv } from '../../scripts/europe/decode-religion-report.mjs';

test('dictionary index zero and raw numeric zero retain different meanings',()=>{
  const table={columns:['source_id','count','status','note'],dictionary_columns:{source_id:['first','second'],status:['observed','missing']},rows:[[0,'0',0,'counted'],[1,'',1,'not acquired']]};
  assert.deepEqual(decodeReligionTable(table),[['first','0','observed','counted'],['second','','missing','not acquired']]);
  assert.match(religionTableCsv(table),/first,0,observed,counted/);
  assert.match(religionTableCsv(table),/second,,missing,not acquired/);
});
