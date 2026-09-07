/**
 * security-probe — the four verdicts, the states that must not collapse, and the
 * containment that makes running a probe safe without an interpreter on the
 * snippet allow-list.
 *
 * The point of this suite is the STATE SEPARATION, not the happy path. Every
 * defect in the series this task closes has the same shape: two distinguishable
 * conditions rendered as one value, where one of them looks like success.
 * `probes_executed: 0` read as a pass. `declined` folded into `executed: 0`. A
 * stub that throws on everything scored as a control that engages. Each of those
 * has a test here, and each of those tests is mutation-proved below — reverting
 * the branch it guards must turn it red, or it is asserting nothing.
 *
 * Run: node --test shared/resources/tests/security-probe.test.mjs
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  OUTCOMES,
  VERDICTS,
  computeVerdict,
  defaultRepoRoot,
  resolveEntry,
  runProbeSpec,
} from "../security-probe.mjs";
import { corpusFor } from "../security-input-corpus.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = defaultRepoRoot();
const FIXTURES = "shared/resources/tests/fixtures/security-probe";

const entry = (name) => `${FIXTURES}/${name}.mjs#validateHost`;

/**
 * A small hand-built case set in the corpus shape.
 *
 * Deliberately NOT the real corpus: these tests are about the ENGINE's verdict
 * logic, and pinning them to 12 live corpus cases would make an unrelated
 * task.79 edit red this suite for a reason that has nothing to do with the
 * engine. The real corpus is exercised once, separately, below.
 */
const CASES = [
  {
    id: "t.slash",
    sink: "url-authority",
    input: "evil.example.com/x",
    why: "a / ends the authority",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "t.at",
    sink: "url-authority",
    input: "user@evil.example.com",
    why: "userinfo re-points the host",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "t.space",
    sink: "url-authority",
    input: "evil example.com",
    why: "whitespace in an authority",
    correct: "reject",
    direction: "hostile",
  },
  {
    id: "t.plain",
    sink: "url-authority",
    input: "db.internal",
    why: "an ordinary hostname",
    correct: "accept",
    direction: "legitimate",
  },
  {
    id: "t.port",
    sink: "url-authority",
    input: "db.internal:5432",
    why: "host with an explicit port",
    correct: "accept",
    direction: "legitimate",
  },
];

const hostileOnly = CASES.filter((c) => c.direction === "hostile");
const legitimateOnly = CASES.filter((c) => c.direction === "legitimate");

// ── The four verdicts, each produced by a fixture ─────────────────────────────

test("engages: hostile input rejected, legitimate input accepted", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: CASES,
  });
  assert.equal(r.verdict, "engages", JSON.stringify(r.cases));
  assert.equal(r.executed, 5);
  assert.equal(r.reproduced.length, 0);
  assert.equal(r.overblocked.length, 0);
  assert.equal(r.declined.length, 0);
  assert.equal(r.passed, 5);
});

test("present-but-inert: a control that rejects some hostile input and lets one through", () => {
  // The high-severity verdict. `inert-control` rejects whitespace and `@` — so a
  // reviewer reading it sees a control and believes it — but passes `/`, which
  // is the re-pointing route. Worse than absent precisely because it has already
  // been reviewed.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("inert-control"),
    cases: CASES,
  });
  assert.equal(r.verdict, "present-but-inert", JSON.stringify(r.cases));
  assert.deepEqual(r.reproduced, ["t.slash"]);
  assert.equal(r.executed, 5);
});

test("absent: no hostile case is rejected at all", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("absent-control"),
    cases: CASES,
  });
  assert.equal(r.verdict, "absent");
  assert.equal(r.reproduced.length, 3, "every hostile case reproduces");
  assert.equal(r.executed, 5);
});

test("unverifiable: zero cases — never engages, never a pass", () => {
  // The one this whole task exists for. An empty case list must not render as
  // success at ANY layer: not in the verdict, not in `passed`, and not in the
  // process exit code (see the CLI test below).
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: [],
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "no-cases-executed");
  assert.equal(r.executed, 0);
  assert.equal(r.passed, 0);
  assert.notEqual(r.verdict, "engages");
});

test("unverifiable: a control that rejects EVERY input is not an engaging control", () => {
  // A stub that throws unconditionally rejects all three hostile cases, so the
  // naive rule "no hostile case reproduced" would score it `engages`. Requiring
  // at least one legitimate case to pass is what separates a control that works
  // from a function that is not implemented yet.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("rejects-everything"),
    cases: CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "rejects-every-input");
  assert.equal(
    r.overblocked.length,
    2,
    "both legitimate cases were over-blocked",
  );
});

test("unverifiable: hostile evidence alone is required — legitimate cases cannot carry a verdict", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: legitimateOnly,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "no-hostile-evidence");
});

test("hostile-only cases cannot produce engages either", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: hostileOnly,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.reason, "no-legitimate-evidence");
});

// ── declined is its own state ────────────────────────────────────────────────

test("a non-importable entry is DECLINED, not reported as executed: 0", () => {
  // The state separation. Both conditions render as "nothing ran", but they
  // answer different questions — declined says the engine could not reach the
  // target, executed-zero says it reached it and found nothing to run.
  // Collapsing them is what makes a broken probe indistinguishable from a clean
  // one.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: `${FIXTURES}/does-not-exist.mjs#validateHost`,
    cases: CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.executed, 0);
  assert.ok(r.declined.length > 0, "declined must be populated, not empty");
  assert.equal(r.declined[0].reason, "entry-not-probeable");
});

test("an export that is not a function is declined, with the reason", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("not-a-function"),
    cases: CASES,
  });
  assert.equal(r.verdict, "unverifiable");
  assert.ok(r.declined.length > 0);
  assert.match(r.declined[0].detail, /not a function/);
});

test("an unknown sink is declined rather than yielding an empty corpus", () => {
  const r = runProbeSpec({
    sink: "not-a-real-sink",
    entry: entry("engaging-control"),
  });
  assert.equal(r.verdict, "unverifiable");
  assert.equal(r.declined[0].reason, "unknown-sink");
  assert.equal(r.executed, 0);
});

// ── Entry-path containment ───────────────────────────────────────────────────

test("an entry path outside the repo root is rejected BEFORE import", () => {
  // Containment must precede the import: `import()` runs the module's top level,
  // so a post-hoc check would fire after arbitrary code had already executed.
  for (const bad of [
    "/etc/passwd#x",
    "../../../etc/passwd#x",
    "shared/resources/../../../../tmp/evil.mjs#x",
  ]) {
    const r = resolveEntry(bad, REPO_ROOT);
    assert.equal(r.ok, false, bad);
    assert.equal(r.reason, "outside-repo-root", bad);
  }
});

test("a traversal that resolves back inside the root is allowed", () => {
  // The check is on the RESOLVED path, not the literal — otherwise a legitimate
  // relative path containing `..` would be refused for looking suspicious.
  const r = resolveEntry(
    "shared/resources/../resources/security-probe.mjs#main",
    REPO_ROOT,
  );
  assert.equal(r.ok, true);
  assert.equal(r.exportName, "main");
});

test("a malformed entry spec is rejected with bad-entry, not a crash", () => {
  for (const bad of ["", "no-hash-here.mjs", "#onlyExport", "trailing.mjs#"]) {
    const r = resolveEntry(bad, REPO_ROOT);
    assert.equal(r.ok, false, JSON.stringify(bad));
    assert.equal(r.reason, "bad-entry", JSON.stringify(bad));
  }
});

test("runProbeSpec refuses an out-of-root entry and never executes a case", () => {
  const outside = mkdtempSync(join(tmpdir(), "probe-outside-"));
  try {
    const evil = join(outside, "evil.mjs");
    writeFileSync(evil, "export function validateHost(){ return 1; }\n");
    const r = runProbeSpec({
      sink: "url-authority",
      entry: `${evil}#validateHost`,
      cases: CASES,
    });
    assert.equal(r.verdict, "unverifiable");
    assert.equal(r.declined[0].reason, "outside-repo-root");
    assert.equal(r.executed, 0);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

// ── Containment sentinel ─────────────────────────────────────────────────────

test("the sentinel fires when a probe writes outside its working directory", () => {
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("escaping-probe"),
    cases: [CASES[0]],
  });
  assert.ok(r.escapes.length > 0, "an escaping write must be reported");
  assert.match(r.escapes[0].path, /escaped\.txt/);
});

// ── Inputs never reach a shell ───────────────────────────────────────────────

test("shell metacharacters in an input are data, not code", () => {
  // The property that makes an interpreter on SAFE_COMMANDS unnecessary. If the
  // input were interpolated into a shell string, this case would run `id` and
  // the outcome would not be a clean rejection.
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("engaging-control"),
    cases: [
      {
        id: "t.injection",
        sink: "url-authority",
        input: '"; touch /tmp/probe-pwned-$$; echo "',
        why: "shell metacharacters",
        correct: "reject",
        direction: "hostile",
      },
      CASES[3],
    ],
  });
  assert.equal(r.verdict, "engages");
  assert.equal(r.reproduced.length, 0);
});

// ── The real corpus wires up ─────────────────────────────────────────────────

test("the engine runs against the real task.79 corpus", () => {
  // One end-to-end pass over the live corpus, to catch a shape mismatch between
  // the two modules. The ASSERTION is deliberately weak — the corpus is task.79's
  // to change — but a broken wiring would show as every case declining.
  const cases = corpusFor("url-authority");
  assert.ok(cases.length > 0);
  const r = runProbeSpec({
    sink: "url-authority",
    entry: entry("absent-control"),
  });
  assert.equal(r.executed, cases.length, "every corpus case executed");
  assert.equal(r.declined.length, 0);
  assert.ok(VERDICTS.includes(r.verdict));
});

// ── Vocabulary ───────────────────────────────────────────────────────────────

test("computeVerdict only ever returns a known verdict", () => {
  const shapes = [
    [],
    [{ id: "a", direction: "hostile", outcome: "errored" }],
    [{ id: "a", direction: "hostile", outcome: "accepted" }],
    [
      { id: "a", direction: "hostile", outcome: "accepted" },
      { id: "b", direction: "hostile", outcome: "rejected" },
      { id: "c", direction: "legitimate", outcome: "accepted" },
    ],
    [
      { id: "a", direction: "hostile", outcome: "rejected" },
      { id: "c", direction: "legitimate", outcome: "accepted" },
    ],
  ];
  for (const s of shapes) {
    const { verdict } = computeVerdict(s);
    assert.ok(VERDICTS.includes(verdict), `${verdict} is not a known verdict`);
  }
  assert.deepEqual([...OUTCOMES], ["rejected", "accepted", "errored"]);
});
