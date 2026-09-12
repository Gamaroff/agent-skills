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
  // needs the same argument made for it.
  assert.deepEqual(
    flags,
    [
      "--annotate",
      "--dry-run",
      "--file",
      "--help",
      "--issue",
      "--json",
      "--pr",
      "--registry",
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
