# QA Report: Task 285 - qa-fix Step 4 guard survives hostile paths

**Task**: [Link to task document](./task.285.qa-fix-step4-guard-hostile-paths.md)
**Gate File**: [task.285.gate.1.qa-fix-step4-guard-hostile-paths.yml](./task.285.gate.1.qa-fix-step4-guard-hostile-paths.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Testing Completed**: 2026-11-07
**Gate Status**: CONCERNS

---

## Executive Summary

All five phases are delivered. The Step 4 guard now keeps a command substitution, backtick or variable in a path inert, refuses backslash and quote characters, and refuses a path below a symlink or nested repository. The full suite is green. One medium finding: the parent walk refuses a legitimate path that reaches the repository through `..` or a symlinked prefix.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#856)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b). First review, so the whole branch diff was reviewed.

CI on 7675fdb9d621: green

Step 4b: the changed Step 4 block was refused by the snippet engine (`unrecognised-command: <unparseable>, xargs (fail-closed)`, the heredoc), and the block at line 891 as `write-redirection`. The same block is executed under bash and zsh by the committed probe test and by the probe run below, so the refusal loses no coverage. Counts: 13 blocks, 0 runnable, 3 placeholder, 10 mutating; changed blocks: 1 total, 0 executed.

Step 3c: the committed `MUTANTS` and `DIRECT_MUTANTS` tests apply each reversion in memory and assert a named test goes red. All six new mutants pass (the test file reports 17 of 17). Nothing was mutated on disk.

---

## New Findings This Cycle

Not a re-review. See Code Review below.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both findings | PASS | Verified | Red output recorded in the implementation report |
| Phase 2: Close T268-QA-10 | PASS | Verified | Single-quoted heredoc; `\ ' "` refused |
| Phase 3: Close T268-QA-11 | CONCERNS | Verified | Refusal works; stop condition too narrow (T285-QA-1) |
| Phase 4: Hold every branch with a test | PASS | Verified | Admitted cases, direct runner, six mutants |
| Phase 5: One description of the check | PASS | Verified | Loop doc points at the block; bundle in sync |

**Overall Phase Completion**: 5/5 delivered, 1 with a finding

---

## Success Criteria Verification

All criteria in the task document are met or cited to evidence: the hostile cases are refused under bash and zsh (34 probe cases, 0 escaped), the admitted cases pass, the loop doc no longer restates the bare command, CHANGELOG cites task 285 (`changelog-cites.sh`: `cites (task 285)`), and the two task 268 findings are marked closed. Criteria drift: clean.

---

## Breaking Changes Validation

None. A path holding a newline stays unsupported and is documented.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T285-QA-1, parent walk refuses a legitimate path**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: the walk stops only when the directory string equals `$TOP`. From `repo/a`, `../real/g` is refused at `..` (reproduced in a scratch repository). An absolute path through a symlinked prefix behaves the same.
- **Impact**: a legitimate path is refused as "below a nested repository". Fails closed and loud; qa-fix normally runs from the repository root with repo-relative paths.
- **Recommendation**: compare physical paths (`cd -P` / `pwd -P`) or normalise to `$TOP`-relative before the walk; add a subdirectory-cwd case and a symlinked-prefix case, each with a mutant.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
New tests each finish under one second. Full suite: 7961 pass, 0 fail.

### Reliability — CONCERNS
T285-QA-1, above.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 34
- The Step 4 fence is a boundary: the criteria say a path "is refused". The probe engine ran the 17 cases under bash and zsh. 34 executed, 0 escaped, every case matched its direction.

### Maintainability — PASS
One description of the check; bundled copies in sync.

---

## Code Review

Reviewer: read-only Explore subagent over the whole branch diff (897 patch lines). It ran the block under bash and zsh. The test file was skimmed, not executed by the reviewer.

**Correctness bugs (1):**
- [medium/high] `skills/qa-fix/SKILL.md:879` — parent walk stops only on a string match with `$TOP`, so `..` and symlinked-prefix paths are refused wrongly → compare physical paths. Anchor verified. Promoted to the gate as T285-QA-1 (`code_review_blocking`). Provenance: new in this diff (the walk is new code), not pre-existing.

**Cleanups (0).**

mutation-proven: heredoc reverted to a double-quoted assignment → "T268-QA-10 mutant" test → covered
mutation-proven: quote refusal reverted → "task 285 mutant" test → covered
mutation-proven: `.git` clause reverted → "T268-QA-11 mutant" test → covered
mutation-proven: `--error-unmatch` branch reverted → deleted-tracked direct mutant → covered
mutation-proven: symlink clause reverted → symlink direct mutant → covered
mutation-proven: repository-root stop reverted → absolute-path direct mutant → covered

The `boundary` decision: `true`. `boundary_signals: ["refused", "is refused"]`.

---

## Regression Testing

`CI=true npm test`: 7961 pass, 0 fail. `npm run ci:fast`: exit 0. `npm run bundle -- --check`: clean. `quick_validate` on qa-fix: pass.

---

## Test Artifacts

### Files Reviewed
`skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, `shared/resources/develop-pipeline-step-3-develop-loop.md` and its three bundled copies, `CHANGELOG.md`, the task 268 and 285 documents.

### Test Commands Executed
```bash
CI=true npm test
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file <cases.json> --repo-root "$PWD" --record task.285.qa.1.qa-fix-step4-guard-hostile-paths.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-fix/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T285-QA-1.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium false-refusal finding in new code.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T285-QA-1 fixed

---

**QA Report**: co-located at `task.285.qa.1.qa-fix-step4-guard-hostile-paths.md`
**Gate File**: co-located at `task.285.gate.1.qa-fix-step4-guard-hostile-paths.yml`
**Next Steps**: `/qa-fix`
