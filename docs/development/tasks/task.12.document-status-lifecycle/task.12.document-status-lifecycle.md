---
id: task.12
title: "Document the canonical document-status lifecycle and frontmatter/body sync rule"
type: task
category: documentation
priority: Medium
status: ready-for-review
review: ✅ All review recommendations from `task.12.review.2026-05-06.md` implemented 2026-05-06
created: 2026-05-06
assignee: TBD
effort: 0.5 day
depends_on: —
github_issue: 19
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #6)
---

# Task 12 — Document the canonical document-status lifecycle

## 1. Overview

Skills mix `Planned` / `Ready for Development` / `In Progress` / `Ready for Review` / `accepted` / `Completed` with no central spec. `develop-pipeline-step-2-review.md` has a partial table; `CLAUDE.md` is silent. Frontmatter uses lowercase (`accepted`); the document body uses Title Case (`Status: Ready for Review`) — both must be kept in sync per `finalise`, but no skill warns about the dual write.

**Scope**: write the canonical lifecycle doc, then cross-reference it from every skill that reads or writes status.

**Key deliverables**:

- `shared/resources/document-status-lifecycle.md` — canonical values, allowed transitions, frontmatter-vs-body rule
- Cross-reference lines in `create-task`, `review-task`, `develop`, `qa-task`, `finalise` (and the story equivalents)
- A diagram (mermaid stateDiagram) of allowed transitions

**Expected outcome**: a developer can answer "what status should this be in?" by reading one file.

## 2. Motivation

**Current Problems**:

- Drift across skills (e.g. `Ready for Development` vs `In Progress` for the develop step's pre-state)
- No documented sync rule between frontmatter `status:` (lowercase) and body `Status:` (Title Case)
- Re-running pipelines often surfaces "what state should this be in?" questions
- New skills will pick a value at random and add to the drift

**Benefits**:

- Single reference for status authoring
- Linter/validator can enforce transitions later
- Onboarding for new contributors becomes trivial

## 3. Technical Background

**Status values currently observed in skills**:

| Value | Casing | Used by |
|---|---|---|
| `Planned` | Title | create-task |
| `Ready for Development` | Title | review-task → develop |
| `In Progress` | Title | develop |
| `Ready for Review` | Title | develop → qa-task (canonical post-develop, pre-QA state) |
| `Ready for QA` | Title | qa-task (**deprecated synonym** of `Ready for Review` — to be retired in follow-up) |
| `accepted` | lowercase | finalise (frontmatter) |
| `Completed` | Title | qa-task body |
| `📋 Planned` | emoji+Title | create-task body (legacy — to be normalised) |

**Canonical lifecycle** (committed):

```
Draft → Planned → Ready for Development → In Progress → Ready for Review → Accepted
```

`Cancelled` is reachable as an exit transition from any non-terminal state (`Draft`, `Planned`, `Ready for Development`, `In Progress`, `Ready for Review`). Terminal states: `Accepted`, `Cancelled`.

`Ready for QA` is a deprecated synonym of `Ready for Review`; the canonical doc names `Ready for Review` and skills using `Ready for QA` are filed as a follow-up rename (out of scope here).

**Sync rule**: frontmatter `status:` is always lowercase, no emoji; body `Status:` is Title Case and may include the emoji prefix. Both must be updated together. `finalise` enforces this.

## 4. Scope

**In Scope**:

- ✅ New `shared/resources/document-status-lifecycle.md`
- ✅ Cross-reference lines in 9 skills (create-task, review-task, develop, develop-story, qa-task, qa-story, finalise, create-story, review-story)
- ✅ Mermaid stateDiagram of transitions
- ✅ Self-migration: fix this task's own frontmatter to canonical lowercase form (Phase 4)

**Out of Scope**:

- ❌ Implementing a runtime validator (separate task if desired)
- ❌ Bulk migration of legacy task/story documents that use non-canonical values (only task.12's own frontmatter is fixed, as a documentation example)
- ❌ Renaming `accepted` → `Accepted` etc. in skills (preserve current frontmatter casing convention)
- ❌ Renaming `Ready for QA` → `Ready for Review` in skills that use it (file as follow-up)

## 5. Breaking Changes

None. The doc captures current behaviour as authoritative; skills only gain a cross-reference.

## 6. Implementation Plan

### Phase 1 — Author the canonical doc (Risk: Low)

Files:

- `shared/resources/document-status-lifecycle.md` (new)

Changes:

- [x] Define each status value with: meaning, who sets it, who reads it, allowed predecessors/successors
- [x] State the frontmatter-vs-body sync rule explicitly with examples
- [x] Mermaid stateDiagram showing the full state machine
- [x] List terminal states (`Accepted`, `Cancelled`)

### Phase 2 — Cross-reference (Risk: Low)

Files:

- `skills/create-task/SKILL.md`
- `skills/review-task/SKILL.md`
- `skills/develop/SKILL.md`
- `skills/develop-story/SKILL.md`
- `skills/qa-task/SKILL.md`
- `skills/qa-story/SKILL.md`
- `skills/finalise/SKILL.md`
- `skills/create-story/SKILL.md`
- `skills/review-story/SKILL.md`

Changes:

- [x] In each SKILL.md, immediately after the YAML frontmatter (before the first H1), insert a single line: `> **Status lifecycle**: see [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md)` (path adjusted per skill location).
- [x] Resolve `Ready for QA` vs `Ready for Review` in the canonical doc (declare `Ready for Review` canonical; `Ready for QA` deprecated). Skill renames are out of scope.

### Phase 3 — CLAUDE.md (Risk: Low)

Files:

- `CLAUDE.md`

Changes:

- [x] Add a `### Status Lifecycle` subsection under the existing `## File Naming Conventions` H2, pointing at `shared/resources/document-status-lifecycle.md` and summarising the canonical states in one sentence.

### Phase 4 — Self-migration (Risk: Low)

Files:

- `docs/development/tasks/task.12.document-status-lifecycle/task.12.document-status-lifecycle.md`

Changes:

- [x] Confirm frontmatter `status: planned` (lowercase, no emoji) — applied during review fixes; verify no regression after Phase 1 lands. Current: `status: in-progress` (correct canonical form at this pipeline step).

## 7. Files Summary

**New**:

- `shared/resources/document-status-lifecycle.md`

**Modified**:

- `CLAUDE.md`
- 9 skill SKILL.md files (cross-reference lines only)
- `docs/development/tasks/task.12.document-status-lifecycle/task.12.document-status-lifecycle.md` (self-migration of frontmatter)

## 8. Testing Strategy

- **Static (allow-list)**: extract every status value referenced in `skills/` (`grep -rnhE "(^|[\` ])[Ss]tatus[:\` ]+[A-Za-z][^\"\\\`]*" skills/` filtered to status writes/reads), normalise, and assert each value appears in the canonical doc's allow-list. Implement as a shell snippet under Testing Strategy that exits non-zero on any unknown value.
- **Review**: walk through `/develop-task` end-to-end and verify each step's pre/post status matches the doc.

## 9. Success Criteria

**Functional**:

- [x] Doc enumerates every status value in active use
- [x] Doc states the frontmatter-vs-body sync rule and includes ≥2 worked examples showing simultaneous frontmatter+body update (e.g., develop step transition and finalise step transition)
- [x] Mermaid stateDiagram present and accurate, matching the canonical lifecycle in §3
- [x] Allow-list test passes: every `status:` value used in `skills/` is present in the canonical doc

**Migration**:

- [x] All 9 skills link to the doc (top of SKILL.md, after frontmatter)
- [x] CLAUDE.md mentions the doc under "File Naming Conventions"
- [x] task.12 frontmatter is `status: ready-for-review` (canonical lowercase, correct for this pipeline step)

## 10. Risk Assessment

**Low Risk** — Doc may codify drift instead of resolving it:

- Mitigation: surface contradictions during Phase 1; pick one canonical value and update skills as needed (out of scope for this task — file follow-ups).

## 11. Rollback Plan

**Immediate (< 15 min)**: delete the new doc and the cross-reference lines. No state changes.
