# QA Report: Task 148 - qa-fix and the QA loop: offer a structural move before another prose patch

**Task**: [task.148.structural-move-before-prose-patch.md](./task.148.structural-move-before-prose-patch.md)
**Gate File**: [task.148.gate.3.structural-move-before-prose-patch.yml](./task.148.gate.3.structural-move-before-prose-patch.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: PASS

---

## Re-Review Context

| Previous finding (gate 2) | Status | Evidence |
| --- | --- | --- |
| TASK-148-QA2-CR-1: probe trigger narrower than population | FIXED | Trigger names the population command as the one definition; a test extracts the command's globs and checks the trigger names each. Mutation: narrowing the trigger turns the test red |
| QA2 CR-2 (advisory, reproduced): population depends on cwd | FIXED | `:(top,glob)` + `--full-name`; the fixture test runs from the root and from a subdirectory. Mutations: dropping `top` turns it red, dropping `--full-name` turns it red |
| QA2 CR-4 (advisory, reproduced): an unbound input reads as a verdict | FIXED | The engine returns `cycle-missing` (row 16); the snippet maps could-not-look reasons to `SIGNAL=error`. Both are mutation-proved |
| QA2 CR-3, CR-5, CR-6, CR-9 | FIXED | Covered by tests |
| QA2 CR-7, CR-8 (low/low) | DEFERRED | No instance exists today; recorded in bug 3 |

---

## Executive Summary

Cycle 3 reviewed the files changed since gate 2. The gate-2 finding and both reproduced reliability
findings are fixed and mutation-proved. The review raised no high-confidence bug, so `top_issues` is
empty and the gate is PASS. Its six advisory findings are recorded below and in the gate's
`recommendations.future`. CR-1 carries the most weight of the six.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED (the next step is the 5c PR review)

---

## Testing Scope

### Review Methodology

Direct tools, plus one code-review subagent. Cycle 3: the diff is scoped to the files changed since
gate 2.

```
Re-review scope: since 2026-09-25T21:04:07Z (default)
```

16 files, a 2731-line patch. Non-empty scope, checked.

**Step 4b:** unchanged. The new blocks are refused fail-closed and executed by the tests: the offer
snippet runs under bash and zsh, and the population command runs from two different cwds.

---

## New Findings This Cycle

- **[medium/medium]** `skills/qa-fix/SKILL.md:700`: "a population of 0 means the probe did not run … never record 0" is false in two cases. One is a fix that removes or renames the phrase in the edited file. The other is an edited file that is new and untracked, because `git grep` reads tracked files only. → Require the edited file in the result, or search the pre-edit phrase; allow a recorded 0 with its reason. *Advisory.*
- **[low/medium]** `skills/qa-fix/SKILL.md:903`: the escaping rule omits backslash, so a pasted population command loses its line-continuation backslashes. *Advisory.*
- **[low/medium]** loop doc `:888`: the Diminishing-returns table still names Loop Setup as the resolver of `$LATEST_GATE`. *Advisory.*
- **[cleanup]** `tests/qa-fix-structural-move.test.js:248`: the trigger-equals-population test is one-directional.
- **[cleanup]** `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs:227`: the test title reads as enforcement, but the test checks only that the rule is stated.
- **[cleanup]** loop doc `:935`: two alternatives share one log line, and the mapped reason is not printed.

---

## Success Criteria Verification

All criteria PASS as written; one is N/A (post-merge). The cycle 1 and 2 fixes strengthened criteria
4, 6 and 7 and weakened none.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0 in the gate (1 advisory), LOW: 5 advisory

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
Gate-2 CONCERNS resolved: "could not look" now reports as such.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0. `boundary: false`, reason unchanged.
### Maintainability — PASS

---

## Code Review

Cycle 3, scoped diff. `code_review_blocking=true`. No finding is both `bug` and `high`-confidence,
so none is promoted. Provenance: every finding sits in code this branch added.

mutation-proven (cycle 2 fixes): 7 mutations recorded in bug 3 and the implementation report → each red on a named test → covered

---

## Regression Testing

121/121. `ci:fast` at the cycle-2 fix commit: 4152/0.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100 (formula: no FAIL and no CONCERNS axis; advisory findings do not count)
**Deployment Recommendation**: APPROVED

**Next Steps**: 5c `/review-pr`. Advisory CR-1 should be fixed in a follow-up, or by whichever cycle
next touches Step 3.5.
