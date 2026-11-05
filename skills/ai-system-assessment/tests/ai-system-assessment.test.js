"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  parseSignals,
  listFiles,
  runSignal,
  treeHash,
} = require("./lib/signal-harness.js");

const SKILL = path.resolve(__dirname, "..");
const REFS = path.join(SKILL, "references");
const FIXTURE = path.join(__dirname, "fixtures", "sample-target");

const REQUIRED_HEADINGS = [
  "Failure it prevents",
  "Evidence signals",
  "Thresholds",
  "Common false positive",
  "Closing artefact",
];

function checklists() {
  const files = fs
    .readdirSync(REFS)
    .filter((f) => /^p[1-8]-.*\.md$/.test(f))
    .sort();
  return files.map((f) => {
    const text = fs.readFileSync(path.join(REFS, f), "utf8");
    return { file: f, n: Number(f[1]), text, signals: parseSignals(text) };
  });
}

// What each signal must do against the fixture. A signal absent from this table fails the
// completeness test below, so a new signal cannot be added without stating its expected result.
const EXPECT = {
  "p1-instruction-file": true,
  "p1-scope-statement": true,
  "p1-codeowners": false,
  "p1-schema-check": true,
  "p2-source-of-truth": true,
  "p2-retrieval": false,
  "p2-drift-test": false,
  "p2-context-budget": false,
  "p3-tool-wrappers": true,
  "p3-idempotency": true,
  "p3-tool-fakes": false,
  "p3-exit-codes": true,
  "p4-permission-modes": true,
  "p4-user-identity": false,
  "p4-tool-allowlist": false,
  "p4-credential-redaction": false,
  "p5-untrusted-text-rule": true,
  "p5-secret-scan": false,
  "p5-pii-masking": false,
  "p5-input-filter": false,
  "p6-loop-limit": true,
  "p6-cheap-mode": false,
  "p6-model-routing": false,
  "p6-caching": false,
  "p7-run-log": true,
  "p7-decision-log": false,
  "p7-tool-records": false,
  "p7-trace-export": false,
  "p8-eval-suite": true,
  "p8-ci-on-prompt-edit": false,
  "p8-behavioural-eval": false,
  "p8-mutation-proof": false,
};

function runnable(list) {
  return list.flatMap((c) => c.signals).filter((s) => s.kind !== "command");
}

test("there is a checklist for each of the eight principles", () => {
  assert.deepEqual(
    checklists().map((c) => c.n),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
});

test("every checklist carries the required headings and a signals table", () => {
  for (const c of checklists()) {
    for (const h of REQUIRED_HEADINGS) {
      assert.match(
        c.text,
        new RegExp("^##\\s+" + h + "\\s*$", "m"),
        `${c.file}: missing "## ${h}"`,
      );
    }
    assert.ok(
      c.signals.length >= 3,
      `${c.file}: needs at least 3 signals, parsed ${c.signals.length}`,
    );
    for (const s of c.signals) {
      assert.ok(
        s.id.startsWith(`p${c.n}-`),
        `${c.file}: signal id ${s.id} must start with p${c.n}-`,
      );
      assert.ok(
        ["grep", "file", "command"].includes(s.kind),
        `${s.id}: unknown kind "${s.kind}"`,
      );
      if (s.kind === "grep")
        assert.doesNotThrow(
          () => new RegExp(s.pattern, "i"),
          `${s.id}: pattern does not compile`,
        );
    }
  }
});

test("every runnable signal has an expected result against the fixture, and no expectation is orphaned", () => {
  const ids = runnable(checklists()).map((s) => s.id);
  assert.deepEqual([...ids].sort(), Object.keys(EXPECT).sort());
});

test("each principle has a control the fixture holds and one it lacks", () => {
  for (const c of checklists()) {
    const results = runnable([c]).map((s) => EXPECT[s.id]);
    assert.ok(
      results.includes(true),
      `p${c.n}: the fixture needs at least one seeded control`,
    );
    assert.ok(
      results.includes(false),
      `p${c.n}: the fixture needs at least one seeded gap`,
    );
  }
});

test("signals hit the seeded controls and miss the seeded gaps", () => {
  for (const s of runnable(checklists())) {
    const r = runSignal(s, FIXTURE);
    assert.equal(
      r.hit,
      EXPECT[s.id],
      `${s.id}: expected ${EXPECT[s.id] ? "hit" : "miss"}, files=${r.files.join(",")}`,
    );
  }
});

test("a control under a nonstandard name is found by behaviour, and missed by name", () => {
  const nameOnly = /prompt.injection|untrusted/i;
  const mislabelled = path.join(FIXTURE, "docs", "trust-boundaries.md");
  assert.doesNotMatch(
    fs.readFileSync(mislabelled, "utf8"),
    nameOnly,
    "fixture must not use the checklist names",
  );
  for (const f of listFiles(FIXTURE)) {
    assert.doesNotMatch(
      fs.readFileSync(path.join(FIXTURE, f), "utf8"),
      nameOnly,
      `${f} would let a name-only search hit`,
    );
  }
  const p5 = checklists().find((c) => c.n === 5);
  const signal = p5.signals.find((s) => s.id === "p5-untrusted-text-rule");
  const r = runSignal(signal, FIXTURE);
  assert.equal(r.hit, true);
  assert.deepEqual(r.files, ["docs/trust-boundaries.md"]);
});

test("mutation: removing the files behind a hit turns that signal into a miss", () => {
  const hits = runnable(checklists()).filter((s) => EXPECT[s.id]);
  assert.ok(hits.length >= 8, "at least one seeded control per principle");
  for (const s of hits) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "asa-mut-"));
    try {
      fs.cpSync(FIXTURE, tmp, { recursive: true });
      const before = runSignal(s, tmp);
      assert.equal(
        before.hit,
        true,
        `${s.id}: hit in the copy before mutation`,
      );
      for (const f of before.files) fs.rmSync(path.join(tmp, f));
      assert.equal(
        runSignal(s, tmp).hit,
        false,
        `${s.id}: still hits after its evidence was removed`,
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
});

function signalById(id) {
  return runnable(checklists()).find((s) => s.id === id);
}

function withTree(files, fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "asa-tree-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
      fs.writeFileSync(path.join(tmp, rel), body);
    }
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test("test-file signals find tests in a nested package, not only a root tests/ directory", () => {
  const cases = [
    ["p2-drift-test", "packages/core/tests/copies-drift.test.js"],
    ["p2-drift-test", "services/api/__tests__/drift.spec.ts"],
    ["p3-tool-fakes", "packages/core/test/fake-tracker.js"],
    ["p3-tool-fakes", "tests/unit/stub-client.js"],
  ];
  for (const [id, rel] of cases) {
    withTree({ [rel]: "x" }, (root) =>
      assert.equal(runSignal(signalById(id), root).hit, true, `${id}: ${rel}`),
    );
  }
  // A drift or fake file outside any test directory is not a test of the target.
  withTree({ "src/drift-notes.md": "x", "src/fake-data.js": "x" }, (root) => {
    assert.equal(runSignal(signalById("p2-drift-test"), root).hit, false);
    assert.equal(runSignal(signalById("p3-tool-fakes"), root).hit, false);
  });
});

test("p4-permission-modes and p7-decision-log ignore everyday words and keep their real phrases", () => {
  const prose =
    "The file is read-only. The rationale for this layout is simple.\n";
  withTree({ "docs/a.md": prose }, (root) => {
    assert.equal(runSignal(signalById("p4-permission-modes"), root).hit, false);
    assert.equal(runSignal(signalById("p7-decision-log"), root).hit, false);
  });
  withTree(
    {
      "docs/b.md": "Set the permission mode before a run.\n",
      "docs/c.md": "## Decisions Log\n",
    },
    (root) => {
      assert.equal(
        runSignal(signalById("p4-permission-modes"), root).hit,
        true,
      );
      assert.equal(runSignal(signalById("p7-decision-log"), root).hit, true);
    },
  );
});

test("running every signal leaves the fixture tree byte-identical", () => {
  const before = treeHash(FIXTURE);
  for (const s of runnable(checklists())) runSignal(s, FIXTURE);
  assert.equal(treeHash(FIXTURE), before);
});

test("the rubric names all five ratings", () => {
  const text = fs.readFileSync(path.join(REFS, "rubric.md"), "utf8");
  for (const r of [
    "Strong",
    "Partial",
    "Gap",
    "Not applicable",
    "Unverified",
  ]) {
    assert.match(
      text,
      new RegExp("^\\|\\s*\\*\\*" + r + "\\*\\*\\s*\\|", "m"),
      `rubric table lacks ${r}`,
    );
  }
});

test("the report template has a slot for every principle and carries the roadmap slot", () => {
  const report = fs.readFileSync(
    path.join(SKILL, "assets", "report.template.md"),
    "utf8",
  );
  for (let n = 1; n <= 8; n++) {
    assert.ok(
      report.includes(`{{p${n}.rating}}`),
      `report template lacks {{p${n}.rating}}`,
    );
    assert.ok(
      report.includes(`{{p${n}.evidence}}`),
      `report template lacks {{p${n}.evidence}}`,
    );
  }
  assert.ok(
    report.includes("{{roadmap}}"),
    "report template must hold the roadmap",
  );
});

test("the roadmap template names a closing artefact, value and effort for each item", () => {
  const roadmap = fs.readFileSync(
    path.join(SKILL, "assets", "roadmap.template.md"),
    "utf8",
  );
  const header = roadmap.split("\n").find((l) => l.startsWith("| Order"));
  assert.ok(header, "roadmap template needs a table header");
  for (const col of ["Closing artefact", "Value", "Effort"]) {
    assert.ok(header.includes(col), `roadmap header lacks "${col}"`);
  }
});

test("SKILL.md stays within 300 lines and every checklist it links exists", () => {
  const text = fs.readFileSync(path.join(SKILL, "SKILL.md"), "utf8");
  assert.ok(text.split("\n").length <= 300, "SKILL.md exceeds 300 lines");
  const links = [
    ...text.matchAll(/\]\((references\/[^)]+|assets\/[^)]+)\)/g),
  ].map((m) => m[1]);
  for (const c of checklists()) {
    assert.ok(
      links.includes(`references/${c.file}`),
      `SKILL.md does not link ${c.file}`,
    );
  }
  for (const l of links)
    assert.ok(
      fs.existsSync(path.join(SKILL, l)),
      `SKILL.md links missing file ${l}`,
    );
});
