// ---------------------------------------------------------------------------
// pipeline-answers-docs.test.mjs — task.201's prose is wired to its engines.
// ---------------------------------------------------------------------------
// pipeline-answers.test.mjs proves the rules; this file proves the documents a
// pipeline executes actually call them, with flags the CLI accepts. A rule that
// is tested but never invoked holds nothing.
//
//   1. Timestamps — every Pipeline Progress table ends in `Completed (UTC)`, every
//      row has the header's cell count, and every orchestrator stamps it.
//   2. Answer resolution — §0d and develop-bug §0d call `resolve` from a fenced
//      block, with no flag the CLI does not define.
//   3. Waivers — the QA loop calls `gate` from a fenced block; the lite-mode
//      contract and finalise say a FAIL stays FAIL and the DoD shows the waiver.
//   4. Step 2 reuse — the freshness call passes the document's hash, and every
//      review skill stamps its report.
//
// Run: node --test shared/resources/tests/pipeline-answers-docs.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");

/** Every fenced ```bash block in a document, as text. */
function bashBlocks(text) {
  return [...text.matchAll(/^ {0,3}```bash\n([\s\S]*?)^ {0,3}```/gm)].map(
    (m) => m[1],
  );
}

/** The `--flag` names a CLI usage string defines. */
function usageFlags(engine) {
  const src = read(`shared/resources/${engine}`);
  const usage = src.slice(
    src.indexOf("const USAGE"),
    src.indexOf("`;", src.indexOf("const USAGE")),
  );
  return new Set(usage.match(/--[a-z][a-z-]*/g));
}

/** Flags passed on the engine's command line inside one fenced block. */
function flagsPassedTo(block, engine, sub) {
  const at = block.indexOf(`${engine} ${sub}`);
  if (at < 0) return null;
  // The command continues while lines end in a backslash.
  const tail = block.slice(at).split("\n");
  const cmd = [];
  for (const l of tail) {
    cmd.push(l);
    if (!/\\\s*$/.test(l)) break;
  }
  return cmd.join(" ").match(/(?<![\w-])--[a-z][a-z-]*/g) || [];
}

// ── 1. timestamps ──────────────────────────────────────────────────────────

function progressTables(text) {
  const tables = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (
      /^\| Step\b/.test(lines[i]) &&
      lines[i].includes("Subagent summary ref")
    ) {
      const t = [];
      for (let j = i; j < lines.length && lines[j].startsWith("|"); j++)
        t.push(lines[j]);
      tables.push(t);
    }
  }
  return tables;
}
const cells = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|").length;

test("1a: every Pipeline Progress table in the template and develop-bug §0e ends in Completed (UTC)", () => {
  const sources = {
    "shared/resources/implementation-report-template.md": 3,
    "skills/develop-bug/references/develop-bug-step-0-resolve-bug.md": 1,
  };
  for (const [file, expected] of Object.entries(sources)) {
    const tables = progressTables(read(file));
    assert.equal(
      tables.length,
      expected,
      `${file}: expected ${expected} progress table(s)`,
    );
    for (const t of tables) {
      assert.match(
        t[0],
        /\| Subagent summary ref \| Completed \(UTC\) \|$/,
        `${file}: header`,
      );
      for (const row of t)
        assert.equal(
          cells(row),
          cells(t[0]),
          `${file}: row has the wrong cell count: ${row}`,
        );
    }
  }
});

test("1b: every orchestrator's Step Transition Protocol stamps Completed (UTC) once", () => {
  for (const skill of ["develop-story", "develop-task", "develop-bug"]) {
    const line = read(`skills/${skill}/SKILL.md`)
      .split("\n")
      .find((l) => l.startsWith("2. **Edit the implementation report**"));
    assert.ok(line, `${skill}: Step Transition Protocol action 2 not found`);
    assert.match(line, /Completed \(UTC\)/, skill);
    assert.match(line, /date -u \+%Y-%m-%dT%H:%MZ/, skill);
    assert.match(line, /never overwrite a filled cell/, skill);
  }
});

// ── 2. answer resolution ───────────────────────────────────────────────────

test("2: §0d (story/task) and develop-bug §0d call resolve with flags the CLI defines", () => {
  const known = usageFlags("pipeline-answers.js");
  for (const [file, pipeline] of [
    [
      "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
      "{story|task}",
    ],
    ["skills/develop-bug/references/develop-bug-step-0-resolve-bug.md", "bug"],
  ]) {
    const found = bashBlocks(read(file))
      .map((b) => flagsPassedTo(b, "pipeline-answers.js", "resolve"))
      .filter(Boolean);
    assert.equal(found.length, 1, `${file}: expected one fenced resolve call`);
    const unknown = found[0].filter((f) => !known.has(f));
    assert.deepEqual(unknown, [], `${file}: flags the CLI does not define`);
    assert.ok(
      found[0].includes("--persisted-file"),
      `${file}: resume needs --persisted-file`,
    );
    assert.match(
      read(file),
      new RegExp(`--pipeline ${pipeline.replace(/[{}|]/g, "\\$&")}`),
      file,
    );
  }
});

/**
 * Variables a block reads before any line of it assigns them. Single-quoted text
 * (jq programs) and quoted-heredoc bodies are not shell. Order counts: a read
 * above its assignment is unbound when that line runs (gate 2, CR-9).
 */
function unboundReads(block) {
  block = block.replace(/<<'(\w+)'[^\n]*\n[\s\S]*?\n\1(?=\n|$)/g, "");
  block = block.replace(/'[^'\n]*'/g, "''");
  const firstAssign = new Map();
  for (const m of block.matchAll(/(?:^|[\s;(])([A-Za-z_][A-Za-z0-9_]*)=/gm))
    if (!firstAssign.has(m[1])) firstAssign.set(m[1], m.index);
  const out = new Set();
  for (const m of block.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const at = firstAssign.get(m[1]);
    if (at === undefined || at > m.index) out.add(m[1]);
  }
  return [...out];
}

// The population: every fenced block, in every source file this repository
// executes, that calls one of task.201's engines or reads the lock fields it
// adds. Derived, not listed — a hand list misses the site nobody named.
const POPULATION_RE =
  /pipeline-answers|record-reviewed-blob|hash-object|\.answers\b|\.waiver\b/;
function sourceFiles() {
  const out = [];
  for (const f of readdirSync(join(ROOT, "shared/resources")))
    if (f.endsWith(".md")) out.push(`shared/resources/${f}`);
  for (const sk of readdirSync(join(ROOT, "skills"))) {
    if (existsSync(join(ROOT, "skills", sk, "SKILL.md")))
      out.push(`skills/${sk}/SKILL.md`);
  }
  out.push("skills/develop-bug/references/develop-bug-step-0-resolve-bug.md");
  return out;
}

test("2c: every block that touches task.201's engines binds what it reads, before it reads it (QA-1, CR-9)", () => {
  const hits = [];
  for (const file of sourceFiles())
    for (const b of bashBlocks(read(file)))
      if (POPULATION_RE.test(b)) hits.push([file, b]);
  // Non-vacuity floor: §0d, develop-bug §0d, Step 1, Step 2, the QA loop and three review skills.
  assert.ok(
    hits.length >= 8,
    `population is only ${hits.length} — the scan found less than the change touched`,
  );
  const bad = hits
    .map(([f, b]) => [f, unboundReads(b)])
    .filter(([, r]) => r.length);
  assert.deepEqual(
    bad,
    [],
    "a block reads a variable no earlier line of it assigns",
  );
  // The rule sees a read the block does not bind, and one above its assignment.
  assert.deepEqual(unboundReads('x --detector "$PIPELINE_MODE"'), [
    "PIPELINE_MODE",
  ]);
  assert.deepEqual(unboundReads('echo "$A"\nA=1'), ["A"]);
  assert.deepEqual(unboundReads('A=$(date)\necho "$A"'), []);
  assert.deepEqual(unboundReads("jq '.x = $a' f"), []);
  assert.deepEqual(unboundReads("cat <<'EOF'\n$NOT_SHELL\nEOF\n"), []);
});

test("2b: the 0f summary shows a source for every answer", () => {
  const text = read(
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
  );
  const f = text.slice(text.indexOf("## 0f. Pre-flight Summary"));
  for (const k of ["sources.base", "sources.target", "sources.mode"])
    assert.equal(f.split(k).length - 1, 2, `0f: ${k} in both banners`);
});

// ── 3. waivers ─────────────────────────────────────────────────────────────

test("3a: the QA loop records a waived step through `gate`, with flags the CLI defines", () => {
  const known = usageFlags("pipeline-answers.js");
  const found = bashBlocks(
    read("shared/resources/develop-pipeline-step-5-6-qa-loop.md"),
  )
    .map((b) => flagsPassedTo(b, "pipeline-answers.js", "gate"))
    .filter(Boolean);
  assert.equal(found.length, 1, "expected one fenced gate call");
  assert.deepEqual(
    found[0].filter((f) => !known.has(f)),
    [],
  );
});

test("3b: the contract says a waiver never masks a FAIL, and the DoD shows the waiver", () => {
  assert.match(
    read("shared/resources/develop-pipeline-lite-mode.md"),
    /A waiver never masks a failure/,
  );
  assert.match(
    read("shared/resources/develop-pipeline-step-5-6-qa-loop.md"),
    /a waiver never masks a failure/,
  );
  assert.match(
    read("skills/finalise/SKILL.md"),
    /`\*\*Waiver\*\*: \{waiver\.reason\} — approved by \{waiver\.approved_by\}`/,
  );
});

// ── 4. Step 2 reuse ────────────────────────────────────────────────────────

test("4a: the Step 2 freshness call passes the task document's hash", () => {
  const text = read("shared/resources/develop-pipeline-step-2-review.md");
  assert.match(text, /taskBlob:\s+process\.argv\[3\]/);
  assert.match(text, /"\$\(git hash-object "\{task-file\}"\)"/);
});

test("4b: every review skill stamps its report from a fenced block", () => {
  for (const skill of ["review-task", "review-story", "review-bug"]) {
    const calls = bashBlocks(read(`skills/${skill}/SKILL.md`)).filter((b) =>
      b.includes(`.agents/skills/${skill}/references/record-reviewed-blob.js`),
    );
    assert.equal(
      calls.length,
      1,
      `${skill}: expected one fenced record-reviewed-blob call`,
    );
    assert.match(calls[0], /--doc .* --report /, skill);
  }
});
