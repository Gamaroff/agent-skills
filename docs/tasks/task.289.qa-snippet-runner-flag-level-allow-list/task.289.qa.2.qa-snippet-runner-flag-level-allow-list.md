# QA Report: Task 289 - QA snippet runner allows flags, not just commands

**Task**: [Link to task document](./task.289.qa-snippet-runner-flag-level-allow-list.md)
**Gate File**: [task.289.gate.2.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.2.qa-snippet-runner-flag-level-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 is a full refute pass over the whole branch diff, with the safety re-probe because gate 1 failed on security. Both cycle 1 fixes hold. The reviewer ran about 500 inputs and found two new bypasses of the flag table. QA reproduced both by execution and each passed its control.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

- Direct tools plus one read-only Explore reviewer (refute pass and safety re-probe directives, both appended).
- Re-review scope: unscoped (prior gate failed on security); the whole `origin/develop...HEAD` diff. The reviewer read the shared sources (`shared/resources`, `CHANGELOG.md`; 1445 patch lines) and left out the bundled copies under `skills/*/references`, which `bundle:check` holds identical.
- Diff review: code review.
- Step 4b: not run as a separate pass; the engine under review is the Step 4b classifier, and the probe below executes it directly.
- CI on the head: not read this cycle (the fix commit was pushed minutes earlier and CI had not completed); no CI finding.

### Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T289-CR-1 sed label followed by a command | FIXED | `sed ':a e echo PWNED' f` refused; control `sed ':a;N;$!ba;s/\n/ /g' f` runnable. |
| T289-CR-2 ANSI-C quoted flag | FIXED | `sed $'#c\\\ne …'` and `sort $'-o' out in` refused. |

Mutation proof this cycle: `mutation-proven: removed the label separator check (sedScan, `return false` after a label) → task.289 sedScriptVerdict test went red (1 of 260) → covered`.

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:1400` — a sed `#` comment ends at a backslash-newline in the scanner but at the first newline in GNU sed, so `sed '#c\<newline>e echo PWNED' f` is runnable and runs `e` → scan a comment to the first newline (T289-CR2-1).
- **[high]** `shared/resources/qa-execute-snippets.mjs:3046` — `$(` becomes a segment break, so a governed command's args are cut before `flagViolation`; `sort -$(echo o) out in` is runnable and writes `out` → refuse or keep the full argument text (T289-CR2-2).

---

## Issues Found

### HIGH Severity Issues (2)

**T289-CR2-1: a sed comment hides a command**
- **Observation**: `sed '#c\<newline>e echo PWNED' f` classifies runnable. QA ran it under GNU sed 4.10: it printed PWNED. `sed '#c\<newline>w out' f` is runnable too.
- **Control**: `sed '#c<newline>w out' f` (no backslash) is refused with `flag-not-allowed: sed script …`; `sed '# a comment' f` stays runnable.
- **Impact**: a doc block can run a program or write a file while the runner calls it read-only. This is the boundary the task exists to close.
- **Recommendation**: give `#` its own scan to the first newline.

**T289-CR2-2: a command substitution splits the arguments before the flag check**
- **Observation**: `sort -$(echo o) out in` classifies runnable. QA ran it: the file `out` was created. `sort $(echo -o) out in`, `uniq in $(echo out)`, `tail $(echo -f) x` and `date $(echo -s) now` are runnable too.
- **Control**: `sort -u f` and `sort f | uniq` stay runnable; `grep -c x $(ls)` is already refused.
- **Impact**: any flag the table forbids can be spelled through a substitution.
- **Recommendation**: refuse a governed command whose argument text holds `$(` or a backtick, or keep the full text through the split.

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (`security-probe.mjs --sink shell-exec`, 0 reproduced, 0 escaped; record `task.289.qa.2.security.run.json`)
- Both findings sit outside the corpus: the corpus does not model the sed comment scan or the substitution split. Two defects of the same class (the scanner reads a construct differently from the tool) surfaced in each of two cycles, so cycle 3 should enumerate that class rather than patch these two.

### Performance — PASS
Cycle 1 measured parity with develop; no scan loop changed. Not re-measured.

### Reliability — PASS
Unknown flags, entry-less commands and unreadable sed scripts fail closed.

### Maintainability — PASS
`SAFE_FLAGS` is data beside `SAFE_COMMANDS` with an audit test.

---

## Code Review

Reviewer-reported correctness bugs (2), both promoted to the gate (blocking resolved true by the pipeline override, and both reproduced by QA):

- [high/high] `shared/resources/qa-execute-snippets.mjs:1400` — sed `#` comment continuation → T289-CR2-1
- [high/high] `shared/resources/qa-execute-snippets.mjs:3046` — `$(` splits arguments before `flagViolation` → T289-CR2-2

Cleanups (0). Anchors checked by line: both lines hold the quoted text.

Provenance (5b): both are in scope (the task closes flag-level write gaps in `sed` and `sort`/`uniq`/`tail`/`date`) and the task's own table is what mishandles them, so neither is `pre-existing`.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs   # 260 of 260
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --record …   # executed 31, escaped 0
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced high findings, each a write or execute through an input the classifier calls read-only.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` cycle 2, then re-review (cycle 3 is scoped to the fix, with the safety re-probe on because security failed).
