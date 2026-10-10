import type {CultureRegion} from '../../lib/atlas-culture';
import {pew2020EuropeGroups,pew2020EuropeRow,pew2020EuropeSource,pew2020EuropeTerms} from './europe/pew-religion-2020';

// Reuse the existing European excerpt. No additional Pew country rows are copied.
const row=pew2020EuropeRow('RUS')!;
export const russiaCulture:CultureRegion={
 id:'russia',name:'ロシア',
 topics:{
  ethnicity:{
   title:'民族：国勢調査の全国・地域集計は未収録',
   overview:'この版はロシア全住民の民族構成を収録していません。西部・シベリア・極東の人口密度は既存の「人口分布」で読めますが、密度や国籍から民族を推定しません。',
   explanation:'民族自己認識、母語、日常使用言語は異なる質問です。政治的に重要な集団だけを載せる居住域資料も全住民を網羅しません。調査の質問・未回答・対象領域と利用条件を確認できる資料を採用する必要があります。',
   gap:'全国・共和国／州別の民族自己認識は未収録。白い背景の国土は特定集団の居住域や単一民族を示しません。'
  },
  religion:{
   title:'ロシア全体の宗教構成：7つの広い区分',
   overview:'全国ではキリスト教69.9%、宗教的無所属20.2%、イスラム教8.2%が大きく、仏教やその他の宗教も含まれます。国全体の構成を示す記号で、西部・シベリア・極東のどこに何人住むかは分かりません。',
   explanation:'Pewは国勢調査・調査研究などを組み合わせ、各資料の質問と対象を調整して2020年の全年齢構成を推計しています。帰属・自己認識の推計であり、礼拝参加や信仰の強さではありません。宗教間の違いを民族や気候から推定せず、国内の歴史的背景や局所分布は別の資料で確かめます。',
   gap:'国内の共和国・州・居住域別構成は未収録。キリスト教の正教会・カトリック・プロテスタント等への宗派分割はできません。民族構成もこの推計には含まれません。'
  }
 },
 records:[{id:'RUS',name:'ロシア',point:[105,62],year:'2020',topics:{religion:{
  definition:'全年齢の全国宗教構成推計。Pew Research Centerの2025年公表・2026年更新公開表／Appendix B、Russia 2020の7区分。全国の直接観測値や国内分布ではありません。',
  rows:pew2020EuropeGroups.map((group,index)=>[group.label,row.shares[index]]),
  colors:pew2020EuropeGroups.map(group=>group.color),
  source:pew2020EuropeSource,sourceTitle:'Hackett et al. (2025), Religious Composition by Country, 2010–2020, Pew Research Center · Appendix B p.16',
  license:'Pew Research Center利用規約：既存欧州抜粋のRUS行を再利用',licenseUrl:pew2020EuropeTerms,
  note:'0.1%未満を0%に変換せず、丸めた値を再正規化しません。欧州版と同じRUS行の表示場所を追加したもので、抜粋の国数は増やしていません。Pew Research Center has published the original content in English but has not reviewed or approved this translation.'
 }}}]
};
