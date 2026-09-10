import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculatePayloadHash, canonicalJson } from "../src/lib/publication/serialize.ts";
import { findPrivateMaterial } from "../src/lib/publication/project.ts";
import { loadAllPublicContent, parseArguments } from "./lib/content.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArguments(process.argv.slice(2));
const outputDirectory = path.resolve(root, String(args.dir || "dist"));
const commitSha = String(args.commit || process.env.GITHUB_SHA || "local");
const builtAt = String(args["built-at"] || process.env.RELEASE_BUILT_AT || new Date().toISOString());

if (!/^(?:local|[0-9a-f]{7,40})$/i.test(commitSha)) {
  throw new Error("commitShaはGit SHAまたはlocalである必要があります");
}
if (Number.isNaN(Date.parse(builtAt))) throw new Error("builtAtはISO日時である必要があります");

const entries = await loadAllPublicContent(root);
const articles = entries
  .filter((entry) => entry.kind === "article")
  .map(({ payload }) => {
    const privateIssues = findPrivateMaterial(payload);
    if (privateIssues.length > 0) throw new Error(privateIssues.map((entry) => `${entry.path}: ${entry.message}`).join("\n"));
    return {
      publicId: payload.publicId,
      revision: payload.revision,
      payloadHash: calculatePayloadHash(payload)
    };
  })
  .sort((left, right) => left.publicId.localeCompare(right.publicId, "en"));

const release = { commitSha, builtAt: new Date(builtAt).toISOString(), articles };
const output = path.join(outputDirectory, "_release.json");
const temporary = `${output}.tmp-${process.pid}`;
await mkdir(outputDirectory, { recursive: true });
await writeFile(temporary, canonicalJson(release), "utf8");
await rename(temporary, output);
console.log(`${path.relative(root, output)} (${articles.length} articles)`);

