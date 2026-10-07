import { europeCultureCompositions, type EuropeCultureComposition } from './atlas-europe-culture-composition';
import type { PopulationCaseChoiceKind } from '../data/atlas/europe/population-cases';

export const europeCultureOverviewPlaces = (['ethnicity','religion'] as const).flatMap(kind => europeCultureCompositions(kind));
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
  const key=root.querySelector<HTMLElement>('[data-eu-culture-composition-key]');let rendered='';
  return {
    render(active:boolean,kind:PopulationCaseChoiceKind,caseId:string){
      if(!key)return;key.hidden=!active||!!caseId;if(key.hidden||rendered===kind)return;
      key.querySelector('[data-eu-composition-tables]')?.replaceChildren(...europeCultureCompositions(kind).map(table));rendered=kind;
    },
    decorate(id:string,button:HTMLButtonElement){
      const composition=europeCultureOverviewPlaces.find(item=>item.id===id);if(!composition||button.dataset.euComposition===id)return;
      button.classList.add('eu-culture-composition-label');button.dataset.euComposition=id;button.dataset.euCompositionCase=composition.caseId;
      const name=document.createElement('span');name.textContent=composition.name;button.replaceChildren(name,circle(composition));
      button.setAttribute('aria-label',`${composition.name}・${composition.year}年の回答構成。分母 ${count(composition.denominator)}。${composition.segments.map(segment=>`${segment.label} ${share(segment.share)}`).join('、')}。事例を開く`);
    },
  };
}
