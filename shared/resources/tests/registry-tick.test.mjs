/**
 * Behavioural tests for `registry-tick.js` — the writer task.103 gave the
 * task-registry row.
 *
 * Every test below RUNS the CLI against a throwaway registry and asserts what it
 * did to the bytes on disk. None of them greps `finalise/SKILL.md`. That is the
 * point of the CLI existing at all: the task's testing strategy demands proof
 * that a lite-mode run ticks and that a story run does not attempt a write, and
 * a prose implementation admits no test but a grep — which proves the sentence
 * is present, not that the behaviour holds.
 *
 * Run via: node --test shared/resources/tests/registry-tick.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const CLI = path.join(REPO_ROOT, "shared", "resources", "registry-tick.js");
const SELECTOR_REL = path.join(
  "skills",
  "develop-next",
  "scripts",
  "select-next.mjs",
);

const REGISTRY_HEADER = [
  "# Task Registry",
  "",
  "**Next Available Task Number:** **99**",
  "",
  "| #  | Title | Status | Category | Priority | Created | Issue | Depends on |",
  "|----|-------|--------|----------|----------|---------|-------|------------|",
];

function row(n, slug, status) {
  return `| ${n} | [T${n}](task.${n}.${slug}/task.${n}.${slug}.md) | ${status} | infrastructure | Medium | 2026-01-01 | — | — |`;
}

function doc({ type = "task", status = "accepted" } = {}) {
  return `---\nid: x\ntype: ${type}\nstatus: ${status}\n---\n\n# Doc\n`;
}

/**
 * A sandbox shaped like a consumer repo: a registry, some task documents, and a
 * `skills/develop-next/scripts/select-next.mjs` for the CLI's upward walk to
 * find. The selector is SYMLINKED to the real one rather than copied — a copy
 * would be a second parser, which is the exact duplication the CLI refuses to
 * create in production code and has no business creating in its own fixture.
 */
function sandbox(rows) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "registry-tick-"));
  mkdirSync(path.join(dir, "skills", "develop-next", "scripts"), {
    recursive: true,
  });
  symlinkSync(path.join(REPO_ROOT, SELECTOR_REL), path.join(dir, SELECTOR_REL));
  mkdirSync(path.join(dir, "docs", "tasks"), { recursive: true });
  const registry = path.join(dir, "docs", "tasks", "task-registry.md");
  writeFileSync(registry, [...REGISTRY_HEADER, ...rows, ""].join("\n"));
  return { dir, registry };
}

function writeDoc(dir, n, slug, opts) {
  const d = path.join(dir, "docs", "tasks", `task.${n}.${slug}`);
  mkdirSync(d, { recursive: true });
  const f = path.join(d, `task.${n}.${slug}.md`);
  writeFileSync(f, doc(opts));
  return f;
}

function run(cwd, args) {
  const out = execFileSync(process.execPath, [CLI, ...args, "--json"], {
    cwd,
    encoding: "utf8",
  });
  return JSON.parse(out);
}

test("an accepted task ticks its row", () => {
  const { dir, registry } = sandbox([
    row(10, "alpha", "ready-for-development"),
  ]);
  try {
    const f = writeDoc(dir, 10, "alpha", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.from, "ready-for-development");
    assert.equal(res.ticked, true);
    // Match the value, not its padding — width preservation means a wide source
    // cell keeps its width, so the single-space form is not what lands here.
    const row = readFileSync(registry, "utf8")
      .split("\n")
      .find((l) => l.startsWith("| 10 |"));
    assert.equal(row.split("|")[3].trim(), "accepted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("ticking is idempotent — a second run reports `already` and writes nothing", () => {
  const { dir, registry } = sandbox([row(11, "beta", "accepted")]);
  try {
    const f = writeDoc(dir, 11, "beta", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "already");
    assert.equal(res.ticked, false);
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * The story-run guard, which task.103 § 8 names explicitly. `finalise` is shared
 * across document kinds and calls this unconditionally; the refusal has to live
 * in the writer, not in a condition the caller is trusted to remember.
 */
test("a story run does not attempt a task-registry write", () => {
  const { dir, registry } = sandbox([row(12, "gamma", "planned")]);
  try {
    const sd = path.join(dir, "docs", "stories", "story.1.1.thing");
    mkdirSync(sd, { recursive: true });
    const f = path.join(sd, "story.1.1.thing.md");
    writeFileSync(f, doc({ type: "story", status: "accepted" }));
    const before = readFileSync(registry, "utf8");

    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "not-a-task");
    assert.equal(res.ticked, false);
    assert.equal(
      readFileSync(registry, "utf8"),
      before,
      "a story run must leave the task registry byte-identical",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * The guard's two signals are asymmetric, and this pins the half that is easy to
 * tighten by accident.
 *
 * The filename stem is REQUIRED; `type` may only contradict it. A task document
 * written before OKF's `type` field existed is still a task, and tightening this
 * to `docType !== "task"` would silently stop ticking the oldest documents in the
 * corpus — with no error, because `not-a-task` is a success reason.
 *
 * Added after a mutation survived: the rule was stated in a comment and checked
 * nowhere, which is the same overstatement this cycle was fixing elsewhere.
 */
test("a task document with no `type` frontmatter is still ticked", () => {
  const { dir, registry } = sandbox([row(22, "xi", "planned")]);
  try {
    const d = path.join(dir, "docs", "tasks", "task.22.xi");
    mkdirSync(d, { recursive: true });
    const f = path.join(d, "task.22.xi.md");
    writeFileSync(
      f,
      "---\nid: task.22\nstatus: accepted\n---\n\n# Legacy doc\n",
    );

    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(
      res.reason,
      "ticked",
      "an absent `type` must not be read as a contradiction — only `type: story` (or another kind) is",
    );
    assert.match(readFileSync(registry, "utf8"), /^\| 22 \|.*accepted/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a task document whose own status is not `accepted` is not mirrored", () => {
  const { dir, registry } = sandbox([row(13, "delta", "planned")]);
  try {
    const f = writeDoc(dir, 13, "delta", { status: "in-progress" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "not-accepted");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a cancelled task is left alone — `cancelled` is terminal and is not `accepted`", () => {
  const { dir, registry } = sandbox([row(14, "eps", "cancelled")]);
  try {
    const f = writeDoc(dir, 14, "eps", { status: "cancelled" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "not-accepted");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a task with no row reports `no-row` and exits 0 — never blocks acceptance", () => {
  const { dir, registry } = sandbox([row(15, "zeta", "planned")]);
  try {
    const f = writeDoc(dir, 16, "eta", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "no-row");
    assert.equal(res.exitCode, 0);
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing registry reports `no-registry` and exits 0", () => {
  const { dir } = sandbox([row(17, "theta", "planned")]);
  try {
    const f = writeDoc(dir, 17, "theta", { status: "accepted" });
    rmSync(path.join(dir, "docs", "tasks", "task-registry.md"));
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "no-registry");
    assert.equal(res.exitCode, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--dry-run reports the change it would make and writes nothing", () => {
  const { dir, registry } = sandbox([row(18, "iota", "ready-for-review")]);
  try {
    const f = writeDoc(dir, 18, "iota", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--file", path.relative(dir, f), "--dry-run"]);
    assert.equal(res.reason, "dry-run");
    assert.equal(res.ticked, false);
    assert.equal(res.from, "ready-for-review");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Column alignment is not cosmetic here: the real registry pads its id column
 * (`| 1  |`), and a tick that reflowed a cell would rewrite the visual shape of a
 * 100-row table on every acceptance, burying the one-line change in a whole-file
 * diff.
 *
 * This asserts the cell's exact WIDTH, not merely that some padding survived. The
 * weaker form (`/\| accepted +\|/`) passed while the column silently shifted by one
 * character — the test name claimed alignment and checked only that a space
 * remained. Comparing lengths is what makes the claim and the assertion the same
 * statement.
 */
test("cell width is preserved so an aligned table stays aligned", () => {
  const before =
    "| 19 | [T19](task.19.kap/task.19.kap.md) | planned              | infra | Medium | 2026-01-01 | — | — |";
  const { dir, registry } = sandbox([before]);
  try {
    const f = writeDoc(dir, 19, "kap", { status: "accepted" });
    run(dir, ["--file", path.relative(dir, f)]);

    const after = readFileSync(registry, "utf8")
      .split("\n")
      .find((l) => l.startsWith("| 19 |"));
    assert.ok(after, "the row should still be present");

    const cellOf = (line) => line.split("|")[3];
    assert.equal(
      cellOf(after).trim(),
      "accepted",
      "the value should be rewritten",
    );
    assert.equal(
      cellOf(after).length,
      cellOf(before).length,
      "the status cell should keep its exact width, so the column does not shift",
    );
    assert.equal(
      after.length,
      before.length,
      "and the row's total width with it",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * The two width boundaries, asserted rather than left to the comment.
 *
 * A cell with no trailing whitespace must not acquire any, and a cell too narrow
 * to hold `accepted` must keep one separating space and let the row widen —
 * alignment is worth preserving, never worth corrupting a value to achieve.
 */
test("width preservation degrades correctly at both boundaries", () => {
  const noPad =
    "|20|[T20](task.20.mu2/task.20.mu2.md)|planned|infra|Medium|2026-01-01|—|—|";
  const tight =
    "| 21 | [T21](task.21.nu/task.21.nu.md) | new | infra | Medium | 2026-01-01 | — | — |";
  const { dir, registry } = sandbox([noPad, tight]);
  try {
    writeDoc(dir, 20, "mu2", { status: "accepted" });
    writeDoc(dir, 21, "nu", { status: "accepted" });
    run(dir, ["--file", "docs/tasks/task.20.mu2/task.20.mu2.md"]);

    const lines = () => readFileSync(registry, "utf8").split("\n");
    const row20 = lines().find((l) => l.startsWith("|20|"));
    assert.equal(
      row20.split("|")[3],
      "accepted",
      "a cell with no padding should get none back",
    );

    // `new` (3 chars + 2 spaces = 5) cannot hold ` accepted ` (10). The value wins.
    run(dir, ["--file", "docs/tasks/task.21.nu/task.21.nu.md"]);
    const row21 = lines().find((l) => l.startsWith("| 21 |"));
    assert.equal(
      row21.split("|")[3],
      " accepted ",
      "a tight cell widens rather than truncating",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Lite mode. There is deliberately nothing to assert about a "mode" here — the
 * CLI has no mode input, takes no flag that could disable it, and `finalise`
 * runs in full in every mode. That absence IS the guarantee, and this test pins
 * it: the CLI's entire argument surface is asserted, so a future `--skip-in-lite`
 * or any other mode-conditional switch cannot be added without this failing and
 * forcing the question to be answered deliberately. Lite mode has skipped
 * side-effects in this pipeline before, which is why the task asked for it.
 */
test("no argument can make the tick conditional on pipeline mode", () => {
  const source = readFileSync(CLI, "utf8");
  const flags = [...source.matchAll(/a === "(--[a-z-]+)"/g)]
    .map((m) => m[1])
    .sort();
  assert.deepEqual(
    flags,
    ["--dry-run", "--file", "--help", "--json", "--registry"],
    "registry-tick accepts no mode flag; adding one would let lite mode skip the tick",
  );
  const { dir, registry } = sandbox([row(20, "lam", "planned")]);
  try {
    const f = writeDoc(dir, 20, "lam", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.match(readFileSync(registry, "utf8"), /^\| 20 \|.*\| accepted \|/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A CRLF registry must come back as CRLF.
 *
 * `split(/\r?\n/).join("\n")` rewrites every line ending in the file, turning a
 * one-cell tick into a whole-file diff — the same harm the width preservation
 * above exists to prevent, in the other dimension, and invisible in a rendered
 * diff view. Found by probing the rewrite path during the adversarial pass over
 * this cycle's own fixes, not by reading it.
 */
test("the registry's line endings survive the rewrite", () => {
  const { dir, registry } = sandbox([row(23, "omi", "planned")]);
  try {
    const crlf = readFileSync(registry, "utf8").replace(/\n/g, "\r\n");
    writeFileSync(registry, crlf);
    const before = (crlf.match(/\r\n/g) || []).length;
    assert.ok(before > 0, "fixture should actually be CRLF");

    const f = writeDoc(dir, 23, "omi", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");

    const after = readFileSync(registry, "utf8");
    assert.equal(
      (after.match(/\r\n/g) || []).length,
      before,
      "a CRLF registry must not be silently normalised to LF",
    );
    assert.match(after, /^\| 23 \|.*accepted/m);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an unknown flag is a usage error, not a silent no-op", () => {
  const { dir } = sandbox([row(21, "mu", "planned")]);
  try {
    const f = writeDoc(dir, 21, "mu", { status: "accepted" });
    let code = 0;
    try {
      execFileSync(
        process.execPath,
        [CLI, "--file", path.relative(dir, f), "--bogus"],
        {
          cwd: dir,
          encoding: "utf8",
          stdio: "pipe",
        },
      );
    } catch (e) {
      code = e.status;
    }
    assert.equal(code, 2, "an unrecognised flag must exit 2");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
