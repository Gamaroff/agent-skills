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
    new RegExp(String.raw`(?:Epic|Story)\\{1,2}s[+*]?[^\n]{0,4}?` + DIGIT),
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

function stripCodeComment(line, lang, state) {
  if (lang === "js") {
    if (state.block) {
      const end = line.indexOf("*/");
      if (end === -1) return "";
      state.block = false;
      line = line.slice(end + 2);
    }
    const open = line.indexOf("/*");
    if (open !== -1 && !/['"`]/.test(line.slice(0, open))) {
      const close = line.indexOf("*/", open + 2);
      if (close === -1) {
        state.block = true;
        return line.slice(0, open);
      }
      line = line.slice(0, open) + line.slice(close + 2);
    }
    if (/^\s*\/\//.test(line)) return "";
    return line.replace(/\s\/\/\s.*$/, "");
  }
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
  const state = { block: false };
  const out = [];
  text.split("\n").forEach((raw, i) => {
    const line = stripCodeComment(raw, lang, state);
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
    const line = stripCodeComment(raw, "sh", {});
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

function runReviewEpic(docFile, branch) {
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
    const script =
      `set -e\nDOC_FILE=${JSON.stringify(docFile)}\nCURRENT_BRANCH=${JSON.stringify(branch)}\nAUTO_SKIPPED=false\n` +
      reviewEpicBlock(0) +
      `\necho "PRD_NUM=$PRD_NUM"\necho "EPIC_NUM=$EPIC_NUM"\necho "EPIC_SLUG=$EPIC_SLUG"\necho "EPIC_BRANCH=$EPIC_BRANCH"\n` +
      reviewEpicBlock(1) +
      `\necho "AUTO_SKIPPED=$AUTO_SKIPPED"\n`;
    const r = spawnSync("bash", ["-c", script], { cwd: dir, encoding: "utf8" });
    return { status: r.status, out: r.stdout, err: r.stderr };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("§4 the review-epic block reads P and E through doc-id.js", () => {
  const doc =
    "docs/prd/x/prd.1.x/epics/epic.1.42.payments/epic.1.42.payments.md";
  const r = runReviewEpic(doc, "feature/epic.1.7.other");
  assert.equal(r.status, 0, r.err);
  assert.match(r.out, /^PRD_NUM=1$/m);
  assert.match(r.out, /^EPIC_NUM=42$/m);
  assert.match(r.out, /^EPIC_SLUG=payments$/m);
  assert.match(r.out, /^EPIC_BRANCH=feature\/epic\.1\.42\.payments$/m);
  assert.match(
    r.out,
    /^AUTO_SKIPPED=false$/m,
    "another epic of the same PRD must not auto-skip",
  );
  const own = runReviewEpic(doc, "feature/epic.1.42.payments");
  assert.match(
    own.out,
    /^AUTO_SKIPPED=true$/m,
    "the epic's own branch must auto-skip",
  );
});

test("§4 the review-epic block refuses a name doc-id cannot read", () => {
  const r = runReviewEpic("docs/prd/x/epic.42.payments.md", "develop");
  assert.notEqual(r.status, 0, `a flat epic name must HALT, got:\n${r.out}`);
});

module.exports = { scanCode, scanMarkdown, CODE_SHAPES, SHELL_SHAPES };
