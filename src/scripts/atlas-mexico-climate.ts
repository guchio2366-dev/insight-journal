/** Point normals keep the existing nature/comparison URL intact. */
export function initMexicoClimate(root:HTMLElement){
 const plots=[...root.querySelectorAll<HTMLElement>('[data-mexico-climate-plot]')];
 const ids=plots.map(plot=>plot.dataset.mexicoClimatePlot!);
 if(!ids.length)return;
 function render(){
  const requested=new URL(location.href).searchParams.get('city');
  const valid=requested===null||ids.includes(requested);
  const selected=requested===null?'mexico-city-tacubaya':requested;
  for(const plot of plots)plot.hidden=!valid||plot.dataset.mexicoClimatePlot!==selected;
  const heading=root.querySelector<HTMLElement>('[data-mexico-climate-heading]');
  const plot=plots.find(plot=>!plot.hidden);
  if(heading)heading.textContent=plot?`${plot.dataset.climateCityName}の雨温図`:'未収録の観測点の雨温図';
  for(const point of root.querySelectorAll<HTMLElement|SVGElement>('[data-mexico-climate-city]'))point.setAttribute('aria-pressed',String(valid&&point.dataset.mexicoClimateCity===selected));
  const notice=root.querySelector<HTMLElement>('[data-mexico-climate-notice]');
  if(notice){notice.hidden=valid;notice.textContent=valid?'':'この観測点の平年値は収録していません。地図の観測点から選び直してください。別都市へは置き換えません。';}
 }
 for(const point of root.querySelectorAll<HTMLElement|SVGElement>('[data-mexico-climate-city]')){
  const select=()=>{const url=new URL(location.href);url.searchParams.set('city',point.dataset.mexicoClimateCity!);history.pushState(null,'',url);render();root.dispatchEvent(new CustomEvent('mexico-climate-city-change'));root.dispatchEvent(new CustomEvent('mexico-reading-mode',{detail:{selected:true}}));};
  point.addEventListener('click',select);
  if(point instanceof SVGElement)point.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
 }
 addEventListener('popstate',render);render();
}
