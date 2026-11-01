// finalise-deferred-ci — task 249, obs #110. A CI-state criterion is graded from CI reading 1.
//
// The AC agent runs at /finalise Step 3b, before CI reading 1 exists (Step 6). A criterion whose
// only evidence is CI state used to come back PARTIAL or FAIL from an agent that could not see the
// reading that decides acceptance. It now comes back `DEFERRED-CI`, and Step 6 action 2a grades it.
//
// Three claims, each held below by the smallest case whose reverse turns it red:
//
//   1. Every reader of the AC status accepts DEFERRED-CI and none folds it to PASS:
//      `computeOverall`, `merge` (full and reported-gap), the record writer, `scope`.
//      Mutation: make computeOverall treat DEFERRED-CI as PASS → the computeOverall and merge
//      cases go red.
//   2. `resolveDeferredCi` maps SUCCESS → PASS, FAILURE → FAIL, anything else → still deferred,
//      and re-folds the section verdict. Mutation: map PENDING to PASS in `ciResolution` → the
//      undecided cases go red.
//   3. The Step 6 action 2a fence in skills/finalise/SKILL.md, executed as written (bash, and zsh
//      when present), rebinds AC_OVERALL from the re-folded verdict and rewrites the merged result
//      and the record. Mutation: drop the `AC_OVERALL=$(… .overall)` line → the fence cases go red.
//
// Controls (obs #176): a behaviour criterion that FAILs beside a DEFERRED-CI one is not lifted by
// a green CI reading; an all-PASS section with nothing deferred is unchanged by the block.

import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractBlocks } from "../qa-execute-snippets.mjs";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "..");
const ENGINE_PATH = join(HERE, "..", "finalise-rerun-scope.js");
const FINALISE = join(ROOT, "skills", "finalise", "SKILL.md");
const eng = require(ENGINE_PATH);
const BUDGET = spawnBudget("DEFERRED_CI");
const hasZsh = spawnSync("zsh", ["-c", "true"]).status === 0;
const SHELLS = hasZsh ? ["bash", "zsh"] : ["bash"];
const D = eng.DEFERRED_CI;
const SEEN = new Set();

const cleanup = (dir) =>
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

// ── fixtures ──────────────────────────────────────────────────────────────

const CRITERIA = [
  { id: "SC-1", text: "CI is green on the PR head" },
  { id: "SC-2", text: "the engine returns PASS on a resolved entry" },
  { id: "SC-3", text: "the merge keeps the deferred status" },
].map((c) => ({ ...c, text_hash: eng.hashText(c.text) }));

/** A full-mode scope over CRITERIA, as `scope` would build it with no prior record. */
function fullScope() {
  return {
    reason: "no-prior-record",
    exitCode: 0,
    mode: "full",
    head: "0".repeat(40),
    criteria: CRITERIA,
    changed: [],
    rejudge: CRITERIA.map((c) => ({ id: c.id, reason: "new-criterion" })),
    carry: [],
    carried_prior: {},
  };
}

const NO_IO = { tracked: () => [] };

function agentYaml(statuses) {
  const body = Object.entries(statuses)
    .map(([id, status]) =>
      [
        `    - ac_id: "${id}"`,
        `      status: ${status}`,
        `      code_citation: "${status === D ? ".github/workflows/ci.yml:1" : "src/a.js:1"}"`,
        `      test_citation: "${status === D ? "NOT_APPLICABLE: CI-state criterion" : "tests/a.test.mjs:1"}"`,
        `      note: ""`,
      ].join("\n"),
    )
    .join("\n");
  return `ac_traceability:\n  acs:\n${body}\n  docs: []\n  overall: PASS\n`;
}

const merged = (statuses) =>
  eng.merge(fullScope(), agentYaml(statuses), { dodN: 1 }, NO_IO);

// ── 1. every reader accepts DEFERRED-CI, none folds it to PASS ─────────────

test("computeOverall: an unresolved DEFERRED-CI is never PASS", () => {
  assert.equal(eng.computeOverall([{ status: "PASS" }], []), "PASS"); // control
  assert.equal(
    eng.computeOverall([{ status: "PASS" }, { status: D }], []),
    "PARTIAL",
  );
  assert.equal(eng.computeOverall([{ status: D }], []), "FAIL");
  assert.equal(eng.computeOverall([{ status: D }, { status: D }], []), "FAIL");
});

test("merge (full): DEFERRED-CI survives into acs and the record; overall is not PASS", () => {
  const r = merged({ "SC-1": D, "SC-2": "PASS", "SC-3": "PASS" });
  assert.equal(r.reason, "merged");
  const ac = r.ac_result.ac_traceability;
  assert.equal(ac.acs.find((a) => a.ac_id === "SC-1").status, D);
  assert.equal(ac.overall, "PARTIAL");
  const rec = r.record.criteria.find((c) => c.id === "SC-1");
  assert.equal(
    rec.status,
    D,
    "the record writer must not coerce DEFERRED-CI to FAIL",
  );
  assert.equal(rec.non_member_fail, null);
  // Control: an ordinary non-PASS is still recorded FAIL.
  const r2 = merged({ "SC-1": D, "SC-2": "PARTIAL", "SC-3": "PASS" });
  assert.equal(r2.record.criteria.find((c) => c.id === "SC-2").status, "FAIL");
});

test("merge (reported-gap with members): an agent DEFERRED-CI is kept, not member-folded to FAIL", () => {
  const s = {
    ...fullScope(),
    reason: "prior-record",
    mode: "scoped",
    rejudge: [
      {
        id: "SC-1",
        reason: "reported-gap",
        prior: {
          id: "SC-1",
          status: "FAIL",
          members: [{ member: "lane-a", evidence: null, status: "FAIL" }],
          code_citation: null,
          test_citation: null,
          note: "prior run",
        },
        known_members: ["lane-a"],
        carried_members: [],
        rejudge_members: ["lane-a"],
      },
      { id: "SC-2", reason: "new-criterion" },
      { id: "SC-3", reason: "new-criterion" },
    ],
  };
  const r = eng.merge(
    s,
    agentYaml({ "SC-1": D, "SC-2": "PASS", "SC-3": "PASS" }),
    {},
    NO_IO,
  );
  const ac = r.ac_result.ac_traceability;
  assert.equal(ac.acs.find((a) => a.ac_id === "SC-1").status, D);
  assert.equal(r.record.criteria.find((c) => c.id === "SC-1").status, D);
  assert.notEqual(ac.overall, "PASS");
});

test("scope: a prior DEFERRED-CI criterion is re-judged, never carried", () => {
  const dir = mkdtempSync(join(tmpdir(), "deferred-ci-"));
  const GIT = [
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "-c",
    "commit.gpgsign=false",
  ];
  const git = (...a) =>
    execFileSync("git", [...GIT, ...a], { cwd: dir, encoding: "utf8" }).trim();
  try {
    git("init", "-q", "-b", "main");
    const doc = [
      "---",
      "type: task",
      "status: in-progress",
      "---",
      "",
      "## 9. Success Criteria",
      "",
      ...CRITERIA.map((c) => `- [ ] ${c.id}: ${c.text}`),
      "",
    ].join("\n");
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "task.md"), doc);
    writeFileSync(join(dir, "src", "a.js"), "a\n");
    git("add", "-A");
    git("commit", "-q", "-m", "A");
    const a = git("rev-parse", "HEAD");
    const crit = eng.readCriteria(doc);
    const prior = {
      schema: 1,
      dod_n: 1,
      head: a,
      document: "task.md",
      criteria: crit.map((c) => ({
        id: c.id,
        text_hash: c.text_hash,
        status: c.id === "SC-1" ? D : "PASS",
        code_citation: "src/a.js:1",
        test_citation: "src/a.js:1",
        members: [],
        note: null,
      })),
      advisories: [],
    };
    writeFileSync(join(dir, "README.md"), "x\n");
    git("add", "-A");
    git("commit", "-q", "-m", "B");
    const s = eng.scope(
      {
        priorText: JSON.stringify(prior),
        priorPath: "task.dod.1.ac.json",
        docBody: doc,
        head: git("rev-parse", "HEAD"),
      },
      eng.gitIo(dir),
    );
    assert.equal(s.mode, "scoped");
    assert.equal(
      s.rejudge.find((r) => r.id === "SC-1")?.reason,
      "reported-gap",
    );
    assert.ok(!s.carry.some((c) => c.id === "SC-1"));
  } finally {
    cleanup(dir);
  }
});

// ── 2. resolveDeferredCi ──────────────────────────────────────────────────

function resolveFrom(statuses, ci) {
  const r = eng.resolveDeferredCi(
    merged(statuses).ac_result.ac_traceability,
    ci,
  );
  SEEN.add(r.reason);
  return r;
}

test("resolve: SUCCESS grades DEFERRED-CI to PASS and re-folds the section to PASS", () => {
  const r = resolveFrom(
    { "SC-1": D, "SC-2": "PASS", "SC-3": "PASS" },
    { rollup: "SUCCESS", ciHead: "abc123" },
  );
  assert.equal(r.reason, "resolved");
  assert.equal(r.overall, "PASS");
  const sc1 = r.acs.find((a) => a.ac_id === "SC-1");
  assert.equal(sc1.status, "PASS");
  assert.match(sc1.note, /resolved from CI reading 1: SUCCESS @ abc123/);
  assert.deepEqual(r.resolved, [{ ac_id: "SC-1", status: "PASS" }]);
});

test("resolve: a tree-equivalent SUCCESS names the green sha", () => {
  const r = resolveFrom(
    { "SC-1": D, "SC-2": "PASS", "SC-3": "PASS" },
    { rollup: "SUCCESS", ciHead: "abc123", treeEq: "def456" },
  );
  assert.match(
    r.acs.find((a) => a.ac_id === "SC-1").note,
    /SUCCESS \(tree-equivalent to def456\) @ abc123/,
  );
});

test("resolve: FAILURE grades DEFERRED-CI to FAIL, with the reading as its non-member reason", () => {
  const r = resolveFrom(
    { "SC-1": D, "SC-2": "PASS", "SC-3": "PASS" },
    { rollup: "FAILURE", ciHead: "abc123" },
  );
  assert.equal(r.reason, "resolved");
  assert.equal(r.overall, "PARTIAL");
  const sc1 = r.acs.find((a) => a.ac_id === "SC-1");
  assert.equal(sc1.status, "FAIL");
  assert.match(sc1.non_member_fail, /CI reading 1: FAILURE/);
});

for (const rollup of ["PENDING", "NONE", "CANCELLED", "UNKNOWN", ""]) {
  test(`resolve: ${rollup || "an empty"} rollup decides nothing — entries stay DEFERRED-CI, overall not PASS`, () => {
    assert.equal(eng.ciResolution(rollup), null);
    const r = resolveFrom(
      { "SC-1": D, "SC-2": "PASS", "SC-3": "PASS" },
      { rollup },
    );
    assert.equal(r.reason, "ci-undecided");
    assert.deepEqual(r.undecided, ["SC-1"]);
    assert.equal(r.acs.find((a) => a.ac_id === "SC-1").status, D);
    assert.notEqual(r.overall, "PASS");
  });
}

test("resolve (control): a green CI reading does not lift an ordinary behaviour FAIL", () => {
  const r = resolveFrom(
    { "SC-1": D, "SC-2": "FAIL", "SC-3": "PASS" },
    { rollup: "SUCCESS" },
  );
  assert.equal(r.acs.find((a) => a.ac_id === "SC-2").status, "FAIL");
  assert.equal(r.overall, "PARTIAL");
});

test("resolve (control): nothing deferred → none-deferred, overall unchanged", () => {
  const r = resolveFrom(
    { "SC-1": "PASS", "SC-2": "PASS", "SC-3": "PASS" },
    { rollup: "FAILURE" },
  );
  assert.equal(r.reason, "none-deferred");
  assert.equal(r.overall, "PASS");
});

// ── 3. the Step 6 action 2a fence, executed ───────────────────────────────

const VARS = [
  "STEM",
  "DOD_N",
  "DOC_DIR",
  "CI_ROLLUP",
  "CI_HEAD_1",
  "CI_TREE_EQ",
  "AC_OVERALL",
];

function step6Block() {
  const blocks = extractBlocks(readFileSync(FINALISE, "utf8")).filter((b) =>
    /Step 6 action 2a/.test(b.code),
  );
  assert.equal(
    blocks.length,
    1,
    `expected one Step 6 action 2a fence, found ${blocks.length}`,
  );
  // The fence sits inside a numbered list item: strip its common indentation.
  const lines = blocks[0].code.split("\n");
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length),
  );
  return lines.map((l) => l.slice(indent)).join("\n");
}

/** The fence with each input line bound to `vals` and the engine path made absolute. */
function bind(code, vals) {
  let out = code;
  for (const v of VARS) {
    const re = new RegExp(`^${v}="[^"\\n]*"$`, "m");
    assert.match(out, re, `the fence must bind ${v} on a line of its own`);
    if (vals[v] !== undefined)
      out = out.replace(re, `${v}=${JSON.stringify(vals[v])}`);
  }
  const enginePath =
    ".agents/skills/finalise/references/finalise-rerun-scope.js";
  assert.ok(out.includes(enginePath), "the fence calls the bundled engine");
  return out.split(enginePath).join(ENGINE_PATH);
}

function stage(statuses) {
  const dir = mkdtempSync(join(tmpdir(), "deferred-ci-fence-"));
  mkdirSync(join(dir, ".claude", "state"), { recursive: true });
  mkdirSync(join(dir, "doc"), { recursive: true });
  const r = merged(statuses);
  writeFileSync(
    join(dir, ".claude", "state", "finalise-ac-merged-1.json"),
    JSON.stringify(r, null, 2),
  );
  writeFileSync(
    join(dir, "doc", "task.9.dod.1.ac.json"),
    JSON.stringify(r.record, null, 2),
  );
  return { dir, overall: r.ac_result.ac_traceability.overall };
}

function runFence(shell, dir, vals) {
  const script = bind(step6Block(), {
    STEM: "task.9",
    DOD_N: "1",
    DOC_DIR: "doc",
    CI_HEAD_1: "abc123",
    CI_TREE_EQ: "",
    ...vals,
  });
  let r;
  for (let attempt = 0; attempt <= BUDGET.retries; attempt += 1) {
    r = spawnSync(shell, ["-c", script], {
      cwd: dir,
      encoding: "utf8",
      timeout: BUDGET.timeoutMs,
    });
    if (!neverRan(r)) break;
  }
  const m = /^AC_OVERALL=(.*)$/m.exec(r.stdout || "");
  return { ...r, acOverall: m ? m[1] : null };
}

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

for (const shell of SHELLS) {
  test(`fence (${shell}): SUCCESS rebinds AC_OVERALL to PASS and rewrites merged result + record`, () => {
    const { dir, overall } = stage({
      "SC-1": D,
      "SC-2": "PASS",
      "SC-3": "PASS",
    });
    try {
      assert.equal(overall, "PARTIAL");
      const r = runFence(shell, dir, {
        CI_ROLLUP: "SUCCESS",
        AC_OVERALL: overall,
      });
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.equal(r.acOverall, "PASS");
      const m = readJson(
        join(dir, ".claude", "state", "finalise-ac-merged-1.json"),
      );
      assert.equal(m.ac_result.ac_traceability.overall, "PASS");
      assert.equal(
        m.ac_result.ac_traceability.acs.find((a) => a.ac_id === "SC-1").status,
        "PASS",
      );
      const rec = readJson(join(dir, "doc", "task.9.dod.1.ac.json"));
      assert.equal(rec.criteria.find((c) => c.id === "SC-1").status, "PASS");
      assert.match(
        rec.criteria.find((c) => c.id === "SC-1").note,
        /CI reading 1: SUCCESS @ abc123/,
      );
    } finally {
      cleanup(dir);
    }
  });

  test(`fence (${shell}): FAILURE grades the criterion FAIL and AC_OVERALL stays not PASS`, () => {
    const { dir, overall } = stage({
      "SC-1": D,
      "SC-2": "PASS",
      "SC-3": "PASS",
    });
    try {
      const r = runFence(shell, dir, {
        CI_ROLLUP: "FAILURE",
        AC_OVERALL: overall,
      });
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.equal(r.acOverall, "PARTIAL");
      const rec = readJson(join(dir, "doc", "task.9.dod.1.ac.json"));
      assert.equal(rec.criteria.find((c) => c.id === "SC-1").status, "FAIL");
    } finally {
      cleanup(dir);
    }
  });

  test(`fence (${shell}): PENDING leaves the criterion deferred, AC_OVERALL not PASS, files untouched`, () => {
    const { dir, overall } = stage({
      "SC-1": D,
      "SC-2": "PASS",
      "SC-3": "PASS",
    });
    try {
      const before = readFileSync(
        join(dir, "doc", "task.9.dod.1.ac.json"),
        "utf8",
      );
      const r = runFence(shell, dir, {
        CI_ROLLUP: "PENDING",
        AC_OVERALL: overall,
      });
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.notEqual(r.acOverall, "PASS");
      assert.match(r.stdout, /"reason":"ci-undecided"/);
      assert.equal(
        readFileSync(join(dir, "doc", "task.9.dod.1.ac.json"), "utf8"),
        before,
      );
    } finally {
      cleanup(dir);
    }
  });

  test(`fence (${shell}): no merged result (bug mode) skips and keeps AC_OVERALL`, () => {
    const dir = mkdtempSync(join(tmpdir(), "deferred-ci-fence-"));
    try {
      const r = runFence(shell, dir, {
        CI_ROLLUP: "SUCCESS",
        AC_OVERALL: "FAIL",
      });
      assert.equal(r.status, 0, r.stderr + r.stdout);
      assert.equal(r.acOverall, "FAIL");
    } finally {
      cleanup(dir);
    }
  });

  test(`fence (${shell}): an unsubstituted input HALTs before anything runs`, () => {
    const { dir } = stage({ "SC-1": D, "SC-2": "PASS", "SC-3": "PASS" });
    try {
      const r = runFence(shell, dir, { CI_ROLLUP: "SUCCESS" }); // AC_OVERALL left as its placeholder
      assert.equal(r.status, 1);
      assert.match(r.stdout, /HALT: substitute every input/);
      assert.ok(existsSync(join(dir, "doc", "task.9.dod.1.ac.json")));
      assert.equal(
        readJson(join(dir, "doc", "task.9.dod.1.ac.json")).criteria.find(
          (c) => c.id === "SC-1",
        ).status,
        D,
      );
    } finally {
      cleanup(dir);
    }
  });
}

test("every resolve-ci reason is reachable", () => {
  for (const reason of eng.RESOLVE_CI_REASONS)
    assert.ok(
      SEEN.has(reason),
      `resolve-ci reason ${reason} was never produced`,
    );
});
