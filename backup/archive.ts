import { canonicalJson, canonicalize, sha256Bytes } from "../src/lib/publication/serialize.ts";

export const ARCHIVE_COLLECTIONS = ["notes", "themes", "revisions", "publications"] as const;
export type ArchiveCollection = (typeof ARCHIVE_COLLECTIONS)[number];

export interface ArchiveRelation {
  property: string;
  targetCollection: ArchiveCollection;
  targetLogicalIds: string[];
}

export interface ArchiveRecord {
  logicalId: string;
  revision: number;
  contentHash: string;
  providerId?: string | null;
  properties: Record<string, unknown>;
  bodyMarkdown: string;
  relations?: ArchiveRelation[];
}

export interface ArchiveAsset {
  path: string;
  bytes: Uint8Array;
  logicalOwnerIds?: string[];
}

export interface ArchiveInput {
  schemaVersion?: 1;
  exportedAt: string;
  collections: Record<ArchiveCollection, ArchiveRecord[]>;
  taxonomy: unknown;
  assets?: ArchiveAsset[];
}

export interface ArchiveFileDescriptor {
  path: string;
  bytes: number;
  sha256: string;
}

export interface ArchiveAssetDescriptor {
  path: string;
  logicalOwnerIds: string[];
}

export interface ArchiveEntityDescriptor {
  collection: ArchiveCollection;
  logicalId: string;
  revision: number;
  contentHash: string;
  file: string;
}

export interface ArchiveManifest {
  schemaVersion: 1;
  exportedAt: string;
  counts: Record<ArchiveCollection | "assets", number>;
  entities: ArchiveEntityDescriptor[];
  assets: ArchiveAssetDescriptor[];
  files: ArchiveFileDescriptor[];
}

export interface ArchiveBundle {
  manifest: ArchiveManifest;
  /** Paths use POSIX separators; values are the bytes to put into a ZIP. */
  files: ReadonlyMap<string, Uint8Array>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function validLogicalId(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && value !== "." && value !== "..";
}

function validArchivePath(value: string): boolean {
  return value.length > 0
    && value.length <= 240
    && !value.startsWith("/")
    && !value.includes("\\")
    && !value.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}

function assertIsoDate(value: string): void {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new Error("exportedAtはISO日時である必要があります");
}

function addFile(files: Map<string, Uint8Array>, filename: string, bytes: Uint8Array): void {
  if (!validArchivePath(filename)) throw new Error(`不正なアーカイブパスです: ${filename}`);
  if (files.has(filename)) throw new Error(`アーカイブパスが重複しています: ${filename}`);
  files.set(filename, new Uint8Array(bytes));
}

function normalizeRecord(record: ArchiveRecord): ArchiveRecord {
  if (!validLogicalId(record.logicalId)) throw new Error(`不正な論理IDです: ${record.logicalId}`);
  if (!Number.isInteger(record.revision) || record.revision < 1) throw new Error(`${record.logicalId}: revisionは1以上の整数が必要です`);
  if (!/^[0-9a-f]{64}$/i.test(record.contentHash)) throw new Error(`${record.logicalId}: contentHashはSHA256が必要です`);
  if (typeof record.bodyMarkdown !== "string") throw new Error(`${record.logicalId}: bodyMarkdownは文字列が必要です`);
  if (!record.properties || typeof record.properties !== "object" || Array.isArray(record.properties)) throw new Error(`${record.logicalId}: propertiesはオブジェクトが必要です`);
  const relations = (record.relations ?? []).map((relation) => {
    if (!relation || typeof relation.property !== "string" || !relation.property) throw new Error(`${record.logicalId}: relation.propertyが必要です`);
    if (!ARCHIVE_COLLECTIONS.includes(relation.targetCollection)) throw new Error(`${record.logicalId}: relationの対象コレクションが不正です`);
    const targetLogicalIds = [...new Set(relation.targetLogicalIds)];
    targetLogicalIds.forEach((id) => { if (!validLogicalId(id)) throw new Error(`${record.logicalId}: relationの論理IDが不正です`); });
    return { property: relation.property, targetCollection: relation.targetCollection, targetLogicalIds };
  });
  return canonicalize({
    logicalId: record.logicalId,
    revision: record.revision,
    contentHash: record.contentHash.toLowerCase(),
    providerId: record.providerId ?? null,
    properties: record.properties,
    bodyMarkdown: record.bodyMarkdown,
    relations
  });
}

/**
 * Produces deterministic archive members. Transport (ZIP creation and download)
 * stays outside this module, so connector/tool calls cannot be mistaken for code.
 */
export function createArchiveBundle(input: ArchiveInput): ArchiveBundle {
  if (input.schemaVersion !== undefined && input.schemaVersion !== 1) throw new Error("未対応のschemaVersionです");
  assertIsoDate(input.exportedAt);
  const files = new Map<string, Uint8Array>();
  const entities: ArchiveEntityDescriptor[] = [];
  const assetDescriptors: ArchiveAssetDescriptor[] = [];
  const seenIds = new Set<string>();

  for (const collection of ARCHIVE_COLLECTIONS) {
    const records = input.collections[collection];
    if (!Array.isArray(records)) throw new Error(`${collection}は配列である必要があります`);
    const sorted = [...records].sort((left, right) => left.logicalId.localeCompare(right.logicalId, "en"));
    for (const rawRecord of sorted) {
      const record = normalizeRecord(rawRecord);
      const key = `${collection}:${record.logicalId}`;
      if (seenIds.has(key)) throw new Error(`論理IDが重複しています: ${key}`);
      seenIds.add(key);
      const filename = `${collection}/${record.logicalId}.json`;
      addFile(files, filename, encoder.encode(canonicalJson(record)));
      entities.push({
        collection,
        logicalId: record.logicalId,
        revision: record.revision,
        contentHash: record.contentHash,
        file: filename
      });
    }
  }

  addFile(files, "taxonomy/taxonomy.json", encoder.encode(canonicalJson(input.taxonomy)));
  for (const asset of [...(input.assets ?? [])].sort((left, right) => left.path.localeCompare(right.path, "en"))) {
    const filename = asset.path.startsWith("assets/") ? asset.path : `assets/${asset.path}`;
    addFile(files, filename, asset.bytes);
    const logicalOwnerIds = [...new Set(asset.logicalOwnerIds ?? [])].sort((left, right) => left.localeCompare(right, "en"));
    logicalOwnerIds.forEach((id) => { if (!validLogicalId(id)) throw new Error(`素材の論理IDが不正です: ${id}`); });
    assetDescriptors.push({ path: filename, logicalOwnerIds });
  }

  for (const collection of ARCHIVE_COLLECTIONS) {
    for (const record of input.collections[collection]) {
      for (const relation of record.relations ?? []) {
        for (const target of relation.targetLogicalIds) {
          if (!seenIds.has(`${relation.targetCollection}:${target}`)) {
            throw new Error(`relationの対象がアーカイブにありません: ${relation.targetCollection}:${target}`);
          }
        }
      }
    }
  }

  const descriptors = [...files.entries()]
    .map(([filename, bytes]) => ({ path: filename, bytes: bytes.byteLength, sha256: sha256Bytes(bytes) }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  const counts = {
    notes: input.collections.notes.length,
    themes: input.collections.themes.length,
    revisions: input.collections.revisions.length,
    publications: input.collections.publications.length,
    assets: descriptors.filter((entry) => entry.path.startsWith("assets/")).length
  };
  const manifest = canonicalize({
    schemaVersion: 1 as const,
    exportedAt: new Date(input.exportedAt).toISOString(),
    counts,
    entities,
    assets: assetDescriptors,
    files: descriptors
  });
  addFile(files, "manifest.json", encoder.encode(canonicalJson(manifest)));
  return { manifest, files };
}

export function verifyArchiveBundle(files: ReadonlyMap<string, Uint8Array>): ArchiveBundle {
  const manifestBytes = files.get("manifest.json");
  if (!manifestBytes) throw new Error("manifest.jsonがありません");
  const manifest = JSON.parse(decoder.decode(manifestBytes)) as ArchiveManifest;
  if (manifest.schemaVersion !== 1) throw new Error("未対応のアーカイブschemaVersionです");
  assertIsoDate(manifest.exportedAt);
  if (!Array.isArray(manifest.entities) || !Array.isArray(manifest.assets) || !Array.isArray(manifest.files)) throw new Error("manifest.jsonの配列が不正です");
  const listed = new Set<string>();
  for (const descriptor of manifest.files) {
    if (!validArchivePath(descriptor.path) || descriptor.path === "manifest.json") throw new Error(`不正なファイル記述です: ${descriptor.path}`);
    if (listed.has(descriptor.path)) throw new Error(`manifest内のファイルが重複しています: ${descriptor.path}`);
    listed.add(descriptor.path);
    const bytes = files.get(descriptor.path);
    if (!bytes) throw new Error(`アーカイブファイルがありません: ${descriptor.path}`);
    if (bytes.byteLength !== descriptor.bytes) throw new Error(`ファイルサイズが一致しません: ${descriptor.path}`);
    if (sha256Bytes(bytes) !== descriptor.sha256) throw new Error(`ファイルハッシュが一致しません: ${descriptor.path}`);
  }
  for (const filename of files.keys()) {
    if (filename !== "manifest.json" && !listed.has(filename)) throw new Error(`manifestにないファイルがあります: ${filename}`);
  }
  for (const collection of ARCHIVE_COLLECTIONS) {
    const actual = manifest.entities.filter((entity) => entity.collection === collection).length;
    if (actual !== manifest.counts[collection]) throw new Error(`${collection}の件数が一致しません`);
  }
  const assets = manifest.files.filter((entry) => entry.path.startsWith("assets/")).length;
  if (assets !== manifest.counts.assets) throw new Error("assetsの件数が一致しません");
  if (manifest.assets.length !== manifest.counts.assets) throw new Error("素材記述の件数が一致しません");
  for (const entity of manifest.entities) {
    if (!ARCHIVE_COLLECTIONS.includes(entity.collection) || !validLogicalId(entity.logicalId)) throw new Error("entityの識別子が不正です");
    if (!listed.has(entity.file) || !entity.file.startsWith(`${entity.collection}/`)) throw new Error(`entityファイルが不正です: ${entity.file}`);
    if (!Number.isInteger(entity.revision) || entity.revision < 1 || !/^[0-9a-f]{64}$/.test(entity.contentHash)) throw new Error(`entityの版またはハッシュが不正です: ${entity.file}`);
  }
  for (const asset of manifest.assets) {
    if (!listed.has(asset.path) || !asset.path.startsWith("assets/")) throw new Error(`素材ファイルが不正です: ${asset.path}`);
    if (!Array.isArray(asset.logicalOwnerIds) || asset.logicalOwnerIds.some((id) => !validLogicalId(id))) throw new Error(`素材の論理IDが不正です: ${asset.path}`);
  }
  return { manifest, files };
}

export function decodeArchiveRecord(files: ReadonlyMap<string, Uint8Array>, descriptor: ArchiveEntityDescriptor): ArchiveRecord {
  const bytes = files.get(descriptor.file);
  if (!bytes) throw new Error(`レコードファイルがありません: ${descriptor.file}`);
  const record = JSON.parse(decoder.decode(bytes)) as ArchiveRecord;
  const normalized = normalizeRecord(record);
  if (normalized.logicalId !== descriptor.logicalId || normalized.revision !== descriptor.revision || normalized.contentHash !== descriptor.contentHash) {
    throw new Error(`manifestとレコードが一致しません: ${descriptor.file}`);
  }
  return normalized;
}
