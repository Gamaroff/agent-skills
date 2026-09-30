# QA Report: Task 133 - Residue of task.130's seven QA cycles (cycle 2)

**Task**: [Link to task document](./task.133.task-130-residue-cleanup.md)
**Gate File**: [task.133.gate.2.task-130-residue-cleanup.yml](./task.133.gate.2.task-130-residue-cleanup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-133-QA-1: empty `--against` read the index | HIGH | FIXED | `""`, `"  "`, tab → `usage`; unresolvable merge-base → rc 2; `HEAD` → ok; J4 green. Bug 1 closed |
| TASK-133-QA-2: quoting claim wider than the change | LOW | FIXED | Contract comment and CHANGELOG narrowed to § Consume Output |

---

## Executive Summary

Cycle 1's fixes hold. The cycle-2 refute pass re-read the whole branch. It found three MEDIUMs in the original change, each a case where two distinguishable states reach one answer, or a condition that cannot be evaluated where it is read. HIGH is 0.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL on QA-3..QA-5

---

## Testing Scope

### Review Methodology

Direct tools, plus one dispatched Explore reviewer. It was dispatched ~13:10 and returned ~13:14, inside the 10-minute budget. **Refute pass (cycle 2): the whole `origin/develop...HEAD` branch diff**, 2599 lines, excluding generated `references/` copies.

Re-review scope: unscoped (cycle 2 refute pass). `SAFETY_REPROBE=false`, because the prior gate's security was `PASS reasoned`.

Step 4b: the one prose file changed since gate 1 (`develop-pipeline-resume-contract.md`) was executed. Runnable 2, placeholder 8, mutating 20; 0 findings.

---

## New Findings This Cycle

- **[medium]** `shared/resources/change-log.js` `rowsDropped`: only `extractEntries` rows are compared, but the writer preserves unparsed rows. A dropped Version-first row reads `ok`, and so does a base log with no parseable rows. Reproduced: prev/next Version-first logs → `extractEntries` 0, `rowsDropped` `[]`, while `upsertChangeLog` keeps the row. → TASK-133-QA-3, [bug 2](./task.133.bug.2.append-only-check-blind-to-rows-extractentries-skips.md)
- **[medium]** `skills/develop-*/SKILL.md` Step 0-lock + contract § Restore the lock: the restore is conditional on a section whose condition names the detector's `source` and the Resume prompt. On the in-place path neither exists. → TASK-133-QA-4, [bug 3](./task.133.bug.3.restore-condition-unevaluable-on-in-place-path.md)
- **[medium]** `shared/resources/pipeline-resume-detector-prompt.md` no-candidate rule: a legacy-only set now reads as `source: none`, "fresh start", contradicting SKILL.md ("never a fresh start"). → TASK-133-QA-5, [bug 4](./task.133.bug.4.detector-legacy-only-reads-as-fresh-start.md)
- **[low]** `shared/resources/change-log.js` `contentAt`: `new-document` is detected from English git stderr (locale variance). → TASK-133-QA-6
- **[low]** `shared/resources/tests/report-lint-call-sites.test.mjs` `usageCauses`: the non-literal regex matches `function usage(msg)`, so the template check is unconditional. → TASK-133-QA-7

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: lock script | PASS | unchanged since gate 1 |
| Phase 2: contract delete block | PASS | comment narrowed (QA-2) |
| Phase 3: detector prompt | CONCERNS | QA-5 |
| Phase 4: citations and messages | CONCERNS | QA-4; QA-7 (test) |
| Phase 5: change-log append-only | CONCERNS | QA-1 fixed; QA-3, QA-6 |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2 (see New Findings; bug reports linked there)

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
QA-3 and QA-5.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged from gate 1. Cycle 1 added only a usage guard. `choose_candidate()` has no probe-engine entry form, and its hostile cases run in its suite.

### Maintainability — PASS
QA-7 is LOW.

---

## Code Review

Refute pass, whole branch. `code_review_blocking=true`.

**Correctness bugs (5):**
- [medium/high] `shared/resources/change-log.js:149`: `rowsDropped` blind to rows the writer keeps. **Promoted: TASK-133-QA-3** (bug + high confidence). Reproduced by QA.
- [medium/medium] `skills/develop-task/SKILL.md:57` (and story/bug): conditional restore unevaluable on the in-place path. Not auto-promoted (medium confidence). **QA promoted it as TASK-133-QA-4** after reading § Restore the lock's opening condition.
- [medium/medium] `shared/resources/pipeline-resume-detector-prompt.md` no-candidate rule: legacy-only reads as fresh start. **QA promoted it as TASK-133-QA-5** after verifying the rule text at `:125`.
- [low/medium] `shared/resources/develop-pipeline-step-8-commit.md:52`: PreCompact site (3) treats rc 2 as failed lint. That behaviour is pre-existing, and the site is exempt in the test. Filed in `recommendations.future`.
- [low/medium] `shared/resources/change-log.js:208`: locale-dependent stderr match. → TASK-133-QA-6.

**Cleanups (1):**
- `shared/resources/tests/report-lint-call-sites.test.mjs:170`: vacuous non-literal count. → TASK-133-QA-7.

**Step 3c: mutation spot check:**
- mutation-proven: guard narrowed to exact `""` → no test red → `absorbed`. `"  "` and tab are refused by git itself (`invalid object name`), so `.trim()` is defence in depth that git already provides. Exact-`""` is the case J4 must catch, and it does.

**Provenance (5b):** all five are introduced by this branch. `rowsDropped`, the conditional restore, the legacy drop and `contentAt` do not exist on `origin/develop`, and `usageCauses` is new in test D.

---

## Regression Testing

The tree is the one the 5b fast gate ran on (attempt 2): 4626/4626. The resume contract executed in Step 4b with 0 findings.

---

## Test Artifacts

### Test Commands Executed
```bash
command node shared/resources/change-log.js --check-append-only --file <task.130 doc> --against "" / "  " / $'\t' / HEAD
command node shared/resources/change-log.js --check-append-only --file <task.130 doc> --against "$(git merge-base HEAD origin/nonexistent)"
command node -e '<Version-first prev/next through extractEntries, rowsDropped, upsertChangeLog>'   # QA-3 reproduction
command node shared/resources/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-resume-contract.md --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: 0 HIGH, 3 MEDIUM open (rule 2).
**Quality Score**: 70/100

**Next Steps**: `/qa-fix` cycle 2 for QA-3..QA-7.
