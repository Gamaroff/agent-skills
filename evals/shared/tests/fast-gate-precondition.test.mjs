/**
 * Executes the develop loop's fast-gate precondition against real fixture
 * projects, in both `bash` and `zsh`.
 *
 * WHY THIS EXISTS
 * ---------------
 * `develop.fastGateCommand` names a shell command the develop loop runs on every
 * iteration, and its fallback (`npm run ci:fast`) is a script a consumer need not
 * have. Before this precondition existed the mismatch surfaced *mid-iteration* as
 * `Missing script: ci:fast`, at the point where an operator invents a substitute
 * under time pressure — and on the run that produced this check the substitution
 * was invented per-run, so the gate silently differed between runs and nothing
 * recorded that it had.
 *
 * The precondition is runnable prose: it lives inside a fenced ```bash block in a
 * markdown document that ships verbatim into consumer repos. Asserting that the
 * document *contains* the right text would prove only that a string exists. This
 * file instead EXTRACTS the block and RUNS it against fixture projects, so what is
 * under test is the behaviour a consumer will actually get.
 *
 * The fail-safe direction is asymmetric and deliberate: a command shape the
 * extraction cannot reason about is SKIPPED, never failed. A check that
 * mis-parsed would HALT every consumer including correct ones, and the two
 * anti-vacuity assertions at the bottom are what stop the whole suite from
 * degenerating into "everything skips, everything passes".
 *
 * Run: node --test evals/shared/tests/fast-gate-precondition.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// Spawn timeout comes from the shared budget, never a literal: each assertion
// below forks `npm run` in a child, and a literal chosen against an idle machine
// sits ~1.2x above the loaded worst case — bug.2. `tests/test-harness-concurrency.test.js`
// fails the build on any `timeout: <number>` literal in a test file.
import {
  spawnBudget,
  neverRan,
} from "../../../shared/resources/spawn-budget.mjs";
// The shipped, memoised probe the snippet engine uses for exactly this decision.
// Reused rather than re-derived: a second zsh detector would be a second thing to
// keep honest, and this one already handles the memoisation.
import { zshAvailable } from "../../../shared/resources/qa-execute-snippets.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const { timeoutMs: SPAWN_TIMEOUT_MS, retries: SPAWN_RETRIES } = spawnBudget(
  "FAST_GATE_PRECONDITION",
);

const LOOP_DOC = "shared/resources/develop-pipeline-step-3-develop-loop.md";
const LOOP_SECTION = "## Develop Loop — Run Until Complete (Bounded)";
const HEADING =
  "### Precondition — the gate must resolve before the first iteration";
/** The placeholder the surrounding document tells its reader to substitute. */
const PLACEHOLDER = "<fastGateCommand>";

/**
 * The first fenced ```bash block that follows `heading`.
 *
 * Anchored to the heading rather than to the first bash block in the file: the
 * document holds several, and picking the wrong one would silently test the
 * Output Capture Pattern instead — which passes vacuously, since it contains no
 * conditional.
 */
function bashBlockUnder(doc, heading) {
  const at = doc.indexOf(heading);
  if (at === -1) return null;
  const rest = doc.slice(at);
  const m = rest.match(/```bash\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
}

const snippet = bashBlockUnder(
  readFileSync(join(repoRoot, LOOP_DOC), "utf-8"),
  HEADING,
);

/**
 * Run the extracted snippet in a throwaway project defining `scripts`.
 *
 * Retries while the child NEVER RAN — killed on timeout, or never started at all
 * under fork pressure. That is not the same as a child that ran and exited
 * non-zero, and conflating them is how a loaded box reports a behavioural
 * divergence that never happened (bug.2). This suite is the repo's heaviest
 * spawn profile — 26 children, each running `npm run` — so it is exactly the
 * shape that inflates ~6x under load.
 *
 * `spawnSync` returns `status: null` in that case. Letting null reach the
 * equality assertions below would fail with "a project defining ci:fast must
 * not be halted", which is a claim about the check that nothing established.
 */
function runCheck({ shell, gateCommand, scripts }) {
  const dir = mkdtempSync(join(tmpdir(), "fast-gate-"));
  try {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "fixture", version: "1.0.0", scripts }),
    );
    // A replacer FUNCTION, not a replacement string: `$&`, `$'` and `` $` `` are
    // special in the latter, so a gate command containing one would be silently
    // mangled into something other than what this test claims to run.
    const script = snippet.replaceAll(PLACEHOLDER, () => gateCommand);

    let r;
    for (let attempt = 0; attempt <= SPAWN_RETRIES; attempt++) {
      r = spawnSync(shell, ["-c", script], {
        cwd: dir,
        encoding: "utf-8",
        timeout: SPAWN_TIMEOUT_MS,
      });
      if (!neverRan(r)) break;
    }
    assert.ok(
      !neverRan(r),
      `child never produced an answer after ${SPAWN_RETRIES + 1} attempt(s) ` +
        `(${shell}, ${SPAWN_TIMEOUT_MS}ms): this is a claim about the machine, ` +
        "not about the check — raise the budget with FAST_GATE_PRECONDITION_SPAWN_TIMEOUT_MS",
    );
    return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The shells this run can actually execute in.
 *
 * `zsh` is present on macOS and ABSENT on ubuntu-latest, where CI runs. Hardcoding
 * both is what turned a green local suite into four red CI tests: the four `[zsh]`
 * cases spawned a shell that does not exist, and every attempt returned a child
 * that never ran. (The spawn guard reported that accurately — "a claim about the
 * machine, not about the check" — which is the guard working, not the bug.)
 *
 * The snippet engine already solved this: `shells = useZsh ? ["bash","zsh"] : ["bash"]`.
 * This mirrors it rather than inventing a second rule.
 */
const SHELLS = zshAvailable() ? ["bash", "zsh"] : ["bash"];
const WITH_FAST = { "ci:fast": "echo fast", build: "echo build" };
const WITHOUT_FAST = { test: "echo test", build: "echo build" };

// ---------------------------------------------------------------------------

test("the precondition block is present and is a real conditional", () => {
  assert.ok(
    snippet,
    `${LOOP_DOC} must carry a fenced bash block under "${HEADING}" — without it ` +
      "every behavioural test below would have nothing to run and would pass",
  );
  assert.ok(
    snippet.includes(PLACEHOLDER),
    `the block must bind ${PLACEHOLDER}, not dereference an unset $fastGateCommand — ` +
      "an unset variable extracts nothing, which skips the check and passes vacuously",
  );
  assert.match(snippet, /\bexit 1\b/, "the block must be able to HALT");
});

test("the loop's entry point points at the precondition", () => {
  // A correct block filed where nobody reads it in time is not a working check.
  //
  // The precondition lives under `## Test Failure Triage`, which a reader executing
  // the loop reaches only AFTER something has failed — by which point the loop has
  // already died mid-iteration, the exact failure it exists to prevent. So the loop
  // section must carry a forward pointer to it.
  //
  // This assertion exists because the ORIGINAL placement check was satisfiable
  // without the property it was meant to establish: it asserted the precondition
  // precedes the Output Capture Pattern, which is true, and true for reasons
  // unrelated to whether a reader reaches it in time. The reference point was wrong,
  // not the assertion. QA cycle 2's refute pass caught it; this stops it reverting.
  const doc = readFileSync(join(repoRoot, LOOP_DOC), "utf-8");
  const loopAt = doc.indexOf(LOOP_SECTION);
  assert.notEqual(loopAt, -1, `${LOOP_DOC} must contain "${LOOP_SECTION}"`);

  const precondAt = doc.indexOf(HEADING);
  assert.ok(
    precondAt > loopAt,
    "precondition is defined after the loop section (structure changed)",
  );

  // Only the text BETWEEN the loop heading and the next `## ` may satisfy this —
  // a mention anywhere else in the file would pass a naive whole-file search while
  // leaving the reader at the loop with no pointer.
  const after = doc.slice(loopAt + LOOP_SECTION.length);
  const nextH2 = after.search(/\n## /);
  const loopSection = nextH2 === -1 ? after : after.slice(0, nextH2);

  assert.match(
    loopSection,
    /Precondition — the gate must resolve before the first iteration/,
    "the Develop Loop section must point forward to the precondition by name, so a " +
      "reader executing the loop runs it before iteration 1 rather than meeting it " +
      "only after a failure",
  );
  assert.match(
    loopSection,
    /before iteration 1/i,
    "the pointer must say WHEN to run it, not merely that it exists",
  );
});

test("the shell matrix is honest about what actually ran", () => {
  // Two failures this prevents, in opposite directions.
  //
  // Silence: if zsh is missing and nothing says so, a report claiming "both shells
  // agree" is asserting something no machine checked. The engine records
  // `zsh-unavailable` as information for the same reason; so does this.
  //
  // Vacuity: if the probe ever returned false for BOTH, every behavioural test
  // below would be skipped and the suite would pass having run nothing. bash is
  // not optional.
  assert.ok(
    SHELLS.includes("bash"),
    "bash must always be in the matrix — without it the suite passes having executed nothing",
  );
  if (!SHELLS.includes("zsh")) {
    // Not a failure. Recorded so "zsh agreed" is never inferred from silence.
    console.log(
      "  info: zsh-unavailable on this host — the matrix ran bash only. " +
        "Cross-shell agreement is verified wherever zsh is present (e.g. macOS), not here.",
    );
  }
});

for (const shell of SHELLS) {
  test(`[${shell}] a defined script does not HALT`, () => {
    // Anti-vacuity: without this the check could reject every project and the
    // "missing script HALTs" case below would still pass.
    const { code } = runCheck({
      shell,
      gateCommand: "npm run ci:fast",
      scripts: WITH_FAST,
    });
    assert.equal(code, 0, "a project defining ci:fast must not be halted");
  });

  test(`[${shell}] a missing script HALTs and names the key`, () => {
    const { code, out } = runCheck({
      shell,
      gateCommand: "npm run ci:fast",
      scripts: WITHOUT_FAST,
    });
    assert.equal(code, 1, "a project without the named script must HALT");
    assert.match(
      out,
      /develop\.fastGateCommand/,
      "message must name the config key",
    );
    assert.match(
      out,
      /skills-config\.yaml/,
      "message must name the file to edit",
    );
    assert.match(
      out,
      /ci:fast/,
      "message must name the script that did not resolve",
    );
  });

  test(`[${shell}] a compound beginning 'npm run' checks its FIRST script`, () => {
    // Documented behaviour, and the case most likely to be "corrected" into a
    // skip by a later reader: the first component must exist for the command to
    // get off the ground, so checking it is strictly better than guessing.
    const missing = runCheck({
      shell,
      gateCommand: "npm run ci:fast && npm run lint",
      scripts: WITHOUT_FAST,
    });
    assert.equal(
      missing.code,
      1,
      "missing first script in a compound must HALT",
    );

    const present = runCheck({
      shell,
      gateCommand: "npm run ci:fast && npm run lint",
      scripts: WITH_FAST,
    });
    assert.equal(
      present.code,
      0,
      "present first script in a compound must not HALT",
    );
  });

  test(`[${shell}] a shape the extraction cannot read is skipped, not failed`, () => {
    // Every one of these projects lacks ci:fast. None may HALT: the fail-safe
    // direction for an unreadable command is skip, because a false HALT would
    // block correct consumers.
    for (const gateCommand of [
      "prettier --check . && jest", // non-npm compound
      "make test", // non-npm
      "pnpm run ci:fast", // different package manager
      "npm test", // npm, but not `npm run <script>`
      "", // unset / empty — the vacuous-pass shape
    ]) {
      const { code } = runCheck({ shell, gateCommand, scripts: WITHOUT_FAST });
      assert.equal(
        code,
        0,
        `"${gateCommand || "(empty)"}" must be skipped, not halted`,
      );
    }
  });
}

test("the suite is not vacuous — it observes both verdicts", () => {
  // If a future edit made the check unconditional in either direction, every
  // per-shell test above could still be satisfied by one verdict. This asserts
  // the snippet is genuinely discriminating.
  const halts = runCheck({
    shell: "bash",
    gateCommand: "npm run ci:fast",
    scripts: WITHOUT_FAST,
  }).code;
  const passes = runCheck({
    shell: "bash",
    gateCommand: "npm run ci:fast",
    scripts: WITH_FAST,
  }).code;
  assert.notEqual(
    halts,
    passes,
    "the same command must produce different verdicts against different projects, " +
      "or the check is not reading the project at all",
  );
});
