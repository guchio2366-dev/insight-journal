import {southeastIndustryProfiles} from './southeast-asia-industry-catalog.ts';
/** Official-source teaching examples, not an inventory of sites or output. */
export type SoutheastIndustryKind='electronics'|'automotive'|'textiles'|'food'|'metals'|'energy'|'petrochemicals'|'logistics'|'tourism'|'finance'|'it-bpm'|'rubber'|'wood'|'palm'|'rice'|'lng'|'hydro'|'solar';
export type SoutheastIndustrySite={id:string;label:string;industryName:string;placeName:string;kind:SoutheastIndustryKind;stage:'raw'|'processing'|'service';point:[number,number];reading:string;sourceLabel:string;sourceUrl:string;sourceYear:string;positionScope:'regional-guide';facilityCoordinates:null;operationalStatus:'source-dated-example'};
export type SoutheastIndustrySector='resource'|'manufacturing'|'services';
export const southeastIndustrySectors:{id:SoutheastIndustrySector;label:string;reading:string}[]=[
 {id:'resource',label:'資源・エネルギー',reading:'スラウェシ・カリマンタンの資源域とビントゥル・ラオス中部のエネルギー拠点では、鉱床・ガス供給・水資源が立地に関わる。'},
 {id:'manufacturing',label:'製造業',reading:'ペナン・タイ東部・ジャワ島西部・ベトナム南北の加工集積では原料、人材、工業団地、港湾への接続が工程ごとの立地を支える。'},
 {id:'services',label:'サービス業',reading:'海峡沿いの港湾・金融、バリやプーケットの観光、マニラ・セブの受託業務には異なる需要と専門機能が集まる。'},
];
export function southeastSiteSectors(site:SoutheastIndustrySite):SoutheastIndustrySector[]{
 if(site.stage==='raw'||site.kind==='lng'||site.kind==='hydro')return ['resource'];
 if(southeastIndustryProfiles.find(p=>p.id===site.kind)?.sectors.includes('services'))return ['services'];
 return ['manufacturing'];
}
export const southeastIndustryKinds:{id:'all'|SoutheastIndustryKind;label:string;reading:string}[]=[
 {id:'all',label:'この分野の全産業',reading:southeastIndustrySectors[0].reading},
 ...southeastIndustryProfiles.map(p=>({id:p.id,label:p.label,reading:p.reading})),
];
const source={
 penang:['マレーシア投資開発庁・電気電子産業','https://www.mida.gov.my/industries/manufacturing/electrical-electronics/','2026閲覧'],
 kulim:['マレーシア投資開発庁・クリムの半導体工場','https://www.mida.gov.my/mida-news/infineon-to-invest-additional-rm30b-to-expand-kulim-facility/','2024'],
 bacninh:['ベトナム投資促進庁・バクニンの組立・検査','https://investvietnam.gov.vn/en/news.nd/yen-phong-industrial-park-bac-ninh-successfully--attracted-amkor-investors.html','2023以降'],
 eec:['タイ投資委員会・東部経済回廊','https://www.boi.go.th/upload/03_EEC-English_65857.pdf','2017'],
 auto:['インドネシア自動車工業会・製造企業の立地','https://www.gaikindo.or.id/en/jenis_anggota/manufaktur/','2026閲覧'],
 textile:['カンボジア開発評議会・産業ロードマップ','https://cdc.gov.kh/wp-content/uploads/2023/04/ENG_Auto__Electronics_Roadmap.pdf','2023'],
 vietnamTextile:['ベトナム政府・ホーチミン市の衣料集積','https://en.baochinhphu.vn/sme-cluster-development-project-gets-more-capital-11115827.htm','2013'],
 food:['ベトナム投資促進庁・キエンザン省の水産加工','https://investvietnam.gov.vn/en/dia-phuong.td/kien-giang-4.html','公表時点'],
 palm:['IOIグループ・2024年年次報告（パシルグダンの製油所）','https://www.ioigroup.com/integrated-report/2024/pdf/resource-based-manufacturing.pdf','2024'],
 nickel:['インドネシア地質庁・スラウェシの鉱床と製錬','https://psg.geologi.esdm.go.id/index.php/archives/jalur-metalogeni-indonesia-apa-kenapa-dan-bagaimana-sebarannya-bagian-tiga/','2025'],
 coal:['インドネシアエネルギー鉱物資源省・石炭研究','https://jurnal.tekmira.esdm.go.id/index.php/imj/article/view/619/481','2017'],
 lng:['PETRONAS・ビントゥルLNG施設','https://www.petronas.com/progressing-energy/liquefied-natural-gas','2026閲覧'],
 hydro:['世界銀行・ナムトゥン2水力発電','https://www.worldbank.org/en/country/lao/brief/nam-theun-2-project-overview-and-update','公表時点'],
 jurong:['シンガポールJTC・ジュロン島','https://www.jtc.gov.sg/jurongisland','2026閲覧'],
 pengerang:['マレーシア投資開発庁・ペンゲラン','https://www.mida.gov.my/success-stories/prefchem/','2026閲覧'],
 singaporePort:['シンガポール海事港湾庁・港湾統計','https://www.mpa.gov.sg/media-centre/details/strong-growth-momentum-for-maritime-singapore','2024'],
 portKlang:['マレーシア港湾当局・ポートクラン港湾統計','https://www.pka.gov.my/index.php/en/information/statistics/31-port-klang-performance','2024'],
 laemChabang:['タイ港湾庁・レムチャバン港','https://lcp.port.co.th/cs/internet/lcp/Information.html','2026閲覧'],
 bali:['インドネシア観光省・バリ','https://www.indonesia.travel/gb/en/destination/bali-nusa-tenggara/bali','2026閲覧'],
 phuket:['タイ国政府観光庁・プーケット','https://www.tourismthailand.org/Destinations/Provinces/Phuket/350','2026閲覧'],
 siemreap:['カンボジアAPSARA機構・アンコール観光','https://apsaraauthority.gov.kh/our-work/tourism-info/','2026閲覧'],
 finance:['シンガポール金融管理局・金融機関ディレクトリ','https://eservices.mas.gov.sg/fid/institution?category=Local%2520Bank','2026閲覧'],
 itbpm:['フィリピン投資委員会・マニラとセブのIT-BPM案件','https://boi.gov.ph/boi-approves-php524-33-m-amazons-virtual-customer-services-project-to-shore-up-the-countrys-it-bpm-industry/','公表時点'],
 rubber:['ASEAN・Agroforestry in ASEAN','https://asean.org/wp-content/uploads/2021/12/FAFD-50.-AF-status-and-outlook-Final-210809.pdf','2021'],
 tire:['タイ投資委員会・タイヤ工場案件','https://www.boi.go.th/index.php?_module=news&from_page=press_releases2&language=en&page=press_releases_detail&topic_id=136064','2024'],
 timber:['世界銀行・ベトナム北中部の植林','https://documents1.worldbank.org/curated/en/114511621491387556/pdf/Vietnam-North-Central-Region-Emission-Reductions-Program-Project.pdf','2021'],
 furniture:['米国農務省・ベトナムの木材加工業','https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Vietnam+Wood+Processing+Industry_Ho+Chi+Minh+City_Vietnam_06-11-2020','2020'],
} satisfies Record<string,[string,string,string]>;
function site(id:string,kind:SoutheastIndustryKind,label:string,industryName:string,placeName:string,point:[number,number],stage:SoutheastIndustrySite['stage'],reading:string,src:keyof typeof source):SoutheastIndustrySite{const [sourceLabel,sourceUrl,sourceYear]=source[src];return {id,kind,label,industryName,placeName,point,stage,reading,sourceLabel,sourceUrl,sourceYear,positionScope:'regional-guide',facilityCoordinates:null,operationalStatus:'source-dated-example'};}
export const southeastIndustrySites:SoutheastIndustrySite[]=[
 site('penang','electronics','ペナンの電子産業','電子部品・機器','ペナン',[100.3,5.3],'processing','電子企業と人材が集まる。','penang'),
 site('kulim','electronics','クリムの半導体前工程','半導体前工程','クリム',[100.57,5.43],'processing','半導体製造施設。組立・検査と工程が異なります。','kulim'),
 site('bacninh','electronics','バクニンの組立・検査','半導体組立・検査','バクニン',[106.08,21.18],'processing','半導体の組立・検査施設の事例。','bacninh'),
 site('thai-auto','automotive','タイ東部の自動車産業','自動車・部品','タイ東部',[101.1,13.25],'processing','港と工業団地を背景に集積。EVはその一部です。','eec'),
 site('java-auto','automotive','ジャワ島西部の自動車産業','自動車・部品','ジャワ島西部',[107.2,-6.4],'processing','ジャカルタ東方の工業地帯を見る代表位置。','auto'),
 site('hcm-textile','textiles','ホーチミン市の衣料','衣料縫製','ホーチミン市',[106.7,10.8],'processing','衣料産業クラスターを見る都市の代表位置。資料は2013年の事例です。','vietnamTextile'),
 site('phnom-textile','textiles','プノンペン周辺の衣料','衣料縫製','プノンペン周辺',[104.93,11.55],'processing','首都圏の縫製集積を見る代表位置。','textile'),
 site('kiengiang-food','food','キエンザン省の水産加工','水産加工','メコンデルタ',[105.08,10.0],'processing','漁獲物の加工産業を読む省の代表位置。漁場や個別工場の位置ではありません。','food'),
 site('johor-food','palm','パシルグダンのパーム油精製','パーム油精製','ジョホール',[103.9,1.45],'processing','食用油脂などをつくる既存の製油所。アブラヤシの栽培地とは区別します。','palm'),
 site('sulawesi-nickel','metals','スラウェシのニッケル鉱床','ニッケル資源','スラウェシ',[121.3,-2.7],'raw','広い鉱床地域を読む代表位置。鉱床境界ではありません。','nickel'),
 site('morowali-smelter','metals','モロワリの製錬','ニッケル製錬','モロワリ',[121.9,-2.9],'processing','鉱石を加工する産業地区の事例。','nickel'),
 site('kalimantan-coal','energy','カリマンタンの石炭','石炭資源','カリマンタン',[115.8,-1.1],'raw','東・南カリマンタンの資源を読む代表位置。','coal'),
 site('bintulu-lng','lng','ビントゥルのLNG','天然ガス液化','ビントゥル',[113.04,3.17],'processing','天然ガス液化施設。ガス田とは異なります。','lng'),
 site('namtheun-hydro','hydro','ナムトゥン2の水力発電','水力発電','ラオス中部',[105.27,17.95],'processing','水力発電事業。石炭やLNGとは別の電源です。','hydro'),
 site('jurong-petro','petrochemicals','ジュロン島の精製・石化','精製・石油化学','ジュロン島',[103.7,1.28],'processing','精製・化学工場の集積。原油産地ではありません。','jurong'),
 site('maptaphut-petro','petrochemicals','マプタプットの石化','石油化学','マプタプット',[101.16,12.68],'processing','タイ東部の石化と港の立地例。','eec'),
 site('pengerang-petro','petrochemicals','ペンゲランの精製・石化','精製・石油化学','ペンゲラン',[104.12,1.37],'processing','精製と石化を組み合わせる施設。','pengerang'),
 site('singapore-port','logistics','シンガポール港','積替港','シンガポール',[103.85,1.27],'processing','域内外を結ぶコンテナ積替港。','singaporePort'),
 site('port-klang','logistics','ポートクラン','港湾','ポートクラン',[101.38,3.0],'processing','マレー半島西岸の港。貨物の産地ではありません。','portKlang'),
 site('laem-chabang','logistics','レムチャバン港','港湾','レムチャバン',[100.88,13.09],'processing','タイ東部の工業地帯と海上輸送の接点。','laemChabang'),
 site('bali-tourism','tourism','バリ島の観光','自然・文化観光','バリ島',[115.2,-8.4],'service','自然と文化を生かす観光地の代表位置。','bali'),
 site('phuket-tourism','tourism','プーケットの観光','海浜観光','プーケット',[98.39,7.89],'service','海浜と島嶼の観光地。','phuket'),
 site('siemreap-tourism','tourism','シェムリアップの観光','遺産観光','シェムリアップ',[103.86,13.36],'service','アンコール遺跡に近い観光拠点。','siemreap'),
 site('singapore-finance','finance','シンガポールの金融','金融サービス','シンガポール',[103.86,1.29],'service','金融機関が集まる都市の代表位置。','finance'),
 site('manila-itbpm','it-bpm','マニラ首都圏のIT-BPM','顧客対応・事務','マニラ首都圏',[121.01,14.58],'service','顧客対応・事務処理の案件拠点。','itbpm'),
 site('cebu-itbpm','it-bpm','セブのIT-BPM','顧客対応・事務','セブ',[123.9,10.32],'service','マニラとは別のIT-BPM案件拠点。','itbpm'),
 site('southern-rubber','rubber','タイ南部のゴム栽培','天然ゴム栽培','タイ南部',[99.9,7.0],'raw','ゴム栽培地域の代表位置。','rubber'),
 site('rayong-tires','rubber','ラヨーンのタイヤ製造','タイヤ製造','ラヨーン',[101.28,12.68],'processing','タイヤ工場の立地事例。','tire'),
 site('north-central-timber','wood','ベトナム北中部の植林材','植林材','ベトナム北中部',[106.8,16.8],'raw','広い植林材地域を読む代表位置。','timber'),
 site('binh-duong-furniture','wood','ビンズオンの家具加工','家具加工','旧ビンズオン',[106.68,11.15],'processing','2020年資料の木材加工・家具集積。旧ビンズオンは2025年の行政再編後のホーチミン市域に含まれ、輸入材も加工する。','furniture'),
];
