# QA Report: Task 203 - Migrate documents to hierarchical numbering (cycle 4)

**Task**: [Link to task document](./task.203.migrate-doc-numbering.md)
**Gate File**: [task.203.gate.4.migrate-doc-numbering.yml](./task.203.gate.4.migrate-doc-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline, cycle 4)
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: CONCERNS

---

## Re-Review Context

This cycle re-enters QA after the `/finalise` DoD-gaps halt (`task.203.dod.1.migrate-doc-numbering.md`). The fix changed a test file, so `reenter-qa-after-finalise.sh` routed it to 5a rather than straight back to Step 7.

| Previous finding | Source | Status this cycle | Evidence |
| --- | --- | --- | --- |
| CI `link-check` red: 10 dead links in 4 migrated artifacts | DoD 1, gap 1 | ✅ FIXED | Each link repointed to an existing target. `doc-links.js` resolves them all. The 10 healed `KNOWN_ARTIFACT_LINKS` entries are deleted. Reverting one fix turns the corpus test red. |
| No `(task 203)` CHANGELOG entry | DoD 1, gap 2 | ✅ FIXED | `[Unreleased]` cites task 203 twice (Added and Changed). |
| Gate 3 advisories (reliability CR-1/CR-2, cleanups CR-3/CR-4) | gate 3 | ⏭️ CARRIED | Engine unchanged; still in `recommendations.future`. |

---

## Executive Summary

The documentation-only fix is correct. Every repointed link resolves to the file its label names. The test edit removes exactly the 10 healed entries and keeps the unrelated task.35 one. The fast gate is green on the real tree.

One low cleanup remains: the CHANGELOG's blocker list reads as complete but names 8 of 12 codes.

**Overall Assessment**: CONCERNS (advisory only; the queue is empty)
**Deployment Recommendation**: CONDITIONAL (CI `link-check` green on the new head)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#671)

### Review Methodology

Direct tools plus one dispatched reviewer: dispatched at 08:48Z, returned in 52 s (`duration_ms` 52022). Step 4b is not applicable: no runnable prose in the change set.

Re-review scope: files changed since gate 3 (head 954bd33bf3d1; 20 files) — default. The reviewable delta is commit `acccb861`, 6 files outside the task directory.

**Gate head**: `acccb8619fee` (full SHA in the gate's `head:`).

---

## New Findings This Cycle

- **[low/medium, cleanup]** `CHANGELOG.md:25`. The sentence says `--apply` writes nothing "until every blocker has passed" and then lists 8 kinds. `BLOCKER_CODES` has 12; `unplaced-prd`, `registry-invalid`, `registry-unwritable` and `bad-slug` are missing. Fix: mark the list as examples, or complete it. Advisory.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0–3 | PASS | Verified | Engine unchanged since gate 3 |
| Phase 4: Migrate this repository | PASS | Verified | The 4 migrated artifacts now link-check clean |

**Overall Phase Completion**: 5/5.

---

## Success Criteria Verification

AC15 (no live link goes dead) still holds. The engine left these 10 dead links byte-identical, as the criterion requires. This cycle repaired them as a separate, deliberate edit, so they are now live.

AC17 (`doc-links` known sets, none healed) holds after the deletion: the ratchet test passes 24/24.

---

## Breaking Changes Validation

None new. **Overall**: PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (advisory cleanup, above).

---

## NFR Assessment

### Performance — PASS
The engine is unchanged.

### Reliability — CONCERNS
Carried from gate 3: two advisory edge cases, unreachable here.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned. The delta adds no boundary.
- **Probes executed**: not applicable this cycle. The last measured run is `task.203.dod.1.security.run.json`: 11 executed, 0 reproduced, engine unchanged since.

### Maintainability — PASS
The ratchet tightened by 10 entries.

---

## Code Review

`code_review_blocking=true`; nothing qualified. Every anchor checked `ok`.

**Correctness bugs (0).**

**Cleanups (1):**
- `CHANGELOG.md:25` — the blocker list is incomplete. Fix: say "for example", or list all 12.

**Boundary**: `false`. The change set adds no predicate. Candidates considered: none. The test edit deletes set members and the Markdown edits change link targets only.

**Mutation proofs** (QA, snapshot and restore, no tracked file left modified):

```
mutation-proven: story.1.2.1 sprint-review link reverted to its dead target → corpus: every co-located pipeline artifact's relative links resolve … → covered
```

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Link ratchet | `node --test shared/resources/tests/doc-links.test.mjs` | PASS (24/24) |
| Full hermetic suite | `npm run ci:fast` in a scratch worktree at `acccb861`, no `.agents/skills` symlink | 5551/5554 pass. The 3 failing files are environmental (see below). |
| Those 3 files in the main checkout | `observation-log.test.mjs`, `from-observation.test.js`, `test-clean-checkout.test.js` | PASS (83/83) |

The 3 worktree failures are environmental: the observation-log fixture refuses a scratch base under `/tmp` as ephemeral. That refusal is the designed behaviour.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CHANGELOG blocker list: mark it as examples, or complete it.
2. Gate 3's future items stand.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No open finding. Reliability CONCERNS is carried from gate 3, and one low cleanup is advisory.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL. CI `link-check` must be green on the new head.

---

**QA Report**: co-located at `task.203.qa.4.migrate-doc-numbering.md`
**Gate File**: co-located at `task.203.gate.4.migrate-doc-numbering.yml`
**Next Steps**: Step 5c (`/review-pr`), then `/finalise` again.
