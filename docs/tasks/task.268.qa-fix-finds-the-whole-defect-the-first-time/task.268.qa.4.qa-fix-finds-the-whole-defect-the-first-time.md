# QA Report: Task 268 - qa-fix finds the whole defect the first time

**Task**: [Link to task document](./task.268.qa-fix-finds-the-whole-defect-the-first-time.md)
**Gate File**: [task.268.gate.4.qa-fix-finds-the-whole-defect-the-first-time.yml](./task.268.gate.4.qa-fix-finds-the-whole-defect-the-first-time.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 re-reviewed the whole branch diff, because gate 3 failed on a safety axis. Both gate 3 findings are closed. The independent reviewer found two medium holes in the Step 4 guard; I reproduced both.

**Overall Assessment**: CONCERNS (80/100)
**Deployment Recommendation**: CONDITIONAL

## Review Methodology

Re-review scope: unscoped (prior gate failed on security) — full `origin/develop...HEAD` diff, 1551 patch lines. One read-only Explore reviewer with the safety re-probe directive; it returned in 34 s (measured, `duration_ms`). The reviewer ran GNU xargs only; BSD xargs was not run.

CI: not read against a matching head (the PR head is `91e2da1d`; the later commits are local and unpushed), so nothing is mapped.

## Re-Review Context

| Finding | Status |
| --- | --- |
| T268-QA-6 (zsh does not split a multi-path slot) | ✅ FIXED — mutation-proven by the unquoted-expansion mutant |
| T268-QA-7 (single-path cases only) | ✅ FIXED — blank, two-path refused, two-path clean added |

## New Findings This Cycle

- **[medium]** `skills/qa-fix/SKILL.md:853` — pathspec magic and globs are interpreted, so the guard can read clean with untracked files present → `--literal-pathspecs` (T268-QA-8).
- **[medium]** `skills/qa-fix/SKILL.md:854` — a nonexistent path lists nothing and reads as clean → refuse a missing path (T268-QA-9).

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 14 (0 escaped), from `task.268.qa.4.security.run.json`
- The probe has no magic-pathspec or nonexistent-path case.

### Reliability — CONCERNS
### Performance — PASS
### Maintainability — PASS

## Code Review

**Correctness bugs (3):**
- [medium/high] `skills/qa-fix/SKILL.md:853` — pathspec magic passes through → promoted as T268-QA-8.
- [medium/high] `skills/qa-fix/SKILL.md:854` — nonexistent path reads clean → promoted as T268-QA-9.
- [low/high] `skills/qa-fix/SKILL.md:853` — xargs treats quotes and backslashes specially; GNU xargs on empty input runs once with no paths (the blank check already precedes it) → advisory.

**Cleanups (2):**
- `tests/qa-fix-step4-guard.test.js:144` — the zsh-only mutant is caught only where zsh is installed → advisory.
- `skills/qa-fix/SKILL.md:848` — two checks share one HALT string → advisory.

## Test Artifacts

### Test Commands Executed
```bash
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file .claude/state/t268-cases4.json --repo-root . --record task.268.qa.4.security.run.json --json
zsh -c 'cd $(mktemp -d) && git init -q && mkdir d && touch d/a && printf "%s\n" "nosuchdir" | xargs git ls-files --others --exclude-standard --'
```

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` on T268-QA-8 and T268-QA-9, then cycle 5 (the last gate in the budget).
