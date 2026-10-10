import type {CultureRegion} from '../../lib/atlas-culture';
const source='https://census.statssa.gov.za/assets/documents/2022/P03014_Census_2022_Statistical_Release.pdf';
const licenseUrl='https://www.statssa.gov.za/?page_id=425';
const credit={source,license:'© Statistics South Africa · 出典・独自加工の明示を条件に公表・配布可',licenseUrl};
export const africaCulture:CultureRegion={
 id:'africa',name:'アフリカ（収録：南アフリカ）',
 topics:{
  ethnicity:{title:'南アフリカの人口集団：民族名とは別の大分類',overview:'南アフリカ全体ではBlack Africanが81.4%、Colouredが8.2%、Whiteが7.3%、Indian/Asianが2.7%です。これは国勢調査の人口集団という人種的自己認識の大分類で、ズールー・コーサなどの民族や母語を分けた割合ではありません。',explanation:'南部アフリカの先住集団に、欧州からの入植、植民地期に奴隷化された人々の移送、ナタールへのインド人契約労働者の移住が重なりました。その後、人種隔離政策によって居住が強制的に分けられた歴史があります。これらの背景は現在の4分類と一対一には対応せず、全国割合から民族・母語の居住域を描くことはできません。',sources:[{title:'南アフリカ政府・GCIS：歴史',url:'https://www.gcis.gov.za/sites/default/files/docs/resourcecentre/pocketguide/2003/history.pdf'}],gap:'南アフリカの主要4人口集団の公表割合のみ。「Other」は未抽出で、100%からの残差で補いません。民族自己認識・言語、国内の州別数値、他のアフリカ各国は未収録。GeoEPRの政治的関連集団の居住域を全住民の分布に転用しません。'},
  religion:{title:'南アフリカの宗教帰属：複数の信仰を読む',overview:'全国ではキリスト教85.3%に加え、伝統的アフリカ宗教7.8%、イスラム教1.6%、ヒンドゥー教1.1%などを公表しています。宗教的無所属2.9%は、無神論・不可知論と別区分です。',explanation:'キリスト教が広がった背景には、欧州からの入植とその後の宣教、現地言語への聖書翻訳の歴史があります。現在の調査は信仰や宗教への帰属を尋ねるもので、民族・人種・言語から宗教を決められません。全国割合は少数の信仰を含む構成を示しますが、どの州・町で暮らすかは全国の記号から分かりません。',sources:[{title:'Ditsong国立文化史博物館：宣教と聖書翻訳',url:'https://ditsong.org.za/en/the-historical-background-of-missionaries-in-south-africa-and-the-translation-of-christian-bibles-into-isizulu/'}],gap:'南アフリカ2022年の全国10区分のみ。9州の公表値は原資料にありますが、この版の地図には収録していません。他のアフリカ各国・宗派別・局所の居住域は未収録。公表0.0%は丸め値で、不在を意味しません。'}
 },
 records:[{id:'ZAF',name:'南アフリカ',point:[25,-29],chartPoint:[-12,4],year:'2022',topics:{
  ethnicity:{...credit,sourceTitle:'Stats SA · Census 2022 Statistical Release, Figure 2.3 p.7',definition:'Population group（人口集団）：国勢調査の人種的自己認識の大分類・全年齢の全国集計。民族自己認識や家庭内言語とは別の変数。Figure 2.3の4区分を抜粋。',rows:[['Black African（黒人アフリカ系）','81.4'],['Coloured（カラード）','8.2'],['White（白人）','7.3'],['Indian/Asian（インド・アジア系）','2.7']],note:'原分類名を保持し、生物学的な人種分類や民族名として扱いません。未抽出区分の残差は作りません。数値の抜粋・日本語補足・記号化はInsight Journalによる独自加工で、Stats SAによる分析・推奨ではありません。無料表示用で、販売・有料提供への転用は含みません。'},
  religion:{...credit,sourceTitle:'Stats SA · Census 2022 Statistical Release, Table 2.10 p.24, SA column',definition:'Religious affiliation/belief（宗教帰属／信仰）、全年齢の全国公表割合。Table 2.10のSA列10区分。',rows:[['キリスト教','85.3'],['イスラム教','1.6'],['伝統的アフリカ宗教','7.8'],['ヒンドゥー教','1.1'],['仏教','0.0'],['ユダヤ教','0.1'],['無神論','0.1'],['不可知論','0.1'],['宗教的無所属','2.9'],['その他','1.0']],colors:['#516f90','#5b8d78','#c07835','#bb865f','#ad9a71','#8b83aa','#775991','#a5516d','#9b7696','#899590'],note:'公表1桁の丸め値を保持し、再正規化しません。0.0%は不在ではありません。宗教的無所属・無神論・不可知論をまとめず、未回答を推定しません。数値の抜粋・日本語補足・記号化はInsight Journalによる独自加工で、Stats SAによる分析・推奨ではありません。無料表示用で、販売・有料提供への転用は含みません。'}
 } }]
};
