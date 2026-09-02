"use strict";
/**
 * Skill documentation-coverage guard — a shipped skill must be findable.
 *
 * Motivation: `double-check` shipped complete on 2026-09-02 and was reachable
 * from exactly one of the four places a developer looks. The catalog had it,
 * because `npm run generate-catalog` is automated and cannot drift. The command
 * reference and the activation-phrase reference did not, because both are
 * hand-maintained and nothing checked them. It took a second PR to notice.
 *
 * That is a class, not an incident. `commands.md` carries its own "Coverage
 * note" conceding it is not exhaustive, which is how a page like it rots: every
 * omission is pre-excused, so no omission is ever a defect.
 *
 * WHAT THIS ASSERTS, narrowly:
 *   1. Every `skills/<name>/SKILL.md` is named in BOTH reference pages, or sits
 *      one of the two adoption lists below.
 *   2. Those lists are closed — every entry still names a real skill.
 *   3. Those lists only shrink — an entry that has since been documented in both
 *      pages must be REMOVED, not left to carry finished work.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: backfill. 66 of the 120 skills present when
 * this guard landed are undocumented in one page or both. Some genuinely are
 * invoked by name rather than slash — the validators, enforcers and
 * framework-specific helpers `commands.md` describes. Others are real gaps that
 * predate the guard. The lists below do not claim to tell those apart, and are
 * named for what is actually known: their state at adoption. This mirrors the
 * repo-wide rule already applied to the Change Log and to OKF — additive and
 * going-forward only.
 *
 * The point is the boundary, not the backlog: a NEW skill cannot join these
 * lists without someone writing down why, so the next `double-check` fails here
 * instead of shipping unfindable.
 *
 * Run: node --test tests/
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const PAGES = {
  "commands.md": path.join(REPO_ROOT, "docs", "reference", "commands.md"),
  "activation-phrases.md": path.join(
    REPO_ROOT,
    "docs",
    "reference",
    "activation-phrases.md",
  ),
};

/**
 * Undocumented in BOTH pages when this guard landed (2026-09-02).
 */
const UNDOCUMENTED_AT_ADOPTION = new Set([
  "agent-md-refactor",
  "po",
  "analyst",
  "api-endpoint-validator",
  "autoskill",
  "book-typesetter-pro",
  "brainstorming",
  "brownfield-prd-template",
  "browser-use",
  "building-components",
  "change-checklist",
  "code-smell-validator",
  "command-development",
  "create-doc",
  "create-epics-from-shards",
  "create-frontend-spec",
  "create-research-prompt",
  "deep-research-prompt",
  "deploy-remote",
  "docker",
  "documentation-standards-validator",
  "enforce-standards",
  "ensure-epic-github-issue",
  "ensure-epic-jira-issue",
  "ensure-story-github-issue",
  "ensure-story-jira-issue",
  "ensure-task-github-issue",
  "ensure-task-jira-issue",
  "epic-registry-manager",
  "error-handling-enforcer",
  "explain-simply",
  "extract",
  "generate-ui-prompt",
  "git-time-travel",
  "harden",
  "humaniser",
  "humanize-text",
  "navigation-pattern-validator",
  "nestjs-debug",
  "nestjs-patterns",
  "offline-first-enforcer",
  "optimize",
  "performance-optimizer",
  "platform-separation-validator",
  "pm-coordinator",
  "prd-template",
  "railway-postgres-crud",
  "react-native-debug",
  "research-prompt",
  "response-envelope-enforcer",
  "scaffold-tracker-workflow",
  "server-admin",
  "shard-doc",
  "tech-debt-audit",
  "test-co-location-enforcer",
  "testing-setup-nestjs",
  "testing-setup-react-native",
  "testing-setup-shared",
  "use-railway",
  "ux-expert",
]);

/**
 * Named in exactly ONE of the two pages when this guard landed (2026-09-02).
 * Half-documented, which is the state hardest to notice by reading.
 */
const PARTIAL_AT_ADOPTION = new Set([
  "architect",
  "create-parallel-stories",
  "execute-checklist",
  "jira-epic-creator",
  "loop-supervisor",
  "markdown-wireframe",
  "mermaid-architect",
  "pm-checklist",
]);

/** Every skill directory carrying a SKILL.md. */
function allSkills() {
  return fs
    .readdirSync(path.join(REPO_ROOT, "skills"))
    .filter((d) => fs.existsSync(path.join(REPO_ROOT, "skills", d, "SKILL.md")))
    .sort();
}

/**
 * Is this skill named in this page?
 *
 * Word-boundary matched, excluding `-` on either side. A bare substring test
 * reports `research-prompt` as documented because `create-research-prompt`
 * appears — a guard that passes by accident is worse than none.
 */
function names(text, skill) {
  const esc = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${esc}(?![\\w-])`).test(text);
}

function coverage() {
  const pages = Object.fromEntries(
    Object.entries(PAGES).map(([k, p]) => [k, fs.readFileSync(p, "utf8")]),
  );
  return allSkills().map((skill) => ({
    skill,
    missing: Object.keys(PAGES).filter((k) => !names(pages[k], skill)),
  }));
}

test("§1 every skill is named in both reference pages, or allowlisted", () => {
  const failures = [];
  for (const { skill, missing } of coverage()) {
    if (missing.length === 0) continue;
    if (UNDOCUMENTED_AT_ADOPTION.has(skill)) continue;
    if (PARTIAL_AT_ADOPTION.has(skill)) continue;
    failures.push(`${skill} — absent from ${missing.join(", ")}`);
  }

  assert.deepEqual(
    failures,
    [],
    `A skill ships that a developer cannot find. Add a row to each page listed ` +
      `(the command and its flags to commands.md, the natural-language triggers ` +
      `to activation-phrases.md). If the skill is genuinely invoked by name ` +
      `rather than slash, say so by adding it to UNDOCUMENTED_AT_ADOPTION with ` +
      `that reason — deliberately, not silently:\n  ` +
      failures.join("\n  "),
  );
});

test("§2 both allowlists are closed — every entry still names a real skill", () => {
  // An entry pointing at a renamed or deleted skill would silently excuse a
  // DIFFERENT skill that later takes the name. Staleness is how an allowlist
  // rots into a no-op.
  const present = new Set(allSkills());
  const stale = [];
  for (const [label, list] of [
    ["UNDOCUMENTED_AT_ADOPTION", UNDOCUMENTED_AT_ADOPTION],
    ["PARTIAL_AT_ADOPTION", PARTIAL_AT_ADOPTION],
  ]) {
    for (const skill of list) {
      if (!present.has(skill)) stale.push(`${label}: ${skill} — no such skill`);
    }
  }

  assert.deepEqual(
    stale,
    [],
    `Allowlist entries that no longer name a skill:\n  ` + stale.join("\n  "),
  );
});

test("§3 the allowlists only shrink — a documented entry must be removed", () => {
  // The lists record a gap. Once the gap is closed the entry is no longer a
  // record of anything, and leaving it there quietly re-exempts the skill if
  // its rows are ever deleted.
  const done = [];
  for (const { skill, missing } of coverage()) {
    if (missing.length > 0) continue;
    if (UNDOCUMENTED_AT_ADOPTION.has(skill))
      done.push(`${skill} — remove from UNDOCUMENTED_AT_ADOPTION`);
    if (PARTIAL_AT_ADOPTION.has(skill))
      done.push(`${skill} — remove from PARTIAL_AT_ADOPTION`);
  }

  assert.deepEqual(
    done,
    [],
    `These skills are now documented in both pages. Delete their allowlist ` +
      `entries — the list is a boundary, not a backlog:\n  ` +
      done.join("\n  "),
  );
});
