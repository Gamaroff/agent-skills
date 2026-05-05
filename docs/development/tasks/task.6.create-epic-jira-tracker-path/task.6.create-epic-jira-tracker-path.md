---
id: task.6
title: "create-epic: verify and add Jira tracker path"
type: task
category: refactoring
priority: Medium
status: Ready for Review
created: 2026-05-05
assignee: TBD
effort: 1 day
depends_on: —
---

# Task 6 — create-epic: verify and add Jira tracker path

## 1. Overview

`skills/create-epic/SKILL.md` "Allowed writes" bullet lists "Tracker issue creation if the workflow includes it (GitHub/Jira issue for the epic itself)" as part of its scope, but the actual tracker-creation surface inside the skill body is unverified. `create-task` has a clean dual-path pattern (§4.5 Create Tracker Issue: detect via `JIRA_URL`, then either Jira REST POST or `gh issue create`) that `create-epic` should mirror. The Jira branch delegates to `/sync-jira-epic` (idempotent create-or-update).

**Scope**:

1. Verify what `create-epic` actually does at the tracker step (audit)
2. If absent or partial: add a dual-path block mirroring `create-task` §4.5 Create Tracker Issue, delegating Jira creation to `/sync-jira-epic`

**Key deliverables**:

- Audit notes captured in this task's implementation report
- Dual-path tracker creation block in `skills/create-epic/SKILL.md` (if missing)
- Updated SKILL.md
- Repackaged zip

**Expected outcome**: `create-epic` produces a tracker issue on either platform, consistent with `create-task`.

## 2. Motivation

**Current Problems**:

- "Allowed writes" bullet promises tracker creation but implementation surface is unverified — possible documentation/implementation drift
- BB+Jira projects creating new epics may be silently missing the Jira issue creation step
- Inconsistency with `create-task` (which is explicitly dual-path)

**Benefits**:

- Parity with `create-task` — easier to maintain
- Reuses `jira-epic-creator` / `sync-jira-epic` (no duplicated REST logic)
- Closes the documentation/implementation gap identified in the audit

## 3. Technical Background

**Reference (working dual-path)**: `skills/create-task/SKILL.md` §4.5 Create Tracker Issue.

```bash
if [ -n "$JIRA_URL" ]; then
  TRACKER="jira"
else
  TRACKER="github"
fi

# Jira branch: curl POST to ${JIRA_URL}/rest/api/2/issue with summary, description (ADF or wiki), issuetype=Task, priority
# GitHub branch: gh issue create --project --label --milestone with body
# Both branches: write tracker key/url back to frontmatter
```

**Relevant existing skills**:

- `skills/sync-jira-epic/SKILL.md` — **delegate of choice**. Idempotent create-or-update; concurrent-edit guard; ADF rendering. Handles both new-create and update.
- `skills/jira-epic-creator/SKILL.md` — single-purpose epic creator. **Not used in this task** (kept as a footnote for completeness).

**Open question** (to resolve in Phase 1): does `create-epic` already invoke `jira-epic-creator` somewhere? If yes, the work shrinks to verification + minor cleanup.

## 4. Scope

**In scope**:

- ✅ Audit `skills/create-epic/SKILL.md` end-to-end
- ✅ Add or correct the dual-path tracker block
- ✅ Reuse `jira-epic-creator` or `sync-jira-epic` for the Jira branch — no inline REST

**Out of scope**:

- ❌ Refactoring `jira-epic-creator` itself
- ❌ Changing epic file structure
- ❌ GitHub project-board logic beyond what `create-task` already does

## 5. Breaking Changes

None expected. If audit reveals existing GH-only tracker creation that this task makes dual-path, GH behavior is preserved verbatim and Jira behavior is added.

If audit reveals **no** current tracker creation despite the bullet at line 49: this task adds tracker creation for the first time. That is technically additive, but document clearly so users with existing epics aren't surprised by new Jira/GitHub issues appearing — the skill should only act on newly-created epics, not retroactively.

## 6. Implementation Plan

> Detailed implementation guide: [task.6.plan.create-epic-jira-tracker-path.md](task.6.plan.create-epic-jira-tracker-path.md)

**Phase 1 — Audit (Low risk, blocks decision)**

- Files: `skills/create-epic/SKILL.md`
- Changes:
  - [x] Read full SKILL.md
  - [x] Document: does it create a tracker issue today? Which platforms? Which step?
  - [x] Identify exact insertion point for dual-path block

**Phase 2 — Add/correct dual-path block (Medium risk)**

- Files: `skills/create-epic/SKILL.md`
- Changes:
  - [x] Insert platform detection (`if [ -n "$JIRA_URL" ]; then ...`) at the right step
  - [x] Jira branch: `/sync-jira-epic <epic-file>` (delegates) — writes `jira_key` + `jira_url` to frontmatter
  - [x] GitHub branch: `gh issue create` mirroring create-task §4.5 Create Tracker Issue (GitHub Path) — label `epic`, milestone handling, project board, Priority field
  - [x] Both branches: non-blocking on failure, log warning

**Phase 3 — Document opt-out (Low risk)**

- Files: `skills/create-epic/SKILL.md`
- Changes:
  - [x] Document `SKIP_TRACKER=1` env var for users who want docs-only epic creation
  - [x] Mention this in the "When NOT to use" section if present

**Phase 4 — Repackage and validate (Low risk)**

- Files: build artifact
- Changes:
  - [x] `quick_validate.py skills/create-epic`
  - [x] `package_skill.py skills/create-epic`

## 7. Files Summary

**Modified**:

1. ✅ `skills/create-epic/SKILL.md` — add/correct dual-path tracker block

**Build artifacts**:

2. `skills/create-epic/create-epic.zip`

**Reference (no edits)**:

- `skills/create-task/SKILL.md` §4.5 Create Tracker Issue — pattern source
- `skills/sync-jira-epic/SKILL.md` — Jira branch delegate
- `skills/jira-epic-creator/SKILL.md` — not used (alternative; kept for reference)

## 8. Testing Strategy

**Static**:

- `quick_validate.py skills/create-epic`
- Grep: any `gh issue create` is inside the github branch

**Dual-env smoke**:

1. **GitHub project**: `unset JIRA_URL`. Run `/create-epic` end-to-end. Expect: GH issue created, label `epic` applied, milestone set, project board updated, `github_issue` written to epic frontmatter.
2. **BB+Jira project**: `export JIRA_URL=...`. Run `/create-epic`. Expect: Jira epic created via `sync-jira-epic`, `jira_key` and `jira_url` written to epic frontmatter, no GitHub side effects.

**Edge cases**:

- `SKIP_TRACKER=1`: epic file written, no tracker side effects
- Pre-existing `github_issue` or `jira_key` in frontmatter: skill skips creation (idempotent)

## 9. Success Criteria

**Functional**:

- [x] Audit complete and findings documented
- [x] On GitHub: epic gets a tracker issue with correct labels, milestone, board placement
- [x] On BB+Jira: epic gets a Jira issue via delegation, no GH calls fire
- [x] Idempotent: re-running on an epic with existing tracker ref does not duplicate

**Code quality**:

- [x] No inline Jira REST in `create-epic` — all Jira work delegated
- [x] `quick_validate.py` passes

**Migration**:

- [x] Existing epics without tracker refs are NOT retroactively created — documented behavior
- [x] `SKIP_TRACKER=1` opt-out documented

## 10. Risk Assessment

**MEDIUM**

1. **Audit reveals no existing tracker creation, this task adds it**
   - Probability: Medium
   - Impact: Medium (new GH/Jira issues appear on next epic creation)
   - Mitigation: Communicate change clearly in commit message; provide opt-out

2. **`/sync-jira-epic` invoked from inside `create-epic` causes recursion or double-write**
   - Probability: Low
   - Impact: Medium
   - Mitigation: Verify `sync-jira-epic` is idempotent on first-call (it is — it's a create-or-update skill)

**LOW**

3. **Milestone auto-creation collisions on GitHub**
   - Probability: Low
   - Mitigation: Reuse the exact pattern from `create-task` §4.5 (GitHub Path, milestone handling)

## 11. Rollback Plan

**Immediate rollback (< 30 min)**: revert SKILL.md change, regenerate zip. Epic creation returns to pre-patch behavior.

**Forward fix**: most edge cases (e.g. milestone selection) tightenable in-place.

**Triggers**:

- Critical: any silent duplicate issue creation
- Non-critical: cosmetic issues with epic body rendering
