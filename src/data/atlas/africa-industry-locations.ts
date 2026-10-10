import {themeById,type AfricaCoordinate,type AfricaTheme} from './africa-themes.ts';

export type AfricaIndustryLocationKind='energy'|'metals'|'gems'|'manufacturing'|'transport';
export type AfricaIndustryLocation={
 id:string;
 label:string;
 mapLabel:string;
 kind:AfricaIndustryLocationKind;
 coordinates:AfricaCoordinate;
 title:string;
 reading:string;
 note:string;
 scope:string;
 sources:readonly {label:string;url:string}[];
 themeId?:string;
};

export const africaIndustryLocationOverview={
 title:'地下資源の帯と、沿岸の製造・物流',
 reading:'北のアルジェリア内陸では天然ガス、ギニア湾岸のナイジェリアでは原油、南部の銅・コバルト帯とボツワナでは金属・ダイヤモンドの採掘が見られます。資源の位置は地下の地質条件と結び付きます。一方、カサブランカの航空機関連製造とラゴスの港湾物流は、技能、都市の市場、交通接続を使う産業です。採掘地と加工・輸送の場所は同じとは限りません。',
 scope:'地図の点は資料で特定できる産業地域・施設周辺・港湾の代表位置です。産地全域や鉱床境界、油ガス田の広がりではありません。点の大きさ・数は産出量、埋蔵量、雇用や輸出額を表しません。',
 missing:'この7地点は収録済みの代表例です。金・レアアース、石炭・白金族、鉄鉱石・ボーキサイト、その他の主要製造業の産地は未収録です。国別の産出量・埋蔵量は地点別の数量と区別し、点の大きさや色の濃さへ換算していません。',
 sources:[
  {label:'米国EIA・ナイジェリア石油・ガス分析（2025）',url:'https://www.eia.gov/international/analysis/country/NGA'},
  {label:'米国EIA・アルジェリア石油・ガス分析（2025）',url:'https://www.eia.gov/international/analysis/country/DZA'},
  {label:'米国USGS・コンゴ民主共和国の鉱物産業（2024年資料）',url:'https://www.usgs.gov/centers/national-minerals-information-center/congo-kinshasa'},
  {label:'Kimberley Process・ボツワナ粗ダイヤ統計（2024）',url:'https://www.kimberleyprocess.com/participants/botswana'},
  {label:'米国商務省 ITA・モロッコ航空機産業（2025）',url:'https://www.trade.gov/country-commercial-guides/morocco-aerospace'},
  {label:'ナイジェリア港湾庁・ラゴス港（公表年不明、2026年10月確認）',url:'https://nigerianports.gov.ng/lagos-port/'}
 ]
} as const;

function location(themeId:string,markId:string,kind:AfricaIndustryLocationKind,mapLabel:string):AfricaIndustryLocation {
 const theme=themeById(themeId);
 if(!theme)throw new Error(`Unknown Africa industry source theme: ${themeId}`);
 const mark=theme.marks.find(item=>item.id===markId);
 if(!mark||mark.coordinates.length!==2||typeof mark.coordinates[0]!=='number'||typeof mark.coordinates[1]!=='number'){
  throw new Error(`Africa industry location must reuse an existing point: ${themeId}/${markId}`);
 }
 return {
  id:mark.id,label:mark.label,mapLabel,kind,coordinates:mark.coordinates as AfricaCoordinate,
  title:theme.title,reading:theme.takeaway,note:mark.note,
  scope:africaIndustryLocationOverview.scope,
  sources:themeSources(theme),themeId:theme.id
 };
}

function sourced(item:Omit<AfricaIndustryLocation,'scope'>):AfricaIndustryLocation{return {...item,scope:africaIndustryLocationOverview.scope};}

function themeSources(theme:AfricaTheme){
 return [{label:theme.sourceLabel,url:theme.source},...(theme.evidenceSources??[])];
}

// New coordinates locate named regions or a documented mine/port. They do not
// represent surveyed deposits, field boundaries, pipelines or trade flows.
export const africaIndustryLocations:readonly AfricaIndustryLocation[]=[
 sourced({id:'hassi-rmel-gas',label:'ハッシ・ルメル：天然ガス',mapLabel:'ガス：ハッシ・ルメル',kind:'energy',coordinates:[3.3,32.9],title:'サハラのガス田と輸送の接続',reading:'アルジェリアの天然ガス生産は、サハラ内陸のハッシ・ルメルなどのガス田に支えられます。地下の堆積盆地という地質条件に加え、国内需要地や地中海側の輸送設備への接続が産業の位置を決めます。',note:'EIAが主要な生産ガス田として挙げるハッシ・ルメル周辺の代表位置です。ガス田境界や埋蔵量ではありません。',sources:[{label:'米国EIA・アルジェリアの天然ガス分析（2025）',url:'https://www.eia.gov/international/analysis/country/DZA'}]}),
 sourced({id:'niger-delta-oil',label:'原油：ニジェール川デルタ（ナイジェリア）',mapLabel:'原油：ナイジェリア沿岸',kind:'energy',coordinates:[6.6,5.2],title:'デルタの堆積盆地と原油',reading:'ナイジェリアの原油採掘はギニア湾に面するニジェール・デルタとその沖合に集中します。堆積盆地の地質が採掘地を決め、沿岸の積出しやパイプラインなどの設備が市場への接続を左右します。',note:'デルタ地域の代表位置です。個別油田、陸上・沖合の区分、採掘量やパイプラインを示しません。',sources:[{label:'米国EIA・ナイジェリアの石油・ガス分析（2025）',url:'https://www.eia.gov/international/analysis/country/NGA'},{label:'米国EIA・デルタの原油生産地域（2016）',url:'https://www.eia.gov/todayinenergy/detail.php?id=27572'}]}),
 sourced({id:'drc-copper-cobalt',label:'コンゴ民主共和国南部：銅・コバルト',mapLabel:'銅・コバルト：コンゴ南部',kind:'metals',coordinates:[26.7,-10.6],title:'銅・コバルト帯の地質と電力',reading:'コンゴ民主共和国南部とザンビアにまたがる中央アフリカの銅・コバルト帯は、堆積岩に伴う鉱床が採掘の位置を決めます。コバルトは電池材料にも使われ、採掘後の処理には電力、輸送、労働環境の管理が必要です。USGSは2024年の同国を世界最大のコバルト生産国としています。これは産出量の位置説明であり、埋蔵量や地点別生産量ではありません。',note:'USGSが示す広域の銅・コバルト帯に置いた代表点で、個別鉱山の位置や鉱床境界ではありません。',sources:[{label:'米国USGS・中央アフリカ銅・コバルト帯の地質（2014）',url:'https://pubs.usgs.gov/publication/sir20105090T'},{label:'米国USGS・コンゴ民主共和国の鉱物産業（2024年資料）',url:'https://www.usgs.gov/centers/national-minerals-information-center/congo-kinshasa'},{label:'米国USGS・コバルトの用途',url:'https://www.usgs.gov/centers/national-minerals-information-center/cobalt-statistics-and-information'}]}),
 location('copperbelt-connections','zambia-copperbelt','metals','銅：ザンビア'),
 sourced({id:'jwaneng-diamonds',label:'ダイヤ：ジュワネン',mapLabel:'ダイヤ：ジュワネン',kind:'gems',coordinates:[24.7,-24.6],title:'キンバーライト鉱床と粗ダイヤ',reading:'ボツワナ南部のジュワネン鉱山はキンバーライトの岩体を採掘します。地質が鉱山の位置を決め、採掘・選鉱と販売は別の段階です。Kimberley Processによる2024年のボツワナ全国の粗ダイヤ生産は約1,813万カラット、約13.6億米ドルでした。これは全国の年間生産量と生産価値であり、ジュワネン単独の量や埋蔵量ではありません。',note:'Debswanaが操業を示すジュワネン鉱山の周辺代表点です。国別の粗ダイヤ生産量を点の大きさに換算していません。',sources:[{label:'Debswana・Jwaneng Mine（操業と地質）',url:'https://www.debswana.com/jwaneng/'},{label:'Kimberley Process・ボツワナ粗ダイヤ統計（2024）',url:'https://www.kimberleyprocess.com/participants/botswana'}]}),
 location('casablanca-manufacturing','casablanca-industry','manufacturing','航空機製造：カサブランカ'),
 sourced({id:'lagos',label:'港湾物流：ラゴス',mapLabel:'港湾物流：ラゴス',kind:'transport',coordinates:[3.4,6.5],title:'沿岸都市の市場と港湾',reading:'ラゴスのアパパ港では、海運から道路・鉄道・水路への接続が物流を支えます。港湾庁は港内の砂糖・塩・製粉工場にも言及しています。大きな都市市場と海岸の積出し条件が重なる場所ですが、この点は港湾の取扱量や都市全体のサービス業の規模を表しません。',note:'港湾庁が説明するアパパ港のあるラゴスの代表位置です。岸壁や工場の正確な座標ではありません。',sources:[{label:'ナイジェリア港湾庁・Lagos Port Complex（公表年不明、2026年10月確認）',url:'https://nigerianports.gov.ng/lagos-port/'}]})
];

export function africaIndustryLocationById(id:string):AfricaIndustryLocation|undefined {
 return africaIndustryLocations.find(item=>item.id===id);
}
