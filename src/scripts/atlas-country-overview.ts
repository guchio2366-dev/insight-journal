import type { OverviewCountry, OverviewTopicId } from '../data/atlas/country-overview';
import { initOverviewMap, type OverviewMapConfig } from './atlas-overview-map';

interface OverviewConfig extends OverviewMapConfig {
  countries: OverviewCountry[];
  topics: { id: OverviewTopicId; label: string }[];
  regionLabel: string;
}
interface OverviewState { country: string; city: string; topic: OverviewTopicId }

export function initCountryOverview(root: HTMLElement) {
  if (root.dataset.overviewReady === 'true') return;
  const configElement = root.querySelector<HTMLScriptElement>('[data-overview-config]');
  if (!configElement) return;
  const config: OverviewConfig = JSON.parse(configElement.textContent ?? '{}');
  const picker = root.querySelector<HTMLSelectElement>('[data-overview-country]')!;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-overview-topic]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const countryNames = Array.from(root.querySelectorAll<HTMLElement>('[data-overview-country-name]'));
  const announcement = root.querySelector<HTMLElement>('[data-overview-announcement]')!;
  const detail = root.querySelector<HTMLElement>('[data-overview-country-detail]')!;
  const detailLink = root.querySelector<HTMLAnchorElement>('[data-overview-detail-link]')!;

  const readState = (): OverviewState => {
    const params = new URLSearchParams(location.search);
    const city = config.cities.find(city => city.id === params.get('city'));
    const country = config.countries.find(country => country.code === params.get('country'))?.code ?? '';
    return {
      country: country || city?.country || '',
      city: city && (!country || country === city.country) ? city.id : '',
      topic: config.topics.find(topic => topic.id === params.get('topic'))?.id ?? 'agriculture',
    };
  };
  let state = readState();
  const map = initOverviewMap(root, config, (country, city = '') => {
    state.country = country; state.city = city;
    render(true); updateUrl(false);
  });

  const render = (announce = false) => {
    const country = config.countries.find(country => country.code === state.country);
    const city = config.cities.find(city => city.id === state.city);
    const topic = config.topics.find(topic => topic.id === state.topic)!;
    picker.value = country?.code ?? '';
    countryNames.forEach(element => { element.textContent = country?.name ?? ''; });
    detail.hidden = !country; detailLink.hidden = !country;
    root.querySelector<HTMLElement>('[data-overview-place-title]')!.textContent = city && country ? `${city.name} · ${country.name}` : country?.name ?? '国や都市を選んで、位置を確かめる';
    const cities = config.cities.filter(city => city.country === state.country).map(city => city.name);
    root.querySelector<HTMLElement>('[data-overview-place-description]')!.textContent = country
      ? cities.length ? `地図に載せた主な都市：${cities.join('、')}。` : 'この国・地域の位置を拡大しています。'
      : '地図の国名・都市名、または上の一覧から国・地域を選べます。';
    map.select(state.country, state.city);
    tabs.forEach(tab => {
      const selected = tab.dataset.overviewTopic === state.topic;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== `overview-panel-${state.topic}`; });
    const currentLink = root.querySelector<HTMLAnchorElement>('[data-overview-current-link]');
    if (currentLink) {
      const url = new URL(currentLink.href);
      state.country ? url.searchParams.set('country', state.country) : url.searchParams.delete('country');
      state.country ? url.searchParams.set('topic', state.topic) : url.searchParams.delete('topic');
      state.city ? url.searchParams.set('city', state.city) : url.searchParams.delete('city');
      currentLink.href = url.href;
    }
    document.title = country ? `${country.name}｜${config.regionLabel}の概要｜Insight Journal` : `${config.regionLabel}の概要と白地図｜Insight Journal`;
    if (announce) announcement.textContent = country ? `${city?.name ?? country.name}を選択しました。地図の下から国別の解説へ進めます。` : `${config.regionLabel}全体を表示しました。`;
  };
  const updateUrl = (replace: boolean) => {
    const url = new URL(location.href);
    state.country ? url.searchParams.set('country', state.country) : url.searchParams.delete('country');
    state.country ? url.searchParams.set('topic', state.topic) : url.searchParams.delete('topic');
    state.city ? url.searchParams.set('city', state.city) : url.searchParams.delete('city');
    // An anchor within the previous tab must not point into a now-hidden panel.
    if (!replace && url.hash.startsWith('#overview-')) url.hash = '';
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState'](null, '', url);
  };
  const chooseTopic = (tab: HTMLButtonElement, moveFocus = false) => {
    const topic = config.topics.find(topic => topic.id === tab.dataset.overviewTopic);
    if (!topic) return;
    if (state.topic !== topic.id) {
      state.topic = topic.id;
      render(true);
      updateUrl(false);
    }
    if (moveFocus) tab.focus();
  };

  picker.addEventListener('change', () => {
    state.country = config.countries.find(country => country.code === picker.value)?.code ?? '';
    state.city = '';
    render(true);
    updateUrl(false);
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseTopic(tab));
    tab.addEventListener('keydown', event => {
      let next: number;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      chooseTopic(tabs[next], true);
    });
  });
  window.addEventListener('popstate', () => {
    state = readState();
    render(true);
  });
  render();
  updateUrl(true);
  root.dataset.overviewReady = 'true';
}
