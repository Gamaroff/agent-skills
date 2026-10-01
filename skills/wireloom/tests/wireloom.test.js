"use strict";
/**
 * wireloom skill — CLI behaviour and grammar-reference integrity.
 * Run: node --test 'skills/wireloom/tests/*.test.js'
 *
 * Hermetic: the real renderer comes from this repository's `wireloom`
 * devDependency through WIRELOOM_MODULE, every run uses a temp cwd and a temp
 * XDG_CACHE_HOME, and every run that could reach the install step passes
 * --no-install. Nothing touches the network or the user's cache.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("child_process");

const SKILL_DIR = path.join(__dirname, "..");
const REPO_ROOT = path.join(SKILL_DIR, "..", "..");
const SCRIPT = path.join(SKILL_DIR, "scripts", "wireloom.js");
const GRAMMAR = path.join(SKILL_DIR, "references", "grammar.md");
const { extractBlocks, PINNED_VERSION } = require(SCRIPT);
// The package exports no ./package.json subpath, so address its directory directly.
const WIRELOOM = path.join(REPO_ROOT, "node_modules", "wireloom");

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "wireloom-test-"));
}

function run(args, { input, env = {}, cwd } = {}) {
  const dir = cwd || tmpdir();
  const res = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: dir,
    input,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: dir,
      XDG_CACHE_HOME: path.join(dir, "cache"),
      WIRELOOM_MODULE: WIRELOOM,
      ...env,
    },
  });
  return { ...res, dir };
}

function runJson(args, opts) {
  const res = run([...args, "--json"], opts);
  return { ...res, json: JSON.parse(res.stdout) };
}

const GOOD = 'window "A":\n  text "hi"\n';
const BAD = 'window:\n  tab "x"\n'; // error on block line 2, col 3
const DOC = [
  "# Doc", //                1
  "", //                     2
  "```wireloom", //          3
  'window "A":', //          4
  '  text "hi"', //          5
  "```", //                  6
  "", //                     7
  "~~~wireloom", //          8
  "window:", //              9
  '  tab "x"', //            10  <- the parse error
  "~~~", //                  11
].join("\n");

// ===========================================================================
// Block extraction
// ===========================================================================
test("extracts backtick and tilde fences with the line their source starts on", () => {
  const blocks = extractBlocks(DOC);
  assert.deepEqual(
    blocks.map((b) => [b.index, b.line]),
    [
      [1, 4],
      [2, 9],
    ],
  );
  assert.equal(blocks[0].source, 'window "A":\n  text "hi"\n');
});

test("a ```wireloom shown inside another fence is an example, not a block", () => {
  const doc = ["````markdown", "```wireloom", "window:", "  nonsense", "```", "````", "", "```wireloom", GOOD, "```"].join("\n");
  const blocks = extractBlocks(doc);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].line, 9);
});

test("an unclosed wireloom fence runs to the end of the document", () => {
  const blocks = extractBlocks("intro\n```wireloom\n" + GOOD);
  assert.equal(blocks.length, 1);
  assert.match(blocks[0].source, /text "hi"/);
});

test("a fenceless file whose first significant line is window is raw source", () => {
  const blocks = extractBlocks("# a comment\n\n" + GOOD);
  assert.deepEqual(blocks.map((b) => b.line), [1]);
});

test("prose with no fence is not raw source", () => {
  assert.deepEqual(extractBlocks("# Title\n\nwindow dressing is nice\n"), []);
});

// ===========================================================================
// check
// ===========================================================================
test("check reports a parse error at the line of the input file, not of the block", () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, "doc.md"), DOC);
  const { status, json } = runJson(["check", "doc.md"], { cwd: dir });
  assert.equal(status, 1);
  assert.equal(json.reason, "parse-error");
  assert.equal(json.blocks[0].ok, true);
  assert.deepEqual(json.blocks[1].error, {
    line: 10,
    column: 3,
    message: '"tab" may only appear inside "tabs"',
  });
});

test("check passes a valid source from stdin and names the package it used", () => {
  const { status, json } = runJson(["check", "-"], { input: GOOD });
  assert.equal(status, 0);
  assert.equal(json.reason, "ok");
  assert.deepEqual(json.package, { from: "env", version: PINNED_VERSION });
});

test("check on prose with no block is no-blocks, exit 1", () => {
  const { status, json } = runJson(["check", "-"], { input: "just words\n" });
  assert.equal(status, 1);
  assert.equal(json.reason, "no-blocks");
});

test("human-readable failure goes to stderr with the file line", () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, "doc.md"), DOC);
  const res = run(["check", "doc.md"], { cwd: dir });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /block 2: line 10, col 3:/);
});

// ===========================================================================
// render
// ===========================================================================
test("render writes one SVG to an explicit .svg path", () => {
  const { status, json, dir } = runJson(["render", "-", "--out", "out/x.svg"], { input: GOOD });
  assert.equal(status, 0);
  const svg = fs.readFileSync(path.join(dir, "out", "x.svg"), "utf8");
  assert.match(svg, /^<svg[\s>]/);
  assert.match(svg, /hi/);
  assert.equal(json.blocks[0].file, "out/x.svg");
});

test("render of a multi-block file numbers the SVGs, and --block picks one", () => {
  const dir = tmpdir();
  const doc = ["```wireloom", GOOD, "```", "```wireloom", 'window "B":\n  text "two"', "```"].join("\n");
  fs.writeFileSync(path.join(dir, "doc.md"), doc);

  assert.equal(run(["render", "doc.md", "--out", "doc.wireframe.svg"], { cwd: dir }).status, 0);
  assert.ok(fs.existsSync(path.join(dir, "doc.wireframe.1.svg")));
  assert.match(fs.readFileSync(path.join(dir, "doc.wireframe.2.svg"), "utf8"), /two/);

  assert.equal(run(["render", "doc.md", "--block", "2", "--out", "only.svg"], { cwd: dir }).status, 0);
  assert.match(fs.readFileSync(path.join(dir, "only.svg"), "utf8"), /two/);
});

test("render into a directory names the SVG after the input", () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, "screen.md"), "```wireloom\n" + GOOD + "```\n");
  assert.equal(run(["render", "screen.md", "--out", "svgs/"], { cwd: dir }).status, 0);
  assert.ok(fs.existsSync(path.join(dir, "svgs", "screen.svg")));
});

test("render writes nothing when any block fails to parse", () => {
  const dir = tmpdir();
  fs.writeFileSync(path.join(dir, "doc.md"), DOC);
  const { status, json } = runJson(["render", "doc.md", "--out", "doc.svg"], { cwd: dir });
  assert.equal(status, 1);
  assert.equal(json.reason, "parse-error");
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith(".svg")), []);
});

test("--theme dark renders a different SVG from the default", () => {
  const light = run(["render", "-", "--out", "l.svg"], { input: GOOD });
  const dark = run(["render", "-", "--out", "d.svg", "--theme", "dark"], { input: GOOD });
  assert.equal(light.status, 0);
  assert.equal(dark.status, 0);
  assert.notEqual(
    fs.readFileSync(path.join(light.dir, "l.svg"), "utf8"),
    fs.readFileSync(path.join(dark.dir, "d.svg"), "utf8"),
  );
});

// ===========================================================================
// Package resolution
// ===========================================================================
test("a WIRELOOM_MODULE that resolves nowhere is unavailable, exit 1", () => {
  const { status, json } = runJson(["ensure"], { env: { WIRELOOM_MODULE: "/nonexistent/wireloom" } });
  assert.equal(status, 1);
  assert.equal(json.reason, "unavailable");
});

test("with no package anywhere and --no-install, ensure is unavailable and names the cache", () => {
  const { status, json, dir } = runJson(["ensure", "--no-install"], { env: { WIRELOOM_MODULE: "" } });
  assert.equal(status, 1);
  assert.equal(json.reason, "unavailable");
  assert.ok(json.error.includes(path.join(dir, "cache", "agent-skills", "wireloom", PINNED_VERSION)));
});

test("WIRELOOM_NO_INSTALL=1 disables the install step like --no-install", () => {
  const { status, json } = runJson(["ensure"], { env: { WIRELOOM_MODULE: "", WIRELOOM_NO_INSTALL: "1" } });
  assert.equal(status, 1);
  assert.equal(json.reason, "unavailable");
});

test("a copy in the cache directory is found without installing", () => {
  const dir = tmpdir();
  const cacheModules = path.join(dir, "cache", "agent-skills", "wireloom", PINNED_VERSION, "node_modules");
  fs.mkdirSync(cacheModules, { recursive: true });
  fs.symlinkSync(WIRELOOM, path.join(cacheModules, "wireloom"), "dir");
  const { status, json } = runJson(["ensure", "--no-install"], { cwd: dir, env: { WIRELOOM_MODULE: "" } });
  assert.equal(status, 0);
  assert.equal(json.package.from, "cache");
});

test("the project's own node_modules wins over the cache", () => {
  const dir = tmpdir();
  fs.mkdirSync(path.join(dir, "node_modules"));
  fs.symlinkSync(WIRELOOM, path.join(dir, "node_modules", "wireloom"), "dir");
  const { status, json } = runJson(["ensure", "--no-install"], { cwd: dir, env: { WIRELOOM_MODULE: "" } });
  assert.equal(status, 0);
  assert.equal(json.package.from, "project");
});

// ===========================================================================
// Usage
// ===========================================================================
for (const [label, args] of [
  ["no command", []],
  ["unknown command", ["draw"]],
  ["unknown flag", ["check", "-", "--fast"]],
  ["render without --out", ["render", "-"]],
  ["bad theme", ["render", "-", "--out", "x.svg", "--theme", "neon"]],
  ["bad --block", ["render", "-", "--out", "x.svg", "--block", "0"]],
  ["--out on check", ["check", "-", "--out", "x.svg"]],
  ["--out not .svg", ["render", "-", "--out", "x.png"]],
  ["missing file", ["check", "nope.md"]],
]) {
  test(`usage: ${label} exits 2 with reason usage`, () => {
    const { status, json } = runJson(args, { input: GOOD });
    assert.equal(status, 2);
    assert.equal(json.reason, "usage");
  });
}

test("usage: --block beyond the block count exits 2", () => {
  const { status, json } = runJson(["render", "-", "--out", "x.svg", "--block", "3"], { input: GOOD });
  assert.equal(status, 2);
  assert.equal(json.reason, "usage");
});

// ===========================================================================
// The grammar reference
// ===========================================================================
test("every ```wireloom example in the grammar reference parses", () => {
  const { status, json } = runJson(["check", GRAMMAR]);
  const failed = (json.blocks || []).filter((b) => !b.ok);
  assert.deepEqual(failed, []);
  assert.equal(status, 0);
  // Non-vacuity: the reference carries dozens of examples; an extractor that
  // stopped matching would otherwise pass on nothing.
  assert.ok(json.blocks.length >= 30, `only ${json.blocks.length} blocks found`);
});

test("the pinned version matches the grammar reference and the repo devDependency", () => {
  const grammar = fs.readFileSync(GRAMMAR, "utf8");
  assert.match(grammar.split("\n")[0], new RegExp(`v${PINNED_VERSION.replace(/\./g, "\\.")}\\b`));
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
  assert.equal(pkg.devDependencies.wireloom, PINNED_VERSION);
});
