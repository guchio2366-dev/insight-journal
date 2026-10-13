/** Match the available screen, independently of the map's height. Canada only. */
export function initCanadaReadingHeight(){
 const panels=[...document.querySelectorAll<HTMLElement>('.canada-nature .canada-reading,.canada-nature .canada-water-reading,.canada-industry-pilot .ca-pilot-reading')];
 if(!panels.length)return;
 let frame=0;
 const draw=()=>{frame=0;for(const panel of panels){const top=panel.getBoundingClientRect().top;if(panel.offsetWidth&&top>=0)panel.style.setProperty('--canada-reading-height',`${Math.max(180,Math.floor(innerHeight-top-18))}px`);}};
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
 const observer=new ResizeObserver(schedule);for(const panel of panels){observer.observe(panel);if(panel.parentElement)observer.observe(panel.parentElement);}
 addEventListener('resize',schedule);addEventListener('scroll',schedule,{passive:true});document.fonts?.ready.then(schedule);schedule();
}
