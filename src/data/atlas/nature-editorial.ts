import type { ProductId } from '../../lib/atlas-agriculture-detail-state';
export type NatureAction={label:string;env?:'climate'|'water'|'landform'|'contour';waterView?:'rivers'|'precipitation'|'basins';basin?:string;precipBand?:string;city?:string;natureFeature?:string;product?:ProductId};
export type NatureEditorial={takeaway:string;heading:string;action: NatureAction};
export const natureEditorial:Record<string,NatureEditorial> = {
  "water:Mississippi": {
    "takeaway": "内陸の農業地帯とメキシコ湾を、水と輸送の両面で結ぶ川。",
    "heading": "支流が集まる中央部",
    "action": {
      "label": "ミシシッピ川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "mississippi"
    }
  },
  "water:Missouri": {
    "takeaway": "山地に降った雨や雪が、乾燥しやすい大平原にも水を届ける。",
    "heading": "上流と平原のつながり",
    "action": {
      "label": "ミズーリ川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "missouri"
    }
  },
  "water:Ohio": {
    "takeaway": "東部に降った水も、支流を通じてミシシッピ川へ集まる。",
    "heading": "山地から中央部へ",
    "action": {
      "label": "オハイオ川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "ohio"
    }
  },
  "water:Colorado": {
    "takeaway": "乾燥した南西部の水利用は、遠くの山地の雨や雪に支えられる。",
    "heading": "山地の水を貯めて使う",
    "action": {
      "label": "上流から下流までの流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "colorado"
    }
  },
  "water:Columbia": {
    "takeaway": "山地の降水と融雪が、北西部の発電・灌漑・輸送を支える。",
    "heading": "太平洋へ集まる水",
    "action": {
      "label": "コロンビア川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "columbia"
    }
  },
  "water:Sacramento": {
    "takeaway": "冬に得た水を夏に使うことが、中央谷北部の農業を支える。",
    "heading": "季節をつなぐ貯水",
    "action": {
      "label": "サクラメント川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "sacramento"
    }
  },
  "water:San Joaquin": {
    "takeaway": "夏に乾燥する中央谷では、山地の水と地下水が農業を支える。",
    "heading": "川と地下水を組み合わせる",
    "action": {
      "label": "サンホアキン川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "san-joaquin"
    }
  },
  "water:High Plains Aquifer": {
    "takeaway": "少雨の大平原でも、地下水をくみ上げれば農地に水を届けられる。",
    "heading": "帯水層｜地下で水を蓄え、通す地層",
    "action": {
      "label": "大平原の降水量を見る",
      "env": "water",
      "waterView": "precipitation",
      "precipBand": "250-500"
    }
  },
  "water:Central Valley Aquifer System": {
    "takeaway": "中央谷の農業は、地表を流れる水と地下に蓄えられた水を使う。",
    "heading": "帯水層｜地下で水を蓄え、通す地層",
    "action": {
      "label": "サクラメント川と水源を確かめる",
      "env": "water",
      "waterView": "basins",
      "basin": "sacramento"
    }
  },
  "water:Mississippi River Valley Alluvial Aquifer": {
    "takeaway": "川が運んだ砂や礫の層も、下流の農地を支える水源になる。",
    "heading": "沖積層｜河川が運んだ堆積物",
    "action": {
      "label": "ミシシッピ川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "mississippi"
    }
  },
  "water:Floridan Aquifer System": {
    "takeaway": "雨の多さに加え、地下の岩石の性質も水の利用を左右する。",
    "heading": "石灰岩に蓄えられる地下水",
    "action": {
      "label": "南東部の降水量を見る",
      "env": "water",
      "waterView": "precipitation",
      "precipBand": "1500-2000"
    }
  },
  "water:lake-mead": {
    "takeaway": "貯水池は、川から届く水と都市・農地で使う時期をつなぐ。",
    "heading": "コロラド川の貯水",
    "action": {
      "label": "コロラド川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "colorado"
    }
  },
  "water:lake-powell": {
    "takeaway": "南西部の水を考えるには、上流の積雪と貯水も見る必要がある。",
    "heading": "コロラド川上流の貯水",
    "action": {
      "label": "コロラド川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "colorado"
    }
  },
  "water:shasta-lake": {
    "takeaway": "冬の雨や雪を貯めることで、乾燥する夏にも水を使える。",
    "heading": "サクラメント川の貯水",
    "action": {
      "label": "サクラメント川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "sacramento"
    }
  },
  "landform:ロッキー山脈": {
    "takeaway": "高い山地は雨や雪を蓄え、周囲の平原へ流れる川の水源になる。",
    "heading": "西部内陸を南北に走る山地",
    "action": {
      "label": "標高を東部の山地と比べる",
      "env": "contour"
    }
  },
  "landform:アパラチア山脈": {
    "takeaway": "ロッキーより低い山地でも、河川の流れる方向を分ける。",
    "heading": "分水界｜水の流れる先を分ける境",
    "action": {
      "label": "東側の水が集まる流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "ohio"
    }
  },
  "landform:カスケード山脈": {
    "takeaway": "山脈を挟むだけで、湿潤な西側と乾燥した東側が隣り合う。",
    "heading": "雨陰｜山の風下にできる少雨域",
    "action": {
      "label": "山脈の東西の降水量を見る",
      "env": "water",
      "waterView": "precipitation"
    }
  },
  "landform:シエラネバダ山脈": {
    "takeaway": "山地の冬の雪が、夏に乾燥するカリフォルニアの水源になる。",
    "heading": "融雪｜雪が融けて川へ流れる",
    "action": {
      "label": "サンホアキン川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "san-joaquin"
    }
  },
  "landform:コロラド高原": {
    "takeaway": "平らな地面でも標高は高く、川が深い峡谷を刻むことがある。",
    "heading": "高原｜高い位置に広がる平坦な土地",
    "action": {
      "label": "等高線で土地の高さを見る",
      "env": "contour"
    }
  },
  "landform:グレートベースン": {
    "takeaway": "水が海へ抜けにくい盆地では、蒸発によって塩類が残りやすい。",
    "heading": "内陸流域｜海へ流れ出ない水系",
    "action": {
      "label": "内陸西部の降水量を見る",
      "env": "water",
      "waterView": "precipitation"
    }
  },
  "landform:グレートプレーンズ": {
    "takeaway": "広く緩やかな平原でも、西と東では農業に使える水が異なる。",
    "heading": "東へ低くなる平原と降水の差",
    "action": {
      "label": "平原の東西の降水量を見る",
      "env": "water",
      "waterView": "precipitation"
    }
  },
  "landform:中央低地": {
    "takeaway": "起伏の小さい土地と河川・湖が、大規模な農業と輸送を支える。",
    "heading": "平坦な農地と内陸の水路",
    "action": {
      "label": "とうもろこしの産地と条件を見る",
      "product": "corn"
    }
  },
  "landform:大西洋海岸平野": {
    "takeaway": "低く平らな土地では、水を得ることと排水することの両方が重要。",
    "heading": "海側に広がる低地",
    "action": {
      "label": "東海岸の降水量を見る",
      "env": "water",
      "waterView": "precipitation",
      "precipBand": "1000-1500"
    }
  },
  "water:Lake Superior": {
    "takeaway": "大きな湖は水路になるとともに、周囲の気温や降雪にも影響する。",
    "heading": "五大湖｜つながった淡水湖と水路",
    "action": {
      "label": "デトロイトの雨温図を見る",
      "env": "climate",
      "city": "detroit"
    }
  },
  "water:Lake Michigan": {
    "takeaway": "大きな湖は水路になるとともに、周囲の気温や降雪にも影響する。",
    "heading": "五大湖｜つながった淡水湖と水路",
    "action": {
      "label": "デトロイトの雨温図を見る",
      "env": "climate",
      "city": "detroit"
    }
  },
  "water:Lake Huron": {
    "takeaway": "大きな湖は水路になるとともに、周囲の気温や降雪にも影響する。",
    "heading": "五大湖｜つながった淡水湖と水路",
    "action": {
      "label": "デトロイトの雨温図を見る",
      "env": "climate",
      "city": "detroit"
    }
  },
  "water:Lake Erie": {
    "takeaway": "大きな湖は水路になるとともに、周囲の気温や降雪にも影響する。",
    "heading": "五大湖｜つながった淡水湖と水路",
    "action": {
      "label": "デトロイトの雨温図を見る",
      "env": "climate",
      "city": "detroit"
    }
  },
  "water:Lake Ontario": {
    "takeaway": "大きな湖は水路になるとともに、周囲の気温や降雪にも影響する。",
    "heading": "五大湖｜つながった淡水湖と水路",
    "action": {
      "label": "デトロイトの雨温図を見る",
      "env": "climate",
      "city": "detroit"
    }
  }
};

export const waterEditorial:Record<string,NatureEditorial> = {
  "precipitation:overview": {
    "takeaway": "地元に降る雨の量と、川や地下水から使える水の量は別のもの。",
    "heading": "等雨量線｜年降水量が同じ場所を結ぶ線",
    "action": {
      "label": "雨の降る場所と流域を見比べる",
      "env": "water",
      "waterView": "basins"
    }
  },
  "basins:overview": {
    "takeaway": "下流の水は、上流の山地や平原に降った雨や雪にも支えられる。",
    "heading": "流域｜雨水が同じ川へ集まる範囲",
    "action": {
      "label": "水源側の降水量を見る",
      "env": "water",
      "waterView": "precipitation"
    }
  },
  "precipitation:lt250": {
    "takeaway": "雨が少ない土地で水を使うには、河川や地下水からの供給が鍵になる。",
    "heading": "南西部｜少雨の土地と遠くの水源",
    "action": {
      "label": "コロラド川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "colorado"
    }
  },
  "precipitation:250-500": {
    "takeaway": "大平原の西側では、少ない雨をどう補うかが農業の条件になる。",
    "heading": "山の風下｜湿気が届きにくい内陸",
    "action": {
      "label": "ハイプレーンズ帯水層を見る",
      "env": "water",
      "waterView": "rivers",
      "natureFeature": "water:High Plains Aquifer"
    }
  },
  "precipitation:500-750": {
    "takeaway": "平原を東へ進むと雨が増え、畑で得られる水の条件も変わる。",
    "heading": "中央部｜乾燥する西と湿潤な東の間",
    "action": {
      "label": "小麦の産地と水の条件を見る",
      "product": "wheat"
    }
  },
  "precipitation:750-1000": {
    "takeaway": "年の雨量に加え、作物が育つ季節に雨が降るかが重要になる。",
    "heading": "中央部から東部｜年合計と季節配分",
    "action": {
      "label": "シカゴの雨の季節変化を見る",
      "env": "climate",
      "city": "chicago"
    }
  },
  "precipitation:1000-1500": {
    "takeaway": "東部の広い範囲は湿潤だが、夏に使える水は雨の時期にも左右される。",
    "heading": "東部・南部｜雨と蒸発散の収支",
    "action": {
      "label": "ニューヨークの雨温図を見る",
      "env": "climate",
      "city": "new-york"
    }
  },
  "precipitation:1500-2000": {
    "takeaway": "同じ多雨域でも、湾岸と西岸の山地では雨の降る理由が違う。",
    "heading": "湾岸の湿気・山地で上昇する空気",
    "action": {
      "label": "ニューオリンズの雨温図を見る",
      "env": "climate",
      "city": "new-orleans"
    }
  },
  "precipitation:gte2000": {
    "takeaway": "山地に降り積もる雪は、少雨の下流へ時間をかけて届く水源になる。",
    "heading": "太平洋側の山地｜雨と雪の蓄え",
    "action": {
      "label": "コロンビア川の流域を見る",
      "env": "water",
      "waterView": "basins",
      "basin": "columbia"
    }
  },
  "basins:mississippi": {
    "takeaway": "中央部の広い農業地帯は、支流を通じてメキシコ湾につながっている。",
    "heading": "本流と支流｜一つの水系の中のまとまり",
    "action": {
      "label": "ミシシッピ川の流路を見る",
      "env": "water",
      "waterView": "rivers",
      "natureFeature": "water:Mississippi"
    }
  },
  "basins:missouri": {
    "takeaway": "西部山地の雨や雪と大平原の水利用は、同じ流域の中でつながる。",
    "heading": "ミシシッピ川水系の西側",
    "action": {
      "label": "大平原の東西の降水量を見る",
      "env": "water",
      "waterView": "precipitation"
    }
  },
  "basins:ohio": {
    "takeaway": "東部の山地に降った水も、オハイオ川を経て中央部の本流へ届く。",
    "heading": "テネシー川も含む東側の支流域",
    "action": {
      "label": "アパラチア山脈の位置を見る",
      "env": "landform",
      "natureFeature": "landform:アパラチア山脈"
    }
  },
  "basins:colorado": {
    "takeaway": "乾燥した下流の水利用は、上流の山地の降水と積雪に支えられる。",
    "heading": "ロッキー山脈から南西部へ",
    "action": {
      "label": "ミード湖の貯水を読む",
      "env": "water",
      "waterView": "rivers",
      "natureFeature": "water:lake-mead"
    }
  },
  "basins:columbia": {
    "takeaway": "雨や雪の多い山地と乾燥した内陸が、一つの河川網でつながる。",
    "heading": "スネーク川を集めて太平洋へ",
    "action": {
      "label": "山脈を挟む降水量の差を見る",
      "env": "water",
      "waterView": "precipitation"
    }
  },
  "basins:sacramento": {
    "takeaway": "冬の水を夏に回す仕組みが、カリフォルニア北部の農業を支える。",
    "heading": "中央谷北部｜冬の雨と山地の雪",
    "action": {
      "label": "シャスタ湖の貯水を読む",
      "env": "water",
      "waterView": "rivers",
      "natureFeature": "water:shasta-lake"
    }
  },
  "basins:san-joaquin": {
    "takeaway": "中央谷の農業を考えるには、山地の水源と用水の供給を結び付ける。",
    "heading": "シエラネバダから中央谷へ",
    "action": {
      "label": "シエラネバダの雪と水源を読む",
      "env": "landform",
      "natureFeature": "landform:シエラネバダ山脈"
    }
  }
};
