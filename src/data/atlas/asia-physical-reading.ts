import type { AsiaRegionId } from '../../lib/atlas-asia-state';
export const asiaNaturalTopics=[{id:'climate',label:'気候と雨温図'},{id:'terrain',label:'標高と地形'},{id:'water',label:'河川と湖'}];
export const asiaPhysicalReading:Record<AsiaRegionId,{terrain:string;water:string;terrainDetail:string;waterDetail:string}>= {
 'east-asia':{
  terrain:'西の高原・盆地から東の平野と島弧へ、高低差をたどる。',
  water:'長江・黄河の流路を、高原から低地への標高の変化と重ねる。',
  terrainDetail:'チベット高原、四川盆地、華北の低地を順に選ぶと、一つの国の中でも地形が大きく異なることを読めます。日本列島や台湾では山地と沿岸の低地の距離にも注目してください。色は標高、細線は500mごとの等高線です。山の高さの公式記録ではなく、広域の格子の値を表示しています。',
  waterDetail:'河川・湖は資料にある線と面で示します。河川の下流と平野、米の分布を比較できますが、河川に近いことだけで灌漑の利用や水量は判断できません。内陸の流域と海へ向かう流路を区別して読んでください。'
 },
 'southeast-asia':{
  terrain:'大陸部の山地と低地、島々の山地を同じ標高尺度で比べる。',
  water:'メコン川などの流路をたどり、低地と作物の分布を見比べる。',
  terrainDetail:'大陸部では山地の間の低地に、島嶼部では海岸から内陸への高低差に注目します。広い地域を縮小すると小島や狭い沿岸平野は省略されるため、拡大と地点選択を併用してください。',
  waterDetail:'メコン川とトンレサップ湖、エーヤワディー川などを選び、地形との位置関係を確かめます。この地図の湖面は資料が表す概略の範囲です。雨季・乾季の広がりの変化や洪水の範囲は示しません。'
 },
 'south-central-asia':{
  terrain:'ヒマラヤ・パミールの高地から、平原と中央アジアの低地へ降りる。',
  water:'インダス・ガンジスの流路と、中央アジアの内陸の水系を比べる。',
  terrainDetail:'ネパールの山地から南の低地へ、短い距離で標高が変わることを見ます。中央アジアの山地と盆地、インド半島の高原も同じ色で比較できます。負の値は基準面より低い格子を表し、欠測の記号ではありません。海岸では海底を含む粗い格子が混じる場合があります。',
  waterDetail:'アムダリヤ川・シルダリヤ川などの位置と、乾燥した気候の広がりを比較します。アラル海を含む湖の輪郭は現在の水面の保証ではありません。流量、取水、季節、湖面の変動は別の資料が必要です。'
 }
};
export type AsiaPhysicalFocus={id:string;region:AsiaRegionId;country:string;name:string;coordinates:[number,number];reading:string};
export const asiaPhysicalFocus:AsiaPhysicalFocus[]=[
 {id:'tibetan-plateau',region:'east-asia',country:'CHN',name:'チベット高原',coordinates:[89,33],reading:'高原の格子の標高と、同じ場所の気候区分を比べます。高地の寒さと海からの距離を分けて考える入口になります。'},
 {id:'sichuan-basin',region:'east-asia',country:'CHN',name:'四川盆地',coordinates:[104.1,30.5],reading:'周囲の高地から盆地へ移動し、標高の変化と米の分布を比べます。盆地全体を一つの値で表しているわけではありません。'},
 {id:'north-china-plain',region:'east-asia',country:'CHN',name:'華北の平野',coordinates:[116,36],reading:'東部の低地の広がりを、黄河の流路と合わせて読みます。低地であることと、十分な水があることは別の条件です。'},
 {id:'tarim-basin',region:'east-asia',country:'CHN',name:'タリム盆地',coordinates:[83,40],reading:'盆地と周囲の山地の標高差を見てから気候図へ戻り、内陸の乾燥域を確認します。'},
 {id:'mongolian-plateau',region:'east-asia',country:'MNG',name:'モンゴルの高原',coordinates:[104,47],reading:'内陸の標高と、気候図が示す乾燥・冬の寒さを別々の情報として読み比べます。'},
 {id:'japan-alps',region:'east-asia',country:'JPN',name:'日本の中部山地',coordinates:[137.7,36.2],reading:'山地と周囲の盆地・沿岸の低地を拡大して比べます。広域格子では個々の山頂や谷底の高さは再現できません。'},
 {id:'korean-mountains',region:'east-asia',country:'KOR',name:'朝鮮半島の東部山地',coordinates:[128.4,37.4],reading:'東部の山地と西側の低地の距離を見ます。国境線と地形の境界が一致するとは限りません。'},
 {id:'taiwan-mountains',region:'east-asia',country:'TWN',name:'台湾の山地',coordinates:[121,23.7],reading:'島内の山地と西側の低地を同じ尺度で比べます。海岸の格子には陸地と海が混じる場合があります。'},
 {id:'mekong-delta',region:'southeast-asia',country:'VNM',name:'メコン川下流の低地',coordinates:[105.9,10.3],reading:'河川・低地・米の分布の重なりを確認します。地図上の近接は、洪水リスクや個々の圃場の取水量を示すものではありません。'},
 {id:'irrawaddy-delta',region:'southeast-asia',country:'MMR',name:'エーヤワディー川下流',coordinates:[95,17],reading:'下流の低地から上流側へ動かし、山地に囲まれた流路の位置を見ます。'},
 {id:'khorat-plateau',region:'southeast-asia',country:'THA',name:'コラート高原',coordinates:[103,16],reading:'大陸部の高原を、周囲の低地と比べます。標高と雨の季節性はそれぞれ別の地図で確認できます。'},
 {id:'sumatra-mountains',region:'southeast-asia',country:'IDN',name:'スマトラ島の山地',coordinates:[100.5,-.5],reading:'島の山地と低地を拡大して比べ、海岸から内陸への高低差を確かめます。'},
 {id:'java-island',region:'southeast-asia',country:'IDN',name:'ジャワ島',coordinates:[110.4,-7.4],reading:'狭い島の中の高低差を見ます。地形の色は地質や火山の活動状況を表しません。'},
 {id:'borneo-interior',region:'southeast-asia',country:'MYS',name:'ボルネオ島北部の内陸',coordinates:[116.5,5.3],reading:'内陸の山地と沿岸の低地の配置を比べます。森林の有無は地形色からは判断できません。'},
 {id:'luzon-island',region:'southeast-asia',country:'PHL',name:'ルソン島',coordinates:[121,15.9],reading:'山地と谷・平野の位置を見ます。島々の間は海であり、データの空白を陸続きの地形として結ばないでください。'},
 {id:'himalaya-nepal',region:'south-central-asia',country:'NPL',name:'ネパールのヒマラヤ',coordinates:[86.7,27.8],reading:'北の高地から南の低地へ移動し、500mごとの等高線の密度を比較します。選択値は山頂の公称標高ではありません。'},
 {id:'bengal-lowland',region:'south-central-asia',country:'BGD',name:'ベンガルの低地',coordinates:[89.9,23.5],reading:'河川と広い低地、米の分布を比べます。標高の小さな違いを読むには、この格子より詳しい現地資料が必要です。'},
 {id:'indus-lowland',region:'south-central-asia',country:'PAK',name:'インダス川の低地',coordinates:[69,27],reading:'乾燥した気候の中で、河川と農業の分布がどう重なるかを確かめます。灌漑の効果をこの位置関係だけで定量化することはできません。'},
 {id:'deccan-plateau',region:'south-central-asia',country:'IND',name:'デカン高原',coordinates:[77,17],reading:'半島の内陸と沿岸を比べ、標高と雨の季節差が異なる情報であることを確認します。'},
 {id:'pamir',region:'south-central-asia',country:'TJK',name:'パミールの高地',coordinates:[73,38],reading:'中央アジアの高地から西側の盆地へ移動し、地形と水系の位置関係を読みます。'},
 {id:'tian-shan',region:'south-central-asia',country:'KGZ',name:'天山山脈',coordinates:[76,42],reading:'山地の高さと、山地の間の湖・盆地を比べます。等高線は加工した広域格子から計算しています。'},
 {id:'kazakh-steppe',region:'south-central-asia',country:'KAZ',name:'カザフスタンの内陸',coordinates:[68,50],reading:'広い内陸の起伏を、南東側の山地と同じ色尺度で比較します。土地利用は標高だけからは決まりません。'},
 {id:'sri-lanka-highland',region:'south-central-asia',country:'LKA',name:'スリランカの中央高地',coordinates:[80.7,7],reading:'島の中央の高地から沿岸へ移動し、気候図と米の分布を見比べます。'}
];
