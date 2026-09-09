# QA Report: Task 99 - A diminishing-returns exit for the QA loop (cycle 2)

**Task**: [Link to task document](./task.99.qa-loop-diminishing-returns-exit.md)
**Gate File**: [task.99.gate.2.qa-loop-diminishing-returns-exit.yml](./task.99.gate.2.qa-loop-diminishing-returns-exit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Testing Completed**: 2026-09-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's three findings are all fixed, and the fix for the HIGH is genuinely good: it narrows rather
than removes, it is mutation-proved, and its regression test asserts both directions so that folding
the *glob* instead of the path would not pass either. The comment above it names a vacuity shape the
repository's own `mutation-proving.md` does not cover.

The mandatory cycle-2 **refute pass** then found what cycle 1's document-anchored reading did not, and
it is the more serious finding of the two cycles: **5c's own entry condition excludes the very gate
this exit hands it.** The section says it hands to 5c "exactly as a `PASS` gate does"; 5c says
"perform this step after a gate exits 5a with `PASS` or `WAIVED`". A gate taking this exit is by
construction `CONCERNS`. Two sections of one runnable document disagree about whether that gate may
reach 5c, so the deliverable's exit path is undefined in the document that defines it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle 1 finding | Severity | Status | Verification |
| :--- | :--- | :--- | :--- |
| TASK-99-001 — glob matching case-folds `file:` paths | HIGH | **FIXED** | `readTopIssues` returns `src/Components/Button/Button.spec.tsx` verbatim while `severity: MEDIUM` still folds to `medium`; the exit fires against glob `src/Components/**`. Mutation-proved: restoring the unconditional fold turns the new test red (33 → 32/1) |
| TASK-99-002 — `**Loop exit**` row instructed but undefined | MEDIUM | **FIXED (with a new defect)** | The row is now in the QA Cycle entry template with a note on who writes it. Its **default text** is wrong — see TASK-99-005 |
| TASK-99-003 — snippet's four inputs had no stated source | MEDIUM | **FIXED** | Binding table added above the snippet; each binding checked against the engine's actual behaviour for a missing input, and all four agree (missing ⇒ `continue`, never `exit`) |
| 3× LOW in `recommendations.future` | LOW | **NOT FIXED — correctly** | Deliberately deferred and carried forward to gate 2. Refining them would be the behaviour this task's own rule exists to stop |

**Re-review scope**: unscoped (cycle 2 — mandatory full refute pass over `origin/develop...HEAD`,
27 files). Not narrowed to files changed since gate 1, per the qa-task contract: a narrowed cycle-2
review reads only cycle 1's repairs and never re-reads the original change with what cycle 1 learned.

---

## New Findings This Cycle

- **[HIGH]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — 5c's entry condition
  contradicts the new exit → widen it to name both routes. **TASK-99-004.**
- **[MEDIUM]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the `**Loop exit**` default
  `n/a — loop continued` is false on a cycle that exited via a clean `PASS` gate → `n/a — this exit
  not taken`. **TASK-99-005.**
- **[MEDIUM]** `CHANGELOG.md` + task document — "32 tests" is now 33, in three current-state claims.
  **TASK-99-006.**

The refute pass was searched as instructed — starting from cycle 1's fixes, on the grounds that a fix
is new code and the least-reviewed code in the change set. It found one defect *introduced by* a
cycle-1 fix (TASK-99-005, in the row that fix added) and one that both cycles had walked past
(TASK-99-004). That distribution is the argument for the refute pass: the second finding is in the
**original** change, which a re-review narrowed to "files changed since the last gate" would not have
re-read at all.

---

## What the refute pass probed, and what held

The four lifecycle transitions the contract names — bulk teardown, in-flight input, error path,
reconnect — **do not apply**: the engine is a pure function with no lifecycle, no subscription and no
cache. Reporting them as "passed" would be theatre. The pass instead enumerated the **claims** the
change set makes and tried to refute each:

| Claim | Verdict |
| :--- | :--- |
| "The exit hands to 5c, not straight to Step 7" | **FALSE as documented** — 5c refuses the gate it is handed. TASK-99-004 |
| "`**Loop exit**` lets a reader tell this exit from a stall" | **Partly false** — its default writes an untrue statement on the ordinary-exit cycle. TASK-99-005 |
| "32 tests" | **FALSE** — 33. TASK-99-006 |
| "An unconfigured consumer never exits" | Held — asserted for `[]`, `undefined` and `null` |
| "HIGH is an input, not re-derived" | Held — the verdict follows supplied counts that contradict the gate's contents, in both directions |
| "A gate with no findings does not take this exit" | Held — `no-residue`, distinct from `gate-unreadable` |
| "The Convergence check is byte-unchanged" | Held — re-verified after the cycle-1 fixes: 5624 bytes both sides |
| "The module never throws" | Held — eight malformed inputs, none throws, none returns `exit` |
| The **combination** of cycle 1's three fixes | Held — the code fix and the two prose fixes do not interact; the binding table's claims were checked against the engine's actual behaviour rather than against the section's prose |

---

## Implementation Verification

| Phase | Status | Notes |
| :--- | :--- | :--- |
| Phase 1 — the rule (prose section) | FAIL | TASK-99-004: the exit's destination is documented in terms 5c rejects |
| Phase 2 — the config key | PASS | Unchanged since cycle 1 |
| Phase 3 — the surrounding prose | CONCERNS | TASK-99-005 |
| Phase 4 — the engine and its tests | PASS | Cycle 1's HIGH closed and mutation-proved; 33/33 |
| Phase 5 — `npm run bundle` | PASS | Both copies re-synced after the cycle-1 fixes |

---

## Success Criteria Verification

11 of 12 unchanged from cycle 1 and still met. **Criterion 11** — "the exit hands to 5c, not straight
to Step 7" — now reads **NOT MET**: the section says it, and 5c contradicts it, so what the pipeline
would actually do is undefined. Criterion 5 (anti-vacuity) is **strengthened** rather than merely
still-met: the suite now contains an input class it previously had no instance of.

---

## Issues Found

### HIGH Severity Issues (1)

**TASK-99-004 — 5c's entry condition excludes the gate this exit hands it**

- **Severity**: HIGH · **Category**: Functional (runnable prose)
- **Observation**: exit section — "hand to 5c, exactly as a `PASS` gate does". 5c — "Perform this step
  **after a gate exits 5a with `PASS` or `WAIVED`**". The exit's gate is `CONCERNS` by construction:
  condition 2's premise is a non-empty `top_issues[]`, and any MEDIUM makes the gate CONCERNS under
  the deterministic rules.
- **Impact**: the exit path is undefined. An orchestrator reading 5c refuses the handoff; one reading
  the exit section proceeds. This is the same class of defect the task's §3 table was written to
  prevent between the two guards — arrived at from the other direction.
- **Recommendation**: widen 5c's entry condition to name both routes. "A gate that routes to 5b never
  reaches it" stays true and should stay.
- **Priority**: P1

### MEDIUM Severity Issues (2)

**TASK-99-005** — the `**Loop exit**` default is false on the ordinary-exit cycle. Introduced by
cycle 1's fix to TASK-99-002; the row is right, its default sentence is not.

**TASK-99-006** — "32 tests" appears three times as a current-state claim and the suite is 33. The
task's own Motivation names this defect class: four of the twenty-one findings on the run it was
derived from were false claims in prose.

### LOW Severity Issues (3)

All three carried forward unchanged from gate 1, still in `recommendations.future`, still correctly
unfixed.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 3 (carried)

---

## NFR Assessment

**Security — PASS.** Unchanged. The fix narrowed a string transformation and added no surface.

**Performance — PASS.** Unchanged; the fix is strictly less work.

**Reliability — PASS (upgraded from CONCERNS).** The silent-failure mode that drove cycle 1's CONCERNS
is closed and mutation-proved. TASK-99-004 is a *documentation* contradiction, not a silent runtime
failure: an orchestrator hitting it stops or diverges visibly rather than quietly doing nothing.

**Maintainability — PASS.** The narrowing's comment names a vacuity shape absent from the
repository's `mutation-proving.md` — a fixture corpus with no instance of the input class, which no
mutation can reveal. Filed as a `future` recommendation against that reference.

---

## Code Review

**Independence caveat still applies** — in-line pass, not an independent subagent. See gate 1's QA
report. It is worth noting that both cycles' most serious findings came from *probing* rather than
reading: cycle 1's by executing the module against a capitalised path, cycle 2's by reading 5c's
preconditions against the new section's claims rather than reading the new section alone.

**Correctness bugs (1):** TASK-99-004 (promoted to gate `top_issues[]` under `code_review_blocking`).

**Cleanups (0 new).** The three from gate 1 stand.

### Step 3c — Mutation-Proof Spot Check

Cycle 1's fix, mutation-proved: restoring `entry[key] = v.toLowerCase()` unconditionally turns
`a capitalised path is matched as written, not case-folded` red — 33 → 32 pass, 1 fail — with
everything else green. `mutation-proven: yes`.

The eight original condition mutations were re-run after the fix and all eight still go red.

---

## Regression Testing

- Full suite: 2937 tests, 0 failures (was 2936; +1 regression test).
- `npm run format:check`: clean.
- `npm run bundle`: both `references/` copies in sync.
- Convergence check vs `develop`: byte-identical, 5624 bytes both sides — **re-verified after** the
  cycle-1 edits, not carried forward from cycle 1's check.

**Regression Assessment**: PASS

---

## Test Commands Executed

```bash
npm run ci:fast                                                        # 2937 tests, 0 fail
node --test shared/resources/tests/qa-diminishing-returns.test.mjs     # 33/33
npm run bundle                                                         # in sync
```

Step 4b re-run not required: the change set's `.md` edits are additive prose in the same file already
classified `no-executable-blocks` at cycle 1, and no new fenced bash block was added.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH leaves the deliverable's exit path undefined in the document that defines it.
Cycle 1's work is otherwise sound and its HIGH is properly closed.
**Quality Score**: 60/100 — `100 - (20 × 1 HIGH) - (10 × 2 MEDIUM)`; no NFR CONCERNS this cycle.

**Deployment Recommendation**: BLOCKED
**Conditions**: resolve TASK-99-004, -005, -006.

---

**Next Steps**: `/qa-fix` cycle 2, then re-review (cycle 3 — scope narrows to files changed since
this gate, and the Convergence check becomes live).
