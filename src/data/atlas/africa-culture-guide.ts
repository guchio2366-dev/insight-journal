import {africaEthnicityEvidence} from './africa-ethnicity-evidence.ts';
export const africaCultureGuideReason='公開利用・派生データ配信の明示許諾を確認できていないため、分布図は掲載していません。';
export const africaCultureGuideSources=[
 {label:'GeoEPR 2021・公式資料',url:'https://icr.ethz.ch/data/epr/geoepr/'},
 {label:'EPR-ED 2021・公式資料',url:'https://icr.ethz.ch/data/epr/ed/'}
] as const;
export const africaCultureGuides={
 ethnicity:{title:africaEthnicityEvidence.title,description:africaEthnicityEvidence.reading,scope:africaEthnicityEvidence.scope,source:africaEthnicityEvidence.source},
 religion:{title:'宗教の資料案内',description:'EPR-ED2021は掲載集団内の最大3つの宗教区分と相対規模を扱う資料です。地域住民や個人の信仰割合ではありません。',scope:'2021版の集団資料。2020年の局所観測ではなく、この画面に分布図はありません。',source:africaCultureGuideSources[1]}
} as const;
