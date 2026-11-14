# PR Review Report: PR #594 — test(task.900): slugify helper — review-pr smoke fixture (DO NOT MERGE)

**Reviewed:** 2026-10-07
**PR:** [#594](https://github.com/Gamaroff/agent-skills/pull/594) — `feature/task.900.review-pr-smoke-slugify` → `develop` (OPEN, draft)
**Work item:** [`task.900.review-pr-smoke-slugify.md`](./task.900.review-pr-smoke-slugify.md) — resolved via `branch stem`
**Tracker:** none — the document has no `github_issue` or `jira_key`
**Verdict:** 🚨 REQUEST CHANGES

**Scope:** 4 files, 78 additions. The `*/references/*` exclusion removed nothing. Effort: medium.

**Note on code-lens line numbers:** the code lens returned line numbers from the patch file, not the
source files (for example `slugify.js:77` for an 11-line file). The `CR-*` refs below were corrected
to the source line by hand. The lens's original values are in parentheses.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ❌ | absent |
| Review report | ❌ | absent |
| QA reports | 0 | — |
| Gate | absent | — |
| DoD | ❌ | absent (correct: status is `in-progress`) |
| Sprint review | ❌ | absent (correct: status is `in-progress`) |
| Open bugs | 0 | — |
| Handover | ❌ | absent |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| AC-1 lowercases | `scripts/smoke/slugify.js:6`, test `AC-1 lowercases` | ✅ met |
| AC-2 non-alphanumeric runs → single `-` | `scripts/smoke/slugify.js:7`, test `AC-2 collapses non-alphanumeric runs` | ✅ met |
| AC-3 leading and trailing `-` trimmed | `scripts/smoke/slugify.js:8` trims leading only | ❌ unmet |
| AC-4 `null`/`undefined` → `""` | no guard; throws `TypeError` | ❌ unmet |
| AC-5 one test per criterion AC-1 to AC-4 | no AC-4 test; AC-3 test is vacuous | ⚠️ partial |

## Conformance Findings

```
[PC-1] coverage · high · confidence: high — AC-3 / scripts/smoke/slugify.js:8
  Only leading dashes are stripped, so slugify("  Hello, World!  ") returns "hello-world-" (checked by running it).
  → Strip both edges with .replace(/^-+|-+$/g, "") and assert the criterion's exact example in the test.

[PC-2] coverage · high · confidence: high — AC-4 / scripts/smoke/slugify.js:5
  slugify(null) throws "Cannot read properties of null (reading 'toLowerCase')" instead of returning "" (checked by running it).
  → Return "" when s is null or undefined, before any string method is called.

[PC-3] coverage · medium · confidence: high — AC-5 / scripts/smoke/slugify.test.js:14-16
  There is no AC-4 test, and the AC-3 test only checks startsWith("hello"), so it passes despite the trim bug.
  → Add an AC-4 test and change the AC-3 assertion to strict equality on "hello-world".

[PC-4] trail · medium · confidence: low — docs/tasks/task.900.review-pr-smoke-slugify/
  The PR is open with code written, but the directory has no implementation report.
  → Write the implementation report, or confirm the fixture was built outside the pipeline on purpose.

[PC-5] consistency · medium · confidence: high — frontmatter: pr_number
  The task frontmatter has no pr_number, so the document does not link to PR #594.
  → Add pr_number: 594.

[PC-6] consistency · low · confidence: high — task.900.review-pr-smoke-slugify.md (no Change Log section)
  The work item has no Change Log, so no row records this work.
  → Add a Change Log with rows for creation and implementation.

[PC-7] scope · medium · confidence: high — scripts/smoke/pad.js
  The diff adds a left-pad helper that no criterion or Files Summary row asks for, and Scope says "Out of scope: any other file."
  → Remove pad.js from the PR, or add it to scope and the Files Summary.
```

## Code Review Findings

```
[CR-1] bug · high · confidence: high — scripts/smoke/slugify.js:8  (lens: :77)
  Only leading dashes are removed, so a trailing dash remains and AC-3 breaks.
  → Trim both ends, e.g. .replace(/^-+|-+$/g, "").

[CR-2] bug · high · confidence: high — scripts/smoke/slugify.js:6  (lens: :74)
  s.toLowerCase() has no guard, so null and undefined throw instead of returning "".
  → Return "" early when s == null.

[CR-3] bug · medium · confidence: high — scripts/smoke/slugify.test.js:15  (lens: :101)
  The AC-3 test passes on "hello-", so it cannot catch the missing trailing trim.
  → Assert strictEqual(slugify("  Hello, World!  "), "hello-world").

[CR-4] bug · medium · confidence: high — scripts/smoke/slugify.test.js:16  (lens: :102)
  No test covers AC-4, so the crash in CR-2 goes unnoticed.
  → Add a test asserting slugify(null) and slugify(undefined) equal "".

[CR-5] bug · medium · confidence: high — scripts/smoke/pad.js:6  (lens: :59)
  pad loops forever when fill is "", and pads with the text "undefined" when fill is omitted.
  → Default fill to " " and reject "", or use String(value).padStart(width, fill).

[CR-6] cleanup · low · confidence: high — scripts/smoke/pad.js:4  (lens: :57)
  pad.js is out of scope, imported by nothing, and reimplements String.prototype.padStart.
  → Remove it, or use padStart if padding is needed.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: high
    confidence: high
    ref: "AC-3 / scripts/smoke/slugify.js:8"
    finding: "slugify strips leading dashes only, so the AC-3 example returns hello-world- instead of hello-world."
    suggested_action: "Strip both edges and assert the criterion's exact example in the test."
  - id: PC-2
    category: coverage
    severity: high
    confidence: high
    ref: "AC-4 / scripts/smoke/slugify.js:5"
    finding: "slugify(null) and slugify(undefined) throw a TypeError instead of returning an empty string."
    suggested_action: "Return an empty string for null or undefined before calling any string method."
  - id: PC-3
    category: coverage
    severity: medium
    confidence: high
    ref: "AC-5 / scripts/smoke/slugify.test.js:14-16"
    finding: "There is no AC-4 test and the AC-3 test is vacuous, so AC-5 is only partly met."
    suggested_action: "Add an AC-4 test and make the AC-3 assertion a strict equality."
  - id: PC-4
    category: trail
    severity: medium
    confidence: low
    ref: "docs/tasks/task.900.review-pr-smoke-slugify/"
    finding: "The PR is open with code written but no implementation report exists."
    suggested_action: "Write the implementation report or confirm the work was done outside the pipeline."
  - id: PC-5
    category: consistency
    severity: medium
    confidence: high
    ref: "frontmatter: pr_number"
    finding: "The task frontmatter has no pr_number linking it to PR 594."
    suggested_action: "Add pr_number: 594 to the frontmatter."
  - id: PC-6
    category: consistency
    severity: low
    confidence: high
    ref: "task.900.review-pr-smoke-slugify.md (no Change Log section)"
    finding: "The work item has no Change Log row recording this work."
    suggested_action: "Add a Change Log with rows for creation and implementation."
  - id: PC-7
    category: scope
    severity: medium
    confidence: high
    ref: "scripts/smoke/pad.js"
    finding: "The diff adds pad.js, which no criterion or Files Summary row asks for and Scope rules out."
    suggested_action: "Remove pad.js or bring it into scope explicitly."
  - id: CR-1
    category: bug
    severity: high
    confidence: high
    ref: "scripts/smoke/slugify.js:8"
    finding: "Only leading dashes are removed, so a trailing dash remains."
    suggested_action: "Trim both ends with one anchored alternation."
  - id: CR-2
    category: bug
    severity: high
    confidence: high
    ref: "scripts/smoke/slugify.js:6"
    finding: "toLowerCase is called with no null guard, so null and undefined throw."
    suggested_action: "Return an empty string early when the input is null or undefined."
  - id: CR-3
    category: bug
    severity: medium
    confidence: high
    ref: "scripts/smoke/slugify.test.js:15"
    finding: "The AC-3 test uses startsWith, so it passes on the buggy output."
    suggested_action: "Assert strict equality on the criterion's example."
  - id: CR-4
    category: bug
    severity: medium
    confidence: high
    ref: "scripts/smoke/slugify.test.js:16"
    finding: "No test covers AC-4, so the null crash goes unnoticed."
    suggested_action: "Add a test for null and undefined input."
  - id: CR-5
    category: bug
    severity: medium
    confidence: high
    ref: "scripts/smoke/pad.js:6"
    finding: "pad loops forever on an empty fill and pads with the text undefined when fill is omitted."
    suggested_action: "Default and validate fill, or use padStart."
  - id: CR-6
    category: cleanup
    severity: low
    confidence: high
    ref: "scripts/smoke/pad.js:4"
    finding: "pad.js is out of scope, unused, and reimplements padStart."
    suggested_action: "Remove it, or use padStart if padding is needed."
truncated_count: 0
```

## Recommended Actions

1. Fix AC-3 and AC-4 in `slugify.js` (PC-1, PC-2 / CR-1, CR-2).
2. Make the tests real: strict equality for AC-3 and a new AC-4 test (PC-3 / CR-3, CR-4).
3. Remove `scripts/smoke/pad.js` (PC-7 / CR-5, CR-6).
4. Add `pr_number: 594` and a Change Log to the task (PC-5, PC-6).
