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
 * 21 copies (17 at first, 4 more in QA cycle 3). This test is what keeps a new one from landing unjustified.
 *
 * Three parts:
 *   §1 CONTROL — the scanner on inline fixtures: plain prose, an
 *      `Engine source:` line, prose "source"/"import … from", a cite wrapper and
 *      a nested path must be reported; a fenced line, a command that opens a
 *      code span or `$(`, and a non-script must not. A scanner
 *      that over- or under-fires is caught here before it judges the real tree.
 *
 * A cite wrapper is no exemption here. The bundler cites only a `.md` target
 * (quick_validate.py `ref_kind`, CITABLE_SUFFIXES): `<!-- cite: …x.js -->` is a
 * dependency and copies x.js like a bare literal does (task.193 QA cycle 1, CR-1).
 *
 * Scope: `shared/resources/*.md`, the task's population. A literal in a shared
 * `.sh` comment propagates the same way and is not read here (QA cycle 1, CR-3).
 *   §2 LIVE TREE — every reported literal is in ALLOWED (each entry carries the
 *      skills that bundle its doc, checked against the tree, and the reason each
 *      needs the copy), every ALLOWED entry still matches a line, and the incident line restored into the resume contract is
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

/**
 * SHARED_REF_RE in bundle_skill.py, verbatim: what the bundler captures is what
 * it copies, nested paths included (`shared/resources/tests/x.test.mjs`). A
 * narrower class missed those (QA cycle 2, CR-1). The capture is then trimmed
 * as quick_validate.py's split_fragment does and kept only for a script.
 */
const SHARED_REF = /(?<![\w-]\/)(?:\.\.\/)*shared\/resources\/([^\s`'")\]*]+)/g;
const SCRIPT_EXT = /\.(?:sh|js|mjs)$/;

/** The script a SHARED_REF match names, or null (split_fragment, then the extension). */
function scriptOf(raw) {
  const name = raw
    .replace(/[.,;:]+$/, "")
    .split("#")[0]
    .replace(/[.,;:]+$/, "");
  return SCRIPT_EXT.test(name) ? name : null;
}

/** Every script literal on one line, with where it starts. */
function scriptLiterals(line) {
  const out = [];
  for (const m of line.matchAll(SHARED_REF)) {
    const script = scriptOf(m[1]);
    if (script) out.push({ index: m.index, script });
  }
  return out;
}

/**
 * A literal is RUN when a command sits immediately before it: inside `require(`
 * or `import(`, after `$(`, or at the start of a code span the literal sits in
 * (`bash …`, `command node --test …`, `import … from …`), optionally behind one
 * quote and a `./`. A backtick opens a span only when an even number precede it
 * on the line. Anything else is prose: "Engine source:", English "from",
 * "sourceable" (task.193 review 1, I1), "the single source `…`" (QA cycle 1,
 * CR-2), and "(source `…`)", a line that wraps to "source `…`" or a closing
 * backtick read as an opening one (QA cycle 2, CR-2).
 */
const CALL_BEFORE = /(?:require|import)\(\s*["'`]?(?:\.\/)?$/;
const COMMAND = String.raw`(?:command\s+)?(?:bash|sh|source|node)\s+(?:-\S+\s+)*["']?(?:\.\/)?`;
const SUBSHELL_BEFORE = new RegExp(String.raw`\$\(\s*` + COMMAND + "$");
const SPAN_COMMAND = new RegExp("^\\s*" + COMMAND + "$");
const SPAN_IMPORT = /^\s*import\b.*\bfrom\s+["']?(?:\.\/)?$/;

/**
 * Inside a fence the line is code, so a command also runs at the start of the
 * line or after shell punctuation (`;`, `&&`, `|`, `(`, `!`) or a keyword, and
 * `.` sources. A fenced line is not exempt for being fenced: the bundler copies
 * from fences too, and a fence that only quotes a path (probe-boundary-rule.md)
 * or a fenced prompt that says "Source `…`" in prose copied scripts into skills
 * that never run them (QA cycle 3, CR-1).
 */
const SHELL_BEFORE = new RegExp(
  String.raw`(?:^|[;&|(!]|\b(?:if|then|do|else|elif|while|until|exec|time))\s*(?:command\s+(?:-\S+\s+)?)?(?:(?:bash|sh|source|node)\s+(?:-\S+\s+)*|\.\s+)["']?(?:\.\/)?$`,
);
const CODE_IMPORT = /^\s*import\b.*\bfrom\s+["']?(?:\.\/)?$/;

function isRunInFence(prefix) {
  return isRun(prefix) || SHELL_BEFORE.test(prefix) || CODE_IMPORT.test(prefix);
}

function isRun(prefix) {
  if (CALL_BEFORE.test(prefix) || SUBSHELL_BEFORE.test(prefix)) return true;
  const tick = prefix.lastIndexOf("`");
  if (tick === -1) return false;
  const opens = (prefix.slice(0, tick).match(/`/g) || []).length % 2 === 0;
  const span = prefix.slice(tick + 1);
  return opens && (SPAN_COMMAND.test(span) || SPAN_IMPORT.test(span));
}

/**
 * Each "<doc>:<script>" whose prose literal stays, with the skills that bundle
 * <doc> and the reason every one of them needs <script> bundled. A witness is a
 * line that runs THAT skill's own copy (task.193 Phase 1; the classification is
 * in the task's implementation report). `bundlers` is checked against the tree:
 * a skill that starts bundling <doc> gets the copy too, so it fails here until
 * someone confirms it runs the script (QA cycle 2, CR-4). `"*"` is for
 * platform-detection.md only — the resolver spec every platform-aware skill
 * bundles because it sources the resolver it describes.
 */
const ALLOWED = {
  "develop-pipeline-autonomous-defaults.md:resolve-platform.sh": {
    bundlers: [
      "develop-bug",
      "develop-story",
      "develop-task",
      "qa-fix",
      "qa-story",
      "qa-task",
      "review-pr",
      "review-story",
      "review-task",
    ],
    reason:
      "all nine bundlers (develop-*, qa-fix, qa-*, review-pr/story/task) source their own resolve-platform.sh; e.g. develop-pipeline-hooks.md's `source references/resolve-platform.sh`",
  },
  "develop-pipeline-step-2-review.md:review-report-freshness.js": {
    bundlers: ["develop-story", "develop-task"],
    reason:
      "develop-story and develop-task require their own copy in the Step 2 freshness gate",
  },
  "develop-pipeline-step-2-review.md:tracker-comment.js": {
    bundlers: ["develop-story", "develop-task"],
    reason:
      "develop-story and develop-task post every pipeline comment through it",
  },
  "develop-pipeline-step-3-develop-loop.md:tracker-comment.js": {
    bundlers: ["develop-bug", "develop-story", "develop-task"],
    reason:
      "develop-bug, develop-story and develop-task post every pipeline comment through it",
  },
  "develop-pipeline-step-4-create-pr.md:gh-stage.js": {
    bundlers: ["develop-bug", "develop-story", "develop-task"],
    reason:
      "develop-bug, develop-story and develop-task move the board at Step 4 through it",
  },
  "develop-pipeline-step-4-create-pr.md:tracker-comment.js": {
    bundlers: ["develop-bug", "develop-story", "develop-task"],
    reason:
      "develop-bug, develop-story and develop-task post the PR-opened comment through it",
  },
  "develop-pipeline-step-5-6-qa-loop.md:gh-stage.js": {
    bundlers: ["develop-story", "develop-task"],
    reason:
      "develop-story and develop-task (its only bundlers) move the board through it",
  },
  "develop-pipeline-step-5-6-qa-loop.md:grant-qa-cycles.sh": {
    bundlers: ["develop-story", "develop-task"],
    reason:
      "develop-story and develop-task (its only bundlers) run it from SKILL.md on a QA-loop re-entry",
  },
  "develop-pipeline-step-5-6-qa-loop.md:qa-diminishing-returns.js": {
    bundlers: ["develop-story", "develop-task"],
    reason:
      "develop-story and develop-task (its only bundlers) run it in the QA loop",
  },
  "develop-pipeline-step-5-6-qa-loop.md:set-qa-phase.sh": {
    bundlers: ["develop-story", "develop-task"],
    reason:
      "develop-story and develop-task (its only bundlers) run it at each QA sub-step",
  },
  "develop-pipeline-step-7-finalise.md:stakeholder-summary-cli.js": {
    bundlers: [
      "develop-bug",
      "develop-story",
      "develop-task",
      "qa-story",
      "qa-task",
      "review-pr",
    ],
    reason:
      "all six bundlers render leads through it (the PreCompact hook and the Step 7 comments)",
  },
  "develop-pipeline-step-7-finalise.md:tracker-issue.js": {
    bundlers: [
      "develop-bug",
      "develop-story",
      "develop-task",
      "qa-story",
      "qa-task",
      "review-pr",
    ],
    reason:
      "all six bundlers close or reopen the tracker issue through it (tracker-issue-cli.md)",
  },
  "develop-pipeline-step-8-commit.md:report-lint.js": {
    bundlers: ["develop-bug", "develop-story", "develop-task"],
    reason:
      "develop-bug, develop-story and develop-task lint the report at every step transition",
  },
  "finalise-dod-security-prompt.md:security-input-corpus.mjs": {
    bundlers: ["finalise", "qa-story", "qa-task"],
    reason:
      "finalise, qa-story and qa-task load it through their own security-probe.mjs",
  },
  "finalise-dod-security-prompt.md:security-probe.mjs": {
    bundlers: ["finalise", "qa-story", "qa-task"],
    reason:
      'finalise\'s security-probe-plan.mjs runs the engine beside itself (path.join(HERE, "security-probe.mjs")); qa-story and qa-task run it from SKILL.md',
  },
  "jira-transition-protocol.md:jira-stage.js": {
    bundlers: [
      "develop-bug",
      "develop-story",
      "develop-task",
      "finalise",
      "qa-story",
      "qa-task",
      "review-pr",
    ],
    reason: "all seven bundlers move Jira cards through it",
  },
  "platform-detection.md:resolve-platform.sh": {
    bundlers: "*",
    reason:
      "every bundler sources its own resolve-platform.sh before branching on platform",
  },
  "platform-detection.md:bitbucket-auth.sh": {
    bundlers: "*",
    reason:
      "every bundler's copy of platform-detection.md sources its own bitbucket-auth.sh on the Bitbucket arm",
  },
  "qa-runnable-prose-detection.md:qa-execute-snippets.mjs": {
    bundlers: [
      "develop-story",
      "develop-task",
      "double-check",
      "qa-story",
      "qa-task",
    ],
    reason: "all five bundlers run it to execute fenced snippets",
  },
  "security-input-corpus.md:security-input-corpus.mjs": {
    bundlers: ["finalise", "qa-story", "qa-task", "review-security"],
    reason: "all four bundlers load it through their own security-probe.mjs",
  },
  "security-review-prompt.md:security-input-corpus.mjs": {
    bundlers: ["review-security"],
    reason:
      "review-security (its only bundler) loads it through security-probe.mjs",
  },
  "security-review-prompt.md:security-probe.mjs": {
    bundlers: ["review-security"],
    reason:
      "review-security (its only bundler) runs it from the bundled prompt",
  },
  "tracker-state-poller-subagent.md:resolve-platform.sh": {
    bundlers: [
      "develop-bug",
      "develop-story",
      "develop-task",
      "qa-story",
      "qa-task",
      "review-pr",
    ],
    reason: "all six bundlers source their own resolve-platform.sh",
  },
};

/** Non-vacuity floors: shared/resources held 59 .md files at authoring time. */
const MIN_DOCS = 40;
const MIN_FENCED = 1;

/**
 * The script literals in one document's text that no command runs, plus how
 * many fenced literals were read (the floor that proves the fence branch is alive).
 */
function scan(text) {
  const found = [];
  let fenced = 0;
  let open = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const step = fenceStep(open, line);
    const isFenced = open !== null || step.isFence;
    open = step.open;
    const run = isFenced ? isRunInFence : isRun;
    for (const { index, script } of scriptLiterals(line)) {
      if (isFenced) fenced++;
      if (run(line.slice(0, index))) continue;
      found.push({ line: i + 1, script, text: line.trim(), fenced: isFenced });
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
    "The test is `shared/resources/tests/l.test.mjs`, and it pins the rule.",
    "Only the resolver (source `shared/resources/m.sh`) knows the keys.",
    "source `shared/resources/n.js` is the one place it is defined.",
    "The `o` helpers import nothing from `shared/resources/p.js` directly.",
    "Run it as `$(bash shared/resources/q.sh)` to read the value.",
    "Config lives in `shared/resources/r.json` and `shared/resources/s.md#x`.",
    "Inside `setup` source shared/resources/t.sh is read first.",
  ].join("\n");
  const r = scan(fixture);
  assert.deepEqual(
    r.found.map((h) => h.script),
    [
      "a.sh",
      "b.js",
      "c.sh",
      "f.mjs",
      "g.js",
      "h.js",
      "tests/l.test.mjs",
      "m.sh",
      "n.js",
      "p.js",
      "t.sh",
    ],
    "prose, `Engine source:`, prose from/source, a cite wrapper, a nested path, a " +
      "parenthetical or line-initial `source` and a closing backtick are reported; " +
      "fence, command lines, `$(…)`, code-span require/import and non-scripts are not",
  );
  assert.equal(
    r.fenced,
    1,
    "the fenced literal is counted by the fence branch",
  );
});

test("§1 control: a fenced literal is reported unless a command runs it", () => {
  const r = scan(
    [
      "```",
      "shared/resources/tests/u.test.mjs",
      '  → "the test that pins it"',
      "```",
      "```text",
      "  - Source `shared/resources/v.sh` to set the roots.",
      "```",
      "```bash",
      "if ! source shared/resources/w.sh; then exit 1; fi",
      "x=$(command node shared/resources/x.js --json) && . shared/resources/y.sh",
      "  bash -e shared/resources/z.sh",
      "```",
      "```js",
      'import { a } from "./shared/resources/aa.mjs";',
      'const b = require("../shared/resources/bb.js");',
      "```",
    ].join("\n"),
  );
  assert.deepEqual(
    r.found.map((h) => h.script),
    ["tests/u.test.mjs", "v.sh"],
    "a quoted path and fenced prompt prose are reported; shell and JS commands are not",
  );
  assert.equal(r.fenced, 8, "every fenced literal is read, run or not");
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
  const unlisted = hits.filter(
    (h) => !Object.hasOwn(ALLOWED, `${h.doc}:${h.script}`),
  );
  assert.deepEqual(
    unlisted.map((h) => `shared/resources/${h.doc}:${h.line} → ${h.script}`),
    [],
    "A `shared/resources/<script>` literal no command runs copies the script into every skill that " +
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
  for (const [k, { reason }] of Object.entries(ALLOWED)) {
    assert.ok(reason.trim().length > 20, `ALLOWED["${k}"] needs a reason`);
  }
});

test("§2 live tree: each ALLOWED entry names exactly the skills that bundle its doc", () => {
  // The reason is a claim about every bundler. A skill that starts bundling the
  // doc receives the script as well, so it must be confirmed here (CR-4).
  const skills = fs.readdirSync(path.join(REPO_ROOT, "skills")).sort();
  const drift = [];
  for (const [k, { bundlers }] of Object.entries(ALLOWED)) {
    if (bundlers === "*") {
      assert.equal(
        k.split(":")[0],
        "platform-detection.md",
        `ALLOWED["${k}"]: "*" is for platform-detection.md only`,
      );
      continue;
    }
    const doc = k.split(":")[0];
    // A skill that only cites the doc holds it without the script (the bundler
    // follows nothing from a cite), so it is not a bundler here (QA cycle 3, CR-2).
    const script = k.slice(doc.length + 1);
    const holds = (s, f) =>
      fs.existsSync(path.join(REPO_ROOT, "skills", s, "references", f));
    const live = skills.filter((s) => holds(s, doc) && holds(s, script));
    if (JSON.stringify(live) !== JSON.stringify([...bundlers].sort())) {
      drift.push(
        `${k}: listed ${bundlers.join(", ")}; bundled by ${live.join(", ")}`,
      );
    }
  }
  assert.deepEqual(
    drift,
    [],
    "The skills bundling a doc changed. Confirm each new one runs its own copy of the " +
      "script (or switch the literal to a bare filename), then update `bundlers`.",
  );
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
    (h) => !Object.hasOwn(ALLOWED, `${doc}:${h.script}`),
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

module.exports = { scan, isRun, isRunInFence };
