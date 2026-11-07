/**
 * Tests for the `cases_file` route, the cases entity refusal and the reuse check in
 * security-probe-plan.mjs (task 269, obs #65, #136).
 *
 * The engine is a stub: these tests are about what the RUNNER does with a plan entry, not about the
 * probe. The stub prints a clean engine result and exports the `readRecord` the runner folds with.
 *
 * Run: CI=true node --test shared/resources/tests/security-probe-plan-cases-file.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { spawnBudget } from "../spawn-budget.mjs";
import {
  readDoc,
  blockBy,
  bind,
  fixtureRepo,
  write,
  run as runShell,
} from "./lib/executed-prose.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PLAN_MJS = join(HERE, "..", "security-probe-plan.mjs");
const { runPlan, reusePlan, resolveCasesFile } = await import(PLAN_MJS);

const STUB = `#!/usr/bin/env node
export function readRecord() { return { totals: { executed: 1 } }; }
if (process.argv[1] && process.argv[1].endsWith("stub-engine.mjs")) {
  process.stdout.write(JSON.stringify({ entry: "e", sink: "s", verdict: "engaged", executed: 1, escapes: [], reproduced: [], overblocked: [] }));
}
`;

async function withDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), "spp-cf-"));
  try {
    writeFileSync(join(dir, "stub-engine.mjs"), STUB);
    mkdirSync(join(dir, "work"), { recursive: true });
    return await fn(dir, join(dir, "work"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function run(dir, work, plan, extra = {}) {
  const planFile = join(dir, "plan.json");
  writeFileSync(planFile, JSON.stringify(plan));
  return runPlan({
    plan: planFile,
    record: join(work, "w.dod.1.security.run.json"),
    casesBase: join(work, "w.dod.1.security.cases"),
    repoRoot: dir,
    engine: join(dir, "stub-engine.mjs"),
    ...extra,
  });
}

const ENTRY = ["--sink", "path", "--entry", "lib/x.js#isSafe"];
// Six control characters that JSON may carry raw or escaped, plus U+0085/2028/2029 raw.
const RAW = "\u0085| | ";

test("cases_file: the numbered cases file is the source file byte for byte, not a re-serialisation", () =>
  withDir(async (dir, work) => {
    // Compact formatting, raw U+0085/U+2028/U+2029 and the JSON escapes for VT, FF, U+001F and CR:
    // JSON.stringify(parse(x), null, 2) would change every one of these bytes' surroundings.
    const src = `[{"id":"c1","input":"${RAW}|\\u000b|\\u000c|\\u001f|\\r","why":"w","correct":false,"direction":"hostile","spec_ref":"d.md:1"}]`;
    writeFileSync(join(work, "w.dod.0.security.cases.json"), src);
    const { exit, out } = await run(dir, work, [
      { argv: ENTRY, cases_file: "w.dod.0.security.cases.json" },
    ]);
    assert.equal(exit, 0);
    assert.deepEqual(out.refusals, []);
    const dest = join(work, "w.dod.1.security.cases.json");
    assert.deepEqual(readFileSync(dest), Buffer.from(src, "utf8"));
    assert.notEqual(
      readFileSync(dest, "utf8"),
      JSON.stringify(JSON.parse(src), null, 2) + "\n",
      "a re-serialisation would differ",
    );
  }));

test("cases_file: refused when absolute, climbing out, a symlink, not an array, hash-mismatched, or alongside cases", () =>
  withDir(async (dir, work) => {
    const good = '[{"id":"c1","input":"x","spec_ref":"d.md:1"}]';
    writeFileSync(join(work, "ok.json"), good);
    writeFileSync(join(dir, "outside.json"), good);
    symlinkSync(join(dir, "outside.json"), join(work, "link.json"));
    writeFileSync(join(work, "obj.json"), "{}");
    const why = async (entry) => {
      const { out } = await run(dir, work, [{ argv: ENTRY, ...entry }]);
      return out.refusals.map((r) => r.reason);
    };
    assert.deepEqual(await why({ cases_file: join(dir, "outside.json") }), [
      "plan-entry-cases-file-outside-work-dir",
    ]);
    assert.deepEqual(await why({ cases_file: "../outside.json" }), [
      "plan-entry-cases-file-outside-work-dir",
    ]);
    assert.deepEqual(await why({ cases_file: "link.json" }), [
      "plan-entry-cases-file-symlink",
    ]);
    assert.deepEqual(await why({ cases_file: "obj.json" }), [
      "plan-entry-cases-not-an-array",
    ]);
    assert.deepEqual(await why({ cases_file: "missing.json" }), [
      "plan-entry-cases-file-missing",
    ]);
    assert.deepEqual(
      await why({ cases_file: "ok.json", cases_sha256: "0".repeat(64) }),
      ["plan-entry-cases-file-hash-mismatch"],
    );
    assert.deepEqual(await why({ cases_file: "ok.json", cases: [] }), [
      "plan-entry-cases-and-cases-file",
    ]);
    // Control: the same file with no fault is run.
    assert.deepEqual(await why({ cases_file: "ok.json" }), []);
  }));

test("entity: inline cases that came back escaped are refused; a literal < elsewhere, or the source file carrying the entity, accepts them", () =>
  withDir(async (dir, work) => {
    const esc = [
      { id: "c1", input: "&lt;!-- matrix-start --&gt;", spec_ref: "d.md:1" },
    ];
    const reasons = async (plan) =>
      (await run(dir, work, plan)).out.refusals.map((r) => r.reason);
    assert.deepEqual(await reasons([{ argv: ENTRY, cases: esc }]), [
      "plan-entry-cases-html-entity: &lt;",
    ]);
    // Control 1: the plan has a literal < in another entry's cases — the reply was not escaped.
    const lit = [{ id: "c2", input: "<b>", spec_ref: "d.md:1" }];
    assert.deepEqual(
      await reasons([
        { argv: ENTRY, cases: esc },
        { argv: ["--sink", "path", "--entry", "lib/y.js#isSafe"], cases: lit },
      ]),
      [],
    );
    // Control 2: the entry's own source file carries the entity, so the case carries it on purpose.
    mkdirSync(join(dir, "lib"), { recursive: true });
    writeFileSync(join(dir, "lib", "x.js"), "// matches &lt;!-- and &gt;\n");
    assert.deepEqual(await reasons([{ argv: ENTRY, cases: esc }]), []);
  }));

test("entity: a cases file whose payload is an entity on purpose, beside a literal <, is accepted; the same entity with nothing literal is refused (T269-QA-4)", () =>
  withDir(async (dir, work) => {
    // Own-text evidence: one literal "<" in the file proves it was not escaped as a whole.
    writeFileSync(
      join(work, "mixed.json"),
      JSON.stringify([
        { id: "a", input: "&amp;lt;", spec_ref: "d.md:1" },
        { id: "b", input: "<script>", spec_ref: "d.md:1" },
      ]),
    );
    const mixed = await run(dir, work, [
      { argv: ENTRY, cases_file: "mixed.json" },
    ]);
    assert.deepEqual(mixed.out.refusals, []);
    // Control: the same payload with no literal anywhere is the escaped-reply shape.
    writeFileSync(
      join(work, "only.json"),
      JSON.stringify([{ id: "a", input: "&amp;lt;", spec_ref: "d.md:1" }]),
    );
    const only = await run(dir, work, [
      { argv: ENTRY, cases_file: "only.json" },
    ]);
    assert.deepEqual(
      only.out.refusals.map((r) => r.reason),
      ["plan-entry-cases-html-entity: &amp;"],
    );
  }));

test("entity: a cases file that came back escaped is refused too", () =>
  withDir(async (dir, work) => {
    writeFileSync(
      join(work, "esc.json"),
      '[{"id":"c1","input":"a &amp; b","spec_ref":"d.md:1"}]',
    );
    const { out } = await run(dir, work, [
      { argv: ENTRY, cases_file: "esc.json" },
    ]);
    assert.deepEqual(
      out.refusals.map((r) => r.reason),
      ["plan-entry-cases-html-entity: &amp;"],
    );
  }));

test("reuse: an unchanged plan is reusable; a changed cases byte, a changed engine path or an inline case is not", () =>
  withDir(async (dir, work) => {
    const git = (...a) =>
      spawnSync("git", ["-C", dir, ...a], { encoding: "utf8" });
    git("init", "-q", "-b", "main");
    git("config", "user.email", "t@example.com");
    git("config", "user.name", "t");
    mkdirSync(join(dir, "lib"), { recursive: true });
    writeFileSync(join(dir, "lib", "x.js"), "export const a = 1;\n");
    git("add", "-A");
    git("commit", "-q", "-m", "a");
    const head = git("rev-parse", "HEAD").stdout.trim();
    // A first run with inline cases writes the reusable plan.
    const reusable = join(work, "w.dod.1.security.plan.json");
    const first = await run(
      dir,
      work,
      [{ argv: ENTRY, cases: [{ id: "c1", input: "x", spec_ref: "d.md:1" }] }],
      { reusablePlan: reusable },
    );
    assert.equal(first.out.reusable_plan, reusable);
    const written = JSON.parse(readFileSync(reusable, "utf8"));
    assert.equal(written[0].cases_file, "w.dod.1.security.cases.json");
    assert.match(written[0].cases_sha256, /^[0-9a-f]{64}$/);
    const ask = (over = {}) =>
      reusePlan({
        priorPlan: reusable,
        priorHead: head,
        repoRoot: dir,
        enginePaths: ["lib/x.js"],
        ...over,
      });
    assert.deepEqual(ask(), { reason: "reusable" });
    // The reused plan runs, and its numbered cases file is the prior one's bytes.
    const again = await runPlan({
      plan: reusable,
      record: join(work, "w.dod.2.security.run.json"),
      casesBase: join(work, "w.dod.2.security.cases"),
      repoRoot: dir,
      engine: join(dir, "stub-engine.mjs"),
    });
    assert.deepEqual(again.out.refusals, []);
    assert.deepEqual(
      readFileSync(join(work, "w.dod.2.security.cases.json")),
      readFileSync(join(work, "w.dod.1.security.cases.json")),
    );
    // Not reusable: one byte of the cases file changes.
    const casesPath = join(work, "w.dod.1.security.cases.json");
    const orig = readFileSync(casesPath);
    writeFileSync(casesPath, orig.toString("utf8").replace('"x"', '"y"'));
    assert.equal(ask().why, "cases-file-hash-mismatch");
    writeFileSync(casesPath, orig);
    assert.deepEqual(ask(), { reason: "reusable" });
    // Not reusable: a path that matches nothing must not read as "unchanged" (T269-QA-2).
    assert.equal(
      ask({ enginePaths: ["lib/no-such-file.js"] }).why,
      "engine-path-missing",
    );
    assert.equal(
      ask({ enginePaths: ["lib/x.js", "lib/typo.js"] }).why,
      "engine-path-missing",
    );
    assert.equal(ask({ enginePaths: ["--stat"] }).why, "bad-engine-path");
    // Not reusable: an UNCOMMITTED edit to the engine changes what the plan probes too.
    writeFileSync(join(dir, "lib", "x.js"), "export const a = 99;\n");
    assert.equal(ask().why, "engine-changed");
    writeFileSync(join(dir, "lib", "x.js"), "export const a = 1;\n");
    assert.deepEqual(ask(), { reason: "reusable" });
    // Not reusable: the engine path changed since the prior head.
    writeFileSync(join(dir, "lib", "x.js"), "export const a = 2;\n");
    git("commit", "-q", "-am", "b");
    assert.equal(ask().why, "engine-changed");
    // Not reusable: no engine path named, an unreadable head, an inline-cases plan.
    assert.equal(ask({ enginePaths: [] }).why, "no-engine-paths");
    assert.equal(ask({ priorHead: "deadbeefdeadbeef" }).why, "git-unreadable");
    const inline = join(work, "inline.json");
    writeFileSync(inline, JSON.stringify([{ argv: ENTRY, cases: [] }]));
    assert.equal(ask({ priorPlan: inline }).why, "inline-cases");
  }));

// --- the probe engine runs the confinement predicate (T269-QA-3) ------------------------------------

test("casesFileAccepted: the probe engine executes hostile and legitimate names against it, and it engages", () =>
  withDir(async (dir, work) => {
    writeFileSync(join(work, "ok.json"), "[]");
    writeFileSync(join(dir, "outside.json"), "[]");
    symlinkSync(join(dir, "outside.json"), join(work, "link.json"));
    mkdirSync(join(work, "sub"));
    const c = (id, input, correct, direction) => ({
      id,
      sink: "path",
      input,
      why: id,
      correct,
      direction,
    });
    const cases = [
      c("climbs", "../outside.json", "reject", "hostile"),
      c("deep-climb", "sub/../../outside.json", "reject", "hostile"),
      c("absolute", join(dir, "outside.json"), "reject", "hostile"),
      c("symlink", "link.json", "reject", "hostile"),
      c("directory", "sub", "reject", "hostile"),
      c("nul", "ok.json\u0000.txt", "reject", "hostile"),
      c("empty", "", "reject", "hostile"),
      c("plain", "ok.json", "accept", "legitimate"),
    ];
    const casesFile = join(dir, "cases.json");
    writeFileSync(casesFile, JSON.stringify(cases));
    const r = spawnSync(
      process.execPath,
      [
        join(HERE, "..", "security-probe.mjs"),
        "--sink",
        "path",
        "--entry",
        `${PLAN_MJS}#casesFileAccepted`,
        "--args-json",
        JSON.stringify([work]),
        "--cases-file",
        casesFile,
        "--repo-root",
        join(HERE, "..", "..", ".."),
        "--json",
      ],
      { encoding: "utf8", timeout: spawnBudget("CASES_FILE_PROBE").timeoutMs },
    );
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.executed, cases.length, "every case was executed");
    assert.equal(out.verdict, "engages");
    assert.deepEqual(out.reproduced ?? [], []);
  }));

// --- the SKILL.md reuse block binds its own inputs (T269-QA-1) --------------------------------------

const reuseBlock = () =>
  blockBy(readDoc("skills/finalise/SKILL.md"), "--prior-plan", "reuse block");
const REUSE_BINDS = (over = {}) => ({
  ".agents/skills/finalise/references/security-probe-plan.mjs": PLAN_MJS,
  "{story.{P}.{E}.{S} | task.{id} | bug mode: the bug prefix, e.g. task.67.bug.3}":
    "task.9",
  "{Step 0's DOD_N}": "2",
  "{document-directory}": "docs/tasks/task.9.x",
  "{engine path}": "lib/x.js",
  ...over,
});

test("reuse block: it binds STEM, DOD_N and DOC_DIR itself, so it runs in a fresh shell and finds the prior plan", () => {
  const { work } = fixtureRepo();
  write(work, "lib/x.js", "export const a = 1;\n");
  const git = (...a) =>
    spawnSync("git", ["-C", work, ...a], { encoding: "utf8" });
  git("add", "-A");
  git(
    "-c",
    "user.email=t@example.com",
    "-c",
    "user.name=t",
    "commit",
    "-q",
    "-m",
    "x",
  );
  const head = git("rev-parse", "HEAD").stdout.trim();
  write(
    work,
    "docs/tasks/task.9.x/task.9.dod.1.security.plan.json",
    JSON.stringify([{ argv: ["--sink", "path", "--entry", "lib/x.js#f"] }]),
  );
  const code = bind(reuseBlock(), REUSE_BINDS({ "{prior head}": head }));
  const r = runShell("bash", code, { cwd: work });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(JSON.parse(r.stdout).reason, "reusable");
  // Control: DOD_N 1 has no previous run — the block says so and runs nothing.
  const first = runShell(
    "bash",
    bind(
      reuseBlock(),
      REUSE_BINDS({ "{prior head}": head, "{Step 0's DOD_N}": "1" }),
    ),
    { cwd: work },
  );
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /no previous DoD run/);
  assert.doesNotMatch(first.stdout, /reusable/);
});

test("reuse block: an unsubstituted placeholder or a non-numeric DOD_N halts before anything runs", () => {
  const { work } = fixtureRepo();
  const raw = runShell("bash", reuseBlock(), { cwd: work });
  assert.equal(raw.status, 1);
  assert.match(raw.stdout, /HALT: DOD_N is an unsubstituted placeholder/);
  // CR-1: a first run has no prior head or engine path to substitute — it must plan afresh, not halt.
  const fill = (code, map) =>
    Object.entries(map).reduce((c, [k, v]) => c.split(k).join(v), code);
  const partial = REUSE_BINDS();
  delete partial["{engine path}"];
  const first = runShell(
    "bash",
    fill(reuseBlock(), { ...partial, "{Step 0's DOD_N}": "1" }),
    { cwd: work },
  );
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stdout, /no previous DoD run/);
  // Control: from the second run on, the same missing inputs are a halt.
  const second = runShell("bash", fill(reuseBlock(), partial), { cwd: work });
  assert.equal(second.status, 1);
  assert.match(
    second.stdout,
    /HALT: an input of the reuse block is an unsubstituted placeholder/,
  );
  const bad = runShell(
    "bash",
    bind(
      reuseBlock(),
      REUSE_BINDS({ "{prior head}": "HEAD", "{Step 0's DOD_N}": "two" }),
    ),
    { cwd: work },
  );
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /HALT: DOD_N is not a number/);
});

test("resolveCasesFile: a directory, an absolute name and a NUL are refused", () =>
  withDir(async (dir, work) => {
    mkdirSync(join(work, "d"));
    assert.equal(resolveCasesFile("d", work).why, "not-a-file");
    assert.equal(resolveCasesFile("/etc/passwd", work).why, "outside-work-dir");
    assert.equal(resolveCasesFile("a\0b", work).why, "bad-name");
    assert.equal(resolveCasesFile("", work).why, "bad-name");
    assert.equal(resolveCasesFile(7, work).why, "bad-name");
  }));
