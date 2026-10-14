import {eastClusters,eastIndustries} from './east-asia-industry-clusters.ts';
import {eastForestSites} from './east-asia-review-geography.ts';
import power from '../../../public/assets/atlas/east-asia-v2/power-examples.json' with {type:'json'};
import type {IndustryTopic} from './asia-industry';
import {eastAdditionalIndustries,eastAdditionalSites} from './east-asia-industry-extensions.ts';
export type EastSector='resources'|'manufacturing'|'services';
export type EastSectorIndustry={id:string;label:string;mapLabel?:string;color:string;sectors:EastSector[];lead:string;reason:string;source:string};
export type EastSectorSite={id:string;name:string;country:string;point:[number,number];industries:string[];stage:string;scope:string;source:string;sources?:string[];observedYear?:string;status?:'所在地・工程確認'|'既存工場'|'既存操業拠点'|'量産公表'|'現在の操業未確認'};
export const eastSectors:{id:EastSector;topic:string;label:string;lead:string;reason:string}[]=[
 {id:'resources',topic:'east-resources',label:'資源・エネルギー',lead:'中国の烏海・准格爾に採炭、南ゴビに石炭・銅の採掘、日韓台の沿岸にLNG受入、包頭・贛州・寧波に永久磁石の製造、秋田に亜鉛製錬副産物由来のガリウム原料があります。鉱床・受入港・精製技術の条件は異なります。',reason:'採掘は鉱床の位置に制約されます。選鉱・選炭は不要な部分を取り除き、精錬・精製は素材や燃料へ加工します。輸入原料を扱う拠点には港と設備、水・電力が必要です。発電では落差と水量、燃料調達、冷却水、送電と需要の位置が関わります。地図の鉱山と別の国の工場の近さから取引関係を推測しません。'},
 {id:'manufacturing',topic:'east-clusters',label:'製造業',lead:'台湾の新竹・台南に受託製造、高雄・中壢に半導体の組立検査、韓国・日本にメモリー、日本に装置・材料、中国に電池・太陽光製品の拠点があります。既存の工場投資と専門技術の蓄積が工程ごとに異なる集積を支えます。',reason:'原料と製品の大量輸送には港・鉄道・道路、組立と工程改良には部品・材料・装置企業と人材が重要です。食品は原料と消費市場、紙は原料・水・エネルギー、半導体は研究開発と安定した電力・高純度の水が関わります。素材・燃料の加工は資源の分野とも重複しますが、生産量を二重に加算しません。'},
 {id:'services',topic:'east-services',label:'サービス業',lead:'金融は東京・上海・香港・台北、情報技術は杭州・東京・城南・台北、物流は港、教育研究は大学の拠点例から読みます。人と情報、商取引と輸送の機能が集まる場所です。',reason:'金融には取引制度と情報・専門人材、情報技術には開発者・企業・通信、教育研究には教員・学生・研究施設が集まります。港湾物流は航路と陸上輸送の接点です。企業のオフィス、港、大学は異なる機能の事例で、点の密度や都市人口をサービス業の就業者数へ換算しません。'},
];
export const eastSectorIndustries:EastSectorIndustry[]=[
 ...eastAdditionalIndustries,
 ...eastIndustries.map(i=>({...i,sectors:['manufacturing'] as EastSector[]})),
 {id:'coal',label:'石炭',color:'#695747',sectors:['resources'],lead:'中国の内モンゴルの烏海・准格爾に採炭、モンゴル南ゴビのウハー・ホダグに原料炭の採炭・選炭拠点があります。鉱床の所在と中国の製鉄・発電需要への輸送が立地を支えます。',reason:'鉱床の所在が採掘場所を決めます。選炭は原炭を用途に合う製品へ加工する工程で、水と設備、販売先への輸送が必要です。原料炭は製鉄用コークスに使われ、発電用石炭と用途が異なります。',source:'https://www.mmc.mn/operations/ukhaa-khudag-mine/en'},
 {id:'gas',label:'天然ガス・LNG',color:'#897837',sectors:['resources'],lead:'新潟の南長岡・北海道の勇払に国産ガスの採取、日本の直江津、韓国の仁川・平沢、台湾の台中・永安にLNG受入の拠点があります。ガス田は地下資源、受入基地は海上輸送と需要への接続に立地を制約されます。',reason:'地下のガスを処理して供給規格へ整える工程と、低温で液化輸送されたガスを使える状態へ戻す工程を区別します。直江津では輸入ガスと国産ガスを組み合わせて供給すると操業者が説明しています。',source:'https://www.inpex.com/english/business/project/minami-nagaoka.html'},
 {id:'copper',label:'銅・精錬',color:'#ae713e',sectors:['resources','manufacturing'],lead:'モンゴル南部のオユ・トルゴイでは銅鉱石を採掘・選鉱し、愛媛の東予では輸入精鉱から電気銅を作ります。二拠点間の直接取引は示していません。',reason:'選鉱は鉱石中の銅を濃縮し、製錬と電解精製は高純度の金属を作ります。東予の臨海立地は精鉱の荷揚げと大量処理に適し、銅は配線・電子機器などに使われます。',source:'https://www.riotinto.com/en/operations/asia/oyu-tolgoi'},
 {id:'refining',label:'石油精製',color:'#a18d53',sectors:['resources','manufacturing'],lead:'根岸・水島・仙台の製油所を、燃料へ加工する臨海拠点の事例として示します。東アジアの製油所をすべて掲載した地図ではありません。',reason:'原油を受け入れ、蒸留・分解などによって燃料や原料に加工します。原油採掘、石油精製、石油化学製品の製造は異なる工程です。港・用地・設備と大きな需要への接続が関わります。',source:'https://www.eneos.co.jp/company/branch/'},
 {id:'power',label:'電力',color:'#437e90',sectors:['resources'],lead:'中国の三峡、日本の奥多々良木、韓国のハンビッ、台湾の台中、北朝鮮の水豊、モンゴルのウランバートル第4を、2021年公開の発電施設資料から抜粋します。',reason:'水力は水量と落差、火力は燃料と冷却水、原子力は大型設備と冷却・送電の条件に関わります。点は2021年資料の施設所在で、現在の稼働・発電量・供給先や各国の全電源構成を示しません。',source:'https://datasets.wri.org/dataset/globalpowerplantdatabase'},
 {id:'food',label:'食品・飲料',color:'#9b763b',sectors:['manufacturing'],lead:'恵庭のサッポロビール北海道工場を飲料製造の立地例として示します。札幌の博物館とは別の場所で、中国・韓国・台湾の食品工場全体を示しません。',reason:'醸造と食品加工は農産原料、水、製造設備、品質管理、配送を必要とします。原料産地に近いことと消費市場への近さは別の立地条件で、この工場の原料調達先を近隣の農地から推測しません。',source:'https://www.sapporobeer.jp/english/brewery/hokkaido/'},
 {id:'paper',label:'パルプ・紙',color:'#567c51',sectors:['manufacturing'],lead:'中国の常熟と、日本の旭川・石巻・八代に確認した製紙拠点を示します。森林の分布や木材伐採量とは別の現象です。',reason:'紙の製造は繊維原料、水、エネルギー、装置と市場への輸送が必要です。常熟は長江沿いの港近くと操業者が説明しています。森林に近いことだけで工場の原料供給圏や取引関係は決められません。',source:'https://www.upmspecialtymaterials.com/about-upm-specialty-materials/'},
 {id:'finance',label:'金融',color:'#8b6180',sectors:['services'],lead:'東京・上海・香港・台北の取引所を、証券取引を支える金融機能の拠点例として示します。銀行・保険を含む全施設分布ではありません。',reason:'取引制度、決済、企業情報と専門人材が金融機能を支えます。取引所の所在を都市全体の金融雇用や取引額と同一視しません。',source:'https://www.jpx.co.jp/english/corporate/about-jpx/access/index.html'},
 {id:'digital',label:'情報技術',color:'#596d9b',sectors:['services'],lead:'杭州のAlibaba、東京のDeNA、城南のNAVER、台北のAlibabaオフィスを情報技術サービスの事例として示します。データセンターや電子機器の工場とは区別します。',reason:'開発人材、企業の知識、通信と利用者の需要がサービスの開発・運用を支えます。本社・オフィスの所在はサービスを使う全地域やサーバー所在地ではなく、拠点の近接だけで企業間取引を導きません。',source:'https://www.alibabagroup.com/en-US/global-location'},
 {id:'logistics',label:'港湾物流',color:'#318780',sectors:['services'],lead:'上海・釜山・高雄・清水の港を、海上輸送と荷役・保管を担う拠点として示します。すべての空港・鉄道・倉庫を含む物流網ではありません。',reason:'海に面した水域と岸壁、貨物を扱う設備、背後の需要と陸上輸送への接続が必要です。釜山には積替えと物流機能、高雄には港湾管理、清水には木材チップ等の荷役が確認できます。個別拠点間の航路・物流量は描きません。',source:'https://www.busanpa.com/eng/index.bpa?menuCd=DOM_000000202001000000'},
 {id:'research',label:'教育・研究',color:'#687d45',sectors:['services'],lead:'北京の清華大学、東京大学本郷、ソウル大学冠岳、台湾大学台北のキャンパスを教育・研究機能の拠点例として示します。大学の順位や地域の研究従事者割合ではありません。',reason:'教員・学生・研究施設が知識と人材を蓄積し、企業との研究や人材の移動にも関わります。大学の近くにある工場すべてが大学と取引・共同研究をしているとは判断できません。',source:'https://www.u-tokyo.ac.jp/en/about/access.html'},
];
const guide='公式所在地・地理概説に対応する地域案内点。施設外形や数量を示しません。';
const site=(id:string,name:string,country:string,point:[number,number],industry:string,stage:string,source:string,scope=guide):EastSectorSite=>({id,name,country,point,industries:[industry],stage,source,scope});
export const eastSectorSites:EastSectorSite[]=[
 ...eastClusters.map(c=>({...c,industries:[...c.industries,...(['kumamoto','shanghai','pyeongtaek','hsinchu','tainan'].includes(c.id)?['foundry']:[]),...(c.id==='cheongju'?['memory']:[])],stage:c.id==='kumamoto'?'JASM第1工場・半導体受託製造（第2工場は計画・建設）':c.id==='cheongju'?'メモリー・電池（M15既存／M15X増設資料）':'製品・素材の製造',scope:'既存の確認済み都市・工業地域の案内点。工場の境界や生産量ではありません。'})),
 ...eastAdditionalSites,
 site('ukhaa-khudag','ウハー・ホダグ','MNG',[105.5,43.8],'coal','採炭・選炭','https://www.mmc.mn/operations/ukhaa-khudag-mine/en'),
 site('oyu-tolgoi','オユ・トルゴイ','MNG',[106.9,43.0],'copper','採掘・選鉱','https://www.riotinto.com/en/operations/asia/oyu-tolgoi'),
 site('toyo-copper','東予','JPN',[133.3,34.0],'copper','銅製錬・電解精製','https://www.smm.co.jp/en/corp_info/location/domestic/toyo/'),
 site('minami-nagaoka','南長岡','JPN',[138.8,37.4],'gas','天然ガス採取・処理','https://www.inpex.com/english/business/project/minami-nagaoka.html'),
 site('naoetsu-lng','直江津','JPN',[138.25,37.18],'gas','輸入LNG受入・気化','https://www.inpex.com/english/business/project/naoetsu.html'),
 site('yufutsu-gas','勇払','JPN',[141.7,42.6],'gas','油ガス採取・LNG供給','https://www.japex.co.jp/en/business/'),
 ...([['negishi','根岸',[139.62,35.40]],['mizushima','水島',[133.75,34.51]],['sendai-refinery','仙台港',[141.01,38.27]]] as [string,string,[number,number]][]).map(([id,name,point])=>site(id,name,'JPN',point,'refining','原油から燃料・原料へ加工','https://www.eneos.co.jp/company/branch/')),
 ...power.rows.map(p=>site('power-'+p.id,p.label,p.country,p.point as [number,number],'power',({Hydro:'水力',Nuclear:'原子力',Coal:'石炭火力'} as Record<string,string>)[p.fuel], 'https://datasets.wri.org/dataset/globalpowerplantdatabase','WRI v1.3.0（2021年）の原座標。現在の稼働状態・発電量・供給先ではありません。')),
 site('eniwa-food','恵庭','JPN',[141.6,42.9],'food','飲料製造','https://www.sapporobeer.jp/english/brewery/hokkaido/'),
 ...eastForestSites.filter(s=>s.kind==='factory').map(s=>site('paper-'+s.id,s.name,s.country,s.point,'paper','製紙',s.source,s.country==='JPN'?'公式所在地図の中心による案内点。工場敷地の外形ではありません。':s.role)),
 site('tokyo-finance','東京','JPN',[139.77,35.68],'finance','証券取引所','https://www.jpx.co.jp/english/corporate/about-jpx/access/index.html'),
 site('shanghai-finance','上海','CHN',[121.47,31.23],'finance','証券取引所','https://english.sse.com.cn/'),
 site('hongkong-finance','香港','CHN',[114.17,22.28],'finance','証券取引所','https://www.hkex.com.hk/?sc_lang=en'),
 site('taipei-finance','台北','TWN',[121.56,25.03],'finance','証券取引所','https://www.twse.com.tw/en/'),
 site('hangzhou-digital','杭州','CHN',[120.0,30.3],'digital','クラウド・商取引サービスのオフィス','https://www.alibabagroup.com/en-US/global-location'),
 site('tokyo-digital','東京・渋谷','JPN',[139.70,35.66],'digital','オンラインサービス開発・運用','https://dena.com/intl/company/overview.html'),
 site('seongnam-digital','城南','KOR',[127.1,37.36],'digital','情報サービス・開発拠点','https://www.navercorp.com/en/company/contact'),
 site('taipei-digital','台北','TWN',[121.56,25.05],'digital','情報サービスのオフィス','https://www.alibabagroup.com/en-US/global-location'),
 site('shanghai-port','上海港','CHN',[121.48722,31.221944],'logistics','港湾物流','https://www.naturalearthdata.com/downloads/10m-cultural-vectors/ports/','Natural Earth v5.1.2港湾原図ne_id 1730089389の位置。取扱量・現在の全埠頭ではありません。'),
 site('busan-port','釜山港','KOR',[129.04,35.10],'logistics','港湾・積替え物流','https://www.busanpa.com/eng/index.bpa?menuCd=DOM_000000202001000000'),
 site('kaohsiung-port','高雄港','TWN',[120.307067,22.565278],'logistics','港湾物流','https://www.twport.com.tw/en/business/PortInfo?a=512','港の機能は台湾港務公司。位置はNatural Earth v5.1.2 ne_id 1730089303の港湾原座標。'),
 site('shimizu-port','清水港','JPN',[138.509894,35.014444],'logistics','港湾・原料荷役','https://www.portofshimizu.com/overview/%E5%9F%A0%E9%A0%AD/%E5%AF%8C%E5%A3%AB%E8%A6%8B%E5%9F%A0%E9%A0%AD/','港の機能は静岡県港湾管理局。位置はNatural Earth v5.1.2 ne_id 1730087585の港湾原座標。'),
 site('tsinghua-research','北京・清華大学','CHN',[116.33,40.00],'research','大学・研究','https://www.tsinghua.edu.cn/en/Contact.htm'),
 site('hongo-research','東京・本郷','JPN',[139.76,35.71],'research','大学・研究','https://www.u-tokyo.ac.jp/en/about/access.html'),
 site('seoul-research','ソウル・冠岳','KOR',[126.95,37.46],'research','大学・研究','https://en.snu.ac.kr/'),
 site('taipei-research','台北・台湾大学','TWN',[121.54,25.02],'research','大学・研究','https://www.ntu.edu.tw/english/about/map.html'),
];
export function eastIndustrySector(topic:string|null|undefined,context?:string|null):EastSector{
 if(topic==='east-resources')return 'resources';if(topic==='east-services')return 'services';
 const item=eastSectorIndustries.find(i=>'east-'+i.id===topic);
 return item?.sectors.includes(context as EastSector)?context as EastSector:item?.sectors[0]??'manufacturing';
}
export function eastSectorRows(sector:EastSector){const ids=eastSectorIndustries.filter(i=>i.sectors.includes(sector)).map(i=>i.id);return eastSectorSites.filter(s=>s.industries.some(id=>ids.includes(id)));}
// Keep the initial topic metadata below its existing 30 KB budget. Full site
// scope, product definitions and process readings have their own records/UI.
export const eastSectorTopics:IndustryTopic[]=[...eastSectors.map(s=>({id:s.topic,title:s.label,parent:s.label,kind:'clusters' as const,unit:'出典のある立地事例',year:'資料別',source:eastSectorIndustries.find(i=>i.sectors.includes(s.id))!.source,note:'数量を示さない立地案内点。'})),...eastSectorIndustries.map(i=>({id:'east-'+i.id,title:i.label,parent:eastSectors.find(s=>s.id===i.sectors[0])!.label,kind:'clusters' as const,unit:'出典のある立地事例',year:'資料別',source:i.source,note:'数量を示さない立地案内点。'}))];
