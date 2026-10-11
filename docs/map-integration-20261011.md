# 検証済み地域地図の統合（2026-10-11）

確認済み10件の地図修正を通常マージで一つの統合ブランチへ取り込みます。資料不足の項目を完成扱いせず、既存の未収録表示・原典台帳・欠測を保持して公開する範囲です。

開始時のremote mainは `e4258b20a533b8ee0aed511485a7bbd2078ac35a`。公開済みカナダ #320・東南アジア #326を含むこのmainを起点とし、10件の確認済みheadとともに統合履歴の祖先として保持します。各元PRのコミットをsquash/cherry-pickせず、統合PRも許可されているmerge commit方式で取り込みます。

| 元PR | 地域 | 取り込んだ確認済みhead |
| --- | --- | --- |
| [#318](https://github.com/guchio2366-dev/insight-journal/pull/318) | 中南米 | `d700571c815c1cd512661304e93f27a2e1c19e53` |
| [#319](https://github.com/guchio2366-dev/insight-journal/pull/319) | 欧州 | `9e529e88417b0a3135668296c475e36bfb9e1eef` |
| [#321](https://github.com/guchio2366-dev/insight-journal/pull/321) | アフリカ | `5253db181ec0f33afca3066cd1229f533aa1fd23` |
| [#322](https://github.com/guchio2366-dev/insight-journal/pull/322) | 米国 | `72d2b6bb8e23b0a1495d7954864981673b2b11a8` |
| [#323](https://github.com/guchio2366-dev/insight-journal/pull/323) | 日本 | `dfef1463d76d114dc333fb8df56efdc7eea76d14` |
| [#324](https://github.com/guchio2366-dev/insight-journal/pull/324) | メキシコ | `e1820eaf5ca581aec887e480169479b99e8c9013` |
| [#325](https://github.com/guchio2366-dev/insight-journal/pull/325) | ロシア・オセアニア | `de2668aa5b81840ad50d78bbb16a99b43abca005` |
| [#327](https://github.com/guchio2366-dev/insight-journal/pull/327) | 西アジア | `3fc10036d80fdd1c2489de3957a594926cae8510` |
| [#328](https://github.com/guchio2366-dev/insight-journal/pull/328) | 南・中央アジア | `d8878a8c879a64975c9f808e0e02ca33a97a3de5` |
| [#329](https://github.com/guchio2366-dev/insight-journal/pull/329) | 東アジア | `19b21e98e977a40352231c6072208d9e711e0d2d` |

## 共有変更と競合解消

- `AgricultureCommodityKey.astro`: 米国の推計分布と生産量を区別する `scopeNote` と、メキシコの大分類ナビへ林業を移す `forestryInKey` の両方を保持。米国の注記を消さず、メキシコの凡例内に林業を再追加しない。
- `atlas-nature-labels.ts`: 米国の河川線を名札から保護する判定と、東アジアの元anchorを保持した最小引出線距離を併用。両地域の元テストを保持。
- アジア制御・state: 南／中央アジアの独立入口・focus・地方宗教story・都市選択のカメラ保持と、東アジアの国と都市の独立選択・水系直接選択を併存させる。
- アジア表示: 南／中央アジアの実描画feature診断と地方点、東アジアの農畜産参考河川と地形面を保持。南／中央の国勢調査・報告の説明と東アジアの国内文化・全国回答の説明をそれぞれ維持。
- 自動マージされた日本PCスクリプトとアジアCIは、双方の追加検査を保持。カナダの現行分野別検査を旧同位置比較へ戻さない。米国のreduced-motion CSSとsolverの座標系は元PRのまま保持。

`data-source/atlas/africa/statistics/qcl-2024-missing-required-rows.csv` のCRLFは元PR由来の資料バイトとして維持。通常のdiff whitespace検査がこのCRを報告するため、ソース資料を改変して見かけだけ整えない。

アフリカPRの既存 `Africa-Review-Scope: round2` trailerを統合コミット・公開merge commitに引き継ぐ。旧検査の12人口都市・表示select・旧林業枠ではなく、元PRで確認済みのround2全PC検査（1920/1440/1024）を実行する。元PRの `Africa-Review-Evidence: sources` だけへの限定は使わず、全PCに加えてsource-evidenceの原典・実森林paint検査も新PC workflowから実行。元テストは改変しない。地域林業CIが元々定義したアフリカの承認済み枠変更の例外を用い、ロシア・オセアニアは引き続きmainとの矩形・画像SHAの完全一致を要求する。

## 最終版の検証

元PRの合格は各headに対する部分修正の確認であり、今回の最終統合版の合格へ転用しません。統合PRのValidate site・関連地域PC CIの結果を公開前に照合します。ローカルのsandbox有効Chromeは実行環境のsandbox設定不足で起動不可で、目視済みとは記録しません。

`Review integrated maps on PC` はcontents readのみの検査です。既存GitHub Pagesへの公開後、mainのSHAをcheckoutしてproductionモードで実行します。1920×1080 CSS・DPR1・100%・正常sandbox Chromeで14地域の自然環境入口、主要都市の選択／再読込／戻る、共有林業ナビ、NYと宗教札のsolver/実bbox一致を確認。_release SHA、実配信JS/CSS、代表地図資産を同じcheckoutのbuildと照合し、実画面と操作reportをartifactに保存します。証明書や認証の警告を無視しません。

アフリカのアブジャ検査で非同期SVG差し替え中の寸法測定が一度失敗し、同条件再実行は成功。親側の正規artifact独立確認では文字と説明が明瞭でした。親の指摘に従い、`visible()`は現DOMの接続・表示・bboxを同一評価で取得し、2描画フレーム間で安定するまで待機。正の幅・高さ、表示状態、枠内±2pxの元閾値は保持し、安定判定を追加します。地図実装の変更や失敗条件の削除はありません。

共有経路の追加確認：東アジアCIは黄河の流域名札・原河道頂点の直接クリック、戻る・再読込・カメラ保持を検証し、同workflowの南・中央アジア実ブラウザ検査はfocus別入口・国／都市の独立選択・地域別林業・流域選択を検証します。旧広域手動PCスクリプトの農畜産保持条件は追加統合PC検査へ同じ閾値で組み込み、東・南・中央・東南アジアで作物選択後も畜産点数、出典anchor位置（±1 CSS px）、薄い表示（opacity .2）、カメラ、再読込・解除を確認。画像は既存の地域CIと重複して追加しません。

## 残る未実装

森林・流域・民族宗教の未収録地域、品目別需給／国内仕向け／相手先、米国PRISM 1250/1750mm原格子、西アジアの公式カロリーベース自給率などは地域別の資料台帳と未収録表示を保持します。全国率の細地域への配分、欠測のゼロ化、数量比のカロリー自給率への読み替えをしません。GPCCによる米国代替試作、欧州／中南米産業の新分類、インサイト遷移、選挙サイトは今回の対象外です。
