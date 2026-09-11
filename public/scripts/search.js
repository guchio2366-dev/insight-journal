(function () {
  "use strict";

  const app = document.querySelector("[data-search-app]");
  if (!app) return;

  const arrayKeys = ["topic", "country", "region", "theme", "kind"];
  const filterLabels = {
    topic: "分野",
    country: "国",
    region: "地域",
    theme: "テーマ",
    kind: "種類"
  };
  const form = app.querySelector("[data-search-form]");
  const queryInput = app.querySelector("[data-search-query]");
  const sortSelect = app.querySelector("[data-search-sort]");
  const topicModeInputs = [...app.querySelectorAll('input[name="topicMode"]')];
  const resultsElement = app.querySelector("[data-search-results]");
  const statusElement = app.querySelector("[data-search-status]");
  const errorElement = app.querySelector("[data-search-error]");
  const noticeElement = app.querySelector("[data-search-notice]");
  const degradedElement = app.querySelector("[data-search-degraded]");
  const resultsTitle = app.querySelector("[data-search-results-title]");
  const clearButton = app.querySelector("[data-search-clear]");
  const pagination = app.querySelector("[data-search-pagination]");
  const previousButton = app.querySelector("[data-page-prev]");
  const nextButton = app.querySelector("[data-page-next]");
  const pageLabel = app.querySelector("[data-page-label]");
  const base = (app.dataset.base || "").replace(/\/$/, "");
  const pageSize = 20;
  const maxSelections = 10;

  const checkboxes = Object.fromEntries(arrayKeys.map((key) => [
    key,
    [...app.querySelectorAll(`input[data-filter="${key}"]`)]
  ]));
  const allowed = Object.fromEntries(arrayKeys.map((key) => [
    key,
    new Set(checkboxes[key].map((input) => input.value))
  ]));

  let entries = [];
  let pagefind = null;
  let pagefindUnavailable = false;
  let degradedAnnounced = false;
  let indexReady = false;
  let renderSequence = 0;
  let queryTimer = null;

  function unique(values) {
    return [...new Set(values)];
  }

  function emptyState() {
    return {
      q: "",
      topic: [],
      country: [],
      region: [],
      theme: [],
      kind: [],
      topicMode: "any",
      sort: "relevance",
      page: 1
    };
  }

  function parseState(search) {
    const params = new URLSearchParams(search);
    const state = emptyState();
    const notices = [];
    const rawQuery = params.get("q") || "";
    state.q = rawQuery.slice(0, 200);
    if (rawQuery.length > 200) notices.push("キーワードは先頭200文字までを使用しました");

    for (const key of arrayKeys) {
      const raw = unique(params.getAll(key).filter(Boolean));
      const recognized = raw.filter((value) => allowed[key].has(value));
      if (recognized.length !== raw.length) {
        notices.push(`${filterLabels[key]}の未登録値を無視しました`);
      }
      if (recognized.length > maxSelections) {
        notices.push(`${filterLabels[key]}は先頭${maxSelections}件までを使用しました`);
      }
      state[key] = recognized.slice(0, maxSelections);
    }

    const topicMode = params.get("topicMode");
    if (topicMode === "all" || topicMode === "any") state.topicMode = topicMode;
    else if (topicMode) notices.push("分野の一致方法を初期値に戻しました");

    const sort = params.get("sort");
    if (["relevance", "latest", "updated"].includes(sort)) state.sort = sort;
    else if (sort) notices.push("並び順を初期値に戻しました");

    const rawPage = params.get("page");
    const page = rawPage === null ? 1 : Number(rawPage);
    if (Number.isSafeInteger(page) && page > 0) state.page = page;
    else if (rawPage !== null) notices.push("ページ番号を1に戻しました");
    return { state, notices };
  }

  function serializeState(state) {
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q.slice(0, 200));
    for (const key of arrayKeys) {
      for (const value of unique(state[key]).sort()) params.append(key, value);
    }
    if (state.topicMode === "all") params.set("topicMode", "all");
    if (state.sort !== "relevance") params.set("sort", state.sort);
    if (state.page > 1) params.set("page", String(state.page));
    return params.toString();
  }

  function writeState(state, mode) {
    const query = serializeState(state);
    const target = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", target);
  }

  function showNotice(messages) {
    if (!messages.length) {
      noticeElement.hidden = true;
      noticeElement.textContent = "";
      return;
    }
    noticeElement.textContent = `${messages.join("。")}。現在表示されている条件で検索できます。`;
    noticeElement.hidden = false;
  }

  function updateFilterCounts() {
    for (const key of arrayKeys) {
      const count = checkboxes[key].filter((input) => input.checked).length;
      const output = app.querySelector(`[data-filter-count="${key}"]`);
      if (output) output.textContent = count ? `${count}件` : "すべて";
    }
  }

  function applyStateToForm(state) {
    queryInput.value = state.q;
    sortSelect.value = state.sort;
    for (const key of arrayKeys) {
      const selected = new Set(state[key]);
      for (const input of checkboxes[key]) input.checked = selected.has(input.value);
    }
    for (const input of topicModeInputs) input.checked = input.value === state.topicMode;
    updateFilterCounts();
  }

  function stateFromForm() {
    const state = emptyState();
    state.q = queryInput.value.trim().slice(0, 200);
    for (const key of arrayKeys) {
      state[key] = checkboxes[key].filter((input) => input.checked).map((input) => input.value).slice(0, maxSelections);
    }
    state.topicMode = topicModeInputs.find((input) => input.checked)?.value === "all" ? "all" : "any";
    state.sort = ["latest", "updated"].includes(sortSelect.value) ? sortSelect.value : "relevance";
    return state;
  }

  function normalizeUrl(value) {
    try {
      const url = new URL(value, window.location.origin);
      return url.pathname.replace(/index\.html$/, "").replace(/\/$/, "") || "/";
    } catch {
      return String(value).split(/[?#]/)[0].replace(/index\.html$/, "").replace(/\/$/, "") || "/";
    }
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    return String(value).slice(0, 10).replace(/-/g, ".");
  }

  function comparePublicDatesDescending(left, right) {
    const leftTime = Date.parse(left.length === 10 ? `${left}T00:00:00Z` : left);
    const rightTime = Date.parse(right.length === 10 ? `${right}T00:00:00Z` : right);
    if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime)) {
      throw new TypeError("公開日の比較には有効なISO日付またはUTC日時が必要です");
    }
    if (leftTime === rightTime) return 0;
    return leftTime > rightTime ? -1 : 1;
  }

  function comparePublicIdsAscending(left, right) {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  }

  function compareDatedPublicIds(leftDate, leftPublicId, rightDate, rightPublicId) {
    return comparePublicDatesDescending(leftDate, rightDate)
      || comparePublicIdsAscending(leftPublicId, rightPublicId);
  }

  function optionLabel(key, value) {
    const input = checkboxes[key].find((candidate) => candidate.value === value);
    return input?.closest("label")?.innerText.trim() || value;
  }

  function conditionSummary(state) {
    const parts = [];
    if (state.q) parts.push(`キーワード「${state.q}」`);
    for (const key of arrayKeys) {
      if (!state[key].length) continue;
      const labels = state[key].map((value) => optionLabel(key, value)).join("、");
      const mode = key === "topic" && state.topic.length > 1
        ? `（${state.topicMode === "all" ? "すべてに一致" : "いずれかに一致"}）`
        : "";
      parts.push(`${filterLabels[key]}：${labels}${mode}`);
    }
    return parts.length ? `現在の条件：${parts.join("／")}` : "現在の条件：指定なし";
  }

  function createResultCard(entry, rank) {
    const item = element("article", `search-result-card search-result-card--${entry.kind}`);
    const meta = element("div", "search-result-meta");
    meta.append(element("span", "result-number", String(rank).padStart(2, "0")));
    meta.append(element("span", "result-kind", entry.kindLabel));
    const time = element("time", "", formatDate(entry.kind === "theme" ? entry.updatedAt : entry.publishedAt));
    time.dateTime = entry.kind === "theme" ? entry.updatedAt : entry.publishedAt;
    meta.append(time);
    item.append(meta);

    const copy = element("div", "search-result-copy");
    const title = element("h3");
    const titleLink = element("a", "", entry.title);
    titleLink.href = entry.url;
    title.append(titleLink);
    copy.append(title, element("p", "search-result-summary", entry.summary));

    const tags = element("ul", "tag-list");
    tags.setAttribute("aria-label", "分類");
    const labels = [
      ...(entry.topicLabels || []).map((label) => [label, "tag tag--topic"]),
      ...(entry.regionLabels || []).map((label) => [label, "tag"]),
      ...(entry.countryLabels || []).map((label) => [label, "tag"])
    ].slice(0, 5);
    for (const [label, className] of labels) {
      const listItem = document.createElement("li");
      listItem.append(element("span", className, label));
      tags.append(listItem);
    }
    copy.append(tags);

    const readLabel = entry.kind === "theme" ? "テーマを読む →" : entry.kind === "atlas" ? "地図を開く →" : "記事を読む →";
    const readLink = element("a", "read-link", readLabel);
    readLink.href = entry.url;
    readLink.setAttribute("aria-label", `${entry.title}を読む`);
    copy.append(readLink);
    item.append(copy);
    return item;
  }

  function overlaps(selected, actual) {
    return selected.length === 0 || selected.some((value) => actual.includes(value));
  }

  function matchesFilters(entry, state) {
    const topicMatches = state.topic.length === 0
      || (state.topicMode === "all"
        ? state.topic.every((value) => entry.topics.includes(value))
        : overlaps(state.topic, entry.topics));
    return topicMatches
      && overlaps(state.region, entry.regions)
      && overlaps(state.country, entry.countries)
      && overlaps(state.theme, entry.themeIds)
      && overlaps(state.kind, [entry.kind]);
  }

  function fallbackTextMatch(entry, query) {
    const normalized = query.toLocaleLowerCase("ja").replace(/\s+/g, " ");
    if (!normalized) return true;
    const haystack = [
      entry.title,
      entry.summary,
      ...(entry.topicLabels || []),
      ...(entry.regionLabels || []),
      ...(entry.countryLabels || []),
      ...(entry.themeLabels || [])
    ].join(" ").toLocaleLowerCase("ja");
    return normalized.split(" ").every((word) => haystack.includes(word));
  }

  async function pagefindOrder(query) {
    if (!query || pagefindUnavailable) return null;
    try {
      if (!pagefind) {
        pagefind = await import(`${base}/pagefind/pagefind.js`);
        await pagefind.init();
      }
      const response = await pagefind.search(query);
      const resultData = await Promise.all(response.results.map((result) => result.data()));
      return new Map(resultData.map((result, index) => [normalizeUrl(result.url), index]));
    } catch (error) {
      pagefindUnavailable = true;
      if (!degradedAnnounced) {
        degradedElement.textContent = "全文検索を読み込めなかったため、この画面では見出しと要約で検索します。";
        degradedElement.hidden = false;
        degradedAnnounced = true;
      }
      console.warn("Pagefindを読み込めなかったため、見出しと要約で検索します。", error);
      return null;
    }
  }

  async function renderResults(state, options) {
    if (!indexReady) return;
    const sequence = ++renderSequence;
    resultsElement.setAttribute("aria-busy", "true");
    errorElement.hidden = true;
    statusElement.textContent = "検索しています…";

    const order = await pagefindOrder(state.q);
    if (sequence !== renderSequence) return;

    let matches = entries.filter((entry) => matchesFilters(entry, state));
    if (state.q) {
      matches = order
        ? matches.filter((entry) => order.has(normalizeUrl(entry.url)))
        : matches.filter((entry) => fallbackTextMatch(entry, state.q));
    }

    matches.sort((left, right) => {
      if (state.sort === "relevance" && state.q && order) {
        const rank = order.get(normalizeUrl(left.url)) - order.get(normalizeUrl(right.url));
        if (rank !== 0) return rank;
      }
      return state.sort === "updated"
        ? compareDatedPublicIds(left.updatedAt, left.publicId, right.updatedAt, right.publicId)
        : compareDatedPublicIds(left.publishedAt, left.publicId, right.publishedAt, right.publicId);
    });

    const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
    const page = Math.min(Math.max(1, state.page), totalPages);
    if (page !== state.page) {
      state.page = page;
      writeState(state, "replace");
    }

    const start = (page - 1) * pageSize;
    const visible = matches.slice(start, start + pageSize);
    resultsElement.replaceChildren();
    if (visible.length === 0) {
      const empty = element("div", "empty-state");
      empty.append(
        element("h3", "", "条件に合う記事・テーマがありません"),
        element("p", "empty-condition", conditionSummary(state)),
        element("p", "", "言葉を短くするか、絞り込みを一つ外してみてください。")
      );
      const actions = element("div", "empty-filter-actions");
      const reset = element("button", "button button--primary", "条件を解除する");
      reset.type = "button";
      reset.addEventListener("click", () => {
        form.reset();
        updateFilterCounts();
        searchFromForm("push");
        queryInput.focus();
      });
      actions.append(reset);
      for (const [slug, label] of [["conflict", "紛争"], ["religion", "宗教"], ["agriculture", "農業"]]) {
        const link = element("a", "button button--quiet", `${label}から探す`);
        link.href = `${base}/search/?topic=${slug}`;
        actions.append(link);
      }
      empty.append(actions);
      resultsElement.append(empty);
    } else {
      visible.forEach((entry, index) => resultsElement.append(createResultCard(entry, start + index + 1)));
    }

    const queryMessage = state.q ? `「${state.q}」に一致する` : "";
    statusElement.textContent = `${queryMessage}${matches.length}件（${page} / ${totalPages}ページ）`;
    resultsElement.setAttribute("aria-busy", "false");
    pagination.hidden = totalPages <= 1;
    previousButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
    pageLabel.textContent = `${page} / ${totalPages}`;

    const scrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (options.focusResults) {
      resultsTitle.focus({ preventScroll: true });
      resultsTitle.scrollIntoView({ behavior: scrollBehavior, block: "start" });
    } else if (options.scroll) {
      app.scrollIntoView({ behavior: scrollBehavior, block: "start" });
    }
  }

  function searchFromForm(mode, options = { scroll: false }) {
    if (!indexReady) return;
    const state = stateFromForm();
    writeState(state, mode);
    showNotice([]);
    renderResults(state, options);
  }

  async function restoreFromUrl(options = { scroll: false }) {
    const parsed = parseState(window.location.search);
    applyStateToForm(parsed.state);
    if (parsed.notices.length) writeState(parsed.state, "replace");
    showNotice(parsed.notices);
    await renderResults(parsed.state, options);
  }

  async function initialize() {
    try {
      const response = await fetch(`${base}/search-index.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (payload.schemaVersion !== 1 || !Array.isArray(payload.entries)) throw new Error("検索データの形式が不正です");
      entries = payload.entries;
      indexReady = true;
      await restoreFromUrl();
    } catch (error) {
      indexReady = false;
      resultsElement.setAttribute("aria-busy", "false");
      statusElement.textContent = "記事とテーマを読み込めませんでした";
      errorElement.textContent = "検索データを読み込めませんでした。時間をおいて再度お試しください。";
      errorElement.hidden = false;
      for (const control of form.elements) control.disabled = true;
      console.error(error);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (queryTimer !== null) window.clearTimeout(queryTimer);
    searchFromForm("push", { scroll: true });
  });

  queryInput.addEventListener("input", () => {
    if (queryTimer !== null) window.clearTimeout(queryTimer);
    renderSequence += 1;
    statusElement.textContent = "入力中…";
    queryTimer = window.setTimeout(() => searchFromForm("replace"), 250);
  });

  for (const key of arrayKeys) {
    for (const input of checkboxes[key]) {
      input.addEventListener("change", () => {
        const selected = checkboxes[key].filter((candidate) => candidate.checked);
        if (selected.length > maxSelections) {
          input.checked = false;
          showNotice([`${filterLabels[key]}は${maxSelections}件まで選べます`]);
          return;
        }
        updateFilterCounts();
        searchFromForm("push");
      });
    }
  }

  for (const input of topicModeInputs) {
    input.addEventListener("change", () => searchFromForm("push"));
  }
  sortSelect.addEventListener("change", () => searchFromForm("push"));

  const filterMenus = [...app.querySelectorAll("[data-filter-menu]")];
  for (const menu of filterMenus) {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;
      for (const other of filterMenus) if (other !== menu) other.open = false;
    });
  }

  clearButton.addEventListener("click", () => {
    form.reset();
    updateFilterCounts();
    searchFromForm("push");
    queryInput.focus();
  });

  previousButton.addEventListener("click", () => {
    const parsed = parseState(window.location.search);
    parsed.state.page = Math.max(1, parsed.state.page - 1);
    writeState(parsed.state, "push");
    renderResults(parsed.state, { focusResults: true });
  });

  nextButton.addEventListener("click", () => {
    const parsed = parseState(window.location.search);
    parsed.state.page += 1;
    writeState(parsed.state, "push");
    renderResults(parsed.state, { focusResults: true });
  });

  window.addEventListener("popstate", () => restoreFromUrl());
  initialize();
})();
