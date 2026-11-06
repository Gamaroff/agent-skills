# QA Report: Task 265 - Skill prose follows the file-write rules

**Task**: [task document](./task.265.skill-prose-follows-the-file-write-rules.md)
**Gate File**: [task.265.gate.1.skill-prose-follows-the-file-write-rules.yml](./task.265.gate.1.skill-prose-follows-the-file-write-rules.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-06
**Gate Status**: CONCERNS

---

## Executive Summary

The change set matches the plan: one rule document, six citations and recipes, a corrected mutation recipe, and a mutation-proved ratchet test. `ci:fast` is green (7944 tests, 0 failed). Five medium findings are open, none blocking a merge on its own, but each is an unmet success criterion or a bundling gap.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, standard mode (no parallel agents). **Independent diff review did not run**: no Explore subagent was dispatched this cycle, so the Step 3b code review was done inline by the same session that wrote the change; the independence loss is recorded here. Cycle 2 is the refute pass.

CI on 3af53dea: pending (shellcheck, test, validate running); link-check, secret-scan and branch-policy pass.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1: State the rule once | PASS | `shared/resources/file-write-rules.md`; cited from step 3 and step 5-6 docs |
| 2: Mutation revert recipe | PASS | `grep -n "Python" shared/resources/mutation-proving.md` returns nothing; citations in qa-task, qa-fix, develop-task |
| 3: Gate write and fresh-body post | CONCERNS | qa-task, qa-story, qa-fix done; other `--body-file` sites not cited or excluded (T265-QA-2) |
| 4: Ratchet | PASS | 5 tests; count 32; mutation-proved |
| 5: Bundle and sweep | CONCERNS | `bundle --check` clean, but see T265-QA-3 |

**Overall Phase Completion**: 5/5 built, 2 with findings.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Rule stated once, cited from inline section, QA loop and mutation recipe | PASS | `grep -c file-write-rules.md` returns 1 in each of the three sources |
| `mutation-proving.md` names no interpreter edit | PASS | `grep -n Python` returns nothing |
| qa-task Step 10 and qa-story state the write method; qa-fix Step 7 has the assertion | PASS | edits in those files |
| `npm test` wall time within 10% of develop | UNVERIFIED | not measured (T265-QA-4) |
| Ratchet red on an added heredoc, green at the committed count | PASS | mutation-proven: added `cat > MUTATION.md <<EOF` to `file-write-rules.md` -> `payload-heredoc-ratchet.test.mjs` 2 tests red -> covered; reverted, 5 pass |
| bundle --check 0 problems; npm test passes | PASS | 129 skills, 0 problems; ci:fast 7944 tests, 0 fail |
| quick_validate passes for each edited skill | PASS | qa-fix, qa-task, qa-story, develop-task |
| Follow-up task for the 32 sites filed and named | FAIL | not filed (T265-QA-1) |
| One-line note on the split in the task registry Notes | PASS | registry line 388 |

---

## Issues Found

### MEDIUM Severity Issues (5)

- **T265-QA-1** follow-up migration task not filed (`docs/tasks/task-registry.md`).
- **T265-QA-2** rule not cited at the other `--body-file` posting sites, and none named in or out of scope (`skills/qa-fix/SKILL.md`).
- **T265-QA-3** four skills' bundled `mutation-proving.md` cite `file-write-rules.md`, which their `references/` does not carry (`shared/resources/mutation-proving.md`).
- **T265-QA-4** wall-time criterion unmeasured.
- **T265-QA-5** no `[Unreleased]` CHANGELOG entry citing task 265 (`changelog-cites.sh task.265` -> `missing (task 265)`).

**Total Issues**: HIGH: 0, MEDIUM: 5, LOW: 0

---

## NFR Assessment

- Performance: CONCERNS (T265-QA-4)
- Reliability: PASS
- Security: PASS (evidence: reasoned; `boundary: false`, nothing accepts or rejects input)
- Maintainability: PASS

---

## Code Review

Inline review, no independent reviewer (see Review Methodology). No correctness bugs found. Two notes:

- `skills/qa-fix/SKILL.md` freshness block greps a literal `{sha}` placeholder that the agent substitutes; unsubstituted it would search for the text `{sha}` and fail closed. Acceptable.
- The ratchet allowlist counts duplicate lines per file; it fails on both a rise and a fall, as designed.

Boundary: false. Candidates considered: `payloadHeredocLines` (counts lines, accepts or rejects nothing) and `diffAgainstAllowlist` (reports differences).

---

## Test Commands Executed

```bash
CI=true command npm run ci:fast
command npm run bundle -- --check
CI=true command node --test shared/resources/tests/payload-heredoc-ratchet.test.mjs
python3 skills/create-skill/scripts/quick_validate.py skills/qa-fix
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL (close the five medium findings)
