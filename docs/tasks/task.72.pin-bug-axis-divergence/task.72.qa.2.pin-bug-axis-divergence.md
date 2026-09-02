# QA Report: Task 72 — Cycle 2 (refute pass)

**Task**: [task.72.pin-bug-axis-divergence.md](./task.72.pin-bug-axis-divergence.md)
**Gate File**: [task.72.gate.2.pin-bug-axis-divergence.yml](./task.72.gate.2.pin-bug-axis-divergence.yml)
**Previous Cycle**: [task.72.qa.1.pin-bug-axis-divergence.md](./task.72.qa.1.pin-bug-axis-divergence.md) — CONCERNS, 90/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-01
**PR**: [#296](https://github.com/Gamaroff/agent-skills/pull/296) → `develop`
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 ran as a **full refute pass** over the whole branch diff, per the cycle-2 rule — reviewing to find what is false rather than to confirm the change works, starting with cycle 1's own fix.

TASK72-001 is closed and verified by byte-diff. The refute pass found **no defect in the code**. It did find a real gap in the **evidence**: cycle 1 credited the anti-vacuity guard as mutation-proven by a mutation that could not discriminate. That gap is now closed with a mutation that does, plus a control run. The code was correct throughout — what changed is that its central claim is now actually proven.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status | Verification |
|---|---|---|
| **TASK72-001** (MEDIUM) — inserted sentences stranded the `Pinned by …` clause on the wrong antecedent | **FIXED** | `diff` of lines 69–74 against `origin/develop` is **empty** — the task-axis paragraph is byte-identical to its pre-change form. The task-72 content now sits in its own paragraph naming `develop-bug`'s table explicitly, so neither clause can be misread as describing the other axis. Commit `cabc135`. |

---

## The refute pass finding: a proof that proved nothing specific

Cycle 1 recorded `mutation-proven: yes` for the anti-vacuity guard, citing mutation 4 — rename the `new` row in `develop-bug`'s table so the parse returns wrong rows. The guard did go red. **But that mutation could not have shown what it was credited with.**

Renaming `new` → `brand-new` yields `proceed = {brand-new, reopened, in-progress, ready-for-qa}`, so the gap becomes a **three**-element set. `deepStrictEqual` rejects that on its own. The guard fired only because it sits above the assertion — remove the guard and the test still fails, via the gap comparison. Mutation 4 is double-covered, and therefore proves nothing about the guard's unique contribution.

The guard's comment claims something stronger and more specific: *a parse returning the wrong rows can still yield a two-element gap, and only this guard catches that.* To test that claim, the mutation must corrupt the parse **while leaving the gap at exactly two elements**.

**Deleting the `new` row does exactly that:**

```
proceed = {reopened, in-progress, ready-for-qa}
gap     = proceed \ {new, reopened} = {in-progress, ready-for-qa}   ← exactly the expected array
```

`deepStrictEqual` **passes**. The dispatcher has silently lost a status and the exact-gap assertion is perfectly happy. Only the guard notices.

**Control run — the proof:** with the `new` row deleted *and* the four guard lines removed, the test goes **green**. That is the demonstration that the guard is load-bearing rather than redundant, and it is the run cycle 1 never made.

**Verdict: the claim was true; the evidence for it was not.** This is the vacuous-coverage shape §10 Risk 2 names, caught one level up — not a test that cannot fail, but a *proof* that could not discriminate. No code change was required, because the code was right. Two things changed so the next reader can verify rather than trust:

1. **§8 gained the discriminating mutation** (now five), with a note stating explicitly that the rename mutation does not prove the guard.
2. **The guard's comment now names the discriminating case** and its control run inline, and warns that a rename mutation is caught by both assertions.

---

## Refute-pass probes

The cycle-2 directive names four transition classes. Assessed and dispositioned honestly:

| Probe class | Applicability | Result |
|---|---|---|
| Bulk teardown | **N/A** — no lifecycle, emission, subscription or cleanup path in the diff | — |
| In-flight | **N/A** — no concurrent operation; the assertion is synchronous over a 4-element set | — |
| Error path | Applicable in one form: what happens when the parse degrades? | `proceedStatuses()` asserts `sawRow`, so a table that vanishes throws rather than returning empty. An empty set would also fail `deepStrictEqual` (`gap: []`). **Both** degradation modes are covered. |
| Reconnect | **N/A** — no connection or resumable state | — |
| **Combination of fixes** | Applicable — cycle 1's fix plus the original change | Verified: cycle 1's fix restores lines 69–74 byte-identically, and the task-72 paragraph it displaced is additive below. No interaction; the two changes are textually disjoint. |

---

## Verification

| Check | Result |
|---|---|
| TASK72-001 byte-diff against `origin/develop` | PASS — empty diff on lines 69–74 |
| `develop-next` unit lane | PASS — 123/123 |
| Full hermetic suite (`npm run ci:fast`) | PASS — 2141 tests, 0 failures, `prettier --check` clean |
| `BUG_ELIGIBLE_STATUSES` byte-identical | PASS — unchanged from `origin/develop` |
| Mutated files restored | PASS — `git status` clean after every probe |

---

## Mutation and vacuity proving — cumulative

Seven probes now stand behind the two assertions.

| # | Probe | Expected | Fired | Result |
|---|---|---|---|---|
| 1 | Add `in-progress` to the floor (gap shrinks) | red | gap assertion | ✅ RED |
| 2 | Add a 5th proceed-row (gap grows) | red | gap assertion | ✅ RED |
| 3 | Delete `new` from the floor | red | gap assertion | ✅ RED |
| 4 | **Rename** the `new` row in the dispatcher table | red | guard (fires first; gap assertion would also reject) | ✅ RED — but **not discriminating** |
| 5 | Widen **both** sides by the same status | **green** | none | ✅ GREEN, correctly |
| 6 | **Delete** the `new` row from the dispatcher table | red **via the guard only** | guard — `parsed proceed-set looks wrong: reopened, in-progress, ready-for-qa` | ✅ RED |
| 7 | **Control**: probe 6 **with the guard removed** | **green** | none — `deepStrictEqual` satisfied | ✅ GREEN — proves the guard is load-bearing |

**mutation-proven: yes**, and now precisely:
- **gap assertion** — probes 1, 2, 3 (red in three directions) and probe 5 (correctly green under coordinated widening, establishing it measures the *difference* rather than either set).
- **anti-vacuity guard** — probes 6 and 7 together. Probe 6 shows the guard catches what the gap assertion cannot; probe 7 shows the test would pass without it. Probe 4 is retained as evidence of sensitivity but is **explicitly not** counted as proof of the guard.

---

## Code Review (refute pass, whole branch diff)

**Correctness bugs (0).** Every claim in the change was checked against behaviour:

- *"An empty parse yields `gap: []`, which `deepStrictEqual` already rejects"* — **true** (and `sawRow` makes it unreachable, which the comment does not overstate).
- *"only this guard catches that"* — **true**, and now proven by probes 6–7 rather than asserted.
- *"Task 72 pinned the BUG axis's divergence exactly, against `develop-bug`'s own table"* — **true**; `proceedStatuses` reads `STEP0_BUG`.
- *"`⊆` held for every possible widening of the dispatcher"* — **true**; probe 2 is the instance.
- `.sort()` on `["in-progress", "ready-for-qa"]` — alphabetically correct and stable.
- `STEP0_BUG` resolves through the git-tracked `skills/` path, not the gitignored `.agents/skills/` symlink.

**Cleanups (0 outstanding).** Cycle 1's single cleanup is closed.

---

## NFR Assessment

**Performance — PASS.** No runtime path changes; `select-next.mjs` is byte-identical apart from comments.

**Reliability — PASS.** Strictly increases what the build detects. Seven probes, including a control run that isolates the guard's unique coverage. Rollback remains one test file, no source change.

**Security — PASS.** No security surface; no new dependencies.

**Maintainability — PASS.** TASK72-001 closed. The guard comment now tells a future reader *how* to verify its own claim and which mutation would mislead them — which is the difference between a comment that is true and a comment that is useful.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All functional, structural and documentation criteria met. The one cycle-1 finding is closed and byte-verified. The refute pass found no code defect and closed an evidence gap that would otherwise have shipped a load-bearing guard credited to a mutation that could not test it.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**Next Steps**: `/finalise` — DoD verification and acceptance.
