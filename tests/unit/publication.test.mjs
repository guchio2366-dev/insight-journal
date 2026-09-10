import assert from "node:assert/strict";
import test from "node:test";

import { projectPublicPayload } from "../../src/lib/publication/project.ts";
import {
  assertPublicationAuthorization,
  reconcilePublication
} from "../../src/lib/publication/reconcile.ts";
import {
  calculatePayloadHash,
  publicContentPath,
  serializePublicMarkdown
} from "../../src/lib/publication/serialize.ts";
import { publicArticles } from "../fixtures/public-corpus.mjs";

function clone(value) {
  return structuredClone(value);
}

test("公開投影は許可された候補だけを新しい値として構築する", () => {
  const source = clone(publicArticles[0]);
  const projected = projectPublicPayload(source);
  assert.deepEqual(projected, source);
  assert.notEqual(projected, source);
  assert.notEqual(projected.sources, source.sources);

  assert.throws(
    () => projectPublicPayload({ ...source, rawConversation: "private text" }),
    /公開契約にない項目/
  );
});

test("公開ハッシュはキー順・改行・Unicode正規化に対して決定的", () => {
  const first = clone(publicArticles[0]);
  first.bodyMarkdown = "Cafe\u0301\r\n";
  const second = Object.fromEntries(Object.entries(clone(first)).reverse());
  second.bodyMarkdown = "Café\n";
  second.topics = [...second.topics].reverse();

  assert.equal(calculatePayloadHash(first), calculatePayloadHash(second));
  second.bodyMarkdown = "Café\n追記";
  assert.notEqual(calculatePayloadHash(first), calculatePayloadHash(second));
  assert.equal(publicContentPath(first), `src/content/articles/${first.slug}.md`);
  assert.match(serializePublicMarkdown(first), /^---\n\{/);
});

test("公開承認はPublicIDとPayloadHashを固定する", () => {
  const intended = { publicId: publicArticles[0].publicId, revision: 1, payloadHash: "a".repeat(64) };
  assert.doesNotThrow(() => assertPublicationAuthorization(intended, {
    publicId: intended.publicId,
    payloadHash: intended.payloadHash
  }));
  assert.throws(() => assertPublicationAuthorization(intended, {
    publicId: intended.publicId,
    payloadHash: "b".repeat(64)
  }), /公開指示後/);
});

test("公開再試行は二重commitを避け、私的記録だけを修復できる", () => {
  const intended = { publicId: publicArticles[0].publicId, revision: 2, payloadHash: "a".repeat(64) };
  const repository = { ...intended, commitSha: "1".repeat(40) };
  const release = { ...intended, commitSha: repository.commitSha };

  assert.deepEqual(reconcilePublication({ intended, repository: null, release: null, privateRecord: null }), {
    action: "commit",
    reason: "missing_from_repository"
  });
  assert.equal(
    reconcilePublication({ intended, repository, release: null, privateRecord: null }).action,
    "wait_for_deployment"
  );
  assert.deepEqual(reconcilePublication({ intended, repository, release, privateRecord: null }), {
    action: "repair_private_record",
    commitSha: repository.commitSha
  });
  assert.equal(reconcilePublication({
    intended,
    repository,
    release,
    privateRecord: { ...intended, commitSha: repository.commitSha, status: "published" }
  }).action, "none");
  assert.equal(reconcilePublication({
    intended,
    repository: { ...repository, payloadHash: "b".repeat(64) },
    release,
    privateRecord: null
  }).action, "conflict");
});

