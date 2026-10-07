type ClimateSource = { label: string; url: string };
type ClimateGeography = { body: string; sources: ClimateSource[] };

const circulation = { label: 'Met Office：大気循環・偏西風・緯度', url: 'https://weather.metoffice.gov.uk/learn-about/weather/atmosphere/global-circulation-patterns' };
const pressure = { label: 'Met Office：高気圧・低気圧と雲', url: 'https://weather.metoffice.gov.uk/learn-about/weather/how-weather-works/high-and-low-pressure' };
const seaAndAltitude = { label: 'Météo-France：海からの距離・標高と気候（フランスの解説）', url: 'https://meteofrance.com/changement-climatique/le-climat-en-france-hexagonale-et-corse' };
const britishClimate = { label: 'Met Office：英国の大西洋・偏西風の影響', url: 'https://www.metoffice.gov.uk/research/climate/maps-and-data/regional-climates' };
const rain = { label: 'Met Office：山地での上昇と降水', url: 'https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/rain' };
const serbianClimate = { label: 'セルビア水文気象局：内陸・平原・寒気の流入', url: 'https://www.hidmet.gov.rs/eng/meteorologija/klimatologija_srbije.php' };
const finnishSeasons = { label: 'フィンランド気象研究所：高緯度の季節と海の作用', url: 'https://en.ilmatieteenlaitos.fi/seasons-in-finland' };
const icelandicClimate = { label: 'アイスランド気象局：海流・海洋性の空気と北極の空気', url: 'https://en.vedur.is/climatology/iceland/nr/1268' };
const portugueseClimate = { label: 'IPMA：ポルトガルの夏の乾燥と海沿いの気候', url: 'https://www.ipma.pt/en/oclima/normais.clima/' };

/** Physical background, interpreted at the recorded city location; not a
 * station-level attribution study or a new calculation of Köppen classes. */
export const climateGeographyScope = '地理的な背景は、原典の広域説明・一般的な気候の仕組みと都市の位置から整理した読み方です。観測所ごとの因果分析や気候区分の再判定ではありません。';

export const cityClimateGeography: Record<string, ClimateGeography> = {
  london: {
    body: '大西洋から偏西風が湿った空気を運びます。海は陸地より温まりにくく冷えにくいため、冬の寒さと夏の暑さを和らげます。',
    sources: [britishClimate, circulation, seaAndAltitude],
  },
  paris: {
    body: '大西洋から西寄りの風が届きますが、海岸から離れたパリ盆地では海の作用が弱まり、沿岸より冬と夏の寒暖差が大きくなります。',
    sources: [seaAndAltitude, circulation],
  },
  berlin: {
    body: '大西洋からの偏西風が届く一方、ベルリンは内陸です。海が気温を和らげる作用が沿岸より弱く、大陸側の寒気の影響も受けます。',
    sources: [circulation, seaAndAltitude],
  },
  warsaw: {
    body: '北緯52度の内陸にあり、大西洋が気温を和らげる作用は西欧沿岸より弱くなります。偏西風と東側の大陸の空気の間で寒暖が変わります。',
    sources: [circulation, seaAndAltitude],
  },
  kyiv: {
    body: '大西洋から離れた内陸では、海が気温を和らげる作用が弱くなります。陸地が夏に温まり冬に冷えるため、季節の寒暖差が大きくなります。',
    sources: [seaAndAltitude, circulation],
  },
  minsk: {
    body: '北緯54度近くの内陸にあり、冬の日射が弱くなります。海が気温を和らげる作用も沿岸より小さく、冬の冷え込みが強まりやすい位置です。',
    sources: [circulation, seaAndAltitude],
  },
  chisinau: {
    body: '黒海沿岸から離れた内陸にあり、海が寒暖差を和らげる作用は小さくなります。夏に温まり冬に冷える陸地の影響が強まります。',
    sources: [seaAndAltitude],
  },
  moscow: {
    body: '北緯56度近くで冬の日射が弱いうえ、大西洋から遠い内陸です。海が気温を和らげる作用が小さく、冬の冷え込みと季節の寒暖差が強まります。',
    sources: [circulation, seaAndAltitude],
  },
  belgrade: {
    body: '海から離れたパンノニア平原の南縁にあり、陸地の季節的な加熱・冷却が効きます。北へ続く平原と河谷は寒気が南下する通り道にもなります。',
    sources: [serbianClimate],
  },
  bucharest: {
    body: 'カルパチア山地の南の内陸平原にあり、海が寒暖差を和らげる作用は沿岸より弱くなります。陸地の加熱・冷却が夏冬の気温差を強めます。',
    sources: [seaAndAltitude, circulation],
  },
  sofia: {
    body: '海から離れた高い内陸盆地にあります。海が気温を和らげる作用が弱く、標高の高さも気温を下げるため、南欧の海岸とは冬の寒さが異なります。',
    sources: [seaAndAltitude],
  },
  budapest: {
    body: '海から離れたパンノニア盆地では、海が気温を和らげる作用が弱くなります。陸地が夏に温まり冬に冷えることが、季節の寒暖差を強めます。',
    sources: [seaAndAltitude, serbianClimate],
  },
  vienna: {
    body: 'アルプス東端の内陸にあり、偏西風で届く海洋の空気と大陸の空気の両方を受けます。海岸より海の作用が弱く、季節の寒暖差が強まります。',
    sources: [circulation, seaAndAltitude],
  },
  zurich: {
    body: 'アルプス北側の内陸にあり、偏西風で湿った空気が届きます。海が寒暖差を和らげる作用は沿岸より弱く、標高の高さも気温を下げます。',
    sources: [circulation, seaAndAltitude],
  },
  madrid: {
    body: '海から離れた高いメセタの台地では、海の作用が弱く、標高も気温を下げます。夏は亜熱帯高気圧の下降する空気が雨雲の発達を抑えます。',
    sources: [seaAndAltitude, circulation, pressure],
  },
  lisbon: {
    body: '大西洋沿岸では海が冬夏の気温差を和らげます。一方、夏は亜熱帯高気圧の下降する空気が雲の発達を抑え、海に近くても乾燥しやすくなります。',
    sources: [portugueseClimate, seaAndAltitude, circulation, pressure],
  },
  rome: {
    body: '地中海側の海に近く、海が冬の冷え込みを和らげます。夏は亜熱帯高気圧の下降する空気が雨雲を抑え、冬は低気圧が雨をもたらしやすくなります。',
    sources: [seaAndAltitude, circulation, pressure],
  },
  athens: {
    body: 'エーゲ海に近く海が冬の冷え込みを和らげます。夏は亜熱帯高気圧の下降する空気が雨雲の発達を抑えます。欠測の降水値はこの説明から補いません。',
    sources: [seaAndAltitude, circulation, pressure],
  },
  reykjavik: {
    body: '北極圏に近い高緯度ですが、西岸の海流と海洋の空気が冬の寒さを和らげます。暖かな大西洋の空気と北極の冷気の接触は天候を変わりやすくします。',
    sources: [icelandicClimate],
  },
  bergen: {
    body: '大西洋から届く湿った空気が西岸の山地で持ち上げられ、冷えて雨を生みやすくなります。海に近い位置は冬の寒さを和らげます。',
    sources: [circulation, rain, seaAndAltitude],
  },
  oslo: {
    body: 'スカンディナヴィア山地の東側にあり、大西洋に直接面する西岸とは位置が異なります。海が気温を和らげる作用が弱まり、内陸側の寒さが強まります。',
    sources: [seaAndAltitude],
  },
  visby: {
    body: 'バルト海のゴトランド島では、ゆっくり温まり冷える海が季節の気温変化を和らげます。高緯度の冬の弱い日射と、島の海洋の作用を合わせて読みます。',
    sources: [finnishSeasons, circulation],
  },
  helsinki: {
    body: '高緯度で冬の日照時間が短くなりますが、フィンランド湾の海は冷えるのが遅く、沿岸の冬の始まりや最寒期を内陸より遅らせます。',
    sources: [finnishSeasons, circulation],
  },
  tallinn: {
    body: 'フィンランド湾の南岸にあり、海が季節の気温変化を和らげます。一方、高緯度の冬は日射が弱いため、海沿いでも冬の寒さがなくなるわけではありません。',
    sources: [finnishSeasons, circulation],
  },
};
