import type {CultureRegion} from '../../lib/atlas-culture';
const source='https://www.inec.gob.pa/archivos/P053342420231009161532Comentarios_Poblacion%20RFB%202023%20VF.pdf';
const publication='https://www.inec.gob.pa/publicaciones/Default3.aspx?ID_CATEGORIA=19&ID_PUBLICACION=1199&ID_SUBCATEGORIA=7';
export const latinAmericaCulture:CultureRegion={
 id:'latin-america',name:'中南米（収録：パナマ）',
 topics:{
  ethnicity:{mapTitle:'中南米：民族関連の別設問指標（パナマのみ）',title:'パナマ：先住民帰属とアフリカ系自己認識を別々に読む',overview:'パナマ2023年国勢調査では、通常居住者の17.2%が先住民民族への帰属を申告し、別の設問で31.7%がアフリカ系と自己認識しました。国全体の別設問2指標で、全住民を一組の民族分類に分けた構成表ではありません。',explanation:'二つの設問は、先住民民族への帰属とアフリカ系の自己認識という異なる対象を尋ねます。公表値の違いを人口密度・言語・国籍で説明したり、二つの割合を足して残りを別民族とみなしたりできません。国内のどこに何が分布し、なぜそうなったかの地域解説は、境界と調査定義を確認した別資料が必要です。',gap:'パナマの肯定回答2指標のみ。両設問の交差・未回答・否定回答、民族別の詳細、国内の地域別数値は未収録。自己認識の対象は異なるため合計・残差を作りません。他の中南米各国と地域全体の分布は未収録です。'},
  religion:{title:'宗教：正規に採用できる国・地域別構成は未収録',overview:'この版には中南米各国の宗教割合を収録していません。パナマの民族自己認識や、既存の居住人口分布から信仰を推定しません。',explanation:'ブラジル2022年の宗教公表結果などは対象年齢・調査方式を確認していますが、公開転載条件の確認が済んでいません。Pewの世界表を増やして補わず、正規利用可能な資料の対象と定義を確認して採用します。',gap:'全34対象の宗教構成と国内分布は未収録。白い背景を無宗教・特定信仰の分布として読まないでください。'}
 },
 records:[{id:'PAN',name:'パナマ',point:[-80.2,8.7],chartPoint:[-72,-12],year:'2023',topics:{ethnicity:{
  definition:'2023年国勢調査の通常居住者・全年齢、全国計数4,064,780人が分母。先住民民族への帰属申告とアフリカ系の自己認識は別設問の肯定回答指標。原資料が公表した割合のみで、排他的な分類へ組み替えません。',
  rowLabel:'質問指標',rows:[['先住民民族への帰属（別設問）','17.2'],['アフリカ系の自己認識（別設問）','31.7']],colors:['#397968','#a5516d'],
  source,sourceTitle:'INEC · Resultados Finales Básicos, Comentario de Población, p.3 (2023)',
  license:'© INEC / Contraloría General de la República de Panamá · CC BY 4.0',licenseUrl:publication,
  note:'先住民帰属698,114人、アフリカ系自己認識1,286,857人の公表割合。二つの質問の交差・回答状態はこの抜粋に未収録で、合計・残差は計算しません。予備発表の人口総数4,202,572人を最終集計の分母へ転用しません。日本語補足と記号化はInsight Journalによる加工。国内の居住域・大陸の全住民民族構成を示すものではありません。'
 }}}]
};
