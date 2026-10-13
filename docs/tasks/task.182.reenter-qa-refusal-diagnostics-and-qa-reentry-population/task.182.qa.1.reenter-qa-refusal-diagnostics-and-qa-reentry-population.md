# QA Report: Task 182 - reenter-qa refusal diagnostics and the qa_reentry reader population

**Task**: [Link to task document](./task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md)
**Gate File**: [task.182.gate.1.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml](./task.182.gate.1.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 1, PR #642 at `b7d7661e`. The script changes do what the task says and are mutation-proven: a `no-gate` refusal relays `qa-cycle.sh`'s reason for each of the three causes, and a failing `git status` refuses `git-unreadable` before any write. Two findings hold the gate at CONCERNS. The hooks-doc writer list, rewritten to be exact, now says both re-entry scripts set `qa_phase` to `5a`, which is false for `grant-qa-cycles.sh` after a not-converging halt. The parity test's detector sub-field check passes with the sub-fields removed.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3 checked)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#642, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (shell-argv probe)
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore code reviewer (Step 3b). Small task (3 phases, one module, low risk), first review, standard mode. The traceability mapper ran beforehand and its matrix was used for Step 5. Code reviewer: 72.8 s (`duration_ms` 72755 from the completion notice). Mapper: 44.8 s.

Step 4b: the change modifies three `shared/resources/*.md` files with fenced bash blocks. `develop-pipeline-hooks.md` — 3 blocks, all refused as mutating (`no-executable-blocks`, information). `develop-pipeline-resume-contract.md` — 31 blocks, 0 findings. `pipeline-resume-detector-prompt.md` — 4 blocks; one `execution-failure` at line 69 (`cat .claude/state/develop-pipeline.lock: No such file`) on an empty temp copy, clean (0 findings) when re-run with `--copy` seeding a lock — a harness seeding gap, not a prose defect; the diff touches only line 118 of that file. Shells: bash (zsh absent on this host).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first (red) | PASS | Verified | 5 suite cases + parity test + route test; red on base per the implementation report |
| Phase 2: The script | PASS | Verified | Relay, `git-unreadable`, header and contract bullet present; bundled copies in sync |
| Phase 3: The reader population | CONCERNS | Verified | Population 32, classified; hooks-doc writer sentence wrong for `grant-qa-cycles.sh` (TASK-182-001) |

**Overall Phase Completion**: 3/3 implemented; 1 with an issue.

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Three `no-gate` causes refuse with `qa-cycle.sh`'s reason | 3/3 | 3/3 | PASS | `expect_gate_cause` cases in `reenter-qa-after-finalise.test.sh`; M1 → 3 red |
| `git status` failure refuses `git-unreadable` before any write | yes | yes | PASS | PATH-stub case; M2 → red |
| Contract list equals script reasons incl. `git-unreadable` | yes | yes | PASS | `reenter-qa-refusals-parity.test.mjs` |
| Hooks doc and detector prompt name `qa_reentry`; hooks doc names both `qa_max_cycles` writers | yes | yes | PASS | Parity test; M3 → red. The surrounding `qa_phase` claim is wrong (TASK-182-001) |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Only one `mktemp`, `sort`, `rm` added at the gate read | diff | `reenter-qa-after-finalise.sh:169-172` | PASS | Documentation criterion, read from the diff |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| ShellCheck `--severity=warning` | clean | clean | PASS | both `.sh` |
| Prettier | clean | clean | PASS | `ci:fast` |
| `npm test`, `bundle:check` | green | 5424/0; 0 problems | PASS | `ci:fast` on the same content; `bundle:check` local |
| Mutation-proven | each case | M1–M3 `covered` | PASS | see Code Review |
| CHANGELOG cites task 182 | yes | yes | PASS | `[Unreleased]` › Fixed |
| Standards-named validation | `npm run validate` per changed skill | 6/6 ok | PASS | develop-bug, develop-story, develop-task, qa-story, qa-task, review-pr |

---

## Breaking Changes Validation

None declared. `no-gate` keeps reason and route; `git-unreadable` is a new refusal on a formerly fall-through path. **PASS (N/A).**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the hooks doc says both re-entry scripts set `qa_phase` to `5a`**
- **Severity**: MEDIUM
- **Category**: Quality (documentation accuracy)
- **Bug Report**: [task.182.bug.1.hooks-doc-qa-phase-writer-claim.md](./task.182.bug.1.hooks-doc-qa-phase-writer-claim.md)
- **Observation**: `develop-pipeline-hooks.md:86` — "by both re-entry scripts, which set it to `5a`". `grant-qa-cycles.sh:232-237` sets `REENTER=5b` after a not-converging halt.
- **Impact**: The fix whose job was writer accuracy adds a false claim; a reader debugging a resumed not-converging run expects the wrong phase.
- **Recommendation**: Correct the sentence and pin the `5b` clause in the parity test.
- **Priority**: P2

### LOW Severity Issues (1)

**TASK-182-002** — the detector sub-field assertion in `qa-loop-lock-fields-parity.test.mjs:175` matches the type annotation that opens the detector prompt's `qa_reentry` line, so it holds nothing: reducing the concern template to `"qa_reentry"` leaves the test green (M4, `no-red-untested`).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Three extra calls at the gate read; suite runtime 4.5 s at load 2.34.

### Reliability — PASS
`git-unreadable` refuses before any write (no lock, snapshot unchanged, no temp file — asserted by `expect_refusal`).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8
- `security-probe.mjs --entry 'shell-argv:shared/resources/reenter-qa-after-finalise.sh'` with the task.181 setup and cases: `engages`, 2 legitimate accepted, 6 hostile rejected (other doc, traversal, parent, `$(touch PWNED)`, space, leading dash), 0 reproduced, 0 escapes. Record: `task.182.qa.1.security.run.json`.

### Maintainability — CONCERNS
TASK-182-001 and TASK-182-002.

---

## Code Review

Step 3b: one Explore reviewer over `origin/develop...HEAD` (287-line patch; bundled `references/` copies and `docs/tasks/` excluded). Anchors checked with `finding-anchors.js --rev HEAD`: all 4 resolve. `code_review_blocking=true` (pipeline override).

**boundary: true** — `reenter-qa-after-finalise.sh` refuses by default (its header). `probes_executed: 8` (copied from the run record's `totals.executed`).

**Correctness bugs (3):**
- [medium/high] `shared/resources/develop-pipeline-hooks.md:86` — says both re-entry scripts set `qa_phase` to `5a`; `grant-qa-cycles.sh` writes `5b` after not-converging → state the two values; fix "reads neither". **Promoted: TASK-182-001.**
- [low/high] `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:175` — the sub-field regex matches the line's type annotation, so it is vacuous → anchor on the concern template. **Promoted: TASK-182-002.**
- [low/medium] `skills/develop-task/SKILL.md:336` (and `skills/develop-story/SKILL.md:349`) — the parenthetical names only `uncommitted-fix` as never resuming at 7; `git-unreadable` is now a second → name both, or drop the example. Advisory (medium confidence).

**Cleanups (1):**
- `shared/resources/reenter-qa-after-finalise.test.sh:137` — the git-failure case does not assert git's own error text reaches stderr, so restoring `2>/dev/null` would pass → assert `simulated index failure`. Advisory.

**Mutation proofs** (cp snapshot, restored; tree clean after):

- mutation-proven: relay disabled (`false && printf`) → 3 `no-gate` cause cases red → covered
- mutation-proven: `|| refuse git-unreadable` neutralised → "git status fails" red → covered
- mutation-proven: detector `qa_reentry` line deleted → parity "must name qa_reentry" red → covered
- mutation-proven: concern template reduced to `"qa_reentry"` → no test red → no-red-untested (TASK-182-002)

---

## Regression Testing

| Area | Result |
| --- | --- |
| `reenter-qa-after-finalise.test.sh` accept path and other refusals | PASS (58/58) |
| `security-probe.test.mjs` (task.181 shell-argv proof run of this script) | PASS |
| Both parity tests | PASS |
| Full `ci:fast` | PASS (5424/0) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/reenter-qa-after-finalise.sh`, `.test.sh`, `develop-pipeline-hooks.md`, `develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `grant-qa-cycles.sh`, `qa-cycle.sh`, both parity tests, `CHANGELOG.md`.

### Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
command node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs evals/shared/tests/reenter-qa-refusals-parity.test.mjs shared/resources/tests/security-probe.test.mjs
npm run validate -- skills/<s>/   # develop-bug develop-story develop-task qa-story qa-task review-pr
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'shell-argv:shared/resources/reenter-qa-after-finalise.sh' --argv '["{input}","docs/tasks/task.42.example/report.md"]' --fixture-setup shared/resources/tests/fixtures/shell-argv/reenter-qa-setup.sh --cases-file shared/resources/tests/fixtures/shell-argv/reenter-qa-cases.json --repo-root "$(git rev-parse --show-toplevel)" --record <work-item>/task.182.qa.1.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed shared/resources/*.md> --json
```

### Coverage Report
Not measured (shell and prose; no coverage tooling for these suites).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-182-001 — correct the hooks-doc `qa_phase` sentence; pin it.
2. TASK-182-002 — make the detector sub-field check hold the concern template.

### Short-term Actions (Non-Blocking)
1. CR-3 — name `git-unreadable` in both SKILL.md never-step-7 parentheticals.
2. CR-4 — assert git's error text in the git-unreadable case.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium documentation-accuracy finding and one low vacuous assertion, both promoted under `code_review_blocking`; no functional defect in the script.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-182-001 closed.

---

**QA Report**: co-located at `task.182.qa.1.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md`
**Gate File**: co-located at `task.182.gate.1.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml`
**Next Steps**: `/qa-fix` cycle 1, then re-review (cycle 2, full refute pass).
