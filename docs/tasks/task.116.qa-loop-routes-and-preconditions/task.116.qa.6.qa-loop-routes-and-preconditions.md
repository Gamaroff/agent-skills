# QA Report: Task 116 - The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Task**: [Link to task document](./task.116.qa-loop-routes-and-preconditions.md)
**Gate File**: [task.116.gate.6.qa-loop-routes-and-preconditions.yml](./task.116.gate.6.qa-loop-routes-and-preconditions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-14
**Testing Completed**: 2026-09-14
**Gate Status**: PASS

---

## Executive Summary

Sixth review, run on the operator's authorisation after the cycle-5 escalation (the loop limit does not permit it on its own). Every cycle-5 finding is fixed in the tree and the fixes are the ones the findings asked for: `origin/develop` merged so the catalog and `package.json` hunks have the `test-it` skill they reference; the five task-116 CHANGELOG bullets are back under `[Unreleased]` and v0.47.0 is byte-identical to develop's tagged text; both runbook snippets run `grep -h` and state their expected single line; the post-guard write rule names the Convergence-trip resolution and the writer test pins it; the qa-flow lead, Clean-gate row and mermaid edge are keyed on the queue. The suite is green on HEAD (`f5b8d94b`: 3270 / 3269 / 0, 1 skipped). The diff reviewer returned one high-confidence finding — the task document's QA summary block, written by cycle 5, said `Reliability: PASS` against a gate whose reliability axis was FAIL — which this cycle's own Step 12 write replaces; it is recorded on the gate as closed in-cycle rather than dropped. Four further findings are advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Cycle-5 issue | Status | Evidence |
| --- | --- | --- |
| CR-2 (c5, HIGH) `test-it` referenced, absent on branch; `ci:fast` red | **FIXED** | merge `d0a53d62` (`d63b2096..e4bf2f2d`); `skills/test-it/SKILL.md` present; `generate-catalog` → 127, tree unchanged; `ci:fast` 3270/3269/0 on `f5b8d94b`; `bundle --check` 127/0 |
| CR-1 (c5, MEDIUM) task-116 bullets under v0.47.0 | **FIXED** | `6b86eb4b`; `git diff origin/develop -- CHANGELOG.md` = 36 insertions, **0 deletions** — v0.47.0 matches the tag; bullets at `CHANGELOG.md:7–41` under `[Unreleased]` → `### Changed` |
| CR-3 (c5, MEDIUM) runbook grep empty with >1 report | **FIXED** | `c2755abb`; `grep -h -A8 …` + expected-output comment in both runbooks; reproduced over `docs/tasks/task.11[56]*/`: empty without `-h`, last Action row with it |
| CR-5 (c5, LOW) escalation arm's PR Review value | **FIXED** | `cf780a01`; `develop-pipeline-step-5-6-qa-loop.md:266–268` names both row values; source and both bundled copies identical; test extended; QA mutation → covered |
| CR-4 / CR-6 (c5, LOW) qa-flow lead / row / edge | **FIXED** | `f5b8d94b`; `qa-flow.md:21` edge, `:62` lead, `:80` Clean-gate row now `PASS` with no open entry — no overlap with the route-3 row |
| Bug 7 | verified → **closed** | Bug 2 (iteration 5) verified → **closed** · Bug 6 (iteration 2) verified → **closed** |

**Re-review scope: since 2026-09-14T05:46:09Z (default narrowing)** — 15 files / 2085 diff lines (`git log --since` ∪ `origin/develop...HEAD`; the develop merge's own files fall out of the three-dot diff); `SAFETY_REPROBE=false` (gate 5 security `PASS reasoned`; no safety-axis `top_issues[]`; no safety Success Criterion).

---

## New Findings This Cycle

- **[LOW]** `task.116.qa-loop-routes-and-preconditions.md:169` — QA Testing Results block (cycle 5) reports `Reliability: PASS`; gate 5 and qa.5 both record reliability **FAIL** → rewritten by this cycle's Step 12 from gate 6 (CR-1, `top_issues[]` entry, closed in-cycle)
- **[LOW / advisory]** `develop-pipeline-step-5-6-qa-loop.md:263` — "after both guards for arms 4–5" misstates arm 5's inactive-`WAIVED`-no-open-entry sub-case, which reaches 5c without either guard (CR-2, medium confidence)
- **[LOW / advisory]** implementation report Action rows carry trailing annotations (`… → fixed 4/4 in …`) while the loop doc says the value set is "exactly" three strings and the runbook comment says "exactly one line reading …" — the 5c row in practice is bare, so the check holds today, but "exactly" and the template disagree (CR-3, medium confidence)
- **[LOW / cleanup]** `qa-flow.md:21` — mermaid edges describe routes 1 and 3 only; route 2 (Diminishing-returns, arrives with open findings) is on neither B→E edge though the table below lists it (CR-4)
- **[LOW / cleanup]** runbook snippets rely on glob order for `tail -1`; lexical order misplaces `.10.` before `.2.` at ≥10 reports (CR-5, low confidence)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: routes | PASS | cycle-5 residue closed; router, §5c, consumers and the writer test agree; 38/38 across both parity suites |
| Phase 2: preconditions | PASS | unchanged since gate 3 |
| Phase 3: boundary execution | PASS | unchanged since gate 3 |
| Phase 4: subagent vocabulary | PASS | unchanged since gate 3 |
| (PR) housekeeping hunks | PASS | develop merged; catalog in sync; changelog refiled |

**Overall Phase Completion**: 4/4

## Success Criteria Verification

SC1 PASS (route 3 + preconditions + escalation-arm write rule, all pinned) · SC2 PASS (reviewer dispatched 06:28:34 → returned 06:32:03 UTC, 3 m 29 s; gate written 06:37 after the block was in hand) · SC3–5 PASS (unchanged) · SC6 N/A

## Breaking Changes Validation

No breaking change; consumer documents updated (runbooks, qa-flow, CHANGELOG). **Overall:** PASS

## Issues Found

HIGH: 0 · MEDIUM: 0 · LOW: 1 (CR-1, closed in-cycle) + 4 advisory

## NFR Assessment

Performance PASS · Reliability **PASS** (`ci:fast` on `f5b8d94b`: 3270 / 3269 / 0 / 1 skipped, EXIT=0; `bundle --check` 127 / 0) · Security PASS (reasoned, `probes_executed: 0` — no boundary in the cycle diff) · Maintainability PASS (advisory residue listed above; none is a defect in a verified fix)

---

## Code Review

Reviewer: one read-only Explore subagent over the narrowed diff (`code-review-prompt.md` verbatim; `REFUTE_PASS=false`, `SAFETY_REPROBE=false`). Dispatched 2026-09-14 06:28:34 UTC, returned 06:32:03 (3 m 29 s; 10-min budget). Findings block in hand before the gate was written. `CR_BLOCKING=true` (pipeline override; no per-doc `false`).

**Correctness bugs (3):**
- [low/high] `docs/tasks/task.116.qa-loop-routes-and-preconditions/task.116.qa-loop-routes-and-preconditions.md:169` — QA Testing Results says `Reliability: PASS` against a gate 5 whose reliability is FAIL → rewrite the NFR line from the gate it cites — **promoted to gate `top_issues[]` as CR-1** (bug + high confidence); closed in-cycle because qa-task Step 12 owns and regenerates that block from this gate
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:263` — post-guard rule's "after both guards for arms 4–5" misstates arm 5's no-open-entry sub-case → qualify the sentence (advisory)
- [low/medium] `task.116.implementation.1.…md:178` — Action rows annotated beyond the "exactly" value set → decide exact vs prefix and make loop doc, runbook comment and template agree (advisory)

**Cleanups (2):**
- `docs/runbooks/qa-flow.md:21` — mermaid omits route 2 on both B→E/B→D edges → add a route-2 edge
- `docs/runbooks/task-development.md:186` — glob order at ≥10 reports → `sort -V` or state the assumption

**Boundary rule:** `boundary: false`, `probes_executed: 0` — the cycle diff is prose, a grep flag, a CHANGELOG move and a test assertion; nothing accepts or rejects. **Platform variance:** n/a (no environment-derived value passed to a validating consumer). **Step 4b:** fires on `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (in-scope file with fences, though no fence was edited): `qa-execute-snippets.mjs` → 18 blocks, 0 runnable, 1 placeholder (`:965`, a literal template-slot block — not `--bind`able, not touched by this diff), 17 mutating (git push ×2, write-redirection ×3, fail-closed awk/node/command/git reset ×12); shells bash + zsh available. Engine emitted `zero-blocks-executed` (medium) — recorded, not suppressed; it is the placeholder>0 state and the sole placeholder cannot be bound, so there is nothing to configure. Runbooks are `docs/` and out of the rule's scope.

**Mutation proofs (QA, cycle-5 fixes):**
```
mutation-proven: Convergence-trip sentence's PR Review value swapped to "pending — 5c not yet run" (1→0 occurrences) → "the Action row the consumers read has a writer on every route" (29/30) → covered
mutation-proven: qa-flow Phase 3 lead reverted to "If the gate is `CONCERNS` or `FAIL`:" → nothing red (30/30) → no-red-untested (prose the paraphrase guard does not enumerate; advisory — see CR-4 future action)
mutation-proven: runbook grep -h → no committed test names the snippet → not-run (behavioural reproduction recorded instead: two-report glob, empty without -h, correct row with it)
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` on `f5b8d94b` | PASS — 3270 / 3269 / 0 / 1 skipped, EXIT=0 (`.claude/state/t116-qa6-testlog.txt`) |
| `npm run bundle -- --check` | PASS — 127 skills, 0 problems |
| `pr-review-loop-parity` 30 / `qa-gate-preconditions-parity` 8 | PASS |
| `task-registry-drift` 5 | PASS |
| Working tree | clean apart from this cycle's artifacts |

---

## Recommendations

### Immediate (Blocking)
None.

### Short-term
CR-2 arm-5 sub-case wording · CR-3 exact-vs-prefix Action row · CR-4 route-2 mermaid edge + paraphrase-guard shape · CR-5 version-sorted glob.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100 · **Rationale**: rules 1–4 do not fire — no HIGH or MEDIUM entry, no NFR below PASS; the one `top_issues[]` entry is LOW and closed in-cycle. Reached by the accepting-route set's route 1 (`PASS` with no open entry) → **5c**.

**This is cycle 6, outside the 5-cycle budget, run on the operator's authorisation after the escalation.** It is not a precedent: the residue was closed outside the loop by a person, and this review confirms it rather than continuing the loop.

**Deployment Recommendation**: APPROVED · **Conditions**: none

---

**QA Report**: co-located at `task.116.qa.6.qa-loop-routes-and-preconditions.md`
**Gate File**: co-located at `task.116.gate.6.qa-loop-routes-and-preconditions.yml`
**Next Steps**: Step 5c `/review-pr` on PR #404 → Step 7 `/finalise`
