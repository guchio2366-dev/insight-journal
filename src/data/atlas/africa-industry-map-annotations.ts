import type {AfricaIndustrySector} from './africa-industry-sectors.ts';

/** A few sourced guide positions on each sector overview, not another product picker. */
export type AfricaIndustryMapAnnotation={sector:AfricaIndustrySector;siteId:string;relatedSiteIds?:readonly string[];label:string};
export const africaIndustryMapAnnotations:readonly AfricaIndustryMapAnnotation[]=[
 {sector:'resources',siteId:'niger-delta-oil',label:'原油 · ナイジャーデルタ'},
 {sector:'resources',siteId:'hassi-rmel-gas',label:'ガス · ハッシ・ルメル'},
 {sector:'resources',siteId:'arlit-uranium',label:'ウラン · アルリット'},
 {sector:'resources',siteId:'boke-bauxite',label:'ボーキサイト · ボケ'},
 {sector:'resources',siteId:'drc-copper-cobalt',relatedSiteIds:['drc-cobalt'],label:'銅・コバルト · コンゴ南部'},
 {sector:'resources',siteId:'bushveld-pgm-chromium',relatedSiteIds:['bushveld-chromium'],label:'白金族・クロム · ブッシュフェルト'},
 {sector:'resources',siteId:'mpumalanga-coal',label:'石炭 · ムプマランガ'},
 {sector:'resources',siteId:'jwaneng-diamonds',label:'ダイヤ · ジュワネン'},
 {sector:'resources',siteId:'olkaria-power',label:'地熱 · オルカリア'},
 {sector:'resources',siteId:'jorf-phosphate-processing',label:'リン加工 · エル・ジャディーダ周辺'},
 {sector:'manufacturing',siteId:'tangier-auto',label:'自動車 · タンジェ'},
 {sector:'manufacturing',siteId:'casablanca-industry',label:'航空機 · カサブランカ'},
 {sector:'manufacturing',siteId:'jorf-phosphate-fertilizer',label:'肥料 · エル・ジャディーダ周辺'},
 {sector:'manufacturing',siteId:'lekki-refining',relatedSiteIds:['lekki-fertilizer'],label:'精製・肥料 · ラゴス東部'},
 {sector:'manufacturing',siteId:'bonny-lng',label:'液化ガス · ボニー島'},
 {sector:'manufacturing',siteId:'suez-steel',relatedSiteIds:['suez-cement'],label:'鉄鋼・セメント · スエズ'},
 {sector:'manufacturing',siteId:'hawassa-apparel',label:'衣料 · ハワサ'},
 {sector:'manufacturing',siteId:'tema-food',label:'食品加工 · テマ'},
 {sector:'services',siteId:'tangermed-logistics',label:'港湾 · タンジェ・メッド'},
 {sector:'services',siteId:'abidjan-finance',label:'金融 · アビジャン'},
 {sector:'services',siteId:'nairobi-payments',relatedSiteIds:['nairobi-digital'],label:'決済・研究 · ナイロビ'},
 {sector:'services',siteId:'johannesburg-services',label:'企業 · ヨハネスブルク'},
 {sector:'services',siteId:'marrakesh-tourism',label:'観光 · マラケシュ'},
 {sector:'services',siteId:'luxor-tourism',label:'観光 · ルクソール'}
];
