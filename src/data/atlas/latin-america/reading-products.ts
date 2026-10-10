import products from '../latin-america-products.json';
import manifest from '../../../../public/assets/atlas/latin-reading-products-v1/manifest.json';
import {latinEconomyTopics} from '../latin-america-economy';
import {latinAgricultureReading} from './agriculture-reading';
export const latinReadingProducts=manifest.ids.map(id=>products.find(p=>p.id===id)!);
const topics:Record<string,string>={maiz:'brazil-second-maize',sugc:'brazil-sugar',whea:'pampas-farming',temf:'chile-fruit',pota:'andean-farming'};
export function latinProductReading(id:string){
 const existing=latinAgricultureReading[id as keyof typeof latinAgricultureReading];if(existing)return existing;
 const product=latinReadingProducts.find(p=>p.id===id)!,topic=latinEconomyTopics.find(t=>t.id===topics[id]);
 if(topic)return {title:topic.title,takeaway:topic.summary,compare:'気候と産地を読む',steps:topic.sections.map(s=>[s.title,s.body]),examples:[],sources:topic.sources.map(s=>({...s,period:s.period??'地域資料'}))};
 return {title:`${product.name}の収穫面積分布`,takeaway:`2020年の推計格子が示す${product.name}の産地です。着色は他の採用品目との表示スコアで決まり、この品目の全分布は選択した輪郭で確認できます。`,compare:'気候と産地を読む',steps:[['概説：分布の範囲','輪郭は1ha/格子以上の推計収穫面積があるセルを含みます。国境内が均一な産地という意味ではありません。'],['解説：収穫面積の意味','年間の収穫面積は複数回収穫を含む場合があり、耕地の実面積・生産量・輸出額とは別の量です。地図の広さだけで農業の経済的な重要性を判断しません。']],examples:[],sources:[{label:'IFPRI MapSPAM2020 v2r2：収穫面積推計・定義',url:'https://cgiar-climate-data-hub.github.io/catalog/spam2020/',period:'2020年、CC BY-SA 4.0'}]};
}
