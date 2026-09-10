import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("固定したベース地図と異なるSHA-256を指定すると生成を中止する", async (t) => {
  const python = spawnSync("python3", ["-c", "import matplotlib"], { encoding: "utf8" });
  if (python.status !== 0) {
    t.skip("matplotlibを利用できる環境で実行します");
    return;
  }

  const temporary = await mkdtemp(path.join(os.tmpdir(), "insight-map-test-"));
  try {
    const canonicalSpec = JSON.parse(
      await readFile(path.join(projectRoot, "map/specs/india-agriculture.json"), "utf8")
    );
    canonicalSpec.baseMap.sha256 = "0".repeat(64);
    const tamperedSpec = path.join(temporary, "tampered-spec.json");
    await writeFile(tamperedSpec, `${JSON.stringify(canonicalSpec, null, 2)}\n`, "utf8");

    const result = spawnSync(
      "python3",
      ["map/render_map.py", tamperedSpec, "--output-root", path.join(temporary, "output")],
      { cwd: projectRoot, encoding: "utf8" }
    );

    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /base map SHA-256 does not match/i);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

