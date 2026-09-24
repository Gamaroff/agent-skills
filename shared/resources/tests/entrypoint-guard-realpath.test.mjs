// An ESM engine decides whether it is the entry point by comparing `process.argv[1]` with
// `import.meta.url`. Node resolves `import.meta.url` through symlinks; `argv[1]` is whatever the
// caller typed. `.agents/skills` and `.claude/skills` are symlinks to `../skills` in this repository
// and in symlinked consumer installs, so every documented invocation arrives symlinked. Compared raw
// — `pathToFileURL(argv[1]).href`, or `resolve(argv[1])`, against the module URL — the guard is
// false, `main()` never runs, and the engine prints nothing and exits 0. That is indistinguishable
// from a clean run, which is the worst answer an instrument can give.
//
// It was fixed one engine at a time (qa-execute-snippets bug.4, finalise-fix-and-recheck task.128
// BUG-1, resolve-skill-set-cli) while security-probe.mjs (obs #126) and qa-next's uat-status.mjs
// kept the raw form. So this file holds the whole population, not one member:
//
//   1. Structural — every ESM engine that compares `process.argv[1]` with `import.meta.url`
//      resolves real paths (`realpathSync`). Floor on the population so the scan cannot pass by
//      matching nothing.
//   2. Behavioural — the two engines this class last escaped through, invoked through a symlinked
//      directory with an unknown flag, must refuse it (exit 2, a message on stderr). The structural
//      scan can only say the source LOOKS right (bug.3); this is what holds the bug.

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
// Spawns a real node process per case: its latency is load, not code (spawn-budget.mjs). A child
// that never ran is retried; one that ran and exited is a result.
const CLI_BUDGET = spawnBudget("ENTRY_GUARD");

function mjsIn(dir) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".mjs"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

// The source engines, each skill's own scripts, and every bundled copy under a skill's
// references/ — the copies are what the documented `.agents/skills/<skill>/references/…`
// invocations actually run.
function engineFiles() {
  const skills = readdirSync(join(REPO_ROOT, "skills"));
  return [
    ...mjsIn(join(REPO_ROOT, "shared", "resources")),
    ...skills.flatMap((s) => mjsIn(join(REPO_ROOT, "skills", s, "scripts"))),
    ...skills.flatMap((s) => mjsIn(join(REPO_ROOT, "skills", s, "references"))),
  ];
}

test("every ESM engine's entry-point guard compares REAL paths (obs #126)", () => {
  const guarded = engineFiles().filter((f) => {
    const src = readFileSync(f, "utf8");
    return src.includes("process.argv[1]") && src.includes("import.meta.url");
  });
  // Non-vacuity: 9 source engines carried a guard when this test was written, before any
  // bundled copy is counted. A scan that finds far fewer is reading the wrong tree.
  assert.ok(
    guarded.length >= 9,
    `only ${guarded.length} guarded engines found — the scan is not reading the engines`,
  );
  const raw = guarded.filter(
    (f) => !readFileSync(f, "utf8").includes("realpathSync"),
  );
  assert.deepEqual(
    raw.map((f) => relative(REPO_ROOT, f)),
    [],
    "these engines compare process.argv[1] with import.meta.url without realpathSync — " +
      "invoked through the .agents/skills symlink they run nothing and exit 0",
  );
});

// Invoke `<engine>` through a symlink to its directory — the shape `.agents/skills/…` has — with
// a flag it does not accept. A guard that fires refuses it; a guard that does not prints nothing
// and exits 0.
function throughSymlinkedDir(realDir, file) {
  const dir = mkdtempSync(join(tmpdir(), "entry-guard-"));
  try {
    const link = join(dir, "linked");
    symlinkSync(realDir, link, "dir");
    let r;
    for (let attempt = 0; attempt <= CLI_BUDGET.retries; attempt++) {
      r = spawnSync(process.execPath, [join(link, file), "--bogus-flag"], {
        encoding: "utf8",
        timeout: CLI_BUDGET.timeoutMs,
      });
      if (!neverRan(r)) return r;
    }
    return r;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const [label, realDir, file] of [
  [
    "security-probe.mjs",
    join(REPO_ROOT, "shared", "resources"),
    "security-probe.mjs",
  ],
  [
    "qa-next uat-status.mjs",
    join(REPO_ROOT, "skills", "qa-next", "scripts"),
    "uat-status.mjs",
  ],
]) {
  test(`${label}: invoked through a symlinked directory it still runs and refuses an unknown flag`, () => {
    const r = throughSymlinkedDir(realDir, file);
    assert.ok(
      !neverRan(r),
      `the CLI never ran: ${r.error ?? r.signal} — a load problem, not this bug`,
    );
    assert.ok(
      r.stderr.trim().length > 0,
      `no stderr through the symlink — the entry-point guard did not fire (exit=${r.status}, stdout=${JSON.stringify(r.stdout)})`,
    );
    assert.equal(r.status, 2, `stderr=${r.stderr}`);
  });
}
