# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 3)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.3.numbered-prds-in-prd-skills.yml](./task.204.gate.3.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 at `eb14a639`, run as a safety re-probe because gate 2 carried a path-escape finding. Gate
2's four findings are fixed and verified. The `DOMAIN` boundary is closed: a new probe control
refuses all 11 hostile values. One reproduced medium remains (a crashed numbering checker reports
nothing and exits 0); four further findings are advisory.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 PRD file not owning its directory absorbs others' findings | ✅ FIXED | row "gate-2 CR-1/CR-2: a PRD file that does not own…" (index.md, flat legacy), mutation-proven |
| CR-2 PRD file itself never checked | ✅ FIXED | row "gate-2 CR-2: a file the corpus walk skips…", mutation-proven |
| CR-3 full-stem input | ✅ FIXED | row "gate-2 CR-3: a full stem resolves…", mutation-proven |
| CR-5 DOMAIN unvalidated | ✅ FIXED | row "gate-2 CR-5: a domain that is not…"; probe control `create-prd-allocate-domain`, 13 cases, engages |

## New Findings This Cycle

- **[medium]** `skills/review-prd/SKILL.md:369` — a numbering checker that crashes (e.g. `doc-id.js` missing) gives empty output under exit 1; the findings branch prints nothing and the block exits 0. Reproduced in a consumer root without `doc-id.js`. → **CR-1**, promoted.
- Advisory (medium confidence or low): CR-2 keep block does not check `FOUND_PRD`'s layout; CR-3 a migration plan that could not run reads like "no blockers"; CR-4 an unreadable `FOUND_PRD` reads as "needs migration"; CR-5 a symlinked existing domain directory is not realpath-checked.

Searched unscoped (safety re-probe): full `origin/develop...HEAD` diff, vendored copies excluded,
38 files; the reviewer enumerated the inputs of every create-prd and review-prd block (TITLE,
PRD_ROOT, symlinks, `..` inside PRD_INPUT / PRD_FILE / FOUND_PRD, files outside the repo).

---

## Review Methodology

Re-review scope: unscoped (prior gate: security CONCERNS on a path escape — clause 1 `false`,
`SAFETY_REPROBE=true` by judgement). One Explore reviewer with the SAFETY RE-PROBE directive; 123 s
(completion notice `duration_ms` 123267). qa-task steps run by the orchestrator from the
already-loaded skill text.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 24
- Controls `create-prd-allocate-slug` (11) and `create-prd-allocate-domain` (13), both `engages`
  (`task.204.qa.3.security.run.json`). CR-5 (advisory, low confidence) names the one residual: an
  existing symlinked domain directory.

### Reliability — CONCERNS
CR-1; advisory CR-3, CR-4.

### Performance — PASS · Maintainability — PASS

---

## Code Review

Anchors: all `ok`. Provenance: every finding is in a block this diff adds.

**Correctness bugs (5):**
- [medium/high] `skills/review-prd/SKILL.md:369` — crashed checker reads as no findings. **Promoted: CR-1.**
- [medium/medium] `skills/create-prd/SKILL.md:417` — keep block does not check `FOUND_PRD`'s layout.
- [medium/medium] `skills/review-prd/SKILL.md:394` — migration plan never prints `.error` or checks its exit.
- [low/medium] `skills/create-prd/SKILL.md:422` — unreadable `FOUND_PRD` reported as legacy.
- [low/low] `skills/create-prd/SKILL.md:349` — symlinked domain directory.

**Cleanups (0).** **Boundary**: `boundary: true`, `probes_executed: 24`.

---

## Final Assessment

**Gate Status**: CONCERNS — one medium. **Quality Score**: 90/100.
**Next Steps**: `/qa-fix` cycle 3.
