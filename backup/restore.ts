import {
  ARCHIVE_COLLECTIONS,
  decodeArchiveRecord,
  verifyArchiveBundle,
  type ArchiveBundle,
  type ArchiveCollection,
  type ArchiveRecord
} from "./archive.ts";

export interface RestoreCreateOperation {
  collection: ArchiveCollection;
  logicalId: string;
  revision: number;
  contentHash: string;
  properties: Record<string, unknown>;
  bodyMarkdown: string;
}

export interface RestoreRelationOperation {
  collection: ArchiveCollection;
  logicalId: string;
  providerId: string;
  property: string;
  targetProviderIds: string[];
}

export interface RestorePlan {
  schemaVersion: 1;
  creates: RestoreCreateOperation[];
  records: Array<{ collection: ArchiveCollection; record: ArchiveRecord }>;
  taxonomy: unknown;
  assets: Array<{ path: string; bytes: Uint8Array; logicalOwnerIds: string[] }>;
}

export type ProviderIdMap = Record<string, string>;

export function restoreKey(collection: ArchiveCollection, logicalId: string): string {
  return `${collection}:${logicalId}`;
}

/** First restore phase: create every entity without provider-specific relations. */
export function createRestorePlan(bundle: ArchiveBundle): RestorePlan {
  const verified = verifyArchiveBundle(bundle.files);
  const records = verified.manifest.entities.map((descriptor) => ({
    collection: descriptor.collection,
    record: decodeArchiveRecord(verified.files, descriptor)
  }));
  const order = new Map(ARCHIVE_COLLECTIONS.map((name, index) => [name, index]));
  records.sort((left, right) => {
    const byCollection = Number(order.get(left.collection)) - Number(order.get(right.collection));
    return byCollection || left.record.logicalId.localeCompare(right.record.logicalId, "en");
  });
  const taxonomyBytes = verified.files.get("taxonomy/taxonomy.json");
  if (!taxonomyBytes) throw new Error("taxonomy/taxonomy.jsonがありません");
  const taxonomy = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(taxonomyBytes));
  const assets = verified.manifest.assets.map((asset) => {
    const bytes = verified.files.get(asset.path);
    if (!bytes) throw new Error(`素材ファイルがありません: ${asset.path}`);
    return { path: asset.path, bytes: new Uint8Array(bytes), logicalOwnerIds: [...asset.logicalOwnerIds] };
  });
  return {
    schemaVersion: 1,
    creates: records.map(({ collection, record }) => ({
      collection,
      logicalId: record.logicalId,
      revision: record.revision,
      contentHash: record.contentHash,
      properties: record.properties,
      bodyMarkdown: record.bodyMarkdown
    })),
    records,
    taxonomy,
    assets
  };
}

/**
 * Second restore phase: after connector calls return new page IDs, translate all
 * logical relations. Old provider IDs are never reused.
 */
export function createRelationRestoreOperations(plan: RestorePlan, idMap: ProviderIdMap): RestoreRelationOperation[] {
  const expectedKeys = new Set(plan.creates.map((entry) => restoreKey(entry.collection, entry.logicalId)));
  for (const key of expectedKeys) {
    if (typeof idMap[key] !== "string" || !idMap[key]) throw new Error(`新しいprovider IDがありません: ${key}`);
  }
  const operations: RestoreRelationOperation[] = [];
  for (const { collection, record } of plan.records) {
    const providerId = idMap[restoreKey(collection, record.logicalId)];
    for (const relation of record.relations ?? []) {
      const targetProviderIds = relation.targetLogicalIds.map((logicalId) => {
        const targetKey = restoreKey(relation.targetCollection, logicalId);
        if (!expectedKeys.has(targetKey)) throw new Error(`relationの対象がアーカイブにありません: ${targetKey}`);
        const translated = idMap[targetKey];
        if (!translated) throw new Error(`relation対象の新しいprovider IDがありません: ${targetKey}`);
        return translated;
      });
      operations.push({ collection, logicalId: record.logicalId, providerId, property: relation.property, targetProviderIds });
    }
  }
  return operations;
}

export function verifyRestoredRecords(
  plan: RestorePlan,
  observed: Array<{ collection: ArchiveCollection; logicalId: string; revision: number; contentHash: string }>
): void {
  const expected = new Map(plan.creates.map((entry) => [restoreKey(entry.collection, entry.logicalId), entry]));
  if (observed.length !== expected.size) throw new Error(`復元件数が一致しません: expected=${expected.size}, actual=${observed.length}`);
  const seen = new Set<string>();
  for (const item of observed) {
    const key = restoreKey(item.collection, item.logicalId);
    if (seen.has(key)) throw new Error(`復元データが重複しています: ${key}`);
    seen.add(key);
    const source = expected.get(key);
    if (!source) throw new Error(`予期しない復元データです: ${key}`);
    if (source.revision !== item.revision || source.contentHash !== item.contentHash) throw new Error(`復元内容が一致しません: ${key}`);
  }
  for (const key of expected.keys()) if (!seen.has(key)) throw new Error(`復元データがありません: ${key}`);
}
