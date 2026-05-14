---
epic_number: 2
title: "Worked PRD / Epic / Story Examples"
domain: "onboarding"
status: "✅ Accepted"
priority: "Medium"
estimated_stories: 4
created: 2026-05-11
target_completion: 2026-06-22
accepted: 2026-05-14
notes: "Story 2.3 (capture-story-messy-path) descoped; remaining 3 stories accepted."
prd_source: "docs/prd/onboarding/prd.onboarding.md"
github_issue: 74
github_url: "https://github.com/Gamaroff/agent-skills/issues/74"
---

# Epic 2: Worked PRD / Epic / Story Examples — Brownfield Enhancement

## Epic Goal

Eliminate the "no story/epic/PRD examples live here" caveat from `examples/README.md` by capturing real artifacts produced by *this very dogfood run* as worked examples — meta-dogfooding.

## Epic Description

**Existing System Context:**

- Current relevant functionality: `examples/README.md` documents task artifacts only (task.6 walkthrough). Explicitly states no PRD/epic/story examples exist.
- Technology stack: Markdown docs + skill outputs (PRD, epic, story, review, QA, gate, DoD artifacts).
- Integration points: This epic *consumes* the outputs of running Epics 1, 3, 4 through the story pipeline.

**Enhancement Details:**

- What's being added/changed: Add `examples/prd-example/`, `examples/epic-examples/`, `examples/story-messy-path/` directories — each populated with **real, unedited pipeline outputs** plus a narrative README.
- How it integrates: Captured artifacts are copies (or symlinks — TBD during dev) of the canonical files in `docs/prd/onboarding/`. The canonicals remain authoritative.
- Success criteria: `examples/README.md` removes the caveat; new reader can land in `examples/` and find a worked PRD, four worked epics, and one full story lifecycle including a real QA-gate FAIL.

## Stories Breakdown

**Epic Story Guidelines:**

- **User-Value First:** Each story delivers a complete worked example a reader can study standalone.
- **No Forward Dependencies:** Stories 2.1–2.3 are independent captures. Story 2.4 (README update) depends on 2.1–2.3 outputs existing.
- **Incremental Setup:** No new directories beyond what each story needs.

**Sequencing constraint:** Epic 2 stories run **last** in the overall PRD execution — they consume artifacts produced by Epics 1, 3, and 4. Within Epic 2: 2.1, 2.2, 2.3 in any order; 2.4 last.

### Stories Overview

| Story | Status         | Priority | Description                                                                          |
| ----- | -------------- | -------- | ------------------------------------------------------------------------------------ |
| 2.1   | ❌ Not Started | High     | Capture this PRD as the worked PRD example with narrative README                     |
| 2.2   | ❌ Not Started | High     | Capture all 4 epic docs as worked epic examples                                      |
| 2.3   | ❌ Not Started | High     | Capture a real story that failed `qa-gate` and was revised (messy path)              |
| 2.4   | ❌ Not Started | Medium   | Update `examples/README.md` to cross-link new PRD/epic/story examples; remove caveat |

### Story 2.1: Capture this PRD as the worked PRD example

As a future user authoring their first PRD,
I want to see a real PRD that went through the full pipeline,
so that I have a concrete reference for tone, depth, and section shape.

**Acceptance Criteria:**

1. `examples/prd-example/` directory contains a copy (or symlink — decide during dev) of `docs/prd/onboarding/prd.onboarding.md`.
2. `examples/prd-example/README.md` narrates the PRD: what was easy, what required iteration, what `pm-checklist` flagged.
3. Frontmatter on the captured PRD records the skill version that produced it (so staleness is detectable).

### Story 2.2: Capture each epic doc as worked epic examples

As a future user authoring their first epic,
I want to see four real epic docs side-by-side,
so that I can pattern-match across them.

**Acceptance Criteria:**

1. `examples/epic-examples/` contains the four epic docs produced by this PRD's `/create-epic` runs (Epic 1 through Epic 4).
2. A short index `examples/epic-examples/README.md` explains the relationship to the parent PRD and links to each epic's story list.
3. Frontmatter on each captured epic records skill version + date produced.

### Story 2.3: Capture a story with the messy path

As a future user encountering their first QA-gate FAIL,
I want to see a real story that failed `qa-gate` and was revised,
so that the "messy path" is visible, not just the happy path.

**Acceptance Criteria:**

1. `examples/story-messy-path/` contains: the original story doc, the `qa-gate` FAIL artifact, the revision diff (or revised story doc), and the eventual PASS gate.
2. A narrative `examples/story-messy-path/README.md` explains what triggered the FAIL and what the revision did.
3. The story used is one that genuinely failed QA during this PRD's run — do not manufacture a failure.

### Story 2.4: Update `examples/README.md`

As a visitor to `examples/`,
I want the README to point at PRD, epic, and story examples alongside the existing task examples,
so that the "no story/epic/PRD examples live here" caveat is removed.

**Acceptance Criteria:**

1. `examples/README.md` updated: caveat removed, new sections added for PRD / epic / story examples with the same depth as the existing task walkthrough.
2. Skill-to-artifact lookup table extended to include `create-prd`, `create-epic`, `create-story`, `develop-story`.
3. Featured walkthrough remains task.6 but a parallel "story walkthrough" entry added pointing at the canonical story produced by this PRD's run.

## Compatibility Requirements

- [x] Existing APIs remain unchanged — N/A (docs-only)
- [x] Database schema changes backward compatible — N/A
- [x] UI changes follow existing patterns — captured artifacts retain their canonical formatting verbatim; `examples/README.md` extensions match existing task-walkthrough style
- [x] Performance impact minimal — docs only

## Risk Mitigation

- **Primary Risk:** Captured artifacts go stale as skills evolve, breaking the "verbatim output" guarantee promised by FR5/NFR6 of the parent PRD.
- **Mitigation:** Each captured file records the skill version in frontmatter. A follow-up task (filed separately) extends `documentation-standards-validator` to flag stale captures.
- **Rollback Plan:** Revert PR. Canonical artifacts under `docs/prd/onboarding/` are unaffected — examples are copies.

## Definition of Done

- [ ] All 4 stories completed
- [ ] `examples/README.md` no longer says "no story/epic/PRD examples live here"
- [ ] All captured artifacts have skill-version frontmatter
- [ ] All cross-links resolve
- [ ] `documentation-standards-validator` passes
- [x] ~~Story 2.3 messy-path is real (provenance traceable to a specific QA-gate FAIL in this PRD's run)~~ — **N/A**: Story 2.3 descoped 2026-05-13; no genuine QA-gate FAIL occurred in Epics 1, 3, or 4. See story.2.3 Change Log v1.3.

## Completion Tracking

**Epic Progress**: 0% (0/4 stories complete)

**Timeline**:

- **Started**: TBD
- **Target**: 2026-06-22
- **Completed**: TBD

**Story Completion**:

- Story 2.1: ❌ Not Started
- Story 2.2: ❌ Not Started
- Story 2.3: 🚫 Cancelled (descoped — no real QA-gate FAIL found; DoD checkbox N/A)
- Story 2.4: ❌ Not Started
