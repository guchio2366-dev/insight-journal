import type {AfricaSectorIndustry,IndustrySource} from './africa-industry-sectors.ts';
import {africaIndustrySources as S} from './africa-industry-research.ts';
const ref=(label:string,url:string):IndustrySource=>({label,url});
const usgs=(label:string,url:string)=>[ref(`米国地質調査所・${label} 2024`,url)];
const resource=(id:string,label:string,color:string,reading:string,reason:string,sources:IndustrySource[]):AfricaSectorIndustry=>({id,sector:'resources',label,color,reading,reason,sources});
const manufacturing=(id:string,label:string,color:string,reading:string,reason:string,sources:IndustrySource[]):AfricaSectorIndustry=>({id,sector:'manufacturing',label,color,reading,reason,sources});
const service=(id:string,label:string,color:string,reading:string,reason:string,sources:IndustrySource[]):AfricaSectorIndustry=>({id,sector:'services',label,color,reading,reason,sources});
export const africaIndustryExpanded:readonly AfricaSectorIndustry[]=[
 resource('copper','銅','#ad7653','コンゴ民主共和国南部からザンビア北部の銅帯で鉱石を採り、カンサンシなどで製錬します。地質と鉄道・電力が生産、港への輸送を左右します。','コンゴ民主共和国は2024年の鉱山銅世界約13%、同国輸出の79.3%を銅が占めます。コバルトは別の市場・工程として採ります。',usgs('コンゴ民主共和国',S.drc)),
 resource('cobalt','コバルト','#588e8c','コンゴ民主共和国南部の銅帯では銅に伴うコバルトを回収します。鉱山の集中と電池化学品への加工立地は分けて読みます。','2024年のコンゴ民主共和国の鉱山産出シェア約75%。調達集中が電池の組成変更や在庫に影響します。',usgs('コンゴ民主共和国',S.drc)),
 resource('bauxite','ボーキサイト','#bb874e','ギニア西部ボケの鉱区からボーキサイトを採り、鉄道・港を通して輸送します。アルミナ精製とアルミ製錬は別工程です。','2024年ギニアの世界生産約33.2%（米国を除く）。鉄鉱石とは鉱床・製品・買い手が異なります。',usgs('ギニア',S.guinea)),
 resource('iron-ore','鉄鉱石','#a26d54','南アフリカ北ケープのシシェン、コロメラから鉄鉱石を採り、鉄道で積出し港へ運びます。ギニアのシマンドゥは2025年初出荷後の増産段階です。','2024年南アフリカの世界シェアは鉄含有量で約3%。粗鋼生産と区別します。',usgs('南アフリカ',S.southAfrica)),
 resource('pgm','白金族','#8271a8','南アフリカのブッシュフェルト岩体とジンバブエのグレート・ダイクに白金族鉱床が重なります。自動車排ガス触媒の需要につながります。','南アフリカは2024年に白金単独で世界約70%。白金・パラジウム・白金族の分母は混ぜません。',usgs('南アフリカ',S.southAfrica)),
 resource('chromium','クロム','#6b86a5','南アフリカのブッシュフェルト岩体ではクロム鉱を採り、フェロクロム加工には電力と鉄道・港湾が必要です。','南アフリカの2024年クロム鉱生産は世界約46%。白金族と地質が重なっても製品工程は異なります。',usgs('南アフリカ',S.southAfrica)),
 resource('tantalum','タンタル','#817aa7','ルワンダ西部などの地区でタンタルを含むコルタンを採掘します。電子部品の材料ですが、採掘地区と製錬国は別です。','ルワンダは2024年世界生産約15%、世界3位。地区名は確認できる一方、個別鉱山の位置・産出量は未取得です。',usgs('ルワンダ',S.rwanda)),
 resource('tin','スズ','#718ba4','コンゴ民主共和国東部のビシエで錫石を採掘します。鉱石を錫金属にはんだ向けに加工する工程は別にあります。','コンゴ民主共和国は2024年の錫鉱山生産約9%、世界5位。タンタルとは用途も市場も異なります。',usgs('コンゴ民主共和国',S.drc)),
 resource('phosphate','リン鉱石','#9e9a52','モロッコのリン鉱石は内陸で採掘し、大西洋岸ジョルフ・ラスファルの肥料設備へつながります。硫黄・アンモニアの輸入が加工を支えます。','モロッコは2024年リン鉱石生産約35.3百万t、世界約15%。肥料製品総重量やリン酸P₂O₅換算とは分けます。',usgs('モロッコ',S.morocco)),
 manufacturing('steel','鉄鋼','#626f8c','エジプトのアレクサンドリアとスエズでは港湾・天然ガスと鉄鉱原料を使い、直接還元鉄から粗鋼・鋼材を作ります。','エジプト2024年粗鋼10.7百万t。アレクサンドリア工場の能力3.2百万t／年と国の実生産を混ぜません。',[ref('Ezz Steel・アレクサンドリア工場',S.steel),ref('米国地質調査所・エジプト2024',S.egypt)]),
 manufacturing('cement','セメント','#8a8072','エジプトのスエズからカイロ南部には石灰石・燃料・都市建設需要を結ぶセメント工場が集まります。','エジプトの2024年生産は約53百万t。休止中のトゥラ工場は操業拠点に含めません。',[ref('Heidelberg Materials Egypt・工場別操業状態',S.cement),ref('米国地質調査所・エジプト2024',S.egypt)]),
 service('tourism','観光','#8b7ca4','モロッコのマラケシュ旧市街、エジプトのルクソール遺跡、南アフリカのケープタウンに文化・自然観光の拠点があります。','国連観光機関の2025年アフリカ地域は国際宿泊客到着79.6百万人。地域定義でエジプトは中東に入るため、ルクソールの規模としては使いません。',[ref('国連観光機関・2026年9月観光バロメーター',S.tourism),ref('UNESCO・マラケシュ旧市街','https://whc.unesco.org/en/list/331/'),ref('UNESCO・古代テーベ','https://whc.unesco.org/en/list/87/')]),
 service('communications','通信・デジタル決済','#527b9e','ナイロビには認可決済事業者の本社が集まり、携帯通信・決済の利用はサハラ以南の広い地域へ及びます。','2024年サハラ以南の成人のモバイルマネー口座保有40%。事業者住所は利用地域や取引量の集中を示しません。',[ref('ケニア中央銀行・2026年8月10日認可事業者名簿','https://www.centralbank.go.ke/wp-content/uploads/2026/09/Directory-of-Authorized-Payment-Service-Providers-August-10-2026.pdf'),ref('世界銀行・金融包摂データベース（Findex）2024',S.findex),ref('GSMA・2026',S.gsma)])
];
/** Existing labels that covered unrelated products have explicit inbound URL aliases in the sector module. */
export const africaIndustryRetiredCombinedIds=['copper-cobalt','bauxite-iron','pgm-chromium','tantalum-tin'] as const;
