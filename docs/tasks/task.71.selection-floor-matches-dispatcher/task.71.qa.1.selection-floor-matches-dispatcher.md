# QA Report: Task 71 - Make the selection floor equal what the dispatching pipeline accepts

**Task**: [task.71.selection-floor-matches-dispatcher.md](./task.71.selection-floor-matches-dispatcher.md)
**Gate File**: [task.71.gate.1.selection-floor-matches-dispatcher.yml](./task.71.gate.1.selection-floor-matches-dispatcher.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-31
**Gate Status**: CONCERNS
**PR**: [#286](https://github.com/Gamaroff/agent-skills/pull/286)

---

## Executive Summary

The change is small, correct and unusually well-evidenced: one `Set` literal widens, and the assertion that guards it is strengthened from a one-directional `⊆` to a two-way equality parsed from the dispatcher's own status table. All 11 success criteria are met, all 4 phases verified, 1999 tests pass, and all three planned mutation proofs were executed and reverted — one of which killed three tests where two were predicted, which is a sign the fixtures are load-bearing rather than decorative.

One MEDIUM defect blocks a clean PASS: twelve `//` comment lines in the test file carry literal `⊆` / `—` escape sequences instead of the characters they denote, including the H1 section header a future author lands on first.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-71-QA1-01 before merge

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (11/11 sections)
- [x] All 4 implementation phases completed, 0 unchecked boxes
- [x] Tests passing
- [x] Breaking changes documented with rationale
- [x] Code on feature branch with open PR (#286, OPEN, MERGEABLE)

### Review Methodology

**Direct tools.** Adaptive Review Strategy: 4 phases (< 5), single module (`skills/develop-next` + its eval dir), `risk_level: medium`. Not lite mode. Pre-built traceability matrix supplied by the orchestrator (`.summaries/qa-traceability-matrix.md`), 10 criteria mapped, 0 uncovered.

Fresh review — no prior gate file, so Phase 0 re-review logic did not apply.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Widen the floor | PASS | Verified | Constant is exactly `{draft, planned, ready-for-development, in-progress}`. Both rationale blocks rewritten. The `--lint` message needed no edit — it interpolates `ELIGIBLE_FOR`, verified live against the real registry as `(draft, planned, ready-for-development, in-progress)` |
| Phase 2: Equality test | PASS | Verified | `16/H1` two-way via `assert.deepEqual` on `{onlyInFloor, onlyInDispatcher}`; `15/SC5` inverted; both vacuity guards preserved verbatim |
| Phase 3: Bug axis | PASS | Verified | `BUG_ELIGIBLE_STATUSES` untouched; bug half of `16/H1` still `⊆` and passing; measured gap recorded in 3 places |
| Phase 4: Prose and changelog | PASS | Verified | 4 sites in `roadmap-selection.md`, 2 in `select-next.mjs`, 2 in `CHANGELOG.md` (one more than the plan enumerated) |

**Overall Phase Completion**: 4/4 passed

### Independent verification of the central claim

QA did not take the test's own parser on trust. The dispatcher's table was re-parsed with an independent reimplementation of `proceedStatuses()`:

```
sawRow = true
develop-task PROCEED set = draft, planned, ready-for-development, in-progress
```

This equals `TASK_ELIGIBLE_STATUSES` exactly, and `sawRow = true` rules out the vacuous-empty-parse failure the task's §10 Risk 3 names as the principal hazard.

**Blast radius checked**: `TASK_ELIGIBLE_STATUSES` has exactly two readers — `ELIGIBLE_FOR` in `select-next.mjs` and the test file. No other skill, script or eval imports it, so the change cannot leak into `--batch` (which is registry-free) or any other consumer.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `draft` task appears in frontier | eligible | eligible | PASS |
| `planned` task appears | eligible | eligible | PASS |
| `ready-for-review` / `accepted` / `cancelled` excluded | excluded | excluded | PASS |
| Draft dispatched and promoted by Step 2 | both ends asserted | selector via sweep + fixture; dispatcher via parsed table | PASS |
| Roadmap precedence unchanged | unchanged | strong form — loader never called | PASS |

### Structural

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Floor asserted **equal**, parsed from dispatcher's table | `===` | `===`, source is git-tracked `shared/resources/` | PASS |
| Over-widening fails, not only under-widening | fails | mutation-proved with `accepted` | PASS |
| Bug axis checked, left alone if no gap | checked | gap found (`in-progress`, `ready-for-qa`), left open with rationale | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Test suite | 0 failures | 1999 tests, 1998 pass, 0 fail, 1 skipped (pre-existing) | PASS |
| Formatting | Prettier clean | all 4 changed files clean | PASS |
| Bundle drift | none | `npm run bundle` produced no changes; `roadmap-selection.md` confirmed not a bundled copy | PASS |
| Comment/doc accuracy | correct prose | **12 lines render as literal escape sequences** | **CONCERNS** |

---

## Breaking Changes Validation

### Breaking Change: unattended loops will now select `draft` and `planned` tasks

- **Documented**: Yes — task §5, CHANGELOG `[Unreleased] → Changed`, PR description
- **Migration Path Provided**: Yes — none needed (no API or schema change); rollback is one line, in task §11
- **Migration Tested**: Yes — rollback path is the mutation-1 proof, which was executed and reverted
- **Consumer Code Updated**: N/A — no consumer outside this repo reads the constant

**Assessment**: PASS. The behavioural change is stated plainly rather than buried, including the cost it imposes (a stub task can consume one pipeline run), and the trade is argued rather than asserted.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: Literal escape sequences in test-file comments**

- **ID**: TASK-71-QA1-01
- **Severity**: MEDIUM
- **Category**: Maintainability
- **Bug Report**: [task.71.bug.1.literal-unicode-escapes-in-comments.md](./task.71.bug.1.literal-unicode-escapes-in-comments.md)
- **Observation**: Lines 1818, 1823, 1826, 1828, 1829, 1831, 1833, 1901, 1913, 1916, 1939, 1947 of `evals/develop-next/unit/select-next.test.mjs` contain the literal six-character sequence `⊆` (and `—`, `→`) inside `//` comments, where JavaScript performs no escape processing. Authoring artefact: `\u` escapes written in a non-raw Python heredoc.
- **Impact**: No runtime impact — verified precisely rather than assumed. The three occurrences at lines 1929/1932/1934 sit inside a **template literal**, where `→` *is* a valid escape; those render correctly, as the mutation-2 failure output confirmed by printing a real `→`. Only the comment occurrences are inert. The cost is to readability, and it lands on the H1 section header — the first explanation a future author reads — in a change whose own Success Criterion D1 is that the rationale reads correctly.
- **Recommendation**: Replace with the real characters in the twelve comment lines; optionally normalise the three template-literal occurrences for consistency.
- **Priority**: P2

### LOW Severity Issues (1)

- `assert.deepEqual` at `select-next.test.mjs:1923` could be `assert.deepStrictEqual`. Behaviour is identical today (both sides are arrays of strings), but strict is the documented recommendation and removes a loose-equality footgun if the compared shape ever changes. Non-blocking.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Set membership against 4 elements instead of 2. Selection short-circuits at the first eligible row, so a wider floor can only *reduce* the number of documents read before a hit, never increase it. `--lint` (which evaluates every row) is unaffected in complexity.

### Reliability — PASS
The excluded set is still exactly what `develop-task` HALTs on, so the "loop stops and cannot self-recover" failure mode task.65 identified remains prevented — this is the property the widening could plausibly have broken, and it is asserted from the dispatcher's own table rather than restated. Roadmap precedence is unchanged and asserted in its strong form (`calls.n === 0` — the loader is never called, not merely ignored). Rollback is one line.

### Security — PASS
No credential, network, filesystem-write or user-input surface is touched. No new dependencies. The change is one `Set` literal plus comments, tests and documentation.

### Maintainability — CONCERNS
The rationale prose is genuinely good: the reversed decision is quoted and answered rather than deleted, the bug-axis divergence is measured and recorded in three places, and the vacuity guards carry a comment explaining why `===` makes them *more* load-bearing than `⊆` did. Against that, twelve comment lines render as literal escape sequences. Sole reason the gate is not PASS.

---

## Code Review

**Correctness bugs (0):** none identified.

`code_review_blocking=true` was in effect for this run, so any `category: bug` + `confidence: high` finding would have been promoted to `top_issues`. There were none — the diff is one `Set` literal, comment prose, and test edits with no new control flow.

**Cleanups (2):**
- `evals/develop-next/unit/select-next.test.mjs:1818+` — literal `⊆`/`—` escapes in comments → replace with real characters. *Raised separately as MEDIUM TASK-71-QA1-01: it is a documentation defect rather than a diff-correctness bug, so it enters the gate through the QA severity rules, not the code-review promotion path.*
- `evals/develop-next/unit/select-next.test.mjs:1923` — `assert.deepEqual` → `assert.deepStrictEqual`. Advisory.

### Mutation-Proof Spot Check (Step 3c)

All three of the task's planned mutations were executed against the real suite during development and reverted; QA confirmed each result and that `git status` shows the probed file restored.

| Mutation | Predicted | Observed | `mutation-proven` |
|---|---|---|---|
| Remove `draft` from the floor | 2 tests red | **3 red** — `16/H1`, `15/SC5` sweep, synthetic-registry test | yes |
| Add `accepted` to the floor | equality red | red, `only in floor: accepted` | yes |
| Dispatcher's own table HALTs on `Draft` | equality red | red, divergence on the floor side | yes |

The third is the one worth naming: it proves the test re-reads the **real** dispatcher document rather than a restatement, and that it reads the git-tracked `shared/resources/` source rather than the gitignored `.agents/skills/` symlink — the local-passes/CI-fails shape this repo has been bitten by before.

**Not mutation-proven**: nothing. Every invariant added this cycle was reverted and confirmed red.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite (`npm test`) | PASS — 1999 tests, 0 failures |
| `develop-next` unit suite | PASS — 123 tests |
| Real-registry parse (`17/N1`) | PASS — no spurious malformed rows after the T71 row edit |
| `--lint` against the live registry | PASS — T67 still selected; exclusion reasons now name the widened floor |
| Bundle drift (`npm run bundle`) | PASS — no files changed |
| Other consumers of the constants | PASS — none exist outside `select-next.mjs` and its test |

One pre-existing skipped test, unrelated and unchanged by this work.

---

## Test Artifacts

### Test Commands Executed

```bash
npm test                                            # 1999 tests, 1998 pass, 0 fail, 1 skip
node --test 'evals/develop-next/unit/*.test.mjs'    # 123 tests
node skills/develop-next/scripts/select-next.mjs --lint
npx prettier --check <4 changed files>
npm run bundle                                      # drift check
```

---

## Recommendations

### Immediate Actions (Blocking)
1. **TASK-71-QA1-01** — replace the literal escape sequences with real characters in the twelve comment lines of `select-next.test.mjs`.

### Short-term Actions (Non-Blocking)
1. `assert.deepEqual` → `assert.deepStrictEqual` at `select-next.test.mjs:1923`.
2. The bug-axis divergence (`in-progress`, `ready-for-qa`) stays open by decision — file a task if closing it is ever wanted.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The substance of the change is correct, complete and better-evidenced than most — independently re-verified, fully mutation-proved, zero uncovered success criteria, no correctness bugs. One MEDIUM maintainability defect (garbled comment characters, including the section header) is the only thing standing between this and a PASS, and it is text-only to fix.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Fix TASK-71-QA1-01 before merge.

**Next Steps**: `/qa-fix` on the gate file, then re-review.

---

## Bug Resolution Summary — QA Cycle 2 (re-review, 2026-08-31)

**Scope**: quick verification. The fix diff is comments, three template-literal character
normalisations and one assertion identifier — no logic change — which is the "trivial fix / assertion
update" case, so gate 1 was updated in place rather than a gate 2 being issued.

### TASK-71-QA1-01 — VERIFIED FIXED

| Check | Result |
|---|---|
| `grep -c '\u[0-9a-f]{4}'` over the file | **0** — no literal escape remains |
| H1 section header (line 1818) | renders `⊆`, correctly |
| Full suite | 1999 tests, 1998 pass, 0 fail |
| `prettier --check` | clean |

**One correction to the cycle-1 finding, recorded rather than quietly absorbed**: the gate said
*twelve* occurrences. There were **eighteen** — the cycle-1 count was of affected *lines*, and several
lines carried two sequences. The developer counted before editing and reported the discrepancy rather
than silently fixing more than the gate asked for. The gate entry has been amended.

### LOW recommendation — APPLIED

`assert.deepEqual` → `assert.deepStrictEqual`. The gate listed this under `future` (non-blocking);
applying it in the same pass was reasonable, being a one-token change to the same assertion.

**This is the only change in the cycle with semantic weight, and it was not accepted on a green suite
alone.** `deepStrictEqual` guards this task's central invariant, so mutation 2 (adding `accepted` to
the floor) was re-applied after the swap. The guard still failed correctly:

```
✖ 16/H1: the task eligibility floor EQUALS what develop-task proceeds on
    only in floor:      accepted
        → the frontier would nominate work the dispatcher refuses; an
```

That single check does double duty — it proves the stricter assertion still fires, **and** it proves
the character replacement did not damage the failure message, which is the one place these characters
have observable behaviour. Source restored and confirmed clean afterwards.

### Adversarial pass over the fix itself

Considered and found not applicable: the change touches no emission, subscription, caching or
lifecycle path — it is a text substitution plus an assertion-helper swap, with no transition states to
probe. The one semantic surface (the assertion) was mutation-proved directly, above.

### Revised Assessment

**Gate Status**: PASS (was CONCERNS)
**Quality Score**: 98/100 (was 90)
**Deployment Recommendation**: APPROVED
**Bugs**: 1 fixed, 0 remaining
**Open items**: none blocking. The bug-axis divergence (`in-progress`, `ready-for-qa`) remains
deliberately open by decision, recorded in three places, and is not a defect of this task.
