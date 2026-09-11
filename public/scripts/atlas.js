(function () {
  "use strict";

  const root = document.querySelector("[data-atlas-root]");
  if (!root) return;

  const payloadElement = root.querySelector("[data-atlas-payload]");
  const emptyPanel = root.querySelector("[data-atlas-empty]");
  const contentPanel = root.querySelector("[data-atlas-content]");
  const svg = root.querySelector("[data-atlas-svg]");
  if (!payloadElement || !emptyPanel || !contentPanel || !svg) return;

  let payload;
  try {
    payload = JSON.parse(payloadElement.textContent || "{}");
  } catch (error) {
    console.error("Atlasデータを読み込めませんでした", error);
    return;
  }

  const zones = new Map((Array.isArray(payload.zones) ? payload.zones : []).map((zone) => [zone.id, zone]));
  const insights = new Map((Array.isArray(payload.insights) ? payload.insights : []).map((insight) => [insight.id, insight]));
  const places = new Map((Array.isArray(payload.places) ? payload.places : []).map((place) => [place.id, place]));
  const field = payload.field || { cropLabels: {}, cropOrder: [] };
  const reportBase = root.dataset.reportBase || "";
  let selectedZoneId = null;
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

  function cropLabel(cropId) {
    return field.cropLabels && field.cropLabels[cropId] ? field.cropLabels[cropId] : cropId;
  }

  function insightForZone(zone, requestedId) {
    const ids = Array.isArray(zone.insightIds) ? zone.insightIds : [];
    const requested = requestedId && insights.get(requestedId);
    if (requested && requested.zoneIds && requested.zoneIds.includes(zone.id)) return requested;
    const candidates = ids.map((id) => insights.get(id)).filter(Boolean);
    return candidates.find((insight) => insight.priority === "primary") || candidates[0] || null;
  }

  function updateUrl(zoneId, insightId, mode) {
    const url = new URL(window.location.href);
    if (zoneId) url.searchParams.set("zone", zoneId);
    else url.searchParams.delete("zone");
    if (insightId) url.searchParams.set("insight", insightId);
    else url.searchParams.delete("insight");
    url.searchParams.delete("place");
    const target = `${url.pathname}${url.search}${url.hash}`;
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", target);
  }

  function sourceLinks(insight) {
    const list = makeElement("ul", "atlas-panel-sources");
    list.setAttribute("aria-label", "この説明の出典");
    for (const sourceId of insight.sourceIds || []) {
      const item = makeElement("li");
      const link = makeElement("a", "", "出典を確認");
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
    article.append(makeElement("p", "atlas-insight-kicker", "選択地域のインサイト"));
    article.append(makeElement("h3", "", insight.title));
    article.append(makeElement("p", "atlas-insight-text", insight.shortText));
    const link = makeElement("a", "atlas-panel-report-link", "詳述の該当節を読む →");
    link.href = `${reportBase}#${insight.reportSectionId}`;
    article.append(link, sourceLinks(insight));
    return article;
  }

  function relatedStateNames(zone) {
    return (zone.relatedStateIds || [])
      .map((id) => places.get(id))
      .filter(Boolean)
      .map((place) => place.nameJa)
      .join("・");
  }

  function render(zoneId, requestedInsightId, historyMode) {
    const zone = zones.get(zoneId);
    if (!zone) {
      selectedZoneId = null;
      selectedInsightId = null;
      emptyPanel.hidden = false;
      contentPanel.hidden = true;
      contentPanel.replaceChildren();
      root.querySelectorAll("[data-zone-id].is-selected").forEach((node) => node.classList.remove("is-selected"));
      root.querySelectorAll("[data-zone-id]").forEach((node) => {
        if (node.tagName.toLowerCase() === "path" || node.tagName.toLowerCase() === "button") node.setAttribute("aria-pressed", "false");
      });
      const stateLabel = root.querySelector("[data-atlas-status]");
      if (stateLabel) stateLabel.textContent = "地域を選択していません";
      updateUrl(null, null, historyMode || "replace");
      return;
    }

    const selectedInsight = insightForZone(zone, requestedInsightId);
    selectedZoneId = zone.id;
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
    head.append(makeElement("p", "eyebrow", "Selected regional zone"));
    head.append(makeElement("h2", "", zone.nameJa));
    head.append(makeElement("p", "atlas-panel-region", (zone.cropIds || []).map(cropLabel).join("・")));
    contentPanel.append(head);

    contentPanel.append(makeElement("p", "atlas-panel-summary", zone.summary));

    const relatedStates = relatedStateNames(zone);
    if (relatedStates) {
      const reference = makeElement("p", "atlas-panel-reference", `重なる州（位置確認用）：${relatedStates}`);
      contentPanel.append(reference);
    }

    const zoneInsights = (zone.insightIds || []).map((id) => insights.get(id)).filter(Boolean);
    if (selectedInsight) contentPanel.append(insightCard(selectedInsight, true));
    for (const insight of zoneInsights) {
      if (selectedInsight && insight.id === selectedInsight.id) continue;
      contentPanel.append(insightCard(insight, false));
    }
    if (!selectedInsight) {
      contentPanel.append(makeElement("p", "atlas-panel-unavailable", "この地域の個別インサイトは準備中です。詳述ページで地域全体の条件を確認できます。"));
    }
    const reportLink = makeElement("a", "button button--quiet atlas-panel-all-link", "北米農業の詳述を読む");
    reportLink.href = reportBase;
    contentPanel.append(reportLink);

    root.querySelectorAll("[data-zone-id]").forEach((node) => {
      const selected = node.dataset.zoneId === zone.id;
      node.classList.toggle("is-selected", selected);
      if (node.tagName.toLowerCase() === "path" || node.tagName.toLowerCase() === "button") node.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const stateLabel = root.querySelector("[data-atlas-status]");
    if (stateLabel) stateLabel.textContent = `${zone.nameJa}を選択中`;
    updateUrl(zone.id, selectedInsightId, historyMode || "replace");
  }

  function clickZone(zoneId) {
    if (zones.has(zoneId)) render(zoneId, null, "push");
  }

  root.addEventListener("click", (event) => {
    const target = event.target.closest("[data-zone-id], [data-insight-id]");
    if (!target || !root.contains(target)) return;
    event.preventDefault();
    if (target.dataset.zoneId) clickZone(target.dataset.zoneId);
    else {
      const insight = insights.get(target.dataset.insightId);
      const firstZone = insight && Array.isArray(insight.zoneIds) ? insight.zoneIds.find((id) => zones.has(id)) : null;
      if (firstZone) render(firstZone, insight.id, "push");
    }
  });

  root.addEventListener("keydown", (event) => {
    const target = event.target.closest("[data-zone-id]");
    if (!target || !root.contains(target) || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    clickZone(target.dataset.zoneId);
  });

  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const zoneId = params.get("zone");
    const insightId = params.get("insight");
    render(zoneId, insightId, "replace");
  });

  const params = new URLSearchParams(window.location.search);
  const requestedZone = params.get("zone");
  const requestedInsight = params.get("insight");
  const insightFromUrl = requestedInsight ? insights.get(requestedInsight) : null;
  const legacyPlace = params.get("place");
  const place = legacyPlace ? places.get(legacyPlace) : null;
  const legacyZone = place && Array.isArray(place.zoneIds) ? place.zoneIds.find((id) => zones.has(id)) : null;
  const initialZone = zones.has(requestedZone)
    ? requestedZone
    : insightFromUrl && insightFromUrl.zoneIds.find((id) => zones.has(id))
      ? insightFromUrl.zoneIds.find((id) => zones.has(id))
      : legacyZone;
  render(initialZone || null, requestedInsight, "replace");
})();
