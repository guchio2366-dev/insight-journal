import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Adopt verified research intermediates. This script does not claim to recreate
// the upstream NetCDF extraction or shared-edge drainage simplification.
// Run: node scripts/prepare-canada-water-resources.mjs --research-root <directory>
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const option = process.argv.indexOf('--research-root');
const research = option < 0 ? path.resolve(repository, '..', 'canada-water-research') : path.resolve(process.argv[option + 1]);
const assets = path.join(repository, 'public/assets/atlas/canada-water-v1');
const prefix = '/assets/atlas/canada-water-v1/';
const accessed = '2026-10-02';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const records = [];
async function verified(file, expected) {
  const bytes = await readFile(path.join(research, file));
  const digest = sha(bytes);
  if (expected && digest !== expected) throw Error(`Changed verified input: ${file} (${digest})`);
  records.push({file, bytes: bytes.length, sha256: digest});
  return bytes;
}
await mkdir(assets, {recursive: true});
async function save(file, bytes) {
  await writeFile(path.join(assets, file), bytes);
  return {file, bytes: bytes.length, sha256: sha(bytes)};
}
const outputAssets = [];
async function snapshot(source, destination) {
  outputAssets.push(await save(destination, await verified(source)));
}
const vertexCount = value => typeof value?.[0] === 'number' ? 1 : value.reduce((sum, child) => sum + vertexCount(child), 0);
const geometryHash = collection => sha(Buffer.from(JSON.stringify(collection.features.map(feature => feature.geometry))));
async function vector(file, source, features, expectedVertices) {
  const collection = {type: 'FeatureCollection', bbox: source.bbox, features};
  const vertices = features.reduce((sum, feature) => sum + vertexCount(feature.geometry.coordinates), 0);
  if (vertices !== expectedVertices || geometryHash(collection) !== geometryHash(source)) throw Error(`Geometry changed: ${file}`);
  const bytes = Buffer.from(JSON.stringify(collection));
  const record = {...await save(file, bytes), features: features.length, vertices, geometrySha256: geometryHash(collection), geometryPolicy: 'All input coordinates retained unchanged; only display properties added.'};
  outputAssets.push(record, await save(`${file}.gz`, gzipSync(bytes, {level: 9})));
  return record;
}
const commonSource = (title, publisher, url, year, licence, licenceUrl, attribution, note) => ({title, publisher, url, year, licence, licenceUrl, accessed, attribution, ...(note ? {note} : {})});
const canadaLicence = 'Open Government Licence - Canada 2.0';
const canadaLicenceUrl = 'https://open.canada.ca/en/open-government-licence-canada';
const bcLicenceUrl = 'https://www2.gov.bc.ca/gov/content/data/policy-standards/data-policies/open-data/open-government-licence-bc';

const precipitationProvenance = json(await verified('precipitation/source-provenance.json'));
const precipitationSummary = json(await verified('precipitation/annual-precipitation-summary.json'));
const precipitationRender = json(await verified('precipitation/annual-precipitation-render-summary.json'));
if (precipitationSummary.annualValidLandCells !== 100945 || precipitationSummary.annualMissingLandCells !== 0 || !precipitationSummary.allNonLandCellsMasked) throw Error('Changed precipitation coverage');
if (JSON.stringify(precipitationRender.classSourceCellCounts) !== '[6841,34612,27489,13132,16269,2602]') throw Error('Changed precipitation classes');
for (const asset of precipitationRender.outputs) outputAssets.push(await save(asset.name, await verified(`precipitation/${asset.name}`, asset.sha256)));
outputAssets.push(await save('annual-valid-grid-points.csv.gz', await verified('precipitation/annual-valid-grid-points.csv.gz', '05230c91440028ce9c3491c9b97aea3f3e369269c8107e3c9bb57d266c69b5b0')));
await snapshot('precipitation/range-manifest.json', 'precipitation-range-manifest.json');
await snapshot('precipitation/source-provenance.json', 'precipitation-source-provenance.json');
await snapshot('precipitation/annual-precipitation-summary.json', 'precipitation-summary.json');
await snapshot('precipitation/annual-precipitation-render-summary.json', 'precipitation-render-summary.json');
await snapshot('precipitation/grid-render-verification.json', 'precipitation-render-verification.json');

const drainageInput = json(await verified('drainage/canada-statistical-drainage-regions.geojson', 'fc192cff92168d89e41ad50d0e16065e1e408f1ab2c80b15fd0e49445bf7579a'));
const drainageValidation = json(await verified('drainage/validated-manifest.json'));
const drainageNames = json(await verified('drainage/japanese-display-names.json'));
if (drainageInput.features.length !== 25 || !drainageValidation.allValid || !drainageValidation.coverageValid) throw Error('Drainage validation failed');
const drainageFeatures = drainageInput.features.map(feature => ({...feature, properties: {...feature.properties, group: feature.properties.id, sourceId: feature.properties.id, sourceName: feature.properties.name}}));
const drainageAsset = await vector('drainage-regions.geojson', drainageInput, drainageFeatures, 183251);
await snapshot('drainage/validated-manifest.json', 'drainage-validation.json');
await snapshot('drainage/region-contract.json', 'drainage-source-regions.json');

const groundwaterProvenance = json(await verified('groundwater/provenance.json'));
// The original URL remains in private acquisition evidence. Both official URLs
// returned HTTP 200 with byte-identical licence content after redirects.
const aliasResponse = json(await verified('licence-alias/alias-response.json'));
const originalResponse = json(await verified('licence-alias/original-response.json'));
if (aliasResponse.status !== 200 || originalResponse.status !== 200 || aliasResponse.finalUrl !== bcLicenceUrl || originalResponse.finalUrl !== bcLicenceUrl || aliasResponse.sha256 !== originalResponse.sha256 || aliasResponse.sha256 !== 'b913baf2b66ae7ea155937237ad608905ed6329dd3d7a38af3b60b1aae6a5a17') throw Error('BC licence alias verification failed');
groundwaterProvenance.adopted_layers[1].licence_url = bcLicenceUrl;
const licenceAliasVerification = {verifiedAtUtc: new Date(aliasResponse.headers.date).toISOString(), readableAlias: aliasResponse.requestedUrl, finalUrl: bcLicenceUrl, status: 200, title: aliasResponse.title, responseBytes: aliasResponse.bytes, responseSha256: aliasResponse.sha256, sameContentAsOriginalLicence: true, method: 'Read-only HTTP GET requests to the original documented licence URL and the readable official alias returned the same final URL and byte-identical response bodies. Original acquisition URL and full response headers remain in private research evidence.'};
outputAssets.push(await save('bc-licence-url-verification.json', Buffer.from(JSON.stringify(licenceAliasVerification, null, 2) + '\n')));
const groundwaterInspection = json(await verified('groundwater/inspection.json'));
const groundwaterTopology = json(await verified('groundwater/topology-validation.json'));
const groundwaterImpact = json(await verified('groundwater/invalid-regions-impact.json'));
const nationalInput = json(await verified('groundwater/canada-hydrogeological-regions.geojson', '4c98b23247f082d1da225e3153f4d760ca72913efb391dfb43fbcd6a74c603c4'));
const nationalOriginal = json(await verified('groundwater/gin-regions-source.geojson', 'b84a218cc53c1b7201c29c2a2d9ad02a2d3d6b6edb5b424bce414698523183b2'));
const aquiferInput = json(await verified('groundwater/bc-fraser-aquifers.geojson', 'f3a91a8a26d7008d95e57bb386f0ff3292c3dc95fabbd281a221f46423beda21'));
const aquiferOriginal = json(await verified('groundwater/bc-fraser-aquifers-source.geojson', '0c01d39e23df3d09213de1a8218433013fa965e629f3b16dfc44141b23029cc3'));
if (geometryHash(nationalInput) !== geometryHash(nationalOriginal) || geometryHash(aquiferInput) !== geometryHash(aquiferOriginal)) throw Error('Upstream groundwater geometry changed');
const nationalValidation = groundwaterTopology.results.find(result => result.prepared.file === 'canada-hydrogeological-regions.geojson');
const aquiferValidation = groundwaterTopology.results.find(result => result.prepared.file === 'bc-fraser-aquifers.geojson');
const invalidIds = nationalValidation.prepared.invalid_geometries.map(feature => feature.index);
if (JSON.stringify(invalidIds) !== '[45,65,97,112,150,237,441]' || nationalValidation.unchanged_geometry_wkb_count !== 1176 || aquiferValidation.prepared.invalid_geometry_count !== 0 || aquiferValidation.unchanged_geometry_wkb_count !== 149) throw Error('Unexpected groundwater topology');
const nationalClasses = [
  ['Southern Ontario Lowlands', 'オンタリオ南部低地', '#fdbf6f', '堆積層が広がる南部の低地。'],
  ['Canadian Shield', 'カナダ楯状地', '#cab2d6', '古い結晶質岩盤を主体とする地域。'],
  ['St. Lawrence Platform', 'セントローレンス・プラットフォーム', '#b2df8a', 'セントローレンス沿いの堆積岩地域。'],
  ['Appalachain Mountains', 'アパラチア山地', '#fb9a99', '東部の褶曲した岩盤地域。原資料の綴りを保持。'],
  ['Magdalen Basin', 'マグダレン堆積盆地', '#e31a1c', 'セントローレンス湾周辺の堆積盆地。'],
  ['Western Canada Sedimentary Basin', '西カナダ堆積盆地', '#33a02c', '内陸平原の厚い堆積層の地域。'],
  ['Hudson Bay Lowlands', 'ハドソン湾低地', '#a6cee3', 'ハドソン湾沿いの低地。'],
  ['Cordillera', 'コルディエラ山系', '#ff7f00', '西部の山地と山間の堆積層。'],
  ['Permafrost', '永久凍土地帯', '#1f78b4', '永久凍土が地下水の流れに影響する北部。']
];
const groundwaterGroups = nationalClasses.map(([sourceName, name, color, description], index) => ({id: `c${index + 1}`, name, sourceName, color, description, sourceFeatureCount: groundwaterInspection[1].PRIMARY_[sourceName]}));
const classByName = new Map(groundwaterGroups.map(group => [group.sourceName, group.id]));
const invalidByIndex = new Map(nationalValidation.prepared.invalid_geometries.map(feature => [feature.index, feature]));
const invalidNotice = '原資料の形状不整合で塗り表示を除外';
nationalInput.bbox = groundwaterInspection[1].bbox;
const nationalFeatures = nationalInput.features.map((feature, index) => {
  const original = nationalOriginal.features[index].properties, invalid = invalidByIndex.get(index), name = original.PRIMARY_, group = classByName.get(name);
  if (!group) throw Error(`Unknown hydrogeological region ${name}`);
  return {...feature, properties: {...feature.properties, AQUIFER_DI: original.AQUIFER_DI, AQUIFER__1: original.AQUIFER__1, id: String(feature.id), name, group, sourceName: name, sourcePartIndex: index, validity: invalid ? 'source-invalid' : 'valid', fillExcluded: Boolean(invalid), ...(invalid ? {validityNotice: invalidNotice, validityReason: invalid.reason} : {})}};
});
const nationalAsset = await vector('hydrogeological-regions.geojson', nationalInput, nationalFeatures, 114278);
aquiferInput.bbox = groundwaterInspection[0].bbox;
const aquiferFeatures = aquiferInput.features.map((feature, index) => {
  const original = aquiferOriginal.features[index], properties = feature.properties;
  const group = properties.MATERIAL === 'Sand and Gravel' ? 'sand-gravel' : properties.MATERIAL === 'Bedrock' ? 'bedrock' : null;
  if (!group) throw Error(`Unknown aquifer material ${properties.MATERIAL}`);
  return {...feature, properties: {...properties, GW_A_SYSID: original.properties.GW_A_SYSID, OBJECTID: original.properties.OBJECTID, id: String(properties.AQUIFER_ID), name: properties.NAME || properties.LOCATION || `Aquifer ${properties.AQUIFER_ID}`, group, sourceFeatureId: original.id, sourceName: properties.NAME, validity: 'valid', fillExcluded: false}};
});
if (aquiferFeatures.length !== 149 || new Set(aquiferFeatures.map(feature => feature.properties.id)).size !== 149) throw Error('Changed aquifer identifiers');
const aquiferAsset = await vector('bc-fraser-aquifers.geojson', aquiferInput, aquiferFeatures, 117894);
outputAssets.push(await save('groundwater-source-provenance.json', Buffer.from(JSON.stringify(groundwaterProvenance, null, 2) + '\n')));
await snapshot('groundwater/inspection.json', 'groundwater-inspection.json');
await snapshot('groundwater/topology-validation.json', 'groundwater-topology-validation.json');
await snapshot('groundwater/invalid-regions-impact.json', 'groundwater-invalid-regions-impact.json');

const oceans = {'1': ['太平洋', '#2166ac'], '2': ['北極海', '#762a83'], '3': ['メキシコ湾', '#e66101'], '4': ['ハドソン湾', '#1b9e77'], '5': ['大西洋', '#b2182b']};
const precipitationGroups = ['250未満', '250〜500未満', '500〜750未満', '750〜1,000未満', '1,000〜1,500未満', '1,500以上'].map((label, index) => ({id: `p${index}`, name: `${label} mm/年`, color: precipitationRender.classColors[index], sourceName: ['<250', '250–<500', '500–<750', '750–<1000', '1000–<1500', '≥1500'][index] + ' mm/year', lowerBoundMm: index ? precipitationRender.classThresholdsMm[index - 1] : 0, upperBoundExclusiveMm: precipitationRender.classThresholdsMm[index] ?? null, sourceCellCount: precipitationRender.classSourceCellCounts[index]}));
const projection = {type: 'affine-epsg4326', bounds: [-145, 40, -50, 85], width: 900, height: 580, transform: 'x=(longitude+145)/95*900; y=(85-latitude)/45*580'};
const [west, south, east, north] = aquiferInput.bbox;
const aquiferFrame = [(west + 145) / 95 * 900 - 5, (85 - north) / 45 * 580 - 5, (east - west) / 95 * 900 + 10, (north - south) / 45 * 580 + 10].map(number => Number(number.toFixed(3)));
const data = {id: 'canada-water-v1', projection, datasets: {
  precipitation: {
    title: '年降水量（1991〜2020年平均）', groups: precipitationGroups,
    imageUrl: prefix + 'annual-precipitation-1991-2020-locator.png',
    images: precipitationGroups.map((group, index) => ({id: group.id, url: prefix + `annual-precipitation-1991-2020-class-${index}.png`})),
    scope: '全国の陸域・約10 km格子。雨と雪の水当量を合わせた年降水量の30年平均。',
    reading: '湿った空気が山地に当たる太平洋岸は多雨で、内陸・北極圏は少雨の傾向です。',
    method: '1991〜2020年の各月を30年間平均し、12か月を合計。360か月すべてが有効な陸域セルだけを分類し、海域と欠測は透明に保持。',
    period: [1991, 2020], units: 'mm/year', sourceCellCount: 100945, missingLandCellCount: 0, nativeResolution: 'approximately 10 km',
    imageBounds: projection.bounds, imageSize: [1900, 900], imageFit: 'preserveAspectRatio=none', clipToCanada: true,
    note: '公開月別系列から計算した値。ECCC配布の1991〜2020年平年値ファイルではありません。表示セル数は面積や観測所数ではありません。',
    sources: [commonSource('CanGridP mlyV2', 'Environment and Climate Change Canada', precipitationProvenance.catalogueUrl, '1991–2020 derived; product published 2026', canadaLicence, canadaLicenceUrl, 'Source: Environment and Climate Change Canada, CanGridP mlyV2. Annual 1991–2020 averages calculated from monthly gridded total precipitation. Contains information licensed under the Open Government Licence - Canada.', '調整・均質化した観測所系列を空間内挿した格子資料。原データは1948〜2023年の月別系列。')]
  },
  drainage: {
    title: '統計排水地域（25地域）', groupProperty: 'group', geometryUrl: prefix + drainageAsset.file,
    groups: drainageFeatures.map(feature => {const properties = feature.properties, ocean = oceans[properties.oceanAreaId]; return {id: properties.id, name: drainageNames.regions[properties.id], sourceId: properties.id, sourceName: properties.name, color: ocean[1], oceanAreaId: properties.oceanAreaId, oceanAreaName: properties.oceanAreaName, description: `${ocean[0]}側。${properties.name}（原資料ID ${properties.id}）。`};}),
    oceanAreas: Object.entries(oceans).map(([id, [name, color]]) => ({id, name, color})),
    legendGroups: Object.entries(oceans).map(([id, [name, color]]) => ({id, name, color, description: `${name}側へ流れる統計排水地域。`})),
    scope: 'カナダ国内の25統計排水地域。海岸部・島を含む2003年分類、2017年刊行。',
    reading: '分水界で分けた地域を、太平洋・北極海・ハドソン湾・大西洋・メキシコ湾の5流出先で読みます。',
    method: '公式25地域の全成分と穴を保持。共有境界をまとめて簡略化した表示用形状を使用し、原資料ID・名称・流出先を維持。',
    note: '国境をまたぐ河川の完全な流域ではありません。面積・流量の測定には使用しません。',
    featureCount: 25, classification: 'SDAC 2003 variant', publicationDate: '2017-03-21',
    sources: [commonSource('Drainage regions of Canada', 'Statistics Canada', 'https://www150.statcan.gc.ca/n1/pub/16-201-x/2017000/sec-1/m-c/m-c-1.1-eng.htm', 'SDAC 2003; published 2017', canadaLicence, canadaLicenceUrl, 'Source: Statistics Canada, Drainage regions of Canada (SDAC 2003 variant), 2017. Contains information licensed under the Open Government Licence - Canada.', 'カナダ部分と隣接海岸・島を含む統計地域。')]
  },
  groundwater: {
    title: '全国の水文地質地域（9区分）', groups: groundwaterGroups, groupProperty: 'group', geometryUrl: prefix + nationalAsset.file,
    scope: '2008年の全国水文地質区分。地域ごとの岩盤・堆積層・永久凍土の違い。',
    reading: '堆積層・岩盤の割れ目・永久凍土の違いが、地下水のたまり方と流れ方に関係します。',
    method: '原資料の1,176ポリゴン成分を座標変更なく使用。正常な1,169成分を塗り、自己交差のある7成分は原形の輪郭だけを表示。',
    note: '全国の個別帯水層一覧や地下水量の資料ではありません。貯水量・涵養量・取水量・利用可能量は示しません。',
    excludedFillNotice: invalidNotice, invalidGeometryCount: 7, validGeometryCount: 1169, featureCount: 1176,
    year: 2008, invalidSourcePartIndexes: invalidIds,
    sources: [commonSource('Hydrogeological regions of Canada', 'Natural Resources Canada / Geological Survey of Canada', groundwaterProvenance.adopted_layers[0].catalogue_url, '2008; catalogue published 2023', canadaLicence, canadaLicenceUrl, 'Source: Natural Resources Canada / Geological Survey of Canada, Hydrogeological regions of Canada. Contains information licensed under the Open Government Licence - Canada.', '原資料の英語区分名とIDを保持。旧GIN配布の一般免責とは別に、現行のデータ固有カタログで利用条件を確認。')]
  },
  aquifers: {
    title: '帯水層の地域例（BC州南西部）', groupProperty: 'group', geometryUrl: prefix + aquiferAsset.file,
    groups: [{id: 'sand-gravel', name: '砂礫の帯水層', sourceName: 'Sand and Gravel', color: '#2c7fb8', description: '砂と礫のすき間に地下水を含む調査済みの帯水層。', sourceFeatureCount: 117}, {id: 'bedrock', name: '岩盤の帯水層', sourceName: 'Bedrock', color: '#d95f0e', description: '岩盤の割れ目などに地下水を含む調査済みの帯水層。', sourceFeatureCount: 32}],
    areas: aquiferFeatures.map(feature => ({id: feature.properties.id, name: `${feature.properties.name}（ID ${feature.properties.id}）`, group: feature.properties.group})),
    defaultFrame: aquiferFrame, bbox: aquiferInput.bbox, queryBbox: [-123.4, 48.85, -121.6, 49.5],
    scope: 'BC州南西部の検索枠に交差する149の公的な帯水層形状。全国・BC州全域の網羅図ではありません。',
    reading: '砂礫層と岩盤の違いを149の調査済み帯水層で比べます。空白は地下水が存在しない場所を意味しません。',
    method: '公式WFSの検索枠と交差する全ポリゴンを、切り抜き・簡略化・修正せず表示。地質材料で2分類し、個別ID・名称・調査年を保持。',
    note: '境界は地質・井戸などに基づく解釈図。地図の色は地下水の量・利用可能量や取水の持続可能性を示しません。',
    featureCount: 149, mappingYearRange: [1993, 2025], mappingYearDefinition: 'Year initially mapped or last updated',
    sources: [commonSource('Ground Water Aquifers', 'Government of British Columbia', groundwaterProvenance.adopted_layers[1].catalogue_url, 'Mapping years 1993–2025; retrieved 2026-10-02', 'Open Government Licence - British Columbia', groundwaterProvenance.adopted_layers[1].licence_url, 'Source: Government of British Columbia, Ground Water Aquifers. Contains information licensed under the Open Government Licence - British Columbia.', '検索枠に交差する全形状を取得。調査範囲の空白は帯水層の不存在を示さず、58件の未設定名称はLOCATIONで表示。')]
  }
}};
await writeFile(path.join(repository, 'src/data/atlas/canada/water-resources.json'), JSON.stringify(data, null, 2) + '\n');
const manifest = {
  id: data.id, accessed, projection, assets: outputAssets, sourceIntermediates: records,
  preparation: {script: 'scripts/prepare-canada-water-resources.mjs', scope: 'Adoption from pinned verified research intermediates, display property normalization, and deterministic gzip. Upstream extraction and geometry preparation are separately documented. Large source archives and monthly ranges are not bundled.', geometryPolicy: 'Drainage uses the separately validated shared-edge simplification. Both groundwater datasets retain all source geometry coordinates unchanged. Seven invalid national polygons remain in the asset and must receive no fill.'},
  precipitation: {source: precipitationProvenance, summary: precipitationSummary, rendering: precipitationRender, upstreamMonthlyRangeManifest: 'precipitation-range-manifest.json', downloadablePointTable: 'annual-valid-grid-points.csv.gz', pointTablePrecision: 'Source table rounds longitude/latitude to 4 decimals and annual mm to 1 decimal; it is an audit/download table, not the raster render input.', scientificResolution: 'Approximately 10 km source grid; image pixels do not increase resolution.', nationalClipRequirement: 'Clip raster to the existing trustworthy Canadian outline in UI; source land mask preserved.'},
  drainage: {validation: drainageValidation, sourceArchive: {url: drainageValidation.geometryURL, bytes: 48768762, sha256: 'a1648eb2d9e2cf03e410b2acffa4c968e8cfaedc3fffb0aa5fed706c791043ac'}, groups: data.datasets.drainage.groups, sourceGeographyScope: 'Canadian portions, coastal areas and islands, not complete international physical watersheds.'},
  groundwater: {source: groundwaterProvenance.adopted_layers[0], sourceArchive: {file: 'gin-regions-export.zip', member: 'd195/hgr.json', bytes: 2060286, sha256: '14c1907da61e55c8e3ce0f55093ccbd18de72f6476ca06b12dc6f9e883e39b24'}, inspection: groundwaterInspection[1], topology: nationalValidation, invalidPartDiagnostic: {file: 'groundwater-invalid-regions-impact.json', invalidCount: groundwaterImpact.invalid_count, vertices: groundwaterImpact.invalid_vertices, interpretation: 'Vertex count is an input-complexity diagnostic, not an area or groundwater quantity. Original legacy AREA/PERIMETER attributes in the diagnostic are source fields, not newly computed measurements.'}, groups: groundwaterGroups, output: nationalAsset, originalGeometrySha256: geometryHash(nationalOriginal), originalLegacyIds: ['AQUIFER_DI', 'AQUIFER__1'], displayPartIdMethod: '0-based part index from unchanged source ordering; separate original AQUIFER_DI/AQUIFER__1 attributes retained.', invalidFillPolicy: invalidNotice, noGeometryRepair: true},
  aquifers: {source: groundwaterProvenance.adopted_layers[1], licenceUrlVerification: licenceAliasVerification, inspection: groundwaterInspection[0], topology: aquiferValidation, output: aquiferAsset, originalGeometrySha256: geometryHash(aquiferOriginal), areas: data.datasets.aquifers.areas, sourceIdsRetained: ['AQUIFER_ID', 'GW_A_SYSID', 'OBJECTID', 'sourceFeatureId'], featureCount: 149, materials: {'Sand and Gravel': 117, Bedrock: 32}, blankAreasMeaning: 'Not evidence of absent groundwater; query window is not a survey footprint.'},
  excluded: groundwaterProvenance.excluded_layer
};
await writeFile(path.join(assets, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Canada water: 100945 valid land cells, 25 drainage regions, 1176 hydrogeological parts (7 outline only), 149 mapped BC aquifers.');
