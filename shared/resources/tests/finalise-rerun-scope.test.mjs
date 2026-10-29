// finalise-rerun-scope — task 242. A /finalise re-run judges a fixed scope.
//
// Every case builds a REAL temporary git repository: the scope decision reads
// `git diff`, `git merge-base --is-ancestor` and `git ls-files`, and a fake git
// would only test the fake. Each case commits a prior state A, writes the
// record a run at A would have written, makes one change, commits B, and asks
// the engine what a run at B re-judges.

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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neverRan, spawnBudget } from "../spawn-budget.mjs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = join(__dirname, "..", "finalise-rerun-scope.js");
const NEWEST_NUMBERED = join(__dirname, "..", "newest-numbered.sh");
const eng = require(ENGINE_PATH);
const CLI_BUDGET = spawnBudget("RERUN_SCOPE");

// Every reason a case below produced, so the closing test can hold that each
// documented reason is reachable rather than merely listed.
const SEEN = new Set();

// ── fixtures ──────────────────────────────────────────────────────────────

const GIT = [
  "-c",
  "user.name=t",
  "-c",
  "user.email=t@t",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "maintenance.auto=false",
  "-c",
  "gc.auto=0",
];
const git = (cwd, ...args) =>
  execFileSync("git", [...GIT, ...args], { cwd, encoding: "utf8" }).trim();
const cleanup = (dir) =>
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });

const DOC = "docs/tasks/task.9.demo/task.9.demo.md";

function taskDoc({ status = "in-progress", criteria, extra = "" }) {
  return [
    "---",
    "id: task.9",
    "type: task",
    `status: ${status}`,
    "---",
    "",
    "# Technical Task: Demo",
    "",
    "## 8. Testing Strategy",
    "",
    "- [ ] SC-99: a checkbox outside the criteria section is not a criterion",
    "",
    "## 9. Success Criteria",
    "",
    "### Functional",
    "",
    ...criteria,
    "",
    "## 10. Risk Assessment",
    "",
    "None.",
    extra,
  ].join("\n");
}

const BASE_CRITERIA = [
  "- [ ] SC-1: the engine returns full on no prior record",
  "- [x] SC-2: the engine carries an untouched PASS",
  "- [ ] SC-3: every assertion group in the template test is pinned",
  "  - an indented sub-point is not a criterion",
  "- [ ] SC-4: the CHANGELOG cites task 242",
];

const BASE_FILES = {
  "src/a.js": "a\n",
  "src/b.js": "b\n",
  "tests/a.test.mjs": "ta\n",
  "tests/b.test.mjs": "tb\n",
  "tests/qa-escalation-template.test.mjs": "groups\n",
  "CHANGELOG.md": "## [Unreleased]\n",
  "lib/x/dup.js": "1\n",
  "lib/y/dup.js": "2\n",
};

function mkRepo(files = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rerun-scope-"));
  git(dir, "init", "-q", "-b", "main");
  commit(
    dir,
    { ...BASE_FILES, [DOC]: taskDoc({ criteria: BASE_CRITERIA }), ...files },
    "A",
  );
  return dir;
}

function commit(dir, files, msg = "c") {
  for (const [p, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), body);
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "--allow-empty", "-m", msg);
  return git(dir, "rev-parse", "HEAD");
}

/** A record a run at `head` would have written over `doc`. */
function record(dir, head, statuses, doc = DOC) {
  const criteria = eng
    .readCriteria(readFileSync(join(dir, doc), "utf8"))
    .map((c) => ({
      id: c.id,
      text_hash: c.text_hash,
      status: "PASS",
      description: c.text.slice(0, 40),
      code_citation: "src/a.js:1",
      test_citation: "tests/a.test.mjs:1",
      members: [],
      note: null,
      ...(statuses[c.id] || {}),
    }));
  return JSON.stringify({
    schema: 1,
    dod_n: 1,
    head,
    document: doc,
    criteria,
    advisories: [],
  });
}

function scopeAt(dir, priorText, doc = DOC) {
  const s = eng.scope(
    {
      priorText,
      priorPath: "task.9.dod.1.ac.json",
      docBody: readFileSync(join(dir, doc), "utf8"),
      head: git(dir, "rev-parse", "HEAD"),
    },
    eng.gitIo(dir),
  );
  SEEN.add(s.reason);
  for (const r of s.rejudge) SEEN.add(r.reason);
  for (const c of s.carry) SEEN.add(c.reason);
  return s;
}

const reasonOf = (s, id) => {
  const r =
    s.rejudge.find((x) => x.id === id) || s.carry.find((x) => x.id === id);
  return r && r.reason;
};

// ── criteria ──────────────────────────────────────────────────────────────

test("readCriteria: the document's own ids, only top-level lines of the criteria section", () => {
  const c = eng.readCriteria(taskDoc({ criteria: BASE_CRITERIA }));
  assert.deepEqual(
    c.map((x) => x.id),
    ["SC-1", "SC-2", "SC-3", "SC-4"],
  );
});

test("readCriteria: the checkbox state alone is not a reword", () => {
  const a = eng.readCriteria(
    taskDoc({ criteria: ["- [ ] SC-1:  the   engine works"] }),
  )[0];
  const b = eng.readCriteria(
    taskDoc({ criteria: ["- [x] SC-1: the engine works"] }),
  )[0];
  assert.equal(a.text_hash, b.text_hash);
  const c = eng.readCriteria(
    taskDoc({ criteria: ["- [x] SC-1: the engine still works"] }),
  )[0];
  assert.notEqual(a.text_hash, c.text_hash);
});

test("readCriteria: an id-less task document gets #N ids by position", () => {
  const c = eng.readCriteria(
    taskDoc({
      criteria: ["- [ ] first thing holds", "- [x] second thing holds"],
    }),
  );
  assert.deepEqual(
    c.map((x) => x.id),
    ["#1", "#2"],
  );
});

test("readCriteria: a story's numbered acceptance criteria get #N ids", () => {
  const story =
    "---\ntype: story\nstatus: in-progress\n---\n\n## Acceptance Criteria\n\n1. `a.md` exists.\n2. It links to `b.md`.\n   - sub-point\n\n## Tasks\n\n- [ ] not a criterion\n";
  const c = eng.readCriteria(story);
  assert.deepEqual(
    c.map((x) => [x.id, x.text]),
    [
      ["#1", "`a.md` exists."],
      ["#2", "It links to `b.md`."],
    ],
  );
});

// ── scope: the full reasons ───────────────────────────────────────────────

test("scope: no prior record → full / no-prior-record", () => {
  const dir = mkRepo();
  try {
    const s = scopeAt(dir, null);
    assert.equal(s.mode, "full");
    assert.equal(s.reason, "no-prior-record");
    assert.deepEqual(
      s.rejudge.map((r) => r.id),
      ["SC-1", "SC-2", "SC-3", "SC-4"],
    );
    assert.deepEqual(s.carry, []);
  } finally {
    cleanup(dir);
  }
});

test("scope: a corrupt record, or one of an unknown schema → full / prior-unreadable", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    assert.equal(scopeAt(dir, "{not json").reason, "prior-unreadable");
    const other = JSON.parse(record(dir, a, {}));
    other.schema = 2;
    assert.equal(
      scopeAt(dir, JSON.stringify(other)).reason,
      "prior-unreadable",
    );
    const noHead = JSON.parse(record(dir, a, {}));
    noHead.head = "HEAD";
    assert.equal(scopeAt(dir, JSON.stringify(noHead)).mode, "full");
    // Control: the same record, intact, is scoped.
    assert.equal(scopeAt(dir, record(dir, a, {})).mode, "scoped");
  } finally {
    cleanup(dir);
  }
});

test("scope: a reopened document → full / reopened", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {});
    commit(dir, {
      [DOC]: taskDoc({
        criteria: BASE_CRITERIA,
        extra: "\n## Definition of Done - PASSED ✅\n",
      }),
    });
    const s = scopeAt(dir, prior);
    assert.deepEqual([s.mode, s.reason], ["full", "reopened"]);
    // Control: the same block on an accepted document is not a reopen.
    commit(dir, {
      [DOC]: taskDoc({
        status: "accepted",
        criteria: BASE_CRITERIA,
        extra: "\n## Definition of Done - PASSED ✅\n",
      }),
    });
    assert.equal(scopeAt(dir, prior).mode, "scoped");
  } finally {
    cleanup(dir);
  }
});

test("scope: a prior head that is not an ancestor (a rebase) → full / head-not-ancestor", () => {
  const dir = mkRepo();
  try {
    const a = commit(dir, { "src/a.js": "a2\n" }, "A2");
    const prior = record(dir, a, {});
    git(dir, "reset", "-q", "--hard", "HEAD~1");
    commit(dir, { "src/b.js": "b2\n" }, "rebased");
    const s = scopeAt(dir, prior);
    assert.deepEqual([s.mode, s.reason], ["full", "head-not-ancestor"]);
  } finally {
    cleanup(dir);
  }
});

test("scope: a document with no criterion line → full / no-criteria", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {});
    commit(dir, {
      [DOC]:
        "---\nstatus: in-progress\n---\n\n## 9. Success Criteria\n\nProse only.\n",
    });
    assert.deepEqual(
      [scopeAt(dir, prior).mode, scopeAt(dir, prior).reason],
      ["full", "no-criteria"],
    );
  } finally {
    cleanup(dir);
  }
});

// ── scope: the per-criterion rows ─────────────────────────────────────────

test("scope: an untouched PASS is carried as unchanged; only the document changed", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {});
    commit(dir, {
      [DOC]: taskDoc({ criteria: BASE_CRITERIA, extra: "\nA note.\n" }),
    });
    const s = scopeAt(dir, prior);
    assert.equal(s.mode, "scoped");
    assert.deepEqual(
      s.carry.map((c) => c.id),
      ["SC-1", "SC-2", "SC-3", "SC-4"],
    );
    assert.ok(s.carry.every((c) => c.reason === "unchanged"));
  } finally {
    cleanup(dir);
  }
});

test("scope: a criterion added → new-criterion; reworded → criterion-changed", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {});
    const criteria = [...BASE_CRITERIA, "- [ ] SC-5: a new criterion"];
    criteria[1] =
      "- [x] SC-2: the engine carries an untouched PASS and its citations";
    commit(dir, { [DOC]: taskDoc({ criteria }) });
    const s = scopeAt(dir, prior);
    assert.equal(reasonOf(s, "SC-5"), "new-criterion");
    assert.equal(reasonOf(s, "SC-2"), "criterion-changed");
    assert.equal(reasonOf(s, "SC-1"), "unchanged");
  } finally {
    cleanup(dir);
  }
});

test("scope: a FAIL is a reported-gap", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {
      "SC-4": { status: "FAIL", code_citation: null },
    });
    commit(dir, { "CHANGELOG.md": "## [Unreleased]\n- task 242\n" });
    assert.equal(reasonOf(scopeAt(dir, prior), "SC-4"), "reported-gap");
  } finally {
    cleanup(dir);
  }
});

test("scope: a cited test file changed → evidence-changed; a member's evidence counts too", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {
      "SC-2": {
        code_citation: "src/b.js:1",
        test_citation: "tests/b.test.mjs:9",
      },
      "SC-3": {
        code_citation: "src/b.js:1",
        test_citation: "tests/b.test.mjs:1",
        members: [
          {
            member: "G1",
            evidence: "tests/qa-escalation-template.test.mjs:4",
            status: "PASS",
          },
        ],
      },
    });
    commit(dir, {
      "tests/a.test.mjs": "ta2\n",
      "tests/qa-escalation-template.test.mjs": "groups2\n",
    });
    const s = scopeAt(dir, prior);
    assert.equal(reasonOf(s, "SC-1"), "evidence-changed");
    assert.equal(reasonOf(s, "SC-3"), "evidence-changed");
    assert.equal(reasonOf(s, "SC-2"), "unchanged");
  } finally {
    cleanup(dir);
  }
});

test("scope: an uncommitted edit to a cited file re-judges rather than carries", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {});
    writeFileSync(join(dir, "src/a.js"), "dirty\n");
    assert.equal(reasonOf(scopeAt(dir, prior), "SC-1"), "evidence-changed");
  } finally {
    cleanup(dir);
  }
});

test("scope: citations that resolve to no tracked path → evidence-unresolved; a unique basename resolves", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {
      "SC-1": { code_citation: ":356-360", test_citation: a.slice(0, 8) },
      "SC-2": {
        code_citation: "a.js:1",
        test_citation: "qa-escalation-template.test.mjs:102-106",
      },
      "SC-3": {
        code_citation: "dup.js:1",
        test_citation: "NOT_APPLICABLE: documentation criterion",
      },
    });
    commit(dir, {
      [DOC]: taskDoc({ criteria: BASE_CRITERIA, extra: "\nx\n" }),
    });
    const s = scopeAt(dir, prior);
    assert.equal(reasonOf(s, "SC-1"), "evidence-unresolved");
    assert.equal(
      reasonOf(s, "SC-2"),
      "unchanged",
      "a bare basename one tracked file carries resolves",
    );
    assert.equal(
      reasonOf(s, "SC-3"),
      "evidence-unresolved",
      "an ambiguous basename does not resolve",
    );
  } finally {
    cleanup(dir);
  }
});

test("resolveCitation: the shapes task.239's runs cited", () => {
  const t = eng.trackedIndex([
    "tests/qa-escalation-template.test.mjs",
    "lib/x/dup.js",
    "lib/y/dup.js",
    "CHANGELOG.md",
  ]);
  assert.deepEqual(
    eng.resolveCitation("qa-escalation-template.test.mjs:102-106", t),
    ["tests/qa-escalation-template.test.mjs"],
  );
  assert.deepEqual(eng.resolveCitation("`CHANGELOG.md:309`; `:356-360`", t), [
    "CHANGELOG.md",
  ]);
  assert.deepEqual(eng.resolveCitation(":410-412", t), []);
  assert.deepEqual(eng.resolveCitation("b324b496", t), []);
  assert.deepEqual(eng.resolveCitation("dup.js:3", t), []);
  assert.deepEqual(eng.resolveCitation("lib/x/dup.js:3", t), ["lib/x/dup.js"]);
  assert.deepEqual(
    eng.resolveCitation("NOT_APPLICABLE: measured criterion", t),
    [],
  );
  assert.deepEqual(eng.resolveCitation(null, t), []);
});

test("scope: an id-less task document matches by text hash; a reword is new-criterion", () => {
  const criteria = [
    "- [ ] first thing holds",
    "- [x] second thing holds",
    "- [ ] third thing holds",
  ];
  const dir = mkRepo({ [DOC]: taskDoc({ criteria }) });
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {});
    // Insert a criterion at the top (every #N shifts) and reword the third.
    commit(dir, {
      [DOC]: taskDoc({
        criteria: [
          "- [ ] zeroth thing holds",
          criteria[0],
          criteria[1],
          "- [ ] third thing holds, reworded",
        ],
      }),
    });
    const s = scopeAt(dir, prior);
    assert.equal(reasonOf(s, "#1"), "new-criterion");
    assert.equal(
      reasonOf(s, "#2"),
      "unchanged",
      "moved from #1, matched by its text",
    );
    assert.equal(reasonOf(s, "#3"), "unchanged");
    assert.equal(
      reasonOf(s, "#4"),
      "new-criterion",
      "an id-less reword cannot be told from a new criterion",
    );
  } finally {
    cleanup(dir);
  }
});

test("scope: an id-less story document matches by text hash", () => {
  const STORY = "docs/prd/p/story.1.1.1.demo/story.1.1.1.demo.md";
  const body = (acs) =>
    `---\ntype: story\nstatus: in-progress\n---\n\n## Acceptance Criteria\n\n${acs.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## Tasks\n`;
  const dir = mkRepo({
    [STORY]: body(["`a.md` exists.", "It links to `b.md`."]),
  });
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const prior = record(dir, a, {}, STORY);
    commit(dir, { [STORY]: body(["`a.md` exists.", "It links to `c.md`."]) });
    const s = scopeAt(dir, prior, STORY);
    assert.equal(reasonOf(s, "#1"), "unchanged");
    assert.equal(reasonOf(s, "#2"), "new-criterion");
  } finally {
    cleanup(dir);
  }
});

test("scope: prior head equal to HEAD re-judges only the reported gaps", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const s = scopeAt(dir, record(dir, a, { "SC-3": { status: "FAIL" } }));
    assert.deepEqual(
      s.rejudge.map((r) => [r.id, r.reason]),
      [["SC-3", "reported-gap"]],
    );
    assert.equal(s.carry.length, 3);
  } finally {
    cleanup(dir);
  }
});

test("scope: a record that was never committed is read like any other", () => {
  const dir = mkRepo();
  try {
    const a = git(dir, "rev-parse", "HEAD");
    const recPath = "docs/tasks/task.9.demo/task.9.dod.1.ac.json";
    writeFileSync(
      join(dir, recPath),
      record(dir, a, { "SC-1": { status: "FAIL" } }),
    );
    const r = cli(dir, [
      "scope",
      "--doc",
      DOC,
      "--head",
      "HEAD",
      "--prior",
      recPath,
      "--json",
    ]);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.mode, "scoped");
    assert.equal(reasonOf(out, "SC-1"), "reported-gap");
  } finally {
    cleanup(dir);
  }
});

// ── the task.239 replay ───────────────────────────────────────────────────

// Run 4 failed SC-11 naming groups G1–G3 unmapped and G4–G6 mapped. Only the
// task document changed before run 5, which failed SC-11 on finer groups no
// earlier run had named. Under a scope, run 5 re-checks G1–G3, carries G4–G6,
// and a finer group on unchanged evidence is an advisory, not a gap.
function replayRepo() {
  const criteria = [
    "- [x] SC-1: grant-qa-cycles.sh writes convergence_from_cycle",
    "- [x] SC-2: the halt message names the action",
    "- [ ] SC-11: each guard is mutation-proved",
  ];
  const dir = mkRepo({ [DOC]: taskDoc({ criteria }) });
  const a = git(dir, "rev-parse", "HEAD");
  const ev = (n) => `tests/qa-escalation-template.test.mjs:${n}`;
  const prior = record(dir, a, {
    "SC-1": {
      code_citation: "src/a.js:1",
      test_citation: "tests/a.test.mjs:1",
    },
    "SC-2": {
      code_citation: "src/b.js:1",
      test_citation: "tests/b.test.mjs:1",
    },
    "SC-11": {
      status: "FAIL",
      code_citation: "src/a.js:1",
      test_citation: "tests/qa-escalation-template.test.mjs:1",
      members: [
        { member: "G1", evidence: null, status: "FAIL" },
        { member: "G2", evidence: null, status: "FAIL" },
        { member: "G3", evidence: null, status: "FAIL" },
        { member: "G4", evidence: ev(231), status: "PASS" },
        { member: "G5", evidence: ev(93), status: "PASS" },
        { member: "G6", evidence: ev(108), status: "PASS" },
      ],
    },
  });
  commit(
    dir,
    { [DOC]: taskDoc({ criteria, extra: "\nRun 4 gaps recorded.\n" }) },
    "docs only",
  );
  return { dir, prior };
}

const AGENT_RUN5 = `ac_traceability:
  story_file: "${DOC}"
  pr_number: 1
  pr_status: OPEN
  pr_review_decision: null
  acs:
    - ac_id: "SC-1"
      description: "writes convergence_from_cycle"
      status: PASS
      code_citation: "src/a.js:1"
      test_citation: "tests/a.test.mjs:1"
      test_runs_per_pr: true
    - ac_id: "SC-2"
      description: "names the action"
      status: FAIL
      code_citation: "src/b.js:1"
      test_citation: null
      note: "a finer reading of the halt message"
    - ac_id: "SC-11"
      description: "each guard mutation-proved"
      status: FAIL
      code_citation: "src/a.js:1"
      test_citation: "tests/qa-escalation-template.test.mjs:1"
      test_runs_per_pr: true
      members:
        - member: "G1"
          evidence: "tests/qa-escalation-template.test.mjs:102"
          status: PASS
        - member: "G2"
          evidence: "tests/qa-escalation-template.test.mjs:356"
          status: PASS
        - member: "G3"
          evidence: "tests/qa-escalation-template.test.mjs:410"
          status: PASS
        - member: "G5"
          evidence: "tests/qa-escalation-template.test.mjs:93"
          status: FAIL
        - member: "G7"
          evidence: "tests/qa-escalation-template.test.mjs:156"
          status: FAIL
          note: "a finer group no earlier run named"
      note: "G5 and G7 unmapped"
  docs:
    - item: "README"
      status: NOT_APPLICABLE
      citation: null
      note: "internal"
  advisories: []
  overall: FAIL
  summary: "SC-11 fails"
`;

test("replay task.239: scope makes SC-11 a reported-gap, carrying G4–G6 and re-checking G1–G3", () => {
  const { dir, prior } = replayRepo();
  try {
    const s = scopeAt(dir, prior);
    const sc11 = s.rejudge.find((r) => r.id === "SC-11");
    assert.equal(sc11.reason, "reported-gap");
    assert.deepEqual(
      sc11.carried_members.map((m) => m.member),
      ["G4", "G5", "G6"],
    );
    assert.deepEqual(sc11.rejudge_members, ["G1", "G2", "G3"]);
    assert.deepEqual(
      s.carry.map((c) => [c.id, c.reason]),
      [
        ["SC-1", "unchanged"],
        ["SC-2", "unchanged"],
      ],
    );
    const text = eng.renderScopeText(s);
    assert.match(text, /"SC-11" \(reported-gap\)/);
    assert.match(text, /re-check members: G1; G2; G3/);
    assert.match(text, /carried members \(do not re-judge\): G4; G5; G6/);
  } finally {
    cleanup(dir);
  }
});

test("replay task.239: merge restores G5, sends G7 to advisories, and SC-11 passes", () => {
  const { dir, prior } = replayRepo();
  try {
    const s = scopeAt(dir, prior);
    const r = eng.merge(
      s,
      AGENT_RUN5,
      { dodN: 5, document: DOC },
      eng.gitIo(dir),
    );
    assert.equal(r.reason, "merged");
    const ac = r.ac_result.ac_traceability;
    const sc11 = ac.acs.find((x) => x.ac_id === "SC-11");
    assert.equal(sc11.status, "PASS");
    assert.equal(
      sc11.members.find((m) => m.member === "G5").status,
      "PASS",
      "G5 is carried, whatever the agent said",
    );
    assert.ok(
      !sc11.members.some((m) => m.member === "G7"),
      "G7 is not counted",
    );
    assert.ok(
      ac.advisories.some((a) => a.ac_id === "SC-11" && /G7/.test(a.note)),
    );
    assert.ok(
      ac.advisories.some((a) => a.ac_id === "SC-11" && /G5/.test(a.note)),
    );
    // SC-2 was carried: the agent's finer FAIL is an advisory, not a status.
    assert.equal(ac.acs.find((x) => x.ac_id === "SC-2").status, "PASS");
    assert.ok(ac.advisories.some((a) => a.ac_id === "SC-2"));
    assert.equal(ac.overall, "PASS");
    assert.equal(ac.agent_overall, "FAIL");
    assert.equal(
      r.scope_line,
      "**Re-run scope:** scoped (prior-record) — 1 re-judged, 2 carried",
    );
    assert.equal(r.record.head, s.head);
    assert.deepEqual(
      r.record.criteria.map((c) => [c.id, c.status]),
      [
        ["SC-1", "PASS"],
        ["SC-2", "PASS"],
        ["SC-11", "PASS"],
      ],
    );
  } finally {
    cleanup(dir);
  }
});

test("replay control: a new member whose evidence changed is counted, and fails the criterion", () => {
  const { dir, prior } = replayRepo();
  try {
    commit(dir, {
      "tests/qa-escalation-template.test.mjs": "groups changed\n",
    });
    const s = scopeAt(dir, prior);
    // The carried members' evidence moved too, so nothing is carried now.
    assert.deepEqual(
      s.rejudge.find((r) => r.id === "SC-11").carried_members,
      [],
    );
    const r = eng.merge(
      s,
      AGENT_RUN5,
      { dodN: 5, document: DOC },
      eng.gitIo(dir),
    );
    const sc11 = r.ac_result.ac_traceability.acs.find(
      (x) => x.ac_id === "SC-11",
    );
    assert.equal(sc11.status, "FAIL");
    assert.ok(sc11.members.some((m) => m.member === "G7"));
  } finally {
    cleanup(dir);
  }
});

test("replay control: a prior FAIL member the agent still fails keeps the gap", () => {
  const { dir, prior } = replayRepo();
  try {
    const s = scopeAt(dir, prior);
    const yaml = AGENT_RUN5.replace(
      /(member: "G2"\n\s+evidence: "[^"]+"\n\s+status:) PASS/,
      "$1 FAIL",
    );
    assert.notEqual(yaml, AGENT_RUN5);
    const r = eng.merge(s, yaml, {}, eng.gitIo(dir));
    assert.equal(
      r.ac_result.ac_traceability.acs.find((x) => x.ac_id === "SC-11").status,
      "FAIL",
    );
    assert.equal(r.ac_result.ac_traceability.overall, "PARTIAL");
  } finally {
    cleanup(dir);
  }
});

// QA cycle 1, CR-3: the members overturn an agent FAIL only when they explain it.
const RUN5_NO_FAILING_MEMBER = AGENT_RUN5.replace(
  /\n {8}- member: "G5"[\s\S]*?a finer group no earlier run named"/,
  "",
);

test("reported-gap: an agent FAIL that names no failing member stands (CR-3)", () => {
  const { dir, prior } = replayRepo();
  try {
    assert.notEqual(RUN5_NO_FAILING_MEMBER, AGENT_RUN5);
    assert.doesNotMatch(RUN5_NO_FAILING_MEMBER, /member: "G[57]"/);
    const s = scopeAt(dir, prior);
    const sc11 = eng
      .merge(s, RUN5_NO_FAILING_MEMBER, {}, eng.gitIo(dir))
      .ac_result.ac_traceability.acs.find((x) => x.ac_id === "SC-11");
    assert.equal(sc11.status, "FAIL", "the FAIL rests on something else");
  } finally {
    cleanup(dir);
  }
});

test("reported-gap: test_runs_per_pr: false keeps the criterion FAIL whatever the members say (CR-3)", () => {
  const { dir, prior } = replayRepo();
  try {
    const yaml = AGENT_RUN5.replace(
      /(ac_id: "SC-11"[\s\S]*?test_runs_per_pr:) true/,
      "$1 false",
    );
    assert.notEqual(yaml, AGENT_RUN5);
    const s = scopeAt(dir, prior);
    const sc11 = eng
      .merge(s, yaml, {}, eng.gitIo(dir))
      .ac_result.ac_traceability.acs.find((x) => x.ac_id === "SC-11");
    assert.equal(sc11.status, "FAIL");
  } finally {
    cleanup(dir);
  }
});

test("reported-gap: a re-check member the agent omits is FAIL, never its prior PASS (CR-4)", () => {
  const { dir, prior } = replayRepo();
  try {
    // G4–G6's evidence moves, so every member is re-checked.
    commit(dir, {
      "tests/qa-escalation-template.test.mjs": "groups changed\n",
    });
    const s = scopeAt(dir, prior);
    assert.deepEqual(s.rejudge.find((r) => r.id === "SC-11").rejudge_members, [
      "G1",
      "G2",
      "G3",
      "G4",
      "G5",
      "G6",
    ]);
    // The agent passes everything it answers, and does not answer G4 or G6.
    const yaml = RUN5_NO_FAILING_MEMBER.replace(
      /(ac_id: "SC-11"\n\s+description: "[^"]*"\n\s+status:) FAIL/,
      "$1 PASS",
    ).replace(
      /(\n {8}- member: "G3"\n {10}evidence: "[^"]+"\n {10}status: PASS)/,
      '$1\n        - member: "G5"\n          evidence: "tests/qa-escalation-template.test.mjs:93"\n          status: PASS',
    );
    const sc11 = eng
      .merge(s, yaml, {}, eng.gitIo(dir))
      .ac_result.ac_traceability.acs.find((x) => x.ac_id === "SC-11");
    assert.equal(sc11.status, "FAIL");
    const g4 = sc11.members.find((m) => m.member === "G4");
    assert.equal(g4.status, "FAIL");
    assert.match(g4.note, /no verdict returned for re-check member G4/);
    // Control: answer G4 and G6 too and the criterion passes.
    const full = yaml.replace(
      /(\n {8}- member: "G5"\n {10}evidence: "[^"]+"\n {10}status: PASS)/,
      '$1\n        - member: "G4"\n          evidence: "tests/qa-escalation-template.test.mjs:231"\n          status: PASS\n        - member: "G6"\n          evidence: "tests/qa-escalation-template.test.mjs:108"\n          status: PASS',
    );
    assert.notEqual(full, yaml);
    assert.equal(
      eng
        .merge(s, full, {}, eng.gitIo(dir))
        .ac_result.ac_traceability.acs.find((x) => x.ac_id === "SC-11").status,
      "PASS",
    );
  } finally {
    cleanup(dir);
  }
});

test("merge: an id the engine did not issue is reported with its own status, empty and duplicate ids included (CR-8)", () => {
  const dir = mkRepo();
  try {
    const s = scopeAt(dir, null);
    const yaml = [
      "ac_traceability:",
      "  acs:",
      '    - ac_id: ""',
      "      status: FAIL",
      '      note: "empty id"',
      '    - ac_id: "AC9"',
      "      status: PASS",
      '    - ac_id: "AC9"',
      "      status: FAIL",
      "  docs: []",
      "",
    ].join("\n");
    const ac = eng.merge(s, yaml, {}, eng.gitIo(dir)).ac_result.ac_traceability;
    assert.deepEqual(ac.id_mismatches, ["(none)", "AC9", "AC9"]);
    const notes = ac.advisories.map((a) => `${a.ac_id} ${a.note}`);
    assert.ok(
      notes.some((n) => /^\(none\) .*\(FAIL: empty id\)/.test(n)),
      notes.join("\n"),
    );
    assert.ok(
      notes.some((n) => /^AC9 .*\(PASS\)/.test(n)),
      notes.join("\n"),
    );
    assert.ok(
      notes.some((n) => /^AC9 .*\(FAIL\)/.test(n)),
      notes.join("\n"),
    );
  } finally {
    cleanup(dir);
  }
});

// QA cycle 2. A reported gap whose prior FAIL rested on no member: SC-3 failed
// with both its members mapped and passing (an execution-rule FAIL, say).
function nonMemberGap(extraPrior = {}) {
  const dir = mkRepo();
  const prior = record(dir, git(dir, "rev-parse", "HEAD"), {
    "SC-3": {
      status: "FAIL",
      members: [
        { member: "G1", evidence: "tests/a.test.mjs:1", status: "PASS" },
        { member: "G2", evidence: "tests/b.test.mjs:1", status: "PASS" },
      ],
      note: "cited test does not run per PR",
      ...extraPrior,
    },
  });
  return { dir, s: scopeAt(dir, prior) };
}

// SC-1, SC-2 and SC-4 are carried; `sc3` is the agent's SC-3 entry, or "".
function gapYaml(sc3) {
  const pass = (id) =>
    `    - ac_id: "${id}"\n      status: PASS\n      code_citation: "src/a.js:1"\n      test_citation: "tests/a.test.mjs:1"\n      test_runs_per_pr: true`;
  return [
    "ac_traceability:",
    "  acs:",
    pass("SC-1"),
    pass("SC-2"),
    ...(sc3 ? [sc3] : []),
    pass("SC-4"),
    "  docs: []",
    "",
  ].join("\n");
}

const SC3_MEMBERS = [
  "      members:",
  '        - member: "G1"',
  '          evidence: "tests/a.test.mjs:1"',
  "          status: PASS",
  '        - member: "G2"',
  '          evidence: "tests/b.test.mjs:1"',
  "          status: PASS",
];

function sc3Entry(status, { extraMembers = [], fields = [] } = {}) {
  return [
    `    - ac_id: "SC-3"`,
    `      status: ${status}`,
    '      code_citation: "src/a.js:1"',
    '      test_citation: "tests/a.test.mjs:1"',
    "      test_runs_per_pr: true",
    ...SC3_MEMBERS,
    ...extraMembers,
    ...fields,
  ].join("\n");
}

const sc3Of = (r) =>
  r.ac_result.ac_traceability.acs.find((x) => x.ac_id === "SC-3");

test("reported-gap: no agent verdict keeps the prior FAIL, even when every member is carried (CR2-1)", () => {
  const { dir, s } = nonMemberGap();
  try {
    const gap = s.rejudge.find((r) => r.id === "SC-3");
    assert.equal(gap.reason, "reported-gap");
    assert.deepEqual(gap.rejudge_members, [], "every member is carried");
    // Omitted, and returned under an id the engine did not issue.
    for (const yaml of [
      gapYaml(""),
      gapYaml(sc3Entry("PASS").replace('"SC-3"', '"SC-3x"')),
    ]) {
      const r = eng.merge(s, yaml, {}, eng.gitIo(dir));
      assert.equal(sc3Of(r).status, "FAIL");
      assert.match(
        sc3Of(r).note,
        /no verdict returned for SC-3; prior FAIL stands/,
      );
      assert.equal(r.ac_result.ac_traceability.overall, "PARTIAL");
    }
    // Control: an agent that re-judges SC-3 PASS is merged as PASS.
    const ok = eng.merge(s, gapYaml(sc3Entry("PASS")), {}, eng.gitIo(dir));
    assert.equal(sc3Of(ok).status, "PASS");
    assert.equal(ok.ac_result.ac_traceability.overall, "PASS");
  } finally {
    cleanup(dir);
  }
});

const INVENTED_G9 = [
  '        - member: "G9"',
  '          evidence: "tests/a.test.mjs:5"',
  "          status: FAIL",
];

test("reported-gap: non_member_fail keeps an agent FAIL that an invented member would otherwise overturn (CR2-2)", () => {
  const { dir, s } = nonMemberGap();
  try {
    const stands = eng.merge(
      s,
      gapYaml(
        sc3Entry("FAIL", {
          extraMembers: INVENTED_G9,
          fields: [
            '      non_member_fail: "cited test does not exercise the criterion"',
            '      note: "test misses the branch"',
          ],
        }),
      ),
      {},
      eng.gitIo(dir),
    );
    assert.equal(sc3Of(stands).status, "FAIL");
    assert.equal(sc3Of(stands).note, "test misses the branch");
    // The reason is kept in the record, and the next run's scope names it.
    const entry = stands.record.criteria.find((c) => c.id === "SC-3");
    assert.equal(
      entry.non_member_fail,
      "cited test does not exercise the criterion",
    );
    const next = scopeAt(dir, JSON.stringify(stands.record));
    assert.match(
      eng.renderScopeText(next),
      /prior non-member FAIL \(re-check it\): cited test does not exercise the criterion/,
    );
    // Control — the task.239 shape: without the field, a FAIL resting only on a
    // new member on unchanged evidence is overturned, and the agent's note is
    // kept as an advisory.
    const overturned = eng.merge(
      s,
      gapYaml(
        sc3Entry("FAIL", {
          extraMembers: INVENTED_G9,
          fields: ['      note: "G9 unmapped"'],
        }),
      ),
      {},
      eng.gitIo(dir),
    );
    assert.equal(sc3Of(overturned).status, "PASS");
    const notes = overturned.ac_result.ac_traceability.advisories.map(
      (a) => a.note,
    );
    assert.ok(
      notes.some((n) => /new member G9/.test(n)),
      notes.join("\n"),
    );
    assert.ok(
      notes.some((n) => /agent's FAIL overturned .*: G9 unmapped/.test(n)),
      notes.join("\n"),
    );
    assert.equal(
      overturned.record.criteria.find((c) => c.id === "SC-3").non_member_fail,
      null,
    );
  } finally {
    cleanup(dir);
  }
});

test("scope: a cited path deleted or renamed since the prior head re-judges; an unrelated rename does not (CR2-3)", () => {
  for (const [label, move, want] of [
    ["deleted", (d) => git(d, "rm", "-q", "src/b.js"), "evidence-changed"],
    [
      "renamed",
      (d) => git(d, "mv", "src/b.js", "src/c.js"),
      "evidence-changed",
    ],
    [
      "unrelated rename",
      (d) => git(d, "mv", "lib/x/dup.js", "lib/x/dup2.js"),
      "unchanged",
    ],
  ]) {
    const dir = mkRepo();
    try {
      const prior = record(dir, git(dir, "rev-parse", "HEAD"), {
        // src/a.js and tests/a.test.mjs stay unchanged throughout.
        "SC-2": { code_citation: "src/a.js:1 src/b.js:1" },
      });
      move(dir);
      git(dir, "commit", "-q", "-m", label);
      assert.equal(reasonOf(scopeAt(dir, prior), "SC-2"), want, label);
    } finally {
      cleanup(dir);
    }
  }
});

test("scope → merge → scope: a cited file the agents read uncommitted, then discarded, is re-judged (CR2-4)", () => {
  const dir = mkRepo();
  try {
    writeFileSync(join(dir, "src/b.js"), "uncommitted\n");
    const s1 = scopeAt(dir, null);
    assert.deepEqual(s1.dirty, ["src/b.js"]);
    const yaml = gapYaml(sc3Entry("PASS")).replace(
      /(ac_id: "SC-2"\n\s+status: PASS\n\s+code_citation:) "src\/a.js:1"/,
      '$1 "src/b.js:1"',
    );
    const r = eng.merge(s1, yaml, {}, eng.gitIo(dir));
    assert.deepEqual(r.record.dirty_paths, ["src/b.js"]);
    git(dir, "checkout", "-q", "--", "src/b.js");
    const text = JSON.stringify(r.record);
    assert.equal(reasonOf(scopeAt(dir, text), "SC-2"), "evidence-changed");
    // Control: the same record written from a clean tree carries SC-2.
    const clean = JSON.stringify({ ...r.record, dirty_paths: [] });
    assert.equal(reasonOf(scopeAt(dir, clean), "SC-2"), "unchanged");
  } finally {
    cleanup(dir);
  }
});

// ── merge ─────────────────────────────────────────────────────────────────

function agentYaml(acs, { docs = "  docs: []", overall = "PASS" } = {}) {
  const body = acs
    .map(
      (a) =>
        `    - ac_id: "${a.id}"\n      status: ${a.status}\n      code_citation: ${a.code ?? '"src/a.js:1"'}\n      test_citation: ${a.test ?? '"tests/a.test.mjs:1"'}\n      note: "${a.note ?? ""}"`,
    )
    .join("\n");
  return `ac_traceability:\n  acs:\n${body}\n${docs}\n  overall: ${overall}\n`;
}

function scopedAllPass() {
  const dir = mkRepo();
  const a = git(dir, "rev-parse", "HEAD");
  const prior = record(dir, a, { "SC-4": { status: "FAIL" } });
  commit(dir, { "CHANGELOG.md": "## [Unreleased]\n- task 242\n" });
  return { dir, s: scopeAt(dir, prior) };
}

test("merge: an agent FAIL on a carried criterion stays PASS and becomes an advisory", () => {
  const { dir, s } = scopedAllPass();
  try {
    const yaml = agentYaml([
      { id: "SC-1", status: "FAIL", note: "finer reading" },
      { id: "SC-2", status: "PASS" },
      { id: "SC-3", status: "PASS" },
      { id: "SC-4", status: "PASS" },
    ]);
    const ac = eng.merge(s, yaml, {}, eng.gitIo(dir)).ac_result.ac_traceability;
    const sc1 = ac.acs.find((x) => x.ac_id === "SC-1");
    assert.equal(sc1.status, "PASS");
    assert.equal(sc1.code_citation, "src/a.js:1");
    assert.ok(
      ac.advisories.some(
        (x) => x.ac_id === "SC-1" && /finer reading/.test(x.note),
      ),
    );
    assert.equal(ac.overall, "PASS");
  } finally {
    cleanup(dir);
  }
});

test("merge: a carried criterion the agent omits is still restored", () => {
  const { dir, s } = scopedAllPass();
  try {
    const ac = eng.merge(
      s,
      agentYaml([{ id: "SC-4", status: "PASS" }]),
      {},
      eng.gitIo(dir),
    ).ac_result.ac_traceability;
    assert.deepEqual(
      ac.acs.map((x) => [x.ac_id, x.status]),
      [
        ["SC-1", "PASS"],
        ["SC-2", "PASS"],
        ["SC-3", "PASS"],
        ["SC-4", "PASS"],
      ],
    );
  } finally {
    cleanup(dir);
  }
});

test("merge: an agent that invents its own ids is reported, not merged", () => {
  const dir = mkRepo();
  try {
    const s = scopeAt(dir, null);
    const yaml = agentYaml(
      [1, 2, 3, 4].map((n) => ({ id: `AC${n}`, status: "PASS" })),
    );
    const r = eng.merge(s, yaml, {}, eng.gitIo(dir));
    const ac = r.ac_result.ac_traceability;
    assert.deepEqual(ac.id_mismatches, ["AC1", "AC2", "AC3", "AC4"]);
    assert.ok(
      ac.acs.every(
        (x) =>
          x.status === "FAIL" && /no verdict returned under id/.test(x.note),
      ),
    );
    assert.equal(ac.overall, "FAIL");
    assert.deepEqual(
      r.record.criteria.map((c) => c.id),
      ["SC-1", "SC-2", "SC-3", "SC-4"],
    );
  } finally {
    cleanup(dir);
  }
});

test("merge: overall is recomputed from acs and docs, never copied", () => {
  const dir = mkRepo();
  try {
    const s = scopeAt(dir, null);
    const pass = ["SC-1", "SC-2", "SC-3", "SC-4"].map((id) => ({
      id,
      status: "PASS",
    }));
    const up = eng.merge(
      s,
      agentYaml(pass, { overall: "FAIL" }),
      {},
      eng.gitIo(dir),
    ).ac_result.ac_traceability;
    assert.equal(up.overall, "PASS");
    const failingDoc =
      '  docs:\n    - item: "README"\n      status: FAIL\n      citation: null';
    const down = eng.merge(
      s,
      agentYaml(pass, { docs: failingDoc, overall: "PASS" }),
      {},
      eng.gitIo(dir),
    ).ac_result.ac_traceability;
    assert.equal(down.overall, "PARTIAL");
  } finally {
    cleanup(dir);
  }
});

test("computeOverall: PASS, PARTIAL and FAIL", () => {
  assert.equal(
    eng.computeOverall([{ status: "PASS" }], [{ status: "NOT_APPLICABLE" }]),
    "PASS",
  );
  assert.equal(
    eng.computeOverall([{ status: "PASS" }, { status: "FAIL" }], []),
    "PARTIAL",
  );
  assert.equal(eng.computeOverall([{ status: "FAIL" }], []), "FAIL");
  assert.equal(
    eng.computeOverall([{ status: "PASS" }], [{ status: "FAIL" }]),
    "PARTIAL",
  );
  // CR-6: no criterion verdict at all is not "every criterion passed".
  assert.equal(eng.computeOverall([], []), "NEEDS_MANUAL_REVIEW");
  assert.equal(
    eng.computeOverall([], [{ status: "PASS" }]),
    "NEEDS_MANUAL_REVIEW",
  );
});

test("merge: unparseable output writes no record (CLI)", () => {
  const dir = mkRepo();
  try {
    writeFileSync(
      join(dir, "scope.json"),
      JSON.stringify({ ...scopeAt(dir, null) }),
    );
    writeFileSync(
      join(dir, "agent.yaml"),
      "this is not the YAML you asked for\n",
    );
    const rec = "docs/tasks/task.9.demo/task.9.dod.1.ac.json";
    const r = cli(dir, [
      "merge",
      "--scope",
      "scope.json",
      "--result",
      "agent.yaml",
      "--dod-n",
      "1",
      "--record-out",
      rec,
      "--json",
    ]);
    assert.equal(r.status, 0);
    assert.equal(JSON.parse(r.stdout).reason, "result-unparseable");
    assert.equal(existsSync(join(dir, rec)), false);
    // Control: a parseable answer writes it.
    writeFileSync(
      join(dir, "agent.yaml"),
      agentYaml(
        ["SC-1", "SC-2", "SC-3", "SC-4"].map((id) => ({ id, status: "PASS" })),
      ),
    );
    const ok = cli(dir, [
      "merge",
      "--scope",
      "scope.json",
      "--result",
      "agent.yaml",
      "--dod-n",
      "1",
      "--record-out",
      rec,
      "--json",
    ]);
    assert.equal(JSON.parse(ok.stdout).reason, "merged");
    const written = JSON.parse(readFileSync(join(dir, rec), "utf8"));
    assert.equal(written.schema, 1);
    assert.equal(written.dod_n, 1);
    assert.equal(written.head, git(dir, "rev-parse", "HEAD"));
  } finally {
    cleanup(dir);
  }
});

// ── CLI ───────────────────────────────────────────────────────────────────

function cli(dir, argv) {
  let r;
  for (let attempt = 0; attempt <= CLI_BUDGET.retries; attempt += 1) {
    r = spawnSync(process.execPath, [ENGINE_PATH, ...argv], {
      cwd: dir,
      encoding: "utf8",
      timeout: CLI_BUDGET.timeoutMs,
    });
    if (!neverRan(r)) return r;
  }
  return r;
}

test("CLI: a usage error exits 2; an empty --prior is no prior record", () => {
  const dir = mkRepo();
  try {
    assert.equal(cli(dir, ["scope", "--json"]).status, 2);
    assert.equal(cli(dir, ["bogus", "--json"]).status, 2);
    assert.equal(
      cli(dir, ["scope", "--doc", DOC, "--head", "nope", "--json"]).status,
      2,
    );
    const r = cli(dir, [
      "scope",
      "--doc",
      DOC,
      "--head",
      "HEAD",
      "--prior",
      "",
      "--json",
    ]);
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.deepEqual([out.mode, out.reason], ["full", "no-prior-record"]);
    assert.match(out.scope_text, /^mode: full \(no-prior-record\)/);
    assert.match(out.scope_text, /- "SC-1": /);
  } finally {
    cleanup(dir);
  }
});

test("newest_numbered finds the newest AC record and never a security run record", () => {
  const dir = mkdtempSync(join(tmpdir(), "rerun-scope-nn-"));
  try {
    for (const f of [
      "task.9.dod.2.ac.json",
      "task.9.dod.4.ac.json",
      "task.9.dod.10.ac.json",
      "task.9.dod.11.security.run.json",
      "task.9.dod.11.demo.md",
    ]) {
      writeFileSync(join(dir, f), "{}");
    }
    const out = execFileSync(
      "bash",
      [
        "-c",
        `source "$1" || exit 1; newest_numbered "$2" dod -name "task.9.dod.*.ac.json"`,
        "_",
        NEWEST_NUMBERED,
        dir,
      ],
      { encoding: "utf8" },
    ).trim();
    assert.equal(out, join(dir, "task.9.dod.10.ac.json"));
  } finally {
    cleanup(dir);
  }
});

test("every documented reason is reached by a case above", () => {
  for (const r of [...eng.FULL_REASONS, ...eng.CRITERION_REASONS]) {
    assert.ok(SEEN.has(r), `reason ${r} is documented but no case produced it`);
  }
});
