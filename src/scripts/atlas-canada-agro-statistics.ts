/** Canada owns only its selection boundary; shared renderers and datasets remain untouched. */
export function initCanadaSelectedAgroStatistics(host:HTMLElement){
 if(host.dataset.initialized)return;host.dataset.initialized='true';
 const root=host.closest<HTMLElement>('[data-canada-agriculture],[data-canada-beef],[data-canada-forestry]');if(!root)return;
 const original=root.querySelector<HTMLElement>('[data-agro-statistics]');
 const section=host.querySelector<HTMLElement>('[data-canada-selected-statistics]')!,content=host.querySelector<HTMLElement>('[data-canada-agro-content]')!,heading=host.querySelector<HTMLElement>('[data-canada-agro-heading]')!;
 const forest=host.querySelector<HTMLSelectElement>('[data-canada-forest-product]'),chicken=host.querySelector<HTMLElement>('[data-canada-chicken-product]')!,chickenSelect=chicken.querySelector<HTMLSelectElement>('select')!;
 let mapProduct=new URL(location.href).searchParams.get('agriFocus')??'',rendered='';
 const read=()=>host.dataset.forest==='true'?(new URL(location.href).searchParams.get('forestProduct')??''):host.dataset.defaultProduct||(root.dataset.canolaReadingMode==='selected'?'canola':mapProduct);
 function render(product=read()){
  const template=[...host.querySelectorAll<HTMLTemplateElement>('[data-canada-agro-template]')].find(t=>t.dataset.canadaAgroTemplate===product);
  section.hidden=!template;
  root!.dataset.canadaAgroSelected=String(!!template);
  if(original)original.hidden=!!template;
  if(forest)forest.value=template?product:'';
  if(!template){content.replaceChildren();rendered='';return;}
  if(rendered!==product){content.replaceChildren(template.content.cloneNode(true));rendered=product;}
  heading.textContent='カナダ · '+template.dataset.label;
  chicken.hidden=!['chicken','eggs'].includes(product);if(!chicken.hidden)chickenSelect.value=product;
  section.dataset.canadaAgroReady='true';
 }
 root.addEventListener('canada-agro-selection',event=>{mapProduct=(event as CustomEvent<{product:string|null}>).detail.product??'';render();});
 root.addEventListener('canada-agro-reading-mode',()=>render());
 forest?.addEventListener('change',()=>{const url=new URL(location.href);forest.value?url.searchParams.set('forestProduct',forest.value):url.searchParams.delete('forestProduct');history.pushState(null,'',url);render();root!.dispatchEvent(new CustomEvent('canada-forestry-product'));});
 chickenSelect.addEventListener('change',()=>render(chickenSelect.value));
 window.addEventListener('popstate',()=>{mapProduct=new URL(location.href).searchParams.get('agriFocus')??'';render();});
 render();
}
