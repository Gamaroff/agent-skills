# QA Report: Task 325 - The docs-only CI rule can exclude a path (cycle 3)

**Task**: [task.325.docs-only-rule-exclusions.md](./task.325.docs-only-rule-exclusions.md)
**Gate File**: [task.325.gate.3.docs-only-rule-exclusions.yml](./task.325.gate.3.docs-only-rule-exclusions.yml)
**Previous**: [task.325.qa.2.docs-only-rule-exclusions.md](./task.325.qa.2.docs-only-rule-exclusions.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fix closed the spellings that `normalisePath` rewrites (T325-CR-201, T325-CR-202 closed). The refute pass found the rest of the class: `isDocsPath` refuses other path forms before it matches, and an exclusion in one of those forms is still accepted and excludes nothing. That is T325-CR-301, medium, reproduced by execution. The mechanism has now drawn a medium on two consecutive gates: the exclusion check copies part of `isDocsPath`'s refusals by hand. The fix asks for one definition of those refusals rather than a further rule.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

Re-review: the previous gate was CONCERNS and code has moved since. Diff review was a full code review with a refute pass by one Explore subagent, which returned in about 87 s (`duration_ms` 87065). Criteria drift: `clean`. CHANGELOG: `cites (task 325)`.

CI on 1beeadf886ed: pending (5 pass, 1 pending)

Step 4b: not applicable. This cycle changed no `SKILL.md` and no `shared/resources/*.md`.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T325-CR-301: exclusions in a form `isDocsPath` refuses are still accepted**

I reproduced this by execution at 1beeadf88:

| Exclusion | File | `isDocsPath(file, ["**", X])` |
| --- | --- | --- |
| `!docs/generated/` | `docs/generated/a.md` | true (fails open) |
| `!docs//x.md` | `docs/x.md` | true (fails open) |
| `!docs/./x.md` | `docs/x.md` | true (fails open) |
| `!docs/generated/**` (control) | `docs/generated/a.md` | false |

`parseConfig` accepts each of the three failing spellings. The trailing-slash form is the one an owner used to `.gitignore` is likely to write.

### LOW Severity Issues (1)

**T325-CR-302**: `!!x.md` is refused as "can never match". In fact `isDocsPath("!x.md", ["**/*.md","!!x.md"])` is false, so the pattern does exclude a file literally named `!x.md`. The refusal is fail-closed, but it is wrong.

### Closed
T325-CR-201 and T325-CR-202, both fixed in 1beeadf88.

---

## NFR Assessment

- **Security**: PASS. Evidence: measured. Probes executed: 11, escaped: 0. Run record: `task.325.qa.3.docs-only-rule-exclusions.security.run.json`.
- **Reliability**: CONCERNS (T325-CR-301).
- **Maintainability**: CONCERNS. A hand copy of the refusals is the defect.
- **Performance**: PASS.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `ci-tree-equivalence.js:798`: a trailing-slash directory exclusion is accepted and matches nothing. QA reproduced it, so it is folded into T325-CR-301.
- [low/high] `ci-tree-equivalence.js:798`: `//`, `/./` and `/../` remainders are accepted. Same mechanism, so also folded into T325-CR-301.

**Cleanups (1):**
- [low/high] `ci-tree-equivalence.js:791`: the `!!` refusal blocks a valid exclusion. QA reproduced it as T325-CR-302.

**Boundary**: true. `probes_executed: 11`, `escaped: 0`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 88/100
**Conditions**: T325-CR-301 fixed by consolidating the path-form refusals.
**Next Steps**: run `/qa-fix` (cycle 3), then QA cycle 4.
