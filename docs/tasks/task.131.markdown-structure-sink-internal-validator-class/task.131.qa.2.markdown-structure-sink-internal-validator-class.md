# QA Report: Task 131 - A markdown-structure sink and an internal-artefact decision for the security probe (cycle 2)

**Task**: [Link to task document](./task.131.markdown-structure-sink-internal-validator-class.md)
**Gate File**: [task.131.gate.2.markdown-structure-sink-internal-validator-class.yml](./task.131.gate.2.markdown-structure-sink-internal-validator-class.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Cycle 1 severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-131-CR-1: probe example unbound variables | medium | FIXED | The example now uses `<placeholder>` operands. Its substituted form was executed this cycle and returned `engages` 15/15. |
| TASK-131-QA-1: internal without reason not enforced | medium | FIXED (residual → QA-4) | Named FAIL check added in the prompt. Step 3c forces `SEC_OVERALL`. The empty-string split is now tracked as QA-4. |
| TASK-131-CR-4: vacuous enumeration half | low | FIXED | Compound literal, qa-task/qa-story keyed, floor 4. Mutation-proven in cycle 1. |

## Review Methodology

Direct tools plus one independent Explore reviewer. **Cycle 2 is a mandatory refute pass**: the whole branch diff against `origin/develop` (2,712 lines, bundled copies excluded), reviewed to find the false claim, starting from cycle 1's fixes (`cbddca41`).

Re-review scope: unscoped (cycle 2 refute pass; the prior gate's security axis was PASS/measured, so `SAFETY_REPROBE` did not fire).

Step 4b: re-run over the three files cycle 1 changed. Results are unchanged: `no-executable-blocks` ×2, and the pre-existing `zero-blocks-executed` in finalise `SKILL.md`, whose fences the diff did not touch.

---

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:508`: the `internal` precondition ("no sink fits") is never enforced. Any non-empty reason passes, even the schema placeholder, so `lintReport` could be recorded `internal` and skip the zero-guard. [bug 3](./task.131.bug.3.internal-precondition-not-enforced.md)
- **[medium]** `skills/finalise/assets/bug-dod-template.md:63`: the bug-mode DoD template has no `internal` shape, and the enumeration test cannot see the file. [bug 4](./task.131.bug.4.bug-dod-template-lacks-internal.md)
- **[medium]** `shared/resources/security-review-prompt.md:78`: `/review-security`'s sink table lacks `markdown-structure` and routes "no sink fits" to `unverifiable` with no `--args-json`. [bug 5](./task.131.bug.5.review-security-sink-table.md)
- **[low]** `skills/finalise/SKILL.md:508/589`: Step 3c ("no reason") and Step 3d ("absent or empty") disagree on an empty reason.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Sink returns both directions; each hostile trips its code(s) | PASS | unchanged |
| lintReport probe engages; fixtures scored correctly | PASS | 15/15 this cycle, record `task.131.qa.2.security.run.json` |
| `internal` renders a skip with its reason; without a reason it is a FAIL | CONCERNS | enforced for "no reason" (QA-1 fixed); empty reason and the precondition are not (QA-4, BUG-3) |
| Probe < 10 s | PASS | 1.6 s |
| `boundary` consumers enumerated and updated | CONCERNS | bug-mode template and `/review-security` missed (BUG-4, BUG-5) |

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 15
- The `lintReport` boundary still engages. BUG-3 is a gap in enforcing the process rule (whether the agent may skip a probe). It is not an input the control accepts wrongly, so it stays a medium finding in `top_issues` rather than an NFR FAIL.

### Performance / Reliability / Maintainability — PASS
No regression. `validate` passes for finalise.

---

## Code Review

Refute reviewer (independent Explore subagent). `code_review_blocking=true`.

boundary: true — `report-lint.js#lintReport`, probed. `probes_executed: 15` (from the run record's `totals.executed`).

**Correctness bugs (5):**
- [medium/high] `skills/finalise/SKILL.md:508`: internal precondition unenforced → **promoted as TASK-131-CR-2-1**.
- [medium/medium] `skills/finalise/assets/bug-dod-template.md:63`: verified → raised as **TASK-131-QA-2**.
- [medium/medium] `shared/resources/security-review-prompt.md:78`: verified → raised as **TASK-131-QA-3**.
- [low/medium] `skills/finalise/SKILL.md:508`: empty-reason split, verified → raised as **TASK-131-QA-4**.
- [low/low] `shared/resources/security-probe.mjs:1802`: `args` is not in the control key → `recommendations.future`.

**Cleanups (2):** `security-probe.mjs:286` wording versus behaviour of the `ok` rule; the duplicated "Document sinks." paragraph in `security-input-corpus.md`. Both go to `recommendations.future`.

The reviewer also executed the prompt's `node --print` recipe and it works.

---

## Regression Testing

`npm run ci:fast` on `cbddca41`: 4,593 tests, 0 failures (5b gate this cycle).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 70/100
**Deployment Recommendation**: CONDITIONAL. Fix TASK-131-BUG-3, BUG-4 and BUG-5 (QA-4 alongside).
**Next Steps**: `/qa-fix` on gate 2.
