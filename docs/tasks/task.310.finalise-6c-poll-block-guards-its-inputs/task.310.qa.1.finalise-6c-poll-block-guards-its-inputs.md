# QA Report: Task 310 - The finalise 6c poll block guards its inputs

**Task**: [Link to task document](./task.310.finalise-6c-poll-block-guards-its-inputs.md)
**Gate File**: [task.310.gate.1.finalise-6c-poll-block-guards-its-inputs.yml](./task.310.gate.1.finalise-6c-poll-block-guards-its-inputs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-15
**Testing Completed**: 2026-11-15
**Gate Status**: PASS

---

## Executive Summary

The first 6c poll block now opens with a `${VAR:?}` guard on `CI_HEAD_2` and `PR_NUMBER`. A committed behaviour test runs the shipped line unbound and bound. Mutating the guard turned two tests red. No blocking finding.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#910)

### Review Methodology

Adaptive strategy override: lite-style direct tools only. The change is one guard line and one test. Diff review: code review, performed inline; the independent reviewer did not run.

CI on 2ad26946a37e: not read from the PR in this cycle; the fast gate ran on the LAN server (8475 pass, 0 fail).

Re-review scope: not applicable (first review).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Guard line in the 6c block | PASS | Verified | `skills/finalise/SKILL.md:2245`, above the head comparison and the `rm -f` |
| 2. Behaviour test | PASS | 49 pass, 0 fail | `finalise-publish-boundary.test.mjs`, new guard test plus order assertion |
| 3. CHANGELOG and docs | PASS | Verified | `changelog-cites.sh` reports `cites (task 310)` |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `CI_HEAD_2` unbound exits non-zero, names it | yes | exit 127 under `bash -c`, name in stderr | PASS |
| `PR_NUMBER` unbound exits non-zero, names it | yes | same | PASS |
| Both bound exits 0 | yes | exit 0, empty stderr | PASS |
| Guard precedes `rm -f`; deleting it reddens the test | yes | order assertion; mutation below | PASS |
| Later-turn reader unchanged | yes | existing tests green | PASS |
| `bundle:check` clean | 0 problems | 129 skills, 0 problems | PASS |
| `validate -- skills/finalise/` | passes | passes | PASS |
| Fast gate 0 not ok | 0 | `ci:fast` on LAN server: 8475 pass, 0 fail | PASS |
| CHANGELOG cites `(task 310)` | yes | yes | PASS |

Criteria drift: clean. No criterion changed since review.

---

## Breaking Changes Validation

None. A run that carried both values in before still does.

---

## Issues Found

None. HIGH: 0, MEDIUM: 0, LOW: 0.

---

## NFR Assessment

### Performance — PASS
One `:` line in an existing block.

### Reliability — PASS
The guard halts by name. Bash exits 127 and zsh exits 1; the test asserts non-zero only.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary decision: `boundary: false`. The guard checks that two variables are bound; its input is neither hostile data nor repository state. Candidate considered: the `${VAR:?}` line, which lacks the accept-or-reject-data signal. The committed test already runs it under both cases.

### Maintainability — PASS
The order assertion includes the guard.

---

## Code Review

Diff review: code review (inline, one pass).

**Correctness bugs (0):** none.

**Cleanups (2, advisory):**

- `skills/finalise/SKILL.md` (other blocks) — `PR_NUMBER` is read unguarded elsewhere (about lines 1338, 1360 and the Bitbucket comment block near 2668) → guard them the same way, as a follow-up.
- `task document, Problem 1` — `gh pr view ""` was measured only on a branch without an open PR → note it, or run the open-PR case.

mutation-proven: replaced `:?` with `:-` in the guard line → two tests red (49 → 47 pass, 2 fail) → covered. Reverted from a `cmp`-verified snapshot; 49 pass again.

Step 4b: the changed block is classified `mutating` (it names `gh`, `rm`, `nohup` and writes files), so the engine refused it by design (`changed-blocks-not-executed`). The guard line was run directly under bash (exit 127) and zsh (exit 1) instead, and by the committed test.

---

## Regression Testing

`finalise-publish-boundary.test.mjs`: 49 pass, 0 fail. Full fast gate green on the LAN server.

---

## Test Artifacts

### Files Reviewed
`skills/finalise/SKILL.md`, `evals/shared/tests/finalise-publish-boundary.test.mjs`, `CHANGELOG.md`.

### Test Commands Executed
```bash
node --test evals/shared/tests/finalise-publish-boundary.test.mjs
npm run validate -- skills/finalise/
npm run bundle:check
npm run test:remote   # ci:fast on the LAN server: 8475 pass, 0 fail
bash -c ': "${CI_HEAD_2:?x}" "${PR_NUMBER:?y}"'   # and zsh -c
```

---

## Recommendations

### Short-term Actions (Non-Blocking)
1. Guard the other unguarded `PR_NUMBER` reads in `skills/finalise/SKILL.md`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The guard is present, ordered, and held by a test that fails when the guard is removed.
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**QA Report**: co-located at `task.310.qa.1.finalise-6c-poll-block-guards-its-inputs.md`
**Gate File**: co-located at `task.310.gate.1.finalise-6c-poll-block-guards-its-inputs.yml`
**Next Steps**: 5c PR conformance review.
