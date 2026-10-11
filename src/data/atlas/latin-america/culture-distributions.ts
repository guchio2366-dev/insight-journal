/** Published national religion survey; percentages are not normalised. */
export interface CultureSource {
 id:string; title:string; url:string; period:string; terms:string; termsUrl:string;
 evidence:string; restriction:string;
}
export const pewReligionSource:CultureSource={
 id:'pew-2014',title:'Pew Research Center, Religion in Latin America (2014), p.14 / QCURREL',
 url:'https://www.pewresearch.org/wp-content/uploads/sites/20/2014/11/Religion-in-Latin-America-11-12-PM-full-PDF.pdf#page=15',
 period:'2013–14年調査、2014年11月13日公表',
 terms:'Pew Research Center利用条件 §1–2。CCライセンスではありません。',
 termsUrl:'https://www.pewresearch.org/about/terms-and-conditions/',
 evidence:'18歳以上の全国面接調査。施設入居者等と一部到達困難地域は対象外。宗教の自己申告による回答割合。',
 restriction:'原図・本文の転載ではなく、原表の公表集計値を独自地図・地図下の原表へ表示。100%へ正規化しない。現在の宗教構成や国内の居住域を表さない。'
};
export const pewTranslationNotice='Pew Research Center has published the original content in English but has not reviewed or approved this translation.';
export const religionSurvey=[
 ['PRY',89,7,1,2],['COL',79,13,6,2],['ECU',79,13,5,3],['BOL',77,16,4,3],
 ['PER',76,17,4,3],['VEN',73,17,7,4],['ARG',71,15,11,3],['PAN',70,19,7,4],
 ['CHL',64,17,16,3],['CRI',62,25,9,4],['BRA',61,26,8,5],['DOM',57,23,18,2],
 ['PRI',56,33,8,2],['SLV',50,36,12,3],['GTM',50,41,6,3],['NIC',50,40,7,4],
 ['HND',46,41,10,2],['URY',42,15,37,6]
].map(([code,catholic,protestant,unaffiliated,other])=>({code:String(code),values:[Number(catholic),Number(protestant),Number(unaffiliated),Number(other)]}));
