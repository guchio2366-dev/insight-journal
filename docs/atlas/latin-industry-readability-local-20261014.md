# 中南米の産業地図：分野別表示とラベル整理（ローカル受け渡し）

> 統合版では意味のある資源・製造の共有参照を復元し、実工程名で区別しています。以下は地域担当の引渡時点の記録です。最終動作は [統合記録](../qa/industry-map-readability-integration-20261015.md) を参照してください。

## 基準と作業範囲

公開main `6f3d4a27c17bf205220d0eb44563975af2bcbdad` をfetchして一致を確認した。既存の `/workspace/insight-journal`（work）と `/workspace/insight-journal-latin-industries`（5577eb4a）はcleanのまま保全し、新しいdetached worktree `/workspace/insight-journal-latin-readability` で作業した。

今回の権限はローカル変更・テストまで。commit、push、PR作成、マージ、デプロイ、CIの新規実行はしていない。共通UI、他地域、日本の他分野、世界品目地図は変更していない。

## 現状の切り分け

旧実装にも三分野の切替と別の表示集合はあった。ただし `sectors` は供給網の重複所属だったため、資源図には製錬・精製等の加工工程13例、製造業図にはエビ養殖原料地域2例が含まれた。さらに全産業の名称を地図上へ強制配置し、国・州の数量注記と長い引出線が過密になっていた。

旧カタログの所属をそのまま表示判定に使うのをやめ、`atlas-latin-industry-layers.ts` で工程別ビューを定義した。鉱山・発電、加工・製造、サービスを別に描く。

- 資源図：採掘・採取と水力発電。製錬・精製、リチウム化合物製造等は製造業図へ。
- 銅のセロ・ベルデ、ニオブのアラシャ・カタロン：根拠のある採掘と加工をそれぞれの図へ表示し、工程名・記号を分ける。
- 製造業図：加工工程45例。エビ養殖地域は地図に描かず、選択時の地図外「原料参考」に保持する。
- サービス図：サービス13例のみ。

元カタログ76立地・31品目・109指標・95出典、原座標、工程の原文、年・分母・単位は変更していない。カタログSHA-256は `86fac5495b6e984fa6f2c09e7bfccef847c312e32e3bf6f1f70634655d7031d7` で基準mainと一致する。

## 表示の変更

地図上の全品目メニューをやめ、選択肢を右欄の閉じた「産業を選ぶ」に移した。初期表示は少数の事実に基づく地域・産業注記で、注記自体は操作ボタンではない。選択時はその産業の短い地名だけに切り替える。

同じ産業・国・工程の近接例を画面距離で集約する。これは表示上の集約であり、測定された産業密度や新たな経済集積の認定ではない。集約は全メンバー間28px以内（狭幅32px以内）、案内位置は原資料のメンバーの一つ。例数は記号内の数字で示し、数量・GDP・生産規模として扱わない。重なる記号の表示調整は最大24px。原座標は保持する。

注記の接続線は最大36px（従来は通常140px・狭幅200px）。図を覆う大きな凡例ボックスと国・州の数量付箋を外し、記号説明は図の下、数量と出典は既存の下部統計に残した。レイアウトは分野・範囲・表示寸法で決まり、産業・立地の選択でカメラ、集約、記号を動かさない。

### 地図単体960×770の実測

| 分野 | 旧地点→新工程別地点 | 新集約記号 | 旧常時ラベル→新常時注記 |
|---|---:|---:|---:|
| 資源・エネルギー | 27→19 | 16 | 17→8 |
| 製造業 | 47→45 | 31 | 26→8 |
| サービス業 | 13→13 | 11 | 11→5 |

360×600の地図単体は、集約記号15／28／11、常時注記は各4個。地点数は工程別ビューの件数で、三図の合計はユニークな立地数ではない。元の全76例はデータ・個別解説に保持される。

## 共通UI担当への接続点

- 表示集合の正本は `industrySiteViews(sector)`、品目集合は `industryIdsInSector(sector)`。元JSONの `sectors` は旧供給網の所属なので、表示集合のフィルターへ戻さないこと。
- `industrySectorsForSite(id)` は工程別に実在する図だけを返す。`industryReferenceSites('manufacturing')` は地図外の養殖原料2例。
- 描画は既存 `renderIndustrySectorMap(state,width,height)`、図に `data-lis-map-sector` を付けた。単独表示・国の文脈・履歴は既存URL契約を維持する。
- 共通の三分野ボタン `[data-latin-industry-sector]` は変更していない。共通UIで独立パネルを持たせる場合は、選択中の分野だけを可視・操作対象にし、各パネルのselector/controllerをスコープすること。現行の地域コンポーネントは1つの表示ホストへ分野別SVGを描く。
- 地図外の品目選択は `[data-lis-legend]`、個別立地は `[data-lis-sites]`、集約記号は `[data-lis-cluster]` / `data-lis-members`。集約記号を押すと品目を選び、任意の先頭都市へ自動選択しない。
- 旧資源URLの精製専用拠点は製造業へ正規化する。原料参考の養殖URLは保持し、地図外情報と明記する。

共通ファイルの変更は不要だった。三分野の独立パネルや共通ナビゲーションの最終構成は共通UI担当に委ねる。

## 検証と未確認

- 全単体テスト：1,403件中1,400成功、既存3件skip、失敗0。
- 地域対象単体14件：成功。工程分離、元座標、全メンバーの集約、36px線、24px調整、密集時の記号間隔、配置維持、旧URLを検証。
- 中南米の操作テスト15件：成功。三図の切替、地図外選択、全品目・立地、単独、履歴・再読込、工程移動、原料参考、キーボード、全22群の下部根拠、既存輸出図を検証。
- 最終ビルドとローカル配信情報の整合確認：成功。未コミットのローカル変更であり、公開SHAは更新していない。
- `scripts/render-latin-industry-readability.mjs` は基準mainと変更後の地図単体、選択状態を960×770／360×600で20シーン書き出す。SVGとPNGを目視し、密集と長い線の減少、選択時の短い地名、集約数と地名の分離を確認した。

**静止SVGの確認は実画面確認ではない。** ローカル通常Chromeは `/usr/lib/chromium/chrome-sandbox` の所有者がrootでないためSUIDサンドボックス起動を中止する。権限・サンドボックスは緩めていない。実ブラウザーの全ページCSS、PC／スマートフォンの全体構成、スクロール・タップ、フォーカスの見え方、共通UI統合後の可読性は未確認。

実ブラウザーが使える環境で、ビルド後に以下を実行する。地域用の画面検証スクリプトも新方針へ更新済み。少数注記、地図外選択、集約メンバー、工程分離、固定配置、全図のキャプチャを検証する。

```sh
REVIEW_CHROME_PATH=/path/to/ordinary/chrome \
LATIN_INDUSTRY_OUTPUT=/tmp/latin-readability-browser \
node scripts/verify-latin-industry-sectors-pc.mjs
```

静止図のみの再生成：

```sh
XDG_CACHE_HOME=/tmp/latin-font-cache \
LATIN_READABILITY_OUTPUT=/tmp/latin-readability-preview \
node scripts/render-latin-industry-readability.mjs
```

静止図には凡例・選択欄・共通UIの全ページ構成は含まれない。静止図の `static-map-report.json` は `browserScreenshot:false`、変更中のworktreeであること、ソースファイルと各画像のSHA-256を明記する。

## ローカル差分の受け渡し

`/workspace/latin-industry-readability-handoff.patch` に、未追跡の新規モジュール・出力スクリプト・本書を含む差分を保存する。基準6f3d4a27の一時indexで `git apply --check --cached` を行う。commitを作らずに適用可能性を確認する。

```sh
git apply --check /workspace/latin-industry-readability-handoff.patch
git apply /workspace/latin-industry-readability-handoff.patch
```

共通UI側の作業を保全してから適用し、地域ファイルの競合は内容を確認すること。最終の承認が来るまではcommit・push・PR作成をしない。
