# QA Report: Task 289 - QA snippet runner allows flags, not just commands

**Task**: [Link to task document](./task.289.qa-snippet-runner-flag-level-allow-list.md)
**Gate File**: [task.289.gate.4.qa-snippet-runner-flag-level-allow-list.yml](./task.289.gate.4.qa-snippet-runner-flag-level-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 4 re-probed the whole surface with a differential harness: 12,797 generated blocks classified, the 1,945 that came back runnable executed under real bash. The cycle 3 fixes held. Two bypasses remain, both where a substitution cuts a governed command's arguments before the flag table reads them. QA reproduced both under real bash.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

- Direct tools plus one read-only Explore reviewer with the SAFETY RE-PROBE directive.
- Re-review scope: unscoped (prior gate failed on security); the whole `origin/develop...HEAD` diff of the shared sources (1670 patch lines). Bundled copies under `skills/*/references` were left out; `bundle:check` holds them identical.
- Diff review: code review.
- Step 4b: not run separately; the probe executes the classifier directly.
- CI on the head: not read this cycle (the fix commit was pushed minutes earlier).

### Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T289-CR3-1 `${1}` and `${!X}` not expansions | FIXED | differential run found no `${…}` form that reaches a flag |
| T289-CR3-2 brace operands of `uniq` | FIXED | `uniq {in,out}` and `uniq *.txt` refused |

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:1469`: a process substitution cuts a governed command's arguments and `substitutionAfterWord` excludes it → T289-CR4-1.
- **[high]** `shared/resources/qa-execute-snippets.mjs:3139`: a prefix assignment holding a substitution cuts the arguments, and `substitutionAfterWord` scans only after the word → T289-CR4-2.
- **[low]** `diff` and `tail` skip every expansion check by design; no write path beyond the two above. Recorded as a note for the entries' `why` text.

---

## Issues Found

### HIGH Severity Issues (2)

**T289-CR4-1: a process substitution hides what follows it**
- **Observation**: `uniq <(echo a) out.txt` and `sort <(echo a) -oout` classify runnable; QA ran both and each wrote its file.
- **Control**: `uniq in.txt`, `sort -u <(echo a) <(echo b)` and `diff <(ls a) <(ls b)` stay runnable; the plain `uniq in.txt out.txt` and `sort -oout in.txt` are refused.

**T289-CR4-2: a prefix assignment hides what follows it**
- **Observation**: `X=$(echo a) uniq in.txt out.txt` and `X=$(echo a) sort -oout in.txt` classify runnable; QA ran both and each wrote its file.
- **Control**: `X=$(echo a) uniq in.txt` stays runnable.

**Recommendation for both**: the heuristic that guesses where a substitution may stand is the struck mechanism. Replace it with a masked reading: swap each substitution for a one-word placeholder, then judge every governed command in the masked text.

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (`security-probe.mjs --sink shell-exec`, 0 reproduced, 0 escaped; record `task.289.qa.4.security.run.json`)
- Fourth gate with a high finding on `qa-execute-snippets.mjs`; gates 2, 3 and 4 are consecutive. The struck mechanism is the substitution handling (`substitutionAfterWord`), not the expansion reading replaced in cycle 3.

### Performance — PASS
No exception or slowdown at 1 MB lines and 100k nesting.

### Reliability — PASS
Fails closed on inputs the reviewer could not get read.

### Maintainability — PASS
The expansion guard is now one rule with a population test.

---

## Code Review

Reviewer-reported correctness bugs (2) promoted to the gate and reproduced by QA: `qa-execute-snippets.mjs:1469` (T289-CR4-1) and `qa-execute-snippets.mjs:3139` (T289-CR4-2). Low-confidence note (1): `expansionOk` on `diff` and `tail` (`qa-execute-snippets.mjs:930`), advisory.

Provenance (5b): both are in scope and neither exists on develop's engine in the same form (the flag table is this task's).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced high findings, each a write through an input the classifier calls read-only.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` cycle 4 under the third-strike rule (replace the substitution mechanism), then the fifth and last gate.
