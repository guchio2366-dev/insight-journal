// The chart already carries monthly values. These notes explain the selected
// station's seasonal pattern and its surrounding landscape without treating a
// station, a climate grid cell, and an agricultural map as identical areas.
export type SouthCentralCityReading={pattern:string;reason:string;agriculture:string;agricultureSource:{label:string;url:string}};
const spam={label:'IFPRI MapSPAM 2020 v2r2・作物の推計分布',url:'https://doi.org/10.7910/DVN/SWPENT'};
const punjab={label:'FAO・パンジャーブの水稲と冬小麦',url:'https://www.fao.org/fileadmin/user_upload/groundwatergovernance/docs/Thematic_papers/GWG_Thematic_Paper_4.pdf#page=19'};
const central={label:'FAO・中央アジアの灌漑（2013年）',url:'https://www.fao.org/4/i3289e/i3289e.pdf#page=123'};
export const southCentralCityReadings:Record<string,SouthCentralCityReading>={
 'new-delhi':{pattern:'初夏は暑く、雨は夏に増え、冬は少なくなります。',reason:'内陸の北インド平原で、夏の季節風が運ぶ湿った空気の影響を受けます。雨の季節差は観測所で確かめ、地図の乾燥帯の判定は別の広域格子で確認します。',agriculture:'周辺のパンジャーブでは、雨季の水稲と冬の小麦で水を使う時期が違います。地下水と灌漑の管理も関わり、デリー観測所の雨量を畑の取水量とは読めません。',agricultureSource:punjab},
 mumbai:{pattern:'高温が続き、雨は夏の数か月に集中します。',reason:'アラビア海に面する西岸では、夏の季節風が湿った空気を運びます。西ガーツ山脈の風上側と内陸では雨の受け方が違います。海岸の観測所は広域の気候格子で未分類の場合があり、近くの陸地の区分を観測所の判定と同一視しません。',agriculture:'西岸の低地に見える米の推計栽培域と、内陸の別の作物分布を比べます。都市の雨温図だけで圃場の作付けや灌漑量は決まりません。',agricultureSource:spam},
 kolkata:{pattern:'雨は夏の季節風の時期に多く、冬には少なくなります。',reason:'ベンガルの低地で、ベンガル湾から湿った空気が入りやすい位置です。月別の雨はアリポール観測所、気候区分は周囲を含む別の格子資料です。',agriculture:'コルカタ周辺からバングラデシュへ続く低地では米の推計栽培域が広がります。河川と雨季の位置を重ねて読み、観測所の値を田ごとの水量にはしません。',agricultureSource:spam},
 chennai:{pattern:'雨の山は夏の終わりから秋・初冬側にあります。',reason:'インド半島の東岸にあり、夏の南西季節風の主な雨の時期が西岸とは異なります。季節風の向きとベンガル湾からの湿りが、秋の雨を考える手掛かりです。',agriculture:'周辺の米の推計栽培域と水の確保を比べます。雨の時期だけから、貯水池・河川・地下水の利用割合は求められません。',agricultureSource:spam},
 karachi:{pattern:'夏は暑く、雨季の月でも降水量は限られます。',reason:'アラビア海沿岸でも、南アジアの湿った季節風の雨がベンガル側と同じ量になるわけではありません。年量だけで乾燥帯を決めず、気温と降水の季節配分を地図分類の期間・地点と分けて確認します。',agriculture:'カラチの北東へ続くインダス川下流では、乾いた低地にも農業の分布があります。河川からの水を届ける仕組みと、その場所に降る雨を区別します。',agricultureSource:spam},
 islamabad:{pattern:'夏の雨が増える一方、冬にも一定の雨があります。',reason:'北西の山地の近くにあり、南アジアの夏の季節風と冬の降水を両方確かめられます。都市の値を山地全体の平均に広げません。',agriculture:'山麓からパンジャーブ平原へ続く農地では、小麦と米の分布を水の季節と比べます。',agricultureSource:spam},
 dhaka:{pattern:'暖かい月が続き、夏に雨が大きく増えます。',reason:'ガンジス川・ブラマプトラ川の下流に近い低地で、ベンガル湾からの湿った季節風と上流から届く川の水を別に読む必要があります。',agriculture:'バングラデシュの低地では米の推計栽培域が広がります。雨温図はダッカの観測所値で、個々の田の浸水や取水を示しません。',agricultureSource:spam},
 colombo:{pattern:'海に近い暖かさと、月ごとの雨の変化を読みます。',reason:'スリランカの西岸にあり、島内の山地や反対側の沿岸と雨の季節が一様ではありません。',agriculture:'島内の米と茶の推計分布を比べます。コロンボの観測所値を中央高地の畑に当てはめません。',agricultureSource:spam},
 male:{pattern:'気温の年変化が小さい海上の観測所です。',reason:'海に囲まれた小島の地点値です。広域格子に分類がない場合も、気温・降水の平年値がない意味ではありません。',agriculture:'小島は広域の農業格子に収まらないことがあります。地図の空白を農業がない証拠にせず、国別資料を確認します。',agricultureSource:spam},
 astana:{pattern:'冬と夏の気温差が大きく、降水は夏側に増えます。',reason:'海から遠いカザフスタン北部の内陸です。寒い冬と比較的短い生育期を合わせて読みます。',agriculture:'北部の小麦分布には生育期の長さと輸送も関わります。観測所の月別値を収穫量には換算できません。',agricultureSource:central},
 almaty:{pattern:'寒い季節と暖かい季節の差を、山麓の雨とともに読みます。',reason:'天山山脈の麓に近く、中央アジアの乾いた低地と同じ地形条件ではありません。',agriculture:'山地から下る水と周辺の栽培域を比較します。都市の雨だけで灌漑用水の量は決まりません。',agricultureSource:central},
 tashkent:{pattern:'夏は暑く、冬は冷え、雨は夏より涼しい季節に目立ちます。',reason:'乾いた低地にあり、山地から流れるシルダリヤ川水系の水を都市の降水と分けて読みます。',agriculture:'ウズベキスタンの河川沿いの綿花には灌漑設備と生産政策の歴史が関わります。都市の雨温図は綿花畑の水使用量を示しません。',agricultureSource:central},
 bishkek:{pattern:'冬の寒さと夏の暖かさ、雨の季節差を確認します。',reason:'天山山脈の北側の山麓にあり、盆地と高山では気温・水の条件が変わります。',agriculture:'山地から低地へ続く水と、河川沿いの栽培域を比べます。',agricultureSource:central},
 khujand:{pattern:'気温の季節差を読めますが、この資料には降水量の月別平年値がありません。',reason:'フェルガナ盆地の西側にある観測所です。雨の欠測を0mmや乾燥の強さに読み替えません。',agriculture:'盆地の綿花分布は河川から水を届ける設備とも関わります。月別降水の欠測から灌漑量は推測しません。',agricultureSource:central},
 ashgabat:{pattern:'暑い夏と冷える冬、少ない雨の季節配分を読みます。',reason:'コペトダグ山脈の北側の乾いた低地です。砂漠や山麓の広い範囲と都市の値を区別します。',agriculture:'乾燥した地域の作物分布は水の供給方法も合わせて確認します。帯水層の位置は十分な取水可能量を保証しません。',agricultureSource:central},
};
