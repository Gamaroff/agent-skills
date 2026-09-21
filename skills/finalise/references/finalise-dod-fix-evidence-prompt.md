---
name: finalise-dod-fix-evidence-prompt
description: Explore subagent prompt for the fix-evidence check that replaces AC traceability when /finalise runs in bug mode (--bug). Substitute <BUG_FILE>, <PR_NUMBER>, <DIFF_FILE>, and <IMPL_REPORT> before dispatching.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/finalise-dod-fix-evidence-prompt.md. Regenerate via `npm run bundle`. -->

# Fix Evidence Check — Explore Subagent Prompt (bug mode)

**Usage**: Dispatch as an Explore subagent from `/finalise --bug` Steps 3–5 parallel dispatch, in the
slot the AC traceability agent occupies on the story/task path. Substitute `<BUG_FILE>`,
`<PR_NUMBER>`, `<DIFF_FILE>` and `<IMPL_REPORT>` before sending.

A bug report has no acceptance criteria. What it has instead is a single expected behaviour, a fix
that claims to produce it, and a regression test that claims to prove it. This agent checks those
three claims against disk, plus the two properties every fix in this repository must carry — the
bundled copies match their source, and the fast gate is green on the head.

---

## Instructions

You are a read-only verification agent. Check the fix evidence, PR review status, and documentation
updates for the bug report being finalised.

### Step 1: Read the bug file

Read `<BUG_FILE>`. It comes in two shapes — YAML frontmatter, or a `**Bug ID**:` / `**Status**:`
header block with no frontmatter — and both must be read. Extract:

- The **expected behaviour** from `## Bug Description` (the `**Expected Behavior**` / `**Expected**`
  line) — quote it; this is the bug's one "acceptance criterion".
- Every `### Iteration N` under `## Developer Fix Cycle`, and on the **last** one: the
  `#### Fix Implementation` (its `**Files Modified**` and `**Testing**` lists) and the
  `#### QA Verification` (its `**Verification Result**` and `**Notes**`).
- The PR number from frontmatter (`pr_number:`) or body text (`PR #NNN`, `…/pull/NNN`).
- The current `status:` (frontmatter) or `**Status**:` (header block).

Read `<IMPL_REPORT>` if it exists. Extract the `## QA Iteration History` — the verify-cycle entries,
their verdicts, and any mutation note ("red before the fix at `<sha>`", "reverted → test failed").

### Step 2: Check PR status

Run: `gh pr view <PR_NUMBER> --json state,reviewDecision,url 2>/dev/null`

- If PR number not found: set pr_status = NOT_FOUND, pr_review_decision = null.
- Parse `state` (OPEN | MERGED) and `reviewDecision` (APPROVED | REVIEW_REQUIRED | CHANGES_REQUESTED | null).

### Step 3: Check the fix evidence

Read `<DIFF_FILE>` to find the file paths modified in the PR. Then, for each check below, cite
`path:line` — a check with no citation is `FAIL`, never `PASS`.

1. **Expected behaviour is implemented.** Find the code in the diff that produces the expected
   behaviour (grep the key terms of the expected-behaviour line). `code_citation` is required.
2. **A regression test asserts it, and runs per PR.** Find the test file named in the last
   iteration's `**Testing**` list (or grep the same key terms under `tests/`, `**/tests/`,
   `*.test.*`, `*.spec.*`). `test_citation` is required. Then determine the lane from the test's
   path and the project's CI config (`package.json` `test` script glob, `.github/workflows/*.yml`
   `paths` / `paths-ignore`): a test that exists but does not execute on the PR is a citation, not
   evidence — `test_runs_per_pr: false` → `status: FAIL`, name the lane in `note`.
3. **The test fails without the fix.** Look for the mutation record: the `#### QA Verification`
   notes, the implementation report's verify-cycle entries, or a commit message naming the red
   run. Cite it. If no record exists, say so — do **not** perform the revert yourself; report
   `status: FAIL` with `note: "no fails-without record"` and main context decides whether to run the
   mutation.
4. **A new or widened guard states its scope.** When the diff adds or widens a test that scans a set
   of files (a corpus assertion, a call-site guard), check that it names what it scans and carries a
   non-vacuity floor. `NOT_APPLICABLE` with a note when the diff adds no such guard.
5. **Bundled copies match the source.** When the diff touches `shared/resources/`, confirm the
   bundled `skills/*/references/` copies are in the same diff (or `npm run bundle:check` is clean).
   `NOT_APPLICABLE` with a note when no shared file changed.

⚠️ **A `✅ Fixed` verification result is a claim, not evidence.** Verify against the diff and the
test lane; never treat the bug file's own record as satisfying a check. Two failure modes this
guards against, both observed: a fix recorded as verified with **no regression test in the diff**,
and a test that exists but sits in a lane the per-PR job does not run.

### Step 4: Check documentation updates

- **Bug report fix record**: every iteration carries Investigation + Fix Implementation; the last
  carries QA Verification; no template placeholders (`{…}`, `[TBD]`) remain.
- **Status History**: the `## Status History` table exists and its last row matches the current
  status.
- **Change Log**: count `^## Change Log` headings in the bug file — the expected count is **0**
  (bug reports are barred from carrying one). A count above 0 is a `FAIL` with the line cited.
- **Behaviour docs**: for each file in the diff whose behaviour is restated in a `SKILL.md`,
  `references/*.md`, runbook or `AGENTS.md`, check that restatement moved with it.
- **CHANGELOG.md**: an entry under `## [Unreleased]` citing `(bug N)` when the fix changes observable
  behaviour; `NOT_APPLICABLE` with the reason otherwise.

---

## Output

Return **YAML only** — no prose, no markdown wrapping around the YAML block:

```yaml
fix_evidence:
  bug_file: "<BUG_FILE>"
  expected_behaviour: "quoted from the bug file (≤30 words)"
  pr_number: <number or null>
  pr_status: APPROVED | OPEN | MERGED | NOT_FOUND
  pr_review_decision: APPROVED | REVIEW_REQUIRED | CHANGES_REQUESTED | null
  checks:
    - check: "expected behaviour implemented"
      status: PASS | FAIL
      code_citation: "path/to/file.js:NN"        # null if not found
      note: "optional"
    - check: "regression test asserts it and runs per PR"
      status: PASS | FAIL
      test_citation: "path/to/file.test.js:NN"   # null if not found
      test_runs_per_pr: true | false             # false → status must be FAIL; name the lane in note
      note: "optional"
    - check: "test fails without the fix"
      status: PASS | FAIL
      citation: "bug file / implementation report / commit that records the red run"   # null if none
      note: "optional"
    - check: "guard scope stated"
      status: PASS | FAIL | NOT_APPLICABLE
      citation: "path:NN"                        # null if N/A
      note: "required if NOT_APPLICABLE"
    - check: "bundled copies match source"
      status: PASS | FAIL | NOT_APPLICABLE
      citation: "path:NN or the bundle:check result"
      note: "required if NOT_APPLICABLE"
  docs:
    - item: "bug report fix record"
      status: PASS | FAIL
      citation: "path:NN"
      note: "optional"
    - item: "status history"
      status: PASS | FAIL
      citation: "path:NN"
    - item: "change log absent"
      status: PASS | FAIL
      citation: "count of '## Change Log' headings"
    - item: "behaviour docs"
      status: PASS | FAIL | NOT_APPLICABLE
      citation: "path:NN"
      note: "required if NOT_APPLICABLE"
    - item: "CHANGELOG.md"
      status: PASS | FAIL | NOT_APPLICABLE
      citation: "CHANGELOG.md:NN"
      note: "required if NOT_APPLICABLE"
  overall: PASS | FAIL | PARTIAL
  summary: "one-line summary of the fix evidence"
```

**Citation rule**: `status: PASS` requires a non-null citation. Null citation → `status: FAIL`.
`NOT_APPLICABLE` must have a `note`.

**Execution rule**: the regression-test check additionally requires `test_runs_per_pr: true`. A
cited test in a lane the PR does not run is a citation, not evidence → `status: FAIL` with the lane
named in `note`.
