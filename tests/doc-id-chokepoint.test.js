"use strict";
/**
 * Chokepoint guard — a PRD, epic or story identifier is parsed or built in ONE
 * place: `shared/resources/doc-id.js`.
 *
 * task.207. Before tasks 202–206 about ten files each carried a private id regex
 * (`/story\.(\d+)\.(\d+)/` and friends), so moving to hierarchical numbering
 * meant finding and rewriting every one of them — and a regex that read the
 * second field as the epic silently read the PRD instead. Task 206 routed every
 * reader through `doc-id.js`. Nothing stopped the next contributor writing the
 * regex again; this test does. The same shape as `mutation-call-site-coverage`
 * (task 105): a convention documented and not enforced drifts.
 *
 * (a) KEYS. A shared token would be red at the wrong site (obs #135): a bare
 *     `story\.` hits the bug-artifact grammar and the artifact-kind lookup, and a
 *     bare `awk -F.` hits the TASK-id split, a different rule. So every shape is
 *     a compound:
 *       - id-regex   — a kind word (story|epic|prd), an ESCAPED dot, and a digit
 *                      class within four characters (`\d`, `[0-9]`, `[1-9]`,
 *                      `[\d.]`). The escape is what separates a pattern from a
 *                      fixture name: `'story.1.1.example'` has none.
 *       - id-built   — `new RegExp(` on a line with an escaped kind word.
 *       - title      — `(Epic|Story)\s` followed by a digit class: the
 *                      `[Epic N]` / `Story N.N:` summary parsers.
 *       - field-split — `awk -F.` / `cut -d.` on a line that names a shell
 *                      variable containing STORY, EPIC or PRD.
 *       - first-number — `grep -oE '[0-9]+' | head -1` on such a variable.
 *     Comments are stripped before matching: a comment quoting an old regex is
 *     history, not a parser (three such comments exist today).
 * (b) RESTATEMENTS THIS TEST MISSES, accepted and named: an untyped
 *     `stem.split(".")[1]`, a `startsWith("story.")` followed by `parseInt`, and a
 *     regex assembled from fragments whose kind word sits in another variable.
 *     The corpus test (`evals/shared/tests/doc-numbering-corpus.test.mjs`) is the
 *     backstop: it fails on the documents a bad parser writes.
 * (c) POPULATION is derived, never listed: tracked code
 *     (`*.js *.mjs *.cjs *.py *.sh`, minus the bundle output under
 *     `skills/*\/references/`) and the bash fences of `skills/*\/SKILL.md` and
 *     `shared/resources/*.md`. A new file is in scope the moment it is tracked;
 *     the floors below keep the derivation honest.
 *
 * Run: node --test tests/doc-id-chokepoint.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { FENCE_OPEN, fenceStep } = require("./lib/markdown-section");
const { stripComments } = require("./lib/strip-js-comments");

const ROOT = path.join(__dirname, "..");
const DOC_ID = "shared/resources/doc-id.js";

// ── Shapes ────────────────────────────────────────────────────────────────

const KIND = String.raw`(?:story|epic|prd)`;
const ESC_DOT = String.raw`\\{1,4}\.`; // `\.` in a regex literal, `\\.` in a string
const DIGIT = String.raw`(?:\\{1,2}d|\[0-9|\[1-9|\[\\{1,2}d)`;
const SHELL_VAR = String.raw`\$\{?[A-Z_]*(?:STORY|EPIC|PRD)[A-Z_]*`;

const CODE_SHAPES = [
  ["id-regex", new RegExp(`${KIND}${ESC_DOT}[^\\n]{0,4}?${DIGIT}`)],
  ["id-built", new RegExp(`new RegExp\\(.*${KIND}${ESC_DOT}`)],
  [
    "title",
    // An escaped \s in a regex, or a literal space / [[:space:]] in a sed or grep pattern: a
    // parser written either way is the same parser (task.207 QA cycle 1, CR-4).
    new RegExp(
      String.raw`(?:Epic|Story)(?:\\{1,2}s|\[\[:space:\]\]| )[+*]?[^\n]{0,4}?` +
        DIGIT,
    ),
  ],
];
const SHELL_SHAPES = [
  ["field-split", /(?:awk\s+-F\s*['"]?\\?\.|cut\s+-d\s*['"]?\\?\.)/],
  ["first-number", /grep\s+-oE?\s+['"]\[0-9\]\+['"]\s*\|\s*head\s+-(?:n\s*)?1/],
];

/**
 * A field split or first-number match counts only on a line that READS or ASSIGNS
 * a STORY/EPIC/PRD variable: `EPIC_NUM=$(echo "$(basename "$F")" | awk -F. …)`
 * reads no such variable, and the assignment is what names the id it parses.
 */
const SHELL_SUBJECT = new RegExp(
  `${SHELL_VAR}|\\b[A-Z_]*(?:STORY|EPIC|PRD)[A-Z_]*=`,
);

/**
 * Strip a shell or Python comment from one line. JavaScript is not stripped here: a
 * line-based stripper cannot tell a `/*` inside a regex literal from a comment, and
 * opened a phantom block comment that hid hundreds of lines (task.207 QA cycles 1–2,
 * CR-2). JS source goes through the tokenizer in tests/lib/strip-js-comments.js instead.
 */
function stripCodeComment(line) {
  // shell / python
  if (/^\s*#/.test(line)) return "";
  return line.replace(/\s#\s.*$/, "");
}

function matchCodeLine(line) {
  return CODE_SHAPES.filter(([, re]) => re.test(line)).map(([n]) => n);
}

function matchShellLine(line) {
  const hits = matchCodeLine(line);
  if (SHELL_SUBJECT.test(line)) {
    for (const [n, re] of SHELL_SHAPES) if (re.test(line)) hits.push(n);
  }
  return hits;
}

const langOf = (f) =>
  /\.(?:js|mjs|cjs)$/.test(f) ? "js" : /\.sh$/.test(f) ? "sh" : "py";

/** Hits in one code file: `[{ line, shapes, text }]`. */
function scanCode(rel, text) {
  const lang = langOf(rel);
  const out = [];
  // JS: one tokenizer pass over the whole file (line breaks kept, so numbering holds).
  const lines = lang === "js" ? stripComments(text).split("\n") : null;
  text.split("\n").forEach((raw, i) => {
    const line = lang === "js" ? (lines[i] ?? "") : stripCodeComment(raw);
    if (!line.trim()) return;
    const shapes = lang === "sh" ? matchShellLine(line) : matchCodeLine(line);
    if (shapes.length) out.push({ line: i + 1, shapes, text: raw.trim() });
  });
  return out;
}

const SHELL_INFO = /^(?:bash|sh|shell|zsh)\b/;

/** Hits in the bash fences of one Markdown file, and the number of such fences. */
function scanMarkdown(text) {
  const out = [];
  let open = null;
  let shell = false;
  let fences = 0;
  text.split("\n").forEach((raw, i) => {
    const step = fenceStep(open, raw);
    if (step.isFence) {
      if (open === null) {
        const m = raw.match(FENCE_OPEN);
        shell = SHELL_INFO.test(raw.slice(m[0].length).trim());
        if (shell) fences++;
      }
      open = step.open;
      return;
    }
    if (open === null || !shell) return;
    const line = stripCodeComment(raw);
    if (!line.trim()) return;
    const shapes = matchShellLine(line);
    if (shapes.length) out.push({ line: i + 1, shapes, text: raw.trim() });
  });
  return { hits: out, fences };
}

// ── Population ──────────────────────────────────────────────────────────────

function gitFiles(...specs) {
  return execFileSync("git", ["ls-files", "--", ...specs], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

// doc-id.js is the definition (§0 runs the shapes over it as the positive control),
// and this file's MUST_HIT table is strings that must match — both excluded by path,
// not by git state, so an untracked copy of this test reads the same as a tracked one.
const SELF = "tests/doc-id-chokepoint.test.js";
const CODE = gitFiles(
  "*.js",
  "*.mjs",
  "*.cjs",
  "*.py",
  "*.sh",
  ":!skills/*/references/*",
).filter((f) => f !== DOC_ID && f !== SELF);
const MARKDOWN = gitFiles("skills/*/SKILL.md", "shared/resources/*.md").filter(
  (f) => !f.includes("/references/"),
);

function scanAll() {
  const hits = new Map();
  let fences = 0;
  for (const f of CODE) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    const h = scanCode(f, text);
    if (h.length) hits.set(f, h);
  }
  for (const f of MARKDOWN) {
    const r = scanMarkdown(fs.readFileSync(path.join(ROOT, f), "utf8"));
    fences += r.fences;
    if (r.hits.length) hits.set(f, r.hits);
  }
  return { hits, fences };
}

// ── Allowlist ───────────────────────────────────────────────────────────────
//
// file → { shapes it may match, why }. An entry excuses only the shapes it names,
// so a new id regex in an allowlisted file is still a §1 failure. Each reason must
// be one a reviewer can check against the file. An entry whose file no longer
// matches one of its shapes FAILS (§2): the list only shrinks.
const ALLOW = new Map([
  [
    "skills/develop-next/scripts/select-next.mjs",
    {
      shapes: ["title"],
      why: "roadmap prose grammar — `Epic P.E` in a row's text; the token it extracts is handed to doc-id.parse",
    },
  ],
  [
    "skills/sync-jira-story/scripts/sync-jira-story.js",
    {
      shapes: ["title"],
      why: "published tracker-summary grammar — `[Story N.N]` / `Story N.N:` titles at any depth, which task.203 leaves as written; not a document id",
    },
  ],
]);

const excused = (f, shape) => (ALLOW.get(f)?.shapes || []).includes(shape);

const SCAN = scanAll();

// ── §0 Non-vacuity ─────────────────────────────────────────────────────────

test("§0 the scan reads a plausible population", () => {
  // 470 tracked code files on 2026-10-16 (`git ls-files -- '*.js' '*.mjs' '*.cjs'
  // '*.py' '*.sh' ':!skills/*/references/*' | wc -l`). A glob that emptied would
  // otherwise pass over nothing.
  assert.ok(CODE.length >= 400, `code population is only ${CODE.length} files`);
  assert.ok(
    MARKDOWN.length >= 100,
    `Markdown population is only ${MARKDOWN.length} files`,
  );
  assert.ok(SCAN.fences >= 100, `only ${SCAN.fences} bash fences read`);
  assert.ok(
    !CODE.some((f) => /^skills\/[^/]+\/references\//.test(f)),
    "bundle output under skills/*/references/ must stay out of the scan",
  );
});

test("§0 positive control: the shapes match doc-id.js itself", () => {
  // doc-id.js is the definition, so it is excluded from the population — and so
  // it is the one file guaranteed to hold the grammar. A shape with a typo would
  // match nothing anywhere and the guard would pass vacuously.
  const hits = scanCode(
    DOC_ID,
    fs.readFileSync(path.join(ROOT, DOC_ID), "utf8"),
  );
  assert.ok(hits.length >= 1, "no shape matched doc-id.js — a shape is broken");
});

// ── §1 The rule ─────────────────────────────────────────────────────────────

test("§1 no id is parsed or built outside doc-id.js", () => {
  const bad = [];
  for (const [f, hits] of SCAN.hits) {
    for (const h of hits) {
      const open = h.shapes.filter((sh) => !excused(f, sh));
      if (open.length) bad.push(`${f}:${h.line} [${open.join(",")}] ${h.text}`);
    }
  }
  assert.deepEqual(
    bad,
    [],
    "id parsed outside doc-id.js — import the parser from shared/resources/doc-id.js " +
      "(in a skill, its bundled references/doc-id.js), or allowlist the file with a reason:\n" +
      bad.join("\n"),
  );
});

// ── §2 The allowlist is honest ──────────────────────────────────────────────

test("§2 every allowlisted file exists, still matches a shape, and states a reason", () => {
  for (const [f, { shapes, why }] of ALLOW) {
    assert.ok(
      fs.existsSync(path.join(ROOT, f)),
      `${f} is allowlisted but does not exist`,
    );
    assert.ok(
      why.length >= 20,
      `${f}: the reason "${why}" is too short to check`,
    );
    for (const shape of shapes) {
      assert.ok(
        (SCAN.hits.get(f) || []).some((h) => h.shapes.includes(shape)),
        `${f} no longer matches the ${shape} shape — drop it from ALLOW (${why})`,
      );
    }
  }
});

// ── §3 Fixture control table ────────────────────────────────────────────────
//
// Every row varies the kind word, the variable name or the context (code, shell
// fence, prose) — not just the file — so the table proves the KEY, not one site.

const MUST_HIT = [
  ["code", "const R = /story\\.(\\d+)\\.(\\d+)/;"],
  ["code", "new RegExp(`^epic\\\\.${n}\\\\.`)"],
  ["code", "s.match(/^\\s*\\[Epic\\s+(\\d+)\\]/)"],
  ["code", "const P = prd.match(/^prd\\.(\\d+)\\./)?.[1];"],
  ["shell", "EPIC_NUM=$(echo \"$STORY_BASENAME\" | awk -F. '{print $2}')"],
  ["shell", 'EPIC_NUM=$(echo "$EPIC_BASENAME" | cut -d. -f2)'],
  ["shell", "STORY_NUM=$(echo \"$STORY_STEM\" | grep -oE '[0-9]+' | head -1)"],
  [
    "shell",
    'EPIC_NUM=$(echo "$(basename "$DOC_FILE" .md)" | awk -F. \'{print $2}\')',
  ],
  [
    "shell",
    "EPIC_SLUG=$(echo \"$EPIC_BASENAME\" | sed 's/epic\\.[0-9]*\\.//')",
  ],
  // A title parser written with a literal space, as a sed or grep pattern is (CR-4).
  ["shell", 'BARE=$(echo "$TITLE" | sed -E "s/^Story [0-9]+\\.[0-9]+:? *//")'],
  ["code", "const m = t.match(/^Epic [0-9]+:/);"],
  // An id regex on the line after a regex LITERAL that contains `/*` — a line-based
  // stripper read that as a block comment and hid every line to the next `*/` (CR-2).
  ["code", "const P = /^[a-z._\\/*-]*$/;\nconst R = /story\\.(\\d+)/;"],
  // An id regex on the line after a `//` comment that quotes a glob — the comment
  // must not open a block comment that hides it (CR-2).
  ["code", "// Top-level shared/resources/*.md\nconst R = /story\\.(\\d+)/;"],
];
const MUST_MISS = [
  ["shell", "TASK_ID=$(echo \"$TASK_BASENAME\" | awk -F. '{print $2}')"], // a task id — another rule
  ["code", "const fixture = 'story.1.1.example';"], // a fixture name, not a parser
  ["code", "const R = /task\\.(\\d+)/;"], // the task grammar
  ["code", "// the old `story\\.\\d+\\.\\d+` stem admitted it"], // a comment
  ["code", "  /* `epic\\.(\\d+)` was the flat rule */"], // a block comment
  ["shell", "# EPIC_NUM=$(echo \"$EPIC_BASENAME\" | awk -F. '{print $2}')"], // a shell comment
  [
    "prose",
    "A story id is `story.{P}.{E}.{S}`; `story\\.(\\d+)` was the old regex.",
  ], // prose, not a fence
];

function matchFixture(ctx, line) {
  if (ctx === "code") return scanCode("x.js", line).flatMap((h) => h.shapes);
  if (ctx === "shell")
    return scanMarkdown("```bash\n" + line + "\n```\n").hits.flatMap(
      (h) => h.shapes,
    );
  return scanMarkdown(line + "\n").hits.flatMap((h) => h.shapes);
}

test("§3 every MUST_HIT fixture matches a shape", () => {
  for (const [ctx, line] of MUST_HIT) {
    assert.ok(
      matchFixture(ctx, line).length > 0,
      `expected a hit (${ctx}): ${line}`,
    );
  }
});

test("§3 no MUST_MISS fixture matches a shape", () => {
  for (const [ctx, line] of MUST_MISS) {
    assert.deepEqual(
      matchFixture(ctx, line),
      [],
      `expected no hit (${ctx}): ${line}`,
    );
  }
});

test("§3 the task-id split in review-pipeline-step-0a-branch-setup.md stays green", () => {
  const f = "shared/resources/review-pipeline-step-0a-branch-setup.md";
  const text = fs.readFileSync(path.join(ROOT, f), "utf8");
  assert.match(
    text,
    /TASK_ID=\$\(echo "\$TASK_BASENAME" \| awk -F\. '\{print \$2\}'\)/,
    "control line moved",
  );
  assert.ok(
    !SCAN.hits.has(f),
    `${f} matched: ${JSON.stringify(SCAN.hits.get(f))}`,
  );
});

// ── §4 The review-epic block, executed (obs #258) ──────────────────────────
//
// The block used to read the epic number with `awk -F. '{print $2}'`, which on
// `epic.1.42.payments` reads the PRD number, and its auto-skip pattern then
// matched every PRD-1 epic branch. §1 proves the awk is gone; this proves the
// block that replaced it derives the right values.

/** The n-th (0-based) review-epic bash block: 0 is 0a.2 (ids), 1 is 0a.3 (auto-skip). */
function reviewEpicBlock(n) {
  const text = fs.readFileSync(
    path.join(ROOT, "shared/resources/review-pipeline-step-0a-branch-setup.md"),
    "utf8",
  );
  const blocks = [
    ...text.matchAll(
      /#### review-epic\s*\n(?:(?!#### |```)[^\n]*\n)*```bash\n([\s\S]*?)\n```/g,
    ),
  ];
  assert.ok(
    blocks.length >= 2,
    `expected the 0a.2 and 0a.3 review-epic blocks, found ${blocks.length}`,
  );
  return blocks[n][1];
}

/**
 * Run ONE review-epic block as its own shell — the way an agent runs a fenced block —
 * with only `DOC_FILE` bound, in a fresh git checkout on `branch`. Joining the blocks
 * into one script hid a 0a.3 that read 0a.2's variables (task.207 QA cycle 1, CR-1).
 */
function runReviewEpicBlock(n, docFile, branch) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-epic-block-"));
  try {
    const skillRefs = path.join(
      dir,
      ".agents",
      "skills",
      "review-epic",
      "references",
    );
    fs.mkdirSync(skillRefs, { recursive: true });
    fs.copyFileSync(path.join(ROOT, DOC_ID), path.join(skillRefs, "doc-id.js"));
    const git = (...a) =>
      spawnSync("git", a, { cwd: dir, encoding: "utf8" }).status;
    assert.equal(git("init", "-q", "-b", branch), 0, "git init failed");
    const script =
      `set -e\nDOC_FILE=${JSON.stringify(docFile)}\n` +
      reviewEpicBlock(n) +
      `\necho "PRD_NUM=$PRD_NUM"\necho "EPIC_NUM=$EPIC_NUM"\necho "EPIC_SLUG=\${EPIC_SLUG:-}"\n` +
      `echo "EPIC_BRANCH=\${EPIC_BRANCH:-}"\necho "AUTO_SKIPPED=\${AUTO_SKIPPED:-false}"\n`;
    const r = spawnSync("bash", ["-c", script], { cwd: dir, encoding: "utf8" });
    return { status: r.status, out: r.stdout, err: r.stderr };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const EPIC_DOC =
  "docs/prd/x/prd.1.x/epics/epic.1.42.payments/epic.1.42.payments.md";

test("§4 the review-epic 0a.2 block reads P and E through doc-id.js", () => {
  const r = runReviewEpicBlock(0, EPIC_DOC, "develop");
  assert.equal(r.status, 0, r.err);
  assert.match(r.out, /^PRD_NUM=1$/m);
  assert.match(r.out, /^EPIC_NUM=42$/m);
  assert.match(r.out, /^EPIC_SLUG=payments$/m);
  assert.match(r.out, /^EPIC_BRANCH=feature\/epic\.1\.42\.payments$/m);
});

test("§4 the review-epic 0a.3 block, run alone, skips on its own epic's branch only", () => {
  const own = runReviewEpicBlock(1, EPIC_DOC, "feature/epic.1.42.payments");
  assert.equal(own.status, 0, own.err);
  assert.match(
    own.out,
    /^AUTO_SKIPPED=true$/m,
    "the epic's own branch must auto-skip",
  );
  for (const other of [
    "feature/epic.1.7.other",
    "feature/epic.2.42.payments",
  ]) {
    const r = runReviewEpicBlock(1, EPIC_DOC, other);
    assert.equal(r.status, 0, r.err);
    assert.match(
      r.out,
      /^AUTO_SKIPPED=false$/m,
      `${other} is another epic and must not auto-skip`,
    );
  }
});

test("§4 the review-epic blocks refuse a name doc-id cannot read", () => {
  for (const n of [0, 1]) {
    const r = runReviewEpicBlock(
      n,
      "docs/prd/x/epic.42.payments.md",
      "develop",
    );
    assert.notEqual(
      r.status,
      0,
      `block ${n}: a flat epic name must HALT, got:\n${r.out}`,
    );
  }
});

// ── §5 No prose teaches the flat scheme (task.207 QA cycle 1, CR-3) ─────────
//
// The sweep's population was one grep over the placeholder spellings its author
// remembered. QA found the ones it missed — `epic.[N]`, `epic.{epic-number}`,
// `story.[epic].[story]`, `story.[N].[M]` — in READMEs, templates and hand-authored
// references the grep never searched; one of them was an executable glob that
// numbered every epic review `review.1`. This is that population as a test.
//
// (a) KEY, two shapes. A filename head — `story.`, `epic.`, `epic/` — whose FIRST
//     placeholder does not name the PRD (an allow-list, below). And a title head —
//     `EPIC-`, `Epic `, `[Epic `, `Story `, `[Story ` — whose first placeholder is a
//     single-level number (`N`, `N+1`, `E`, `epic`, `epicNum`, `epic_number`); a title
//     head also takes non-id placeholders (`Story [prev]`, `epic <path>`), so it cannot
//     demand a PRD name the way a filename head can (QA cycle 3, CR-2).
// (b) MISSES, accepted and named: a literal flat id (`story.4.2.x`) — those are
//     negative examples as often as mistakes, and the corpus test catches a flat
//     DOCUMENT; a filename head that names the PRD but drops a level
//     (`story.{P}.{S}`, QA cycle 3 CR3-4); and a title head with a novel number name.
// (c) POPULATION: every tracked Markdown file under skills/ (generated references
//     dropped by their AUTO-GENERATED marker), shared/resources/, docs/ and the
//     root, minus the historical records below.

// An ALLOW-list, not a list of retired spellings (task.207 QA cycle 2, CR-1): a deny-list
// of `story.{epic}`-style spellings missed `story.<N>.<M>`, `epic.<N>`, `story.{N}.{M}`,
// `story.[N+1]` and more, because every author spells a placeholder their own way. The new
// scheme has one invariant that every spelling shares — the FIRST placeholder after
// `story.` or `epic.` names the PRD — so the check asks for that and refuses the rest.
const PLACEHOLDER_HEAD =
  /\b(?:story\.|epic[./])(?:\{([^{}.]+)\}|\[([^\[\].]+)\]|<([^<>.]+)>)/g;
const PRD_PLACEHOLDER =
  /^(?:P|p|PRD|prd|prdNum|prd_num|prd_number|prd-number|prd-num)$/;
// The one restatement with no kind word in front: a bare two-level `{epic}.{story}` id.
// `(?<![\w.])` alone: any `{epic}` after a dot is already a later segment of a longer id.
// Braced, bracketed or angled — `{epic}.{story}`, `[epic].[story]`, `<epic>.<story>` — the
// bracket form survived in qa-story because this matched braces only (QA cycle 5, CR-2).
const BARE_TWO_LEVEL =
  /(?<![\w.\]>}])(?:\{epic\}\.\{story\}|\[epic\]\.\[story\]|<epic>\.<story>)/i;
// A PRD-tree path whose feature directory is not the PRD's own `prd.{P}.{feature}`: the
// epic and story names in it can be right while the directory above them is the flat
// layout (QA cycle 5, CR-1 — ~20 lines in 12 files).
const FLAT_LAYOUT =
  /(?<!prd\.(?:\d+|[{[<][A-Za-z_-]+[}\]>])\.)[{[<]feature[}\]>]\/epics\//;
// The parent-directory rule (QA cycle 6, CR6-4): any `…/<dir>/epics/` whose `<dir>` is a
// literal name must be the PRD's own `prd.*` directory. FLAT_LAYOUT knew one placeholder
// spelling, so concrete examples (`ui-domain/module-name/epics/`) passed after their ids
// were rewritten. A wildcard, `..`-free variable or `...` parent states no layout.
function flatParent(line) {
  for (const m of line.matchAll(/\/([^/\s`'"()]+)\/epics\//g)) {
    const dir = m[1];
    if (
      /^prd\./.test(dir) ||
      /^\*{1,2}$/.test(dir) ||
      dir === "..." ||
      dir.includes("$")
    )
      continue;
    return true;
  }
  return false;
}
// A literal flat id — `epic.164.core-foundation`, `story.2.1.visibility` — in an example.
// The placeholder checks above never see a literal (QA cycle 6: nine in one guide). A line
// that shows the flat form AS the wrong one is spared by NEGATIVE_EXAMPLE.
const FLAT_LITERAL =
  /(?<![\w.-])(?:epic\.\d+\.[a-z[]|story\.\d+\.\d+[A-Z]?\.[a-z[])/;
const NEGATIVE_EXAMPLE = /❌|\bWrong\b|\bNOT `|no PRD number/;
const TITLE_HEAD =
  /(?:EPIC-|\bEpic |\[Epic |\bStory |\[Story )(?:\{\{?([^{}.]+)\}|\[([^\[\].]+)\]|<([^<>.]+)>)/g;
const FLAT_NUMBER =
  /^(?:[NnEe]|[Nn]\s*[+-]\s*\d+|epic|Epic|epicNum|epic_num|epic_number|story|storyNum)$/;

// file → why its TITLE heads may name a relative epic or story number. Inside a PRD the epic
// and story headings are relative by design — "Epic 1" in a PRD IS epic.{P}.1 (create-prd §
// "Epic Numbering", and the note in both PRD templates) — so `[Epic {{epic_number}}]` there is
// correct, and a cycle-3 fix that rewrote it was itself the defect (task.207 QA cycle 4).
// Filename heads in these files are still checked. An entry whose file no longer carries a
// relative title head FAILS (§5 stale-entry test).
const RELATIVE_TITLES = new Map([
  [
    "skills/prd-template/SKILL.md",
    {
      why: "PRD Section 6 headings — epics and stories numbered within the PRD",
      lines: [
        "[Epic {{epic_number}}] {{epic_title}}",
        "[Story {{epic_number}}.{{story_number}}] {{story_title}}",
      ],
    },
  ],
  [
    "skills/prd-template/resources/prd-tmpl.yaml",
    {
      why: "PRD template headings — relative by its own EPIC NUMBERING note",
      lines: [
        'title: "[Epic {{epic_number}}] {{epic_title}}"',
        'title: "[Story {{epic_number}}.{{story_number}}] {{story_title}}"',
      ],
    },
  ],
  [
    "skills/create-prd/SKILL.md",
    {
      why: "the PRD's own Change Log row names the epic by its number within the PRD",
      lines: ["| {today} |  | Epic {N} appended | create-prd |"],
    },
  ],
]);

/**
 * Exempt from the title check only on an anchored line, never the whole file: a file-wide
 * exemption let a new flat title anywhere else in a 1000-line skill pass (QA cycle 5, CR-3).
 */
function titleExempt(f, line) {
  const e = RELATIVE_TITLES.get(f);
  return !!e && e.lines.some((anchor) => line.includes(anchor));
}

/** The old-scheme placeholder heads on one line, or [] when it states none. */
function oldPlaceholders(line, { titles = true, literals = true } = {}) {
  const out = [];
  for (const m of line.matchAll(PLACEHOLDER_HEAD)) {
    const name = m[1] ?? m[2] ?? m[3];
    if (!PRD_PLACEHOLDER.test(name.trim())) out.push(m[0]);
  }
  for (const m of titles ? line.matchAll(TITLE_HEAD) : []) {
    const name = m[1] ?? m[2] ?? m[3];
    if (FLAT_NUMBER.test(name.trim())) out.push(m[0]);
  }
  if (BARE_TWO_LEVEL.test(line)) out.push("{epic}.{story}");
  if (FLAT_LAYOUT.test(line)) out.push("{feature}/epics/");
  if (flatParent(line)) out.push("<dir>/epics/");
  if (literals && FLAT_LITERAL.test(line) && !NEGATIVE_EXAMPLE.test(line))
    out.push("flat literal id");
  return out;
}

// file → why its literal ids are data, not examples to copy.
const LITERAL_DATA = new Map([
  [
    "shared/resources/security-input-corpus.md",
    "parser input rows — the story id in a gate or report name is not what the row tests",
  ],
]);

/**
 * Tree diagrams (QA cycle 6, CR6-1): an `epics/` node whose nearest DIRECTORY ancestor
 * is not `prd.*`. Line-based checks cannot see it: the parent is on another line.
 * Returns the 1-based line numbers of offending `epics/` nodes.
 */
function flatTreeEpics(lines) {
  const node = (l) => {
    const m = l.match(/^([\s│├└─]*)(\S.*?)\s*(?:#.*)?$/);
    return m ? { col: m[1].length, name: m[2] } : null;
  };
  const bad = [];
  lines.forEach((l, i) => {
    if (!/^[\s│├└─]*epics\/\s*(?:#.*)?$/.test(l)) return;
    let col = node(l).col;
    for (let j = i - 1; j >= 0; j--) {
      const n = node(lines[j]);
      if (!n || n.col >= col || /^[\s│]*$/.test(lines[j])) continue;
      col = n.col;
      if (!n.name.endsWith("/")) continue; // a label, not a directory
      const dir = n.name.replace(/\/$/, "").split("/").pop();
      if (!/^prd\./.test(dir)) bad.push(i + 1);
      return;
    }
  });
  return bad;
}

// path prefix → why it may keep the old spelling: records, frozen snapshots, and the one
// skill whose own numbering scheme is deferred work (it must name its follow-up).
const HISTORICAL = new Map([
  ["docs/tasks/", "task records — describe what was true when written"],
  ["docs/bugs/", "bug records — describe what was true when written"],
  ["docs/prd/", "the PRD corpus — held by doc-numbering-corpus.test.mjs"],
  [
    "docs/reference/develop-story-pipeline-audit.2026-08-20.md",
    "a dated audit that quotes the pipeline as it stood on that date",
  ],
  [
    "examples/prd-example/",
    "a frozen 2026-05-12 snapshot; examples/README.md states it keeps its original names",
  ],
  [
    "examples/epic-examples/",
    "a frozen 2026-05-12 snapshot; examples/README.md states it keeps its original names",
  ],
  [
    "skills/create-parallel-stories/SKILL.md",
    "deferred work (task.207): its own {epic}.1-{n} parallel-story scheme, which doc-id rejects; a follow-up task moves it to sub-stories",
  ],
  [
    "CHANGELOG.md",
    "release history — quotes the old scheme to describe its retirement",
  ],
]);

// Markdown AND the YAML templates and configs that render titles and paths: the PRD templates
// and config comments kept the flat scheme because the population stopped at *.md (task.207 QA
// cycle 4, CR-1).
const PROSE = gitFiles("*.md", "*.yaml", "*.yml").filter(
  (f) =>
    ![...HISTORICAL.keys()].some((h) => f.startsWith(h)) &&
    !f.startsWith("evals/") &&
    !f.startsWith(".agents/") &&
    !f.startsWith("tests/"),
);

test("§5 no canonical prose states an old-scheme placeholder", () => {
  assert.ok(
    PROSE.length >= 300,
    `prose population is only ${PROSE.length} files`,
  );
  const bad = [];
  let generated = 0;
  for (const f of PROSE) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    if (
      /^skills\/[^/]+\/references\//.test(f) &&
      /^<!-- AUTO-GENERATED/m.test(text)
    ) {
      generated++;
      continue;
    }
    for (const n of flatTreeEpics(text.split("\n")))
      bad.push(`${f}:${n}: [tree epics/ under a non-prd directory]`);
    text.split("\n").forEach((line, i) => {
      const heads = oldPlaceholders(line, {
        titles: !titleExempt(f, line),
        literals: !LITERAL_DATA.has(f),
      });
      if (heads.length)
        bad.push(
          `${f}:${i + 1}: [${heads.join(", ")}] ${line.trim().slice(0, 110)}`,
        );
    });
  }
  assert.ok(
    generated >= 100,
    `only ${generated} generated references recognised — the marker test is broken`,
  );
  assert.deepEqual(
    bad,
    [],
    "old-scheme placeholder — write story.{P}.{E}.{S} / epic.{P}.{E} (or [P].[E]):\n" +
      bad.join("\n"),
  );
});

test("§5 every relative-title anchor still exists, states a reason and is a relative title head", () => {
  for (const [f, { why, lines }] of RELATIVE_TITLES) {
    assert.ok(
      fs.existsSync(path.join(ROOT, f)),
      `${f} is exempt but does not exist`,
    );
    assert.ok(why.length >= 20, `${f}: the reason is too short to check`);
    const text = fs.readFileSync(path.join(ROOT, f), "utf8").split("\n");
    for (const anchor of lines) {
      const line = text.find((l) => l.includes(anchor));
      assert.ok(
        line,
        `${f}: anchor no longer present — drop it from RELATIVE_TITLES: ${anchor}`,
      );
      assert.ok(
        oldPlaceholders(line).length >
          oldPlaceholders(line, { titles: false }).length,
        `${f}: anchored line has no relative title head — the exemption is stale: ${anchor}`,
      );
    }
  }
});

test("§5 the placeholder check refuses every flat spelling and spares the new ones", () => {
  // Every row is a spelling found in this repository's prose (cycles 1–2), not a
  // synthetic string: the allow-list is proved against the forms authors actually write.
  for (const hit of [
    "story.{epic}.{story}.qa.1.x.md",
    "story.[epic].[story].gate.[number].yml",
    "story.[N].[M].plan.x.md",
    "story.<epic>.<story>.gate.*.yml",
    "epic.<N>.<name>/stories/story.<N>.<M>.<slug>/",
    "story.{N}.{M}.gate.{n}.yml",
    "story.{epicNum}.{storyNum}",
    "story.[N+1].[name].md",
    "epic.[n-1].[name]",
    "epic.{epic-number}.review.*.md",
    "epic.[N].[name]/",
    "epic/{n}.{slug}",
    "Source ID: `{epic}.{story}`",
    "EPIC-[N]-ROADMAP.md",
    "milestone (`Epic {N} — {title}`)",
    "[Epic [N+1]: [Name]](../x.md)",
    "Story [epic].[story]",
    "[Story {{epic_number}}.{{story_number}}]",
    "Epic {epicNum}",
    "**Story**: [epic].[story] - [Story Title]",
    "<epic>.<story>.gate.yml",
    "${PRD_ROOT}/{domain}/{feature}/epics/epic.{P}.{E}.{name}/",
    "docs/prd/[domain]/[feature]/epics/",
  ])
    assert.ok(oldPlaceholders(hit).length > 0, `expected a hit: ${hit}`);
  for (const miss of [
    "story.{P}.{E}.{S}.qa.1.x.md",
    "story.[P].[E].[S].gate.[number].yml",
    "story.<prd>.<epic>.<story>",
    "story.{prdNum}.{epicNum}.{storyNum}",
    "story.{prd}.{epic}.{story}.bug.{n}",
    "epic.{p}.{n}.{slug}",
    "epic.{P}.{E}.review.*.md",
    "epic/{P}.{E}.{slug}",
    "story_id: '{prd}.{epic}.{story}'",
    "- ❌ Wrong: `story.4.2.checkout.md` — a literal negative example",
    "EPIC-[P].[E]-STORIES-INDEX.md",
    "milestone (`Epic {P.E} — {title}`)",
    "[Story [P].[E].1]",
    "Story [prev] links back",
    "pass the epic <path>",
    "Epic {any id} is accepted",
    "${PRD_ROOT}/{domain}/prd.{P}.{feature}/epics/epic.{P}.{E}.{name}/",
    "docs/prd/[domain]/prd.[P].[feature]/epics/",
    "`{prd}.{epic}.{story}`",
  ])
    assert.deepEqual(oldPlaceholders(miss), [], `expected no hit: ${miss}`);
});

module.exports = { scanCode, scanMarkdown, CODE_SHAPES, SHELL_SHAPES };

test("§5 the parent, literal and tree checks catch the cycle-6 spellings and spare the new ones", () => {
  for (const hit of [
    "Location: ${PRD_ROOT}/ui-domain/module-name/epics/epic.1.178.x/",
    "docs/prd/app/core/epics/epic.178/stories/",
    "See [Epic 164](./epics/epic.164.core-foundation/epic.164.core-foundation.md)",
    "- `story.2.1.visibility-mode-config.md`",
    "- [ ] Write epic.1.[name].md",
  ])
    assert.ok(oldPlaceholders(hit).length > 0, `missed: ${hit}`);
  for (const miss of [
    "${PRD_ROOT}/ui-domain/prd.1.module-name/epics/epic.1.178.x/",
    "${PRD_ROOT}/{domain}/prd.{prd-number}.{feature}/epics/",
    "docs/prd/x/prd.1.{feature}/epics/",
    '"$PRD_ROOT"/*/prd.*/epics/epic.*/epic.*.md',
    "Glob: `${PRD_ROOT}/**/epics/*/stories/**/story.*.md`",
    "`${PRD_DIR}/epics/`",
    "- `story.1.2.3A` - a sub-story",
    "- ❌ Wrong: `epic.3.auto-hide` (no PRD number)",
  ])
    assert.deepEqual(oldPlaceholders(miss), [], `false hit: ${miss}`);
  assert.deepEqual(
    flatTreeEpics([
      "docs/",
      "└── prd/",
      "    └── [feature]/",
      "        └── epics/",
    ]),
    [4],
  );
  assert.deepEqual(
    flatTreeEpics([
      "docs/prd/[domain]/prd.[P].[feature]/",
      "└── Epic docs (Nested)",
      "    └── epics/",
    ]),
    [],
  );
});
