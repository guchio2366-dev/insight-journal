
import type {ProductId} from '../../lib/atlas-agriculture-detail-state.ts';

export const productNames:Record<ProductId,string>={corn:'とうもろこし',soybean:'大豆',wheat:'小麦',cotton:'綿花',rice:'稲作',specialty:'果樹・野菜等',beef:'肉牛',dairy:'酪農',hogs:'養豚',broilers:'肉用鶏',layers:'採卵鶏'};
export const productParagraphs:Record<ProductId,readonly string[]>={
corn:[
'とうもろこしは、中央低地を中心とするコーンベルトに広がります。地形と標高を見比べると、内陸に広い農地が続く様子を読み取れます。ただし、平坦であることと標高が低いことは同じではありません。',
'用途は家畜の飼料、燃料用エタノール、食品原料など。大豆との輪作も行われます。西寄りの産地では灌漑も重要で、長い散水装置が支点の周りを回るセンターピボット方式によって、円形の畑が見られます。全産地が同じ灌漑方式というわけではありません。',
'ミシシッピ川と支流は、穀物を下流の輸出拠点へ運ぶ経路の一つです。川の線をたどると内陸から海への輸送を、降水量と帯水層を見比べると農地の水確保を読み取れます。'],
soybean:[
'大豆はとうもろこしと重なる中西部の産地が多く、両者を組み合わせた輪作が行われます。油を搾った後の大豆ミールは、豚や鶏などの飼料のたんぱく源になります。とうもろこしの飼料利用と合わせて、作物と畜産の結び付きを読むことができます。',
'国内の加工・飼料需要に加え、輸出も重要です。ミシシッピ川水系は輸送経路の一つで、川の線を下流へたどると、内陸の産地とメキシコ湾側の輸出拠点とのつながりが分かります。'],
wheat:[
'小麦はグレートプレーンズなどに広がり、北部では春にまく春小麦、中部から南部では秋にまいて越冬する冬小麦が重要です。これは地域的な傾向で、すべての小麦を単純な南北の境界で分けるものではありません。',
'グレートプレーンズの西寄りにはステップ気候が見られます。気候図では乾燥の程度を、地形・標高図では、平原でも中央低地より標高が高い地域があることを確かめられます。小麦の栽培域全体がステップ気候に一致するわけではありません。',
'雨が多ければ一律に不適になるわけではなく、東部やミシシッピ川沿いには軟質冬小麦の産地もあります。過湿は根に負担をかけますが、年降水量だけでなく雨の時期や排水、他作物との採算の違いも重要です。この地図は主な栽培のまとまりを示し、小さく分散した産地を省略しています。'],
cotton:[
'綿花は、霜のない暖かい期間を確保できる南部で栽培されます。ただし、西寄りのテキサスと南東部では水の条件が異なり、降水に頼る栽培と灌漑を利用する栽培の両方があります。',
'テキサスのハイプレーンズ帯水層と、南西ジョージアなどで利用されるフロリダン帯水層系を見比べると、離れた産地でも地下水が農業を支える例を読めます。南東部の例をフロリダ半島全体に広げて考えないこと、年降水量だけでなく雨の時期や土壌も関わることが大切です。'],
rice:[
'米国の稲作は、ミシシッピ川下流域を中心とする南部と、カリフォルニアなどに分布します。南部では暖かい気候に加え、ミシシッピ川沿いの沖積帯水層からの地下水利用も重要です。雨の多い気候であっても、必要な時期の灌漑水が自動的に確保されるわけではありません。',
'カリフォルニアの例では、産地の雨だけでなく、上流側の雨や雪、川、貯水池との関係が重要です。サクラメント川とシャスタ湖、サクラメント川流域、降水量図を見比べると、農地の外側にも水源が広がっていることを読み取れます。'],
specialty:[
'果樹・野菜等は種類によって必要な気候や栽培方法が異なります。ここではカリフォルニアのセントラルヴァレーを一つの例として、広い谷底の農地と周囲の山地の関係を見ます。',
'農地の水条件を考えるには、その場所の降水だけでなく、川、貯水、地下水にも目を向ける必要があります。谷と山地の降水量差、サンホアキン川の流域、セントラルヴァレー帯水層系を見比べてみてください。流域の境界は灌漑の供給範囲ではなく、セントラルヴァレー全体の境界でもありません。'],
beef:[
'肉牛の生産は、繁殖・子牛の育成、放牧、肥育などの段階から成り、同じ場所で完結するとは限りません。グレートプレーンズの広がりは放牧や肥育の立地を読む手掛かりになりますが、すべてを一つの生産方式で説明しないことが大切です。',
'肥育には、とうもろこしなどの飼料作物との関係もあります。水の利用を考えるときは牛の飲み水だけでなく、飼料を育てるための灌漑にも注目します。南部グレートプレーンズの例では、ハイプレーンズ帯水層と飼料生産とのつながりを確認できます。'],
dairy:[
'酪農は五大湖周辺や北東部だけでなく、カリフォルニアやアイダホにも分布します。飼料の確保、暑さへの対応、搾った生乳の集荷・冷却・加工などが関わるため、「寒い地域だから」だけでは分布を説明できません。',
'ウィスコンシンでは乳製品加工とのつながりを産業地図で、カリフォルニアでは飼料生産や水資源との関係を自然環境地図で確かめられます。飼料作物を育てる水も、酪農を支える条件の一つです。'],
hogs:[
'養豚では、とうもろこしがエネルギー源、大豆ミールがたんぱく源となり、飼料作物との結び付きが重要です。中西部の産地はコーンベルトとの関係で読み取れます。',
'一方、ノースカロライナなどにも生産地域があり、飼料の近さだけでは全体を説明できません。飼料供給、飼育、加工を結び付ける生産の仕組みにも目を向けます。'],
broilers:[
'肉用鶏は南東部などにまとまった生産地域があります。飼料にはとうもろこしや大豆ミールが使われ、作物の生産・供給との関係が重要です。',
'孵化、飼料供給、契約農場での飼育、処理・加工をつなぐ仕組みも特徴です。鶏を育てる場所だけでなく、生産工程が地域内でどう結び付くかという視点で分布を読みます。'],
layers:[
'採卵鶏も、とうもろこしや大豆ミールなどの飼料供給と結び付いています。採卵後は集荷、選別、包装、出荷へ続くため、農場だけでなく流通の仕組みも重要です。',
'殻付き卵の割れやすさは、包装や積み替え、輸送の条件として考えられます。ただし、米国の生産分布を「大消費地の近くにあるから」と一律に説明することは避け、飼料、生産規模、集荷・出荷体制を合わせて読みます。']
};
const ers='https://www.ers.usda.gov/topics/';
const transport='https://www.ams.usda.gov/sites/default/files/media/ReliableWaterwaySystem042025.pdf';
const california='https://water.ca.gov/Water-Basics/The-California-Water-System';
const feedWater='https://agdatacommons.nal.usda.gov/articles/dataset/Data_from_Irrigation_water_used_to_produce_cattle_feeds_throughout_the_United_States/30128560';
export const productSources:Record<ProductId,readonly [string,string][]>={
corn:[['USDA ERS・飼料穀物',ers+'crops/corn-and-other-feed-grains/feed-grains-sector-at-a-glance'],['USGS・灌漑','https://pubs.usgs.gov/publication/sir20225042/full'],['USDA AMS・穀物水運',transport]],
soybean:[['USDA ERS・大豆',ers+'crops/soybeans-and-oil-crops/oil-crops-sector-at-a-glance'],['USDA AMS・穀物水運',transport]],
wheat:[['USDA ERS・小麦',ers+'crops/wheat/wheat-sector-at-a-glance'],['Minnesota Extension・小麦の過湿','https://extension.umn.edu/agriculture/crop-production/small-grains/wheat-flooding-and-waterlogging']],
cotton:[['USDA ERS・綿花',ers+'crops/cotton-and-wool/cotton-sector-at-a-glance'],['Florida IFAS・綿花','https://ask.ifas.ufl.edu/publication/AG495'],['Georgia EPD・灌漑','https://epd.georgia.gov/document/document/20241025-response-commentpdf/download']],
rice:[['USDA ERS・米',ers+'crops/rice/rice-sector-at-a-glance'],['USGS・地下水灌漑','https://www.usgs.gov/media/images/irrigation-water-a-groundwater-well-a-rice-crop-field'],['California DWR',california]],
specialty:[['California DWR',california]],
beef:[['USDA ERS・肉牛',ers+'animal-products/cattle-beef/sector-at-a-glance'],['USDA・飼料の灌漑水',feedWater]],
dairy:[['USDA ERS・酪農',ers+'animal-products/dairy/background'],['WEDC・食品産業','https://wedc.org/key-industries/food-and-beverage/'],['USDA・飼料の灌漑水',feedWater]],
hogs:[['USDA ERS・養豚',ers+'animal-products/hogs-pork/sector-at-a-glance']],
broilers:[['USDA ERS・家禽と卵',ers+'animal-products/poultry-eggs/sector-at-a-glance']],
layers:[['USDA ERS・家禽と卵',ers+'animal-products/poultry-eggs/sector-at-a-glance']]
};
export type InsightTarget={page:'nature'|'industry';env?:'climate'|'water'|'landform'|'contour';waterView?:'rivers'|'precipitation'|'basins';features?:readonly string[];isohyets?:readonly number[];basin?:string;sector?:string;subsector?:string;industryRegion?:string};
export type AgricultureInsight={id:string;products:readonly ProductId[];label:string;lead:string;takeaway?:string;photo?:'pivot';sources?:readonly [string,string][];target:InsightTarget;bounds:readonly [number,number,number,number]};
const interior=[-106,30,-80,50] as const,plains=[-109,28,-94,50] as const,ms=[-114,28,-77,50] as const,ca=[-125,32,-115,43] as const;
const water=(...features:string[]):InsightTarget=>({page:'nature',env:'water',waterView:'rivers',features:features.map(id=>'water:'+id)});
const rain:InsightTarget={page:'nature',env:'water',waterView:'precipitation'};
const basin=(id:string):InsightTarget=>({page:'nature',env:'water',waterView:'basins',basin:id});
export const agricultureInsights:readonly AgricultureInsight[]=[
{id:'plains-elevation',products:['corn','wheat'],label:'低地と高原の高さ',lead:'中央低地からグレートプレーンズへ等高線を追います。500m間隔の線が増える方向と、産地の広がりを見比べてください。',takeaway:'平坦な農地でも、西へ進むと標高が高くなる。',target:{page:'nature',env:'contour'},bounds:interior},
{id:'central-lowland',products:['corn'],label:'中央低地の広がり',lead:'強調した中央低地と産地の輪郭を比較します。平地の広がりは読み取れますが、土壌の肥沃さを直接示す図ではありません。',takeaway:'中央低地の広がりと、とうもろこし産地の重なりを見る。',target:{page:'nature',env:'landform',features:['landform:中央低地']},bounds:[-101,33,-80,49]},
{id:'grain-rivers',sources:[['USDA AMS・穀物水運',transport]],products:['corn','soybean'],label:'川と穀物輸送',lead:'青い太線はミシシッピ川・オハイオ川です。産地の破線と見比べ、川を合流点から南の河口へたどってください。河川全区間の航行可能性や輸送量を示す線ではありません。',takeaway:'内陸の穀物は、川を下ってメキシコ湾側の輸出拠点へ運ばれる。',target:water('Mississippi','Ohio'),bounds:ms},
{id:'corn-pivot-water',photo:'pivot',products:['corn'],label:'円形の畑を支える水',lead:'ネブラスカなど西寄りの産地とハイプレーンズ帯水層を重ねます。写真の長い散水装置は中央の支点を中心に回転し、上空から見る円形の灌漑区画をつくります。写真は方式の実例で、個別農場の取水源を示すものではありません。',takeaway:'雨だけで足りない水を地下水で補い、回転する散水装置で畑へ届ける。',target:water('High Plains Aquifer'),bounds:[-105,35,-94,44]},
{id:'interior-rainfall',sources:[['Penn State・作物と水','https://courses.ems.psu.edu/geog3/node/1093']],products:['corn','soybean','wheat'],label:'500mm線と産地の東西差',lead:'太く強調した500mm線と産地を見比べます。内陸の西寄りでは500mm未満の地域が広がり、多くの作物で雨だけによる高収量の確保が難しくなります。灌漑や乾燥に対応した栽培が重要になりますが、500mmは栽培可否の一律の境界ではありません。',takeaway:'年降水量約500mmは、東西の水条件の違いを見る目安になる。',target:{...rain,isohyets:[500]},bounds:interior},
{id:'wheat-steppe',sources:[['Columbia・大平原の乾湿と作物','https://lamont.columbia.edu/news/100th-meridian-where-great-plains-begin-may-be-shifting']],products:['wheat'],label:'ステップ気候を確かめる',lead:'強調したBSk（低温のステップ気候）と小麦産地を比較します。北部の春小麦・中南部の冬小麦という作付けの違いと合わせて読みます。産地全体がBSkに一致するわけではありません。',takeaway:'小麦は、とうもろこしより乾燥した地域でも重要な作物になる。',target:{page:'nature',env:'climate',features:['climate:BSk']},bounds:plains},
{id:'great-plains',products:['wheat','beef'],label:'グレートプレーンズ',lead:'地形の実線と産地の破線・記号を比較します。平原の広がりを手掛かりにしつつ、東西の乾燥度や生産方式の違いも考えます。',takeaway:'グレートプレーンズは、広い平原に小麦や肉牛の生産が展開する地域。',target:{page:'nature',env:'landform',features:['landform:グレートプレーンズ']},bounds:plains},
{id:'cotton-aquifers',products:['cotton'],label:'二つの産地の地下水',lead:'ハイプレーンズ帯水層とフロリダン帯水層系を同時に強調します。テキサスと南西ジョージア周辺の産地を見比べてください。フロリダ半島全体が綿花産地という意味ではありません。',takeaway:'西部と南東部の離れた綿花産地に、それぞれ地下水を使う地域がある。',target:water('High Plains Aquifer','Floridan Aquifer System'),bounds:[-106,24,-79,42]},
{id:'cotton-rainfall',products:['cotton'],label:'綿花産地の雨の違い',lead:'500mm・1,000mmの等雨量線を強調しています。テキサス側と南東部の産地で色を比較すると、水確保の条件の違いが見えます。二本の線は比較の目盛りで、綿花の栽培限界ではありません。',takeaway:'綿花は少雨の西部にも、比較的雨の多い南東部にも広がる。',target:{...rain,isohyets:[500,1000]},bounds:[-106,24,-79,42]},
{id:'rice-alluvial',products:['rice'],label:'南部の稲作と地下水',lead:'実線のミシシッピ川谷沖積帯水層と稲作の破線が重なる場所を見ます。多雨の地域でも、生育に必要な時期の水を灌漑で補うことがあります。',takeaway:'南部の稲作は、雨に加えて沖積帯水層の地下水にも支えられる。',target:water('Mississippi River Valley Alluvial Aquifer'),bounds:[-97,28,-86,38]},
{id:'rice-humid',products:['rice'],label:'温暖湿潤気候を確かめる',lead:'南部の稲作とCfa（温暖湿潤気候）の重なりを見ます。気候の一致だけでは水田へ届く水を説明できないため、地下水の地図と合わせて読むと関係が分かります。',takeaway:'温暖で雨のある気候と、稲作に使う灌漑水は別々に確かめる。',target:{page:'nature',env:'climate',features:['climate:Cfa']},bounds:[-97,28,-86,38]},
{id:'rice-sacramento-water',products:['rice'],label:'川と貯水池から見る稲作',lead:'サクラメント川を北へたどり、強調したシャスタ湖と産地の位置を比較します。川・貯水池の位置を示す図で、用水路や個別農場への配水を示すものではありません。',takeaway:'カリフォルニアの稲作では、農地より上流の川と貯水が鍵になる。',target:water('Sacramento','shasta-lake'),bounds:[-124,37,-119,42.5]},
{id:'sacramento-basin',products:['rice'],label:'サクラメント川の流域',lead:'稲作の輪郭とサクラメント川流域の面を比較し、産地より北や山地側へ広がる集水域に注目します。流域の境界は灌漑の供給区域ではありません。',takeaway:'農地の外側に降った雨や雪も、上流から川へ集まる。',target:basin('sacramento'),bounds:[-124,37,-119,42.5]},
{id:'california-rainfall',products:['rice','specialty'],label:'谷と山地の雨の違い',lead:'500mm・1,000mm線を強調し、谷底の産地と周囲の雨雪の多い地域を比較します。カリフォルニアでは冬の降水や山地の雪を貯え、乾燥する夏の水利用につなぎます。年降水量図そのものは季節差を表しません。',takeaway:'谷底の農地と、水源となる北部・山地では降水量が違う。',target:{...rain,isohyets:[500,1000]},bounds:ca},
{id:'valley-landform',products:['specialty'],label:'谷と周囲の山地',lead:'セントラルヴァレーと両側の山脈を強調しています。果樹・野菜の産地を谷底に重ね、山地との位置関係を確認します。品目ごとの栽培条件は同じではありません。',takeaway:'谷底に農地が広がり、その周囲に水源となる山地がある。',target:{page:'nature',env:'landform',features:['landform:カリフォルニアセントラルヴァレー','landform:シエラネバダ山脈','landform:太平洋岸山脈']},bounds:ca},
{id:'valley-water',products:['specialty','dairy'],label:'谷の農業を支える水',lead:'セントラルヴァレー帯水層系とサンホアキン川を強調しています。産地との重なりや近さを比較してください。個別農場の取水源はこの図だけでは特定できません。',takeaway:'雨の少ない谷の農業を、河川と地下水の両方から読む。',target:water('Central Valley Aquifer System','San Joaquin'),bounds:ca},
{id:'san-joaquin-basin',products:['specialty','dairy'],label:'サンホアキン川の流域',lead:'産地の輪郭とサンホアキン川流域を重ね、シエラネバダ山脈側から谷底へのつながりを読みます。南のトゥーレア閉鎖流域は含まれず、谷全体の灌漑区域とは一致しません。',takeaway:'谷底の産地の上流に、山地の集水域が広がる。',target:basin('san-joaquin'),bounds:ca},
{id:'beef-feed-water',products:['beef'],label:'飼料生産を支える地下水',lead:'肉牛の代表地域とハイプレーンズ帯水層を比較します。飼料を育てる水も畜産を支えるため、記号の近さだけで牛の飲水量を判断しないでください。',takeaway:'肉牛と地下水の関係は、飲み水だけでなく飼料作物の灌漑にもある。',target:water('High Plains Aquifer'),bounds:[-106,29,-95,42]},
{id:'dairy-processing',products:['dairy'],label:'乳製品加工とのつながり',lead:'ウィスコンシンの酪農地域と食品・乳製品加工を重ねます。記号は代表地域で、個々の農場や加工場の所在地・生産量ではありません。',takeaway:'生乳は搾った後の集荷・冷却・加工まで含めて産業になる。',target:{page:'industry',sector:'manufacturing',subsector:'food',industryRegion:'wisconsin-food'},bounds:[-96,40,-84,49]}
];
export const productInsightOrder:Record<ProductId,readonly string[]>={
corn:['plains-elevation','central-lowland','grain-rivers','corn-pivot-water','interior-rainfall'],
soybean:['grain-rivers','interior-rainfall'],
wheat:['wheat-steppe','great-plains','plains-elevation','interior-rainfall'],
cotton:['cotton-aquifers','cotton-rainfall'],
rice:['rice-alluvial','rice-humid','rice-sacramento-water','sacramento-basin','california-rainfall'],
specialty:['valley-landform','valley-water','california-rainfall','san-joaquin-basin'],
beef:['great-plains','beef-feed-water'],dairy:['dairy-processing','valley-water'],hogs:[],broilers:[],layers:[]
};
export function insightFor(id:string|null){return agricultureInsights.find(x=>x.id===id);}
export function insightLead(item:AgricultureInsight,product:ProductId){
if(item.id==='interior-rainfall'&&product==='wheat')return '小麦の分布を重ねています。約500mmの線は乾湿を比べる目安で、750〜1,000mmも栽培の上限ではありません。東部にも軟質冬小麦の産地があります。雨の時期・排水や、とうもろこし・大豆などとの採算の違いも関わります。この図は小さく分散した産地を省略しているため、輪郭のない場所を栽培不適地とは読めません。';
if(item.id==='valley-water')return (product==='dairy'?'カリフォルニアの酪農地域と、飼料生産を含む水利用の背景を見ます。':'カリフォルニアの栽培域と、谷の地下水・河川の位置関係を見ます。')+item.lead;
return productNames[product]+'の分布を重ねています。'+item.lead;
}
export function targetLabel(t:InsightTarget){return t.page==='industry'?'産業 › 食品・乳製品加工':t.env==='water'?'自然環境 › '+(t.waterView==='precipitation'?'降水量':t.waterView==='basins'?'河川の流域':'河川・地下水'):'自然環境 › '+({climate:'気候区分',landform:'地形',contour:'標高'}[t.env??'climate']);}

export function insightTakeaway(item:AgricultureInsight,product:ProductId){
 if(item.id==='interior-rainfall')return product==='wheat'?'小麦の分布は、乾湿だけでなく他作物との採算の違いも反映する。':product==='soybean'?'大豆産地は比較的湿潤な東寄りに広がる。西側は約500mm線と比べる。':'とうもろこし産地の西側では、約500mmを目安に水確保の条件が変わる。';
 return item.takeaway??'';
}
