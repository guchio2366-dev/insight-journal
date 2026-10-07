import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { europeLayers } from '../../src/data/atlas/europe/layers.ts';

test('4分野を直接開け、初期地図・解説・凡例がJavaScriptなしでも同じ主題を示す',()=>{
  for (const field of ['nature','agriculture','industry','population']) {
    const window=new Window();const doc=window.document;
    doc.write(readFileSync(new URL(`../../dist/atlas/europe/${field}/index.html`,import.meta.url),'utf8'));
    assert.ok(doc.querySelector('[data-eu-static]'));
    assert.equal(doc.querySelectorAll('.eu-read-panel select').length,4);
    assert.equal(doc.querySelector('[data-eu-drainage-choice]').closest('label').hidden,true);
    assert.equal(doc.querySelector('[data-eu-culture-host]').hidden,true,'The bounded census case does not replace the default whole-Europe map');
    assert.ok([...doc.querySelectorAll('.eu-read-panel select:not([data-eu-drainage-choice])')].every(select=>select.disabled));
    assert.equal(doc.querySelectorAll('[data-city-card]').length,24);
    assert.equal(doc.querySelectorAll('[data-city-card="kyiv"] tbody tr').length,12);
    assert.ok(doc.querySelector('[data-city-card="rome"]').textContent.includes('欠測'));
    const active=field==='nature'?'climate':field==='population'?'subject':null;
    if(active)assert.ok(doc.querySelector(`[data-eu-${active}-image]`).getAttribute('href'));
    assert.equal(doc.querySelectorAll('[data-eu-field]').length,4);
    const layerIds=JSON.parse(doc.querySelector('[data-eu-config]').textContent).layers.map(layer=>layer.id);
    assert.deepEqual(layerIds,europeLayers.map(layer=>layer.id),'配信configと登録済み主題の一覧が一致する');
    assert.equal(new Set(layerIds).size,layerIds.length,'主題IDは重複しない');
    assert.ok(doc.querySelector('a[href="https://doi.org/10.7910/DVN/SWPENT"]'));
    assert.ok(doc.querySelector('[data-eu-field="crops"]'));
    assert.equal(doc.querySelector('meta[name="robots"]'),null);
    const climateReader=field==='nature';
    assert.equal(doc.querySelector('[data-eu-climate-reader]').hidden,!climateReader);
    assert.equal(doc.querySelector('[data-eu-subject-reader]').hidden,false,'気候の読み方も選択都市の上で読める');
    assert.equal(doc.querySelector('[data-eu-subject-legend]').hidden,climateReader||field==='agriculture');
    assert.equal(doc.querySelector('[data-eu-climate-legend]').hidden,field!=='nature');
    assert.equal(doc.querySelector('[data-eu-wheat-legend]').hidden,true);
    assert.equal(doc.querySelector('.eu-read-panel').getAttribute('aria-labelledby'),climateReader?'eu-city-heading':'eu-subject-title');
    assert.equal(doc.querySelectorAll('[data-eu-point]:not([hidden])').length,climateReader?8:0);
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
      const choices=[...doc.querySelectorAll('[data-eu-farming-children="crop"] button,[data-eu-farming-children="livestock"] button')];
      assert.deepEqual(choices.map(button=>button.dataset.euLayer).sort(),farmItems.map(item=>item.id).sort());
      assert.ok(choices.every(button=>button.getAttribute('aria-pressed')==='false'&&button.querySelector('.eu-item-swatch')));
      assert.equal(doc.querySelector('[data-eu-farming-legend]').hidden,false);
      assert.match(doc.querySelector('[data-eu-farming-legend]').textContent,/作物は実線.*家畜は破線/);
      assert.match(doc.querySelector('[data-eu-subject-note]').textContent,/ブドウ.*オリーブ.*未収録/);
      const statistics=doc.querySelector('[data-eu-farming-statistics]');
      assert.match(statistics.textContent,/販売総額（米ドル）/);
      assert.match(statistics.textContent,/世界生産.*分母/);
      assert.match(statistics.textContent,/FAOSTAT.*World/,'世界比の分母を出版社のWorld行としてJavaScriptなしでも説明する');
      assert.match(statistics.textContent,/ゼロという意味ではありません/);
      const availability=[...statistics.querySelectorAll('.eu-statistics-availability > div')];
      const unavailable=['販売総額（米ドル）'];
      for(const label of unavailable){
        const entry=availability.find(row=>row.querySelector('dt').textContent===label);
        assert.ok(entry,label);
        assert.match(entry.querySelector('dd').textContent,/未収録/,`${label}は数量統計で代用しない`);
      }
      const columns=statistics.querySelectorAll('[data-eu-farm-three-columns] > section');
      assert.equal(columns.length,3);
      assert.match(columns[0].textContent,/供給元・行先.*国内仕向け.*未収録/s);
      assert.match(columns[1].textContent,/輸出先.*輸出量・額.*未収録/s);
      assert.equal(columns[2].querySelector('[data-eu-farm-share-chart]').children.length,0);
      const scope=availability.find(row=>row.querySelector('dt').textContent==='地図と数量の対象');
      assert.match(scope.querySelector('dd').textContent,/格子の収穫面積・家畜密度.*国全体の生産量・頭羽数.*別の資料/);
      assert.match(scope.querySelector('dd').textContent,/集合的な作物区分.*個別品目の統計に置き換えません/);
      const quantities=statistics.querySelector('[data-eu-farm-numbers]');
      assert.equal(quantities.dataset.statisticsUrl,'/insight-journal/assets/atlas/europe/farming-statistics-v1/statistics.json.gz');
      assert.equal(doc.getElementById(quantities.getAttribute('aria-labelledby')),quantities.querySelector('h3'));
      const message=quantities.querySelector('[data-eu-farm-statistics-message]');
      assert.equal(message.getAttribute('role'),'status');
      assert.match(message.textContent,/品目を選ぶと.*数量.*国別比較.*読み込めます/,'概覧では品目選択後の遅延取得を案内する');
      assert.equal(quantities.querySelector('[data-eu-farm-stat-controls]').hidden,true);
      assert.equal(quantities.querySelector('[data-eu-farm-measure]').options.length,0,'概覧から特定品目の数量を先に表示しない');
      const year=quantities.querySelector('[data-eu-farm-year]');
      assert.deepEqual([...year.options].map(option=>option.value),Array.from({length:10},(_,i)=>String(2024-i)));
      assert.equal(year.value,'2024');
      const comparisons=[...quantities.querySelectorAll('[data-eu-farm-compare]')];
      assert.equal(comparisons.length,2);
      for(const comparison of comparisons){
        assert.equal(comparison.value,'');
        assert.deepEqual([...comparison.options].map(option=>option.value),['',...config.countries.map(country=>country.code)]);
      }
      for(const target of ['stat-summary','country-table','series','stat-source','measure-definition'])assert.equal(quantities.querySelector(`[data-eu-farm-${target}]`).hidden,true,target);
      assert.equal(quantities.querySelector('[data-eu-farm-country-rows]').children.length,0,'取得前に公表値や未収録表を作らない');
      assert.equal(quantities.querySelector('[data-eu-farm-country-table]').open,false,'国別の長い表は利用者が開いたときに表示する');
      assert.equal(quantities.querySelector('[data-eu-farm-statistics-retry]').hidden,true);
      assert.equal(statistics.querySelector('svg,canvas'),null);
    }
    if(field==='nature'){
      const reading=doc.querySelector('[data-eu-climate-reader]');
      const statistics=doc.querySelector('[data-eu-climate-statistics]');
      assert.equal(reading.querySelector('table'),null);
      assert.equal(reading.querySelectorAll('[data-eu-city-chart] svg').length,24);
      assert.equal(statistics.querySelector('[data-eu-city-chart],svg,canvas'),null,'下段には数値表と年間の要約を掲載し、雨温図を重複しない');
      assert.equal(doc.querySelectorAll('[data-eu-city-chart]').length,24);
      assert.equal(statistics.hidden,true);
      assert.deepEqual([...reading.querySelectorAll('[data-city-reading]:not([hidden])')].map(card=>card.dataset.cityReading),[]);
      assert.deepEqual([...statistics.querySelectorAll('[data-city-card]:not([hidden])')].map(card=>card.dataset.cityCard),[]);
      assert.equal(reading.querySelectorAll('[data-city-reading]').length,24);
      assert.equal(statistics.querySelectorAll('[data-city-card]').length,24);
      assert.match(reading.querySelector('[data-city-reading="london"]').textContent,/HEATHROW/);
      assert.match(reading.textContent,/都市や国全体の平均ではありません/);
      const unavailable=[...doc.querySelectorAll('[data-eu-water-options] button:disabled')];
      assert.equal(unavailable.length,0);
      assert.equal(doc.querySelector('[data-eu-water-options] [data-eu-topic="drainage"]').disabled,false);
      const waterNote='河川・湖の位置、年降水量、流域区画を切り替えます。地下水は公開利用条件が未確認のため未収録です。';
      assert.equal(doc.querySelector('[data-eu-map-legend] .eu-water-note').textContent,waterNote,'承認済みの水資源説明を地図下に全文保持する');
      assert.equal(doc.querySelectorAll('.eu-water-note').length,1);
      assert.equal(doc.body.textContent.split(waterNote).length-1,1,'同じ説明を重複表示しない');
      assert.doesNotMatch(doc.querySelector('[data-eu-water-options]').textContent,/地下水/,'表示切替には説明文を重複させない');
      assert.equal(doc.querySelector('[data-eu-water-options] [data-eu-topic="precipitation"]').disabled,false);
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

test('24都市の右側の雨温図・開閉できる気候と農畜産説明、下段の月別数値表は同じ観測地点へ対応する', () => {
  const window=new Window();const doc=window.document;
  doc.write(readFileSync(new URL('../../dist/atlas/europe/nature/index.html',import.meta.url),'utf8'));
  const cities=JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/climate-cities.json',import.meta.url),'utf8'));
  const countries=JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/countries.json',import.meta.url),'utf8'));
  const classes=JSON.parse(readFileSync(new URL('../../src/data/atlas/europe/map-labels.json',import.meta.url),'utf8')).cityClasses;
  const reading=doc.querySelector('[data-eu-climate-reader]');
  const statistics=doc.querySelector('[data-eu-climate-statistics]');
  const ids=cities.map(city=>city.id).sort();
  const before=(first,second)=>Boolean(first.compareDocumentPosition(second)&window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(cities.length,24);
  assert.deepEqual([...doc.querySelectorAll('[data-eu-point]')].map(point=>point.dataset.euPoint).sort(),ids);
  const cityChoice=doc.querySelector('[data-eu-city-choice]');
  assert.ok(cityChoice);
  assert.deepEqual([...cityChoice.options].map(option=>option.value).filter(Boolean).sort(),ids);
  assert.equal(cityChoice.value,'');
  assert.deepEqual([...reading.querySelectorAll('[data-city-reading]')].map(card=>card.dataset.cityReading).sort(),ids);
  assert.deepEqual([...reading.querySelectorAll('[data-eu-city-chart]')].map(chart=>chart.dataset.euCityChart).sort(),ids);
  assert.deepEqual([...reading.querySelectorAll('[data-eu-climate-farming]')].map(section=>section.dataset.euClimateFarming).sort(),ids);
  assert.deepEqual([...statistics.querySelectorAll('[data-city-card]')].map(card=>card.dataset.cityCard).sort(),ids);
  assert.equal(doc.querySelectorAll('[data-eu-city-chart]').length,24,'各都市の雨温図は1つだけ');
  assert.equal(statistics.querySelector('svg,canvas,[data-eu-city-chart]'),null,'下段で雨温図を重複させない');
  const ariaIds=[...doc.querySelectorAll('[id]')].map(element=>element.id);
  assert.equal(new Set(ariaIds).size,ariaIds.length,'観測地点・図・解説・表のIDは重複しない');
  for(const city of cities) {
    assert.equal([...cityChoice.options].find(option=>option.value===city.id).textContent,`${city.name}（${countries.find(country=>country.code===city.country).name}）`,city.id);
    const card=reading.querySelector(`[data-city-reading="${city.id}"]`);
    const chart=card.querySelector(`[data-eu-city-chart="${city.id}"]`);
    const classification=card.querySelector('.eu-city-climate-description');
    const farming=card.querySelector(`[data-eu-climate-farming="${city.id}"]`);
    const tableCard=statistics.querySelector(`[data-city-card="${city.id}"]`);
    assert.equal(card.hidden,true,city.id);
    assert.equal(tableCard.hidden,true,city.id);
    assert.equal(chart.querySelector('svg .atlas-climate-city-name').textContent,city.name,city.id);
    assert.match(chart.querySelector('svg').getAttribute('aria-label'),new RegExp(city.name),city.id);
    assert.equal(doc.getElementById(card.getAttribute('aria-labelledby'))?.textContent,`${city.name}の雨温図`,city.id);
    assert.deepEqual([...chart.querySelectorAll('.atlas-climate-month')].filter(label=>label.textContent!=='×').map(label=>label.textContent),Array.from({length:12},(_,index)=>String(index+1)),`${city.id}: 全12月の軸ラベルを掲載する`);
    assert.ok(before(classification,farming),`${city.id}: 右は気候→農畜産の順で読む`);
    assert.ok(before(chart,classification),`${city.id}: 右は雨温図→詳しい解説の順で読む`);
    assert.ok(before(chart,tableCard.querySelector('table')),`${city.id}: 雨温図より下段に月別表を掲載する`);
    assert.equal(farming.hidden,false,`${city.id}: 農畜産の全文を解説本文として保持する`);
    const details=farming.closest('details');
    assert.equal(details,null,`${city.id}: 理由と農畜産の全文は雨温図下に常時表示する`);
    const sourceDetails=card.querySelector('.eu-city-reading-details');
    assert.equal(sourceDetails.open,false,`${city.id}: 観測地点と追加出典は補助操作で開ける`);
    assert.match(sourceDetails.querySelector('summary').textContent,/1991–2020.*観測地点.*出典/,city.id);
    assert.equal(sourceDetails.querySelectorAll('summary').length,1,city.id);
    const tableDetails=tableCard.querySelector('table').closest('details');
    assert.ok(tableDetails.querySelector('summary')?.textContent.trim(),`${city.id}: 月別の全数値をnative detailsで開ける`);
    assert.equal(tableDetails.open,false,city.id);
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
      assert.match(card.textContent,/欠測[\s\S]*0 mmではありません/,city.id);
      assert.match(annual.textContent,/欠測.*算出できません/,city.id);
      assert.match(card.querySelector('.eu-climate-missing').textContent,/欠測.*0 mmではありません/,city.id);
      assert.match(card.querySelector('.eu-city-reading-details').textContent,/欠測.*年間降水量は示せません/,city.id);
    } else {
      const sum=city.months.reduce((total,month)=>total+month.precipitation,0);
      assert.equal(annual.textContent,`${sum.toLocaleString('ja-JP',{maximumFractionDigits:1})} mm`,city.id);
    }
  }
  window.happyDOM.abort();
});
