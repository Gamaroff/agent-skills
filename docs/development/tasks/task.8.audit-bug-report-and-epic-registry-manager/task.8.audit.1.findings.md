---
id: task.8.audit.1
title: "Audit Findings — create-bug-report and epic-registry-manager"
type: audit-report
task-ref: task.8.audit-bug-report-and-epic-registry-manager.md
date: 2026-05-06
---

# Audit Findings — create-bug-report and epic-registry-manager

**Audited**: 2026-05-06
**Auditor**: Claude (develop-task pipeline)
**Task**: [task.8.audit-bug-report-and-epic-registry-manager.md](task.8.audit-bug-report-and-epic-registry-manager.md)

---

## Executive Summary

Both `create-bug-report` and `epic-registry-manager` are **platform-agnostic**. Neither skill makes remote API calls, reads tracker environment variables, or hard-codes GitHub/Bitbucket/Jira assumptions. Both are purely file-based skills that produce local markdown artifacts.

**Result**: Parity audit for these two skills is **closed — no gap found in either**.

---

## create-bug-report

### Surface

- **File**: `skills/create-bug-report/SKILL.md` (844 lines)
- **Scripts**: none (`scripts/` directory absent)
- **Outputs**: markdown bug report files co-located with story or task directories
  - Story pattern: `story.{epic}.{story}.bug.{n}.{name}.md`
  - Task pattern: `task.{id}.bug.{n}.{name}.md`
- **Tracker side-effects**: **none** — no `gh issue create`, no Jira issue creation, no Bitbucket API calls
- **Frontmatter fields written**: `Bug ID`, `Related Story/Task`, `Status`, `Priority`, `Severity`, `Created`, `Assigned To`, `QA Engineer`
  - Does NOT write `github_issue` or `jira_key` — bug reports are local-only artifacts
- **Called from** (grep result): `create-issue`, `create-task`, `qa-task`, `qa-technical-task`, and `qa-story` (5 skills reference it; those callers provide any tracker linkage from their own dual-path logic)

### Platform Calls Inventory

| Line | Snippet | Platform |
|------|---------|----------|
| (none) | — | — |

`grep -nE '\bgh |jira|JIRA|bitbucket|curl|atlassian|gh issue|gh pr|JIRA_URL|REMOTE_URL|platform'` → **zero matches**

### Gap Classification

- [x] No gap (skill platform-agnostic)
- [ ] Inline fix (small dual-path patch)
- [ ] Spawn follow-up task

### Recommendation

**No action required.** The skill creates markdown files only. Any tracker issue linkage (creating a GH issue or Jira ticket for a bug) is the responsibility of the calling context — typically `create-issue` or `qa-story`, both of which already use the platform-detection resolver. The design is intentionally layered and correct.

### Minor Observation (optional, not a gap)

The "Technical Task Bug Reports" Notes section (line 844) mentions "Quality gates stored separately in `docs/qa/gates/tasks/` directory". This conflicts with the current pipeline convention (gate files are now co-located in the task directory, not a separate `docs/qa/gates/tasks/` path). This is a stale doc comment in the skill — not a platform gap. If the team wants to clean it up, a one-line edit suffices; it does not affect platform parity.

---

## epic-registry-manager

### Surface

- **File**: `skills/epic-registry-manager/SKILL.md` (114 lines)
- **Scripts**: none (`scripts/` directory absent)
- **Reference files**: `references/epic-registry.md` (sample registry table), `references/epic-template.md` (epic YAML frontmatter template)
- **Outputs**: 
  - Epic directory structure under `docs/prd/{domain}/{feature}/epics/epic.{N}.{name}/`
  - Epic markdown file with YAML frontmatter
  - Updated entry in `docs/development/epic-registry.md`
- **Tracker side-effects**: **none** — no `gh`, Jira, or Bitbucket API calls
- **Registry entry format**: `| NUMBER | - | domain/feature | epic.N.name | title | status | date |`
  - Second column is always `-` (unused placeholder — see observation below)
- **Epic YAML frontmatter fields**: `epic_number`, `title`, `domain`, `status`, `priority`, `estimated_stories`, `created`, `target_completion`
  - No `github_issue`, `jira_key`, or platform-specific fields
- **Called from** (grep result): `create-epic` (line 358), `edit-epic` (line 523)

### Platform Calls Inventory

| Line | Snippet | Platform |
|------|---------|----------|
| 57 | `"core-platform"` (example domain name in text) | None — not a platform call |

`grep -nE '\bgh |jira|JIRA|bitbucket|curl|atlassian|milestone|gh issue|gh pr|JIRA_URL|REMOTE_URL|platform'` → **one match**, which is the string `"core-platform"` used as an example domain name, not a platform API call.

### Gap Classification

- [x] No gap (skill platform-agnostic)
- [ ] Inline fix (small dual-path patch)
- [ ] Spawn follow-up task

### Recommendation

**No action required.** The registry is a local markdown table — no VCS or tracker integration. The `create-task/SKILL.md` (line ~552) does reference the epic registry for milestone lookups, but that dual-path logic lives entirely within `create-task`, not here. The registry format itself is platform-neutral.

### Minor Observation (optional, not a gap)

The registry entry has a second column that is always `-`. This column has no documented purpose. It could in future serve as a tracker key column (`github_issue` / `jira_key`). Currently it is harmless — it carries no platform assumption and requires no change for parity. If the team decides to add tracker cross-linking to epics in the registry, this is the natural slot. That decision belongs to a future task, not this audit.

---

## Summary Table

| Skill | GH calls | Jira calls | BB calls | Gap severity | Classification |
|-------|----------|------------|----------|--------------|----------------|
| `create-bug-report` | 0 | 0 | 0 | None | ✅ No gap |
| `epic-registry-manager` | 0 | 0 | 0 | None | ✅ No gap |

---

## Conclusion

Both skills are platform-agnostic. No inline fixes (Phase 4) and no follow-up tasks (Phase 5) are required.

**Parity status**: ✅ Confirmed — `create-bug-report` and `epic-registry-manager` require no platform-specific modifications. The Bitbucket+Jira parity audit loop opened by the original parity plan is now closed for these two skills.

---

## Audit Metadata

- **Auditor**: Claude (develop-task pipeline, task.8)
- **Method**: Full SKILL.md read + `grep -nE` for platform identifiers + Explore subagent dependency graph (14 files)
- **Date**: 2026-05-06
- **Related**: [GH Issue #14](https://github.com/Gamaroff/agent-skills/issues/14)
