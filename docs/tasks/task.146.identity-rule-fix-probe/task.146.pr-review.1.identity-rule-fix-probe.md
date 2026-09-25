# PR Review Report: PR #488 — feat(task.146): qa-fix — a fix to an identity rule proves both directions

**Reviewed:** 2026-09-25
**PR:** [#488](https://github.com/Gamaroff/agent-skills/pull/488) — `feature/task.146.identity-rule-fix-probe` → `develop` (OPEN)
**Work item:** [`task.146.identity-rule-fix-probe.md`](./task.146.identity-rule-fix-probe.md) — resolved via `branch-stem`
**Tracker:** [#474](https://github.com/Gamaroff/agent-skills/issues/474) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `git diff origin/develop...origin/feature/task.146.identity-rule-fix-probe`, 2147 lines. The six
bundled `skills/*/references/code-review-prompt.md` copies are excluded as generated. Their source,
`shared/resources/code-review-prompt.md`, is in the diff. The commit message names them only as a
bundle refresh, not as authored changes. Effort: medium. Invoked by `/develop-task` Step 5c.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.146.implementation.1.identity-rule-fix-probe-initial-run.md` |
| Review report | ✅ | `task.146.review.1.identity-rule-fix-probe.md` |
| QA reports | 4 | `task.146.qa.{1,2,3,4}.identity-rule-fix-probe.md` |
| Gate | PASS | `task.146.gate.4.identity-rule-fix-probe.yml` (100) |
| DoD | ❌ | not yet — Step 7 `/finalise` runs after this review |
| Sprint review | ❌ | not yet — written by `/finalise` |
| Open bugs | 4 | `task.146.bug.{1,2,3,4}.*.md` at `Ready for QA` (PC-1) |
| Handover | ❌ | none (no deferred tracker actions) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| qa-fix Step 3.5 carries the identity-rule table, trigger, real-call-site rule, obs #169 | `skills/qa-fix/SKILL.md` Step 3.5; test "qa-fix Step 3.5 probes both directions" | ✅ met |
| Both REFUTE PASS blocks carry the paragraph outside the list, byte-identical | `skills/qa-{task,story}/SKILL.md`; tests "byte for byte", "sits outside" | ✅ met |
| The test fails on drift, removal, the entry moving into the list, or a table row removed | `tests/identity-rule-probe.test.js`. Mutation-proved across cycles 1–4 | ⚠️ partial. An indented continuation of the Reconnect bullet is not caught (CR-1, low) |
| < 1s, no network | ~0.2s, file reads only | ✅ met |
| Every new assertion mutation-proved | implementation report, qa.1–qa.4 | ✅ met (CR-2 notes one redundant assertion) |
| ci:fast, format:check, bundle --check clean | 4011/0 on f86387a3 | ✅ met |
| CHANGELOG cites (task 146) | `CHANGELOG.md` [Unreleased] › Changed | ✅ met |
| The implementation report records the worked application | Step 3 table, historical keys at `5f553950` / `ef1ed9d6` | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.146.identity-rule-fix-probe/task.146.bug.{1,2,3,4}.*.md — **Status**: ✅ Ready for QA
  All four co-located bug reports are still at Ready for QA, though QA re-proved each fix and gate.4 is PASS; QA verification moves a bug from Ready for QA to Closed.
  → Close bugs 1–4, each with a QA-verification note citing the re-proof, before /finalise runs.

[PC-2] consistency · low · confidence: low — task.146.identity-rule-fix-probe.md frontmatter (no pr_number)
  The frontmatter has no pr_number field; /finalise normally writes it, so this may simply mean Step 7 has not run yet.
  → Confirm that /finalise writes pr_number: 488, or add it.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — tests/identity-rule-probe.test.js:83
  The "sits outside the four-transition list" test cannot catch the Identity rules text written as an indented continuation of the Reconnect bullet: the item count stays 4 and the ordering and presence regexes still match.
  → Also assert the Identity rules line shares the intro line's indentation and is preceded by a blank line; prove it by indenting the paragraph under Reconnect.

[CR-2] cleanup · low · confidence: high — tests/identity-rule-probe.test.js:115
  The final doesNotMatch(/^\s*• Identity rules/m) can never fail on its own: such a bullet is already counted by ITEM, so the earlier count assertion fails first.
  → Remove it, or replace it with the CR-1 indentation check.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.146.identity-rule-fix-probe/task.146.bug.{1,2,3,4}.*.md — **Status**: ✅ Ready for QA"
    finding: "All four co-located bug reports are still at Ready for QA, though QA re-proved each fix and gate.4 is PASS."
    suggested_action: "Close bugs 1–4, each with a QA-verification note citing the re-proof, before /finalise runs."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "task.146.identity-rule-fix-probe.md frontmatter (no pr_number)"
    finding: "The frontmatter has no pr_number field; /finalise normally writes it."
    suggested_action: "Confirm that /finalise writes pr_number: 488, or add it."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "tests/identity-rule-probe.test.js:83"
    finding: "The sits-outside test cannot catch the Identity rules text written as an indented continuation of the Reconnect bullet."
    suggested_action: "Assert the Identity rules line shares the intro line's indentation and follows a blank line; prove it by indenting the paragraph under Reconnect."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "tests/identity-rule-probe.test.js:115"
    finding: "The final doesNotMatch(/^\\s*• Identity rules/m) is redundant with the item count."
    suggested_action: "Remove it, or replace it with the CR-1 indentation check."
truncated_count: 0
```

## Recommended Actions

1. PC-1: close bugs 1–4 with a QA-verification note before `/finalise`. They were re-proved in qa.2–qa.4.
2. CR-1 and CR-2 (low): harden the placement test against an indented continuation, and drop the redundant assertion. This is a follow-up, not a blocker.
3. PC-2 (low): confirm that `/finalise` writes `pr_number: 488`.
