# メキシコ主要産業：三分野の表示契約

## 表示対象と出典

通常の入口は「資源・エネルギー／製造業／サービス業」の三分野。項目を選んでも同じ分野の案内点を残し、選択項目を強調する。「この産業だけ表示」を選んだときだけ他項目の点を隠す。地図の枠と各点・ラベルの座標は項目選択で変えない。旧 `sector=all` は資源、旧 `sector=construction-real-estate` は不動産を含むサービスへ正規化し、履歴と再読込でも有効なタブ・地図になる。建設の説明文は資料に保持する。既存の輸送機器と電子機器、人口との比較 URL と元図への戻りは維持する。

| 分野 | 採用した項目 | 表示する量と原典 |
| --- | --- | --- |
| 資源・エネルギー | 石油・天然ガス採掘、鉱業 | INEGI ETEF の2025年速報、州の生産地に配分された財のFOB輸出額。32州×2業種。 |
| 製造業 | 輸送機器、電子機器、食品加工、化学、金属、機械 | 同じETEFの2025年速報。従来2業種64原典行と、追加4製造業128値を保持。 |
| サービス業 | 金融・専門サービス、宿泊・飲食 | INEGI Censos Económicos 2024 の対象年2023年、州単位の就業者。メキシコシティ：金融・保険411,249人、専門・科学・技術180,590人。キンタナ・ロー：ホテル・飲食店143,793人。 |

ETEFの8業種は共通の10億米ドル階級で塗るが、主図の初期状態と項目選択後は産業の位置案内を保持し、「州別FOB輸出額を面で表示」を明示的に選んだ場合のみ面階級と数値凡例に切り替える。URL・再読込・戻るでも切替を保持する。輸出額は生産拠点・産業規模ではない。秘匿、未把握、微小値、対象外、未取得をゼロへ変換しない。サービス業には対応する全国同一定義の州別量を収録していないため、地域例を点で示す。サービスの点を輸出額や全国分布として見せない。地図下の統計も、サービス業では就業者、資源・製造業では輸出額に切り替える。

塗りつぶしの点は、上位州または一次資料に挙げられた州を読むための位置案内であり、工場・鉱山・ホテル・企業の所在地ではない。白抜きの点は、出典で活動を確認した**都市の市街位置**を、保持済みの INEGI 2020年人口集落座標から示す。工場・鉱山・製油所の敷地座標ではなく、ETEFの州別輸出額を個別施設へ配分しない。等サイズの点から数量を推定しない。個別施設間の取引や物流を裏付けるデータはないため、接続線は描かない。

資源の採掘例は Grupo México の Buenavista del Cobre（カナネア市）。加工例は Pemex が挙げたサラマンカ市とサリナ・クルス市の製油所。精製は採掘 SCIAN 211 と別分類であり、採掘のETEF値を製油所に付けない。製造業は従来の日産アグアスカリエンテスと Volkswagen プエブラに加え、INEGI の経済センサスが製造業集積を示すヌエボ・レオン（モンテレイ市）と、電子機器を挙げるハリスコ（グアダラハラ市）を都市例にする。市の特定業種の値は作らない。サービスはメキシコシティ、カンクン市、モンテレイ市の都市位置を示す。INEGI の州全体の就業者値を都市や施設には割り振らない。

## 原典

- [INEGI ETEF](https://www.inegi.org.mx/programas/exporta_ef/)：SCIAN 211、212、311、325、331＋332、333、334、336。原典の千米ドルを1,000,000で割り10億米ドルを表示。原CSVと変換・公開状態は `data-source/atlas/mexico/industry/` と `src/data/atlas/mexico/industry-catalog.json` に保持。
- [INEGI Censos Económicos 2024・Ciudad de México](https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/mcdmx_ce24.pdf)：2ページ目の州別業種表、対象年2023年。
- [INEGI Censos Económicos 2024・Quintana Roo](https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/mqroo_ce24.pdf)：2ページ目の州別業種表、対象年2023年。
- [Nissan の中南米拠点一覧](https://www.nissan-global.com/EN/COMPANY/PROFILE/EN_ESTABLISHMENT/LATIN_AMERICA/)：アグアスカリエンテス第1・第2工場。
- [Volkswagen de México の拠点](https://www.volkswagen-newsroom.com/en/volkswagen-de-mexico-4070)：プエブラの車両・部品工場。
- [Grupo México Buenavista del Cobre](https://desarrollosustentable.gmexico.com/en/provee/)：カナネアの鉱山。
- [Pemex 製油所一覧](https://www.pemex.com/en/press_room/press_releases/Paginas/2018-093-national.aspx)：サラマンカとサリナ・クルスを含む（2018年の記事）。現行の稼働率・生産量には使用しない。
- [INEGI Censos Económicos 2024・Nuevo León](https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/mnl_ce24.pdf)：モンテレイ市の全産業集積、州の製造業、金融・専門サービス就業者を別々に照合。
- [INEGI Censos Económicos 2024・Jalisco](https://www.inegi.org.mx/contenidos/programas/ce/2024/doc/mjal_ce24.pdf)：グアダラハラ市の全産業集積と州の電子機器を別々に照合。
- 保持済みの INEGI 2020年人口集落原CSV：`data-source/atlas/mexico/population-localities/locality-source-fields.csv.gz`。名称・州・2020年人口・緯度経度を照合し、地図と同じ INEGI Lambert 投影で市街位置へ変換。

## 後続の候補

精製拠点の**量**、航空宇宙、港湾物流は、独立した量と現行の拠点を一次資料で照合してから採否を判断する。既存ETEFの輸送機器を自動車・航空宇宙へ、電子機器を半導体単独へ分割しない。州単位の順位を個別施設の位置や規模へ読み替えない。

## 検査経路

`npm run test:review:industry` を `validate.yml` の通常の push/PR 検査に接続する。1920×1080 と 1280×800 で、採掘・精製の入口、製造集積と工場都市、項目選択による位置の維持、補助のFOB面表示、サービス集積、URL再読込、ラベル衝突を実 Chrome で確認し画像をCI artifactへ残す。起動には `chromiumSandbox:true` を指定し、安全機構を外さない。

この作業環境の `/usr/bin/chromium` は SUID sandbox helper が root 所有・mode 4755 ではなく、sandbox 有効の起動を拒否した。ローカルの実画像はこの修正版では取得できないため、上記 CI の Chrome 結果を確認する。これは地図の画像検査が成功したという意味ではない。
