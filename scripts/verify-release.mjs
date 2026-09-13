import { gunzipSync } from "node:zlib";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculatePayloadHash } from "../src/lib/publication/serialize.ts";
import { loadAllPublicContent, parseArguments, walkFiles } from "./lib/content.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArguments(process.argv.slice(2));
const dist = path.resolve(root, String(args.dir || "dist"));

const forbiddenPatterns = [
  { name: "PRIVATE_SENTINEL", pattern: /PRIVATE_SENTINEL/i },
  { name: "Notion URL", pattern: /(?:notion\.so|notion\.site|app\.notion\.com|notion:\/\/)/i },
  { name: "ChatGPT共有URL", pattern: /(?:chatgpt\.com|chat\.openai\.com)\/share\//i },
  { name: "Notion形式のID", pattern: /(?<![a-z0-9])[0-9a-f]{32}(?![a-z0-9])/i }
];

function assertReleaseShape(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("_release.jsonはオブジェクトである必要があります");
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "articles,builtAt,commitSha") throw new Error("_release.jsonに未知または不足した項目があります");
  if (typeof value.commitSha !== "string" || !/^(?:local|[0-9a-f]{7,40})$/i.test(value.commitSha)) throw new Error("commitShaが不正です");
  if (typeof value.builtAt !== "string" || Number.isNaN(Date.parse(value.builtAt))) throw new Error("builtAtが不正です");
  if (!Array.isArray(value.articles)) throw new Error("articlesは配列である必要があります");
  const ids = new Set();
  for (const [index, article] of value.articles.entries()) {
    if (!article || typeof article !== "object" || Array.isArray(article)) throw new Error(`articles[${index}]が不正です`);
    if (Object.keys(article).sort().join(",") !== "payloadHash,publicId,revision") throw new Error(`articles[${index}]に未知または不足した項目があります`);
    if (!/^a-[0-9a-f-]{36}$/i.test(article.publicId)) throw new Error(`articles[${index}].publicIdが不正です`);
    if (!Number.isInteger(article.revision) || article.revision < 1) throw new Error(`articles[${index}].revisionが不正です`);
    if (!/^[0-9a-f]{64}$/.test(article.payloadHash)) throw new Error(`articles[${index}].payloadHashが不正です`);
    if (ids.has(article.publicId)) throw new Error(`PublicIDが重複しています: ${article.publicId}`);
    ids.add(article.publicId);
  }
}

async function readRelease() {
  if (args.url) {
    const base = String(args.url).replace(/\/$/, "");
    const response = await fetch(`${base}/_release.json`, { redirect: "error" });
    if (!response.ok) throw new Error(`_release.jsonを取得できません: HTTP ${response.status}`);
    return response.json();
  }
  return JSON.parse(await readFile(path.join(dist, "_release.json"), "utf8"));
}

async function assertRemoteResource(base, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.startsWith("/") || relativePath.includes("..")) {
    throw new Error(`${label}の相対パスが不正です`);
  }
  const response = await fetch(`${base}/${relativePath}`, { redirect: "error" });
  if (!response.ok) throw new Error(`${label}を取得できません: HTTP ${response.status}`);
}

async function assertFile(filename, label) {
  try {
    const info = await stat(filename);
    if (!info.isFile()) throw new Error();
  } catch {
    throw new Error(`${label}がありません: ${path.relative(root, filename)}`);
  }
}

async function verifyLocalFiles(release) {
  await assertFile(path.join(dist, "pagefind/pagefind.js"), "Pagefindインデックス");
  const entries = await loadAllPublicContent(root);
  const articles = new Map(entries.filter((entry) => entry.kind === "article").map((entry) => [entry.payload.publicId, entry.payload]));
  if (articles.size !== release.articles.length) throw new Error(`記事件数が一致しません: source=${articles.size}, release=${release.articles.length}`);
  for (const released of release.articles) {
    const payload = articles.get(released.publicId);
    if (!payload) throw new Error(`公開元が見つかりません: ${released.publicId}`);
    if (payload.revision !== released.revision) throw new Error(`revisionが一致しません: ${released.publicId}`);
    if (calculatePayloadHash(payload) !== released.payloadHash) throw new Error(`payloadHashが一致しません: ${released.publicId}`);
    await assertFile(path.join(dist, "articles", payload.slug, "index.html"), `記事ページ ${payload.slug}`);
    if (payload.geography.mode === "map") await assertFile(path.join(dist, payload.geography.image.path), `地図 ${payload.geography.image.path}`);
  }

  const textExtensions = new Set([".html", ".json", ".xml", ".js", ".css", ".txt", ".svg", ".gz"]);
  const files = await walkFiles(dist, (filename) => textExtensions.has(path.extname(filename).toLowerCase()));
  for (const filename of files) {
    const text = filename.endsWith(".gz") ? gunzipSync(await readFile(filename)).toString("utf8") : await readFile(filename, "utf8");
    for (const rule of forbiddenPatterns) {
      if (rule.pattern.test(text)) throw new Error(`${path.relative(root, filename)}に${rule.name}が含まれています`);
    }
  }
}

const release = await readRelease();
assertReleaseShape(release);
if (args.commit && release.commitSha !== args.commit) throw new Error(`commitShaが一致しません: ${release.commitSha}`);
if (args["public-id"]) {
  const article = release.articles.find((entry) => entry.publicId === args["public-id"]);
  if (!article) throw new Error(`PublicIDが配信情報にありません: ${args["public-id"]}`);
  if (args.revision && article.revision !== Number(args.revision)) throw new Error("revisionが一致しません");
  if (args["payload-hash"] && article.payloadHash !== args["payload-hash"]) throw new Error("payloadHashが一致しません");
}
if (!args.url) await verifyLocalFiles(release);
else {
  const base = String(args.url).replace(/\/$/, "");
  if (args["article-path"]) await assertRemoteResource(base, String(args["article-path"]), "記事ページ");
  if (args["asset-path"]) await assertRemoteResource(base, String(args["asset-path"]), "公開素材");
}
console.log(`配信情報を確認しました: ${release.commitSha}, ${release.articles.length} articles`);
