"use strict";
/**
 * Bundle missing-source guard — a `shared/resources/<name>` citation that names
 * no file is reported against the file and line that cited it, and the live
 * tree carries none.
 *
 * WHY THIS EXISTS
 * ---------------
 * `bundle_skill.py` follows every `shared/resources/<name>` it reads and, when
 * the name resolves to nothing, prints a warning and carries on. Before task 154
 * that warning read `⚠️  shared/resources/<name> not found` and named no origin,
 * and `--check` still exited 0 beneath it. It fired on every `npm run bundle` —
 * so on every pre-commit run — from a placeholder literal in
 * `observation-log-contract.md`, and eleven task reports recorded it as
 * "pre-existing" instead of fixing it (obs #151). A warning that fires on every
 * run and names nothing is background noise; a warning with no reader in CI is
 * optional.
 *
 * Task 154 removed the literal, made the warning name `<file>:<line>`, and
 * added this test as its reader. Same shape as tests/bundle-comment-origin.test.js:
 *   §1 FIXTURE — a throwaway repo whose shared source cites a missing file makes
 *      the bundler name that file and line, exactly once even when two skills
 *      reach it; the citation rephrased in words produces no warning; and the
 *      line-aware collector agrees with quick_validate.collect_shared_refs.
 *   §2 LIVE TREE — `bundle_skill.py --check` prints no missing-source warning,
 *      over a floor of skills checked so an empty run cannot pass.
 *
 * Deterministic and fast — runs every push via `npm test` (tests/*.test.js).
 * Run: node --test tests/bundle-missing-source.test.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const SCRIPTS = path.join(REPO_ROOT, "skills", "create-skill", "scripts");
const BUNDLER = path.join(SCRIPTS, "bundle_skill.py");

/**
 * The missing-source warning, and only it. `bundle_skill.py` also prints
 * `❌ SKILL.md not found in …` (a usage failure), which a bare /not found/
 * would count here and report as this test's failure.
 */
const MISSING_RE = /^⚠️ {2}shared\/resources\/.* not found/;

/** Non-vacuity floor for §2 — 129 skills at authoring time (2026-09-28). */
const MIN_SKILLS = 100;

/**
 * What §2 reads from `--check` output, and nothing else. `check_all` prints a
 * different summary line on the clean path (`✅ bundle freshness: N skill(s)
 * checked`) and on the problem path (`❌ bundle freshness: P problem(s) across M
 * skill(s)`), so the reader requires *a* summary line — proof the run finished —
 * without depending on which one. Freshness is bundle-check-mode.test.js's and
 * CI's bundle:check's to judge; a stale copy must not turn this test red
 * (task 154 QA cycle 1, TASK-154-BUG-2).
 */
function readCheckOutput(stdout) {
  return {
    missing: stdout.split("\n").filter((l) => MISSING_RE.test(l)),
    completed: /^(✅|❌) bundle freshness: /m.test(stdout),
  };
}

/** The skills `--check` with no target walks: every skills/<d>/SKILL.md (bundle_skill.py main()). */
function liveSkillCount() {
  const skills = path.join(REPO_ROOT, "skills");
  return fs
    .readdirSync(skills)
    .filter((d) => fs.existsSync(path.join(skills, d, "SKILL.md"))).length;
}

/** A skill that cites `shared/resources/a.md`, which in turn cites line 3's target. */
function skillMd(name) {
  return `---\nname: ${name}\ndescription: fixture\n---\n\n# Fixture\n\nSee shared/resources/a.md.\n`;
}

/**
 * Build a fixture repo with `skillNames` skills, each citing `a.md`, and bundle
 * all of them in ONE bundler invocation — so the per-run dedupe is what is
 * measured, not a fresh process per skill.
 */
function bundleFixture({ aMd, skillNames = ["fx"] }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bundle-missing-source-"));
  fs.mkdirSync(path.join(root, "shared", "resources"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"fixture"}\n');
  fs.writeFileSync(path.join(root, "shared", "resources", "a.md"), aMd);
  const dirs = skillNames.map((n) => {
    const d = path.join(root, "skills", n);
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "SKILL.md"), skillMd(n));
    return d;
  });
  const stdout = execFileSync("python3", [BUNDLER, ...dirs], {
    encoding: "utf-8",
  });
  return {
    stdout,
    missing: stdout.split("\n").filter((l) => MISSING_RE.test(l)),
    bundled: (skill, rel) =>
      fs.existsSync(path.join(root, "skills", skill, "references", rel)),
    skillDir: (skill) => path.join(root, "skills", skill),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

const A_MD_CITING_MISSING = [
  "# a",
  "",
  "The schema lives in shared/resources/missing.md, which does not exist.",
  "",
].join("\n");

const A_MD_IN_WORDS = [
  "# a",
  "",
  "The schema lives in the shared-resources directory, in a file that does not exist.",
  "",
].join("\n");

test("§1a a missing shared source is reported against the file and line that cited it", () => {
  const fx = bundleFixture({ aMd: A_MD_CITING_MISSING });
  try {
    assert.equal(
      fx.missing.length,
      1,
      `expected exactly one missing-source warning, got:\n${fx.stdout}`,
    );
    assert.equal(
      fx.missing[0],
      "⚠️  shared/resources/missing.md not found — cited at shared/resources/a.md:3",
    );
    // The citing source is still bundled — the warning names the gap, it does not refuse the file.
    assert.ok(fx.bundled("fx", "a.md"), "a.md should still be bundled");
  } finally {
    fx.cleanup();
  }
});

test("§1b two skills reaching the same missing citation in one run print it once", () => {
  const fx = bundleFixture({
    aMd: A_MD_CITING_MISSING,
    skillNames: ["fx-one", "fx-two"],
  });
  try {
    assert.ok(fx.bundled("fx-one", "a.md") && fx.bundled("fx-two", "a.md"));
    assert.equal(
      fx.missing.length,
      1,
      `the per-run dedupe should print one line for two skills, got:\n${fx.stdout}`,
    );
  } finally {
    fx.cleanup();
  }
});

test("§1c the same citation described in words produces no warning", () => {
  const fx = bundleFixture({ aMd: A_MD_IN_WORDS });
  try {
    assert.deepEqual(fx.missing, [], `unexpected warning:\n${fx.stdout}`);
    assert.ok(fx.bundled("fx", "a.md"));
  } finally {
    fx.cleanup();
  }
});

test("§1d the line-aware collector names what collect_shared_refs names", () => {
  // Every shape the collector has to agree on: plain, trailing punctuation, a
  // `../`-prefixed path, a brace placeholder, two on one line, and an absolute
  // URL that must NOT match.
  const text = [
    "See shared/resources/one.md.",
    "and `shared/resources/{name}` too",
    "../shared/resources/two.js, shared/resources/three.sh;",
    "https://github.com/o/r/blob/develop/shared/resources/url.md",
    "shared/resources/.",
  ].join("\n");
  const py = [
    "import json, sys",
    `sys.path.insert(0, ${JSON.stringify(SCRIPTS)})`,
    "from quick_validate import collect_shared_refs",
    "from bundle_skill import shared_refs_with_lines",
    "t = sys.stdin.read()",
    "print(json.dumps({'names': collect_shared_refs(t), 'lines': shared_refs_with_lines(t)}))",
  ].join("\n");
  const out = JSON.parse(
    execFileSync("python3", ["-c", py], { input: text, encoding: "utf-8" }),
  );
  assert.deepEqual(
    out.lines.map(([, name]) => name),
    out.names,
    "shared_refs_with_lines must name exactly what collect_shared_refs names",
  );
  assert.deepEqual(out.lines, [
    [1, "one.md"],
    [2, "{name}"],
    [3, "two.js"],
    [3, "three.sh"],
  ]);
});

test("§1e the §2 reader tolerates a stale copy — it reads the warning, not freshness", () => {
  const fx = bundleFixture({ aMd: A_MD_IN_WORDS });
  try {
    // Make the bundled copy stale, then --check that one skill.
    fs.appendFileSync(
      path.join(fx.skillDir("fx"), "references", "a.md"),
      "drift\n",
    );
    const r = spawnSync("python3", [BUNDLER, "--check", fx.skillDir("fx")], {
      encoding: "utf-8",
    });
    assert.notEqual(
      r.status,
      0,
      `premise: --check should fail on a stale copy:\n${r.stdout}`,
    );
    assert.match(
      r.stdout,
      /STALE/,
      "premise: the failure should be the stale copy",
    );
    assert.deepEqual(readCheckOutput(r.stdout), {
      missing: [],
      completed: true,
    });
  } finally {
    fx.cleanup();
  }
});

test("§2 the live tree carries no citation of a missing shared source", () => {
  // spawnSync, not execFileSync: `--check` also exits non-zero on a STALE copy,
  // and a throw there would turn this test red for a reason that is not its own
  // (bundle-check-mode.test.js and CI's bundle:check own freshness). This test
  // reads the warning whatever the exit status.
  const { stdout } = spawnSync("python3", [BUNDLER, "--check"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  const { missing, completed } = readCheckOutput(stdout);
  assert.deepEqual(
    missing,
    [],
    "a shared/resources/ citation names no file — rephrase it in words, or fix the name. " +
      "Inside shared/resources/ such a literal is a bundling instruction (create-skill § " +
      '"Inside shared/resources/, a shared/resources/ literal is a bundling instruction").',
  );
  assert.ok(completed, `--check did not finish (no summary line):\n${stdout}`);
  const n = liveSkillCount();
  assert.ok(
    n >= MIN_SKILLS,
    `only ${n} skill(s) for --check to walk — expected at least ${MIN_SKILLS}; the scan is vacuous`,
  );
});
