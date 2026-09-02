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
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// The spawn budget is the single source for child-process timeouts. A literal
// chosen against an idle machine is roughly 1.2× the loaded worst case, which
// is what bug.2 was about, and `tests/test-harness-concurrency.test.js` fails
// the build on any `timeout: <number>` literal in a test file.
import { spawnBudget } from "../../../shared/resources/tests/spawn-budget.mjs";

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

const CLAUSE_1 = extractProbe();

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
  const body = normalise(CLAUSE_1);
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
    !/\\s|\\d|\\w/.test(CLAUSE_1),
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
      `exec 0< <(sleep ${HOLD_STDIN_SECONDS} 2>/dev/null)\n${CLAUSE_1}\nprintf '%s' "$SAFETY_REPROBE"`,
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
      ["-c", `${CLAUSE_1}\nprintf '%s' "$SAFETY_REPROBE"`],
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

test("replay: task.67.gate.2 (security PASS) does not fire the trigger", () => {
  const g = join(gateDir, "task.67.gate.2.execute-the-skill-qa-gate.yml");
  assert.ok(existsSync(g), "replay fixture task.67.gate.2 must exist");
  assert.equal(runClause1(readFileSync(g, "utf-8")), "false");
});

test("replay: CONCERNS on maintainability does not fire the trigger", () => {
  assert.equal(
    runClause1(
      [
        "schema: 1",
        "gate: CONCERNS",
        "nfr_validation:",
        "  security:",
        "    status: PASS",
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
    CLAUSE_1,
    /\[ -n "\$LATEST_GATE" \] && \[ -r "\$LATEST_GATE" \]/,
    "the probe must test that LATEST_GATE is set and readable before running awk",
  );
  assert.ok(
    CLAUSE_1.includes("</dev/null"),
    "the probe must close stdin so awk's read-stdin fallback is unreachable even " +
      "if the guard is later removed",
  );
});
