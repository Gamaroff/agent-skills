# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 4)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.4.numbered-prds-in-prd-skills.yml](./task.204.gate.4.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 at `96604439`, scoped to the three files changed since gate 3. Gate 3's finding and its four
advisories are fixed and verified. One reproduced medium: cycle 3's realpath containment was added
to the allocate and register blocks but not to the keep block, the third block that accepts a PRD
path — an enumeration miss.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-3 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 crashed checker reads as clean | ✅ FIXED | row "gate-3 CR-1…", mutation-proven |
| Advisory CR-2 keep layout | ✅ FIXED | row "gate-3 CR-2/CR-4…", mutation-proven |
| Advisory CR-3 plan that cannot run | ✅ FIXED | row "gate-3 CR-3…", mutation-proven |
| Advisory CR-4 unreadable FOUND_PRD | ✅ FIXED | row "gate-3 CR-2/CR-4…", mutation-proven |
| Advisory CR-5 symlinked domain | ⚠️ PARTIAL — allocate and register only | new CR-1 |

## New Findings This Cycle

- **[medium]** `skills/create-prd/SKILL.md:429` — keep block has no realpath containment; reproduced
  with `docs/prd/shop` symlinked out of the root (exit 0, "kept"). → **CR-1**, promoted.
- Advisory: CR-2 (`review-prd/SKILL.md:403`, medium confidence) — a `post-check-failed` answer
  carries no blockers list; CR-3 (cleanup) — the layout/containment predicate is written in three
  blocks.

---

## Review Methodology

Re-review scope: files changed since gate 3 (head eb14a639b657; 3 files) — default
(`SAFETY_REPROBE=false`: gate 3 security PASS, clause 1 false). One Explore reviewer, 75 s
(`duration_ms` 74663). Probe controls re-run: 24 executed, both engage.

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 24
- CR-1 is a containment gap in the keep block; the allocation controls engage
  (`task.204.qa.4.security.run.json`).

### Reliability — PASS · Performance — PASS · Maintainability — PASS

## Code Review

Anchors: all `ok`. Provenance: new code in this diff.

- [medium/high] `skills/create-prd/SKILL.md:429` — keep block lacks realpath containment. **Promoted: CR-1.**
- [medium/medium] `skills/review-prd/SKILL.md:403` — `post-check-failed` has no blockers list (advisory).
- Cleanup: `skills/create-prd/SKILL.md:430` — one predicate in three blocks (CR-3).

**Boundary**: `boundary: true`, `probes_executed: 24`.

## Final Assessment

**Gate Status**: CONCERNS — one medium. **Quality Score**: 90/100. **Next Steps**: `/qa-fix` cycle 4.
