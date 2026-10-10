/** Transcribed official aggregate tables, not inferred residential territories.
 * Chile extraction/Japanese labels: Insight Journal, CC BY-SA 4.0.
 * Panama's two indicators retain separate questions, CC BY 4.0.
 */
export const chileCultureLicense={name:'CC BY-SA 4.0',url:'https://www.ine.gob.cl/terminos-de-uso-y-licencia-de-datos-abiertos'};
export const chileIdentitySource='https://censo2024.ine.gob.cl/wp-content/uploads/2025/06/PRESENTACION-NACIONAL_4_CPV2024.pdf';
export const chileReligionSource='https://censo2024.ine.gob.cl/wp-content/uploads/2025/08/Presentacion-resultados-religion-o-credos_CPV2024.pdf';
export const panamaIdentitySource='https://www.inec.gob.pa/archivos/P053342420231009161532Comentarios_Poblacion%20RFB%202023%20VF.pdf';
export const panamaIdentityLicense='https://www.inec.gob.pa/publicaciones/Default3.aspx?ID_CATEGORIA=19&ID_PUBLICACION=1199&ID_SUBCATEGORIA=7';
export const latinCultureGroups={ethnicity:[{id:'indigenous',name:'先住民への帰属',color:'#287b66'},{id:'afro',name:'アフリカ系自己認識',color:'#ab526b'}],religion:[{id:'catholic',name:'カトリック',color:'#4d76a2'},{id:'protestant',name:'福音派・プロテスタント',color:'#bc7332'},{id:'none',name:'宗教・信条なし',color:'#786b99'}]};
export type LatinCultureSection='ethnicity'|'religion';
export const latinCultureRegions=[
 {id:'arica',name:'アリカ・パリナコタ州',coordinate:[-70.31,-18.48],identity:[87816,13003],religion:[110281,25611,47049]},
 {id:'coquimbo',name:'コキンボ州',coordinate:[-71.25,-29.90],identity:[92753,6394],religion:[431690,57108,158800]},
 {id:'santiago',name:'サンティアゴ首都州',coordinate:[-70.67,-33.45],identity:[545700,78772],religion:[3179228,810170,1821629]},
 {id:'biobio',name:'ビオビオ州',coordinate:[-73.05,-36.83],identity:[150917,9060],religion:[543629,445672,294088]},
 {id:'araucania',name:'アラウカニア州',coordinate:[-72.60,-38.74],identity:[347285,8034],religion:[391904,227056,176920]},
 {id:'los-lagos',name:'ロスラゴス州',coordinate:[-72.94,-41.47],identity:[236886,7967],religion:[433207,126691,152314]},
];
export const latinCultureNational={
 ethnicity:[{country:'CHL',name:'チリ',year:2024,values:[2105863,174190],percentages:[11.5,.9],denominator:'設問28・29にそれぞれ回答した通常居住者（全年齢）。未回答を各設問の分母から除く。二つは別設問。',source:chileIdentitySource,license:chileCultureLicense.name,licenseUrl:chileCultureLicense.url},
 {country:'PAN',name:'パナマ',year:2023,values:[698114,1286857],percentages:[17.2,31.7],denominator:'最終通常居住者4,064,780人（全年齢）。先住民帰属とアフリカ系自己認識は別設問の肯定回答。',source:panamaIdentitySource,license:'CC BY 4.0',licenseUrl:panamaIdentityLicense}],
 religion:[{country:'CHL',name:'チリ',year:2024,values:[8168978,2466607,3903308],percentages:[54,16.3,25.8],denominator:'宗教・信条設問31に回答した15歳以上の通常居住者。掲載3分類以外の回答もあるため合計100%にしない。',source:chileReligionSource,license:chileCultureLicense.name,licenseUrl:chileCultureLicense.url}],
};
export const latinCultureOverview={
 ethnicity:{title:'帰属と自己認識の地域差',overview:'チリでは先住民への帰属申告が北部と南部に目立ち、人数はサンティアゴ首都州にも多くあります。パナマの全国2指標は別設問で、民族の排他的な構成比ではありません。',explanation:'チリ2024年の州別計数は、先住民への帰属と、先祖・伝統・文化に基づくアフリカ系自己認識を別々に集計しています。言語、国籍や外見の分類に置き換えられず、二つの回答を合計して残りの民族を作ることもできません。'},
 religion:{title:'チリの宗教・信条の地域差',overview:'チリ2024年ではカトリックが54.0%、福音派・プロテスタントが16.3%、宗教・信条なしが25.8%です。福音派・プロテスタントの割合はビオビオ州33.6%、アラウカニア州27.6%で、全国16.3%より高くなります。',explanation:'これは15歳以上の通常居住者への信条の回答です。州単位の統計なので、記号の位置にその宗教だけの居住域があるとは解釈できません。人数と割合は別の量で、州の人口規模も人数の差に影響します。'},
};
export const latinCultureCoverage='収録：チリ2024年の全国・代表6州、民族関連はパナマ2023年の全国2指標も収録。ブラジル・ペルー・コロンビア・グアテマラ等は原表の取得または再利用条件が未確認で未収録。中南米全域の整備完了を意味しません。';
