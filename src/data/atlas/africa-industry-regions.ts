import type {AfricaIndustryLocation} from './africa-industry-locations.ts';

/** Source-named regions, rounded editorial coordinates, not facility boundaries. */
export const africaIndustryAdditionalLocations:readonly Omit<AfricaIndustryLocation,'scope'>[]=[
 {
  "id": "angola-offshore-oil",
  "label": "原油：アンゴラ沖合",
  "mapLabel": "原油：アンゴラ沖合",
  "kind": "energy",
  "coordinates": [
   11.6,
   -7.7
  ],
  "title": "アンゴラ沖合の原油",
  "reading": "アンゴラでは原油生産の多くが沖合に立地します。海底の堆積盆地と大型の海上設備が採掘を支え、原油の生産と国内向け製油能力は別の段階です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "米国ITA・アンゴラ石油ガス（2022）",
    "url": "https://www.trade.gov/country-commercial-guides/angola-oil-and-gas"
   }
  ],
  "commodityIds": [
   "oil"
  ],
  "countryCodes": [
   "AGO"
  ],
  "evidencePeriod": "2022",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "soyo-gas",
  "label": "ガス加工：ソヨ",
  "mapLabel": "ガス加工：ソヨ",
  "kind": "energy",
  "coordinates": [
   12.4,
   -6.1
  ],
  "title": "ソヨのガス加工",
  "reading": "沖合油田の随伴ガスをソヨのLNG施設で加工・積出しします。ガスの採掘地点ではなく、油田と港湾を結ぶ加工拠点です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "米国ITA・アンゴラ石油ガス（2022）",
    "url": "https://www.trade.gov/country-commercial-guides/angola-oil-and-gas"
   }
  ],
  "commodityIds": [
   "gas"
  ],
  "countryCodes": [
   "AGO"
  ],
  "evidencePeriod": "2022",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "mpumalanga-coal",
  "label": "石炭：ムプマランガ",
  "mapLabel": "石炭：ムプマランガ",
  "kind": "energy",
  "coordinates": [
   29.8,
   -26.0
  ],
  "title": "ムプマランガの石炭",
  "reading": "南アフリカ東部のムプマランガには石炭採掘地域があります。発電燃料の供給を担う一方、農地や水利用との競合も生じます。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "世界銀行・南部アフリカ鉱業（2019、p.65）",
    "url": "https://documents1.worldbank.org/curated/en/506751562777260359/pdf/Digging-Beneath-the-Surface-An-Exploration-of-the-Net-Benefits-of-Mining-in-Southern-Africa.pdf"
   }
  ],
  "commodityIds": [
   "coal"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2019",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "rossing-uranium",
  "label": "ウラン：レッシング",
  "mapLabel": "ウラン：レッシング",
  "kind": "energy",
  "coordinates": [
   15.3,
   -22.5
  ],
  "title": "レッシングのウラン",
  "reading": "ナミブ砂漠内陸のウラン生産地です。2024年の資料表では2,205 tUの生産が記録されています。乾燥地域の採掘には水と電力の確保が必要です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。記載数量の対象年と鉱山・企業の範囲を保ち、点の大小に換算しません。",
  "sources": [
   {
    "label": "World Nuclear Association・ナミビアのウラン2024年表",
    "url": "https://world-nuclear.org/information-library/country-profiles/countries-g-n/namibia"
   }
  ],
  "commodityIds": [
   "uranium"
  ],
  "countryCodes": [
   "NAM"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "husab-uranium",
  "label": "ウラン：フサブ",
  "mapLabel": "ウラン：フサブ",
  "kind": "energy",
  "coordinates": [
   15.2,
   -22.6
  ],
  "title": "フサブのウラン",
  "reading": "ナミブ砂漠内陸のウラン生産地です。2024年の資料表では4,437 tUの生産が記録されています。乾燥地域の採掘には水と電力の確保が必要です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。記載数量の対象年と鉱山・企業の範囲を保ち、点の大小に換算しません。",
  "sources": [
   {
    "label": "World Nuclear Association・ナミビアのウラン2024年表",
    "url": "https://world-nuclear.org/information-library/country-profiles/countries-g-n/namibia"
   }
  ],
  "commodityIds": [
   "uranium"
  ],
  "countryCodes": [
   "NAM"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "langer-heinrich-uranium",
  "label": "ウラン：ランガー・ハインリヒ",
  "mapLabel": "ウラン：ランガー・ハインリヒ",
  "kind": "energy",
  "coordinates": [
   15.3,
   -22.8
  ],
  "title": "ランガー・ハインリヒのウラン",
  "reading": "ナミブ砂漠内陸のウラン生産地です。2024年の資料表では691 tUの生産が記録されています。乾燥地域の採掘には水と電力の確保が必要です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。記載数量の対象年と鉱山・企業の範囲を保ち、点の大小に換算しません。",
  "sources": [
   {
    "label": "World Nuclear Association・ナミビアのウラン2024年表",
    "url": "https://world-nuclear.org/information-library/country-profiles/countries-g-n/namibia"
   }
  ],
  "commodityIds": [
   "uranium"
  ],
  "countryCodes": [
   "NAM"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "arlit-uranium",
  "label": "ウラン：アルリット",
  "mapLabel": "ウラン：アルリット",
  "kind": "energy",
  "coordinates": [
   7.4,
   18.7
  ],
  "title": "アルリットのウラン",
  "reading": "サハラ南縁のアルリット周辺でウランを採掘します。2024年SOMAIR生産表は960 tU。2023年以降の輸出停止や運営変更は、生産記録と分けて読む必要があります。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。記載数量の対象年と鉱山・企業の範囲を保ち、点の大小に換算しません。",
  "sources": [
   {
    "label": "World Nuclear Association・ニジェールのウラン2024年表",
    "url": "https://world-nuclear.org/information-library/country-profiles/countries-g-n/niger"
   }
  ],
  "commodityIds": [
   "uranium"
  ],
  "countryCodes": [
   "NER"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "boke-bauxite",
  "label": "ボーキサイト：ボケ",
  "mapLabel": "ボーキサイト：ボケ",
  "kind": "metals",
  "coordinates": [
   -14.3,
   10.9
  ],
  "title": "ボケのボーキサイト",
  "reading": "ギニア北西部のボケ周辺はボーキサイト採掘地域です。USGSの2024年全国値は世界生産の33.2%（米国を除く）で、ボケ単独の比率ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・ギニア2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/guinea"
   }
  ],
  "commodityIds": [
   "bauxite-iron"
  ],
  "countryCodes": [
   "GIN"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "sishen-iron",
  "label": "鉄鉱石：シシェン",
  "mapLabel": "鉄鉱石：シシェン",
  "kind": "metals",
  "coordinates": [
   23.0,
   -27.8
  ],
  "title": "シシェンの鉄鉱石",
  "reading": "北ケープの鉄鉱石は採掘・選鉱の後、鉄鋼原料となります。内陸の鉱山と西岸サルダニャ湾への輸送を結ぶ産業です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Kumba・北ケープの操業地域（2026年10月確認）",
    "url": "https://www.angloamericankumba.com/our-business/operations"
   }
  ],
  "commodityIds": [
   "bauxite-iron"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "kolomela-iron",
  "label": "鉄鉱石：コロメラ",
  "mapLabel": "鉄鉱石：コロメラ",
  "kind": "metals",
  "coordinates": [
   23.1,
   -28.4
  ],
  "title": "コロメラの鉄鉱石",
  "reading": "北ケープの鉄鉱石は採掘・選鉱の後、鉄鋼原料となります。内陸の鉱山と西岸サルダニャ湾への輸送を結ぶ産業です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Kumba・北ケープの操業地域（2026年10月確認）",
    "url": "https://www.angloamericankumba.com/our-business/operations"
   }
  ],
  "commodityIds": [
   "bauxite-iron"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "zimplats-pgm",
  "label": "白金族：セルース",
  "mapLabel": "白金族：セルース",
  "kind": "metals",
  "coordinates": [
   30.5,
   -18.1
  ],
  "title": "セルースの白金族",
  "reading": "グレート・ダイクの白金族採掘・処理地域です。USGSの2024年全国値は世界の白金生産の10.3%で、個別地域の量ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・ジンバブエ2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/zimbabwe"
   }
  ],
  "commodityIds": [
   "pgm-chromium"
  ],
  "countryCodes": [
   "ZWE"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "mimosa-pgm",
  "label": "白金族：ズビシャバネ",
  "mapLabel": "白金族：ズビシャバネ",
  "kind": "metals",
  "coordinates": [
   30.0,
   -20.3
  ],
  "title": "ズビシャバネの白金族",
  "reading": "グレート・ダイクの白金族採掘・処理地域です。USGSの2024年全国値は世界の白金生産の10.3%で、個別地域の量ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・ジンバブエ2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/zimbabwe"
   }
  ],
  "commodityIds": [
   "pgm-chromium"
  ],
  "countryCodes": [
   "ZWE"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "unki-pgm",
  "label": "白金族：シュルグウィ",
  "mapLabel": "白金族：シュルグウィ",
  "kind": "metals",
  "coordinates": [
   30.0,
   -19.7
  ],
  "title": "シュルグウィの白金族",
  "reading": "グレート・ダイクの白金族採掘・処理地域です。USGSの2024年全国値は世界の白金生産の10.3%で、個別地域の量ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・ジンバブエ2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/zimbabwe"
   }
  ],
  "commodityIds": [
   "pgm-chromium"
  ],
  "countryCodes": [
   "ZWE"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "moanda-manganese",
  "label": "マンガン：モアンダ",
  "mapLabel": "マンガン：モアンダ",
  "kind": "metals",
  "coordinates": [
   13.2,
   -1.6
  ],
  "title": "モアンダのマンガン",
  "reading": "バンゴンベとオクマの鉱床でマンガン鉱石を採掘し、モアンダの処理施設と鉄道・港を結びます。主な用途は鉄鋼で、採掘と合金加工は別の場所でも行われます。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Eramet・モアンダのマンガン生産",
    "url": "https://www.eramet.com/en/activities/products/manganese/"
   }
  ],
  "commodityIds": [
   "manganese"
  ],
  "countryCodes": [
   "GAB"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "arcadia-lithium",
  "label": "リチウム：アルカディア",
  "mapLabel": "リチウム：アルカディア",
  "kind": "metals",
  "coordinates": [
   31.4,
   -17.8
  ],
  "title": "アルカディアのリチウム",
  "reading": "ジンバブエのペグマタイトに伴うリチウム採掘・濃縮地域です。2023〜2024年の操業・設備拡充が資料に挙げられ、2024年全国値は世界生産の9.0%（米国を除く）です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・ジンバブエ2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/zimbabwe"
   }
  ],
  "commodityIds": [
   "lithium"
  ],
  "countryCodes": [
   "ZWE"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "bikita-lithium",
  "label": "リチウム：ビキタ",
  "mapLabel": "リチウム：ビキタ",
  "kind": "metals",
  "coordinates": [
   31.5,
   -20.1
  ],
  "title": "ビキタのリチウム",
  "reading": "ジンバブエのペグマタイトに伴うリチウム採掘・濃縮地域です。2023〜2024年の操業・設備拡充が資料に挙げられ、2024年全国値は世界生産の9.0%（米国を除く）です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・ジンバブエ2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/zimbabwe"
   }
  ],
  "commodityIds": [
   "lithium"
  ],
  "countryCodes": [
   "ZWE"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "kamativi-lithium",
  "label": "リチウム：カマティビ",
  "mapLabel": "リチウム：カマティビ",
  "kind": "metals",
  "coordinates": [
   27.1,
   -18.3
  ],
  "title": "カマティビのリチウム",
  "reading": "ジンバブエのペグマタイトに伴うリチウム採掘・濃縮地域です。2023〜2024年の操業・設備拡充が資料に挙げられ、2024年全国値は世界生産の9.0%（米国を除く）です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・ジンバブエ2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/zimbabwe"
   }
  ],
  "commodityIds": [
   "lithium"
  ],
  "countryCodes": [
   "ZWE"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "bisie-tin",
  "label": "スズ：ビシエ",
  "mapLabel": "スズ：ビシエ",
  "kind": "metals",
  "coordinates": [
   27.7,
   -1.0
  ],
  "title": "ビシエのスズ",
  "reading": "コンゴ東部のビシエではMpama North・Southを採掘し、スズを濃縮します。企業公表の両鉱山合計は年間約2万tの含有スズです。数量はコンゴ全国やタンタルの量ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。記載数量の対象年と鉱山・企業の範囲を保ち、点の大小に換算しません。",
  "sources": [
   {
    "label": "Alphamin・ビシエのスズ操業",
    "url": "https://www.alphaminresources.com/operations/"
   }
  ],
  "commodityIds": [
   "tantalum-tin"
  ],
  "countryCodes": [
   "COD"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "mozambique-tantalum",
  "label": "タンタル：モザンビーク全国",
  "mapLabel": "タンタル：モザンビーク全国",
  "kind": "metals",
  "coordinates": [
   37.8,
   -13.9
  ],
  "title": "モザンビーク全国のタンタル",
  "reading": "USGSは2024年のモザンビークを世界タンタル生産の2%としています。取得資料では採掘地域を特定できないため、全国資料の代表位置を示しています。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・モザンビーク2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/mozambique"
   }
  ],
  "commodityIds": [
   "tantalum-tin"
  ],
  "countryCodes": [
   "MOZ"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "country"
 },
 {
  "id": "molo-graphite",
  "label": "黒鉛：モロ",
  "mapLabel": "黒鉛：モロ",
  "kind": "metals",
  "coordinates": [
   45.0,
   -24.0
  ],
  "title": "モロの黒鉛",
  "reading": "マダガスカル南西部のモロでは2024年に黒鉛の商業出荷が始まりました。全国の黒鉛生産は世界の5%とされますが、この地点の量には置き換えません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・マダガスカル2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/madagascar"
   }
  ],
  "commodityIds": [
   "graphite"
  ],
  "countryCodes": [
   "MDG"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "balama-graphite",
  "label": "黒鉛：バラマ",
  "mapLabel": "黒鉛：バラマ",
  "kind": "metals",
  "coordinates": [
   38.7,
   -13.3
  ],
  "title": "バラマの黒鉛",
  "reading": "2024年は間欠的に黒鉛を生産し、12月には立入りを妨げる抗議・混乱で停止しました。資料時点の休止産地であり、現在の稼働地として表示しません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "USGS・モザンビーク2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/mozambique"
   }
  ],
  "commodityIds": [
   "graphite"
  ],
  "countryCodes": [
   "MOZ"
  ],
  "evidencePeriod": "2024年末",
  "status": "paused",
  "geographicScope": "region"
 },
 {
  "id": "phalaborwa-rare-earth",
  "label": "レアアース開発：ファラボルワ",
  "mapLabel": "レアアース開発：ファラボルワ",
  "kind": "metals",
  "coordinates": [
   31.1,
   -24.0
  ],
  "title": "ファラボルワのレアアース開発",
  "reading": "過去のリン酸製造で残ったリン石膏からレアアースを回収する開発計画です。商業生産地ではありません。鉱物資源量を年間産出量に置き換えません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Rainbow Rare Earths・ファラボルワ開発計画",
    "url": "https://www.rainbowrareearths.com/project/phalaborwa/"
   }
  ],
  "commodityIds": [
   "rare-earth"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "development",
  "geographicScope": "region"
 },
 {
  "id": "gakara-rare-earth",
  "label": "レアアース休止：ガカラ",
  "mapLabel": "レアアース休止：ガカラ",
  "kind": "metals",
  "coordinates": [
   29.4,
   -3.6
  ],
  "title": "ガカラのレアアース休止",
  "reading": "ブジュンブラ南南東のレアアース産地は2021年に操業を停止し、2025年も保守管理状態です。稼働中の商業生産地と区別します。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Rainbow Rare Earths・ガカラ休止状況（2025）",
    "url": "https://www.rainbowrareearths.com/project/gakara/"
   }
  ],
  "commodityIds": [
   "rare-earth"
  ],
  "countryCodes": [
   "BDI"
  ],
  "evidencePeriod": "2025",
  "status": "paused",
  "geographicScope": "region"
 },
 {
  "id": "obuasi-gold",
  "label": "金：オブアシ",
  "mapLabel": "金：オブアシ",
  "kind": "metals",
  "coordinates": [
   -1.7,
   6.2
  ],
  "title": "オブアシの金",
  "reading": "ガーナのアシャンティ地域で主に地下採掘を行います。企業の2025年金生産は26.6万オンスで、埋蔵量とは別の年間量です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。記載数量の対象年と鉱山・企業の範囲を保ち、点の大小に換算しません。",
  "sources": [
   {
    "label": "AngloGold Ashanti・オブアシ2025年操業",
    "url": "https://www.anglogoldashanti.com/portfolio/africa/obuasi/"
   }
  ],
  "commodityIds": [
   "gold"
  ],
  "countryCodes": [
   "GHA"
  ],
  "evidencePeriod": "2025",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "geita-gold",
  "label": "金：ゲイタ",
  "mapLabel": "金：ゲイタ",
  "kind": "metals",
  "coordinates": [
   32.2,
   -2.9
  ],
  "title": "ゲイタの金",
  "reading": "ビクトリア湖西側の緑色岩帯で露天・地下採掘を行います。企業の2025年金生産は49.2万オンス。タンザニア全国の量ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。記載数量の対象年と鉱山・企業の範囲を保ち、点の大小に換算しません。",
  "sources": [
   {
    "label": "AngloGold Ashanti・ゲイタ2025年操業",
    "url": "https://www.anglogoldashanti.com/portfolio/africa/geita/"
   }
  ],
  "commodityIds": [
   "gold"
  ],
  "countryCodes": [
   "TZA"
  ],
  "evidencePeriod": "2025",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "loulo-gounkoto-gold",
  "label": "金：ルーロ＝グンコト",
  "mapLabel": "金：ルーロ＝グンコト",
  "kind": "metals",
  "coordinates": [
   -11.4,
   13.1
  ],
  "title": "ルーロ＝グンコトの金",
  "reading": "マリ西部の金採掘地域です。2023年資料の操業を根拠に位置を示し、その後の操業状況を同じ年の生産量として補っていません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Barrick・ルーロ＝グンコト2023年操業",
    "url": "https://www.barrick.com/English/news/news-details/2023/as-loulo-gounkoto-sustains-a-strong-performance-barrick-hunts-for-new-discoveries-in-the-region/default.aspx"
   }
  ],
  "commodityIds": [
   "gold"
  ],
  "countryCodes": [
   "MLI"
  ],
  "evidencePeriod": "2023",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "tangier-auto",
  "label": "自動車：タンジェ",
  "mapLabel": "自動車：タンジェ",
  "kind": "manufacturing",
  "coordinates": [
   -5.8,
   35.7
  ],
  "title": "タンジェの自動車",
  "reading": "モロッコ北岸の自動車組立と部品・物流が結び付きます。タンジェの工場では2025年にSanderoなどを生産し、海外市場向けの製造を担います。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Renault・タンジェ自動車生産2025",
    "url": "https://www.renaultgroup.com/en/group/locations/tangier-plant/"
   }
  ],
  "commodityIds": [
   "automotive-aerospace"
  ],
  "countryCodes": [
   "MAR"
  ],
  "evidencePeriod": "2025",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "gauteng-auto",
  "label": "自動車：ハウテン",
  "mapLabel": "自動車：ハウテン",
  "kind": "manufacturing",
  "coordinates": [
   28.2,
   -25.8
  ],
  "title": "ハウテンの自動車",
  "reading": "政府の2015年地域表にある主要な自動車組立・部品生産地域です。技能、国内需要、輸出と部品供給が結び付き、現在の地域別生産量は未取得です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "南アフリカDTIC・自動車産業計画（2018、2015地域表）",
    "url": "https://www.thedtic.gov.za/wp-content/uploads/Masterplan-Automotive_Industry.pdf"
   }
  ],
  "commodityIds": [
   "automotive-aerospace"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2015地域表／2018公表",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "eastern-cape-auto",
  "label": "自動車：東ケープ",
  "mapLabel": "自動車：東ケープ",
  "kind": "manufacturing",
  "coordinates": [
   25.5,
   -33.2
  ],
  "title": "東ケープの自動車",
  "reading": "政府の2015年地域表にある主要な自動車組立・部品生産地域です。技能、国内需要、輸出と部品供給が結び付き、現在の地域別生産量は未取得です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "南アフリカDTIC・自動車産業計画（2018、2015地域表）",
    "url": "https://www.thedtic.gov.za/wp-content/uploads/Masterplan-Automotive_Industry.pdf"
   }
  ],
  "commodityIds": [
   "automotive-aerospace"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2015地域表／2018公表",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "kwazulu-natal-auto",
  "label": "自動車：クワズール・ナタール",
  "mapLabel": "自動車：クワズール・ナタール",
  "kind": "manufacturing",
  "coordinates": [
   31.0,
   -29.8
  ],
  "title": "クワズール・ナタールの自動車",
  "reading": "政府の2015年地域表にある主要な自動車組立・部品生産地域です。技能、国内需要、輸出と部品供給が結び付き、現在の地域別生産量は未取得です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "南アフリカDTIC・自動車産業計画（2018、2015地域表）",
    "url": "https://www.thedtic.gov.za/wp-content/uploads/Masterplan-Automotive_Industry.pdf"
   }
  ],
  "commodityIds": [
   "automotive-aerospace"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2015地域表／2018公表",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "machakos-apparel",
  "label": "繊維・衣料：マチャコス県",
  "mapLabel": "繊維・衣料：マチャコス県",
  "kind": "manufacturing",
  "coordinates": [
   37.1,
   -1.5
  ],
  "title": "マチャコス県の繊維・衣料",
  "reading": "EPZAの所在一覧に複数の織物・編物・衣料企業が記録されます。工業団地、労働、輸出制度、港湾への接続が衣料製造を支えます。企業数は生産量や雇用の比率ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "ケニアEPZA・縫製企業の所在県一覧（2026年10月確認）",
    "url": "https://epzakenya.com/garments-and-garment-related-activities/"
   }
  ],
  "commodityIds": [
   "textile-apparel"
  ],
  "countryCodes": [
   "KEN"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "mombasa-apparel",
  "label": "繊維・衣料：モンバサ",
  "mapLabel": "繊維・衣料：モンバサ",
  "kind": "manufacturing",
  "coordinates": [
   39.7,
   -4.0
  ],
  "title": "モンバサの繊維・衣料",
  "reading": "EPZAの所在一覧に複数の織物・編物・衣料企業が記録されます。工業団地、労働、輸出制度、港湾への接続が衣料製造を支えます。企業数は生産量や雇用の比率ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "ケニアEPZA・縫製企業の所在県一覧（2026年10月確認）",
    "url": "https://epzakenya.com/garments-and-garment-related-activities/"
   }
  ],
  "commodityIds": [
   "textile-apparel"
  ],
  "countryCodes": [
   "KEN"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "nairobi-apparel",
  "label": "繊維・衣料：ナイロビ",
  "mapLabel": "繊維・衣料：ナイロビ",
  "kind": "manufacturing",
  "coordinates": [
   36.8,
   -1.3
  ],
  "title": "ナイロビの繊維・衣料",
  "reading": "EPZAの所在一覧に複数の織物・編物・衣料企業が記録されます。工業団地、労働、輸出制度、港湾への接続が衣料製造を支えます。企業数は生産量や雇用の比率ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "ケニアEPZA・縫製企業の所在県一覧（2026年10月確認）",
    "url": "https://epzakenya.com/garments-and-garment-related-activities/"
   }
  ],
  "commodityIds": [
   "textile-apparel"
  ],
  "countryCodes": [
   "KEN"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "hawassa-apparel",
  "label": "繊維・衣料：ハワサ",
  "mapLabel": "繊維・衣料：ハワサ",
  "kind": "manufacturing",
  "coordinates": [
   38.5,
   7.1
  ],
  "title": "ハワサの繊維・衣料",
  "reading": "IPDCはハワサの工業団地でJP Textileなどの縫製企業の操業を記録しています。衣料産業の位置を示す代表地域で、団地内の正確な工場境界ではありません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "エチオピアIPDC・ハワサの縫製操業",
    "url": "https://www.ipdc.gov.et/news/post/286/"
   }
  ],
  "commodityIds": [
   "textile-apparel"
  ],
  "countryCodes": [
   "ETH"
  ],
  "evidencePeriod": "資料公表時点",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "tema-food",
  "label": "食品加工：テマ",
  "mapLabel": "食品加工：テマ",
  "kind": "manufacturing",
  "coordinates": [
   0.0,
   5.7
  ],
  "title": "テマの食品加工",
  "reading": "西アフリカのカカオを沿岸のテマで加工します。原料産地、加工技能、自由貿易区と港への接続が食品・菓子原料の輸出を結びます。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Cargill・ガーナのカカオ加工",
    "url": "https://www.cargill.com/worldwide/ghana"
   }
  ],
  "commodityIds": [
   "food-processing"
  ],
  "countryCodes": [
   "GHA"
  ],
  "evidencePeriod": "2008操業開始／2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "abidjan-food",
  "label": "食品加工：アビジャン",
  "mapLabel": "食品加工：アビジャン",
  "kind": "manufacturing",
  "coordinates": [
   -4.0,
   5.4
  ],
  "title": "アビジャンの食品加工",
  "reading": "ヨプゴンのカカオ加工では、国内で集めた豆をカカオマス・バター・粉などへ加工します。産地内陸の買付けと沿岸の加工・輸出は別の段階です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Cargill・コートジボワールのカカオ加工",
    "url": "https://www.cargill.com/worldwide/cote-d-ivoire"
   }
  ],
  "commodityIds": [
   "food-processing"
  ],
  "countryCodes": [
   "CIV"
  ],
  "evidencePeriod": "2021拡張／2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "nairobi-services",
  "label": "都市サービス：ナイロビ",
  "mapLabel": "都市サービス：ナイロビ",
  "kind": "transport",
  "coordinates": [
   36.8,
   -1.3
  ],
  "title": "ナイロビの都市サービス",
  "reading": "証券取引などの金融サービスが置かれる東部の主要都市です。市場、通信、企業の集積はサービスの立地条件になります。都市全体の雇用や付加価値の順位は未取得です。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Nairobi Securities Exchange・所在と取引サービス",
    "url": "https://www.nse.co.ke/contact-us/"
   }
  ],
  "commodityIds": [
   "urban-services"
  ],
  "countryCodes": [
   "KEN"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "casablanca-services",
  "label": "都市サービス：カサブランカ",
  "mapLabel": "都市サービス：カサブランカ",
  "kind": "transport",
  "coordinates": [
   -7.6,
   33.6
  ],
  "title": "カサブランカの都市サービス",
  "reading": "金融、保険、投資、企業向け専門サービスが集まる都市です。アフリカ・欧州・地中海との事業接続を担います。会員企業の所在から都市全体の数量へ換算しません。",
  "note": "資料が挙げる地域・都市の丸めた代表位置です。地点別数量は未取得で、点の大小に換算しません。",
  "sources": [
   {
    "label": "Casablanca Finance City・金融・企業サービス",
    "url": "https://casablancafinancecity.com/"
   }
  ],
  "commodityIds": [
   "urban-services"
  ],
  "countryCodes": [
   "MAR"
  ],
  "evidencePeriod": "2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "namibia-diamonds",
  "label": "ダイヤ：ナミビア全国",
  "mapLabel": "ダイヤ：ナミビア全国",
  "kind": "gems",
  "coordinates": [
   17.1,
   -20.6
  ],
  "title": "ナミビアの粗ダイヤ生産",
  "reading": "Kimberley Processの2024年全国粗ダイヤ生産は約232万カラット、約9.67億米ドルです。国別統計の代表位置であり、個別鉱山や海域の生産量ではありません。",
  "note": "取得した数量は全国粒度です。鉱山の位置・採掘境界をこの点で示しません。",
  "sources": [
   {
    "label": "Kimberley Process・ナミビア2024年粗ダイヤ統計",
    "url": "https://www.kimberleyprocess.com/participants/namibia"
   }
  ],
  "commodityIds": [
   "diamonds"
  ],
  "countryCodes": [
   "NAM"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "country"
 },
 {
  "id": "zimbabwe-chromium",
  "label": "クロム：ジンバブエ全国",
  "mapLabel": "クロム：ジンバブエ全国",
  "kind": "metals",
  "coordinates": [
   29.9,
   -18.9
  ],
  "title": "ジンバブエのクロム生産",
  "reading": "USGSは2024年のジンバブエを世界クロム鉱生産の3.2%としています。合金の原料となる金属で、取得した全国比率を個別の白金族地域の量に換算しません。",
  "note": "全国資料の代表位置です。取得資料では採掘地域別数量を特定していません。",
  "sources": [
   {
    "label": "USGS・ジンバブエ2024年鉱物産業",
    "url": "https://www.usgs.gov/centers/national-minerals-information-center/zimbabwe"
   }
  ],
  "commodityIds": [
   "pgm-chromium"
  ],
  "countryCodes": [
   "ZWE"
  ],
  "evidencePeriod": "2024",
  "status": "production",
  "geographicScope": "country"
 },
 {
  "id": "bushveld-pgm-chromium",
  "label": "白金族・クロム：ブッシュフェルト",
  "mapLabel": "白金族・クロム：ブッシュフェルト",
  "kind": "metals",
  "coordinates": [
   28.5,
   -24.8
  ],
  "title": "南アフリカ北部の白金族・クロム帯",
  "reading": "南アフリカ北部のブッシュフェルト層状岩体に白金族・クロムの鉱床が広がります。資料は北・東・西など複数の部分を区別します。触媒や合金の原料を採掘する広域の鉱業地域です。",
  "note": "岩体全域の編集上の代表位置です。個別鉱山・境界・地点別産出量ではありません。資料の鉱石賦存比率を年間生産の比率へ換算しません。",
  "sources": [
   {
    "label": "Minerals Council South Africa・白金族の地質・採掘地域",
    "url": "https://www.mineralscouncil.org.za/sa-mining/platinum-group-metals"
   }
  ],
  "commodityIds": [
   "pgm-chromium"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "公表年不明／2026年10月確認",
  "status": "production",
  "geographicScope": "region"
 },
 {
  "id": "johannesburg-services",
  "label": "都市サービス：ヨハネスブルク",
  "mapLabel": "都市サービス：ヨハネスブルク",
  "kind": "transport",
  "coordinates": [
   28.0,
   -26.2
  ],
  "title": "内陸大都市圏の経済と交通",
  "reading": "世界銀行はヨハネスブルク＝プレトリア大都市圏を金採掘から発展した経済中枢と説明します。大きな都市市場と交通の接続が、商業や企業向けサービスの立地条件になります。後半は資料に基づく地理的な解釈で、都市別サービス規模の順位ではありません。",
  "note": "大都市圏の代表位置です。サービス業の現在雇用・付加価値・人口順位は未取得です。",
  "sources": [
   {
    "label": "世界銀行・南部アフリカ鉱業と経済中枢（2019、p.70）",
    "url": "https://documents1.worldbank.org/curated/en/506751562777260359/pdf/Digging-Beneath-the-Surface-An-Exploration-of-the-Net-Benefits-of-Mining-in-Southern-Africa.pdf"
   }
  ],
  "commodityIds": [
   "urban-services"
  ],
  "countryCodes": [
   "ZAF"
  ],
  "evidencePeriod": "2019",
  "status": "production",
  "geographicScope": "urban"
 }
];
