# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.4.session-handoff-skill.yml](./task.110.gate.4.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15 (cycle 4)
**Testing Completed**: 2026-09-15
**Gate Status**: CONCERNS

---

## Executive Summary

Narrowed re-review of the cycle-3 changes. PRB-6/7/8 verified closed; every enumeration and the corpus re-run clean against this build. The reviewer found three small defects *in the cycle-3 fixes themselves*: the ls-remote pattern still admits a leading slash (`//host` is a UNC network path on Windows), the output cap keeps the head of the stream while `npm test`'s summary is in the tail, and `valueOk` refuses legitimate regex values. Two MEDIUM, one LOW, no HIGH. The loop is converging (HIGH 3 → 7 → 0 → 0).

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL (CR-1, CR-2)

---

## Re-Review Context

**Re-review scope: since 2026-09-15T03:49:51Z (default)** — gate 3 was `CONCERNS`/`measured` with no HIGH: non-trigger. Diff: the two changed code files. Reviewer: Explore subagent, returned in 2m17s, 11 probes.

| Cycle-3 finding | Status | Evidence |
| --- | --- | --- |
| PRB-6 joined values unchecked | FIXED | `--config=../evil.js`, `/abs`, `--ignore-path=../x` refused (tests); mutation-proved (`covered`) |
| PRB-7 unbounded output | FIXED (partially — see CR-2) | capped at 16 MiB with a notice (test) |
| PRB-8 ls-remote URL / `eval:` | FIXED (partially — see CR-1) | `ssh://`, `https://` refused; `eval:` needs a name |

## New Findings This Cycle

- **[medium]** `handoff-verify.mjs:288` — ls-remote pattern permits a leading `/`; `//evil.example/x` (UNC on Windows) and `/tmp/x` accepted → CR-1
- **[medium]** `handoff-verify.mjs:1317` — cap keeps the head; figures are in the tail; `verify()` ignores the truncation flag → CR-2
- **[low]** `handoff-verify.mjs:563` — `valueOk` refuses `--test-name-pattern=/select/i`, `--grep=/foo` (false refusals) → CR-3
- Cleanups: `setEncoding('utf8')` before the data handlers (multi-byte chunk splits); one joined-flag helper for `checkArgs` and `interpreterRule.flagOk`

## Verification

Skill suite 28/28; `TMPDIR=/tmp` 28/28; three enumerations + 73 corpus → 0 hostile, 0 unexpected; live handoff 18 confirmed · 0 stale · 2 timeouts. Step 4b unchanged (obs #90).

## NFR Assessment

Performance PASS · Reliability CONCERNS (CR-2) · Security CONCERNS (measured, 243 probes; CR-1 residual) · Maintainability PASS.

## Code Review

Reviewer subagent (narrowed, 2m17s): 3 bugs, 2 cleanups. `code_review_blocking=true`: CR-3 (low/high) promoted; CR-1 and CR-2 (medium/medium) promoted on QA's own verification (both reproduced via `isAllowed` / by reading `take()`).

Mutation proof: PRB-6 re-run in cycle 3 (`covered`); not re-run this cycle — **dev-only** as far as this report re-ran it.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 70/100 (100 − 10 × 2 MEDIUM − 10 × 1 NFR CONCERNS)
**Next Steps**: `/qa-fix` on gate 4 (cycle 4 of 5); cycle 5 narrowed re-review. This is the last fix cycle the budget allows.
