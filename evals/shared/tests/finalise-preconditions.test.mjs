/**
 * finalise-preconditions — the preflight names every missing input and its route (task 272;
 * obs #38, #40).
 *
 * Hand-built work (tasks 208 and 209: merged PRs, no gate, no pr-review) and a bug finalised after
 * its PR merged (bug.19: no implementation report) used to find out mid-run. The engine answers the
 * same questions up front. Every case below that proves a rule has a CONTROL beside it — the same
 * directory with the one input that rule needs — because a check that has only ever said "missing"
 * has not shown it can say "ok".
 *
 * Mutation proofs (task 272 §8): drop the gate check, the waiver-approval check, the review check,
 * the PR-state check or the QA-Verification fallback → one named test below turns red.
 *
 * Run via: node --test evals/shared/tests/finalise-preconditions.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { makeConsumerRoot } from "../lib/consumer-root.mjs";
import { ghStub } from "../../../shared/resources/tests/lib/executed-prose.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const ENGINE = path.join(
  REPO_ROOT,
  "shared",
  "resources",
  "finalise-preconditions.js",
);
const { check, bugVerdict } = createRequire(import.meta.url)(ENGINE);

function fixture(t, files) {
  const dir = mkdtempSync(path.join(tmpdir(), "finalise-preconditions-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files))
    writeFileSync(path.join(dir, name), text);
  return dir;
}

const TASK = "task.9.fx.md";
const taskArgs = (dir, extra = {}) => ({
  doc: path.join(dir, TASK),
  kind: "task",
  pr: "650",
  prState: "MERGED",
  reviewDecision: "null",
  ...extra,
});
const inputs = (r) => r.missing.map((m) => m.input);

const PASS_GATE = "gate: PASS\nquality_score: 95\nwaiver: { active: false }\n";
const waived = (active, approver) =>
  `gate: WAIVED\nwaiver:\n  active: ${active}\n  reason: skipped review\n${approver === null ? "" : `  approved_by: ${approver}\n`}top_issues: []\n`;

test("task 208/209 shape: a merged PR with no gate and no pr-review names both inputs and their routes", (t) => {
  const dir = fixture(t, { [TASK]: "x\n" });
  const r = check(taskArgs(dir));
  assert.equal(r.reason, "missing");
  assert.equal(r.exitCode, 1);
  assert.deepEqual(inputs(r), ["gate", "review"]);
  assert.match(r.missing[0].route, /run \/qa-task .* or record a WAIVED gate/);
  assert.match(r.missing[1].route, /run \/review-pr/);
});

test("control: the same directory with a gate and a pr-review passes", (t) => {
  const dir = fixture(t, {
    [TASK]: "x\n",
    "task.9.gate.1.fx.yml": PASS_GATE,
    "task.9.pr-review.1.fx.md": "APPROVE\n",
  });
  const r = check(taskArgs(dir));
  assert.equal(r.reason, "ok", JSON.stringify(r.missing));
  assert.equal(r.exitCode, 0);
});

test("a WAIVED gate with waiver.approved_by passes the gate check; one without does not", (t) => {
  const base = { [TASK]: "x\n", "task.9.pr-review.1.fx.md": "APPROVE\n" };
  const ok = fixture(t, {
    ...base,
    "task.9.gate.1.fx.yml": waived(true, "Owner Name"),
  });
  assert.equal(check(taskArgs(ok)).reason, "ok");

  for (const [label, gate] of [
    ["no approved_by", waived(true, null)],
    ["empty approved_by", waived(true, '""')],
    ["placeholder approved_by", waived(true, "TBD")],
    ["waiver.active false", waived(false, "Owner Name")],
  ]) {
    const dir = fixture(t, { ...base, "task.9.gate.1.fx.yml": gate });
    const r = check(taskArgs(dir));
    assert.deepEqual(inputs(r), ["waiver-approval"], label);
  }
});

test("the inline waiver form `waiver: { active: true, approved_by: X }` is read", (t) => {
  const dir = fixture(t, {
    [TASK]: "x\n",
    "task.9.pr-review.1.fx.md": "APPROVE\n",
    "task.9.gate.1.fx.yml":
      "gate: WAIVED\nwaiver: { active: true, approved_by: Owner Name }\n",
  });
  assert.equal(check(taskArgs(dir)).reason, "ok");
});

test("the NEWEST gate decides, by number — gate 10 outranks gate 9", (t) => {
  const dir = fixture(t, {
    [TASK]: "x\n",
    "task.9.pr-review.1.fx.md": "APPROVE\n",
    "task.9.gate.9.fx.yml": PASS_GATE,
    "task.9.gate.10.fx.yml": waived(true, null),
  });
  assert.deepEqual(inputs(check(taskArgs(dir))), ["waiver-approval"]);
});

test("review: an APPROVED decision satisfies it; an unreadable decision is unverifiable, not missing", (t) => {
  const dir = fixture(t, { [TASK]: "x\n", "task.9.gate.1.fx.yml": PASS_GATE });
  assert.equal(
    check(taskArgs(dir, { reviewDecision: "APPROVED" })).reason,
    "ok",
  );
  const unknown = check(taskArgs(dir, { reviewDecision: "unknown" }));
  assert.equal(unknown.reason, "ok");
  assert.deepEqual(
    unknown.unverifiable.map((u) => u.input),
    ["review"],
  );
  const required = check(taskArgs(dir, { reviewDecision: "REVIEW_REQUIRED" }));
  assert.deepEqual(inputs(required), ["review"]);
});

test("pr: none is missing, CLOSED is missing, an unreadable state is unverifiable, OPEN and MERGED pass", (t) => {
  const dir = fixture(t, {
    [TASK]: "x\n",
    "task.9.gate.1.fx.yml": PASS_GATE,
    "task.9.pr-review.1.fx.md": "APPROVE\n",
  });
  assert.deepEqual(inputs(check(taskArgs(dir, { pr: undefined }))), ["pr"]);
  assert.deepEqual(inputs(check(taskArgs(dir, { prState: "CLOSED" }))), [
    "pr-closed",
  ]);
  assert.deepEqual(
    check(taskArgs(dir, { prState: "unknown" })).unverifiable.map(
      (u) => u.input,
    ),
    ["pr-state"],
  );
  for (const prState of ["OPEN", "MERGED"]) {
    assert.equal(check(taskArgs(dir, { prState })).reason, "ok", prState);
  }
});

test("a story document is read with its own stem", (t) => {
  const dir = fixture(t, {
    "story.1.2.3.fx.md": "x\n",
    "story.1.2.3.gate.1.fx.yml": PASS_GATE,
    "story.1.2.3.pr-review.1.fx.md": "APPROVE\n",
    "task.9.gate.1.other.yml": waived(true, null),
  });
  const r = check({
    doc: path.join(dir, "story.1.2.3.fx.md"),
    kind: "story",
    pr: "5",
    prState: "OPEN",
  });
  assert.equal(r.reason, "ok", JSON.stringify(r.missing));
});

// ── bug mode ────────────────────────────────────────────────────────────────────────────────────
const BUG = "bug.5.fx.md";
const bugDoc = (result) =>
  `---\nid: bug.5\n---\n\n# Bug 5\n\n#### QA Verification\n\n**Verification Result**: ${result}\n**Notes**: n\n\n## Resolution Summary\n`;
const bugArgs = (dir, extra = {}) => ({
  doc: path.join(dir, BUG),
  kind: "bug",
  pr: "651",
  prState: "MERGED",
  ...extra,
});

test("bug.19 shape: no implementation report, QA Verification ✅ Fixed — a verdict, on a stated basis", (t) => {
  const dir = fixture(t, { [BUG]: bugDoc("✅ Fixed") });
  const r = check(bugArgs(dir));
  assert.equal(r.reason, "ok", JSON.stringify(r.missing));
  assert.equal(r.basis, "qa-verification");
});

test("bug: anything but ✅ Fixed is not a verdict — ❌, ⚠️ Still Failing, the template placeholder, a missing line", (t) => {
  for (const result of [
    "⚠️ Still Failing",
    "❌ Not fixed",
    "✅ Fixed | ⚠️ Still Failing",
    "✅ Fixed / ⚠️ Still Failing",
    "",
  ]) {
    const dir = fixture(t, { [BUG]: bugDoc(result) });
    assert.deepEqual(
      inputs(check(bugArgs(dir))),
      ["verdict"],
      JSON.stringify(result),
    );
  }
  const noSection = fixture(t, { [BUG]: "---\nid: bug.5\n---\n\n# Bug 5\n" });
  assert.deepEqual(inputs(check(bugArgs(noSection))), ["verdict"]);
});

test("bug: an implementation report decides alone — its PASS counts, its FAIL is not overridden by the bug's own line", (t) => {
  const pass = fixture(t, {
    [BUG]: bugDoc("⚠️ Still Failing"),
    "bug.5.implementation.1.fx.md": "**Verdict**: **PASS**\n",
  });
  const p = check(bugArgs(pass));
  assert.equal(p.reason, "ok");
  assert.equal(p.basis, "implementation-report");

  const fail = fixture(t, {
    [BUG]: bugDoc("✅ Fixed"),
    "bug.5.implementation.1.fx.md": "**Verdict**: FAIL\n",
  });
  assert.deepEqual(inputs(check(bugArgs(fail))), ["verdict"]);

  const remnant = fixture(t, {
    [BUG]: bugDoc("✅ Fixed"),
    "bug.5.implementation.1.fx.md": "**Verdict**: PASS / FAIL\n",
  });
  assert.deepEqual(inputs(check(bugArgs(remnant))), ["verdict"]);
});

test("bug: a post-merge run states the acceptance-commit route; an open PR does not", (t) => {
  const dir = fixture(t, { [BUG]: bugDoc("✅ Fixed") });
  const merged = check(bugArgs(dir));
  assert.equal(merged.postMerge, true);
  assert.match(
    merged.acceptanceCommit,
    /docs-only branch off the base branch and open a PR/,
  );
  assert.match(
    merged.acceptanceCommit,
    /never push the acceptance commit to the base branch/,
  );
  const open = check(bugArgs(dir, { prState: "OPEN" }));
  assert.equal(open.postMerge, undefined);
});

test("bug-verdict never takes a sibling artifact for the bug report, and two bug reports are ambiguous", (t) => {
  const dir = fixture(t, {
    "bug.5.dod.1.fx.md": bugDoc("✅ Fixed"),
    "bug.5.qa.1.fx.md": bugDoc("✅ Fixed"),
  });
  assert.equal(bugVerdict(dir, "bug.5").reason, "no-verdict");
  const two = fixture(t, {
    "bug.5.a.md": bugDoc("✅ Fixed"),
    "bug.5.b.md": bugDoc("✅ Fixed"),
  });
  assert.equal(bugVerdict(two, "bug.5").reason, "no-verdict");
  const one = fixture(t, {
    "bug.5.a.md": bugDoc("✅ Fixed"),
    "bug.51.b.md": bugDoc("❌"),
  });
  assert.equal(bugVerdict(one, "bug.5").reason, "ok");
});

// ── the Step 0b block, EXECUTED from SKILL.md ───────────────────────────────────────────────────
// The engine is only half the feature: the block resolves the PR, asks the host for its state and
// review decision, and HALTs with the route. It runs here as shipped, in a consumer-shaped root, with
// a `gh` stub that answers the two calls the block makes.
const SKILL_TEXT = readFileSync(
  path.join(REPO_ROOT, "skills", "finalise", "SKILL.md"),
  "utf8",
);

function step0bBlock() {
  const at = SKILL_TEXT.indexOf("#### Step 0b: Preconditions preflight");
  assert.ok(at > -1, "Step 0b is present");
  const start = SKILL_TEXT.indexOf("```bash\n", at) + "```bash\n".length;
  const end = SKILL_TEXT.indexOf("\n```\n", start);
  return SKILL_TEXT.slice(start, end + 1);
}

function runStep0b(t, { files, kind = "task", docName = TASK, ghBody }) {
  const root = makeConsumerRoot(REPO_ROOT, "finalise-step0b-");
  const dir = path.join(root, "docs", "tasks", "task.9.fx");
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(files))
    writeFileSync(path.join(dir, name), text);
  writeFileSync(
    path.join(root, "skills-config.yaml"),
    "vcs: github\ntracker: github\n",
  );
  const stubDir = mkdtempSync(path.join(tmpdir(), "finalise-step0b-gh-"));
  t.after(() => rmSync(stubDir, { recursive: true, force: true }));
  const { bin } = ghStub(stubDir, ghBody);
  const script = step0bBlock()
    .replace(/^DOC_FILE="\{[^\n]*$/m, `DOC_FILE="${path.join(dir, docName)}"`)
    .replace(/^DOC_KIND="\{[^\n]*$/m, `DOC_KIND="${kind}"`);
  const r = spawnSync("bash", ["-s", "--"], {
    input: script,
    encoding: "utf8",
    cwd: root,
    env: { PATH: `${bin}:${process.env.PATH}`, HOME: process.env.HOME },
  });
  return r;
}

// `gh pr view --json …` (no number) is the branch rung; `gh pr view 650 --json state,reviewDecision`
// is the block's own call.
const ghMerged = (reviewDecision) =>
  [
    'if [ "$1" = "pr" ] && [ "$2" = "view" ]; then',
    '  if [ "$3" = "--json" ]; then echo "650 ' +
      "a".repeat(40) +
      ' develop feature/x"; exit 0; fi',
    `  if [ "$3" = "650" ] && [ "$5" = "state,reviewDecision" ]; then echo '{"state":"MERGED","reviewDecision":"${reviewDecision}"}'; exit 0; fi`,
    "fi",
    "exit 1",
  ].join("\n");

test("Step 0b executed: task 208/209 shape — merged PR, no gate, no pr-review — HALTs naming both inputs and their routes", (t) => {
  const r = runStep0b(t, { files: { [TASK]: "x\n" }, ghBody: ghMerged("") });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(
    r.stdout,
    /missing gate: no task\.9\.gate\.\*\.yml beside the document/,
  );
  assert.match(
    r.stdout,
    /missing review: no task\.9\.pr-review\.\*\.md, and the review decision is 'null'/,
  );
  assert.match(r.stdout, /route: run \/qa-task/);
  assert.match(r.stdout, /route: run \/review-pr/);
  assert.match(r.stdout, /HALT: preconditions/);
});

test("Step 0b executed — control: the same directory with a gate and a pr-review continues, exit 0", (t) => {
  const r = runStep0b(t, {
    files: {
      [TASK]: "x\n",
      "task.9.gate.1.fx.yml": PASS_GATE,
      "task.9.pr-review.1.fx.md": "APPROVE\n",
    },
    ghBody: ghMerged(""),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /finalise preconditions: ok \(task task\.9\)/);
});

test("Step 0b executed — control: a WAIVED gate without approved_by is named, one with it continues", (t) => {
  const base = { [TASK]: "x\n", "task.9.pr-review.1.fx.md": "APPROVE\n" };
  const bad = runStep0b(t, {
    files: { ...base, "task.9.gate.1.fx.yml": waived(true, null) },
    ghBody: ghMerged(""),
  });
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stdout, /missing waiver-approval/);
  const good = runStep0b(t, {
    files: { ...base, "task.9.gate.1.fx.yml": waived(true, "Owner Name") },
    ghBody: ghMerged(""),
  });
  assert.equal(good.status, 0, good.stdout + good.stderr);
});

test("Step 0b executed — a host with no answer for state/review is unverifiable, not a HALT", (t) => {
  const r = runStep0b(t, {
    files: { [TASK]: "x\n", "task.9.gate.1.fx.yml": PASS_GATE },
    // the branch rung answers, the state/review call fails (a host without the field, or Bitbucket)
    ghBody: [
      'if [ "$1" = "pr" ] && [ "$3" = "--json" ]; then echo "650 ' +
        "a".repeat(40) +
        ' develop feature/x"; exit 0; fi',
      "exit 1",
    ].join("\n"),
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /unverifiable: review/);
});

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────
const cli = (args) =>
  spawnSync("node", [ENGINE, ...args], { encoding: "utf8" });

test("CLI: --json carries reason and missing[]; exit 1 on missing, 0 on ok, 2 on usage", (t) => {
  const dir = fixture(t, { [TASK]: "x\n" });
  // `--review-decision null` is the host answering "no review required"; omitted, it is `unknown`
  // (a host without gh), which the engine reports as unverifiable rather than missing.
  const bad = cli([
    "check",
    "--doc",
    path.join(dir, TASK),
    "--kind",
    "task",
    "--pr",
    "650",
    "--pr-state",
    "MERGED",
    "--review-decision",
    "null",
    "--json",
  ]);
  assert.equal(bad.status, 1, bad.stderr);
  const parsed = JSON.parse(bad.stdout);
  assert.equal(parsed.reason, "missing");
  assert.deepEqual(
    parsed.missing.map((m) => m.input),
    ["gate", "review"],
  );

  const text = cli([
    "check",
    "--doc",
    path.join(dir, TASK),
    "--kind",
    "task",
    "--pr",
    "650",
    "--pr-state",
    "MERGED",
    "--review-decision",
    "null",
  ]);
  assert.match(
    text.stdout,
    /missing gate: no task\.9\.gate\.\*\.yml beside the document/,
  );
  assert.match(text.stdout, /route: run \/qa-task/);

  writeFileSync(path.join(dir, "task.9.gate.1.fx.yml"), PASS_GATE);
  writeFileSync(path.join(dir, "task.9.pr-review.1.fx.md"), "APPROVE\n");
  const ok = cli([
    "check",
    "--doc",
    path.join(dir, TASK),
    "--kind",
    "task",
    "--pr",
    "650",
    "--pr-state",
    "MERGED",
    "--review-decision",
    "null",
    "--json",
  ]);
  assert.equal(ok.status, 0, ok.stdout);
  assert.equal(JSON.parse(ok.stdout).reason, "ok");

  for (const args of [
    ["check"],
    ["check", "--doc", "x", "--kind", "epic"],
    ["nope"],
    ["check", "--doc", "x", "--kind", "task", "--pr", "abc"],
    ["check", "--bogus"],
  ]) {
    const u = cli([...args, "--json"]);
    assert.equal(u.status, 2, JSON.stringify(args));
    assert.equal(JSON.parse(u.stdout).reason, "usage");
  }
});

test("CLI: an unreadable directory is `unreadable` (exit 1), never an empty `ok`", () => {
  const r = cli([
    "check",
    "--doc",
    "/nonexistent-dir-272/task.9.fx.md",
    "--kind",
    "task",
    "--pr",
    "1",
    "--json",
  ]);
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).reason, "unreadable");
});
