---
id: task.65.qa.2
title: 'QA Report (cycle 2, re-review) — Task 65: Derive the selection frontier from the registries'
type: qa-report
description: 'All four cycle-1 findings verified FIXED, each independently mutation-proved. One new MEDIUM defect introduced by the M2 fix: the header-column state is never reset when a table ends, so any second table in a registry document is parsed as registry data. Remedy verified by QA. Gate CONCERNS (80/100).'
tags: [qa, task.65, develop-next, selection, re-review]
status: complete
created: 2026-08-29
updated: 2026-08-29
---

# QA Report (cycle 2 — re-review): Task 65

**Task**: [task.65.registry-aware-selection.md](./task.65.registry-aware-selection.md)
**Gate File**: [task.65.gate.2.registry-aware-selection.yml](./task.65.gate.2.registry-aware-selection.yml)
**Previous cycle**: [task.65.qa.1.registry-aware-selection.md](./task.65.qa.1.registry-aware-selection.md) — gate FAIL (60/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-29
**QA Cycle**: 2
**PR**: [#281](https://github.com/Gamaroff/agent-skills/pull/281)
**Gate Status**: **CONCERNS**

---

## Re-Review Context

Scoped to what changed since gate 1: commit `8f701cc` (the four fixes) and the status/Change-Log
commit after it.

| Cycle-1 issue | Severity | Status | Verification |
| --- | --- | --- | --- |
| **H1** — `ready-for-review` selectable but not dispatchable | HIGH | ✅ **FIXED** | Floor narrowed to `{ready-for-development, in-progress}`. A `ready-for-review` task is now rejected with the correct reason. The structural test was re-proved non-vacuous **two** ways by QA independently (below) |
| **M2** — non-numeric id row silently invisible | MEDIUM | ⚠️ **FIXED, but introduced N1** | The typo'd row is now reported and reaches `--lint`. The header/typo distinction works. But the state it introduced is never reset — see N1 |
| **M3** — column positions assumed | MEDIUM | ✅ **FIXED** | Verified against the **real** registries (not fixtures): 2 and 65 rows, 0 malformed, 0 warnings. A swapped-column registry now reads `priority` correctly *and* orders by it |
| **L4** — first `.md` href instead of first work-item href | LOW | ✅ **FIXED** | One shared `isWorkItemHref()`; a preceding non-work-item link no longer wins |

All four were **independently mutation-proved by QA**, not accepted on the fix report's word.

---

## Executive Summary

The four cycle-1 findings are genuinely fixed, and the H1 fix is better than the finding asked for:
rather than only correcting a value, it made the rule executable by parsing both dispatchers' own
status tables, so the constraint re-checks itself if either changes. QA proved that test cannot pass
vacuously — it fails when the floor is wrong **and** when the table it reads stops parsing.

**One new MEDIUM defect was introduced by the M2 fix**, which is the specific risk this repo's QA
step exists to catch: the header-column state (`cols`) is set when a table's header is found and
**never reset when that table ends**, so every subsequent pipe table in a registry document is parsed
as registry data. A `## Notes` key/value table after the registry yields two spurious "malformed row"
entries; a second registry section's own header row is reported as `id cell "#" is not a number`.

It cannot cause a wrong selection — malformed rows never become candidates — but it pollutes exactly
the `--lint` report that SC6's visibility guarantee depends on, and it is the mirror image of the bug
it came from: M2 made real rows visible, and in doing so made non-rows *falsely* visible.

**No existing test catches it.** QA confirmed the suite stays green at 113/113 both with and without
the remedy, which is why it survived the fix cycle.

QA verified a one-line remedy — reset `cols` alongside `pendingHeader` when a non-table line ends the
table — against all six probe scenarios, the two real registries, and the full unit suite.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix N1 first; it is one line plus a test.

---

## Review Methodology

**Direct tools, adversarial, re-review scope.** Per the Adaptive Review Strategy, a re-review uses
direct tools focused on what changed. Nothing here was accepted from the fix report: every claim was
re-derived — the mutations were re-run by QA, the real registries were parsed rather than fixtures,
and the state machine was probed with six hand-built scenarios the fix's own tests do not cover.

---

## Issues Found

### MEDIUM Severity (1 — new this cycle)

**N1 — column state is never reset, so a second table in the document is parsed as registry data**

- **Severity**: MEDIUM · **Category**: Functional · **Priority**: P2 · **Introduced by**: the M2 fix (`8f701cc`)
- **Location**: `skills/develop-next/scripts/select-next.mjs` — `parseRegistry`, the `pendingHeader` / `cols` state machine
- **Observation**: `cols` is assigned when a header is promoted and never cleared. `pendingHeader` is
  reset when a non-table line ends the table; `cols` is not. Once any header has been seen, **every**
  later table row in the document is treated as a data row.

  Probed with six scenarios:

  | Scenario | Result |
  | --- | --- |
  | Registry table, then a `## Notes` key/value table | ❌ 2 spurious malformed rows (`"Key"`, `"foo"`) |
  | Registry, then a `## Notes` term/definition table | ❌ 2 spurious malformed rows (`"Term"`, `"SC"`) |
  | A second registry section with its own header | ❌ 1 spurious malformed row (`id cell "#" is not a number`) |
  | A legend table **before** the registry | ✅ clean |
  | Separator with no header above it | ✅ clean |
  | Fenced block interrupting a table | ✅ clean |

- **Impact**: Bounded but real. Malformed rows never become candidates, so no wrong item can be
  selected. They **do** land in `registryFrontier.passedOver` and therefore in `--lint`, as if they
  were registry rows deliberately passed over — polluting the one report SC6 relies on to guarantee
  nothing is invisible. An operator reading `--lint` would see "malformed row" entries pointing at
  documentation tables.
- **Does not fire in this repo today**: both real registries contain exactly one table each, and both
  parse with 0 malformed and 0 warnings. It bites a consumer repo, or this repo the day someone adds
  a table under `## Notes`.
- **Why the fix cycle missed it**: the suite is green at 113/113 **with and without** the remedy. No
  test exercises a second table.
- **Remedy — verified by QA**: reset `cols = null` alongside `pendingHeader` where a non-table line
  ends the table. QA applied it and re-ran everything: all six scenarios clean, both real registries
  unchanged (2 and 65 rows, 0 malformed), unit suite 113/113 green. It needs a test of its own —
  without one it is unheld, and this finding recurs.

  Note the remedy is *self-correcting* rather than special-cased: with `cols` reset, a `| Key | Meaning |`
  header fails `mapHeader` (it names neither an id nor a title column), so `cols` stays null, the row
  becomes a header candidate, and the table is ignored. No allowlist of "tables to skip" is needed.

### LOW Severity (1)

**L5 — SC11's wording is now unsatisfiable by construction**

SC11 reads: *"…so a fresh `/develop-next --dry-run` in this repo selects from a registry rather than
reporting a stop."* It no longer does — it reports `roadmap-complete`, because after the H1 fix the
only outstanding item in this repo is **task 65 itself**, whose document is `ready-for-review` and is
therefore correctly excluded.

The criterion was only satisfiable before *because of the H1 defect*. QA confirmed the mechanism is
genuinely reachable by a controlled check: flipping one accepted task's document to
`ready-for-development` makes the live selector return `selected`, `source: "task-registry"`,
`id: "T59"`. Restored immediately; no drift.

So the feature is reachable and SC11 is met **in substance**. Its literal wording describes the
repo's momentary backlog rather than the feature, and should be reworded to say the mechanism is
reachable — demonstrated by a controlled check — rather than asserting a particular selection.

**Total this cycle**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## Mutation-Proof Spot Check (Step 3c)

Every fix from cycle 1 was re-proved by QA, independently of the fix report's table.

| Invariant | Mutation | Result | `mutation-proven` |
| --- | --- | --- | --- |
| H1 — floor excludes `ready-for-review` | Put it back | 🔴 3 red, incl. the structural test on the exact regression it names | **yes** |
| H1 — the structural test reads a live table | Rename `#### develop-task` so the section parse yields nothing | 🔴 1 red — it **fails** rather than passing on an empty set | **yes** |
| M2 — typo'd id reported | (proved in cycle 1 by the fix; re-confirmed by scenario probing) | — | **yes** |
| M3 — columns by name | Verified against the real registries and a swapped-column table that changes the *order*, not just the field | — | **yes** |
| L4 — work-item href | Preceding non-work-item link no longer wins | — | **yes** |
| **N1 — column state reset** | Remedy applied and removed | ⚪ **0 red both ways** | **no — this is the finding** |

The last row is the point of this cycle: 5 of 6 invariants are held by tests; N1's is held by nothing.

---

## Success Criteria Verification

| # | Criterion | Cycle 1 | Cycle 2 | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Roadmap selection identical modulo `source` | PASS | **PASS** | Re-diffed vs `origin/develop` across all 11 fixtures after the parser rewrite — 0 differences; loader throws if called, never invoked |
| 2 | Bug selected, `source: bug-registry` | PASS | **PASS** | Unit + direct invocation |
| 3 | Task selected, `source: task-registry` | PASS | **PASS** | Confirmed live via the controlled reachability check (T59) |
| 4 | Bugs outrank tasks; ordering deterministic | CONCERNS | **PASS** | M3 fixed; ordering now provably follows the named Priority/Severity columns |
| 5 | Frontmatter decides, both directions | PASS | **PASS** | Plus the new floor ⊆ dispatcher constraint |
| 6 | Every passed-over row listed with a reason | FAIL | **CONCERNS** | M2 closed the invisibility hole; N1 opened a false-visibility one in the same report |
| 7 | Missing/empty/malformed degrades, never halts | PASS | **PASS** | Re-probed; nothing throws |
| 8 | `roadmap-complete` only when truly exhausted | PASS | **PASS** | Live: correctly reports it, because the repo genuinely is exhausted |
| 9 | Four other stops unreachable-past | PASS | **PASS** | Re-verified after the rewrite: all four stops returned, loader called **0×** each |
| 10 | `--batch` unchanged | PASS | **PASS** | `selectBatch` byte-identical to `origin/develop` across all 11 fixtures |
| 11 | Live `--dry-run` selects from a registry | PASS | **PASS in substance** | See L5 — mechanism proved reachable; wording now describes the backlog, not the feature |
| 12 | Spec and script agree; suite/bundle/format green | PASS | **PASS** | All re-run |

**11 PASS (one in substance), 1 CONCERNS, 0 FAIL.**

---

## NFR Assessment

### Performance — CONCERNS

Unchanged from cycle 1, and unchanged by the fixes. `--lint` reads one document per registry row (67
here); linear and unbounded. Selection still short-circuits. Recorded as a known limitation with a
defensible reason for not caching.

### Reliability — PASS

Re-probed after the parser rewrite: absent, empty, header-only, table-less, 3-cell, non-`.md`-link,
empty-status and non-numeric-id inputs all degrade without throwing. The halt path still returns
before the fallback. N1 is a reporting defect, not a reliability one — nothing crashes and nothing
wrong is selected.

### Security — PASS

Unchanged. No credentials, no network, no process execution, nothing written.

### Maintainability — PASS *(improved from CONCERNS)*

Both cycle-1 deductions are gone. The column contract is now an executable mapping rather than prose,
and the floor ⊆ dispatcher rule is held by a test that reads the dispatchers' own tables instead of
restating them — the strongest form available for a cross-file invariant. The `isWorkItemHref`
extraction removes a real drift risk between two sibling functions.

---

## Regression Testing

| Area | Result | Evidence |
| --- | --- | --- |
| Roadmap selection (11 fixtures) | **PASS** | Byte-identical to `origin/develop` modulo `source`, after the parser rewrite |
| `--batch` | **PASS** | Byte-identical to `origin/develop` |
| Stop precedence (4 reasons) | **PASS** | All four returned; loader called 0× each |
| Real registries | **PASS** | 2 and 65 rows, 0 malformed, 0 warnings |
| `develop-next` protocol shape | **PASS** | 19 tests, unchanged |
| Full repo suite | **PASS** | 1938 tests, 1937 pass, 1 pre-existing skip, 0 fail |

---

## Test Artifacts

```bash
npm test                                                     # 1938 / 1937 pass / 1 skip / 0 fail
npm run format:check                                         # clean
npm run bundle                                               # idempotent
node --test evals/develop-next/protocol/skill-shape.test.mjs # 19 pass, unchanged
node --test evals/develop-next/unit/select-next.test.mjs     # 113 pass
node skills/develop-next/scripts/select-next.mjs             # stop: roadmap-complete (correct — repo exhausted)
# controlled reachability: task.59 doc → ready-for-development → selected T59 from task-registry (restored)
# state-machine probes: 6 scenarios, 3 defective (N1)
# mutations: 2 on H1's structural test, both red; N1 remedy green both ways
```

---

## Recommendations

### Immediate (blocking the gate's CONDITIONAL)

1. **N1** — reset `cols` when a table ends (one line), **plus a test** covering a registry document
   with a second table. Without the test the invariant is unheld and this recurs.

### Short-term

2. **L5** — reword SC11 to describe the mechanism's reachability rather than asserting a particular
   live selection, so it does not depend on the repo's momentary backlog.

### Future

3. Measure `--lint` on a registry an order of magnitude larger.

---

## Final Assessment

**Gate Status**: **CONCERNS**
**Rationale**: All four cycle-1 findings are genuinely fixed and independently mutation-proved, and
H1's fix converted a defect into an executable constraint. One new MEDIUM defect was introduced by the
M2 fix, held by no test, with a QA-verified one-line remedy. Deterministic rule 2 applies: a MEDIUM
issue with no HIGH → CONCERNS.

**Quality Score**: 80/100 — `100 − (10 × 1 MEDIUM) − (10 × 1 NFR CONCERNS)`

**Deployment Recommendation**: **CONDITIONAL** — merge once N1 is fixed and covered.

---

**Next Steps**: one more `/qa-fix` cycle for N1 (+ the L5 wording), then cycle 3 verification.
