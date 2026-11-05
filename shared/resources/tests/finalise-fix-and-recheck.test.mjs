/**
 * finalise-fix-and-recheck — the bounded exit /finalise Step 8a takes on a low,
 * one-commit, provable finding, and the five preconditions that bound it.
 *
 * The table is pinned in both directions: a sixth precondition cannot be added
 * to the JSON without a check, and a check cannot exist without a row. Each
 * precondition is proved individually — all-true proceeds; any one false halts
 * naming that id — and the fail-closed case (no `severity`) is its own test.
 *
 * Run: node --test shared/resources/tests/finalise-fix-and-recheck.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { loadSensitive } from "../spawn-budget.mjs";

import {
  CHECK_IDS,
  PRECONDITIONS,
  evaluateFixAndRecheck,
  gitFacts,
  isWorkItemDocument,
  isCoLocatedArtifact,
  parseWorkItemName,
  pathInScope,
} from "../finalise-fix-and-recheck.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(here, "..", "..", "..");
const CLI = join(REPO_ROOT, "shared/resources/finalise-fix-and-recheck.mjs");
const TABLE = "shared/resources/finalise-fix-and-recheck-preconditions.json";
const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");

/** The pinned ids — a sixth cannot be added silently, and none can be dropped. */
const PINNED = Object.freeze([
  "severity-low",
  "single-commit",
  "inside-files-summary",
  "mutation-proved",
  "no-other-finding-open",
]);

/** The title of the test the fixtures' recorded run shows red (task 257: a proof names a TEST, never its file). */
const TITLE = "a filename with an embedded newline is un-numbered";

/** A recorded red run, as node:test prints one — written once for the suite. */
const RUN_DIR = mkdtempSync(join(tmpdir(), "fix-recheck-run-"));
const RED_RUN = join(RUN_DIR, "mutation-proof.log");
writeFileSync(
  RED_RUN,
  "test at tests/qa-cycle.test.js:142\n✖ a filename with an embedded newline is un-numbered (3ms)\nℹ fail 1\n",
);
const GREEN_RUN = join(RUN_DIR, "green.log");
writeFileSync(GREEN_RUN, `✔ ${TITLE} (1ms)\nℹ pass 12\nℹ fail 0\n`);
process.on("exit", () => rmSync(RUN_DIR, { recursive: true, force: true }));

const GOOD = Object.freeze({
  severity: "low",
  commits: 1,
  touched: ["shared/resources/qa-cycle.sh", "tests/qa-cycle.test.js"],
  filesSummary: [
    "shared/resources/qa-cycle.sh",
    "tests/qa-cycle.test.js",
    "skills/qa-task/SKILL.md",
  ],
  mutationProof: {
    test: TITLE,
    redOnRevert: true,
    run: RED_RUN,
  },
  otherFindingsOpen: [],
});

test("the table's ids are exactly the pinned five, in order", () => {
  assert.deepEqual(
    PRECONDITIONS.map((p) => p.id),
    [...PINNED],
    "a precondition was added, dropped or reordered — this list is the contract the prose cites",
  );
  for (const p of PRECONDITIONS) {
    assert.ok(
      p.statement && p.input && p.why,
      `${p.id}: statement, input and why are required`,
    );
  }
});

test("the evaluator's checks are exactly the table's ids — neither side can drift", () => {
  assert.deepEqual([...CHECK_IDS].sort(), [...PINNED].sort());
  const fromDisk = JSON.parse(read(TABLE)).preconditions.map((p) => p.id);
  assert.deepEqual(
    fromDisk,
    [...PINNED],
    "the JSON on disk is the same table the module loaded",
  );
});

test("isWorkItemDocument is exported, so the boundary the docs-link admission rests on is probeable (task.139 finalise run 3, security)", () => {
  // The predicate is the allow/deny-list that decides whether documentPath may
  // admit itself. Module-private, the security probe engine could not reach
  // it (`entry-not-probeable — export isWorkItemDocument is not a function`,
  // executed 0 of 11) and the section failed on the zero-guard. Exporting it
  // is what makes the engine's count real; these are the same cases the
  // probe's cases file carries, asserted here so the export cannot be
  // dropped silently.
  assert.equal(typeof isWorkItemDocument, "function");
  for (const doc of [
    "docs/tasks/task.1.x/task.1.x.md",
    "docs/prd/a/b/epics/epic.1.2.x/stories/story.1.2.1.y/story.1.2.1.y.md",
    "docs/prd/a/b/epics/epic.1.2.x/epic.1.2.x.md",
    "docs/bugs/bug.3.z/bug.3.z.md",
  ]) {
    assert.equal(isWorkItemDocument(doc), true, doc);
  }
  for (const notDoc of [
    "",
    "README.md",
    "docs/README.md",
    "src/task.1.x.md",
    "/etc/passwd",
    "../docs/tasks/task.1.x/task.1.x.md",
    "docs/tasks/task.1.x/../task.1.x.md",
    "docs/tasks/task.1.x/task.1.qa.1.x.md",
    "docs/tasks/task.1.x/task.1.dod.3.x.md",
    "docs/tasks/task.1.x/task.1.x.md\u0000.md",
  ]) {
    assert.equal(isWorkItemDocument(notDoc), false, JSON.stringify(notDoc));
  }
  for (const bad of [42, null, undefined, {}]) {
    assert.equal(isWorkItemDocument(bad), false, String(bad));
  }
});

test("inside-files-summary: the work item's own document is in scope when named by documentPath, and only that path (task.139 QA cycle 3, CR-5)", () => {
  const doc = "docs/tasks/task.1.x/task.1.x.md";
  // The docs-link shape: the fix touches the document itself, which the Files
  // Summary — listing what the work changes, not where it lives — omits.
  const withDoc = { ...GOOD, touched: [doc], documentPath: doc };
  assert.deepEqual(evaluateFixAndRecheck(withDoc).failed, []);
  // Without documentPath the same record is outside the Files Summary.
  const without = { ...GOOD, touched: [doc] };
  assert.deepEqual(
    evaluateFixAndRecheck(without).failed.map((x) => x.id),
    ["inside-files-summary"],
  );
  // documentPath admits ONE path: a second unlisted file is still outside.
  const two = { ...GOOD, touched: [doc, "README.md"], documentPath: doc };
  assert.deepEqual(
    evaluateFixAndRecheck(two).failed.map((x) => x.id),
    ["inside-files-summary"],
  );
  // documentPath must be shaped like a work item document under docs/ — any
  // other string is a declaration the evaluator refuses (cycle 4, CR-2).
  for (const notDoc of [
    "README.md",
    "docs/README.md",
    "src/task.1.x.md",
    "../docs/tasks/task.1.x/task.1.x.md",
    "docs/tasks/task.1.x/task.1.qa.1.x.md",
  ]) {
    assert.deepEqual(
      evaluateFixAndRecheck({
        ...GOOD,
        touched: [notDoc],
        documentPath: notDoc,
      }).failed.map((x) => x.id),
      ["inside-files-summary"],
      `documentPath ${notDoc} is not a work item document and must not admit itself`,
    );
  }
  for (const doc2 of [
    "docs/prd/a/b/epics/epic.1.2.x/stories/story.1.2.1.y/story.1.2.1.y.md",
    "docs/bugs/bug.3.z/bug.3.z.md",
  ]) {
    assert.deepEqual(
      evaluateFixAndRecheck({ ...GOOD, touched: [doc2], documentPath: doc2 })
        .failed,
      [],
      doc2,
    );
  }
  // An empty or non-string documentPath admits nothing.
  for (const bad of ["", 42, null]) {
    assert.deepEqual(
      evaluateFixAndRecheck({
        ...GOOD,
        touched: [doc],
        documentPath: bad,
      }).failed.map((x) => x.id),
      ["inside-files-summary"],
      `documentPath ${JSON.stringify(bad)} must not admit the path`,
    );
  }
});

// ── task.152 (obs #155): co-located artifacts, admitted only through the document ──
const TASK_DOC = "docs/tasks/task.139.x/task.139.x.md";
const QA4 = "docs/tasks/task.139.x/task.139.qa.4.x.md";
const failedIds = (rec) => evaluateFixAndRecheck(rec).failed.map((x) => x.id);

test("inside-files-summary: a co-located QA report named in artifactPaths is in scope (task.152, obs #155)", () => {
  // The task.139 run-2 shape: the red is on two QA reports beside the document.
  const QA5 = "docs/tasks/task.139.x/task.139.qa.5.x.md";
  assert.deepEqual(
    failedIds({
      ...GOOD,
      touched: [QA4, QA5],
      documentPath: TASK_DOC,
      artifactPaths: [QA4, QA5],
    }),
    [],
  );
  // Document and artifact together, as 8a records a red on both.
  assert.deepEqual(
    failedIds({
      ...GOOD,
      touched: [TASK_DOC, QA4],
      documentPath: TASK_DOC,
      artifactPaths: [QA4],
    }),
    [],
  );
  // Every artifact kind the 8a clause names, for a story too.
  const story =
    "docs/prd/a/epics/epic.1.2.x/stories/story.1.2.1.y/story.1.2.1.y.md";
  for (const kind of [
    "qa.1",
    "dod.2",
    "implementation.1",
    "review.1",
    "pr-review.1",
    "sprint-review-summary",
  ]) {
    const p = `docs/prd/a/epics/epic.1.2.x/stories/story.1.2.1.y/story.1.2.1.${kind}.y.md`;
    assert.equal(isCoLocatedArtifact(story, p), true, p);
  }
});

test("inside-files-summary: artifactPaths refuses every path outside the document's own directory and stem (task.152)", () => {
  const refused = {
    "another directory": "docs/tasks/task.140.y/task.139.qa.4.x.md",
    // Named so the stem check alone would pass it: only the same-directory rule refuses.
    "a subdirectory": "docs/tasks/task.139.x/task.139.old/task.139.qa.4.x.md",
    "another stem": "docs/tasks/task.139.x/task.140.qa.4.x.md",
    "a longer id sharing the prefix":
      "docs/tasks/task.139.x/task.1390.qa.1.x.md",
    "a co-located .bug. report": "docs/tasks/task.139.x/task.139.bug.2.x.md",
    "a .yml gate": "docs/tasks/task.139.x/task.139.gate.4.x.yml",
    "a .. path": "docs/tasks/task.139.x/../task.139.x/task.139.qa.4.x.md",
    "a NUL path": "docs/tasks/task.139.x/task.139.qa.4.x.md\u0000.md",
    "a non-artifact file in the same directory":
      "docs/tasks/task.139.x/task.139.notes.md",
  };
  for (const [why, p] of Object.entries(refused)) {
    assert.equal(isCoLocatedArtifact(TASK_DOC, p), false, why);
    assert.deepEqual(
      failedIds({
        ...GOOD,
        touched: [p],
        documentPath: TASK_DOC,
        artifactPaths: [p],
      }),
      ["inside-files-summary"],
      `${why}: ${p} must not be admitted`,
    );
  }
});

test("inside-files-summary: artifactPaths admits nothing without a valid documentPath, and a listed path is not enough on its own (task.152)", () => {
  // No documentPath: the anchor is missing, so the artifact is outside.
  assert.deepEqual(
    failedIds({ ...GOOD, touched: [QA4], artifactPaths: [QA4] }),
    ["inside-files-summary"],
  );
  // A documentPath that is itself an artifact, or a task's co-located bug
  // report, is not a work item document — nothing is anchored to it.
  for (const notDoc of [QA4, "docs/tasks/task.67.x/task.67.bug.3.z.md"]) {
    const art = notDoc.replace(/[^/]+$/, "task.67.qa.1.z.md");
    assert.equal(isCoLocatedArtifact(notDoc, art), false, notDoc);
  }
  // Touching an artifact that is NOT in artifactPaths stays outside, even when
  // it would qualify — the record states what it touches.
  assert.deepEqual(
    failedIds({
      ...GOOD,
      touched: [QA4],
      documentPath: TASK_DOC,
      artifactPaths: [],
    }),
    ["inside-files-summary"],
  );
  // A non-list artifactPaths admits nothing.
  assert.deepEqual(
    failedIds({
      ...GOOD,
      touched: [QA4],
      documentPath: TASK_DOC,
      artifactPaths: QA4,
    }),
    ["inside-files-summary"],
  );
});

test("the preconditions table states the artifactPaths input", () => {
  const p = PRECONDITIONS.find((x) => x.id === "inside-files-summary");
  assert.equal(p.input, "touched, filesSummary, documentPath, artifactPaths");
  assert.match(p.statement, /artifactPaths/);
});

test("all five hold → proceed, every id checked, nothing failed", () => {
  const r = evaluateFixAndRecheck(GOOD);
  assert.equal(r.proceed, true, JSON.stringify(r.failed));
  assert.deepEqual(r.checked, [...PINNED]);
  assert.deepEqual(r.failed, []);
});

// One row per precondition: the mutation that makes exactly that one false.
const FALSIFY = Object.freeze({
  "severity-low": { severity: "medium" },
  "single-commit": { commits: 2 },
  "inside-files-summary": {
    touched: ["shared/resources/qa-cycle.sh", "docs/README.md"],
  },
  "mutation-proved": {
    mutationProof: {
      test: TITLE,
      redOnRevert: false,
      run: RED_RUN,
    },
  },
  "no-other-finding-open": {
    otherFindingsOpen: ["docs: FAIL — CHANGELOG entry missing"],
  },
});

for (const id of PINNED) {
  test(`${id} false → halt, and it is the only id named`, () => {
    const finding = { ...GOOD, ...FALSIFY[id] };
    const r = evaluateFixAndRecheck(finding);
    assert.equal(r.proceed, false, `${id}: should have halted`);
    assert.deepEqual(
      r.failed.map((f) => f.id),
      [id],
      `${id}: failed[] should name exactly this precondition — got ${JSON.stringify(r.failed)}`,
    );
    assert.ok(r.failed[0].detail.length > 0, `${id}: detail must say why`);
  });
}

test("FALSIFY covers every pinned id — a precondition without a falsifying test is unproved", () => {
  assert.deepEqual(Object.keys(FALSIFY).sort(), [...PINNED].sort());
});

test("fail closed: a finding with no `severity` is not low", () => {
  const { severity: _s, ...noSeverity } = GOOD;
  const r = evaluateFixAndRecheck(noSeverity);
  assert.equal(r.proceed, false);
  assert.deepEqual(
    r.failed.map((f) => f.id),
    ["severity-low"],
  );
  assert.match(r.failed[0].detail, /no `severity`/);
  for (const v of [null, "", "LOW ", "Low", "high"]) {
    assert.equal(
      evaluateFixAndRecheck({ ...GOOD, severity: v }).proceed,
      false,
      `severity ${JSON.stringify(v)}`,
    );
  }
});

test("fail closed: a missing input never reads as held", () => {
  for (const key of [
    "commits",
    "touched",
    "filesSummary",
    "mutationProof",
    "otherFindingsOpen",
  ]) {
    const { [key]: _drop, ...finding } = GOOD;
    const r = evaluateFixAndRecheck(finding);
    assert.equal(r.proceed, false, `without ${key}: should have halted`);
    assert.equal(
      r.failed.length,
      1,
      `without ${key}: exactly one precondition fails`,
    );
  }
  assert.equal(
    evaluateFixAndRecheck({ ...GOOD, touched: [] }).proceed,
    false,
    "an empty touched list is not inside anything",
  );
});

test("the first evaluation of a real run halts on mutation-proved alone — the documented shape", () => {
  // Step 8a writes redOnRevert: false and no run before the proof runs; the doc
  // says the first evaluation must name mutation-proved and nothing else.
  const r = evaluateFixAndRecheck({
    ...GOOD,
    mutationProof: { test: TITLE, redOnRevert: false },
  });
  assert.deepEqual(
    r.failed.map((f) => f.id),
    ["mutation-proved"],
  );
});

test("mutation-proved reads the RECORDED run, not the boolean (BUG-4)", () => {
  const proof = (extra) => ({
    ...GOOD,
    mutationProof: {
      test: TITLE,
      redOnRevert: true,
      run: RED_RUN,
      ...extra,
    },
  });
  // The boolean alone is a self-report and is not enough.
  let r = evaluateFixAndRecheck(proof({ run: undefined }));
  assert.equal(r.proceed, false);
  assert.match(r.failed[0].detail, /names no `run`/);
  // A run file that does not exist.
  r = evaluateFixAndRecheck(proof({ run: join(RUN_DIR, "nope.log") }));
  assert.match(r.failed[0].detail, /cannot be read/);
  // A run that never went red.
  r = evaluateFixAndRecheck(proof({ run: GREEN_RUN }));
  assert.match(r.failed[0].detail, /shows no failing test/);
  // A red run about a DIFFERENT test.
  r = evaluateFixAndRecheck(proof({ test: "a title the run never prints" }));
  assert.match(
    r.failed[0].detail,
    /does not mention a title the run never prints/,
  );
  // An empty file.
  const empty = join(RUN_DIR, "empty.log");
  writeFileSync(empty, "   \n");
  r = evaluateFixAndRecheck(proof({ run: empty }));
  assert.match(r.failed[0].detail, /is empty/);
  // The real thing.
  assert.equal(evaluateFixAndRecheck(GOOD).proceed, true);
});

test("mutation-proved: the red marker must be TIED to the named test, not anywhere in the log (CR-4)", () => {
  // A whole-suite log: the named test is green, an unrelated test is red.
  const suite = join(RUN_DIR, "suite.log");
  writeFileSync(
    suite,
    [
      `✔ ${TITLE} (2ms)`,
      "✔ another green one (1ms)",
      "",
      "",
      "",
      "",
      "",
      "✖ something unrelated is broken (3ms)",
      "ℹ fail 1",
      "",
    ].join("\n"),
  );
  const r = evaluateFixAndRecheck({
    ...GOOD,
    mutationProof: {
      test: TITLE,
      redOnRevert: true,
      run: suite,
    },
  });
  assert.equal(r.proceed, false);
  assert.match(
    r.failed[0].detail,
    /shows no failing test for a filename with an embedded newline is un-numbered/,
  );
  // The real shape — a ✖ line that carries the test's own name — still proves.
  assert.equal(evaluateFixAndRecheck(GOOD).proceed, true);
});

test("--git-base: the record must agree with git, and the licence is refused on a forecast (BUG-6)", () => {
  const repo = mkdtempSync(join(tmpdir(), "fix-recheck-git-"));
  const g = (...args) =>
    spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  try {
    g("init", "-q");
    g("config", "user.email", "t@example.com");
    g("config", "user.name", "t");
    writeFileSync(join(repo, "a.sh"), "one\n");
    writeFileSync(join(repo, "b.js"), "one\n");
    g("add", "-A");
    g("commit", "-q", "-m", "base");
    const base = g("rev-parse", "HEAD").stdout.trim();
    // Before any fix commit: git says 0 commits, nothing touched.
    let facts = gitFacts(base, repo);
    assert.deepEqual(facts, { commits: 0, touched: [] });
    const finding = {
      ...GOOD,
      commits: 1,
      touched: ["a.sh"],
      filesSummary: ["a.sh", "b.js"],
    };
    let r = evaluateFixAndRecheck(finding, { git: facts });
    assert.equal(r.proceed, false, "a forecast is not a record");
    assert.deepEqual(r.failed.map((f) => f.id).sort(), [
      "inside-files-summary",
      "single-commit",
    ]);
    assert.match(
      r.failed.find((f) => f.id === "single-commit").detail,
      /record says commits: 1, git says 0/,
    );
    // One commit touching exactly a.sh: the record now agrees.
    writeFileSync(join(repo, "a.sh"), "two\n");
    g("commit", "-q", "-am", "fix");
    facts = gitFacts(base, repo);
    assert.deepEqual(facts, { commits: 1, touched: ["a.sh"] });
    assert.equal(evaluateFixAndRecheck(finding, { git: facts }).proceed, true);
    // A second commit, or a file the record did not name, refuses.
    writeFileSync(join(repo, "b.js"), "two\n");
    g("commit", "-q", "-am", "oops");
    facts = gitFacts(base, repo);
    r = evaluateFixAndRecheck(finding, { git: facts });
    assert.deepEqual(r.failed.map((f) => f.id).sort(), [
      "inside-files-summary",
      "single-commit",
    ]);
    // git that cannot answer is a failed precondition, never a skipped one.
    assert.equal(gitFacts("not-a-ref", repo), null);
    r = evaluateFixAndRecheck(finding, { git: null });
    assert.equal(r.proceed, false);
    assert.match(r.failed[0].detail, /git could not answer/);
    // The CLI form.
    const f = join(repo, "finding.json");
    writeFileSync(f, JSON.stringify(finding));
    const cli = spawnSync(
      process.execPath,
      [CLI, "--finding", f, "--git-base", base, "--json"],
      { cwd: repo, encoding: "utf8" },
    );
    assert.equal(cli.status, 1, cli.stdout + cli.stderr);
    assert.deepEqual(
      JSON.parse(cli.stdout)
        .failed.map((x) => x.id)
        .sort(),
      ["inside-files-summary", "single-commit"],
    );
    assert.equal(
      spawnSync(process.execPath, [CLI, "--finding", f, "--git-base"], {
        encoding: "utf8",
      }).status,
      2,
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("CLI: invoked through a SYMLINKED path it still runs and exits per the verdict (BUG-1)", () => {
  // .agents/skills → ../skills in every install; a raw argv[1] compare made
  // main() never run — no output, exit 0, read by Step 8a as "proceed".
  const dir = mkdtempSync(join(tmpdir(), "fix-recheck-link-"));
  try {
    const link = join(dir, "resources");
    symlinkSync(join(REPO_ROOT, "shared/resources"), link, "dir");
    const finding = join(dir, "finding.json");
    writeFileSync(finding, JSON.stringify({ ...GOOD, commits: 2 }));
    const r = spawnSync(
      process.execPath,
      [
        join(link, "finalise-fix-and-recheck.mjs"),
        "--finding",
        finding,
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(r.status, 1, `stdout=${r.stdout} stderr=${r.stderr}`);
    assert.ok(
      r.stdout.trim().length > 0,
      "the symlinked invocation must print its verdict",
    );
    assert.deepEqual(
      JSON.parse(r.stdout).failed.map((f) => f.id),
      ["single-commit"],
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a non-object finding is a TypeError, not a halt", () => {
  for (const bad of [undefined, null, "low", [], 42]) {
    assert.throws(() => evaluateFixAndRecheck(bad), TypeError);
  }
});

// ── CLI ──────────────────────────────────────────────────────────────────────

function cli(args, { finding } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "fix-recheck-"));
  try {
    const argv = [CLI, ...args];
    if (finding !== undefined) {
      const p = join(dir, "finding.json");
      writeFileSync(
        p,
        typeof finding === "string" ? finding : JSON.stringify(finding),
      );
      argv.push("--finding", p);
    }
    const r = spawnSync(process.execPath, argv, { encoding: "utf8" });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("CLI: exit 0 / 1 / 2 follow the repository convention", () => {
  const ok = cli(["--json"], { finding: GOOD });
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).reason, "proceed");

  const halt = cli(["--json"], { finding: { ...GOOD, commits: 3 } });
  assert.equal(halt.status, 1);
  const parsed = JSON.parse(halt.stdout);
  assert.equal(parsed.reason, "halt");
  assert.deepEqual(
    parsed.failed.map((f) => f.id),
    ["single-commit"],
  );

  assert.equal(cli([]).status, 2, "no --finding is a usage error");
  assert.equal(
    cli(["--json"], { finding: "{not json" }).status,
    2,
    "malformed JSON is a usage error",
  );
  assert.equal(
    cli(["--finding"]).status,
    2,
    "a trailing --finding is a usage error",
  );
});

test("CLI: the human form names every failed precondition", () => {
  const r = cli([], { finding: { ...GOOD, severity: "high", commits: 2 } });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /severity-low/);
  assert.match(r.stdout, /single-commit/);
});

// ── Prose parity: both Decision Matrix definitions and Step 8a name the table ─

test("both Decision Matrix definitions carry the FIX-AND-RECHECK row naming every precondition id", () => {
  for (const rel of [
    "skills/finalise/SKILL.md",
    "skills/finalise/references/definition-of-done-checklist.md",
  ]) {
    const text = read(rel);
    assert.ok(
      text.includes("FIX-AND-RECHECK"),
      `${rel}: no FIX-AND-RECHECK row`,
    );
    for (const id of PINNED) {
      assert.ok(
        text.includes(`\`${id}\``),
        `${rel}: does not name precondition \`${id}\``,
      );
    }
    assert.ok(
      text.includes("finalise-fix-and-recheck-preconditions.json"),
      `${rel}: does not cite the one definition`,
    );
  }
});

test("Step 8a runs the evaluator and is bounded to once per run", () => {
  const skill = read("skills/finalise/SKILL.md");
  const start = skill.indexOf("### Step 8a");
  assert.ok(start > 0, "Step 8a heading is missing");
  const step8a = skill.slice(
    start,
    skill.indexOf("**Step 8 Completion Checklist"),
  );
  assert.match(step8a, /finalise-fix-and-recheck\.mjs --finding/);
  assert.match(step8a, /\*\*Bounded\.\*\* This step runs \*\*once\*\*/);
  assert.match(step8a, /Deviations recorded, not hidden/);
  assert.match(step8a, /CI reading 1 \(fix head\)/);
  assert.match(step8a, /ONLY the failed section/);
});

test("the security agent's schema carries `severity` on probes and FAIL checks", () => {
  const prompt = read("shared/resources/finalise-dod-security-prompt.md");
  const output = prompt.slice(prompt.indexOf("## Output"));
  assert.match(output, /probes:[\s\S]*severity: low \| medium \| high/);
  assert.match(output, /checks:[\s\S]*severity: low \| medium \| high/);
  assert.ok(
    output.includes("**Severity rule**"),
    "the severity rule paragraph is gone",
  );
});

test("a sprint-review summary is a co-located artifact, never a work-item document — the evaluator and the corpus guard share one artifact set (task.152 QA cycle 1, QA-1)", () => {
  const story =
    "docs/prd/a/epics/epic.1.2.x/stories/story.1.2.1.y/story.1.2.1.y.md";
  const summary =
    "docs/prd/a/epics/epic.1.2.x/stories/story.1.2.1.y/story.1.2.1.sprint-review-summary.md";
  assert.equal(isWorkItemDocument(summary), false, "not a document");
  assert.equal(
    isCoLocatedArtifact(story, summary),
    true,
    "an artifact of its story",
  );
  assert.deepEqual(
    failedIds({ ...GOOD, touched: [summary], documentPath: summary }),
    ["inside-files-summary"],
    "and it cannot admit itself as the document",
  );
  // One definition: the doc-links corpus guards import the evaluator's readings
  // rather than restating them, so the two cannot disagree again — and since
  // task 206 they restate no id pattern either (`story\.\d+\.\d+` assumed the
  // legacy two-number story id).
  const guard = read("shared/resources/tests/doc-links.test.mjs");
  for (const name of [
    "UNPREFIXED_ARTIFACTS",
    "isWorkItemDocument",
    "parseWorkItemName",
  ]) {
    assert.match(
      guard,
      new RegExp(
        `import \\{[^}]*\\b${name}\\b[^}]*\\} from "\\.\\.\\/finalise-fix-and-recheck\\.mjs"`,
      ),
      name,
    );
  }
  assert.doesNotMatch(guard, /const ARTIFACT_RE =\s*\//, "no second literal");
  assert.doesNotMatch(
    guard,
    /\/[^/\n]*(?:task|story|epic)\\\.\\d/,
    "no restated work-item id pattern",
  );
});

test("the unprefixed sprint-review-summary.md finalise writes beside a document is a co-located artifact — and only there (task.152 QA cycle 2, CR-2)", () => {
  const story =
    "docs/prd/a/epics/epic.1.2.x/stories/story.1.2.1.y/story.1.2.1.y.md";
  const dir = "docs/prd/a/epics/epic.1.2.x/stories/story.1.2.1.y/";
  assert.equal(
    isCoLocatedArtifact(story, dir + "sprint-review-summary.md"),
    true,
    "the real filename",
  );
  assert.equal(
    isCoLocatedArtifact(
      TASK_DOC,
      "docs/tasks/task.139.x/sprint-review-summary.md",
    ),
    true,
  );
  for (const [why, p] of Object.entries({
    "another directory":
      "docs/prd/a/epics/epic.1.2.x/stories/story.1.2.2.z/sprint-review-summary.md",
    "a subdirectory": dir + "old/sprint-review-summary.md",
    "a .yml": dir + "sprint-review-summary.yml",
    "a lookalike name": dir + "xsprint-review-summary.md",
    "a .. path": dir + "../story.1.2.1.y/sprint-review-summary.md",
  })) {
    assert.equal(isCoLocatedArtifact(story, p), false, why);
  }
  assert.equal(
    isCoLocatedArtifact("README.md", "sprint-review-summary.md"),
    false,
    "no valid document, no anchor",
  );
  const guard = read("shared/resources/tests/doc-links.test.mjs");
  assert.match(
    guard,
    /UNPREFIXED_ARTIFACTS\.includes\(/,
    "the corpus walk reads the same list",
  );
});

test("a raw LF or CR in a path is refused by both predicates — one string here, two paths to a line-oriented reader (task.152 finalise DoD security probe)", () => {
  const story =
    "docs/prd/p/epics/epic.1.1.x/stories/story.1.1.2.x/story.1.1.2.x.md";
  for (const p of [
    TASK_DOC.replace(/[^/]+$/, "task.139.qa.1.x.md\nREADME.md"),
    TASK_DOC.replace(/[^/]+$/, "task.139.qa.1.x.md\r\n.md"),
    TASK_DOC.replace(/[^/]+$/, "task.139.qa.1.x.md\r.md"),
  ]) {
    assert.equal(isCoLocatedArtifact(TASK_DOC, p), false, JSON.stringify(p));
    assert.deepEqual(
      failedIds({
        ...GOOD,
        touched: [p],
        documentPath: TASK_DOC,
        artifactPaths: [p],
      }),
      ["inside-files-summary"],
      JSON.stringify(p),
    );
  }
  assert.equal(
    isCoLocatedArtifact(
      story,
      story.replace(/[^/]+$/, "story.1.1.2.qa.1.x.md\nx.md"),
    ),
    false,
    "story anchor",
  );
  for (const doc of [
    TASK_DOC + "\n.md",
    "docs/tasks/task.1.x/task.1.x.md\r\n.md",
  ]) {
    assert.equal(isWorkItemDocument(doc), false, JSON.stringify(doc));
  }
  // The guard does not over-block: the ordinary artifact still passes.
  assert.equal(isCoLocatedArtifact(TASK_DOC, QA4), true);
});

test("isCoLocatedArtifact keys on the doc-id story id: story.1.2.3 admits its own artifacts and never story.1.2.30, story.1.2.4 or the sub-story 1.2.3A (task 206)", () => {
  const dir = "docs/prd/p/epics/epic.1.2.e/stories/story.1.2.3.s/";
  const story = `${dir}story.1.2.3.s.md`;
  assert.equal(
    isWorkItemDocument(story),
    true,
    "a hierarchical story is a work-item document",
  );
  assert.equal(
    isCoLocatedArtifact(story, `${dir}story.1.2.3.qa.1.s.md`),
    true,
    "its own QA report",
  );
  assert.equal(
    isCoLocatedArtifact(story, `${dir}story.1.2.3.dod.2.s.md`),
    true,
    "its own DoD",
  );
  for (const neighbour of [
    "story.1.2.30.qa.1.s.md", // a story whose number extends this one's
    "story.1.2.4.qa.1.s.md", // the next story — the old `story\.\d+\.\d+` stem, story.1.2, admitted it
    "story.1.2.3A.qa.1.s.md", // a sub-story is its own work item
    "story.1.2.qa.1.s.md", // an epic-level name
  ]) {
    assert.equal(isCoLocatedArtifact(story, dir + neighbour), false, neighbour);
  }
  const sub = `${dir}story.1.2.3A.s.md`;
  assert.equal(
    isCoLocatedArtifact(sub, `${dir}story.1.2.3A.qa.1.s.md`),
    true,
    "a sub-story's own artifact",
  );
  assert.equal(
    isCoLocatedArtifact(sub, `${dir}story.1.2.3.qa.1.s.md`),
    false,
    "its parent story's artifact",
  );
});

test("a legacy story.{E}.{S} name is not a work-item document — it is migrated first, never mis-stemmed (task 206)", () => {
  const legacy = "docs/prd/p/epics/epic.5.e/stories/story.5.1.s/story.5.1.s.md";
  assert.equal(isWorkItemDocument(legacy), false);
  assert.equal(parseWorkItemName(legacy), null);
  assert.equal(
    isCoLocatedArtifact(
      legacy,
      "docs/prd/p/epics/epic.5.e/stories/story.5.1.s/story.5.1.qa.1.s.md",
    ),
    false,
  );
});

// ---------------------------------------------------------------------------
// task 257 — the proof is tied to the TEST IT NAMES (obs #61).
//
// Every log below comes from a real `node --test` run in a scratch directory,
// never a hand-written one: a hand-written log is what let a 3-line window pass
// in the first place, because nobody had run the rule against an adjacent
// failure.

/** Run a scratch node:test file and return the path of its recorded output. */
function realRun(name, titles, reporter = "spec") {
  const dir = mkdtempSync(join(RUN_DIR, "real-"));
  const body = [
    'import test from "node:test";',
    'import assert from "node:assert/strict";',
    ...titles.map(
      ([title, green]) =>
        `test(${JSON.stringify(title)}, () => { assert.equal(1, ${green ? 1 : 2}); });`,
    ),
  ].join("\n");
  writeFileSync(join(dir, "scratch.test.mjs"), body);
  // The parent test runner marks its children with NODE_TEST_CONTEXT; leaving it
  // set makes this run speak the runner's internal protocol instead of text.
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const out = spawnSync(
    process.execPath,
    ["--test", `--test-reporter=${reporter}`, "scratch.test.mjs"],
    { cwd: dir, encoding: "utf8", env },
  );
  const log = join(RUN_DIR, `${name}.log`);
  writeFileSync(log, out.stdout + out.stderr);
  return log;
}

const proofFor = (test, run) => ({
  ...GOOD,
  mutationProof: { test, redOnRevert: true, run },
});

test("a green named test directly above a failing neighbour is NOT proved (task 257, the §2 reproduction)", () => {
  // `✔ new guard refuses` sits on the line above `✖ findRelatedDocs a`: the
  // old window read that red neighbour as proof of the green test.
  const run = realRun("adjacent-spec", [
    ["new guard refuses", true],
    ["findRelatedDocs a", false],
  ]);
  const r = evaluateFixAndRecheck(proofFor("new guard refuses", run));
  assert.equal(r.proceed, false);
  assert.equal(r.failed[0].id, "mutation-proved");
  assert.match(
    r.failed[0].detail,
    /shows no failing test for new guard refuses/,
  );
  // The red test itself proves.
  assert.equal(
    evaluateFixAndRecheck(proofFor("findRelatedDocs a", run)).proceed,
    true,
  );
});

test("the same holds for TAP output (task 257)", () => {
  const run = realRun(
    "adjacent-tap",
    [
      ["new guard refuses", true],
      ["findRelatedDocs a", false],
    ],
    "tap",
  );
  assert.equal(
    evaluateFixAndRecheck(proofFor("new guard refuses", run)).proceed,
    false,
  );
  assert.equal(
    evaluateFixAndRecheck(proofFor("findRelatedDocs a", run)).proceed,
    true,
  );
});

test("control: other titles the task never mentions, red test last and first (task 257)", () => {
  // Not the document's own example: a rule that only recognised the quoted
  // incident would pass the two tests above and fail this one.
  const run = realRun("control", [
    ["quokka routes the parcel", false],
    ["marmot keeps the ledger", true],
    ["lynx seals the door", true],
  ]);
  assert.equal(
    evaluateFixAndRecheck(proofFor("quokka routes the parcel", run)).proceed,
    true,
  );
  for (const green of ["marmot keeps the ledger", "lynx seals the door"]) {
    assert.equal(
      evaluateFixAndRecheck(proofFor(green, run)).proceed,
      false,
      green,
    );
  }
});

function textRun(name, text) {
  const p = join(RUN_DIR, `${name}.log`);
  writeFileSync(p, text);
  return p;
}

test("a TODO or SKIP directive is not a red proof (QA cycle 1, T257-CR-2)", () => {
  for (const directive of ["# TODO known", "# SKIP nope", "# todo later"]) {
    const run = textRun("dir", `not ok 1 - foo ${directive}\n`);
    assert.equal(
      evaluateFixAndRecheck(proofFor("foo", run)).proceed,
      false,
      directive,
    );
  }
  // Control: the same line without a directive proves; so does a duration.
  assert.equal(
    evaluateFixAndRecheck(proofFor("foo", textRun("ok1", "not ok 1 - foo\n")))
      .proceed,
    true,
  );
  assert.equal(
    evaluateFixAndRecheck(proofFor("foo", textRun("ok2", "✖ foo (3.2ms)\n")))
      .proceed,
    true,
  );
});

test("the `:<line>` boundary belongs to a file-shaped name only (QA cycle 1, T257-CR-3)", () => {
  // A plain title followed by `:12` is another test's name, not the title.
  const run = textRun("colon", "✔ foo (1ms)\n✖ foo:12 something else (1ms)\n");
  assert.equal(evaluateFixAndRecheck(proofFor("foo", run)).proceed, false);
  // The docs-link clause names a repo-relative .md path and keeps its proof.
  const docs = textRun(
    "docs",
    "✖ docs/tasks/task.9/task.9.md:12 → dead link\nFAIL doc-links: 1\n",
  );
  assert.equal(
    evaluateFixAndRecheck(proofFor("docs/tasks/task.9/task.9.md", docs))
      .proceed,
    true,
  );
});

test("a title that is a prefix of a failing title does not prove (task 257)", () => {
  const run = realRun("prefix", [
    ["alpha gate", true],
    ["alpha gate extended", false],
  ]);
  assert.equal(
    evaluateFixAndRecheck(proofFor("alpha gate", run)).proceed,
    false,
  );
  assert.equal(
    evaluateFixAndRecheck(proofFor("alpha gate extended", run)).proceed,
    true,
  );
});

test("a title that only ENDS a failing title does not prove (task 257)", () => {
  // The name must start the red line's subject, not sit anywhere inside it.
  const run = realRun("suffix", [
    ["the guard refuses", true],
    ["new guard refuses", false],
  ]);
  assert.equal(
    evaluateFixAndRecheck(proofFor("guard refuses", run)).proceed,
    false,
  );
});

test("`ℹ fail N` alone proves nothing: it names no test (task 257)", () => {
  const only = join(RUN_DIR, "count-only.log");
  writeFileSync(only, "✔ some green title (1ms)\nℹ pass 1\nℹ fail 1\n");
  const r = evaluateFixAndRecheck(proofFor("some green title", only));
  assert.equal(r.proceed, false);
  assert.equal(r.failed[0].id, "mutation-proved");
});

test("a test-file-shaped mutationProof.test is refused by name (task 257)", () => {
  for (const file of [
    "tests/qa-cycle.test.js",
    "lib/x.spec.ts",
    "skills/a/tests/parse.test.sh",
  ]) {
    const r = evaluateFixAndRecheck(proofFor(file, RED_RUN));
    assert.equal(r.proceed, false, file);
    assert.equal(r.failed[0].id, "mutation-proved", file);
    assert.match(
      r.failed[0].detail,
      /a test file — name the test by its title/,
      file,
    );
  }
});

test("the docs-link clause's `.md` proof still proves, on its `✖ <file>:<line>` line (task 257)", () => {
  const doc = "docs/tasks/task.1.x/task.1.x.md";
  const run = join(RUN_DIR, "doclinks.log");
  writeFileSync(run, `✖ ${doc}:12 → ./missing.md\nFAIL doc-links: 1 broken\n`);
  assert.equal(evaluateFixAndRecheck(proofFor(doc, run)).proceed, true);
  // A document whose path merely starts with the name does not prove it.
  assert.equal(
    evaluateFixAndRecheck(proofFor("docs/tasks/task.1.x/task.1.x", run))
      .proceed,
    false,
  );
});

test("otherRed lists the other failing tests once each, without the runner's headings (task 257)", () => {
  const run = realRun("other-red", [
    ["first red one", false],
    ["green one", true],
    ["second red one", false],
  ]);
  const r = evaluateFixAndRecheck(proofFor("first red one", run));
  assert.equal(r.proceed, true, JSON.stringify(r.failed));
  // spec prints each failure twice (inline and in the failing-tests summary),
  // and a `failing tests:` heading on a ✖ line of its own.
  assert.deepEqual(r.otherRed, ["second red one"]);
  // A refused proof still reports what else was red.
  const refused = evaluateFixAndRecheck(proofFor("green one", run));
  assert.equal(refused.proceed, false);
  assert.deepEqual([...refused.otherRed].sort(), [
    "first red one",
    "second red one",
  ]);
});

// ---------------------------------------------------------------------------
// task 257 — a Files Summary entry is read as a pathspec (obs #132).

/** `inside-files-summary`'s verdict for one touched path against one Files Summary. */
function scopeVerdict(filesSummary, touched) {
  const r = evaluateFixAndRecheck({
    ...GOOD,
    touched: Array.isArray(touched) ? touched : [touched],
    filesSummary,
  });
  return r.failed.find((f) => f.id === "inside-files-summary") ?? null;
}
const admitted = (summary, path) => scopeVerdict(summary, path) === null;

test("scope: a trailing-slash entry is a directory prefix, and `*` is one path segment (task 257)", () => {
  const dir = ["skills/*/references/"];
  assert.equal(
    admitted(dir, "skills/finalise/references/wireframe-map.js"),
    true,
  );
  assert.equal(
    admitted(dir, "skills/finalise/references/nested/deep.js"),
    true,
  );
  // The directory itself is not a file inside it, and a sibling tree is not inside it.
  assert.equal(admitted(dir, "shared/resources/wireframe-map.js"), false);
  assert.equal(admitted(dir, "skills/finalise/SKILL.md"), false);
  assert.equal(
    admitted(["shared/resources/"], "shared/resources2/a.js"),
    false,
  );
  assert.equal(admitted(["shared/resources/"], "shared/resources/a.js"), true);
});

test("scope: {a,b} alternatives expand, in the middle of a segment too (task 257)", () => {
  const braces = ["skills/{create-story,create-task}/SKILL.md"];
  assert.equal(admitted(braces, "skills/create-story/SKILL.md"), true);
  assert.equal(admitted(braces, "skills/create-task/SKILL.md"), true);
  assert.equal(admitted(braces, "skills/create-epic/SKILL.md"), false);
  const mid = ["skills/create-{story,task}/SKILL.md"];
  assert.equal(admitted(mid, "skills/create-task/SKILL.md"), true);
  assert.equal(admitted(mid, "skills/create-bug/SKILL.md"), false);
  // Control: a pattern and paths this task never mentions.
  const other = ["lib/{alpha,beta}/gamma/*.cfg"];
  assert.equal(admitted(other, "lib/beta/gamma/app.cfg"), true);
  assert.equal(admitted(other, "lib/delta/gamma/app.cfg"), false);
  assert.equal(admitted(other, "lib/beta/gamma/sub/app.cfg"), false);
});

test("scope: `*` never crosses a `/` (task 257)", () => {
  assert.equal(admitted(["skills/*/SKILL.md"], "skills/a/SKILL.md"), true);
  assert.equal(admitted(["skills/*/SKILL.md"], "skills/a/b/SKILL.md"), false);
});

test("scope: an entry with no literal path segment is not a scope and matches nothing (task 257)", () => {
  for (const entry of ["*", "**", "**/*", "*/", "**/", "{*,**}"]) {
    assert.equal(admitted([entry], "docs/anything/at/all.md"), false, entry);
    assert.equal(admitted([entry], "a.js"), false, entry);
  }
});

test("scope: a pattern never admits a traversal, an absolute path or a path with a line break (task 257)", () => {
  // glob-match.js does not resolve `..`, and `**` crosses `/`: without a guard
  // `skills/*/references/` would admit a path that climbs out of it.
  const dir = ["skills/*/references/", "shared/resources/"];
  for (const bad of [
    "skills/a/references/../../../etc/passwd",
    "shared/resources/../../outside.js",
    "/skills/a/references/x.js",
    "skills/a/references/x.js\n",
    "skills/a/references/x.js\r",
    "skills/a/references/x.js\0.md",
  ]) {
    assert.equal(admitted(dir, bad), false, JSON.stringify(bad));
  }
  // The same paths are admitted when listed EXACTLY only if the author wrote
  // them: a pattern is what must not widen.
  assert.equal(
    admitted(dir, "skills/a/references/x..y.js"),
    true,
    "`..` inside a name is not traversal",
  );
});

test("scope: a path the matcher would normalise is judged in its normalised form (QA cycle 1, T257-CR-1)", () => {
  const dir = ["skills/**", "etc/", "src/*/x.js", "src/"];
  for (const bad of [
    "skills\\a\\..\\..\\..\\etc\\passwd",
    "\\etc\\passwd",
    " /etc/passwd",
    "src/a.js ",
    "src/a.js\t",
    "src/./x.js",
    "src//x.js",
    "./src/a.js/../../b.js",
  ]) {
    assert.equal(admitted(dir, bad), false, JSON.stringify(bad));
  }
  // Controls: canonical paths still match.
  assert.equal(admitted(dir, "src/a/x.js"), true);
  assert.equal(admitted(dir, "skills/a/b.md"), true);
});

test("pathInScope: the exported scope predicate agrees with the gate (QA cycle 1, T257-BOUNDARY-1)", () => {
  assert.equal(pathInScope("a/b.js", ["a/"]), true);
  assert.equal(pathInScope("c/b.js", ["a/"]), false);
  assert.equal(pathInScope("a/../c.js", ["a/"]), false);
  assert.equal(pathInScope("a/b.js", []), false);
  assert.equal(
    pathInScope("a/b.js", "a/"),
    false,
    "a non-list scope admits nothing",
  );
});

test("scope: an oversized brace list is refused, not expanded without bound (task 257)", () => {
  const groups = Array.from({ length: 24 }, () => "{a,b}").join("/");
  const started = Date.now();
  assert.equal(
    admitted(
      [`${groups}/x.js`],
      "a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/a/x.js",
    ),
    false,
  );
  assert.ok(
    Date.now() - started < 2000,
    loadSensitive("the 24-group brace entry must be refused, not expanded"),
  );
  // A list inside the bound still works.
  assert.equal(admitted(["x/{a,b}/{c,d}.js"], "x/b/c.js"), true);
});

test("scope: an exact entry is still admitted, and a path outside every entry is still refused (task 257)", () => {
  assert.equal(
    admitted(["shared/resources/qa-cycle.sh"], "shared/resources/qa-cycle.sh"),
    true,
  );
  const v = scopeVerdict(
    ["shared/resources/qa-cycle.sh"],
    ["shared/resources/qa-cycle.sh", "docs/README.md"],
  );
  assert.match(v.detail, /outside the Files Summary: docs\/README\.md/);
});

test("--json prints otherRed (task 257)", () => {
  const run = realRun("other-red-cli", [
    ["named red", false],
    ["bystander red", false],
  ]);
  const finding = join(RUN_DIR, "finding-other-red.json");
  writeFileSync(finding, JSON.stringify(proofFor("named red", run)));
  const out = spawnSync(
    process.execPath,
    [CLI, "--finding", finding, "--json"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.deepEqual(JSON.parse(out.stdout).otherRed, ["bystander red"]);
});

// ---------------------------------------------------------------------------
// task 258 — the evaluator reads its input the way people and runners write it
// (CR2-1 to CR2-4 from task 257's QA gate 2). Each test was run red on the
// unchanged tree before its fix.

test("a test file is refused by name in every common spelling and any letter case (task 258, CR2-1)", () => {
  for (const file of [
    "tests/x.TEST.js",
    "tests/x_test.go",
    "tests/x.sh",
    "test_foo.py",
    "lib/Y.Spec.TS",
    "pkg/parse_test.py",
    "src/__tests__/a.js",
  ]) {
    const r = evaluateFixAndRecheck(proofFor(file, RED_RUN));
    assert.equal(r.proceed, false, file);
    assert.equal(r.failed[0].id, "mutation-proved", file);
    assert.match(
      r.failed[0].detail,
      /a test file — name the test by its title/,
      file,
    );
  }
});

test("controls: a real title that mentions test, a dir or a slash is not refused as a file (task 258, CR2-1)", () => {
  for (const title of [
    "test_parse_title",
    "tests dir is skipped",
    "GET /v1 tests the route",
    "docs/tests/x.md",
  ]) {
    const run = textRun("ctl-title", `✖ ${title} (1ms)\n`);
    const r = evaluateFixAndRecheck(proofFor(title, run));
    assert.equal(r.proceed, true, `${title}: ${JSON.stringify(r.failed)}`);
  }
});

test("scope: a Files Summary entry written ./x, /x or in backticks means x (task 258, CR2-2)", () => {
  for (const entry of [
    "./src/a.js",
    "/src/a.js",
    "`src/a.js`",
    "./`src/a.js`",
  ]) {
    assert.equal(
      pathInScope("src/a.js", [entry]),
      entry !== "./`src/a.js`",
      entry,
    );
  }
  // A directory prefix, however it is spelled.
  assert.equal(pathInScope("src/a.js", ["./src/"]), true);
  assert.equal(pathInScope("srcx/a.js", ["./src/"]), false);
  assert.equal(pathInScope("src/a.js", ["`./src/`"]), true);
  // Controls: normalising an entry never widens the candidate or the scope.
  assert.equal(pathInScope("/etc/passwd", ["/src/a.js"]), false);
  assert.equal(pathInScope("etc/passwd", ["/src/a.js"]), false);
  assert.equal(pathInScope("src/b.js", ["./src/a.js"]), false);
  assert.equal(pathInScope("src/a.js", ["./**"]), false, "no literal segment");
  assert.equal(pathInScope("src/a.js", ["/"]), false);
  // An exact entry that was admitted before still is.
  assert.equal(pathInScope("src/a.js", ["src/a.js"]), true);
});

test("a CRLF run log is read like an LF one (task 258, CR2-3)", () => {
  const lf = realRun("crlf-source", [
    ["crlf title", false],
    ["other crlf green", true],
  ]);
  const crlf = textRun("crlf", readFileSync(lf, "utf8").replace(/\n/g, "\r\n"));
  assert.equal(
    evaluateFixAndRecheck(proofFor("crlf title", crlf)).proceed,
    true,
  );
  assert.equal(evaluateFixAndRecheck(proofFor("crlf title", lf)).proceed, true);
  // Control: a CR inside a title (not at the line end) is still part of it.
  const inner = textRun("cr-inner", "✖ foo\rbar (1ms)\n");
  assert.equal(evaluateFixAndRecheck(proofFor("foo", inner)).proceed, false);
});

test("the `:<digit>` boundary belongs to a .md proof path, not to any title with a slash (task 258, CR2-4)", () => {
  const colon = textRun(
    "slash-colon",
    "✔ GET /v1 (1ms)\n✖ GET /v1:5 stuff (1ms)\n",
  );
  assert.equal(
    evaluateFixAndRecheck(proofFor("GET /v1", colon)).proceed,
    false,
  );
  // Controls: the same title proves on its own red line, and a .md path with
  // `:12` still proves (the docs-link clause).
  const own = textRun("slash-own", "✖ GET /v1 (1ms)\n");
  assert.equal(evaluateFixAndRecheck(proofFor("GET /v1", own)).proceed, true);
  const docs = textRun("slash-docs", "✖ docs/a/b.md:12 → dead link\n");
  assert.equal(
    evaluateFixAndRecheck(proofFor("docs/a/b.md", docs)).proceed,
    true,
  );
});
