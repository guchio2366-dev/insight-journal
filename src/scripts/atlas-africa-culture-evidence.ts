import religion from '../data/atlas/africa-religion-evidence.json' with {type:'json'};
import languages from '../data/atlas/africa-home-language-evidence.json' with {type:'json'};
import {ethnicityRegionNames} from '../data/atlas/africa-ethnicity-evidence.ts';
import {africaLanguageOverview} from '../data/atlas/africa-language-overview.ts';
import type {State} from '../data/atlas/africa-atlas.ts';
import type {AfricaLayerView} from './atlas-africa-layers.ts';

const provinceNames:Record<string,string>={'Western Cape':'西ケープ州','Eastern Cape':'東ケープ州','Northern Cape':'北ケープ州','Free State':'フリーステート州','KwaZulu-Natal':'クワズール・ナタール州','North West':'北西州',Gauteng:'ハウテン州',Mpumalanga:'ムプマランガ州',Limpopo:'リンポポ州'};
function node<K extends keyof HTMLElementTagNameMap>(tag:K,text=''){const result=document.createElement(tag);result.textContent=text;return result;}
function sourceLink(label:string,url:string){const p=node('p'),a=node('a',label);a.href=url;p.append(a);return p;}
function table(caption:string,heads:string[],rows:string[][]){const wrapper=node('div');wrapper.className='africa-culture-table-scroll';const table=node('table');table.append(node('caption',caption));const head=node('tr');for(const name of heads){const th=node('th',name);th.scope='col';head.append(th);}const thead=node('thead');thead.append(head);table.append(thead);const body=node('tbody');for(const values of rows){const row=node('tr');for(const [i,value]of values.entries()){const cell=node(i?'td':'th',value);if(!i)(cell as HTMLTableCellElement).scope='row';row.append(cell);}body.append(row);}table.append(body);wrapper.append(table);return wrapper;}
function bar(label:string,value:number,shown:string,color:string){const row=node('div');row.className='africa-culture-stat-row';const name=node('span',label),amount=node('span',shown),track=node('span'),fill=node('i');track.className='africa-culture-stat-track';track.setAttribute('aria-hidden','true');fill.style.width=value+'%';fill.style.background=color;track.append(fill);row.append(name,track,amount);return row;}
function notes(section:HTMLElement,values:readonly string[]){for(const value of values)section.append(node('p',value));}

/** These source tables supplement the existing map. They never generate map geometry. */
export function renderAfricaCultureEvidence(root:HTMLElement,state:State,actual:AfricaLayerView|null){
 let reader=root.querySelector<HTMLElement>('[data-africa-culture-evidence]');
 if(!reader){reader=node('section');reader.dataset.africaCultureEvidence='';reader.className='africa-culture-evidence';root.querySelector('.africa-detail-scroll')!.prepend(reader);}
 const active=state.field==='population'&&['religion','language'].includes(state.topic)&&actual?.ready;reader.hidden=!active;if(!active)return;reader.replaceChildren();
 const language=state.topic==='language';
 if(state.place&&state.place!==(language?'ZAF':'GHA'))reader.append(node('p',`以下は${language?'南アフリカ':'ガーナ'}だけの限定した公表事例です。選択国の構成値ではありません。`));
 if(language){
  const points=actual!.languagePoints??[],selected=points.find(point=>'language:'+point.id===state.layerClass),label=node('label','個別の言語資料を読む '),picker=node('select');picker.dataset.africaLanguageRecord='';picker.setAttribute('aria-label','個別の言語資料を選ぶ');const overview=node('option','記録の選択なし');overview.value='';picker.append(overview);
  for(const point of [...points].sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id))){const option=node('option',`${point.name} · ${point.id}`);option.value=point.id;picker.append(option);}picker.value=selected?.id??'';label.append(picker);reader.append(label,node('p','保存済みアフリカ言語資料2,222件から選びます。英語・仏語などの利用国へ、別地域の原点を移動していません。記録点の所在と制度上の共通語/家庭言語は別です。'));
  if(selected){const article=node('article');article.dataset.africaLanguageReading=selected.id;article.append(node('h3',`${selected.name}（資料の記録）`),node('p',`系統：${selected.family}。Glottocode：${selected.id}。資料に記録された国コード：${selected.countries.join('・')||'未収録'}。`),node('p',africaLanguageOverview.scope),sourceLink('Glottolog・この言語資料',`https://glottolog.org/resource/languoid/id/${selected.id}`));reader.append(article);}
  reader.append(node('h3','家庭で使う言語：南アフリカ2022'),node('p','1歳未満を除く人口の「家庭で最も使う言語」です。地図のGlottolog代表点とは別資料で、母語・話者居住面・共通語の人数に置き換えません。全国値と9州の原表を読みます。'));
  for(const row of languages.languages)reader.append(bar(row.label,row.national,row.publishedNational+'%','#4e7b86'));
  const details=node('details');details.append(node('summary','9州・17分類の公表値を見る'));
  details.append(table('南ア2022 表2.9：家庭で最も使う言語（1歳以上、%）',['原分類',...languages.provinces.map(p=>provinceNames[p])],languages.languages.map(row=>[row.label,...languages.provinces.map(p=>row.publishedProvince[p as keyof typeof row.publishedProvince])])));reader.append(details);
  notes(reader,languages.limits);reader.append(sourceLink('Statistics South Africa・Census2022 表2.9（本文23頁）',languages.source.url));
 }else{
  reader.append(node('h3','ガーナ2021：宗教・宗派の公表構成'),node('p','この国勢調査のキリスト教小計は4分類の合計です。カトリック、プロテスタント、ペンテコステ・カリスマ、その他のキリスト教を、原分類のまま分けて読みます。Pew2020の国の色分けは保持します。'));
  for(const row of religion.groups){const item=bar(row.label,row.national/religion.total*100,`${row.publishedPercent.toFixed(1)}% · ${row.national.toLocaleString('ja-JP')}人`,row.christian?'#816590':'#718b7a');item.dataset.africaReligionEvidenceGroup=row.id;reader.append(item);}
  const details=node('details');details.append(node('summary','16州の公表人数と構成を見る'));
  details.append(table('ガーナ2021 表5.7：州別の宗教所属（人数）',['州・対象人数',...religion.groups.map(group=>group.label)],religion.regions.map(region=>[`${ethnicityRegionNames[region.name]} · ${region.total.toLocaleString('ja-JP')}人`,...religion.groups.map(group=>region.counts[group.id as keyof typeof region.counts].toLocaleString('ja-JP'))])));reader.append(details);
  notes(reader,religion.limits);reader.append(sourceLink('Ghana Statistical Service・2021国勢調査 表5.7（本文58頁）',religion.source.url));
 }
}
