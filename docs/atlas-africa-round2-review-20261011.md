# アフリカ第二弾・統合レビュー

基準 main: `755ec125daf9272e21328ff4c1ecab32756ce917`。アフリカを担当し、公開・マージは行わない。PCの主条件は1920×1080、CSS100%、DPR1。1440/1024は補助条件。人口凡例は保留のため既存を保持。

## 実装

- 農畜産：米国の AgricultureMapControls と同じ作物/畜産チェックを採用。地図内の二重カテゴリ操作を共通タブへ戻す。米国の15px・濃い茶色・白縁の作物名に揃える。9品目と全概略生産帯、5地域、選択時の他分布保持、右側only/all操作を保持。
  最終原表照合で西部/南部のFAOSTAT統計コードの逆転を修正（西5105、南5104）。準備処理と単体で表示地域を原表のArea名に独立照合し、値・欠測・同年/同定義の条件は保持。
- 林業：共通AfricaWorkspaceFrame/AfricaFieldNavigationを本体と独立林業routeで再利用。地域headerと5分類、農畜産/林業の階層を合わせる。2事例の操作を右へ移す。PCでは地図の実開始位置と凡例高から320〜720px、右解説の実開始位置からスクロール高を計算。最低領域が収まらない場合はinsufficientを残す。**森林面は未達**。
- 気候：アフリカのSVGだけ185px上限を解除。ピーク注記がある3都市は232、他は211のviewBoxで、同じ描画幅を保つ。12都市・観測所・月別原値・採用分類法と定量定義は保持。気温−3〜40℃/10℃線、降水0〜350mm/100mm線を基本に、多雨の都市のみ実際のピークを覆う50mm刻み上限。都市選択でカメラを変えない。
- 河川：原NE10m32本を人工連結せず保持。11水系をriverIdで集水面と結合。主要川名/地形名/海名を常時表示し、線を太くする。コンゴ本文は同一の既存オブジェクトを保持。
- 降水：GPCC1991–2020の原0.25°月値を合計。250mmの等雨量線と同じ境界を持つ段階青色、主要線のmmラベル。国平均の緑5色を主図にしない。
- 流域：NEXT_SINK/NEXT_DOWNを検証した11面に薄い色を付ける。面/河道を選んでも他の面と河道を保持。本流名と流出先を表示。**全河口の精密点は未取得**。
- 地形：線のない柔らかな起伏背景、12の地形名/概略範囲、河川/海/海流/季節別風の名称。地形範囲はNatural Earthの名称案内で実測境界ではない。海流/風の軸は方向案内で幅/速さ/現在値を示さない。
- 標高：500m区切りの色帯と線。元の標高格子照会は変更せず、主要地形名を控えめに表示。
- 産業：18品目・49地域。品目選択で複数産地を強調し、その他の点も保持。開発/休止/生産を区別。全国資料から鉱山量/位置を捏造しない。国を変えたら地点説明を解除し、選択国に地点が未収録の場合は明示。旧2テーマURLは対応品目へ復元。
- 人口：Natural Earthのアブジャ首都座標を追加。市/都市集積/FCTの範囲、統計定義/年を区別し、未取得の統一年順位を断定しない。
- 宗教：Pew2020の55国・地域の最大集団と大きな第2集団の構成。混在印と国粒度を表示。在来の実践、植民地以前のイスラム/エチオピアのキリスト教、植民期と以降の活動を区別。
- 言語：Glottolog5.3の2222記録地点を別補助タブで表示。点の密集は話者数でなく、民族分布に転用しない。**民族居住域は未達**。

## 未達と取得経路

|対象|状況・原因|代替として必要なもの|
|---|---|---|
|入力画像3枚|Library prepare後、現在の配布helperでmaterializeを1回＋新prepare後の同helper1回再試行。全て `library file transfer failed: download failed`。consumer-localにファイルなし。HTTP statusはhelper未表示なので403と断定しない。実見なし。|正規取得が成功するconsumer-localファイル。現実装の画像で元画像比較の代用をしない。|
|森林被覆面|公式ESA S3 `https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif` を既存準備scriptでRange取得した際、正規proxyのHTTP tunnelingが403で停止。親から共有されたものと同じ経路。個別tile名はログに残らず断定できない。独立FAO GLC-SHAREの原資料もproxy403。原図未取得で、天然/人工の区分は根拠なし。|正常な取得。採用できる場合は2021年class10の樹木被覆として一般化を明示し、森林面積・天然林面と扱わない。枠修正/2事例/注記だけで面を完了扱いしない。|
|民族居住域|GeoEPR/GREGの公開派生配布条件が未確認、利用条件の確認できる広域geometry未取得。|公開派生配布が許される原資料、または権利者の明示許諾。言語の記録点で民族面の代用をしない。|
|精密河口点|HydroBASINS PourPoints正規ZIPがHTTP403、独自利用条件もBasinATLASのCC BYと区別して未採用。|正常な取得と配布条件の確認、または独立の権利確認済み河口資料。原河道の架空延長は行わない。|
|ローカル実ブラウザ|`/usr/bin/chromium`、headless=true、chromiumSandbox=true、追加引数なしでSUID helper ownership FATAL。権限/安全設定を変更しない。|既存GitHubの安全Google Chromeで同headを描画検証し、代表JPEG/metadataを配布。|
|CI失敗内容・artifactの実見|初回head `fb90de7` のAfrica PC/共通林業CIは描画stepで失敗。正規 `gh run view --log-failed` の `results-receiver.actions.githubusercontent.com` と正規 `gh run download` の公式blob配布先がForbiddenで停止。APIのcheck/job状態とartifactサイズは読めるが、失敗Assertion/画像は未実見。|原CIの失敗行と画像を正常に読める環境で確認。別host/app/proxyへの転送やlog中への画像再掲載による迂回は行わない。|

入力Library IDs: `libfile_e6e132d2519881918c11f5484034915d`, `libfile_3a6c0985c278819181955d84fea67de7`, `libfile_3fc75e7f5c0c8191b40ee1ca1084e8f2`。signed URLは台帳に保存しない。転送の拒否を別ホスト/プロキシ/runnerへ移して迂回しない。

ESA WorldCover2021 v200が正常取得できた場合の出典条件：CC BY4.0、2021年、原10m分類、表示用overview/一般化の加工を記録。指定creditは `© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium`。原DOIも取得資料に照合して記載し、previewの画素を森林面積として集計しない。

## 検証

自然の原値・形状・ライセンス/hash/接続は個別資料と単体テストで確認。降水PNGをconsumer-localで実見し、乾湿の連続帯・島の東西差を確認。UI画面の実見はそのPNGと区別する。

専用PCspecは単なる文字列有無に加え、SVG/図のbounding box、地図内の実クリック対象、青画素、面と河道の保持、主1920で重要地名衝突、12都市と4図の描画幅/軸、欠測の保持、初期/戻る/タブ往復を検証する。100%/DPR1条件をmetadataに記録。森林/民族/入力画像/精密河口点はmetadataでも未達扱いを維持する。

全サイトテストと再ビルドを重ねた初回結果は生成ファイル欠落のため無効。再ビルドを完了してから検証を順番に行う。最終head・CI・代表画像と結果はDraft PRへ記録し、公開/mergeは行わない。

ローカル最終単体：1147件中1144合格・既存3スキップ、失敗/取消0（concurrency4）。アフリカ単体82/82、河川操作7/7、農畜産12/12、産業/文化/分布23/23、レイアウト10件も再確認した農業2件を含め合格。最終ビルドと配信検証は成功。PC描画CIと全サイト操作テストの確定結果はPRに記録する。

全サイト操作テストの独立実行は582件中574合格・7既存スキップ・1失敗。唯一の失敗は林業のHappy DOM環境にdocument.fontsがない時の待機処理であり、optional guardを修正後に林業/Latin共通枠関連14件を再実行して14/14合格。修正前に読み込まれた全体実行を全件合格とは記録しない。最終headの全サイトCIを別に確認する。

既知の静的な検証契約修正：右の実スクロール対象は子 `.africa-detail-scroll` ではなく親 `.africa-detail`。親の高さ/overflow/scrollHeightと地図高の一致を検証する。共通林業のAfricaについては旧枠の固定幅/上位3分の1条件より共通ナビ順序と実grid幅への一致を検証し、地図/解説/凡例/全ラベルの初期viewport内可視性は保持する。これらが初回CIの実失敗原因だったとは、原失敗行未取得のため断定しない。

林業高さの追加検証：4件の予算単体（上部要素増加/凡例折返し、page scrollで高さ不変、主PC上限/最低領域不足、他地域/非PCに適用なし）、既存林業関連7件を合わせ11/11合格。head8d93024の安全Chrome CIで1440/1024の林業PC検証stepは成功（地図/右欄/凡例/全ラベルの初期可視性とクリック）。同workflowの後続Latin capture stepは失敗しており、workflow全体の成功とは区別する。主1920も独立検査に加えた。

静的に確認できた後続検証契約の修正：共通枠のAfricaナビは `.africa-fields` を使用するため、従来の `.forest-fields` だけのcapture selectorを両者対応へ修正。承認済みAfrica枠変更のbaseとの画素完全一致はround2で対象外とし、他地域の同一画素/レイアウト検証は維持、Africaは専用の可視性/操作検証を実行する。原失敗行未取得のため、これを後続CIの実失敗原因と断定しない。

専用PC検証は最初の失敗を保持したまま、主1920の主要12画面と補助1440/1024の気候・農畜産をJPEGでcapture-onlyとして記録する。各captureの成否もmetadataに残す。未検証画像を合格の代わりにせず、原失敗とstatus=failedを保持する。head8d93024では失敗時artifact（1,465,527 bytes）のアップロード成功をAPIで確認したが、内容は配布拒否のため未実見。

## 親が取得した原失敗と追加修正

head308245eの原CIを親が正規接続GitHubで読取り、round2 specの都市選択line87でToamasinaの通常クリックが30秒timeoutになることを確認した。親の報告ではlabelはvisible/enabled/stableだが背景rect（1100×907、#e9f0f0）がクリック先になる。これはローカルSUID起動障害とは別の、実画面の当たり判定である。

都市buttonのSVG groupに装飾の引出線が含まれていたため、groupのbounding boxが駅位置まで広がり、通常クリックの中心がラベル外の海へ落ち得た。線をbuttonの兄弟要素へ移し、pointer-events=none/aria-hiddenを保つ。buttonの範囲は背景rectと都市名だけになる。地図背景rect自体も装飾としてpointer-events=noneを明記した。色・座標・都市名・観測値・カメラ・選択処理は保持。PC検証ではbutton中心のelementFromPointがそのbutton内に当たること、forceなしのtrial/通常click、全12都市の選択・分類・欠測月数・カメラ不変を主1920/補助1440/1024で確認する。

head308245eの最終CIはValidate site（PR/push）、林業PC、産業が成功、Africa PCは上記失敗。ローカル単体1148件中1145合格・既存3skip。全操作582件中574合格・7skip・農畜産初期9分布の10秒待機1失敗。同headの農畜産対象ファイルを独立再実行し10/10合格、該当ケース2.87秒。並列全体を全件合格とは扱わない。親からの原失敗の確認後に修正headのCIを再実行する。

公開までの追加承認は反映済み。地域全体に未達があるためDraftを維持し、公開順は親と合わせる。追加承認後、同じ正規取得操作を一度再試行したが、gh run view --log-failed/gh run downloadはForbidden、ESA正規proxy/FAO GLC-SHARE/FAOSTAT QCL・FBS・TM/PourPointsは403、Library画像3枚はprepare成功後の同helper materializeがdownload failed、Chromiumは安全設定の同起動でSUID ownership FATAL。ESAの最初の再試行起動で環境proxy設定が付いていなかった点は訂正し、正規proxyで403を確認した。原データ取得なし。再拒否後の迂回や安全設定/権限変更は行わない。

親の実画像QAで、標高のエチオピア高地/ドラケンスバーグ付近に数値と地形名の重複を確認。標高は地形名を先に描き、実際のSVG文字bboxを共有して、4px相当の余白も含めて衝突する数値を省く。数値の座標は原等高線上の固定anchorを保持し、架空の移動や原等高線/数値格子の変更は行わない。PC specは3幅すべてで地形名と残存数値の実bbox重複がないこと、元anchorの数値注記が残ることを確認する。気候/自然の関連16単体は合格。

親のhead2f3acf3正規CI読取では、1920のマダガスカル4都市の通常クリック、農畜産両toggle、森林URL復帰は合格した後、rain-labelsの数値だけの表示がmm単位のassertionに失敗（spec139:98）。親の画像QAでも標高名の重複改善を確認済み。降水の表示captionにmmを追加し、長くなる文字を実bbox＋4px余白で衝突検査する。近い2500/2250mmが競合するギニア湾では高雨量の注記を優先し、重なる反復数値を省く。残す文字は固定の元等雨量線anchorに置き、20原anchor・線・青色帯・照会原値のデータは変更しない。PC specのmm要求は保持し、3幅で数値＋mmの実bbox重複0を追加検証する。原分布操作テストもmm実描画と元anchor一致を検証する。

## 保存原資料の追加（2026-10-11）

親のhead4916ef8実画像確認後、承認済み画面の再撮影を避け、保存済みJRCの北東部/アフリカの角の原画像2枚とガーナ2021国勢調査の16州・9分類を追加。全域森林・他国民族分布の未達を維持し、追加画面だけの安全Chrome PC specを用意した。既存QCLと同archiveのWorld行4品目を補い、未取得原表を47行に絞った。詳細/利用条件/対象人口/正確な追加入力は[原資料と入力待ち](atlas-africa-source-evidence-20261011.md)に記録。

追加後の全単体は1151件中1147合格・既存3skip・無関係のMexico待機1失敗。ビルドと操作テストを重ねた生成ファイル不在の実行は無効とし、ビルド完了を確認して操作テストを独立再実行する。最終headのCI結果はDraft PRに確定後記録し、ローカルの無効/失敗実行を全件合格と主張しない。
