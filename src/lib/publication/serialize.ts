import { createHash } from "node:crypto";
import type { PublicPayload } from "../contracts/public.ts";
import { projectPublicPayload, PublicProjectionError } from "./project.ts";

const SET_ARRAY_KEYS = new Set(["topics", "countries", "regions"]);

export function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").normalize("NFC");
}

function normalizeValue(value: unknown, parentKey = ""): unknown {
  if (typeof value === "string") return normalizeText(value);
  if (Array.isArray(value)) {
    const items = value.map((item) => normalizeValue(item));
    if (SET_ARRAY_KEYS.has(parentKey)) {
      return [...new Set(items as string[])].sort((left, right) => left.localeCompare(right, "en"));
    }
    return items;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>).sort().flatMap((key) => {
        const item = (value as Record<string, unknown>)[key];
        return item === undefined ? [] : [[key, normalizeValue(item, key)]];
      })
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("NaNとInfinityは正規化できません");
  }
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    throw new TypeError(`公開データに使用できない型です: ${typeof value}`);
  }
  return value;
}

/** Recursively sorts object keys, preserves ordered arrays, and normalizes text. */
export function canonicalize<T>(value: T): T {
  return normalizeValue(value) as T;
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

export function sha256Bytes(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalPublicPayload(payload: PublicPayload): PublicPayload {
  const normalized = canonicalize(payload);
  return {
    ...normalized,
    bodyMarkdown: normalizeText(normalized.bodyMarkdown).trim()
  };
}

export function calculatePayloadHash(payload: PublicPayload): string {
  const checked = projectPublicPayload(payload);
  return sha256Bytes(canonicalJson(canonicalPublicPayload(checked)));
}

export function serializePublicMarkdown(payload: PublicPayload): string {
  const normalized = canonicalPublicPayload(projectPublicPayload(payload));
  const { bodyMarkdown, ...frontmatter } = normalized;
  // JSON is a strict subset of YAML. Emitting JSON inside YAML front matter
  // avoids implicit date coercion and keeps output deterministic.
  const header = JSON.stringify(frontmatter, null, 2);
  const body = normalizeText(bodyMarkdown).trim();
  return `---\n${header}\n---\n\n${body}${body ? "\n" : ""}`;
}

export function publicContentPath(payload: Pick<PublicPayload, "kind" | "slug">): string {
  const collection = payload.kind === "article" ? "articles" : "themes";
  return `src/content/${collection}/${payload.slug}.md`;
}

export interface PublicationAssetInput {
  path: string;
  bytes: Uint8Array;
}

/**
 * Returns the complete, allowlisted file set for one atomic publication commit.
 * Callers must not add private work files to this map.
 */
export function createPublicationFiles(
  payload: PublicPayload,
  assets: readonly PublicationAssetInput[] = []
): ReadonlyMap<string, Uint8Array> {
  const checked = projectPublicPayload(payload);
  const expectedAssetPath = checked.geography.mode === "map" ? `public/${checked.geography.image.path}` : null;
  if (assets.length !== (expectedAssetPath ? 1 : 0)) {
    throw new PublicProjectionError([{ path: "$.assets", message: expectedAssetPath ? "公開地図の実体が1件必要です" : "この公開稿に素材ファイルは許可されていません" }]);
  }
  const files = new Map<string, Uint8Array>();
  files.set(publicContentPath(checked), new TextEncoder().encode(serializePublicMarkdown(checked)));
  for (const asset of assets) {
    if (asset.path !== expectedAssetPath) throw new PublicProjectionError([{ path: "$.assets", message: `許可されていない公開素材です: ${asset.path}` }]);
    const image = checked.geography.mode === "map" ? checked.geography.image : null;
    if (!image) throw new PublicProjectionError([{ path: "$.geography.image", message: "地図情報がありません" }]);
    if (asset.bytes.byteLength !== image.bytes) throw new PublicProjectionError([{ path: "$.geography.image.bytes", message: "公開素材のファイルサイズが一致しません" }]);
    if (sha256Bytes(asset.bytes) !== image.sha256) throw new PublicProjectionError([{ path: "$.geography.image.sha256", message: "公開素材のSHA256が一致しません" }]);
    files.set(asset.path, new Uint8Array(asset.bytes));
  }
  return files;
}
