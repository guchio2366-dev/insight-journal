// Pew rows are published rounded percentages and total 99–101 after rounding.
// Mongolia's census source (printed p.5, PDF p.6) reports 59.4% religious
// among people aged 15+, then religious-group shares conditional on that 59.4%.
// Mongolia's displayed group shares are converted to all people aged 15+ and
// rounded to one decimal place; 40.6% with no religion is published directly.
export const mongoliaReligionCensusBasis={
 religiousAmongAge15Plus:59.4,
 noReligionAmongAge15Plus:40.6,
 amongReligious:{buddhist:87.1,muslim:5.4,shaman:4.2,christian:2.2,other:1.1},
} as const;
export const eastAsiaReligionColors={
 buddhist:'#80649b',christian:'#b98051',muslim:'#55907a',shinto:'#b36c88',daoist:'#bb9252',
 confucian:'#7d8a4a',local:'#568d95',none:'#829396',other:'#a6a28d',combined:'#648ba8',unanswered:'#d6d3ca',shaman:'#bd785a',
} as const;

export const eastAsiaReligionCountries=[
 {code:'JPN',name:'日本',year:2023,method:'Pew成人電話調査・18歳以上',sourceKey:'pewTopline',point:[138.5,37.4] as [number,number],headline:'仏教46％ · 宗教なし42％',shares:[['buddhist','仏教',46],['christian','キリスト教',2],['muslim','イスラム教',0],['shinto','神道',4],['daoist','道教',0],['confucian','儒教',0],['local','地域・先住の宗教',3],['none','宗教なし',42],['other','その他の宗教',1],['combined','複数の宗教',1],['unanswered','無回答・拒否',2]]},
 {code:'KOR',name:'韓国',year:2023,method:'Pew成人電話調査・18歳以上',sourceKey:'pewTopline',point:[127.8,36.4] as [number,number],headline:'宗教なし52％ · キリスト教32％',shares:[['buddhist','仏教',14],['christian','キリスト教',32],['muslim','イスラム教',0],['daoist','道教',0],['confucian','儒教',1],['local','地域・先住の宗教',0],['none','宗教なし',52],['other','その他の宗教',0],['combined','複数の宗教',0],['unanswered','無回答・拒否',0]]},
 {code:'TWN',name:'台湾',year:2023,method:'Pew成人電話調査・18歳以上',sourceKey:'pewTopline',point:[121.0,23.7] as [number,number],headline:'仏教28％ · 宗教なし27％ · 道教24％',shares:[['buddhist','仏教',28],['christian','キリスト教',7],['muslim','イスラム教',0],['daoist','道教',24],['confucian','儒教',0],['local','地域・先住の宗教',4],['none','宗教なし',27],['other','その他の宗教',2],['combined','複数の宗教',5],['unanswered','無回答・拒否',2]]},
 {code:'MNG',name:'モンゴル',year:2020,method:'国勢調査・15歳以上',sourceKey:'mongoliaCensus',point:[103.8,46.8] as [number,number],headline:'仏教51.7％ · 宗教なし40.6％',shares:[['buddhist','仏教',51.7],['muslim','イスラム教',3.2],['shaman','シャーマニズム',2.5],['christian','キリスト教',1.3],['other','その他の宗教',0.7],['none','宗教なし',40.6]]},
] as const;

export const eastAsiaReligionSources={
 pewTopline:'https://www.pewresearch.org/wp-content/uploads/sites/20/2024/06/PR_2024.06.17_religion-in-east-asia_topline.pdf',
 pewMethod:'https://www.pewresearch.org/religion/2024/06/17/religion-in-east-asia-methodology/',
 mongoliaCensus:'https://tuv.nso.mn/uploads/users/87/files/Khun_am_toollogo.pdf',
 chinaPew:'https://www.pewresearch.org/religion/2023/08/30/measuring-religion-in-china/',
 chinaMethod:'https://www.pewresearch.org/religion/2023/08/30/religion-china-methodology/',
} as const;

// Different China questions and survey years must remain independent measures.
export const eastAsiaChinaReligionMeasures=[
 {year:2018,source:'CGSS',question:'宗教信仰（zongjiao xinyang）による帰属',value:10,coverage:'中国本土28/31省級地域。新疆・チベット・海南を含まない。'},
 {year:2018,source:'CFPS',question:'仏・菩薩を信じる',value:33,coverage:'中国本土の別調査。宗教帰属と同じ質問ではない。'},
 {year:2016,source:'CFPS',question:'年に数回以上の焼香',value:26,coverage:'中国本土の別年・別質問。宗教帰属と足し合わせない。'},
] as const;
