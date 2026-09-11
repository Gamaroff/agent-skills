# QA Report: Task 107 — The bug-fix runbook documents a pipeline that has been superseded twice

**Task**: [task.107.bug-runbook-rewrite.md](./task.107.bug-runbook-rewrite.md)
**Gate File**: [task.107.gate.1.bug-runbook-rewrite.yml](./task.107.gate.1.bug-runbook-rewrite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-11
**Gate Status**: FAIL

---

## Executive Summary

The rewrite is substantially accurate — an adversarial fact-check of eleven claim groups against the
source skills confirmed nine of them verbatim, including the 8-step pipeline, the four `review-bug`
verdicts, all three mode patterns, the registry protocol and the Change Log exclusion. Two defects
block: the page **names the wrong mechanism for the GitHub tracker arm**, which is a direct Success
Criterion 3 failure, and the **verification block it ships does not produce the results its own
comments claim** — the one block the task specifically required to be verified by running it.

Both are content defects in the deliverable, not advisory code-review notes, which is why they sit in
`top_issues` rather than in the advisory section.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented — N/A, none
- [x] Code on feature branch with open PR (#387, OPEN)

### Testing Approach

- [x] Automated testing (`npm run ci:fast`)
- [x] Documentation fact-check against source of truth
- [x] Command execution (the page's own verification block)
- [x] Link checking (CI config, plus an independent tracked-tree resolver)
- [x] Regression testing
- [x] Code review (Step 3b)

### Review Methodology

Direct tools, plus **one read-only Explore subagent for Step 3b** — dispatched as an adversarial
fact-check rather than a generic diff review, because the deliverable *is* prose and its failure mode
is a false claim, not a logic error. It was instructed to find the claim that is false and to return a
`verified:` list naming what it checked and confirmed, so that "found nothing" could be distinguished
from "did not look".

**Step 4b: not applicable** — the runnable-prose rule fires only when the diff adds or modifies a
`SKILL.md` or a `shared/resources/*.md` prompt. This diff touches `docs/runbooks/` and
`docs/concepts/` only. The page's own fenced bash block was therefore executed **manually** instead,
under the task's §6 step 2 requirement — and that is what surfaced TASK-107-002.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Read the bug skills; derive the step list from them | PASS | Verified | Nine of eleven claim groups confirmed verbatim against source |
| 2. Rewrite `bug-fix.md`; run every command or mark it illustrative | **CONCERNS** | Partial | Rewritten, but the commands were not all correct when run — TASK-107-002 |
| 3. Add the bug branch to `which-path.md` (3 places) | PASS | Verified | Flowchart, prose fallback and quick-reference table all updated; chain reaches `/create-bug-report` correctly in both representations |
| 4. Re-run the docs link check against the tracked tree | PASS | Verified | 52 links, 0 dead; CI `link-check` green |

**Overall Phase Completion**: 3/4 fully passed, 1 with concerns.

---

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | Names `/develop-bug` and `/review-bug`, actual step order | PASS | 8-step table matches `develop-bug/SKILL.md` step for step |
| 2 | All three bug modes, each with pattern + numbering rule | PASS | Matches `create-bug-report/SKILL.md` and `file-naming.md` cell for cell |
| 3 | Tracker-sync step on both arms, naming which skill does it | **FAIL** | Names `sync-github-bug` as the GitHub mechanism; it is not — TASK-107-001 |
| 4 | No `## Change Log` in any bug-report guidance | PASS | 0 occurrences; the pitfall quoting the exclusion is accurate |
| 5 | `which-path.md` routes a reported bug to the bug path | PASS | Verified in flowchart and prose; the claim about the old behaviour is true of the removed text |
| 6 | Hotfix boundary callout survives unchanged | PASS | Byte-identical |
| 7 | Every internal link resolves against the tracked tree | PASS | 52 links, 0 dead, checked against `git ls-files` as well as the working tree |
| 8 | `bug-fix.md` ≤ 200 lines | PASS (marginal) | Exactly 200 — at the threshold, above the ~80–150 band — TASK-107-004 |

**6 of 8 clean, 1 marginal, 1 failed.**

---

## Breaking Changes Validation

N/A — the task declares none, and the diff touches no executable surface. Verified:
`git diff --name-only origin/develop...HEAD | grep -v '\.md$'` returns nothing.

---

## Issues Found

### HIGH Severity Issues (1)

**TASK-107-001 — the page names the wrong mechanism for the GitHub tracker arm**

- **Severity**: HIGH · **Category**: Functional (Success Criterion 3)
- **Location**: `docs/runbooks/bug-fix.md`, the sentence following the tracker-sync table
- **Observation**: the page reads *"Both delegate to the full sync skill — `sync-github-bug` /
  `sync-jira-bug` — which also closes and reopens the card from the bug's lifecycle status."* Only the
  Jira arm delegates. Verified independently: `ensure-bug-jira-issue` declares
  `invokes: [sync-jira-bug]` and its Step BJ4 is titled *"Create via sync-jira-bug Delegation"*;
  `ensure-bug-github-issue` has **no `invokes:` key**, `grep -rn "sync-github-bug"` over it returns
  **zero** matches, and it creates the issue itself across Steps B4–B8.
- **Impact**: the criterion this page exists to satisfy is *naming which skill does it*. A reader on
  the GitHub arm is sent to a skill the pipeline never calls. The trailing clause inherits the error —
  open/closed reconciliation lives in the full sync skills, which Step 1 does not reach on GitHub.
- **Recommendation**: split the sentence by arm; see the gate's `suggested_action`.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**TASK-107-002 — the shipped verification block does not work as documented**

- **Severity**: MEDIUM · **Category**: Functional
- **Observation**: two defects in one block, both confirmed by running it.
  1. The glob `"$BUG"/bug.*.md` matches **all four** artifacts in the directory. `grep -c '##
     Resolution Summary'` prints four `file:count` lines (`0`, `1`, `0`, `0`) rather than the `1` the
     comment promises; a reader seeing three zeros reads it as a failed verification.
  2. The pattern `^\*\*Status:\*\*` **never matches a bug report**. Bug reports write
     `**Status**: ✅ Closed` — colon *outside* the bold — unlike tasks and stories, which use
     `**Status:**`. The only `**Status:**` hit in the directory is the DoD artifact's.
- **Impact**: the task's §6 step 2 required every command to be verified by running it. This is the one
  block that requirement was about, and it fails. Defect 2 is also an instance of the page's own
  subject matter — assuming one document type's convention applies to another.
- **Recommendation**: scope to the report via `REPORT="$BUG/$(basename "$BUG").md"` (the
  self-named-subdirectory rule guarantees this resolves) and fix the pattern to `^\*\*Status\*\*:`.
  **Verified**: the exact form prints `status: closed`, `1` and `0`, as the comments claim.
- **Priority**: P2

### LOW Severity Issues (2)

- **TASK-107-003** — *"All co-located with the bug document, in its own directory"* is true only of
  general bugs; story bugs sit beside the story file and task bugs inside the task directory.
- **TASK-107-004** — the page is exactly 200 lines, satisfying Success Criterion 8 but landing on
  `docs/runbooks/README.md`'s split threshold, 33% above the top of the ~80–150 satellite band.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

No runtime surface. `npm run ci:fast`: 3155 pass, 0 fail, 1 skipped, 45.9s — unchanged.

### Reliability — PASS

Rollback is `git revert`; no state, no migration. CI on PR #387 fully green — `link-check`,
`shellcheck`, `test`, branch-policy.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- Documentation-only; every file in the diff is markdown, verified by
  `git diff --name-only origin/develop...HEAD | grep -v '\.md$'` returning nothing. No auth, crypto or
  sensitive-data handling. The verdict was reached by reading the diff rather than by executing hostile
  input, so the evidence is `reasoned` — accurate, not a failing grade.

### Maintainability — CONCERNS

The page restates `develop-bug` content that its own See-also already links, which is the drift surface
that produced this task. TASK-107-001 is that risk materialising *during the authoring of the fix*: the
restated sentence is where the false claim entered.

---

## Code Review

Step 3b ran as an adversarial fact-check (see Review Methodology). All findings were promoted to
`top_issues` rather than left advisory, because in a documentation deliverable a false claim is a
functional defect against the success criteria, not a code-quality note.

**Correctness bugs (2):** TASK-107-001 (high/high), TASK-107-002 (medium/high).
**Cleanups (2):** TASK-107-003, TASK-107-004.

**Mutation-proof spot check**: not applicable — this cycle fixed no defect and added no test. The
deliverable is prose; its equivalent check is executing the documented commands, which is what surfaced
TASK-107-002.

### Verified correct (recorded so a quiet result is distinguishable from an unasked question)

1. **8-step table** — matches `develop-bug/SKILL.md` step for step, including Step 7's three
   parent-linkage cases and the verbatim "Lite mode applies to Step 5 only".
2. **`review-bug` verdicts** — the four recommendations and the four-axis 1–10 score match; "never
   mutates the bug lifecycle `status`" is near-verbatim.
3. **Three-mode table** — matches `create-bug-report/SKILL.md` and `file-naming.md` cell for cell.
4. **Bug registry** — atomic-commit rule, "never reused", and "higher number wins" all match both
   sources.
5. **Parent linkage** — GitHub sub-issue vs Jira sibling + issue link + Source Documents: correct.
   "A general bug is anchored to the registry and to nothing else": correct, near-verbatim in three
   skills. The placeholder-number rationale is accurately restated.
6. **Change Log pitfall** — the `upsertChangeLog(…, { docType: "bug" })` quote is accurate and
   correctly attributed.
7. **Phase 0 prompts** — Q1/Q2/Q3 verbatim; the `hotfix/vX.Y.Z` shape and merge-back pitfall check out.
8. **Artifacts tree** — matches `bug.11/` and `bug.12/` exactly; no discrepancy between them.
9. **`which-path.md`** — the new chain reaches `/create-bug-report` in both the flowchart and the prose
   fallback, and the claim about the old routing is true of the removed text.
10. **Cross-references** — every link resolves; the task doc's six `file:line` citations still hold on
    HEAD.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite | PASS — 3155/3156 (1 skipped), 0 fail |
| Repo-hygiene checks (`validate.yml`) | PASS via CI |
| Shell sources (`shellcheck.yml`) | PASS via CI — unaffected, no `.sh` touched |
| Docs link check (`docs-link-check.yml`) | PASS via CI |
| Documents linking to the changed pages | Checked — `docs/README.md`, `docs/runbooks/README.md`, `hotfix.md`, `change-management.md`, `docs/operations/workflows.md` all still resolve |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                  # 3155 pass / 0 fail / 1 skipped
npx prettier --check <changed files>             # clean
npx markdown-link-check@3 --config .github/markdown-link-check.json <3 files>   # 52 links, 0 dead
gh pr checks 387                                 # link-check, shellcheck, test, branch-policy — all pass
# the page's own verification block, run verbatim — surfaced TASK-107-002
```

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-107-001** — correct the tracker-sync delegation claim; split it by arm. P1.
2. **TASK-107-002** — fix the verification block: scope the glob to the report, correct the `Status`
   pattern. P2.

### Short-term Actions (Non-Blocking)

1. **TASK-107-003** — qualify the artifacts-directory claim for story and task bugs.
2. **TASK-107-004** — trim toward the satellite band by linking rather than restating.
3. Out of scope: `docs/reference/pipeline-artifacts.md` has zero bug rows.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH finding against Success Criterion 3 — the page names a skill the GitHub arm
never invokes — plus a MEDIUM defect in the verification block the task specifically required to be
executed. Both are correctable in one fix cycle; nothing about the structure or the remaining content
is in question.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-107-001 and TASK-107-002 corrected and re-verified.

---

**Next Steps**: `/qa-fix` cycle 1 against this gate, then re-review.
