/** Official census observations shown separately from GeoEPR and EPR-ED areas. */
export const southeastPhilippineEthnicity=[
 {region:'イロコス地方',group:'イロカノ',share:58.3,point:[120.7,17.4] as [number,number],mapLabel:'イロコス · イロカノ 58.3％'},
 {region:'カラバルソン地方',group:'タガログ',share:74.4,point:[121.2,14.1] as [number,number]},
 {region:'ビコール地方',group:'ビコール',share:78.8,point:[123.6,13.4] as [number,number],mapLabel:'ビコール · ビコール 78.8％'},
 {region:'西ビサヤ地方',group:'イロンゴ',share:67.6,point:[122.3,10.7] as [number,number],mapLabel:'西ビサヤ · イロンゴ 67.6％'},
 {region:'中ビサヤ地方',group:'セブアノ',share:61.4,point:[123.8,10.2] as [number,number]},
 {region:'東ビサヤ地方',group:'ワライ',share:64.2,point:[125,11.2] as [number,number]},
 {region:'バンサモロ自治地域',group:'マギンダナオ',share:26.4,point:[124.3,7.3] as [number,number],mapLabel:'バンサモロ · マギンダナオ 26.4％'},
];
export const southeastReligionCensuses=[
 {code:'VNM',name:'ベトナム',year:2019,point:[108,17] as [number,number],shares:[['カトリック',6.1,'#bb664c'],['仏教',4.8,'#b49851'],['その他の宗教または宗教なし',89.1,'#b9c4c0']] as const,scope:'全人口。残り89.1％は宗教なしだけでなく、他宗教と無回答などを含む表示上の残差です。民間信仰や儀礼への参加率とは異なります。',source:'https://vietnam.un.org/en/28931-results-population-and-housing-census-0142019'},
 {code:'PHL',name:'フィリピン',year:2020,point:[123,12] as [number,number],shares:[['ローマ・カトリック',78.8,'#bb664c'],['イスラム教',6.4,'#5d9a76'],['イグレシア・ニ・クリスト',2.6,'#7590ac'],['その他・未表示',12.2,'#b9c4c0']] as const,scope:'世帯人口。上位3区分と残差を表示。地域内の同じ割合を表しません。',source:'https://psa.gov.ph/content/religious-affiliation-philippines-2020-census-population-and-housing'},
 {code:'TLS',name:'東ティモール',year:2022,point:[125.7,-8.7] as [number,number],shares:[['カトリック',97.5,'#bb664c'],['プロテスタント・福音派',2.0,'#7590ac'],['その他・無回答',.5,'#b9c4c0']] as const,scope:'3歳以上の人口。公表値を小数第1位で表示し、残差は他宗教・宗教なし・無回答を合わせた概数です。',source:'https://timor-leste.unfpa.org/sites/default/files/pub-pdf/final-main-report_tlphc-census_2022.pdf'},
];
export const southeastPhilippineEthnicitySource='https://psa.gov.ph/content/ethnicity-philippines-2020-census-population-and-housing';
export const southeastPhilippineReligionRegions=[
 {region:'ビコール地方',religion:'ローマ・カトリック',share:93.5,point:[123.6,13.4] as [number,number],mapLabel:'ビコール · カトリック 93.5％'},
 {region:'中ビサヤ地方',religion:'ローマ・カトリック',share:90.5,point:[123.8,10.2] as [number,number],mapLabel:'中ビサヤ · カトリック 90.5％'},
 {region:'東ビサヤ地方',religion:'ローマ・カトリック',share:92.3,point:[125,11.2] as [number,number]},
 {region:'バンサモロ自治地域',religion:'ローマ・カトリック',share:5.3,point:[124.3,7.3] as [number,number],mapLabel:'バンサモロ · カトリック 5.3％'},
];
export const southeastPhilippineReligionSource='https://psa.gov.ph/content/religious-affiliation-philippines-2020-census-population-and-housing';
