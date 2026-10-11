/** Schematic axes/boxes, not surveyed boundaries. Natural Earth rates region outlines at about 1:50m. */
const physical = {
  source:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-physical-labels/',
  sourceLabel:'Natural Earth・Physical Labels（概略地形と海域）',
};

export const europeTerrainGuides = [
  {id:'scandinavian-mountains',name:'スカンディナヴィア山脈',kind:'mountain',coordinates:[13,65],line:[[6.5,60],[9,63],[14,65.5],[19,68]],bounds:[[5,58],[22,70]],overview:'ノルウェーとスウェーデンの国境付近に南北の山地が続き、西はフィヨルドの多い海岸に近づきます。',explanation:'氷河の侵食が西側に深い谷を残しました。山地は湿った西風を受ける海側と、その風下の東側との気候差にも関わります。',explanationSource:'https://www.visitnorway.com/things-to-do/nature-attractions/fjords/the-fjords-explained/',...physical},
  {id:'northern-european-plain',name:'北ヨーロッパ平原',kind:'plain',coordinates:[17,53],line:[[4,52],[10,53],[17,53],[24,52.5],[30,52.5]],bounds:[[3,49],[34,56]],overview:'北海沿岸からドイツ北部、ポーランドを経て東へ起伏の小さい土地が連なります。',explanation:'氷期の氷河や河川が運んだ堆積物が広い低地に重なります。平坦な地形は農地・都市・陸上交通が連続しやすい条件の一つです。',explanationSource:'https://www.usgs.gov/media/images/glaciers-extended-over-much-europe-during-last-ice-age',...physical},
  {id:'cantabrian-mountains',name:'カンタブリア山脈',kind:'mountain',coordinates:[-5,43],line:[[-8.5,43.1],[-5.8,43],[-3,42.9]],bounds:[[-9.5,42],[-2,44]],overview:'イベリア半島の北岸に沿って東西の山地が続き、ビスケー湾沿岸と内陸高原を隔てます。',explanation:'大西洋からの湿った空気が山地で上昇し、北岸と内陸の降水・植生の違いに関わります。',...physical},
  {id:'pyrenees',name:'ピレネー山脈',kind:'mountain',coordinates:[.6,42.7],line:[[-1.7,42.8],[.5,42.7],[3,42.6]],bounds:[[-2,42],[3.5,43.5]],overview:'イベリア半島の北東端に、ビスケー湾側から地中海側まで東西の高山帯が続きます。',explanation:'イベリア側と欧州側の地殻が押し合って隆起した山地で、両側の低地と標高が大きく異なります。',explanationSource:'https://digital.csic.es/handle/10261/73896',...physical},
  {id:'massif-central',name:'中央山塊',kind:'upland',coordinates:[2.8,45],line:[[1,44],[2.5,45],[4.2,46]],bounds:[[1,43],[4.7,46.8]],overview:'フランス中央部に高地が広がり、ローヌ谷の西に位置します。',explanation:'高原・火山地形・谷を含む山地で、周辺の低地とは河川の流れや降水条件が異なります。単一の稜線ではありません。',...physical},
  {id:'alps',name:'アルプス山脈',kind:'mountain',coordinates:[9.5,46.6],line:[[5.8,44.5],[8,46],[10.5,46.7],[13,47],[15.7,46.5]],bounds:[[5,44],[16,48]],overview:'フランス南東部からスイス・オーストリアを経て東へ弧を描き、北側の低地と南側のポー平原を分けます。',explanation:'アフリカ側と欧州側の岩盤の収束に伴う隆起と、氷河・河川の侵食が高い峰と深い谷を形づくりました。',explanationSource:'https://www.seismo.ethz.ch/en/knowledge/causes-of-earthquakes/Switzerland/',...physical},
  {id:'carpathians',name:'カルパチア山脈',kind:'mountain',coordinates:[24.5,48.3],line:[[18,49.5],[21,49.2],[24,48.7],[26.5,47],[25,45.5]],bounds:[[17,44],[28,50]],overview:'中東欧からルーマニアにかけ、ハンガリー平原の北側・東側を囲む弧状の山地です。',explanation:'山地の弧の内側と外側で河川の流れる向きが分かれ、ドナウ川の支流は山地から低地へ集まります。',...physical},
  {id:'dinaric-alps',name:'ディナル・アルプス',kind:'mountain',coordinates:[17.5,43.4],line:[[14,45.4],[16,44.6],[18,43.2],[20,42]],bounds:[[13,41],[21,46]],overview:'アドリア海東岸に沿って北西から南東へ山地が続きます。',explanation:'沿岸近くまで山地が迫り、短い距離で標高が上がるため、沿岸と内陸の河川経路・交通路を制約します。',...physical},
  {id:'apennines',name:'アペニン山脈',kind:'mountain',coordinates:[13.5,41.1],line:[[8,44.5],[11,43.2],[13.3,41.5],[16,39.3]],bounds:[[8,38],[17,45]],overview:'イタリア半島の中央を北西から南東へ長く通る山地です。',explanation:'半島中央の山地が東西の沿岸低地を隔て、河川はそれぞれ近い側の海へ向かいます。',...physical},
  {id:'balkan-mountains',name:'バルカン山脈',kind:'mountain',coordinates:[24.6,42.8],line:[[21.8,43.5],[24.5,42.8],[27.6,42.7]],bounds:[[21,42],[28,44]],overview:'ブルガリアを西から東へ横切り、ドナウ川側の北部とトラキア側の南部を分けます。',explanation:'東西の山地が南北の低地を隔て、川の流れと通行しやすい谷の位置を分けます。バルカン半島全体を覆う山地ではありません。',...physical},
] as const;

/** Coast and inland-water labels are shown with landforms, not in a separate tab. */
export const europeTerrainPlaceNames = [
  {id:'iberian-peninsula',name:'イベリア半島',kind:'peninsula',coordinates:[-5,39.5],bounds:[[-10,36],[4,44]],overview:'欧州南西部で大西洋と地中海の間へ張り出し、北東側にピレネー山脈があります。',explanation:'海岸からの距離と内陸高原・周辺山地の配置により、半島内でも環境が変わります。',...physical},
  {id:'italian-peninsula',name:'イタリア半島',kind:'peninsula',coordinates:[12.5,40],bounds:[[8,37],[18,45]],overview:'アルプスの南から地中海へ細長く延び、中央をアペニン山脈が通ります。',explanation:'山地が半島中央を長く占めるため、東西の海岸低地は狭く、河川は両側の海へ向かいます。',source:'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-coastline/',sourceLabel:'Natural Earth・Coastline（半島の海岸）'},
  {id:'balkan-peninsula',name:'バルカン半島',kind:'peninsula',coordinates:[23,40.5],bounds:[[13,35],[29,46]],overview:'アドリア海・エーゲ海・黒海に面する欧州南東部の半島です。',explanation:'複数の山地と入り組んだ海岸が近接し、沿岸と内陸で地形条件が大きく変わります。',...physical},
  {id:'sicily',name:'シチリア島',kind:'island',coordinates:[14,37.4],bounds:[[12.3,36.5],[15.7,38.4]],overview:'イタリア半島南端と北アフリカの間にある地中海の島です。',explanation:'半島本土とはメッシーナ海峡で隔てられ、島内には山地とエトナ火山があります。',...physical},
  {id:'north-sea',name:'北海',kind:'sea',coordinates:[2,57],bounds:[[-4,51],[10,62]],overview:'英国とスカンディナヴィア半島、欧州本土北西部の間に広がります。',explanation:'ライン川など欧州北西部の河川が注ぎ、大西洋と英仏海峡・バルト海側を結びます。',...physical},
  {id:'baltic-sea',name:'バルト海',kind:'sea',coordinates:[19,57],bounds:[[10,53],[30,66]],overview:'スカンディナヴィア半島と欧州北東部の間に入り込む海です。',explanation:'デンマーク周辺の狭い水路で北海とつながり、周囲の河川から淡水が流れ込みます。',...physical},
  {id:'english-channel',name:'英仏海峡',kind:'sea',coordinates:[-2,50],bounds:[[-6,48],[2,52]],overview:'英国南岸とフランス北岸の間に横たわり、北東端にドーヴァー海峡があります。',explanation:'西の大西洋と東の北海を結ぶ海の通路です。',...physical},
  {id:'adriatic-sea',name:'アドリア海',kind:'sea',coordinates:[16.3,42.5],bounds:[[12,40],[20,46]],overview:'イタリア半島東岸とバルカン半島西岸に挟まれた細長い海です。',explanation:'西にアペニン山脈、東にディナル・アルプスが並び、両岸で山地と海の距離が近くなります。',...physical},
  {id:'mediterranean-sea',name:'地中海',kind:'sea',coordinates:[5,36],bounds:[[-6,30],[36,46]],overview:'欧州南岸と北アフリカの間に広がり、西端で大西洋につながります。',explanation:'イベリア・イタリア・バルカンの各半島が海へ張り出し、多くの湾と沿岸をつくります。',...physical},
  {id:'black-sea',name:'黒海',kind:'sea',coordinates:[33,43],bounds:[[27,40],[42,47]],overview:'バルカン半島の東側に広がり、ドナウ川の河口があります。',explanation:'欧州内陸の広い水系から水を受け、ボスポラス海峡を経て地中海側へつながります。',...physical},
  {id:'caspian-sea',name:'カスピ海',kind:'sea',coordinates:[49,43],bounds:[[46,36],[54,48]],overview:'欧州東端付近から中央アジアへ広がる、外洋につながらない内陸水域です。',explanation:'海への出口がなく、水位は周囲の河川流入と蒸発の変化に左右されます。',...physical},
  {id:'gibraltar-strait',name:'ジブラルタル海峡',kind:'strait',coordinates:[-5.6,36],bounds:[[-6.1,35.7],[-5.2,36.3]],overview:'イベリア半島南端と北アフリカの間で、大西洋と地中海をつなぎます。',explanation:'両大陸の海岸が近づく場所が、二つの大きな海域の連絡点になります。',source:'https://science.nasa.gov/earth/earth-observatory/the-strait-of-gibraltar-151478/',sourceLabel:'NASA Earth Observatory・ジブラルタル海峡'},
  {id:'dover-strait',name:'ドーヴァー海峡',kind:'strait',coordinates:[1.4,51],bounds:[[0.9,50.8],[2,51.4]],overview:'英国のドーヴァーとフランスのカレーの間にあり、英仏海峡の北東端を占めます。',explanation:'英国と欧州大陸の海岸が接近し、英仏海峡から北海へ通じます。',source:'https://www.navy.mil/Press-Office/News-Stories/display-news/Article/3934963/truman-strike-group-transits-strait-of-dover-for-the-north-sea/',sourceLabel:'米海軍・ドーヴァー海峡と北海'},
] as const;

/** Recurring wind zones only; wind direction and reach vary by weather system. */
export const europeTerrainWinds = [
  {id:'mistral',name:'ミストラル',kind:'wind',coordinates:[5.1,43.8],bounds:[[3.5,42.5],[7.5,46]],overview:'フランス南東部のローヌ川下流・プロヴァンスから地中海沿岸に吹く地域風です。',explanation:'北寄りの気流がローヌ谷で加速し、マルセイユ付近では北西寄りになります。冬から春に強いことが多いものの、ほかの季節にも起こります。',source:'https://meteofrance.com/meteo-a-z/le-mistral-vent-regional',sourceLabel:'Météo-France・ミストラル'},
  {id:'sirocco',name:'シロッコ',kind:'wind',coordinates:[9.2,41.5],bounds:[[7,39],[11,44]],overview:'サハラから地中海を越え、コルシカ島やフランスの地中海沿岸にも届く南寄りの風です。',explanation:'気圧配置によって暖かい空気が北へ流れ、砂じんを運ぶ場合があります。到達域は日ごとに変わり、この枠は常時の影響域ではありません。',source:'https://meteofrance.com/meteo-a-z/les-vents-regionaux',sourceLabel:'Météo-France・地域風とシロッコ'},
  {id:'foehn',name:'フェーン',kind:'wind',coordinates:[9.5,46.9],bounds:[[5,44],[16,49]],overview:'アルプスなど山地の風下側で現れる、暖かく乾いた下降風です。',explanation:'山を越えた空気が風下で下降・圧縮されて暖まります。風上と風下は気流で入れ替わるため、一方向の固定矢印にはしません。',source:'https://meteofrance.com/meteo-a-z/leffet-de-foehn',sourceLabel:'Météo-France・フェーン効果'},
] as const;
