/**
 * Asserts that CI and the pipeline's quality gate run the same set of commands.
 *
 * WHY THIS EXISTS
 * ---------------
 * The gate exists so a local green predicts a CI green. Until 2026-09-01 it did
 * not: `.github/workflows/test.yml` ran three commands and
 * `developNext.qualityGateCommand` defaulted to one of them, so two of the three
 * never executed anywhere before a PR was merged. On task 67 that shipped a red
 * build — `prettier --check` flagged two new files after `/finalise` had already
 * accepted the task — and `eval:all` had never run locally at any step of any
 * pipeline. It passed in CI, which is the only reason nobody noticed.
 *
 * The fix was one composite (`npm run ci`) that both sides call. A composite only
 * holds while nothing drifts out of it, and both drifts are silent:
 *
 *   1. **A step added to the workflow but not the composite** is a gate the
 *      pipeline cannot see — exactly the original defect, re-created one step at
 *      a time. Nothing fails; the pipeline simply stops predicting CI.
 *   2. **A member dropped from the composite** weakens the gate without weakening
 *      CI, so the divergence reappears from the other direction.
 *
 * Set equality in both directions is what closes that, which is why the
 * assertion is `deepEqual` on sorted sets and not a pair of `includes` checks.
 *
 * The tiering invariant is held here too: `ci:fast` — what the develop loop and
 * each qa-fix cycle run — must NOT contain the slow tier. That is not a
 * performance nicety. Paying the end-to-end evals on every loop iteration is what
 * would make the correct fix feel expensive enough to be reverted, and a gate
 * people route around is a gate that does not exist.
 *
 * Run: node --test evals/shared/tests/ci-gate-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const read = (p) => readFileSync(join(repoRoot, p), "utf-8");

const scripts = JSON.parse(read("package.json")).scripts;
const workflow = read(".github/workflows/test.yml");

/** The composite that is the definition of "green". */
const FULL_GATE = "ci";
/** The tier the develop loop and each qa-fix cycle run. */
const FAST_GATE = "ci:fast";
/** The workflow job that defines "green". Other jobs are deliberately not read. */
const TEST_JOB = "test";

// ---------------------------------------------------------------------------
// Resolving an `npm run …` term to the script it names.
//
// `npm test` is npm's alias for `npm run test`, so it resolves. `npm ci` is
// npm's INSTALL command and resolves to nothing — the workflow runs it, and
// reading it as the `ci` script would make the composite appear to contain
// itself. That collision is the reason this is a named function with its own
// test rather than an inline regex.
// ---------------------------------------------------------------------------
/** @returns {string|null} the script name a shell term invokes, or null. */
function scriptInvokedBy(term) {
  const t = term.trim();
  const runMatch = t.match(/^npm run ([A-Za-z0-9:_-]+)$/);
  if (runMatch) return runMatch[1];
  if (t === "npm test" || t === "npm run test") return "test";
  return null;
}

/**
 * A script is a *composite* when its body is nothing but `&&`-joined terms that
 * each name another script. Anything else — a shell loop, a bare binary, a term
 * naming no script — makes it a leaf, and a leaf is what the workflow and the
 * composite are compared on.
 */
function isComposite(name) {
  const body = scripts[name];
  if (!body) return false;
  const terms = body.split("&&");
  if (terms.length < 2) return false;
  return terms.every((term) => {
    const target = scriptInvokedBy(term);
    return target !== null && target !== name && target in scripts;
  });
}

/** Expand a composite to the set of leaf scripts it ultimately runs. */
function expand(name, seen = new Set()) {
  if (seen.has(name)) return []; // cycle guard — a self-referential script
  seen.add(name);
  if (!isComposite(name)) return [name];
  return scripts[name]
    .split("&&")
    .flatMap((term) => expand(scriptInvokedBy(term), seen));
}

/**
 * Every npm script the workflow's `test` job runs, in order.
 *
 * Deliberately parsed off the `run:` lines rather than with a YAML library: the
 * thing under test is which commands the file actually executes, and a parse
 * that quietly normalises the file away from what a reader sees is the wrong
 * instrument for that.
 */
function workflowScripts() {
  return workflowInvocations().filter((name) => name in scripts);
}

/**
 * The raw text of one job's block, from its key to the next key at the same
 * indent (or EOF).
 *
 * The parity check is about the job that defines "green", so it must read that
 * job and no other. Scanning the whole file coincides with the right answer
 * only while the file holds a single job: add a lint lane, a coverage lane or a
 * matrix build that invokes any npm script, and a whole-file scan would demand
 * the `ci` composite contain that script too — failing on a workflow CI itself
 * is perfectly happy with, which inverts the test's purpose. It exists to
 * predict CI, so it must never block a merge CI would pass.
 */
function jobBlock(jobName) {
  const lines = workflow.split("\n");
  const start = lines.findIndex((l) =>
    new RegExp(`^  ${jobName}:\\s*$`).test(l),
  );
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^  \S/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/**
 * Every npm script NAME the `test` job invokes, including any that
 * `package.json` does not define. `workflowScripts()` drops those so the parity
 * comparison stays a comparison of real scripts; this raw form is what lets the
 * test REPORT them instead of silently ignoring them.
 */
function workflowInvocations() {
  const block = jobBlock(TEST_JOB);
  if (block === null) return [];
  return block
    .split("\n")
    .map((line) => line.match(/^\s*run:\s*(.+?)\s*$/))
    .filter(Boolean)
    .map((m) => scriptInvokedBy(m[1]))
    .filter((name) => name !== null);
}

const sorted = (xs) => [...new Set(xs)].sort();

// ---------------------------------------------------------------------------

test("the `ci` composite exists and is the definition of green", () => {
  assert.ok(scripts[FULL_GATE], "package.json must define a `ci` script");
  assert.ok(scripts[FAST_GATE], "package.json must define a `ci:fast` script");
  assert.ok(
    isComposite(FULL_GATE),
    "`ci` must compose other scripts, not restate their commands — a second " +
      "copy of a command list is how the two lists start disagreeing",
  );
});

test("the `test` job is found, and only its steps are read", () => {
  const block = jobBlock(TEST_JOB);
  assert.ok(
    block !== null,
    `test.yml defines no \`${TEST_JOB}:\` job — the parity check would silently ` +
      "compare against an empty set and pass no matter what the composite held",
  );
  // A second job's steps must not leak into the comparison.
  const wholeFile = workflow
    .split("\n")
    .filter((l) => /^\s*run:\s/.test(l)).length;
  const inJob = block.split("\n").filter((l) => /^\s*run:\s/.test(l)).length;
  assert.ok(
    inJob <= wholeFile,
    "job block cannot contain more run: steps than the file",
  );
});

test("`npm ci` in the workflow is the installer, never the `ci` script", () => {
  // The workflow runs `npm ci` to install. If that were read as the `ci`
  // script the parity check below would compare the composite against itself
  // and pass no matter how far the two had drifted.
  assert.equal(scriptInvokedBy("npm ci"), null);
  assert.equal(scriptInvokedBy("npm run ci"), "ci");
  assert.equal(scriptInvokedBy("npm test"), "test");
});

test("workflow steps and the `ci` composite run exactly the same commands", () => {
  const fromWorkflow = sorted(workflowScripts());
  const fromComposite = sorted(expand(FULL_GATE));

  assert.deepEqual(
    fromComposite,
    fromWorkflow,
    `The CI workflow and the \`${FULL_GATE}\` composite have diverged.\n` +
      `  workflow runs:  ${fromWorkflow.join(", ") || "(nothing)"}\n` +
      `  ${FULL_GATE} runs:        ${fromComposite.join(", ") || "(nothing)"}\n` +
      "A step in one and not the other is a gate the pipeline cannot see, " +
      "which is the defect task 75 exists to close. Add it to both.",
  );
  assert.ok(fromWorkflow.length >= 3, "expected at least three CI tiers");
});

test("every npm script the workflow invokes actually exists", () => {
  // Without this, an `npm run <typo>` step is filtered out of the parity
  // comparison and the composite still matches — the workflow would go red in
  // CI while the test that exists to predict CI stayed green.
  const missing = workflowInvocations().filter((name) => !(name in scripts));
  assert.deepEqual(
    missing,
    [],
    `workflow invokes npm script(s) absent from package.json: ${missing.join(", ")}`,
  );
});

test("CI still names each tier separately, so a red build says which broke", () => {
  // Collapsing the workflow into one opaque `npm run ci` step would satisfy the
  // parity check above and make every failure read the same. Keep the names.
  for (const name of [
    "Formatting",
    "Hermetic test suite",
    "End-to-end replay evals",
  ]) {
    assert.ok(
      workflow.includes(`name: ${name}`),
      `workflow must keep the separately named step "${name}"`,
    );
  }
});

test("`ci:fast` is a strict subset of `ci`, and excludes the slow tier", () => {
  const fast = expand(FAST_GATE);
  const full = expand(FULL_GATE);

  for (const s of fast) {
    assert.ok(
      full.includes(s),
      `\`${FAST_GATE}\` runs \`${s}\`, which \`${FULL_GATE}\` does not`,
    );
  }
  assert.ok(
    fast.length < full.length,
    "`ci:fast` must be cheaper than `ci` — if they run the same set there is " +
      "no fast tier, and the develop loop pays the full gate every iteration",
  );
  assert.ok(
    fast.includes("format:check"),
    "`ci:fast` must include formatting — its absence from the loop is the " +
      "specific thing that shipped the task-67 red build",
  );
});

test("both orchestrators document the same default, and it names the composite", () => {
  // develop-batch reads `developNext.qualityGateCommand` for its own per-item
  // merge gate, so a stale table there means two sibling orchestrators document
  // different defaults for one key.
  for (const p of [
    "skills/develop-next/SKILL.md",
    "skills/develop-batch/SKILL.md",
  ]) {
    const doc = read(p);
    const row = doc
      .split("\n")
      .find(
        (l) =>
          l.includes("developNext.qualityGateCommand") &&
          l.trimStart().startsWith("|"),
      );
    assert.ok(
      row,
      `${p} must document developNext.qualityGateCommand in its config table`,
    );
    assert.match(
      row,
      new RegExp(`npm run ${FULL_GATE}\\b`),
      `${p} documents a default that is not the \`${FULL_GATE}\` composite:\n  ${row}`,
    );
  }
});

test("the configuration reference documents both gate tiers", () => {
  const configDoc = read("docs/reference/configuration.md");
  assert.match(
    configDoc,
    /`developNext\.qualityGateCommand`[^\n]*npm run ci\b/,
    "configuration.md must give qualityGateCommand the composite as its default",
  );
  assert.match(
    configDoc,
    /`develop\.fastGateCommand`[^\n]*npm run ci:fast\b/,
    "configuration.md must document the fast tier and its default",
  );
});

test("the develop loop and qa-fix cycle name the fast gate, not a literal", () => {
  // These two documents ship verbatim into consumer repos, which have no
  // `ci:fast` script of their own. A hardcoded literal would instruct every
  // downstream project to run a command that does not exist.
  for (const p of [
    "shared/resources/develop-pipeline-step-3-develop-loop.md",
    "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
  ]) {
    const doc = read(p);
    assert.ok(
      doc.includes("<fastGateCommand>"),
      `${p} must invoke <fastGateCommand>`,
    );
    assert.ok(
      doc.includes("develop.fastGateCommand"),
      `${p} must name the config key that fills <fastGateCommand>`,
    );
  }
});
