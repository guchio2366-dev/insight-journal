# 林業の読み物素材と出典

初回の指標は「松材の取得量」。[INEGI CA2022の主表for15](https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for15.xlsx)と[公式CSV ZIP](https://www.inegi.org.mx/contenidos/programas/ca/2022/datosabiertos/ca_2022_upfores_csv.zip)を使う。期間は2021年10月〜2022年9月、単位はm³、全国00を除く31州とメキシコ市の計32地域を比較する。森林面積、森林被覆率、蓄積量、林業GDPとは別の指標である。

## 因果を考える順序

1. **自然条件と資源**：CONABIOは、松・オークを中心とする温帯林が冷涼な山地に成立し、シエラマドレ山系などに分布すると説明している。これは木材資源の所在を考える背景となる。[CONABIO「Bosques templados」Descripción / Distribución](https://www.biodiversidad.gob.mx/ecosistemas/bosqueTemplado)
2. **認可と実際の取得**：INEGIの主表は、活動中の林業生産単位、伐採認可を持つ単位、伐採を行った単位、認可量、実際の取得量を区別する。資源の存在だけで取得量は決まらないという読み方ができる。[INEGI for15](https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for15.xlsx)
3. **取得した木材の利用**：補足表には丸太や製材向けなどの区分と、取得量・販売量がある。「製材向け」は木材の利用区分であり、完成した板材の工場生産量ではない。[INEGI for18](https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for18.xlsx)
4. **社会と環境への関係**：森林は木材の供給に加え、水の浸透、侵食抑制、生物の生息地を支える。木材利用とこれらの機能をあわせて考える。取得量の地図だけでは、森林減少や持続可能性の良否を判定できない。[CONABIO「Bosques templados」Servicios ambientales / Impactos y amenazas](https://www.biodiversidad.gob.mx/ecosistemas/bosqueTemplado)

この順序は公式資料から組み立てた説明の仮説であり、州別統計による因果効果の推定ではない。道路、加工拠点、認可、管理方法の差は追加調査の論点として扱う。

## 掲載文の候補

### 見出し

松材の取得はどの州に集中しているか

### 地図の短い説明

2021年10月〜2022年9月に林業生産単位が取得した松材の量を比較します。ドゥランゴ州は約417.4万m³、チワワ州は約180.0万m³で、両州は全国の松材取得量の約79.4%を占めます。この割合は木材の取得量に占める構成比です。森林面積の割合とは異なります。[INEGI for15](https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for15.xlsx)

### 地理から利用までの説明

松やオークが生育する冷涼な山地は、木材資源を支える自然条件です。州別の松材取得量を見ると、資源の分布が生産にどうつながるかを考えられます。ただし、取得量は森林の広さだけでは説明できません。伐採の認可や実施を経て、木材は丸太や製材向けなどに利用されます。[CONABIO](https://www.biodiversidad.gob.mx/ecosistemas/bosqueTemplado)、[INEGI for15](https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for15.xlsx)、[INEGI for18](https://www.inegi.org.mx/contenidos/programas/ca/2022/tabulados/ca2022_for18.xlsx)

森林は水や土壌、生物の生息地も支えています。木材の供給と森林の機能を両立する管理について考えるには、この地図に加え、森林の変化や管理方法の資料が必要です。[CONABIO](https://www.biodiversidad.gob.mx/ecosistemas/bosqueTemplado)

### 読み取りの問い

- 松材の取得量が多い州と、冷涼な山地の位置はどのように対応しているか。
- 森林の分布が似ていても取得量が異なるなら、認可や木材利用の条件にどのような違いがあるか。
- 森林の持つ水循環や生息地の機能を保ちながら、木材を利用するには何を調べればよいか。

## 地域名・用語・数値

| 表示候補 | 原典・意味 | 表示上の扱い |
| --- | --- | --- |
| ドゥランゴ州 | Durango、コード10 | 松材取得量4,173,803.736 m³、for15のH21 |
| チワワ州 | Chihuahua、コード08 | 松材取得量1,800,391.2751 m³、for15のH19 |
| 西シエラマドレ・東シエラマドレ | Sierra Madre Occidental / Oriental | CONABIOが挙げる温帯林の分布する山系。州の平均気候を断定しない。 |
| 松材 | Pinus spp. | マツ属の木材。特定の一種だけを指さない。 |
| オーク類 | Encino / Quercus spp. | コナラ属。日本の特定の樹種へ置き換えない。 |
| 林業生産単位 | Unidad de producción forestal、UPF | センサスの生産単位。森林面積や森林の区画数ではない。 |
| 木材取得量 | Volumen de madera obtenido | 調査期間に取得した木材の量、m³。立木の蓄積量ではない。 |
| 認可量 | M3_MADER_AUTO | 認可された木材量。実際の取得量や販売量と区別する。 |
| 丸太 | En rollo | 用途・形態の区分。地図の松材総量に加算しない。 |
| 製材向け | Para aserrío | 木材の利用区分。製材品の生産量と区別する。 |

全国の松材取得量は7,528,399.0691 m³。ドゥランゴ＋チワワは5,974,195.0111 m³。約79.4%は後者を全国松材量で割った独自集計で、INEGIが公表した構成比をそのまま転載したものではない。表示はm³と万m³を換算して使い、取得量と構成比を別々に記載する。

## 加工・出典表示に必要な事項

- 原典ZIPとExcelはrawに無加工で保管した。原典URL、取得日、SHA-256、列定義、検証値はsource-manifest.jsonに記載した。
- CSVの空セルは秘密保護のための非公表値。0へ変換しない。主指標VOL_OBT_PINOは32州とも欠損なし。CoahuilaとMorelosは原表に0が明記されている。
- for18にはCoahuilaとMorelosが掲載されない。for15の値を地図の根拠とする。for18の非掲載を理由に新たな0を補わない。
- オーク取得量はDurangoでfor15とfor18の間に3,693 m³の差がある。原因は未確定。松材量は一致するため初回指標に採用し、両表の総量やオーク量を混合しない。
- [INEGI利用規約](https://www.inegi.org.mx/inegi/terminos.html)は加工・公開・商用利用を認め、出典と加工の明示を求める。表示候補は「出典：INEGI, Censo Agropecuario 2022, ca2022_for15。集計・地図表示は本サイトによる。」。
- CONABIOの本文更新日は2021年11月22日。地域・生態の背景説明として参照し、本文の面積や過去年の消失率を2022年の州別森林被覆値へ転用しない。

## 検証済みの範囲

公式CSVには全国＋32連邦構成主体の33行を収録。州コードは01〜32に各1行、松材量の欠損なし。32州をdecimal演算で合計すると7,528,399.0691 m³となり、全国00の値に完全一致する。for15のExcel全32地域、およびfor18に掲載される松材の23地域について、CSVと小数点以下4桁で照合し不一致は0件。rawの3ファイルは取得済み原典とSHA-256が一致する。地図の作成やアプリ用JSONの編集はこの担当範囲には含めない。
