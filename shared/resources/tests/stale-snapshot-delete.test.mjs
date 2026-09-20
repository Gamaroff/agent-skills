// stale-snapshot-delete.test.mjs — the resume contract's Consume Output loop is the ONE place a
// stale halt snapshot is deleted, and it deletes only what the detector marked and verifies the
// path afterwards (task.130 Phase 3; PR #436 review CR-3).
//
// The defect this closes: the detector prompt — a read-only Explore subagent — was told to `rm -f`
// a `last-halt.json` it had proved stale and to REPORT the delete in the same breath. A subagent
// that self-reports a write it may not have performed is worse than one that reports nothing: the
// orchestrator trusts the report over the directory. The delete now lives in the orchestrator, in
// one fenced block that every orchestrator cites and none copies, and it re-reads the path.
//
// Each block below is the smallest claim whose reverse turns it red:
//   A — a `stale-snapshot` delta's path is deleted and the block exits 0        (drop `rm -f` → red)
//   B — a delta whose concern does not start `stale-snapshot` is left in place  (widen the select → red)
//   C — a path that survives the rm is a HALT with exit 1                        (drop the re-read → red)
//   D — no orchestrator SKILL.md carries a copy of the loop; each cites the section instead

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..", "..");
const CONTRACT = path.join(
  ROOT,
  "shared",
  "resources",
  "develop-pipeline-resume-contract.md",
);
const SKILLS = ["develop-task", "develop-story", "develop-bug"].map((s) =>
  path.join(ROOT, "skills", s, "SKILL.md"),
);
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];

function deleteBlock() {
  const md = fs.readFileSync(CONTRACT, "utf8");
  // Keyed on the block's own comment line, not on the `rm`/`select` tokens under proof — an
  // extractor that keys on the mutated token reports every case red the moment the token goes,
  // which reads like a proof and is only a missing block.
  const blocks = extractBlocks(md).filter((b) =>
    /Every `stale-snapshot` delta names a snapshot the detector proved/.test(
      b.code,
    ),
  );
  assert.equal(
    blocks.length,
    1,
    `expected exactly one stale-snapshot delete block, found ${blocks.length}`,
  );
  return blocks[0].code;
}

function run(shell, { concern, readOnlyDir }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stale-snapshot-"));
  const state = path.join(dir, ".claude", "state");
  fs.mkdirSync(state, { recursive: true });
  const snap = path.join(state, "develop-pipeline.last-halt.json");
  fs.writeFileSync(snap, '{"skill":"develop-task"}\n');
  const json = JSON.stringify({
    schema_version: 1,
    recommended_step: 1,
    deltas_since_pause: [
      { path: snap, old_mtime: "x", new_mtime: "x", concern },
    ],
    blocking_issues: [],
  });
  // A directory the shell cannot write to makes `rm -f` fail silently (-f) and leaves the file —
  // the case the re-read exists to catch.
  if (readOnlyDir) fs.chmodSync(state, 0o555);
  const script = `DETECTOR_JSON='${json.replace(/'/g, "'\\''")}'\n${deleteBlock()}\necho "BLOCK_DONE"\n`;
  const argv =
    shell === "zsh"
      ? ["-f", "-c", script]
      : ["--noprofile", "--norc", "-c", script];
  const r = spawnSync(shell, argv, { cwd: dir, encoding: "utf8" });
  const exists = fs.existsSync(snap);
  if (readOnlyDir) fs.chmodSync(state, 0o755);
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, exists };
}

for (const sh of SHELLS) {
  test(`A [${sh}] — a stale-snapshot delta's path is deleted; exit 0`, () => {
    const r = run(sh, { concern: "stale-snapshot: PR merged" });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.exists, false, "snapshot still on disk");
    assert.match(r.stdout, /BLOCK_DONE/);
  });

  test(`B [${sh}] — a delta with another concern is left in place`, () => {
    const r = run(sh, { concern: "modified after pause" });
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.equal(r.exists, true, "a non-stale delta's path was deleted");
  });

  test(
    `C [${sh}] — a path that survives rm is a HALT (exit 1)`,
    {
      skip:
        process.getuid &&
        process.getuid() === 0 &&
        "root ignores directory permissions",
    },
    () => {
      const r = run(sh, {
        concern: "stale-snapshot: PR merged",
        readOnlyDir: true,
      });
      assert.equal(
        r.status,
        1,
        `expected exit 1; stdout: ${r.stdout} stderr: ${r.stderr}`,
      );
      assert.match(r.stdout, /HALT: stale snapshot .* survived deletion/);
      assert.doesNotMatch(
        r.stdout,
        /BLOCK_DONE/,
        "the block ran past the HALT",
      );
    },
  );
}

test("D — no orchestrator SKILL.md copies the loop; each cites § Consume Output", () => {
  for (const file of SKILLS) {
    const md = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file);
    assert.doesNotMatch(
      md,
      /startswith\("stale-snapshot"\)/,
      `${rel} carries a copy of the delete loop`,
    );
    assert.match(
      md,
      /Stale snapshots the detector reports[^\n]*resume contract § Consume Output/,
      `${rel} does not cite the contract's one statement of the delete`,
    );
  }
});
