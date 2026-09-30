# QA Report: Task 133 - Residue of task.130's seven QA cycles (cycle 3)

**Task**: [Link to task document](./task.133.task-130-residue-cleanup.md)
**Gate File**: [task.133.gate.3.task-130-residue-cleanup.yml](./task.133.gate.3.task-130-residue-cleanup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: PASS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-133-QA-3: `rowsDropped` blind to rows the writer keeps | MEDIUM | FIXED | Version-first reproduction now returns the dropped row; J5 (Version-first and swept-legacy-block cases). Bug 2 closed |
| TASK-133-QA-4: conditional restore unevaluable in place | MEDIUM | FIXED | § Restore the lock carries the in-place evaluation at `<!-- restore: in-place -->`; who-restores (v). Bug 3 closed |
| TASK-133-QA-5: legacy-only reads as a fresh start | MEDIUM | FIXED | Detector Step 1 carries a legacy-only blocking outcome at `<!-- candidate-rule: legacy-only -->`; A2. Bug 4 closed |
| TASK-133-QA-6: locale-dependent stderr | LOW | FIXED | `contentAt` pins `LC_ALL=C`; J4 de/fr cases (red without the pin on this host) |
| TASK-133-QA-7: vacuous non-literal count | LOW | FIXED | The regex excludes the declaration, and the count is asserted against the calls (red with the old regex) |

---

## Executive Summary

All five cycle-2 findings are fixed and verified, and the four bugs are closed. The cycle-3 scoped review raised three advisory findings and no high-confidence bug, so the gate is **PASS** with an empty queue. The advisories are carried to `recommendations.future`.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools, plus one dispatched Explore reviewer, which ran 154 s (its own reported duration). Re-review scope: since `2026-09-30T09:12:32Z` (gate 2's `updated:`, corrected this cycle from a composed `13:25:00Z`; see below). That is 14 files and 2015 lines, excluding generated copies. `SAFETY_REPROBE=false`, because gate 2's security was `PASS reasoned`.

**Timestamp correction (recorded, not hidden).** Gates 1 and 2 were written with composed `updated:` values (`12:40:00Z`, `13:25:00Z`), both later than the time they were written. The first cycle-3 scoping run on `--since 13:25:00Z` returned **0 files**. Both are now corrected to the files' mtimes (`08:50:17Z`, `09:12:32Z`), and so are the reviewer clock times in qa.1 and qa.2 (now each agent's reported duration plus its output-file mtime). This cycle's gate carries `date -u` taken at write time. Filed as obs #230.

Step 4b: both changed prose files were executed. The contract had 0 findings. The detector prompt reported the same unseeded `cat` of the lock at `:69` as cycle 1, in a block this diff did not change; it was clean when seeded then.

---

## New Findings This Cycle

None gating. Advisory only (reviewer, cycle 3):

- **[medium/medium]** `shared/resources/pipeline-resume-detector-prompt.md:127`: the legacy-only case and the ordinary no-candidate case share `source: "none"` and differ only by the `blocking_issues` text. Both carry a non-empty `blocking_issues`, so the orchestrator's "HALT on blocking issues" rule already stops on both. A structured value would be a schema change, so it goes to `recommendations.future`.
- **[low/medium]** `shared/resources/change-log.js:1024`: on a case-insensitive filesystem, a `--file` spelled in a different case from the tracked path reads `exists on disk, but not in` and reports `new-document`. → future.
- **[low/medium]** `shared/resources/tests/change-log.test.mjs:2262`: the J4 locale loop does not check that git translates on the host, so it can pass vacuously on a host without catalogs. (On this host git does translate, and removing the pin turned J4 red.) → future.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: lock script | PASS | unchanged since gate 1 |
| Phase 2: contract delete block | PASS | |
| Phase 3: detector prompt | PASS | QA-5 fixed |
| Phase 4: citations and messages | PASS | QA-4, QA-7 fixed |
| Phase 5: change-log append-only | PASS | QA-1, QA-3, QA-6 fixed |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (gating). 3 advisory.

---

## NFR Assessment

### Performance — PASS
`carriedRows` adds one partition pass and two block sweeps per revision, once per document at 5c.

### Reliability — PASS
QA-3 and QA-5 are fixed. The advisories are recorded.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged. `contentAt` still passes argv with no shell, now with a pinned env.

### Maintainability — PASS
`isUnparsedRow` is one predicate shared by writer and reader.

---

## Code Review

**Correctness bugs (3, all advisory):** listed under New Findings.

**Cleanups (0).**

**Mutation proofs, cycle-2 fixes:**
- mutation-proven: `carriedRows` → `extractEntries` → J5 red → covered
- mutation-proven: `env` pin removed → J4 red → covered
- mutation-proven: `LANGUAGE: ""` alone removed → no red → absorbed (gettext ignores `LANGUAGE` under C)
- mutation-proven: old non-literal regex → D red → covered
- (QA-4, QA-5: marker-anchored prose rules; each test was red before its paragraph existed)

---

## Regression Testing

The 5b fast gate on this tree (attempt 2) passed 4629/4629. `change-log`, `who-restores`, `detector-candidate-rule`, `report-lint-call-sites` and `stale-snapshot-delete` are all green.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open entry (rule 5); every NFR PASS.
**Quality Score**: 90/100

**Next Steps**: 5c PR conformance review (`/review-pr`).
