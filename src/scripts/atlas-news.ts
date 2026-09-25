export type AtlasNewsRegion = 'north-america' | 'latin-america' | 'east-asia' | 'southeast-asia' | 'south-central-asia';
export const atlasNewsRegions = {
  'north-america': { label: '北米', articleRegion: 'north_america', countries: ['US','CA','MX'], bounds: [-137,16,-56,58] },
  'latin-america': { label: '中南米', articleRegion: 'latin_america', countries: ['AG','AR','BS','BB','BZ','BO','BR','CL','CO','CR','CU','DM','DO','EC','FK','GD','GT','GY','HT','HN','JM','KN','LC','NI','PA','PY','PE','PR','SR','VC','TT','UY','VE','SV'], bounds: [-93,-56,-33,28] },
  'east-asia': { label: '東アジア', articleRegion: 'asia', countries: ['CN','JP','KR','KP','MN','TW'], bounds: [72,17,155,56] },
  'southeast-asia': { label: '東南アジア', articleRegion: 'asia', countries: ['BN','ID','KH','LA','MM','MY','PH','SG','TH','TL','VN'], bounds: [91,-12,143,30] },
  'south-central-asia': { label: '南・中央アジア', articleRegion: 'asia', countries: ['AF','BD','BT','IN','KZ','KG','LK','MV','NP','PK','TJ','TM','UZ'], bounds: [45,-2,99,57] },
} satisfies Record<AtlasNewsRegion,{label:string;articleRegion:string;countries:string[];bounds:[number,number,number,number]}>;

export function articleMatchesNewsRegion(data:{regions:readonly string[];countries:readonly string[]},region:AtlasNewsRegion='north-america') {
  const config=atlasNewsRegions[region];
  return data.countries.some(code=>config.countries.includes(code))||(data.regions.includes(config.articleRegion)&&(config.articleRegion!=='asia'||data.countries.length===0));
}

export function initAtlasNews(rail: HTMLElement) {
  const region:AtlasNewsRegion=Object.hasOwn(atlasNewsRegions,rail.dataset.newsRegion??'')?rail.dataset.newsRegion as AtlasNewsRegion:'north-america';
  const configuredBounds=rail.dataset.newsBounds?.split(',').map(Number);
  const bounds=configuredBounds?.length===4&&configuredBounds.every(Number.isFinite)?configuredBounds:atlasNewsRegions[region].bounds;
  const shell = rail.closest<HTMLElement>('[data-atlas-shell]');
  const list = rail.querySelector<HTMLElement>('[data-news-list]')!;
  const reader = rail.querySelector<HTMLElement>('[data-news-reader]')!;
  const body = rail.querySelector<HTMLElement>('[data-news-body]')!;
  let opener: HTMLElement | null = null;
  const close = () => {
    reader.hidden = true;
    list.hidden = false;
    shell?.classList.remove('is-reading-news');
    body.replaceChildren();
    opener?.focus();
    window.dispatchEvent(new Event('resize'));
  };
  rail.addEventListener('click', event => {
    const target = event.target as Element;
    const link = target.closest<HTMLAnchorElement>('[data-news-open]');
    if (link) {
      if (event instanceof MouseEvent && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)) return;
      const template = Array.from(rail.querySelectorAll<HTMLTemplateElement>('[data-news-template]')).find(t=>t.dataset.newsTemplate===link.dataset.newsOpen);
      if (!template) return;
      event.preventDefault();
      opener = link;
      const content = template.content.cloneNode(true) as DocumentFragment;
      content.querySelectorAll<HTMLElement>('[id]').forEach(el=>{el.id=`news-${el.id}`;});
      content.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a=>{a.setAttribute('href',`#news-${a.getAttribute('href')!.slice(1)}`);});
      body.replaceChildren(content);
      list.hidden = true;
      reader.hidden = false;
      shell?.classList.add('is-reading-news');
      reader.scrollTop = 0;
      body.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});
      window.dispatchEvent(new Event('resize'));
    }
    if (target.closest('[data-news-close]')) close();
    const location = target.closest<HTMLElement>('[data-news-location]');
    if (location) {
      if(!location.dataset.lng?.trim()||!location.dataset.lat?.trim())return;
      const lng = Number(location.dataset.lng), lat = Number(location.dataset.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < bounds[0] || lng > bounds[2] || lat < bounds[1] || lat > bounds[3]) return;
      const url = new URL(window.location.href);
      if(region==='latin-america'){
        url.searchParams.set('map',`${lng},${lat},4`);
        for(const key of ['topic','city','place','lng','lat','z'])url.searchParams.delete(key);
      }else{
      url.searchParams.set('lng',String(lng));
      url.searchParams.set('lat',String(lat));
      url.searchParams.set('z','4');
      if(region==='north-america')url.searchParams.set('view','custom');
      else for(const key of ['view','topic','detail','city','place','at','back','compare'])url.searchParams.delete(key);
      }
      history.pushState({},'',url);
      window.dispatchEvent(new PopStateEvent('popstate'));
      document.querySelector<HTMLElement>('[data-map-surface]')?.focus({preventScroll:true});
    }
  });
  rail.addEventListener('keydown',event=>{if(event.key==='Escape'&&!reader.hidden)close();});
}
