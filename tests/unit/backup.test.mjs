import assert from "node:assert/strict";
import test from "node:test";

import {
  createArchiveBundle,
  verifyArchiveBundle
} from "../../backup/archive.ts";
import {
  createRelationRestoreOperations,
  createRestorePlan,
  verifyRestoredRecords
} from "../../backup/restore.ts";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function input() {
  return {
    schemaVersion: 1,
    exportedAt: "2026-09-10T12:00:00Z",
    taxonomy: { topics: ["agriculture"] },
    collections: {
      notes: [{
        logicalId: "note-1",
        revision: 1,
        contentHash: HASH_A,
        properties: { title: "合成ノート" },
        bodyMarkdown: "合成本文",
        relations: [{ property: "theme", targetCollection: "themes", targetLogicalIds: ["theme-1"] }]
      }],
      themes: [{
        logicalId: "theme-1",
        revision: 1,
        contentHash: HASH_B,
        properties: { title: "合成テーマ" },
        bodyMarkdown: "合成テーマ本文"
      }],
      revisions: [],
      publications: []
    },
    assets: [{ path: "sample.txt", bytes: new TextEncoder().encode("asset"), logicalOwnerIds: ["note-1"] }]
  };
}

test("アーカイブを検証し、論理IDで二段階の復元計画を作る", () => {
  const bundle = createArchiveBundle(input());
  assert.equal(bundle.manifest.counts.notes, 1);
  assert.equal(bundle.manifest.counts.themes, 1);
  assert.equal(bundle.manifest.counts.assets, 1);
  assert.doesNotThrow(() => verifyArchiveBundle(bundle.files));

  const plan = createRestorePlan(bundle);
  const idMap = {
    "notes:note-1": "provider-note-new",
    "themes:theme-1": "provider-theme-new"
  };
  assert.deepEqual(createRelationRestoreOperations(plan, idMap), [{
    collection: "notes",
    logicalId: "note-1",
    providerId: "provider-note-new",
    property: "theme",
    targetProviderIds: ["provider-theme-new"]
  }]);
  assert.doesNotThrow(() => verifyRestoredRecords(plan, [
    { collection: "notes", logicalId: "note-1", revision: 1, contentHash: HASH_A },
    { collection: "themes", logicalId: "theme-1", revision: 1, contentHash: HASH_B }
  ]));
});

test("アーカイブ内の1 byte変更を拒否する", () => {
  const bundle = createArchiveBundle(input());
  const tampered = new Map(bundle.files);
  const recordPath = "notes/note-1.json";
  const bytes = new Uint8Array(tampered.get(recordPath));
  bytes[0] ^= 1;
  tampered.set(recordPath, bytes);
  assert.throws(() => verifyArchiveBundle(tampered), /ハッシュ/);
});

