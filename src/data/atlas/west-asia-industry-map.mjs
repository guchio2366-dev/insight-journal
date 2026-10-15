// Regional editorial annotations, not map controls or quantitative symbols.
// Anchors refer to an existing, sourced location; no new facility is invented.
export const westIndustryMapNotes = {
 resources:[
  {id:'gulf-energy',title:'原油・ガス',place:'ペルシャ湾岸',industries:['crude','gas','lng','refining','helium'],anchor:['lng',0],offset:[8,8]},
  {id:'fertilizer-minerals',title:'リン・カリ資源',place:'ヨルダン・死海周辺',industries:['phosphate','potash'],anchor:['potash',0],offset:[-116,6]},
  {id:'turkey-boron',title:'ホウ素',place:'トルコ西部内陸',industries:['boron'],anchor:['boron',0],offset:[-40,10]},
  {id:'saudi-bauxite',title:'ボーキサイト',place:'サウジ内陸',industries:['aluminium'],anchor:['aluminium',6],offset:[-108,8]},
 ],
 manufacturing:[
  {id:'marmara-vehicles',title:'自動車・部品',place:'マルマラ海周辺',industries:['automotive'],anchor:['automotive',0],offset:[8,-34]},
  {id:'turkey-consumer',title:'家電・衣類',place:'トルコ西部・内陸',industries:['white-goods','apparel'],anchor:['white-goods',0],offset:[-106,8]},
  {id:'gulf-processing',title:'精製・石化・金属',place:'湾岸の沿岸',industries:['refining','polymers','nitrogen','aluminium','steel'],anchor:['polymers',1],offset:[10,10]},
  {id:'dead-sea-potash',title:'カリ肥料',place:'死海南岸',industries:['potash'],anchor:['potash',0],offset:[-92,6]},
 ],
 services:[
  {id:'turkey-tourism',title:'観光',place:'トルコ沿岸・都市',industries:['tourism'],anchor:['tourism',1],offset:[-108,8]},
  {id:'gulf-services',title:'物流・金融',place:'ドバイ・湾岸都市',industries:['ports','aviation','finance'],anchor:['ports',0],offset:[8,-34]},
  {id:'israel-information',title:'情報サービス',place:'イスラエル中部',industries:['tech-services'],anchor:['tech-services',0],offset:[-112,8]},
  {id:'ocean-port',title:'外洋側の港',place:'サラーラ',industries:['ports'],anchor:['ports',1],offset:[-96,8]},
 ],
};

// Separate the actual stages on each map, retaining all source observations.
// Refining remains an energy product and a manufacturing process.
export function westIndustryLocationInSector(industry,location,sector){
 if(!industry.sectors.includes(sector))return false;
 if(industry.id==='aluminium')return sector==='resources'?location.stage.includes('採掘'):!location.stage.includes('採掘');
 if(industry.id==='phosphate')return sector==='resources'?location.stage.includes('採掘'):!location.stage.includes('採掘');
 return true;
}

export const westIndustryMapSectorCopy = {
 resources:{title:'資源・エネルギーの地図',key:'採掘・ガス田と燃料の製造・積出し'},
 manufacturing:{title:'製造業の地図',key:'加工・組立・精錬と企業本社'},
 services:{title:'サービス業の地図',key:'港湾・空港・金融・観光・情報の集積'},
};

const stageReadings = {
 'aluminium:resources':{label:'ボーキサイト（アルミ原料）',summary:'サウジのアルミ原料は内陸のアルバイーサで採られ、湾岸の一次精錬とは立地条件が異なる。',why:'アルバイーサのボーキサイト鉱床が採掘位置を決める。電力と港への接続を必要とする湾岸の精錬とは、立地を支える条件が異なる。'},
 'aluminium:manufacturing':{label:'一次アルミ・アルミナ',summary:'UAE、バーレーン、カタール、オマーン、サウジの湾岸沿岸に一次精錬が集まり、多量の電力と港への接続が立地を支える。'},
 'phosphate:resources':{label:'リン鉱石',summary:'ヨルダン南部のエシディヤ、アルハサ、ワディアルアビアドにリン鉱石の採掘が分布し、鉱床の位置が立地を決める。'},
 'phosphate:manufacturing':{label:'リン酸肥料',summary:'サウジ北部のワアド・アルシャマルと湾岸のラス・アルハイルにはリン酸肥料の加工拠点があり、原料と港への接続が加工立地を支える。'},
 'steel:manufacturing':{label:'直接還元鉄（DRI）',summary:'ジュバイル、ソハール、バーレーンのヒッドにはガスを使う直接還元設備があり、還元剤・エネルギーの供給と港への接続が立地を支える。'},
};
export const westIndustryMapReading=(industry,sector)=>({label:industry.label,summary:industry.summary,why:industry.why,...(stageReadings[industry.id+':'+sector]??{})});
export const westIndustryMapLabel=(industry,sector)=>westIndustryMapReading(industry,sector).label;
