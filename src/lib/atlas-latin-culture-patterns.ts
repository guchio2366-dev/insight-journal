import {latinCountries34,latinMapLayout,projectLatin} from './atlas-latin-america-geometry';
import {culturePatterns,culturePattern,cultureSources,cultureOverview,religionSurvey,type CultureSection} from '../data/atlas/latin-america/culture-distributions';
const escape=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const callouts:Record<string,[number,number]>={GTM:[118,90],SLV:[118,132],HND:[118,174],NIC:[118,216],CRI:[118,258],PAN:[118,300],COL:[118,342],ECU:[118,384],PER:[118,426],CHL:[118,468],DOM:[670,60],PRI:[670,102],VEN:[670,162],BRA:[670,270],BOL:[670,332],PRY:[670,402],URY:[670,466],ARG:[670,528]};
function religionCallout(code:string,scope:string):[number,number]{
 if(scope==='all')return callouts[code];
 const left=scope==='central'?['GTM','SLV','HND','NIC','CRI','PAN']:['COL','ECU','PER','CHL'];
 const right=scope==='central'?['DOM','PRI']:['VEN','BRA','BOL','PRY','URY','ARG'];
 const index=left.indexOf(code);return index>=0?[118,85+index*75]:[670,85+right.indexOf(code)*75];
}
export function renderLatinCulturePatterns(section:CultureSection,scope='all',selected='',only=false){
 const layout=latinMapLayout(scope,'all',740),{k,tx,ty,transform,frame}=layout;
 const visible=culturePatterns(section).filter(p=>scope==='all'||p.kind==='national-survey'||p.scope===scope);
 const active=culturePattern(section,selected),isolate=only&&!!active;
 const point=(p:number[])=>{const [x,y]=projectLatin(p);return[x*k+tx,y*k+ty];};
 const context=latinCountries34.map(c=>`<path d="${c.path}" fill="#eeefe7" stroke="#89998f" stroke-width=".65" vector-effect="non-scaling-stroke" pointer-events="none"/>`).join('');
 const patterns=visible.map(p=>{const chosen=active?.id===p.id,hidden=isolate&&!chosen?' hidden="" style="display:none"':'',strength=chosen?1:.82;
  let shapes='';
  if(p.kind==='national-survey'){
   const column=['catholic','protestant','unaffiliated'].indexOf(p.id);
   shapes=religionSurvey.filter(row=>{const c=latinCountries34.find(c=>c.code===row.code)!;return scope==='all'||(scope==='south')===(c.subregion==='South America');}).map(row=>{const c=latinCountries34.find(c=>c.code===row.code)!,x=c.label[0]*k+tx,y=c.label[1]*k+ty;const [cx,cy]=religionCallout(row.code,scope);const value=row.values[column];return `<g data-lc-survey="${row.code}" data-lc-share="${value}"><rect x="${cx}" y="${cy+column*6}" width="60" height="4" fill="#dce2dc"/><rect x="${cx}" y="${cy+column*6}" width="${value*.6}" height="4" fill="${p.color}" stroke="${chosen?'#213b47':'none'}" stroke-width="${chosen?1:0}"/><title>${escape(c.name)}：${escape(p.label)} ${value}%、2013–14年全国調査</title></g>`;}).join('');
  }else if(p.paths.length){
   shapes=p.paths.map((path,index)=>{const d=path.map((pos,i)=>`${i?'L':'M'}${point(pos).map(n=>n.toFixed(2)).join(',')}`).join(' ');if(path.length===1){const [x,y]=point(path[0]);return `<circle data-lc-schematic-region="${index}" cx="${x}" cy="${y}" r="7" fill="${p.color}" stroke="#fffefa" stroke-width="2"/>`;}return `<g data-lc-schematic-region="${index}"><path d="${d}" fill="none" stroke="${p.color}" stroke-opacity="${chosen ? .28 : .18}" stroke-width="${(p.width??22)+(chosen?5:0)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${p.color}" stroke-width="${chosen?3:2}" stroke-dasharray="4 5" stroke-linecap="round"/></g>`;}).join('');
  }else{const [x,y]=point(p.anchor);shapes=`<circle cx="${x}" cy="${y}" r="${chosen?8:6}" fill="${p.color}" stroke="#fffefa" stroke-width="2"/><circle cx="${x}" cy="${y}" r="14" fill="none" stroke="${p.color}" stroke-dasharray="3 4"/>`;}
  const [x,y]=point(p.anchor),[dx,dy]=p.offset;
  const column=['catholic','protestant','unaffiliated'].indexOf(p.id);
  const label=p.kind==='national-survey'?`<text data-latin-culture-label-text x="24" y="${25+column*20}" fill="${p.color}">${escape(p.label)}</text>`:`<path d="M${x},${y}L${x+dx},${y+dy}" stroke="${p.color}" stroke-width=".8" fill="none"/><text data-latin-culture-label-text x="${x+dx+(dx<0?-5:5)}" y="${y+dy}" text-anchor="${dx<0?'end':'start'}">${escape(p.label)}</text>`;
  return `<g data-lc-pattern="${p.id}" data-lc-evidence="${p.kind}" role="button" tabindex="0" data-lc-select="pattern:${p.id}" aria-pressed="${chosen}" aria-label="${escape(p.title)}" opacity="${strength}"${hidden}>${shapes}${label}<title>${escape(p.definition)}</title></g>`;
 }).join('');
 let surveyContext='';
 if(section==='religion'&&!(isolate&&active?.kind!=='national-survey'))surveyContext=religionSurvey.filter(row=>{const c=latinCountries34.find(c=>c.code===row.code)!;return scope==='all'||(scope==='south')===(c.subregion==='South America');}).map(row=>{const c=latinCountries34.find(c=>c.code===row.code)!,x=c.label[0]*k+tx,y=c.label[1]*k+ty;const[cx,cy]=religionCallout(row.code,scope);return `<g data-lc-survey-label="${row.code}" pointer-events="none"><circle cx="${x}" cy="${y}" r="2" fill="#60766c"/><path d="M${x},${y}L${cx<450?cx+62:cx-5},${cy+6}" stroke="#889c92" stroke-width=".7" fill="none"/><text x="${cx}" y="${cy-5}">${escape(c.name)}</text></g>`;}).join('');
 return `<svg class="latin-map lp-map latin-culture-pattern-map" data-latin-map data-reading-frame="${frame.join(' ')}" viewBox="0 0 900 740" role="group" aria-label="${section==='ethnicity'?'民族・文化の地域記述による模式分布':'宗教の全国回答割合と地域文化の事例'}"><rect width="900" height="740" fill="#e8f0f3"/><g transform="${transform}">${context}</g>${surveyContext}${patterns}</svg>`;
}
export function renderCulturePatternLegend(section:CultureSection,selected='',scope='all'){
 return `<div class="latin-culture-pattern-key" aria-label="${section==='ethnicity'?'民族・文化':'宗教'}の分布">${culturePatterns(section).filter(p=>scope==='all'||p.kind==='national-survey'||p.scope===scope).map(p=>`<button type="button" data-lc-select="pattern:${p.id}" aria-pressed="${selected==='pattern:'+p.id}"><i style="background:${p.color}"></i>${escape(p.label)}</button>`).join('')}</div><p>${section==='ethnicity'?'淡い点線帯＝資料が述べる地域の模式表示。文化の事例は地域注記。背景に集団の意味はありません。':'短い棒＝2013–14年全国調査の割合（左端0%、右端100%）。上からカトリック・プロテスタント・所属なし。点＝カンドンブレ寺院群のある都市。'}</p><p>特徴的分布は最多・過半数や精密な境界を示しません。</p>`;
}
export function culturePatternReading(section:CultureSection,selected='',only=false){
 const p=culturePattern(section,selected),initial=cultureOverview[section];
 const sources=(p?p.sources:[...new Set(culturePatterns(section).flatMap(p=>p.sources))]).map(id=>cultureSources.find(s=>s.id===id)).filter(Boolean);
 const actions=p?`<div class="latin-culture-reading-actions"><button type="button" data-lc-reset>全体の概説へ</button><label><input type="checkbox" data-lc-isolate ${only?'checked':''}/> この分布だけを表示</label></div>`:'';
 return {title:p?.title??initial.title,overview:p?.overview??initial.overview,body:`<h3>解説：${p?'地域と資料の意味をつなぐ':'重なり合う特徴を読む'}</h3><p>${escape(p?.explanation??initial.explanation)}</p>${p?`<p class="latin-culture-definition">${escape(p.definition)}</p>`:''}${actions}<p><a href="#latin-culture-statistics">詳しい統計・資料を地図下で確かめる</a></p><details class="latin-culture-citations"><summary>この分布の出典</summary><ul>${sources.map(s=>`<li><a href="${escape(s!.url)}">${escape(s!.title)}</a>（${escape(s!.period)}）</li>`).join('')}</ul></details>`};
}
