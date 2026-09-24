export type PopulationInsight = {
 id:string; views:readonly string[]; title:string; preview:string; destination:string;
 page:'population'|'industry'|'nature'; params:Record<string,string>; bounds:readonly [number,number,number,number];
 paragraphs:readonly string[]; legend:string; note:string; sources:readonly {label:string;url:string}[];
 counties:readonly string[]; anchors:readonly {label:string;coordinate:readonly [number,number];dx?:number;dy?:number}[];
 compare?:{view:string;label:string;params:Record<string,string>};
};

export const populationInsights:readonly PopulationInsight[]=[
 {
  id:'black-belt-vote',views:['ethnicity','vote'],
  title:'南部の民主党支持には、黒人の定住史と公民権を求めた歴史が重なる。',
  preview:'黒人人口の分布と、南部の選挙結果を切り替えて見る',destination:'人口 › 投票傾向 · 南部',
  page:'population',params:{popView:'vote'},bounds:[-92,30,-84,36],
  paragraphs:['黒人有権者は、生活支援や人種差別への対応を通じて、民主党への支持を強めてきました。南部では投票権運動と1965年の投票権法によって政治参加が広がり、黒人人口の多い農村も民主党の支持基盤となりました。'],
  legend:'輪郭：比較する２郡。地色を切り替えて、黒人人口の集積と2024年の選挙結果を比較。',
  note:'綿花栽培と奴隷労働の歴史は定住地を、ニューディール期以降の政党支持の変化と公民権運動は政治参加を理解する手掛かりです。公民権立法には両党の議員が関わりました。郡の人口構成から個人の投票先は分かりません。',
  sources:[{label:'米下院歴史局：黒人有権者と政党支持の変化',url:'https://history.house.gov/Exhibitions-and-Publications/BAIC/Historical-Essays/Exile-Migration-Struggle/Fulfillment-of-Prophecy/'},{label:'米国国立公文書館：1965年投票権法',url:'https://www.archives.gov/milestone-documents/voting-rights-act'}],
  counties:['county:01047','county:28027'],anchors:[{label:'ダラス郡（アラバマ）',coordinate:[-87.06,32.32],dy:24},{label:'コアホマ郡（ミシシッピ）',coordinate:[-90.55,34.23],dy:-14}],
  compare:{view:'ethnicity',label:'黒人人口の分布',params:{popView:'ethnicity',popEthnicity:'black'}},
 },
 {
  id:'detroit-migration',views:['ethnicity'],
  title:'デトロイトの黒人人口の集積には、南部からの移住の歴史がある。',
  preview:'デトロイトの位置と、自動車産業の集積を見る',destination:'主要産業 › 自動車 · デトロイト周辺',
  page:'industry',params:{sector:'manufacturing',subsector:'auto'},bounds:[-90,39,-80,46],
  paragraphs:['20世紀、自動車工場などの仕事を求め、多くの黒人が南部からデトロイトへ移住しました。南部の差別や暴力から逃れる動きも重なり、現在につながる地域社会が形成されました。'],
  legend:'点：デトロイト。輪郭：都市を含むウェイン郡。産業の記号・円は既存の地域・州別データ。',
  note:'20世紀の人口移動の解説です。産業地図は現在に近い時点の集積を示し、移住当時の工場や雇用を復元したものではありません。移住先の住宅差別も居住地を制約しました。',
  sources:[{label:'米国国立公文書館：黒人の大移動',url:'https://www.archives.gov/research/african-americans/migrations/great-migration'}],
  counties:['county:26163'],anchors:[{label:'デトロイト',coordinate:[-83.0458,42.3314],dx:15,dy:22}],
 },
 {
  id:'vegas-water',views:['distribution'],
  title:'砂漠のラスベガスは、遠くの山に降る雨や雪に支えられている。',
  preview:'ラスベガスからコロラド川を上流の山地までたどる',destination:'自然環境 › 水資源・河川 · コロラド川',
  page:'nature',params:{env:'water',waterView:'rivers',natureFeature:'water:Colorado'},bounds:[-117,33,-104.5,42],
  paragraphs:['ラスベガスを含む南ネバダで使う水の約９割は、コロラド川から来ています。遠く離れたロッキー山脈の雨や雪が川に流れ込み、ミード湖を経て、砂漠の都市の暮らしと観光を支えています。'],
  legend:'青い太線：コロラド川。点：ラスベガス・ミード湖・上流の山地。',
  note:'約９割は南ネバダ水道局が示す地域の水供給の割合です。線は川の概略流路で、太さは水量を表しません。山地の点は上流域の代表位置で、都市への導水管は描いていません。',
  sources:[{label:'南ネバダ水道局：水はどこから来るか',url:'https://www.snwa.com/water-resources/where-water-comes-from/'}],
  counties:[],anchors:[{label:'ラスベガス',coordinate:[-115.1398,36.1699],dx:-16,dy:-17},{label:'ミード湖',coordinate:[-114.74,36.1],dx:14,dy:26},{label:'ロッキー山脈（上流域）',coordinate:[-105.8,40.35],dx:-10,dy:-18}],
 },
 {
  id:'lds-vote',views:['religion','vote'],
  title:'末日聖徒には共和党支持が多い。では、同じ信仰でも支持が分かれるのはなぜ？',
  preview:'ユタ州の２郡で、宗教の分布と選挙結果を見比べる',destination:'人口 › 投票傾向 · ユタ州',
  page:'population',params:{popView:'vote',popVoteState:'49'},bounds:[-113.2,39.5,-110.5,41.5],
  paragraphs:['末日聖徒には中絶の制限を支持する人が多く、共和党の政策と重なる部分があります。一方、教会は移民の家族を守ることや、党派にかかわらず誠実な候補者を選ぶことも説いています。何を優先し、候補者をどう評価するかによって、政治的な選択は変わります。'],
  legend:'輪郭：ソルトレイク郡・ユタ郡。地色を切り替えて宗教分布と2024年の選挙結果を比較。',
  note:'米国の末日聖徒の成人では73％が共和党支持・共和党寄り（Pew、2023–24年調査）。本文は調査と教会の教えを基に判断が分かれうる理由を説明しており、各人の投票動機を測定した結論ではありません。教会は政党・候補者を支持せず、投票先を指示していません。',
  sources:[{label:'Pew：宗教と政党支持（2023–24年調査）',url:'https://www.pewresearch.org/religion/2025/02/26/religion-partisanship-and-ideology/'},{label:'Pew：宗教と中絶への意見',url:'https://www.pewresearch.org/religion/2025/02/26/religion-and-views-on-lgbtq-issues-and-abortion/'},{label:'教会公式声明：移民と家族',url:'https://newsroom.churchofjesuschrist.org/official-statement/immigration'},{label:'教会の書簡：党派を問わず候補者を判断する',url:'https://www.thechurchnews.com/leaders/2023/6/6/23751117/first-presidency-letter-emphasizes-participation-in-elections-reaffirms-political-neutrality/'},{label:'2024年共和党綱領',url:'https://www.presidency.ucsb.edu/documents/2024-republican-party-platform'},{label:'USRC 2020 / ARDA：末日聖徒の郡別所属者割合',url:'https://www.thearda.com/us-religion/statistics/rankings?cod=151&con=0&typ=0&u=0'}],
  counties:['county:49035','county:49049'],anchors:[{label:'ソルトレイク郡',coordinate:[-111.92,40.67],dx:-14,dy:-19},{label:'ユタ郡',coordinate:[-111.68,40.12],dx:14,dy:23}],
  compare:{view:'religion',label:'宗教の分布',params:{popView:'religion',popReligion:'latter_day_saints'}},
 },
];
export const populationInsightFor=(id:string|null)=>populationInsights.find(item=>item.id===id);
export const vegasPhoto={
 src:'las-vegas-desert.webp',width:1600,height:269,
 alt:'ラスベガスの市街地の背後に広がる、乾燥した山地。',
 caption:'ラスベガスの市街地と乾燥した山地 · 2015年3月',
 author:'Steven Waggener',url:'https://commons.wikimedia.org/wiki/File:Vegas_Skyline,_Day.jpg',
 license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',
};
