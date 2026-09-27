# QA Report: Task 159 - Step 8 check 4 reads the Pipeline Progress table, not the whole report

**Task**: [task.159.step-8-check-4-reads-the-progress-table.md](./task.159.step-8-check-4-reads-the-progress-table.md)
**Gate File**: [task.159.gate.1.step-8-check-4-reads-the-progress-table.yml](./task.159.gate.1.step-8-check-4-reads-the-progress-table.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-27
**Testing Completed**: 2026-09-27
**Gate Status**: PASS

---

## Executive Summary

This first review covered PR #497 against `origin/develop`. It re-ran the executed Step 8 checklist suite under bash and zsh, re-proved all three branches of the new check 4 by mutation, ran an independent diff code review, checked the provenance of each finding against the base, and executed the step document's fenced blocks. Every verifiable success criterion is met. The code review raised three findings, none high-confidence: one is pre-existing, and two are LOW robustness gaps. All three go to future recommendations.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (13/13 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (§ 5: two deliberate tightenings)
- [x] Code on the feature branch with open PR #497

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (executed-prose fixture suite, bash + zsh)
- [ ] Performance Testing (not applicable: one awk pass)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

The review used direct tools plus one read-only Explore subagent for the Step 3b diff review. The task is small (3 phases, one shared step document plus its bundled copies, Low risk). The traceability matrix was supplied by the pipeline (`.summaries/qa-traceability-matrix.md`). Step 3b ran over the whole branch diff, excluding `docs/tasks/`, with `code_review_blocking=true`.

Step 3b wrote the diff to the session scratchpad rather than `mktemp /tmp/qa-code-review-XXXXXX.diff`. BSD `mktemp` does not randomise a template with a suffix, and a literal file from an earlier run collided. This recurrence is recorded on observation #181.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | `pausedAndResumed()` runs the hook's own append block; non-vacuity guard; 4 cases × bash/zsh |
| Phase 2: Scope check 4 | PASS | Verified | Table-scoped awk in `shared/resources/develop-pipeline-step-8-commit.md`; 3 bundled copies match (`bundle:check` clean) |
| Phase 3: Proof and gates | PASS | Verified | Mutations re-proved this cycle (below); CHANGELOG `[Unreleased]` Fixed entry present |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Paused-and-resumed report passes (bash + zsh) | pass | pass, both shells | PASS |
| `⏳ Pending` row fails check 4 (bash + zsh) | fail, check-4 message | fail, check-4 message | PASS |
| `⏸️ Paused` row fails check 4 (bash + zsh) | fail, check-4 message | fail, check-4 message | PASS |
| No table fails, message names the missing table | fail, named | `no Pipeline Progress table found` | PASS |
| Existing task.147 cases still pass | all green | 37/37 | PASS |
| No measurable performance change | one awk pass | one awk pass + one grep | PASS |
| Each branch mutation-proved | 3/3 covered | 3/3 `covered` (re-run this cycle) | PASS |
| ci:fast, lint:shell, bundle:check, check:generated | green | green (Step 3 run; `bundle:check` confirmed by the bundled copies) | PASS |
| quick_validate / `npm run validate` develop-story/task/bug | pass | ✓ ✓ ✓ (re-run this cycle) | PASS |
| CHANGELOG cites (task 159) and both tightenings | present | present | PASS |
| Observation #200 → `actioned` after merge | post-merge | not yet due | N/A |

---

## Breaking Changes Validation

### Breaking Change: a `⏸️ Paused` row now fails check 4
Documented: Yes · Migration Path Provided: Yes (finish the step and mark it `✅ Done`) · Migration Tested: Yes (Paused-row case) · Consumer Code Updated: N/A

### Breaking Change: a report with no Pipeline Progress table now fails
Documented: Yes · Migration Path Provided: Yes (template-built reports carry the table) · Migration Tested: Yes (no-table case; all three template variants pass) · Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 in the gate. The three code-review findings below are advisory and are routed to `recommendations.future`.

---

## NFR Assessment

### Performance — PASS
One awk pass over the report, then one grep over the captured rows.

### Reliability — PASS
The paused-and-resumed false failure is gone. A missing table now fails closed instead of passing on nothing.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The candidate considered was check 4 itself, a predicate whose failure stops the completion banner. It is not an input boundary against untrusted data: the report path comes from the lock or the orchestrator, and the report is pipeline-written. It is a fenced block in prose, not a script or export the probe engine's entry forms can address. The adversarial report shapes that matter here run under bash and zsh through the executed-prose harness: prose tokens outside the table, a Pending row, a Paused row, and a missing table.

### Maintainability — PASS
The fixture is derived from both the template and the hook, so a reword of either reaches the test. The non-vacuity guard asserts both trap tokens outside the table. The awk braces are spaced, and a comment explains why.

---

## Code Review

The review was advisory at the gate: `code_review_blocking=true`, but no finding was `bug` with `high` confidence. Reviewed: 6 files, a 294-line diff.

**Correctness bugs (3):**
- [medium/medium] `shared/resources/develop-pipeline-step-8-commit.md:203` — check 4 rejects only `⏳ Pending` / `⏸️ Paused`, so `❌ Failed`, `⚠️ Needs Attention` and `🔄 In Progress` rows still pass → consider an allowlist of `✅ Done`. **Provenance: pre-existing.** The base check matched only `⏳ Pending` and passed these rows too. Measured on task.152's report with row 8 set to `❌ Failed`: the new check passes it, and the base check passes any report that lacks the hook's pause prose. Routed to `recommendations.future`.
- [low/low] `…step-8-commit.md:202` — the no-table guard counts header and separator lines, so a header-only section satisfies it → base the guard on a step row. Routed to `recommendations.future`.
- [low/low] `…step-8-commit.md:203` — `⏸️ Paused` includes U+FE0F, so a row written `⏸ Paused` (U+23F8 alone) passes. **Reproduced:** task.152's report with row 8 set to `⏸ Paused` passes the new check. This is new to this change, since the Paused clause is new. The literal success criterion (`⏸️ Paused`) is met. Routed to `recommendations.future` with the fix (`⏸[^|]*Paused`).

**Cleanups (0).**

**Mutation-proof spot check (Step 3c).** Re-run this cycle against the committed state. The file was snapshotted with `cp`, the predicted test was named before each run, the baseline was green between mutations, and `git status` was unchanged after:

- mutation-proven: check 4 reads the whole report (`grep -qE … "$REPORT"`) → `[bash]/[zsh] a paused-and-resumed report whose table is all ✅ Done passes` → covered
- mutation-proven: pattern reduced to `'⏳ Pending'` → `[bash]/[zsh] a table row left at ⏸️ Paused fails check 4` → covered
- mutation-proven: empty-table guard removed → `[bash]/[zsh] a report with no Pipeline Progress table fails check 4` → covered

3 of 3 branches proved.

**Step 4b (runnable prose).** `qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-8-commit.md` returned `no-executable-blocks`: 5 bash blocks, all refused as `mutating`, 0 placeholder; zsh was available. This is information, not a finding. The checklist block that carries check 4 is executed in full, under bash and zsh, by `step-8-completion-checklist.test.mjs`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Step 8 checklist, checks 1–3, 2b and 5 (task.147 cases) | PASS: 29 pre-existing cases green |
| All three template variants (Task, Story, Bug) finished | PASS, including the Bug variant's different table header |
| Bundled copies in develop-story/task/bug | PASS: identical to the source (`bundle:check`) |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/develop-pipeline-step-8-commit.md` (+3 bundled copies)
- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- `shared/resources/develop-pipeline-on-precompact.sh` (pause-append block, read only)
- `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test shared/resources/tests/step-8-completion-checklist.test.mjs     # 37/37
npm run validate -- skills/develop-story/     # ✓
npm run validate -- skills/develop-task/      # ✓
npm run validate -- skills/develop-bug/       # ✓
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-8-commit.md --json
command node --test --test-name-pattern="check 4|paused-and-resumed" shared/resources/tests/step-8-completion-checklist.test.mjs   # × 3 mutations + 3 baselines
```

The full `npm run ci:fast` (4280 pass, 0 fail) ran at Step 3 on the same tree, recorded in the implementation report.

### Coverage Report

Not applicable. This is a shell block in prose, covered by the executed-prose fixture cases above.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-3: accept `⏸` with or without U+FE0F in the Paused clause, and add a fixture case.
2. CR-1 (pre-existing): consider an allowlist follow-up task, where every step row must read `✅ Done`.
3. CR-2: base the no-table guard on a step row.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every verifiable criterion is met by execution, and the three branches are mutation-proved. No finding is blocking.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.159.qa.1.step-8-check-4-reads-the-progress-table.md`
**Gate File**: co-located at `task.159.gate.1.step-8-check-4-reads-the-progress-table.yml`
**Next Steps**: Step 5c PR conformance review (`/review-pr`)
