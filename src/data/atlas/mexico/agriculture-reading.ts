export const agricultureSources = {
  census: 'https://www.inegi.org.mx/programas/ca/2022/',
  irrigation: 'https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_11.xlsx',
  maize: 'https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_agr02.xlsx',
  autumnWinter: 'https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_agr04.xlsx',
  pine: 'https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for15.xlsx',
  cattle: 'https://www.inegi.org.mx/contenidos/programas/ca/2022/datosabiertos/ca_2022_upagro_csv.zip',
  cattleDefinition: 'https://www.inegi.org.mx/contenidos/programas/ca/2022/doc/ca2022_rdnal.pdf',
  woodUses: 'https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for18.xlsx',
  temperateForest: 'https://www.biodiversidad.gob.mx/ecosistemas/bosqueTemplado',
  maizeFoodChain: 'https://www.gob.mx/agricultura/articulos/del-campo-al-comal-el-proceso-de-hacer-tortillas-de-maiz?idiom=es',
  licence: 'https://www.inegi.org.mx/inegi/terminos.html',
};
export const agricultureReading = {
  cattle:{
    title:'牛の飼養頭数を、州ごとに読み分ける',
    takeaway:'牛の頭数は州によって異なります。飼養する場所の面積や、肉・乳の生産量とは別の指標です。',
    steps:[
      {title:'何を数えているか',body:'2022年9月の牛の飼養頭数です。農業生産単位と住宅で飼養する牛を合わせています。円は州合計を示し、飼養域の位置を示しません。',source:agricultureSources.cattleDefinition},
      {title:'数量と生産を分けて読む',body:'牛は肉や乳の生産につながりますが、頭数だけから州の生産量や飼養方法は分かりません。気候の分布と比べるときも、頭数と飼養の条件を区別します。',source:'https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2025/EAP_Ganaderia.pdf'},
    ],
  },
  maize: {
    title: '主食の原料を、灌漑農業が支える',
    takeaway: '白粒の生産は太平洋側のシナロアに集中。灌漑率と秋冬作を重ねて読む。',
    steps: [
      {title: '自然条件と作期', body: '北西部の雨の少ない季節に、作物へ水を届ける灌漑が栽培を支えます。シナロアの秋冬作の白粒生産は400.3万tで、その99.7%が灌漑による生産です。', source: agricultureSources.autumnWinter},
      {title: '耕作から主食へ', body: '白粒トウモロコシはトルティーヤの原料になります。収穫した穀粒を乾燥・貯蔵し、集荷と輸送で製粉や生地づくりへつなぎ、販売店を通して食卓へ届けます。', source: agricultureSources.maizeFoodChain},
      {title: '水と市場へのつながり', body: '灌漑によって雨の季節だけに頼らず耕作するには、用水の確保が条件になります。地図の生産量から、農地の広さ・水の供給・加工と市場への輸送を順に考えます。', source: agricultureSources.irrigation},
    ],
  },
  irrigation: {
    title: '乾燥する北西部で、耕作が成立する条件',
    takeaway: '北西部は灌漑農地の割合が高い。用水が雨の少ない季節の耕作を支える。',
    steps: [
      {title: '雨に頼る農地と、水を届ける農地', body: '灌漑農地率は、農業用地に占める灌漑面積の割合です。ソノラ84.7%、バハ・カリフォルニア84.9%、シナロア68.9%。乾燥気候の分布と比べると、農業が成立する水の条件を読み取れます。', source: agricultureSources.irrigation},
      {title: '秋冬作との対応', body: 'シナロアの秋冬作では、白粒トウモロコシ生産量の99.7%が灌漑によります。農地の割合68.9%と生産量の割合99.7%は、分母が違います。', source: agricultureSources.autumnWinter},
      {title: '生産量と合わせて読む', body: 'バハ・カリフォルニア・スルは灌漑率99.7%、白粒生産3.1万t。シナロアは68.9%、745.1万tです。割合と生産規模を分けて、農地の面積、作物と作期、市場への輸送を考えます。', source: agricultureSources.maize},
    ],
  },
  pine: {
    title: '冷涼な山地の森林資源が、松材利用につながる',
    takeaway: 'ドゥランゴとチワワで全国の松材取得量の79.4%。山地の温帯林とつなげて読む。',
    steps: [
      {title: '山地の松・オーク林', body: '西シエラマドレなどの冷涼な山地には、松やオークを中心とする温帯林が分布します。ドゥランゴとチワワの松材取得の集中を、木材資源の分布と結び付けて読めます。', source: agricultureSources.temperateForest},
      {title: '取得した木材の利用', body: '松材の取得量は、参照期間に林業生産単位が取得した木材の体積です。取得した木材は、丸太や製材原料などとして加工や市場へつながります。', source: agricultureSources.woodUses},
      {title: '木材供給と森林の機能', body: '森林は木材を供給し、水の浸透、侵食の抑制、生物の生息地も支えます。取得量に加えて、森林の変化と管理方法を調べると、木材利用とこうした機能の関係を考えられます。', source: agricultureSources.temperateForest},
    ],
  },
};
