# QA Report: Task 207 - Doc numbering enforcement and sweep (cycle 4)

**Task**: [Link to task document](./task.207.doc-numbering-enforcement-and-sweep.md)
**Gate File**: [task.207.gate.4.doc-numbering-enforcement-and-sweep.yml](./task.207.gate.4.doc-numbering-enforcement-and-sweep.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 at head `763f1d8c`. No HIGH. The title-form sweep and the ingester rename hold, but the
sweep's population still stops at Markdown — the PRD YAML templates and two config comments render
flat titles and paths (BUG-3 reopened) — and the ingester's binding lists do not say how a
sub-story's `<S>` is formed (BUG-6 reopened).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Finding | Cycle 3 | Status now | Evidence |
| --- | --- | --- | --- |
| TASK-207-BUG-6 ingester placeholder contract | HIGH | ⚠️ PARTIAL | lists renamed and tested; `<S>` source wrong for a sub-story (CR-3) |
| TASK-207-BUG-3 title-form placeholders | MEDIUM | ⚠️ PARTIAL | Markdown clean; YAML templates and config comments flat (CR-1) |
| CR3-5 backfill jq | LOW | ✅ FIXED | `command -v jq` guard |

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 3 (head 26e783e40f2c; 19 files) — default. One Explore
reviewer, dispatched 17:46:29Z, `duration_ms` 156229; it ran both test files (15/15).
`SAFETY_REPROBE=false`.

Convergence check: HIGH `1, 1, 0` — no trip (`HIGH_N = 0`). Route classifier: Diminishing-returns
needs two consecutive HIGH-0 gates (only one); Cosmetic-residue is PASS-only. → 5b.

---

## New Findings This Cycle

- **[medium]** `skills/prd-template/resources/prd-tmpl.yaml:153` — flat `[Epic {{epic_number}}]` / `[Story {{epic_number}}.{{story_number}}]`; `brownfield-prd-tmpl.yaml:249,269`; `skills-config.yaml:9`; `core-config-reference.yaml:22` ×2. (BUG-3)
- **[medium]** `skills/qa-fix/SKILL.md:376` — `<S>` described as parse's story number "carrying its letter"; parse returns `story` and `sub` apart. Verified: `doc-id.js parse story.1.2.3A.x.md` → `{"story":3,"sub":"A"}`. (BUG-6)
- **[low]** `skills/documentation-standards-validator/references/story-template.md:600` — bare `[Epic N]`.
- **[low]** `skills/qa-story/SKILL.md:102` — flat example `story.336.1`.
- **[medium/high, pre-existing]** `skills/create-epic/SKILL.md:375` — "or the frontmatter `milestone:` value" override is not read by `epicMeta`; the clause is on `origin/develop` unchanged → future.
- **[cleanup]** `tests/ingester-prompt-placeholders.test.js:61` — `section()` runs to the next H2.
- **[cleanup]** `.agents/scripts/backfill-story-issues.sh:71` — milestone rebuilt by hand; `doc-id.js epic-meta` is the definition.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 0–2 | PASS | |
| Phase 3 | CONCERNS | BUG-3, BUG-6 |
| Phase 4 | PASS | |

---

## Success Criteria Verification

"§7 population — zero unexplained hits" **CONCERNS** — YAML residues. Others PASS.

---

## Breaking Changes Validation

None for consumers. **PASS.**

---

## Issues Found

### MEDIUM (2)
- **TASK-207-BUG-3** (reopened) — [task.207.bug.3.review-epic-numbering-glob.md](./task.207.bug.3.review-epic-numbering-glob.md)
- **TASK-207-BUG-6** (reopened) — [task.207.bug.6.ingester-placeholder-contract.md](./task.207.bug.6.ingester-placeholder-contract.md)

### LOW (2)
- CR4-4, CR4-5

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
BUG-6.
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned — no boundary changed; gate 1's run record stands.
- **Probes executed**: 0 this cycle
### Maintainability — CONCERNS
BUG-3.

---

## Code Review

**Correctness bugs (5):** CR-1 [medium/high] promoted (BUG-3); CR-2 [medium/high] pre-existing → future; CR-3 [medium/medium] promoted after verification (BUG-6); CR-4, CR-5 [low].
**Cleanups (2):** CR-6, CR-7.

---

## Regression Testing

Fast gate on `763f1d8c`: exit 0. **PASS.**

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL

**Next Steps**: `/qa-fix` (cycle 4)
