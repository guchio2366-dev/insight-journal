// Keep the existing map controllers independent from the new reading pages.
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-atlas-overview-link]'));
const initialLinks = new Map(links.map(link => [link, link.href]));
function updateOverviewLink(link: HTMLAnchorElement) {
  const source = new URL(location.href);
  const country = source.searchParams.get('place') || source.searchParams.get('country');
  const destination = new URL(initialLinks.get(link)!);
  if (country && /^[A-Z]{3}$/.test(country)) destination.searchParams.set('country', country);
  link.href = destination.href;
}
function updateOverviewLinks() { links.forEach(updateOverviewLink); }
if (links.length) {
  updateOverviewLinks();
  window.addEventListener('popstate', updateOverviewLinks);
  document.addEventListener('click', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-atlas-overview-link]');
    if (link && initialLinks.has(link)) updateOverviewLink(link);
    else queueMicrotask(updateOverviewLinks);
  });
  document.addEventListener('change', () => queueMicrotask(updateOverviewLinks));
  document.addEventListener('focusin', event => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('[data-atlas-overview-link]');
    if (link && initialLinks.has(link)) updateOverviewLink(link);
  });
}
