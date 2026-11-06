# QA Report: Task 268 - qa-fix finds the whole defect the first time

**Task**: [Link to task document](./task.268.qa-fix-finds-the-whole-defect-the-first-time.md)
**Gate File**: [task.268.gate.3.qa-fix-finds-the-whole-defect-the-first-time.yml](./task.268.gate.3.qa-fix-finds-the-whole-defect-the-first-time.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3 re-reviewed the whole branch diff, because gate 2 failed on a safety axis. Cycle 2's fix closed both of its findings. The independent reviewer then found that the repaired Step 4 guard does not split a multi-path slot under zsh, so it reports clean on an untracked file. I reproduced it.

**Overall Assessment**: FAIL (70/100)
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

Re-review scope: unscoped (prior gate failed on security) — full `origin/develop...HEAD` diff, 20 files. One read-only Explore reviewer with the safety re-probe directive; it returned in 22 s (measured, `duration_ms`).

CI on da08a54caf47: head mismatch (PR head is 91e2da1d39b5, the fix commits are not pushed), so nothing is mapped.

Step 4b: the Step 4 fence was executed through the probe engine (below). Mutation proofs were not re-run this cycle: the committed test `tests/qa-fix-step4-guard.test.js` carries its own mutation proof of the cycle-1 bug and passes.

## Re-Review Context

| Finding | Status |
| --- | --- |
| T268-QA-4 (filled slot always refused) | ✅ FIXED — filled single-path slot admitted; probe engages |
| T268-QA-5 (prose / git failure) | ✅ FIXED — fails closed; prose states refuse branch only |
| CR-3, CR-4 (cycle 2 advisory) | ✅ FIXED |

## New Findings This Cycle

- **[high]** `skills/qa-fix/SKILL.md:849` — unquoted `$CHANGED_PATHS` is not word-split under zsh, so a multi-path slot is one pathspec that matches nothing and the guard admits untracked files → split the slot explicitly in both shells and refuse a blank value (T268-QA-6).
- **[medium]** `tests/qa-fix-step4-guard.test.js:56` — no multi-path or whitespace-only case, and the clean case is a gitignored path a vacuous pathspec would also pass → add both cases and a tracked clean file (T268-QA-7).

## Success Criteria Verification

Structural criteria are unchanged from gate 2 and hold. The Step 4 staging criterion is the one in question: it holds for a single path in both shells and fails for a multi-path slot under zsh. CHANGELOG: `cites (task 268)`. Criteria drift: clean.

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 10 (0 escaped), from `task.268.qa.3.security.run.json`
- The probe passes because every case is single-path; it cannot see T268-QA-6.

### Reliability — FAIL
The guard fails open under zsh on a multi-path slot.

### Performance — PASS
### Maintainability — PASS

## Code Review

**Correctness bugs (3):**
- [high/high] `skills/qa-fix/SKILL.md:849` — platform-variance: zsh does not split the unquoted slot; reproduced (bash prints `e/x`, zsh prints nothing) → promoted as T268-QA-6.
- [medium/high] `tests/qa-fix-step4-guard.test.js:56` — no multi-path case → T268-QA-7.
- [low/medium] `tests/qa-fix-step4-guard.test.js:73` — the clean case is a gitignored path → folded into T268-QA-7.

**Cleanups (1):**
- `tests/qa-fix-step4-guard.test.js:131` — unused mkdtemp; the mutant file can be left behind if the process is killed → advisory.

## Test Artifacts

### Test Commands Executed
```bash
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file .claude/state/t268-cases.json --repo-root . --record task.268.qa.3.security.run.json --json
zsh -c 'cd $(mktemp -d) && git init -q && mkdir d e && touch e/x && P="d e"; git ls-files --others --exclude-standard -- $P'
```

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` on T268-QA-6 and T268-QA-7, then cycle 4 (scoped to the files changed since this gate's head).
