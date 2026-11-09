# QA Report: Task 289 - QA snippet runner allows flags, not just commands

**Task**: [Link to task document](./task.289.qa-snippet-runner-flag-level-allow-list.md)
**Gate File**: [task.289.gate.6.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.6.qa-snippet-runner-flag-level-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: WAIVED (owner)

---

## Executive Summary

Cycle 6 re-probed the newest code (`closingParen` and the masked reading) with about 1000 differential inputs, 39 of them judged runnable and run under real bash. The cycle 5 fix held. The reviewer found one reproduced write and one crash, both in older code and both identical on `develop`. On its findings the gate is FAIL; the owner accepted the branch as a strict improvement over `develop` and filed both findings as task.290, so the gate is recorded as waived by the owner.

**Overall Assessment**: WAIVED by the owner (findings: 1 high, 1 medium, both pre-existing)
**Deployment Recommendation**: READY, with task.290 filed

---

## Testing Scope

- Direct tools plus one read-only Explore reviewer with the SAFETY RE-PROBE directive.
- Re-review scope: unscoped (the prior gate failed on security); the whole `origin/develop...HEAD` diff of the shared sources.
- CI on the head: not read this cycle.

### Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T289-CR5-1 a quoted paren inside a substitution | FIXED | `X=$(echo ")") touch out` and four variants refused; 18 further hostile spellings classified as expected |

---

## Issues Found

### HIGH (1)

**T289-CR6-1: a `#` after an escaped space is read as a comment**
- **Observation**: `echo a\ # ; touch out` classifies runnable; under real bash it created `out`. `echo $(echo a\ #) ; touch out`, a newline and `)` does the same.
- **Control**: `echo a # ; touch out` is a real comment and correctly stays runnable.
- **Provenance**: identical on `develop` (QA ran both engines). Not caused by this diff and not covered by any claim in cycles 1 to 5.

### MEDIUM (1)

**T289-CR6-2: deep nesting throws**
- `echo ` + `"$(` x20000 + `")` x20000 throws `RangeError` out of `closingParen`. Identical on `develop`. Control: depth 1000 returns `mutating`.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 0. Both are filed as task.290.

---

## NFR Assessment

- **Security**: CONCERNS. Probe: 31 executed, 0 reproduced, 0 escaped (`task.289.qa.6.security.run.json`).
- **Performance**: PASS. No new resource finding; timing not re-measured against `develop`.
- **Reliability**: CONCERNS. The deep-nesting exception (task.290).
- **Maintainability**: PASS.

---

## Final Assessment

**Gate Status**: WAIVED by the owner (the findings are as above and are not cleared)
**Quality Score**: 82/100
**Deployment Recommendation**: READY

**Next Steps**: merge task.289; develop task.290.
