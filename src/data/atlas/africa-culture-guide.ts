export const africaCultureGuideReason='GeoEPR・EPR-EDは公開利用・派生データ配信の明示許諾を確認できていないため、これらに基づく分布図は掲載していません。資料全体が利用禁止という判断ではありません。代替資料も、取得・集計・表示の実装はまだ行っていません。';
export const africaCultureGuideSources=[
 {label:'GeoEPR 2021・公式資料',url:'https://icr.ethz.ch/data/epr/geoepr/'},
 {label:'EPR-ED 2021・公式資料',url:'https://icr.ethz.ch/data/epr/ed/'}
] as const;
export const africaCultureGuides={
 ethnicity:{title:'民族集団の資料と、自己申告を読む代案',description:'GeoEPR2021が扱うのは政治的に関連する掲載集団の居住域で、網羅的な民族分布ではありません。代案は、Afrobarometerの公開調査から民族の自己申告を固定事例の表で読むことです。成人市民の標本調査なので、全住民の民族割合や居住境界とは区別します。言語はGlottologの代表点・系統を別の概念として紹介できます。',scope:'GeoEPRは2021版（2020年に有効な居住域）。この画面に分布図はありません。代案の統計・地図は未取得・未実装です。国選択・比較や民族の境界図を追加する提案ではありません。',source:africaCultureGuideSources[0]},
 religion:{title:'宗教の資料と、国単位の構成を読む代案',description:'EPR-ED2021は掲載集団内の最大3つの宗教区分と相対規模を扱い、住民全体の宗教割合ではありません。代案はPew Research Centerの2010年・2020年推計から、少数の固定事例を構成帯と表で読むことです。国単位の推計を用いるため、国内の分布や宗派の境界は描きません。',scope:'EPR-EDは2021版の集団資料。この画面に分布図はありません。代案のPew資料は2025年公表の2010年・2020年推計で、統計は未取得・未実装です。国選択・比較を追加する提案ではありません。',source:africaCultureGuideSources[1]}
} as const;

export type AfricaCultureAlternative={
 id:string;
 title:string;
 proposal:string;
 reason:string;
 limitations:string;
 status:string;
 conditions:string;
 sources:readonly {label:string;url:string}[];
};

// Proposals only: no alternative observations, estimates or geometries are
// included here. Keep the original guide exports and their source order stable.
export const africaCultureAlternatives:Record<'ethnicity'|'religion',readonly AfricaCultureAlternative[]>={
 ethnicity:[
  {
   id:'afrobarometer-self-identification',
   title:'民族：成人の自己申告を、調査の範囲で読む',
   proposal:'Afrobarometerの公表済み集計を優先し、民族に関する設問・分類を確認した少数の事例を表で紹介する案です。通常の公開データから集計する場合も、回答者の位置情報は取得・掲載しません。',
   reason:'調査が尋ねた自己申告を使い、国・調査年・質問文を示せば、誰についての値かを説明できます。国選択や比較国の操作を設けず、事例の対象と限界を一緒に読みます。',
   limitations:'通常は18歳以上の市民が対象で、子ども・非市民・施設居住者などを含む全住民の構成ではありません。治安等による調査除外、回答分類の違い、小さい標本にも注意が必要です。未回答と欠測を残し、国・調査年・重み・標本数・推定の不確実さを示します。国平均から民族の居住域を作ることはできません。',
   status:'候補資料の案内です。対象国・調査回・設問の採用、統計の取得・集計・表示は未実施です。',
   conditions:'公式サイトは公開データの自由な利用と、公表物での出典・国・調査回・年の引用を案内しています。採用する版の条件を確認し、集計した公表値と出典を表示します。位置付きデータ等は別途申請が必要な制限資料なので使いません。通常データの案内を、個票の無条件再配布許諾とは扱いません。',
   sources:[
    {label:'Afrobarometer：公開データの案内',url:'https://www.afrobarometer.org/data/'},
    {label:'Afrobarometer：利用・アクセス条件',url:'https://www.afrobarometer.org/data/data-usage-and-access-policy/'},
    {label:'Afrobarometer：標本設計・対象者・重み',url:'https://www.afrobarometer.org/surveys-and-methods/sampling/'}
   ]
  },
  {
   id:'glottolog-language-context',
   title:'言語：民族とは別の項目として紹介する',
   proposal:'Glottolog 5.3の言語の代表点と系統を、言語資料の案内として表示する案です。地図の点から言語名・系統・文献を読める構成が考えられます。',
   reason:'GlottologはCC BY 4.0を明示し、出典と変更内容を示した再利用が可能です。境界を塗る必要がなく、資料が持つ代表位置と分類を説明できます。',
   limitations:'言語と民族は一対一に対応しません。代表点は居住境界・話者数・地域の多数派を表さず、現在の居住や移動を測った位置でもありません。民族資料の代用品として表示しません。',
   status:'補助案です。言語データは未取得で、地図・統計は未実装です。',
   conditions:'採用する固定版の編集者・版・出典とCC BY 4.0へのリンクを表示し、翻訳・抽出等の変更を明示します。資料が参照する外部文献や画像は別の権利があるため転載対象にしません。',
   sources:[
    {label:'Glottolog 5.3：CC BY 4.0の表示',url:'https://glottolog.org/legal'},
    {label:'Glottolog：版ごとのデータ案内',url:'https://glottolog.org/meta/downloads'},
    {label:'CC BY 4.0：利用条件',url:'https://creativecommons.org/licenses/by/4.0/'}
   ]
  }
 ],
 religion:[
  {
   id:'pew-religious-composition',
   title:'宗教：国単位の推計を、固定事例の構成帯で読む',
   proposal:'Pew Research Center「Religious Composition by Country, 2010–2020」（2025年公表）から、少数の固定事例を100%の構成帯と数表で紹介する案です。国名と推計年を図のそばに置きます。',
   reason:'国全体の宗教構成を扱う資料なので、政治的に関連する民族集団内の宗教情報より、住民の宗教構成という問いに合います。公式規約は条件付きで表示・改変・派生物の作成を認めています。',
   limitations:'国勢調査や調査を組み合わせた推計で、現在の実測値ではありません。国単位の値から国内の分布は分からず、大きな分類では宗派や複合的な信仰も捉えきれません。「1%未満」等の表記や丸めを保持し、正確な値や境界を推定しません。',
   status:'候補資料の案内です。事例の採用、統計の取得・構成帯の表示は未実施です。国選択・比較国の操作は設けません。',
   conditions:'Pewへの出典表示、元資料の著作権・適用される注意書きを残し、支持・承認を示唆しません。翻訳時は規約指定の免責文を添えます。資料全体や主要部分のミラー・再配信は別途明示許可が必要です。第三者に帰属する資料はPewの許可と同一視せず、無許可の自動収集も行いません。',
   sources:[
    {label:'Pew：2010年・2020年の宗教構成推計',url:'https://www.pewresearch.org/religion/feature/religious-composition-by-country-2010-2020/'},
    {label:'Pew：利用条件・出典表示・翻訳の条件',url:'https://www.pewresearch.org/about/terms-and-conditions/'}
   ]
  }
 ]
};

// Required by Pew's terms if its content is translated in a future display.
// The current guide proposes a use and does not reproduce the source dataset.
export const africaPewTranslationDisclaimer='Pew Research Center has published the original content in English but has not reviewed or approved this translation.';
