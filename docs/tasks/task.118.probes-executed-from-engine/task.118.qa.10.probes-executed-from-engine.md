# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.10.probes-executed-from-engine.yml](./task.118.gate.10.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: PASS

---

## Executive Summary

Cycle 10. The cycle-9 fixes are **FIXED** and mutation-proven — the orphan check re-reads the directory before throwing (the sibling-first-run interleaving reproduced deterministically through the injected `readdir`), and one prologue guards every writer. The scoped review returned a single cleanup (a JSDoc block stranded above the wrong function) and no bug. **Gate PASS**, empty queue.

Ten cycles in total, never a HIGH. The deliverable — engine-emitted `probes_executed`, computed `evidence`, every producer site pasting from `--emit-block`, a population test with a floor and a `--repo-root` guard — has been correct since cycle 2. Cycles 2–5 hardened a merged-file lock that kept growing crash-recovery edges; cycle 6 replaced it with one atomic entry file per control, folded on read; cycles 7–10 closed that layout's own edges (emit never loses the block to a snapshot write; an orphaned snapshot is loud; the fold dedupes by key; the writer guards itself; the orphan check tolerates a sibling first run). 45 findings closed, each fixed and mutation-proven in its cycle; two bug reports filed and closed.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR9-1 orphan-check race | **FIXED** | injected `readdir`: ENOENT once while the sibling lands → read, `looks === 2`; genuine orphan still throws. Mutation: re-read removed → red. |
| CR9-2 duplicated prologue | **FIXED** | `openRecordForWrite` used by both writers. Mutation: bypassed in `recordRun` → red. |
| CR9-3 exit codes | FIXED | `[0, 1, 0]` asserted exactly. |

**Re-review scope**: since gate 9 — 2 files, 1,291-line scoped diff. `SAFETY_REPROBE=false`. The reviewer confirmed the working tree identical to HEAD `e36eb111` (QA's mutation harness ran after its read this time).

---

## New Findings This Cycle

- cleanup — `security-probe.mjs:715` the "Record one probe run…" JSDoc sits above `openRecordForWrite`; `recordRun` has no doc comment attached. Advisory CR10-1, recorded under future recommendations.

**No bug.** `None` searched: the cycle-9 hunks (readRecord retry, `openRecordForWrite`, `recordRun`/`preflightRecord`, the two test changes), call and exit paths through `main()`, and the write order dir → entry → snapshot.

---

## Review Methodology
Standard mode, re-review cycle 10, default narrowing; one read-only Explore subagent (2m11s, 1 finding). **Step 4b**: n/a. **Boundary**: false, 0, `reasoned`. **Platform variance**: n/a.

## Implementation Verification
| Phase | Status |
| --- | --- |
| Phase 1: the artefact | PASS |
| Phase 2: the readers (review-security, finalise) | PASS |
| Phase 2b: qa-story / qa-task 3b | PASS |
| Phase 3: the population check | PASS |

**Overall Phase Completion**: 4/4.

## Success Criteria Verification
| # | Criterion | Status |
| --- | --- | --- |
| 1 | `probes_executed` and `evidence:` copied from an engine-written record | PASS |
| 2 | `measured` cannot appear without a record; the contract test fails if it does | PASS |
| 3 | finalise's DoD security step reads the same record | PASS |
| 4 | population test finds ≥ 2 sites; every one reads an artefact or is allowlisted | PASS (5 producer files; `--repo-root` guard) |
| 5 | Observation #10 closes naming this PR | N/A — `/finalise` |

## Breaking Changes Validation
PASS — documented in §5 and CHANGELOG; the only behaviour change is more honest `reasoned` verdicts.

## Issues Found
HIGH 0 · MEDIUM 0 · LOW 0 · cleanups 1 (advisory).

## NFR Assessment
Performance PASS · Reliability PASS · Security PASS (`reasoned`, 0, `boundary: false`) · Maintainability PASS (CR10-1 advisory).

---

## Code Review
Scoped Step 3b, blocking under `code_review_blocking=true`: no `category: bug` finding. CR10-1 cleanup.

**Mutation proofs (QA, cycle-9 fixes):**
```
mutation-proven: re-read before the orphan error removed → a directory that appears between the two checks is a record → covered
mutation-proven: openRecordForWrite bypassed in recordRun → library call refuses to write over an orphaned snapshot → covered
```

## Loop guards (cycle 10)
Gate is accept-eligible (route 1: PASS, no open entry) — the convergence check and the diminishing-returns exit do not apply. **Action**: Proceeding to 5c.

## Regression Testing
`npm run ci:fast` — 3401 tests, 3400 pass, 1 skipped, 0 fail. `review-security.test.js` 55/55; `probes-executed-population` 6/6; `finalise-dod-prompt-contract` 32/32.

---

## Final Assessment
**Gate Status**: PASS · **Quality Score**: 100/100 · **Deployment Recommendation**: APPROVED.

**QA Report**: `task.118.qa.10.probes-executed-from-engine.md` · **Gate File**: `task.118.gate.10.probes-executed-from-engine.yml` · **Next Steps**: Step 5c `/review-pr`, then `/finalise`.
