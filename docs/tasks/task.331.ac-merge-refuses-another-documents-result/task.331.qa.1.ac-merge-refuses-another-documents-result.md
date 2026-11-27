# QA Report: Task 331 - The AC merge refuses another document's result

**Task**: [task.331.ac-merge-refuses-another-documents-result.md](./task.331.ac-merge-refuses-another-documents-result.md)
**Gate File**: [task.331.gate.1.ac-merge-refuses-another-documents-result.yml](./task.331.gate.1.ac-merge-refuses-another-documents-result.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Testing Completed**: 2026-11-27
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #962 at head `b4a0158c4130`. The engine refusal, the stem-keyed paths and both § 8 mutations hold. One MEDIUM finding: CI `link-check` is red on the head because the implementation report names the LAN server in user-at-address form, which the checker reads as a dead `mailto:` link.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CI link-check green on the head)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (8/8 boxes)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#962)

### Testing Approach

- [x] Automated Testing (engine, deferred-ci and eval block suites; fast gate)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (independent Explore subagent)

### Review Methodology

Direct tools (low-risk task, three phases), plus one read-only Explore subagent for the Step 3b diff review. Reviewer dispatched 15:16:56Z, returned 15:19:00Z (`duration_ms` 100216).

Diff review: code review (the change set includes `.js` and `.mjs` files).

CI on b4a0158c4130: 1 failed (0 pre-existing)

Step 4b: run over `skills/finalise/SKILL.md` with `--diff-base`; 3 changed blocks, all classified `mutating` (they write `.claude/state`), 0 executed. Findings `zero-blocks-executed` and `changed-blocks-not-executed` are recorded. Two of the three changed blocks (Step 3c merge, Step 6 action 2a) are executed as substituted by `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` and `shared/resources/tests/finalise-deferred-ci.test.mjs`. The third (Step 3c extract) is run by no test, so QA ran it by hand in a scratch copy under bash and zsh. Unsubstituted → `HALT: AC_AGENT_ID, STEM and DOD_N must be substituted`; empty `STEM` → same HALT; substituted → `{"reason":"transcript-not-found"}` and nothing written at the result path. Both shells agree.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine refusal | PASS | Verified | `storyFileOf` + `sameDocument`; refusal after the hash check |
| Phase 2: SKILL.md paths and tests | PASS | Verified | 4 paths carry `${STEM}`; HALT arm; Step 6 comment; 7 + 2 test paths |
| Phase 3: Records and bundle | PASS | Verified | CHANGELOG entry; `bundle:check` 0 problems |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| § 8 table held in `finalise-rerun-scope.test.mjs` | PASS | four task-331 CLI tests, one per row; 69/69 |
| Step 3c merge and Step 6 action 2a blocks read the stem paths | PASS | eval blocks test writes `finalise-ac-result-task.9-1.yaml`; deferred-ci stages `finalise-ac-merged-task.9-1.json`; reverting the two paths turned 18 deferred-ci and 4 eval tests red (implementation report, Step 3) |
| `git grep -c 'finalise-ac-\(result\|merged\)-\${DOD_N}'` reads 0 | PASS | exit 1, no match (calibrated at 4 before the change) |
| Bounds | N/A | no bound is claimed |
| Every § 8 mutation recorded with the test it turned red | PASS | see Code Review › mutation-proven |
| `npm run test:remote` and `npm run bundle:check` pass | PASS | test:remote TEST_EXIT=0, 8956 pass / 0 fail; bundle:check 0 problems |
| Step 3c `case` has a `result-document-mismatch` HALT arm | PASS | `skills/finalise/SKILL.md` Step 3c case |
| CHANGELOG `[Unreleased]` names both changes | PASS | `changelog-cites.sh task.331` → `cites (task 331)` |

criteria-drift: clean (base: review-commit). boundary_signals: `[]`.

Standards-named validation: `npm run validate -- skills/finalise/` → `✓ finalise`.

---

## Breaking Changes Validation

### Breaking Change: AC state file paths carry the stem
Documented: Yes (task § 5, CHANGELOG)
Migration Path Provided: Yes (a resumed run re-runs Step 3c)
Migration Tested: N/A
Consumer Code Updated: Yes (all four SKILL.md paths)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: CI link-check red on the implementation report (T331-CI-1)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: the `link-check` job reports one dead link, a `mailto:` built from the server's user-at-address spelling, with Status 400, in the implementation report. It is green on develop (run 46016584190).
- **Impact**: the PR cannot merge green.
- **Recommendation**: name the server without the user-at-address form.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
One extra YAML parse and up to two `realpathSync` calls per merge.

### Reliability — PASS
The refusal writes nothing and the hash check still runs first. A resumed run re-runs Step 3c.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. Entry `shared/resources/finalise-rerun-scope.js#sameDocument` (module-private, reached through the `merge` CLI). Its only inputs are the AC agent YAML that `/finalise` Step 3c extracts from its own subagent transcript, and the scope JSON Step 3a wrote. No corpus sink has legitimate cases that are documents it accepts. Four committed CLI tests and two mutations hold its behaviour.

### Maintainability — PASS
Two cleanups are advisory (below).

---

## Code Review

Reviewer: independent Explore subagent, code route, whole-branch diff. Anchors checked with `finding-anchors.js` (`malformed-anchors`: 1 of 5).

**Correctness bugs (3), all advisory. None is high-confidence, and none was reproduced as a misbehaviour against the specification:**
- [low/medium] `skills/finalise/SKILL.md:1025` — the extract output and the rerun-scope JSON are still keyed by `DOD_N` alone. Task § 4 puts both out of scope, and the CHANGELOG claim names only the two renamed files. → recommendations.future
- [low/medium] `shared/resources/finalise-rerun-scope.js:754` — a `story_file` that names no existing file reports as another document's answer. This fails closed (HALT); only the message is imprecise. → recommendations.future
- [low/low] `shared/resources/finalise-rerun-scope.js:739` — a `story_file` at the YAML root beside `ac_traceability` goes unchecked. That is not the shape the AC prompt writes, and § 5 lets a result that names no document merge. → recommendations.future

**Cleanups (2):**
- `shared/resources/finalise-rerun-scope.js:732` — the new helpers sit between the `merge()` JSDoc and `function merge`, orphaning that block.
- `shared/resources/tests/finalise-rerun-scope.test.mjs:259` ⚠️ unverified anchor (text-mismatch; the test is at `:2336`) — no test exercises the realpath fallback or a nonexistent path.

**Mutation proofs** (snapshot with `cp`, restored, `cmp` clean, `git status --porcelain` unchanged, baseline 69/69 after):
- mutation-proven: refusal disabled (`if (false)`) → `merge: a result whose story_file names another document is refused and nothing is recorded (CLI, task 331)` → covered
- mutation-proven: raw-string comparison (`named !== s.document`) → `merge: story_file naming the same document by absolute path merges (CLI, task 331)` → covered

Command: `command node --test shared/resources/tests/finalise-rerun-scope.test.mjs` (each mutation: 68 pass / 1 fail, the named test).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Engine suite (`finalise-rerun-scope.test.mjs`) | PASS 69/69 |
| Step 6 fence (`finalise-deferred-ci.test.mjs`) + eval blocks | PASS 59/59 |
| Full fast gate (`ci:fast` on the CI-parity server) | PASS 8956 / 0 fail |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-rerun-scope.js`, `skills/finalise/SKILL.md`, the three test files, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/finalise-rerun-scope.test.mjs
npm run test:remote
npm run validate -- skills/finalise/
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 962
```

### Coverage Report
Not measured (the repository's suites report no coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. T331-CI-1: fix the dead `mailto:` autolink in the implementation report.

### Short-term Actions (Non-Blocking)
1. CR-1 to CR-5, as recorded in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The functional work is verified. One MEDIUM CI finding blocks a green merge.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CI link-check green on the head.

**Next Steps**: `/qa-fix` for T331-CI-1, then re-review.
