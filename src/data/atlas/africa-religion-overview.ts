/** African factual excerpt of Pew Research Center (2025), Appendix B, 2020 estimates.
 * Country / territory shares of all ages, not local residence polygons. Only the
 * largest group and selected substantial second groups are retained. */
export type AfricaReligionGroup='christian'|'muslim'|'hindu'|'other';
export type AfricaReligionRow={countryCode:string;primary:AfricaReligionGroup;primaryShare:number;sourcePage:number;secondary?:AfricaReligionGroup;secondaryShare?:number;mixed:boolean};
const raw:readonly (readonly [string,AfricaReligionGroup,number,number,AfricaReligionGroup?,number?])[]=[
 ['DZA','muslim',98.4,2],['AGO','christian',93,2],['BEN','christian',53.2,3,'muslim',31.4],['BWA','christian',82.3,3],
 ['BFA','muslim',67.4,4,'christian',28],['BDI','christian',95,4],['CMR','christian',69.8,4,'muslim',25.2],['CPV','christian',78.3,4],['CAF','christian',90.7,4],
 ['TCD','muslim',56.4,5,'christian',38.9],['COM','muslim',98.3,5],['COD','christian',96.3,6],['DJI','muslim',97.7,6],['EGY','muslim',95.2,6],['GNQ','christian',88.7,6],
 ['ERI','muslim',51.7,7,'christian',46.7],['SWZ','christian',93.2,7],['ETH','christian',61.6,7,'muslim',36.2],
 ['GAB','christian',83.7,8],['GMB','muslim',97,8],['GHA','christian',71.3,8],['GIN','muslim',86.8,9],['GNB','muslim',56,9],
 ['CIV','muslim',46.3,10,'christian',44.9],['KEN','christian',85.7,11],['LSO','christian',97.3,11],['LBR','christian',85.2,11],
 ['LBY','muslim',99,12],['MDG','christian',74.2,12],['MWI','christian',87.4,12],['MLI','muslim',94.1,12],
 ['MRT','muslim',99.2,13],['MUS','hindu',48.3,13,'christian',32.9],['MAR','muslim',99.7,13],['MOZ','christian',61.3,13],
 ['NAM','christian',90.5,14],['NER','muslim',98.1,14],['NGA','muslim',56.1,14,'christian',43.4],
 ['COG','christian',92.2,16],['RWA','christian',97,16],['STP','christian',84.4,17],['SEN','muslim',97.6,17],['SYC','christian',94,17],['SLE','muslim',80.1,17],
 ['SOM','muslim',99.8,18],['ZAF','christian',85.3,18],['SSD','christian',60.5,18,'other',32.8],['SDN','muslim',98.9,18],
 ['TZA','christian',64.7,19,'muslim',29.9],['TGO','christian',56.9,19],['TUN','muslim',99.3,20],['UGA','christian',87.7,20],
 ['ESH','muslim',99.6,21],['ZMB','christian',98.3,21],['ZWE','christian',87.2,21]
];
export const africaReligionRows:readonly AfricaReligionRow[]=raw.map(([countryCode,primary,primaryShare,sourcePage,secondary,secondaryShare])=>({countryCode,primary,primaryShare,sourcePage,...(secondary?{secondary,secondaryShare}:{}),mixed:primaryShare<50||(secondaryShare??0)>=25}));
export const africaReligionGroups=[{id:'christian',label:'キリスト教',color:'#537ba4'},{id:'muslim',label:'イスラム教',color:'#529375'},{id:'hindu',label:'ヒンドゥー教',color:'#c18850'},{id:'other',label:'その他の宗教',color:'#9671a0'}] as const;
export const africaReligionOverview={
 title:'北部のイスラム教、南部のキリスト教と両者の混在',
 reading:'北アフリカと西部サヘルではイスラム教が最大の帰属集団です。中部から南部ではキリスト教が最大の国が多く、ナイジェリア、チャド、エリトリア、エチオピアなどでは両者が大きな割合を占めます。モーリシャスではヒンドゥー教が最大ですが過半数ではありません。',
 legend:'2020年・国別最大集団。混在印は第2集団25%以上、または最大集団50%未満。国境は信仰の居住境界ではありません。',
 history:'イスラム教の交易による広がりや、エチオピアの中世以前から続くキリスト教は、近代の植民統治に先立ちます。植民地期とその後には宣教、教育、移住、アフリカ自身の宗教活動がキリスト教の拡大に関わりました。在来の信仰や実践は、現在の帰属区分と重なる場合があります。',
 scope:'Pewの全世代・国別推計。7分類のうち最大集団と一部の大きな第2集団を抜粋。「その他」は在来宗教だけを指しません。地域内の居住分布、宗派、個人の信仰実践は示しません。',
 source:{label:'Pew Research Center・宗教構成2020（2025公表、付録B）',url:'https://www.pewresearch.org/wp-content/uploads/sites/20/2025/06/PR_2025.06.09_global-religious-change_appendix-b.pdf'},
 sources:[{label:'Pew・サハラ以南の宗教の歴史と実践（2010）',url:'https://www.pewresearch.org/religion/2010/04/15/executive-summary-islam-and-christianity-in-sub-saharan-africa/'},{label:'UNESCO・ラリベラの中世教会群',url:'https://whc.unesco.org/en/list/18/'},{label:'UNESCO・トンブクトゥの交易とイスラム教',url:'https://whc.unesco.org/en/list/119/'}],
 terms:'https://www.pewresearch.org/about/terms-and-conditions/',
 attribution:'© 2025 Pew Research Center. African excerpt and classification by Insight Journal.',
 disclaimer:'Pew Research Center bears no responsibility for the analyses or interpretations of the data presented here. The opinions expressed herein, including any implications for policy, are those of the author and not of Pew Research Center.',
 translationDisclaimer:'Pew Research Center has published the original content in English but has not reviewed or approved this translation.'
} as const;
