# QA Report: Task 80 — Cycle 3

**Task**: [task.80.security-probe-engine.md](./task.80.security-probe-engine.md)
**Gate File**: [task.80.gate.3.security-probe-engine.yml](./task.80.gate.3.security-probe-engine.yml)
**Previous Gate**: [gate.2](./task.80.gate.2.security-probe-engine.yml) — CONCERNS, 80/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**PR**: [#337](https://github.com/Gamaroff/agent-skills/pull/337) — OPEN · fix commit `acee9cd7`
**Gate Status**: **PASS**

---

## Executive Summary

Both cycle-2 findings are fixed, and **both halves of each were checked** — the half that could have been faked as easily as fixed:

- The timeout fallback handles nine bad programmatic values without crashing, **and** a legitimately tight value still bites (`timeoutMs: 1` → `executed 0, declined 1`). A fallback that swallowed every input would have passed the first check alone.
- The module move left **no stale reference anywhere** — not in code, not as a markdown link a link-checker would follow, not in any bundled `references/` copy.

**No new findings.** All seven §9 safety criteria hold, `npm run bundle` is a clean no-op, and 276/276 targeted tests pass.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Gate-2 finding | Status | Verification |
| --- | --- | --- |
| **TASK80-005** timeout validated at the CLI only | **FIXED** | `readInt(timeoutMs, 1)` now runs where `perCaseTimeout` resolves. Nine bad values — `NaN`, `0`, `-1`, `1.5`, `"abc"`, `null`, `undefined`, `{}`, `"0x10"` — all handled with the verdict preserved and no throw. **And the other half**: `timeoutMs: 1` produces `executed 0, declined 1`, so a good value is genuinely honoured rather than universally discarded. |
| **TASK80-006** production module importing from `tests/` | **FIXED** | `spawn-budget.mjs` now at `shared/resources/`. Zero stale `tests/spawn-budget` references in code; the single remaining mention is a comment in `tests/bundle-mjs.test.js` describing the history, which is correct. All three `test-harness-concurrency.test.js` references moved (`BUDGET_MODULE` + two dynamic imports) and the target resolves (5365 bytes), so its budget assertions read a real module rather than passing on a missing file. |
| **TASK80-006, class fix** | **FIXED** | `dst.parent.mkdir(parents=True, exist_ok=True)` sits at `bundle_skill.py:207`, correctly **before** the unchanged-content short-circuit at `:208` — placing it after would have skipped directory creation on the idempotent path. Guarded by a new nested-sibling regression in `tests/bundle-mjs.test.js`. |
| `escapes` advisory | **DECIDED** | Not a defect; the per-(case, path) shape was kept and the reasoning recorded at the accumulation site. Reviewed and agreed: a probe escaping on one input and one escaping on all twelve are different findings, and a path set renders them identically. |

---

## New Findings This Cycle

**None.**

Searched narrowed (`Re-review scope: since 2026-09-07T10:05:00Z`), which is commit `acee9cd7` — 16 files. The narrowing is correct here rather than a shortcut: cycle 2 was the unscoped refute pass over the whole branch diff, so the original change has already been re-read with what cycle 1 learned. What this cycle owed was the blast radius of a **move**, and that is exactly what was searched:

- Every `tests/spawn-budget` reference across `*.mjs`, `*.js` and `*.py` — none remain in code.
- Markdown **links** (not prose mentions) to the old path — none, so the link checker cannot go red on it. The historical `docs/bugs/bug.2.*` and roadmap mentions are inline code in prose, which is correct: they are describing what happened at the time.
- Bundled `skills/*/references/` copies carrying a stale path — none.
- Whether the module's new home changes what gets bundled — it does not. No skill references `spawn-budget.mjs` or `security-probe.mjs`, so neither is bundled anywhere and `npm run bundle` reports **0 files bundled**.
- The bundler fix's placement relative to the idempotency short-circuit — correct.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Extract the containment | **PASS** | 98/98. Untouched this cycle beyond the `spawn-budget` import path. |
| Phase 2: The probe runner | **PASS** | Both cycle-2 findings lived here and both are closed. Timeout validation is now at the boundary the consumer crosses. |
| Phase 3: Verdicts | **PASS** | Untouched across all three cycles; re-verified. |
| Phase 4: Tests and mutation proofs | **PASS** | 22 tests (18 → 21 → 22). Every fix across all three cycles has a guarding test, and each was proved by faithful reversion. |

**Overall**: 4/4, none with concerns.

---

## Code Review

**Step 3b — narrowed diff** (`PRIOR_GATES=2`, `SAFETY_REPROBE=false`, `REFUTE_PASS=false`). Scope: files changed since gate 2.

**Correctness bugs (0).**

**Cleanups (0)** worth raising. One observation, recorded but not raised as a finding: `runProbeSpec` falls back to the budget on an unparseable `timeoutMs` rather than reporting it, so a caller computing a timeout from broken config gets a working probe instead of a loud failure. This was **decided deliberately** in cycle 2 and the reasoning is recorded at the code — the function's contract is that it returns a verdict, and making it throw would rank an out-of-range timeout above an unimportable entry point. Re-opening a documented decision without new evidence would be second-guessing, not review. It is carried into `recommendations.future` so a later consumer can revisit it with real usage.

### Step 3c — Mutation-Proof Spot Check

Both cycle-2 fixes proved by faithful reversion, run independently of the fix summary:

| Reverted behaviour | Tests red | `mutation-proven` |
| --- | --- | --- |
| `readInt(timeoutMs, 1)` → `timeoutMs ??` | 1 (with the original `RangeError`) | **yes** |
| `dst.parent.mkdir(...)` removed | 1 (the new bundler test) | **yes** |

---

## Success Criteria Verification

All seven §9 safety criteria hold. The table below is the state at cycle 3; the axis has strengthened at each cycle rather than merely holding.

| Criterion | Cycle 1 | Cycle 2 | Cycle 3 |
| --- | --- | --- | --- |
| No interpreter on `SAFE_COMMANDS` | PASS | PASS | **PASS** |
| Out-of-root rejected before import | PASS | PASS | **PASS** |
| Inputs never reach a shell | PASS | PASS | **PASS** |
| Zero cases → `unverifiable`, exit 1 | PASS | PASS | **PASS** |
| `declined` its own state | PASS | PASS | **PASS** |
| Timeout from the shared budget | PASS *(CLI caveat)* | PASS *(API caveat)* | **PASS — no caveat** |
| Extraction behaviour-preserving | PASS | PASS | **PASS** |

---

## Regression Testing

| Suite | Result |
| --- | --- |
| `security-probe.test.mjs` | 22/22 |
| `qa-execute-snippets.test.mjs` | 98/98 |
| `access-config-parity.test.mjs` | ✅ |
| `jira-interception.test.mjs` | ✅ |
| `stdout-drain-on-exit.test.mjs` | 10/10 |
| `bundle-mjs.test.js` | 10/10 |
| `test-harness-concurrency.test.js` | 16/16 |
| `qa-re-review-scope-parity.test.mjs` | ✅ |
| **Targeted total** | **276/276** |
| Full `npm run ci:fast` | **2570 tests, 0 failures** |
| `npm run bundle` | **0 files bundled — clean no-op** |

The four suites whose imports the move touched are all green, which is the direct evidence that seven edited import sites resolve.

---

## Review Methodology

Direct tools. **Re-review scope: since 2026-09-07T10:05:00Z (default)** — the narrowed cycle-3 scope, correct because cycle 2 already ran the unscoped refute pass over the whole branch.

**Step 4b: not applicable** — no runnable prose in the change set.

---

## Final Assessment

**Gate Status**: **PASS**
**Quality Score**: 100/100 *(60 → 80 → 100)*

**Rationale**: Every finding raised across three cycles is closed and independently verified — six in total, none carried, none waived. Both cycle-2 fixes were checked on the half that could have been faked as easily as fixed, and both were mutation-proved by faithful reversion. No new findings from a scope deliberately aimed at the one thing this cycle owed: the blast radius of a module move.

**Deployment Recommendation**: APPROVED — no conditions.

Three items are carried to `recommendations.future`, none blocking: the unlinked tracker issue (consent-gated throughout), the proximity limit of the exit-after-write guard (not this task's defect), and the deliberate silent fallback on an unparseable `timeoutMs` (documented, revisit with real usage).

---

**Next Steps**: Step 5c `/review-pr` — the loop's exit gate.
