export function initAtlasNews(rail: HTMLElement) {
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
      const lng = Number(location.dataset.lng), lat = Number(location.dataset.lat);
      if (!Number.isFinite(lng) || !Number.isFinite(lat) || lng < -137 || lng > -56 || lat < 16 || lat > 58) return;
      const url = new URL(window.location.href);
      url.searchParams.set('lng',String(lng));
      url.searchParams.set('lat',String(lat));
      url.searchParams.set('z','4');
      url.searchParams.set('view','custom');
      history.pushState({},'',url);
      window.dispatchEvent(new PopStateEvent('popstate'));
      document.querySelector<HTMLElement>('[data-map-surface]')?.focus({preventScroll:true});
    }
  });
  rail.addEventListener('keydown',event=>{if(event.key==='Escape'&&!reader.hidden)close();});
}
