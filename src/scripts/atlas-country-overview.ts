import type { OverviewCountry, OverviewTopicId } from '../data/atlas/country-overview';

interface OverviewConfig {
  countries: OverviewCountry[];
  defaultCountry: string;
  topics: { id: OverviewTopicId; label: string }[];
  regionLabel: string;
}
interface OverviewState { country: string; topic: OverviewTopicId }

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

  const readState = (): OverviewState => {
    const params = new URLSearchParams(location.search);
    return {
      country: config.countries.find(country => country.code === params.get('country'))?.code ?? config.defaultCountry,
      topic: config.topics.find(topic => topic.id === params.get('topic'))?.id ?? 'agriculture',
    };
  };
  let state = readState();

  const render = (announce = false) => {
    const country = config.countries.find(country => country.code === state.country)!;
    const topic = config.topics.find(topic => topic.id === state.topic)!;
    picker.value = country.code;
    countryNames.forEach(element => { element.textContent = country.name; });
    tabs.forEach(tab => {
      const selected = tab.dataset.overviewTopic === state.topic;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => { panel.hidden = panel.id !== `overview-panel-${state.topic}`; });
    const currentLink = root.querySelector<HTMLAnchorElement>('[data-overview-current-link]');
    if (currentLink) {
      const url = new URL(currentLink.href);
      url.searchParams.set('country', state.country);
      url.searchParams.set('topic', state.topic);
      currentLink.href = url.href;
    }
    document.title = `${country.name}の概要｜${topic.label}｜${config.regionLabel}｜Insight Journal`;
    if (announce) announcement.textContent = `${country.name}の${topic.label}を表示しました。本文は準備中です。`;
  };
  const updateUrl = (replace: boolean) => {
    const url = new URL(location.href);
    url.searchParams.set('country', state.country);
    url.searchParams.set('topic', state.topic);
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
    state.country = config.countries.find(country => country.code === picker.value)?.code ?? config.defaultCountry;
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
