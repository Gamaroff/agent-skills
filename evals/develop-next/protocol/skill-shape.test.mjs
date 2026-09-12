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

test("SKILL.md: story PRs merge to their own base — no automated epic promotion", () => {
  assert.match(
    skill,
    /target `<baseBranch>`[^\n]*directly|merge straight to/i,
    "SKILL.md must say story PRs normally target the configured base directly",
  );
  // The removed v0.24.0 machinery must stay removed. develop-next gained NO
  // epic-completion check and NO epic→base promotion when epic-integration
  // branches became an opt-in story-side feature in v0.25.0.
  assert.doesNotMatch(skill, /--epic-status|--assume-ticked/i);
});

test("SKILL.md: the epic-integration gap is documented, not left to be discovered", () => {
  assert.match(
    skill,
    /branch_model: epic-integration/,
    "SKILL.md must acknowledge epics that opt in to an integration branch",
  );
  assert.match(
    skill,
    /nothing promotes the integration branch|by hand/i,
    "SKILL.md must state that epic→base promotion is manual — a half-automated " +
      "flow that looks complete is worse than one that says where it stops",
  );
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

// ---------------------------------------------------------------------------
// task.113 — Step 3 gate matrix and Step 4 `item.source` arms.
//
// Each assertion below names the clause it pins, so a later edit that drops one
// fails with that clause's name rather than a generic "shape changed". The
// matrix rows are asserted individually with a floor: a test that only checked
// "a table exists" would pass a table with the HALT rows deleted.
// ---------------------------------------------------------------------------

function section(text, startHeading, endHeading) {
  const a = text.indexOf(startHeading);
  const b = text.indexOf(endHeading, a + 1);
  assert.ok(a >= 0, `${startHeading} missing`);
  assert.ok(b > a, `${endHeading} missing after ${startHeading}`);
  return text.slice(a, b);
}

const GATE_MATRIX_ROWS = [
  // [status, gate, open-finding, action] — one regex per row, order-free.
  [/`accepted`\s*\|\s*`PASS`\s*\|[^|]*\|\s*merge/, "accepted + PASS → merge"],
  [
    /`accepted`\s*\|\s*`CONCERNS`\s*\|\s*no\s*\|\s*merge/,
    "accepted + CONCERNS, no open → merge",
  ],
  [
    /`accepted`\s*\|\s*`WAIVED`\s*\|\s*no\s*\|\s*merge/,
    "accepted + WAIVED, no open → merge",
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
  [/missing \/ unparseable\s*\|[^|]*\|\s*\*\*HALT\*\*/, "missing gate → HALT"],
];

test("Step 3: the merge gate is finalise's verdict + no open finding, not the PASS token", () => {
  const step3 = section(skill, "## Step 3", "## Step 4");
  assert.match(
    step3,
    /frontmatter is `accepted`/,
    "accepted is the load-bearing condition",
  );
  assert.match(step3, /top_issues\[\]/, "the open-finding check is named");
  assert.match(
    step3,
    /`WAIVED`/,
    "WAIVED is named — a waiver is a human decision, not a block",
  );
  assert.doesNotMatch(
    step3,
    /QA gate file decision is `PASS` and the document frontmatter/,
    "the old PASS-token clause must be gone, not merely joined by the matrix",
  );
  assert.ok(GATE_MATRIX_ROWS.length >= 7, "matrix floor");
  for (const [re, name] of GATE_MATRIX_ROWS) {
    assert.match(step3, re, `gate matrix row missing: ${name}`);
  }
  // QA-4 (task.113 cycle 1): qa-gate keeps waived findings in top_issues[] with
  // no status:, so without this clause the WAIVED→merge row is unreachable.
  assert.match(
    step3,
    /`waiver\.active: true`/,
    "the waiver clause names the field it keys on",
  );
  assert.match(
    step3,
    /count as\s+waived, not open/,
    "entries under an active waiver are not open",
  );
  // The two commit-bound clauses survive — they cannot be inferred from `accepted`.
  assert.match(step3, /Head-SHA check/);
  assert.match(step3, /<qualityGateCommand>/);
});

test("run state carries `source`, which Step 4 reads on resume (QA-9)", () => {
  const state = section(skill, "## Run state", "## Step 0");
  assert.match(
    state,
    /"source": "roadmap"/,
    "the schema example carries source",
  );
  assert.match(
    state,
    /`source` is\s+`item\.source`/,
    "and says where it comes from",
  );
});

test("Step 4: branches on item.source with a roadmap arm, a registry arm and a bug-registry arm", () => {
  const step4 = section(skill, "## Step 4", "## Step 5");
  assert.match(
    step4,
    /## Step 4 — Record the acceptance/,
    "Step 4 is titled source-neutrally",
  );
  assert.match(step4, /Branch on `item\.source`/);
  for (const arm of ["`roadmap`", "`task-registry`", "`bug-registry`"]) {
    assert.match(
      step4,
      new RegExp(`### \`item\\.source\` = ${arm}`),
      `arm missing: ${arm}`,
    );
  }
});

test("Step 4 registry arm: calls registry-tick.js --annotate, never writes Status, names already and the empty case", () => {
  const arm = section(
    skill,
    "### `item.source` = `task-registry`",
    "### `item.source` = `bug-registry`",
  );
  assert.match(
    arm,
    /registry-tick\.js --annotate/,
    "the write is the engine, not a sed",
  );
  assert.match(arm, /--pr <PR#>/);
  assert.match(arm, /--issue/);
  assert.match(
    arm,
    /never a second Status writer/,
    "additive — finalise owns Status",
  );
  assert.match(
    arm,
    /no roadmap row and gets none/,
    "registry items get no roadmap row",
  );
  assert.match(arm, /`already`/, "the re-run case is named");
  assert.match(arm, /`no-row`/, "the empty case is named and does not block");
  // QA-7 (task.113 cycle 2): `already` is idempotent on the row, not on the commit.
  assert.match(
    arm,
    /git diff --quiet -- docs\/tasks\/task-registry\.md \|\| \{/,
    "already checks for a dirty registry before marking ticked",
  );
  // QA-11: every exit-0 reason the engine can emit is named.
  for (const r of ["`not-accepted`", "`not-a-task`", "`engine-unavailable`"]) {
    assert.ok(arm.includes(r), `exit-0 reason unnamed: ${r}`);
  }
  assert.match(
    arm,
    /docs\(registry\): record <id> — PR #<n> merged/,
    "commit convention",
  );
  assert.doesNotMatch(arm, /sed -i/, "no hand-rolled cell edit");
  // QA-1 (task.113 cycle 1): `${X:+--issue "$X"}` is one word under zsh.
  assert.doesNotMatch(
    arm,
    /\$\{ISSUE_REF:\+/,
    "the :+ expansion form breaks under zsh — use the array form",
  );
  assert.match(
    arm,
    /ISSUE_ARGS=\(--issue "\$ISSUE_REF"\)/,
    "optional --issue is built as an array",
  );
  assert.match(arm, /"\$\{ISSUE_ARGS\[@\]\}"/, "and expanded per element");
});

test("Step 4 bug-registry arm: states there is no cell to write and makes no commit", () => {
  const arm = section(skill, "### `item.source` = `bug-registry`", "## Step 5");
  assert.match(arm, /no Issue cell and\s+no notes cell/);
  assert.match(arm, /make\s+no commit/);
  assert.match(arm, /`ticked: true`/);
});

test("registry-tick.js is bundled beside develop-next so Step 4's call resolves", async () => {
  await access(
    path.join(
      REPO_ROOT,
      "skills",
      "develop-next",
      "references",
      "registry-tick.js",
    ),
    constants.R_OK,
  );
});
