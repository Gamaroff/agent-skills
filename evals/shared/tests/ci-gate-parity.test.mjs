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
 * WHICH JOBS DEFINE "GREEN" (task 111)
 * -------------------------------------
 * Until 2026-09-16 this read one job — `test.yml`'s `test` — and the composite
 * matched it. But CI is three workflows, and the other two (`validate.yml`,
 * `shellcheck.yml`) never invoke an npm script: they run `quick_validate.py` in
 * a shell loop, the bundler directly, and the pinned `shellcheck` binary. A
 * one-job reading therefore certified `npm run ci` as CI-equivalent while two
 * of the five lanes had no local form at all — which is the original defect
 * again, one workflow over. `shellcheck.yml`'s header records that it got its
 * own workflow precisely so as not to trip this test, which is the test
 * blocking the parity it exists to guarantee.
 *
 * So every green-defining job is read now, and each `run:` step in them must
 * be one of exactly four things:
 *
 *   1. an `npm run <script>` — counted, as before;
 *   2. a step whose `name:` is in LANE_TWINS — the named npm script is what
 *      reproduces it locally, and is counted in its place;
 *   3. a step whose `name:` is in SETUP_STEPS — environment setup, not a gate;
 *   4. a step whose `name:` is in EXCLUDED_STEPS — deliberately not mirrored,
 *      with the reason written down beside it.
 *
 * A step that is none of the four FAILS THE TEST, naming the workflow, job and
 * step. That is the "lane added to CI but not the composite" drift, now caught
 * on all three workflows rather than one. The twin map is keyed on step names
 * and every key is asserted to exist in some green job, so renaming a step or
 * retiring one breaks the map loudly instead of letting the lane drop out.
 *
 * The tiering invariant is held here too: `ci:fast` — what the develop loop and
 * each qa-fix cycle run — must NOT contain the slow tier. That is not a
 * performance nicety. Paying the end-to-end evals on every loop iteration is what
 * would make the correct fix feel expensive enough to be reverted, and a gate
 * people route around is a gate that does not exist.
 *
 * Run: node --test evals/shared/tests/ci-gate-parity.test.mjs
 * Mutations that must go red: add `- name: X` + `run: echo hi` to validate.yml's
 * job (unclassified step); drop `lint:shell` from `ci` (set diff); rename
 * "Lint source shell scripts" in shellcheck.yml (stale map key).
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
/** The workflow job that defines "green" in test.yml. */
const TEST_JOB = "test";

/**
 * Every workflow job that must be green for a PR into develop. Jobs not listed
 * here — release.yml (tag-triggered), branch-policy.yml (PRs into main only),
 * docs-link-check.yml (task 108's checker, path-filtered) — have no local form
 * and are deliberately not read.
 */
const GREEN_JOBS = [
  { workflow: ".github/workflows/test.yml", job: "test" },
  { workflow: ".github/workflows/validate.yml", job: "validate" },
  { workflow: ".github/workflows/shellcheck.yml", job: "shellcheck" },
];

/**
 * Step name → the npm script that reproduces it locally. Many-to-one is fine:
 * validate.yml's two regenerate-and-diff steps are one local script. A step
 * listed here is counted as its twin when comparing against the composite.
 */
const LANE_TWINS = {
  "Validate all skills": "validate:all",
  "Catalog up-to-date check": "check:generated",
  "Skill dependency graph up-to-date check": "check:generated",
  "Bundle freshness — per-file check": "bundle:check",
  "Lint source shell scripts": "lint:shell",
};

/**
 * Marketplace actions that are environment setup, matched by prefix on the
 * `uses:` reference. A `- uses:` step is a step like any other — a lint or
 * scan action added to a green job is a gate the composite cannot see — so it
 * must be classified. Unnamed setup steps (`- uses: actions/checkout@v7`) are
 * recognised here; a named `uses:` step goes through the name maps below.
 */
const SETUP_ACTIONS = [
  "actions/checkout@",
  "actions/setup-node@",
  "actions/setup-python@",
];

/** Environment setup, not a gate — nothing to mirror. */
const SETUP_STEPS = [
  "Set up Node",
  "Set up Python",
  "Install PyYAML",
  "Install awk variants",
  "Install dependencies",
  "Install ShellCheck (pinned)",
];

/**
 * Gate steps deliberately NOT mirrored by the composite, each with the reason.
 * An entry here is a decision on file; an unlisted, unmapped step is a defect.
 */
const EXCLUDED_STEPS = {
  "Bundle freshness check":
    "regenerate-and-diff of every bundled copy; the pre-commit hook re-bundles on " +
    "every commit that touches shared/resources/ or a SKILL.md (the only way a " +
    "copy goes stale), and bundle:check covers the read-only per-file half",
};

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
function jobBlock(jobName, text = workflow) {
  const lines = text.split("\n");
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

/**
 * Every `- name:` / `run:` step pair in one job, in order. A `run:` with no
 * preceding `name:` gets an empty name, which no map can match — so an
 * anonymous gate step fails classification below, which is the right answer:
 * a step the twin map cannot name is a step nobody can mirror.
 */
function jobSteps({ workflow: path, job }) {
  const block = jobBlock(job, read(path));
  if (block === null) return null;
  const steps = [];
  let name = "";
  for (const line of block.split("\n")) {
    const n = line.match(/^\s*-\s*name:\s*(.+?)\s*$/);
    if (n) {
      name = n[1].replace(/^['"]|['"]$/g, "");
      continue;
    }
    // Any new list item — `- uses:`, `- run:`, `- env:` — starts a new step, so
    // a name can never be attributed to a later step that did not declare one.
    // `- name:` was matched above and has already set the new name.
    if (/^\s*-\s/.test(line)) {
      name = "";
    }
    // A `uses:` step is recorded too: a marketplace lint or scan action is a
    // gate exactly as a `run:` is, and an unrecorded one passes silently
    // (QA cycle 2, CR-2).
    const u = line.match(/^\s*-?\s*uses:\s*(\S+)/);
    if (u) {
      steps.push({ name, run: "", uses: u[1] });
      continue;
    }
    const r = line.match(/^\s*-?\s*run:\s*(.*?)\s*$/);
    if (r) {
      // `run: |` is a block scalar whose commands are on the following lines;
      // such a step is classified by its name only (LANE_TWINS / SETUP_STEPS /
      // EXCLUDED_STEPS), never by its body, so the body is not read here.
      steps.push({ name, run: r[1] === "|" ? "" : r[1], uses: null });
    }
  }
  return steps;
}

/**
 * Classify one step. Returns { kind, script } where kind ∈ script | twin |
 * setup | excluded | unclassified.
 */
function classify(step) {
  const script = scriptInvokedBy(step.run);
  if (script !== null) return { kind: "script", script };
  if (step.uses && SETUP_ACTIONS.some((p) => step.uses.startsWith(p)))
    return { kind: "setup", script: null };
  if (step.name in LANE_TWINS)
    return { kind: "twin", script: LANE_TWINS[step.name] };
  if (SETUP_STEPS.includes(step.name)) return { kind: "setup", script: null };
  if (step.name in EXCLUDED_STEPS) return { kind: "excluded", script: null };
  return { kind: "unclassified", script: null };
}

/** The npm scripts every green job runs or has a local twin for. */
function greenScripts() {
  const out = [];
  for (const g of GREEN_JOBS) {
    for (const step of jobSteps(g) ?? []) {
      const c = classify(step);
      // Expanded to leaves, as the composite side is — a twin that is itself a
      // composite must compare on the same footing (QA cycle 2, CR-5).
      if (c.script !== null && c.script in scripts)
        out.push(...expand(c.script));
    }
  }
  return out.filter((name) => name in scripts);
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

test("every green job is found, and every step in it is classified", () => {
  for (const g of GREEN_JOBS) {
    const steps = jobSteps(g);
    assert.ok(
      steps !== null,
      `${g.workflow} defines no \`${g.job}:\` job — the parity check would silently ` +
        "read an empty set for it",
    );
    assert.ok(steps.length > 0, `${g.workflow}:${g.job} has no run: steps`);
    const unclassified = steps
      .filter((s) => classify(s).kind === "unclassified")
      .map((s) => s.name || "(unnamed step)");
    assert.deepEqual(
      unclassified,
      [],
      `${g.workflow}:${g.job} has step(s) the composite cannot see: ` +
        `${unclassified.join(", ")}.\n` +
        "Every gate step must invoke an npm script, or be named in LANE_TWINS " +
        "(with the script that reproduces it locally), SETUP_STEPS, or " +
        "EXCLUDED_STEPS (with a reason). A lane CI runs that npm run ci does " +
        "not is the defect task 111 exists to close.",
    );
  }
});

test("every LANE_TWINS / SETUP_STEPS / EXCLUDED_STEPS key names a real step", () => {
  // The other direction: a step renamed or retired in a workflow leaves a map
  // entry behind that matches nothing, and the lane it named silently drops
  // out of the comparison. Assert each key is still a step in some green job.
  const names = new Set(
    GREEN_JOBS.flatMap((g) => (jobSteps(g) ?? []).map((s) => s.name)),
  );
  const stale = [
    ...Object.keys(LANE_TWINS),
    ...SETUP_STEPS,
    ...Object.keys(EXCLUDED_STEPS),
  ].filter((k) => !names.has(k));
  assert.deepEqual(
    stale,
    [],
    `map entries name no step in any green job: ${stale.join(", ")} — ` +
      "the workflow step was renamed or removed; update the map in the same commit",
  );
  for (const [step, script] of Object.entries(LANE_TWINS)) {
    assert.ok(
      script in scripts,
      `LANE_TWINS["${step}"] names \`${script}\`, which package.json does not define`,
    );
  }
});

test("green jobs and the `ci` composite run exactly the same commands", () => {
  const fromWorkflow = sorted(greenScripts());
  const fromComposite = sorted(expand(FULL_GATE));

  assert.deepEqual(
    fromComposite,
    fromWorkflow,
    `The CI workflows and the \`${FULL_GATE}\` composite have diverged.\n` +
      `  CI runs (via scripts or twins):  ${fromWorkflow.join(", ") || "(nothing)"}\n` +
      `  ${FULL_GATE} runs:                        ${fromComposite.join(", ") || "(nothing)"}\n` +
      "A step in one and not the other is a gate the pipeline cannot see, " +
      "which is the defect task 75 exists to close. Add it to both.",
  );
  assert.ok(fromWorkflow.length >= 3, "expected at least three CI tiers");
  // test.yml's own scripts are still a subset — the widening added lanes, it
  // did not let the original job drift.
  for (const s of workflowScripts()) {
    assert.ok(
      fromComposite.includes(s),
      `test.yml runs \`${s}\`, which \`${FULL_GATE}\` no longer does`,
    );
  }
});

test("every npm script any green job invokes actually exists", () => {
  // Without this, an `npm run <typo>` step is filtered out of the parity
  // comparison (greenScripts() keeps only names package.json defines) and the
  // composite still matches — the workflow would go red in CI while the test
  // that exists to predict CI stayed green. Read every green job, not only
  // test.yml: a typo'd step in validate.yml stayed green here until QA cycle 1
  // appended one and watched all twelve tests pass (CR-3).
  const missing = [];
  for (const g of GREEN_JOBS) {
    for (const step of jobSteps(g) ?? []) {
      const c = classify(step);
      if (c.kind === "script" && !(c.script in scripts))
        missing.push(`${g.workflow}:${g.job} → ${c.script}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `workflow invokes npm script(s) absent from package.json: ${missing.join(", ")}`,
  );
  // The test.yml-only reading is kept as a subset check so the older, narrower
  // guard cannot silently disappear if GREEN_JOBS is ever reduced.
  const missingInTestYml = workflowInvocations().filter((n) => !(n in scripts));
  assert.deepEqual(missingInTestYml, []);
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

/**
 * Every loop document that commits — read at its own authoritative source.
 *
 * The mixed shape of this list is the point, not an oversight. Two entries are
 * shared resources bundled into each skill; the third is skill-native, authored
 * directly in `skills/develop-bug/references/` with no `shared/resources/`
 * counterpart. That asymmetry is exactly why task 75 missed it: a file list
 * drawn from `shared/resources/` cannot see a document that does not live
 * there, so `develop-bug`'s fix cycle kept committing an unformatted tree for a
 * full release after the other two stopped. Naming each document at its real
 * source is what makes the omission impossible to repeat.
 */
const LOOP_DOCUMENTS = [
  "shared/resources/develop-pipeline-step-3-develop-loop.md",
  "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
  "skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md",
];

test("every loop document names the fast gate, not a literal", () => {
  // These documents ship verbatim into consumer repos, which have no `ci:fast`
  // script of their own. A hardcoded literal would instruct every downstream
  // project to run a command that does not exist.
  assert.equal(
    LOOP_DOCUMENTS.length,
    3,
    "all three commit-bearing loop documents must be covered — the develop " +
      "loop, the story/task qa-fix cycle, and develop-bug's verify cycle",
  );
  for (const p of LOOP_DOCUMENTS) {
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
