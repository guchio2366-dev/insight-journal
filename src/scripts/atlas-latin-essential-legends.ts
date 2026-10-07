/** Keep the real legend and its listeners in the fixed reader, with an equal flow spacer. */
export function initLatinEssentialLegends():void {
 for(const root of document.querySelectorAll<HTMLElement>('[data-latin-workspace]')){
  if(root.dataset.essentialLegendReady==='true')continue;
  root.dataset.essentialLegendReady='true';
  // Climate charts occupy the reader; combined agriculture has a complete product key below the map.
  if(root.dataset.latinField==='nature'||root.dataset.latinField==='agriculture')continue;
  const reader=root.querySelector<HTMLElement>('.latin-reading,.latin-industry-reading');
  const fixed=reader?.querySelector<HTMLElement>('.latin-reading-fixed,.latin-industry-reading-fixed');
  if(!reader||!fixed)continue;
  const legend=root.querySelector<HTMLElement>('[data-latin-agriculture-legend-container],[data-nature-legend-host],[data-lp-target-legend],[data-industry-primary-legend]');
  if(!legend)continue;
  const anchor=document.createComment('original essential legend position');legend.before(anchor);
  const spacer=document.createElement('div');spacer.className='latin-essential-legend-spacer';spacer.setAttribute('aria-hidden','true');
  const panel=document.createElement('section');panel.className='latin-essential-legend';panel.setAttribute('aria-label','現在の地図の凡例');
  const heading=document.createElement('p');heading.className='latin-essential-legend-heading';heading.textContent='現在の地図の凡例';
  const note=document.createElement('p');note.className='latin-essential-legend-note';
  const syncLegendNote=()=>{
   const field=root.dataset.latinField,params=new URLSearchParams(location.search),routeLayer=params.get('layer');
   if(field==='industry'){
    const control=root.querySelector<HTMLSelectElement>('[data-industry-layer]');
    const layer=root.dataset.layer??(routeLayer&&['ores','manufactures','canal'].includes(routeLayer)?routeLayer:control?.value);
    note.textContent=layer==='canal'?'2024会計年度の説明図。矢印＝淡水と物流のつながり。位置・流量・数量の比例図ではありません。':'細線：国境。太枠：選択国。色は国の商品輸出額に占める割合（%）、2024年。';
   }else if(field==='population'){
    const control=root.querySelector<HTMLSelectElement>('[data-lp-layer-select]');
    const layer=root.dataset.lpLayer??(routeLayer&&['spatial','density','population','scale'].includes(routeLayer)?routeLayer:control?.value);
    note.textContent=layer==='spatial'?'色＝2020年の居住人口密度推計（人/km²）。細線：国境。太枠：選択国。国平均ではありません。':layer==='population'?'円面積＝2023年の国人口（人）。地色は固定。細線：国境。太枠：選択国。':layer==='scale'?'色＝2023年の国平均密度（人/陸地km²）。円面積＝国人口（人）。細線：国境。太枠：選択国。':'細線：国境。太枠：選択国。色＝2023年の国平均密度（人/陸地km²）。';
   }else note.textContent=field==='nature'?'細線：国境。太枠：選択国。色は5気候群で、国平均ではありません。':'細線：国境。太枠：選択国。色は格子の分布で、国の合計ではありません。';
  };
  syncLegendNote();
  panel.append(heading,note);fixed.after(panel);
  // The population entry explanations and numeric examples remain available in the independent reader.
  const scroll=reader.querySelector<HTMLElement>('.latin-reading-scroll,.latin-industry-reading-scroll');
  const kicker=fixed.querySelector<HTMLElement>('.latin-reading-kicker');if(scroll&&kicker)scroll.prepend(kicker);
  if(scroll&&root.dataset.latinField==='industry'){
   const original=fixed.querySelector<HTMLElement>('[data-industry-takeaway]');if(original)scroll.prepend(original);
   const brief=document.createElement('p');brief.className='latin-takeaway';brief.dataset.industryBrief='';brief.textContent=root.dataset.layer==='canal'?'流域の雨と貯水が閘門の通航を支え、干ばつ時は通航を調整する。':'鉱石・金属と製造品の輸出比率を分け、資源・技能・交通・市場を読む。';fixed.querySelector('h2')?.after(brief);
  }
  if(scroll&&root.dataset.latinField==='population'){
   const cause=fixed.querySelector<HTMLElement>('.lp-cause-brief');if(cause)scroll.prepend(cause);
   const distribution=root.querySelector<HTMLElement>('[data-lp-spatial-summary]');
   const firstComparison=fixed.querySelector<HTMLElement>('.latin-comparison-link');
   if(distribution&&firstComparison)fixed.insertBefore(distribution,firstComparison);
   const takeaway=document.createElement('p');takeaway.className='latin-takeaway';takeaway.textContent='沿岸・河川・高地の都市へ、人と仕事・交通が集まる。';
   fixed.querySelector('h2')?.after(takeaway);
   const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='比較で読み取ること';detail.append(summary);
   for(const link of fixed.querySelectorAll<HTMLAnchorElement>('.latin-comparison-link')){
    const explanation=link.querySelector('span');if(explanation){const p=document.createElement('p');const title=document.createElement('strong');title.textContent=link.querySelector('strong')?.textContent??'比較';p.append(title,document.createElement('br'),explanation);detail.append(p);link.querySelector('br')?.remove();}
   }
   scroll.prepend(detail);
   const example=fixed.querySelector<HTMLElement>('[data-lp-reading-short]');if(example)scroll.prepend(example);
  }
  const placeLegend=()=>{
   syncLegendNote();
   const comparison=root.classList.contains('is-comparison'),desktop=window.matchMedia('(min-width:960px)').matches;
   const spatial=root.dataset.latinField==='population'&&(root.dataset.lpLayer??root.querySelector<HTMLSelectElement>('[data-lp-layer-select]')?.value)==='spatial';
   if(comparison||spatial||!desktop){if(legend.parentElement===panel){anchor.after(legend);spacer.remove();}panel.hidden=true;return;}
   panel.hidden=false;
   if(legend.parentElement!==panel){spacer.style.height=`${legend.getBoundingClientRect().height}px`;anchor.after(spacer);panel.insertBefore(legend,note);}
  };
  // Waiting one frame lets the field controller apply the selected layer before measuring its old flow.
  requestAnimationFrame(placeLegend);
  new window.MutationObserver(placeLegend).observe(root,{attributes:true,attributeFilter:['class','data-layer','data-lp-layer']});
  window.addEventListener('resize',placeLegend);
 }
}
