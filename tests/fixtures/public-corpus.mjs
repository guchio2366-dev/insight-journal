const articleThemeId = "t-10000001-0000-4000-8000-000000000001";

function source(id = "s1") {
  return {
    id,
    title: "表示検証用の架空資料",
    publisher: "Insight Journal テスト資料",
    url: `https://example.com/fixtures/${id}`,
    publishedOn: "2026-08-01",
    accessedOn: "2026-09-10",
    locator: null,
    verification: "unconfirmed"
  };
}

function article(number, overrides = {}) {
  const serial = String(number).padStart(8, "0");
  const base = {
    schemaVersion: 1,
    kind: "article",
    publicId: `a-${serial}-0000-4000-8000-${String(number).padStart(12, "0")}`,
    slug: `fixture-article-${String(number).padStart(2, "0")}`,
    title: `表示検証用の記事 ${number}`,
    summary: "検索、分類、年表、関連表示を検証するための架空の記事です。実在の出来事を説明するものではありません。",
    topics: ["politics"],
    countries: ["JP"],
    regions: ["asia"],
    themeIds: [articleThemeId],
    publishedAt: "2026-09-01",
    updatedAt: "2026-09-01",
    revision: 1,
    bodyMarkdown: "## 検証用本文\n\nこの本文は表示検証だけに使う架空の文章です。[出典](#source-s1)",
    sources: [source()],
    geography: { mode: "none", reason: "この検証項目では地図を使用しません。" },
    timeline: [
      {
        id: `event-${number}`,
        dateLabel: "2026年",
        start: { year: 2026 },
        end: null,
        precision: "year",
        title: "検証時点",
        description: "画面表示を検証するための架空の出来事です。",
        sourceIds: ["s1"]
      }
    ],
    timelineOmissionReason: null,
    relatedPublicIds: [],
    changeNote: null
  };
  return { ...base, ...overrides };
}

function theme(number, overrides = {}) {
  const serial = String(10_000_000 + number);
  const base = {
    schemaVersion: 1,
    kind: "theme",
    publicId: `t-${serial}-0000-4000-8000-${String(number).padStart(12, "0")}`,
    slug: `fixture-theme-${String(number).padStart(2, "0")}`,
    title: `表示検証用のテーマ ${number}`,
    summary: "複数の記事を束ねるテーマページの表示を検証する架空データです。",
    topics: ["politics"],
    countries: [],
    regions: ["world"],
    themeIds: [],
    publishedAt: "2026-09-01",
    updatedAt: "2026-09-01",
    revision: 1,
    bodyMarkdown: "## 現在の理解\n\nテーマページの構成を確認するための架空の本文です。",
    sources: [],
    geography: { mode: "none", reason: "テーマ全体に単一の場所を設定しません。" },
    timeline: [],
    timelineOmissionReason: "この表示検証用テーマには年表を設定していません。",
    relatedPublicIds: [],
    changeNote: null
  };
  return { ...base, ...overrides };
}

export const publicArticles = [
  article(1, {
    title: "紛争と宗教を読むための表示例",
    topics: ["conflict", "religion"],
    countries: ["IL", "PS"],
    regions: ["middle_east"]
  }),
  article(2, {
    title: "農業を読むための表示例",
    topics: ["agriculture", "economy"],
    countries: ["IN"],
    regions: ["asia"]
  }),
  article(3, {
    title: "紀元前を含む年表の表示例",
    topics: ["religion", "society"],
    countries: [],
    regions: ["world"],
    timeline: [
      {
        id: "event-bce",
        dateLabel: "紀元前500年ごろ",
        start: { year: -500 },
        end: null,
        precision: "approximate",
        title: "紀元前の検証点",
        description: "負の年を正しい順番で扱えるかを確認する架空の出来事です。",
        sourceIds: ["s1"]
      },
      {
        id: "event-ce",
        dateLabel: "2026年",
        start: { year: 2026 },
        end: null,
        precision: "year",
        title: "現在側の検証点",
        description: "紀元前の項目より後に表示されることを確認します。",
        sourceIds: ["s1"]
      }
    ]
  }),
  article(4, {
    title: "時期不明の出来事を含む表示例",
    topics: ["society"],
    timeline: [
      {
        id: "event-unknown",
        dateLabel: "時期不明",
        start: null,
        end: null,
        precision: "unknown",
        title: "時期不明の検証点",
        description: "日付を推測せず、時期不明と表示するための項目です。",
        sourceIds: ["s1"]
      }
    ]
  }),
  article(5, {
    title: "期間を含む年表の表示例",
    topics: ["economy"],
    timeline: [
      {
        id: "event-range",
        dateLabel: "2020〜2022年",
        start: { year: 2020 },
        end: { year: 2022 },
        precision: "range",
        title: "期間の検証点",
        description: "開始年と終了年がある項目を表示するための架空の出来事です。",
        sourceIds: ["s1"]
      }
    ]
  }),
  article(6, { topics: ["finance"], countries: ["US"], regions: ["north_america"] }),
  article(7, { topics: ["energy", "environment"], countries: ["DE"], regions: ["europe"] }),
  article(8, { topics: ["industry", "technology"], countries: ["CN"], regions: ["asia"] }),
  article(9, { topics: ["security"], countries: ["UA", "RU"], regions: ["europe"] }),
  article(10, { topics: ["society", "economy"], countries: ["GB"], regions: ["europe"] }),
  article(11, {
    title: "同じ見出しでも別の記事",
    slug: "duplicate-title-one"
  }),
  article(12, {
    title: "同じ見出しでも別の記事",
    slug: "duplicate-title-two"
  })
];

export const publicThemes = [
  theme(1, {
    publicId: articleThemeId,
    title: "食料と農業の表示例",
    slug: "food-and-agriculture-fixture",
    topics: ["agriculture", "economy"],
    countries: ["IN"],
    regions: ["asia"]
  }),
  theme(2, {
    title: "紛争と宗教の表示例",
    slug: "conflict-and-religion-fixture",
    topics: ["conflict", "religion"],
    regions: ["middle_east"]
  }),
  theme(3, {
    title: "技術と産業の表示例",
    slug: "technology-and-industry-fixture",
    topics: ["technology", "industry"],
    regions: ["world"]
  })
];

export const publicCorpus = [...publicArticles, ...publicThemes];

