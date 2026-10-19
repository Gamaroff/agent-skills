# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 5)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.5.numbered-prds-in-prd-skills.yml](./task.204.gate.5.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 5 (the last budgeted cycle) at `5ad0b163`, run as a safety re-probe because gate 4 carried a
containment finding. Gate 4's finding is fixed and verified. The re-probe enumerated every path the
two skills accept or compute and found the same containment class at three more sites. All three
reproduce. Gates 2–5 each found one more site of one rule; the pattern points at the follow-up the
gates already record — one containment predicate in `doc-id.js`, called by every block.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-4 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 keep block lacks realpath containment | ✅ FIXED | the symlink row runs keep; mutation-proven |
| Advisory CR-2 post-check-failed | ✅ FIXED | row "gate-4 CR-2…", mutation-proven |

## New Findings This Cycle

- **[medium, reviewer: high]** `skills/create-prd/SKILL.md:539` — the registry write follows a symlink; reproduced (a dangling `prd-registry.md` link created `outside/reg.md`). → **CR-1**
- **[medium, reviewer: high]** `skills/review-prd/SKILL.md:339` — text-only containment; a PRD file symlinked out of the root reads "numbering ok" (reproduced). → **CR-2**
- **[medium]** `skills/create-prd/SKILL.md:463` — the outside-root refusal sends the user to a migration that cannot fix it. → **CR-3**
- Advisory **[medium/medium]** `skills/shard-prd/SKILL.md:108` — `PRD_FILE` unguarded; the block does not enforce the prose refusal. (CR-4)

**Re-rating, measured**: `find docs/prd -type l` → 0; `git grep -n 'symlinkSync\|ln -s'` over the
six PRD skills → 0. No PRD in this repository is a symlink and no writer makes one, so a defect that
needs one is a real gap of medium reach, the rating gates 2–4 gave the same class. The reviewer's
`high` is kept beside each entry (`reviewer_severity`).

---

## Review Methodology

Re-review scope: unscoped (prior gate: security CONCERNS on containment — clause 1 false,
`SAFETY_REPROBE=true` by judgement). One Explore reviewer with the SAFETY RE-PROBE directive,
115 s (`duration_ms` 114567). Probe controls re-run: 24 executed, both engage.

## NFR Assessment

### Security — CONCERNS
- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 24
- CR-1, CR-2 (symlink-only containment gaps).

### Reliability — CONCERNS · Performance — PASS · Maintainability — PASS

## Code Review

Anchors: all `ok`. Provenance: new code in this diff.

- [high→medium/high] `skills/create-prd/SKILL.md:539` — registry write follows a symlink. **Promoted: CR-1.**
- [high→medium/high] `skills/review-prd/SKILL.md:339` — text-only containment. **Promoted: CR-2.**
- [medium/high] `skills/create-prd/SKILL.md:463` — refusal points at an impossible remedy. **Promoted: CR-3.**
- [medium/medium] `skills/shard-prd/SKILL.md:108` — unguarded `PRD_FILE` (advisory).

**Boundary**: `boundary: true`, `probes_executed: 24`.

## Final Assessment

**Gate Status**: CONCERNS — three medium. **Quality Score**: 70/100.
**Next Steps**: `/qa-fix` cycle 5, then the loop budget is spent.
