// ---------------------------------------------------------------------------
// qa-escalation-template.test.mjs — the QA loop's escalation and its re-entry
// grant say what the resumed run will do (task.239).
// ---------------------------------------------------------------------------
// Three defects, one shape: the halt told the operator something the resumed
// run then contradicted.
//
//   obs #70  the grant option read "Resume at 5a", and every not-converging
//            grant re-enters at 5b. The label now names the action.
//   obs #71  the escalation recommended patching a file the resumed 5b's
//            third-strike rule forbids patching. The template now runs that
//            comparison and allows only delete, replace or waive.
//   obs #72  a grant of 2 escalated after one cycle: the Convergence check
//            counted the three pre-grant readings. convergence_from_cycle
//            restarts the window at the grant.
//
// The Convergence check is prose an agent runs, not an engine, so the window
// rule is mirrored here as a function and the prose is held to carry the same
// clause. The grant script's write of the field is pinned behaviourally in
// grant-qa-cycles.test.sh.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const LOOP_DOC = "shared/resources/develop-pipeline-step-5-6-qa-loop.md";
const loopDoc = readFileSync(join(ROOT, LOOP_DOC), "utf8");

/** The fenced block that follows `heading` — the template itself, not the prose around it. */
function fenceAfter(markdown, heading) {
  const at = markdown.indexOf(`\n${heading}\n`);
  assert.ok(at >= 0, `${LOOP_DOC} has no heading "${heading}"`);
  const open = markdown.indexOf("\n```", at + heading.length);
  const close = markdown.indexOf("\n```", open + 4);
  assert.ok(open > at && close > open, `no fenced block after "${heading}"`);
  return markdown.slice(open + 4, close);
}

const TEMPLATES = {
  story: fenceAfter(loopDoc, "#### develop-story escalation template"),
  task: fenceAfter(loopDoc, "#### develop-task escalation template"),
};

test("both escalation templates carry the flat-count reading, the third-strike files and the grant boundary", () => {
  for (const [kind, body] of Object.entries(TEMPLATES)) {
    assert.match(
      body,
      /\*\*Flat-count reading\*\*: \{stall \| discovery\} — \{file\}: \{mechanism\}, cycle \{N-1\} vs cycle \{N\}/,
      `${kind} template must carry the Flat-count reading line`,
    );
    assert.match(
      body,
      /\*\*Third-strike files\*\*:/,
      `${kind} template must list the third-strike files`,
    );
    // The three moves the third-strike rule permits, and the one it forbids.
    assert.match(
      body,
      /delete, replace or waive the struck mechanism/,
      `${kind} template must allow only the third-strike rule's three moves`,
    );
    assert.match(
      body,
      /never a patch to it, which the resumed 5b forbids/,
      `${kind} template must forbid recommending a patch to a struck mechanism`,
    );
    assert.match(
      body,
      /\{HIGH_b\} \| \{HIGH_b\+1\}, … \{HIGH_N\} — grant at cycle \{b\}/,
      `${kind} template must mark the grant boundary in the HIGH-findings line`,
    );
    // The third-strike files come BEFORE the recommendation that must obey them.
    assert.ok(
      body.indexOf("**Third-strike files**") <
        body.indexOf("**Recommended next steps**"),
      `${kind} template must list the third-strike files before the recommended steps`,
    );
  }
});

test("the filling rules point at the third-strike comparison, not a copy of it (obs #71)", () => {
  const at = loopDoc.indexOf(
    "#### Filling the escalation entry — rules both templates share",
  );
  assert.ok(at >= 0, "the shared filling rules section is missing");
  const end = loopDoc.indexOf("\n#### ", at + 10);
  const rules = loopDoc.slice(at, end < 0 ? undefined : end);
  assert.match(
    rules,
    /A recommendation written at a halt must already obey the rules the resumed run will apply \(obs #71\)/,
  );
  assert.match(
    rules,
    /`high_files\(\)` \/ `comm -12` block under \*\*Third-strike rule — replace, do not patch again\*\*/,
    "the rules must name the comparison block by its heading",
  );
  assert.match(
    loopDoc,
    /\n#### Third-strike rule — replace, do not patch again\n/,
    "the heading the rules point at must exist",
  );
  // A pointer, not a second implementation: the function is defined once in the doc.
  assert.equal(
    (loopDoc.match(/^high_files\(\) \{/gm) || []).length,
    1,
    "high_files() must be defined exactly once in the step-5-6 doc",
  );
  for (const word of ["**Stall**", "**Discovery**"]) {
    assert.ok(rules.includes(word), `the rules must define ${word}`);
  }
});

// ── The window rule (obs #72) ───────────────────────────────────────────────
/**
 * The Convergence check, as step 3 of the step-5-6 doc states it: count only readings from
 * cycles >= convergenceFromCycle (absent → 1); within that window, from its third reading on,
 * trip when HIGH_N > 0, HIGH_{N-2} > 0 and HIGH_N >= HIGH_{N-1} >= HIGH_{N-2}.
 * `highs[i]` is cycle i + 1's reading. Returns the cycle it trips at, or null.
 */
function convergenceTrip(highs, convergenceFromCycle = 1) {
  for (let n = convergenceFromCycle + 2; n <= highs.length; n++) {
    const [a, b, c] = [highs[n - 3], highs[n - 2], highs[n - 1]];
    if (c > 0 && a > 0 && c >= b && b >= a) return n;
  }
  return null;
}

test("window rule: a grant restarts the three-reading rule (task.215 / obs #72)", () => {
  // Control first — the rule must still trip where it always did, or every case below is vacuous.
  assert.equal(
    convergenceTrip([7, 7, 7]),
    3,
    "control: no window, 7,7,7 trips at cycle 3",
  );
  assert.equal(
    convergenceTrip([7, 7, 7, 7, 4]),
    3,
    "the doc's own worked example trips at 3",
  );
  // task.215: three flat readings, a grant at 3, one post-grant reading. No trip at cycle 4.
  assert.equal(
    convergenceTrip([1, 1, 1, 1], 4),
    null,
    "task.215: 1,1,1 | 1 with convergence_from_cycle 4 must not trip at cycle 4",
  );
  // The same sequence without the window is exactly the defect.
  assert.equal(
    convergenceTrip([1, 1, 1, 1]),
    3,
    "without the window the pre-grant readings trip it",
  );
  // The guard re-arms once three post-grant readings exist.
  assert.equal(
    convergenceTrip([1, 1, 1, 1, 1, 1], 4),
    6,
    "1,1,1 | 1,1,1 trips at cycle 6",
  );
  assert.equal(
    convergenceTrip([1, 1, 1, 3, 2, 1], 4),
    null,
    "a post-grant run that strictly decreases never trips",
  );
});

test("the step-5-6 Convergence check carries the window clause the function mirrors", () => {
  assert.match(
    loopDoc,
    /Take readings only from cycles `>= convergence_from_cycle`/,
  );
  assert.match(loopDoc, /jq -r '\.convergence_from_cycle \/\/ 1'/);
  assert.match(
    loopDoc,
    /A grant restarts the three-reading rule, so "k more cycles" delivers k cycles/,
  );
  assert.match(
    loopDoc,
    /\| `1, 1, 1 \\\| 1` \(cycles 1–4\) \| 4 \| \*\*no\*\*, at cycle 4 \|/,
    "the worked-example table must carry the task.215 row",
  );
});

// ── The label (obs #70) ─────────────────────────────────────────────────────
// Historical records keep the old words: task and PRD documents, the CHANGELOG and plans describe
// what was true then. Bundled references/ copies are regenerated from the sources this covers.
const SWEEP_EXCLUDES = [
  ":!skills/*/references/*",
  ":!docs/tasks/*",
  ":!docs/prd/*",
  ":!CHANGELOG.md",
  ":!.agents/plans/*",
];
const gitGrep = (needle) => {
  try {
    return execFileSync(
      "git",
      ["grep", "-l", "-F", needle, "--", ...SWEEP_EXCLUDES],
      { cwd: ROOT, encoding: "utf8" },
    )
      .split("\n")
      .filter(Boolean);
  } catch (err) {
    if (err.status === 1) return []; // git grep: no match
    throw err;
  }
};

test("label sweep: no site names a phase in the grant option, and every site names the action", () => {
  // Built, not written: a literal here would be a site the sweep finds.
  const OLD = ["Resume at", "5a with"].join(" ");
  const NEW = "Resume the QA loop with";
  assert.deepEqual(gitGrep(OLD), [], `"${OLD}" must not survive anywhere`);
  const sites = gitGrep(NEW);
  const EXPECTED = [
    "docs/reference/troubleshooting.md",
    "evals/develop-story/step-isolation/12-qa-reentry-after-loop-limit-with-grant/answers.jsonl",
    "evals/develop-task/step-isolation/12-qa-reentry-after-loop-limit-with-grant/answers.jsonl",
    "shared/resources/develop-pipeline-resume-contract.md",
    "shared/resources/develop-pipeline-step-5-6-qa-loop.md",
    "shared/resources/grant-qa-cycles.sh",
    "skills/develop-story/README.md",
    "skills/develop-story/SKILL.md",
    "skills/develop-task/README.md",
    "skills/develop-task/SKILL.md",
  ];
  assert.ok(
    sites.length >= EXPECTED.length,
    `non-vacuity: found ${sites.length} sites`,
  );
  for (const path of EXPECTED) {
    assert.ok(sites.includes(path), `${path} must carry "${NEW}"`);
  }
});
