import {southeastIndustryProfiles,southeastIndustrySources} from './southeast-asia-industry-catalog.ts';
import {southeastIndustrySites,southeastSiteSectors,type SoutheastIndustryKind,type SoutheastIndustrySector} from './southeast-asia-industry-sites.ts';

/** Each map uses declared memberships, including evidenced resource/processing roles. */
export function southeastMapKindSectors(kind:SoutheastIndustryKind):SoutheastIndustrySector[]{
 const sites=southeastIndustrySites.filter(s=>s.kind===kind);
 return sites.length?[...new Set(sites.flatMap(southeastSiteSectors))]:southeastIndustryProfiles.find(p=>p.id===kind)!.sectors;
}
export function southeastPreferredSector(kind:SoutheastIndustryKind):SoutheastIndustrySector{
 const sectors=southeastMapKindSectors(kind);
 return sectors.includes('manufacturing')?'manufacturing':sectors[0];
}
export const southeastSectorKindLabel=(kind:SoutheastIndustryKind,sector:SoutheastIndustrySector)=>({
 resource:{metals:'ニッケル（鉱石・製錬）',rubber:'天然ゴム・タイヤ',wood:'木材・家具加工'},
 manufacturing:{metals:'ニッケル製錬',rubber:'タイヤ製造',wood:'木材・家具加工'},
 services:{},
}[sector] as Partial<Record<SoutheastIndustryKind,string>>)[kind]??southeastIndustryProfiles.find(p=>p.id===kind)!.label;

const names:Record<string,[string,string]>={
 'lumut-lng':['ルムット','LNG液化'],'tibar-port':['ティバール','港湾'],
 'thotnot-rice':['トットノット','精米・選別'],'perai-solar':['ペライ','太陽電池'],'yangon-textile':['ヤンゴン周辺','衣料'],
 penang:['ペナン・クリム','電子・半導体'],bacninh:['バクニン','組立・検査'],
 'thai-auto':['タイ東部','自動車'],'java-auto':['ジャワ島西部','自動車'],
 'hcm-textile':['ホーチミン周辺','衣料'],'phnom-textile':['プノンペン','衣料'],
 'kiengiang-food':['メコンデルタ','水産加工'],'johor-food':['ジョホール','パーム油精製'],
 'sulawesi-nickel':['スラウェシ','ニッケル鉱床'],'morowali-smelter':['モロワリ','ニッケル製錬'],
 'kalimantan-coal':['カリマンタン','一般炭'],'bintulu-lng':['ビントゥル','LNG液化'],
 'namtheun-hydro':['ラオス中部','水力'],
 'jurong-petro':['ジュロン・ペンゲラン','精製・石化'],'maptaphut-petro':['マプタプット','石化'],
 'singapore-port':['シンガポール','積替港'],'port-klang':['クラン','港湾'],'laem-chabang':['レムチャバン','港湾'],
 'bali-tourism':['バリ','観光'],'phuket-tourism':['プーケット','観光'],'siemreap-tourism':['シェムリアップ','遺産観光'],
 'singapore-finance':['シンガポール','金融'],'manila-itbpm':['マニラ','業務受託'],'cebu-itbpm':['セブ','業務受託'],
 'southern-rubber':['タイ南部','天然ゴム'],'rayong-tires':['ラヨーン','タイヤ'],'north-central-timber':['ベトナム北中部','植林材'],
 'binh-duong-furniture':['旧ビンズオン','家具加工'],
};
const grouped:Record<string,string[]>={penang:['penang','kulim'],'jurong-petro':['jurong-petro','pengerang-petro']};
const merged=new Set(['kulim','pengerang-petro']);
/** Group label anchors use an original point; individual coordinates never move. */
export const southeastMapLabels=southeastIndustrySites.filter(s=>!merged.has(s.id)).map(site=>({
 id:site.id,siteIds:grouped[site.id]??[site.id],kind:site.kind,sector:southeastSiteSectors(site)[0],sectors:southeastSiteSectors(site),
 place:names[site.id][0],industry:names[site.id][1],point:site.point,
}));

/** Previously shown on the map: retained below it with scope, date and source. */
export const southeastSiteScaleNotes=[
 {id:'bintulu-lng',text:'ビントゥル：液化設備能力2,930万t/年（PETRONAS、2026年閲覧）。実生産量ではない。'},
 {id:'namtheun-hydro',text:'ナムトゥン2：設備1,070MW（2019年公表資料）。発電実績ではない。'},
 {id:'jurong-petro',text:'ジュロン島：企業100社超（JTC、2026年閲覧）。ペンゲランを含む地域合計ではない。'},
 {id:'johor-food',text:'ジョホール州：精製所の粗油投入量4,198,241t（約420万t、2025年・州計）。単独工場の実生産量ではない。',source:'palmProcessing'},
 {id:'singapore-port',text:'シンガポール港：コンテナ取扱量4,466万TEU（2025年）。TEUは20フィートコンテナ換算取扱単位。',source:'port'},
 {id:'port-klang',text:'クラン港：コンテナ取扱量1,514万TEU（2025年）。地域の物品生産量ではない。',source:'malaysiaPorts'},
].flatMap(note=>{const site=southeastIndustrySites.find(s=>s.id===note.id)!;const source=note.source?southeastIndustrySources[note.source]:{label:site.sourceLabel,url:site.sourceUrl};return southeastSiteSectors(site).map(sector=>({...note,kind:site.kind,sector,source}));});

