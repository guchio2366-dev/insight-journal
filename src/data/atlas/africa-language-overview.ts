/** Glottolog language families are linguistic classifications, not ethnic groups.
 * Locations are taken from the 5.3 language records; no residence polygons or
 * speaker counts are inferred. Every source family remains on the point record. */
export const africaLanguageAsset='/assets/atlas/africa-culture-v2/language-points.json';
export const africaLanguageFamilies=[
 {id:'Atlantic-Congo',label:'大西洋・コンゴ',color:'#658f61'},
 {id:'Afro-Asiatic',label:'アフロ・アジア',color:'#c1a15a'},
 {id:'Mande',label:'マンデ',color:'#9775a3'},
 {id:'Central Sudanic',label:'中央スーダン',color:'#578e9e'},
 {id:'Nilotic',label:'ナイル',color:'#b77062'},
 {id:'Austronesian',label:'オーストロネシア',color:'#6684b2'},
 {id:'Khoe-Kwadi',label:'コエ・クワディ',color:'#ba8457'},
 {id:'other',label:'その他の独立系統・孤立言語・接触言語',color:'#899590'}
] as const;
export type AfricaLanguagePoint={id:string;name:string;family:string;familyId:string;coordinates:readonly [number,number];countries:readonly string[]};
export const africaLanguageOverview={
 title:'言語名と系統の代表点',
 reading:'北部・サヘルの一部・アフリカの角にはアフロ・アジア系統、西部から中部・東部・南部には大西洋・コンゴ系統の言語地点が広がります。西部のマンデ、ナイル周辺の複数の独立系統、南部のコエ・クワディなども重なり、マダガスカルではオーストロネシア系統が見られます。',
 scope:'点は言語資料の代表位置です。現在の話者分布面・人数ではなく、歴史的位置の場合もあります。点数・密集は話者数を表さず、民族集団や居住境界とは一致しません。「その他」は1つの語族ではありません。手話と系統未確認の資料はこの口頭言語の図から除いています。',
 explanation:'語族・系統は、言語の歴史的なつながりを整理する分類です。同じ系統でも別の言語で、互いにそのまま通じるとは限りません。母語、家庭で最も使う言語、複数の地域で使う共通語も別の概念です。点の名称は個別の言語資料名、色はその系統を示します。',
 source:{label:'Glottolog 5.3（2026）・言語の系統と記録位置',url:'https://glottolog.org/meta/downloads'},
 attribution:'Hammarström, Forkel, Haspelmath & Bank (2026), Glottolog 5.3. CC BY 4.0。アフリカ地点を抽出し、座標を小数5桁へ丸めました。',
 license:'https://creativecommons.org/licenses/by/4.0/',
 ethnicityMissing:'民族居住域の公開再配布許諾を確認できる資料は未取得です。言語分布で民族分布の未達を代替しません。'
} as const;
