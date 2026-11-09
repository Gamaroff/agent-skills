# QA Report: Task 269 - finalise never hand-copies agent output

**Task**: [task document](./task.269.finalise-never-hand-copies-agent-output.md)
**Gate File**: [task.269.gate.2.finalise-never-hand-copies-agent-output.yml](./task.269.gate.2.finalise-never-hand-copies-agent-output.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 re-reviewed the whole branch diff to refute it, starting with cycle 1's fixes. All five cycle-1 findings are fixed. One MEDIUM remains: no CHANGELOG entry cites task 269.

**Overall Assessment**: CONCERNS (90/100)
**Deployment Recommendation**: CONDITIONAL on T269-QA-6.

### Review Methodology

Direct tools plus one read-only Explore reviewer (refute directive). Re-review scope: unscoped, full `origin/develop...HEAD` diff (cycle 2 rule). Head reviewed: `be88b282`.
CI on be88b282a909: pending.

## Re-Review Context

| Finding | Status | Evidence |
| --- | --- | --- |
| T269-QA-1 (high) reuse block unbound | ✅ FIXED | Block binds `STEM`, `DOD_N`, `DOC_DIR`, halts on a placeholder, skips at `DOD_N` 1; a committed test runs it in a fresh shell |
| T269-QA-2 reuse passes on a path that matches nothing | ✅ FIXED | Each engine path must exist at prior head and HEAD; diff is against the working tree |
| T269-QA-3 confinement boundary not probeable | ✅ FIXED | `casesFileAccepted` boolean; 8 cases executed by the probe engine |
| T269-QA-4 literal-angle judged over the whole plan | ✅ FIXED | Entry's own text decides |
| T269-QA-5 reply text join and reset | ✅ FIXED | Metadata lines skipped, blocks joined by a newline |

## New Findings This Cycle

- **[medium]** `CHANGELOG.md` - no `[Unreleased]` entry cites task 269 (T269-QA-6) → add one.
- **[medium, confidence medium, advisory]** `skills/finalise/SKILL.md:650` - the reuse block checks `{prior head}` and `{engine path}` for placeholders before the `DOD_N` skip, so a first run that leaves them unsubstituted halts instead of planning afresh (CR-1). Carried as a recommendation for the same fix cycle.
- **[low, advisory]** `skills/finalise/SKILL.md:657` - one `--engine-path` placeholder where the prose says one per engine file (CR-2). Same recommendation.
- Dismissed: CR-3 (a literal `&` beside entities is accepted). An escaped reply escapes `&` too, so a literal `&` proves the text was not escaped as a whole; the reviewer's partial-escape case is not a state the transport produces. Confidence was low.

## Success Criteria Verification

All Functional and Code Quality criteria hold: extraction is byte exact (seven-character test), an escaped reply is refused, `merge --sha256` refuses a mismatch, `cases_file` is confined and hash checked, reuse is gated on hashes and engine diff. `criteria-drift`: clean.

## NFR Assessment

- Security - PASS. Evidence: measured. Probes executed: 8 (`totals` executed 8, reproduced 0, escaped 0). Run record: `task.269.qa.2.security.run.json`.
- Performance - PASS. Reliability - PASS. Maintainability - PASS.

## Code Review

**Correctness bugs (3, 1 dismissed):** see New Findings. No `category: bug` finding with high confidence.
**Cleanups (0).**

mutation-proven: reuse block `DOC_DIR` binding removed → reuse block binds STEM, DOD_N and DOC_DIR itself (security-probe-plan-cases-file.test.mjs) → covered
mutation-proven: working-tree diff changed to a HEAD diff → reuse: an unchanged plan is reusable (security-probe-plan-cases-file.test.mjs) → covered
mutation-proven: `casesFileAccepted` always true → casesFileAccepted: the probe engine executes hostile and legitimate names (security-probe-plan-cases-file.test.mjs) → covered
mutation-proven: own-text literal rule disabled → entity: a cases file whose payload is an entity on purpose (security-probe-plan-cases-file.test.mjs) → covered
mutation-proven: `replyText` resets on any non-assistant line → four extract tests (agent-reply-block.test.mjs) → covered
mutation-proven: text blocks joined with an empty string → two extract tests (agent-reply-block.test.mjs) → covered

All six were restored from snapshots; `git status` shows no code change.

## Test Artifacts

### Test Commands Executed

```bash
CI=true npm run ci:fast                       # 7999 pass, 0 fail (before the fix commit's gate files)
TMPDIR=/tmp CI=true node --test <4 changed test files>   # 101 pass, 0 fail
npm run bundle:check                          # 129 skills, 0 problems
npm run validate -- skills/finalise/          # pass
node shared/resources/security-probe.mjs --sink path --entry shared/resources/security-probe-plan.mjs#casesFileAccepted --args-json ... --record task.269.qa.2.security.run.json   # engages, 8 executed
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL on T269-QA-6.
**Next Steps**: `/qa-fix` for T269-QA-6 (plus CR-1 and CR-2), then re-review.
