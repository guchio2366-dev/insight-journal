import assert from "node:assert/strict";
import test from "node:test";

import {
  matchesSearchFilters,
  normalizeSearchUrl,
  parseSearchState,
  serializeSearchState,
  sortSearchEntries
} from "../../src/lib/search/state.ts";

const allowed = {
  topic: new Set(["agriculture", "conflict", "religion"]),
  country: new Set(["india", "japan"]),
  region: new Set(["south-asia", "east-asia"]),
  theme: new Set(["food-security", "geopolitics"]),
  kind: new Set(["article", "theme"])
};

function entry(overrides = {}) {
  return {
    publicId: "a-00000000-0000-4000-8000-000000000001",
    url: "/articles/sample/",
    title: "サンプル",
    summary: "要約",
    publishedAt: "2026-08-01",
    updatedAt: "2026-08-02",
    topics: ["agriculture"],
    countries: ["india"],
    regions: ["south-asia"],
    themeIds: ["food-security"],
    kind: "article",
    ...overrides
  };
}

test("検索URLを許可値・件数・文字数の境界で正規化する", () => {
  const longQuery = "あ".repeat(205);
  const result = parseSearchState(
    new URLSearchParams([
      ["q", longQuery],
      ["topic", "agriculture"],
      ["topic", "agriculture"],
      ["topic", "conflict"],
      ["topic", "religion"],
      ["topic", "unknown"],
      ["kind", "article"],
      ["kind", "invalid"],
      ["topicMode", "all"],
      ["sort", "updated"],
      ["page", "3"]
    ]),
    allowed,
    2
  );

  assert.equal(result.state.q.length, 200);
  assert.deepEqual(result.state.topic, ["agriculture", "conflict"]);
  assert.deepEqual(result.state.kind, ["article"]);
  assert.equal(result.state.topicMode, "all");
  assert.equal(result.state.sort, "updated");
  assert.equal(result.state.page, 3);
  assert.ok(result.notices.some((notice) => notice.includes("200文字")));
  assert.ok(result.notices.some((notice) => notice.includes("topicの未登録値1件")));
  assert.ok(result.notices.some((notice) => notice.includes("topicは先頭2件")));
  assert.ok(result.notices.some((notice) => notice.includes("kindの未登録値1件")));
});

test("不正な単一値を安全な初期値へ戻し、検索状態を決定的に直列化する", () => {
  const invalid = parseSearchState("?topicMode=none&sort=random&page=-2", allowed);
  assert.equal(invalid.state.topicMode, "any");
  assert.equal(invalid.state.sort, "relevance");
  assert.equal(invalid.state.page, 1);
  assert.equal(invalid.notices.length, 3);

  const query = serializeSearchState({
    q: "農業 政策",
    topic: ["religion", "agriculture", "religion"],
    country: ["japan", "india"],
    region: [],
    theme: ["food-security"],
    kind: ["theme", "article"],
    topicMode: "all",
    sort: "latest",
    page: 2
  });
  assert.equal(
    query,
    "q=%E8%BE%B2%E6%A5%AD+%E6%94%BF%E7%AD%96&topic=agriculture&topic=religion&country=india&country=japan&theme=food-security&kind=article&kind=theme&topicMode=all&sort=latest&page=2"
  );

  const roundTrip = parseSearchState(query, allowed).state;
  assert.deepEqual(roundTrip.topic, ["agriculture", "religion"]);
  assert.deepEqual(roundTrip.country, ["india", "japan"]);
  assert.deepEqual(roundTrip.kind, ["article", "theme"]);
});

test("同一分類はOR、分類間はANDで絞り、分野のみallを選べる", () => {
  const candidate = entry({ topics: ["agriculture", "religion"] });
  const state = {
    q: "",
    topic: ["conflict", "agriculture"],
    country: ["japan", "india"],
    region: ["south-asia"],
    theme: ["food-security"],
    kind: ["article"],
    topicMode: "any",
    sort: "relevance",
    page: 1
  };

  assert.equal(matchesSearchFilters(candidate, state), true);
  assert.equal(matchesSearchFilters(candidate, { ...state, region: ["east-asia"] }), false);
  assert.equal(matchesSearchFilters(candidate, { ...state, topicMode: "all" }), false);
  assert.equal(
    matchesSearchFilters(candidate, { ...state, topic: ["agriculture", "religion"], topicMode: "all" }),
    true
  );
});

test("検索結果URLを統一し、関連度順位の後は公開日と公開IDで安定化する", () => {
  assert.equal(normalizeSearchUrl("https://example.com/articles/a/index.html?x=1"), "/articles/a");
  assert.equal(normalizeSearchUrl("/themes/t/#section"), "/themes/t");
  assert.equal(normalizeSearchUrl("/"), "/");

  const older = entry({ publicId: "a-1", url: "/articles/older/", publishedAt: "2025-01-01" });
  const newer = entry({ publicId: "a-2", url: "/articles/newer/", publishedAt: "2026-01-01" });
  const ranked = sortSearchEntries(
    [older, newer],
    "relevance",
    new Map([["/articles/older", 0], ["/articles/newer", 1]])
  );
  assert.deepEqual(ranked.map(({ publicId }) => publicId), ["a-1", "a-2"]);
  assert.deepEqual(sortSearchEntries([older, newer], "latest").map(({ publicId }) => publicId), ["a-2", "a-1"]);
});

test("公開日時は時刻として比較し、同時刻は公開IDで決定的に並べる", () => {
  const onTheSecond = entry({
    publicId: "a-20000000-0000-4000-8000-000000000002",
    url: "/articles/on-the-second/",
    publishedAt: "2026-09-10T12:00:00Z"
  });
  const halfSecondLater = entry({
    publicId: "a-30000000-0000-4000-8000-000000000003",
    url: "/articles/half-second-later/",
    publishedAt: "2026-09-10T12:00:00.500Z"
  });
  const sameInstantLowerId = entry({
    publicId: "a-10000000-0000-4000-8000-000000000001",
    url: "/articles/same-instant-lower-id/",
    publishedAt: "2026-09-10T12:00:00.000Z"
  });

  assert.deepEqual(
    sortSearchEntries([onTheSecond, halfSecondLater, sameInstantLowerId], "latest")
      .map(({ publicId }) => publicId),
    [
      "a-30000000-0000-4000-8000-000000000003",
      "a-10000000-0000-4000-8000-000000000001",
      "a-20000000-0000-4000-8000-000000000002"
    ]
  );
});
