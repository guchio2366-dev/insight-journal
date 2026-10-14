import type {AsiaState} from '../lib/atlas-asia-state';
import type {SouthIndustryGroup,SouthIndustrySite} from '../data/atlas/south-asia-major-industries';
import {southIndustrySectors,southIndustryGroups} from '../data/atlas/south-asia-industry-sectors';

// The South Asia contract is opt-in. Other regions retain their own reading,
// markers, national statistics and navigation.
export function createSouthIndustryReading(root:HTMLElement,groups:SouthIndustryGroup[],sites:SouthIndustrySite[],overview:string,select:(id:string)=>void){
 const statistics=root.querySelector<HTMLElement>('[data-south-industry-statistics]');
 if(!statistics)return null;
 const $=(selector:string)=>root.querySelector<HTMLElement>(selector)!;
 const make=(tag:string,text:string)=>{const node=root.ownerDocument.createElement(tag);node.textContent=text;return node;};
 const source=(label:string,url:string)=>{const node=make('a',label) as HTMLAnchorElement;node.href=url;return node;};
 const selectedPanel=make('section','');selectedPanel.dataset.southIndustrySelected='';selectedPanel.hidden=true;$('[data-industry-definition]').after(selectedPanel);
 return {render(state:AsiaState,topic:{id:string;title:string;kind:string}){
  const active=state.field==='industry'&&topic.kind==='regional';statistics.hidden=!active;
  if(!active){selectedPanel.hidden=true;return;}
  const sector=southIndustrySectors.find(s=>s.id===topic.id||s.groups.includes(topic.id as never));
  const selected=sites.find(s=>s.id===state.detail&&(!state.place||s.country===state.place));
  const group=groups.find(g=>g.id===(selected?.group??topic.id));
  const visible=sites.filter(s=>!state.place||s.country===state.place);
  const allowed=group?[group.id]:southIndustryGroups(topic.id)??groups.map(g=>g.id);
  const title=group?.title??sector?.title??'南アジアの主要産業';
  $('[data-industry-title]').textContent=title;
  $('[data-industry-lead]').textContent=group?.fact??overview;
  $('[data-industry-definition]').textContent=group?.reason??'炭田・河川・産地を使う産業と、港・都市の加工網・技術人材を使う産業では集積の条件が異なります。バングラデシュ・パキスタンの繊維、ネパール・ブータンの電力、スリランカ・モルディブの観光も地域経済を支えます。';
  $('[data-industry-value]').hidden=true;
  $('[data-industry-coverage]').textContent='地図は根拠を確認した集積・施設の例です。色は産業、点は所在地を示します。国別・世界の数量、集積の規模、未取得の範囲は地図下で確認できます。';
  $('[data-industry-status]').textContent='';$('[data-industry-retry]').hidden=true;$('[data-industry-detail-label]').hidden=true;$('[data-industry-search-label]').hidden=true;
  $('[data-grid-reading]').textContent=selected?selected.name:'点は施設・集積地域の案内位置。大きさは生産量・施設数を表しません。';
  $('[data-map-title]').textContent=title;$('[data-map-period]').textContent='所在地と工程の例 · 国別統計は地図下';$('[data-map-eyebrow]').textContent='Industry · South Asia';
  $('[data-map-gesture]').textContent=group?.fact??overview;
  const legend=$('[data-industry-scale]');legend.replaceChildren();$('[data-industry-legend-title]').textContent='産業と所在地';
  for(const g of groups){const item=make('span',''),swatch=make('i','');swatch.style.backgroundColor=g.color;item.append(swatch,root.ownerDocument.createTextNode(g.title));legend.append(item);}
  $('[data-industry-legend-note]').textContent='色は産業、点は所在地。点から札への細い破線はラベルの位置案内で、取引・輸送ではありません。点の数・大きさは生産規模ではありません。';
  const method=$('[data-industry-method]');method.replaceChildren(make('p','都市・地区の案内位置で、敷地境界や施設全数ではありません。国別統計の年・単位・定義は地図下に記載。'),source(group?.source.label??groups[0].source.label,group?.source.url??groups[0].source.url));
  selectedPanel.hidden=!selected;selectedPanel.replaceChildren();
  if(selected){selectedPanel.append(make('h3',selected.name),make('p',selected.fact),make('p',selected.reason),make('p',selected.kind+' · '+selected.evidenceYear+'。'+selected.locationPrecision),source(selected.source.label,selected.source.url));const clear=make('button','選択を解除') as HTMLButtonElement;clear.type='button';clear.className='south-industry-clear';clear.addEventListener('click',()=>select(''));selectedPanel.append(clear);}
  const content=$('[data-industry-content]');content.replaceChildren();const details=make('details',''),summary=make('summary','確認した産業拠点を一覧から選ぶ');details.append(summary);
  for(const g of groups){const members=visible.filter(s=>s.group===g.id);if(!members.length)continue;details.append(make('h3',g.title));const list=make('div','');list.className='sc-industry-site-list';for(const site of members){const button=make('button',site.name) as HTMLButtonElement;button.type='button';button.dataset.southIndustrySiteChoice=site.id;button.setAttribute('aria-pressed',String(site.id===selected?.id));button.addEventListener('click',()=>select(site.id));list.append(button);}details.append(list);}content.append(details);
  for(const section of root.querySelectorAll<HTMLElement>('[data-south-industry-evidence]'))section.hidden=!allowed.includes(section.dataset.southIndustryEvidence!);
  $('[data-south-statistics-title]').textContent=title+'：規模・世界での位置・供給網';
  for(const button of root.querySelectorAll<HTMLElement>('[data-south-industry-sector]'))button.setAttribute('aria-pressed',String(button.dataset.southIndustrySector===sector?.id));
  const navigation=$('[data-industry-navigation-label]');navigation.textContent=title;$('[data-industry-current-map]').textContent='産業の所在地と工程';$('[data-industry-navigation-note]').hidden=true;
 }};
}
