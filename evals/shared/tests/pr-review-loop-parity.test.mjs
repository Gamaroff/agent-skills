/**
 * Asserts that Step 5c — the PR conformance review — is wired into the shared
 * QA loop, wired at the right PLACE, and routes the way the contract says.
 *
 * WHY THIS EXISTS
 * ---------------
 * Three things drift independently, and none of them is caught by the protocol
 * evals (which only check that a keyword appears somewhere in the step file):
 *
 *   1. THE ROUTING. `REQUEST CHANGES` must return to 5b and consume a cycle
 *      from the shared 5-cycle budget; `APPROVE` and `CONCERNS` must exit to
 *      Step 7. A file can name review-pr and still describe the wrong graph.
 *   2. THE ORDER OF `ready-for-merge`. It moved out of 5a's outcome branching
 *      and into 5c with task 77, because signalling merge-readiness the moment
 *      a gate read PASS advertised a card as mergeable while the run could
 *      still loop back into qa-fix. A later edit that moves it back would be
 *      invisible to every other test — transition-protocol-parity only asserts
 *      the stage appears SOMEWHERE in this file.
 *   3. THE ADVISORY CONTRACT. 5c is legitimate only because /review-pr reports
 *      a verdict and the ORCHESTRATOR acts on it. If the step file ever gives
 *      5c the power to write a gate, the wiring becomes the thing task 66
 *      deliberately refused to build.
 *
 * Run: node --test evals/shared/tests/pr-review-loop-parity.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");

const read = (p) => readFileSync(join(repoRoot, p), "utf-8");

const loopDoc = read("shared/resources/develop-pipeline-step-5-6-qa-loop.md");
const reviewPr = read("skills/review-pr/SKILL.md");
const liteMode = read("shared/resources/develop-pipeline-lite-mode.md");
const defaults = read(
  "shared/resources/develop-pipeline-autonomous-defaults.md",
);
const ingester = read("shared/resources/qa-findings-ingester-prompt.md");
const banner = read(
  "shared/resources/develop-pipeline-remaining-work-banner.md",
);

/** Line index of the first line matching `re`, or -1. */
function lineOf(text, re) {
  return text.split("\n").findIndex((l) => re.test(l));
}

/**
 * The 5c section ONLY — from its heading to the next H2.
 *
 * Two failure modes this closes, both of which made assertions silently weaker:
 *   - `indexOf` returns -1 when the section is absent, and `slice(-1)` then yields the file's LAST
 *     CHARACTER rather than an empty string. Comparisons against that index (`x > s5c`) are then
 *     trivially true.
 *   - Slicing to end-of-file swept in the whole Loop Escalation section, so a regex like
 *     /REQUEST CHANGES.*5b/s matched prose there and would have passed even if the verdict table
 *     said the opposite.
 */
/**
 * A slice of the QA-loop doc between two markers, with BOTH indices asserted.
 *
 * The -1 trap is why this is a helper rather than inline `indexOf` calls: `slice(-1)` returns the
 * file's LAST CHARACTER, not an empty string, so a renamed heading silently turns
 * `assert.doesNotMatch(section, /…/)` into a test that passes on a one-character string while
 * claiming to guard a whole section. `section5c()` was hardened against exactly this and then two
 * inline slices reproduced it verbatim — which is the argument for having one guarded path.
 *
 * The END index is asserted for the weaker cousin of the same reason: falling back to EOF on a
 * missing end marker does not fail, it silently WIDENS the slice — sweeping in the sections the
 * marker exists to exclude, which is how a `doesNotMatch` guard turns into prose-matching
 * elsewhere in the file. A renamed end marker must fail by name.
 */
function sectionBetween(startMarker, endMarker) {
  const start = loopDoc.indexOf(startMarker);
  assert.ok(
    start > -1,
    `marker not found, so nothing below is being tested: ${startMarker}`,
  );
  const end = loopDoc.indexOf(endMarker, start + startMarker.length);
  assert.ok(
    end > -1,
    `end marker not found after ${JSON.stringify(startMarker)}, so the slice would silently widen to EOF: ${JSON.stringify(endMarker)}`,
  );
  return loopDoc.slice(start, end);
}

function section5c() {
  return sectionBetween("### 5c. ", "\n## ");
}

// ── 1. Placement: 5c sits after 5b and before Loop Escalation ────────────────

test("the QA loop carries a 5c section between 5b and Loop Escalation", () => {
  const s5a = lineOf(loopDoc, /^### 5a\. /);
  const s5b = lineOf(loopDoc, /^### 5b\. /);
  const s5c = lineOf(loopDoc, /^### 5c\. /);
  const esc = lineOf(loopDoc, /^## Loop Escalation /);

  assert.ok(s5a > -1, "5a heading must exist");
  assert.ok(s5b > -1, "5b heading must exist");
  assert.ok(s5c > -1, "5c must exist — this is the exit gate task 77 adds");
  assert.ok(esc > -1, "Loop Escalation heading must exist");
  assert.ok(
    s5a < s5b && s5b < s5c && s5c < esc,
    `expected 5a(${s5a}) < 5b(${s5b}) < 5c(${s5c}) < escalation(${esc})`,
  );
});

// ── 2. The gate hands to 5c, rather than exiting on its own ──────────────────

test("a clean QA gate routes to 5c, not straight to Step 7", () => {
  const branching = sectionBetween(
    "### Outcome branching (shared)",
    "### Convergence check",
  );

  for (const gate of ["PASS", "WAIVED"]) {
    const arm = branching
      .split("\n")
      .find((l) => l.startsWith(`- \`${gate}\``));
    assert.ok(arm, `${gate} arm must exist in outcome branching`);
    assert.match(
      arm,
      /proceed to 5c/i,
      `the ${gate} arm must hand to 5c — a clean gate is no longer the loop's exit`,
    );
  }
});

// ── 3. Verdict routing — the graph, not just the vocabulary ──────────────────

test("REQUEST CHANGES returns to 5b and consumes a shared cycle", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /\|[^|\n]*REQUEST CHANGES[^|\n]*\|[^|\n]*5b[^|\n]*\|/,
    "the REQUEST CHANGES table ROW must route back to 5b — not merely prose mentioning both",
  );
  // NOT `budget is **shared**` — that sentence predates the fixes and is already asserted by
  // "the 5-cycle bound covers 5c". Assert what this path actually needs to work: the row points at
  // the invocation block, and that block exists and passes the report.
  assert.match(
    s5c,
    /\|[^|\n]*REQUEST CHANGES[^|\n]*\|[^|\n]*see the invocation below[^|\n]*\|/,
    "the REQUEST CHANGES row must point at the invocation that delivers the findings",
  );
  assert.match(
    s5c,
    /#### Invoking `\/qa-fix` on a REQUEST CHANGES verdict/,
    "that invocation block must exist — without it the path has no way to pass its findings",
  );
  assert.match(
    s5c,
    /re-enters 5b, not 5a/i,
    "entering at 5a would re-run QA against an unchanged tree",
  );
});

test("APPROVE and CONCERNS exit the loop, and CONCERNS does not block", () => {
  const s5c = section5c();
  // The APPROVE row's wording is unchanged from the original 5c section, so asserting it alone
  // pins nothing this cycle fixed. Assert the CONCERNS semantics instead, which is the one of the
  // three verdicts whose behaviour is easy to get wrong (it exits WITHOUT blocking).
  assert.match(
    s5c,
    /\|[^|\n]*APPROVE[^|\n]*\|[^|\n]*(exit the loop|Step 7)[^|\n]*\|/,
    "the APPROVE table ROW must exit the loop",
  );
  assert.match(
    s5c,
    /\|[^|\n]*CONCERNS[^|\n]*\|[^|\n]*Do not block[^|\n]*Step 7[^|\n]*\|/,
    "the CONCERNS row must record findings, not block, AND still exit to Step 7",
  );
  assert.match(
    s5c,
    /CONCERNS.*\*\*Do not block\.\*\*/s,
    "CONCERNS records findings without blocking",
  );
});

test("the 5-cycle bound covers 5c rather than being extended by it", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /budget is \*\*shared\*\*, not additional/i,
    "5c must share the existing 5-cycle budget, never add to it",
  );
});

// ── 4. ready-for-merge fires AFTER the review, not on the QA gate ────────────

test("ready-for-merge sits inside 5c, after the review clears", () => {
  const s5c = loopDoc.indexOf("### 5c. ");
  const stage = loopDoc.indexOf("--stage ready-for-merge");

  assert.ok(
    s5c > -1,
    "the 5c section must exist for this comparison to mean anything",
  );
  assert.ok(stage > -1, "the ready-for-merge stage call must still exist");
  assert.ok(
    stage > s5c,
    "ready-for-merge must sit INSIDE 5c. Before task 77 it fired in 5a's " +
      "outcome branching, which advertised a card as merge-ready while the " +
      "run could still loop back into qa-fix.",
  );

  // And it must not have been left behind in the outcome branching too.
  const branching = sectionBetween(
    "### Outcome branching (shared)",
    "### Convergence check",
  );
  assert.doesNotMatch(
    branching,
    /--stage ready-for-merge/,
    "outcome branching must no longer signal ready-for-merge",
  );
});

test("ready-for-merge is not signalled on REQUEST CHANGES", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /never on REQUEST CHANGES/i,
    "a run still inside the loop must not be advertised as merge-ready",
  );
});

// ── 5. The advisory contract survives the wiring ─────────────────────────────

test("5c consults /review-pr; it does not let it gate", () => {
  const s5c = section5c();
  assert.match(
    s5c,
    /writes no gate/i,
    "the step file must restate that /review-pr writes no gate",
  );
  assert.match(
    reviewPr,
    /Being consulted by a pipeline is not the same as gating one/,
    "review-pr's own SKILL.md must keep the consulted-vs-gating distinction",
  );
  assert.match(
    reviewPr,
    /Gate files remain the exclusive output of `\/qa-story` and `\/qa-task`/,
  );
});

// ── 6. Lite mode degrades, never skips ───────────────────────────────────────

test("lite mode degrades 5c to --effort low and never skips it", () => {
  assert.match(liteMode, /Step 5c \(review-pr\)/, "lite mode must name 5c");
  assert.match(liteMode, /--effort low/);
  assert.match(
    liteMode,
    /never skipped|never skips/i,
    "skipping would remove the conformance check entirely, not shorten it",
  );
});

// ── 7. --comment is passed explicitly, because the pipeline cannot prompt ────

test("the autonomous defaults record the explicit --comment", () => {
  assert.match(
    defaults,
    /`--comment`/,
    "the pipeline passes --comment explicitly — /review-pr otherwise asks first",
  );
  assert.match(defaults, /Step 5c/);
});

// ── 8. The prose names a skill that actually exists ──────────────────────────

test("the skill 5c invokes is installed and named as this file expects", () => {
  // The existsSync + frontmatter pair are preconditions, not claims about task 77 — /review-pr
  // shipped before this change. They are kept so that a rename or deletion fails HERE with a
  // clear message rather than as a confusing mismatch below.
  assert.ok(
    existsSync(join(repoRoot, "skills/review-pr/SKILL.md")),
    "5c invokes /review-pr — its SKILL.md must exist",
  );
  assert.match(
    reviewPr,
    /^name: review-pr$/m,
    "frontmatter name must match the invocation",
  );

  // This is the assertion that is actually about 5c.
  assert.match(
    section5c(),
    /\/review-pr --effort \{medium\|low\} --comment/,
    "the invocation line must carry both flags the contract depends on",
  );
});

test("the REQUEST CHANGES path can actually deliver its findings to qa-fix", () => {
  // The regression this pins: 5c runs on a PASS/WAIVED gate, so a REQUEST CHANGES verdict has no
  // gate `top_issues[]` to travel in. If the ingester does not glob the pr-review report AND 5c
  // does not pass its path, qa-fix reads a clean gate, changes nothing, and the loop HALTs
  // reporting the findings as unfixable when they were never delivered.
  const ingester = read("shared/resources/qa-findings-ingester-prompt.md");
  assert.match(
    ingester,
    /pr-review\.\*\.md/,
    "the findings ingester must glob the PR review report",
  );
  assert.match(
    section5c(),
    /pr_review=/,
    "5c must pass the PR review report path into the qa-fix invocation",
  );
});

test("Loop Setup does not still claim a clean gate exits the loop", () => {
  // The highest-value contradiction: Loop Setup is the first section an agent reads, and if it
  // says a clean PASS exits immediately, 5c is never entered and the whole feature is a silent
  // no-op. Scope to Loop Setup so 5c's own prose cannot satisfy this.
  const start = loopDoc.indexOf("## Loop Setup");
  assert.ok(start > -1, "Loop Setup section must exist");
  const setup = loopDoc.slice(start, loopDoc.indexOf("\n## ", start));
  assert.doesNotMatch(
    setup,
    /clean PASS on any[^.]*exits the loop immediately/i,
    "Loop Setup must not say a clean PASS exits the loop — it hands to 5c",
  );
  assert.match(
    setup,
    /hands to \*\*5c\*\*/,
    "Loop Setup must name 5c as where a clean gate goes",
  );
});

test("the cycle counter is incremented in exactly one place", () => {
  // 5b step 7 increments on exit. If 5c ALSO increments, one review-driven fix pass burns two of
  // the five cycles and resume desynchronises (it reconstructs the count from `### QA Cycle`
  // headings, which the extra increment does not write).
  assert.match(
    section5c(),
    /Do not increment the counter here/i,
    "5c must defer the increment to 5b step 7, not perform its own",
  );

  // The rule is stated in TWO files, and an earlier version of this test could only see one of
  // them. The QA loop was corrected while develop-pipeline-autonomous-defaults.md — the table an
  // UNATTENDED run actually consults for this fork — still said to increment at 5c, and this test
  // was green throughout. A test named "exactly one place" that cannot see the second place is
  // worse than no test: it certifies the contradiction it was written to prevent.
  assert.doesNotMatch(
    defaults,
    /return to 5b and increment the shared cycle counter/i,
    "the autonomous-defaults table must not instruct a second increment at 5c",
  );
  assert.match(
    defaults,
    /incremented once, by 5b step 7, on exit/i,
    "the autonomous-defaults table must name 5b step 7 as the single increment site",
  );
});

test("5c has a failure arm, and it does not fall through to Step 7", () => {
  // 5c is the loop's only exit, so an unhandled /review-pr failure is the one state that could
  // silently finalise a run with no review at all. The PASS->5c path also skips 5b step 5's
  // mid-loop PR-state poll, so a PR closed underneath the run is FIRST discovered by /review-pr.
  const s5c = section5c();
  assert.match(
    s5c,
    /Review failed/i,
    "the verdict table must carry a failure row, not only the three verdicts",
  );
  assert.match(
    s5c,
    /Do \*\*not\*\* fall through to Step 7/i,
    "a 5c failure must HALT — falling through skips the check the step exists to add",
  );
  assert.match(
    loopDoc,
    /\*\*PR Review\*\*: \{[^}]*review failed[^}]*\}/i,
    "the QA Cycle template enum must be able to record a failed review for resume",
  );
});

// ── 9. The ingester and the report agree on a finding's shape ────────────────

test("the ingester describes the format /review-pr actually renders", () => {
  // THE defect this pins: the ingester block once described the SUBAGENT output contract
  // (`severity:`, `file:line`) — YAML consumed in memory and never written to disk. The report
  // actually carries a rendered three-line shape. Since the PR review report is the ONLY carrier
  // of findings on the REQUEST CHANGES path, a mismatch here makes that whole path silently
  // deliver nothing: qa-fix reads a clean gate, changes nothing, and 5b step 0 HALTs reporting
  // the findings as unfixable. The two files shared no assertion until this one.
  const header = /\[(?:PC|CR)-1\] \w+ · \w+ · confidence: \w+ —/;

  assert.match(
    reviewPr,
    header,
    "review-pr must render the header shape the ingester is told to parse",
  );

  // The ingester parses the Step 7 REPORT, not the Step 6 terminal example. Without these, the
  // report template could lose its findings sections and this test would stay green while the
  // parse became unperformable — the exact failure its name warns about.
  assert.match(
    reviewPr,
    /^## Conformance Findings$/m,
    "the report template must keep the section the ingester reads PC-* findings from",
  );
  assert.match(
    reviewPr,
    /^## Code Review Findings$/m,
    "the report template must keep the section the ingester reads CR-* findings from",
  );
  assert.match(
    reviewPr,
    /→ suggested action/,
    "the continuation line the ingester is told to parse must exist in the renderer",
  );
  assert.match(
    ingester,
    /→/,
    "the ingester must describe the arrow continuation it parses",
  );
  assert.match(
    ingester,
    header,
    "the ingester must quote the header shape review-pr renders",
  );

  // The specific wrong turn, forbidden by name so it cannot come back quietly.
  assert.match(
    ingester,
    /there is no `severity:` key anywhere in the file/i,
    "the ingester must warn against searching for the YAML key that never reaches disk",
  );
  assert.match(
    ingester,
    /`ref` is not always a `file:line`/i,
    "conformance findings carry an AC id or a section ref, not a file:line",
  );

  // And the finding must have somewhere to go once parsed.
  assert.match(
    ingester,
    /source: gate\|report\|pr-review\|bug/,
    "the ingester's own output enum must admit a pr-review source",
  );
});

test("the banner doc carries the PR review verdict in the Steps 5-6 exit line", () => {
  // 5c states the exit position line as `({N} cycles, {gate}, PR review {verdict})` and points at
  // the banner doc as the format authority for it. That doc rendered the parenthetical WITHOUT the
  // verdict in both its format line and its worked example — the authority omitting the one field
  // task 77 exists to add. It was fixed, and held by nothing: reverting the example went green.
  assert.match(
    banner,
    /PR review \{verdict\}/,
    "the banner doc must state that the Steps 5-6 exit parenthetical carries the PR review verdict",
  );
  assert.match(
    banner,
    /QA LOOP ✅ complete \([^)]*PR review [A-Z]+\)/,
    "the worked example must RENDER the verdict, not merely describe it — the example is what gets copied",
  );
  // And 5c must still state the line the banner doc is the authority for, so the two documents
  // cannot drift apart while each looks self-consistent.
  assert.match(
    section5c(),
    /QA LOOP ✅ complete \(\{N\} cycles, \{gate\}, PR review \{verdict\}\)/,
    "5c must state the exit line the banner doc is the format authority for",
  );
});

test("the 5c resume check reads the report, not the filesystem", () => {
  // Replaces a predicate that failed three consecutive QA cycles: it compared gate.{N} (per QA
  // cycle) with pr-review.{n} (per 5c INVOCATION), and its shell implementation returned a false
  // PASS under zsh when the glob matched nothing — verifying a run with no artifacts at all as
  // complete. The repo's third-strike rule says replace the mechanism rather than patch again.
  const resume = read("shared/resources/develop-pipeline-resume-contract.md");

  assert.doesNotMatch(
    resume,
    /pr-review\.\{n\}.*must be \*\*≥/,
    "the index-comparison predicate must not come back",
  );
  assert.doesNotMatch(
    resume,
    /ls \*\.gate\.\*\.yml/,
    "no bare relative glob — it matches nothing from the repo root and zsh turns that into a pass",
  );
  assert.match(
    resume,
    /`\*\*PR Review\*\*` row must hold a \*\*terminal verdict\*\*/,
    "completeness is decided by the report row, which is written every cycle by contract",
  );

  // The deleted predicate had TWO homes. Removing it from the resume contract while it survived
  // in Step 0's progress table left two documents defining Step 5-6 completeness differently at
  // the same resume moment — the cycle-1-to-3 pattern (fix the sentence, not the contract) again.
  const step0 = read(
    "shared/resources/develop-pipeline-step-0-resolve-and-prepare.md",
  );
  assert.doesNotMatch(
    step0,
    /pr-review\.\{n\}\.\*\.md` \(Step 5c\)/,
    "Step 0's progress rows must not require the pr-review FILE — same rule, one statement",
  );
  assert.match(
    step0,
    /`\*\*PR Review\*\*` row on the highest `### QA Cycle \{N\}`/,
    "Step 0 must state the same report-row condition the resume contract does",
  );
  // Every non-terminal value must have a stated resume action.
  //
  // THIRD ATTEMPT AT THIS GUARD; the first two both passed on the regression they named, which is
  // why this one reads the table as a TABLE rather than searching it as text.
  //   v1 — `resume.includes(v)` over the whole file. The artifact-table sentences at ~:82 and ~:92
  //        name every value in passing, so deleting a sub-state row left the suite green.
  //   v2 — same `includes`, haystack narrowed to the table. `not reached` appears backticked inside
  //        the `pending` row's own prose, so deleting the `not reached` row STILL left it green —
  //        and `not reached` is the table's default arm.
  // The defect both versions share is searching for a MENTION. What the contract owes each value is
  // a resume ACTION, and an action is carried by a row's key. So: parse rows, key on the first cell,
  // and require the action cell to name where the run re-enters. A value named anywhere else in the
  // file — including inside another row's prose — is not a resume action and must not satisfy this.
  const tableStart = resume.indexOf(
    "| `**PR Review**` reads | Resume action |",
  );
  assert.ok(tableStart > -1, "the resume sub-state table must exist");
  const tableEnd = resume.indexOf("\n>\n", tableStart);
  assert.ok(
    tableEnd > -1,
    "the sub-state table must be followed by its rationale block — without an end marker this slice runs to EOF and the row parse below would absorb the rows of any blockquote table added later in the file",
  );

  const subStateRows = resume
    .slice(tableStart, tableEnd)
    .split("\n")
    .map((l) => l.replace(/^>\s*/, ""))
    .filter((l) => l.startsWith("|") && !/^\|[\s-]+\|[\s-]+\|?$/.test(l))
    .map((l) => l.replace(/^\|/, "").split("|"))
    .filter((cells) => cells.length >= 2)
    .map((cells) => ({ key: cells[0].trim(), action: cells[1].trim() }))
    .filter((r) => !r.key.includes("reads"));

  assert.ok(
    subStateRows.length >= 5,
    `expected the sub-state table to parse into at least 5 rows, got ${subStateRows.length} — if this drops, the parse broke and every assertion below is vacuous`,
  );

  for (const v of [
    "pending — 5c not yet run",
    "REQUEST CHANGES",
    "review failed",
    "not reached",
  ]) {
    const row = subStateRows.find((r) => r.key.includes("`" + v + "`"));
    assert.ok(
      row,
      `the resume sub-state table must carry a ROW KEYED on PR Review = "${v}". Being mentioned inside another row's prose is not a resume action — that is exactly how the two previous versions of this guard stayed green with the row deleted. Rows present: ${subStateRows.map((r) => r.key).join(" / ")}`,
    );
    assert.match(
      row.action,
      /\b5[abc]\b|Step 7|escalat/i,
      `the row for "${v}" must say WHERE the run resumes (5a/5b/5c, Step 7, or escalation) — a row that exists without an action is the gap this guards`,
    );
  }
});
