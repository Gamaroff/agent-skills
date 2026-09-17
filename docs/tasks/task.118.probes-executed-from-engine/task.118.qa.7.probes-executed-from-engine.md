# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.7.probes-executed-from-engine.yml](./task.118.gate.7.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 7 reviews the cycle-6 **mechanism replacement**: the merged record file and its lock are gone, each probe writes its own atomic entry file, and the engine folds the directory. Verified — no lock code remains, three concurrent runs converge to three entries, four mutation proofs `covered`. The scoped review's findings are, for the first time, about the new code rather than the lock: emit mode rewrites the reader snapshot outside its try (a read-only directory → exit 1, stack trace, no block — reproduced), a snapshot with no entry directory reads as "no record" instead of failing loudly (reproduced), the fold does not dedupe by key, and five pieces of lock-era residue in docstrings and tests. One MEDIUM, two LOW, five cleanups; no HIGH at any of seven cycles.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR7-1, CR7-2 closed

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR6-1..4 (lock class) | **FIXED — by replacement** | `grep -c 'openSync\|Atomics.wait\|reclaimStaleLock\|lockHolderAlive\|linkSync'` → 0; 3 concurrent runs → `n: 3`, 36 probes, 3 entry files, no temp litter. Mutations: key-less entry name → 3 red; snapshot read first → 3 red; entry validation dropped → 3 red; emit stops rewriting the snapshot → 1 red. Non-atomic write → no red (`data-dependent`, not provokable). |

**Re-review scope**: since gate 6 — 4 files (`security-probe.mjs`, its test, `security-review-prompt.md` §4 sentence, `CHANGELOG.md`), 1,147-line scoped diff. `SAFETY_REPROBE=false`. The reviewer noted an "uncommitted removal of the emit-mode `writeSnapshot` line" — that was QA's own mutation M4 in flight when it read the tree; the engine was restored and `git diff --quiet 72a5bcf0` confirms it.

---

## New Findings This Cycle

- **[medium]** `security-probe.mjs:901` — emit-mode `writeSnapshot` outside the try; read-only snapshot dir → uncaught throw, exit 1, no block. **Reproduced** (`chmod 500`). → catch, warn, still print. **Gate CR7-1.**
- **[low]** `security-probe.mjs:626` — snapshot present, `.d` absent → `null` → `reasoned`/0 and the next `--record` overwrites it. **Reproduced.** → throw "snapshot without entries". **Gate CR7-2.**
- [low/low] `security-probe.mjs:635` — fold counts any `*.json`; a stray copy double-counts → dedupe by `controlKey`, latest `ran_at`. Advisory CR7-3.
- cleanups CR7-4..8 — lock narrative in `recordRun`'s docstring; orphaned JSDoc above `recordEntriesDir`; dead `.lock` assertion and wrong-directory temp check in the concurrency test; stale cycle-3 banner + unused destructure; hardcoded `12` in the forgery test.

---

## Review Methodology

Standard mode, re-review cycle 7, default narrowing. Direct tools for the class verification and four mutation proofs; one read-only Explore subagent for the scoped Step 3b review (2m19s, 8 findings). **Step 4b**: the §4 sentence edit adds no fence; the prompt's one block is `mutating` (info). **Boundary**: false, 0, `reasoned`. **Platform variance**: n/a.

---

## Implementation Verification
Phase 1 CONCERNS (CR7-1/2 in the new record code); Phases 2/2b/3 PASS, unchanged since cycle 2.

## Success Criteria Verification
Unchanged: SC1–4 PASS, SC5 N/A.

## Breaking Changes Validation
Unchanged — PASS.

## Issues Found
HIGH 0 · MEDIUM 1 (CR7-1) · LOW 2 (CR7-2 gating, CR7-3 advisory) · 5 cleanups.

## NFR Assessment
Performance PASS · Reliability CONCERNS (CR7-1/2/3) · Security PASS (`reasoned`, 0, `boundary: false`) · Maintainability CONCERNS (lock-era residue).

---

## Code Review

Scoped Step 3b, blocking. CR7-1 (medium/high), CR7-2 (low/medium → QA reproduced, gates at low) gate; CR7-3 advisory; CR7-4..8 cleanups.

**Mutation proofs (QA, cycle-6 replacement):**
```
mutation-proven: entryFileName ignores the key → merges by {sink, entry} + concurrent runs converge + re-run replaces only its own → covered
mutation-proven: readRecord reads the snapshot before folding → same three → covered
mutation-proven: validControl check dropped → corrupt entry exit 2 + malformed + verdict → covered
mutation-proven: emit-block stops rewriting the snapshot → an edited snapshot cannot change the block → covered
mutation-proven: writeAtomic → direct write → (no red) → data-dependent — atomicity is not provokable
```

---

## Loop guards (cycle 7)
HIGH `0 ×7`; diminishing-returns `continue` (product-defect-signal). Budget: extended by the user.

## Regression Testing
`npm run ci:fast` — 3395 tests, 3394 pass, 1 skipped, 0 fail. `review-security.test.js` 49/49. `probes-executed-population` 6/6, `finalise-dod-prompt-contract` 32/32.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the replacement holds under mutation; two reproducible edges in emit/read of the new layout and residue to clear.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR7-1, CR7-2 closed.

---

**QA Report**: `task.118.qa.7.probes-executed-from-engine.md`
**Gate File**: `task.118.gate.7.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` cycle 7 — CR7-1/2/3 and the five cleanups.
