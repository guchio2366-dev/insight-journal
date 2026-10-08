import { europeCultureCompositions, type EuropeCultureComposition } from './atlas-europe-culture-composition';
import type { PopulationCaseChoiceKind } from '../data/atlas/europe/population-cases';
import { europeReligionRegionalEvidence, religionEvidenceShare } from '../data/atlas/europe/religion-regional-evidence';

export const europeCultureOverviewPlaces = [
  ...(['ethnicity','religion'] as const).flatMap(kind => europeCultureCompositions(kind)),
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
export function createEuropeCultureOverview(root:HTMLElement){
  const key=root.querySelector<HTMLElement>('[data-eu-culture-composition-key]');
  const evidencePanel=root.querySelector<HTMLElement>('[data-eu-religion-evidence-reading]');
  let rendered='';
  return {
    render(active:boolean,kind:PopulationCaseChoiceKind,caseId:string){
      if(!key)return;key.hidden=!active||!!caseId;if(key.hidden||rendered===kind)return;
      key.querySelector('[data-eu-culture-key-intro]')!.textContent=kind==='religion'
        ?'同時表示した点札は地域原表の一部の回答分類です。割合は札ごとの公表分母で計算し、県・自治体の全体を塗りません。円は2021年の英・ウェールズ・クロアチアの公表総計で、同じ大きさです。'
        :'2021年の公表総計 · 円は同じ大きさです。角度は各対象の総人口に占める回答割合で、円の位置は対象を示す目印です。人口規模・個人の位置・細地域の分布を表しません。';
      key.querySelector('[data-eu-culture-key-coverage]')!.textContent=kind==='religion'
        ?'Czechia・Serbiaの国勢調査とEstoniaの15歳以上の標本調査は、年・対象・設問が違います。特徴的な地域の資料抜粋であり、欧州全域の完成分布ではありません。最多・過半数の塗り分けでもありません。未掲載は0%を意味しません。'
        :'イングランド・ウェールズ・クロアチアだけを掲載しています。最多・過半数の分類で土地を塗った地図ではありません。色は各表の分類を区別し、国をまたいだ同色の対応はありません。';
      key.querySelector('[data-eu-composition-tables]')?.replaceChildren(...europeCultureCompositions(kind).map(table));rendered=kind;
    },
    decorate(id:string,button:HTMLButtonElement){
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
      const composition=europeCultureOverviewPlaces.find(item=>item.id===id) as EuropeCultureComposition|undefined;if(!composition||button.dataset.euComposition===id)return;
      button.classList.add('eu-culture-composition-label');button.dataset.euComposition=id;button.dataset.euCompositionCase=composition.caseId;
      const name=document.createElement('span');name.textContent=composition.name;button.replaceChildren(name,circle(composition));
      button.setAttribute('aria-label',`${composition.name}・${composition.year}年の回答構成。分母 ${count(composition.denominator)}。${composition.segments.map(segment=>`${segment.label} ${share(segment.share)}`).join('、')}。事例を開く`);
    },
    renderEvidence(active:boolean,id:string|undefined){
      if(!evidencePanel)return;
      const evidence=active?europeReligionRegionalEvidence.find(item=>item.id===id):undefined;
      evidencePanel.hidden=!evidence;
      if(!evidence)return;
      evidencePanel.replaceChildren();
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
