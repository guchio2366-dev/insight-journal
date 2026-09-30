import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

test('4分野を直接開け、初期地図・解説・凡例がJavaScriptなしでも同じ主題を示す',()=>{
  for (const field of ['nature','agriculture','industry','population']) {
    const window=new Window();const doc=window.document;
    doc.write(readFileSync(new URL(`../../dist/atlas/europe/${field}/index.html`,import.meta.url),'utf8'));
    assert.ok(doc.querySelector('[data-eu-static]'));
    assert.equal(doc.querySelectorAll('.eu-read-panel select').length,0);
    assert.equal(doc.querySelectorAll('[data-city-card]').length,24);
    assert.equal(doc.querySelectorAll('[data-city-card="kyiv"] tbody tr').length,12);
    assert.ok(doc.querySelector('[data-city-card="rome"]').textContent.includes('欠測'));
    const active=field==='nature'?'climate':field==='population'?'subject':null;
    if(active)assert.ok(doc.querySelector(`[data-eu-${active}-image]`).getAttribute('href'));
    assert.equal(doc.querySelectorAll('[data-eu-field]').length,4);
    assert.equal(JSON.parse(doc.querySelector('[data-eu-config]').textContent).layers.length,30);
    assert.ok(doc.querySelector('a[href="https://doi.org/10.7910/DVN/SWPENT"]'));
    assert.ok(doc.querySelector('[data-eu-field="crops"]'));
    assert.equal(doc.querySelector('meta[name="robots"]'),null);
    const climateReader=field==='nature';
    assert.equal(doc.querySelector('[data-eu-climate-reader]').hidden,!climateReader);
    assert.equal(doc.querySelector('[data-eu-subject-reader]').hidden,climateReader);
    assert.equal(doc.querySelector('[data-eu-subject-legend]').hidden,climateReader||field==='agriculture');
    assert.equal(doc.querySelector('[data-eu-climate-legend]').hidden,field!=='nature');
    assert.equal(doc.querySelector('[data-eu-wheat-legend]').hidden,true);
    assert.equal(doc.querySelector('.eu-read-panel').getAttribute('aria-labelledby'),climateReader?'eu-city-heading':'eu-subject-title');
    assert.equal(doc.querySelectorAll('[data-eu-point]:not([hidden])').length,climateReader?15:0);
    if(field==='agriculture'){
      assert.match(doc.querySelector('[data-eu-map-title]').textContent,/作物.*畜産/);
      assert.equal(doc.querySelector('[data-eu-subject-image]').getAttribute('href'),null);
      const config=JSON.parse(doc.querySelector('[data-eu-config]').textContent);
      const farmItems=config.farmingAreas.features.map(feature=>feature.properties);
      assert.equal(config.initialLayer,'crops');
      assert.equal(farmItems.filter(item=>item.kind==='crop').length,12);
      assert.equal(farmItems.filter(item=>item.kind==='livestock').length,4);
      assert.equal(new Set(farmItems.map(item=>item.id)).size,16);
      const areas=[...doc.querySelectorAll('[data-eu-farm-area]')];
      assert.deepEqual(areas.map(path=>path.dataset.euFarmArea).sort(),farmItems.map(item=>item.id).sort());
      assert.ok(areas.every(path=>path.getAttribute('d')?.startsWith('M')));
      assert.notEqual(doc.querySelector('[data-eu-farming-shapes]').style.display,'none');
      assert.ok([...doc.querySelectorAll('[data-eu-farm-outline]')].every(path=>path.style.display==='none'));
      const choices=[...doc.querySelectorAll('[data-eu-farming-list] button')].filter(button=>button.dataset.euLayer!=='forest');
      assert.deepEqual(choices.map(button=>button.dataset.euLayer).sort(),farmItems.map(item=>item.id).sort());
      assert.ok(choices.every(button=>button.getAttribute('aria-pressed')==='false'&&button.querySelector('.eu-item-swatch')));
      assert.equal(doc.querySelector('[data-eu-farming-legend]').hidden,false);
      assert.match(doc.querySelector('[data-eu-farming-legend]').textContent,/作物は実線.*家畜は破線/);
      assert.match(doc.querySelector('[data-eu-subject-note]').textContent,/ブドウ.*オリーブ.*未収録/);
      const statistics=doc.querySelector('[data-eu-farming-statistics]');
      assert.match(statistics.textContent,/販売総額（米ドル）/);
      assert.match(statistics.textContent,/世界生産.*分母/);
      assert.match(statistics.textContent,/ゼロという意味ではありません/);
      assert.ok([...statistics.querySelectorAll('dd')].every(value=>value.textContent.includes('未収録')));
      assert.equal(statistics.querySelector('svg,canvas'),null);
    }
    if(field==='nature'){
      const reading=doc.querySelector('[data-eu-climate-reader]');
      const statistics=doc.querySelector('[data-eu-climate-statistics]');
      assert.equal(reading.querySelector('table'),null);
      assert.equal(reading.querySelectorAll('[data-eu-city-chart] svg').length,24);
      assert.equal(statistics.querySelector('svg,canvas'),null);
      assert.equal(statistics.hidden,false);
      assert.deepEqual([...reading.querySelectorAll('[data-city-reading]:not([hidden])')].map(card=>card.dataset.cityReading),['london']);
      assert.deepEqual([...statistics.querySelectorAll('[data-city-card]:not([hidden])')].map(card=>card.dataset.cityCard),['london']);
      assert.equal(reading.querySelectorAll('[data-city-reading]').length,24);
      assert.equal(statistics.querySelectorAll('[data-city-card]').length,24);
      assert.match(reading.querySelector('[data-city-reading="london"]').textContent,/HEATHROW/);
      assert.match(reading.textContent,/都市や国全体の平均ではありません/);
      const unavailable=[...doc.querySelectorAll('[data-eu-water-options] button:disabled')];
      assert.equal(unavailable.length,2);
      assert.ok(unavailable.every(button=>button.textContent.includes('分布未収録')));
    }
    if(field==='industry'||field==='population'){
      const title=field==='industry'?'産業の拠点':'人口密度';
      assert.equal(doc.querySelector('[data-eu-map-title]').textContent,title);
      assert.equal(doc.querySelector('[data-eu-subject-title]').textContent,field==='population'?'人口分布':title);
      assert.ok(doc.querySelector('[data-eu-legend-title]').textContent.includes(title));
      assert.ok(doc.querySelector('[data-eu-subject-takeaway]').textContent.length>15);
      assert.equal(doc.querySelector('[data-eu-climate-image]').getAttribute('href'),null);
      assert.ok(doc.querySelectorAll('[data-eu-feature-point]:not([hidden])').length>0);
      if(field==='industry'){
        assert.equal(doc.querySelectorAll('[data-eu-feature-point]:not([hidden])').length,14);
        assert.equal(doc.querySelector('[data-eu-feature]'),null);
        assert.match(doc.querySelector('[data-eu-subject-note]').textContent,/生産量・雇用の大小を表しません/);
      }else{
        assert.equal(doc.querySelectorAll('[data-eu-legend-items] .eu-swatch').length,8);
        assert.match(doc.querySelector('[data-eu-legend-title]').textContent,/2020.*人\/km²/);
        assert.match(doc.querySelector('[data-eu-legend-items]').textContent,/0を含む.*データなし/);
      }
    }
    window.happyDOM.abort();
  }
  const sitemap=readFileSync(new URL('../../dist/sitemap.xml',import.meta.url),'utf8');
  assert.ok(sitemap.includes('/atlas/europe/nature/'));
  assert.ok(sitemap.includes('/atlas/europe/agriculture/'));
  assert.ok(sitemap.includes('/atlas/europe/industry/'));
  assert.ok(sitemap.includes('/atlas/europe/population/'));
});

test('24都市の右側は同じ都市の雨温図・気候説明・農畜産説明を順に表示し、下の数値表へ対応する', () => {
  const window=new Window();const doc=window.document;
  doc.write(readFileSync(new URL('../../dist/atlas/europe/nature/index.html',import.meta.url),'utf8'));
  const cities=JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/climate-cities.json',import.meta.url),'utf8'));
  const classes=JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/map-labels.json',import.meta.url),'utf8')).cityClasses;
  const reading=doc.querySelector('[data-eu-climate-reader]');
  const statistics=doc.querySelector('[data-eu-climate-statistics]');
  const ids=cities.map(city=>city.id).sort();
  const before=(first,second)=>Boolean(first.compareDocumentPosition(second)&window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(cities.length,24);
  assert.deepEqual([...doc.querySelectorAll('[data-eu-point]')].map(point=>point.dataset.euPoint).sort(),ids);
  assert.deepEqual([...doc.querySelectorAll('[data-eu-city-select]')].map(button=>button.dataset.euCitySelect).sort(),ids);
  assert.deepEqual([...reading.querySelectorAll('[data-city-reading]')].map(card=>card.dataset.cityReading).sort(),ids);
  assert.deepEqual([...reading.querySelectorAll('[data-eu-city-chart]')].map(chart=>chart.dataset.euCityChart).sort(),ids);
  assert.deepEqual([...reading.querySelectorAll('[data-eu-climate-farming]')].map(section=>section.dataset.euClimateFarming).sort(),ids);
  assert.deepEqual([...statistics.querySelectorAll('[data-city-card]')].map(card=>card.dataset.cityCard).sort(),ids);
  assert.equal(statistics.querySelector('svg,canvas,[data-eu-city-chart]'),null,'下の統計欄に雨温図を重複させない');
  for(const city of cities) {
    const card=reading.querySelector(`[data-city-reading="${city.id}"]`);
    const chart=card.querySelector(`[data-eu-city-chart="${city.id}"]`);
    const classification=card.querySelector('.eu-city-climate-description');
    const farming=card.querySelector(`[data-eu-climate-farming="${city.id}"]`);
    const tableCard=statistics.querySelector(`[data-city-card="${city.id}"]`);
    assert.equal(card.hidden,city.id!=='london',city.id);
    assert.equal(tableCard.hidden,city.id!=='london',city.id);
    assert.equal(chart.querySelector('svg .atlas-climate-city-name').textContent,city.name,city.id);
    assert.match(chart.querySelector('svg').getAttribute('aria-label'),new RegExp(city.name),city.id);
    assert.ok(before(chart,classification)&&before(classification,farming),`${city.id}: 図→気候→農畜産の順で読む`);
    assert.equal(farming.hidden,false,`${city.id}: 農畜産の説明を常時表示する`);
    assert.equal(farming.closest('details'),null,`${city.id}: 農畜産説明を開閉の中に隠さない`);
    assert.ok(farming.querySelector('h4')?.textContent.trim(),city.id);
    assert.ok(farming.querySelector('p')?.textContent.trim(),city.id);
    if(classes[city.id]) {
      assert.equal(classification.querySelector('h4 strong').textContent,classes[city.id],`${city.id}: 地図格子の分類と一致する`);
    } else {
      assert.equal(classification.querySelector('h4 strong'),null,city.id);
      assert.match(classification.querySelector('h4').textContent,/分類は未収録/,city.id);
      assert.match(card.textContent,/分類を近隣地点の値で補っていません/,city.id);
    }
    assert.ok(card.querySelector(`a[href="${city.sourceUrl}"]`),city.id);
    const rainCount=city.months.filter(month=>month.precipitation!==null).length;
    const temperatureCount=city.months.filter(month=>month.temperature!==null).length;
    const crosses=[...chart.querySelectorAll('.atlas-climate-month')].filter(label=>label.textContent==='×');
    assert.equal(chart.querySelectorAll('.atlas-climate-bar').length,rainCount,`${city.id}: 欠測月を棒にしない`);
    assert.equal(crosses.length,12-rainCount,`${city.id}: 欠測月は×で示す`);
    assert.equal(chart.querySelectorAll('.atlas-climate-dot').length,temperatureCount,city.id);
    const segments=city.months.filter((month,index)=>month.temperature!==null&&(index===0||city.months[index-1].temperature===null)).length;
    assert.equal(chart.querySelectorAll('.atlas-climate-line').length,segments,`${city.id}: 気温の欠測区間を線で接続しない`);
    const rows=[...tableCard.querySelectorAll('tbody tr')];
    assert.equal(rows.length,12,city.id);
    for(const [index,row] of rows.entries()) {
      assert.equal(row.querySelector('th').textContent,`${city.months[index].month}月`,city.id);
      const expected=[city.months[index].temperature,city.months[index].precipitation].map(value=>value===null?'欠測':value.toFixed(1));
      assert.deepEqual([...row.querySelectorAll('td')].map(cell=>cell.textContent),expected,city.id);
    }
    const summary=[...tableCard.querySelectorAll('.eu-summary > div')];
    const annual=summary.find(row=>row.querySelector('dt').textContent==='年間降水量').querySelector('dd');
    if(rainCount<12) {
      assert.match(card.textContent,/0 mmを示すものではありません/,city.id);
      assert.match(annual.textContent,/欠測.*算出できません/,city.id);
      assert.match(classification.textContent,/年間降水量は、この資料だけでは示せません/,city.id);
    } else {
      const sum=city.months.reduce((total,month)=>total+month.precipitation,0);
      assert.equal(annual.textContent,`${sum.toLocaleString('ja-JP',{maximumFractionDigits:1})} mm`,city.id);
    }
  }
  window.happyDOM.abort();
});
