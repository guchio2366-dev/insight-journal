import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePublicPayload } from "../src/lib/contracts/public.ts";
import { findPrivateMaterial } from "../src/lib/publication/project.ts";
import { calculatePayloadHash } from "../src/lib/publication/serialize.ts";
import { loadAllPublicContent, walkFiles } from "./lib/content.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

function issue(filename, propertyPath, message) {
  errors.push(`${path.relative(root, filename)} ${propertyPath}: ${message}`);
}

function exactKeys(value, allowed, filename, propertyPath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) issue(filename, `${propertyPath}.${key}`, "公開契約にない項目です");
  }
}

function requiredKeys(value, required, filename, propertyPath) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) issue(filename, `${propertyPath}.${key}`, "必須です");
  }
}

function strictNestedValidation(payload, filename) {
  const sourceKeys = ["id", "title", "publisher", "url", "publishedOn", "accessedOn", "locator", "verification"];
  const eventKeys = ["id", "dateLabel", "start", "end", "precision", "title", "description", "sourceIds"];
  const historicalKeys = ["year", "month", "day"];
  if (Array.isArray(payload.sources)) payload.sources.forEach((entry, index) => {
    const itemPath = `$.sources[${index}]`;
    exactKeys(entry, sourceKeys, filename, itemPath);
    requiredKeys(entry, sourceKeys, filename, itemPath);
    if (entry && entry.locator !== null && typeof entry.locator !== "string") issue(filename, `${itemPath}.locator`, "文字列またはnullが必要です");
  });
  if (Array.isArray(payload.timeline)) payload.timeline.forEach((entry, index) => {
    exactKeys(entry, eventKeys, filename, `$.timeline[${index}]`);
    requiredKeys(entry, eventKeys, filename, `$.timeline[${index}]`);
    if (entry?.start) exactKeys(entry.start, historicalKeys, filename, `$.timeline[${index}].start`);
    if (entry?.end) exactKeys(entry.end, historicalKeys, filename, `$.timeline[${index}].end`);
    if (typeof entry?.dateLabel !== "string" || !entry.dateLabel) issue(filename, `$.timeline[${index}].dateLabel`, "必須です");
    if (typeof entry?.title !== "string" || !entry.title) issue(filename, `$.timeline[${index}].title`, "必須です");
    if (!Array.isArray(entry?.sourceIds) || entry.sourceIds.some((id) => typeof id !== "string")) issue(filename, `$.timeline[${index}].sourceIds`, "文字列配列が必要です");
    else if (new Set(entry.sourceIds).size !== entry.sourceIds.length) issue(filename, `$.timeline[${index}].sourceIds`, "重複値があります");
    const precisions = ["day", "month", "year", "range", "approximate", "unknown"];
    if (!precisions.includes(entry?.precision)) issue(filename, `$.timeline[${index}].precision`, "未知の精度です");
  });
  if (payload.geography?.mode === "none") {
    exactKeys(payload.geography, ["mode", "reason"], filename, "$.geography");
  } else if (payload.geography?.mode === "map") {
    exactKeys(payload.geography, ["mode", "caption", "alt", "bounds", "points", "highlightCountries", "baseMap", "image"], filename, "$.geography");
    requiredKeys(payload.geography, ["mode", "caption", "alt", "bounds", "points", "highlightCountries", "baseMap", "image"], filename, "$.geography");
    exactKeys(payload.geography.bounds, ["west", "south", "east", "north"], filename, "$.geography.bounds");
    requiredKeys(payload.geography.bounds, ["west", "south", "east", "north"], filename, "$.geography.bounds");
    exactKeys(payload.geography.baseMap, ["name", "scale", "version", "sourceUrl", "sha256"], filename, "$.geography.baseMap");
    requiredKeys(payload.geography.baseMap, ["name", "scale", "version", "sourceUrl", "sha256"], filename, "$.geography.baseMap");
    exactKeys(payload.geography.image, ["path", "sha256", "width", "height", "bytes", "alt"], filename, "$.geography.image");
    requiredKeys(payload.geography.image, ["path", "sha256", "width", "height", "bytes", "alt"], filename, "$.geography.image");
    if (!Array.isArray(payload.geography.highlightCountries) || payload.geography.highlightCountries.some((code) => !/^[A-Z]{2}$/.test(code))) issue(filename, "$.geography.highlightCountries", "ISO 2文字国コードの配列が必要です");
    if (typeof payload.geography.caption !== "string" || !payload.geography.caption) issue(filename, "$.geography.caption", "必須です");
    if (typeof payload.geography.alt !== "string" || !payload.geography.alt) issue(filename, "$.geography.alt", "必須です");
    if (Array.isArray(payload.geography.points)) payload.geography.points.forEach((entry, index) => {
      exactKeys(entry, ["label", "longitude", "latitude", "sourceIds"], filename, `$.geography.points[${index}]`);
      requiredKeys(entry, ["label", "longitude", "latitude", "sourceIds"], filename, `$.geography.points[${index}]`);
      if (typeof entry?.label !== "string" || !entry.label) issue(filename, `$.geography.points[${index}].label`, "必須です");
      if (!Array.isArray(entry?.sourceIds) || entry.sourceIds.some((id) => typeof id !== "string")) issue(filename, `$.geography.points[${index}].sourceIds`, "文字列配列が必要です");
      else if (new Set(entry.sourceIds).size !== entry.sourceIds.length) issue(filename, `$.geography.points[${index}].sourceIds`, "重複値があります");
    });
    if (!/^https:\/\//.test(String(payload.geography.baseMap?.sourceUrl ?? ""))) issue(filename, "$.geography.baseMap.sourceUrl", "https URLが必要です");
    if (!/^[0-9a-f]{64}$/.test(String(payload.geography.baseMap?.sha256 ?? ""))) issue(filename, "$.geography.baseMap.sha256", "SHA256が必要です");
    if (!/^[0-9a-f]{64}$/.test(String(payload.geography.image?.sha256 ?? ""))) issue(filename, "$.geography.image.sha256", "SHA256が必要です");
    if (payload.geography.image?.alt !== payload.geography.alt) issue(filename, "$.geography.image.alt", "Geographyのaltと一致させてください");
    if (typeof payload.geography.image?.path === "string" && typeof payload.geography.image?.sha256 === "string") {
      const expectedName = `${payload.geography.image.sha256.slice(0, 12)}.png`;
      if (path.basename(payload.geography.image.path) !== expectedName) issue(filename, "$.geography.image.path", `画像ハッシュに対応する${expectedName}が必要です`);
    }
  }
}

function validateMarkdownLinks(payload, filename) {
  const markdown = String(payload.bodyMarkdown ?? "");
  for (const match of markdown.matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const isImage = match[1] === "!";
    const target = match[2].replace(/^<|>$/g, "");
    if (/^(?:javascript|data|vbscript):/i.test(target)) issue(filename, "$.bodyMarkdown", `危険なリンクです: ${target}`);
    else if (/^http:/i.test(target)) issue(filename, "$.bodyMarkdown", `外部リンクはhttpsが必要です: ${target}`);
    else if (target.startsWith("/")) issue(filename, "$.bodyMarkdown", `GitHub Pagesのbaseを失う絶対パスです: ${target}`);
    else if (/^[a-z][a-z0-9+.-]*:/i.test(target) && !/^https:/i.test(target)) issue(filename, "$.bodyMarkdown", `未対応のURLスキームです: ${target}`);
    if (isImage && /^https?:/i.test(target)) issue(filename, "$.bodyMarkdown", "画像は期限のないローカル素材として保存してください");
  }
}

async function validateMapImage(payload, filename) {
  if (payload.geography?.mode !== "map" || !payload.geography.image?.path) return;
  const image = payload.geography.image;
  const imageFile = path.join(root, "public", image.path);
  let bytes;
  try {
    bytes = await readFile(imageFile);
  } catch (error) {
    issue(filename, "$.geography.image.path", `画像を取得できません: ${path.relative(root, imageFile)}`);
    return;
  }
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== image.sha256) issue(filename, "$.geography.image.sha256", `実ファイルのSHA256と一致しません (${hash})`);
  if (bytes.length !== image.bytes) issue(filename, "$.geography.image.bytes", `実ファイルは${bytes.length} bytesです`);
  if (bytes.length >= 5_000_000) issue(filename, "$.geography.image.bytes", "5MB未満である必要があります");
  const isPng = bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!isPng) {
    issue(filename, "$.geography.image.path", "PNGファイルではありません");
    return;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== image.width || height !== image.height) issue(filename, "$.geography.image", `実画像は${width}x${height}pxです`);
}

async function validateBaseMap(payload, filename) {
  if (payload.geography?.mode !== "map" || !/Natural Earth/i.test(String(payload.geography.baseMap?.name ?? ""))) return;
  try {
    const specFiles = await walkFiles(path.join(root, "map/specs"), (item) => item.endsWith(".json"));
    let spec = null;
    for (const specFile of specFiles) {
      const candidate = JSON.parse(await readFile(specFile, "utf8"));
      if (candidate.publicId === payload.publicId) {
        if (spec) throw new Error("同じPublicIDの地図仕様が複数あります");
        spec = candidate;
      }
    }
    if (!spec || typeof spec.baseMapFile !== "string") throw new Error("対応する地図仕様がありません");
    const baseMapFile = path.resolve(root, spec.baseMapFile);
    const vendorRoot = `${path.resolve(root, "map/vendor")}${path.sep}`;
    if (!baseMapFile.startsWith(vendorRoot)) throw new Error("底図はmap/vendor内に置く必要があります");
    const bytes = await readFile(baseMapFile);
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== payload.geography.baseMap.sha256) issue(filename, "$.geography.baseMap.sha256", `固定した底図のSHA256と一致しません (${hash})`);
    if (JSON.stringify(spec.baseMap) !== JSON.stringify(payload.geography.baseMap)) issue(filename, "$.geography.baseMap", "地図仕様の底図情報と一致しません");
  } catch (error) {
    issue(filename, "$.geography.baseMap", `固定したNatural Earth底図を確認できません: ${error.message}`);
  }
}

async function run() {
  let entries;
  try {
    entries = await loadAllPublicContent(root);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const ids = new Map();
  const slugs = new Map();
  for (const entry of entries) {
    const { payload, filename, kind } = entry;
    for (const item of [...validatePublicPayload(payload), ...findPrivateMaterial(payload)]) issue(filename, item.path, item.message);
    strictNestedValidation(payload, filename);
    validateMarkdownLinks(payload, filename);
    if (payload.kind !== kind) issue(filename, "$.kind", `${entry.name}にはkind=${kind}が必要です`);
    const expectedPrefix = kind === "article" ? "a-" : "t-";
    if (typeof payload.publicId === "string" && !payload.publicId.startsWith(expectedPrefix)) issue(filename, "$.publicId", `${expectedPrefix}で始める必要があります`);
    const stem = path.basename(filename, ".md");
    if (payload.slug !== stem) issue(filename, "$.slug", `ファイル名を${payload.slug}.mdにしてください`);
    if (ids.has(payload.publicId)) issue(filename, "$.publicId", `重複しています: ${path.relative(root, ids.get(payload.publicId))}`);
    else ids.set(payload.publicId, filename);
    if (slugs.has(payload.slug)) issue(filename, "$.slug", `重複しています: ${path.relative(root, slugs.get(payload.slug))}`);
    else slugs.set(payload.slug, filename);
    await validateMapImage(payload, filename);
    await validateBaseMap(payload, filename);
    try { calculatePayloadHash(payload); } catch (error) { issue(filename, "$", error.message); }
  }

  const articleIds = new Set(entries.filter((entry) => entry.kind === "article").map((entry) => entry.payload.publicId));
  const themeIds = new Set(entries.filter((entry) => entry.kind === "theme").map((entry) => entry.payload.publicId));
  for (const { payload, filename } of entries) {
    if (Array.isArray(payload.themeIds)) for (const id of payload.themeIds) {
      if (!themeIds.has(id)) issue(filename, "$.themeIds", `公開テーマが存在しません: ${id}`);
    }
    if (Array.isArray(payload.relatedPublicIds)) for (const id of payload.relatedPublicIds) {
      if (!articleIds.has(id)) issue(filename, "$.relatedPublicIds", `公開記事が存在しません: ${id}`);
      if (id === payload.publicId) issue(filename, "$.relatedPublicIds", "自分自身は指定できません");
    }
  }

  if (errors.length > 0) {
    console.error(`公開コンテンツの検証に失敗しました (${errors.length}件)`);
    errors.forEach((message) => console.error(`- ${message}`));
    process.exitCode = 1;
  } else {
    console.log(`公開コンテンツを検証しました: ${entries.length}件`);
  }
}

await run();
