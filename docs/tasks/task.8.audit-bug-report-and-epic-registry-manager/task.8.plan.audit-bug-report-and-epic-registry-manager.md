---
id: task.8.plan
title: "Implementation Plan: audit create-bug-report and epic-registry-manager"
type: plan
task-ref: task.8.audit-bug-report-and-epic-registry-manager.md
---

# Implementation Plan: audit create-bug-report and epic-registry-manager

> Requirements and success criteria: [task.8.audit-bug-report-and-epic-registry-manager.md](task.8.audit-bug-report-and-epic-registry-manager.md)

## Overview

Two skills weren't deeply inspected during the parity audit. This task reads them, classifies their gap (none / small / large), and either remediates inline or spawns follow-ups. The audit _is_ the deliverable — code changes are conditional.

## Phase-by-Phase Implementation Guide

### Phase 1: Audit `create-bug-report`

```bash
SKILL=skills/create-bug-report/SKILL.md
wc -l "$SKILL"
grep -nE '\bgh |jira|JIRA|bitbucket|curl|atlassian|gh issue|gh pr' "$SKILL"
ls skills/create-bug-report/scripts/ 2>/dev/null
```

Read the file end-to-end. Capture in the findings report:

- **What it produces**: the bug.md file path, frontmatter shape, any other artifacts
- **Tracker side-effects**: does it create a GH issue? a Jira issue? both? neither?
- **Linkage**: does it write `github_issue` / `jira_key` to the bug-report frontmatter?
- **Where called from**: search other skills (`grep -rln 'create-bug-report' skills/`)
- **Platform branches**: any `if [ "$PLATFORM" = ... ]` already present?

### Phase 2: Audit `epic-registry-manager`

```bash
SKILL=skills/epic-registry-manager/SKILL.md
wc -l "$SKILL"
grep -nE '\bgh |jira|JIRA|bitbucket|curl|atlassian|milestone' "$SKILL"
```

Read the file end-to-end. Also read the registry file format:

```bash
ls docs/development/epic-registry.md 2>/dev/null
# (or wherever the registry is conventionally located in target projects — read create-task line ~552 for the path reference)
```

Capture:

- **Registry file shape**: what columns/fields does it track?
- **GH-specific assumptions**: milestones, project board IDs, GH issue numbers?
- **Jira-friendly fields**: epic Jira key column? URL?
- **Read/write surface**: which skills consume the registry vs which mutate it?

### Phase 3: Write findings report

File: `task.8.audit.1.findings.md` (sibling to this plan).

Structure:

```markdown
# Audit Findings — create-bug-report and epic-registry-manager

## create-bug-report

### Surface

- Outputs: ...
- Tracker side-effects: ...
- Frontmatter fields: ...
- Called from: ...

### Platform calls inventory

| Line | Snippet             | Platform |
| ---- | ------------------- | -------- |
| ...  | gh issue create ... | GitHub   |

### Gap classification

- [ ] No gap (skill platform-agnostic)
- [ ] Inline fix (small dual-path patch)
- [ ] Spawn follow-up task

### Recommendation

{prose}

---

## epic-registry-manager

(same structure)
```

### Phase 4: Inline remediation (conditional)

Only if Phase 3 classified the skill as "inline fix" and effort is ≤ 0.5 day. Apply the dual-path pattern from canonical sources:

- **Pattern**: `skills/create-pr/SKILL.md` (REMOTE_URL detection) and `skills/create-task/SKILL.md` lines 425-509 (JIRA_URL detection)
- **Validate**: `quick_validate.py` + `package_skill.py`
- **Smoke**: dual-env test (GH-only + BB+Jira)

### Phase 5: Spawn follow-up tasks (conditional)

If Phase 3 classified anything as "spawn follow-up": run `/create-task` for each, providing context lifted from the findings report. Set `depends_on: task.8` in the new task's frontmatter.

## Key Patterns and References

- **Dual-path pattern**: `skills/create-pr/SKILL.md`, `skills/finalise/SKILL.md` lines 312-329, `skills/create-task/SKILL.md` lines 425-509
- **Registry path convention**: `skills/create-task/SKILL.md` line ~552 references `docs/development/epic-registry.md`

## Testing Approach

- **Audit phase**: peer review of findings report
- **Inline patches** (if any): dual-env smoke as in task 3
- **Follow-ups** (if any): tracked separately in the new task documents
