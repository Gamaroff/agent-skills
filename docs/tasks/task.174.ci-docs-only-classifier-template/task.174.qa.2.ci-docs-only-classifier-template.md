# QA Report: Task 174 - Publish the docs-only CI classifier as an optional consumer template

**Task**: [Link to task document](./task.174.ci-docs-only-classifier-template.md)
**Gate File**: [task.174.gate.2.ci-docs-only-classifier-template.yml](./task.174.gate.2.ci-docs-only-classifier-template.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| TASK-174-QA-1 (medium): snippet cancels base-branch push runs | ⚠️ PARTIAL | The `changes-job.yml` block is right for this workflow, but its guard is vacuous (QA-3) and the group is not workflow-scoped (QA-5). Bug 1 reopened. |
| TASK-174-QA-2 (low): cross-variant test re-spreads `process.env` | ✅ FIXED | `env` passed directly; verdicts pinned. M9 re-proven at this head. |

## Executive Summary

Cycle 2 is a full-diff refute pass over PR #808 at `0d69112b`. Cycle 1's snippet fix is correct for
the workflow it ships in. But the test that holds it passes on a broken group, and the guide now
claims more than the concurrency change delivers. The classifiers, specs and boundary are
unchanged and still pass 28 executed probes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — on TASK-174-QA-3 and QA-4

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (71 in the template suites; `ci:fast` 7116, 0 fail at qa-fix)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#808)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (executed boundary probes)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools plus one read-only diff reviewer. **Cycle 2 is a full refute pass**: whole branch diff
`origin/develop...HEAD`, 12 files, 2191-line patch, with the refute directive added. The safety
re-probe did not apply: the cycle-1 gate passed security, so clause 1 was `false`, and clauses 2–3
had nothing to act on. The reviewer was dispatched at 2026-11-02T14:14:24Z and returned in 120.2 s
(`duration_ms` 120218). All four anchors were checked with `finding-anchors.js`, and all are `ok`.

CI on 0d69112bc6c1: pending.

Step 4b: not applicable. No runnable prose in the change set.

Criteria drift: `clean` against the `reviewed-blob` base.

---

## New Findings This Cycle

- **[medium]** `docs/examples/ci/github-actions/changes-job.test.js:60`: the group test checks
  substrings only. `github.ref_name` passes the `\bgithub\.ref\b` check (QA ran the three matchers on
  `ci-${{ github.event.pull_request.number || github.run_id && github.ref_name }}`: `true true true`),
  and a job-level `concurrency:` is never read. → Pin the group exactly. **TASK-174-QA-3**,
  [bug 2](./task.174.bug.2.concurrency-guard-passes-on-broken-group.md).
- **[medium]** `docs/runbooks/ci-docs-only-skip.md:139`: "a base-branch run must always finish" is
  presented as secured by PR-only cancellation. The push path (`classify-changes.sh:225`) still skips
  over a red, hand-cancelled, timed-out, lost or still-running base run. → Scope the claim.
  **TASK-174-QA-4**, [bug 3](./task.174.bug.3.guide-overstates-base-run-guarantee.md).
- **[low]** `docs/examples/ci/github-actions/changes-job.yml:23`: concurrency groups are
  repository-wide, and `ci-pr-N` names no workflow, so a second workflow copying the block cancels
  this one. → Add `github.workflow`. **TASK-174-QA-5**.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: precondition | PASS | Verified | Unchanged |
| Phase 1: GitHub Actions template | CONCERNS | Verified | QA-3, QA-5 |
| Phase 2: guide and parity | CONCERNS | Verified | QA-4 |
| Phase 3: Bitbucket variant | PASS | Verified | QA-2 closed; Bitbucket Pipelines has no run-cancellation setting in the snippet |

---

## Success Criteria Verification

Unchanged from cycle 1, at this head. The § 8 mutation criterion now covers M8–M9 as well (below).
The CHANGELOG still cites (`cites (task 174)`). Criteria signals: `[]`.

---

## Breaking Changes Validation

None. **PASS (N/A).**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: The concurrency guard passes on a broken group** (TASK-174-QA-3)

- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.174.bug.2.concurrency-guard-passes-on-broken-group.md](./task.174.bug.2.concurrency-guard-passes-on-broken-group.md)
- **Recommendation**: Pin the group exactly, and assert there is no job-level `concurrency:`.
- **Priority**: P2

**Issue: The guide overstates what the concurrency fix guarantees** (TASK-174-QA-4)

- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.174.bug.3.guide-overstates-base-run-guarantee.md](./task.174.bug.3.guide-overstates-base-run-guarantee.md)
- **Recommendation**: Scope the claim, and list the cases concurrency does not cover.
- **Priority**: P2

### LOW Severity Issues (1)

- **TASK-174-QA-5**: the concurrency group does not include `github.workflow`.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS

No change since cycle 1.

### Reliability — CONCERNS

TASK-174-QA-4.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 28 (`task.174.qa.2.security.run.json`, `totals.executed`), escaped 0, reproduced 0
- **Boundary**: true. `is_docs` was re-probed in both variants at this head with `shell-fn:` (14 + 14 cases). Criteria signals: `[]`.

### Maintainability — CONCERNS

TASK-174-QA-3.

---

## Code Review

Refute pass: 12 files and a 2191-line patch, reviewed in full.

**Correctness bugs (3):**

- [medium/high] `docs/examples/ci/github-actions/changes-job.test.js:60`: the guard passes on a
  broken block. → Pin the group exactly. *Promoted (`code_review_blocking`): TASK-174-QA-3.*
- [medium/medium] `docs/runbooks/ci-docs-only-skip.md:139`: the guide overstates what concurrency
  guarantees. → Scope the claim. *Not promoted (confidence medium). QA verified it against
  `classify-changes.sh:225` and raised it as TASK-174-QA-4. Severity unchanged.*
- [low/medium] `docs/examples/ci/github-actions/changes-job.yml:23`: the group is not scoped to the
  workflow. → Add `github.workflow`. *QA raised it as TASK-174-QA-5 (low).*

**Cleanups (1):**

- `docs/examples/ci/bitbucket-pipelines/classify-changes.test.js:196`: "docs-only PR → false, no
  lookup" never checks that `curl` did not run. → Route it through `classify()` with the fake curl.
  Gate `recommendations.future`.

Provenance: all four are in files new to this PR.

**Mutation proofs (cycle-1 fixes, re-run against the committed tree at `0d69112b`, `cp`-snapshot
restored, `git status` clean afterwards):**

```
mutation-proven: changes-job.yml cancel-in-progress restored to `true` → "cancel-in-progress is conditional on pull_request, never a literal true" → covered
mutation-proven: cross-variant test env re-spread restored, DOCS_PATTERNS='*.md' in runner env → "is_docs is identical to the GitHub Actions template's, default and overridden" → covered
```

M8's group-side mutation (back to `ci-${{ github.ref }}`) went red at qa-fix. CR-1 shows a nearby
mutation that does **not** go red (`github.ref_name`), so the group half counts as covered for
`github.ref` only, which is why QA-3 is raised.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Template suites (22 + 2 + 45 + 2) | PASS |
| `ci:fast` at qa-fix (7116, 0 fail) | PASS |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test docs/examples/ci/github-actions/changes-job.test.js
command node --test docs/examples/ci/bitbucket-pipelines/classify-changes.test.js
node security-probe.mjs --sink filename --entry 'shell-fn:<variant>/classify-changes.sh#is_docs' --cases-file is-docs.cases.json   # 14 + 14
```

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-174-QA-3: pin the group exactly (P2).
2. TASK-174-QA-4: scope the guide claim (P2).

### Short-term Actions (Non-Blocking)

1. TASK-174-QA-5: add `github.workflow` to the group.
2. CR-4: tighten the Bitbucket "no lookup" case.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high findings. Cycle 1's fix is right, but its guard is weak and the guide claims
more than the fix delivers.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-174-QA-3 and TASK-174-QA-4 fixed.

---

**QA Report**: co-located at `task.174.qa.2.ci-docs-only-classifier-template.md`
**Gate File**: co-located at `task.174.gate.2.ci-docs-only-classifier-template.yml`
**Next Steps**: `/qa-fix` for QA-3, QA-4 and QA-5, then QA cycle 3.
