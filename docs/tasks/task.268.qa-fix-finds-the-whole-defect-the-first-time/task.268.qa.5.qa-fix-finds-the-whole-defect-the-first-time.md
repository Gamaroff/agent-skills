# QA Report: Task 268 - qa-fix finds the whole defect the first time

**Task**: [Link to task document](./task.268.qa-fix-finds-the-whole-defect-the-first-time.md)
**Gate File**: [task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml](./task.268.gate.5.qa-fix-finds-the-whole-defect-the-first-time.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5 is the last gate in the budget. It re-reviewed the whole branch diff, because gate 4 reported a security-axis CONCERNS. Both gate 4 findings are closed. The independent reviewer found two further medium edge cases in the Step 4 guard; I reproduced the first and the reviewer ran the second.

**Overall Assessment**: CONCERNS (80/100)
**Deployment Recommendation**: CONDITIONAL

## Review Methodology

Re-review scope: unscoped (the prior gate's security axis was not PASS) — full `origin/develop...HEAD` diff, 1838 patch lines. One read-only Explore reviewer with the safety re-probe directive; it returned in 69 s (measured, `duration_ms`).

CI: not read against a matching head (the PR head is `91e2da1d`; the later commits are local and unpushed), so nothing is mapped.

## Re-Review Context

| Finding | Status |
| --- | --- |
| T268-QA-8 (pathspec magic interpreted) | ✅ FIXED — mutation-proven |
| T268-QA-9 (nonexistent path reads clean) | ✅ FIXED — mutation-proven |

## New Findings This Cycle

- **[medium]** `skills/qa-fix/SKILL.md:854` — the slot is substituted into a double-quoted assignment, so a command substitution in a path runs (reproduced) → single-quoted heredoc or refuse metacharacters (T268-QA-10).
- **[medium]** `skills/qa-fix/SKILL.md:861` — a path in a nested repository or behind a symlinked directory exists, lists nothing, and reads clean (reviewer-run) → refuse or document (T268-QA-11).

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 18 (0 escaped), from `task.268.qa.5.security.run.json`
- No shell-metacharacter or nested-repo case in the probe.

### Reliability — CONCERNS
### Performance — PASS
### Maintainability — PASS

## Code Review

**Correctness bugs (2):**
- [medium/high] `skills/qa-fix/SKILL.md:854` — command substitution in the slot value executes → T268-QA-10.
- [medium/high] `skills/qa-fix/SKILL.md:861` — nested repo / symlinked directory reads clean → T268-QA-11.

**Cleanups (2):**
- `tests/qa-fix-step4-guard.test.js:136` — the admitted cases use only ignored directories; no tracked, deleted-tracked or intent-to-add case; the no-repo test asserts only the outcome → advisory.
- `shared/resources/develop-pipeline-step-3-develop-loop.md:233` — gives the bare unguarded listing → advisory.

## Test Artifacts

### Test Commands Executed
```bash
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file .claude/state/t268-cases5.json --repo-root . --record task.268.qa.5.security.run.json --json
bash -c 'C="tracked \"$(touch PWNED)\""'
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: the QA budget (5 gates) is spent. T268-QA-10 and T268-QA-11 go to the task's Deferred Work; then the `/review-pr` exit gate.
