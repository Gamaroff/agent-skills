"use strict";
/**
 * Shared script-literal guard — a `shared/resources/<script>` literal in the
 * PROSE of a `shared/resources/*.md` document vendors that script into every
 * skill that bundles the document, whether or not the skill runs it.
 *
 * WHY THIS EXISTS
 * ---------------
 * Inside `shared/resources/`, a `shared/resources/<file>` literal is a bundling
 * instruction, not a reference (AGENTS.md § Shared Resources; create-skill §
 * "Inside `shared/resources/`, a `shared/resources/` literal is a bundling
 * instruction"). The resume contract read ``Source: `shared/resources/grant-qa-cycles.sh` ``,
 * and the bundler copied the script into develop-bug, qa-story, qa-task and
 * review-pr, none of which runs it (obs #263). `bundle:check` cannot see it: a
 * copy the literal reaches is reached. Task.193 classified every prose script
 * literal — a literal stays only when every skill that bundles its document runs
 * its own copy of the script — switched the rest to bare filenames and removed
 * 17 copies. This test is what keeps a new one from landing unjustified.
 *
 * Three parts:
 *   §1 CONTROL — the scanner on inline fixtures: plain prose, an
 *      `Engine source:` line, prose "source"/"import … from" and a cite wrapper
 *      must be reported; a fenced line and a command line must not. A scanner
 *      that over- or under-fires is caught here before it judges the real tree.
 *
 * A cite wrapper is no exemption here. The bundler cites only a `.md` target
 * (quick_validate.py `ref_kind`, CITABLE_SUFFIXES): `<!-- cite: …x.js -->` is a
 * dependency and copies x.js like a bare literal does (task.193 QA cycle 1, CR-1).
 *
 * Scope: `shared/resources/*.md`, the task's population. A literal in a shared
 * `.sh` comment propagates the same way and is not read here (QA cycle 1, CR-3).
 *   §2 LIVE TREE — every reported literal is in ALLOWED (each entry carries the
 *      reason every bundling skill needs the copy), every ALLOWED entry still
 *      matches a line, and the incident line restored into the resume contract is
 *      reported (the mutation proof, run on every push).
 *   §3 PIN — create-skill's rule paragraph keeps its unbundled wording (obs #175,
 *      #289).
 *
 * Run: node --test tests/shared-script-literals.test.js
 */

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { fenceStep, sectionOf } = require("./lib/markdown-section.js");

const REPO_ROOT = path.resolve(__dirname, "..");
const SHARED = path.join(REPO_ROOT, "shared", "resources");

/** SHARED_REF_RE in bundle_skill.py, narrowed to the script extensions this guard owns. */
const SCRIPT_LITERAL =
  /(?<![\w-]\/)shared\/resources\/([A-Za-z0-9_.-]+\.(?:sh|js|mjs))/g;

/**
 * A literal is RUN when a command sits immediately before it, optionally behind
 * one quote or backtick. The command must open a code span, a `(` / `$(` or the
 * line, and may carry flags; `import … from` must sit inside one code span. A
 * token anywhere else does not count: "Engine source:", English "from" and
 * "sourceable" are prose, and an "anywhere before" rule passed 18 such lines
 * (task.193 review 1, I1). So is "the single source `…`" (QA cycle 1, CR-2).
 */
const RUN_PREFIX =
  /(?:(?:^|[`(])\s*(?:command\s+)?(?:bash|sh|source|node)\s+(?:-\S+\s+)*|require\(\s*|import\(\s*|`[^`]*\bimport\b[^`]*\bfrom\s+)["'`]?(?:\.\/)?$/;

/**
 * Each "<doc>:<script>" whose prose literal stays, with the reason every skill
 * that bundles <doc> needs <script> bundled. A witness is a line that runs THAT
 * skill's own copy (task.193 Phase 1; the classification is in the task's
 * implementation report).
 */
const ALLOWED = {
  "develop-pipeline-autonomous-defaults.md:resolve-platform.sh":
    "all nine bundlers (develop-*, qa-fix, qa-*, review-pr/story/task) source their own resolve-platform.sh; e.g. develop-pipeline-hooks.md's `source references/resolve-platform.sh`",
  "develop-pipeline-step-2-review.md:review-report-freshness.js":
    "develop-story and develop-task require their own copy in the Step 2 freshness gate",
  "develop-pipeline-step-2-review.md:tracker-comment.js":
    "develop-story and develop-task post every pipeline comment through it",
  "develop-pipeline-step-3-develop-loop.md:tracker-comment.js":
    "develop-bug, develop-story and develop-task post every pipeline comment through it",
  "develop-pipeline-step-4-create-pr.md:gh-stage.js":
    "develop-bug, develop-story and develop-task move the board at Step 4 through it",
  "develop-pipeline-step-4-create-pr.md:tracker-comment.js":
    "develop-bug, develop-story and develop-task post the PR-opened comment through it",
  "develop-pipeline-step-5-6-qa-loop.md:gh-stage.js":
    "develop-story and develop-task (its only bundlers) move the board through it",
  "develop-pipeline-step-5-6-qa-loop.md:grant-qa-cycles.sh":
    "develop-story and develop-task (its only bundlers) run it from SKILL.md on a QA-loop re-entry",
  "develop-pipeline-step-5-6-qa-loop.md:qa-diminishing-returns.js":
    "develop-story and develop-task (its only bundlers) run it in the QA loop",
  "develop-pipeline-step-5-6-qa-loop.md:set-qa-phase.sh":
    "develop-story and develop-task (its only bundlers) run it at each QA sub-step",
  "develop-pipeline-step-7-finalise.md:stakeholder-summary-cli.js":
    "all six bundlers render leads through it (the PreCompact hook and the Step 7 comments)",
  "develop-pipeline-step-7-finalise.md:tracker-issue.js":
    "all six bundlers close or reopen the tracker issue through it (tracker-issue-cli.md)",
  "develop-pipeline-step-8-commit.md:report-lint.js":
    "develop-bug, develop-story and develop-task lint the report at every step transition",
  "finalise-dod-security-prompt.md:security-input-corpus.mjs":
    "finalise, qa-story and qa-task load it through their own security-probe.mjs",
  "finalise-dod-security-prompt.md:security-probe.mjs":
    'finalise\'s security-probe-plan.mjs runs the engine beside itself (path.join(HERE, "security-probe.mjs")); qa-story and qa-task run it from SKILL.md',
  "jira-transition-protocol.md:jira-stage.js":
    "all seven bundlers move Jira cards through it",
  "platform-detection.md:resolve-platform.sh":
    "every bundler sources its own resolve-platform.sh before branching on platform",
  "platform-detection.md:bitbucket-auth.sh":
    "every bundler's copy of platform-detection.md sources its own bitbucket-auth.sh on the Bitbucket arm",
  "qa-runnable-prose-detection.md:qa-execute-snippets.mjs":
    "all five bundlers run it to execute fenced snippets",
  "security-input-corpus.md:security-input-corpus.mjs":
    "all four bundlers load it through their own security-probe.mjs",
  "security-review-prompt.md:security-input-corpus.mjs":
    "review-security (its only bundler) loads it through security-probe.mjs",
  "security-review-prompt.md:security-probe.mjs":
    "review-security (its only bundler) runs it from the bundled prompt",
  "tracker-state-poller-subagent.md:resolve-platform.sh":
    "all six bundlers source their own resolve-platform.sh",
};

/** Non-vacuity floors: shared/resources held 59 .md files at authoring time. */
const MIN_DOCS = 40;
const MIN_FENCED = 1;

/**
 * The prose script literals in one document's text, plus how many literals the
 * fence branch skipped (the floor that proves the fence branch is alive).
 */
function scan(text) {
  const found = [];
  let fenced = 0;
  let open = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const step = fenceStep(open, line);
    const isFenced = open !== null || step.isFence;
    open = step.open;
    if (isFenced) {
      fenced += [...line.matchAll(SCRIPT_LITERAL)].length;
      return;
    }
    for (const m of line.matchAll(SCRIPT_LITERAL)) {
      if (RUN_PREFIX.test(line.slice(0, m.index))) continue;
      found.push({ line: i + 1, script: m[1], text: line.trim() });
    }
  });
  return { found, fenced };
}

function liveDocs() {
  return fs
    .readdirSync(SHARED)
    .filter((f) => f.endsWith(".md"))
    .sort();
}

function scanTree() {
  const hits = [];
  let fenced = 0;
  const docs = liveDocs();
  for (const doc of docs) {
    const r = scan(fs.readFileSync(path.join(SHARED, doc), "utf8"));
    fenced += r.fenced;
    for (const h of r.found) hits.push({ doc, ...h });
  }
  return { docs, hits, fenced };
}

test("§1 control: the scanner reports prose and nothing else", () => {
  const fixture = [
    "Plain prose naming `shared/resources/a.sh` here.",
    "Engine source: `shared/resources/b.js` (bundled into each skill).",
    "Shell calls wrap with f from `shared/resources/c.sh`, which retries.",
    "```bash",
    "bash shared/resources/d.sh --flag",
    "```",
    "Run `bash shared/resources/e.sh` once.",
    "See <!-- cite: shared/resources/f.mjs --> for the engine.",
    "This is the single source `shared/resources/g.js` for the rule.",
    "Callers import nothing from `shared/resources/h.js` directly.",
    "Load it with `node -e 'require(\"./shared/resources/i.js\")'`.",
    "Then `command node --test shared/resources/j.mjs` runs it.",
    "Lift it with `import { x } from 'shared/resources/k.mjs'`.",
  ].join("\n");
  const r = scan(fixture);
  assert.deepEqual(
    r.found.map((h) => h.script),
    ["a.sh", "b.js", "c.sh", "f.mjs", "g.js", "h.js"],
    "prose, `Engine source:`, prose from/source and a cite wrapper are reported; " +
      "fence, command lines and code-span require/import are not",
  );
  assert.equal(
    r.fenced,
    1,
    "the fenced literal is counted by the fence branch",
  );
});

test("§1 control: a cite wrapper spanning lines does not hide a script", () => {
  // The bundler reads a cite-wrapped script as a dependency (CR-1), so the
  // wrapper must not exempt it, on one line or across several.
  const r = scan(
    "Before <!-- cite:\nshared/resources/g.js\n--> after `shared/resources/h.js`.",
  );
  assert.deepEqual(
    r.found.map((h) => h.script),
    ["g.js", "h.js"],
  );
});

test("§2 live tree: every prose script literal is justified in ALLOWED", () => {
  const { docs, hits, fenced } = scanTree();
  assert.ok(
    docs.length >= MIN_DOCS,
    `read ${docs.length} shared/resources/*.md — the scan is reading something`,
  );
  assert.ok(
    fenced >= MIN_FENCED,
    `${fenced} fenced script literal(s) seen — the fence branch is alive`,
  );
  const unlisted = hits.filter((h) => !(`${h.doc}:${h.script}` in ALLOWED));
  assert.deepEqual(
    unlisted.map((h) => `shared/resources/${h.doc}:${h.line} → ${h.script}`),
    [],
    "A prose `shared/resources/<script>` literal copies the script into every skill that " +
      "bundles the document. Cite it by bare filename, or — only when every bundling skill " +
      "runs its own copy — add `<doc>:<script>` to ALLOWED with that reason.",
  );
});

test("§2 live tree: every ALLOWED entry still matches a line", () => {
  const { hits } = scanTree();
  const live = new Set(hits.map((h) => `${h.doc}:${h.script}`));
  const stale = Object.keys(ALLOWED).filter((k) => !live.has(k));
  assert.deepEqual(
    stale,
    [],
    "stale ALLOWED entries — the literal is gone; delete the entry",
  );
  for (const [k, reason] of Object.entries(ALLOWED)) {
    assert.ok(reason.trim().length > 20, `ALLOWED["${k}"] needs a reason`);
  }
});

test("§2 mutation: the incident line restored into the resume contract is reported", () => {
  const doc = "develop-pipeline-resume-contract.md";
  const text = fs.readFileSync(path.join(SHARED, doc), "utf8");
  const clean = "Source: `grant-qa-cycles.sh`; suite:";
  assert.equal(
    text.split(clean).length,
    2,
    `${doc} carries the bare-filename line once`,
  );
  const mutated = text.replace(
    clean,
    "Source: `shared/resources/grant-qa-cycles.sh`; suite:",
  );
  const hits = scan(mutated).found.filter(
    (h) => !(`${doc}:${h.script}` in ALLOWED),
  );
  assert.deepEqual(
    hits.map((h) => h.script),
    ["grant-qa-cycles.sh"],
  );
});

test("§3 pin: create-skill's rule paragraph keeps its unbundled wording", () => {
  const heading =
    "### Inside `shared/resources/`, a `shared/resources/` literal is a bundling instruction";
  const lines = sectionOf(
    fs.readFileSync(
      path.join(REPO_ROOT, "skills", "create-skill", "SKILL.md"),
      "utf8",
    ),
    heading,
  );
  assert.ok(lines, `create-skill/SKILL.md has the heading "${heading}"`);
  const text = lines.join("\n").replace(/\s+/g, " ");
  assert.ok(
    text.includes(
      "A literal that puts the shared-resources directory in front of the filename is not a reference",
    ),
    "the rule sentence describes the literal in words, so the bundler cannot rewrite it",
  );
  // The section names `references/<file>` on purpose, explaining obs #175; only
  // the old rule FORM — which the bundler produced — is forbidden.
  assert.ok(
    !text.includes("A literal `references/<file>`"),
    "the bundler-rewritten form of the rule must not return",
  );
});

module.exports = { scan, RUN_PREFIX };
