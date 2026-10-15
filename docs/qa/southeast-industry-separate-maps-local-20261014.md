# 東南アジア主要産業：三分野の別地図・ローカル引き渡し

基点は公開済みmain `6f3d4a27c17bf205220d0eb44563975af2bcbdad`。fetch後のorigin/mainも同じSHAだった。作業場所は `/workspace/sea-sector-local` のdetached worktree。旧 `/workspace/sea-industry` のhead `14fc3a54` と既存review-artifactsを保全し、変更していない。保全記録は `/tmp/sea-sector-handoff/preserved-*`。

今回はローカル変更とテストのみ。commit・push・PR・マージ・デプロイは実行していない。共有UI、共有controller、共有スタイル、workflow、他地域、日本専用の保留分野は変更していない。

## 現状の判定

mainは「既に分離されているが過密」ではなかった。`inSector` は強調の判定だけに使われ、`position()` は全30地点から札を配置していた。分野外の地点・札も薄く残り、初期値は三分野混在のall。さらに地図内の265px幅の凡例、40〜52px高のカード、距離230pxに横ずらしを加える候補配置、地図上部の18産業ボタンがあった。

これはソースからの判定で、今回のブラウザー目視結果ではない。

## 地域固有の変更

|別地図|元位置を保持する地点|地名札の候補数|工程の区切り|
|---|---:|---:|---|
|資源・エネルギー|6|6|ニッケル鉱床、一般炭、LNG液化、水力、天然ゴム原料、植林材|
|製造業|15|13|製錬、精製・石化、パーム加工、電子・半導体、自動車、衣料、水産加工、タイヤ、家具|
|サービス業|9|9|港湾、観光、金融、業務受託|

三つの表示を切り替える方式で、MapLibreの投影・国境と元のカメラを再利用する。分野外の地点・札・対応線・立地一覧は非表示にする。初期地図は資源・エネルギー。三分野混在のall地図はなくし、「この分野の全産業」は選択分野内だけの一覧になる。

同じ産業の原料と加工は地点の工程で分ける。スラウェシ鉱床／モロワリ製錬、タイ南部ゴム／ラヨーンのタイヤ、植林材／旧ビンズオン家具は別地図。LNGと水力はエネルギー供給、精製・石化は製造業。港湾は施設のstage文字列がprocessingでもサービス業に置く。

ペナン・クリムの電子・半導体とジュロン・ペンゲランの精製・石化は、近接した同一産業の札だけをまとめた。30地点の座標、個別の工程と一次出典は残し、平均座標や生産量の集計は作らない。まとめた札のアンカーも元位置であり、選択した地点の説明には集約対象を明記する。

札は地名と工程の2行・30px高。大きな枠・影・数量行を外し、対応線を実距離48px以内に制限した。近くに収まらない札は省略し、その地点を移動しない。凡例は地図下へ移した。従来の規模表示6件は、対象・年・能力／投入量の区別と一次出典を付けて地図下に保持した。表示される札の実数はカメラ・画面幅に依存し、上表は候補数である。

18産業ボタンは地図外のnative select一つに変更した。三分野の切替も地図外。産業・地点選択ではカメラ、点、札、対応線を再配置しない。分野を切り替えたときだけその分野の候補集合に変わる。移動・拡大・画面幅変更では通常どおり再計算する。

パーム州別処理量、精米・太陽電池の国単位の資料範囲は製造業の対応品目だけで表示し、他分野への切替で塗り・国境・凡例を解除する。資料の国集合、国と州の境界形状、統計値・分母・年・単位は変更していない。

## 共通UI担当への接続点

- 分野キーは既存URLを保つ `industrySector=resource|manufacturing|services`。`industrySector=resources` もresourceとして受け入れる。旧all・不正値は混在へ戻さず、指定産業・地点に合う分野またはresourceにする。`industryKind=wood` など旧リンクは製造業へ、原料地点を明示した旧リンクは資源へ復元する。
- 分野操作は `button[data-southeast-industry-sector]` の3個。共通タブへ統合するときも同じ属性の操作契約を維持できる。値の読み出しはrootの `data-southeast-industry-sector`。
- 産業操作は `[data-southeast-industry-picker]` のnative select。各分野に属するoptionだけを生成する。`[data-southeast-industry-kind]` の18ボタンは廃止した。
- 工程別の表示分類には新しい `southeastMapKindSectors()` と `southeastSiteSectors()` を使う。既存catalogのprofile.sectorsは供給網全体の所属を保持しており、地図の地点分類には直接使わない。
- 共有 `scripts/verify-industry-pages-smoke.mjs` のsoutheast-asia設定を `products:'[data-southeast-industry-picker]', mode:'select'` にする必要がある。この共有ファイルは担当範囲外なので変更していない。既存のnative select経路で選択・URL・再読込を検証できる。
- 旧手動 `scripts/verify-southeast-asia-regional-reading.mjs` は14ボタン・13札など古い前提を持ち、今回の地図の合否には使わない。既存workflowで使用する東南アジア専用のexpanded検査とsecond-pass検査は地域固有差分として更新した。

## 検証と実画面の区別

単体は6件成功。元データ・工程の分離、近接札グループの完全な地点所属、元アンカーの保持、配置の決定性、非重複、48px制限を検証した。

実ビルドHTMLと実controllerをHappy DOMに読み込んだ操作検証は最終4件成功（単体と合わせ10件成功／失敗・skipなし）。MapLibreの投影・レイヤー境界をテスト用に置き換えているため、WebGLの実画面検証ではない。分野ごとの地点・札・立地一覧、全18項目への到達、選択時の固定、旧URL・履歴、パーム塗りと国境・凡例の分野間解除を確認した。本番buildは最終差分で114ページ成功。地域専用の2本のブラウザー検証スクリプトは構文検査成功。ログは `/tmp/sea-sector-handoff/` に同梱する。

今回の実ブラウザー起動は `chromiumSandbox:true`、`/usr/bin/chromium` で試したが、`/usr/lib/chromium/chrome-sandbox` の設定不備によりsetuid_sandbox_host.cc:166で起動しなかった。sandbox無効化・所有者変更・権限変更をしていない。ブラウザーで確認できた修正後画面・撮影できた画像は0。テスト成功を可読性の目視合格に読み替えない。

実画面検証用の `scripts/verify-southeast-industry-expanded.mjs` は1920×1080、1024×768、390×844の三分野、分野外マークの非表示、短い札の重なり・切れ、48px制限、産業・地点選択後の固定、解除・再読込・履歴とパーム等の補助レイヤーを検査し、画像と測定JSONを保存する。既存のsandbox付きChromeが使える統合環境での実行と、画像目視が残る。今回はCIを起動していない。

## 受け渡し

地域固有の差分一式は `/tmp/sea-sector-handoff/southeast-sector-maps.patch` にまとめる。基点SHAに対し `git apply --check` で適用可否を確認できる。作業treeには新規sceneデータも含めた未commit差分を残す。node_modulesの検証用symlinkやdist生成物はpatchに含めない。
