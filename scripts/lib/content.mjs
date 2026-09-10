import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { normalizeText } from "../../src/lib/publication/serialize.ts";
import { parseYamlLite } from "./yaml-lite.mjs";

export async function walkFiles(directory, predicate = () => true) {
  const result = [];
  async function visit(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && predicate(absolute)) result.push(absolute);
    }
  }
  await visit(directory);
  return result;
}

export function parseMarkdownWithFrontmatter(source, filename = "<memory>") {
  const normalized = normalizeText(source);
  if (!normalized.startsWith("---\n")) {
    throw new Error(`${filename}: YAML front matterがありません`);
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`${filename}: front matterの終端がありません`);
  const frontmatterText = normalized.slice(4, end);
  const parsed = parseYamlLite(frontmatterText);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${filename}: front matterはオブジェクトである必要があります`);
  }
  const bodyMarkdown = normalized.slice(end + 5).replace(/^\n/, "").trim();
  return { ...parsed, bodyMarkdown };
}

export async function loadContentFile(filename) {
  return parseMarkdownWithFrontmatter(await readFile(filename, "utf8"), filename);
}

export async function loadAllPublicContent(rootDirectory) {
  const collections = [
    { name: "articles", kind: "article", directory: path.join(rootDirectory, "src/content/articles") },
    { name: "themes", kind: "theme", directory: path.join(rootDirectory, "src/content/themes") }
  ];
  const entries = [];
  for (const collection of collections) {
    const files = await walkFiles(collection.directory, (filename) => filename.endsWith(".md"));
    for (const filename of files) {
      const payload = await loadContentFile(filename);
      entries.push({ ...collection, filename, payload });
    }
  }
  return entries;
}

export function parseArguments(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) {
      result._.push(argument);
      continue;
    }
    const [name, inline] = argument.slice(2).split("=", 2);
    if (inline !== undefined) result[name] = inline;
    else if (argv[index + 1] && !argv[index + 1].startsWith("--")) result[name] = argv[++index];
    else result[name] = true;
  }
  return result;
}
