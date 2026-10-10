/** Independently authored schematic belts, NOT a crop grid or measured acreage.
 * Locality coordinates and display radii are rounded editorial approximations.
 * Source facts establish named production areas; widths do not estimate coverage.
 * No source map, table, photograph or production quantity is reproduced.
 */
export type BeverageSource={id:string;label:string;url:string;period:string;locator:string;reuse:string};
const gain=(file:string)=>'https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName='+encodeURIComponent(file);
export const africaBeverageSources:BeverageSource[]=[
 {id:'eth',label:'USDA FAS：エチオピア Coffee Annual',url:gain('Coffee Annual_Addis Ababa_Ethiopia_ET2025-0014'),period:'2025',locator:'PDF p.4：Oromia、Sidama、South West、South Ethiopia の高地',reuse:'米国政府の本文の事実を参照。第三者図版は転載しない。'},
 {id:'uga',label:'USDA FAS：ウガンダ Coffee Annual',url:gain('Coffee Annual_Nairobi_Uganda_UG2025-0001'),period:'2025',locator:'PDF p.3：Mukono/Luwero、Elgon、Kasese/Bushenyi/Bundibugyo',reuse:'米国政府の本文の事実を参照。第三者図版は転載しない。'},
 {id:'tza-coffee',label:'USDA FAS：タンザニア Coffee Annual',url:gain('Coffee Annual_Dar Es Salaam_Tanzania_TZ2025-0004.pdf'),period:'2025',locator:'PDF p.2：Kilimanjaro/Arusha/Tanga、Iringa/Mbeya/Njombe/Mbinga、Kagera',reuse:'米国政府の本文の事実を参照。第三者図版は転載しない。'},
 {id:'ken-coffee',label:'USDA FAS：ケニア Coffee Annual',url:gain('Coffee Annual_Nairobi_Kenya_KE2025-0011.pdf'),period:'2025',locator:'PDF pp.2–4：Central/Eastern/Rift Valley、Nairobi/Thika/Kiambu/Nyeri',reuse:'米国政府の本文の事実を参照。第三者図版は転載しない。'},
 {id:'ken-tea',label:'USDA FAS：ケニアの茶産業',url:gain("Brewing Trends - Analysis of Kenya's Tea Industry_Nairobi_Kenya_KE2025-0020.pdf"),period:'2025',locator:'PDF pp.1–2：Kericho/Kisii/Nandi、Mount Kenya/Aberdare/Nyambene',reuse:'米国政府の本文の事実を参照。第三者図版は転載しない。'},
 {id:'rwa-tea',label:'NAEB：ルワンダの茶産地',url:'https://www.naeb.gov.rw/rwanda-tea/about-rwanda-tea',period:'年記載なし（閲覧2026-10-10）',locator:'Northern、Western、Southern provinces；高地の茶栽培',reuse:'産地の事実のみ参照し、本文・図版は転載しない。'},
 {id:'mwi-tea',label:'FAO MAFAP：マラウイの茶',url:'https://www.fao.org/fileadmin/templates/mafap/documents/technical_notes/MALAWI/2005-2013/Malawi_TN_tea_web_review.pdf',period:'2005–2013（刊行2015）',locator:'PDF pp.10–11：Mulanje/Thyolo、Nkhata Bay/Kawaladzi',reuse:'© FAO 2015。産地の事実から独自に概略帯を作成。原図・本文の翻案や転載はしない。'},
 {id:'tza-tea',label:'World Bank / IFC：タンザニア農業診断',url:'https://documents1.worldbank.org/curated/en/291131490093290550/pdf/113628-WP-GAFSP-IFC-Agribusiness-Tanzania-PUBLIC.pdf',period:'2016',locator:'PDF p.61：Mufindi/Njombe/Rungwe、Lushoto/Korogwe/Muheza、Bukoba/Muleba',reuse:'産地の事実のみ参照。原図・表は転載しない。'},
 {id:'rwa-coffee',label:'CIRAD：キブ湖岸のルワンダコーヒー',url:'https://www.cirad.fr/en/cirad-news/news/2023/gi-for-rwandan-coffee',period:'2023',locator:'Western Rwanda、Lake Kivu shore の既存産地',reuse:'産地の事実のみ参照。本文・図版は転載しない。'},
 {id:'ico',label:'ICO：コートジボワール・ブルンジの産地調査',url:'https://icocoffee.org/documents/cy2012-13/pj-55e-projects-concluded.pdf',period:'2013（調査2005–2008）',locator:'PDF pp.3–4：Abengourou/Aboisso/Divo/Man/Soubré；p.9：Bweru/Buyenzi/Kirimiro/Mumirwa',reuse:'産地の事実のみ参照。原図・表は転載しない。'},
 {id:'cmr',label:'ICO / NCCB：カメルーン Coffee Profile',url:'https://www.ico.org/documents/cy2016-17/icc-120-5e-profile-cameroon.pdf',period:'2017（分布資料2014–2016）',locator:'PDF pp.12–14：West/North-West 高地、Mungo、South-West、Centre/East/South',reuse:'産地の事実のみ参照。原図・表は転載しない。'},
 {id:'uga-tea',label:'Muziraほか：ウガンダの茶産地',url:'https://www.scirp.org/pdf/oalibj_2023041815343423.pdf',period:'2023',locator:'PDF p.2：Kabarole/Kibaale/Bushenyi/Kanungu、Mukono/Mityana/Wakiso',reuse:'CC BY 4.0。著者・年・原典を明示し、産地記述から独自の概略帯を作成。'},
 {id:'mdg',label:'FAO：マダガスカル東岸のコーヒー',url:'https://www.fao.org/4/x7379e/x7379e00.htm',period:'2000（歴史的産地の背景）',locator:'Coffee節：East Coast。現在の面積・順位を示す根拠にはしない。',reuse:'産地の事実のみ参照。本文・図版・表は転載しない。'},
];
export type BeverageBelt={id:string;product:'coffee'|'tea';country:string;source:string;places:string;line:[number,number][];radius:number};
export const africaBeverageBelts:BeverageBelt[]=[
 {id:'eth-highlands',product:'coffee',country:'ETH',source:'eth',places:'南西部からSidamaの高地',line:[[35.6,8.4],[36.5,7.6],[37.4,6.8],[38.4,6.7]],radius:.65},
 {id:'uga-central',product:'coffee',country:'UGA',source:'uga',places:'Luwero・Mukono',line:[[32.5,.9],[32.8,.4]],radius:.35},
 {id:'uga-elgon',product:'coffee',country:'UGA',source:'uga',places:'Mbale・Kapchorwa／Elgon',line:[[34.2,1.1],[34.4,1.4]],radius:.35},
 {id:'uga-west',product:'coffee',country:'UGA',source:'uga',places:'Bundibugyo・Kasese・Bushenyi',line:[[30.1,.7],[30.1,.2],[30.2,-.5]],radius:.4},
 {id:'tza-north',product:'coffee',country:'TZA',source:'tza-coffee',places:'Arusha・Kilimanjaro',line:[[36.7,-3.4],[37.4,-3.3]],radius:.45},
 {id:'tza-tanga',product:'coffee',country:'TZA',source:'tza-coffee',places:'Tanga州の高地',line:[[38.1,-4.6],[38.5,-4.9]],radius:.4},
 {id:'tza-south',product:'coffee',country:'TZA',source:'tza-coffee',places:'Iringa・Mbeya・Njombe・Mbinga',line:[[35.7,-7.8],[34.8,-9.3],[33.5,-8.9]],radius:.5},
 {id:'tza-mbinga',product:'coffee',country:'TZA',source:'tza-coffee',places:'Mbinga',line:[[34.8,-10.8],[35.1,-11]],radius:.45},
 {id:'tza-kagera',product:'coffee',country:'TZA',source:'tza-coffee',places:'Kagera',line:[[31.5,-1.4],[31.3,-2.1]],radius:.4},
 {id:'ken-central',product:'coffee',country:'KEN',source:'ken-coffee',places:'Kiambu・Thika・Nyeri／中央高地',line:[[36.8,-1.2],[37.1,-.8],[37,-.4]],radius:.4},
 {id:'rwa-kivu',product:'coffee',country:'RWA',source:'rwa-coffee',places:'キブ湖東岸のルワンダ側',line:[[29.4,-1.6],[29.4,-2.3]],radius:.25},
 {id:'bdi-highlands',product:'coffee',country:'BDI',source:'ico',places:'Buyenzi・Bweru・Kirimiro・Mumirwa',line:[[29.8,-2.9],[30.2,-3],[29.8,-3.5],[29.5,-3.6]],radius:.3},
 {id:'civ-west',product:'coffee',country:'CIV',source:'ico',places:'Man・Soubré',line:[[-7.5,7.4],[-6.6,5.8]],radius:.65},
 {id:'civ-centre',product:'coffee',country:'CIV',source:'ico',places:'Gagnoa・Divo',line:[[-5.9,6.1],[-5.4,5.8]],radius:.45},
 {id:'civ-east',product:'coffee',country:'CIV',source:'ico',places:'Abengourou・Aboisso',line:[[-3.5,6.7],[-3.2,5.5]],radius:.5},
 {id:'cmr-highlands',product:'coffee',country:'CMR',source:'cmr',places:'West・North-West高地',line:[[10.1,6],[10.4,5.5],[10.1,5.4]],radius:.5},
 {id:'cmr-mungo',product:'coffee',country:'CMR',source:'cmr',places:'Mungo・South-West',line:[[9.3,5],[9.9,4.9]],radius:.5},
 {id:'cmr-forest',product:'coffee',country:'CMR',source:'cmr',places:'Centre・East・Southの湿潤高原',line:[[11.2,4.6],[11.5,3.9],[13.2,4]],radius:.65},
 {id:'cmr-south',product:'coffee',country:'CMR',source:'cmr',places:'South',line:[[11.2,3.3],[11.2,2.9]],radius:.5},
 {id:'mdg-east',product:'coffee',country:'MDG',source:'mdg',places:'東岸（歴史資料の概略）',line:[[49.1,-18.3],[48.4,-20],[47.9,-21.5]],radius:.45},
 {id:'ken-west-tea',product:'tea',country:'KEN',source:'ken-tea',places:'Kisii・Kericho・Nandi',line:[[34.8,-.7],[35.3,-.4],[35.1,.1]],radius:.4},
 {id:'ken-east-tea',product:'tea',country:'KEN',source:'ken-tea',places:'Aberdare・Mount Kenya・Nyambene',line:[[36.8,-1],[37,-.4],[37.6,0]],radius:.35},
 {id:'uga-west-tea',product:'tea',country:'UGA',source:'uga-tea',places:'Kabarole・Kibaale・Bushenyi・Kanungu',line:[[31,.8],[30.3,.6],[30.2,-.5],[29.7,-.9]],radius:.3},
 {id:'uga-central-tea',product:'tea',country:'UGA',source:'uga-tea',places:'Mityana・Wakiso・Mukono',line:[[32.1,.4],[32.5,.5],[32.8,.4]],radius:.25},
 {id:'rwa-tea',product:'tea',country:'RWA',source:'rwa-tea',places:'北・西・南の高地',line:[[29.7,-1.5],[29.5,-2.1],[29.5,-2.5]],radius:.3},
 {id:'tza-south-tea',product:'tea',country:'TZA',source:'tza-tea',places:'Rungwe・Njombe・Mufindi',line:[[33.6,-9.1],[34.8,-9.3],[35.3,-8.6]],radius:.4},
 {id:'tza-northeast-tea',product:'tea',country:'TZA',source:'tza-tea',places:'Lushoto・Korogwe・Muheza',line:[[38.3,-4.8],[38.5,-5.2],[38.8,-5.1]],radius:.3},
 {id:'tza-northwest-tea',product:'tea',country:'TZA',source:'tza-tea',places:'Bukoba・Muleba',line:[[31.7,-1.4],[31.6,-1.8]],radius:.25},
 {id:'mwi-south-tea',product:'tea',country:'MWI',source:'mwi-tea',places:'Thyolo・Mulanje',line:[[35.1,-16.1],[35.5,-16]],radius:.45},
 {id:'mwi-north-tea',product:'tea',country:'MWI',source:'mwi-tea',places:'Nkhata Bay・Kawaladzi',line:[[34.2,-11.6],[34.2,-11.9]],radius:.25},
];
export const africaBeverageLabels={coffee:[[-6,6],[10.3,5.5],[37,7.6],[34.5,-9.3],[48.4,-20]] as [number,number][],tea:[[35.1,-.4],[29.5,-2.1],[34.7,-9],[35.3,-16]] as [number,number][]};
export const africaBeverageNote='コーヒー・茶は資料に記載された産地の概略帯。色の幅・面積は耕地面積や数量を表しません。資料年は2000–2025年、年不記載の資料も含みます。全国の生産地を網羅する図ではありません。';
export const africaBeveragePointNote='概略生産帯：地点の生産量・収穫面積は示しません。表示外も生産なしとは限りません。';
export const isAfricaBeverage=(key:string)=>/^crop-(coffee|tea)-harvested$/.test(key);
export function africaBeverageLinks(product:'coffee'|'tea') {const ids=new Set(africaBeverageBelts.filter(b=>b.product===product).map(b=>b.source));return africaBeverageSources.filter(s=>ids.has(s.id)).map(s=>({label:`${s.label}（${s.period}）`,url:s.url}));}
