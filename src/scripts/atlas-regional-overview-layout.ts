/** Keep the shared overview data and controller, with the regional desktop frame. */
export function initRegionalOverviewLayout(root:HTMLElement){
  if(root.dataset.regionalOverviewLayout)return;
  root.dataset.regionalOverviewLayout='true';
  const reading=root.querySelector<HTMLElement>('.overview-region-reading');
  if(!reading)return;
  const header=document.createElement('header');header.className='regional-overview-heading';
  const body=document.createElement('div');body.className='regional-overview-body';
  body.tabIndex=0;body.setAttribute('role','region');body.setAttribute('aria-label','地域の詳しい解説と出典');
  const introduction=reading.querySelector<HTMLElement>('.overview-region-intro');
  for(const child of Array.from(reading.children)){
    if(child.matches('.overview-reading-eyebrow,h2'))header.append(child);
    else body.append(child);
  }
  if(introduction?.textContent){
    const takeaway=document.createElement('p');takeaway.className='regional-overview-takeaway';
    takeaway.textContent=introduction.textContent.split('。')[0]+'。';header.append(takeaway);
  }
  reading.append(header,body);
}
