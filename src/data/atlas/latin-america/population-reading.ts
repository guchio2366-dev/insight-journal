import {latinSocietyTopics} from '../latin-america-society';

export const latinPopulationOriginalTopics=latinSocietyTopics.filter(topic=>topic.field==='population');
export const latinPopulationReadingSources={
 productivity:'https://blogs.worldbank.org/en/latinamerica/three-key-factors-boosting-productivity-latin-american-and-caribbean-cities',
 employment:'https://www.worldbank.org/en/region/lac/publication/the-evolving-geography-of-productivity-and-employment',
 ghsl:'https://data.jrc.ec.europa.eu/dataset/2ff68a52-5b5b-4a22-8f40-c41da8332cfe',
};
export const latinPopulationSpatialOverview={title:'中南米全体：人口が集まる場所',text:'2020年の居住人口分布では、ブラジル南東部の沿岸都市、ラプラタ河口、アンデスの高地都市、中米・カリブの集まりを読みます。アマゾンやパタゴニアの低密度地域と比べ、国の中も均一ではないことを確かめます。',cause:'沿岸・河川・高地の条件に港・産業・交通が重なり、人が集まります。地図は居住人口の推計で、仕事の数や民族・宗教の分布を表すものではありません。'};
export const latinPopulationReadings={
 all:{title:'人口の大きさと、住む密度を分ける',text:'人口が多いブラジルと、人口密度が高い中米・カリブを比べます。色は国・地域全域の平均、円は人口の規模です。',cause:'高地・沿岸・河川は、住む場所と移動の条件を作ります。企業・雇用と市場へのつながりが人の集積を支え、住宅・交通・水・公共サービスの整備が重要になります。'},
 south:{title:'南米：大人口と、国の中の集まり方',text:'ブラジルは大きい人口を持つ一方、国平均の密度は人口が集まる沿岸都市の密度とは別の尺度です。下のGHSL2020図で、沿岸・河川沿いの居住分布も確かめられます。',cause:'港・産業・市場を結ぶ交通が都市の集積を支えます。住宅から仕事や公共サービスへ移動できることが、人口の集積を暮らしの利点につなげます。'},
 central:{title:'中米：高地・沿岸の都市と移動を読む',text:'グアテマラなどの中米諸国を選び、南米の大国と人口規模・国平均密度を比べます。都市化率は、人口のうち各国の定義で都市に住む人の割合です。',cause:'高地・沿岸の自然条件に、国内の雇用・市場・交通路が重なります。都市間の輸送や通勤の条件を合わせて読むと、人の集まりと生活・仕事のつながりが見えます。'},
 caribbean:{title:'カリブ：島の人口規模と高い密度を分ける',text:'ジャマイカやバルバドスは、ブラジルより人口規模が小さくても、国・地域平均の密度が高くなります。国の陸地面積と人口の両方を読む比較です。',cause:'島の限られた陸地に暮らしと経済活動が集まります。都市・交通・市場が結び付き、住まいから仕事や公共サービスへ到達する条件が重要になります。'},
} as const;
export function latinPopulationReadingFor(place:string,scope:string){
 if(['GTM','SLV','HND','NIC','CRI','PAN','BLZ'].includes(place))return latinPopulationReadings.central;
 if(['ATG','BHS','BRB','CUB','DMA','DOM','GRD','HTI','JAM','KNA','LCA','PRI','TTO','VCT'].includes(place))return latinPopulationReadings.caribbean;
 if(place!=='all'||scope==='south')return latinPopulationReadings.south;
 return scope==='central'?latinPopulationReadings.central:latinPopulationReadings.all;
}
