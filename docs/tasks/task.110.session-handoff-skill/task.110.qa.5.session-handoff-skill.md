# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.5.session-handoff-skill.yml](./task.110.gate.5.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15 (cycle 5 — the last in budget)
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-4 fixes verified. The narrowed review of the cycle-4 commit found one regression *introduced by that commit*: the global `PATTERN_FLAGS` exemption (added so `--test-name-pattern=/x/i` is not refused) also covers `--reporter`/`--reporters`/`--format`/`--formatter`, which under mocha/jest/eslint/stylelint name a JS module to load — `npx mocha --reporter=/tmp/evil.js` is allowed again. MEDIUM by the gate-3 reasoning; a one-line per-spec fix. No HIGH in three consecutive gates; every enumeration and the corpus clean on this build.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL (CR-1)

## Re-Review Context

**Re-review scope: since gate 4 (default)** — gate 4 was `CONCERNS`/`measured`, no HIGH: non-trigger. Diff: the cycle-4 commit (266 lines). Reviewer: Explore subagent, 1m44s, 8 probes.

| Cycle-4 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 ls-remote leading slash | FIXED | `//evil.example/x`, `/tmp/x` refused (tests); anchor absorbed by POS.PATHS |
| CR-2 cap keeps the head | FIXED | `truncated` → `unverifiable` (test asserts the verdict; mutation-proved) |
| CR-3 regex values refused | FIXED — **with a regression** (this cycle's CR-1) | `--test-name-pattern=/x/i` allowed (test) |
| CR-4 / CR-5 cleanups | FIXED | `setEncoding`; one `flagTokenOk` helper |

## New Findings This Cycle

- **[medium]** `handoff-verify.mjs:171` — `PATTERN_FLAGS` exempts module-loading flags: `npx mocha --reporter=/tmp/evil.js`, `npx jest --reporters=/tmp/evil.js`, `npx eslint --format=/tmp/evil.js` allowed (reproduced) → CR-1
- **[low]** runner JSDoc omits `truncated` → CR-2; cap wording is code units, anchor comment over-claims → CR-3

## Verification

Skill suite 28/28; `TMPDIR=/tmp` 28/28; three enumerations + 73 corpus → 0 hostile; live handoff 18 confirmed · 0 stale · 2 timeouts; no orphans.

## NFR Assessment

Performance PASS · Reliability PASS · Security CONCERNS (measured, 243; CR-1 regression) · Maintainability PASS.

## Code Review

Reviewer subagent (narrowed, 1m44s): 1 bug (high/high as reported; QA rates it MEDIUM for consistency with PRB-6 — identical preconditions — and says so), 3 cleanups. Promoted: CR-1 (medium), CR-2/3 (low). Mutation proofs from cycle 4 — **dev-only** as far as this report re-ran them.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 80/100
**Next Steps**: `/qa-fix` on gate 5 (cycle 5 of 5). This is the last cycle the budget allows; a further review is outside the loop's budget and is the operator's call.
