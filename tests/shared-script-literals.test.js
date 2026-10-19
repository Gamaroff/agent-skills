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
 *   §1 CONTROL — the scanner on six inline fixtures: plain prose, an
 *      `Engine source:` line and a prose "from" line must be reported; a fenced
 *      line, a command line and a cite wrapper must not. A scanner that over- or
 *      under-fires is caught here before it judges the real tree.
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
 * A literal is RUN when a command token sits immediately before it, optionally
 * behind one quote or backtick. A token anywhere else on the line does not count:
 * "Engine source:", English "from" and "sourceable" are prose, and an
 * "anywhere before" rule passed 18 such lines (task.193 review 1, I1).
 */
const RUN_PREFIX =
  /(?:\b(?:bash|sh|source|node|command node)\s+|require\(\s*|import\(\s*|\bimport\b.*\bfrom\s+)["'`]?$/;

const CITE_OPEN = "<!-- cite:";
const CITE_CLOSE = "-->";

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
  let inCite = false;
  text.split(/\r?\n/).forEach((line, i) => {
    const step = fenceStep(open, line);
    const isFenced = open !== null || step.isFence;
    open = step.open;
    if (isFenced) {
      fenced += [...line.matchAll(SCRIPT_LITERAL)].length;
      return;
    }
    // Walk the line in order so a cite wrapper opened on an earlier line, or
    // earlier on this one, covers the literals inside it.
    let pos = 0;
    for (const m of line.matchAll(SCRIPT_LITERAL)) {
      inCite = citeState(inCite, line.slice(pos, m.index));
      pos = m.index;
      if (inCite) continue;
      if (RUN_PREFIX.test(line.slice(0, m.index))) continue;
      found.push({ line: i + 1, script: m[1], text: line.trim() });
    }
    inCite = citeState(inCite, line.slice(pos));
  });
  return { found, fenced };
}

function citeState(inCite, segment) {
  let state = inCite;
  let i = 0;
  for (;;) {
    if (state) {
      const close = segment.indexOf(CITE_CLOSE, i);
      if (close === -1) return state;
      state = false;
      i = close + CITE_CLOSE.length;
    } else {
      const openAt = segment.indexOf(CITE_OPEN, i);
      if (openAt === -1) return state;
      state = true;
      i = openAt + CITE_OPEN.length;
    }
  }
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
  ].join("\n");
  const r = scan(fixture);
  assert.deepEqual(
    r.found.map((h) => h.script),
    ["a.sh", "b.js", "c.sh"],
    "prose, `Engine source:` and prose `from` are reported; fence, command line and cite are not",
  );
  assert.equal(
    r.fenced,
    1,
    "the fenced literal is counted by the fence branch",
  );
});

test("§1 control: a cite wrapper spanning lines covers what it wraps", () => {
  const r = scan(
    "Before <!-- cite:\nshared/resources/g.js\n--> after `shared/resources/h.js`.",
  );
  assert.deepEqual(
    r.found.map((h) => h.script),
    ["h.js"],
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
