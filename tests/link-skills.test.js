"use strict";
/**
 * `scripts/link-skills.sh` — the `prepare` step that creates the gitignored
 * `.agents/skills -> ../skills` and `.claude/skills -> ../.agents/skills` links
 * in a contributor checkout.
 *
 * The CI skip is the property that matters most: `npm ci` runs `prepare`, and a
 * CI checkout that grew the links would pass a test reaching `.agents/skills/…`
 * from the repository root — the obs #149 failure test-clean-checkout exists to
 * catch. The other cases pin that the script never replaces what it finds and
 * never fails `npm install`.
 *
 * Each test copies the real script into a throwaway root, so the links are made
 * there and never in this repository.
 *
 * Run: node --test tests/link-skills.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const SCRIPT = path.resolve(__dirname, "..", "scripts", "link-skills.sh");

function root(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "link-skills-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.mkdirSync(path.join(dir, "skills", "demo"), { recursive: true });
  fs.writeFileSync(path.join(dir, "skills", "demo", "SKILL.md"), "demo\n");
  fs.copyFileSync(SCRIPT, path.join(dir, "scripts", "link-skills.sh"));
  return dir;
}

function run(dir, env = {}) {
  const base = { ...process.env };
  delete base.CI;
  return spawnSync("bash", [path.join(dir, "scripts", "link-skills.sh")], {
    cwd: os.tmpdir(),
    env: { ...base, ...env },
    encoding: "utf-8",
  });
}

const agents = (dir) => path.join(dir, ".agents", "skills");
const claude = (dir) => path.join(dir, ".claude", "skills");

test("creates both links when absent, and the chain resolves to skills/", (t) => {
  const dir = root(t);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readlinkSync(agents(dir)), "../skills");
  assert.equal(fs.readlinkSync(claude(dir)), "../.agents/skills");
  assert.equal(
    fs.readFileSync(path.join(claude(dir), "demo", "SKILL.md"), "utf-8"),
    "demo\n",
  );
});

test("is idempotent on correct links", (t) => {
  const dir = root(t);
  run(dir);
  const r = run(dir);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "");
  assert.equal(fs.readlinkSync(agents(dir)), "../skills");
  assert.equal(fs.readlinkSync(claude(dir)), "../.agents/skills");
});

test("skips when CI is set, creating nothing", (t) => {
  const dir = root(t);
  const r = run(dir, { CI: "true" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /CI is set/);
  assert.equal(fs.existsSync(path.join(dir, ".agents")), false);
  assert.equal(fs.existsSync(path.join(dir, ".claude")), false);
});

test("leaves a real directory alone, still creates the other link, exits 0", (t) => {
  const dir = root(t);
  fs.mkdirSync(claude(dir), { recursive: true });
  fs.writeFileSync(path.join(claude(dir), "keep.txt"), "x\n");
  const r = run(dir);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /\.claude\/skills .*left alone/);
  assert.equal(fs.lstatSync(claude(dir)).isSymbolicLink(), false);
  assert.equal(fs.existsSync(path.join(claude(dir), "keep.txt")), true);
  assert.equal(fs.readlinkSync(agents(dir)), "../skills");
});

test("leaves a link to somewhere else alone", (t) => {
  const dir = root(t);
  fs.mkdirSync(path.join(dir, ".agents"));
  fs.symlinkSync("../elsewhere", agents(dir));
  const r = run(dir);
  assert.equal(r.status, 0);
  assert.match(r.stderr, /\.agents\/skills .*left alone/);
  assert.equal(fs.readlinkSync(agents(dir)), "../elsewhere");
});
