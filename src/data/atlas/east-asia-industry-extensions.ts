import type {EastSectorIndustry,EastSectorSite} from './east-asia-industry-sectors.ts';
import {eastCoalPrimaryUrl} from './east-asia-public-sources.ts';

// City/region guide coordinates rounded for this regional atlas, not surveyed
// factory coordinates. Each named operation has its own primary location source.
export const eastAdditionalIndustries:EastSectorIndustry[]=[
 {id:'rareearths',label:'希土類・永久磁石',mapLabel:'希土類・磁石',color:'#916f36',sectors:['manufacturing'],lead:'金力永磁の贛州・包頭・寧波に永久磁石工場があり、包頭では希土類の素材加工も集積します。鉱石の産地、分離精製、磁石の製造を別の工程として読みます。',reason:'モーターや風力発電用の磁石には特定元素を分離し、性能に合わせて金属・合金・磁石へ加工する技術が必要です。鉱山の保有と高性能磁石の供給能力は同一ではなく、材料、加工技術と顧客の認定が集積を支えます。',source:'https://iren.jlmag.com.cn/upload/2026-04/177754047006398700.pdf'},
 {id:'foundry',label:'半導体・受託製造',mapLabel:'受託製造',color:'#795a9d',sectors:['manufacturing'],lead:'台湾の新竹・台南、中国の上海、韓国の平沢、日本の熊本に受託製造拠点があります。台湾の複数工場と工程技術の蓄積が先端ロジック製造の集積を支えます。',reason:'ファウンドリー（半導体受託製造）は顧客の設計をウエハー上に形成します。研究人材、安定した電力・高純度水、装置・材料と工程の蓄積が必要です。熊本第1工場と第2工場の建設計画は別に扱います。',source:'https://www.tsmc.com/english/aboutTSMC/TSMC_Fabs'},
 {id:'memory',label:'半導体・メモリー',mapLabel:'メモリー',color:'#966689',sectors:['manufacturing'],lead:'韓国の清州・利川、日本の四日市・北上、中国の無錫にメモリー製造拠点があります。記憶用途の異なるDRAMとフラッシュメモリーは、企業の工程蓄積を持つ地域に立地します。',reason:'DRAM（作業用記憶半導体）とNAND（保存用フラッシュメモリー）は製品と市場が異なります。大量生産の歩留まり、研究開発、装置・材料の改良と投資規模が競争力を支え、企業の海外工場と国内工場を分けます。',source:'https://www.kioxia.com/en-jp/about/yokkaichi.html'},
 {id:'equipment',label:'半導体製造装置',mapLabel:'半導体装置',color:'#5e6fa0',sectors:['manufacturing'],lead:'宮城の大和、山梨の韮崎、熊本の合志に東京エレクトロンの開発・製造拠点があります。装置ごとの専門技術と工程改善の蓄積が、海外の半導体工場投資に結びつきます。',reason:'エッチング、成膜、塗布・現像、洗浄は異なる工程です。精密機械と制御、部材、顧客工場での調整・保守が必要で、装置会社の本社、開発製造、販売支援のオフィスを区別します。',source:'https://www.tel.com/about/locations/'},
 {id:'materials',label:'半導体材料',mapLabel:'半導体材料',color:'#4d8b9b',sectors:['manufacturing'],lead:'長崎の大村・宮崎に半導体シリコンウエハー工場があり、日本の感光材料企業も世界の半導体製造を支えます。高純度材料と工程への適合認定が既存の技術集積を強めます。',reason:'ウエハーは回路を形成する基板、フォトレジストは光で加工の形を決める感光材料です。純度・欠陥管理と顧客工程への適合が必要で、原料が同じシリコンでも太陽光用ウエハーとは区別します。',source:'https://www.sumcosi.com/english/corporate/offices/index.html'},
 {id:'packaging',label:'半導体・組立検査',mapLabel:'組立・検査',color:'#7e5794',sectors:['manufacturing'],lead:'台湾の高雄・中壢、韓国の坡州、日本の高畠にASEの組立・検査拠点があります。台湾の後工程企業と前工程・材料企業の蓄積は関わりますが、各工程の売上は合算しません。',reason:'後工程はチップの接続・封止・検査を担います。OSAT（外部受託の組立・検査）と前工程企業の社内先端パッケージを区別し、材料・装置・人材と顧客の品質認定が立地を支えると読みます。',source:'https://ase.aseglobal.com/about-ase/manufacturing-facilities/'},
 {id:'photovoltaic',label:'太陽光セル・モジュール',mapLabel:'太陽光製造',color:'#b79327',sectors:['manufacturing'],lead:'中国の上饒・海寧に太陽光製品工場、雲南の華坪などに水力を利用する製造拠点があります。電源を使う上流のシリコン加工と東部のセル・モジュール製造は別段階です。',reason:'太陽光セルをつなぎ封止した製品がモジュールです。シリコンの結晶化・ウエハー加工は電力条件、セル・モジュールは材料・設備・市場への輸送が関わります。製造拠点と発電所の設置分布を区別します。',source:'https://www.jinkosolar.com/en/site/global'},
 {id:'soybean',label:'大豆圧搾・食用油・飼料',mapLabel:'大豆加工',color:'#9b823d',sectors:['manufacturing'],lead:'張家港・東莞にはLDCの油糧種子加工拠点が2024年資料で確認できます。輸入大豆を受け入れる沿岸の加工と、黒竜江などの国内作物産地は別の分布です。',reason:'大豆を圧搾して油と大豆粕を得ます。油は食用等、粕は飼料等に使われるため、港での輸入原料受入と畜産・食品需要への接続が重要です。近隣の大豆畑を工場の調達先と推測しません。',source:'https://www.ldc.com/wp-content/uploads/LDC_IR2024-Single-Pages_secured.pdf'},
 {id:'design',label:'半導体設計',mapLabel:'半導体設計',color:'#976baf',sectors:['services'],lead:'新竹の科学園区と台北にMediaTekの本社・設計オフィスがあります。研究者・設計者と製造受託企業への接続が集積を支え、本社をウエハー工場とは表示しません。',reason:'ファブレス（製造工場を持たない半導体企業）は製品設計と知的財産から収入を得ます。人材と設計ツール、顧客仕様の知識が重要で、製造を外部に委託する関係と実工場の所在を分けます。',source:'https://corp.mediatek.com/about/office-locations/mediatek-tw-offices'},
 {id:'minorMetals',label:'ガリウム・ゲルマニウム',mapLabel:'ガリウム等',color:'#6c8b75',sectors:['resources'],lead:'ガリウムは秋田の飯島の亜鉛製錬副産物とスクラップから高純度品へ加工されます。中国への精製集中は国別統計で確認できますが、ゲルマニウムの工場分布は未確認です。',reason:'少量でも半導体・光学用途を支える元素で、他金属の製錬副産物から回収するため母体となる工程に制約されます。高純度化と顧客認定は別の技術で、一次金属を得る国と電子材料の生産企業を区別します。',source:'https://www.dowa-electronics.co.jp/en/semiconductor/high-purity-metal.html'},
];
const guide='公式資料にある都市・地域の案内点（経緯度は地域表示用に丸める）。測量した工場座標・敷地境界・生産量ではありません。';
const site=(id:string,name:string,country:string,point:[number,number],industry:string,stage:string,source:string,observedYear='2026確認',status:EastSectorSite['status']='所在地・工程確認'):EastSectorSite=>({id,name,country,point,industries:[industry],stage,source,scope:guide,observedYear,status});
const jl='https://iren.jlmag.com.cn/upload/2026-04/177754047006398700.pdf';
const ase='https://ase.aseglobal.com/about-ase/manufacturing-facilities/';
const mediatek='https://corp.mediatek.com/about/office-locations/mediatek-tw-offices';
const sumco='https://www.sumcosi.com/english/corporate/offices/index.html';
const ldc='https://www.ldc.com/wp-content/uploads/LDC_IR2024-Single-Pages_secured.pdf';
export const eastAdditionalSites:EastSectorSite[]=[
 site('wuhai-coal','烏海','CHN',[106.82,39.67],'coal','黄白茨炭鉱・採炭',eastCoalPrimaryUrl,'2026年3月','既存操業拠点'),
 site('zhungeer-coal','准格爾鉱区','CHN',[111.24,39.86],'coal','採炭・原料供給',eastCoalPrimaryUrl,'2026年3月','既存操業拠点'),
 site('ganzhou-magnets','贛州','CHN',[114.94,25.85],'rareearths','永久磁石製造',jl,'2026年1–3月','既存工場'),
 site('baotou-magnets','包頭','CHN',[109.84,40.66],'rareearths','永久磁石製造（第3期は建設中）',jl,'2026年1–3月','既存工場'),
 site('ningbo-magnets','寧波','CHN',[121.55,29.87],'rareearths','永久磁石製造',jl,'2026年1–3月','既存工場'),
 site('yokkaichi-memory','四日市','JPN',[136.62,34.97],'memory','フラッシュメモリー製造','https://www.kioxia-holdings.com/en-jp/about/glance.html','2026年3月','既存工場'),
 site('kitakami-memory','北上','JPN',[141.11,39.29],'memory','フラッシュメモリー製造','https://www.kioxia.com/en-jp/about/kitakami.html'),
 site('icheon-memory','利川','KOR',[127.44,37.28],'memory','M16・メモリー製造','https://news.skhynix.com/en/sk-hynix-introduces-industrys-first-commercial-high-na-euv/','2025年9月','既存工場'),
 site('wuxi-memory','無錫','CHN',[120.31,31.49],'memory','SK hynix・メモリー製造','https://www.skhynix.com/company/UI-FR-CP06/'),
 site('taiwa-equipment','大和・宮城','JPN',[140.89,38.44],'equipment','エッチング装置開発・製造','https://www.tel.com/about/locations/tml.html'),
 site('nirasaki-equipment','韮崎・山梨','JPN',[138.45,35.71],'equipment','成膜・熱処理等の装置開発・製造','https://www.tel.com/about/locations/tyl.html'),
 site('koshi-equipment','合志・熊本','JPN',[130.79,32.89],'equipment','塗布・現像・洗浄等の装置開発・製造','https://www.tel.com/about/locations/tkl.html'),
 site('omura-materials','大村・長崎','JPN',[129.96,32.94],'materials','半導体シリコンウエハー製造',sumco),
 site('miyazaki-materials','宮崎','JPN',[131.42,31.91],'materials','半導体シリコンウエハー製造',sumco),
 site('kaohsiung-packaging','高雄','TWN',[120.30,22.63],'packaging','半導体組立・検査・材料',ase),
 site('chungli-packaging','中壢','TWN',[121.22,24.96],'packaging','半導体組立・検査',ase),
 site('paju-packaging','坡州','KOR',[126.78,37.76],'packaging','半導体組立・検査',ase),
 site('takahata-packaging','高畠・山形','JPN',[140.19,38.00],'packaging','半導体組立・検査',ase),
 site('shangrao-pv','上饒','CHN',[117.97,28.45],'photovoltaic','太陽光製品の製造拠点','https://www.jinkosolar.com/en/site/global'),
 site('haining-pv','海寧','CHN',[120.68,30.51],'photovoltaic','太陽光セル・モジュール製造','https://www.jinkosolar.com/en/site/newsdetail/2788','2025年11月','量産公表'),
 site('huaping-pv','華坪・雲南','CHN',[101.27,26.63],'photovoltaic','水力を利用する太陽光製造拠点','https://www.longi.com/en/special-event/longi-25th-anniversary/'),
 site('zhangjiagang-soybean','張家港','CHN',[120.55,31.88],'soybean','油糧種子加工',ldc,'2024操業資料','現在の操業未確認'),
 site('dongguan-soybean','東莞','CHN',[113.75,23.02],'soybean','油糧種子加工',ldc,'2024操業資料','現在の操業未確認'),
 site('hsinchu-design','新竹・科学園区','TWN',[121.01,24.78],'design','半導体設計企業の本社・オフィス',mediatek),
 site('taipei-design','台北・内湖','TWN',[121.56,25.07],'design','半導体設計オフィス',mediatek),
 site('akita-gallium','秋田・飯島','JPN',[140.10,39.80],'minorMetals','亜鉛製錬副産物のGa回収・高純度化の原料','https://www.dowa-electronics.co.jp/en/semiconductor/high-purity-metal.html'),
 site('incheon-lng','仁川','KOR',[126.65,37.46],'gas','輸入LNG受入・気化','https://www.kogas.or.kr/site/eng/1030603010000'),
 site('pyeongtaek-lng','平沢','KOR',[126.82,36.97],'gas','輸入LNG受入・気化','https://www.kogas.or.kr/site/eng/1030603010000'),
 site('taichung-lng','台中港','TWN',[120.51,24.28],'gas','輸入LNG受入・気化','https://www.cpc.com.tw/en/News_Content.aspx?n=2671&s=2375'),
 site('yongan-lng','永安','TWN',[120.20,22.82],'gas','輸入LNG受入・気化','https://www.cpc.com.tw/en/cp.aspx?n=2610'),
];
