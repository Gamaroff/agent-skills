---
id: task.8
title: "Audit create-bug-report and epic-registry-manager for GitHub-only assumptions"
type: task
category: refactoring
priority: Medium
status: 📋 Planned
created: 2026-05-05
assignee: TBD
effort: 1 day (audit) + variable (remediation)
depends_on: —
---

# Task 8 — Audit create-bug-report and epic-registry-manager for GitHub-only assumptions

## 1. Overview

The Bitbucket+Jira parity audit (source plan: `~/.claude/plans/how-does-the-create-task-encapsulated-kitten.md`) flagged two skills as unverified: `skills/create-bug-report/` and `skills/epic-registry-manager/`. They were not deeply inspected during the initial pass. This task is an **audit-then-remediate** workflow: read both skills, identify any GitHub-only assumptions, and either close as "no gap" or spawn remediation.

**Scope**:

1. Audit `skills/create-bug-report/SKILL.md` and `skills/epic-registry-manager/SKILL.md` end-to-end
2. Document findings (which platform APIs are called, what's hard-coded, what frontmatter fields are written)
3. Remediate inline if scope is small (< 0.5 day each); otherwise spin out follow-up tasks

**Key deliverables**:

- Audit report `task.8.audit.1.findings.md` for each skill
- Either: a remediation patch within this task's scope, OR a clear hand-off describing the follow-up tasks needed

**Expected outcome**: clean parity status across the entire skill library — every GH-aware skill is either dual-pathed or explicitly documented as single-platform.

## 2. Motivation

**Current Problems**:

- Unknown unknowns: these two skills may silently fail on BB+Jira projects
- Bug reports and epic-registry are pipeline-adjacent — gaps here cause confusing downstream behavior
- Without audit, we can't claim "BB+Jira parity complete"

**Benefits**:

- Either confirms parity or surfaces remaining gaps for explicit remediation
- Closes the audit loop opened by the original parity plan

## 3. Technical Background

**`skills/create-bug-report/`**:

- Per `skills-config.sample.yaml` and `CLAUDE.md`, bug reports are documented as `bug.{epic}.{story}.{n}.{name}.md`
- Open question: does this skill create remote tracker issues in addition to the markdown file?
- If yes: which platform — GH, Jira, or both?

**`skills/epic-registry-manager/`**:

- Per `CLAUDE.md`, lives under "Story/epic lifecycle" but its exact responsibilities aren't documented in the parity plan
- `skills/create-task/SKILL.md` line ~552 references `docs/development/epic-registry.md` for milestone lookup — implies registry is a markdown file, GH-flavored (milestones are GH-specific)
- Open question: does the registry have a Jira-aware shape?

## 4. Scope

**In scope**:

- ✅ Read both SKILL.md files end-to-end
- ✅ Run `grep -n` for github/jira/bitbucket/gh/curl across both
- ✅ Document findings per skill
- ✅ Small inline fixes (< 0.5 day each) — e.g., adding a `JIRA_URL` branch where the change is mechanical

**Out of scope**:

- ❌ Large refactors revealed by audit — those become new tasks
- ❌ Changing the bug-report markdown format
- ❌ Migrating epic-registry to a Jira-native format (likely a much bigger task if needed)

## 5. Breaking Changes

None expected from the audit itself. Any inline remediation must be additive (preserve GH path verbatim).

## 6. Implementation Plan

> Detailed implementation guide: [task.8.plan.audit-bug-report-and-epic-registry-manager.md](task.8.plan.audit-bug-report-and-epic-registry-manager.md)

**Phase 1 — Audit `create-bug-report` (Low risk)**

- Files: `skills/create-bug-report/SKILL.md` (read only)
- Changes:
  - [ ] Read full file
  - [ ] Run `grep -nE 'gh|jira|bitbucket|curl|JIRA_URL'`
  - [ ] Document: file outputs (bug.md path, frontmatter), tracker-side effects (if any), hard-coded platform calls
  - [ ] Decide: dual-path needed? Or docs-only skill safe on both platforms?

**Phase 2 — Audit `epic-registry-manager` (Low risk)**

- Files: `skills/epic-registry-manager/SKILL.md` (read only)
- Changes:
  - [ ] Read full file
  - [ ] Same grep
  - [ ] Document: registry file shape, what fields it manages, GH-specific vs platform-agnostic
  - [ ] Check: how does it interact with `docs/development/epic-registry.md`? Is the registry GH-flavored (milestones) or platform-neutral?

**Phase 3 — Decision and write-up (Low risk)**

- Files: `task.8.audit.1.findings.md` (new)
- Changes:
  - [ ] Write findings table: skill | gh calls | jira calls | bitbucket calls | gap severity
  - [ ] For each: classify as (a) no gap, (b) inline fix here, (c) spawn follow-up task
  - [ ] If (b): document the patch in Phase 4
  - [ ] If (c): describe the follow-up task in detail (motivation, scope, expected effort)

**Phase 4 — Inline remediation (variable risk, only if scope ≤ 0.5 day each)**

- Files: as identified
- Changes:
  - [ ] Apply the patch using the dual-path pattern from `create-pr` / `finalise` / `create-task`
  - [ ] `quick_validate.py` and `package_skill.py` for affected skills

**Phase 5 — Spawn follow-up tasks (if needed)**

- Files: new task documents under `docs/development/tasks/task.{N+}.*`
- Changes:
  - [ ] Use `/create-task` skill (this very repo!) to scaffold each follow-up
  - [ ] Reference this audit report as `depends_on:` predecessor

## 7. Files Summary

**Audit deliverables**:

1. ✅ `docs/development/tasks/task.8.audit-bug-report-and-epic-registry-manager/task.8.audit.1.findings.md` — audit report

**Conditionally modified** (depending on findings):

2. ⚠️ `skills/create-bug-report/SKILL.md`
3. ⚠️ `skills/epic-registry-manager/SKILL.md`

**Conditionally created** (if larger gaps found):

4. ⚠️ Follow-up task documents

## 8. Testing Strategy

- For inline patches: same dual-env smoke test pattern as task 3 (GH project + BB+Jira project)
- For audit-only deliverable: peer review of findings report; no functional test

## 9. Success Criteria

**Functional**:

- [ ] Findings report exists and covers both skills end-to-end
- [ ] Each skill classified: no gap | inline fix | follow-up task
- [ ] Inline fixes (if any) pass validation and dual-env smoke

**Code quality**:

- [ ] Findings report includes file paths and line numbers
- [ ] No skill claims dual-path support without verification

**Migration**:

- [ ] Either parity is complete, or follow-up tasks are queued with clear scope

## 10. Risk Assessment

**MEDIUM**

1. **Audit reveals a large gap that this task can't absorb**
   - Probability: Medium
   - Impact: Medium (timeline slip)
   - Mitigation: Phase 5 spawns follow-up tasks rather than ballooning this one

**LOW**

2. **Skills already platform-agnostic (no work needed)**
   - Probability: Medium
   - Impact: positive (close fast)

## 11. Rollback Plan

- Audit-only deliverable: nothing to roll back
- Inline patches: revert per-skill, regenerate zips
- Follow-up tasks: delete the task documents if no longer needed

**Triggers**: any inline patch causes regression on GH path
