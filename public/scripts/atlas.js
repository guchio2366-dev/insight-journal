(function () {
  "use strict";

  const root = document.querySelector("[data-atlas-root]");
  if (!root) return;

  const payloadElement = root.querySelector("[data-atlas-payload]");
  const panel = root.querySelector("[data-atlas-panel]");
  const emptyPanel = root.querySelector("[data-atlas-empty]");
  const contentPanel = root.querySelector("[data-atlas-content]");
  const svg = root.querySelector("[data-atlas-svg]");
  if (!payloadElement || !panel || !emptyPanel || !contentPanel || !svg) return;

  let payload;
  try {
    payload = JSON.parse(payloadElement.textContent || "{}");
  } catch (error) {
    console.error("Atlasデータを読み込めませんでした", error);
    return;
  }

  const places = new Map((Array.isArray(payload.places) ? payload.places : []).map((place) => [place.id, place]));
  const insights = new Map((Array.isArray(payload.insights) ? payload.insights : []).map((insight) => [insight.id, insight]));
  const field = payload.field || { cropLabels: {} };
  const reportBase = root.dataset.reportBase || "";
  let selectedPlaceId = null;
  let selectedInsightId = null;

  function escapeText(value) {
    return String(value == null ? "" : value);
  }

  function makeElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = escapeText(text);
    return node;
  }

  function insightForPlace(place, requestedId) {
    const ids = Array.isArray(place.insightIds) ? place.insightIds : [];
    const requested = requestedId && insights.get(requestedId);
    if (requested && requested.placeIds.includes(place.id)) return requested;
    const candidates = ids.map((id) => insights.get(id)).filter(Boolean);
    return candidates.find((insight) => insight.priority === "primary") || candidates[0] || null;
  }

  function updateUrl(placeId, insightId, mode) {
    const url = new URL(window.location.href);
    if (placeId) url.searchParams.set("place", placeId);
    else url.searchParams.delete("place");
    if (insightId) url.searchParams.set("insight", insightId);
    else url.searchParams.delete("insight");
    const target = `${url.pathname}${url.search}${url.hash}`;
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", target);
  }

  function sourceLinks(insight) {
    const list = makeElement("ul", "atlas-panel-sources");
    list.setAttribute("aria-label", "この説明の出典");
    for (const sourceId of insight.sourceIds || []) {
      const item = makeElement("li");
      const link = makeElement("a", "", sourceId);
      link.href = `${reportBase}#${sourceId}`;
      item.append(link);
      list.append(item);
    }
    return list;
  }

  function insightCard(insight, open) {
    const article = makeElement("article", `atlas-insight-card atlas-insight-card--${insight.priority}`);
    if (insight.priority === "secondary") {
      const details = document.createElement("details");
      details.open = open;
      const summary = makeElement("summary", "atlas-insight-summary", insight.title);
      details.append(summary);
      const body = makeElement("div", "atlas-insight-card-body");
      body.append(makeElement("p", "", insight.shortText));
      const link = makeElement("a", "atlas-panel-report-link", "詳述の該当節を読む →");
      link.href = `${reportBase}#${insight.reportSectionId}`;
      body.append(link, sourceLinks(insight));
      details.append(body);
      article.append(details);
      return article;
    }
    article.append(makeElement("p", "atlas-insight-kicker", "選択地点のインサイト"));
    article.append(makeElement("h3", "", insight.title));
    article.append(makeElement("p", "atlas-insight-text", insight.shortText));
    const link = makeElement("a", "atlas-panel-report-link", "詳述の該当節を読む →");
    link.href = `${reportBase}#${insight.reportSectionId}`;
    article.append(link, sourceLinks(insight));
    return article;
  }

  function render(placeId, requestedInsightId, historyMode) {
    const place = places.get(placeId);
    if (!place) {
      selectedPlaceId = null;
      selectedInsightId = null;
      emptyPanel.hidden = false;
      contentPanel.hidden = true;
      contentPanel.replaceChildren();
      root.querySelectorAll("[data-place-id].is-selected").forEach((node) => node.classList.remove("is-selected"));
      updateUrl(null, null, historyMode || "replace");
      return;
    }

    const selectedInsight = insightForPlace(place, requestedInsightId);
    selectedPlaceId = place.id;
    selectedInsightId = selectedInsight ? selectedInsight.id : null;
    emptyPanel.hidden = true;
    contentPanel.hidden = false;
    contentPanel.replaceChildren();

    const close = document.createElement("button");
    close.type = "button";
    close.className = "atlas-panel-close";
    close.textContent = "選択を解除";
    close.addEventListener("click", () => render(null, null, "push"));
    contentPanel.append(close);

    const head = makeElement("div", "atlas-panel-head");
    head.append(makeElement("p", "eyebrow", "Selected place"));
    head.append(makeElement("h2", "", place.nameJa));
    head.append(makeElement("p", "atlas-panel-region", `${place.region} · ${field.cropLabels[place.cropId] || place.cropId}`));
    contentPanel.append(head);

    const summary = makeElement("p", "atlas-panel-summary", place.summary);
    contentPanel.append(summary);

    const placeInsights = (place.insightIds || []).map((id) => insights.get(id)).filter(Boolean);
    if (selectedInsight) contentPanel.append(insightCard(selectedInsight, true));
    for (const insight of placeInsights) {
      if (selectedInsight && insight.id === selectedInsight.id) continue;
      contentPanel.append(insightCard(insight, false));
    }
    if (!selectedInsight) {
      const note = makeElement("p", "atlas-panel-unavailable", "この場所の個別インサイトは準備中です。詳述ページで地域全体の条件を確認できます。");
      contentPanel.append(note);
    }
    const reportLink = makeElement("a", "button button--quiet atlas-panel-all-link", "北米農業の詳述を読む");
    reportLink.href = reportBase;
    contentPanel.append(reportLink);

    root.querySelectorAll("[data-place-id]").forEach((node) => {
      node.classList.toggle("is-selected", node.dataset.placeId === place.id);
      if (node.tagName.toLowerCase() === "path") node.setAttribute("aria-pressed", node.dataset.placeId === place.id ? "true" : "false");
    });
    const stateLabel = root.querySelector("[data-atlas-status]");
    if (stateLabel) stateLabel.textContent = `${place.nameJa}を選択中`;
    updateUrl(place.id, selectedInsightId, historyMode || "replace");
  }

  function clickPlace(placeId) {
    if (places.has(placeId)) render(placeId, null, "push");
  }

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-place-id], [data-insight-id]");
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    if (target.dataset.placeId) clickPlace(target.dataset.placeId);
    else {
      const insight = insights.get(target.dataset.insightId);
      if (insight && insight.placeIds[0]) render(insight.placeIds[0], insight.id, "push");
    }
  });

  root.addEventListener("keydown", (event) => {
    const target = event.target.closest("[data-place-id]");
    if (!target || !root.contains(target) || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    clickPlace(target.dataset.placeId);
  });

  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const placeId = params.get("place");
    const insightId = params.get("insight");
    render(placeId, insightId, "replace");
  });

  const params = new URLSearchParams(window.location.search);
  const requestedPlace = params.get("place");
  const requestedInsight = params.get("insight");
  const insightFromUrl = requestedInsight ? insights.get(requestedInsight) : null;
  const initialPlace = places.has(requestedPlace)
    ? requestedPlace
    : insightFromUrl && insightFromUrl.placeIds.find((id) => places.has(id));
  render(initialPlace || null, requestedInsight, "replace");
})();
