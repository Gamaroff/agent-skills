/**
 * Protocol checks: assert develop-batch SKILL.md / README structural invariants.
 * Pure file-content checks — no driver, no model.
 *
 * These pin the batch orchestrator's contract:
 *   - the batch is chosen by the deterministic --batch selector, never eyeballed
 *   - --dry-run is read-only (fetch only; no worktrees / checkout / pull / state)
 *   - a batch-shaped run-state file makes the parallel-develop → serial-merge → tick
 *     sequence crash-safe and idempotent
 *   - the per-item merge gate is develop-next's gate (head-SHA + configured gate/strategy)
 *   - development fans out in parallel but merges run serially (rebase-per-item)
 *   - worktrees are removed with `git worktree remove`, never `rm -rf`
 *   - worktrees live inside the repo under developBatch.worktreeRoot, never beside it
 *   - a missing roadmap reuses develop-next's scaffold-then-STOP; never fabricated
 *   - no consumer-project facts baked into a library skill
 *
 * Prose assertions run against a whitespace-normalized copy (`flat`) so that a phrase
 * wrapped across a blockquote line still matches; structural checks (heading order,
 * banned facts) run against the raw text.
 *
 * Run via: node --test evals/develop-batch/protocol/skill-shape.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { spawnSync, execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  readFileSync,
  existsSync,
} from "node:fs";
import os from "node:os";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SKILL_DIR = path.join(REPO_ROOT, "skills", "develop-batch");
const SKILL_PATH = path.join(SKILL_DIR, "SKILL.md");
const README_PATH = path.join(SKILL_DIR, "README.md");
// The batch reuses develop-next's selector + merge machinery — assert it exists.
const SELECTOR_PATH = path.join(
  REPO_ROOT,
  "skills",
  "develop-next",
  "scripts",
  "select-next.mjs",
);

const skill = await readFile(SKILL_PATH, "utf-8");
const readme = await readFile(README_PATH, "utf-8");
// Prose/blockquote wrapping inserts `\n   > ` mid-sentence. Collapse each line break
// (with any blockquote-continuation marker) into a space before phrase checks, while
// preserving inline `>` in tokens like `<baseBranch>`.
const flatten = (s) =>
  s.replace(/\n[ \t]*>?[ \t]*/g, " ").replace(/[ \t]+/g, " ");
const flat = flatten(skill);
const readmeFlat = flatten(readme);

test("SKILL.md: steps 0–5 appear in order", () => {
  let last = -1;
  for (const h of [
    "## Step 0",
    "## Step 1",
    "## Step 2",
    "## Step 3",
    "## Step 4",
    "## Step 5",
  ]) {
    const idx = skill.indexOf(h);
    assert.ok(idx > last, `${h} missing or out of order`);
    last = idx;
  }
});

test("SKILL.md: the batch is chosen by the --batch selector, never eyeballed", () => {
  assert.match(flat, /select-next\.mjs --batch/);
  assert.match(flat, /never eyeball the roadmap/i);
});

test("develop-next selector (reused by --batch) is present and executable", async () => {
  await access(SELECTOR_PATH, constants.X_OK);
});

test("SKILL.md: --dry-run is read-only (fetch only, no worktrees/checkout/pull/state)", () => {
  assert.match(flat, /--dry-run/);
  assert.match(flat, /fetch only — never checkout or pull/i);
  assert.match(flat, /\*\*Read-only\*\*/);
  assert.match(flat, /Create no worktrees, write no state file/i);
});

test("SKILL.md: batch run-state file makes parallel-develop → merge → tick crash-safe", () => {
  assert.match(flat, /develop-batch\.state\.json/);
  assert.match(flat, /"merged"/);
  assert.match(flat, /"ticked"/);
  assert.match(flat, /deleted only in Step 5/i);
  assert.match(flat, /never .*re-selected or re-dispatched/i);
});

test("SKILL.md: develop in parallel, merge serially (the load-bearing discipline)", () => {
  assert.match(flat, /develop in parallel, merge serially/i);
  assert.match(flat, /Serial finalize lane/i);
  assert.match(flat, /rebase origin\/<baseBranch>/);
  assert.match(flat, /Never parallelize this lane/i);
});

test("SKILL.md: per-item merge gate verifies head SHA and uses configured gate/strategy", () => {
  assert.match(flat, /headRefOid/);
  assert.match(flat, /git rev-parse HEAD/);
  assert.match(flat, /qualityGateCommand/);
  assert.match(flat, /mergeStrategy/);
  assert.match(flat, /gh pr checks/);
});

test("SKILL.md: autonomous dispatch directive present, one agent per worktree", () => {
  assert.match(flat, /AUTONOMOUS RUN \(develop-batch\)/);
  assert.match(flat, /Phase 0d Upfront Setup/);
  assert.match(flat, /All existing HALT conditions remain HALTs/);
  assert.match(flat, /working directory to `<dir>`/);
  assert.match(flat, /Do \*\*not\*\* merge the PR/);
});

test("SKILL.md: both batching axes are named (dependency-ready + write-disjoint)", () => {
  assert.match(flat, /write-disjoint/);
  assert.match(flat, /conflict-free/);
  assert.match(readmeFlat, /Dependency-ready/);
  assert.match(readmeFlat, /Write-disjoint/);
  assert.match(readmeFlat, /touches:/);
});

test("SKILL.md: worktrees are removed with git worktree remove, never rm -rf", () => {
  assert.match(flat, /git worktree remove/);
  assert.match(flat, /never `rm -rf`/);
});

test("worktrees live inside the repo: the selector's paths and Step 0's stale check agree", async () => {
  const { BATCH_WORKTREE_PREFIX, DEFAULT_WORKTREE_ROOT } = await import(
    pathToFileURL(SELECTOR_PATH).href
  );
  // The selector is told the configured root, and the stale check looks for the
  // prefix the selector actually emits. These two drifted once (`../tc-wt-` emitted,
  // `../wt-*` checked), which made the stale check unable to find anything.
  assert.match(
    flat,
    /select-next\.mjs --batch [^`]*--worktree-root <worktreeRoot>/,
  );
  assert.ok(
    flat.includes(`<worktreeRoot>/${BATCH_WORKTREE_PREFIX}*`),
    `Step 0 stale check must look for <worktreeRoot>/${BATCH_WORKTREE_PREFIX}*`,
  );
  assert.ok(
    skill.includes(`| \`${DEFAULT_WORKTREE_ROOT}\``),
    "SKILL.md config table states the selector's default root",
  );
  // The root is ignored before any worktree is created, or the next run's
  // dirty check halts on the batch's own worktrees. Behaviour: the Step 0.3a
  // test below runs the block itself.
  assert.match(flat, /git check-ignore -q "\$ROOT\/"/);
  // No worktree path in the skill points outside the repository.
  assert.doesNotMatch(skill, /\.\.\/(?:tc-)?wt-|\.\.\/worktrees\//);
});

test("SKILL.md: a halted item does not sink the batch; its worktree is left for inspection", () => {
  assert.match(flat, /halted/);
  assert.match(
    flat,
    /must not sink the rest of the batch|left in place for inspection/i,
  );
});

test("SKILL.md: missing roadmap reuses develop-next scaffold-then-STOP, never fabricated", () => {
  assert.match(flat, /Do not fabricate one/i);
  assert.match(flat, /do not invent a second generator/i);
  assert.match(flat, /project-completion-roadmap\.template\.md/);
});

test("SKILL.md: requires the linked-worktree-safe create-branch", () => {
  assert.match(flat, /Exception — linked worktree/i);
  assert.match(flat, /without checking out the base/i);
});

test("no consumer-project facts leak into the library skill", async () => {
  const banned = [
    /\benv gh\b/, // a consumer CLAUDE.md command prefix
    /tinker[\s-]?city/i, // consumer project name
    /tc-wt/, // consumer-specific worktree prefix
    /npm run lint && npm run typecheck && npm test/, // hardcoded gate
    // Execution-resource docs are the easiest place to leak a real host: the
    // worked examples are one careless copy-paste away from a LAN IP.
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // any literal IP
    /npm run test:(remote|auto|local)\b/, // consumer-specific runner scripts
    /\bdanger[-\s]?server\b/i, // consumer's host nickname
  ];
  const reference = await readFile(
    path.join(SKILL_DIR, "references", "execution-resources.md"),
    "utf-8",
  );
  // The selector emits the worktree paths this skill runs, so it is held to the
  // same rule: the `tc-wt` prefix lived there long after it left this SKILL.md.
  const selector = await readFile(SELECTOR_PATH, "utf-8");
  for (const [name, content] of [
    ["SKILL.md", skill],
    ["README.md", readme],
    ["references/execution-resources.md", reference],
    ["develop-next/scripts/select-next.mjs", selector],
  ]) {
    for (const re of banned) {
      assert.doesNotMatch(
        content,
        re,
        `${name} still contains consumer-specific fact ${re}`,
      );
    }
  }
});

test("config keys documented in SKILL.md and configuration reference", async () => {
  const configDoc = await readFile(
    path.join(REPO_ROOT, "docs", "reference", "configuration.md"),
    "utf-8",
  );
  // Base keys reused from develop-next + the batch-only key.
  for (const key of [
    "developNext.roadmapPath",
    "developNext.baseBranch",
    "developNext.qualityGateCommand",
    "developNext.mergeStrategy",
    "developBatch.maxParallel",
    "developBatch.requireTouches",
    "developBatch.resources",
    "developBatch.worktreeSeedPaths",
    "developBatch.worktreeRoot",
    "developBatch.maxResumeAttempts",
    "developBatch.maxRebatches",
  ]) {
    assert.ok(skill.includes(key), `SKILL.md missing ${key}`);
  }
  for (const key of [
    "developBatch.maxParallel",
    "developBatch.requireTouches",
    "developBatch.worktreeRoot",
  ]) {
    assert.ok(configDoc.includes(key), `configuration.md missing ${key}`);
  }
});

test("SKILL.md: un-annotated (+own-default) rows are warned on and deferrable", () => {
  // The batch's write-disjointness rests on touches: annotations; a missing field
  // defaults to +own and could silently over-parallelize. SKILL.md must document
  // both the warning and the requireTouches downgrade.
  assert.match(flat, /unannotated/);
  assert.match(flat, /assumed, not verified/i);
  assert.match(flat, /--require-touches/);
  assert.match(flat, /requireTouches/);
});

// ── scheduler contract (capacity-aware rolling admission) ────────────────────

test("schedule.mjs exists and is executable", async () => {
  const p = path.join(SKILL_DIR, "scripts", "schedule.mjs");
  await access(p, constants.X_OK);
});

test("placement is delegated to the planner, never hand-picked", () => {
  assert.match(flat, /schedule\.mjs plan/);
  assert.match(flat, /Placement is never hand-picked/i);
});

test("admission is rolling, not wave-barriered", () => {
  // The old wave language must be gone — it is what made a freed slot sit idle.
  assert.doesNotMatch(flat, /in waves of that size/i);
  assert.doesNotMatch(flat, /process the remainder in waves/i);
  assert.match(flat, /WAIT for the NEXT pipeline to report — not all of them/i);
});

test("background dispatch is mandated, with the degraded fallback spelled out", () => {
  // Awaiting a whole group silently reinstates waves; this is the #1 way the
  // rolling design reverts in practice.
  assert.match(flat, /Dispatch in the background/i);
  assert.match(flat, /Degraded fallback/i);
});

test("the dispatch directive carries the resource and its test command", () => {
  assert.match(flat, /<resourceName>/);
  assert.match(flat, /<testCommand>/);
  assert.match(flat, /<seedPaths>/);
});

test("a silent runner fallback is not accepted as a pass", () => {
  assert.match(flat, /a silent fallback is not a pass/i);
  assert.match(flat, /placement failure/i);
});

test("gate steps run foreground with a Monitor-style hold, and CI is not polled", () => {
  assert.match(flat, /foreground/i);
  assert.match(flat, /Monitor-style/i);
  assert.match(flat, /Do \*\*not\*\* poll CI|do not poll CI/i);
});

test("interrupted is distinguished from halted, and fails safe to halt", () => {
  assert.match(flat, /interrupted-exhausted/);
  assert.match(flat, /re-place/i);
  assert.match(flat, /fails safe to `halt`/i);
});

test("plan mode is called out as a preflight stop", () => {
  assert.match(flat, /Do not run this skill in plan mode/i);
});

test("state schema carries the new fields and drops the ad-hoc ones", () => {
  for (const key of [
    '"resource"',
    '"testCommand"',
    '"attempts"',
    '"interrupted"',
    '"haltKind"',
  ]) {
    assert.match(
      skill,
      new RegExp(key.replace(/["]/g, '"')),
      `state schema missing ${key}`,
    );
  }
  // `wave` and `lane` were operator improvisation that never had semantics.
  assert.doesNotMatch(skill, /"wave"\s*:/);
  assert.doesNotMatch(skill, /"lane"\s*:/);
});

test("in-flight is derived, never persisted as a counter", () => {
  assert.match(flat, /Never persist a slot counter/i);
});

test("the merge lane stays serial AND deferred until development finishes", () => {
  assert.match(flat, /Never parallelize this lane/i);
  assert.match(flat, /Step 3 begins only once the pending queue is empty/i);
});

test("Step 5.5 re-batches only on real progress", () => {
  assert.match(flat, /Step 5\.5/);
  assert.match(
    flat,
    /ticked \*\*zero\*\* roadmap rows|the previous batch ticked/i,
  );
  // Mid-Step-2 top-up of hard-excluded rows is unsafe and must be refused.
  assert.match(flat, /Do not attempt this mid-Step-2/i);
});

test("execution-resources reference exists and documents the probe contract", async () => {
  const ref = await readFile(
    path.join(SKILL_DIR, "references", "execution-resources.md"),
    "utf-8",
  );
  assert.match(ref, /freeSlots/);
  assert.match(ref, /can only ever subtract/i);
  assert.match(ref, /never stalls a batch/i);
  assert.match(ref, /Rejected alternative/i);
  assert.match(ref, /rolling merges/i);
});

// ---------------------------------------------------------------------------
// task.113 — the serial lane mirrors develop-next's gate matrix and Step 4 arms.
// ---------------------------------------------------------------------------

test("Step 3 lane: verify-green carries the gate matrix, not the PASS token", async () => {
  const skill = await readFile(SKILL_PATH, "utf-8");
  const a = skill.indexOf("## Step 3 — Serial finalize lane");
  const b = skill.indexOf("## Step 4", a + 1);
  assert.ok(a >= 0 && b > a, "Step 3 lane section missing");
  const lane = skill.slice(a, b);
  assert.doesNotMatch(
    lane,
    /QA gate file decision `PASS` and document frontmatter/,
    "old PASS clause gone",
  );
  assert.match(lane, /top_issues\[\]/);
  assert.match(lane, /`WAIVED`/);
  const rows = [
    [
      /`accepted`\s*\|\s*`CONCERNS`\s*\|\s*no\s*\|\s*merge/,
      "CONCERNS no-open → merge",
    ],
    [
      /`accepted`\s*\|\s*`WAIVED`\s*\|\s*no\s*\|\s*merge/,
      "WAIVED no-open → merge",
    ],
    [
      /`CONCERNS` \/ `WAIVED`\s*\|\s*\*\*yes\*\*\s*\|\s*\*\*HALT\*\*/,
      "open finding → HALT",
    ],
    [/`accepted`\s*\|\s*`FAIL`\s*\|\s*any\s*\|\s*\*\*HALT\*\*/, "FAIL → HALT"],
    [
      /not `accepted`\s*\|\s*any\s*\|\s*any\s*\|\s*\*\*HALT\*\*/,
      "not accepted → HALT",
    ],
    [
      /missing \/ unparseable\s*\|[^|]*\|\s*\*\*HALT\*\*/,
      "missing gate → HALT",
    ],
  ];
  assert.ok(rows.length >= 6, "matrix floor");
  for (const [re, name] of rows)
    assert.match(lane, re, `gate matrix row missing: ${name}`);
  // QA-4 mirror: the waiver clause must travel with the matrix.
  assert.match(lane, /`waiver\.active: true`/, "waiver clause mirrored");
  assert.match(lane, /count as waived, not open/);
});

test("Step 3 lane: the acceptance record branches on source with all three arms", async () => {
  const skill = await readFile(SKILL_PATH, "utf-8");
  const a = skill.indexOf("**Record the acceptance immediately**");
  assert.ok(a >= 0, "step 5 of the lane is titled source-neutrally");
  const rec = skill.slice(a, skill.indexOf("## Step 4", a));
  assert.match(rec, /Branch on the item's `source`/);
  assert.match(rec, /\*\*`source: roadmap`\*\*/);
  assert.match(rec, /\*\*`source: task-registry`\*\*/);
  assert.match(rec, /\*\*`source: bug-registry`\*\*/);
  assert.match(
    rec,
    /registry-tick\.js --annotate/,
    "registry arm uses the engine",
  );
  assert.match(rec, /never a\s+second Status writer/);
  assert.match(rec, /docs\(registry\): record <id> — PR #<n> merged/);
  assert.match(
    rec,
    /nothing to write/,
    "bug-registry arm names the no-cell case",
  );
  // QA-7 mirror: the dirty-registry check on `already`.
  assert.match(
    rec,
    /git diff --quiet HEAD -- docs\/tasks\/task-registry\.md/,
    "already checks for a dirty registry",
  );
});

// ── task.188: resume from evidence, not flags ───────────────────────────────

test("Step 0.1 reconciles merged from the PR state before resuming on the flags (obs #180)", () => {
  const step0 = skill.slice(
    skill.indexOf("## Step 0"),
    skill.indexOf("## Step 1"),
  );
  const recon = step0.indexOf("**Reconcile first, then route**");
  const block = step0.indexOf("# Step 0.1 reconciliation (develop-batch)");
  const resume = step0.indexOf("**Resume**: skip items already");
  assert.ok(recon > 0, "reconciliation missing from Step 0.1");
  assert.ok(
    block > recon && resume > block,
    "reconciliation must precede the flag routing",
  );
  assert.match(step0.slice(recon, resume), /`MERGED` → set `merged: true`/);
  assert.match(
    step0.slice(recon, resume),
    /only advances a flag, never clears one/,
  );
});

test("Step 3 merge cites develop-next's state verdict instead of restating the rule (obs #197)", () => {
  assert.match(
    skill,
    /judged by the PR's state, never by `gh pr merge`'s exit status — the rule is\s+stated once, in `develop-next` Step 3/,
  );
  assert.doesNotMatch(skill, /gh pr merge <PR#> --<mergeStrategy> \|\| exit 1/);
});

// ── Step 0.3a, executed (TASK-208-BUG-2) ──────────────────────────────────────
// The block validates the root BEFORE it writes .git/info/exclude, and reads
// git check-ignore's exit status three ways. Run the block as shipped, with
// <skillsDir> and <worktreeRoot> substituted, in throwaway repositories.
function step03aBlock(text) {
  const from = text.indexOf("3a. **The worktree root must be ignored.**");
  assert.ok(from > -1, "Step 0.3a heading not found");
  const open = text.indexOf("```bash\n", from);
  const close = text.indexOf("\n   ```", open + 8);
  assert.ok(open > -1 && close > open, "Step 0.3a bash block not found");
  return text
    .slice(open + 8, close)
    .split("\n")
    .map((l) => l.replace(/^ {3}/, ""))
    .join("\n");
}

function runStep03a(cwd, root) {
  const block = step03aBlock(skill)
    .replaceAll("<skillsDir>", path.join(REPO_ROOT, "skills"))
    .replaceAll("<worktreeRoot>", root);
  return spawnSync("bash", ["-c", block], { cwd, encoding: "utf-8" });
}

function scratchRepo() {
  const base = mkdtempSync(path.join(os.tmpdir(), "batch-03a-"));
  const repo = path.join(base, "repo");
  mkdirSync(repo);
  execFileSync("git", ["init", "-q"], { cwd: repo });
  return { base, repo, exclude: path.join(repo, ".git", "info", "exclude") };
}
const excludeText = (f) => (existsSync(f) ? readFileSync(f, "utf-8") : "");

test("Step 0.3a: an unignored root is excluded once, by its normalised name", () => {
  const { repo, exclude } = scratchRepo();
  const r = runStep03a(repo, "./.worktrees/");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // Later steps substitute this printed value (TASK-208-BUG-3).
  assert.match(r.stdout, /^worktreeRoot: \.worktrees$/m);
  assert.match(excludeText(exclude), /^\/\.worktrees\/$/m);
  const again = runStep03a(repo, ".worktrees");
  assert.equal(again.status, 0);
  assert.equal(
    excludeText(exclude).match(/^\/\.worktrees\/$/gm).length,
    1,
    "an ignored root is not appended twice",
  );
});

test("Step 0.3a: a refused root halts before anything is written", () => {
  const { base, repo, exclude } = scratchRepo();
  const before = excludeText(exclude);
  mkdirSync(path.join(base, "outside"));
  symlinkSync(path.join(base, "outside"), path.join(repo, ".wt"));
  for (const root of ["../outside", ".wt", "wt\nx"]) {
    const r = runStep03a(repo, root);
    assert.notEqual(r.status, 0, `${JSON.stringify(root)} must halt`);
    assert.match(r.stdout, /HALT: worktreeRoot refused/);
    assert.equal(
      excludeText(exclude),
      before,
      `${JSON.stringify(root)} wrote nothing`,
    );
  }
});

test("Step 0.3a: git unable to answer halts, never reads as not-ignored", () => {
  // Outside any repository git check-ignore exits 128.
  const dir = mkdtempSync(path.join(os.tmpdir(), "batch-03a-norepo-"));
  const r = runStep03a(dir, ".worktrees");
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /HALT: git check-ignore could not evaluate/);
  assert.equal(existsSync(path.join(dir, ".git")), false);
});
