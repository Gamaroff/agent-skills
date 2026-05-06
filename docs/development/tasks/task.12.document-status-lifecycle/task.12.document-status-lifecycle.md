---
id: task.12
title: "Document the canonical document-status lifecycle and frontmatter/body sync rule"
type: task
category: documentation
priority: Medium
status: 📋 Planned
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
| `Ready for Review` | Title | develop → qa-task |
| `Ready for QA` | Title | qa-task (synonym of above?) |
| `accepted` | lowercase | finalise (frontmatter) |
| `Completed` | Title | qa-task body |
| `📋 Planned` | emoji+Title | create-task body |

**Target lifecycle** (proposed — refine during implementation):

```
Draft → Planned → Ready for Development → In Progress → Ready for Review →
  Accepted (frontmatter: accepted)
         ↘ Cancelled
```

**Sync rule**: frontmatter `status:` is always lowercase, no emoji; body `Status:` is Title Case and may include the emoji prefix. Both must be updated together. `finalise` enforces this.

## 4. Scope

**In Scope**:

- ✅ New `shared/resources/document-status-lifecycle.md`
- ✅ Cross-reference lines in 6+ skills (create-task, review-task, develop, qa-task, finalise, plus story equivalents)
- ✅ Mermaid stateDiagram of transitions

**Out of Scope**:

- ❌ Implementing a runtime validator (separate task if desired)
- ❌ Migrating existing task documents that use legacy values
- ❌ Renaming `accepted` → `Accepted` etc. (preserve current frontmatter casing)

## 5. Breaking Changes

None. The doc captures current behaviour as authoritative; skills only gain a cross-reference.

## 6. Implementation Plan

### Phase 1 — Author the canonical doc (Risk: Low)

Files:

- `shared/resources/document-status-lifecycle.md` (new)

Changes:

- [ ] Define each status value with: meaning, who sets it, who reads it, allowed predecessors/successors
- [ ] State the frontmatter-vs-body sync rule explicitly with examples
- [ ] Mermaid stateDiagram showing the full state machine
- [ ] List terminal states (`Accepted`, `Cancelled`)

### Phase 2 — Cross-reference (Risk: Low)

Files:

- `skills/create-task/SKILL.md`
- `skills/review-task/SKILL.md`
- `skills/develop/SKILL.md`
- `skills/qa-task/SKILL.md`
- `skills/finalise/SKILL.md`
- `skills/create-story/SKILL.md`
- `skills/review-story/SKILL.md`
- `skills/qa-story/SKILL.md`

Changes:

- [ ] Add a one-line "Status lifecycle: see `shared/resources/document-status-lifecycle.md`" to the relevant section of each
- [ ] Reconcile any contradictions found (e.g. `Ready for QA` vs `Ready for Review`) in the doc, not in the skills

### Phase 3 — CLAUDE.md (Risk: Low)

Files:

- `CLAUDE.md`

Changes:

- [ ] Add a Status Lifecycle subsection under "File Naming Conventions" pointing at the canonical doc

## 7. Files Summary

**New**:

- `shared/resources/document-status-lifecycle.md`

**Modified**:

- `CLAUDE.md`
- 8 skill SKILL.md files (cross-reference lines only)

## 8. Testing Strategy

- **Static**: `grep -rnE "^[Ss]tatus:" skills/` should not surface a value missing from the canonical doc.
- **Review**: walk through `/develop-task` end-to-end and verify each step's pre/post status matches the doc.

## 9. Success Criteria

**Functional**:

- [ ] Doc enumerates every status value in active use
- [ ] Doc states the frontmatter-vs-body sync rule with examples
- [ ] Mermaid stateDiagram present and accurate

**Migration**:

- [ ] All 8 skills link to the doc
- [ ] CLAUDE.md mentions the doc

## 10. Risk Assessment

**Low Risk** — Doc may codify drift instead of resolving it:

- Mitigation: surface contradictions during Phase 1; pick one canonical value and update skills as needed (out of scope for this task — file follow-ups).

## 11. Rollback Plan

**Immediate (< 15 min)**: delete the new doc and the cross-reference lines. No state changes.
