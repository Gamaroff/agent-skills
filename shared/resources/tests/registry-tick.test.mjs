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
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  // Every accepted flag appears as `a === "--x"` in parseArgs — value-taking
  // flags may share one comparison (`a === "--pr" || a === "--issue"`), which
  // this pattern still catches one flag at a time.
  const flags = [
    ...new Set([...source.matchAll(/a === "(--[a-z-]+)"/g)].map((m) => m[1])),
  ].sort();
  // `--annotate` (task.113) selects the SECOND write — the post-merge notes /
  // Issue cell — and `--pr` / `--issue` are its operands. None of the three
  // gates the Status tick: the default invocation still ticks unconditionally,
  // which the run below proves. What this list forbids is a flag that makes
  // the tick itself skippable (a `--lite`, a `--mode`), and a new entry here
  // needs the same argument made for it. `--bug-status` (task 219) selects a
  // third write to a different registry; a task document still ticks.
  // `--stage` (task 245) adds an index write AFTER the tick; the tick itself
  // is unchanged and still runs unconditionally.
  assert.deepEqual(
    flags,
    [
      "--annotate",
      "--bug-status",
      "--dry-run",
      "--file",
      "--help",
      "--issue",
      "--json",
      "--pr",
      "--registry",
      "--stage",
    ],
    "registry-tick accepts no flag that makes the Status tick conditional; --annotate selects a different write, it does not skip this one",
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

/**
 * A MIXED-ending file must come back exactly as it went in, apart from the one
 * cell.
 *
 * This is the case an "is the file CRLF?" heuristic gets backwards: it sees one
 * CRLF, decides the whole file is CRLF, and converts every LF line. Such a file
 * is already pathological — but a tool that makes it *more* inconsistent while
 * claiming to preserve line endings is worse than one that never claimed to.
 *
 * Keeping the separators through the split is what makes this hold without a
 * rule: only the target line is ever rewritten.
 */
test("a mixed-ending registry is preserved byte-for-byte apart from the cell", () => {
  const { dir, registry } = sandbox([row(24, "pi2", "planned")]);
  try {
    const lf = readFileSync(registry, "utf8");
    // Make exactly the header line CRLF, leave the rest LF.
    const mixed = lf.replace("# Task Registry\n", "# Task Registry\r\n");
    writeFileSync(registry, mixed);

    const f = writeDoc(dir, 24, "pi2", { status: "accepted" });
    assert.equal(run(dir, ["--file", path.relative(dir, f)]).reason, "ticked");

    const after = readFileSync(registry, "utf8");
    assert.equal(
      (after.match(/\r\n/g) || []).length,
      1,
      "the single CRLF must stay one CRLF — not spread to every line, not removed",
    );
    // Everything except the ticked line is byte-identical.
    const strip = (t) =>
      t
        .split("\n")
        .filter((l) => !l.startsWith("| 24 |"))
        .join("\n");
    assert.equal(strip(after), strip(mixed), "no other byte should change");
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

// ---------------------------------------------------------------------------
// `--annotate` — the second, additive write (task.113).
//
// Same discipline as above: every test RUNS the CLI against a throwaway
// registry and asserts the bytes. The mode exists so that develop-next Step 4
// calls a command a test has already exercised, instead of describing a sed.
// ---------------------------------------------------------------------------

function annotatedRow(dir, registry, n) {
  return readFileSync(path.join(dir, registry), "utf8")
    .split("\n")
    .find((l) => l.startsWith(`| ${n} |`));
}

test("annotate: appends `PR #n merged` to the last cell, replacing a lone `—`", () => {
  const { dir } = sandbox([row(30, "alpha", "accepted")]);
  try {
    const f = writeDoc(dir, 30, "alpha", { status: "accepted" });
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "410",
    ]);
    assert.equal(res.reason, "annotated");
    assert.equal(res.notes, "written");
    assert.equal(res.issue, "not-requested");
    const cells = annotatedRow(dir, "docs/tasks/task-registry.md", 30).split(
      "|",
    );
    assert.equal(cells[8].trim(), "PR #410 merged");
    // Status untouched — finalise owns it.
    assert.equal(cells[3].trim(), "accepted");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: an existing note is kept and the PR is appended with ` · `", () => {
  const { dir } = sandbox([
    `| 31 | [T31](task.31.beta/task.31.beta.md) | accepted | infrastructure | Medium | 2026-01-01 | — | task.30 |`,
  ]);
  try {
    const f = writeDoc(dir, 31, "beta", { status: "accepted" });
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "411",
    ]);
    assert.equal(res.reason, "annotated");
    const cells = annotatedRow(dir, "docs/tasks/task-registry.md", 31).split(
      "|",
    );
    assert.equal(cells[8].trim(), "task.30 · PR #411 merged");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: a second run reports `already` and writes nothing", () => {
  const { dir, registry } = sandbox([row(32, "gamma", "accepted")]);
  try {
    const f = writeDoc(dir, 32, "gamma", { status: "accepted" });
    run(dir, ["--annotate", "--file", path.relative(dir, f), "--pr", "412"]);
    const before = readFileSync(registry, "utf8");
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "412",
    ]);
    assert.equal(res.reason, "already");
    assert.equal(res.annotated, false);
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: `--issue` fills an empty Issue cell, found by header name", () => {
  const { dir } = sandbox([row(33, "delta", "accepted")]);
  try {
    const f = writeDoc(dir, 33, "delta", { status: "accepted" });
    const link = "[#500](https://example.com/issues/500)";
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "413",
      "--issue",
      link,
    ]);
    assert.equal(res.reason, "annotated");
    assert.equal(res.issue, "written");
    const cells = annotatedRow(dir, "docs/tasks/task-registry.md", 33).split(
      "|",
    );
    assert.equal(cells[7].trim(), link);
    assert.equal(cells[8].trim(), "PR #413 merged");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: `--issue` never overwrites a filled Issue cell — a human may have linked it", () => {
  const { dir } = sandbox([
    `| 34 | [T34](task.34.eps/task.34.eps.md) | accepted | infrastructure | Medium | 2026-01-01 | [#7](https://example.com/issues/7) | — |`,
  ]);
  try {
    const f = writeDoc(dir, 34, "eps", { status: "accepted" });
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "414",
      "--issue",
      "[#8](x)",
    ]);
    assert.equal(res.reason, "annotated"); // the notes cell was still written
    assert.equal(res.issue, "kept");
    const cells = annotatedRow(dir, "docs/tasks/task-registry.md", 34).split(
      "|",
    );
    assert.equal(cells[7].trim(), "[#7](https://example.com/issues/7)");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: a bug document answers `not-a-task` — the bug registry has no cell to write", () => {
  const { dir, registry } = sandbox([row(35, "zeta", "accepted")]);
  try {
    const d = path.join(dir, "docs", "bugs", "bug.9.slug");
    mkdirSync(d, { recursive: true });
    const f = path.join(d, "bug.9.slug.md");
    writeFileSync(f, doc({ type: "bug", status: "closed" }));
    const before = readFileSync(registry, "utf8");
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "415",
    ]);
    assert.equal(res.reason, "not-a-task");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A task bug's filename carries the task's stem — `task.67.bug.3.name.md` — and
 * in its header-block shape (the frontmatter-less form bug-doc.js reads) it has
 * no `type:` to contradict it. Before task.125 the stem match read it as task
 * 67 and answered `not-accepted` (the BUG's status), which finalise's Step 7.4
 * table turns into "investigate"; a `status: accepted` bug would have TICKED
 * task 67's row. The `.bug.<N>.` segment decides before the stem does.
 */
test("a header-block TASK BUG (no type:, task stem) answers `not-a-task` and never touches the registry", () => {
  const { dir, registry } = sandbox([row(67, "parent", "accepted")]);
  try {
    const d = path.join(dir, "docs", "tasks", "task.67.parent");
    mkdirSync(d, { recursive: true });
    const f = path.join(d, "task.67.bug.3.header-shape.md");
    // No frontmatter at all — the header-block shape.
    writeFileSync(
      f,
      "# Bug Report: something\n\n**Bug ID**: task.67.bug.3\n**Status**: ✅ Ready for QA\n\n## Bug Description\n",
    );
    const before = readFileSync(registry, "utf8");
    for (const args of [
      ["--file", path.relative(dir, f)],
      ["--annotate", "--file", path.relative(dir, f), "--pr", "447"],
    ]) {
      const res = run(dir, args);
      assert.equal(res.reason, "not-a-task", JSON.stringify(res));
      assert.notEqual(res.ticked, true);
    }
    assert.equal(
      readFileSync(registry, "utf8"),
      before,
      "the parent task's row is untouched",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a frontmatter TASK BUG with `status: accepted` cannot tick its parent task's row", () => {
  const { dir, registry } = sandbox([row(68, "parent", "planned")]);
  try {
    const d = path.join(dir, "docs", "tasks", "task.68.parent");
    mkdirSync(d, { recursive: true });
    const f = path.join(d, "task.68.bug.1.x.md");
    // `type: bug` would already refuse; the stem rule must refuse even when the
    // type line is absent and the status happens to read accepted.
    writeFileSync(f, doc({ status: "accepted" }).replace(/^type:.*\n/m, ""));
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "not-a-task");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: a task with no row reports `no-row` and exits 0", () => {
  const { dir } = sandbox([row(36, "eta", "accepted")]);
  try {
    const f = writeDoc(dir, 37, "theta", { status: "accepted" });
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "416",
    ]);
    assert.equal(res.reason, "no-row");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: does not require the document to be `accepted` — a merge is a fact about the PR", () => {
  const { dir } = sandbox([row(38, "iota", "accepted")]);
  try {
    const f = writeDoc(dir, 38, "iota", { status: "ready-for-review" });
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "417",
    ]);
    assert.equal(res.reason, "annotated");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: a registry whose last column is a data column answers `no-cell` and writes nothing (QA-3)", () => {
  // Six columns, ending in Created — no notes column. The earlier numeric
  // guard passed this and rewrote the Created cell.
  const dir = mkdtempSync(path.join(os.tmpdir(), "registry-tick-"));
  try {
    mkdirSync(path.join(dir, "skills", "develop-next", "scripts"), {
      recursive: true,
    });
    symlinkSync(
      path.join(REPO_ROOT, SELECTOR_REL),
      path.join(dir, SELECTOR_REL),
    );
    mkdirSync(path.join(dir, "docs", "tasks"), { recursive: true });
    const registry = path.join(dir, "docs", "tasks", "task-registry.md");
    writeFileSync(
      registry,
      [
        "| # | Title | Status | Category | Priority | Created |",
        "|---|-------|--------|----------|----------|---------|",
        "| 39 | [T39](task.39.kap/task.39.kap.md) | accepted | infra | Medium | 2026-01-01 |",
        "",
      ].join("\n"),
    );
    const f = writeDoc(dir, 39, "kap", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "418",
    ]);
    assert.equal(res.reason, "no-cell");
    assert.equal(res.lastColumn, "created");
    assert.equal(
      readFileSync(registry, "utf8"),
      before,
      "a data cell must never be annotated",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: the header is the row's OWN table's — an earlier legend table cannot supply it (QA-6)", () => {
  const { dir, registry } = sandbox([row(42, "nu", "accepted")]);
  try {
    // Prepend an unrelated two-column table whose first data column is named
    // `Issue`, separated from the registry by prose and a bare `---` rule.
    const text = readFileSync(registry, "utf8");
    writeFileSync(
      registry,
      [
        "| Issue | Meaning |",
        "|-------|---------|",
        "| x | y |",
        "",
        "Some prose.",
        "",
        "---",
        "",
        text,
      ].join("\n"),
    );
    const f = writeDoc(dir, 42, "nu", { status: "accepted" });
    const link = "[#9](https://example.com/issues/9)";
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "420",
      "--issue",
      link,
    ]);
    assert.equal(res.reason, "annotated");
    assert.equal(
      res.issue,
      "written",
      "the Issue cell comes from the registry's own header, column 7",
    );
    const cells = annotatedRow(dir, "docs/tasks/task-registry.md", 42).split(
      "|",
    );
    assert.equal(cells[7].trim(), link);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: a headerless table answers `no-cell` — the walk never reaches an earlier table's header (QA-6)", () => {
  // The registry table below has NO header of its own; a legend table sits
  // above it, separated by prose. An unbounded walk would adopt the legend's
  // header (`| Issue | Meaning |`), read `Meaning` as a notes column and
  // annotate the headerless row. The parser accepts a headerless table by
  // documented column positions, so the row IS found — the refusal has to
  // come from the header resolution.
  const dir = mkdtempSync(path.join(os.tmpdir(), "registry-tick-"));
  try {
    mkdirSync(path.join(dir, "skills", "develop-next", "scripts"), {
      recursive: true,
    });
    symlinkSync(
      path.join(REPO_ROOT, SELECTOR_REL),
      path.join(dir, SELECTOR_REL),
    );
    mkdirSync(path.join(dir, "docs", "tasks"), { recursive: true });
    const registry = path.join(dir, "docs", "tasks", "task-registry.md");
    writeFileSync(
      registry,
      [
        "| Issue | Meaning |",
        "|-------|---------|",
        "| x | y |",
        "",
        "Some prose between the tables.",
        "",
        row(44, "omi", "accepted"),
        "",
      ].join("\n"),
    );
    const f = writeDoc(dir, 44, "omi", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "422",
      "--issue",
      "[#1](x)",
    ]);
    assert.equal(res.reason, "no-cell");
    assert.match(res.message, /no table header/);
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: refuses a row that does not read `accepted` — the note would be a phantom dependency (QA-8)", () => {
  const { dir, registry } = sandbox([row(45, "pi", "ready-for-review")]);
  try {
    const f = writeDoc(dir, 45, "pi", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "423",
    ]);
    assert.equal(res.reason, "not-accepted");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: a GFM delimiter row of any shape is a separator (QA-10)", () => {
  for (const sep of [
    "| - | - | - | - | - | - | - | - |",
    "|:--|:--|:--|:--|:--|:--|:--|--:|",
  ]) {
    const dir = mkdtempSync(path.join(os.tmpdir(), "registry-tick-"));
    try {
      mkdirSync(path.join(dir, "skills", "develop-next", "scripts"), {
        recursive: true,
      });
      symlinkSync(
        path.join(REPO_ROOT, SELECTOR_REL),
        path.join(dir, SELECTOR_REL),
      );
      mkdirSync(path.join(dir, "docs", "tasks"), { recursive: true });
      const registry = path.join(dir, "docs", "tasks", "task-registry.md");
      writeFileSync(
        registry,
        [REGISTRY_HEADER[4], sep, row(46, "rho", "accepted"), ""].join("\n"),
      );
      const f = writeDoc(dir, 46, "rho", { status: "accepted" });
      const res = run(dir, [
        "--annotate",
        "--file",
        path.relative(dir, f),
        "--pr",
        "424",
        "--issue",
        "[#2](y)",
      ]);
      assert.equal(res.reason, "annotated", `separator ${sep}`);
      assert.equal(res.issue, "written", `separator ${sep}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("annotate: every annotate-mode outcome carries `annotated`, never `ticked` (QA-13)", () => {
  const { dir } = sandbox([row(47, "sig", "accepted")]);
  try {
    const f = writeDoc(dir, 48, "tau", { status: "accepted" }); // no row 48 → no-row, a shared early exit
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "425",
    ]);
    assert.equal(res.reason, "no-row");
    assert.equal(res.annotated, false);
    assert.equal("ticked" in res, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: `none` / `n/a` / `TBD` count as empty, as the selector reads them (QA-14)", () => {
  const { dir } = sandbox([
    `| 49 | [T49](task.49.ups/task.49.ups.md) | accepted | infrastructure | Medium | 2026-01-01 | TBD | none |`,
  ]);
  try {
    const f = writeDoc(dir, 49, "ups", { status: "accepted" });
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "426",
      "--issue",
      "[#3](z)",
    ]);
    assert.equal(res.reason, "annotated");
    assert.equal(
      res.issue,
      "written",
      "a TBD Issue cell is empty and gets filled",
    );
    const cells = annotatedRow(dir, "docs/tasks/task-registry.md", 49).split(
      "|",
    );
    assert.equal(cells[7].trim(), "[#3](z)");
    assert.equal(
      cells[8].trim(),
      "PR #426 merged",
      "a `none` notes cell is replaced, not appended to",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every value-taking flag rejects a missing or flag-shaped value (CR-2, PR review)", () => {
  const { dir } = sandbox([row(50, "phi", "accepted")]);
  try {
    const f = writeDoc(dir, 50, "phi", { status: "accepted" });
    for (const args of [
      ["--file"],
      ["--file", "--json"],
      ["--file", path.relative(dir, f), "--registry"],
      ["--file", path.relative(dir, f), "--registry", "--json"],
    ]) {
      let code = 0;
      try {
        execFileSync(process.execPath, [CLI, ...args], {
          cwd: dir,
          encoding: "utf8",
          stdio: "pipe",
        });
      } catch (e) {
        code = e.status;
      }
      assert.equal(code, 2, `${args.join(" ")} must be a usage error`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: `--issue` rejects a missing value, an empty value, a pipe and a newline — exit 2, nothing written (QA-2)", () => {
  const { dir, registry } = sandbox([row(43, "xi", "accepted")]);
  try {
    const f = writeDoc(dir, 43, "xi", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const cases = [
      ["--issue"], // missing value (last argument)
      ["--issue", ""], // empty
      ["--issue", "   "], // whitespace only
      ["--issue", "x | y"], // pipe adds a cell
      ["--issue", "a\nb"], // newline splits the row
      ["--issue", "a\rb"], // CR
    ];
    for (const extra of cases) {
      let code = 0;
      try {
        execFileSync(
          process.execPath,
          [
            CLI,
            "--annotate",
            "--file",
            path.relative(dir, f),
            "--pr",
            "421",
            ...extra,
            "--json",
          ],
          { cwd: dir, encoding: "utf8", stdio: "pipe" },
        );
      } catch (e) {
        code = e.status;
      }
      assert.equal(code, 2, `${JSON.stringify(extra)} must be a usage error`);
      assert.equal(
        readFileSync(registry, "utf8"),
        before,
        `${JSON.stringify(extra)} must write nothing`,
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: `--dry-run` reports what it would write and writes nothing", () => {
  const { dir, registry } = sandbox([row(40, "lam", "accepted")]);
  try {
    const f = writeDoc(dir, 40, "lam", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "419",
      "--dry-run",
    ]);
    assert.equal(res.reason, "dry-run");
    assert.equal(res.notes, "written");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("annotate: `--annotate` without `--pr` is a usage error (exit 2), and `--pr` without `--annotate` too", () => {
  const { dir } = sandbox([row(41, "mu", "accepted")]);
  try {
    const f = writeDoc(dir, 41, "mu", { status: "accepted" });
    for (const args of [["--annotate"], ["--pr", "1"]]) {
      let code = 0;
      try {
        execFileSync(
          process.execPath,
          [CLI, "--file", path.relative(dir, f), ...args],
          {
            cwd: dir,
            encoding: "utf8",
            stdio: "pipe",
          },
        );
      } catch (e) {
        code = e.status;
      }
      assert.equal(code, 2, `${args.join(" ")} must exit 2`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── bug.19: a row the parser rejected is not a missing row ───────────────────

/**
 * A sandbox whose registry is written verbatim, for registry shapes other than
 * the documented one. Same selector symlink as `sandbox()`.
 */
function rawSandbox(lines) {
  const { dir, registry } = sandbox([]);
  writeFileSync(registry, [...lines, ""].join("\n"));
  return { dir, registry };
}

// The consumer shape from GitHub #643: plain title, path in its own column.
const DOC_COLUMN_HEADER = [
  "| # | Title | Category | Priority | Icon | Status | Tracker | Document |",
  "|---|---|---|---|---|---|---|---|",
];
const docColumnRow = (n, slug, status) =>
  `| ${n} | Plain title ${n} | infrastructure | High | ⚠️ | ${status} | X-${n} | \`docs/tasks/task.${n}.${slug}/task.${n}.${slug}.md\` |`;

test("bug.19: a plain-title registry with a Document column ticks — never `no-row`", () => {
  const { dir, registry } = rawSandbox([
    ...DOC_COLUMN_HEADER,
    docColumnRow(47, "me", "ready-for-review"),
  ]);
  try {
    const f = writeDoc(dir, 47, "me", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    const line = readFileSync(registry, "utf8")
      .split("\n")
      .find((l) => l.startsWith("| 47 |"));
    assert.equal(
      line,
      docColumnRow(47, "me", "accepted").replace(
        "| accepted |",
        "| accepted         |",
      ),
      "only the Status cell changes, width preserved; the path cell is untouched",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a `Task Number … File` registry ticks — the id header is read by name", () => {
  // Same shape as the Document-column registry above, headed `Task Number` and `File`.
  // Before `task number` was an id alias, every row here was `row-malformed`.
  const { dir, registry } = rawSandbox([
    "| Task Number | Title | Category | Priority | Icon | Status | Tracker | File |",
    "|---|---|---|---|---|---|---|---|",
    docColumnRow(49, "tn", "ready-for-review"),
  ]);
  try {
    const f = writeDoc(dir, 49, "tn", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    const line = readFileSync(registry, "utf8")
      .split("\n")
      .find((l) => l.startsWith("| 49 |"));
    assert.match(line, /\| accepted +\|/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bug.19: a row the parser rejects reports `row-malformed` with the parser's reason and line", () => {
  // Plain title and no document column: the parser has nowhere to find a path.
  const { dir, registry } = rawSandbox([
    "| # | Title | Status | Category | Priority | Created | Issue | Depends on |",
    "|---|---|---|---|---|---|---|---|",
    "| 48 | Plain title | ready-for-review | infrastructure | High | 2026-01-01 | — | — |",
  ]);
  try {
    const f = writeDoc(dir, 48, "plain", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    for (const extra of [[], ["--annotate", "--pr", "12"]]) {
      const res = run(dir, ["--file", path.relative(dir, f), ...extra]);
      assert.equal(
        res.reason,
        "row-malformed",
        `mode ${extra.join(" ") || "tick"}`,
      );
      assert.equal(res.exitCode, 0);
      assert.equal(res.line, 3);
      assert.match(res.parserReason, /no \[title\]\(story\|task\|bug/);
      assert.match(res.message, /line 3 is task 48's row/);
    }
    assert.equal(readFileSync(registry, "utf8"), before, "nothing written");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bug.19: a genuinely absent row is still `no-row` when other rows are malformed", () => {
  const { dir } = rawSandbox([
    "| # | Title | Status | Category | Priority | Created | Issue | Depends on |",
    "|---|---|---|---|---|---|---|---|",
    "| 48 | Plain title | ready-for-review | infrastructure | High | 2026-01-01 | — | — |",
  ]);
  try {
    const f = writeDoc(dir, 49, "absent", { status: "accepted" });
    assert.equal(run(dir, ["--file", path.relative(dir, f)]).reason, "no-row");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bug.19: annotate never writes a note into the Document column", () => {
  const { dir, registry } = rawSandbox([
    ...DOC_COLUMN_HEADER,
    docColumnRow(50, "doc", "accepted"),
  ]);
  try {
    const f = writeDoc(dir, 50, "doc", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, [
      "--annotate",
      "--file",
      path.relative(dir, f),
      "--pr",
      "12",
    ]);
    assert.equal(res.reason, "no-cell");
    assert.equal(res.lastColumn, "document");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── --bug-status: the general-bug registry row (task 219) ───────────────────

const BUG_REGISTRY_HEADER = [
  "# Bug Registry",
  "",
  "**Last Updated:** 2026-01-01",
  "**Next Available Bug Number:** **9**",
  "",
  "| #   | Title | Status | Severity | Priority | Created | Area |",
  "| --- | ----- | ------ | -------- | -------- | ------- | ---- |",
];

function bugRow(n, status) {
  return `| ${n} | [B${n}](bug.${n}.b${n}/bug.${n}.b${n}.md) | ${status} | Major | High | 2026-01-01 | area |`;
}

/**
 * A sandbox with `docs/bugs/bug-registry.md` and the real selector symlinked,
 * as `sandbox()` does for the task registry. `rows` are the registry's table
 * rows; `eol` lets a test write a CRLF registry.
 */
function bugSandbox(rows, { eol = "\n" } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "registry-tick-bug-"));
  mkdirSync(path.join(dir, "skills", "develop-next", "scripts"), {
    recursive: true,
  });
  symlinkSync(path.join(REPO_ROOT, SELECTOR_REL), path.join(dir, SELECTOR_REL));
  mkdirSync(path.join(dir, "docs", "bugs"), { recursive: true });
  const registry = path.join(dir, "docs", "bugs", "bug-registry.md");
  writeFileSync(registry, [...BUG_REGISTRY_HEADER, ...rows, ""].join(eol));
  return { dir, registry };
}

/** Write a general bug file `docs/bugs/bug.N.bN/bug.N.bN.md` with `status`. */
function writeBug(
  dir,
  n,
  status,
  { name = `bug.${n}.b${n}`, type = "bug" } = {},
) {
  const d = path.join(dir, "docs", "bugs", `bug.${n}.b${n}`);
  mkdirSync(d, { recursive: true });
  const f = path.join(d, `${name}.md`);
  writeFileSync(
    f,
    `---\ntype: ${type}\nstatus: ${status} # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened\n---\n\n# Bug\n`,
  );
  return path.relative(dir, f);
}

const rowOf = (registry, n) =>
  readFileSync(registry, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`| ${n} |`));

/** Lines of `after` that differ from `before`, by index. */
function changedLines(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  assert.equal(a.length, b.length, "the rewrite must not add or drop lines");
  return a.map((l, i) => (l === b[i] ? null : i)).filter((i) => i !== null);
}

const { BUG_STATUS_LABELS, normaliseBugRegistryStatus } = createRequire(
  import.meta.url,
)(CLI);
const { BUG_LIFECYCLE_STATUSES } = await import(
  pathToFileURL(path.join(REPO_ROOT, SELECTOR_REL)).href
);

test("--bug-status: the label map covers exactly the bug lifecycle", () => {
  // The map is this file's; the lifecycle is select-next's. A sixth status
  // added to one and not the other would write `undefined` into a row.
  assert.deepEqual(
    Object.keys(BUG_STATUS_LABELS).sort(),
    [...BUG_LIFECYCLE_STATUSES].sort(),
  );
});

for (const status of Object.keys(BUG_STATUS_LABELS)) {
  test(`--bug-status: token registry — \`${status}\` is written as the token, one line changed`, () => {
    const start = status === "new" ? "closed" : "new";
    const { dir, registry } = bugSandbox([
      bugRow(1, "closed"),
      bugRow(2, "closed"),
      bugRow(3, start),
    ]);
    try {
      const f = writeBug(dir, 3, status);
      const before = readFileSync(registry, "utf8");
      const res = run(dir, ["--bug-status", "--file", f]);
      assert.equal(res.reason, "mirrored");
      assert.equal(res.vocabulary, "token");
      assert.equal(res.to, status);
      assert.equal(res.mirrored, true);
      assert.equal(
        res.ticked,
        undefined,
        "bug-status payloads carry `mirrored`, not `ticked`",
      );
      const after = readFileSync(registry, "utf8");
      assert.deepEqual(changedLines(before, after), [
        before.split("\n").findIndex((l) => l.startsWith("| 3 |")),
      ]);
      assert.equal(rowOf(registry, 3).split("|")[3].trim(), status);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test(`--bug-status: label registry — \`${status}\` is written as \`${BUG_STATUS_LABELS[status]}\`, one line changed`, () => {
    const start = status === "new" ? "✅ Closed" : "🆕 New";
    const { dir, registry } = bugSandbox([
      bugRow(1, "✅ Closed"),
      bugRow(2, "🔧 In Progress"),
      bugRow(3, start),
    ]);
    try {
      const f = writeBug(dir, 3, status);
      const before = readFileSync(registry, "utf8");
      const res = run(dir, ["--bug-status", "--file", f]);
      assert.equal(res.reason, "mirrored");
      assert.equal(res.vocabulary, "label");
      assert.equal(res.to, BUG_STATUS_LABELS[status]);
      const after = readFileSync(registry, "utf8");
      assert.equal(changedLines(before, after).length, 1);
      assert.equal(
        rowOf(registry, 3).split("|")[3].trim(),
        BUG_STATUS_LABELS[status],
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("--bug-status: a row already in the file's status and vocabulary answers `already` and writes nothing", () => {
  for (const [rows, cell] of [
    [[bugRow(1, "closed"), bugRow(2, "ready-for-qa")], "token"],
    [[bugRow(1, "✅ Closed"), bugRow(2, "🔍 Ready for QA")], "label"],
  ]) {
    const { dir, registry } = bugSandbox(rows);
    try {
      const f = writeBug(dir, 2, "ready-for-qa");
      const before = readFileSync(registry, "utf8");
      const res = run(dir, ["--bug-status", "--file", f]);
      assert.equal(res.reason, "already", cell);
      assert.equal(res.mirrored, false);
      assert.equal(readFileSync(registry, "utf8"), before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

/**
 * The control case (obs #176): the target row holds the RIGHT status in the
 * WRONG vocabulary. The vocabulary comes from the other rows, so the plain token
 * in an emoji registry is healed to the label — and is not `already`.
 */
test("--bug-status: a plain token in a label registry is healed to the label", () => {
  const { dir, registry } = bugSandbox([
    bugRow(1, "✅ Closed"),
    bugRow(2, "✅ Closed"),
    bugRow(3, "closed"),
  ]);
  try {
    const f = writeBug(dir, 3, "closed");
    const res = run(dir, ["--bug-status", "--file", f]);
    assert.equal(res.reason, "mirrored");
    assert.equal(res.from, "closed");
    assert.equal(res.to, "✅ Closed");
    assert.equal(rowOf(registry, 3).split("|")[3].trim(), "✅ Closed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status: a mixed registry writes the label only when labels are a strict majority of the other rows", () => {
  for (const [others, want] of [
    [["✅ Closed", "✅ Closed", "closed"], "label"],
    [["✅ Closed", "closed"], "token"], // a tie writes the token
    [["closed", "closed", "✅ Closed"], "token"],
    [[], "token"], // no other rows
  ]) {
    const rows = others.map((s, i) => bugRow(i + 1, s));
    const { dir } = bugSandbox([...rows, bugRow(8, "new")]);
    try {
      const f = writeBug(dir, 8, "in-progress");
      const res = run(dir, ["--bug-status", "--file", f]);
      assert.equal(res.reason, "mirrored", JSON.stringify(others));
      assert.equal(res.vocabulary, want, JSON.stringify(others));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("--bug-status: a CRLF registry keeps CRLF and changes only the target line", () => {
  const { dir, registry } = bugSandbox(
    [bugRow(1, "closed"), bugRow(2, "reopened")],
    { eol: "\r\n" },
  );
  try {
    const f = writeBug(dir, 2, "ready-for-qa");
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--bug-status", "--file", f]);
    assert.equal(res.reason, "mirrored");
    const after = readFileSync(registry, "utf8");
    assert.equal(
      after,
      before.replace("| reopened |", "| ready-for-qa |"),
      "exactly the one cell changes; every CRLF survives",
    );
    assert.equal(after.split("\r\n").length, before.split("\r\n").length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status: a task bug answers `not-a-general-bug` and writes nothing", () => {
  const { dir, registry } = bugSandbox([bugRow(3, "new")]);
  try {
    const d = path.join(dir, "docs", "tasks", "task.67.parent");
    mkdirSync(d, { recursive: true });
    const f = path.join(d, "task.67.bug.3.x.md");
    writeFileSync(f, doc({ type: "bug", status: "in-progress" }));
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--bug-status", "--file", path.relative(dir, f)]);
    assert.equal(res.reason, "not-a-general-bug");
    assert.equal(res.mirrored, false);
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status: a task document answers `not-a-general-bug`", () => {
  const { dir, registry } = bugSandbox([bugRow(3, "new")]);
  try {
    const f = writeDoc(dir, 3, "alpha", { status: "accepted" });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--bug-status", "--file", path.relative(dir, f)]);
    assert.equal(res.reason, "not-a-general-bug");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status: a `bug.N.` file whose type is not `bug` answers `not-a-general-bug`", () => {
  const { dir, registry } = bugSandbox([bugRow(3, "new")]);
  try {
    const f = writeBug(dir, 3, "in-progress", {
      type: "implementation-report",
    });
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--bug-status", "--file", f]);
    assert.equal(res.reason, "not-a-general-bug");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a general bug WITHOUT --bug-status still answers `not-a-task` (the finalise --bug contract)", () => {
  const { dir, registry } = bugSandbox([bugRow(4, "ready-for-qa")]);
  try {
    const f = writeBug(dir, 4, "closed");
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--file", f]);
    assert.equal(res.reason, "not-a-task");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status: a status outside the lifecycle answers `not-a-lifecycle-status` and writes nothing", () => {
  const { dir, registry } = bugSandbox([bugRow(5, "new")]);
  try {
    const f = writeBug(dir, 5, "fixed");
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--bug-status", "--file", f]);
    assert.equal(res.reason, "not-a-lifecycle-status");
    assert.equal(res.status, "fixed");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status: no row → `no-row`; a rejected row → `row-malformed`, never `no-row`", () => {
  const { dir } = bugSandbox([bugRow(1, "closed")]);
  try {
    const f = writeBug(dir, 6, "in-progress");
    assert.equal(run(dir, ["--bug-status", "--file", f]).reason, "no-row");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // A row with an empty status cell: the parser keeps it in `malformed`.
  const { dir: dir2 } = bugSandbox([
    bugRow(1, "closed"),
    "| 6 | [B6](bug.6.b6/bug.6.b6.md) |  | Major | High | 2026-01-01 | area |",
  ]);
  try {
    const f = writeBug(dir2, 6, "in-progress");
    const res = run(dir2, ["--bug-status", "--file", f]);
    assert.equal(res.reason, "row-malformed");
    assert.match(res.parserReason, /empty status cell/);
  } finally {
    rmSync(dir2, { recursive: true, force: true });
  }
});

test("--bug-status: two cells reading the status answer `ambiguous-row` and write nothing", () => {
  const { dir, registry } = bugSandbox([
    bugRow(1, "closed"),
    "| 7 | [B7](bug.7.b7/bug.7.b7.md) | new | Major | High | 2026-01-01 | new |",
  ]);
  try {
    const f = writeBug(dir, 7, "in-progress");
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--bug-status", "--file", f]);
    assert.equal(res.reason, "ambiguous-row");
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status: no registry → `no-registry`", () => {
  const { dir, registry } = bugSandbox([]);
  try {
    rmSync(registry);
    const f = writeBug(dir, 1, "new");
    assert.equal(run(dir, ["--bug-status", "--file", f]).reason, "no-registry");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--bug-status --dry-run reports the write and leaves the registry byte-identical", () => {
  const { dir, registry } = bugSandbox([bugRow(1, "closed"), bugRow(2, "new")]);
  try {
    const f = writeBug(dir, 2, "in-progress");
    const before = readFileSync(registry, "utf8");
    const res = run(dir, ["--bug-status", "--dry-run", "--file", f]);
    assert.equal(res.reason, "dry-run");
    assert.equal(res.to, "in-progress");
    assert.equal(res.mirrored, false);
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Counts every fs read and write of the registry inside the CLI process, so the
// task's "one registry read, at most one write per call" bound is asserted
// rather than read off the source. Loaded with `node --require`; the counts are
// written to $REGISTRY_IO_COUNTS when the process exits.
const REGISTRY_IO_PRELOAD = `
const fs = require("fs");
const path = require("path");
const counts = { reads: 0, writes: 0 };
const isRegistry = (p) =>
  typeof p === "string" &&
  path.resolve(p).endsWith(path.join("docs", "bugs", "bug-registry.md"));
for (const [obj, name, kind] of [
  [fs, "readFileSync", "reads"], [fs, "readFile", "reads"],
  [fs.promises, "readFile", "reads"], [fs, "writeFileSync", "writes"],
  [fs, "writeFile", "writes"], [fs.promises, "writeFile", "writes"],
]) {
  const orig = obj[name];
  obj[name] = function (p, ...rest) {
    if (isRegistry(p)) counts[kind]++;
    return orig.call(this, p, ...rest);
  };
}
process.on("exit", () => {
  fs.writeFileSync(process.env.REGISTRY_IO_COUNTS, JSON.stringify(counts));
});
`;

function runCounted(cwd, args) {
  const preload = path.join(cwd, "registry-io-preload.cjs");
  const countsFile = path.join(cwd, "registry-io-counts.json");
  writeFileSync(preload, REGISTRY_IO_PRELOAD);
  const out = execFileSync(
    process.execPath,
    ["--require", preload, CLI, ...args, "--json"],
    {
      cwd,
      encoding: "utf8",
      env: { ...process.env, REGISTRY_IO_COUNTS: countsFile },
    },
  );
  return {
    res: JSON.parse(out),
    io: JSON.parse(readFileSync(countsFile, "utf8")),
  };
}

test("--bug-status reads the registry once and writes it at most once per call", () => {
  for (const [label, rows, status, extra, reason, writes] of [
    [
      "mirrored",
      [bugRow(1, "closed"), bugRow(2, "new")],
      "in-progress",
      [],
      "mirrored",
      1,
    ],
    [
      "already",
      [bugRow(1, "closed"), bugRow(2, "new")],
      "new",
      [],
      "already",
      0,
    ],
    [
      "dry-run",
      [bugRow(1, "closed"), bugRow(2, "new")],
      "in-progress",
      ["--dry-run"],
      "dry-run",
      0,
    ],
  ]) {
    const { dir } = bugSandbox(rows);
    try {
      const f = writeBug(dir, 2, status);
      const { res, io } = runCounted(dir, [
        "--bug-status",
        ...extra,
        "--file",
        f,
      ]);
      assert.equal(res.reason, reason, label);
      assert.equal(io.reads, 1, `${label}: registry reads`);
      assert.equal(io.writes, writes, `${label}: registry writes`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("--bug-status with --annotate is a usage error (exit 2) and writes nothing", () => {
  const { dir, registry } = bugSandbox([bugRow(2, "new")]);
  try {
    const f = writeBug(dir, 2, "in-progress");
    const before = readFileSync(registry, "utf8");
    let status = 0;
    try {
      execFileSync(
        process.execPath,
        [CLI, "--bug-status", "--annotate", "--pr", "1", "--file", f],
        { cwd: dir, encoding: "utf8", stdio: "pipe" },
      );
    } catch (e) {
      status = e.status;
    }
    assert.equal(status, 2);
    assert.equal(readFileSync(registry, "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * The CLI gained a `require.main === module` guard so the drift test can import
 * the label map. Two things that guard must not break: requiring the file runs
 * nothing, and invoking it through a SYMLINKED path still runs it — the shape
 * every consumer uses (`.agents/skills/…`), and the one bug 16 found an ESM
 * argv-path guard silently no-op'ing on.
 */
test("requiring registry-tick.js prints nothing and writes nothing", () => {
  const out = execFileSync(
    process.execPath,
    ["-e", `require(${JSON.stringify(CLI)})`],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  assert.equal(out, "");
});

test("--bug-status runs when the CLI is invoked through a symlinked path", () => {
  const { dir, registry } = bugSandbox([bugRow(1, "closed"), bugRow(2, "new")]);
  try {
    const link = path.join(dir, "registry-tick-link.js");
    symlinkSync(CLI, link);
    const f = writeBug(dir, 2, "in-progress");
    const res = JSON.parse(
      execFileSync(
        process.execPath,
        [link, "--bug-status", "--file", f, "--json"],
        {
          cwd: dir,
          encoding: "utf8",
        },
      ),
    );
    assert.equal(res.reason, "mirrored");
    assert.equal(rowOf(registry, 2).split("|")[3].trim(), "in-progress");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("normaliseBugRegistryStatus reads either vocabulary, any case, and nothing else", () => {
  assert.equal(normaliseBugRegistryStatus("🔍 ready for qa"), "ready-for-qa");
  assert.equal(normaliseBugRegistryStatus("  ✅ Closed "), "closed");
  assert.equal(normaliseBugRegistryStatus("REOPENED"), "reopened");
  assert.equal(normaliseBugRegistryStatus("accepted"), null);
  assert.equal(normaliseBugRegistryStatus("🔍 Ready"), null);
  assert.equal(normaliseBugRegistryStatus(""), null);
});

// ── status-icon column: `registry.task.statusIcons` ──────────────────────────

/**
 * The observed consumer shape: a presentational icon column immediately left
 * of Status, with an EMPTY header cell. Before `statusIcons`, the tick wrote
 * `accepted` and left `⚠️`, and the consumer's own drift gate went red.
 */
const ICON_HEADER = [
  "| Task Number | Title | Category | Priority |      | Status           | Jira | File |",
  "| ----------- | ----- | -------- | -------- | ---- | ---------------- | ---- | ---- |",
];
const iconRow = (n, slug, icon, status) =>
  `| ${n} | Plain title ${n} | infrastructure | High | ${icon} | ${status} | X-${n} | \`docs/tasks/task.${n}.${slug}/task.${n}.${slug}.md\` |`;
const ICON_CONFIG = [
  "registry:",
  "  task:",
  "    statusIcons:",
  '      accepted: "✅"',
  '      ready-for-review: "⚠️"',
  '    iconColumn: ""',
  "",
].join("\n");

function iconSandbox(lines, config = ICON_CONFIG) {
  const sb = rawSandbox(lines);
  if (config !== null) {
    writeFileSync(path.join(sb.dir, "skills-config.yaml"), config);
  }
  return sb;
}

/** The cells of task `n`'s row, trimmed — `[icon, status]` for ICON_HEADER. */
function iconAndStatus(registry, n) {
  const line = readFileSync(registry, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`| ${n} |`));
  const cells = line.split("|").map((c) => c.trim());
  return [cells[5], cells[6]];
}

test("statusIcons: an unnamed icon column beside Status is written with the status", () => {
  const { dir, registry } = iconSandbox([
    ...ICON_HEADER,
    iconRow(154, "ic", "⚠️", "ready-for-review"),
  ]);
  try {
    const f = writeDoc(dir, 154, "ic", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.icon, "written");
    assert.deepEqual(iconAndStatus(registry, 154), ["✅", "accepted"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: a re-run on an `accepted` row with a stale icon repairs the icon", () => {
  // The state the bug leaves behind. Without the repair, `already` can never heal it.
  const { dir, registry } = iconSandbox([
    ...ICON_HEADER,
    iconRow(155, "rr", "⚠️", "accepted"),
  ]);
  try {
    const f = writeDoc(dir, 155, "rr", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "already");
    assert.equal(res.icon, "repaired");
    assert.deepEqual(iconAndStatus(registry, 155), ["✅", "accepted"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: no config → the icon is untouched, the bytes are today's, the payload has no `icon`", () => {
  // Two configs that both mean "no icon handling": no file, and a file without the key.
  for (const config of [null, "developNext:\n  baseBranch: develop\n"]) {
    const { dir, registry } = iconSandbox(
      [...ICON_HEADER, iconRow(156, "nc", "⚠️", "ready-for-review")],
      config,
    );
    try {
      const before = readFileSync(registry, "utf8");
      const f = writeDoc(dir, 156, "nc", { status: "accepted" });
      const res = run(dir, ["--file", path.relative(dir, f)]);
      assert.equal(res.reason, "ticked");
      assert.equal("icon" in res, false, "no config, no `icon` field");
      // Exactly the pre-icon behaviour: the Status cell, width kept, and nothing else.
      assert.equal(
        readFileSync(registry, "utf8"),
        before.replace("| ready-for-review |", "| accepted         |"),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("statusIcons: two empty header cells beside Status → `ambiguous`, Status ticked, icon not written", () => {
  const { dir, registry } = iconSandbox([
    "| Task Number | Title | Category | Priority |      | Status           |      | File |",
    "| ----------- | ----- | -------- | -------- | ---- | ---------------- | ---- | ---- |",
    iconRow(157, "am", "⚠️", "ready-for-review"),
  ]);
  try {
    const f = writeDoc(dir, 157, "am", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.icon, "ambiguous");
    assert.deepEqual(iconAndStatus(registry, 157), ["⚠️", "accepted"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: a CRLF registry keeps CRLF and changes only the one line", () => {
  const { dir, registry } = iconSandbox([
    ...ICON_HEADER,
    iconRow(158, "cr", "⚠️", "ready-for-review"),
    iconRow(159, "cs", "⚠️", "ready-for-review"),
  ]);
  try {
    const crlf = readFileSync(registry, "utf8").replace(/\n/g, "\r\n");
    writeFileSync(registry, crlf);
    const f = writeDoc(dir, 158, "cr", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.icon, "written");
    const after = readFileSync(registry, "utf8");
    assert.equal(
      (after.match(/\r\n/g) || []).length,
      (crlf.match(/\r\n/g) || []).length,
    );
    const a = after.split("\r\n");
    const b = crlf.split("\r\n");
    assert.equal(a.length, b.length);
    const changed = a.filter((l, i) => l !== b[i]);
    assert.equal(changed.length, 1, "exactly one line changes");
    assert.match(changed[0], /^\| 158 \|.*\| ✅ +\| accepted +\|/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: a status absent from the map → `unmapped`, the icon cell is left alone (never blanked)", () => {
  const { dir, registry } = iconSandbox(
    [...ICON_HEADER, iconRow(160, "um", "⚠️", "ready-for-review")],
    'registry:\n  task:\n    statusIcons:\n      ready-for-review: "⚠️"\n      accepted: ""\n',
  );
  try {
    const f = writeDoc(dir, 160, "um", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.icon, "unmapped");
    assert.deepEqual(iconAndStatus(registry, 160), ["⚠️", "accepted"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: a named `iconColumn` is found by its header text, anywhere in the row", () => {
  const { dir, registry } = iconSandbox(
    [
      "| Task Number | Title | Category | Priority | Icon | Status           | Jira | File |",
      "|---|---|---|---|---|---|---|---|",
      iconRow(161, "nm", "⚠️", "ready-for-review"),
    ],
    'registry:\n  task:\n    statusIcons:\n      accepted: "✅"\n    iconColumn: icon\n',
  );
  try {
    const f = writeDoc(dir, 161, "nm", { status: "accepted" });
    assert.equal(run(dir, ["--file", path.relative(dir, f)]).icon, "written");
    assert.deepEqual(iconAndStatus(registry, 161), ["✅", "accepted"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: no empty header cell beside Status → `no-column`, only Status is ticked", () => {
  // The documented header: Status sits between Title and Category, both named.
  const { dir, registry } = sandbox([row(162, "nc2", "planned")]);
  writeFileSync(path.join(dir, "skills-config.yaml"), ICON_CONFIG);
  try {
    const before = readFileSync(registry, "utf8");
    const f = writeDoc(dir, 162, "nc2", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.icon, "no-column");
    assert.equal(
      readFileSync(registry, "utf8"),
      before.replace("| planned |", "| accepted |"),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: `--dry-run` on a stale icon reports the repair and writes nothing", () => {
  const { dir, registry } = iconSandbox([
    ...ICON_HEADER,
    iconRow(163, "dr", "⚠️", "accepted"),
  ]);
  try {
    const before = readFileSync(registry, "utf8");
    const f = writeDoc(dir, 163, "dr", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f), "--dry-run"]);
    assert.equal(res.reason, "dry-run");
    assert.equal(res.icon, "repaired");
    assert.equal(readFileSync(registry, "utf8"), before);
    // And the matching icon is left as it is: `unchanged`, no write.
    writeFileSync(
      registry,
      before.replace("| ⚠️ | accepted", "| ✅ | accepted"),
    );
    const settled = readFileSync(registry, "utf8");
    const again = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(again.reason, "already");
    assert.equal(again.icon, "unchanged");
    assert.equal(readFileSync(registry, "utf8"), settled);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: an icon holding a pipe is dropped from the map — `unmapped`, the table is not broken", () => {
  const { dir, registry } = iconSandbox(
    [...ICON_HEADER, iconRow(164, "pp", "⚠️", "ready-for-review")],
    'registry:\n  task:\n    statusIcons:\n      accepted: "✅|"\n',
  );
  try {
    const f = writeDoc(dir, 164, "pp", { status: "accepted" });
    assert.equal(run(dir, ["--file", path.relative(dir, f)]).icon, "unmapped");
    assert.deepEqual(iconAndStatus(registry, 164), ["⚠️", "accepted"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: Status in the FIRST column — the empty text before the leading pipe is not a column", () => {
  // `| Status | … |` splits to ["", " Status ", …]: element 0 is empty and sits
  // beside Status, so an unbounded search would write the icon outside the table.
  const { dir, registry } = iconSandbox([
    "| Status           | Task Number | Title | Category | Priority | Jira | File |",
    "|---|---|---|---|---|---|---|",
    `| ready-for-review | 165 | Plain title 165 | infrastructure | High | X-165 | \`docs/tasks/task.165.fc/task.165.fc.md\` |`,
  ]);
  try {
    const before = readFileSync(registry, "utf8");
    const f = writeDoc(dir, 165, "fc", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.icon, "no-column");
    assert.equal(
      readFileSync(registry, "utf8"),
      before.replace("| ready-for-review | 165", "| accepted         | 165"),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("statusIcons: `iconColumn` naming Status itself → `no-column`; the tick is never overwritten", () => {
  const { dir, registry } = iconSandbox(
    [...ICON_HEADER, iconRow(166, "st", "⚠️", "ready-for-review")],
    'registry:\n  task:\n    statusIcons:\n      accepted: "✅"\n    iconColumn: Status\n',
  );
  try {
    const f = writeDoc(dir, 166, "st", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.icon, "no-column");
    assert.deepEqual(iconAndStatus(registry, 166), ["⚠️", "accepted"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── cell width is DISPLAY width, not UTF-16 length ──────────────────────────

/**
 * `⚠️` is two code units and `✅` one, but both show two columns wide. Padding
 * by `.length` turned `| ⚠️   |` into `| ✅    |` — one column wider than the
 * hand-aligned rows around it — and the reverse swap lost a column.
 */
const iconLine = (registry, n) =>
  readFileSync(registry, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`| ${n} |`));
const oneIcon = (icon) =>
  `registry:\n  task:\n    statusIcons:\n      accepted: "${icon}"\n    iconColumn: ""\n`;

test("display width: repairing `| ⚠️   |` to ✅ gives the bytes of a hand-aligned ✅ row", () => {
  const { dir, registry } = iconSandbox([
    ...ICON_HEADER,
    iconRow(170, "dw", "⚠️  ", "accepted        "),
  ]);
  try {
    const f = writeDoc(dir, 170, "dw", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.icon, "repaired");
    assert.equal(
      iconLine(registry, 170),
      iconRow(170, "dw", "✅  ", "accepted        "),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("display width: an icon swap keeps the cell's display width, whatever the code-unit lengths", () => {
  // [from, to]: 2→1 units, 1→2 units, 2→2 units (VS16 and astral), all 2 columns.
  for (const [from, to] of [
    ["☑️", "✅"],
    ["✅", "⚠️"],
    ["📋", "🔄"],
  ]) {
    const { dir, registry } = iconSandbox(
      [...ICON_HEADER, iconRow(171, "sw", `${from}  `, "accepted        ")],
      oneIcon(to),
    );
    try {
      const f = writeDoc(dir, 171, "sw", { status: "accepted" });
      assert.equal(
        run(dir, ["--file", path.relative(dir, f)]).icon,
        "repaired",
      );
      assert.equal(
        iconLine(registry, 171),
        iconRow(171, "sw", `${to}  `, "accepted        "),
        `${from} → ${to}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("display width: an ASCII status rewrite is byte-identical to the `.length` rule", () => {
  // Pinned bytes, not a recomputation. No icon config, so only Status rewrites.
  const { dir, registry } = iconSandbox(
    [...ICON_HEADER, iconRow(172, "as", "⚠️  ", "ready-for-review")],
    null,
  );
  try {
    const f = writeDoc(dir, 172, "as", { status: "accepted" });
    const res = run(dir, ["--file", path.relative(dir, f)]);
    assert.equal(res.reason, "ticked");
    assert.equal("icon" in res, false);
    assert.equal(
      iconLine(registry, 172),
      "| 172 | Plain title 172 | infrastructure | High | ⚠️   | accepted         | X-172 | `docs/tasks/task.172.as/task.172.as.md` |",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("display width: a cell with no trailing space still gets no padding", () => {
  const { dir, registry } = iconSandbox([
    "| Task Number | Title | Category | Priority || Status | Jira | File |",
    "| ----------- | ----- | -------- | -------- || ------ | ---- | ---- |",
    "| 173 | Plain title 173 | infrastructure | High |⚠️| ready-for-review | X-173 | `docs/tasks/task.173.nt/task.173.nt.md` |",
  ]);
  try {
    const f = writeDoc(dir, 173, "nt", { status: "accepted" });
    assert.equal(run(dir, ["--file", path.relative(dir, f)]).icon, "written");
    assert.equal(
      iconLine(registry, 173),
      "| 173 | Plain title 173 | infrastructure | High |✅| accepted         | X-173 | `docs/tasks/task.173.nt/task.173.nt.md` |",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * --stage (task 245). Each case runs in a scratch git repository with rows 1
 * and 2 committed, so the index and the working file can disagree the way they
 * do in a checkout shared by parallel sessions.
 */
function gitRepo(rows) {
  const s = sandbox(rows);
  const g = (...a) =>
    execFileSync("git", ["-C", s.dir, ...a], { encoding: "utf8" });
  g("init", "-q");
  g("config", "user.email", "t@example.com");
  g("config", "user.name", "t");
  g("add", "-A");
  g("commit", "-q", "-m", "base");
  return { ...s, g };
}

function stageCase(extra) {
  const r = gitRepo([
    row(1, "one", "accepted"),
    row(2, "two", "ready-for-development"),
  ]);
  const f = writeDoc(r.dir, 2, "two", { status: "accepted" });
  // A parallel session's work in the same file: a new row 3 and a bumped counter.
  const text = readFileSync(r.registry, "utf8")
    .replace("**99**", "**100**")
    .concat(row(3, "three", "draft") + "\n");
  writeFileSync(r.registry, text);
  return { ...r, f: path.relative(r.dir, f), ...extra };
}

test("--stage: the ticked row is staged, a parallel row and counter stay unstaged", () => {
  const c = stageCase();
  try {
    const res = run(c.dir, ["--file", c.f, "--stage"]);
    assert.equal(res.reason, "ticked");
    assert.equal(res.staged, true);
    assert.equal(res.stageReason, "staged");
    const cached = c.g("diff", "--cached", "-U0");
    assert.match(cached, /^\+\| 2 \|.*accepted/m);
    assert.doesNotMatch(cached, /\| 3 \|/);
    assert.doesNotMatch(cached, /\*\*100\*\*/);
    const unstaged = c.g("diff", "-U0");
    assert.match(unstaged, /\| 3 \|/);
    assert.match(unstaged, /\*\*100\*\*/);
    assert.doesNotMatch(unstaged, /^\+\| 2 \|/m);
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
});

test("--stage: the row is found by id when the working file has an extra line above it", () => {
  const c = stageCase();
  try {
    const lines = readFileSync(c.registry, "utf8").split("\n");
    lines.splice(2, 0, "> a note only the working tree has");
    writeFileSync(c.registry, lines.join("\n"));
    const res = run(c.dir, ["--file", c.f, "--stage"]);
    assert.equal(res.stageReason, "staged");
    const staged = c.g("show", ":docs/tasks/task-registry.md").split("\n");
    assert.ok(staged.find((l) => l.startsWith("| 2 |")).includes("accepted"));
    assert.ok(!staged.includes("> a note only the working tree has"));
    assert.equal(
      staged.length,
      c.g("show", "HEAD:docs/tasks/task-registry.md").split("\n").length,
    );
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
});

test("--stage: a second run answers `already` / `already-staged` and changes nothing", () => {
  const c = stageCase();
  try {
    run(c.dir, ["--file", c.f, "--stage"]);
    const before = c.g("diff", "--cached");
    const res = run(c.dir, ["--file", c.f, "--stage"]);
    assert.equal(res.reason, "already");
    assert.equal(res.staged, true);
    assert.equal(res.stageReason, "already-staged");
    assert.equal(c.g("diff", "--cached"), before);
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
});

test("--stage: a resume (`already` in the tree, row unstaged) stages the row", () => {
  const c = stageCase();
  try {
    // The tick ran earlier without --stage; the working file already reads accepted.
    run(c.dir, ["--file", c.f]);
    assert.equal(c.g("diff", "--cached"), "");
    const res = run(c.dir, ["--file", c.f, "--stage"]);
    assert.equal(res.reason, "already");
    assert.equal(res.stageReason, "staged");
    assert.match(c.g("diff", "--cached", "-U0"), /^\+\| 2 \|.*accepted/m);
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
});

test("--stage: a row only the working tree has is `row-not-in-index`, exit 0, index unchanged", () => {
  const c = stageCase();
  try {
    writeFileSync(
      c.registry,
      readFileSync(c.registry, "utf8").replace(
        row(3, "three", "draft"),
        row(3, "three", "accepted"),
      ),
    );
    const f3 = writeDoc(c.dir, 3, "three", { status: "accepted" });
    const res = run(c.dir, ["--file", path.relative(c.dir, f3), "--stage"]);
    assert.equal(res.staged, false);
    assert.equal(res.stageReason, "row-not-in-index");
    assert.equal(res.exitCode, 0);
    assert.equal(c.g("diff", "--cached"), "");
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
});

test("--stage: an untracked registry is `not-tracked`; outside a repository, `not-a-repo`", () => {
  const s = sandbox([row(2, "two", "ready-for-development")]);
  try {
    const f = writeDoc(s.dir, 2, "two", { status: "accepted" });
    const outside = run(s.dir, ["--file", path.relative(s.dir, f), "--stage"]);
    assert.equal(outside.reason, "ticked");
    assert.equal(outside.stageReason, "not-a-repo");
    assert.equal(outside.staged, false);
  } finally {
    rmSync(s.dir, { recursive: true, force: true });
  }
  const r = gitRepo([row(1, "one", "accepted")]);
  try {
    r.g("rm", "-q", "--cached", "docs/tasks/task-registry.md");
    const f = writeDoc(r.dir, 1, "one", { status: "accepted" });
    const res = run(r.dir, ["--file", path.relative(r.dir, f), "--stage"]);
    assert.equal(res.stageReason, "not-tracked");
    assert.equal(res.exitCode, 0);
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
});

test("--annotate --stage: the notes cell is staged, a parallel row stays unstaged", () => {
  const r = gitRepo([row(1, "one", "accepted"), row(2, "two", "accepted")]);
  try {
    const f = writeDoc(r.dir, 2, "two", { status: "accepted" });
    writeFileSync(
      r.registry,
      readFileSync(r.registry, "utf8").concat(row(3, "three", "draft") + "\n"),
    );
    const res = run(r.dir, [
      "--annotate",
      "--pr",
      "77",
      "--file",
      path.relative(r.dir, f),
      "--stage",
    ]);
    assert.equal(res.reason, "annotated");
    assert.equal(res.stageReason, "staged");
    const cached = r.g("diff", "--cached", "-U0");
    assert.match(cached, /^\+\| 2 \|.*PR #77 merged/m);
    assert.doesNotMatch(cached, /\| 3 \|/);
    assert.match(r.g("diff", "-U0"), /\| 3 \|/);
  } finally {
    rmSync(r.dir, { recursive: true, force: true });
  }
});

test("--stage with --dry-run is a usage error (exit 2) and writes nothing", () => {
  const c = stageCase();
  try {
    const before = readFileSync(c.registry, "utf8");
    let code = 0;
    try {
      execFileSync(
        process.execPath,
        [CLI, "--file", c.f, "--stage", "--dry-run", "--json"],
        {
          cwd: c.dir,
          encoding: "utf8",
          stdio: "pipe",
        },
      );
    } catch (e) {
      code = e.status;
    }
    assert.equal(code, 2);
    assert.equal(readFileSync(c.registry, "utf8"), before);
    assert.equal(c.g("diff", "--cached"), "");
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
});

test("--stage: an early outcome (not-a-task) reports `staged: false`, `not-attempted`", () => {
  const c = stageCase();
  try {
    const sd = path.join(c.dir, "docs", "stories", "story.1.1.thing");
    mkdirSync(sd, { recursive: true });
    const f = path.join(sd, "story.1.1.thing.md");
    writeFileSync(f, doc({ type: "story", status: "accepted" }));
    const res = run(c.dir, ["--file", path.relative(c.dir, f), "--stage"]);
    assert.equal(res.reason, "not-a-task");
    assert.equal(res.staged, false);
    assert.equal(res.stageReason, "not-attempted");
  } finally {
    rmSync(c.dir, { recursive: true, force: true });
  }
});
