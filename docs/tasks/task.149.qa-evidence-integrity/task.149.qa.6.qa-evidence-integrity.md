# QA Report: Task 149 - QA evidence integrity: qa-task/qa-story claims that no check reads back

**Task**: [Link to task document](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.6.qa-evidence-integrity.yml](./task.149.gate.6.qa-evidence-integrity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Testing Completed**: 2026-09-26
**Gate Status**: CONCERNS

---

## Re-Review Context

Cycle 6. The pipeline was re-entered after a loop-limit escalation, with 2 extra cycles granted. This cycle gates cycle 5's fix `45b07cf2`, which no gate had read.

| Previous issue | Severity | Status | Evidence |
| -------------- | -------- | ------ | -------- |
| [TASK-149-BUG-8](./task.149.bug.8.read-back-could-not-look-not-exit-2.md): three could-not-look states without exit 2 | MEDIUM | FIXED | Each of the three named paths exits 2. A directory `--doc` stages nothing (probe `dir-doc`, 0 staged). Mutations M1–M3 each turn their test red |
| [TASK-149-BUG-9](./task.149.bug.9.read-back-gate-grammar.md): gate grammar | MEDIUM | FIXED | `task.9.gate.1.yml` and `task.9.gate.01.x.yml` are found and read clean (probe + test). M4 goes red. A double-segment residue is a new LOW (CR6-2) |
| CR-5 (cycle 5): a failed stage reported twice | low | FIXED | Code read: `failedStage` suppresses the second report |
| CR-6 (cycle 5): DEST check onto `isWithin` | low | FIXED, **regressed** | The switch made a legitimate `..name` DEST overblocked (CR6-4) |

---

## Executive Summary

Cycle 5's two fixes hold and are mutation-proved. The review found one more state that breaks the
script's "could not look is exit 2" contract. An `unverifiable` link (git did not answer) exits 1 and
prints the remedy for a missing artifact. It fails closed, but the contract and the message are wrong.
Two LOW edge cases also fail closed. One of them is a regression that cycle 5's cleanup introduced.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#493)

### Review Methodology

Direct tools plus one read-only diff reviewer (Explore), which returned after 204 s. Every
medium and high reviewer claim was executed before gating: CR-1 was reproduced in a scratch
repository, and CR-4 by the probe engine and in a scratch repository.

Re-review scope: since 2026-09-26T11:35:00Z (default)

This cycle's diff covers the three source files touched by `45b07cf2`: `shared/resources/qa-read-back.js`,
`shared/resources/tests/qa-read-back.test.mjs` and `shared/resources/qa-execute-snippets.mjs`, 843 lines
against `origin/develop`. The bundled `references/` copies are byte-identical; `bundle:check` reports 0
problems.

Step 4b: not applicable. No runnable prose changed in this cycle's scope; `45b07cf2` touches only `.js`
and `.mjs` files.

---

## New Findings This Cycle

- **[medium]** `shared/resources/qa-read-back.js:224`: an `unverifiable` link is pushed as an
  ordinary HALT (exit 1) with a missing-artifact remedy. Fix: make one contract (TASK-149-BUG-10).
- **[low]** `shared/resources/qa-read-back.js:85`: `artifact()` is unanchored, where `qa-cycle.sh` is
  greedy. `task.9.gate.1.b.gate.2.yml` gets a false "misnamed" HALT. Fix: use the helper's grammar
  (CR6-2).
- **[low]** `shared/resources/qa-execute-snippets.mjs:48`: `isWithin` refuses `..name` children.
  `qa-read-back.js:213` has the same flaw. Fix: `rel === ".." || rel.startsWith(".." + sep)` (CR6-4).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: `--copy-as` seeding | CONCERNS | Verified | Containment engages. `..name` is overblocked (CR6-4, LOW) |
| Phase 2: export-and-probe decline | PASS | Verified | Unchanged this cycle |
| Phase 3: standards-named validation commands | PASS | Verified | Unchanged this cycle |
| Phase 4: post-edit read-back | CONCERNS | Verified | BUG-8/9 closed. BUG-10 is new |
| Phase 5: tests + docs | PASS | Verified | 19/19 read-back cases pass |

**Overall Phase Completion**: 5/5 delivered, 2 with open findings

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| Read-back suite | green | 19/19 (TMPDIR default) and 33/33 with the wiring test under `TMPDIR=/tmp` | PASS |
| Full suite on CI | green | `test`, `validate`, `link-check`, `shellcheck` all SUCCESS at `4bc9da7f` | PASS |
| Could-not-look is never a pass | exit 2 on every could-not-look | exit 2 on the three named paths. `unverifiable` exits 1, which fails closed but is the wrong code | CONCERNS |
| Standards-named validation | clean | `npm run validate` passes for the 7 changed skills. `bundle:check` shows 0 problems. prettier is clean | PASS |

---

## Breaking Changes Validation

None this cycle. The `--copy-as` interface is unchanged.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: an unverifiable link exits 1 with the wrong remedy**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.149.bug.10.read-back-unverifiable-link-exit-1.md](./task.149.bug.10.read-back-unverifiable-link-exit-1.md)
- **Observation**: A link through a committed directory symlink makes `git check-ignore` exit 128. The link then reads `unverifiable`, and the script prints `✖ … is unverifiable — write the artifact or fix the link` and exits 1.
- **Impact**: Fails closed, so no QA comment is posted. The remedy is wrong, and the exit-2 contract is broken.
- **Recommendation**: Make one contract and state it the same way in the header and in Step 12b.
- **Priority**: P2

### LOW Severity Issues (2)

- CR6-2: grammar mismatch on a name that contains two `.gate.N.` segments. It fails closed.
- CR6-4: `isWithin` overblocks `..name`. This is a regression from cycle 5's CR-6 cleanup, and it fails closed.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
The read-back suite runs in about 5 s.

### Reliability — CONCERNS
TASK-149-BUG-10. CR6-2 and CR6-4 both fail closed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 52. Run record: [task.149.qa.6.security.run.json](./task.149.qa.6.security.run.json)
- `qa-read-back verdict` engages 14/14. That includes 4 new cases: `gate-noname`, `gate-zeropad`, `gate-twogates` (halts) and `dir-doc` (exit 2, 0 staged).
- `change-log --check-updated` engages 14/14.
- `--copy-as` DEST containment: 23/24, 0 reproduced, 1 overblocked (`copy-as.dotdot-name`). It fails closed and is recorded as CR6-4.

### Maintainability — PASS
Advisory only: CR-3 and CR-5 (see Code Review).

---

## Code Review

Resolved blocking (`code_review_blocking=true` run override). Reviewer: 1 Explore subagent, scoped diff.

**Correctness bugs (4):**
- [medium/high] `shared/resources/qa-read-back.js:224` — unverifiable link → exit 1 HALT with the missing-artifact remedy → **promoted: TASK-149-BUG-10**
- [low/high] `shared/resources/qa-read-back.js:85` — `artifact()` grammar ≠ `qa-cycle.sh` (first vs last `.gate.N.`, no literal `.yml`) → **promoted: CR6-2**
- [low/medium] `shared/resources/qa-read-back.js:101` — the exit-2 catch returns `staged: []` after pass 1 already staged → advisory (future)
- [low/high] `shared/resources/qa-execute-snippets.mjs:48` — `isWithin` refuses `..name` children; same at `qa-read-back.js:213` → **promoted: CR6-4**

**Cleanups (1):**
- `shared/resources/tests/qa-read-back.test.mjs:288` — no test reaches the "no gate for cycle N … misnamed" branch (CR-5)

Provenance: every reproduced finding is new to this branch. `qa-read-back.js` does not exist on
`origin/develop`, and `isWithin` has 0 occurrences there.

mutation-proven: `!fs.statSync(doc).isFile()` guard removed → "a directory --doc is refused with exit 2 before anything is staged" → covered
mutation-proven: `!l.tracked` throw removed → "an index git cannot read is could-not-look" → covered
mutation-proven: catch rethrows → "an index git cannot read …" + "an unreadable document is exit 2 from the CLI" → covered
mutation-proven: `Number(m[1]) === Number(cycle)` → `m[1] === cycle` → "a gate named task.9.gate.01.x.yml … is found" → covered
mutation-proven: `else if (!gate)` branch disabled → no test red → no-red-untested (CR-5)

That is 4 of 5 fixed branches `covered`.

---

## Regression Testing

- CI at `4bc9da7f` (Linux, `/tmp`): the full `npm run ci` jobs are green.
- `TMPDIR=/tmp node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-read-back-block.test.js`: 33/33 pass.
- One regression found by the probe: `copy-as.dotdot-name` (CR6-4).

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-read-back.js`, `shared/resources/tests/qa-read-back.test.mjs`, `shared/resources/qa-execute-snippets.mjs`, `shared/resources/qa-cycle.sh`

### Test Commands Executed
```bash
node --test shared/resources/tests/qa-read-back.test.mjs                                   # 19/19
TMPDIR=/tmp node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-read-back-block.test.js   # 33/33
node .agents/skills/qa-task/references/security-probe.mjs --entry cli:… --cases-file … --record task.149.qa.6.security.run.json   # ×3, 52 executed
npm run validate -- skills/{qa-task,qa-story,develop-task,develop-story,double-check,finalise,review-security}/   # 7 ✓
npm run bundle:check                                                                        # 0 problems
npx prettier --check shared/resources/qa-read-back.js shared/resources/tests/qa-read-back.test.mjs shared/resources/qa-execute-snippets.mjs
gh pr view 493 --json statusCheckRollup                                                     # 5/5 SUCCESS
```

### Coverage Report
Not measured. The repository has no coverage tooling. Mutation proofs stand in for coverage (above).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-149-BUG-10: define one contract for unverifiable links (P2).

### Short-term Actions (Non-Blocking)
1. CR6-2, CR6-4 (open LOWs in the gate queue).
2. CR-3, CR-5 (future).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings, one MEDIUM, and every finding fails closed. Cycle 5's fixes are verified.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-149-BUG-10 fixed

---

**QA Report**: co-located at `task.149.qa.6.qa-evidence-integrity.md`
**Gate File**: co-located at `task.149.gate.6.qa-evidence-integrity.yml`
**Next Steps**: qa-fix cycle 6: BUG-10, CR6-2, CR6-4.
