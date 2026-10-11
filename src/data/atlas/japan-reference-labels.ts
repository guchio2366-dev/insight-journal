import annotations from '../../../public/assets/atlas/japan-nature-v2/annotations.json';
export const japanSurfaceAnnotations=annotations;
/** Editorial regional locators, not aquifer polygons or numeric observations. */
export const japanPlainLabels=[
 {id:'ishikari',name:'石狩平野',point:[141.6,43.25]},
 {id:'tokachi',name:'十勝平野',point:[143.2,42.85]},
 {id:'sendai',name:'仙台平野',point:[140.98,38.2]},
 {id:'niigata',name:'新潟平野',point:[139.05,37.75]},
 {id:'kanto',name:'関東平野',point:[139.6,36.05]},
 {id:'nobi',name:'濃尾平野',point:[136.72,35.25]},
 {id:'osaka',name:'大阪平野',point:[135.48,34.58]},
 {id:'kofu',name:'甲府盆地',point:[138.57,35.65]},
 {id:'kyoto',name:'京都盆地',point:[135.73,34.97]},
 {id:'chikugo',name:'筑後・佐賀平野',point:[130.45,33.2]},
] as const;
export const japanMountainLabels=[
 {id:'ou',name:'奥羽山脈',point:[140.65,39.45]},
 {id:'hida',name:'飛騨山脈（北アルプス）',point:[137.65,36.25]},
 {id:'kiso',name:'木曽山脈（中央アルプス）',point:[137.81,35.68]},
 {id:'akaishi',name:'赤石山脈（南アルプス）',point:[138.18,35.55]},
] as const;
export const japanReferenceLabelSources={
 plains:'https://www.env.go.jp/water/jiban/directory/index.html',
 mountains:'https://maps.gsi.go.jp/',
 method:'地域名は資料・地理院地図を参照した概略位置。平野・盆地・山脈の境界や帯水層の測量位置ではない。',
};
