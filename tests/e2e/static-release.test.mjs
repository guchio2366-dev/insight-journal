import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const distRoot = path.join(projectRoot, "dist");

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(fullPath) : [fullPath];
  }));
  return nested.flat();
}

test("主要ページと日本語検索索引を静的成果物に含む", async () => {
  const expectedFiles = [
    "index.html",
    "search/index.html",
    "themes/index.html",
    "themes/food-and-agriculture-display-sample/index.html",
    "articles/india-agriculture-display-sample/index.html",
    "atlas/north-america/index.html",
    "atlas/north-america/agriculture/index.html",
    "atlas/north-america/land/index.html",
    "assets/atlas/v3/manifest.json",
    "assets/atlas/v3/agriculture-fallback.webp",
    "assets/atlas/north-america-agriculture-reference-v1.webp",
    "pagefind/pagefind.js"
  ];

  for (const relativePath of expectedFiles) {
    await assert.doesNotReject(access(path.join(distRoot, relativePath)), relativePath);
  }
});

test("地図の通常経路は共通レンダラーと下の解説を含み、未完成の分野をリンクにしない", async () => {
  for (const route of ['atlas/north-america/index.html','atlas/north-america/agriculture/index.html','atlas/north-america/land/index.html','atlas/north-america/agriculture/report/index.html']) {
    const html=await readFile(path.join(distRoot,route),'utf8');
    assert.match(html,/data-atlas-explorer/);
    assert.match(html,/id="atlas-details"/);
    assert.match(html,/id="crop-conditions"/);
    assert.doesNotMatch(html,/<a[^>]+data-field="(?:climate|industry)"/);
    assert.doesNotMatch(html,/atlas-zone-list|atlas-map-stage/);
  }
});

test("静的成果物に非公開情報を含めず、サブパス用URLを使う", async () => {
  const files = (await filesBelow(distRoot)).filter((file) => !/\.(?:png|webp)$/i.test(file));
  const text = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");

  assert.doesNotMatch(text, /PRIVATE_SENTINEL/i);
  assert.doesNotMatch(text, /(?:notion\.so|app\.notion\.com)/i);
  assert.doesNotMatch(text, /chatgpt\.com\/share|chat\.openai\.com\/share/i);

  const article = await readFile(
    path.join(distRoot, "articles/india-agriculture-display-sample/index.html"),
    "utf8"
  );
  assert.match(article, /\/insight-journal\/assets\/a-11111111-1111-4111-8111-111111111111\/13ffca4b641f\.png/);
});
