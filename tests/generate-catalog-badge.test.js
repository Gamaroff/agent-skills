"use strict";
/**
 * generate_catalog.py owns the README skills badge (task.120).
 *
 * The badge in README.md — `skills-<N>-brightgreen` — was a hand-typed number
 * the catalog generator never touched: one behind before task.110, two behind
 * after it, and nothing checked it because validate.yml diffed only the catalog.
 * These tests run the REAL generator against a fixture skills tree and a fixture
 * README and assert on the files it writes, so the mechanism — not the source
 * text — is what is proven. `--readme <fixture>` keeps the repo's own README out
 * of every case; `--no-readme` is the opt-out for a consumer that generates its
 * own.
 *
 * Mutation: comment out the `update_readme_badge(...)` call in `main()` → the
 * first test goes red.
 */

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const GENERATOR = path.join(
  REPO_ROOT,
  "skills",
  "create-skill",
  "scripts",
  "generate_catalog.py",
);

const BADGE_LINE = (n) =>
  `[![Skills](https://img.shields.io/badge/skills-${n}-brightgreen)](#skill-catalog)`;

/** A throwaway skills tree with `count` minimal skills, plus a scratch dir. */
function makeFixture(t, count) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-skills-badge-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const skills = path.join(dir, "skills");
  for (let i = 1; i <= count; i++) {
    const s = path.join(skills, `skill-${i}`);
    fs.mkdirSync(s, { recursive: true });
    fs.writeFileSync(
      path.join(s, "SKILL.md"),
      `---\nname: skill-${i}\ndescription: Fixture skill ${i}.\n---\n\n# skill-${i}\n`,
    );
  }
  return { dir, skills, catalog: path.join(dir, "catalog.md") };
}

function runGenerator(args) {
  const r = spawnSync("python3", [GENERATOR, ...args], { encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

test("a stale badge is rewritten to the catalog count", (t) => {
  const f = makeFixture(t, 3);
  const readme = path.join(f.dir, "README.md");
  // The prose mention sits BEFORE the badge so an unanchored `skills-\d+-`
  // regex (count=1) would rewrite the prose and leave the badge stale.
  fs.writeFileSync(
    readme,
    `# Title\n\nProse that says skills-126- must stay.\n\n${BADGE_LINE(126)}\n`,
  );
  const r = runGenerator([f.skills, f.catalog, "--readme", readme]);
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(readme, "utf8");
  assert.ok(after.includes(BADGE_LINE(3)), `badge not rewritten:\n${after}`);
  assert.ok(
    after.includes("Prose that says skills-126- must stay."),
    "only the shields.io badge is rewritten — prose is never touched",
  );
  assert.match(r.stdout, /README badge → 3/);
  // The catalog is still written with the same total.
  assert.match(
    fs.readFileSync(f.catalog, "utf8"),
    /Categorized index of all 3 skills/,
  );
});

test("the prose skill count beside the badge is generated too; unrelated numbers are not", (t) => {
  // task.120 QA-1: README.md:7 read "126 skills covering …" two lines below a
  // badge that had just been regenerated to 128. Both counts come from `total`.
  const f = makeFixture(t, 4);
  const readme = path.join(f.dir, "README.md");
  fs.writeFileSync(
    readme,
    `${BADGE_LINE(126)}\n\nA library of skills. 126 skills covering QA and more. Tested on 3 platforms since 2024.\n`,
  );
  const r = runGenerator([f.skills, f.catalog, "--readme", readme]);
  assert.equal(r.status, 0, r.stderr);
  const after = fs.readFileSync(readme, "utf8");
  assert.ok(after.includes(BADGE_LINE(4)), `badge not rewritten:\n${after}`);
  assert.ok(
    after.includes("4 skills covering QA"),
    `prose count not rewritten:\n${after}`,
  );
  assert.ok(
    after.includes("Tested on 3 platforms since 2024."),
    "only the '<N> skills covering' phrase is rewritten — other numbers are untouched",
  );
  assert.match(r.stdout, /README badge \+ prose count → 4/);
});

test("a README with the badge but no prose count is rewritten at the badge only", (t) => {
  const f = makeFixture(t, 2);
  const readme = path.join(f.dir, "README.md");
  fs.writeFileSync(readme, `${BADGE_LINE(9)}\n\nNo count sentence here.\n`);
  const r = runGenerator([f.skills, f.catalog, "--readme", readme]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.readFileSync(readme, "utf8").includes(BADGE_LINE(2)));
  assert.match(r.stdout, /README badge → 2/);
});

test("a stale badge beside an already-current prose count is labelled a badge-only rewrite", (t) => {
  // task.120 CR-4: the label must say what changed, not what matched.
  const f = makeFixture(t, 3);
  const readme = path.join(f.dir, "README.md");
  fs.writeFileSync(readme, `${BADGE_LINE(1)}\n\n3 skills covering QA.\n`);
  const r = runGenerator([f.skills, f.catalog, "--readme", readme]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /README badge → 3/);
  assert.doesNotMatch(r.stdout, /prose count/);
});

test("a README without the badge line is left untouched, with a warning, exit 0", (t) => {
  const f = makeFixture(t, 2);
  const readme = path.join(f.dir, "README.md");
  const original = "# No badge here\n\nJust prose.\n";
  fs.writeFileSync(readme, original);
  const r = runGenerator([f.skills, f.catalog, "--readme", readme]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(readme, "utf8"), original);
  assert.match(r.stderr, /no skills badge line found — left untouched/);
});

test("--no-readme skips the rewrite even when the badge is stale", (t) => {
  const f = makeFixture(t, 2);
  const readme = path.join(f.dir, "README.md");
  fs.writeFileSync(readme, `${BADGE_LINE(999)}\n`);
  const r = runGenerator([
    f.skills,
    f.catalog,
    "--readme",
    readme,
    "--no-readme",
  ]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(fs.readFileSync(readme, "utf8"), `${BADGE_LINE(999)}\n`);
  assert.doesNotMatch(r.stdout, /README badge/);
});

test("an already-current badge is reported, not rewritten (no spurious diff)", (t) => {
  const f = makeFixture(t, 2);
  const readme = path.join(f.dir, "README.md");
  fs.writeFileSync(readme, `${BADGE_LINE(2)}\n`);
  const before = fs.statSync(readme).mtimeMs;
  const r = runGenerator([f.skills, f.catalog, "--readme", readme]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /README badge already reads skills-2/);
  assert.equal(
    fs.statSync(readme).mtimeMs,
    before,
    "file must not be rewritten",
  );
});

test("the repo's own README and catalog are current (the CI no-diff check, run locally)", () => {
  // The badge in README.md is generated; a hand-bump is exactly what this
  // proves unnecessary. Run against the real tree but write to scratch copies,
  // then compare — this never modifies the working tree.
  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "agent-skills-badge-real-"),
  );
  try {
    const readme = path.join(tmp, "README.md");
    const catalog = path.join(tmp, "catalog.md");
    fs.copyFileSync(path.join(REPO_ROOT, "README.md"), readme);
    const r = runGenerator([
      path.join(REPO_ROOT, "skills"),
      catalog,
      "--readme",
      readme,
    ]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      fs.readFileSync(readme, "utf8"),
      fs.readFileSync(path.join(REPO_ROOT, "README.md"), "utf8"),
      "README badge is behind the catalog — run `npm run generate-catalog` and commit",
    );
    assert.equal(
      fs.readFileSync(catalog, "utf8"),
      fs.readFileSync(
        path.join(REPO_ROOT, "docs", "reference", "skill-catalog.md"),
        "utf8",
      ),
      "skill catalog is stale — run `npm run generate-catalog` and commit",
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
