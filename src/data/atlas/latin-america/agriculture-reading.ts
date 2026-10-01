export type LatinAgricultureLayer = 'bana'|'coff'|'soyb'|'cattle';
export const latinAgricultureReading = {
 bana: {
  title:'熱帯のバナナを市場へ運ぶ',
  takeaway:'暖かく水分の多い低地にバナナ産地が広がり、包装・海上輸送を通じて海外市場へつながる。',
  compare:'バナナの収穫面積と気候を比べ、熱帯のどこに産地が集まるか読む',
  steps:[['自然条件','バナナは低温に弱く、生育には暖かさ、水分、排水のよい土壌が必要。中米・カリブでは低地の農園が代表的な産地となる。'],['生産と市場','コスタリカの産地では収穫後の選別・包装と港への輸送が輸出を支える。生果実を海外へ届けるため、畑から市場までの品質管理が重要になる。'],['暮らしへの影響','農園の仕事は加工・運輸へ広がる。強風、洪水、干ばつや病害で収穫が減ると、輸出の供給と農家の所得にも影響する。']],
  examples:[{place:'CRI',label:'中米：コスタリカ',text:'バナナの産地分布と熱帯の気候を比べ、農園から海外市場へつながる道筋を読む。'},{place:'DOM',label:'カリブ：ドミニカ共和国',text:'バナナはカリブの輸出作物でもある。島の産地はハリケーンや降雨の変動・干ばつの影響を受ける。'}],
  sources:[{label:'FAO Ecocrop：バナナの生育条件（基礎資料）',url:'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=7848',period:'生育条件データベース。国別収量の資料ではない。'},{label:'FAO：収穫後の果実の品質管理と包装・輸送',url:'https://www.fao.org/4/y4358e/y4358e05.htm',period:'収穫・包装・輸送の基礎資料。'},{label:'FAO/OECD：農業見通し2024–2033・バナナの2023年市場動向',url:'https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/07/oecd-fao-agricultural-outlook-2024-2033_e173f332/4c5d2cfb-en.pdf',period:'2024年公表、2023年の気象による輸出供給への影響。将来予測値は使用しない。'}],
 },
 coff: {
  title:'中米の高地とコーヒー',
  takeaway:'熱帯でも高地は低地より涼しく、アラビカの産地が農家・加工場・輸出市場を結ぶ。',
  compare:'アラビカの収穫面積と気候を比べ、中米高地の産地を読む',
  steps:[['自然条件','ホンジュラスなどの熱帯の山地では高度によって気温が下がる。高地の条件を生かしたアラビカ栽培が広がり、低地のバナナとは異なる分布になる。'],['生産と市場','小規模農家が育てた実は、果肉の除去・乾燥などを経て生豆となり、集荷・輸出を通じて消費国へ送られる。高地の品質を生かすことが農家の収入につながる。'],['社会への影響','ホンジュラスやグアテマラではコーヒーが農村の暮らしと輸出を支える。生産費や気候の変化に加え、産地の記録と流通の追跡を整える仕事も重要になる。']],
  examples:[{place:'HND',label:'中米：ホンジュラス',text:'高地のアラビカと小規模農家の暮らしを、分布と輸出へのつながりから読む。'},{place:'CRI',label:'中米：コスタリカ',text:'同じ国でも低地のバナナと高地のアラビカでは、栽培する自然条件と産地が異なる。'},{place:'COL',label:'南米：コロンビア',text:'アンデスの山麓・斜面の産地を中米高地と比べる。'}],
  sources:[{label:'USDA FAS：ホンジュラス Coffee Annual 2025',url:'https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Coffee+Annual_Tegucigalpa_Honduras_HO2025-0002.pdf',period:'2025年。高地の特色・品質の解説に使用。年度予測を2024暦年値に混ぜない。'},{label:'FAO：ホンジュラス・グアテマラのコーヒー農家と市場',url:'https://www.fao.org/investment-centre/latest/news/detail/change-is-brewing-for-sustainable-eu-coffee-from-honduras-and-guatemala/en',period:'2024年5月21日。小規模農家と流通の追跡に関する背景。法規の現行施行日には使用しない。'}],
 },
 soyb: {
  title:'セラードの大豆と土壌改良',
  takeaway:'雨季に育てる大豆は、土壌改良と大規模な畑作、港までの輸送によって生産地域を広げた。',
  compare:'大豆の収穫面積と気候を比べ、雨季・乾季のある内陸の産地を読む',
  steps:[['自然条件','ブラジル中西部のセラードは雨季と乾季があり、大豆は雨の多い時期に育てる。強い酸性や養分不足の土壌は石灰による改良や施肥が必要となる。'],['技術と生産','広い土地の利用に土壌改良・品種・機械化が加わり、大規模な畑作地域が形成された。地図では中西部だけでなく南部の産地も確認できる。'],['市場と影響','大豆は食用油と家畜用飼料の原料となる。内陸の産地と輸出港を道路などで結び、収穫期の運送や港の混雑が生産者と地域社会に影響する。']],
  examples:[{place:'BRA',label:'南米：ブラジル',text:'セラードの雨季・乾季と土壌改良、内陸から港への輸送を結びつける。'},{place:'ARG',label:'南米：アルゼンチン',text:'ブラジルの内陸産地と南米南部の穀物地帯を、同じ収穫面積の凡例で比べる。'}],
  sources:[{label:'Embrapa：大豆の土壌改良と施肥',url:'https://www.embrapa.br/en/busca-de-publicacoes/-/publicacao/551684/correcao-do-solo-e-adubacao-da-cultura-da-soja',period:'土壌条件と技術の基礎資料。'},{label:'IBGE：市町村農業生産調査 PAM 2023',url:'https://biblioteca.ibge.gov.br/visualizacao/periodicos/66/pam_2023_v50_br_informativo.pdf',period:'2023年、2024年公表。大豆地域と港への物流の背景。'}],
 },
 cattle: {
  title:'草地・牧草から肉と乳へ',
  takeaway:'南米の草地とカリブの牧草利用が牛の飼育を支え、食肉・乳製品の加工と市場につながる。',
  compare:'牛の密度と気候を比べ、草地・牧草の育つ条件と飼育分布を読む',
  steps:[['自然条件','ウルグアイでは天然の草地が飼料の基盤となる。草の生育は季節や雨によって変わり、その量に合わせた放牧が必要になる。'],['生産と市場','牛の飼育は肉と乳の生産に分かれ、食肉加工や乳製品製造、保冷輸送を通じて国内外の市場へつながる。頭数・密度と製品の生産量はそれぞれ別の尺度で読む。'],['地域への影響','ドミニカ共和国でも牧草・飼料の管理が牛乳生産と家族経営を支える。草地の改善や放牧の調整は農家の所得、土地の劣化、温室効果ガスの排出にも関わる。']],
  examples:[{place:'URY',label:'南米：ウルグアイ',text:'天然草地の季節変化と放牧、食肉加工・輸出をつなぐ。'},{place:'DOM',label:'カリブ：ドミニカ共和国',text:'牧草・飼料管理から牛乳生産と農家の暮らしへのつながりを読む。'},{place:'BRA',label:'南米：ブラジル',text:'牛の分布と大豆の産地を切り替え、畜産と飼料作物の広がりを読む。'}],
  sources:[{label:'ウルグアイ農牧省：Ganadería y Clima',url:'https://www.gub.uy/ministerio-ganaderia-agricultura-pesca/ganaderia-y-clima',period:'天然草地と季節的な飼料供給・放牧管理。'},{label:'Uruguay XXI：畜産部門報告2024',url:'https://www.uruguayxxi.gub.uy/es/centro-informacion/articulo/informe-sector-ganadero-2024/',period:'2024年報告。加工・運輸・国際市場とのつながり。'},{label:'FAO：中南米・カリブの持続可能な畜産',url:'https://www.fao.org/americas/regional-initiatives/top-pages/sustainable-livestock-farming-in-latin-america-and-the-caribbean/es',period:'ウルグアイとドミニカ共和国の牧草管理の事例。プロジェクト効果の割合を国全体に当てはめない。'}],
 },
} satisfies Record<LatinAgricultureLayer,{title:string,takeaway:string,compare:string,steps:string[][],examples:{place:string,label:string,text:string}[],sources:{label:string,url:string,period:string}[]}>;
