---
id: task.65.qa.3
title: 'QA Report (cycle 3, verification) — Task 65: Derive the selection frontier from the registries'
type: qa-report
description: 'N1 and L5 verified FIXED. N1 mutation-proved in both directions by QA, and the fix report claim that its fence test had been made non-vacuous was itself verified by reverting the fixture. Two residual limitations recorded, both on malformed markdown. Gate PASS (90/100).'
tags: [qa, task.65, develop-next, selection, verification]
status: complete
created: 2026-08-29
updated: 2026-08-29
---

# QA Report (cycle 3 — verification): Task 65

**Task**: [task.65.registry-aware-selection.md](./task.65.registry-aware-selection.md)
**Gate File**: [task.65.gate.3.registry-aware-selection.yml](./task.65.gate.3.registry-aware-selection.yml)
**Previous**: [qa.2](./task.65.qa.2.registry-aware-selection.md) — CONCERNS (80/100) · [qa.1](./task.65.qa.1.registry-aware-selection.md) — FAIL (60/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-29
**QA Cycle**: 3
**PR**: [#281](https://github.com/Gamaroff/agent-skills/pull/281)
**Gate Status**: **PASS**

---

## Re-Review Context

| Gate-2 issue | Severity | Status | Verification |
| --- | --- | --- | --- |
| **N1** — column state never reset, second table parsed as registry data | MEDIUM | ✅ **FIXED** | All six probe scenarios clean; both real registries clean; mutation-proved **both** directions by QA |
| **L5** — SC11 unsatisfiable by construction | LOW | ✅ **FIXED** | Reworded to assert reachability; the controlled check it describes was executed verbatim and works |

Scope: *quick verification* per the skill's Re-Review guidance — one one-line code change plus tests,
and one documentation rewording. Nothing was taken on trust.

---

## Executive Summary

Both gate-2 issues are fixed, and the fix cycle did the thing the previous one did not: it proved its
own invariant in **both** directions. QA re-ran both mutations rather than reading the claim —
removing the reset reddens 4 tests, and resetting too eagerly (on the fence toggle) reddens 1. The
second direction is what shows the reset is in the *right place* rather than merely present.

**The most interesting check this cycle was of a claim about a test, not about the code.** The fix
report stated that its fenced-block test, as originally written, *could not fail* — it used a
conventionally ordered table, so dropping the column mapping at the fence would fall back to the
documented positions and produce an identical answer — and that it had been rewritten with swapped
columns to make the fallback observable. QA verified that by reverting the fixture to its original
form and re-running the over-reset mutation: **0 red**, confirming the original was vacuous and the
rewrite genuinely fixed it. A claim that a test was made non-vacuous is exactly the claim worth
checking, and this one holds.

Probing the new reset for over-eagerness found **no defect**, and two residual behaviours worth
recording rather than burying — both on markdown that is already malformed, and both LOW.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Verification Detail

### N1 — the six probe scenarios, re-run

| Scenario | Result |
| --- | --- |
| Registry + `## Notes` key/value table | ✅ 1 row, 0 malformed |
| Registry + term/definition table | ✅ 1 row, 0 malformed |
| Second registry section with its own header | ✅ 2 rows, 0 malformed |
| Legend table **before** the registry | ✅ 1 row, 0 malformed |
| Orphan separator (no header above) | ✅ 1 row, 0 malformed |
| Fenced block mid-table | ✅ 2 rows, 0 malformed |

**Real registries**: `docs/bugs/bug-registry.md` 2 rows, `docs/tasks/task-registry.md` 65 rows — both
0 malformed, 0 warnings.

### N1 — mutation-proved both directions, by QA

| Mutation | Reddened | What it proves |
| --- | --- | --- |
| Remove the reset (restore the defect) | **4** | The reset is present and load-bearing |
| Reset on the fence toggle too (over-eager) | **1** | The reset is in the *right place* — not merely somewhere |
| Revert the fence fixture to its original conventional-order form, then over-reset | **0** | The fix report's claim that the original test could not fail is **true**, and the rewrite fixed it |

### Over-eagerness probes — no defect found

| Probe | Result |
| --- | --- |
| CRLF line endings | ✅ parses identically |
| Trailing whitespace on rows | ✅ clean |
| Indented table (2 spaces) | ✅ clean |
| Registry rows separated by blank lines | ✅ both rows, both priorities correct |
| Table split by a blank line, **swapped columns** | ⚠️ see LR-1 |
| Two tables back-to-back with no blank line | ⚠️ see LR-2 |

### L5 — the controlled check runs as written

SC11 now says: *flip one accepted task document to `ready-for-development` and `select-next.mjs`
returns `selected` with `source: "task-registry"`, then restore it.* Executed verbatim:
`selected` / `T59` / `task-registry`, restored with no drift (`git diff --quiet` clean). The wording
is satisfiable and the demonstration is real.

The live selector reports `roadmap-complete`, which is now the **correct** answer: after the H1 fix
the repo has no outstanding work, task 65 itself being in flight.

### Standing criteria — re-verified after the parser change

- **SC1 + SC10**: 11 fixtures, **0 differences** vs `origin/develop` for both `selectNext` (modulo
  `source`) and `selectBatch`, with a loader that throws if invoked — never invoked.
- **Stop precedence**: all four stops returned, registry loader called **0×** each.

---

## Issues Found

### LOW — residual limitations (recorded, not blocking)

**LR-1 — a table split by a blank line loses its column mapping**

With a *non-standard column order*, rows after a blank line fall back to the documented positions, so
`priority` can read the wrong cell (observed: `High` then `infra`). This is a consequence of scoping
the mapping to one table, and it is the correct reading: **a blank line ends a markdown table**, so
the continuation is a new, headerless table, and headerless tables fall back to positions by design.
Requires both a non-standard column order *and* malformed markdown. Documented behaviour rather than
a defect — recorded so it is not rediscovered as a surprise.

**LR-2 — two tables with no blank line between them report the second header as a malformed row**

Without an intervening non-table line there is nothing to end the first table, so the second header is
read as a data row. A markdown renderer treats that input as one table too. Reporting the row is
arguably more honest than silently ignoring it, and the input is not valid markdown.

Neither warrants a fix: both would require special-casing markdown that is already malformed, and the
current behaviour is defensible and now written down.

**Total this cycle**: HIGH: 0, MEDIUM: 0, LOW: 2 (both residual limitations, no action required)

---

## Success Criteria Verification

| # | Criterion | Cycle 1 | Cycle 2 | Cycle 3 |
| --- | --- | --- | --- | --- |
| 1 | Roadmap selection identical modulo `source` | PASS | PASS | **PASS** |
| 2 | Bug selected, `source: bug-registry` | PASS | PASS | **PASS** |
| 3 | Task selected, `source: task-registry` | PASS | PASS | **PASS** |
| 4 | Bugs outrank tasks; ordering deterministic | CONCERNS | PASS | **PASS** |
| 5 | Frontmatter decides, both directions | PASS | PASS | **PASS** |
| 6 | Every passed-over row listed with a reason | FAIL | CONCERNS | **PASS** |
| 7 | Missing/empty/malformed degrades, never halts | PASS | PASS | **PASS** |
| 8 | `roadmap-complete` only when truly exhausted | PASS | PASS | **PASS** |
| 9 | Four other stops unreachable-past | PASS | PASS | **PASS** |
| 10 | `--batch` unchanged | PASS | PASS | **PASS** |
| 11 | Registry frontier reachable (reworded) | PASS | in substance | **PASS** |
| 12 | Spec and script agree; suite/bundle/format green | PASS | PASS | **PASS** |

**12/12 PASS.**

---

## NFR Assessment

### Performance — CONCERNS

Unchanged across all three cycles and unchanged by any fix. `--lint` reads one document per registry
row (67 here) — linear and unbounded; a 500-task consumer pays 500 reads per lint. Selection
short-circuits at the first eligible row, so the hot path is unaffected. Recorded in the task document
as a known limitation with a defensible reason for not caching. **Not blocking**: it is a cost on an
operator-invoked diagnostic, not on the loop.

### Reliability — PASS

Re-probed once more after the reset change: CRLF, trailing whitespace, indented tables, blank-line
splits, back-to-back tables, absent/empty/header-only/table-less registries — nothing throws, nothing
halts, and a malformed row never suppresses its neighbours.

### Security — PASS

Unchanged. No credentials, no network, no process execution, nothing written.

### Maintainability — PASS

The column mapping is now explicitly scoped to one table and documented as such in the spec. The
cross-file `floor ⊆ dispatcher` rule remains held by a test that reads the dispatchers' own tables.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Roadmap selection (11 fixtures) | **PASS** — byte-identical to `origin/develop` modulo `source` |
| `--batch` | **PASS** — byte-identical to `origin/develop` |
| Stop precedence (4 reasons) | **PASS** — loader called 0× each |
| Real registries | **PASS** — 2 and 65 rows, 0 malformed, 0 warnings |
| `develop-next` protocol shape | **PASS** — 19 tests, unchanged across all three cycles |
| Full repo suite | **PASS** — 1946 tests, 1945 pass, 1 pre-existing skip, 0 fail |

---

## Test Artifacts

```bash
npm test                                                     # 1946 / 1945 pass / 1 skip / 0 fail
npm run format:check                                         # clean
npm run bundle                                               # idempotent
node --test evals/develop-next/protocol/skill-shape.test.mjs # 19 pass, unchanged
node --test evals/develop-next/unit/select-next.test.mjs     # 121 pass
# 12 probe scenarios (6 original + 6 over-eagerness); 3 mutations incl. one on a TEST fixture
# SC11 controlled check executed verbatim and restored with no drift
```

---

## Recommendations

### Immediate

None. Gate PASS; the task is ready for `/finalise`.

### Future (carried, not blocking)

1. Measure `--lint` cost on a registry an order of magnitude larger before recommending it inside a loop.
2. LR-1 / LR-2 are documented limitations on malformed markdown; revisit only if a consumer hits one.

---

## Final Assessment

**Gate Status**: **PASS**
**Rationale**: Both gate-2 issues fixed and independently verified. N1 is mutation-proved in both
directions, and the fix report's claim about making its own test non-vacuous was itself checked and
found true. The over-eagerness probes found no defect. All 12 success criteria pass, the full suite is
green, and roadmap and batch behaviour remain byte-identical to `origin/develop`.

**Quality Score**: 90/100 — `100 − (10 × 1 NFR CONCERNS)`. The single deduction is the `--lint`
read cost, which is unchanged from the day the feature was written, is confined to an
operator-invoked diagnostic, and is recorded as a known limitation rather than discovered later.

**Deployment Recommendation**: **APPROVED**

---

**Next Steps**: `/finalise` — Definition of Done, then merge.
