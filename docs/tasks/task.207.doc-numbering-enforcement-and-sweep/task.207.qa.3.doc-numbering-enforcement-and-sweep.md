# QA Report: Task 207 - Doc numbering enforcement and sweep (cycle 3)

**Task**: [Link to task document](./task.207.doc-numbering-enforcement-and-sweep.md)
**Gate File**: [task.207.gate.3.doc-numbering-enforcement-and-sweep.yml](./task.207.gate.3.doc-numbering-enforcement-and-sweep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3 at head `26e783e4`. BUG-2 (shared tokenizer) and BUG-5 (sub-story titles) are fixed. Cycle
2's sweep renamed the ingester prompt's story globs to `<P>.<E>.<S>` without renaming the
substitution list its two callers follow, so story-mode ingestion silently matches nothing (BUG-6,
HIGH). §5 still misses uppercase and title spellings, so BUG-3 is reopened.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Finding | Cycle 2 | Status now | Evidence |
| --- | --- | --- | --- |
| TASK-207-BUG-2 phantom block comment | MEDIUM | ✅ FIXED | shared tokenizer; reviewer checked line alignment; 345 previously hidden lines now scanned |
| TASK-207-BUG-3 placeholder residues | HIGH | ❌ NOT FIXED | lowercase heads fixed; `EPIC-[N]`, `Epic {N}`, `Story [epic].[story]` remain (CR-2) |
| TASK-207-BUG-5 backfill sub-story title | MEDIUM | ✅ FIXED | label from `.id`; non-story documents skipped |
| CR2-6 backfill non-story skip | LOW | ✅ FIXED | `kind artifact` check |

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head c5432aa81b45; 17 files after dropping generated
references and the task's own directory) — default. One Explore reviewer, dispatched 17:36:19Z,
`duration_ms` 185015. `SAFETY_REPROBE=false`.

Convergence check: HIGH sequence `0, 1, 1` — does not trip (`HIGH_{N-2} = 0`: the HIGH is new,
introduced by cycle 2's fix). Third-strike rule: no file has HIGH findings on three consecutive
gates.

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-findings-ingester-prompt.md:16` — globs name `<P>/<E>/<S>`; callers bind `<epic>/<story>`. (BUG-6)
- **[medium]** `tests/doc-id-chokepoint.test.js:514` — §5 misses uppercase/title spellings. (BUG-3 reopened)
- **[low]** `skills/sync-github-epic/SKILL.md:17` — `Epic {N} — {title}` milestone. (part of BUG-3)
- **[low]** `tests/doc-id-chokepoint.test.js:526` — only the first placeholder is checked; a dropped level passes. (CR3-4)
- **[low]** `.agents/scripts/backfill-story-issues.sh:52` — missing jq reads as "not a story". (CR3-5)
- **[cleanup]** `.agents/scripts/backfill-story-issues.sh:67` — milestone rebuilt by hand; `doc-id.js epic-meta` is the definition. (future)
- **[cleanup]** `tests/doc-id-chokepoint.test.js:519` — two dead lookbehinds.
- **[cleanup]** `tests/doc-id-chokepoint.test.js:498` — §5 header describes the retired deny-list.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0–1 | PASS | unchanged |
| Phase 2 | PASS | BUG-2 closed |
| Phase 3 | FAIL | BUG-6, BUG-3 |
| Phase 4 | PASS | |

---

## Success Criteria Verification

As cycle 2. "§7 population — zero unexplained hits" still **FAIL** (BUG-3).

---

## Breaking Changes Validation

None for consumers. **PASS.**

---

## Issues Found

### HIGH (1)
- **TASK-207-BUG-6** — [task.207.bug.6.ingester-placeholder-contract.md](./task.207.bug.6.ingester-placeholder-contract.md)

### MEDIUM (1)
- **TASK-207-BUG-3** (reopened) — [task.207.bug.3.review-epic-numbering-glob.md](./task.207.bug.3.review-epic-numbering-glob.md)

### LOW (2)
- CR3-4, CR3-5

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — FAIL
BUG-6: `/qa-fix` story-mode ingestion silently finds nothing.

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned — no boundary changed; gate 1's run record stands.
- **Probes executed**: 0 this cycle

### Maintainability — CONCERNS
BUG-3 reopened.

---

## Code Review

**Correctness bugs (5):** CR-1 [high/high] promoted (BUG-6); CR-2 [medium/high] promoted (BUG-3);
CR-3 [low/high] folded into BUG-3; CR-4 [low/medium]; CR-5 [low/medium].
**Cleanups (3):** CR-6 (future), CR-7, CR-8.

**Boundary:** unchanged since gate 1.

---

## Regression Testing

Fast gate on `26e783e4`: exit 0. **PASS.**

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH (BUG-6).
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` (cycle 3)
