// Coordinates and names are supplied by the climate tab's existing city catalog.
// OEWS describes metropolitan jobs, not the attributes of every resident.
export const populationOverviews:Record<string,{title:string;text:string;reading:string}>={
 distribution:{title:'人は都市に集まり、生活圏は境界を越える',text:'東西の沿岸や五大湖周辺に人口が集まり、内陸にも大都市が点在します。濃い色の広さと、そこに住む人数は別のものです。',reading:'都市名を選び、都市がどこに位置し、どんな産業と仕事が人口を支えているかを見比べます。郡の平均密度だけで、市内と郊外の境界を決めることはできません。'},
 ethnicity:{title:'「サラダボウル」を、定住の歴史から読む',text:'米国の多様性は、文化の違いを残して共存する「サラダボウル」にもたとえられます。地域ごとの構成には、移住・奴隷制・国境の変化など、異なる歴史が重なっています。',reading:'地図は現在の人種・ヒスパニック区分です。英系・独系という祖先の出身地は別の分類なので、白人の色から両者を区別することはできません。'},
 religion:{title:'宗教構成を、移住と地域の歴史から読む',text:'米国の宗教文化には、植民・移住・定住と地域社会の歴史が重なっています。地図の番号をたどると、移住や定住の歴史が地域の宗教文化とどう重なるかを見比べられます。',reading:'①〜⑥は解説する場所の参照点です。信徒の人数、宗教圏の境界、その地域だけにある文化を示すものではありません。都市名と番号を選び、左の場所と右の説明を見比べます。'},
 vote:{title:'二大政党の大枠と、都市周辺の違いを読む',text:'2024年大統領選の全国得票は二大政党が大半を占めます。左の赤は共和党、青は民主党が上回る地域。都市と周辺の色を見比べると、全国値だけでは見えない違いが分かります。',reading:'色は郡ごとの得票率差で、塗られた面積は票数ではありません。都市を選び、その周囲の郡を比べます。現在の支持率や、特定民族の支持政党を示す地図ではありません。'},
};

export const settlementStories=[
 {id:'german',label:'ドイツ系',region:'五大湖周辺・中西部',group:'white',text:'19世紀の移民は農地や仕事を求め、中西部の農村と都市に定住しました。五大湖からミシシッピ川流域を見比べると、農業と工業の両方が移住先になったことを考えられます。独系の分布そのものはこの地図には表示していません。',source:'https://en.wikipedia.org/wiki/German_Americans#Cities_of_the_Midwest',sourceLabel:'参考：German Americans（歴史と参考文献）'},
 {id:'english',label:'イギリス系',region:'大西洋岸・バージニア',group:'white',text:'17世紀のイングランドからの植民が、大西洋岸の社会形成の一つの土台になりました。ワシントンDCの南、バージニアのジェームズタウンは1607年の拠点です。先住民の土地への進出と、その後の各地への移動も含む歴史であり、現在の白人全体を英系と見ることはできません。',source:'https://www.nps.gov/jame/learn/historyculture/a-short-history-of-jamestown.htm',sourceLabel:'国立公園局：ジェームズタウンの歴史'},
 {id:'african',label:'アフリカ系',region:'南部 → シカゴ・デトロイトなど',group:'black',text:'奴隷制の下で南部に連れてこられた人々とその子孫の歴史に、20世紀の「大移動」が重なります。差別から逃れ、工場などの仕事を求めて北部・中西部・西部へ移った経緯を、南部とシカゴ・デトロイトの周辺で見比べます。',source:'https://www.archives.gov/research/african-americans/migrations/great-migration',sourceLabel:'米国国立公文書館：大移動'},
 {id:'hispanic',label:'ヒスパニック',region:'南西部・メキシコ国境周辺',group:'hispanic',text:'南西部には、現在の国境ができる前からスペイン語圏の暮らしがありました。1848年の米墨戦争後の国境変更も、その背景です。後の移住も重なった地域として、ロサンゼルスから南西部・テキサスへ目を移します。ヒスパニックは単一の人種や国籍ではありません。',source:'https://www.archives.gov/milestone-documents/treaty-of-guadalupe-hidalgo',sourceLabel:'米国国立公文書館：1848年の条約'},
] as const;

const oews=(region:string,city:string)=>`https://www.bls.gov/regions/${region}/news-release/occupationalemploymentandwages_${city}.htm`;
export const populationCityProfiles:Record<string,{location:string;industries:string;jobs:string;source:string}>={
 seattle:{location:'太平洋岸北西部、ピュージェット湾沿岸',industries:'情報サービス・航空宇宙・物流',jobs:'情報・数理職は都市圏の雇用の9.3%（全国3.4%）。設計・技術職も全国より比重が高く、技術開発と事業運営の仕事に特徴があります。',source:oews('west','seattle')},
 'san-francisco':{location:'太平洋岸、サンフランシスコ湾周辺',industries:'情報サービス・金融・専門サービス',jobs:'情報・数理職6.6%、経営・金融実務職8.7%と、いずれも全国より高い割合です。専門サービスの仕事と、医療・介護など生活を支える仕事が共存します。',source:oews('west','sanfrancisco')},
 'los-angeles':{location:'太平洋岸南部、沿岸平野から内陸へ',industries:'映像・娯楽・貿易物流・製造業',jobs:'芸術・デザイン・娯楽・スポーツ・メディア職は2.9%（全国1.3%）。制作の専門職に加え、物流や日々の都市生活を支える幅広い仕事があります。',source:oews('west','losangeles')},
 'las-vegas':{location:'南西部の乾燥地、砂漠の中の都市圏',industries:'観光・宿泊・飲食・娯楽',jobs:'飲食サービス職は14.7%（全国8.8%）。来訪者と直接接する接客・調理などの仕事が、雇用の大きな部分を占めます。',source:oews('west','lasvegas')},
 denver:{location:'ロッキー山脈の東麓、平原との接点',industries:'専門サービス・情報通信・航空宇宙',jobs:'経営・金融実務職10.5%、情報・数理職5.4%、設計・技術職2.7%。いずれも全国より比重が高く、専門知識を使う仕事が目立ちます。',source:oews('mountain-plains','denver')},
 dallas:{location:'テキサス北部、フォートワースと連なる都市圏',industries:'金融・企業サービス・物流・情報通信',jobs:'運輸・荷役職10.5%、事務職12.1%。物流の現場と企業の事務・管理機能が共存し、情報・数理職も4.8%と全国より高い割合です。',source:oews('southwest','dallasfortworth')},
 chicago:{location:'五大湖、ミシガン湖南端',industries:'物流・金融・企業サービス・製造業',jobs:'運輸・荷役職は10.7%（全国8.8%）、管理職は9.0%。物の流れを担う現場の仕事と、大都市の管理・事務の仕事を併せて見られます。',source:oews('midwest','chicago')},
 detroit:{location:'五大湖、米加国境沿いの工業地域',industries:'自動車・部品製造・設計開発',jobs:'生産職8.8%（全国5.5%）、設計・技術職4.0%（全国1.7%）。製造現場の技能と、設計・開発の専門職の両方に特徴があります。',source:oews('midwest','detroit')},
 'new-orleans':{location:'南部、ミシシッピ川下流の港湾都市',industries:'港湾物流・観光・飲食・医療',jobs:'飲食サービス職11.3%、運輸・荷役職9.5%、医療専門・技術職7.8%。観光の接客、物の輸送、地域の医療を担う仕事が全国より高い割合です。',source:oews('southwest','neworleans')},
 miami:{location:'フロリダ半島南東端、大西洋岸',industries:'観光・貿易物流・金融・医療',jobs:'販売職10.8%、飲食サービス職9.9%、事務職13.3%。いずれも全国より高く、顧客対応や都市の商業活動を支える仕事が目立ちます。',source:oews('southeast','miami')},
 'washington-dc':{location:'大西洋岸中部、ポトマック川沿い',industries:'行政・専門サービス・情報通信',jobs:'経営・金融実務職11.8%、情報・数理職7.4%、法務職2.2%。いずれも全国より高く、政策・組織運営や専門サービスに関わる職種に特徴があります。',source:oews('mid-atlantic','washingtondc')},
 'new-york':{location:'大西洋岸、ハドソン川河口',industries:'金融・専門サービス・メディア・医療',jobs:'経営・金融実務職7.6%、法務職1.4%に加え、医療・介護補助職も8.9%と全国より高い割合です。金融の専門職だけでなく、大きな人口を支える仕事も重要です。',source:oews('northeast','newyork')},
};
