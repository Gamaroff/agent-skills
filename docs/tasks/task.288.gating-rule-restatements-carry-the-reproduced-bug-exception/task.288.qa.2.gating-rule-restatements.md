# QA Report: Task 288 - Gating-rule restatements carry the reproduced-bug exception

**Task**: [Link to task document](./task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md)
**Gate File**: [task.288.gate.2.gating-rule-restatements.yml](./task.288.gate.2.gating-rule-restatements.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-23
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 is a refute pass over the whole branch diff. Cycle 1's fix (key D) holds: the four report-template lines are now keyed. The refute reviewer found two medium defects in the guard test, both mine to fix before merge.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

## Review Methodology

Direct tools plus one read-only Explore reviewer (dispatched and returned within one 64 s run, `duration_ms` 63990). Route: Diff review: code review. Re-review scope: unscoped, whole branch diff (cycle 2 refute pass, `origin/develop...HEAD`, docs and generated `references/` copies excluded). Step 4b: not applicable beyond the files already executed in cycle 1; no fenced bash block changed since. CI_SUMMARY: not re-read this cycle; the full gate ran on the LAN server at 8745 pass, 0 fail.

## Re-Review Context

| Cycle 1 item | Status |
| --- | --- |
| T288-CR-1 (template lines unkeyed) | FIXED: key D, 7 of 7 tests, mutation-proved red |
| CR-2 (docs-only exemption reason) | NOT FIXED: re-found at high confidence, now T288-C2-1 |
| CR-3, CR-4 | open, advisory |

## New Findings This Cycle

- **[medium]** `evals/shared/tests/gating-rule-restatements.test.mjs` T273-CR-6 assertion checks zero sentences (T288-C2-2).
- **[low]** per-file floors missing (C2-3, advisory).

## Code Review

**Correctness bugs (3):**
- [medium/high] `shared/resources/qa-docs-only-review-prompt.md:59` — the sentence "it will not gate" is exempted on a reason the file's own line 25 contradicts (caller's gate mapping and the reproduction rule apply as written) → reword to "on the reviewer claim alone" and drop the exemption. Gate entry T288-C2-1.
- [medium/high] `evals/shared/tests/gating-rule-restatements.test.mjs:295` — the assertion filters on the flag pattern and "advisory unless"; zero sentences match → test every "advisory unless" sentence for the run-level marker and assert at least one is checked. Gate entry T288-C2-2. Reviewer's `line_text` was HTML-escaped (`&amp;&amp;`); the anchor is the `FLAG.test(k.sentence) &&` line.
- [low/medium] same file, line 286 — counts sentences not lines; per-file minimums wanted. Advisory (C2-3).

**Reproduction (T288-C2-2):** a scratch copy of the test printed the count of sentences matching both patterns: `PROBE_COUNT=0`. Control: not measured separately; the reviewer counted six "advisory unless" sentences in the keyed population, and the key-D test from cycle 1 already asserts at least four. The scratch copy was deleted; `git status` shows no stray file.

**T288-C2-1** was verified by reading, not execution: line 25 of the exempted file says the reproduction rule "all apply as written".

**Cleanups (0).**

mutation-proven: drop the 5d clause from the qa-task template line → the key-D test went red (done in the qa-fix cycle, recorded in commit 1d86a09c2, not re-run this cycle) → dev-only.

## Success Criteria

Unchanged from cycle 1: all met, evidence in [qa.1](./task.288.qa.1.gating-rule-restatements.md). Criteria drift: clean.

## NFR Assessment

Security PASS (reasoned, no boundary). Performance PASS. Reliability PASS. Maintainability CONCERNS (T288-C2-1, T288-C2-2).

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL on T288-C2-1 and T288-C2-2 being fixed.

**Test Commands Executed**
```bash
command node --test evals/shared/tests/zz-probe288.test.mjs   # scratch probe, PROBE_COUNT=0, file deleted
```
