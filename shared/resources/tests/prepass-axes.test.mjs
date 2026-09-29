/**
 * prepass-axes — the review pre-pass measures a document against THIS
 * repository's architecture, not a web stack (task 151, obs #130).
 *
 * Agent B's domains and axes used to be a hard-coded web-stack list, so on a
 * shell/Node repository it answered `aligned` against axes the repository never
 * defined. They are now slots filled by prepass-axes.js from the H2 headings of
 * concepts/tech-stack.md and concepts/coding-standards.md.
 *
 * Behavioural where it can be: the helper is run, not grepped. The expected
 * lists for this repository are read from the files by this test's own scan,
 * not restated, so a later heading edit does not break it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const RES = join(HERE, "..");
const ROOT = join(RES, "..", "..");
const HELPER = join(RES, "prepass-axes.js");
const { deriveAxes, atxH2, FALLBACK_DOMAINS, FALLBACK_AXES } = require(HELPER);

const ARCH = join(ROOT, "docs", "architecture");
const WEB_STACK = /payments|real-time|frontend/i;

// The test's own `^## ` scan: fences skipped with a plain toggle (the concepts
// docs use only ``` fences), `See also` dropped. Deliberately NOT the helper's
// reader — an expectation computed by the code under test proves nothing.
function ownH2s(text) {
  let fenced = false;
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (/^\s{0,3}(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const m = /^## +(.+?)\s*$/.exec(line);
    if (m && m[1].toLowerCase() !== "see also") out.push(m[1]);
  }
  return out;
}

function tmp() {
  return mkdtempSync(join(tmpdir(), "prepass-axes-"));
}

test("this repository: domains and axes are its own concepts/ headings", () => {
  const r = deriveAxes({ archDir: ARCH });
  assert.equal(r.source, "architecture");
  assert.equal(r.reason, "architecture");
  const ts = readFileSync(join(ARCH, "concepts", "tech-stack.md"), "utf8");
  const cs = readFileSync(
    join(ARCH, "concepts", "coding-standards.md"),
    "utf8",
  );
  assert.deepEqual(r.domains, ownH2s(ts));
  assert.deepEqual(r.axes, ownH2s(cs));
  // Non-vacuity: an empty list would equal an empty scan and pass.
  assert.ok(r.domains.length >= 3, `domains: ${r.domains}`);
  assert.ok(r.axes.length >= 3, `axes: ${r.axes}`);
  for (const x of [...r.domains, ...r.axes]) {
    assert.doesNotMatch(x, WEB_STACK, `web-stack literal in ${x}`);
    assert.notEqual(x.toLowerCase(), "see also");
  }
  assert.ok(r.read.length <= 2, `read ${r.read.length} files`);
});

test("no concepts/ docs → fallback, reproducing the former web-stack lists", () => {
  const dir = tmp();
  try {
    const r = deriveAxes({ archDir: dir });
    assert.equal(r.source, "fallback");
    assert.deepEqual(r.domains, [
      "backend",
      "frontend",
      "auth",
      "payments",
      "real-time",
    ]);
    // The former axis-2 parenthetical, and nothing from axes 3–4 (CR-5).
    assert.deepEqual(r.axes, ["naming", "layering", "file placement"]);
    assert.deepEqual([...FALLBACK_AXES], r.axes);
    assert.deepEqual(r.read, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("one file → partial: axes from the file, domains fall back", () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, "concepts"));
    writeFileSync(
      join(dir, "concepts", "coding-standards.md"),
      "# Coding standards\n\n## Lock fields\n\ntext\n\n## Exit codes\n\n## See also\n",
    );
    const r = deriveAxes({ archDir: dir });
    assert.equal(r.source, "partial");
    assert.deepEqual(r.axes, ["Lock fields", "Exit codes"]);
    assert.deepEqual(r.domains, [...FALLBACK_DOMAINS]);
    assert.equal(r.read.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a heading inside a fenced block is not an axis", () => {
  const dir = tmp();
  try {
    mkdirSync(join(dir, "concepts"));
    writeFileSync(
      join(dir, "concepts", "tech-stack.md"),
      "## Runtimes\n\n```markdown\n## Inside\n```\n\n~~~~\n## Tilde inside\n~~~~\n\n## Languages\n",
    );
    writeFileSync(
      join(dir, "concepts", "coding-standards.md"),
      "````md\n```\n## Nested inside\n```\n````\n\n## Naming\n",
    );
    const r = deriveAxes({ archDir: dir });
    assert.equal(r.source, "architecture");
    assert.deepEqual(r.domains, ["Runtimes", "Languages"]);
    assert.deepEqual(r.axes, ["Naming"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function run(args, opts = {}) {
  return spawnSync(process.execPath, args, { encoding: "utf8", ...opts });
}

test("a concepts file with no H2 heading is absent, not an empty measurement (CR-1)", () => {
  // Both files present, neither has a `## ` heading → fallback, never
  // `architecture` with empty lists.
  const none = deriveAxes({
    archDir: "x",
    readFile: () => "# Title\n\n### only h3\n\nprose\n",
  });
  assert.equal(none.source, "fallback");
  assert.deepEqual(none.domains, [...FALLBACK_DOMAINS]);
  assert.deepEqual(none.axes, [...FALLBACK_AXES]);
  assert.equal(none.read.length, 2, "both files were read, so both are named");

  // One usable half → partial; the empty half falls back.
  const half = deriveAxes({
    archDir: "x",
    readFile: (p) => (p.endsWith("coding-standards.md") ? "## Naming\n" : ""),
  });
  assert.equal(half.source, "partial");
  assert.deepEqual(half.axes, ["Naming"]);
  assert.deepEqual(half.domains, [...FALLBACK_DOMAINS]);
});

test("a read error that is not absence throws; the CLI exits 1 with empty stdout (CR-2)", () => {
  const err = (code) => () => {
    const e = new Error(code);
    e.code = code;
    throw e;
  };
  assert.throws(
    () => deriveAxes({ archDir: "x", readFile: err("EACCES") }),
    /EACCES/,
  );
  // Absence in either spelling is not an error.
  assert.equal(
    deriveAxes({ archDir: "x", readFile: err("ENOENT") }).source,
    "fallback",
  );
  assert.equal(
    deriveAxes({ archDir: "x", readFile: err("ENOTDIR") }).source,
    "fallback",
  );

  const dir = tmp();
  try {
    // tech-stack.md is a DIRECTORY → EISDIR, which is not absence.
    mkdirSync(join(dir, "concepts", "tech-stack.md"), { recursive: true });
    const r = run([HELPER, "--arch", dir, "--json"]);
    assert.equal(r.status, 1, r.stderr);
    assert.equal(r.stdout, "");
    assert.match(r.stderr, /cannot read the architecture docs/);
    // --arch naming a regular file → ENOTDIR under it → absence, exit 0.
    const file = join(dir, "not-a-dir");
    writeFileSync(file, "x");
    const f = run([HELPER, "--arch", file, "--json"]);
    assert.equal(f.status, 0, f.stderr);
    assert.equal(JSON.parse(f.stdout).source, "fallback");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("atxH2 follows the CommonMark ATX rules, one case per rule (C2-CR-1)", () => {
  // [line, expected]: null = not an H2; "" = an empty H2 (a heading, never an axis).
  const cases = [
    ["## foo", "foo"],
    ["   ## foo", "foo"], // up to 3 leading spaces
    ["    ## foo", null], // 4 is an indented code block
    ["##\tfoo", "foo"], // a tab separates
    ["##foo", null], // no separator: not a heading
    ["### foo", null], // level 3
    ["# foo", null], // level 1
    ["##", ""], // bare marker: an empty heading
    ["##  ", ""],
    ["##\t\t", ""],
    ["## #", ""], // a closing sequence that is the whole content
    ["## ##", ""],
    ["## foo ##", "foo"], // closing sequence stripped
    ["## foo ##   ", "foo"],
    ["## foo#", "foo#"], // no space before the run: content, not a closing sequence
    ["##   foo   ", "foo"], // surrounding whitespace is not content
  ];
  for (const [line, want] of cases) {
    assert.equal(atxH2(line), want, `atxH2(${JSON.stringify(line)})`);
  }
  // Every empty form is dropped: a file of empty headings is absent → fallback.
  const r = deriveAxes({
    archDir: "x",
    readFile: () => "##  \n##\t\t\n## #\n## ##\n##\n",
  });
  assert.equal(r.source, "fallback");
  assert.deepEqual(r.domains, [...FALLBACK_DOMAINS]);
});

test("CommonMark H2 forms: up to 3 leading spaces and a tab are headings (CR-3)", () => {
  const r = deriveAxes({
    archDir: "x",
    readFile: () =>
      "   ## Indented three\n##\tTabbed\n## Closed ##\n    ## four spaces is code\n##NoSpace\n###  H3\n",
  });
  assert.deepEqual(r.axes, ["Indented three", "Tabbed", "Closed"]);
});

test("CLI: --json prints the result shape and exits 0", () => {
  const r = run([HELPER, "--arch", ARCH, "--json"]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.deepEqual(Object.keys(out).sort(), [
    "axes",
    "domains",
    "read",
    "reason",
    "source",
  ]);
  assert.equal(out.reason, "architecture");
  assert.ok(out.read.length <= 2);
});

// Spawned concurrently: four serial node start-ups were most of this file's
// one-second budget (SC8).
function runAsync(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, args, (err, stdout, stderr) =>
      resolve({ status: err ? err.code : 0, stdout, stderr }),
    );
  });
}

test("CLI: a usage error exits 2 with nothing on stdout", async () => {
  const cases = [["--bogus"], [], ["--arch"], ["--arch", "--json"]];
  const results = await Promise.all(cases.map((a) => runAsync([HELPER, ...a])));
  results.forEach((r, i) => {
    const args = JSON.stringify(cases[i]);
    assert.equal(r.status, 2, `args ${args}: ${r.stdout}`);
    assert.equal(r.stdout, "", `args ${args} wrote stdout`);
    assert.match(r.stderr, /usage: prepass-axes\.js --arch <dir>/);
  });
});

test("CLI: runs through a symlinked directory (obs #126 guard class)", () => {
  const dir = tmp();
  try {
    const link = join(dir, "res");
    symlinkSync(RES, link, "dir");
    const r = run([join(link, "prepass-axes.js"), "--arch", ARCH, "--json"]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).source, "architecture");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── Prompt files ─────────────────────────────────────────────────────────────

const PROMPTS = [
  join(RES, "review-task-prepass-prompts.md"),
  join(RES, "review-story-prepass-prompts.md"),
];

// Heading-bounded, fences NOT skipped: the template is itself fenced.
function agentB(file) {
  const text = readFileSync(file, "utf8");
  const start = text.indexOf("\n## Agent B");
  assert.ok(start !== -1, `${file}: no "## Agent B" section`);
  const end = text.indexOf("\n## ", start + 1);
  return text.slice(start, end === -1 ? undefined : end);
}

test("both prompt files: Agent B carries the slots and axes_checked, no web-stack list", () => {
  for (const file of PROMPTS) {
    const b = agentB(file);
    for (const needle of ["{arch_domains}", "{arch_axes}", "axes_checked"]) {
      assert.ok(b.includes(needle), `${file}: Agent B lacks ${needle}`);
    }
    assert.doesNotMatch(b, /payments|real-time/, `${file}: web-stack literal`);
  }
});

test("both prompt files: Agent B's numbered axis lines are identical", () => {
  const axes = PROMPTS.map((f) =>
    (agentB(f).match(/^\d\. .*/gm) || []).map((l) =>
      l.replace(/\b(task|story)('s)?\b/g, "X"),
    ),
  );
  assert.equal(axes[0].length, 4, `axis lines: ${axes[0]}`);
  assert.deepEqual(axes[0], axes[1]);
});

test("both prompt files: schema validation requires axes_checked for an aligned B", () => {
  for (const file of PROMPTS) {
    const text = readFileSync(file, "utf8");
    const i = text.indexOf("### Summary schema validation");
    assert.ok(i !== -1, `${file}: no schema-validation section`);
    assert.match(
      text.slice(i),
      /An `alignment: aligned` whose `axes_checked` is missing or empty is\s+a \*\*failed\*\* agent/,
      `${file}: validation does not fail an aligned B without axes_checked`,
    );
  }
});

// ── Dispatch sites ───────────────────────────────────────────────────────────

function section(rel, heading) {
  const text = readFileSync(join(ROOT, rel), "utf8");
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trimEnd() === heading);
  if (start === -1) return null;
  const level = heading.match(/^#+/)[0].length;
  const out = [];
  let fenced = false;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*(```|~~~)/.test(lines[i])) fenced = !fenced;
    const h = !fenced && lines[i].match(/^(#+)\s/);
    if (h && h[1].length <= level) break;
    out.push(lines[i]);
  }
  return out.join("\n");
}

test("dispatch sites: review-task Phase 1.5 and review-story Step 1 run the helper", () => {
  const rt = section(
    "skills/review-task/SKILL.md",
    "### Phase 1.5: Pre-pass (2 Parallel Explore Subagents)",
  );
  const rs = section(
    "skills/review-story/SKILL.md",
    "### Step 1: Context Discovery and Parallel Pre-pass Execution",
  );
  assert.ok(rt, "review-task Phase 1.5 heading not found");
  assert.ok(rs, "review-story Step 1 heading not found");
  assert.match(rt, /prepass-axes\.js/, "review-task Phase 1.5 names no helper");
  assert.match(
    rt,
    /axes_checked/,
    "review-task Phase 1.5 states no axes_checked rule",
  );
  assert.match(
    rs,
    /review-story-prepass-prompts\.md/,
    "review-story Step 1 does not dispatch from its prompt file",
  );
  assert.match(rs, /prepass-axes\.js/, "review-story Step 1 names no helper");
  assert.match(
    rs,
    /axes_checked/,
    "review-story Step 1 states no axes_checked rule",
  );
});
