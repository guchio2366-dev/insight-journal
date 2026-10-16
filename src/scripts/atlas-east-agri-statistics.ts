import statistics from '../../public/assets/atlas/east-asia-v2/food-wood-statistics-2023.json';
import {renderEastExportQuantityReference} from './atlas-east-export-quantities.ts';
import {foodFlowParts,foodCalorieBands,type FoodModels,type FoodFlow,type FoodCalories} from '../lib/atlas-east-food-model.ts';

const names:Record<string,string>={CHN:'中国本土',JPN:'日本',KOR:'韓国',PRK:'北朝鮮',MNG:'モンゴル',OAS:'その他のアジア（台湾等）',TWN:'台湾',China:'中国本土',Japan:'日本','Korea, Rep.':'韓国','Korea, Dem. Rep.':'北朝鮮',Mongolia:'モンゴル','Other Asia, nes':'その他のアジア（台湾等）','Russian Federation':'ロシア',Thailand:'タイ','United States':'米国',Canada:'カナダ',Brazil:'ブラジル',Argentina:'アルゼンチン',Australia:'豪州',Vietnam:'ベトナム',Myanmar:'ミャンマー',Malaysia:'マレーシア',Indonesia:'インドネシア',Philippines:'フィリピン',France:'フランス',Germany:'ドイツ',Gabon:'ガボン',Finland:'フィンランド',Sweden:'スウェーデン','New Zealand':'ニュージーランド',Chile:'チリ',Ukraine:'ウクライナ','Hong Kong, China':'香港',Macao:'マカオ','Other external partners':'その他の対象外相手'};
const label=(name:string)=>names[name]??name;
const palette=['#326b63','#a16442','#d2a93b','#7182ae','#8aa978','#ad768c','#5c96a5','#b6a777','#657365','#b2765d','#85759c','#a0afba'];
const node=(tag:string,text='')=>Object.assign(document.createElement(tag),{textContent:text});
const money=(value:number|null)=>value===null?'未算出':value>=1e9?(value/1e9).toLocaleString('ja-JP',{maximumFractionDigits:2})+'十億＄':value>=1e6?(value/1e6).toLocaleString('ja-JP',{maximumFractionDigits:2})+'百万＄':value.toLocaleString('ja-JP',{maximumFractionDigits:0})+'＄';
type Trade=typeof statistics.trade.sawnwood;
type Model=Trade['region']['Import'];
export function renderEastTrade(host:HTMLElement,topic:string,country?:string,showQuantities=false){
 if(showQuantities&&country)renderEastExportQuantityReference(host,topic,country);
 const product=statistics.trade[topic as keyof typeof statistics.trade];
 if(!product){host.append(node('p','この品目と同じ範囲の相手国表は未収録です。ほかの品目の相手や全商品貿易で代用しません。'));return;}
 const pair=country?product.countries[country as keyof typeof product.countries]:product.region;
 if(!pair){host.append(node('p','選んだ対象の報告表は未収録です。'));return;}
 const card=node('section');card.className='east-trade-card';card.dataset.eastTradeProduct=topic;
 card.append(node('h4',product.label+' · HS '+product.product));
 const scope=country?label(country):'対象6地域の観測値';
 card.append(node('p',scope+' · 2023暦年 · 名目米ドル。'+product.definition));
 card.append(node('p','香港・マカオを含む東アジア内の相手を除外します。集計元は現在の6報告区分の確認済み表だけで、香港・マカオ自身の報告は含めません。東アジア全域の総額ではありません。'));
 const partners=[...new Set([...pair.Import.bins,...pair.Export.bins].map(r=>r.partner))].sort();
 const colors=new Map(partners.map((name,i)=>[name,palette[i%palette.length]]));
 const columns=node('div');columns.className='east-trade-pair';
 for(const [flow,title] of [['Import','輸入元'],['Export','輸出先']] as const){
  const model=pair[flow] as Model,figure=node('figure');figure.dataset.eastTradeFlow=flow;
  figure.append(node('figcaption',title));
  if(model.status==='unavailable')figure.append(node('p','報告表未収録（0ではありません）'));
  else{
   figure.append(node('p',`対象外相手 ${money(model.externalUsd)}`));
   if(model.externalUsd!==null&&model.externalUsd>0){
    const external=model.externalUsd;
    const pie=node('div');pie.className='east-pie';pie.setAttribute('role','img');pie.setAttribute('aria-label',product.label+'の'+title+'。分母は確認済み対象外相手の'+money(external)+'。'+model.bins.map(r=>`${label(r.partner)} ${(r.usd/external*100).toFixed(1)}％`).join('、'));
    let start=0;pie.style.background='conic-gradient('+model.bins.map(row=>{const end=start+row.usd/external*100,part=`${colors.get(row.partner)} ${start}% ${end}%`;start=end;return part;}).join(',')+')';figure.append(pie);
    const list=node('ul');list.className='east-trade-key';
    for(const row of model.bins){const item=node('li'),swatch=node('i');swatch.style.background=colors.get(row.partner)!;swatch.setAttribute('aria-hidden','true');item.append(swatch,node('span',label(row.partner)),node('b',(row.usd/external*100).toFixed(1)+'％'));list.append(item);}figure.append(list);
   }else figure.append(node('p','確認した対象外相手の金額は0＄。割合の分母が0のため円は描きません。'));
   const coverage=node('p',`確認済み ${model.coveredReporters.length}/${country?1:6}報告区分`);coverage.className='east-trade-coverage';figure.append(coverage);
   if(model.missingReporters.length)figure.append(node('p','未収録：'+model.missingReporters.map(label).join('・')+'。上の額は地域全体の総額ではありません。'));
  }
  columns.append(figure);
 }
 card.append(columns);
 const details=node('details');details.append(node('summary','対象・分母・内訳の照合と出典'));
 details.append(node('p','集計元は中国本土・日本・韓国・北朝鮮・モンゴル・台湾に対応する6報告区分です。相手の域内判定には香港・マカオも含めて全行から除外します。香港・マカオ自身の報告を加えた全域合計ではありません。台湾の貿易は公開資料のOther Asia, nes区分です。'));
 details.append(node('p','分母は各方向の確認済み対象外相手額。相手不明は分母から除外。上位5相手と、全相手行から集計したその他を示します。輸出・輸入を足し合わせず、未収録の報告区分を0にしません。総輸出入には再輸出入も含まれ、最終消費地・原産地とは限りません。'));
 for(const [flow,title] of [['Import','輸入'],['Export','輸出']] as const){const m=pair[flow] as Model;if(m.status==='unavailable'){details.append(node('p',title+'の合計・相手構成は未算出です。'));continue;}details.append(node('p',`${title}：確認表の対世界 ${money(m.worldUsd)}、範囲内相手 ${money(m.internalUsd)}、対象外相手 ${money(m.externalUsd)}、相手不明 ${money(m.unknownPartnerUsd)}。対象外 ${m.partnerCount}相手。表の世界値と全相手値合計の丸め差 ${m.roundingDifferenceUsd?.toLocaleString('ja-JP')}＄。`));for(const sid of m.sourceIds){const source=statistics.sources[sid],a=node('a',`${label(source.reporter)}の${title}表（World Bank WITS）`);a.href=source.url;details.append(a,node('br'));}}
 details.append(node('p','WITSのHS 1988/92（H0）・2023年表を使用。公表値は千米ドル・小数2桁（10＄単位）で丸められています。国別の表には更新時点の差があるため、各表自身のWorld行と照合し、別ページの世界額を混ぜません。'));
 card.append(details);host.append(card);
}

export function renderEastFoodInputAudit(supply:HTMLElement,calories:HTMLElement,topic:string,country?:string){
 const models=statistics.foodModels as FoodModels|null,available=country?models?.countries[country]:models?.region;
 const flows=available?.supply.filter(m=>topic==='overview'||m.topic===topic)??[];
 if(flows.length)for(const model of flows)renderEastFoodFlow(supply,model);
 if(available?.calories)renderEastCalorieBands(calories,available.calories);
 if(flows.length&&available?.calories)return;
 if(!flows.length){
 supply.append(node('p','2023年の供給用途は未収録です。同じ食料需給表の生産・輸入・輸出・在庫変化と、食用・飼料・加工・種子・損失等の原行が足りないため、供給・用途の帯を作れません。'));
 const reference=node('details');reference.append(node('summary','取得済みの別定義の参考値：原料の生産重量'));
 reference.append(node('p','以下はFAOSTAT QCLの原料生産量で、FBSの加工品を含む原料換算の需給へ加算しません。在庫・用途・自給率はこの値から推定しません。'));
 const items=topic==='overview'?['rice','wheat','maize','soybean']:[topic];
 for(const item of items){if(!['rice','wheat','maize','soybean'].includes(item))continue;reference.append(node('h4',statistics.trade[item as keyof typeof statistics.trade].label+' · 2023年 · t'));const table=node('table'),head=node('thead');head.innerHTML='<tr><th scope="col">対象</th><th scope="col">生産重量</th><th scope="col">資料区分</th></tr>';table.append(head);const body=node('tbody');for(const code of country?[country]:statistics.countries){const record=statistics.referenceProduction[code as keyof typeof statistics.referenceProduction]?.[item as 'rice'|'wheat'|'maize'|'soybean'],row=node('tr'),name=node('th',label(code));name.setAttribute('scope','row');row.append(name,node('td',record?record.value.toLocaleString('ja-JP'):'未収録'),node('td',record?.flag??'―'));body.append(row);}table.append(body);reference.append(table);}
 supply.append(reference);
 }
 if(available?.calories)return;
 calories.append(node('p','食料供給のカロリー構成とカロリー自給状況は未収録です。必要なのは同年・同じ対象の食用供給kcalと、品目群別の国内産食用カロリーです。重量自給率や農業GDPで代用しません。'));
 calories.append(node('p','上帯の分母は食料供給kcal合計で、摂取量とは異なります。下帯は同じ品目幅を保ち、同一定義の自給率を濃淡で示します。100％超は実率を残して色だけ上限を定め、欠測は未収録と表示します。カロリーの原行がない状態では等幅の帯も描きません。'));
 calories.append(node('p','食用換算・加工品と原料・輸入飼料の扱いを統一した分子が必要です。現在のFBS・SUAの用途別原行と、国内由来カロリーの追加入力は別の不足として記録しています。'));
}

export function renderEastFoodFlow(host:HTMLElement,model:FoodFlow){
 const calculated=foodFlowParts(model),section=node('section');section.className='east-food-flow';section.append(node('h4',model.scope+' · '+model.year+'年 · '+model.unit));
 for(const [title,rows,total] of [['供給',calculated.supply,calculated.supplyTotal],['用途',calculated.uses,calculated.useTotal]] as const){
  section.append(node('p',title+' '+total.toLocaleString('ja-JP')+' '+model.unit));const band=node('div');band.className='east-food-band';band.setAttribute('role','img');band.setAttribute('aria-label',title+'：'+rows.map(r=>r.label+' '+r.value+' '+model.unit).join('、'));
  const key=node('ul');for(const [i,row] of rows.entries()){if(row.percent!==null){const piece=node('span');piece.style.width=row.percent+'%';piece.style.background=palette[i%palette.length];band.append(piece);}key.append(node('li',row.label+' '+row.value.toLocaleString('ja-JP')+' '+model.unit));}section.append(band,key);
 }
 section.append(node('p','公表行による供給と用途の差：'+calculated.difference.toLocaleString('ja-JP')+' '+model.unit+'。差を架空の用途へ割り当てず、両帯の分母を別に示します。在庫の原表符号：'+(model.stockConvention==='increase-positive'?'積増しが正':model.stockConvention==='decrease-positive'?'取崩しが正':'在庫原行未取得')+'。'));
 if(model.tradeBasis==='net-country-balances')section.append(node('p','貿易は国別の輸入−輸出の差額です。域内の輸出入を両方足しませんが、国間の報告差を含むため、別のHS相手国表の域外純額には置き換えません。'));
 for(const url of model.source.urls){const a=node('a','需給原表の出典');a.href=url;section.append(a,node('br'));}host.append(section);
}
export function renderEastCalorieBands(host:HTMLElement,model:FoodCalories){
 const calculated=foodCalorieBands(model),section=node('section');section.className='east-calorie-bands';section.append(node('h4',model.scope+' · '+model.year+'年 · 食料供給kcal構成'));
 if(!calculated.total){section.append(node('p','公表食料供給カロリーが0のため構成比は算出しません。'));host.append(section);return;}
 for(const lower of [false,true]){const band=node('div');band.className='east-food-band';band.dataset.calorieBand=lower?'self-sufficiency':'composition';band.setAttribute('role','img');band.setAttribute('aria-label',lower?'同じ幅の品目群のカロリー自給状況':'食料供給カロリー構成');
  for(const [i,group] of calculated.groups.entries()){const piece=node('span');piece.dataset.foodGroup=group.id;piece.style.width=group.widthPercent+'%';piece.style.background=lower?group.colorPercent===null?'repeating-linear-gradient(45deg,#f0f0eb 0 4px,#aab1a9 4px 6px)':`rgba(50,107,99,${.15+group.colorPercent/100*.85})`:palette[i%palette.length];piece.title=group.label+'：'+group.widthPercent.toFixed(1)+'％、自給 '+(group.selfSufficiencyPercent===null?'未収録':group.selfSufficiencyPercent.toFixed(1)+'％');band.append(piece);}section.append(band);}
 const list=node('ul');for(const group of calculated.groups)list.append(node('li',group.label+'：食料供給 '+group.widthPercent.toFixed(1)+'％ ／ 自給 '+(group.selfSufficiencyPercent===null?group.selfStatus==='zero-denominator'?'算出不能（分母0）':'未収録':group.selfSufficiencyPercent.toFixed(1)+'％'+(group.exceeds100?'（100％超）':''))));section.append(list);
 section.append(node('p','分母：'+calculated.total.toLocaleString('ja-JP')+' kcal/日。国内カロリーの定義：'+(model.numeratorDefinition||'原行未取得')+'。100％超の実率を残し、色だけ100％で飽和させます。'));
 for(const url of model.source.urls){const a=node('a','カロリー原表の出典');a.href=url;section.append(a,node('br'));}host.append(section);
}
