---
name: prd.onboarding
title: agent-skills Brownfield Enhancement PRD — Onboarding & Tutorials
description: Bridge the gap between "skills installed" and "shipped first feature" via guided quickstarts, worked PRD/epic/story examples produced by dogfooding the develop-story pipeline, runbook tutorial wrappers, and a first-week learning path.
type: prd
mode: brownfield
status: draft
version: 0.1.0
created: 2026-05-11
author: dogfood-pipeline-run
source_plan: ~/.claude/plans/i-want-to-dogfood-concurrent-sparkle.md
stepsCompleted: [intro-analysis, requirements, technical-constraints, epic-structure, epic-details]
---

# agent-skills Brownfield Enhancement PRD — Onboarding & Tutorials

## 1. Intro Project Analysis and Context

### 1.1 Existing Project Overview

**Analysis Source:** IDE-based fresh analysis (no prior `document-existing-project` run). Pre-flight exploration recorded in [`~/.claude/plans/i-want-to-dogfood-concurrent-sparkle.md`](../../../.claude/plans/i-want-to-dogfood-concurrent-sparkle.md).

**Current Project State:** `agent-skills` is a library of modular agent skills — self-contained packages (SKILL.md + scripts + references + assets) that extend AI coding agents with domain workflows. Skills are distributed via `.zip` packages and an `npx skills add` installer. The repo dogfoods its own **task** pipeline (`create-task` → `develop-task` → `qa-task` → `finalise`) against itself — see `docs/tasks/` (34 task directories). The **story** pipeline (`create-prd` → `create-epic` → `create-story` → `develop-story`) has never been exercised against this repo.

### 1.2 Available Documentation Analysis

- [x] Tech Stack — implicit (Node ≥ 20, Python scaffolders, npm scripts; no formal stack doc)
- [x] Source Tree / Architecture — covered by [`AGENTS.md`](../../../AGENTS.md) + [`docs/concepts/architecture.md`](../../concepts/architecture.md)
- [x] Coding Standards — [`docs/standards/`](../../standards/) (file naming, status lifecycle, plan locations, registries)
- [ ] API Documentation — N/A (library, no API surface)
- [ ] External API Documentation — N/A
- [ ] UX/UI Guidelines — N/A (documentation-shaped product)
- [ ] Technical Debt Documentation — none formal
- [x] Other: [`docs/runbooks/`](../../runbooks/), [`docs/operations/workflows.md`](../../operations/workflows.md), [`docs/reference/`](../../reference/), [`examples/README.md`](../../../examples/README.md)

> No `document-existing-project` output exists. Pre-flight exploration was sufficient because the repo is documentation-heavy and self-describing; a full `document-existing-project` pass is recommended before any architectural PRDs, but not blocking for this onboarding-shaped one.

### 1.3 Enhancement Scope Definition

- **Enhancement Type:** UI/UX Overhaul (where "UI" = the documentation surface that users navigate)
- **Enhancement Description:** Add a guided onboarding path — quickstarts, decision tree, worked PRD/epic/story examples (produced by dogfooding the story pipeline on this very PRD), runbook tutorial wrappers, and a first-week learning path — so new users can ship their first task in ≤ 10 minutes and first story in ≤ 60 minutes without leaving onboarding docs.
- **Impact Assessment:** Moderate Impact. Net-new docs under `docs/concepts/`, `docs/prd/`, `docs/epics/`, `docs/stories/`. Light edits to `README.md`, `docs/concepts/getting-started.md`, `examples/README.md`. No skill code changes.

### 1.4 Goals and Background Context

**Goals**

- New user lands on `README.md` and reaches a runnable `/create-task` invocation in ≤ 60 seconds.
- New user ships first task (any path) end-to-end in ≤ 10 minutes following `quickstart-task.md`.
- New user ships first story end-to-end in ≤ 60 minutes following `quickstart-story.md`.
- `examples/` directory contains at least one worked PRD, four worked epics, and one full story lifecycle (including a failed-QA-and-revised story) — fixing the explicit gap noted in `examples/README.md`.
- The story pipeline (`/create-prd` through `/develop-story`) is dogfooded on this repo; any pipeline bugs surfaced during the run are filed as tasks against the task pipeline.

**Background**

The repo ships 124+ skills, including the full PRD → epic → story → develop-story chain, but has never run that chain against itself — only the task pipeline has been dogfooded (34 tasks in `docs/tasks/`). This is a credibility gap.

The repo also has a real product gap: docs are reference-shaped. `docs/concepts/getting-started.md` terminates at "read the runbooks." Anchor runbooks (`story-development.md` at 274 lines) are intimidating cold entry points. Satellite runbooks (51–96 lines) are too lean. The word `tutorial` appears zero times across the docs; `quickstart` appears zero times. `examples/README.md` explicitly states no PRD/epic/story examples exist.

Solving the onboarding gap **by dogfooding the story pipeline** kills both birds: the artifacts produced during the run *become* the worked examples the onboarding work calls for. This is meta-dogfooding — the deliverables of the work prove the pipeline that produced them.

### 1.5 Change Log

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial draft | 2026-05-11 | 0.1.0 | First PRD produced by dogfooded `/create-prd` brownfield run | dogfood-pipeline |

## 2. Requirements

### 2.1 Functional Requirements

- **FR1:** A new user can open `README.md` and find a "Start here" callout that links to a decision tree (task vs. story vs. hotfix vs. parallel) within the first viewport.
- **FR2:** `docs/concepts/quickstart-task.md` provides a step-by-step walkthrough that, when followed verbatim on a clean clone, produces a complete task artifact set (spec → plan → implementation report → QA → gate → DoD) in ≤ 10 minutes of wall time.
- **FR3:** `docs/concepts/quickstart-story.md` provides a step-by-step walkthrough that, when followed verbatim, produces a complete story artifact set (PRD reference → epic → story → review → develop → PR → QA → gate → DoD → sprint review) in ≤ 60 minutes of wall time.
- **FR4:** `docs/concepts/which-path.md` presents a decision tree that maps user intent ("ship a feature", "fix a bug", "refactor", "parallel work") to the correct skill entry point (`/create-story`, `/create-branch --hotfix`, `/create-task`, `/create-parallel-stories`).
- **FR5:** `examples/` contains at least one worked PRD example (this PRD itself, narrated), four worked epic examples (one per epic in this PRD), and one full story lifecycle including a story that failed `qa-gate` and was revised.
- **FR6:** Each anchor runbook (`story-development.md`, `task-development.md`) gains a "Before you start" prerequisite section and a "Common first-time errors" troubleshooting section, without rewriting the existing reference body.
- **FR7:** Each satellite runbook (`hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, `change-management.md`) gains an "Is this the right runbook?" decision callout at the top.
- **FR8:** `docs/runbooks/first-week.md` indexes a four-day guided learning path (Day 1 tasks → Day 2 stories → Day 3 review/QA failures → Day 4 parallel + change-mgmt) with measurable completion criteria per day.

### 2.2 Non-Functional Requirements

- **NFR1:** All new documentation files comply with `docs/standards/file-naming.md` and pass the `documentation-standards-validator` skill — verified on every PR.
- **NFR2:** All frontmatter `status:` values follow `docs/standards/document-status-lifecycle.md` (`draft → planned → ready-for-development → in-progress → ready-for-review → accepted`) — verified on every PR.
- **NFR3:** Quickstart walkthroughs execute end-to-end on macOS (zsh) and Linux (bash) with no manual intervention beyond the documented commands — verified by walking the path on a clean clone before merging the closing story of each epic.
- **NFR4:** No new documentation file exceeds 400 lines without being split — keeps cold-entry-point cognitive load bounded. Existing >400-line files (e.g. `story-development.md` at 274 lines) are exempted from this NFR retroactively; the rule applies only to net-new files.
- **NFR5:** Total documentation added across all four epics stays under 4,000 lines — scope ceiling to prevent sprawl.
- **NFR6:** The `examples/` worked artifacts are real outputs of the dogfooded pipeline run, not hand-crafted demos — each file is committed exactly as the pipeline emitted it (modulo path moves into `examples/`).

### 2.3 Compatibility Requirements

- **CR1 (existing API compatibility):** N/A — this PRD adds documentation only; no code APIs, no `SKILL.md` frontmatter contracts, and no slash-command signatures change.
- **CR2 (database / persistent schema compatibility):** Two registry files are touched: `docs/epic-registry.md` (created during this PRD's pre-flight) and `docs/tasks/task-registry.md` (untouched). Epic registry entries added during this PRD's run follow the exact format documented in `skills/epic-registry-manager/SKILL.md`.
- **CR3 (UI/UX consistency):** New docs match existing tone (terse, file-anchored, link-heavy) and follow markdown conventions present in `docs/concepts/` and `docs/runbooks/`. Frontmatter schemas match neighbours.
- **CR4 (integration compatibility):** No existing runbook is rewritten — only augmented with prepend/append sections. `examples/README.md` is extended, not replaced. `README.md` gains a callout, not a restructure. The `documentation-standards-validator`, `documentation-status-lifecycle`, `file-naming`, and `epic-registry`/`task-registry` skills/standards are all respected.

## 3. UI Enhancement Goals

Not applicable — this enhancement targets the documentation surface, not a GUI. Doc-surface "consistency requirements" are captured in CR3.

## 4. Technical Constraints and Integration Requirements

### 4.1 Existing Technology Stack

- **Languages:** Markdown (docs), Bash (scripts), Python (`create-skill` scaffolders), Node ≥ 20 (npm scripts, installers).
- **Frameworks:** None — `agent-skills` is a content library; skills are markdown + bundled assets.
- **Database:** None.
- **Infrastructure:** GitHub (repo, CI, issue tracker), npm registry (`npx skills add` installer).
- **External Dependencies:** Anthropic API (consumed by skills at runtime in downstream projects), Jira / Bitbucket / GitHub trackers (resolver pattern in `shared/resources/resolve-platform.sh`).

### 4.2 Integration Approach

- **Database Integration Strategy:** N/A.
- **API Integration Strategy:** N/A.
- **Documentation Integration Strategy:** New docs slot into existing directories: `docs/concepts/` (quickstarts, decision tree), `docs/prd/onboarding/` (this PRD + its child epics + stories), `docs/runbooks/` (first-week index), `examples/` (worked artifacts).
- **Testing Integration Strategy:** Each quickstart walkthrough is verified by *walking it* on a clean clone before its closing story is marked accepted. Each generated artifact passes `documentation-standards-validator`. The `pm-checklist` skill validates this PRD before any epic is created from it.

### 4.3 Code Organization and Standards

- **File Structure Approach:** `docs/prd/<domain>/<feature>/` for PRDs (this PRD = `docs/prd/onboarding/prd.onboarding.md`), `docs/epics/epic.{N}.{name}.md` for epic docs OR `docs/prd/<domain>/<feature>/epics/epic.{N}.{name}/epic.{N}.{name}.md` per `epic-registry-manager`. **Decision:** use the latter (PRD-nested structure) for consistency with `epic-registry-manager` conventions.
- **Naming Conventions:** DOTS not underscores, lowercase-kebab descriptive names — per `docs/standards/file-naming.md`.
- **Coding Standards:** N/A (docs only).
- **Documentation Standards:** Frontmatter required on every new doc (`name`, `description`, `type`, `status`, `version`, `created`). Status uses `lowercase-kebab-case` in frontmatter, Title Case in body — per `docs/standards/document-status-lifecycle.md`.

### 4.4 Deployment and Operations

- **Build Process Integration:** Run `npm run generate-catalog` after any new doc that should appear in the skill catalog (none expected for this PRD — onboarding docs don't go in the skill catalog).
- **Deployment Strategy:** Merge to `main` via PRs produced by `/develop-story`. No release step beyond merge.
- **Monitoring and Logging:** N/A.
- **Configuration Management:** N/A.

### 4.5 Risk Assessment and Mitigation

- **Technical Risks:**
  - *Risk:* Dogfood pipeline surfaces bugs in the story chain mid-run, blocking story completion.
  - *Mitigation:* Pipeline bugs are filed as tasks (not as new stories in this PRD) and worked through the already-validated task pipeline. The story under development is paused, not abandoned.

- **Integration Risks:**
  - *Risk:* Worked-example artifacts (Epic 2) get out of date as skills evolve, breaking the "verbatim output" guarantee.
  - *Mitigation:* Each Epic-2 artifact records the skill version that produced it in frontmatter. Stale artifacts are flagged by `documentation-standards-validator` extensions filed as follow-up work.

- **Deployment Risks:**
  - *Risk:* Scope sprawl — onboarding work invites endless polish.
  - *Mitigation:* Hard cap: 4 epics, ~18 stories, 4,000 lines total (NFR5). Newly discovered gaps become tasks or future PRDs, not new stories in this PRD.

- **Mitigation Strategies (summary):** Strict scope cap; pipeline-bug routing to task lane; frontmatter versioning on worked examples; pre-merge walkthrough validation.

## 5. Epic and Story Structure

### 5.1 Complexity Assessment

Scored against the 6-signal rubric from `create-prd` SKILL.md Section 5:

| Signal | Score | Rationale |
|--------|:-----:|-----------|
| Domain breadth | ✅ | 4 distinct functional areas: entry-point UX, worked examples, runbook augmentation, learning path |
| Parallelism opportunity | ✅ | Epic 1 (entry) and Epic 3 (runbook wrappers) fully parallel; Epic 4 partially parallel after Epic 1 |
| Story volume | ✅ | ~18 stories planned |
| Dependency isolation | ➖ | Epic 2 depends on running the pipeline; Epic 4 Day-3 depends on Epic 2 messy-path artifact |
| Risk isolation | ❌ | No high-risk area |
| Timeline variance | ✅ | Quickstart (Epic 1) has higher urgency — biggest UX win |

**Score: 4 / 6** → Multiple epics warranted.

### 5.2 Epic Approach

**Epic Structure Decision:** **Four epics**, with this rationale:

- Epic 1 (Quickstart & entry) is the highest-value, lowest-dependency wedge — ship first.
- Epic 2 (Worked examples) is meta-dogfood — its artifacts come from running the pipeline on the whole PRD; it lands incrementally as stories complete.
- Epic 3 (Runbook wrappers) is fully independent; parallel-safe.
- Epic 4 (First-week path) depends partly on Epic 1 and on at least one Epic 2 messy-path artifact.

**Cross-epic dependencies:**

```
Epic 1 (entry) ──┬─→ Epic 4 (Day-1 / Day-2 reference Epic 1's quickstarts)
                 │
Epic 2 (examples — produced by THIS pipeline run) ─→ Epic 4 (Day-3 uses messy-path artifact)
                 │
Epic 3 (runbook wrappers) ── independent
```

> **Epic numbering note:** This PRD refers to epics as "Epic 1" through "Epic 4" (relative). Actual epic files get globally unique numbers from `docs/epic-registry.md` at creation time (the registry was bootstrapped during this PRD's pre-flight; current next-available number is **1**).

## 6. Epic Details

---

### Epic 1: Quickstart & Decision-Tree Entry Point

**Epic Goal:** Land a brand-new user in the right pipeline path within 60 seconds of installation, and let them ship a first artifact within 10 minutes.

**Integration Requirements:** Augment `README.md` and `docs/concepts/getting-started.md`; add net-new files under `docs/concepts/`. No skill code touched. All new docs pass `documentation-standards-validator`.

#### Story 1.1 — "First task in 10 minutes" quickstart

> As a new user who just installed agent-skills,
> I want a step-by-step walkthrough that produces a complete task artifact set in 10 minutes,
> so that I can confirm the toolkit works on my machine without reading reference docs.

**Acceptance Criteria**

1. New file `docs/concepts/quickstart-task.md` exists with frontmatter and status `draft` → `accepted` by close.
2. Walkthrough covers: install verification → `/create-task` invocation → `/develop-task` invocation → reviewing artifacts → cleanup.
3. Walking the doc verbatim on a clean clone produces task spec, plan, implementation report, QA report, gate file, DoD checklist within 10 minutes wall time.
4. Doc ≤ 400 lines (NFR4).

**Integration Verification**

- **IV1:** Existing `docs/concepts/getting-started.md` still reads correctly; only modified to link out to the new quickstart at its termination.
- **IV2:** No existing runbook is altered; the quickstart is a new entry point, not a replacement.
- **IV3:** `documentation-standards-validator` passes; total docs added ≤ 400 lines for this story.

#### Story 1.2 — "First story in 60 minutes" quickstart

> As a new user who has completed the task quickstart,
> I want a similarly tight walkthrough that produces a story artifact set end-to-end,
> so that I can see the full PRD/epic/story/develop-story chain working without committing to the 274-line story-development runbook.

**Acceptance Criteria**

1. New file `docs/concepts/quickstart-story.md` exists.
2. Walkthrough covers: `/create-prd` (tiny example PRD) → `/create-epic` → `/create-story` → `/develop-story` → reviewing artifacts.
3. Walking it verbatim produces all expected artifacts in ≤ 60 minutes.
4. Cross-links to `examples/` worked artifacts (Epic 2 outputs) — these links go in pending until Epic 2 lands.
5. Doc ≤ 400 lines.

**Integration Verification**

- **IV1:** `quickstart-task.md` still reads correctly and stands alone — no forced dependency on story quickstart.
- **IV2:** Skill invocations referenced (`/create-prd`, `/create-epic`, `/create-story`, `/develop-story`) match current skill names verbatim.
- **IV3:** Validator passes.

#### Story 1.3 — Decision tree: which path?

> As a new user uncertain whether to use task, story, hotfix, or parallel paths,
> I want a single page with a decision tree mapping intent to skill,
> so that I land in the right runbook without trial-and-error.

**Acceptance Criteria**

1. New file `docs/concepts/which-path.md` exists.
2. Decision tree covers four leaves: task (`/create-task`), story (`/create-story`), hotfix (`/create-branch --hotfix`), parallel work (`/create-parallel-stories`).
3. Each leaf links to the matching runbook AND the matching quickstart (where one exists).
4. Format: Mermaid flowchart + prose fallback (accessibility).
5. Doc ≤ 250 lines.

**Integration Verification**

- **IV1:** All runbook paths linked from the tree resolve and load on the current `main`.
- **IV2:** Mermaid block renders cleanly in GitHub markdown preview.
- **IV3:** Validator passes.

#### Story 1.4 — Rewrite `getting-started.md` to terminate in quickstarts

> As a new user reading `getting-started.md`,
> I want the doc to end with a concrete next-action ("now follow `quickstart-task.md`"),
> not the open-ended "read the runbooks."

**Acceptance Criteria**

1. `docs/concepts/getting-started.md` final section replaced with a "Next steps" block that prominently links to `quickstart-task.md`, `quickstart-story.md`, and `which-path.md`.
2. Diff is small: the install checklist body is preserved verbatim.
3. Closing prose ≤ 20 lines.

**Integration Verification**

- **IV1:** All pre-existing inbound links to `getting-started.md` still resolve.
- **IV2:** Install steps unchanged.
- **IV3:** Validator passes on the modified file.

#### Story 1.5 — README "Start here" callout

> As a visitor on the repo homepage,
> I want a "Start here" callout near the top of `README.md`,
> so that I don't have to scan the full README to find an entry point.

**Acceptance Criteria**

1. `README.md` gains a visually prominent "Start here" block within the first viewport (above the skill catalog list), linking to `docs/concepts/which-path.md`.
2. Existing README content not reorganized — block is inserted, not replacing structure.
3. Block ≤ 10 lines.

**Integration Verification**

- **IV1:** `npm run generate-catalog` still produces the same catalog output.
- **IV2:** Existing links / badges / install instructions in README all still functional.
- **IV3:** Validator passes.

---

### Epic 2: Worked PRD / Epic / Story Examples

**Epic Goal:** Eliminate the "no story/epic/PRD examples live here" caveat from `examples/README.md` by capturing real artifacts produced by *this very dogfood run* as worked examples — meta-dogfooding.

**Integration Requirements:** Add files under `examples/` mirroring PRD/epic/story artifacts produced during this PRD's pipeline run. No artifact is hand-crafted; each is a real pipeline output. Update `examples/README.md` to cross-link.

#### Story 2.1 — Capture this PRD as the worked PRD example

> As a future user authoring their first PRD,
> I want to see a real PRD that went through the full pipeline,
> so that I have a concrete reference for tone, depth, and section shape.

**Acceptance Criteria**

1. `examples/prd-example/` directory contains a copy (or symlink — decide during dev) of this PRD (`docs/prd/onboarding/prd.onboarding.md`).
2. `examples/prd-example/README.md` narrates the PRD: what was easy, what required iteration, what `pm-checklist` flagged.
3. Frontmatter records the skill version that produced the PRD.

**Integration Verification**

- **IV1:** The canonical PRD at `docs/prd/onboarding/prd.onboarding.md` remains the source of truth; example is a reference, not a fork.
- **IV2:** `examples/README.md` continues to enumerate the existing task examples correctly.
- **IV3:** Validator passes.

#### Story 2.2 — Capture each epic doc as worked epic examples

> As a future user authoring their first epic,
> I want to see four real epic docs side-by-side,
> so that I can pattern-match across them.

**Acceptance Criteria**

1. `examples/epic-examples/` contains the four epic docs produced by this PRD's `/create-epic` runs.
2. A short index `examples/epic-examples/README.md` explains the relationship to the parent PRD and links to each epic's story list.
3. Frontmatter on each captured epic records skill version + date produced.

**Integration Verification**

- **IV1:** Canonical epic docs in `docs/prd/onboarding/epics/` remain the source of truth.
- **IV2:** `docs/epic-registry.md` rows match the captured epics.
- **IV3:** Validator passes.

#### Story 2.3 — Capture a story with the messy path

> As a future user encountering their first QA-gate FAIL,
> I want to see a real story that failed `qa-gate` and was revised,
> so that the "messy path" is visible, not just the happy path.

**Acceptance Criteria**

1. `examples/story-messy-path/` contains: the original story doc, the `qa-gate` FAIL artifact, the revision diff (or revised story doc), and the eventual PASS gate.
2. A narrative `examples/story-messy-path/README.md` explains what triggered the FAIL and what the revision did.
3. The story used is one of the stories from this PRD that genuinely failed QA (do not manufacture a failure).

**Integration Verification**

- **IV1:** The canonical story artifacts in `docs/prd/onboarding/...` remain authoritative; examples are copies/links.
- **IV2:** `examples/README.md` cross-links to this directory.
- **IV3:** Validator passes.

#### Story 2.4 — Update `examples/README.md`

> As a visitor to `examples/`,
> I want the README to point at PRD, epic, and story examples alongside the existing task examples,
> so that the "no story/epic/PRD examples live here" caveat is removed.

**Acceptance Criteria**

1. `examples/README.md` updated: caveat removed, new sections added for PRD / epic / story examples with the same depth as the existing task walkthrough.
2. Skill-to-artifact lookup table extended to include `create-prd`, `create-epic`, `create-story`, `develop-story`.
3. Featured walkthrough remains task.6 but a parallel "story walkthrough" entry added pointing at the canonical story produced by this PRD's run.

**Integration Verification**

- **IV1:** Existing task-side content in `examples/README.md` preserved.
- **IV2:** All new links resolve.
- **IV3:** Validator passes.

---

### Epic 3: Runbook Tutorial Wrappers

**Epic Goal:** Make existing runbooks safer to land in cold — without rewriting them — by adding "Before you start" / "Is this the right runbook?" / "Common first-time errors" sections.

**Integration Requirements:** No runbook body content is replaced. Only prepends/appends. Risk minimal — purely additive.

#### Story 3.1 — "Before you start" for anchor runbooks

> As a new user opening `story-development.md` or `task-development.md` cold,
> I want a prerequisite section at the top telling me what to know first,
> so that I don't bounce off the 274-line body.

**Acceptance Criteria**

1. Both `docs/runbooks/story-development.md` and `docs/runbooks/task-development.md` gain a "Before you start" section between title and existing body.
2. Section lists: (a) which quickstart to do first, (b) which standards docs to skim, (c) when to use a different runbook instead.
3. Section ≤ 30 lines per runbook.
4. Existing body untouched.

**Integration Verification**

- **IV1:** Existing body content of both runbooks character-identical to pre-change.
- **IV2:** All inbound links to these runbooks still resolve at the same anchors.
- **IV3:** Validator passes.

#### Story 3.2 — "Is this the right runbook?" callouts for satellites

> As a new user landing on `hotfix.md`, `bug-fix.md`, `create-parallel-stories.md`, or `change-management.md`,
> I want a top-of-page callout that confirms (or redirects) my path,
> so that I don't follow a runbook that doesn't match my situation.

**Acceptance Criteria**

1. Each of the four satellite runbooks gains a callout block at the top: "Use this if X. Use [Y runbook] instead if Z."
2. Callouts cross-reference `which-path.md` (Epic 1.3).
3. Callouts ≤ 10 lines each.
4. Existing body untouched.

**Integration Verification**

- **IV1:** Existing body content of all four runbooks character-identical to pre-change.
- **IV2:** Inbound links resolve.
- **IV3:** Validator passes.

#### Story 3.3 — "Common first-time errors" troubleshooting section

> As a new user hitting a confusing error during a runbook walkthrough,
> I want a troubleshooting section at the end of the anchor runbooks,
> so that I can self-serve before asking for help.

**Acceptance Criteria**

1. Both anchor runbooks gain a "Common first-time errors" section at the end.
2. Each section lists at least 5 errors with: symptom, cause, fix.
3. Errors sourced from real friction observed during this PRD's dogfood run (record them as you hit them).
4. Section ≤ 60 lines per runbook.

**Integration Verification**

- **IV1:** Existing body content of both runbooks unchanged above the new section.
- **IV2:** Validator passes.
- **IV3:** All troubleshooting items reference real, reproducible errors — no invented entries.

---

### Epic 4: First-Week Guided Learning Path

**Epic Goal:** Beyond Hour 1, provide a structured Day 1 → Day 4 path that takes a user from first task through parallel work + change management.

**Integration Requirements:** New files only under `docs/runbooks/first-week/` and an index at `docs/runbooks/first-week.md`. Cross-links to Epic 1 quickstarts and Epic 2 messy-path artifact.

#### Story 4.1 — Day 1: Tasks

> As a new user on Day 1,
> I want a guided checklist that walks me through running 2–3 tasks,
> so that I internalize the task pipeline before tackling the story pipeline.

**Acceptance Criteria**

1. `docs/runbooks/first-week/day-1-tasks.md` exists with frontmatter and checkpoints (boxes the user ticks).
2. Day 1 spans the task quickstart + two follow-up tasks of progressive complexity.
3. Completion criteria measurable: by end of Day 1, user should have 3 task artifact sets in their working repo.
4. Doc ≤ 300 lines.

**Integration Verification**

- **IV1:** Cross-links to `quickstart-task.md` (Epic 1) and `task-development.md` resolve.
- **IV2:** Validator passes.
- **IV3:** No content duplicated from `task-development.md` — Day 1 is a guided sequence over it, not a rewrite.

#### Story 4.2 — Day 2: Stories

> As a new user on Day 2,
> I want a guided story walkthrough,
> so that I shift from task pipeline to story pipeline confidently.

**Acceptance Criteria**

1. `docs/runbooks/first-week/day-2-stories.md` exists.
2. Day 2 spans the story quickstart + one follow-up story.
3. Completion criteria: user has at least 1 fully-developed story PR in their working repo.
4. Doc ≤ 300 lines.

**Integration Verification**

- **IV1:** Cross-links to `quickstart-story.md` (Epic 1) and `story-development.md` resolve.
- **IV2:** Validator passes.
- **IV3:** No content duplicated from `story-development.md`.

#### Story 4.3 — Day 3: Review concerns and QA gate failures

> As a new user on Day 3,
> I want to deliberately reproduce a QA-gate failure and recover from it,
> so that the "messy path" stops being scary.

**Acceptance Criteria**

1. `docs/runbooks/first-week/day-3-messy-path.md` exists.
2. Day 3 references the Epic 2.3 worked messy-path artifact and walks the user through reproducing the same shape of failure-and-recovery on their own work.
3. Completion criteria: user has at least one `qa-gate: FAIL` artifact followed by a `qa-gate: PASS` revision in their repo.
4. Doc ≤ 300 lines.

**Integration Verification**

- **IV1:** Epic 2.3 messy-path artifact exists and is reachable from Day 3's links.
- **IV2:** Validator passes.
- **IV3:** Documented failure mode is reproducible on a clean clone.

#### Story 4.4 — Day 4: Parallel work + change management

> As a new user on Day 4,
> I want to try parallel stories and the change-management runbook,
> so that I'm equipped for week-2+ scenarios.

**Acceptance Criteria**

1. `docs/runbooks/first-week/day-4-parallel.md` exists.
2. Day 4 cross-links to `create-parallel-stories.md` and `change-management.md` (both with Epic 3.2 callouts in place).
3. Completion criteria: user has either (a) two stories in parallel worktrees or (b) one change-management Sprint Change Proposal in their repo.
4. Doc ≤ 300 lines.

**Integration Verification**

- **IV1:** Referenced runbooks resolve.
- **IV2:** Validator passes.
- **IV3:** Day 4 does not require Day 3 to be completed — it's optional after Day 2.

#### Story 4.5 — First-week index

> As a new user planning their onboarding,
> I want a single index page listing the four days with completion criteria,
> so that I can plan my week.

**Acceptance Criteria**

1. `docs/runbooks/first-week.md` exists at runbook level (not nested in `first-week/`).
2. Index lists Day 1–Day 4 with one-line description and completion criterion each.
3. Index links to all four day docs and to the relevant Epic 1 quickstarts.
4. Doc ≤ 100 lines.

**Integration Verification**

- **IV1:** `docs/runbooks/README.md` (the runbook hub) gains a single inbound link to `first-week.md` — no other restructure.
- **IV2:** Validator passes.
- **IV3:** All cross-links resolve.

---

## 7. Checklist Results

### 7.1 Brownfield Quality Checks

| Check | Result | Notes |
|-------|:------:|-------|
| **1. Measurability** | PASS | NFR1–NFR6 all have specific metrics (line counts, time bounds, validator pass). FRs use "step-by-step", "produces", "≤", "verbatim" — concrete. |
| **2. Implementation Leakage** | PASS | No framework / library / data-structure names prescribe implementation. Skill names (`/create-task`, `/develop-story`) are the capability themselves. |
| **3. Traceability** | PASS | Every FR traces to a Goal in §1.4 (FR1↔goal-1, FR2↔goal-2, FR3↔goal-3, FR4↔goal-1, FR5↔goal-4, FR6/7/8↔goal-3 & goal-5). |
| **4. NFR SMART** | PASS | NFR3 specifies platforms; NFR4/5 specify line caps; NFR6 specifies provenance; NFR1/2 specify validators. All are S-M-A-R-T-or-condition-bound. |

**Score: 4 / 4 passed.**

### 7.2 PM Checklist (self-administered summary)

- Problem & solution alignment: ✅ — onboarding gap + dogfood gap, both named, both solved by the same plan.
- Audience defined: ✅ — new users in §1.4 background.
- MVP-first: ✅ — Epic 1 alone is shippable value.
- Epic structure rationalized: ✅ — 6-signal scoring done.
- Story sequencing: ✅ — risk-minimization explicit in each story's IV section.
- Compatibility: ✅ — CR1–CR4 documented.
- Risks identified & mitigated: ✅ — §4.5.
- Handoff prompts: see §8 below.

## 8. Next Steps

### 8.1 Architect Handoff Prompt

> This brownfield PRD adds documentation (no source code changes), so a full architecture pass is **not required**. If an Architect *is* consulted, focus on:
>
> 1. **Doc-IA review:** Is the path `docs/prd/onboarding/` the right home, or should this nest deeper under `docs/prd/onboarding/tutorials/`? Decision: keep flat per pre-flight Q1.
> 2. **Worked-example provenance pattern:** Should worked examples in `examples/` be symlinks, copies, or include directives? Recommend copies with skill-version frontmatter for stability.
> 3. **Versioning of captured artifacts (Epic 2):** Confirm the frontmatter contract that records which skill version produced each captured artifact, so staleness can be detected programmatically later.
>
> No system topology diagram required — `mermaid-architect` step skipped (no new service boundary, no new external system). One Mermaid diagram lives *inside* Story 1.3 (the decision tree) — that's product content, not architecture.

### 8.2 UX Expert Handoff Prompt

> Not applicable — no GUI surface. Doc-tone consistency is captured in CR3 and enforced by `documentation-standards-validator`.

### 8.3 Implementation Handoff (recommended next step)

1. Run `/create-epic` four times — one per Epic 1–4 in this PRD. Each call assigns the next number from `docs/epic-registry.md` (currently next-available = 1) and appends a registry row in the same commit.
2. Run `/create-story` per epic, starting with Epic 1 (highest priority, lowest deps).
3. Validate the first story end-to-end with `/develop-story` before fanning out — this proves the dogfood loop closes.
4. Capture any pipeline bugs surfaced during the run as **tasks** in `docs/tasks/` (not as new stories in this PRD).
5. Epic 2 stories run *last* — they consume artifacts produced by Epics 1, 3, 4 runs.

### 8.4 Integration Testing & Rollback

- **Integration testing:** For each closing story, walk the affected quickstart / runbook on a clean clone before merging. Treat the walkthrough as the integration test.
- **Rollback:** Pure-doc PRD — rollback = revert the PR. No DB / API / config state to unwind. The `docs/epic-registry.md` rows for cancelled epics keep their numbers (per registry rules) — they get marked `CANCELLED`, not deleted.

---

**End of PRD.**
