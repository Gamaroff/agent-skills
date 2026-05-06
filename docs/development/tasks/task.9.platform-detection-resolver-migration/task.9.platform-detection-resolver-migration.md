---
id: task.9
title: "Migrate leaf skills to skills-config.yaml platform-detection resolver"
type: task
category: refactoring
priority: High
status: accepted
review: ✅ All review recommendations from `task.9.platform-detection-resolver-migration.review.2026-05-06.md` implemented 2026-05-06
created: 2026-05-06
assignee: TBD
effort: 1-1.5 days
depends_on: —
github_issue: 16
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #3)
---

# Task 9 — Migrate leaf skills to `skills-config.yaml` platform-detection resolver

## 1. Overview

`CLAUDE.md` (lines 87–88) declares a 4-level resolver order for platform detection: `skills-config.yaml` `tracker:`/`vcs:` keys → env vars → git remote → default. The canonical spec lives in `shared/resources/platform-detection.md`. CLAUDE.md explicitly notes that the leaf skills currently use **implicit detection only** (env var + git remote) and that honoring the config keys is a follow-up migration. This task is that follow-up.

**Scope**: implement the resolver as a sourceable bash helper, then migrate each affected skill to use it.

**Key deliverables**:

- A reusable resolver snippet in `shared/resources/` (sourced or inlined per skill at package time)
- Each affected skill reads `skills-config.yaml` `tracker:` / `vcs:` keys before falling back to env vars / git remote
- Behaviour unchanged when config keys are absent (backward compatible)

**Expected outcome**: BB+Jira and GH+Jira combinations resolve correctly per project config, not by accidental env-var presence.

## 2. Motivation

**Current Problems**:

- Every leaf skill duplicates `if [ -n "$JIRA_URL" ]; then TRACKER=jira; else TRACKER=github; fi` — fragile and impossible to override per-project
- `skills-config.yaml` `tracker:` / `vcs:` keys are documented but read by zero skills
- Bitbucket+Jira projects cannot be expressed without env-var hacks
- Drift risk: new skills will copy the implicit pattern unless a canonical helper exists

**Benefits**:

- Single source of truth for platform resolution; new skills source one snippet
- Projects can pin their tracker/vcs explicitly in `skills-config.yaml`
- `CLAUDE.md` documented behaviour matches actual behaviour

## 3. Technical Background

**Canonical resolver order** (from `shared/resources/platform-detection.md`):

1. `skills-config.yaml` explicit `tracker:` (jira | github) and `vcs:` (bitbucket | github)
2. Env vars: `JIRA_URL` set → tracker=jira; otherwise github
3. Git remote: `bitbucket.org` in origin → vcs=bitbucket; `github.com` → vcs=github
4. Default: github / github

**Affected skills**: `create-pr`, `create-task`, `finalise`, `review-story`, `review-task`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic`.

> Note: CLAUDE.md L88 and `shared/resources/platform-detection.md` "Skills using implicit detection today" currently list 7 (no `review-task`). Audit confirmed `review-task` Step 10 branches on `JIRA_URL`, so it belongs in this migration. Phase 4 patches both docs to add it.

`qa-task` is **out of scope**: writes co-located gates and does not route by platform (confirmed by audit — no `JIRA_URL` / `bitbucket.org` branches).

**Current pattern** (example from `create-task/SKILL.md:425`):

```bash
if [ -n "$JIRA_URL" ]; then
  TRACKER="jira"
else
  TRACKER="github"
fi
```

**Target pattern** (mirrors canonical `shared/resources/platform-detection.md` — uses python+pyyaml, no new tool dependency):

```bash
# resolve-platform.sh — sourced or inlined
read_config_key() {
  python -c "
import yaml
try:
    with open('skills-config.yaml') as f:
        print(yaml.safe_load(f).get('$1', 'auto'))
except Exception:
    print('auto')
" 2>/dev/null
}

TRACKER=$(read_config_key tracker)
[ "$TRACKER" = "auto" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)

VCS=$(read_config_key vcs)
[ "$VCS" = "auto" ] && VCS=$(git remote get-url origin 2>/dev/null | grep -qi bitbucket.org && echo bitbucket || echo github)
```

## 4. Scope

**In Scope**:

- ✅ Reusable resolver helper script/snippet in `shared/resources/`
- ✅ Update of 8 leaf skills to call the helper before any tracker/VCS branch
- ✅ Documentation update in each skill's "Detection" section pointing at the helper
- ✅ Verification that `package_skill.py` bundles the helper into each skill's zip when referenced

**Out of Scope**:

- ❌ Changing the resolver order (already specified in `platform-detection.md`)
- ❌ Adding new platforms (GitLab, etc.)
- ❌ Reworking how skills emit comments/issues — only how they decide which platform

## 5. Breaking Changes

None for end users. Behaviour is unchanged when `skills-config.yaml` lacks `tracker:` / `vcs:` keys.

For skill maintainers: any new skill must source the helper rather than reinvent detection.

## 6. Implementation Plan

### Phase 1 — Build the resolver helper (Risk: Low)

Files:

- `shared/resources/resolve-platform.sh` (new)
- `shared/resources/platform-detection.md` (update: cross-reference the helper)

Changes:

- [x] Implement `resolve-platform.sh` exporting `TRACKER` and `VCS` using python+pyyaml (no new tool deps)
- [x] Graceful-degrade when python or pyyaml unavailable, or `skills-config.yaml` missing/malformed → returns `"auto"` and falls through to env-var / git-remote tier
- [x] Add `shared/resources/resolve-platform.test.sh` covering: GH+GH, GH+Jira, BB+Jira, missing python, missing pyyaml, malformed yaml
- [x] Document invocation: `bash shared/resources/resolve-platform.test.sh` in test header comment

### Phase 2 — Migrate read-heavy skills (Risk: Medium)

Files:

- `skills/create-pr/SKILL.md`
- `skills/create-task/SKILL.md`
- `skills/finalise/SKILL.md`
- `skills/qa-fix/SKILL.md`

Changes:

- [x] Replace inline detection blocks with a `source` of the helper (path: `shared/resources/resolve-platform.sh` — `package_skill.py` rewrites at packaging time)
- [x] Add a "Platform Detection" subsection that links to `platform-detection.md`
- [x] Smoke-test each skill against a GH+GH project, GH+Jira project, and BB+Jira project

### Phase 3 — Migrate review/epic skills (Risk: Medium)

Files:

- `skills/review-story/SKILL.md`
- `skills/review-task/SKILL.md`
- `skills/ensure-epic-jira-issue/SKILL.md`
- `skills/create-epic/SKILL.md`

Changes:

- [x] Same migration pattern as Phase 2
- [x] Verify Jira-only paths still gate on `TRACKER=jira` after migration
- [x] **Jira-only no-op**: when `TRACKER!=jira`, `ensure-epic-jira-issue` exits 0 with `ℹ️  Skipped: tracker is not jira` (no error). Same pattern for any other Jira-only path.

### Phase 4 — CLAUDE.md update (Risk: Low)

Files:

- `CLAUDE.md`

Changes:

- [x] Remove the "currently use implicit detection only" caveat from `CLAUDE.md` L87–88
- [x] Add `review-task` to the migrated-skills list in CLAUDE.md and `shared/resources/platform-detection.md` ("Skills using implicit detection today" → relabel as "Skills migrated to the helper")
- [x] Note that `shared/resources/resolve-platform.sh` is the canonical entry point; reference it from `platform-detection.md`

## 7. Files Summary

**New**:

- `shared/resources/resolve-platform.sh`
- `shared/resources/resolve-platform.test.sh`

**Modified**:

- `shared/resources/platform-detection.md`
- `skills/create-pr/SKILL.md`
- `skills/create-task/SKILL.md`
- `skills/finalise/SKILL.md`
- `skills/qa-fix/SKILL.md`
- `skills/review-story/SKILL.md`
- `skills/review-task/SKILL.md`
- `skills/ensure-epic-jira-issue/SKILL.md`
- `skills/create-epic/SKILL.md`
- `CLAUDE.md`

## 8. Testing Strategy

- **Manual**: smoke-test each migrated skill in three project shapes (GH+GH, GH+Jira, BB+Jira). Verify tracker comments / issue creation hit the right platform.
- **Static**: `grep -rn "JIRA_URL" skills/` should only appear inside the helper or env-var fallback section, not as the primary branch.
- **Regression**: re-run `/develop-task` end-to-end on a GH project; pipeline must complete unchanged.

## 9. Success Criteria

**Functional**:

- [x] All 8 skills resolve platform via the helper
- [x] `skills-config.yaml` `tracker:` / `vcs:` keys override env vars and git remote
- [x] Behaviour unchanged when config keys absent
- [x] Jira-only skills (e.g. `ensure-epic-jira-issue`) no-op gracefully when `TRACKER!=jira` (exit 0 + informational message)
- [x] `resolve-platform.test.sh` passes for all 6 fixture scenarios (3 project shapes + 3 degraded)

**Code Quality**:

- [x] Single source of truth (`resolve-platform.sh`); no duplicated detection logic
- [x] CLAUDE.md no longer describes detection as a "follow-up migration"
- [x] Each migrated skill documents its detection point with a one-line link

**Migration**:

- [x] `package_skill.py` correctly rewrites `shared/resources/resolve-platform.sh` paths into bundled zips (uses existing shared/resources/ regex — no changes needed)

## 10. Risk Assessment

**Medium Risk** — Skill behaviour regression:

- Probability: Medium. Impact: skills fan out to wrong platform.
- Mitigation: per-skill smoke tests in 3 project shapes; keep env-var fallback as Tier 2.

**Low Risk** — python or pyyaml unavailable in some environments:

- Mitigation: `read_config_key` returns `"auto"` on any exception; helper falls through to env-var / git-remote tier. Documented in `platform-detection.md`.

## 11. Rollback Plan

**Immediate (< 30 min)**: revert the per-skill commits; helper file can stay (unused). Each skill commit is independent.

**Triggers**: skill calls the wrong tracker / VCS in a real project; bug reports referencing platform misrouting.

## Definition of Done — PASSED ✅

**Status:** ACCEPTED

### QA Report Summary
- **QA Report**: [task.9.qa.1.platform-detection-resolver-migration.md](./task.9.qa.1.platform-detection-resolver-migration.md)
- **Gate File**: [task.9.gate.1.platform-detection-resolver-migration.yml](./task.9.gate.1.platform-detection-resolver-migration.yml)
- **Gate Status**: ✅ PASS (98/100)

All Definition of Done criteria verified:

✅ **Success Criteria:** All 5 functional + 3 code quality criteria met
✅ **Tests:** 6/6 resolver scenarios pass (resolve-platform.test.sh)
✅ **PR:** #23 open — solo-maintainer project; QA gate PASS serves as quality validation
✅ **Documentation:** platform-detection.md and CLAUDE.md updated
✅ **Security Review:** PASS — no credentials, no injection risk, graceful degrade
✅ **Compliance Review:** N/A — no personal data, no UI, no financial transactions
✅ **NFR:** Security PASS, Performance PASS, Reliability PASS, Maintainability PASS

**Detailed Verification Log:** See [task.9.dod.1.platform-detection-resolver-migration.md](./task.9.dod.1.platform-detection-resolver-migration.md)

**Task marked as ACCEPTED on:** 2026-05-06

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-06
**Quality Score**: 98/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.9.qa.1.platform-detection-resolver-migration.md](./task.9.qa.1.platform-detection-resolver-migration.md)
- **Gate File**: [task.9.gate.1.platform-detection-resolver-migration.yml](./task.9.gate.1.platform-detection-resolver-migration.yml)

### Test Coverage Summary
- **Tests Executed**: 6 (resolve-platform.test.sh scenarios)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. All 8 skills successfully migrated to canonical resolver. Resolver test suite covers all platform combination scenarios including graceful degrade paths.

---

## 12. Dev Agent Record

**Implementation Summary**: Created `shared/resources/resolve-platform.sh` (sourceable bash helper) and `shared/resources/resolve-platform.test.sh` (6-scenario test suite). Migrated all 8 leaf skills to source the helper before any tracker/VCS branch. Updated `shared/resources/platform-detection.md` to reference the helper and relabel the skills list. Removed "follow-up migration" caveat from CLAUDE.md.

**Start Date**: 2026-05-06
**Completion Date**: 2026-05-06

**Implementation Approach**:

- `resolve-platform.sh`: python+pyyaml (Tier 1) + awk fallback (Tier 2 — handles environments without pyyaml) + "auto" graceful degrade → env-var / git-remote tier. Added awk fallback after discovering pyyaml absent in dev environment; tests confirmed all 6 fixture scenarios pass with awk path.
- `create-pr`, `qa-fix`, `finalise`: used `PLATFORM="$VCS"` alias to preserve downstream branching logic (no rename of PLATFORM variable needed).
- `ensure-epic-jira-issue`: added Step EJ0 guard — exits 0 with informational message when `TRACKER!=jira`. Updated description to reference TRACKER instead of JIRA_URL.
- `ensure-epic-github-issue`: description updated (caller reference changed from JIRA_URL to TRACKER) — no workflow changes needed (already GitHub-only).
- `package_skill.py`: no changes needed — existing `shared/resources/` path regex already handles `.sh` files.

**Testing Results**: `bash shared/resources/resolve-platform.test.sh` → 6/6 scenarios pass. Static check: zero `JIRA_URL` detection-trigger references remain in the 8 migrated SKILL.md files.

**File List**:

New:
- `shared/resources/resolve-platform.sh`
- `shared/resources/resolve-platform.test.sh`

Modified:
- `shared/resources/platform-detection.md`
- `skills/create-pr/SKILL.md`
- `skills/create-task/SKILL.md`
- `skills/finalise/SKILL.md`
- `skills/qa-fix/SKILL.md`
- `skills/review-story/SKILL.md`
- `skills/review-task/SKILL.md`
- `skills/ensure-epic-jira-issue/SKILL.md`
- `skills/ensure-epic-github-issue/SKILL.md`
- `skills/create-epic/SKILL.md`
- `CLAUDE.md`
- `docs/development/tasks/task.9.platform-detection-resolver-migration/task.9.platform-detection-resolver-migration.md`

**Change Log**:

| Date | Change |
|------|--------|
| 2026-05-06 | Phase 1: created resolve-platform.sh + test suite; updated platform-detection.md |
| 2026-05-06 | Phase 2: migrated create-pr, create-task, finalise, qa-fix |
| 2026-05-06 | Phase 3: migrated review-story, review-task, ensure-epic-jira-issue, create-epic; updated ensure-epic-github-issue description |
| 2026-05-06 | Phase 4: updated CLAUDE.md — removed follow-up caveat, added helper reference |
