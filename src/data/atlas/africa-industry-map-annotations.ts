import type {AfricaIndustrySector} from './africa-industry-sectors.ts';

/** A few sourced guide positions on each sector overview, not another product picker. */
export type AfricaIndustryMapAnnotation={sector:AfricaIndustrySector;siteId:string;relatedSiteIds?:readonly string[];label:string};
export const africaIndustryMapAnnotations:readonly AfricaIndustryMapAnnotation[]=[
 {sector:'resources',siteId:'niger-delta-oil',label:'ナイジャーデルタ · 原油'},
 {sector:'resources',siteId:'hassi-rmel-gas',label:'ハッシ・ルメル · ガス'},
 {sector:'resources',siteId:'arlit-uranium',label:'アルリット · ウラン'},
 {sector:'resources',siteId:'boke-bauxite',label:'ボケ · ボーキサイト'},
 {sector:'resources',siteId:'drc-copper-cobalt',relatedSiteIds:['drc-cobalt'],label:'コンゴ南部 · 銅・コバルト'},
 {sector:'resources',siteId:'bushveld-pgm-chromium',relatedSiteIds:['bushveld-chromium'],label:'ブッシュフェルト · 白金族・クロム'},
 {sector:'resources',siteId:'mpumalanga-coal',label:'ムプマランガ · 石炭'},
 {sector:'resources',siteId:'jwaneng-diamonds',label:'ジュワネン · ダイヤ'},
 {sector:'resources',siteId:'olkaria-power',label:'オルカリア · 地熱'},
 {sector:'resources',siteId:'jorf-phosphate-processing',label:'エル・ジャディーダ周辺 · リン加工'},
 {sector:'manufacturing',siteId:'tangier-auto',label:'タンジェ · 自動車'},
 {sector:'manufacturing',siteId:'casablanca-industry',label:'カサブランカ · 航空機'},
 {sector:'manufacturing',siteId:'jorf-phosphate-fertilizer',label:'エル・ジャディーダ周辺 · 肥料'},
 {sector:'manufacturing',siteId:'lekki-refining',relatedSiteIds:['lekki-fertilizer'],label:'ラゴス東部 · 精製・肥料'},
 {sector:'manufacturing',siteId:'bonny-lng',label:'ボニー島 · 液化ガス'},
 {sector:'manufacturing',siteId:'suez-steel',relatedSiteIds:['suez-cement'],label:'スエズ · 鉄鋼・セメント'},
 {sector:'manufacturing',siteId:'hawassa-apparel',label:'ハワサ · 衣料'},
 {sector:'manufacturing',siteId:'tema-food',label:'テマ · 食品加工'},
 {sector:'services',siteId:'tangermed-logistics',label:'タンジェ・メッド · 港湾'},
 {sector:'services',siteId:'abidjan-finance',label:'アビジャン · 金融'},
 {sector:'services',siteId:'nairobi-payments',relatedSiteIds:['nairobi-digital'],label:'ナイロビ · 決済・研究'},
 {sector:'services',siteId:'johannesburg-services',label:'ヨハネスブルク · 企業'},
 {sector:'services',siteId:'marrakesh-tourism',label:'マラケシュ · 観光'},
 {sector:'services',siteId:'luxor-tourism',label:'ルクソール · 観光'}
];
