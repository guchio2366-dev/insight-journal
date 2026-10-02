import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const input = 'data-source/atlas/mexico/population-composition';
const output = 'public/assets/atlas/mexico-population-composition-v1';
const read = async name => JSON.parse(await readFile(`${input}/${name}`, 'utf8'));
const basic = await read('ethnicity-basic-state-extract.json');
const identity = await read('indigenous-identity-state-extract.json');
const religionRows = await read('religion-state-extract.json');
const religionNational = await read('religion-national-extract.json');
const religionMapping = await read('religion-group-mapping.json');
const religionProvenance = await read('religion-provenance.json');
const population = JSON.parse(await readFile('src/data/atlas/mexico/population.json', 'utf8'));
const codes = population.states.map(row => row.stateCode).sort();
const colors = ['#f1f0d6','#c6debe','#8ec2b0','#529f95','#26786e','#174c49'];
const bins = edges => edges.map((min, index) => ({min, max: edges[index+1] ?? null, color: colors[index], label: `${min}${edges[index+1] === undefined ? '%以上' : `–${edges[index+1]}%未満`}`}));
const record = row => ({
  count: row.count, denominator: row.denominator, status: row.count === 0 ? 'zero' : 'value',
  unknownCount: row.unspecifiedCount, sourceCells: row.sourceCells, sourceSheet: row.sourceSheet,
  ...(row.isEstimate ? {isEstimate:true, confidenceInterval90:row.percentageConfidenceInterval90,
    countConfidenceInterval90:row.countConfidenceInterval90, countCVPercentage:row.countCVPercentage,
    percentageCVPercentage:row.percentageCVPercentage} : {}),
});
const metrics = [];
function addEthnic(id, property, dataset, config) {
 const nation = dataset.national[property];
 metrics.push({id, category:'ethnicity', referenceYear:2020, ...config,
  nationalCount:nation.count, nationalDenominator:nation.denominator, nationalStatus:'value',
  nationalUnknownCount:nation.unspecifiedCount,
  ...(nation.isEstimate ? {nationalConfidenceInterval90:nation.percentageConfidenceInterval90,
    nationalCountConfidenceInterval90:nation.countConfidenceInterval90} : {}),
  states:Object.fromEntries(dataset.states.map(row => [row.stateCode, record(row[property])])),
 });
}
addEthnic('indigenous_language','indigenousLanguageAge3Plus',basic,{
 label:'先住民言語を話す（3歳以上）', isEstimate:false, sharePrecision:1,
 definition:'先住民言語を話すと報告された3歳以上の人口。先住民としての自己認識とは別の質問です。',
 takeaway:'言語を話す人数と人口に占める割合を、州ごとに分けて読みます。',
 countDenominatorLabel:'年齢が判明している3歳以上人口', countLabel:'公表人数',
 shareBins:bins([0,1,3,6,15,30]),
 source:{label:'INEGI：2020年国勢調査・基本票',url:basic.source.tableDownloadUrl,
  table:'Etnicidad 2／シート02・Total',periodNote:'2020年3月15日0時。表作成2021年1月25日。',
  methodNote:'人数は公表値。割合は公表人数÷同じ州の3歳以上人口×100として当サイトが計算。不詳も分母に含め、非話者へ付け替えません。',
  attribution:'Fuente: INEGI, Censo de Población y Vivienda 2020. Tabulados del Cuestionario Básico.',
  reuseTermsUrl:basic.source.reuseTermsUrl},
});
addEthnic('afro_identity','afroMexicanSelfIdentificationAllAges',basic,{
 label:'アフロ系の自己認識（全年齢）', isEstimate:false, sharePrecision:1,
 definition:'祖先・慣習・伝統を通してアフロメキシコ人・アフロ系と認識すると報告された人口。肌の色・毛髪や米国のrace分類で分けた指標ではありません。',
 takeaway:'アフロ系の自己認識を、全年齢人口に占める割合と人数で読みます。',
 countDenominatorLabel:'全年齢の通常居住人口', countLabel:'公表人数',
 shareBins:bins([0,0.5,1,2,3,5]),
 source:{label:'INEGI：2020年国勢調査・基本票',url:basic.source.tableDownloadUrl,
  table:'Etnicidad 14／シート14・Total',periodNote:'2020年3月15日0時。表作成2021年1月25日。',
  methodNote:'人数は公表値。割合は公表人数÷同じ州の総人口×100として当サイトが計算。不詳も分母に含めます。総人口には未情報住宅・未報告未成年の公式補完推計（全国6,337,751人）を含みます。',
  attribution:'Fuente: INEGI, Censo de Población y Vivienda 2020. Tabulados del Cuestionario Básico.',
  reuseTermsUrl:basic.source.reuseTermsUrl},
});
addEthnic('indigenous_identity_estimate','indigenousSelfIdentificationAge3PlusPrivateDwellings',identity,{
 label:'先住民の自己認識（公式推計）', isEstimate:true, sharePrecision:1,
 definition:'一般住宅に住む3歳以上で、先住民と認識すると報告された人口。拡大票の標本調査に基づく公式推計で、言語話者の全数集計とは母集団が異なります。',
 takeaway:'言語を話すことと先住民の自己認識は別です。公式推計と90%信頼区間を一緒に読みます。',
 countDenominatorLabel:'一般住宅の3歳以上人口（公式推計）', countLabel:'公式推計人数',
 shareBins:bins([0,5,10,20,40,60]),
 source:{label:'INPI：INEGI 2020年拡大票に基づく公表推計',url:identity.source.tableDownloadUrl,
  table:identity.source.tableTitle+'／Autoadscripción',periodNote:'2020年国勢調査・拡大票標本。対象は一般住宅の3歳以上。',
  methodNote:'推計人数・分母・90%信頼区間はINPI原表の直接公表値。割合は同じ表の人数÷分母×100。不詳を分母に含み、人数を丸めた割合から復元していません。区間は同じINPI表から採用し、別のINEGI公表区間と混ぜていません。',
  attribution:identity.source.attribution, reuseTermsUrl:identity.source.underlyingDataReuseTermsUrl,
  reuseNote:'INPI公表表の数値事実を抽出して当サイトで表示。元Excelは再配信せず、公式ダウンロードへリンク。INPIのExcel再配布ライセンスを確認したとは扱いません。'},
});
const religionDefinitions = [
 ['catholic','カトリック',['catholic'],[0,50,60,70,80,90],1,'カトリックと報告された人口。'],
 ['protestant_evangelical','プロテスタント・福音系（INEGI区分）',['protestant_evangelical'],[0,5,10,15,20,30],1,'公式のProtestante/Cristiano evangélico区分。バプテスト、長老派、福音派、ペンテコステ派、末日聖徒、エホバの証人など原表10区分を含みます。'],
 ['no_religion','無宗教',['no_religion'],[0,3,6,9,12,15],1,'Ninguna religiónとAteos/Agnósticosの公表人数の合計。信仰はあるが所属宗教なし、とは別です。'],
 ['unaffiliated_believer','信仰あり・所属宗教なし',['unaffiliated_believer'],[0,1,2,3,4,5],1,'Sin adscripción religiosa (creyente)。信仰はあるが特定の宗教に所属しないと報告された人口。無宗教へ含めません。'],
 ['jewish','ユダヤ教',['jewish'],[0,0.01,0.03,0.1,0.3,1],3,'Judíaの公表人数。宗教についての回答区分で、民族の自己認識を示しません。'],
 ['islamic','イスラム教',['islamic'],[0,0.002,0.005,0.01,0.02,0.05],3,'Islámicaの公表人数。少人数の州も実数と小さい割合を省略せず示します。'],
 ['other_religions_combined','その他の宗教（合算）',['ethnic_roots','afro_roots','spiritualist','other_religions'],[0,0.05,0.1,0.2,0.5,1],2,'原表のRaíces étnicas、Raíces afro、Espiritualistaとその他4区分を当サイトが合算。カトリック、公式プロテスタント区分、ユダヤ教、イスラム教は含みません。民族・アフロ系自己認識の人数でもありません。'],
 ['religion_unspecified','宗教の回答不詳',['unspecified'],[0,0.1,0.25,0.5,1,2],2,'原表No especificadoの人数。不詳は無宗教やゼロへ付け替えず、各指標の総人口分母に含めます。'],
];
for (const [id,label,groups,edges,precision,definition] of religionDefinitions) {
 const sum = row => groups.reduce((value,key)=>value+row[key],0);
 metrics.push({id,category:'religion',referenceYear:2020,label,definition,isEstimate:false,sharePrecision:precision,
  takeaway:'信仰・所属・無宗教は別の回答区分です。選んだ区分の人数と州内割合を比べます。',
  countDenominatorLabel:'全年齢の通常居住人口（不詳を含む）',countLabel:'公表人数',
  nationalCount:sum(religionNational),nationalDenominator:religionNational.populationTotal,nationalStatus:'value',
  nationalUnknownCount:religionNational.unspecified, shareBins:bins(edges),
  states:Object.fromEntries(religionRows.map(row=>[row.entityCode,{count:sum(row),denominator:row.populationTotal,
    status:sum(row)===0?'zero':'value',unknownCount:row.unspecified,
    sourceCells:{count:groups.flatMap(key=>row[`${key}_sourceCells`]),denominator:row.sourceTotalCell},sourceSheet:'02'}])),
  source:{label:'INEGI：2020年国勢調査・宗教基本票表',url:religionProvenance.workbook?.url ?? 'https://www.inegi.org.mx/contenidos/programas/ccpv/2020/tabulados/cpv2020_b_eum_12_religion.xlsx',
    table:'B2020_12_02_E／シート02・Sexo=Total',periodNote:'2020年3月15日0時。全年齢の通常居住者。',
    methodNote:'人数は原表の公表人数を保持し、記載した区分だけを合算。割合は人数÷同じ州の全年齢総人口×100として当サイトが計算。不詳を除いて再正規化しません。宗教は申告された信仰・精神的な選好で、実践の頻度や熱心さを測る指標ではありません。総人口には国勢調査の公式補完推計を含みます。',
    definitionUrl:'https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/702825197520.pdf',
    attribution:'Fuente: INEGI, Censo de Población y Vivienda 2020. Tabulados del Cuestionario Básico.',
    reuseTermsUrl:'https://www.inegi.org.mx/inegi/terminos.html',
    components:groups.flatMap(key=>religionMapping.find(row=>row.key===key).denominations)},
 });
}
for (const metric of metrics) {
 if (Object.keys(metric.states).sort().join(',') !== codes.join(',')) throw new Error(`Incomplete states: ${metric.id}`);
 let count = 0, denominator = 0;
 for (const code of codes) {
  const row=metric.states[code];
  if(!Number.isSafeInteger(row.count)||!Number.isSafeInteger(row.denominator)||row.count<0||row.denominator<=0||row.count>row.denominator) throw new Error(`Invalid ${metric.id}/${code}`);
  count+=row.count;denominator+=row.denominator;
  if(metric.category==='religion'&&row.denominator!==population.states.find(state=>state.stateCode===code).population) throw new Error(`Population mismatch ${code}`);
 }
 if(count!==metric.nationalCount||denominator!==metric.nationalDenominator) throw new Error(`National mismatch ${metric.id}`);
 const maximum=Math.max(...codes.map(code=>metric.states[code].count));
 const nice = n => {const magnitude=10**Math.floor(Math.log10(n)); return Math.ceil(n/magnitude)*magnitude;};
 metric.countRadiusReference=nice(maximum);metric.countMaximumRadius=33;
 metric.countLegendValues=[metric.countRadiusReference/10,metric.countRadiusReference/2,metric.countRadiusReference];
 const ranked=codes.map(code=>({code,share:100*metric.states[code].count/metric.states[code].denominator})).sort((a,b)=>b.share-a.share);
 metric.distributionSummary='割合が高い州：'+ranked.slice(0,3).map(row=>`${population.states.find(state=>state.stateCode===row.code).nameJa} ${row.share.toFixed(metric.sharePrecision)}%`).join('、')+'（2020年）。';
 metric.comparabilityNote=metric.category==='ethnicity'?'3つの指標は重複可能で、同じ分母でもなく、合計100%の排他的な人種分類ではありません。米国のrace分類とは対応しません。':'この8表示区分は原表の全宗教回答と不詳を分けたものです。地域の割合から個人の信仰・行動を推定しません。';
}
for(const code of codes) {
 const sum=metrics.filter(metric=>metric.category==='religion').reduce((n,metric)=>n+metric.states[code].count,0);
 if(sum!==population.states.find(state=>state.stateCode===code).population) throw new Error(`Religion partition mismatch ${code}`);
}
const data={schemaVersion:1,referenceYear:2020,referenceDate:'2020-03-15',displayGeometryYear:2025,
 generatedFrom:'Official state and national table counts; source cells and transformations retained.',
 noGeographicDeterminism:'地図は回答・言語・自己認識の地域差を示します。自然条件だけで民族や宗教を説明しません。',metrics};
await mkdir(output,{recursive:true});
const json=JSON.stringify(data,null,2)+'\n';
await writeFile('src/data/atlas/mexico/population-composition.json',json);
await writeFile(`${output}/composition-2020.json`,json);
const csvHeader='metric,category,referenceYear,stateCode,count,denominator,sharePercent,status,isEstimate,unknownCount,percentageLower90,percentageUpper90,countLower90,countUpper90';
const csvRows=metrics.flatMap(metric=>codes.map(code=>{
 const row=metric.states[code];return [metric.id,metric.category,2020,code,row.count,row.denominator,100*row.count/row.denominator,row.status,metric.isEstimate,row.unknownCount,row.confidenceInterval90?.lower??'',row.confidenceInterval90?.upper??'',row.countConfidenceInterval90?.lower??'',row.countConfidenceInterval90?.upper??''].join(',');
}));
const csv=csvHeader+'\n'+csvRows.join('\n')+'\n';await writeFile(`${output}/composition-2020.csv`,csv);
const sourceNames=['ethnicity-basic-state-extract.json','indigenous-identity-state-extract.json','religion-state-extract.json','religion-national-extract.json','religion-group-mapping.json','religion-provenance.json','inegi-ethnicity-basic.xlsx','inegi-religion-basic.xlsx','inegi-free-use-evidence.json','inpi-reuse-evidence.json'];
const sourceArtifacts=[];
for(const name of sourceNames){const bytes=await readFile(`${input}/${name}`);sourceArtifacts.push({file:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const manifest={schemaVersion:1,referenceYear:2020,referenceDate:'2020-03-15',accessed:'2026-10-02',
 attribution:{ethnicityBasic:'INEGI, Censo de Población y Vivienda 2020, Cuestionario Básico',indigenousIdentity:identity.source.attribution,religion:'INEGI, Censo de Población y Vivienda 2020, Tabulados del Cuestionario Básico'},
 sourceArtifacts,transformations:['Extract official national and state totals; preserve original counts and denominators.','Use directly published INPI sample count estimates and their own 90% intervals; do not reconstruct counts from rounded shares.','Calculate unrounded share=100*count/metric-specific denominator; retain nonresponses in denominator.','Aggregate religious source leaves into eight exhaustive UI groups; retain component labels and original cells.','Translate labels and author map thresholds; bins are display choices, not INEGI categories.'],
 metrics:metrics.map(metric=>({id:metric.id,category:metric.category,label:metric.label,countDenominatorLabel:metric.countDenominatorLabel,isEstimate:metric.isEstimate,shareBins:metric.shareBins,countRadiusReference:metric.countRadiusReference,countLegendValues:metric.countLegendValues,source:metric.source})),
 validation:{states:32,metrics:metrics.length,missingStateRows:0,allCountsAndDenominatorsSumToNational:true,religionEightGroupsSumToEachTotal:true,existingPopulationTotalsMatch:true},
 scientificLimits:{ethnicityIndicatorsOverlap:true,universeDiffersByMetric:true,basicTotalIncludesOfficialCoverageEstimation:true,indigenousIdentityIsOfficialSampleEstimate:true,intervalsFromINPI:true,notUSRaceClassification:true,noIndividualInference:true},
 reuse:{inegiTerms:'https://www.inegi.org.mx/inegi/terminos.html',requirements:['Credit INEGI and original products.','Retain metadata and identify all site calculations and aggregations.','Do not imply official endorsement.'],inpi:'Numerical facts extracted with INPI/INEGI attribution and source link; full INPI workbook not hosted or included in repository, no unspecified redistribution license claimed.'},
 displayGeometry:{reference:'INEGI Marco Geoestadístico, diciembre de 2025',sameExisting32StateGeometry:true,joinKey:'Two-digit state code',densityRecalculated:false},
 generated:{json:{file:'composition-2020.json',bytes:Buffer.byteLength(json),sha256:createHash('sha256').update(json).digest('hex')},csv:{file:'composition-2020.csv',bytes:Buffer.byteLength(csv),sha256:createHash('sha256').update(csv).digest('hex')}},groundwaterIncluded:false};
await writeFile(`${output}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({states:32,metrics:metrics.length,ethnicity:3,religion:8,jsonBytes:Buffer.byteLength(json),csvRows:csvRows.length,validation:manifest.validation}));
