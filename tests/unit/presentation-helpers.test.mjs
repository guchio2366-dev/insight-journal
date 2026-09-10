import assert from "node:assert/strict";
import test from "node:test";

import { selectRelatedArticles } from "../../src/components/related.ts";
import { historicalSortKey, sortTimelineEvents } from "../../src/components/timeline.ts";
import {
  compareDatedPublicIds,
  comparePublicDatesDescending
} from "../../src/lib/dates.ts";
import { normalizeSitePath, withBase } from "../../src/lib/urls.ts";

function article(publicId, overrides = {}) {
  return {
    data: {
      publicId,
      relatedPublicIds: [],
      themeIds: [],
      topics: [],
      countries: [],
      publishedAt: "2026-01-01",
      ...overrides
    }
  };
}

test("関連記事は明示関係を指定順で優先し、共通テーマ、分野と国の一致で補う", () => {
  const current = article("current", {
    relatedPublicIds: ["explicit-b", "missing", "explicit-a", "explicit-b"],
    themeIds: ["theme-1"],
    topics: ["agriculture"],
    countries: ["india"]
  });
  const candidates = [
    article("explicit-a"),
    article("explicit-b"),
    article("same-theme-old", { themeIds: ["theme-1"], publishedAt: "2025-01-01" }),
    article("same-theme-new", { themeIds: ["theme-1"], publishedAt: "2026-02-01" }),
    article("topic-country", { topics: ["agriculture"], countries: ["india"] }),
    article("topic-only", { topics: ["agriculture"], countries: ["japan"] }),
    current
  ];

  assert.deepEqual(
    selectRelatedArticles(current, candidates, 5).map(({ data }) => data.publicId),
    ["explicit-b", "explicit-a", "same-theme-new", "same-theme-old", "topic-country"]
  );
});

test("関連記事の上限0件を守る", () => {
  const current = article("current", { relatedPublicIds: ["explicit"] });
  assert.deepEqual(selectRelatedArticles(current, [article("explicit")], 0), []);
});

test("公開日の共通比較は小数秒を保ち、同じ瞬間は公開ID順にする", () => {
  assert.equal(
    comparePublicDatesDescending("2026-09-10T12:00:00.500Z", "2026-09-10T12:00:00Z"),
    -1
  );
  assert.equal(
    comparePublicDatesDescending("2026-09-10T12:00:00Z", "2026-09-10T12:00:00.000Z"),
    0
  );
  assert.equal(comparePublicDatesDescending("2026-09-10", "2026-09-10T00:00:00Z"), 0);
  assert.equal(
    compareDatedPublicIds(
      "2026-09-10T12:00:00Z",
      "a-20000000-0000-4000-8000-000000000002",
      "2026-09-10T12:00:00.000Z",
      "a-10000000-0000-4000-8000-000000000001"
    ),
    1
  );
  assert.throws(() => comparePublicDatesDescending("not-a-date", "2026-09-10"), TypeError);
});

test("関連記事の同一優先度は小数秒、公開IDの順で安定する", () => {
  const current = article("current", { themeIds: ["theme-1"] });
  const candidates = [
    article("a-later", { themeIds: ["theme-1"], publishedAt: "2026-09-10T12:00:00.500Z" }),
    article("a-z", { themeIds: ["theme-1"], publishedAt: "2026-09-10T12:00:00Z" }),
    article("a-a", { themeIds: ["theme-1"], publishedAt: "2026-09-10T12:00:00.000Z" })
  ];

  assert.deepEqual(
    selectRelatedArticles(current, candidates).map(({ data }) => data.publicId),
    ["a-later", "a-a", "a-z"]
  );
});

test("年表は紀元前から昇順、同じ開始日は終了日順、不明時期は末尾で安定する", () => {
  const events = [
    { id: "unknown-a", start: null, end: null },
    { id: "modern", start: { year: 2020 }, end: null },
    { id: "bce-later", start: { year: -200 }, end: null },
    { id: "bce-earlier", start: { year: -500 }, end: null },
    { id: "range-open", start: { year: 1900 }, end: null },
    { id: "range-closed", start: { year: 1900 }, end: { year: 1910 } },
    { id: "unknown-b", start: null, end: null }
  ];

  assert.deepEqual(historicalSortKey({ year: -500 }), [0, -500, 1, 1]);
  assert.deepEqual(historicalSortKey(null), [1, 0, 0, 0]);
  assert.deepEqual(
    sortTimelineEvents(events).map(({ id }) => id),
    ["bce-earlier", "bce-later", "range-closed", "range-open", "modern", "unknown-a", "unknown-b"]
  );
});

test("GitHub Pages配下の内部URLを一度だけ付与し、危険なURLを拒否する", () => {
  assert.equal(withBase("/articles/sample/"), "/insight-journal/articles/sample/");
  assert.equal(withBase("/insight-journal/articles/sample/"), "/insight-journal/articles/sample/");
  assert.equal(withBase("#sources"), "#sources");
  assert.equal(withBase("https://example.com/source?q=1"), "https://example.com/source?q=1");
  assert.equal(normalizeSitePath("https://example.com/insight-journal/articles/sample/?q=1"), "/articles/sample/");

  for (const unsafe of [
    "http://example.com",
    "https://user:secret@example.com",
    "//example.com/path",
    "/articles/../private",
    "/articles/%2e%2e/private",
    "/articles/%2fprivate"
  ]) {
    assert.throws(() => withBase(unsafe), TypeError, unsafe);
  }
});
