---
id: task.65.qa.1
title: 'QA Report — Task 65: Derive the selection frontier from the registries'
type: qa-report
description: 'Cycle 1 review. The mechanism is well built and its coverage is real — six independent mutations were run and every one reddened. One HIGH finding: the task eligibility floor admits ready-for-review, a status develop-task is contractually guaranteed to HALT on, which stops an unattended loop and cannot self-recover.'
tags: [qa, task.65, develop-next, selection]
status: complete
created: 2026-08-29
updated: 2026-08-29
---

# QA Report: Task 65 — Derive the selection frontier from the registries

**Task**: [task.65.registry-aware-selection.md](./task.65.registry-aware-selection.md)
**Gate File**: [task.65.gate.1.registry-aware-selection.yml](./task.65.gate.1.registry-aware-selection.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-29
**QA Cycle**: 1
**PR**: [#281](https://github.com/Gamaroff/agent-skills/pull/281)
**Gate Status**: **FAIL**

---

## Executive Summary

The mechanism is carefully built and — unusually — its coverage is **real**. QA ran six mutations of
its own devising, independent of the ten the Implementation Record claims, and every one reddened
exactly the tests that name it. The stop-precedence guard was probed specifically for vacuity by
calling the loader and discarding the result: all four tests failed, so those assertions are about
the *call*, not merely the outcome. Roadmap parity was verified against `origin/develop` across all
eleven fixtures with a loader that throws if invoked — zero differences, zero invocations.

**One HIGH finding blocks the gate.** `TASK_ELIGIBLE_STATUSES` includes `ready-for-review`, but
`develop-task` Phase 0c **HALTs** on that exact status. The frontier can therefore nominate an item
the dispatcher it names is guaranteed to refuse — and `ready-for-review` is not an edge case, it is
the normal state of every task between development and merge. An unattended `/develop-next` loop
stops there and, because the run-state file is left in place, cannot self-recover.

It reproduces live on this branch using the task's own document, which is currently
`ready-for-review` and is exactly what the selector picks.

That finding is a **specification** defect, not a coding one: the task document specified the floor
in § Scope and SC5, and the implementation is faithful. It was reasoned from
`document-status-lifecycle.md` without checking against the dispatcher's accepted set — and Step 2's
review looked at the same document and missed it for the same reason. The bug half of the feature got
it right (`{new, reopened}` is a strict subset of what `develop-bug` accepts), which is what makes the
task half look like an oversight rather than a decision.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All 7 implementation phases marked complete
- [x] Tests passing
- [x] Breaking changes documented (§ Breaking Changes — one, intended)
- [x] Code on feature branch with open PR #281

### Review Methodology

**Direct tools, adversarial.** Rather than confirm the Implementation Record's mutation table, QA
re-derived it: six *different* mutations, plus a targeted probe of the stop-precedence assertions,
plus a cross-version parity check against `origin/develop`. Every claim in the report that could be
independently falsified was tested by trying to falsify it.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. Registry parsers | **CONCERNS** | Verified | Works on the documented shape; two robustness holes (M2, M3 below) |
| 2. Fallback frontier at the `roadmap-complete` return | PASS | Verified | Single insertion point confirmed by code reading *and* by mutation |
| 3. Eligibility floor + `registryFrontier` in `--lint` | **FAIL** | Verified | Floor admits an undispatchable status (H1); visibility has a hole (M2) |
| 4. `source` on every selection | PASS | Verified | Present on all 11 roadmap fixtures and on registry selections |
| 5. Spec + SKILL.md, `npm run bundle` | PASS | Verified | Bundle idempotent; spec and code agree |
| 6. Archive `PHASE 4`; correct registry rows | PASS | Verified | 6 rows corrected; all six documents confirmed `accepted` |
| 7. Tests, format, suite | PASS | Verified | 1924/1923/1 skipped/0 fail; format clean |

**Overall Phase Completion**: 5/7 PASS, 1 CONCERNS, 1 FAIL

---

## Success Criteria Verification

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Roadmap selection identical modulo `source` | **PASS** | Diffed `origin/develop` vs HEAD across all 11 fixtures — 0 differences; loader threw if called, never invoked |
| 2 | Outstanding bug selected, `source: bug-registry` | **PASS** | Unit + direct invocation |
| 3 | Outstanding task selected, `source: task-registry` | **PASS** | Verified live (though see H1 — it selects an undispatchable one) |
| 4 | Bugs outrank tasks; ordering deterministic | **CONCERNS** | Ordering logic correct and stable under reordering, but reads columns positionally with no header validation (M3) |
| 5 | Frontmatter decides, both directions | **PASS** | Swept all 10 statuses; both drift directions confirmed |
| 6 | Every passed-over row listed with a reason | **FAIL** | A row whose `#` cell is not a number is silently dropped — neither parsed nor listed (M2) |
| 7 | Missing/empty/malformed degrades, never halts | **PASS** | 8 hostile inputs; none threw; one malformed row never suppressed its neighbours |
| 8 | `roadmap-complete` only when truly exhausted | **PASS** | Confirmed with and without loader |
| 9 | Four other stops unreachable-past | **PASS** | Confirmed, and **proved non-vacuous** — see Mutation Spot Check |
| 10 | `--batch` unchanged | **PASS** | `selectBatch` output byte-identical between `origin/develop` and HEAD |
| 11 | Live `--dry-run` selects from a registry | **PASS** (with caveat) | It does — and the item it selects is the one H1 is about |
| 12 | Spec and script agree; suite/bundle/format green | **PASS** | All three verified independently |

**10 PASS, 1 CONCERNS, 1 FAIL.**

---

## Mutation-Proof Spot Check (Step 3c)

The caller asked QA not to trust the Implementation Record's table. QA did not.

**Six independent mutations, none of them among the ten claimed:**

| # | Mutation | Result |
| --- | --- | --- |
| I1 | Selection short-circuit removed (always evaluate) | 🔴 1 — SC6 short-circuit test |
| I2 | `parseFrontmatterStatus` no longer lowercases | 🔴 1 — frontmatter test |
| I3 | Header-row skip removed (non-numeric `#` accepted) | 🔴 5 |
| I4 | Bug eligibility widened to `in-progress` | 🔴 1 — bug lifecycle test |
| I5 | Malformed/valid split removed (all rows pass through) | 🔴 2 — both SC7 tolerance tests |
| I6 | **Loader called eagerly at top of `selectNext`, result discarded** | 🔴 5 — all four SC9 tests + SC1 |

**I6 is the important one.** It leaves every *outcome* correct — the stop is still returned, the
right item is still selected — and changes only whether the loader was invoked. All four
stop-precedence tests went red. Those assertions are therefore genuinely about the call, which is the
strong form the task claims. **Not vacuous.**

`mutation-proven: yes` for the stop-precedence guard, the drift guard, the eligibility floor, the
tolerance path and the short-circuit. 6 of 6 probed, 6 of 6 held.

---

## Issues Found

### HIGH Severity (1)

**H1 — The task eligibility floor admits `ready-for-review`, which `/develop-task` HALTs on**

- **Severity**: HIGH · **Category**: Functional · **Priority**: P1
- **Bug Report**: [task.65.bug.1.ready-for-review-selected-but-undispatchable.md](./task.65.bug.1.ready-for-review-selected-but-undispatchable.md)
- **Location**: `skills/develop-next/scripts/select-next.mjs` — `TASK_ELIGIBLE_STATUSES`
- **Observation**: The floor is `{ready-for-development, in-progress, ready-for-review}`.
  `develop-task` Phase 0c answers `Ready for Review` with **HALT — task is already past
  development**. The frontier nominates items the named command is guaranteed to refuse.
- **Reproduces live**: `node skills/develop-next/scripts/select-next.mjs` on this branch selects
  `T65` — this task — whose document is `ready-for-review`.
- **Impact**: `ready-for-review` is the normal state of any task between development and merge, so
  this is a common case, not an edge one. An unattended `/loop /develop-next` stops there; the
  run-state file is left in place, so the next invocation resumes at the same item and stops again.
  The loop **cannot self-recover**. The feature exists to stop the loop halting for a reason that is
  not "no work left", and this adds one.
- **Recommendation**: Drop `ready-for-review`, leaving `{ready-for-development, in-progress}` — a
  strict subset of what `develop-task` proceeds on, matching what the bug side already does. Then add
  a test asserting the subset relation in both directions, and correct § Scope and SC5 in the task
  document. Do **not** widen `develop-task` instead; that gate is load-bearing.

### MEDIUM Severity (2)

**M2 — A registry row with a non-numeric `#` cell is silently invisible**

- **Severity**: MEDIUM · **Category**: Functional · **Priority**: P2
- **Location**: `select-next.mjs` — `parseRegistry`, the `if (!/^\d+$/.test(cells[0] || "")) continue;` guard
- **Observation**: That guard is how the header row is skipped, but it does not distinguish a header
  from a **typo**. `| T65 | [Task 65](task.65.x/task.65.x.md) | ready-for-development | … |` — someone
  writing the id in the prefixed form the roadmap uses — is not parsed, not counted in `candidates`,
  and **not listed in `--lint`**.
- **Impact**: Directly contradicts SC6 and Phase 3's stated guarantee: *"An item can be out of the
  frontier, but it cannot be invisible."* The hole sits exactly where a human typo lands, and the
  failure is silent — the same shape as the bug this whole task exists to remove, one level down.
- **Recommendation**: Distinguish the header from a malformed row. The header is identifiable (first
  cell `#`, or the row immediately preceding a `| --- |` separator); anything else that looks like a
  table row inside the registry section but has a non-numeric id should go to `malformed[]` with a
  reason. Add a test.

**M3 — Column positions are assumed with no header validation**

- **Severity**: MEDIUM · **Category**: Quality · **Priority**: P2
- **Location**: `select-next.mjs` — `parseRegistry`, `cells[2]` / `cells[3]` / `cells[4]`
- **Observation**: Status, severity and priority are read by fixed index. The column contract is
  documented in `roadmap-selection.md` but never *checked*. Demonstrated: a registry whose header is
  `| # | Title | Status | Priority | Category | … |` (Priority and Category swapped) parses
  `priority` as `"infra"`.
- **Impact**: Bounded but real. It cannot cause a wrong *selection*, because the document's
  frontmatter is authoritative for eligibility — the drift guard contains the blast radius. It does
  break **ordering**, so SC4's "deterministic and documented ordering" silently returns the wrong
  item first. `agent-skills` sets both registry formats, so this bites consumer repos rather than
  this one.
- **Recommendation**: Read the header row and map column names → indices, falling back to the
  documented positions when no header is found. Alternatively validate and emit a `--lint` warning
  when the header does not match the expected shape. A warning would be enough to satisfy the
  "never invisible" principle.

### LOW Severity (1)

**L4 — `parseRegistry` takes the first `.md` href, where `workItemPath()` takes the first *work-item* href**

- `workItemPath()` (the roadmap parser, same file) requires the filename stem to start
  `story.`/`task.`/`bug.`. `parseRegistry` accepts any `.md`. A title containing a nested or preceding
  markdown link resolves to the wrong path: `[See [x](y.md)](task.1.a/task.1.a.md)` yields
  `docs/tasks/y.md`.
- Fails conservatively (the row is then rejected as "document missing", so nothing wrong is
  *selected*), and the input is pathological. But it makes work invisible for an unobvious reason, and
  the fix is one regex — reuse the same `(?:story|task|bug)\.[^/]*\.md$` test the sibling function
  already uses, which would also make the two consistent.

**Total**: HIGH: 1, MEDIUM: 2, LOW: 1

---

## Assessment of the Three Recorded Deviations

All three are **justified**; none is a finding.

1. **No registry fixture file.** The reasoning is correct and worth keeping: because the drift guard
   reads the *document*, a registry fixture alone is half a fixture — it would need a parallel tree of
   task/bug documents to supply the frontmatter the check consults. The inline builders keep a row and
   its document status three lines from the assertion about them. The Files Summary was updated to say
   so rather than left contradicting the delivery.
2. **Six registry rows corrected rather than three.** Correct, and correctly explained: leaving rows
   known to be wrong would be worse, and the correction is explicitly *not* what makes selection safe.
3. **`PHASE 4` archived with `T65` unticked.** The right call. Ticking a row for unmerged work would
   be an attestation rather than a record, and `roadmap-history.md` is not parsed by the selector, so
   the unticked archived row is inert.

---

## Breaking Changes Validation

### Breaking Change: an exhausted roadmap with outstanding registry rows now selects

- Documented: **Yes** (§ Breaking Changes, `CHANGELOG.md`, PR body)
- Migration path provided: **Yes** — none needed for a repo with no registries (degrades to previous
  behaviour, verified across 8 hostile inputs); repos with registries get the intended new behaviour,
  and the eligibility floor is the opt-out.
- Consumer code updated: **N/A** — library skill.

**Assessment**: PASS. The change is intended, stated plainly in three places, and its blast radius is
correctly bounded.

---

## NFR Assessment

### Performance — CONCERNS

Selection short-circuits at the first eligible row, so the common path reads at most one document per
higher-ranked candidate. `--lint` reads **one document per registry row** — 67 reads (~40 ms) here.
That is linear in registry size and unbounded: a mature consumer repo with 500 tasks pays 500 file
reads per lint. The task document records this as a known limitation and declines to cache, with a
defensible reason. Not blocking, but it should be measured before a repo an order of magnitude larger
adopts it.

### Reliability — PASS

Tolerance is genuinely comprehensive: 8 hostile inputs, none threw, none halted, and a malformed row
never suppresses its neighbours. The rollback plan is accurate about the one thing a revert does not
undo (Phase 6), which is the kind of detail usually discovered at 2am instead of written down.

### Security — PASS

No credentials, no network calls, no process execution. The change reads two repo-local markdown files
and the documents they name. Registry hrefs are joined and normalised, so a crafted `../` href could
read outside the repo — but the registry is a trusted, reviewed in-repo file, the content is only
parsed for a `status:` scalar, and nothing is written. No new dependencies.

### Maintainability — CONCERNS

The code is clear, the exported surface is small and purposeful, and the comments explain *why*
rather than *what* — the stop-precedence rationale in particular is the kind of comment that stops a
future editor from moving the call. Two deductions: the positional column contract (M3) is documented
prose rather than an executable check, and H1 shows the eligibility floor and the dispatcher's
accepted set are coupled with nothing holding them together.

---

## Regression Testing

| Area | Result | Evidence |
| --- | --- | --- |
| Roadmap selection (11 fixtures) | **PASS** | Byte-identical to `origin/develop` modulo `source` |
| `--batch` | **PASS** | `selectBatch` output byte-identical to `origin/develop` |
| Halt path (unparseable roadmap) | **PASS** | Halts before the fallback; loader never called |
| `develop-next` protocol shape | **PASS** | 19 tests, unchanged — no new stop reason |
| Full repo suite | **PASS** | 1924 tests, 1923 pass, 1 skipped (pre-existing), 0 fail |

---

## Test Artifacts

```bash
npm test                                                    # 1924 / 1923 pass / 1 skipped / 0 fail
npm run format:check                                        # clean
npm run bundle                                              # idempotent
node --test evals/develop-next/protocol/skill-shape.test.mjs # 19 pass, unchanged
node --test evals/develop-next/unit/select-next.test.mjs     # 99 pass
node skills/develop-next/scripts/select-next.mjs             # live: selects T65 from task-registry
node skills/develop-next/scripts/select-next.mjs --lint       # 67 considered, 66 passed over
git show develop:skills/develop-next/scripts/select-next.mjs # cross-version parity baseline
```

---

## Recommendations

### Immediate (Blocking)

1. **H1** — remove `ready-for-review` from `TASK_ELIGIBLE_STATUSES`; add a test asserting the floor is
   a subset of the dispatcher's accepted set, for both tasks and bugs; correct § Scope and SC5.

### Short-term (Non-blocking, recommended this cycle)

2. **M2** — distinguish a header row from a malformed one so no row is both ineligible and unlisted.
3. **M3** — validate or map the registry header, or emit a `--lint` warning on an unexpected shape.
4. **L4** — reuse `workItemPath()`'s `(story|task|bug).` filename test in `parseRegistry`.

### Future

5. Measure `--lint` on a registry an order of magnitude larger before recommending it in a loop.

---

## Final Assessment

**Gate Status**: **FAIL**
**Rationale**: One HIGH finding (H1). The delivered frontier can nominate work the dispatcher it
names is contractually guaranteed to refuse, in a state that is common rather than exceptional, and
the resulting halt leaves an unattended loop unable to self-recover. Everything else about the change
is strong — the coverage is real, the tolerance is thorough, and the parity guarantees hold under
adversarial mutation — but H1 undercuts the feature in the case it will most often meet.

**Quality Score**: 60/100 — `100 − (20 × 1 HIGH) − (10 × 2 MEDIUM)`

**Deployment Recommendation**: **BLOCKED** pending H1.

---

**Next Steps**: `/qa-fix` addresses H1 (blocking) and, while in the file, M2, M3 and L4. Re-review
follows in QA cycle 2.
