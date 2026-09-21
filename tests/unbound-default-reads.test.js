"use strict";
/**
 * Unbound-default-read guard — a `${NAME:-default}` or `${NAME:?}` read in the
 * fenced bash of an invoked `SKILL.md` or a shared pipeline step doc must have
 * a writer in the same file, be a declared INPUT, or be a pinned known defect.
 *
 * WHY THIS EXISTS (obs #133)
 * ---------------------------
 * `develop-pipeline-resume-contract.md` read `${BASE_BRANCH:-develop}` from its
 * first commit through five QA cycles, and no pipeline binds `BASE_BRANCH`. Every
 * run was a feature branch off develop, so the default was right on every run and
 * the unbound read was invisible — a constant wearing a variable's name. Four text
 * reviews read the line; the fifth reviewer asked "who binds this?". A `:?` with
 * no writer is the other half: a guaranteed failure on the path nobody ran.
 *
 * WHAT IT CHECKS
 * --------------
 * For every `${NAME:-…}` / `${NAME:?…}` inside a ```bash / ```sh fence of the
 * files in scope, NAME is one of:
 *   (a) BOUND in the same file's fenced bash — `NAME=…`, `read NAME`, `export
 *       NAME`, `local NAME`, `for NAME in`. Same FILE, not same block: the
 *       per-block rule is the reviewer's (code-review-prompt.md check E); this
 *       guard is the coarser floor that a whole document never binds a name.
 *   (b) a declared INPUT — an environment knob or Skill arg the document
 *       documents as coming from outside, listed in INPUTS with the reason.
 *   (c) a KNOWN_UNBOUND pin — a defect already observed, listed with its
 *       observation id. The pin asserts the read is STILL unbound, so binding it
 *       turns this test red and tells the fixer to delete the pin: a fixed defect
 *       does not stay on an allow-list that would hide its return.
 * A read in none of the three is the finding.
 *
 * Both lists are explicit and reasoned. Neither is a wildcard, and the test
 * carries a non-vacuity floor on the reads it inspects.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");

// Declared inputs — `file#NAME`: why the document may read it unbound.
const INPUTS = new Map([
  [
    "skills/create-issue/SKILL.md#JIRA_PROJECT_KEY",
    "environment knob (Jira project), documented in the skill's env table",
  ],
  [
    "skills/finalise/SKILL.md#FINALISE_CI_MAX_WAIT",
    "environment knob (CI wait ceiling), documented beside the read",
  ],
  [
    "skills/review-pr/SKILL.md#TARGET",
    "the Skill's positional argument, bound by the invocation",
  ],
  [
    "shared/resources/develop-pipeline-step-8-commit.md#IMPLEMENTATION_REPORT",
    "passed by the orchestrator as an env var (finalise Step 6a states the same contract)",
  ],
]);

// Known-unbound pins — `file#NAME`: the observation that recorded it. Binding
// the name makes the pin stale and this test red; delete the pin with the fix.
const KNOWN_UNBOUND = new Map([
  // (empty since task.132 bound step-8's BASE_BRANCH from the PR base — the pin that was here is the shape a new one takes)
]);

function fencedBash(text) {
  return [...text.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g)]
    .map((m) => m[1])
    .join("\n");
}

function filesInScope() {
  const skills = fs
    .readdirSync(path.join(REPO_ROOT, "skills"))
    .map((s) => `skills/${s}/SKILL.md`)
    .filter((f) => fs.existsSync(path.join(REPO_ROOT, f)));
  const shared = fs
    .readdirSync(path.join(REPO_ROOT, "shared/resources"))
    .filter((f) => /^develop-pipeline-.*\.md$/.test(f))
    .map((f) => `shared/resources/${f}`);
  return [...skills, ...shared];
}

function isBound(name, fences) {
  return (
    new RegExp(`(^|[^A-Za-z0-9_])${name}=`, "m").test(fences) ||
    new RegExp(`\\b(export|read|local)\\s+(-[a-z]+\\s+)?${name}\\b`).test(
      fences,
    ) ||
    new RegExp(`\\bfor\\s+${name}\\s+in\\b`).test(fences)
  );
}

test("every ${NAME:-default} / ${NAME:?} read in fenced bash has a writer in its file, is a declared input, or is a pinned known defect (obs #133)", () => {
  const seen = new Set();
  const unexplained = [];
  const stalePins = [];
  let reads = 0;
  for (const rel of filesInScope()) {
    const fences = fencedBash(
      fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"),
    );
    for (const m of fences.matchAll(/\$\{([A-Z_][A-Z0-9_]*):[-?]/g)) {
      reads++;
      const key = `${rel}#${m[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const bound = isBound(m[1], fences);
      if (bound && KNOWN_UNBOUND.has(key)) stalePins.push(key);
      if (bound || INPUTS.has(key) || KNOWN_UNBOUND.has(key)) continue;
      unexplained.push(key);
    }
  }
  assert.ok(
    reads >= 30,
    `non-vacuity floor: expected ≥ 30 default-form reads in scope, found ${reads}`,
  );
  assert.deepEqual(
    unexplained,
    [],
    `default-form reads with no writer in their file, not declared in INPUTS, not pinned in KNOWN_UNBOUND:\n  ${unexplained.join("\n  ")}\n(ask "who binds this?" — a default with no writer is a constant wearing a variable's name)`,
  );
  assert.deepEqual(
    stalePins,
    [],
    `KNOWN_UNBOUND pins whose name is now bound — the defect was fixed; delete the pin:\n  ${stalePins.join("\n  ")}`,
  );
});

test("the lists are reasoned, not wildcards — every entry names a real file#NAME that the scan reaches", () => {
  const reachable = new Set();
  for (const rel of filesInScope()) {
    const fences = fencedBash(
      fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"),
    );
    for (const m of fences.matchAll(/\$\{([A-Z_][A-Z0-9_]*):[-?]/g))
      reachable.add(`${rel}#${m[1]}`);
  }
  for (const [k, why] of [...INPUTS, ...KNOWN_UNBOUND]) {
    assert.ok(
      reachable.has(k),
      `${k} is listed but no read of that form exists in scope — remove the stale entry`,
    );
    assert.ok(why && why.length > 10, `${k} needs a stated reason`);
  }
});
