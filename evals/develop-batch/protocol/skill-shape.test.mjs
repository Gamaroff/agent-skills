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
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  for (const [name, content] of [
    ["SKILL.md", skill],
    ["README.md", readme],
    ["references/execution-resources.md", reference],
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
    "developBatch.maxResumeAttempts",
    "developBatch.maxRebatches",
  ]) {
    assert.ok(skill.includes(key), `SKILL.md missing ${key}`);
  }
  for (const key of [
    "developBatch.maxParallel",
    "developBatch.requireTouches",
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
