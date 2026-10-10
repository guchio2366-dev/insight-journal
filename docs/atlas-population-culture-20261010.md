# 民族・宗教の全国構成：2026-10-10候補

基点は main `ab2bf51581f6874fb141b5e858892c7a2faf9f2e`。この候補は人口分野の基礎構成に限定し、既存の人口密度・都市人口・森林・農業・産業を作り直していない。地域全体の民族・宗教分布の完成を意味しない。

## 既存・公開・保留資料との照合

- オセアニア、ロシア、中南米にGHSL人口密度・都市中心が既存。アフリカにも人口格子が既存。これらの数値・素材・生成コードは変更しない。
- オセアニアの公開中人口ページを2026-10-10に読み、「人種・民族・宗教：未整備」、GHSLの既存掲載、新しい構成コンポーネントが未掲載であることを確認した。公開ページは https://guchio2366-dev.github.io/insight-journal/atlas/oceania/population/ 。ロシア・中南米の公開HTMLにも民族・宗教未整備の表示があり、アフリカを含む4地域に今回の新しい構成パネルは未掲載。確認は公開HTMLと対象箇所の照合で、公開サイト全画面の操作再検証ではない。
- ロシアは欧州に既存のPew RUS行をそのまま参照する。既存欧州抜粋は40カ国、今回も40カ国のまま。世界201カ国表への新しい行追加や別データ表の複製はしない。
- アフリカの `africa-settlements-v1/manifest.json` と `docs/atlas-africa.md` に、GeoEPR/EPR-EDの許諾未解決、216掲載集団・648宗教記録枠の過去確認が記録されている。政治的関連集団だけの居住域・集団内宗教を全住民の構成として再公開していない。今回の南アフリカ国勢調査は別の全国集計。
- checkoutと `/workspace/.agents` に関連AGENTS.md / SKILL.mdは見つからなかった。既存の `docs/atlas-editorial-and-map-guidelines.md` と、地理可視化スキルを参照した。

## 公開候補として実装した範囲

| 地域 | 民族・祖先・人口集団 | 宗教 | 精度と残る不足 |
| --- | --- | --- | --- |
| オセアニア | 豪州2021年主要祖先5回答＋別設問の先住民自己認識3.2%、NZ2023年民族自己認識6大分類 | 豪州2021年4公表区分、NZ2023年主要3区分 | 両国の全国集計。豪州の残る祖先、NZの残る宗教・回答状態、太平洋島嶼国、国内分布は未収録 |
| ロシア | 国勢調査の民族構成は未収録と明示 | 既存Pew 2020推計7区分を再利用 | 全年齢全国推計。共和国／州・居住域の構成、キリスト教宗派の細分化は不可 |
| アフリカ | 南アフリカ2022年の人口集団4区分（人種的自己認識の大分類） | 南アフリカ2022年全国10区分 | 国単位。人口集団のOther、民族・言語、国内州別と他54対象は未収録。アフリカ全体を代表する割合ではない |
| 中南米 | 未追加 | 未追加 | IBGEなどの候補を確認したが、対象データの公開転載条件が未確認。調査定義・年齢・権利を解決してから別の完成単位にする |

採用した新しい33数値と、再利用したロシア7数値の位置・定義・権利判断は `data-source/atlas/population-culture/verified-excerpts.json`。ABS/Stats NZ/Stats SAの数値は原表テキストを手動照合した抜粋で、取得できていない原本バイト列のSHAを捏造していない。原表をダウンロードしたファイルと呼ばない。

## 出典・条件・定義

- [ABS 2021 QuickStats](https://www.abs.gov.au/census/find-census-data/quickstats/2021/AUS) のAncestry, top responses。最大2回答、通常居住者・全年齢、未回答を含む人口が分母。祖先を民族・人種・出生国に読み替えない。
- [ABS Snapshot of Australia, 2021](https://www.abs.gov.au/statistics/people/people-and-communities/snapshot-australia/latest-release) の先住民計数812,728人、3.2%。別設問のIndigenous statusで、祖先回答に加算せず、過少計数補正後人口推計3.8%とも区別。
- [ABS Religious affiliation](https://www.abs.gov.au/articles/religious-affiliation-australia) のTotal。広い世俗・精神的信念・無宗教区分38.9%はNo Religion so described 38.4%ではない。未回答・記述不十分7.3%は未回答だけの6.9%ではない。100.1%を補正しない。
- [Stats NZ全国・地域インフォグラフィック](https://www.stats.govt.nz/infographics/2023-census-national-and-regional-data/) の6民族大分類。複数回答のtotal response方式で、丸めた6割合の合計114.8%を100%へ補正しない。Maori descent（血統）は別変数。
- [Stats NZ 2023 Census highlights](https://www.stats.govt.nz/information-releases/2023-census-population-dwelling-and-housing-highlights/) の宗教3区分。残差からその他・未回答を作らない。
- ABSとStats NZは [ABSのCC BY 4.0条件](https://www.abs.gov.au/website-privacy-copyright-and-disclaimer)、[Stats NZのCC BY 4.0条件](https://www.stats.govt.nz/about-us/copyright/) を確認。ロゴ・マイクロデータ・第三者権利などの例外を集計表の利用許諾と混同しない。原区分・調査年・出典・著作権者・日本語補足と加工者を表示。
- [Stats SA Census 2022 Statistical Release](https://census.statssa.gov.za/assets/documents/2022/P03014_Census_2022_Statistical_Release.pdf) のFigure 2.3（印刷p.7）とTable 2.10のSA列（印刷p.24）。人口集団は民族名や家庭内言語ではない。宗教の公表0.0%は丸め値で不在ではない。宗教的無所属・無神論・不可知論を分ける。
- 背景解説は [GCISの歴史資料](https://www.gcis.gov.za/sites/default/files/docs/resourcecentre/pocketguide/2003/history.pdf) と [Ditsong国立文化史博物館の宣教・聖書翻訳解説](https://ditsong.org.za/en/the-historical-background-of-missionaries-in-south-africa-and-the-translation-of-christian-bibles-into-isizulu/) を短く要約。公表割合から歴史的原因の量的寄与や国内の居住域は推定しない。
- Stats SAの [Copyright and disclaimer](https://www.statssa.gov.za/?page_id=425) は全製品の加工・公表・配布について出典と独自加工の明示を求めていることを確認。関連Census報告の販売禁止条件も考慮し、この候補は無料表示用。CCライセンスとは表示しない。
- [Pew Appendix B](https://www.pewresearch.org/wp-content/uploads/sites/20/2025/06/PR_2025.06.09_global-religious-change_appendix-b.pdf) のRussia 2020（印刷p.16、PDF index 15）を既存RUS行と照合。69.9 / 8.2 / 20.2 / 0.4 / <0.1 / <0.1 / 1.2を保持。全年齢全国推計、直接観測や宗派分類ではない。[利用規約](https://www.pewresearch.org/about/terms-and-conditions/) の全体・実質的全体の再配布禁止を踏まえて新しい国を追加せず、原文の翻訳免責を画面に表示。

## 地図と操作

白い国土は既存Natural Earth境界を用いた位置背景。無所属・無宗教・特定民族の面ではない。国内の県・州を越える精密居住域を描かず、全収録区分の独立した0〜100%横棒を国に結び付けた記号で同時表示する。代表点・ラベル配置点・対応線はレイアウトであり、居住域や観測地点ではない。ロシアの係争区分は既存Natural Earth原形状の斜線を維持する。

選択は右欄の説明・数表を変更する。ほかの国と全区分の記号は残る。単一区分では右欄内の数表だけを切り替え、地図をフィルターしない。概説→背景・定義→選択対象→不足範囲の順。URLのtopic/culturePlace、再読込、戻る、人口密度への復帰、JavaScript無効時の両項目・出典表を検証する。

## 未解決の資料と次の完成単位

- ブラジルIBGE 2022宗教は [公式カタログ](https://biblioteca.ibge.gov.br/index.php/biblioteca-catalogo?id=2102182&view=detalhes) と [公式発表資料](https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/3f1708b5d315aca50d5a7d8764469c45.pdf) を確認。宗教は10歳以上・標本調査の2025年公表暫定結果で、全年齢のcor ou raça（肌の色／人種自己認識）と分母が異なる。ライセンス確認未了で公開用数表へ転載しない。公式ライブラリの原報告取得はエラー、IBGE本体は403だった。
- グアテマラ2018の公式結果・帰属変数の説明は読める。INEのCC BY検索結果が同じ2018対象に適用されるかを確認できず、ポータルの取得も失敗。パナマINECの2023年最終基本結果の掲載ページにもCC BY 4.0表示を確認し、全国の先住民帰属17.2%・アフリカ系自己認識31.7%を公式人口解説で照合できた。別々の設問であり、全住民の排他的な民族分類とは扱わない。定義PDFと先住民原表は取得タイムアウトがあり、この候補の公開数表にはまだ追加していない。これらを大陸全体の代用にしない。
- ロシア民族は調査自己認識・未回答・対象領域・利用条件の確認が必要。人口密度・言語・国籍から補わない。
- 南アフリカ宗教は9州の原表がある。国単位から州内の分布を作らず、次の単位で原境界・10区分・利用条件・設問を確認して収録できる。国別の同一色からアフリカ全体の宗教分布を推定しない。
- オセアニアの島嶼国、豪州の詳細祖先・国内集計、NZの残る宗教区分を、正規取得できる国勢調査・地域資料から追加する。Pew全表を複数地域へコピーする方法では埋めない。

登録、費用、認証発行、新しい明示的な規約同意は実施していない。403を別経路で回避して原本取得を試みていない。資料が世界全体で利用不許可だと断定しているのではなく、この作業で条件・対象・取得を確認できなかった範囲を保留している。

## 検証とレビュー資料

- `npm test`：1,061試験、1,058成功、既存3 skip、失敗0。
- `npm run build`：成功。`ASTRO_TELEMETRY_DISABLED=1`を指定して、この実行環境の読取専用ホームへのtelemetry書込を避けた。
- アフリカ既存回帰の対象24ケースと関連単体63ケースは成功。全体E2Eは最終実行中で、結果を追記する。`npm run verify:release`は成功（local, 1 articles）。
- `scripts/verify-population-culture-browser.mjs`：ビルド済みdistをループバックで配信し、1280×665、1024×665の2PC想定で6状態ずつ、12ケースを操作検証。実機2台の操作ではない。初期・選択後画像、取得年・定義・全区分・切れ・戻る・再読込・密度への復帰を確認。初期の記号切れ、豪州/NZ記号の枠の重なり、狭いロシア地図の右欄へのはみ出しを修正し、最終画像を再取得・目視済み。
- この環境のChromium SUID sandbox helperの設定不備でsandbox付き起動が失敗した。ローカルビルドのレビューに限って `CULTURE_CHROMIUM_SANDBOX=0 node scripts/verify-population-culture-browser.mjs` を使用。スクリプトの既定はsandbox有効。ブラウザー版・設定・結果は `docs/reviews/population-culture-20261010/browser-results.json`。
- この候補ではマージ・公開を行わない。親の統合・新画像レビュー・公開照合が別途必要。
