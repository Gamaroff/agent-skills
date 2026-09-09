"use strict";
/**
 * Asserts that the QA re-review scope rule is stated ONCE and that both
 * consumers agree with it.
 *
 * `qa-task` and `qa-story` carry the same re-review scoping logic in two
 * separately-maintained files. That duplication has bitten this repo before —
 * it is the reason `transition-protocol-parity.test.mjs` exists — and the
 * safety carve-out added by task.74 makes it worse: a trigger that fires in one
 * skill and not the other means two QA gates on the same class of defect
 * resolve differently depending on whether the work item happens to be a story
 * or a task. That is the hardest kind of drift to notice, because each file
 * reads correctly on its own.
 *
 * So the rule lives in `shared/resources/qa-re-review-scope.md` and the skills
 * reference it. These tests hold three things:
 *
 *   1. Neither skill RESTATES the trigger — they link the shared resource.
 *      Restating it is how the two copies start drifting again.
 *   2. Both carry the unscoped path, wired as a DISJUNCT on the existing
 *      `PRIOR_GATES` guard rather than as a second competing block. Two places
 *      assigning `DIFF_FILE` is how one of them silently stops mattering.
 *   3. Both require the `New Findings This Cycle` section, and require it when
 *      empty. Widening the diff without asking the second question is the
 *      half-fix task.74 exists to prevent.
 *
 * Run: node --test evals/shared/tests/qa-re-review-scope-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  chmodSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// The spawn budget is the single source for child-process timeouts. A literal
// chosen against an idle machine is roughly 1.2× the loaded worst case, which
// is what bug.2 was about, and `tests/test-harness-concurrency.test.js` fails
// the build on any `timeout: <number>` literal in a test file.
import { spawnBudget } from "../../../shared/resources/spawn-budget.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const { timeoutMs: SPAWN_TIMEOUT_MS } = spawnBudget("QA_REREVIEW_SCOPE");

/**
 * The stdin-holder must outlast the timeout, or the test stops discriminating.
 * A fixed `sleep 30` under a 60s budget lets the fifo EOF first: awk returns,
 * the assertion passes, and reverting the guard no longer reddens anything.
 * Derive it from the budget so the two can never drift apart.
 */
const HOLD_STDIN_SECONDS = Math.ceil(SPAWN_TIMEOUT_MS / 1000) + 5;

const RULE_PATH = join(
  repoRoot,
  "shared",
  "resources",
  "qa-re-review-scope.md",
);
const SKILLS = [
  ["qa-task", join(repoRoot, "skills", "qa-task", "SKILL.md")],
  ["qa-story", join(repoRoot, "skills", "qa-story", "SKILL.md")],
];

test("the shared rule exists", () => {
  assert.ok(
    existsSync(RULE_PATH),
    "shared/resources/qa-re-review-scope.md is the single source of truth for re-review scope",
  );
});

/**
 * Read lazily. A top-level `readFileSync` runs at import, BEFORE the existence
 * test above executes — so a missing rule crashed the whole file with a raw
 * ENOENT and the assertion written for exactly that case never reported. The
 * suite still failed, so it was never a false green, but the diagnostic was
 * lost. Reading on first use lets the existence test speak for itself.
 */
let _rule = null;
function ruleText() {
  if (_rule === null) _rule = readFileSync(RULE_PATH, "utf-8");
  return _rule;
}
const skillText = new Map(
  SKILLS.map(([name, path]) => [name, readFileSync(path, "utf-8")]),
);

/* ---------------------------------------------------------------------------
 * 1. The rule is stated once — skills reference it, never restate the trigger.
 * ------------------------------------------------------------------------- */

// The trigger clauses, verbatim from the shared resource. If any of these
// literals appears in a skill file, that skill has restated the rule.
const TRIGGER_LITERALS = [
  "nfr_validation.security.status: FAIL",
  "classifier, validator, parser, sanitiser, allow-list, deny-list, or authorisation check",
  "`never`, `must not`, `fails closed`, `refused`",
];

/* ---------------------------------------------------------------------------
 * 0. Each skill file is actually the skill it claims to be.
 *
 * Every other assertion here is a substring search over two files that are
 * SUPPOSED to say nearly the same things. That makes the suite blind to the one
 * failure where the files are swapped or duplicated: if qa-task/SKILL.md holds
 * qa-story's content, every parity assertion still passes — more easily, in
 * fact, because the two copies are now literally identical.
 *
 * This is not hypothetical. It happened while writing this suite: a
 * mutation-proof harness derived its backup filenames with `basename`, both
 * skills are named `SKILL.md`, and the restore wrote qa-story's content over
 * qa-task's. All 28 tests stayed green over the corrupted tree, and it was
 * caught by `git diff --stat` showing 3150 changed lines, not by any test.
 *
 * A parity suite that cannot tell its two subjects apart is measuring one file
 * twice. Check identity first.
 * ------------------------------------------------------------------------- */

for (const [name, text] of skillText) {
  test(`${name}/SKILL.md is ${name}, not a copy of its sibling`, () => {
    const fm = text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(fm, `${name}/SKILL.md must open with YAML frontmatter`);
    const declared = fm[1].match(/^name:\s*(\S+)/m);
    assert.ok(declared, `${name}/SKILL.md frontmatter must declare a name`);
    assert.equal(
      declared[1],
      name,
      `${name}/SKILL.md declares name: ${declared[1]} — the file is not the skill it should be`,
    );
  });
}

test("the two skills are not byte-identical", () => {
  const [a, b] = [...skillText.values()];
  assert.notEqual(
    a,
    b,
    "qa-task and qa-story must remain distinct files; identical content means one overwrote the other",
  );
});

test("the shared rule states every trigger clause", () => {
  for (const literal of TRIGGER_LITERALS) {
    assert.ok(
      ruleText().includes(literal),
      `shared rule is missing trigger clause: ${literal}`,
    );
  }
});

for (const [name, text] of skillText) {
  test(`${name} references the shared rule rather than restating it`, () => {
    // Accept either spelling of the link. Authors write
    // `shared/resources/qa-re-review-scope.md`; `npm run bundle` rewrites it in
    // place to `references/qa-re-review-scope.md` so an extracted skill is
    // self-contained. Asserting only the source form makes this test fail the
    // moment the bundler runs, which is every commit that touches the rule.
    assert.ok(
      /(?:shared\/resources|references)\/qa-re-review-scope\.md/.test(text),
      `${name} must link the shared rule (shared/resources/… pre-bundle, references/… post-bundle)`,
    );
    for (const literal of TRIGGER_LITERALS) {
      assert.ok(
        !text.includes(literal),
        `${name} restates a trigger clause that belongs only in the shared rule: ${literal}`,
      );
    }
  });
}

/* ---------------------------------------------------------------------------
 * 2. Both carry the unscoped path, wired as a disjunct.
 * ------------------------------------------------------------------------- */

// The guard, verbatim. `SAFETY_REPROBE` must appear ON the existing
// `PRIOR_GATES` condition — not as a separate `if` ahead of it.
const GUARD =
  'if [ "$PRIOR_GATES" -ge 2 ] && [ -n "$LAST_GATE_DATE" ] && [ "$SAFETY_REPROBE" != "true" ]; then';

for (const [name, text] of skillText) {
  test(`${name} extends the existing PRIOR_GATES guard with SAFETY_REPROBE`, () => {
    assert.ok(
      text.includes(GUARD),
      `${name} must gate the narrowing branch on SAFETY_REPROBE as a disjunct:\n  ${GUARD}`,
    );
  });

  test(`${name} assigns DIFF_FILE in exactly one conditional`, () => {
    // Counting the guard keyword is the cheap proxy for "one block, not two".
    // A second full-diff block inserted ahead of this one would need its own
    // PRIOR_GATES test to know which cycle it is on.
    const guards = text.split('if [ "$PRIOR_GATES"').length - 1;
    assert.equal(
      guards,
      1,
      `${name} has ${guards} PRIOR_GATES conditionals; a second block assigning DIFF_FILE ` +
        `would silently override the first`,
    );
  });

  test(`${name} resolves SAFETY_REPROBE before the scoping block needs it`, () => {
    const resolvedAt = text.indexOf("SAFETY_REPROBE=false");
    const usedAt = text.indexOf(GUARD);
    assert.ok(
      resolvedAt !== -1,
      `${name} must resolve SAFETY_REPROBE (default false) in Phase 0`,
    );
    assert.ok(
      resolvedAt < usedAt,
      `${name} resolves SAFETY_REPROBE at ${resolvedAt} but uses it at ${usedAt} — ` +
        `an unset variable makes the carve-out silently never fire`,
    );
  });

  test(`${name} carries the safety re-probe instruction, not only the wider diff`, () => {
    assert.ok(
      text.includes("SAFETY RE-PROBE."),
      `${name} must append the SAFETY RE-PROBE directive to the code-review prompt — ` +
        `widening the diff without changing the question is the half-fix`,
    );
    assert.ok(
      text.includes("Search the surface again as if for the first time"),
      `${name}'s safety directive must instruct a fresh search, not a re-read of the fixes`,
    );
  });

  test(`${name} records the scope decision in Review Methodology`, () => {
    assert.ok(
      text.includes(
        "Re-review scope: unscoped (prior gate failed on security)",
      ) && text.includes("Re-review scope: since"),
      `${name} must record both scope outcomes in the QA report's Review Methodology`,
    );
  });
}

/* ---------------------------------------------------------------------------
 * 3. Both require the New Findings section, including when empty.
 * ------------------------------------------------------------------------- */

for (const [name, text] of skillText) {
  /**
   * Read the New Findings section itself, and assert against THAT — not against
   * the whole file.
   *
   * A whole-file substring search passes as long as the phrase appears
   * somewhere, and both skills mention the requirement twice: once in Phase 0's
   * prose, once in the report template. Deleting it from the template alone
   * left the file-wide assertion green. Caught by mutation M4, which is the
   * point of running them.
   */
  const newFindings = (() => {
    const start = text.indexOf("## New Findings This Cycle");
    if (start === -1) return null;
    const rest = text.slice(start + 1);
    const end = rest.search(/\n## /);
    return end === -1 ? rest : rest.slice(0, end);
  })();

  test(`${name} requires a New Findings This Cycle section`, () => {
    assert.ok(
      newFindings !== null,
      `${name}'s QA report template must carry a New Findings This Cycle section`,
    );
  });

  test(`${name} requires New Findings even when empty — stated IN the section`, () => {
    assert.ok(newFindings, `${name} has no New Findings section to check`);
    assert.ok(
      /required even when empty/i.test(newFindings),
      `${name}'s New Findings section must itself state that it is required when empty — ` +
        `an absent section is indistinguishable from a cycle that never asked the question`,
    );
  });

  test(`${name} requires an unscoped empty cycle to say what was searched`, () => {
    assert.ok(newFindings, `${name} has no New Findings section to check`);
    assert.ok(
      newFindings.includes("state what was searched"),
      `${name}'s New Findings section must require an unscoped zero-finding cycle to name ` +
        `its search surface, so "nothing found" is distinguishable from "nothing looked for"`,
    );
  });
}

/* ---------------------------------------------------------------------------
 * 4. The non-trigger list is stated, and stated only in the shared rule.
 * ------------------------------------------------------------------------- */

test("the shared rule names the non-triggers explicitly", () => {
  for (const literal of [
    "CONCERNS` on performance, reliability or maintainability",
    "FAIL` on documentation or test coverage",
  ]) {
    assert.ok(
      ruleText().includes(literal),
      `shared rule must state the non-trigger explicitly: ${literal}`,
    );
  }
});

test("the shared rule keeps REFUTE_PASS and SAFETY_REPROBE independent", () => {
  assert.ok(
    ruleText().includes("does **not** set it"),
    "the rule must say SAFETY_REPROBE does not set REFUTE_PASS — collapsing them " +
      "makes cycle 3+ lose the refute or cycle 2 lose the re-probe",
  );
  assert.ok(
    /compose/i.test(ruleText()),
    "the rule must say the two directives compose where both apply",
  );
});

/* ---------------------------------------------------------------------------
 * 5. Clause 1 is EXECUTED against real gates, not merely read.
 *
 * The first draft of this probe used `\s`, a GNU extension. BSD awk and mawk
 * neither match it nor error: the probe returns empty, SAFETY_REPROBE stays
 * false, and the carve-out never fires — silently, on whatever platform the
 * pipeline happens to run. Reading the snippet did not catch that. Running it
 * against a gate whose answer is known did, immediately.
 * ------------------------------------------------------------------------- */

/**
 * Extract the probe from the SHARED RULE and execute THAT — never a copy
 * embedded here. A constant in the test file is a third copy of the rule, and
 * it would keep passing while the shipped probe rots; the whole point of this
 * suite is that copies drift.
 */
function extractProbe() {
  // Match ALL candidates, not the first. Taking the first would let a later
  // edit that adds an earlier `SAFETY_REPROBE=false` block silently redirect
  // every replay test below onto a different snippet — while they all still
  // reported green, which is the failure this suite exists to prevent.
  const all = [
    ...ruleText().matchAll(
      /```bash\n([^`]*?SAFETY_REPROBE=false\n[\s\S]*?)```/g,
    ),
  ];
  assert.ok(
    all.length > 0,
    "shared rule must contain the clause-1 probe in a ```bash block defining SAFETY_REPROBE",
  );
  assert.equal(
    all.length,
    1,
    `shared rule has ${all.length} bash blocks defining SAFETY_REPROBE; the clause-1 probe must ` +
      `be the only one, or the replay tests below silently execute the wrong snippet`,
  );
  return all[0][1].trimEnd();
}

/**
 * Lazy, for the same reason `ruleText()` is.
 *
 * `const CLAUSE_1 = extractProbe()` at module level ran at IMPORT, which quietly
 * defeated both: a missing rule, or a rule with two SAFETY_REPROBE blocks,
 * crashed the file before any test executed — `tests 1 / fail 1` with a raw
 * stack trace, and neither `the shared rule exists` nor extractProbe's own
 * "exactly one" message ever reported. The suite still failed, so it was never
 * a false green; but the fix claimed in QA cycle 1 did not actually do what it
 * said, and the cycle-2 refute pass is what caught that.
 */
let _clause1 = null;
function clause1() {
  if (_clause1 === null) _clause1 = extractProbe();
  return _clause1;
}

/**
 * Compare on content, not layout. The skills nest the block inside a numbered
 * list so every line carries three extra spaces; the shared rule has it at
 * column 0. Comments around the probe are also allowed to differ — each site
 * explains itself to its own reader. Strip indentation, blank lines and
 * comments; the executable lines are what must not drift.
 */
function normalise(text) {
  return text
    .split("\n")
    .map((l) => l.trimEnd().replace(/^\s+/, ""))
    .filter((l) => l !== "" && !l.startsWith("#"))
    .join("\n");
}

test("both skills carry the clause-1 probe verbatim from the shared rule", () => {
  const body = normalise(clause1());
  assert.ok(
    normalise(ruleText()).includes(body),
    "shared rule must hold the canonical probe",
  );
  for (const [name, text] of skillText) {
    assert.ok(
      normalise(text).includes(body),
      `${name} must carry the canonical clause-1 probe verbatim — a paraphrase is where ` +
        `the two copies start disagreeing again`,
    );
  }
});

test("the clause-1 probe uses no GNU-only regex escapes", () => {
  assert.ok(
    !/\\s|\\d|\\w/.test(clause1()),
    "the probe must use POSIX classes only — \\s fails closed and silently on BSD awk/mawk",
  );
});

/**
 * Run the real probe with LATEST_GATE set to `path` verbatim, under a stdin
 * that STAYS OPEN, and return SAFETY_REPROBE.
 *
 * The open stdin is the whole point and was got wrong the first time. Passing
 * `stdio: ["pipe", …]` and writing nothing makes Node close the child's stdin
 * immediately, so awk sees EOF and returns at once — the test passed whether or
 * not the guard was present. Mutation MF-1 (revert the guard entirely) left it
 * green, which is how the vacuity was found.
 *
 * `exec 0< <(sleep ${HOLD_STDIN_SECONDS} 2>/dev/null)` gives the probe a stdin that is open and never
 * delivers, which is what an agent's shell actually looks like. With the guard
 * present awk is never reached; without it, awk reads that stdin and blocks,
 * and `timeout` turns the block into a failure instead of a stalled suite.
 *
 * Only the sleep's STDERR is redirected, and the asymmetry is load-bearing.
 * Its stdout IS the process-substitution fifo — that is what keeps stdin open
 * with no data — so redirecting stdout removes the fifo's only writer, stdin
 * EOFs at once, and the test passes with or without the guard. That was the
 * second vacuous version of this test. Its stderr, meanwhile, inherits the
 * shell's, and execFileSync waits for that pipe to close, so leaving it
 * inherited blocks the call for the full sleep even when the probe returned
 * immediately — a hang that is not one. Redirect stderr, keep stdout.
 */
function runClause1WithGatePath(path) {
  return execFileSync(
    "bash",
    [
      "-c",
      `exec 0< <(sleep ${HOLD_STDIN_SECONDS} 2>/dev/null)\n${clause1()}\nprintf '%s' "$SAFETY_REPROBE"`,
    ],
    {
      env: { ...process.env, LATEST_GATE: path },
      encoding: "utf-8",
      timeout: SPAWN_TIMEOUT_MS,
    },
  ).trim();
}

/** Run the real probe against a gate file and return its SAFETY_REPROBE value. */
function runClause1(yaml) {
  const file = join(tmpdir(), `qa-scope-probe-${randomUUID()}.yml`);
  writeFileSync(file, yaml);
  try {
    return execFileSync(
      "bash",
      ["-c", `${clause1()}\nprintf '%s' "$SAFETY_REPROBE"`],
      {
        env: { ...process.env, LATEST_GATE: file },
        encoding: "utf-8",
        // A hang must FAIL, not stall the suite. Before the guard was added, an
        // empty LATEST_GATE made awk fall back to reading stdin and block
        // forever; without these two options this test would hang the runner
        // instead of reporting. "pipe" gives the child a stdin nothing writes
        // to, which is what reproduces the fallback.
        stdio: ["pipe", "pipe", "pipe"],
        timeout: SPAWN_TIMEOUT_MS,
      },
    ).trim();
  } finally {
    rmSync(file, { force: true });
  }
}

const gateDir = join(
  repoRoot,
  "docs",
  "tasks",
  "task.67.execute-the-skill-qa-gate",
);

test("replay: task.67.gate.1 (security FAIL) fires the trigger", () => {
  const g = join(gateDir, "task.67.gate.1.execute-the-skill-qa-gate.yml");
  assert.ok(existsSync(g), "replay fixture task.67.gate.1 must exist");
  assert.equal(runClause1(readFileSync(g, "utf-8")), "true");
});

/**
 * CHANGED BY task.82, deliberately. This asserted "false" until clause 1 gained
 * its evidence half.
 *
 * `task.67.gate.2` is a real gate: `security: PASS`, no `evidence:` key, because
 * it was written before the key existed. Under the widened clause 1 a missing
 * key reads as `unverified` and FIRES — which is the whole point of the change.
 * Writing that half fail-closed instead would leave every pre-existing gate
 * reporting "no trigger", and the widening would accomplish nothing while
 * appearing to work.
 *
 * So the verdict on this fixture moved from false to true, and the task's own
 * "identical verdicts on the real gate fixtures" regression line could not
 * survive alongside its "a missing key triggers" functional line. The functional
 * line won: it is stated four times in the task, and the alternative is named
 * there as the fail-closed bug in a new place.
 *
 * The `status: PASS` half is still asserted — via `securityStatusOnly()` below,
 * which pins the SAME fixture with evidence supplied, so the status reading is
 * not silently untested now that the evidence half dominates.
 */
test("replay: task.67.gate.2 (security PASS, no evidence key) NOW fires on absence", () => {
  const g = join(gateDir, "task.67.gate.2.execute-the-skill-qa-gate.yml");
  assert.ok(existsSync(g), "replay fixture task.67.gate.2 must exist");
  assert.equal(runClause1(readFileSync(g, "utf-8")), "true");
});

/** The same real gate with `evidence:` supplied — isolates the status half. */
test("replay: task.67.gate.2 with evidence: reasoned does NOT fire", () => {
  const g = join(gateDir, "task.67.gate.2.execute-the-skill-qa-gate.yml");
  const withEvidence = readFileSync(g, "utf-8").replace(
    /^(\s*)status: PASS$/m,
    "$1status: PASS\n$1evidence: reasoned",
  );
  assert.notEqual(
    withEvidence,
    readFileSync(g, "utf-8"),
    "the fixture must actually have been rewritten, or this test is vacuous",
  );
  assert.equal(
    runClause1(withEvidence),
    "false",
    "a PASS whose evidence is stated is not a trigger — the status half must " +
      "still read PASS correctly now that the evidence half exists",
  );
});

/**
 * This test is about ONE thing: the probe must not read a different axis's
 * `status:` as the security one. task.82 added `evidence: reasoned` to the
 * fixture so that the new evidence half does not fire and mask what is being
 * asserted — without it, this returns true for a reason that has nothing to do
 * with maintainability, and the original assertion stops testing anything.
 */
test("replay: CONCERNS on maintainability does not fire the trigger", () => {
  assert.equal(
    runClause1(
      [
        "schema: 1",
        "gate: CONCERNS",
        "nfr_validation:",
        "  security:",
        "    status: PASS",
        "    evidence: reasoned",
        "  maintainability:",
        "    status: FAIL",
        "",
      ].join("\n"),
    ),
    "false",
  );
});

test("replay: a gate with no security axis does not fire the trigger", () => {
  assert.equal(
    runClause1(
      [
        "schema: 1",
        "gate: FAIL",
        "nfr_validation:",
        "  maintainability:",
        "    status: FAIL",
        "",
      ].join("\n"),
    ),
    "false",
  );
});

/* ---------------------------------------------------------------------------
 * 6. The probe must not HANG when there is no prior gate.
 *
 * `LATEST_GATE` is empty by construction on a first review — it comes from
 * `ls -t … | head -1` with nothing on disk. `awk 'prog' ""` passes no filename,
 * so awk falls back to reading stdin and blocks INDEFINITELY: a hang, not an
 * error, carrying no diagnostic. Only the prose heading "For re-reviews" kept
 * the block from running then, and a prose guard in front of an indefinite hang
 * is not a guard.
 *
 * These tests would have hung the runner before the fix; the spawn budget's timeout turns
 * that into a failure instead of a stall.
 * ------------------------------------------------------------------------- */

test("clause-1 returns false, and does not hang, when LATEST_GATE is empty", () => {
  assert.equal(runClause1WithGatePath(""), "false");
});

test("clause-1 returns false, and does not hang, when LATEST_GATE does not exist", () => {
  const missing = join(tmpdir(), `qa-scope-absent-${randomUUID()}.yml`);
  assert.ok(!existsSync(missing), "fixture path must not exist");
  assert.equal(runClause1WithGatePath(missing), "false");
});

test("clause-1 guards the read before invoking awk", () => {
  assert.match(
    clause1(),
    /\[ -n "\$LATEST_GATE" \] && \[ -r "\$LATEST_GATE" \]/,
    "the probe must test that LATEST_GATE is set and readable before running awk",
  );
  assert.ok(
    clause1().includes("</dev/null"),
    "the probe must close stdin so awk's read-stdin fallback is unreachable even " +
      "if the guard is later removed",
  );
});

/* ---------------------------------------------------------------------------
 * 7. task.82 Phase 1 — the `evidence:` addition must not disturb clause 1.
 *
 * `nfr_validation.security` is gaining `evidence: measured|reasoned|unverified`
 * (and `probes_executed:`) so that a verdict reached by executing probes is
 * distinguishable from one reached by reading. The whole risk of that change
 * is THIS probe: its awk program takes the FIRST `status:` line after
 * `security:`, so a key inserted in the wrong place changes what it reads —
 * and it fails CLOSED and SILENTLY, exactly like the `\s` bug one section up.
 *
 * These four tests ran GREEN against the unmodified probe before any schema
 * edit was made (34 pass / 0 fail, 2026-09-09), which is what makes them
 * evidence about placement rather than a restatement of the new behaviour.
 * ------------------------------------------------------------------------- */

/** A gate carrying the new shape, with `evidence:` in its sanctioned position. */
function gateWithEvidence(status, evidence, extra = []) {
  return [
    "schema: 1",
    `gate: ${status === "FAIL" ? "FAIL" : "PASS"}`,
    "nfr_validation:",
    "  security:",
    `    status: ${status}`,
    `    evidence: ${evidence}`,
    ...extra,
    "    notes: 'from the shipped review-security block'",
    "  performance:",
    "    status: PASS",
    "",
  ].join("\n");
}

test("evidence: after status: leaves a security FAIL still firing the trigger", () => {
  assert.equal(
    runClause1(
      gateWithEvidence("FAIL", "measured", ["    probes_executed: 12"]),
    ),
    "true",
    "adding evidence: BELOW status: must not stop clause 1 seeing the FAIL",
  );
});

test("evidence: after status: leaves a security PASS still not firing", () => {
  assert.equal(
    runClause1(
      gateWithEvidence("PASS", "measured", ["    probes_executed: 12"]),
    ),
    "false",
    "adding evidence: BELOW status: must not invent a trigger on a passing gate",
  );
});

test("probes_executed: between status: and notes: does not disturb the probe", () => {
  // The count sits below `status:` too, so the first-status-wins scan is
  // unaffected. Asserted separately from `evidence:` because the two keys land
  // in the same block and a future edit could reorder only one of them.
  assert.equal(
    runClause1(
      gateWithEvidence("FAIL", "reasoned", ["    probes_executed: 0"]),
    ),
    "true",
  );
});

/**
 * The ordering control, rewritten by task.82 once clause 1 gained its evidence
 * half — and the rewrite is the interesting part.
 *
 * The original fixture (a value that is not FAIL occupying the first `status:`
 * slot, no `evidence:` key) now returns TRUE. Not because the hijack was
 * detected, but because the missing evidence key fires independently. The
 * evidence half MASKS the status hijack, and a fixture that cannot tell the two
 * apart is not a control.
 *
 * So the fixture carries `evidence: measured` — silencing the evidence half —
 * and the assertion is then purely about the status slot. This is the remaining
 * hazard, and it is now sharper than before: once gates routinely carry
 * evidence, a hijacked status slot is once again silent.
 */
test("with evidence supplied, a hijacked first status: slot silently disables the FAIL trigger", () => {
  const broken = [
    "schema: 1",
    "gate: FAIL",
    "nfr_validation:",
    "  security:",
    "    status: measured", // an evidence-shaped value reaching the status slot
    "    status: FAIL",
    "    evidence: measured",
    "    probes_executed: 9",
    "    notes: 'the forbidden placement'",
    "",
  ].join("\n");
  assert.equal(
    runClause1(broken),
    "false",
    "first-status-wins: a non-FAIL value occupying the first status slot " +
      "disables the carve-out, and with evidence supplied nothing else catches " +
      "it — this is why evidence: must go BELOW status:, and it fails closed " +
      "with no diagnostic",
  );
});

/* ---------------------------------------------------------------------------
 * 8. task.82 Phase 3 — clause 1 reads `evidence`, and fails OPEN on absence.
 *
 * The inversion is the point. The status half fails closed; this half must fail
 * open, or every gate written before the field existed reads as "no trigger".
 * ------------------------------------------------------------------------- */

/** A security block with an arbitrary set of keys, at the canonical indent. */
function securityBlock(...keys) {
  return [
    "schema: 1",
    "gate: PASS",
    "nfr_validation:",
    "  security:",
    ...keys.map((k) => `    ${k}`),
    "  performance:",
    "    status: PASS",
    "",
  ].join("\n");
}

test("evidence: unverified fires even when status is PASS", () => {
  assert.equal(
    runClause1(securityBlock("status: PASS", "evidence: unverified")),
    "true",
  );
});

test("evidence: measured does not fire on a passing gate", () => {
  assert.equal(
    runClause1(
      securityBlock(
        "status: PASS",
        "evidence: measured",
        "probes_executed: 12",
      ),
    ),
    "false",
  );
});

test("evidence: reasoned does not fire on a passing gate", () => {
  assert.equal(
    runClause1(securityBlock("status: PASS", "evidence: reasoned")),
    "false",
  );
});

test("a security block with NO evidence: key fires — the fail-open half", () => {
  assert.equal(
    runClause1(securityBlock("status: PASS", "notes: 'pre-task.82 gate'")),
    "true",
    "a missing key must read as unverified, not as reasoned — otherwise every " +
      "gate predating the field silently never triggers",
  );
});

test("no security block at all is still a non-trigger, evidence half notwithstanding", () => {
  assert.equal(
    runClause1(
      [
        "schema: 1",
        "gate: PASS",
        "nfr_validation:",
        "  maintainability:",
        "    status: PASS",
        "",
      ].join("\n"),
    ),
    "false",
    "absence of the KEY means the verdict does not say how it was reached; " +
      "absence of the BLOCK means the gate makes no security claim. Only the " +
      "first is a gap in evidence",
  );
});

test("a quoted or comment-suffixed evidence value still parses", () => {
  assert.equal(
    runClause1(securityBlock("status: PASS", "evidence: 'reasoned'")),
    "false",
  );
  assert.equal(
    runClause1(
      securityBlock("status: PASS", "evidence: reasoned # read, not run"),
    ),
    "false",
  );
});

test("a later axis's evidence: cannot be read as the security block's", () => {
  assert.equal(
    runClause1(
      [
        "schema: 1",
        "gate: PASS",
        "nfr_validation:",
        "  security:",
        "    status: PASS",
        "  performance:",
        "    status: PASS",
        "    evidence: measured",
        "",
      ].join("\n"),
    ),
    "true",
    "the security block ends at the next key at or left of its indent, so " +
      "performance's evidence must NOT satisfy security's — security here has " +
      "no evidence of its own and must fire",
  );
});

test("the shared rule states the fail-open inversion in prose, not only in code", () => {
  const t = ruleText();
  assert.match(
    t,
    /fails?\s+\*\*open\*\*|fail\s+\*\*open\*\*/i,
    "the rule must say the evidence half fails open — the asymmetry with the " +
      "status half is the single thing a future editor is most likely to " +
      "'tidy' into consistency",
  );
  // Structural, not a substring scan: read the rule's markdown LINK TARGETS and
  // require the definition to be one of them. The filename appearing anywhere —
  // in prose, in a code comment, inside another link's text — would satisfy a
  // substring test without the rule actually pointing anywhere.
  const linkTargets = [...t.matchAll(/\]\(([^)\s]+)\)/g)].map((m) =>
    m[1].split("/").pop(),
  );
  assert.ok(
    linkTargets.includes("qa-gate-security-evidence.md"),
    "the rule must LINK to the file defining the three evidence values; found " +
      `targets: ${[...new Set(linkTargets)].join(", ")}`,
  );
});

/* ---------------------------------------------------------------------------
 * 9. task.82 Phase 2 — `measured` is a claim, not an adjective.
 *
 * `evidence: measured` asserts that hostile candidates were EXECUTED. Asserting
 * it with a zero count is a schema error, not a warning: zero executed
 * candidates is a finding, not a pass. Same rule `review-security` holds on its
 * own machine block, and `finalise-dod-security-prompt.md` holds one layer up.
 * ------------------------------------------------------------------------- */

const EVIDENCE_DEF_PATH = join(
  repoRoot,
  "shared",
  "resources",
  "qa-gate-security-evidence.md",
);

/**
 * Read `nfr_validation.security`'s evidence fields out of a gate.
 *
 * Deliberately anchored on the NESTING, not on the bare key: the gate schema
 * also carries a TOP-LEVEL `evidence:` block (tests_reviewed / trace), and a
 * scan for `evidence:` alone matches both. That collision is why this helper
 * exists rather than a one-line regex.
 */
function readSecurityEvidence(yaml) {
  const lines = yaml.split("\n");
  let indent = null;
  const out = { evidence: null, probes_executed: null, found: false };
  for (const line of lines) {
    if (indent === null) {
      const m = /^(\s*)security:\s*$/.exec(line);
      if (m) {
        indent = m[1].length;
        out.found = true;
      }
      continue;
    }
    if (/\S/.test(line) && /^\s*/.exec(line)[0].length <= indent) break;
    const ev = /^\s*evidence:\s*['"]?([a-z]+)/.exec(line);
    if (ev && out.evidence === null) out.evidence = ev[1];
    const pe = /^\s*probes_executed:\s*(\d+)/.exec(line);
    if (pe && out.probes_executed === null) out.probes_executed = Number(pe[1]);
  }
  return out;
}

test("the documented gate schema satisfies measured ⇒ probes_executed > 0", () => {
  for (const [name, text] of skillText) {
    const blocks = [...text.matchAll(/```yaml\n([\s\S]*?)```/g)].map(
      (m) => m[1],
    );
    const withSecurity = blocks.filter((b) => /^\s*security:\s*$/m.test(b));
    assert.ok(
      withSecurity.length > 0,
      `${name} must document a gate block carrying nfr_validation.security`,
    );
    for (const b of withSecurity) {
      const { evidence, probes_executed } = readSecurityEvidence(b);
      if (evidence === "measured") {
        assert.ok(
          Number.isInteger(probes_executed),
          `${name}: a documented block asserting evidence: measured must also ` +
            `carry probes_executed`,
        );
      }
    }
  }
});

test("every gate on disk honours measured ⇒ probes_executed > 0", () => {
  // Scans the real corpus, not a fixture — so a gate written after this task
  // that claims `measured` with nothing executed reddens the build.
  // `--others --exclude-standard` alongside `--cached` is load-bearing, not
  // thoroughness. A plain `git ls-files` lists only TRACKED files, and a QA
  // gate is written and checked BEFORE it is committed — so the one moment
  // this check exists for is the moment it would see nothing. Found by
  // mutation-proving: dropping a violating gate into the tree left the suite
  // green.
  const gates = execFileSync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "docs/**/*.gate.*.yml",
      "docs/**/*.gate.*.yaml",
    ],
    { cwd: repoRoot, encoding: "utf-8", timeout: SPAWN_TIMEOUT_MS },
  )
    .split("\n")
    .filter(Boolean);
  assert.ok(
    gates.length > 0,
    "the gate corpus must be non-empty, or this test is vacuous — it would " +
      "pass by finding nothing to check",
  );
  let checked = 0;
  for (const rel of gates) {
    const { evidence, probes_executed } = readSecurityEvidence(
      readFileSync(join(repoRoot, rel), "utf-8"),
    );
    if (evidence === null) continue; // pre-task.82 gate — reads as unverified
    checked += 1;
    if (evidence === "measured") {
      assert.ok(
        Number.isInteger(probes_executed) && probes_executed > 0,
        `${rel}: evidence: measured with probes_executed ` +
          `${probes_executed === null ? "absent" : probes_executed} — zero ` +
          `executed candidates is a finding, not a pass`,
      );
    }
    assert.ok(
      ["measured", "reasoned", "unverified"].includes(evidence),
      `${rel}: evidence: ${evidence} is not one of measured|reasoned|unverified`,
    );
  }
  // `checked` is reported rather than asserted non-zero: adoption is
  // going-forward only, so zero is the correct value on the day this lands and
  // a floor here would be a false failure. The vacuity that matters — an empty
  // gate corpus — is asserted above.
  assert.ok(checked >= 0);
});

test("the three evidence values are defined once, in a shared resource", () => {
  assert.ok(
    existsSync(EVIDENCE_DEF_PATH),
    "shared/resources/qa-gate-security-evidence.md must exist — the values are " +
      "consumed by qa-task, qa-story and the re-review rule, and restating them " +
      "in each is the drift task.74 found three copies of",
  );
  const def = readFileSync(EVIDENCE_DEF_PATH, "utf-8");
  for (const v of ["measured", "reasoned", "unverified"]) {
    assert.ok(def.includes(v), `the definition must name ${v}`);
  }
  assert.match(
    def,
    /probes_executed/,
    "the definition must carry the probes_executed rule",
  );
  for (const [name, text] of skillText) {
    // Link targets again, for the same reason. `basename` is compared because
    // the bundler rewrites `shared/resources/X` to `references/X` in place, so
    // the directory differs between the source tree and a packaged skill.
    const targets = [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) =>
      m[1].split("/").pop(),
    );
    assert.ok(
      targets.includes("qa-gate-security-evidence.md"),
      `${name} must LINK to the shared definition rather than restating the values`,
    );
  }
});

/**
 * The corpus scan above is VACUOUS TODAY — adoption is going-forward only, so
 * no gate on disk carries `evidence:` yet and the loop checks nothing. A scan
 * that finds no instance of the class it exists to judge is indistinguishable
 * from a scan that is broken, so the reader is exercised directly here against
 * both a violating and a conforming input. Without this, the first gate to
 * claim `measured` with nothing executed would be the test's first real input.
 */
test("readSecurityEvidence catches the violation the corpus scan exists to catch", () => {
  const violating = [
    "nfr_validation:",
    "  security:",
    "    status: PASS",
    "    evidence: measured",
    "    probes_executed: 0",
    "",
  ].join("\n");
  const v = readSecurityEvidence(violating);
  assert.equal(v.evidence, "measured");
  assert.equal(v.probes_executed, 0);
  assert.ok(
    !(Number.isInteger(v.probes_executed) && v.probes_executed > 0),
    "a zero count under evidence: measured must fail the invariant",
  );

  const conforming = violating.replace(
    "probes_executed: 0",
    "probes_executed: 7",
  );
  const c = readSecurityEvidence(conforming);
  assert.equal(c.probes_executed, 7);
  assert.ok(Number.isInteger(c.probes_executed) && c.probes_executed > 0);
});

test("readSecurityEvidence ignores the gate's TOP-LEVEL evidence: block", () => {
  // The collision that motivated the helper. A top-level `evidence:` block sits
  // ABOVE nfr_validation in the real schema; a bare-key scan reads its contents
  // as the security axis's.
  const gate = [
    "schema: 1",
    "evidence:",
    "  tests_reviewed: 12",
    "  trace:",
    "    ac_covered: [1, 2]",
    "nfr_validation:",
    "  security:",
    "    status: PASS",
    "",
  ].join("\n");
  const r = readSecurityEvidence(gate);
  assert.equal(
    r.evidence,
    null,
    "the security block has no evidence: of its own — the top-level block is a " +
      "different field and must not be read as one",
  );
  assert.equal(r.found, true);
});

/* ---------------------------------------------------------------------------
 * 10. The probe ships as PROSE AN AGENT COPIES AND RUNS, and two characters can
 * corrupt it in transit. Both of these were real defects in the task.82 change
 * set, found during QA, and both fail silently rather than loudly.
 * ------------------------------------------------------------------------- */

/** The awk program only — between `awk '` and the closing quote before the file arg. */
function awkProgram() {
  const m = /awk '\n([\s\S]*?)\n\s*' "\$LATEST_GATE"/.exec(clause1());
  assert.ok(
    m,
    "clause 1 must invoke awk with a single-quoted multi-line program",
  );
  return m[1];
}

test("the awk program never names the whole-record variable", () => {
  // A harness that loads a SKILL.md with arguments substitutes this token with
  // the invocation argument, so `match(<record>, ...)` arrives as
  // `match(docs/tasks/task.82.../task.82....md, ...)` before awk sees it and the
  // block bounding reads garbage. Observed: qa-task/SKILL.md rendered with 8
  // substitutions when the skill was invoked with a file path.
  //
  // Every reference must use an implicit form instead: a bare /regex/ tests the
  // whole record, `length` with no argument is its length, two-argument sub()
  // edits it in place.
  const prog = awkProgram();
  const hits = [...prog.matchAll(/\$0/g)];
  assert.equal(
    hits.length,
    0,
    `the awk program refers to the whole-record variable ${hits.length} time(s) — ` +
      `a skill harness will substitute each one with its invocation argument`,
  );
});

test("the awk program contains no apostrophe", () => {
  // The program is single-quoted by its caller, so one apostrophe — including
  // one inside a COMMENT — closes the quote early and breaks every downstream
  // fixture at once. Introduced once during this task by rewording a comment
  // from "AWK" to "AWK'S".
  const prog = awkProgram();
  assert.ok(
    !prog.includes("'"),
    "an apostrophe anywhere in the program, comments included, terminates the " +
      "single-quoted string early",
  );
});

test("both skills carry the same two properties", () => {
  // The verbatim-mirroring test above compares the probe body, but it strips
  // comments before comparing — so a comment-only corruption in one skill would
  // not surface there. Check each skill's own text directly.
  for (const [name, text] of skillText) {
    const m = /awk '\n([\s\S]*?)\n\s*' "\$LATEST_GATE"/.exec(text);
    assert.ok(m, `${name} must carry the single-quoted awk program`);
    assert.equal(
      [...m[1].matchAll(/\$0/g)].length,
      0,
      `${name}: the awk program names the whole-record variable`,
    );
    assert.ok(
      !m[1].includes("'"),
      `${name}: the awk program contains an apostrophe`,
    );
  }
});

/* ---------------------------------------------------------------------------
 * 11. An empty reading is a claim about the INSTRUMENT, not about the gate.
 *
 * Found by the cycle-2 refute pass. `absent` is a deliberate answer meaning
 * "this gate has no security block". The EMPTY string means awk produced
 * nothing — it died, it is missing, or its program was corrupted in transit,
 * which is exactly what the whole-record-variable defect did. Collapsing the
 * two into one branch made a security FAIL gate silently not fire.
 *
 * So this is the runtime backstop for section 10's transit constraints: those
 * stop the corruption being introduced, this catches its effect if it ever is.
 * ------------------------------------------------------------------------- */

/** Run the probe with a PATH whose `awk` exits non-zero, producing no output. */
function runClause1WithBrokenAwk(yaml) {
  const dir = join(tmpdir(), `qa-scope-brokenbin-${randomUUID()}`);
  const gate = join(tmpdir(), `qa-scope-gate-${randomUUID()}.yml`);
  mkdirSync(dir, { recursive: true });
  const fake = join(dir, "awk");
  writeFileSync(fake, "#!/bin/sh\nexit 127\n");
  chmodSync(fake, 0o755);
  writeFileSync(gate, yaml);
  try {
    return execFileSync(
      "bash",
      ["-c", `${clause1()}\nprintf '%s' "$SAFETY_REPROBE"`],
      {
        env: {
          ...process.env,
          LATEST_GATE: gate,
          PATH: `${dir}:${process.env.PATH}`,
        },
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: SPAWN_TIMEOUT_MS,
      },
    ).trim();
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(gate, { force: true });
  }
}

test("a broken reader fires the trigger — empty is not `absent`", () => {
  const failGate = [
    "schema: 1",
    "gate: FAIL",
    "nfr_validation:",
    "  security:",
    "    status: FAIL",
    "",
  ].join("\n");
  // Control: with a working awk this gate fires for the ordinary reason.
  assert.equal(
    runClause1(failGate),
    "true",
    "control: the FAIL must fire normally",
  );
  // The finding: with a broken awk it must STILL fire, because nothing has
  // established that the security axis is fine.
  //
  // This assertion is VACUOUS IN ISOLATION — if the PATH shadow ever failed to
  // take effect, awk would work and a FAIL gate returns "true" either way. The
  // companion test below, on a CLEAN gate, is what proves the shadow took
  // effect: it returns "false" with a working awk and "true" only with a broken
  // one. Do not delete it as redundant; it is the discriminating half.
  assert.equal(
    runClause1WithBrokenAwk(failGate),
    "true",
    "a reader that produced no verdict must fail OPEN — otherwise a corrupted " +
      "awk program silently disables the carve-out, which is the same failure " +
      "the transit constraints exist to prevent, one layer down",
  );
});

test("a broken reader fires even on a gate that would otherwise be clean", () => {
  const cleanGate = [
    "schema: 1",
    "gate: PASS",
    "nfr_validation:",
    "  security:",
    "    status: PASS",
    "    evidence: measured",
    "    probes_executed: 9",
    "",
  ].join("\n");
  assert.equal(runClause1(cleanGate), "false", "control: this gate is clean");
  assert.equal(
    runClause1WithBrokenAwk(cleanGate),
    "true",
    "the instrument being broken is not evidence that the gate is clean",
  );
});

test("`absent` and an empty reading are distinct branches in the case", () => {
  // Structural, so the distinction cannot be tidied away into one wildcard.
  const probe = clause1();
  assert.match(
    probe,
    /absent\)\s*:\s*;;/,
    "`absent` must be its own no-op branch",
  );
  assert.match(
    probe,
    /\*\)\s*SAFETY_REPROBE=true\s*;;/,
    "the catch-all must set the trigger, not fall through silently",
  );
});
