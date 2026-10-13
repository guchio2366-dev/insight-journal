# 欧州主要産業の三分類（Draft）

PR335の既存欧州修正を基点に、2026-10-12 20:47 UTCの産業保留解除を適用。マージ・公開は行わない。既存22拠点を保持し、8拠点を追加した。main `a07ab7277b2c7eb89e51ef1be0d72dccfbec497d` と既存Draft head `e9d584a29befb19bd58b33a61754e89a4cf53e2c` を開始時に照合し、三分類の重複実装がないことを確認した。ローカルAGENTS/.agents/skillsは存在しない。

目的：産業名から集積を追い、資源を採取・原料化する場所、製品を作る場所、人と情報の集積を分けて読む。

- [現行指針](https://app.notion.com/p/3f7340138e7381489528fb5c4e873663?pvs=204)：三分類と右説明・地図下統計を維持。欧州産業の旧保留は今回の明示指示で解除。
- [判断事例](https://app.notion.com/p/3f7340138e738188918bc31c2206ac28?pvs=204)：J04は産業を軸にすることと工程に意味のある重複、J05は選択と履歴復元でカメラ・ラベルを固定、J07はCIと目的達成を分けて判定することを適用。カナダの画面配置を完成見本とは扱わない。

## 採用と次点

| 分類 | 業種 | 掲載位置 | 意味 |
|---|---|---:|---|
| 資源・エネルギー | エネルギー、鉱業・素材、銅、発電 | 10 | 石油・ガス採取／処理・精製、鉄鉱石、銅採鉱／精錬、木質燃料、水力・原子力 |
| 製造業 | 自動車・機械、化学・医薬品、航空機、繊維・衣服、食品加工、鉱業・素材、銅、エネルギー | 17 | 自動車、半導体装置、通信機器、化学・医薬品、航空機、繊維、パスタ、パルプ、銅精錬、石油精製 |
| サービス業 | 港湾物流、金融、情報・研究、観光 | 9 | 海港・内陸接続、金融、通信・食品の研究、海岸・山地観光 |

重複を除く30位置・13業種。拠点数は生産額・雇用の順位ではなく、既存根拠に追加の工程・地域差を補う選定。欧州全施設の網羅図ではない。国平均から国内帯は作らず、物流線・工場境界・供給圏を推測して描かない。

ペルニスは燃料・原料を使用可能にする精製と製品を作る化学設備、グウォグフは資源の精製と加工素材の製造、カウカスは木質燃料とパルプ、オウルは通信機器の製造と研究開発という違う関係を右で説明する。ワーヘニンゲンの食品研究点はサービス業に置き、食品の製造量を示したことにしない。ハンブルク／ロッテルダムの物流説明には港当局資料を追加し、航空機／化学の出典で代用しない。

次点：鉄鋼、風力、追加の半導体生産拠点。重要性は認めるが、操業中と建設計画の区別・調達関係・位置の一次根拠がこの作業で揃わないため採用しない。thyssenkruppの候補URL `https://www.thyssenkrupp-steel.com/en/company/locations/duisburg.html` はWebツールが `URL … is not accessible via this tool.` と返した。HTTP応答やTunnel拒否とは判断できず、反復・代替取得はしない。この候補の取得支援を今回の必須条件にはしない。

## 原資料と表示契約

| 追加位置／更新 | 確認した一次資料 | 地図で読む内容 |
|---|---|---|
| オルメン・ランゲ | [Norwegian Petroleum](https://www.norskpetroleum.no/en/facts/field/ormen-lange/) | 海底ガス生産、ニューハムナで処理、英国への輸出。流量線は描かない |
| ニューハムナ | [Norwegian Petroleum・陸上設備](https://www.norskpetroleum.no/en/production-and-exports/onshore-facilites/) | アウクラの水分除去・凝縮液分離・圧縮 |
| ペルニス | [Shell・製造拠点](https://www.shell.com/business-customers/chemicals/manufacturing-locations.html) | 同じ位置に石油精製と化学生産 |
| ルビン周辺 | [KGHM・採鉱選鉱](https://kghm.com/en/our-business/mining-and-enrichment)／[Lubin](https://kghm.com/en/our-business/mining-and-enrichment/lubin) | 南西ポーランドの3鉱山と選鉱工程を地域代表位置で読む |
| グウォグフ | [KGHM・製錬精製](https://kghm.com/en/our-business/smelting-and-refining/glogow) | 銅精鉱から精製銅へ |
| クヴィルダル | [Statkraft](https://www.statkraft.com/global-presence/norway/kvilldal-hydropower-plant/) | スルダルの水力発電設備 |
| グラヴリーヌ | [EDF](https://www.edf.fr/centrale-nucleaire-gravelines) | 原子力の電力化。2025年実績を説明する2026年紹介 |
| キスタ | [Kista Science City](https://kistasciencecity.com/) | 企業・研究機関・大学、通信／デジタル技術の集積 |
| オウル更新 | [Nokia・2025-09-05](https://www.nokia.com/newsroom/nokia-opens-new-state-of-the-art-rd-and-manufacturing-campus-to-deliver-next-generation-networks-built-for-ai/) | 新キャンパスの研究・製造。2022年イベントだけを現在の根拠にしない |
| 港湾補足 | [Rotterdam](https://www.portofrotterdam.com/en/logistics)／[HPA](https://www.hamburg-port-authority.de/en/) | 海港・保管・積替え・鉄道等の接続 |

位置は資料に挙がる海域・自治体・産業地区の概略代表点。住所レベルの測量精度、鉱区・工場群境界、分布の面積は主張しない。各地点は右に対象期間と一次リンクを保持。新規ページ図版・地図・ロゴ・データベースの複製は行わず、事実の独自要約・概略点を既存基図に表示する。既存22拠点の資料・統計は保持し、国別GDPの分母や内包関係を変更しない。

## 操作と検証

三分類を上段、その分類内の業種を次段に置く。業種選択は全拠点を残して強調。右側の単一表示のみ同業種に限定する。拠点選択のカメラは動かさず、選択・単一表示・戻る／進む・再読込でも初期配置を再利用する。点のみの拠点のホバー幅も配置計算へ持ち込まない。旧industryGroup URLと名称ID（下線を含む）を復元し、比較からの復帰は分類・選択・単一表示を保持する。

`tests/browser/atlas-europe-industry-review.mjs` は1920×1080 CSS・倍率100%・DPR1で通常地図／明示staticを分けて確認する。全分類・全業種・全掲載位置の解説と出典末尾、名称衝突、選択前後のviewBoxとラベル座標・寸法、単一表示、履歴、再読込、未選択の初期、正常な詳細海岸線の取得、JavaScriptエラーを確認。3分類の初期と航空機の強調／単一表示を撮影する。最終headはCIのreleaseとchecks.jsonに記録する。

ローカル確認：全単体1231件中1228成功・既存3スキップ、欧州回帰47成功、その後の初期HTML・操作変更の再確認26成功、原資料・URL・読解の追加確認16成功。通常／明示staticで3分類・全業種の強調と単一表示、全拠点の説明・出典末尾、分類ごとの再読込と戻る／進むを確認した。10画像のうち通常3初期・航空機の強調／単一、およびstaticの3初期を目視し、密集地の名称衝突や長い付箋がないことを確認した。

同梱images/checks.jsonはコミット前の候補を作ったローカルビルド（commitSha=local）の記録。最終headの同じソースを別出力先で再撮影し、releaseのcommitShaと照合する。CIも最終headをビルドして記録する。結果・最終画像の版はDraft本文へ記載する。以前の他分野画像を再利用し、変更のある産業画面を確認する。自動試験成功は本人の合格・公開とは区別する。

## 保持する未達

[既存欧州残件と取得記録](../europe-2026-10-12/README.md)の全流域・本支流接続、乳牛／ブドウ／オリーブの生産帯、民族・使用言語・宗派の欧州全域の実分布、ヘルシンキ雨量の原資料問題は解消していない。Figshare／CORINE／Eurostatその他の拒否済み取得は再試行・迂回しない。今回の産業三分類をもって欧州全依頼が完了したとは扱わない。
