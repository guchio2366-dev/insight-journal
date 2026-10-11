import census from './africa-ethnicity-evidence.json' with {type:'json'};

const names:Record<string,string>={Akan:'アカン','Ga-Dangme':'ガ・ダングメ',Ewe:'エウェ',Guan:'グアン',Gurma:'グルマ','Mole-Dagbani':'モレ・ダグバニ',Grusi:'グルシ',Mande:'マンデ',Others:'その他'};
const colors=['#39768a','#7a638f','#b36d3c','#687e40','#9a4d73','#496aa0','#897139','#4a857a','#7d7f7a'];
export const ethnicityRegionNames:Record<string,string>={Western:'西部州',Central:'中央州','Greater Accra':'グレーターアクラ州',Volta:'ヴォルタ州',Eastern:'東部州',Ashanti:'アシャンティ州','Western North':'西部北州',Ahafo:'アハフォ州',Bono:'ボノ州','Bono East':'ボノ東州',Oti:'オティ州',Northern:'北部州',Savannah:'サヴァンナ州','North East':'北東州','Upper East':'アッパーイースト州','Upper West':'アッパーウエスト州'};
export const africaEthnicityEvidence={
 ...census,
 title:'民族の地域差：ガーナの公表事例',
 reading:'ガーナでは、南・中部の西部州・中央州・アシャンティ州でアカン、ヴォルタ州でエウェ、北部州・アッパーイースト州でモレ・ダグバニの構成比が高くなります。',
 scope:'2021年・ガーナの9大分類と16州の国勢調査集計。アフリカ全域は未取得。地図の枠は資料の対象国で、民族の居住境界ではありません。',
 method:'ガーナ統計局の表5.5、全地域・男女計から公表人数を収録。9分類と16州の全行を保持し、各州の対象人数で構成比を計算。欠測国を0や他国の分類で補わない。',
 groups:census.groups.map((row,index)=>({...row,label:names[row.id],color:colors[index]})),
};
export function ethnicityRegionComposition(region:typeof census.regions[number]){
 return africaEthnicityEvidence.groups.map(group=>({...group,count:region.counts[group.id as keyof typeof region.counts],share:region.counts[group.id as keyof typeof region.counts]/region.total*100})).sort((a,b)=>b.count-a.count);
}
