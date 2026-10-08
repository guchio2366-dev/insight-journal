import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';
import { europeReaderCopy, europeReaderSources } from '../../src/lib/atlas-europe-reader.ts';

const copy = id => europeReaderCopy(europeLayers.find(layer => layer.id === id));

test('industry and population first readings describe their own map evidence', () => {
  assert.match(copy('industry').body, /キルナ.*鉱石.*ミュンヘン.*自動車/);
  assert.doesNotMatch(copy('industry').body, /人口密度|人口の分布/);
  assert.match(copy('density').body, /パリ.*ミラノ.*人口の分布/);
  assert.doesNotMatch(copy('density').body, /鉄鉱石採掘|無線技術/);
  assert.ok(europeReaderSources(europeLayers.find(layer => layer.id === 'density')).some(source => source.url.includes('ghsl.jrc.ec.europa.eu')));
});
const statistics = JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/country-statistics.json', import.meta.url)));
const value = (indicator, country) => statistics.indicators.find(item => item.id === indicator).values[country]['2023'];

test('全主題に1文の要点と根拠・地理の説明があり、操作説明で置き換えない', () => {
  for (const layer of europeLayers) {
    const message = europeReaderCopy(layer);
    assert.deepEqual(Object.keys(message).sort(), ['body','note','takeaway','title']);
    for (const field of ['title','takeaway','body','note']) assert.ok(message[field].trim(), `${layer.id}: ${field}`);
    assert.equal((message.takeaway.match(/。/g) ?? []).length, 1, layer.id);
    assert.ok(message.takeaway.endsWith('。'), layer.id);
    assert.ok(message.takeaway.length <= 100, `${layer.id}: takeaway`);
    // Preserve the existing methods and limitations beside the added geographic reading.
    const bodyLimit=['density','precipitation'].includes(layer.id)?500:200;
    assert.ok(message.body.length <= bodyLimit, `${layer.id}: body`);
    assert.doesNotMatch(message.takeaway + message.body, /押す|選ぶと|切り替え|OFF|ボタン|左上|統計領域/, layer.id);
  }
});

test('農林業は自然条件と人の管理をつなぎ、出典のある地域例の範囲を守る', () => {
  assert.match(copy('crops').takeaway, /気候や地形/);
  assert.match(copy('crops').takeaway, /水管理や土地利用/);
  assert.match(copy('wheat').takeaway, /イングランド.*東部.*西部/);
  assert.match(copy('barley').body, /フィンランド.*家畜の餌.*醸造/);
  assert.match(copy('rapeseed').takeaway, /ハンガリー.*油の原料/);
  assert.match(copy('rice').takeaway, /アルプス.*ポー平原/);
  assert.match(copy('rice').body, /灌漑の範囲.*示していません/);
  assert.match(copy('soybean').body, /観測所周辺.*ではありません/);
  assert.match(copy('maize').body, /2024年.*2020年頃/);
  assert.match(copy('citrus').body, /気候だけ.*できません/);
});

test('12作物・4家畜と集約区分、分布面の限界を維持する', () => {
  const crops = europeLayers.filter(layer => layer.field === 'agriculture' && layer.unit === '収穫面積 ha / 格子');
  const livestock = europeLayers.filter(layer => ['cattle','pig','chicken','sheep'].includes(layer.id));
  assert.equal(crops.length, 12);
  assert.equal(livestock.length, 4);
  for (const layer of [...crops, ...livestock]) {
    const note = europeReaderCopy(layer).note;
    assert.match(note, /モデル推計/);
    assert.match(note, /濃さは数量を示しません/);
    assert.match(note, /色のない場所でも生産がないとは限らず/);
    assert.match(note, /実際の境界ではありません/);
    assert.match(note, crops.includes(layer) ? /収穫面積/ : /家畜密度/);
  }
  assert.match(copy('cattle').note, /肉用・乳用を分けていません/);
  assert.match(copy('chicken').note, /肉用・採卵用を分けていません/);
  assert.match(copy('temperatefruit').note, /ブドウ単独の分布ではありません/);
  assert.match(copy('vegetables').note, /VEGE.*「全野菜」ではありません/);
  assert.match(copy('crops').note, /ブドウ・オリーブ単独の分布は未収録/);
});

test('国全体の対比は固定した2023年の資料に一致し、局所分布の説明へ変えない', () => {
  assert.equal(statistics.year, 2023);
  assert.ok(value('forest','FIN') > value('forest','NLD'));
  assert.ok(value('forest','SWE') > value('forest','NLD'));
  assert.ok(value('manufacturing','CZE') > value('manufacturing','FRA'));
  assert.ok(value('manufacturing','DEU') > value('manufacturing','GBR'));
  assert.ok(value('services','GBR') > value('services','CZE'));
  assert.ok(value('services','FRA') > value('services','CZE'));
  assert.ok(value('urban','NLD') > value('urban','ITA'));
  assert.ok(value('age','ITA') > value('age','IRL'));
  assert.ok(value('growth','IRL') > 0);
  assert.ok(value('growth','ITA') < 0 && value('growth','ITA') > -0.1);
  for (const id of ['forest','manufacturing','services','urban','age','growth']) assert.match(copy(id).takeaway, /2023年.*国全体/);
  for (const id of ['forest','manufacturing','industry','services','urban','age','growth']) {
    assert.equal(copy(id).note, europeLayers.find(layer => layer.id === id).note);
  }
  assert.match(copy('forest').note, /商業林・伐採地・木材生産量の分布ではありません/);
  assert.match(copy('industry').note, /製造業を内包.*足し合わせない/);
  assert.match(copy('urban').note, /定義は各国で異なり/);
  assert.match(copy('age').note, /国内の高齢化分布を表すものではありません/);
  assert.match(copy('growth').note, /移民数そのものではありません/);
});

test('自然・産業・人口をつなぐ説明でも欠測、量、位置の意味を変えない', () => {
  assert.match(copy('climate').note, /国平均ではありません/);
  assert.match(copy('climate').note, /欠測.*0で補いません/);
  assert.match(copy('water').body, /ドナウ川.*19か国/);
  assert.match(copy('water').note, /太さは流量を表しません/);
  assert.match(copy('terrain').body, /8か国とEU/);
  assert.match(copy('contours').note, /間隔は標高精度を意味しません/);
  assert.match(copy('hubs').body, /ロッテルダム.*ルートヴィヒスハーフェン/);
  assert.match(copy('hubs').note, /生産量・雇用の大小を表しません/);
  assert.match(copy('density').body, /パリ.*ミラノ.*人口の分布/);
  assert.match(copy('density').note, /2020年.*現在の人口移動・避難状況.*ではありません/);
  assert.match(copy('density').note, /都市の点は位置のみ/);
});

test('読解の地域例に対応した一次資料を少数で示し、全国値の出典も残す', () => {
  const sources = id => europeReaderSources(europeLayers.find(layer => layer.id === id));
  for (const layer of europeLayers) {
    const items = europeReaderSources(layer);
    assert.ok(items.length >= 1 && items.length <= (layer.id === 'drainage' ? 5 : 4), layer.id);
    assert.equal(new Set(items.map(item => item.url)).size, items.length, layer.id);
    for (const item of items) assert.ok(item.url.startsWith('https://') && item.label.trim(), layer.id);
  }
  assert.ok(sources('wheat').some(item => item.url.startsWith('https://www.gov.uk/')));
  assert.ok(sources('wheat').some(item => item.url.startsWith('https://www.ksh.hu/')));
  assert.ok(sources('cattle').some(item => item.url.startsWith('https://www.luke.fi/')));
  assert.ok(sources('density').some(item => item.url.startsWith('https://ghsl.jrc.ec.europa.eu/')));
  assert.ok(sources('hubs').some(item => item.url.startsWith('https://www.portofrotterdam.com/')));
  assert.ok(sources('hubs').some(item => item.url.startsWith('https://www.basf.com/')));
  assert.ok(sources('hubs').some(item => item.url.startsWith('https://www.airbus.com/')));
  assert.ok(sources('forest').some(item => item.url.startsWith('https://www.upmpulp.com/')));
  for (const id of ['forest','manufacturing','industry','services','urban','age','growth']) {
    assert.ok(sources(id).some(item => item.url === europeLayers.find(layer => layer.id === id).source), id);
  }
});
