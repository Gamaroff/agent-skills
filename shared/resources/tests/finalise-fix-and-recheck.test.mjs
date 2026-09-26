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

import {
  CHECK_IDS,
  PRECONDITIONS,
  evaluateFixAndRecheck,
  gitFacts,
  isWorkItemDocument,
  isCoLocatedArtifact,
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

/** A recorded red run, as node:test prints one — written once for the suite. */
const RUN_DIR = mkdtempSync(join(tmpdir(), "fix-recheck-run-"));
const RED_RUN = join(RUN_DIR, "mutation-proof.log");
writeFileSync(
  RED_RUN,
  "test at tests/qa-cycle.test.js:142\n✖ a filename with an embedded newline is un-numbered (3ms)\nℹ fail 1\n",
);
const GREEN_RUN = join(RUN_DIR, "green.log");
writeFileSync(
  GREEN_RUN,
  "test at tests/qa-cycle.test.js:142\n✔ all good\nℹ pass 12\nℹ fail 0\n",
);
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
    test: "tests/qa-cycle.test.js",
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
    "docs/prd/a/b/epics/epic.2.x/stories/story.2.1.y/story.2.1.y.md",
    "docs/prd/a/b/epics/epic.2.x/epic.2.x.md",
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
    "docs/prd/a/b/epics/epic.2.x/stories/story.2.1.y/story.2.1.y.md",
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
  const story = "docs/prd/a/epics/epic.2.x/stories/story.2.1.y/story.2.1.y.md";
  for (const kind of [
    "qa.1",
    "dod.2",
    "implementation.1",
    "review.1",
    "pr-review.1",
    "sprint-review-summary",
  ]) {
    const p = `docs/prd/a/epics/epic.2.x/stories/story.2.1.y/story.2.1.${kind}.y.md`;
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
      test: "tests/qa-cycle.test.js",
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
    mutationProof: { test: "tests/qa-cycle.test.js", redOnRevert: false },
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
      test: "tests/qa-cycle.test.js",
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
  r = evaluateFixAndRecheck(proof({ test: "tests/other.test.js" }));
  assert.match(r.failed[0].detail, /does not mention tests\/other\.test\.js/);
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
      "✔ tests/qa-cycle.test.js passes everything (2ms)",
      "✔ another green one (1ms)",
      "",
      "",
      "",
      "",
      "",
      "✖ tests/other.test.js: something else is broken (3ms)",
      "ℹ fail 1",
      "",
    ].join("\n"),
  );
  const r = evaluateFixAndRecheck({
    ...GOOD,
    mutationProof: {
      test: "tests/qa-cycle.test.js",
      redOnRevert: true,
      run: suite,
    },
  });
  assert.equal(r.proceed, false);
  assert.match(
    r.failed[0].detail,
    /shows no failing test for tests\/qa-cycle\.test\.js/,
  );
  // The real shape — ✖ within a few lines of the test's name — still proves.
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
  const story = "docs/prd/a/epics/epic.2.x/stories/story.2.1.y/story.2.1.y.md";
  const summary =
    "docs/prd/a/epics/epic.2.x/stories/story.2.1.y/story.2.1.sprint-review-summary.md";
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
  // One definition: the doc-links corpus guards import this regex rather than
  // restating it, so the two cannot disagree again.
  const guard = read("shared/resources/tests/doc-links.test.mjs");
  assert.match(
    guard,
    /import \{[^}]*\bWORK_ITEM_ARTIFACT_RE\b[^}]*\} from "\.\.\/finalise-fix-and-recheck\.mjs"/,
  );
  assert.match(guard, /const ARTIFACT_RE = WORK_ITEM_ARTIFACT_RE;/);
  assert.doesNotMatch(guard, /const ARTIFACT_RE =\s*\//, "no second literal");
});

test("the unprefixed sprint-review-summary.md finalise writes beside a document is a co-located artifact — and only there (task.152 QA cycle 2, CR-2)", () => {
  const story = "docs/prd/a/epics/epic.2.x/stories/story.2.1.y/story.2.1.y.md";
  const dir = "docs/prd/a/epics/epic.2.x/stories/story.2.1.y/";
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
      "docs/prd/a/epics/epic.2.x/stories/story.2.2.z/sprint-review-summary.md",
    "a subdirectory": dir + "old/sprint-review-summary.md",
    "a .yml": dir + "sprint-review-summary.yml",
    "a lookalike name": dir + "xsprint-review-summary.md",
    "a .. path": dir + "../story.2.1.y/sprint-review-summary.md",
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
