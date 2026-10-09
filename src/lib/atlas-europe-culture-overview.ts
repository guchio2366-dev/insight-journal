import { europeCultureCompositions, type EuropeCultureComposition } from './atlas-europe-culture-composition';
import type { PopulationCaseChoiceKind } from '../data/atlas/europe/population-cases';
import { europeReligionRegionalEvidence, religionEvidenceShare } from '../data/atlas/europe/religion-regional-evidence';
import { europeReligionNationalProfiles, europeReligionNationalProfile, type ReligionNationalProfile } from '../data/atlas/europe/religion-national-overview';
import { pew2020EuropeRow, pew2020EuropeGroups, pew2020EuropeSource, pew2020EuropeTerms } from '../data/atlas/europe/pew-religion-2020';
import europeCountries from '../data/atlas/europe/countries.json' with {type:'json'};

export const europeCultureOverviewPlaces = [
  ...europeCultureCompositions('ethnicity'),
  ...europeReligionNationalProfiles,
  ...europeReligionRegionalEvidence,
];
const count = (value:number) => value.toLocaleString('ja-JP')+'人';
const share = (value:number) => value.toLocaleString('ja-JP',{maximumFractionDigits:2})+'%';
const ns='http://www.w3.org/2000/svg';
const circle=(composition:EuropeCultureComposition)=>{
  const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 56 56');svg.setAttribute('width','56');svg.setAttribute('height','56');svg.setAttribute('aria-hidden','true');
  const radius=20,circumference=2*Math.PI*radius;let offset=0;
  for(const segment of composition.segments){
    const arc=document.createElementNS(ns,'circle');arc.setAttribute('cx','28');arc.setAttribute('cy','28');arc.setAttribute('r',String(radius));arc.setAttribute('fill','none');arc.setAttribute('stroke',segment.color);arc.setAttribute('stroke-width','12');
    arc.setAttribute('stroke-dasharray',`${circumference*segment.share/100} ${circumference}`);arc.setAttribute('stroke-dashoffset',String(-circumference*offset/100));arc.setAttribute('transform','rotate(-90 28 28)');
    arc.dataset.euCompositionSegment=segment.id;arc.dataset.share=String(segment.share);
    const title=document.createElementNS(ns,'title');title.textContent=`${segment.label}：${count(segment.count)}・${share(segment.share)}`;arc.append(title);svg.append(arc);offset+=segment.share;
  }
  return svg;
};
function table(composition:EuropeCultureComposition){
  const details=document.createElement('details');details.dataset.euCompositionTable=composition.code;
  const summary=document.createElement('summary');summary.textContent=`${composition.name} · 回答構成と凡例`;details.append(summary);
  const note=document.createElement('p');note.textContent=`${composition.referenceDate} · 分母：同じ公表表の総人口 ${count(composition.denominator)}`;details.append(note);
  const table=document.createElement('table'),head=document.createElement('thead'),row=document.createElement('tr');
  for(const label of ['回答分類','人数','割合']){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;row.append(cell);}head.append(row);table.append(head);
  const body=document.createElement('tbody');
  for(const segment of composition.segments){
    const row=document.createElement('tr');row.dataset.euCompositionRow=segment.id;
    const label=document.createElement('th');label.scope='row';const swatch=document.createElement('i');swatch.style.background=segment.color;swatch.setAttribute('aria-hidden','true');label.append(swatch,document.createTextNode(segment.label));
    const source=document.createElement('details'),summary=document.createElement('summary');summary.textContent=segment.sourceCategoryIds.length>1?'合計した元分類':'元分類';source.append(summary);
    const list=document.createElement('ul');segment.sourceCategoryIds.forEach((id,index)=>{const item=document.createElement('li');item.textContent=`${id}：${segment.sourceLabels[index]}`;list.append(item);});source.append(list);label.append(source);
    const number=document.createElement('td');number.textContent=count(segment.count);const percentage=document.createElement('td');percentage.textContent=share(segment.share);row.append(label,number,percentage);body.append(row);
  }
  table.append(body);details.append(table);const link=document.createElement('a');link.href=composition.sourceURL;link.textContent='公表表';details.append(link);return details;
}
/** Country totals are shown as equal-size compositions, never administrative distributions. */
export function createEuropeCultureOverview(root:HTMLElement,onSelectLocal:(id:string)=>void,onClear:()=>void){
  const key=root.querySelector<HTMLElement>('[data-eu-culture-composition-key]');
  const evidencePanel=root.querySelector<HTMLElement>('[data-eu-religion-evidence-reading]');
  let rendered='';
  return {
    render(active:boolean,kind:PopulationCaseChoiceKind,caseId:string){
      const colorKey=root.querySelector<HTMLElement>('[data-eu-religion-color-key]');if(colorKey)colorKey.hidden=!active||kind!=='religion'||!!caseId;
      if(!key)return;key.hidden=!active||!!caseId;if(key.hidden||rendered===kind)return;
      key.querySelector('[data-eu-culture-key-intro]')!.textContent=kind==='religion'
        ?'Pew Research Centerの2020年推計から、収録した40か国のキリスト教割合を着色します。国を選ぶと同じ推計の7分類を示します。色は国全体の割合で、国内の宗派や地区の境界を示しません。'
        :'2021年の公表総計 · 円は同じ大きさです。角度は各対象の総人口に占める回答割合で、円の位置は対象を示す目印です。人口規模・個人の位置・細地域の分布を表しません。';
      key.querySelector('[data-eu-culture-key-coverage]')!.textContent=kind==='religion'
        ?'7分類はキリスト教・イスラム教・宗教的無所属・仏教・ヒンドゥー教・ユダヤ教・その他の宗教。Pewの広域推計であり、既存の国勢調査・標本調査の宗派や未回答の分類と合算しません。資料対象外の国は0%ではありません。'
        :'イングランド・ウェールズ・クロアチアだけを掲載しています。最多・過半数の分類で土地を塗った地図ではありません。色は各表の分類を区別し、国をまたいだ同色の対応はありません。';
      key.querySelector<HTMLElement>('[data-eu-pew-attribution]')!.hidden=kind!=='religion';
      key.querySelector('[data-eu-composition-tables]')?.replaceChildren(...(kind==='religion'?[]:europeCultureCompositions(kind).map(table)));rendered=kind;
    },
    decorate(id:string,button:HTMLButtonElement){
      const national=europeReligionNationalProfile(id);
      if(national){
        if(button.dataset.euReligionNational===id)return;
        button.classList.add('eu-religion-national-label');button.dataset.euReligionNational=id;
        const name=document.createElement('strong');name.textContent=national.name;
        const bar=document.createElement('span');bar.className='eu-religion-national-bar';bar.setAttribute('aria-hidden','true');
        for(const segment of national.segments){const part=document.createElement('i');part.style.width=`${segment.share}%`;part.style.background=segment.color;bar.append(part);}
        button.replaceChildren(name,bar);
        button.setAttribute('aria-label',`${national.name}の${national.year}年の回答構成。${national.segments.filter(item=>item.share>=5).map(item=>`${item.label}${share(item.share)}`).join('、')}。国別の詳細を読む`);
        return;
      }
      const evidence=europeReligionRegionalEvidence.find(item=>item.id===id);
      if(evidence){
        if(button.dataset.euReligionEvidence===id)return;
        button.classList.add('eu-religion-evidence-label');button.dataset.euReligionEvidence=id;
        button.replaceChildren(document.createTextNode(evidence.name),document.createElement('small'));
        button.querySelector('small')!.textContent=evidence.measures.map(item=>`${item.label} ${share(religionEvidenceShare(item.count,evidence.denominator))}`).join(' · ');
        button.style.setProperty('--eu-religion-color',evidence.measures[0].color);
        button.setAttribute('aria-label',`${evidence.name}の${evidence.year}年の地域資料。${evidence.measures.map(item=>`${item.label}${share(religionEvidenceShare(item.count,evidence.denominator))}`).join('、')}。右に原表の範囲を表示`);
        return;
      }
      const composition=europeCultureCompositions('ethnicity').find(item=>item.id===id) as EuropeCultureComposition|undefined;if(!composition||button.dataset.euComposition===id)return;
      button.classList.add('eu-culture-composition-label');button.dataset.euComposition=id;button.dataset.euCompositionCase=composition.caseId;
      const name=document.createElement('span');name.textContent=composition.name;button.replaceChildren(name,circle(composition));
      button.setAttribute('aria-label',`${composition.name}・${composition.year}年の回答構成。分母 ${count(composition.denominator)}。${composition.segments.map(segment=>`${segment.label} ${share(segment.share)}`).join('、')}。事例を開く`);
    },
    renderEvidence(active:boolean,id:string|undefined,place:string){
      if(!evidencePanel)return;
      const evidence=active?europeReligionRegionalEvidence.find(item=>item.id===id):undefined;
      const country=evidence?.country||europeReligionNationalProfile(id)?.country||place;
      const pew=active?pew2020EuropeRow(country):undefined;
      const national=active?(europeReligionNationalProfile(id)??europeReligionNationalProfiles.find(item=>item.country===country)):undefined;
      evidencePanel.hidden=!pew&&!national&&!evidence;
      if(!pew&&!national&&!evidence)return;
      evidencePanel.replaceChildren();
      const back=document.createElement('button');back.type='button';back.dataset.euReligionBack='';back.textContent='← 欧州全体へ';back.addEventListener('click',onClear);evidencePanel.append(back);
      if(pew)appendPewReading(evidencePanel,pew);
      if(national)appendNationalReading(evidencePanel,national,evidence?.id,onSelectLocal);
      if(!evidence)return;
      const title=document.createElement('h4');title.textContent=evidence.name+'の原表抜粋';evidencePanel.append(title);
      const context=document.createElement('p');context.textContent=`${evidence.year}年 · ${evidence.universe} · ${evidence.question}。分母 ${count(evidence.denominator)}。${evidence.coordinateMeaning}。`;evidencePanel.append(context);
      const list=document.createElement('ul');for(const measure of evidence.measures){
        const item=document.createElement('li');item.textContent=`${measure.label} ${count(measure.count)}／${count(evidence.denominator)}（${share(religionEvidenceShare(measure.count,evidence.denominator))}） · 元分類 ${measure.sourceCategory}`;list.append(item);
      }evidencePanel.append(list);
      const note=document.createElement('p');note.textContent=evidence.limitation;evidencePanel.append(note);
      const link=document.createElement('a');link.href=evidence.source;link.textContent='公式原表';evidencePanel.append(link);
      const license=document.createElement('p'),licenseLink=document.createElement('a');licenseLink.href=evidence.licenseUrl;licenseLink.textContent=evidence.license;license.append('利用条件：',licenseLink);evidencePanel.append(license);
    },
  };
}

function appendPewReading(panel:HTMLElement,row:NonNullable<ReturnType<typeof pew2020EuropeRow>>){
  const name=europeCountries.find(country=>country.code===row.code)?.name??row.code;
  const title=document.createElement('h4');title.textContent=`${name}の宗教構成 · 2020年推計`;panel.append(title);
  const intro=document.createElement('p');intro.textContent='Pew Research Centerの全人口推計。キリスト教など7つの広域分類で、国勢調査の宗派分類や地区の分布ではありません。';panel.append(intro);
  const bar=document.createElement('div');bar.className='eu-religion-reading-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label',pew2020EuropeGroups.map((group,index)=>`${group.label}${row.shares[index]}%`).join('、'));
  for(const [index,group] of pew2020EuropeGroups.entries()){const share=row.shares[index],part=document.createElement('span');part.style.width=`${share==='<0.1'?.05:Number(share)}%`;part.style.background=group.color;bar.append(part);}panel.append(bar);
  const list=document.createElement('ul');for(const [index,group] of pew2020EuropeGroups.entries()){const item=document.createElement('li'),swatch=document.createElement('i');swatch.style.background=group.color;swatch.className='eu-religion-reading-swatch';item.append(swatch,document.createTextNode(`${group.label} ${row.shares[index]}%`));list.append(item);}panel.append(list);
  const note=document.createElement('p');note.textContent='割合は丸めた公表値で、合計が100%と一致しない場合があります。「<0.1%」は0%ではありません。Pew推計を宗派や地方統計へ配分していません。';panel.append(note);
  const source=document.createElement('a');source.href=pew2020EuropeSource;source.textContent='Hackettほか（2025）, Religious Composition by Country, 2010–2020 · Pew Research Center';panel.append(source);
  const terms=document.createElement('p'),link=document.createElement('a');link.href=pew2020EuropeTerms;link.textContent='Pew利用条件';terms.append('出典・利用条件：',link);panel.append(terms);
}

function appendNationalReading(panel:HTMLElement,national:ReligionNationalProfile,selectedLocal:string|undefined,onSelectLocal:(id:string)=>void){
  const title=document.createElement('h4');title.textContent=national.name+'の国別回答構成';panel.append(title);
  const context=document.createElement('p');context.textContent=`${national.year}年 · ${national.universe} · ${national.question}。${national.denominator?`公表分母 ${count(national.denominator)}。`:''}${national.precision}。`;panel.append(context);
  const bar=document.createElement('div');bar.className='eu-religion-reading-bar';bar.setAttribute('role','img');bar.setAttribute('aria-label',national.segments.map(item=>`${item.label}${share(item.share)}`).join('、'));
  for(const segment of national.segments){const part=document.createElement('span');part.style.width=`${segment.share}%`;part.style.background=segment.color;bar.append(part);}panel.append(bar);
  const list=document.createElement('ul');for(const segment of national.segments){const item=document.createElement('li'),swatch=document.createElement('i');swatch.style.background=segment.color;swatch.className='eu-religion-reading-swatch';item.append(swatch,document.createTextNode(`${segment.label} ${share(segment.share)}${segment.count===undefined?'':` · ${count(segment.count)}`}`));list.append(item);}panel.append(list);
  const note=document.createElement('p');note.textContent=national.note;panel.append(note);
  const source=document.createElement('a');source.href=national.source;source.textContent=national.sourceName;panel.append(source);
  const license=document.createElement('p'),link=document.createElement('a');link.href=national.licenseUrl;link.textContent=national.license;license.append('利用条件：',link);panel.append(license);
  const locals=europeReligionRegionalEvidence.filter(item=>item.country===national.country);
  if(locals.length){const heading=document.createElement('h5');heading.textContent='地方統計（選択後の補足）';panel.append(heading);const options=document.createElement('div');options.className='eu-religion-local-options';for(const local of locals){const button=document.createElement('button');button.type='button';button.dataset.euReligionLocal=local.id;button.textContent=local.name;button.setAttribute('aria-pressed',String(local.id===selectedLocal));button.addEventListener('click',()=>onSelectLocal(local.id));options.append(button);}panel.append(options);}
  else if(national.caseId){const note=document.createElement('p');note.textContent='地方の元表は下の「地方統計」で開けます。';panel.append(note);}
}
