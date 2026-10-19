# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 2)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.2.numbered-prds-in-prd-skills.yml](./task.204.gate.2.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 refute pass over the whole branch at `703dd536`. All four gate-1 findings are fixed and
verified. The refute reviewer found four more reproducible defects in the new blocks, all in the
same family as gate 1's: a PRD file that does not own its directory still absorbs other PRDs'
findings, the PRD file itself is never checked, a full-stem input does not resolve, and `DOMAIN`
reaches the allocated path unvalidated (a traversal escapes `${PRD_ROOT}`).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 directory input | ✅ FIXED | row "CR-1: a PRD directory resolves…", mutation-proven |
| CR-2 monolith absorbs findings | ✅ FIXED (for a PRD above the root) — see new CR-1 for the same shape below it | row "CR-2: a root-level docs/prd.md…", mutation-proven |
| QA-1 blocker / monolith rows | ✅ FIXED | row "QA-1: the migration plan surfaces…", mutation-proven |
| QA-2 mutation proofs | ✅ FIXED | 21/21 rows, each with a recorded mutation (implementation report) |

## New Findings This Cycle

- **[medium]** `skills/review-prd/SKILL.md:329` — a PRD file that does not own its directory (e.g. `docs/prd/index.md`) passes the outside-root guard and absorbs every other PRD's findings → filter only for a PRD that owns its directory (CR-1)
- **[medium]** `skills/review-prd/SKILL.md:340` — the PRD file itself is never checked; a file the corpus walk skips reads as "numbering ok" → check `PRD_FILE` and merge (CR-2)
- **[medium]** `skills/review-prd/SKILL.md:138` — `prd.3.shop` resolves to nothing → match a full stem first (CR-3)
- **[medium]** `skills/create-prd/SKILL.md:376` — `DOMAIN` unvalidated: `DOMAIN=../..` allocates `docs/prd/../../prd.1.evil/…` → validate it (CR-5)

---

## Testing Scope

### Review Methodology

Re-review scope: unscoped — cycle 2 refute pass over the whole branch diff (`origin/develop...HEAD`,
vendored `skills/*/references/` copies excluded), per qa-task Step 3b. One Explore reviewer with the
REFUTE directive; duration 165 s (completion notice `duration_ms` 165329). This cycle's qa-task steps
were run by the orchestrator from the already-loaded skill text, not by a fresh `/qa-task`
invocation (recorded in the implementation report).

Step 4b: unchanged from cycle 1 — `create-prd/SKILL.md` 4 blocks refused (`mutating`),
`review-prd/SKILL.md` 1 runnable + 5 refused; the one execution failure is the pre-existing Step 8
`git log --since` block (line 658), outside this diff.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0–2 | PASS | unchanged since gate 1 |
| Phase 1 (create-prd) | CONCERNS | CR-5 |
| Phase 3 (review-prd) | CONCERNS | CR-1, CR-2, CR-3 |
| Phase 4 (tests) | PASS | 21 rows, all mutation-proven |

---

## Success Criteria Verification

As gate 1, with QA-1 and QA-2 now PASS. Open: "`review-prd` reports each of the four numbering
classes as Critical" holds for the tested shapes but not for a PRD file the corpus walk skips (CR-2).

---

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 11
- The feature-slug guard engages (record `task.204.qa.2.security.run.json`). `DOMAIN` has no guard
  (CR-5) — the probe covered `FEATURE` only.

### Reliability — CONCERNS
CR-2; CR-4 advisory (an abandoned create leaves a PRD file with no registry row, which the keep
path never registers and every later allocation refuses on).

### Performance — PASS
### Maintainability — PASS

---

## Code Review

Anchors checked (`finding-anchors.js --rev HEAD`): all `ok`. Provenance: every finding is in a block
this diff adds.

**Correctness bugs (7):**
- [medium/high] `skills/review-prd/SKILL.md:329` — PRD file that does not own its directory absorbs others' findings. **Promoted: CR-1.**
- [medium/high] `skills/review-prd/SKILL.md:340` — PRD file never checked itself. **Promoted: CR-2.**
- [medium/high] `skills/review-prd/SKILL.md:138` — full-stem input unresolved. **Promoted: CR-3.**
- [medium/medium] `skills/create-prd/SKILL.md:426` — no recovery for a PRD written without its row (CR-4, advisory).
- [medium/high] `skills/create-prd/SKILL.md:376` — `DOMAIN` unvalidated. **Promoted: CR-5.**
- [low/medium] `skills/review-prd/SKILL.md:340` — a `duplicate-id` finding is attached to its second path only (CR-6, advisory).
- [low/medium] `skills/create-prd/SKILL.md:489` — `duplicate-row` advice leaves the written file orphaned (CR-7, advisory).

**Cleanups (1):**
- `skills/create-prd/SKILL.md:470` — Folder cell from `DOMAIN` rather than the href (CR-8).

**Boundary**: `boundary: true`; `probes_executed: 11` (allocation slug guard). CR-5 is a gap in the
same boundary — the next cycle's probe must include hostile `DOMAIN` values.

---

## Regression Testing

`npm run ci:fast` at the fix commit (orchestrator, cycle 1 5b): 5697 pass / 0 fail. `validate` on
create-prd and review-prd: pass.

---

## Final Assessment

**Gate Status**: CONCERNS — four medium, no high.
**Quality Score**: 60/100
**Deployment Recommendation**: CONDITIONAL — CR-1, CR-2, CR-3, CR-5 closed.
**Next Steps**: `/qa-fix` cycle 2.
