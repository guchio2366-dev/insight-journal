import { sectors } from '../data/atlas/industry-feature';
import { defaultIndustryFeatureState, readIndustryFeatureState, normalizeIndustryFeatureState, writeIndustryFeatureState, type IndustryFeatureState } from '../lib/industry-feature-state';

const powertrainCopy: Record<string,string> = {
  all:'SUVにはBEV・PHEV・HEV・ガソリン車などがあります。動力と車型を別の軸で選んでみましょう。',
  bev:'EV（BEV）は、外部から充電した電池の電力でモーターを動かします。排気管がなくても、電力や材料を作る工程は別に考える必要があります。',
  phev:'PHEVは、外部充電できる電池とエンジンを組み合わせます。充電できる環境や走る距離によって使い方が変わります。',
  hev:'HEVは、エンジンとモーターを組み合わせ、通常は外部から充電しません。原典によってフル／マイルドの区分が異なるため、統計を安易に合算しません。',
  ice:'ガソリン／ディーゼル車は、燃料を燃やしてエンジンを動かします。ここでは水素から電気を作る燃料電池車と分けて扱います。',
  fcev:'燃料電池車（FCEV）は、水素を使って車内で電気を作り、モーターを動かします。水素の製造方法と供給設備も、立地を考える手がかりです。'
};
const powertrainNames: Record<string,string> = {all:'すべての動力',bev:'EV（BEV）',phev:'PHEV',hev:'HEV',ice:'ガソリン／ディーゼル',fcev:'燃料電池車'};
const bodyNames: Record<string,string> = {all:'すべての車型',suv:'SUV',sedan:'セダン／ハッチバック',pickup:'ピックアップ',minivan:'ミニバン'};

export function initializeIndustryFeature(root: HTMLElement) {
  const catalog = (sectorId: string, regionId: string) => sectors.find(s=>s.id===sectorId)?.regions.find(r=>r.id===regionId)?.countries.map(c=>c.id) ?? [];
  let state = readIndustryFeatureState(window.location.search, catalog);
  const el = (selector:string) => root.querySelector<HTMLElement>(selector);
  const set = (selector:string,value:string) => { const target=el(selector); if(target)target.textContent=value; };
  const node = (tag:string,text:string,className?:string) => {const element=document.createElement(tag);element.textContent=text;if(className)element.className=className;return element;};
  const isFiltered = () => state.sector==='automotive'&&(state.powertrain!=='all'||state.body!=='all');
  const setPressed = (selector:string,key:string,value:string) => root.querySelectorAll<HTMLElement>(selector).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset[key]===value)));

  function render() {
    const sector=sectors.find(s=>s.id===state.sector)!;
    const region=sector.regions.find(r=>r.id===state.region)!;
    const country=region.countries.find(c=>c.id===state.country);
    const missing=isFiltered()&&state.view==='market';
    setPressed('[data-if-sector]','ifSector',state.sector);
    setPressed('[data-if-region]','ifRegion',state.region);
    setPressed('[data-if-view]','ifView',state.view);
    setPressed('[data-if-powertrain]','ifPowertrain',state.powertrain);
    setPressed('[data-if-body]','ifBody',state.body);
    set('[data-if-question]',sector.question);
    set('[data-if-takeaway]',sector.takeaway);
    set('[data-if-market-title]',state.sector==='automotive'?'売れる車':state.sector==='solar'?'発電する場所':'使う・担う場所');
    const mapTitle=state.view==='mechanism'?'資源・工程・市場の位置関係':state.view==='market'?(state.sector==='battery'?'EV電池の導入量（世界比）':state.sector==='solar'?'発電の自然条件 · 定量地図は未収録':state.sector==='semiconductor'?'設計・装置材料・後工程の役割（代表例）':sector.primaryMetric):(state.sector==='automotive'?'工程と工場の場所 · 確認済み代表例':state.sector==='solar'?'ポリシリコン → ウエハー → セル → モジュール':sector.primaryMetric);
    set('[data-if-map-title]',mapTitle);
    set('[data-if-period]',sector.period);
    set('[data-if-scope]',sector.scope);
    set('[data-if-caution]',missing?'選択した動力 × 車型の比率は未収録。全体の値から推定しません。':sector.caution);
    set('[data-if-country-name]',country?.name??'国・対象範囲を選ぶ');
    set('[data-if-reader-kicker]',state.view==='manufacturing'?'国・対象範囲の工程 · 本社と工場は別':state.view==='mechanism'?'なぜここ？ 自然・社会・市場から読む':state.sector==='automotive'?'代表国の市場 · 地域平均ではありません':'指標と対象範囲を分けて読む');
    const fullValue=country?(state.view==='market'?country.marketLabel:country.manufacturingLabel):'';
    const shortValue=country?(state.view==='market'?(country.mapMarketLabel??country.marketLabel):(country.mapManufacturingLabel??country.manufacturingLabel)):'';
    set('[data-if-value]',!country?'選択を解除しました':missing?'該当データ未収録':shortValue);
    set('[data-if-country-note]',missing&&country?`全動力・全車型の比較値：${country.marketLabel}（2025年）`:state.sector==='automotive'&&state.view==='market'?(country?.countryNote??'2025年 · 新車販売（IEAのCars）'):`${fullValue}${country?.countryNote?'。'+country.countryNote:''}`);
    set('[data-if-summary]',state.view==='mechanism'?region.why:region.summary);
    set('[data-if-example-status]',`${region.example.status} · ${region.example.period} · ${region.label}の代表事例`);
    set('[data-if-example-scope]',region.example.scope);
    set('[data-if-example-title]',region.example.title);
    set('[data-if-example-description]',region.example.description);
    const missingElement=el('[data-if-missing]');if(missingElement)missingElement.hidden=!missing;
    set('[data-if-why-text]',region.why);
    set('[data-if-policy]',region.policy);
    set('[data-if-japan]',region.japan);
    set('[data-if-filter-label]',`${powertrainNames[state.powertrain]} × ${bodyNames[state.body]}`);
    set('[data-if-technology]',powertrainCopy[state.powertrain]+(state.body!=='all'?` 選択中の車型は${bodyNames[state.body]}です。同じ形でも、動力は一つに決まりません。`:''));
    const classification=el('[data-if-classification]');if(classification)classification.hidden=state.sector!=='automotive';
    const deep=el('[data-if-deep-dive]') as HTMLDetailsElement;if(state.view==='mechanism'&&deep)deep.open=true;

    const buttons=el('[data-if-countries]');
    if(buttons){
      const focusedCountry=buttons.contains(document.activeElement)?(document.activeElement as HTMLElement)?.dataset.ifCountry:undefined;
      buttons.replaceChildren(...region.countries.map(c=>{const b=node('button','') as HTMLButtonElement;b.type='button';b.dataset.ifCountry=c.id;b.setAttribute('aria-pressed',String(c.id===state.country));b.append(node('b',c.name),node('span',missing?'組合せ：未収録':state.view==='market'?(c.mapMarketLabel??c.marketLabel):(c.mapManufacturingLabel??c.manufacturingLabel)));return b;}));
      if(focusedCountry)buttons.querySelector<HTMLButtonElement>(`[data-if-country="${focusedCountry}"]`)?.focus({preventScroll:true});
    }
    root.querySelectorAll<SVGSVGElement>('[data-feature-map]').forEach(map=>{
      const active=map.dataset.featureMap===state.region;map.style.display=active?'':'none';map.toggleAttribute('hidden',!active);
      map.querySelectorAll<SVGElement>('[data-feature-marker]').forEach(marker=>{
        const c=active?region.countries.find(c=>c.id===marker.dataset.featureMarker):undefined;
        marker.style.display=c?'':'none';marker.toggleAttribute('hidden',!c);marker.setAttribute('aria-hidden',String(!c));marker.setAttribute('tabindex',c?'0':'-1');
        const selected=!!c&&c.id===state.country;marker.classList.toggle('is-selected',selected);marker.setAttribute('aria-pressed',String(selected));
        if(c){const value=missing?'未収録':state.view==='market'?(c.mapMarketLabel??c.marketLabel):(c.mapManufacturingLabel??c.manufacturingLabel);marker.querySelector('[data-feature-country-value]')!.textContent=value;marker.querySelector('[data-feature-country-name]')!.textContent=c.id==='EU'?'EU':c.name;marker.setAttribute('aria-label',`${c.name}：${missing?'該当データ未収録':state.view==='market'?c.marketLabel:c.manufacturingLabel}。選択して説明を読む`);}
      });
      map.querySelectorAll<SVGElement>('[data-feature-shape]').forEach(shape=>{
        const id=shape.dataset.featureShape!;const grouped=shape.dataset.featureGroup;
        const recorded=active&&region.countries.some(c=>c.id===id||(c.id==='EU'&&grouped==='EU'));
        shape.classList.toggle('is-recorded',recorded);shape.classList.toggle('is-selected',active&&(id===state.country||(state.country==='EU'&&grouped==='EU')));
        if(recorded){shape.dataset.country=grouped==='EU'&&region.countries.some(c=>c.id==='EU')?'EU':id;}else delete shape.dataset.country;
      });
    });
    const steps=el('[data-if-steps]');if(steps)steps.replaceChildren(...sector.steps.map(step=>{const li=node('li','');li.append(node('b',step.title),node('span',step.text));return li;}));
    const comparison=el('[data-if-comparison]');if(comparison)comparison.hidden=!state.compare;
    const compareButton=el('[data-if-compare]');if(compareButton){compareButton.setAttribute('aria-expanded',String(state.compare));compareButton.textContent=state.compare?'3地域の比較を閉じる −':'3地域を並べて比べる ＋';}
    const compareTitle=state.view==='mechanism'?'資源・工程・市場を3地域の代表例で読む':state.view==='market'?(state.sector==='battery'?'EV電池導入：中国60%／EU15%弱／米国10%（2025年）':state.sector==='solar'?'発電の自然条件と確認状況':state.sector==='semiconductor'?'設計・装置・使われ方の代表例':sector.comparisonTitle):(state.sector==='automotive'?'本社・工場・組立の代表例':sector.comparisonTitle);
    set('[data-if-compare-title]',missing?'選択した動力 × 車型は未収録':compareTitle);set('[data-if-compare-note]',sector.comparisonNote);
    const cards=el('[data-if-comparison-cards]');if(cards)cards.replaceChildren(...sector.regions.map(r=>{
      const card=node('section','');card.append(node('h4',r.label));
      r.countries.forEach(c=>card.append(node('p',`${c.name}：${missing?'組合せは未収録（全体：'+c.marketLabel+'）':state.view==='market'?c.marketLabel:c.manufacturingLabel}`)));
      card.append(node('p',r.summary));return card;
    }));
    const visibleRegions=state.compare?sector.regions:[region];
    const sourceSet=new Set([...sector.sourceIds,...visibleRegions.flatMap(r=>[...r.example.sourceIds,...r.countries.flatMap(c=>c.sourceIds)])]);
    root.querySelectorAll<HTMLElement>('[data-if-source]').forEach(li=>li.hidden=!sourceSet.has(li.dataset.ifSource!));
    const sourceLink=el('[data-if-source-open]');if(sourceLink)sourceLink.setAttribute('aria-label',`${country?.name??region.label}と${sector.label}の出典を開く`);
    root.dataset.sector=state.sector;root.dataset.region=state.region;root.dataset.view=state.view;
  }
  function change(patch:Partial<IndustryFeatureState>, push=true) {
    state=normalizeIndustryFeatureState({...state,...patch},catalog);
    const url=writeIndustryFeatureState(new URL(window.location.href),state);
    if(push)window.history.pushState(null,'',url);else window.history.replaceState(null,'',url);
    render();
  }
  root.addEventListener('click',async event=>{
    const target=(event.target as Element).closest<HTMLElement>('button,[data-country],a[data-if-source-open]');if(!target||!root.contains(target))return;
    if(target.dataset.ifSector){change({sector:target.dataset.ifSector as IndustryFeatureState['sector'],view:target.dataset.ifSector==='automotive'?'market':'manufacturing'});return;}
    if(target.dataset.ifRegion){change({region:target.dataset.ifRegion as IndustryFeatureState['region']});return;}
    if(target.dataset.ifView){change({view:target.dataset.ifView as IndustryFeatureState['view']});return;}
    if(target.dataset.ifCountry||target.dataset.country){const next=target.dataset.ifCountry??target.dataset.country!;change({country:next===state.country?'':next});return;}
    if(target.dataset.ifPowertrain){change({powertrain:target.dataset.ifPowertrain as IndustryFeatureState['powertrain']});return;}
    if(target.dataset.ifBody){change({body:target.dataset.ifBody as IndustryFeatureState['body']});return;}
    if(target.hasAttribute('data-if-reset')){change({...defaultIndustryFeatureState});set('[data-if-live-status]','初期の北米・自動車に戻しました。');return;}
    if(target.hasAttribute('data-if-compare')){change({compare:!state.compare});return;}
    if(target.hasAttribute('data-if-why')){change({view:'mechanism'});el('[data-if-deep-dive]')?.scrollIntoView({block:'start',behavior:'smooth'});return;}
    if(target.hasAttribute('data-if-source-open')){const details=el('#if-sources') as HTMLDetailsElement;details.open=true;return;}
    if(target.hasAttribute('data-if-copy')){const url=writeIndustryFeatureState(new URL(window.location.href),state).href;try{await navigator.clipboard.writeText(url);set('[data-if-live-status]','この比較のリンクをコピーしました。');}catch{set('[data-if-live-status]',`この比較のリンク：${url}`);}return;}
  });
  root.addEventListener('keydown',event=>{
    const marker=(event.target as Element).closest<SVGElement>('[data-feature-marker]');
    if(marker&&(event.key==='Enter'||event.key===' ')){event.preventDefault();const id=marker.dataset.country!;change({country:id===state.country?'':id});}
  });
  window.addEventListener('popstate',()=>{state=readIndustryFeatureState(window.location.search,catalog);render();});
  change({},false);
  return {getState:()=>({...state}),change};
}

if(typeof document!=='undefined'){
  const root=document.querySelector<HTMLElement>('[data-industry-feature]');
  if(root)initializeIndustryFeature(root);
}
