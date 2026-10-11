import source from '../../../../data-source/atlas/latin-reading/major-compositions-20261011.json';
export type MajorSection='ethnicity'|'religion';
export type MajorValue={group:string;native:string;percent:number;count?:number;sourceCategoryKeys?:string[]};
export type MajorArea={code:string;year:number;source:string;denominator:string;note:string;values:MajorValue[];rawCounts?:Record<string,number>;rawLabels?:Record<string,string>};
export type MajorGroup={id:string;label:string;color:string;overview:string;reason:string;definition:string};
export const majorSources=source.sources;
export const majorAreas:Record<MajorSection,MajorArea[]>={ethnicity:source.ethnicity,religion:source.religion};
export const majorThreshold={ethnicity:10,religion:5};
export const majorGroups:Record<MajorSection,MajorGroup[]>={
 ethnicity:[
  {id:'mestizo',label:'メスチソ',color:'#cf9c34',overview:'中米からコロンビア・エクアドル・ペルーに、Mestizoと回答した人々の大きな構成が見られます。ブラジルのpardo、グアテマラのLadinoとは別の元分類です。',reason:'植民地期以降の先住民と欧州系の関係、独立後の社会や国家の形成が、この自己認識の広がりに関わります。血統を測った分類ではありません。',definition:'LatinobarómetroのMestizoとペルー国勢調査のMestizo。年・設問・対象年齢が違うため厳密な国際順位には使いません。'},
  {id:'indigenous',label:'先住民関連',color:'#35936f',overview:'グアテマラなどの中米と、ペルー・ボリビアなどのアンデスに大きな構成が見られます。アマゾンなどにも多様な人々が暮らし、色がない場所を不在とは読みません。',reason:'征服・植民地化を経ても続く地域社会と文化が分布の背景です。都市への移動もあり、高地や森林だけを居住域と決めません。',definition:'元のIndígena・Amerindian、ペルーのQuechua＋Aimara、グアテマラのMaya＋Xincaなど。元回答と加算内訳を残し、言語人口を民族人口に置換しません。'},
  {id:'white',label:'白人・欧州系関連',color:'#7579b6',overview:'ブラジル南部のbranca72.6%と、ウルグアイの県別Blancaが大きく見られます。ウルグアイ北部ではAfroの祖先回答も重なります。',reason:'植民地期の移住に加え、19〜20世紀の欧州からの移民が南部の社会形成に関わりました。',definition:'各資料のBlanco・branca・Kaukasisch/blankなどの自己分類。遺伝的な欧州系割合や国民全員の出自を表しません。'},
  {id:'pardo',label:'pardo（ブラジル）',color:'#c45f80',overview:'ブラジル2022年のpardaは北部67.2%、北東部59.6%、中西部52.4%。5大地域の実形に、branca・preta等と重ねて示します。',reason:'ブラジルの植民地化、奴隷制、移住と社会史の中で使われてきた分類です。',definition:'IBGEの元分類pardaだけを表示。Mestizo・Mulato・Ladinoに合算しません。追加設問を含む先住民総数と、排他的なcor5分類も混ぜません。'},
  {id:'afro',label:'アフリカ系関連',color:'#458cab',overview:'カリブや南米北岸、ブラジルなどの社会にアフリカ系の重要な構成があります。地図は採用した回答統計の範囲で示し、未収録の島々も不在ではありません。',reason:'奴隷貿易とプランテーションの歴史、その後の移動と地域社会の形成が背景です。沿岸だけに暮らすとは読みません。',definition:'Negro・preta・African/Blackなど。スリナムはMarron＋Creool＋Afrosurinamer、グアテマラは元の2区分。pardo・Mulatoは自動で加算しません。'},
  {id:'asian',label:'インド系・アジア系',color:'#d57140',overview:'ギアナ地方のガイアナ・スリナムには、インド系やジャワ系などの大きな構成が見られます。',reason:'奴隷制廃止後のインド・インドネシアなどからの契約移民と、その後の地域社会の形成が背景です。',definition:'East Indian、スリナムのHindostaan＋Javaan＋Chinees、その他資料のAsiáticoなど。宗教とは別設問で、元分類を内訳に残します。'},
  {id:'mixed',label:'Mixed・Mulato等',color:'#62a4a0',overview:'ガイアナのMixed、スリナムのGemengd、カリブなどのMulatoは、各国資料で独立して回答された区分です。',reason:'植民地化と移住の歴史を共有していても、社会で使う名称・分類の意味は国ごとに異なります。',definition:'元のMixed・Gemengd・Mulatoを関連区分として示します。Mestizo・pardo・Ladinoとは別の色を保ちます。'},
  {id:'ladino',label:'Ladino（グアテマラ）',color:'#8e8050',overview:'グアテマラ2018年ではLadino56.0%、Maya41.7%、Xinca1.8%。22県のLadinoとMaya・Xinkaの分布を同時に示します。',reason:'グアテマラの歴史と社会・文化の中で使われる自己認識の区分です。',definition:'元のLadinoを保持し、他国のMestizoに置き換えません。県別pueblo de pertenenciaの集計で、個人の居住域を確定する資料ではありません。'}
 ],
 religion:[
  {id:'catholic',label:'カトリック',color:'#427fac',overview:'中南米の多くの国に広く見られ、2013–14年の全国成人調査ではパラグアイ89%、コロンビア・エクアドル79%です。他の所属も同じ地図に示します。',reason:'植民地期の教会の広がりが大きな背景です。その後の宗教の選択や社会の変化で構成は変わっています。',definition:'PewのCatholicと、ガイアナ・スリナム国勢調査のRoman Catholic。国全員の信仰や現在値ではありません。'},
  {id:'protestant',label:'プロテスタント系',color:'#d88c44',overview:'ブラジル北部の州、チリのBiobío・La Araucanía・Los Ríos、中米のニカラグアやベリーズで、福音派・ペンテコステ派などがカトリックと重なります。元教派の定義は地域ごとに保ちます。',reason:'歴史的教会に加え、20世紀以降のペンテコステ派などの広がりが宗教構成の変化に関わっています。',definition:'全国参考資料PewのProtestantは歴史的教会・ペンテコステ派等を含み、福音派だけではありません。地図はブラジルEvangélicas、チリEvangélica o protestante、ニカラグアEvangélica、ガイアナ・ベリーズPentecostal。その他キリスト教は加えません。'},
  {id:'none',label:'宗教に所属しない',color:'#9471b3',overview:'ベリーズのStann Creek46.6%、Cayo34.7%、チリのSantiago30.0%など、所属なしの多い実地域をカトリック等と同時に示します。全国の参考割合は地図下で読めます。',reason:'政教関係や世俗化、個人の宗教選択の変化が背景です。',definition:'PewのUnaffiliated、国勢調査のNone/Geen religie。無神論者だけを意味せず、未回答・不明・統計未収録をこの区分に入れません。'},
  {id:'hindu',label:'ヒンドゥー教',color:'#349e89',overview:'ガイアナ2012年の地域別集計では、沿岸のEast Berbice-Corentyne等にヒンドゥー教が多く、他の所属と実地域上で重なります。スリナム全国値は地図下の参考資料に残します。',reason:'インドからの契約移民と、その後の地域社会の形成が背景です。',definition:'ガイアナのHindu、スリナムのSanatan Dharm＋Arya Dewaker＋Other Hindu。民族のインド系とは別設問です。'},
  {id:'muslim',label:'イスラム教',color:'#c46283',overview:'ガイアナ2012年の沿岸地域などで、イスラム教をヒンドゥー教・キリスト教と同時に示します。民族設問から信仰を推定していません。',reason:'インド・インドネシアなどからの移住と、地域社会の歴史が背景です。',definition:'ガイアナのMuslim、スリナムのSunni＋Ahmadiyya＋Other Muslim。国勢調査の原分類と人数を内訳に残します。'},
  {id:'otherChristian',label:'その他キリスト教',color:'#75858d',overview:'ガイアナのOther Christianなど、キリスト教と回答しても教派を確定できない元分類があります。',reason:'宗教の広がりと、国勢調査での分類方法の両方が構成の見え方に関わります。',definition:'原表のOther Christian/Overige Christen。教派を推測してプロテスタント系やカトリックに振り分けません。'},
  {id:'otherReligion',label:'その他の所属',color:'#a0ac79',overview:'主要区分以外の宗教の所属も、資料に掲載された割合を残しています。地図に現れない小さな構成を不在とは読みません。',reason:'各地域の宗教と、移住による信仰の広がりが重なっています。',definition:'Pewのその他、国勢調査のその他の宗教・独立区分など。未回答・不明は別扱いです。'}
 ]
};
export const majorArea=(section:MajorSection,code:string)=>majorAreas[section].find(a=>a.code===code);
export const majorGroup=(section:MajorSection,id:string)=>majorGroups[section].find(g=>g.id===id);
export const majorShare=(area:MajorArea,id:string)=>area.values.filter(v=>v.group===id).reduce((n,v)=>n+v.percent,0);
export function majorSelection(section:MajorSection,choice:string){const [kind,id]=choice.split(':');return kind==='distribution'&&majorGroup(section,id)?{kind,id}:kind==='area'&&majorArea(section,id)?{kind,id}:undefined;}
