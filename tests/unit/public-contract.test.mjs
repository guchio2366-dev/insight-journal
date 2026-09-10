import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPublicPayload,
  validatePublicPayload
} from "../../src/lib/contracts/public.ts";
import { projectPublicPayload } from "../../src/lib/publication/project.ts";
import {
  publicArticles,
  publicCorpus,
  publicThemes
} from "../fixtures/public-corpus.mjs";

function createRuntimeSyntheticBoundaryInputs() {
  const syntheticPublicCandidate = structuredClone(publicArticles[0]);
  const syntheticPrivateSentinel = ["PRIVATE", "SENTINEL"].join("_");
  const syntheticNotionHost = ["app", "notion", "com"].join(".");

  return {
    syntheticPublicCandidate,
    syntheticRawConversation: `${syntheticPrivateSentinel} 合成された非公開会話の例です。`,
    syntheticNotionUrl: `https://${syntheticNotionHost}/p/example-private-record`
  };
}

test("公開コーパスは12記事・3テーマの基準件数を満たす", () => {
  assert.equal(publicArticles.length, 12);
  assert.equal(publicThemes.length, 3);
  assert.equal(publicCorpus.length, 15);
});

test("すべての合成公開データが公開契約を満たす", () => {
  for (const entry of publicCorpus) {
    assert.deepEqual(
      validatePublicPayload(entry),
      [],
      `${entry.publicId} (${entry.slug}) should be valid`
    );
  }
});

test("分類の組合せ、紀元前、期間、時期不明を基準データに含む", () => {
  assert.ok(publicArticles.some(({ topics }) => topics.includes("conflict") && topics.includes("religion")));
  assert.ok(publicArticles.some(({ topics }) => topics.includes("agriculture")));
  assert.ok(publicArticles.some(({ timeline }) => timeline.some(({ start }) => start?.year < 0)));
  assert.ok(publicArticles.some(({ timeline }) => timeline.some(({ precision, start }) => precision === "unknown" && start === null)));
  assert.ok(publicArticles.some(({ timeline }) => timeline.some(({ precision, end }) => precision === "range" && end !== null)));
});

test("同名記事は許容し、公開IDとslugは全件で一意", () => {
  const duplicateTitle = publicArticles.filter(({ title }) => title === "同じ見出しでも別の記事");
  assert.equal(duplicateTitle.length, 2);
  assert.notEqual(duplicateTitle[0].publicId, duplicateTitle[1].publicId);
  assert.notEqual(duplicateTitle[0].slug, duplicateTitle[1].slug);

  assert.equal(new Set(publicCorpus.map(({ publicId }) => publicId)).size, publicCorpus.length);
  assert.equal(new Set(publicCorpus.map(({ slug }) => slug)).size, publicCorpus.length);
});

test("実行時に合成した境界入力から公開候補だけを投影する", () => {
  const { syntheticPublicCandidate } = createRuntimeSyntheticBoundaryInputs();
  const projected = projectPublicPayload(syntheticPublicCandidate);

  assert.deepEqual(projected, syntheticPublicCandidate);
  assert.notEqual(projected, syntheticPublicCandidate);
  assert.doesNotThrow(() => assertPublicPayload(projected));
});

test("実行時合成のrawConversation未知フィールドと非公開sentinelを拒否する", () => {
  const {
    syntheticPublicCandidate,
    syntheticRawConversation
  } = createRuntimeSyntheticBoundaryInputs();

  const leakedField = {
    ...syntheticPublicCandidate,
    rawConversation: syntheticRawConversation
  };
  const leakedBody = {
    ...syntheticPublicCandidate,
    bodyMarkdown: syntheticRawConversation
  };

  assert.ok(validatePublicPayload(leakedField).some(({ message }) => message.includes("公開契約にない")));
  assert.ok(validatePublicPayload(leakedField).some(({ message }) => message.includes("非公開情報")));
  assert.ok(validatePublicPayload(leakedBody).some(({ message }) => message.includes("非公開情報")));
});

test("実行時合成のNotion URL、生HTML、存在しない出典参照を拒否する", () => {
  const {
    syntheticPublicCandidate,
    syntheticNotionUrl
  } = createRuntimeSyntheticBoundaryInputs();

  const notionLeak = {
    ...syntheticPublicCandidate,
    bodyMarkdown: syntheticNotionUrl
  };
  const rawHtml = {
    ...syntheticPublicCandidate,
    bodyMarkdown: "<iframe src=\"https://example.com\"></iframe>"
  };
  const missingSource = {
    ...syntheticPublicCandidate,
    bodyMarkdown: "[出典](#source-s999)"
  };

  assert.ok(validatePublicPayload(notionLeak).length > 0);
  assert.ok(validatePublicPayload(rawHtml).length > 0);
  assert.ok(validatePublicPayload(missingSource).some(({ message }) => message.includes("存在しない出典参照")));
});
