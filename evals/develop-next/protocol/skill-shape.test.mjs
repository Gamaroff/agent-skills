/**
 * Protocol checks: assert develop-next SKILL.md / README / reference
 * structural invariants. Pure file-content checks — no driver, no model.
 *
 * These pin the fixes that came out of the 2026-07-12 skill review:
 *   - selection is delegated to the deterministic script, never eyeballed
 *   - --dry-run is read-only (fetch only; no checkout/pull)
 *   - a run-state file makes merge→tick crash-safe and idempotent
 *   - merge gate verifies the PR head SHA and comes from config
 *   - /create-* rows stop the loop BEFORE authoring
 *   - no consumer-project facts baked into a library skill
 *
 * Run via: node --test evals/develop-next/protocol/skill-shape.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const SKILL_DIR = path.join(REPO_ROOT, "skills", "develop-next");
const SKILL_PATH = path.join(SKILL_DIR, "SKILL.md");
const README_PATH = path.join(SKILL_DIR, "README.md");
const REF_PATH = path.join(SKILL_DIR, "references", "roadmap-selection.md");
const SCRIPT_PATH = path.join(SKILL_DIR, "scripts", "select-next.mjs");

const skill = await readFile(SKILL_PATH, "utf-8");
const readme = await readFile(README_PATH, "utf-8");
const reference = await readFile(REF_PATH, "utf-8");

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

test("SKILL.md: selection delegates to select-next.mjs, never eyeballed", () => {
  assert.match(skill, /scripts\/select-next\.mjs/);
  assert.match(skill, /never eyeball the roadmap/i);
});

test("select-next.mjs: exists, is executable, exports the pure API", async () => {
  await access(SCRIPT_PATH, constants.X_OK);
  const mod = await import(pathToFileURL(SCRIPT_PATH).href);
  for (const fn of ["parseRoadmap", "selectNext"]) {
    assert.equal(typeof mod[fn], "function", `missing export ${fn}`);
  }
});

test("SKILL.md: --dry-run is read-only (fetch only, no checkout/pull)", () => {
  assert.match(skill, /--dry-run/);
  assert.match(skill, /fetch only\s*—\s*never checkout or pull/i);
  assert.match(skill, /\*\*Read-only\*\*/);
});

test("SKILL.md: run-state file makes merge→tick crash-safe", () => {
  assert.match(skill, /develop-next\.state\.json/);
  assert.match(skill, /"merged"/);
  assert.match(skill, /"ticked"/);
  assert.match(skill, /deleted only in Step 5/i);
  assert.match(
    skill,
    /never .*re-selected and re-dispatched|never be re-selected/i,
  );
});

test("SKILL.md: story PRs merge straight to base — no epic promotion", () => {
  assert.match(
    skill,
    /no epic integration branch to promote|merge straight to/i,
  );
  assert.doesNotMatch(skill, /--epic-status|--assume-ticked|promote the epic/i);
});

test("SKILL.md: merge gate verifies PR head SHA and uses configured gate/strategy", () => {
  assert.match(skill, /headRefOid/);
  assert.match(skill, /git rev-parse HEAD/);
  assert.match(skill, /qualityGateCommand/);
  assert.match(skill, /mergeStrategy/);
  assert.match(skill, /gh pr checks/);
});

test("SKILL.md: merge path supports Bitbucket, not GitHub only", () => {
  // `gh` cannot address a Bitbucket remote at all, so a gh-only Step 3 makes
  // the skill inoperable on Bitbucket repos — it selects and dispatches, then
  // halts at the merge, defeating one of the three gaps it exists to close.
  assert.match(skill, /resolve-platform\.sh/);
  assert.match(skill, /\$VCS.*=.*"bitbucket"|VCS.*bitbucket/s);
  // Every gh call site must have a Bitbucket counterpart.
  assert.match(skill, /pullrequests\/\$\{PR_ID\}\/merge/); // merge
  assert.match(skill, /\.source\.commit\.hash/); // head-SHA check
  assert.match(skill, /commit\/\$\{PR_HEAD\}\/statuses/); // CI checks
  assert.match(skill, /state="MERGED"/); // already-done guard
});

test("SKILL.md: mergeStrategy is translated for Bitbucket, not passed through", () => {
  // Bitbucket's merge_strategy vocabulary does not overlap gh's: passing
  // `merge`/`rebase` straight through is rejected by the API.
  assert.match(skill, /merge_commit/);
  assert.match(skill, /fast_forward/);
  assert.match(skill, /close_source_branch/); // gh's --delete-branch equivalent
});

// Executable content only. Prose deliberately *names* these anti-patterns in
// order to warn against them, so matching the whole document would fire on the
// warnings themselves.
// Shell comments are stripped too: the in-block comments explain *why* an
// anti-pattern is avoided, and naming it there must not trip the check.
const skillCode = [...skill.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g)]
  .map((m) => m[1])
  .join("\n")
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n");

test("SKILL.md: does not preflight Bitbucket auth against /2.0/user", () => {
  // That endpoint needs the read:user scope, which PR-scoped app passwords
  // commonly lack — it 403s while PR/repo calls succeed, so using it as a
  // preflight produces a false negative that blocks every run.
  assert.ok(skillCode.length > 0, "no bash blocks found to check");
  assert.doesNotMatch(skillCode, /2\.0\/user|\$\{BB_API\}\/user/);
});

test("SKILL.md: shell is portable — no BSD-incompatible lazy quantifier", () => {
  // `[^/]+?` is a GNU sed extension; BSD sed (macOS default) rejects it with
  // "repetition-operator operand invalid", silently yielding an empty repo path.
  assert.doesNotMatch(skillCode, /\[\^\/\]\+\?/);
});

test("SKILL.md: autonomous dispatch directive present verbatim", () => {
  assert.match(skill, /AUTONOMOUS RUN \(develop-next\)/);
  assert.match(skill, /Phase 0d Upfront Setup/);
  assert.match(skill, /All existing HALT conditions remain HALTs/);
});

test("SKILL.md: all selector stop reasons are handled", () => {
  for (const reason of [
    "human-gated",
    "planning-gap",
    "manual-checkpoint",
    "phase-blocked",
    "roadmap-complete",
  ]) {
    assert.ok(
      skill.includes(reason),
      `stop reason ${reason} not handled in SKILL.md`,
    );
  }
});

test("reference documents the living-backlog markers (SKIP, archived deps)", () => {
  assert.match(reference, /living backlog/i);
  assert.match(reference, /⏭️|SKIP/);
  assert.match(reference, /archived/i);
});

test("planning gaps stop BEFORE authoring — /create-* is never run unattended", () => {
  assert.match(skill, /never run unattended|never run it unattended/i);
  assert.match(reference, /\*\*STOP\*\* — authoring is interactive/i);
  assert.doesNotMatch(skill, /run that command instead/i);
});

test("no consumer-project facts leak into the library skill", () => {
  const banned = [
    /#20[05]\b/, // repo-convention PR references
    /#215\b/,
    /Task 1 runner/i, // consumer CI setup
    /npm run lint && npm run typecheck && npm test/, // hardcoded gate
    /v6\.10/, // pinned roadmap version
    /15 → 17 → 10/, // ratified consumer epic order
    /\benv gh\b/, // consumer CLAUDE.md command prefix
  ];
  for (const [name, content] of [
    ["SKILL.md", skill],
    ["README.md", readme],
    ["roadmap-selection.md", reference],
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
  for (const key of [
    "developNext.roadmapPath",
    "developNext.baseBranch",
    "developNext.qualityGateCommand",
    "developNext.mergeStrategy",
  ]) {
    assert.ok(configDoc.includes(key), `configuration.md missing ${key}`);
    assert.ok(skill.includes(key), `SKILL.md missing ${key}`);
  }
});

test("reference worked examples are backed by unit fixtures", async () => {
  const fixtures = await readdir(
    path.join(REPO_ROOT, "evals", "develop-next", "unit", "fixtures"),
  );
  assert.ok(
    fixtures.length >= 8,
    `expected >= 8 selection fixtures, found ${fixtures.length}`,
  );
  assert.match(reference, /evals\/develop-next\/unit\/fixtures/);
});
