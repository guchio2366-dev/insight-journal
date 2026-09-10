import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(fullPath) : [fullPath];
  }));
  return nested.flat();
}

test("公開用コンテンツに非公開マーカーやNotion URLを含めない", async () => {
  const contentRoot = path.join(projectRoot, "src/content");
  const files = await filesBelow(contentRoot);
  assert.ok(files.length >= 2);

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /PRIVATE_SENTINEL/i, file);
    assert.doesNotMatch(source, /(?:notion\.so|app\.notion\.com)/i, file);
    assert.doesNotMatch(source, /chatgpt\.com\/share|chat\.openai\.com\/share/i, file);
  }
});

test("合成記事の地図画像は記録済みハッシュと一致する", async () => {
  const { createHash } = await import("node:crypto");
  const imagePath = path.join(
    projectRoot,
    "public/assets/a-11111111-1111-4111-8111-111111111111/13ffca4b641f.png"
  );
  const bytes = await readFile(imagePath);
  assert.equal(bytes.byteLength, 104335);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "13ffca4b641f531e38a0a876fe4631e3adfbf920e038846d383dd471f1b41fe8"
  );
});

