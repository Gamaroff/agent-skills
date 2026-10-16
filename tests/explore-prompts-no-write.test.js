"use strict";
/**
 * No prompt dispatched to an Explore subagent instructs a write (task.189, obs #191, #218).
 *
 * An Explore subagent is read-only. The QA traceability mapper was told to "Write the matrix file"
 * and the finalise DoD security agent to run the probe engine with `--record`; both refused on every
 * run, and each run completed only because the orchestrator noticed and did the write by hand. The
 * fix moved every write to the step that dispatches the agent. This test keeps it there — for the
 * prompts that exist today and for any written later, because the population is re-measured from
 * the tree on every run rather than listed here.
 *
 * POPULATION — three sources, bundled copies excluded (only `shared/resources/*.md` and
 * `skills/<name>/SKILL.md` are read):
 *   A. every prompt file named on a line that dispatches an Explore subagent
 *      (`subagent_type="Explore"` / `subagent_type: Explore`); a dispatch line in a prompt file
 *      that names no other file dispatches the file itself;
 *   B. every `shared/resources/*prompt*.md` / `*subagent*.md` whose text says it is an Explore
 *      subagent prompt (the four finalise DoD prompts are dispatched from a table, not a line);
 *   C. the quoted body of every inline `Agent(subagent_type="Explore", prompt="…")` dispatch — the
 *      mapper's two dispatch sites carry their instruction inline, not in a file.
 *
 * WHAT COUNTS AS A WRITE — outside a region the prompt marks `<!-- caller-runs -->` …
 * `<!-- /caller-runs -->` (text the CALLER runs, such as the code reviewer's diff scoping), and not
 * in a sentence that forbids it ("never", "do not", …):
 *   - "write the|a|an|it|both|… … file|to" — an instruction to write a file;
 *   - `--record` — the probe engine's run-record flag;
 *   - `mkdir`;
 *   - a shell redirect into a path: `>`/`>>` after whitespace or an fd, followed by `{`, `<`,
 *     `"`, `'` or `$`;
 *   - a catalog or bundle generator run (`npm run generate-catalog`, `generate_catalog.py`, …).
 * The control cases at the bottom prove the matcher fires on each shape and stays quiet on the
 * caller-run and forbidding ones.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.join(__dirname, "..");
const SHARED = path.join(REPO_ROOT, "shared", "resources");

const DISPATCH = /subagent_type[=:] *"?Explore/;
const SELF_DECLARED = /Explore[ -]subagent/i;
const PROMPT_FILE = /[A-Za-z0-9._-]*(?:prompts?|subagent)\.md/g;
const INLINE = /Agent\(subagent_type="Explore",\s*prompt="([\s\S]*?)"\)/g;

const WRITE_SHAPES = [
  [
    "write instruction",
    /\bwrite\s+(?:the|a|an|it|both|this|that|them|each|its)\b[^.\n]*?\b(?:files?|to)\b/i,
  ],
  ["--record", /--record\b/],
  ["mkdir", /\bmkdir\b/],
  // Shell redirect syntax: whitespace (or an fd such as `2`, `&`) before the `>`. A placeholder
  // that closes before a quote (`"<a>", "<b>"`) has a word character there, not whitespace.
  ["shell redirect into a path", /(?:^|\s)[0-9&]?>>?\s*["'{$<]/],
  // `npm run bundle:check` is the read-only check, not the generator.
  [
    "generator run",
    /\bnpm run (?:generate-catalog|bundle|build)(?![\w:-])|\bgenerate_catalog\.py\b|\bbundle_skill\.py\b/,
  ],
];
const FORBIDS = /\b(?:never|do not|don't|must not|no)\b/i;

/** Blank every line inside a caller-runs region, keeping line numbers. */
function withoutCallerRuns(text) {
  let inside = false;
  return text
    .split("\n")
    .map((line) => {
      if (/<!--\s*caller-runs\s*-->/.test(line)) {
        inside = true;
        return "";
      }
      if (/<!--\s*\/caller-runs\s*-->/.test(line)) {
        inside = false;
        return "";
      }
      return inside ? "" : line;
    })
    .join("\n");
}

/** Every write instruction in `text`: [{line, shape, text}]. */
function writeInstructions(text) {
  const out = [];
  withoutCallerRuns(text)
    .split("\n")
    .forEach((raw, i) => {
      // A markdown blockquote's leading `>` is not a redirect.
      const line = raw.replace(/^\s*(?:>\s?)+/, "");
      for (const [shape, re] of WRITE_SHAPES) {
        const m = re.exec(line);
        if (!m) continue;
        // A sentence that forbids the write is not an instruction to perform it.
        const sentenceStart = Math.max(0, line.lastIndexOf(". ", m.index) + 1);
        if (FORBIDS.test(line.slice(sentenceStart, m.index))) continue;
        out.push({ line: i + 1, shape, text: raw.trim().slice(0, 140) });
      }
    });
  return out;
}

function sources() {
  const out = [];
  for (const f of fs.readdirSync(SHARED)) {
    if (f.endsWith(".md")) out.push(path.join(SHARED, f));
  }
  const skills = path.join(REPO_ROOT, "skills");
  for (const s of fs.readdirSync(skills)) {
    const md = path.join(skills, s, "SKILL.md");
    if (fs.existsSync(md)) out.push(md);
  }
  return out;
}

const rel = (abs) => path.relative(REPO_ROOT, abs);

/** The population: [{id, text}] — files (A, B) and inline dispatch bodies (C). */
function population() {
  const files = new Set();
  const inline = [];
  for (const abs of sources()) {
    const text = fs.readFileSync(abs, "utf8");
    const own = path.basename(abs);
    text.split("\n").forEach((line) => {
      if (!DISPATCH.test(line)) return;
      const named = (line.match(PROMPT_FILE) || [])
        .map((n) => path.join(SHARED, path.basename(n)))
        .filter((p) => fs.existsSync(p));
      if (named.length) named.forEach((p) => files.add(p));
      else if (/(?:prompts?|subagent)\.md$/.test(own)) files.add(abs);
    });
    for (const m of text.matchAll(INLINE)) {
      const line = text.slice(0, m.index).split("\n").length;
      inline.push({ id: `${rel(abs)}:${line} (inline dispatch)`, text: m[1] });
    }
  }
  for (const f of fs.readdirSync(SHARED)) {
    if (!/(?:prompt|subagent)[^/]*\.md$/.test(f)) continue;
    const abs = path.join(SHARED, f);
    if (SELF_DECLARED.test(fs.readFileSync(abs, "utf8"))) files.add(abs);
  }
  return [
    ...[...files]
      .sort()
      .map((abs) => ({ id: rel(abs), text: fs.readFileSync(abs, "utf8") })),
    ...inline,
  ];
}

test("non-vacuity: the population holds every prompt the task names", () => {
  const ids = population().map((p) => p.id);
  for (const must of [
    "shared/resources/qa-traceability-mapper-prompt.md",
    "shared/resources/finalise-dod-ac-prompt.md",
    "shared/resources/finalise-dod-security-prompt.md",
    "shared/resources/finalise-dod-compliance-prompt.md",
    "shared/resources/finalise-dod-docs-prompt.md",
    "shared/resources/review-story-prepass-prompts.md",
    "shared/resources/review-task-prepass-prompts.md",
    "shared/resources/code-review-prompt.md",
    "shared/resources/test-failure-triage-prompt.md",
  ]) {
    assert.ok(
      ids.includes(must),
      `${must} is missing from the Explore-prompt population`,
    );
  }
  const mapperDispatches = ids.filter((id) =>
    id.startsWith("shared/resources/develop-pipeline-step-5-6-qa-loop.md:"),
  );
  assert.equal(
    mapperDispatches.length,
    2,
    `expected the two inline mapper dispatches in the Steps 5–6 doc, found: ${mapperDispatches.join(", ")}`,
  );
});

test("no prompt dispatched to an Explore subagent instructs a write", () => {
  const found = [];
  for (const p of population()) {
    for (const w of writeInstructions(p.text)) {
      found.push(`${p.id}:${w.line} [${w.shape}] ${w.text}`);
    }
  }
  assert.deepEqual(
    found,
    [],
    "an Explore subagent is read-only — return the content and let the dispatching step write it, " +
      "or wrap text the CALLER runs in <!-- caller-runs --> … <!-- /caller-runs -->",
  );
});

test("both mapper dispatch sites say to return the matrix", () => {
  const bodies = population().filter(
    (p) =>
      p.id.endsWith("(inline dispatch)") && /traceability mapper/.test(p.text),
  );
  assert.equal(bodies.length, 2);
  for (const b of bodies) {
    assert.match(
      b.text,
      /Return the matrix between the markers/,
      `${b.id} does not ask for the matrix back`,
    );
  }
});

// --- Control cases: the matcher fires on each write shape and stays quiet on the others -----------

test("control: the matcher fires on every write shape", () => {
  for (const [sample, shape] of [
    [
      "Follow the Execution Protocol exactly. Write the matrix file and return a one-line confirmation.",
      "write instruction",
    ],
    ["Write the report file to the story directory.", "write instruction"],
    [
      "If you cannot, write both the cases file and the record to `$TMPDIR`.",
      "write instruction",
    ],
    ["write it to `<STORY_DIR>/<stem>.cases.json`", "write instruction"],
    [
      "  --record <STORY_DIR>/<stem>.dod.<DOD_N>.security.run.json --json",
      "--record",
    ],
    ["mkdir -p {STORY_DIR}/.summaries", "mkdir"],
    ["- Default: `git diff HEAD > <DIFF_FILE>`", "shell redirect into a path"],
    ['printf x >> "$LOG"', "shell redirect into a path"],
    ["Run `npm run generate-catalog` and compare.", "generator run"],
  ]) {
    const hits = writeInstructions(sample).map((w) => w.shape);
    assert.ok(hits.includes(shape), `the matcher missed a ${shape}: ${sample}`);
  }
});

test("control: caller-run regions, forbidding sentences and arrows are not writes", () => {
  for (const sample of [
    "<!-- caller-runs -->\nWrite the report file to the story directory.\n`git diff HEAD > <DIFF_FILE>`\n<!-- /caller-runs -->",
    "**Never run the generator, or any other command that writes, to find out.**",
    "Do not create a directory or a file for it: you are read-only.",
    "Never `mkdir` anything.",
    '> "quoted" — a blockquote that opens on a quote',
    'argv: ["--sink", "<sink>", "--entry", "<path-from-repo-root>#<exportName>"]',
    "bundled copies are in the same diff (or `npm run bundle:check` is clean).",
    "a -> b, a => b, x >= 1, <!-- marker -->, `2>/dev/null`",
    "The dispatching step writes the table to `<doc-dir>/.summaries/qa-traceability-matrix.md`.",
  ]) {
    assert.deepEqual(
      writeInstructions(sample),
      [],
      `a false positive on: ${sample}`,
    );
  }
});

test("mutation: restoring the mapper's write instruction turns the guard red", () => {
  const mapper = population().find(
    (p) => p.id === "shared/resources/qa-traceability-mapper-prompt.md",
  );
  assert.ok(mapper);
  assert.deepEqual(writeInstructions(mapper.text), []);
  const restored = mapper.text.replace(
    "Return the matrix between the markers in Step 7; do not create or modify any file.",
    "Write the matrix file and return a one-line confirmation.",
  );
  assert.notEqual(
    restored,
    mapper.text,
    "the dispatch sentence moved — update this mutation",
  );
  assert.ok(
    writeInstructions(restored).some((w) => w.shape === "write instruction"),
  );
});

module.exports = { writeInstructions, population };
