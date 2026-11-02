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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
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
      /\*\*Flat-count reading\*\*: \{stall \| discovery\} — \{file\}: \{mechanism\}\[; \{file\}: \{mechanism\} …\], cycle \{N-1\} vs cycle \{N\}/,
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
      /never a patch to it, which the resumed run refuses \(filling rule 1\)/,
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
    /`high_files\(\)`\s+function under \*\*Third-strike rule — replace, do not patch again\*\*/,
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

// ── Which gates the third-strike comparison reads, per halt (task.239 bug.1) ──
// A loop-limit grant re-enters at 5a, so the resumed 5b compares gates N-1, N and the gate the
// resumed review writes, not N-2..N. Run the doc's own high_files() and its two commands on gates
// where a file is HIGH at N-1 and N only: the three-gate block must miss it and the loop-limit
// command must list it, or the escalation recommends a patch the resumed run refuses.
test("loop-limit escalation lists a file struck at the last two gates; the three-gate block does not", () => {
  const fence = fenceAfter(
    loopDoc,
    "#### Third-strike rule — replace, do not patch again",
  );
  const body = fence.slice(fence.indexOf("\n") + 1); // drop the ```bash info string
  const fnEnd = body.indexOf("\n}\n");
  assert.ok(
    body.includes("high_files() {") && fnEnd > 0,
    "high_files() not found in its fence",
  );
  const highFiles = body.slice(0, fnEnd + 3);
  const threeGate = body.slice(fnEnd + 3);
  assert.match(
    threeGate,
    /comm -12 <\(comm -12/,
    "the three-gate block is not after the function",
  );

  const rules = loopDoc.slice(
    loopDoc.indexOf(
      "#### Filling the escalation entry — rules both templates share",
    ),
  );
  const row = rules.split("\n").find((l) => /^\s*\| Loop limit/.test(l));
  assert.ok(row, "the filling rules have no Loop limit row");
  const cells = row.split(" | ").map((c) => c.trim());
  // task.244: a loop-limit halt is written at a gate, so a grant re-enters at 5b (5a only when code
  // moved since gate N) and the resumed 5b runs the stall's three-gate comparison: the row's own
  // command is that block, listed as struck. The two-gate command survives in the prose below the
  // table, for the 5a re-entry, where a file HIGH at N-1 and N is one strike from the rule.
  // cells[0] is the text before the row's first pipe; cells[2] is "Re-enters at", cells[4] "Run now".
  assert.match(cells[2], /^5b \(or 5a when code moved since gate N\)$/);
  assert.equal(cells[4], "that rule's three-gate `comm -12` block");
  assert.equal(cells[5].replace(/\s*\|$/, ""), "struck");
  const twoGate = rules.match(
    /`(comm -12 <\(high_files "\$GATE_N1"\) <\(high_files "\$GATE_N"\))`/,
  );
  assert.ok(
    twoGate,
    "the prose must carry the two-gate command for the 5a re-entry",
  );
  const loopLimitCmd = twoGate[1];
  assert.match(rules, /one strike from the rule/);

  const dir = mkdtempSync(join(tmpdir(), "t239-strike-"));
  try {
    // two.sh is HIGH at N-1 and N only; three.sh at N-2, N-1 and N (already struck, QA2-CR-3).
    const gate = (...files) =>
      `gate: CONCERNS\ntop_issues:\n${files
        .map(
          (f, i) =>
            `  - id: X-${i}\n    severity: high\n    file: ${f}\n    finding: >-\n      - a wrapped dash\n`,
        )
        .join("")}`;
    writeFileSync(join(dir, "g2.yml"), gate("other.sh", "three.sh"));
    writeFileSync(join(dir, "g1.yml"), gate("two.sh", "three.sh"));
    writeFileSync(join(dir, "g0.yml"), gate("two.sh", "three.sh"));
    const run = (cmd) =>
      execFileSync("bash", ["-c", `${highFiles}\n${cmd}`], {
        encoding: "utf8",
        env: {
          ...process.env,
          GATE_N2: join(dir, "g2.yml"),
          GATE_N1: join(dir, "g1.yml"),
          GATE_N: join(dir, "g0.yml"),
        },
      }).trim();
    // Control: the function reads a gate at all.
    assert.equal(
      run('high_files "$GATE_N"'),
      "three.sh\ntwo.sh",
      "control: high_files reads the fixture",
    );
    const struck = run(threeGate).split("\n").filter(Boolean);
    const listed = run(loopLimitCmd).split("\n").filter(Boolean);
    assert.deepEqual(
      struck,
      ["three.sh"],
      "the three-gate block lists only the file HIGH at all three gates",
    );
    assert.deepEqual(
      listed,
      ["three.sh", "two.sh"],
      "the loop-limit command lists both the two-strike and the three-strike file",
    );
    // The row's labels: struck when the three-gate block also prints it, else one strike from.
    assert.deepEqual(
      listed.filter((f) => !struck.includes(f)),
      ["two.sh"],
      "only two.sh is one strike from the rule",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  for (const [name, t] of Object.entries(TEMPLATES)) {
    assert.match(
      t,
      /struck, or one strike from the third-strike rule, as filling rule 1's table says/,
      `${name} template`,
    );
  }
});

// A stall grant re-enters at 5b, which compares N-2..N and nothing else: the row runs that one
// block, so an escalation entry carries one comparison, not two (task.239 SC-7).
test("stall escalation runs the three-gate block alone and lists its files as struck", () => {
  const rules = loopDoc.slice(
    loopDoc.indexOf(
      "#### Filling the escalation entry — rules both templates share",
    ),
  );
  const row = rules.split("\n").find((l) => /^\s*\| Convergence stall/.test(l));
  assert.ok(row, "the filling rules have no Convergence stall row");
  const cells = row.split(" | ").map((c) => c.trim());
  // cells[0] is the text before the row's first pipe; cells[2] is "Re-enters at".
  assert.equal(cells[2], "5b", "a stall grant re-enters at 5b");
  assert.equal(cells[4], "that rule's three-gate `comm -12` block");
  assert.equal(cells[5].replace(/\s*\|$/, ""), "struck");
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
  // The re-arm condition is "HIGH present and not falling", not "flat" (QA3-CR-1): rising trips,
  // zero never does, and a trio that starts later trips later than the third granted cycle.
  assert.equal(
    convergenceTrip([1, 1, 1, 1, 2, 3], 4),
    6,
    "rising 1,2,3 | after the grant trips",
  );
  assert.equal(
    convergenceTrip([1, 1, 1, 0, 0, 0], 4),
    null,
    "flat zeros never trip",
  );
  assert.equal(
    convergenceTrip([1, 1, 1, 3, 2, 2, 2], 4),
    7,
    "3,2,2,2 trips at the fourth granted cycle",
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

test("every row of the doc's worked-example table agrees with the rule", () => {
  const head = loopDoc.indexOf(
    "| Sequence (cycles, oldest → newest) | `convergence_from_cycle` |",
  );
  assert.ok(head >= 0, "the worked-example table is missing");
  const rows = loopDoc
    .slice(head)
    .split("\n")
    .slice(2)
    .filter((_, i, all) => all.slice(0, i + 1).every((l) => /^\s*\|/.test(l)));
  assert.ok(
    rows.length >= 3,
    `non-vacuity: expected at least 3 rows, parsed ${rows.length}`,
  );
  for (const row of rows) {
    const cells = row
      .replace(/\\\|/g, ",")
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    const highs = cells[0]
      .replace(/\(.*\)/, "")
      .replace(/`/g, "")
      .split(",")
      .map(Number);
    assert.ok(
      highs.length >= 3 && highs.every(Number.isInteger),
      `unparsed sequence: ${row}`,
    );
    const cfc = cells[1] === "absent" ? undefined : Number(cells[1]);
    const said = cells[2].match(/at cycle (\d+)/);
    assert.ok(said, `no "at cycle N" in: ${row}`);
    const want = /^\*\*no\*\*|^no\b/.test(cells[2]) ? null : Number(said[1]);
    assert.equal(
      convergenceTrip(highs, cfc),
      want,
      `the table row disagrees with the rule: ${row}`,
    );
  }
});

test("the step-5-6 Convergence check carries the window clause the function mirrors", () => {
  assert.match(
    loopDoc,
    /Take readings only from cycles `>= convergence_from_cycle`/,
  );
  assert.match(loopDoc, /jq -r '\.convergence_from_cycle \/\/ 1'/);
  assert.match(
    loopDoc,
    /A grant restarts the three-reading rule, so "k more cycles" delivers k cycles unless the guard\s+re-arms first[\s\S]{0,200}HIGH present and not\s+falling\) escalate again at the 5a of the cycle that gives the third of those readings/,
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
