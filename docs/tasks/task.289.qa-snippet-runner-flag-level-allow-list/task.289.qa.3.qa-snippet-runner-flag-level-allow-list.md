# QA Report: Task 289 - QA snippet runner allows flags, not just commands

**Task**: [Link to task document](./task.289.qa-snippet-runner-flag-level-allow-list.md)
**Gate File**: [task.289.gate.3.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.3.qa-snippet-runner-flag-level-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3 re-probed the whole surface because gate 2 failed on security. The four earlier bypasses hold, the reviewer found no sed-scanner bypass in about 5,000 scripts run under real GNU sed, and no input made the classifier throw or slow down. It did find two shell-expansion bypasses, and QA reproduced both under real bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

- Direct tools plus one read-only Explore reviewer with the SAFETY RE-PROBE directive. The refute directive is cycle 2 only.
- Re-review scope: unscoped (prior gate failed on security); the whole `origin/develop...HEAD` diff of the shared sources (1581 patch lines). Bundled copies under `skills/*/references` were left out; `bundle:check` holds them identical.
- Diff review: code review.
- Step 4b: not run separately; the probe below executes the classifier directly.
- CI on the head: not read this cycle (the fix commit was pushed minutes earlier).

### Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T289-CR2-1 sed comment hides a command | FIXED | the reviewer's 5k-script differential against real sed found no comment bypass |
| T289-CR2-2 substitution splits the arguments | FIXED | `sort -$(echo o) out in` refused; `date -d "@$(stat …)"` stays runnable |

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:1194`: `${1}` and `${!X}` are not read as expansions, so a flag set by `set --` or an indirect variable reaches `sort` unseen → T289-CR3-1.
- **[high]** `shared/resources/qa-execute-snippets.mjs:1598`: the brace check ignores operands a brace adds, so `uniq {in,out}` writes `out` → T289-CR3-2.

---

## Issues Found

### HIGH Severity Issues (2)

**T289-CR3-1: `${1}` and `${!X}` are not read as expansions**
- **Observation**: `set -- -o; sort ${1} out in` and `X=Y; Y=--output=out; sort ${!X} in` classify runnable. QA ran the first under real bash: `out` was created.
- **Control**: `sort -n in` stays runnable; `sort $1 out in` and `sort $X out in` are refused.
- **Recommendation**: replace the per-spelling reading with one shape rule (an unquoted `$`, backtick, brace or glob where a flag may stand is refused).

**T289-CR3-2: a brace adds operands to uniq**
- **Observation**: `uniq {in,out}` and `uniq in{,.out}` classify runnable. QA ran the first: `out` was created.
- **Control**: `uniq in` stays runnable and `uniq in out` is refused by `maxOperands`.
- **Recommendation**: refuse a brace expansion or glob in an operand of a command with `maxOperands`.

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (`security-probe.mjs --sink shell-exec`, 0 reproduced, 0 escaped; record `task.289.qa.3.security.run.json`)
- This is the third consecutive gate with a high finding on `qa-execute-snippets.mjs`. The third-strike rule applies: the next fix replaces the per-spelling expansion reading instead of patching another spelling. Struck mechanism: the enumeration of shell expansion spellings inside `shellWord` and the brace check.

### Performance — PASS
Linear to 1 MB on the reviewer's scaling runs.

### Reliability — PASS
No exception on 150k random blocks.

### Maintainability — CONCERNS
The expansion guard is split between a deny-list regex (sed, find, rm, curl, gh, git, tee) and the flag table, so one spelling gets a different verdict per command.

---

## Code Review

Reviewer-reported correctness bugs (2), both promoted to the gate and both reproduced by QA:

- [high/high] `shared/resources/qa-execute-snippets.mjs:1194`: `${1}` and `${!X}` → T289-CR3-1
- [high/high] `shared/resources/qa-execute-snippets.mjs:1598`: brace operands for `uniq` → T289-CR3-2

Cleanups (1): a table-driven test that runs every `SAFE_FLAGS` entry through one shared list of expansion and brace forms (`qa-execute-snippets.mjs:1696`); this is the population check the two findings show is missing, and the fix cycle should add it.

Provenance (5b): both are in scope, since the task closes the flag-level write gaps for these commands.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced high findings, each a write through an input the classifier calls read-only.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` cycle 3 under the third-strike rule (replace, do not patch), then re-review.
