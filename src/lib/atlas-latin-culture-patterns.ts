import {latinCountries34,latinMapLayout,projectLatin} from './atlas-latin-america-geometry';
import {culturePatterns,culturePattern,cultureSources,cultureOverview,type CultureSection} from '../data/atlas/latin-america/culture-distributions';
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderLatinCulturePatterns(section:CultureSection,scope='all',selected='',only=false){
 const layout=latinMapLayout(scope,'all',740),{k,tx,ty,transform,frame}=layout;
 const visible=culturePatterns(section).filter(p=>scope==='all'||p.scope==='all'||p.scope===scope);
 const active=culturePattern(section,selected),isolate=only&&!!active;
 const point=(p:number[])=>{const [x,y]=projectLatin(p);return[x*k+tx,y*k+ty];};
 const context=latinCountries34.map(c=>`<path d="${c.path}" fill="#eeefe7" stroke="#89998f" stroke-width=".65" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
 const patterns=visible.map(p=>{const chosen=active?.id===p.id,hidden=isolate&&!chosen?' hidden="" style="display:none"':'',strength=chosen?1:.82;
  if(p.macro){const x=p.macro.x?.[scope as 'all'|'central'|'south']??20,y=p.macro.y[scope as 'all'|'central'|'south']??p.macro.y.all,height=p.macro.lines.length===4?168:148;return `<g data-lc-pattern="${p.id}" data-lc-evidence="${p.kind}" role="button" tabindex="0" data-lc-select="pattern:${p.id}" aria-pressed="${chosen}" aria-label="${escape(p.title)}"${hidden}><rect data-lc-primary-note x="${x}" y="${y}" width="300" height="${height}" rx="5" fill="${chosen?'#f5eadf':'#fffefa'}" stroke="${p.color}" stroke-width="${chosen?2:1}"/><text data-latin-culture-label-text style="font-size:21px;stroke-width:0;fill:#263f47" x="${x+14}" y="${y+26}">${p.macro.headings.map((line,i)=>`<tspan x="${x+14}" dy="${i?25:0}">${escape(line)}</tspan>`).join('')}</text><text style="font-size:15px;fill:#29434b" x="${x+14}" y="${y+77}">${p.macro.lines.map((line,i)=>`<tspan x="${x+14}" dy="${i?20:0}">${escape(line)}</tspan>`).join('')}</text><text style="font-size:12px;fill:#5d7067" x="${x+14}" y="${y+height-9}">Pew2014概説（2013–14年調査）</text><title>${escape(p.definition)}</title></g>`;}
  let shapes='';
  if(p.paths.length){
   shapes=p.paths.map((path,index)=>{const d=path.map((pos,i)=>`${i?'L':'M'}${point(pos).map(n=>n.toFixed(2)).join(',')}`).join(' ');if(path.length===1){const [x,y]=point(path[0]);return `<circle data-lc-schematic-region="${index}" cx="${x}" cy="${y}" r="7" fill="${p.color}" stroke="#fffefa" stroke-width="2"/>`;}return `<g data-lc-schematic-region="${index}"><path d="${d}" fill="none" stroke="${p.color}" stroke-opacity="${chosen ? .28 : .18}" stroke-width="${(p.width??22)+(chosen?5:0)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${p.color}" stroke-width="${chosen?3:2}" stroke-dasharray="4 5" stroke-linecap="round"/></g>`;}).join('');
  }else{const [x,y]=point(p.anchor);shapes=`<circle cx="${x}" cy="${y}" r="${chosen?8:6}" fill="${p.color}" stroke="#fffefa" stroke-width="2"/><circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${p.color}" stroke-dasharray="3 4"/>`;}
  const [x,y]=point(p.anchor);let [dx,dy]=p.offset;
  // Keep regional annotations inside the frame when a geographic scope enlarges them.
  if(section==='religion'&&dx<0&&x+dx<(p.mapLabel??p.label).length*15+16)dx=Math.abs(dx);
  const label=`<path d="M${x},${y}L${x+dx},${y+dy}" stroke="${p.color}" stroke-width=".8" fill="none"/><text data-latin-culture-label-text x="${x+dx+(dx<0?-5:5)}" y="${y+dy}" text-anchor="${dx<0?'end':'start'}">${escape(p.mapLabel??p.label)}</text>`;
  return `<g data-lc-pattern="${p.id}" data-lc-evidence="${p.kind}" role="button" tabindex="0" data-lc-select="pattern:${p.id}" aria-pressed="${chosen}" aria-label="${escape(p.title)}" opacity="${strength}"${hidden}>${shapes}${label}<title>${escape(p.definition)}</title></g>`;
 }).join('');
 return `<svg class="latin-map lp-map latin-culture-pattern-map" data-latin-map data-reading-frame="${frame.join(' ')}" viewBox="0 0 900 740" role="group" aria-label="${section==='ethnicity'?'民族・文化の地域記述による模式分布':'宗教文化と世俗化の地域的な特色'}"><rect width="900" height="740" fill="#e8f0f3"/><g transform="${transform}">${context}</g>${patterns}</svg>`;
}
export function renderCulturePatternLegend(section:CultureSection,selected='',scope='all'){
 return `<div class="latin-culture-pattern-key" aria-label="${section==='ethnicity'?'民族・文化':'宗教'}の分布">${culturePatterns(section).filter(p=>scope==='all'||p.scope==='all'||p.scope===scope).map(p=>`<button type="button" data-lc-select="pattern:${p.id}" aria-pressed="${selected==='pattern:'+p.id}"><i style="background:${p.color}"></i>${escape(p.label)}</button>`).join('')}</div><p>${section==='ethnicity'?'淡い点線帯＝資料が述べる地域の模式表示。文化の事例は地域注記。背景に集団の意味はありません。':'大きな注記＝Pew2014の広域概説。点線帯・点＝6地域の補助例。境界・信者割合・密度を示しません。'}</p><p>${section==='ethnicity'?'特徴的分布は最多・過半数や精密な境界を示しません。':'2013–14年調査に基づく概説。地域例の観察・記述年代は出典ごとに異なります。'}</p>`;
}
export function culturePatternReading(section:CultureSection,selected='',only=false){
 const p=culturePattern(section,selected),initial=cultureOverview[section];
 const sources=(p?p.sources:[...new Set(culturePatterns(section).flatMap(p=>p.sources))]).map(id=>cultureSources.find(s=>s.id===id)).filter(Boolean);
 const actions=p?`<div class="latin-culture-reading-actions"><button type="button" data-lc-reset>全体の概説へ</button><label><input type="checkbox" data-lc-isolate ${only?'checked':''}/> この分布だけを表示</label></div>`:'';
 return {title:p?.title??initial.title,overview:p?.overview??initial.overview,body:`<h3>解説：${p?'地域と資料の意味をつなぐ':section==='religion'?'まず広域の背景を読む':'重なり合う特徴を読む'}</h3><p>${escape(p?.explanation??initial.explanation)}</p>${!p&&section==='religion'?'<h3>地域の特色：6つの補助例</h3><p>中米の教会の併存、南ペルーの巡礼、キューバ西部のサンテリア、ハイチのヴードゥー、バイーアのカンドンブレ、ウルグアイの世俗化を地域ごとに読みます。</p>':''}${p?`<p class="latin-culture-definition">${escape(p.definition)}</p>`:''}${actions}<p><a href="#latin-culture-statistics">詳しい統計・資料を地図下で確かめる</a></p><details class="latin-culture-citations"><summary>この分布の出典</summary><ul>${sources.map(s=>`<li><a href="${escape(s!.url)}">${escape(s!.title)}</a>（${escape(s!.period)}）</li>`).join('')}</ul></details>`};
}
