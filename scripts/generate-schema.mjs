import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { publicPayloadJsonSchema } from "../src/lib/contracts/public.ts";
import { canonicalJson } from "../src/lib/publication/serialize.ts";
import { parseArguments } from "./lib/content.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArguments(process.argv.slice(2));
const output = path.resolve(root, String(args.output || "public/schema/public-payload-v1.json"));
const temporary = `${output}.tmp-${process.pid}`;

await mkdir(path.dirname(output), { recursive: true });
await writeFile(temporary, canonicalJson(publicPayloadJsonSchema), "utf8");
await rename(temporary, output);
console.log(path.relative(root, output));

