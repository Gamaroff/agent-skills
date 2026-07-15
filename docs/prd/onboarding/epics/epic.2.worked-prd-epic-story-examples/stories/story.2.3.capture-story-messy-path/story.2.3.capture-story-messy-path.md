---
id: story.2.3.capture-story-messy-path
title: "[Story 2.3] Capture a story with the messy path (real QA-gate FAIL → PASS)"
type: story
status: cancelled
priority: high
epic: 2
epic_file: ../../epic.2.worked-prd-epic-story-examples.md
prd_source: docs/prd/onboarding/prd.onboarding.md
jira_key: null
jira_url: null
github_issue: 94
github_url: https://github.com/Gamaroff/agent-skills/issues/94
created: 2026-05-11
updated: 2026-05-13
---

# [Story 2.3] Capture a story with the messy path

**Status**: Cancelled
**Review**: ✅ Critical/Important recommendations from `story.2.3.review.1.capture-story-messy-path.md` implemented 2026-05-13

## Story Statement

**As a** future user encountering their first QA-gate FAIL,
**I want** to see a real story that failed `qa-gate` and was revised,
**so that** the messy path is visible, not just the happy path.

## Acceptance Criteria

1. `examples/story-messy-path/` contains: the original story doc, the `qa-gate` FAIL artifact, the revision diff (or revised story doc), and the eventual `qa-gate` PASS artifact.
2. `examples/story-messy-path/README.md` narrates what triggered the FAIL and what the revision did.
3. The story used is one that **genuinely failed QA** during this PRD's pipeline run — do not manufacture a failure. Each captured file carries the 4-field provenance schema established by Stories 2.1/2.2: `captured_skill_version`, `captured_date`, `source_sha`, `source_path`. `source_sha` resolves to a real commit; `source_path` resolves to a real file under `docs/prd/onboarding/`.

## Dev Notes

### Previous Story Insights

- Stories 2.1 + 2.2 establish the **4-field provenance schema** (`captured_skill_version`, `captured_date`, `source_sha`, `source_path`) + narrative-README pattern. Reuse verbatim on each captured file in this story.
- This story is **provenance-gated**: it cannot be developed until at least one story from Epic 1, 3, or 4 has gone through a real QA-gate FAIL → PASS cycle. If no FAIL occurs naturally by the time Epic 2 runs, this story stalls and is **descoped** rather than manufactured.
- **Descope → Epic 2 DoD**: if descoped, mark the Epic 2 DoD checkbox "Story 2.3 messy-path is real" as **N/A** with a link to the cancellation Change Log entry. Epic 2 can still reach `accepted` with 2.3 cancelled.
- **AC1 extends Epic 2.AC1** with a `revision.md` (or equivalent diff) capturing the fix step, not just the failure. Mirrors Story 2.2 review precedent of documenting AC expansions.

### File Locations

- **New dir:** `examples/story-messy-path/`
  - `story.<E>.<S>.<name>.md` (original)
  - `story.<E>.<S>.gate.{n-fail}.<name>.yml` (FAIL gate)
  - `story.<E>.<S>.gate.{n-pass}.<name>.yml` (PASS gate)
  - `story.<E>.<S>.revision.md` (revision narrative or diff)
  - `README.md` (narrative)
- **Sources:** wherever the genuinely-failed story lives under `docs/prd/onboarding/epics/epic.*/stories/`.

### Testing Requirements

- Static validator.
- Provenance verification: `source_path` field in each captured file resolves to a real path under `docs/prd/onboarding/`, and `source_sha` resolves to a real commit.

### Manual Testing Steps

**Verification steps:**
- **AC1:** dir contains 4+ files (original story, FAIL gate, PASS gate, revision artifact).
- **AC2:** README has 2 sections — "What triggered the FAIL" and "What the revision did" — each with concrete pointers to lines/files.
- **AC3:** `git log --follow` on the captured original story file shows real QA-gate FAIL → PASS commits. Identify them by gate YAML filename pattern: commits touching `*.gate.{n}.*.yml` files; the FAIL commit's YAML carries `verdict: FAIL`, the PASS commit's YAML carries `verdict: PASS`. `source_sha` in each captured file's provenance frontmatter points at the corresponding commit.

**Edge cases:**
- If no genuine FAIL has occurred by Epic 2 development time, **descope** this story; mark status `cancelled` per `docs/standards/document-status-lifecycle.md`; document the descope decision in the story's Change Log; and mark the Epic 2 DoD checkbox "Story 2.3 messy-path is real" as **N/A** with a link to that Change Log entry. Do NOT manufacture a failure.
- Multiple FAILs may exist — pick the most pedagogically valuable (clearest cause, cleanest fix). Reasoning recorded in narrative README.

### Rollback Plan

- **What to revert:** `examples/story-messy-path/`.
- **Revert steps:** revert PR.
- **Impact:** users without messy-path example fall back to the happy-path story-walkthrough.
- **Rollback complexity:** Simple.

### Technical Constraints

- AC3 is the hard constraint — real provenance only.
- Captured gate YAMLs preserved verbatim including timestamps.

### Git History Insights

- Watch the PR runs of Epics 1, 3, 4 develop-story chains for actual QA-gate FAIL events. The `qa-fix` loop iterations in `develop-story` are the natural source.

### Project Structure Notes

No conflicts.

## Tasks / Subtasks

> Detailed implementation guide: [story.2.3.plan.capture-story-messy-path.md](story.2.3.plan.capture-story-messy-path.md)

- [x] **Task 1**: Survey accepted stories from Epics 1, 3, 4 for QA-gate FAIL artifacts; pick the strongest pedagogical case (AC: 3)
- [x] **Task 2**: If no genuine FAIL exists → descope this story; mark `cancelled`; record decision in Change Log; STOP.
- [ ] ~~**Task 3**: Create `examples/story-messy-path/` and copy original story + FAIL gate + PASS gate + revision artifact (AC: 1, 3)~~ — skipped (descoped)
- [ ] ~~**Task 4**: Add provenance frontmatter to captured copies (AC: 3)~~ — skipped (descoped)
- [ ] ~~**Task 5**: Draft narrative `README.md` (AC: 2)~~ — skipped (descoped)
- [ ] ~~**Task 6**: Static validation + provenance verification + status flip (AC: all)~~ — skipped (descoped)

## Testing

- Provenance check via `git log --follow` (gating).
- Static validator.

## Change Log

| Date       | Version | Description                          | Author        |
|------------|---------|--------------------------------------|---------------|
| 2026-05-11 | 1.0     | Initial draft via dogfood `/create-story` | scrum-master  |
| 2026-05-13 | 1.1     | Review #1 fixes: align AC3 with 4-field provenance schema; specify FAIL/PASS commit identification via gate YAML pattern; document descope→Epic 2 DoD N/A convention | review-story  |
| 2026-05-13 | 1.2     | Status flipped to Ready for Development after review residue cleanup (Testing section field-name fix) | review-story  |
| 2026-05-13 | 1.3     | **DESCOPED**: No genuine QA-gate FAIL found in Epics 1, 3, 4 (all stories gated PASS or WAIVED on first cycle). Story cancelled per Dev Notes descope protocol. Epic 2 DoD checkbox "Story 2.3 messy-path is real" marked N/A — see this entry. | develop-story |

## QA Testing Results

**QA Status**: ✅ PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-13
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report

- **Full Report**: [story.2.3.qa.1.capture-story-messy-path-descoped.md](./story.2.3.qa.1.capture-story-messy-path-descoped.md)
- **Gate File**: [story.2.3.gate.1.capture-story-messy-path-descoped.yml](./story.2.3.gate.1.capture-story-messy-path-descoped.yml)

### Test Coverage Summary

- **Acceptance Criteria Tested**: AC3 ✅ (AC1, AC2 N/A — descoped)
- **Tests Executed**: 0 (documentation-only)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Story correctly executed its provenance-gate descope protocol. Survey confirmed 0 genuine QA-gate FAILs across 7 stories in Epics 1–4. Epic 2 DoD checkbox properly annotated N/A.

---

## Dev Agent Record / QA Handoff / QA Report / Bug Reports

### Implementation Summary

Story descoped per the provenance-gate rule documented in Dev Notes. No genuine QA-gate FAIL artifact was found across any accepted story in Epics 1, 3, or 4. Cancellation recorded in Change Log v1.3. Epic 2 DoD checkbox updated N/A.

### Start Date: 2026-05-13
### Completion Date: 2026-05-13

### Implementation Approach

**Task 1 — Survey result:**

Surveyed all gate YAML files under `docs/prd/onboarding/epics/`:

| Story | Gate file | Verdict |
|-------|-----------|---------|
| 1.1 | story.1.1.gate.1.quickstart-walkthrough.yml | WAIVED |
| 1.2 | story.1.2.gate.1.first-story-in-60-minutes.yml | PASS |
| 1.3 | story.1.3.gate.1.decision-tree-which-path.yml | PASS |
| 1.4 | story.1.4.gate.1.rewrite-getting-started-terminus.yml | PASS |
| 1.5 | story.1.5.gate.1.readme-start-here-callout.yml | PASS |
| 2.1 | story.2.1.gate.1.capture-prd-as-worked-example.yml | PASS |
| 2.2 | story.2.2.gate.1.capture-epics-as-worked-examples.yml | PASS |

No `gate: FAIL` verdict found. Epics 3 and 4 have no developed stories yet.

Git log search for "qa-fix" on stories (not tasks): only story 1.1 had a qa-fix step, and its initial gate was `CONCERNS` (not `FAIL`), ultimately resolved as `WAIVED` — not a FAIL → PASS cycle.

**Task 2 — Descope execution:**

- Status set to `cancelled`
- Change Log v1.3 entry added with rationale
- Epic 2 DoD checkbox "Story 2.3 messy-path is real" updated to N/A
- Tasks 3–6 struck through (skipped)

### Testing Results

N/A — descoped; no files created.

### File List

No files created or modified beyond the story file itself.

### Deferred Work

If a future story run in Epics 3 or 4 produces a genuine `gate: FAIL`, a new story (or a re-open of this one) could capture it. The provenance schema and README pattern are documented in Stories 2.1/2.2 and ready to use.

### QA Prerequisites Checklist

- [x] FAIL provenance verified via git history — confirmed: no FAIL gate exists
- [x] All 4 captured files present (or story descoped with rationale) — descoped with rationale
- [ ] ~~README narrative names specific cause + fix~~ — N/A (descoped)
- [ ] ~~Provenance frontmatters complete~~ — N/A (descoped)

## Definition of Done — PASSED ✅

**Status:** ACCEPTED (Cancelled/Descoped)
**Acceptance Date:** 2026-05-13

### QA Report Summary

**QA Report**: `story.2.3.qa.1.capture-story-messy-path-descoped.md`
**Gate File**: `story.2.3.gate.1.capture-story-messy-path-descoped.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All applicable Definition of Done criteria verified:

✅ **Acceptance Criteria:** AC3 PASS (no manufactured failure); AC1/AC2 N/A (correctly descoped per provenance-gate rule)
✅ **Documentation:** Change Log v1.0–v1.3 complete; Implementation Summary with survey table + descope rationale
✅ **Epic DoD:** Checkbox "Story 2.3 messy-path is real" annotated N/A with link to Change Log v1.3
✅ **Security:** N/A — zero code changes (documentation-only PR)
✅ **Compliance:** N/A — zero code changes

**Story marked as complete on:** 2026-05-13
**PR:** #103 — https://github.com/Gamaroff/agent-skills/pull/103

**Detailed Verification Log:** See `story.2.3.dod.1.capture-story-messy-path.md`
