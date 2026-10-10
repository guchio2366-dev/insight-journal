import products from '../latin-america-products.json';
import manifest from '../../../../public/assets/atlas/latin-reading-products-v1/manifest.json';
import {latinEconomyTopics} from '../latin-america-economy';
import {latinAgricultureReading} from './agriculture-reading';
export const latinReadingProducts=manifest.ids.map(id=>products.find(p=>p.id===id)!);
const topics:Record<string,string>={maiz:'brazil-second-maize',sugc:'brazil-sugar',whea:'pampas-farming',temf:'chile-fruit',pota:'andean-farming'};
const additionalReadings={
 rice:{title:'稲作と水の管理',takeaway:'2020年の収穫面積推計ではブラジル・コロンビア・ペルーに大きな産地があり、水をどう確保して排水するかが稲作の条件を左右する。',compare:'気候と産地を読む',steps:[['概説：南米の稲作地域','既存の2020年推計を国別に合計すると、ブラジル166万ha、コロンビア56万ha、ペルー41万ha。地図の輪郭は、これらの国の中で稲作が推計された場所を示す。'],['解説：水田にも異なる水の条件がある','稲作には灌漑された水田だけでなく、雨に頼る低地や陸稲など複数の方式がある。降雨の季節性、灌漑、排水の組み合わせが栽培を支えるため、着色域のすべてを同じ方式の水田とは読まない。']],examples:[],sources:[{label:'IFPRI MapSPAM2020 v2r2：収穫面積推計',url:'https://cgiar-climate-data-hub.github.io/catalog/spam2020/',period:'2020年、CC BY-SA 4.0。国別合計は既存格子から集計。'},{label:'FAO：稲作における水の生産性と管理',url:'https://www.fao.org/4/y5682e/y5682e09.htm',period:'2004年の基礎資料。栽培方式と水管理の背景。'}]},
 cott:{title:'ブラジルの綿花と畑作の輪作',takeaway:'2020年の収穫面積推計ではブラジルが約154万ha、アルゼンチンが約38万ha。ブラジルの産地では、大豆・トウモロコシとの輪作に綿花が組み込まれる。',compare:'気候と産地を読む',steps:[['概説：綿花は繊維の原料作物','綿花は亜熱帯や季節的に乾燥する熱帯で育てられ、収穫後の原綿は繊維製品の原料になる。農業の分布と繊維産業の立地は、加工と交易を通じてつながる。'],['解説：自然条件と畑作の組み合わせ','OECD・FAOの2022年報告では、ブラジルの綿花はマトグロッソ州などで大豆・トウモロコシとの輪作や二毛作の一部をなす。栽培技術と生育条件が産地を支える。地図は2020年の推計収穫面積であり、報告の将来予測は数値に混ぜていない。']],examples:[],sources:[{label:'IFPRI MapSPAM2020 v2r2：収穫面積推計',url:'https://cgiar-climate-data-hub.github.io/catalog/spam2020/',period:'2020年、CC BY-SA 4.0。国別合計は既存格子から集計。'},{label:'OECD・FAO Agricultural Outlook 2022–2031：Cotton',url:'https://www.oecd.org/en/publications/2022/06/oecd-fao-agricultural-outlook-2022-2031_e00c413c/full-report/component-13.html',period:'2022年。生育条件・輪作・繊維とのつながりの背景のみ。'}]},
};
export function latinProductReading(id:string){
 const existing=latinAgricultureReading[id as keyof typeof latinAgricultureReading];if(existing)return existing;
 const additional=additionalReadings[id as keyof typeof additionalReadings];if(additional)return additional;
 const product=latinReadingProducts.find(p=>p.id===id)!,topic=latinEconomyTopics.find(t=>t.id===topics[id]);
 if(topic)return {title:topic.title,takeaway:topic.summary,compare:'気候と産地を読む',steps:topic.sections.map(s=>[s.title,s.body]),examples:[],sources:topic.sources.map(s=>({...s,period:s.period??'地域資料'}))};
 return {title:`${product.name}の収穫面積分布`,takeaway:`2020年の推計格子が示す${product.name}の産地です。着色は他の採用品目との表示スコアで決まり、この品目の全分布は選択した輪郭で確認できます。`,compare:'気候と産地を読む',steps:[['概説：分布の範囲','輪郭は1ha/格子以上の推計収穫面積があるセルを含みます。国境内が均一な産地という意味ではありません。'],['解説：収穫面積の意味','年間の収穫面積は複数回収穫を含む場合があり、耕地の実面積・生産量・輸出額とは別の量です。地図の広さだけで農業の経済的な重要性を判断しません。']],examples:[],sources:[{label:'IFPRI MapSPAM2020 v2r2：収穫面積推計・定義',url:'https://cgiar-climate-data-hub.github.io/catalog/spam2020/',period:'2020年、CC BY-SA 4.0'}]};
}
