# QA Report: Task 300 - security-probe names the sink it observes

**Task**: [Link to task document](./task.300.security-probe-names-the-sink-it-observes.md)
**Gate File**: [task.300.gate.2.security-probe-names-the-sink-it-observes.yml](./task.300.gate.2.security-probe-names-the-sink-it-observes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-13
**Testing Completed**: 2026-11-13
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 re-review after the cycle 1 fix commit 88ddf934. The three PR-review findings (PC-1, PC-2, PC-3) are fixed, the whole branch diff was re-read to refute, and no new finding was found.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (additive field only)
- [x] Code on feature branch with open PR (#896)

### Testing Approach

- [x] Automated Testing (targeted suites, plus `ci:fast` on the LAN server)
- [x] Regression Testing
- [x] Code Review (inline refute pass)

### Review Methodology

Direct tools. Re-review of a PASS gate because code moved since its head (CODE_MOVED=1: the fix commit).

Re-review scope: whole branch diff, cycle 2 refute pass (default for cycle 2). Safety re-probe: not triggered (prior gate had no security failure).

Diff review: code review. It ran inline, with no independent reviewer subagent, so the independence loss is recorded: the same pipeline that wrote the fix reviewed it.

Step 4b: not applicable. The change set adds no fenced bash block; the prose edits in `skills/finalise/SKILL.md` and `probe-boundary-rule.md` are not runnable blocks.

CI on 88ddf9348134: pending at read time (PR #896). Not a precondition of this gate.

---

## Re-Review Context

| Cycle 1 finding | Source | Status |
| --- | --- | --- |
| PC-1 `probe-boundary-rule.md` section 5 restates the out-of-sandbox limit without citing the constant | 5c PR review | ✅ FIXED: section 5 now names `OBSERVATION_LIMITS`; the sentence about the limit is kept as the rule's own claim and cites where the text lives |
| PC-2 no pin for the Probe Results limits line | 5c PR review | ✅ FIXED: new test in `finalise-dod-prompt-contract.test.mjs`; renaming the line in `skills/finalise/SKILL.md` turned it red (44 pass, 1 fail), and restoring it gave 45 pass |
| PC-3 task frontmatter has no `pr_number` | 5c PR review | ✅ FIXED: `pr_number: 896` |

## New Findings This Cycle

None. Searched the whole `origin/develop...HEAD` diff, 24 files, to refute: the engine additions (`OBSERVATION_LIMITS`, `observationLimitsFor`, `observationLimitIds`, `observationLimitTexts`, the `toRecordEntry` field and the `emitBlock` lines), the plan CLI change, the finalise render block, and the new test.

- Identity rule: `observationLimitIds` is a set union in `OBSERVATION_LIMITS` order. Two controls with the same limits give one entry; a `fence:` control adds the second limit. A legacy control with no field derives the same ids from its entry. Both directions held by the existing legacy-record tolerance test.
- Error path: an engine that lacks the export reads as no limits and does not throw; an unreadable record is still `record-unreadable`.
- Reconnect, in-flight and teardown probes do not apply: no emission, subscription, cache or lifecycle code was added.
- Population of the restated rule: `git grep` for `is not observed` over `SKILL.md`, `shared/resources/*.md` and `*.mjs` finds `probe-boundary-rule.md` (now citing the constant) and `security-probe.mjs` (the definition). The task document and the CHANGELOG entry were checked too and agree with the shipped text.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Confirm | PASS | Verified | Decision recorded in the implementation report |
| Phase 2: Record the limits | PASS | Verified | `OBSERVATION_LIMITS` once; readers tolerate the field |
| Phase 3: Report it | PASS | Verified | Probe Results line, now pinned by its own test |
| Phase 4: Tests | PASS | Verified | Form mapping, rendering, legacy tolerance, plan CLI |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

All Functional, Performance, Code Quality and Migration criteria hold. Each is held by a committed test or by a cited command: the three functional ones by the four "observation limits:" tests plus the new finalise pin; the performance one by the run-count assertion; code quality by `bundle:check`, `validate` and the remote `ci:fast` (TEST_EXIT=0, 8450 pass, 0 fail, run on the tree that became 88ddf934).

Criteria drift: clean (`criteria-drift.js`, no changed criterion). CHANGELOG citation: present (`cites (task 300)`). `boundary_signals`: `[]`.

---

## Breaking Changes Validation

None. One additive field in the run record and the plan output; readers tolerate it (held by the read-back test).

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0.

---

## NFR Assessment

### Performance — PASS
One extra dynamic import of an already-loaded module; no extra probe runs.

### Reliability — PASS
Missing export reads as none; old records derive the same limits.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (no boundary delivered: a reporting field, prose and a test)
- boundary_signals: none.

### Maintainability — PASS
One definition of the limit text; the rule document cites it; four bundled copies regenerated.

---

## Code Review

Inline refute pass, no independent reviewer.

**Correctness bugs (0):** none.

**Cleanups (1):**
- `shared/resources/security-probe-plan.mjs:306,318` — `readExecuted` imports the engine twice; one destructuring would do. Advisory; recorded in `recommendations.future`.

mutation-proven: renamed `**Not observed by this run:**` in `skills/finalise/SKILL.md` → "the probe render prints what the run could not observe…" went red (44 pass, 1 fail) → covered. Restored byte-for-byte (`cmp` clean), 45 of 45 pass again. A committed test, so the outcome is covered and not dev-only.

Platform variance: the affected suites also ran under `TMPDIR=/tmp CI=true`: 374 tests, 0 fail.

---

## Regression Testing

Adjacent readers of the record (`security-probe-plan-cases-file`, `probes-executed-population`) and the finalise prompt contract: pass.

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/security-probe-plan.mjs`, `skills/finalise/SKILL.md`, `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/probe-boundary-rule.md`, `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `shared/resources/tests/security-probe.test.mjs`, `CHANGELOG.md`, and the four bundled copies.

### Test Commands Executed
```bash
TMPDIR=/tmp CI=true command node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/security-probe-plan-cases-file.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs evals/shared/tests/probes-executed-population.test.mjs
npm run bundle:check
npm run validate -- skills/finalise/
```

Results: 374 pass, 0 fail; bundle freshness 129 skills, 0 problems; finalise validates.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Fold the two engine imports in `readExecuted` into one (cosmetic).
2. Consider the other stated limits (gh-path bypass, usage echoing the input) for `OBSERVATION_LIMITS` in a follow-up task.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All cycle 1 findings are fixed and held by a committed, mutation-proved test; the refute pass found nothing; suites and bundle checks are green.
**Quality Score**: 96/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.300.qa.2.security-probe-names-the-sink-it-observes.md`
**Gate File**: co-located at `task.300.gate.2.security-probe-names-the-sink-it-observes.yml`
**Next Steps**: 5c PR review against gate 2, then finalise.
