import type {CultureRegion} from '../../lib/atlas-culture';

const abs='https://www.abs.gov.au/articles/religious-affiliation-australia';
const quick='https://www.abs.gov.au/census/find-census-data/quickstats/2021/AUS';
const nz='https://www.stats.govt.nz/information-releases/2023-census-population-counts-by-ethnic-group-age-and-maori-descent-and-dwelling-counts/';
const nzReligion='https://www.stats.govt.nz/information-releases/2023-census-population-dwelling-and-housing-highlights/';
export const oceaniaCulture:CultureRegion={
 id:'oceania',name:'オセアニア',
 topics:{
  ethnicity:{title:'豪州の祖先と、NZの民族自己認識',overview:'豪州では英国・アイルランド系などの祖先回答が多く、NZでは欧州系に加えてマオリ・アジア系・太平洋系の自己認識が併存します。国ごとに異なる質問の全国集計です。',explanation:'豪州の祖先回答は家族の由来、NZの民族回答は本人が属すると考える文化的集団です。先住民の歴史と欧州からの入植、その後の移住が重なる社会を、同じ「民族」の単一分類に置き換えずに読みます。',gap:'豪州は原表の主要祖先5回答、NZは6つの大分類を収録。豪州の先住民自己認識3.2%は別質問として併記。残る豪州の祖先区分、両国の国内地域別構成と太平洋島嶼国は未収録です。'},
  religion:{title:'豪州・NZの宗教と無宗教を分けて読む',overview:'豪州ではキリスト教と無宗教を含む世俗的回答がともに大きく、NZでは無宗教が人口の約半数を占めます。豪州の「その他の宗教」は仏教・ヒンドゥー教・イスラム教などを合わせた公表区分です。',explanation:'豪州では英国からの入植と、その後の欧州・アジア・中東などからの移住が宗教構成に重なっています。国勢調査は宗教への帰属を尋ね、礼拝への参加頻度や信仰の強さを測ったものではありません。',gap:'豪州は全国の公表4区分、NZは公式要約の主要3区分を収録。NZの残る宗教区分・未回答、両国の国内分布、PNG・フィジーなどの太平洋島嶼国・地域は未収録。無宗教と未回答は別です。'}
 },
 records:[
  {id:'AUS',name:'オーストラリア',point:[134,-26],chartPoint:[163,5],year:'2021',topics:{
   ethnicity:{definition:'Ancestry（祖先）、通常居住者・全年齢。未回答者を含む人口が割合の分母。最大2回答で重複します。主要5回答の抜粋。',rows:[['English（イングランド系）','33.0'],['Australian（オーストラリア系）','29.9'],['Irish（アイルランド系）','9.5'],['Scottish（スコットランド系）','8.6'],['Chinese（中国系）','5.5']],supplement:{label:'先住民自己認識',value:'3.2',definition:'Indigenous status：Aboriginal and/or Torres Strait Islander originと答えた人。通常居住者の2021年国勢調査計数。祖先回答とは別の質問で、祖先の割合に加算しません。過少計数補正後の人口推計3.8%とも異なります。',source:'https://www.abs.gov.au/statistics/people/people-and-communities/snapshot-australia/latest-release',sourceTitle:'ABS · Snapshot of Australia, 2021'},source:quick,sourceTitle:'ABS Census 2021 QuickStats · Ancestry, top responses',license:'© Commonwealth of Australia / CC BY 4.0',licenseUrl:'https://www.abs.gov.au/website-privacy-copyright-and-disclaimer',note:'自己認識の民族・人種や出生国ではありません。回答は重複するため合計・残差を計算しません。未抽出の祖先や未回答を「その他の民族」にまとめていません。'},
   religion:{definition:'Religious affiliation（宗教への帰属）、全年齢の全国割合。未回答・記述不十分も分けた公表値。',colors:['#516f90','#899590','#9b7696','#777777'],rows:[['キリスト教','43.9'],['その他の宗教（仏教などを含む）','10.0'],['世俗・その他の精神的信念・無宗教','38.9'],['未回答・記述不十分','7.3']],source:abs,sourceTitle:'ABS · Religious affiliation in Australia (2022), Total row',license:'© Commonwealth of Australia / CC BY 4.0',licenseUrl:'https://www.abs.gov.au/website-privacy-copyright-and-disclaimer',note:'無宗教を含む広い公表区分38.9%と「No Religion, so described」38.4%は異なります。未回答・記述不十分7.3%は未回答だけの6.9%と異なります。丸められた原値を保持し、合計100.1%を100%に補正しません。'}
  }},
  {id:'NZL',name:'ニュージーランド',point:[172,-41],chartPoint:[224,-34],year:'2023',topics:{
   ethnicity:{definition:'Ethnic group（民族自己認識）、国勢調査の通常居住者・全年齢。複数回答を各集団に数えるtotal response方式。公表された6つの大分類。',rows:[['European（欧州系）','67.8'],['Māori（マオリ）','17.8'],['Asian（アジア系）','17.3'],['Pacific peoples（太平洋系）','8.9'],['中東・中南米・アフリカ系（MELAA）','1.9'],['その他の民族','1.1']],source:'https://www.stats.govt.nz/infographics/2023-census-national-and-regional-data/',sourceTitle:'Stats NZ · 2023 Census national and regional data (10 June 2024)',license:'© Stats NZ / CC BY 4.0',licenseUrl:'https://www.stats.govt.nz/about-us/copyright/',note:'民族は国籍・祖先・マオリの血統と別の変数。重複回答で合計は100%を超えます。MELAAは中東・中南米・アフリカ系をまとめた原区分。未回答を「その他の民族」へ加えません。'},
   religion:{definition:'Religious affiliation（宗教への帰属）、国勢調査の通常居住者・全年齢。全国の公式要約から3区分を抜粋。',colors:['#9b7696','#516f90','#bb865f'],rows:[['無宗教','51.6'],['キリスト教','32.3'],['ヒンドゥー教','2.9']],source:nzReligion,sourceTitle:'Stats NZ · 2023 Census population, dwelling, and housing highlights (3 October 2024)',license:'© Stats NZ / CC BY 4.0',licenseUrl:'https://www.stats.govt.nz/about-us/copyright/',note:'残る宗教・回答状態はこの抜粋に未収録。残差を無宗教・その他の宗教・未回答と決めず、各割合を独立して表示します。2023年調査票以外の資料による補完もある国勢調査集計です。'}
  }}
 ]
};
