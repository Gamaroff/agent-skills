# QA Report: Task 204 - Numbered PRDs in the PRD skills (cycle 9)

**Task**: [task.204.numbered-prds-in-prd-skills.md](./task.204.numbered-prds-in-prd-skills.md)
**Gate File**: [task.204.gate.9.numbered-prds-in-prd-skills.yml](./task.204.gate.9.numbered-prds-in-prd-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 9 at `a8810b54`, re-entered at 5a after `/finalise` DoD 1 found gaps (CI red on the
stdout-drain guard, CHANGELOG, two reference docs, CQ4). The DoD fixes hold. The scoped review found
two reproduced mediums and two lows, all in what this branch added since gate 8.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-8 / DoD-1 finding | Status | Evidence |
| --- | --- | --- |
| Gate 8 CR-1, CR-3 (apply undo; several --name) | ✅ FIXED | gate-8 row |
| Gate 8 CR-2, CR-4, CR-5 (engine shapes) | ✅ GUARDED — engine fixes are task.211 | gate-8 row; see new CR-1 |
| DoD 1: CI red (stdout-drain guard) | ✅ FIXED | `stdout-drain-on-exit.test.mjs` green; red on the `63c1e06b` version |
| DoD 1: CHANGELOG, reference docs, CQ4 | ✅ FIXED (PRD paths) / ⚠️ PARTIAL (epic/story paths — new CR-2) | `a8810b54` |

## New Findings This Cycle

- **[medium]** `skills/review-prd/scripts/migration-guard.mjs:88` — outside-links matches any mention of the basename; a consumer that commits its vendored skills can never migrate `docs/prd.md` (**CR-1**).
- **[medium]** `docs/reference/configuration.md:21` — epic and story paths still pre-numbering beside the corrected PRD path; also quickstart-story.md, pipeline-artifacts.md:14, story-development.md:115 (**CR-2**).
- **[medium, medium confidence]** `skills/review-prd/SKILL.md:418` — `MIG_NAME` is read but bound in neither block (CR-3, advisory).
- **[low]** `skills/review-prd/SKILL.md:590` — jq precedence drops the guard's usage error (**CR-4**).
- **[low]** `skills/review-prd/scripts/migration-guard.mjs:81` — only `.` escaped in the ERE (**CR-5**).

---

## Review Methodology

Re-review scope: files changed since gate 8 (head `80542c82e86e`; 6 files outside the task directory) —
default. `SAFETY_REPROBE=false` (gate 8 security PASS). One Explore reviewer; 227 s (completion notice
`duration_ms` 226812). qa-task steps run by the orchestrator from the loaded skill text.

---

## NFR Assessment

### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 24
- Both allocation controls engage (`task.204.qa.9.security.run.json`).

### Reliability — CONCERNS · Maintainability — CONCERNS · Performance — PASS

---

## Code Review

Promoted (bug + high confidence): CR-1, CR-2, CR-4, CR-5. Advisory: CR-3. **Boundary**: `boundary: true`, `probes_executed: 24`.

---

## Regression Testing

At `a8810b54` with every new file staged and `.agents/skills` parked: `npm run ci:fast` 5716 pass / 0 fail;
`prd-skill-numbering.test.mjs` 40/40; `stdout-drain-on-exit.test.mjs` 10/10.

---

## Final Assessment

**Gate Status**: CONCERNS — two medium, two low. **Quality Score**: 80/100.
**Next Steps**: `/qa-fix` cycle 9.
