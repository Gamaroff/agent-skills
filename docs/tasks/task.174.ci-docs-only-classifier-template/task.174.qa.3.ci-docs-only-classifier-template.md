# QA Report: Task 174 - Publish the docs-only CI classifier as an optional consumer template

**Task**: [Link to task document](./task.174.ci-docs-only-classifier-template.md)
**Gate File**: [task.174.gate.3.ci-docs-only-classifier-template.yml](./task.174.gate.3.ci-docs-only-classifier-template.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: PASS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| TASK-174-QA-3 (medium): concurrency guard passes on a broken group | ✅ FIXED | `changes-job.test.js` pins the whole block. QA re-ran M10 (the `github.ref_name` evasion) against `08ccb5d2`: 1 red, then restored. |
| TASK-174-QA-4 (medium): guide overstates the base-run guarantee | ✅ FIXED | The guide's § `cancel-in-progress` matches `classify-changes.sh:186-225`. It says PR-only cancellation removes one case, lists what remains, and gives the adopter's remedy. |
| TASK-174-QA-5 (low): group not workflow-scoped | ✅ FIXED | The group starts with `${{ github.workflow }}-`. M11 → 1 red at qa-fix. |
| TASK-174-QA-1 (cycle 1): base-branch push runs cancelled | ✅ FIXED | Closed with bugs 1–3. |

Bugs 1, 2 and 3 were closed this cycle (`status-history.js`).

## Executive Summary

Cycle 3 reviewed the files changed since gate 2's head. All cycle-2 findings are fixed and
mutation-proven. The reviewer found no bugs and one wording cleanup, which is advisory. The boundary
still passes 28 executed probes.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

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
- [x] Code Review

### Review Methodology

Direct tools plus one read-only diff reviewer, dispatched at 2026-11-02T14:24:11Z. It returned in
75.9 s (`duration_ms` 75852). Its one anchor checked `ok`.

Re-review scope: files changed since gate 2 (head 0d69112bc6c1; 12 files) — default

CI on 08ccb5d2471c: pending.

Step 4b: not applicable. No runnable prose in the change set.

Criteria drift: `clean` against the `reviewed-blob` base.

---

## New Findings This Cycle

- **[low, cleanup]** `docs/runbooks/ci-docs-only-skip.md:132`: "Once the classifier is in place
  this is not optional" reads as making the whole block mandatory, while the snippet comment calls
  the block "Optional". → Say that the block is optional, but if it is kept, PR-only cancellation
  and per-run push groups are not. Advisory; recorded in the gate's `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: precondition | PASS | Verified | Unchanged |
| Phase 1: GitHub Actions template | PASS | Verified | Concurrency block pinned and workflow-scoped |
| Phase 2: guide and parity | PASS | Verified | Claim scoped |
| Phase 3: Bitbucket variant | PASS | Verified | Unchanged since cycle 2 |

---

## Success Criteria Verification

All criteria hold as recorded in cycle 1, at this head. The § 8 mutation criterion: M1–M13 are all
`covered` (below and in the earlier reports). The CHANGELOG still cites (`cites (task 174)`).
Criteria signals: `[]`.

---

## Breaking Changes Validation

None. **PASS (N/A).**

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0. One advisory cleanup, above.

---

## NFR Assessment

### Performance — PASS

Unchanged.

### Reliability — PASS

QA-4 and QA-5 are fixed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 28 (`task.174.qa.3.security.run.json`, `totals.executed`), escaped 0, reproduced 0
- **Boundary**: true (`is_docs`, both variants, `shell-fn:`). Criteria signals: `[]`.

### Maintainability — PASS

QA-3 is fixed.

---

## Code Review

**Correctness bugs (0).**

**Cleanups (1):**

- `docs/runbooks/ci-docs-only-skip.md:132`: "not optional" disagrees with the snippet's "Optional".
  → Scope the sentence.

**Mutation proofs (cycle-2 fixes):**

```
mutation-proven: group gains `&& github.ref_name` (the CR-1 evasion), re-run by QA against 08ccb5d2 → "the block is exactly the pinned group and cancel-in-progress" → covered
mutation-proven: `${{ github.workflow }}-` dropped → same test → covered (qa-fix)
mutation-proven: cancel-in-progress literal `true` → same test → covered (qa-fix)
mutation-proven: trailing `# github.run_id` comment on the group line → same test → covered (qa-fix)
mutation-proven: a job-level `concurrency:` added → "exactly one concurrency block, at the top level" → covered (qa-fix)
```

The qa-fix proofs ran on bytes identical to the committed tree: `git status` was clean for
`docs/examples` after each restore, and the commit added nothing to those files afterwards.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Template suites (22 + 2 + 45 + 2) | PASS |
| `ci:fast` at qa-fix (7116, 0 fail) | PASS |

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. Cycle-3 CR-1: scope the "not optional" sentence.
2. Cycle-2 CR-4: tighten the Bitbucket "no lookup" case.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every finding raised in three cycles is fixed and mutation-proven. What remains is
two advisory cleanups.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.174.qa.3.ci-docs-only-classifier-template.md`
**Gate File**: co-located at `task.174.gate.3.ci-docs-only-classifier-template.yml`
**Next Steps**: Step 5c `/review-pr`.
