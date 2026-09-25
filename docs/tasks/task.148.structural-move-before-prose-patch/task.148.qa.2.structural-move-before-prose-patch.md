# QA Report: Task 148 - qa-fix and the QA loop: offer a structural move before another prose patch

**Task**: [task.148.structural-move-before-prose-patch.md](./task.148.structural-move-before-prose-patch.md)
**Gate File**: [task.148.gate.2.structural-move-before-prose-patch.yml](./task.148.gate.2.structural-move-before-prose-patch.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding (gate 1) | Status | Evidence |
| --- | --- | --- |
| TASK-148-CR-1: the population misses hand-authored references | FIXED | The population now includes them and drops generated copies by marker. The fixture repo counts 4. Mutation: dropping the glob, or the marker filter, turns the test red |
| TASK-148-CR-2: the offer snippet is silent on bad input | FIXED | A blank or malformed sequence gives `high-counts-missing`, and no engine gives `SIGNAL=error`. Both are mutation-proved |
| CR-3 to CR-7 (advisory) | FIXED | All taken in cycle 1, each covered by a test |

---

## Executive Summary

Cycle 2 was a refute pass over the whole branch diff. Both gate-1 findings are fixed. The review
found one new high-confidence MEDIUM, and it is a direct consequence of the cycle 1 fix: the
documentation probe's trigger sentence was not widened alongside its population. Two more MEDIUMs
were returned at medium confidence. QA reproduced both, and they stay advisory under the gate rule.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, plus one code-review subagent in **refute mode** (cycle 2, exactly one prior gate). The
whole branch diff was reviewed: 3890 lines, 36 files. `SAFETY_REPROBE=false`: gate 1's security axis
was `PASS reasoned`.

```
Re-review scope: unscoped (cycle 2 refute pass — whole branch diff)
```

**Step 4b:** unchanged from cycle 1. The two new blocks are refused fail-closed (`node`, and
`git grep` plus process substitution). The tests execute them instead. The offer snippet now runs
under bash **and** zsh in `qa-narrowing-offer-wiring.test.mjs`.

---

## New Findings This Cycle

- **[medium]** `skills/qa-fix/SKILL.md:671` — the documentation-probe trigger names only `SKILL.md` and `shared/resources/*.md`, while the population also covers hand-authored references. A fix to such a reference skips the probe. → Widen the trigger and hold the two sets equal. **Promoted (TASK-148-QA2-CR-1).**
- **[medium, reproduced by QA]** `skills/qa-fix/SKILL.md:691` — the population pathspecs are cwd-relative. Run from `skills/qa-fix`: 0 hits; run from the repo root: 5 (phrase `who restores`). A non-repo cwd is also silent. "Could not look" reads as `Population: 0`. → Use `:(top,glob)`, and treat a population below 1 as a failed probe.
- **[medium, reproduced by QA]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:904` — an unbound `$CYCLE` gives `Number("")` = 0, which reads as `below-cycle-floor`, the same as a real cycle 1. `SIGNAL=error` fires only on empty output. → Give non-integer input its own reason, and map could-not-look reasons to `error`.
- **[medium/medium]** loop doc `:914` — the offer runs on a 5c REQUEST CHANGES re-entry to 5b, where only the review's findings are the work. → Gate-driven entry only.
- **[low]** loop doc `:876` — the prose says 5a binds `$CYCLE`, `$HIGH_SEQUENCE_JSON` and `$LATEST_GATE`. It does not; Loop Setup and the Diminishing-returns table do.
- **[low]** qa-fix `:893` — the Step 7 slot has no escaping rule for pasting `Probe:` blocks into a double-quoted string.
- **[low/low]** engine `:971` — a `file:` carrying a `:line` suffix splits one file into two. The gate schema forbids the suffix, but task.104's gates carry it.
- **[low/low]** qa-fix `:693` — the marker is matched anywhere, not only at the header position. No such file exists today.
- **[cleanup]** `tests/qa-fix-structural-move.test.js:19` — the header still says three files count, and a comment sits above the wrong entry.

---

## Success Criteria Verification

Unchanged from cycle 1: every criterion PASS as written, and one N/A (post-merge). The cycle 1 fixes
extend criteria 6 and 7 (population and `Probe:`) without regressing any criterion.

---

## Issues Found

### MEDIUM Severity Issues (1 promoted)

**Issue: the probe trigger is narrower than the population (TASK-148-QA2-CR-1)**
- **Bug Report**: [task.148.bug.3.probe-trigger-narrower-than-population.md](./task.148.bug.3.probe-trigger-narrower-than-population.md)
- **Recommendation**: widen the trigger; one test holds trigger set = population set.

**Total Issues**: HIGH: 0, MEDIUM: 1 promoted (+ 3 advisory), LOW: 5 advisory

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
Advisory CR-2 and CR-4 are "could not look" states that report as verdicts. Both were reproduced.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — `boundary: false`, reason unchanged from cycle 1.
### Maintainability — PASS

---

## Code Review

Cycle 2 refute pass, whole branch diff. `code_review_blocking=true`. One finding is `bug`+`high` and
is promoted (TASK-148-QA2-CR-1). Provenance (5b): all findings sit in code this branch added; none
is pre-existing.

mutation-proven (cycle 1 fixes, re-read this cycle): 8 mutations recorded in the implementation report → each a named test red → covered

---

## Regression Testing

115/115 across the engine, route table, wiring, qa-fix and identity-rule-probe suites. At the fix
commit, `ci:fast` gave 4146/0.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL. **Conditions**: TASK-148-QA2-CR-1 fixed.

**Next Steps**: `/qa-fix` against gate 2. The reproduced advisory CR-2 and CR-4 are recommended in
the same cycle.
