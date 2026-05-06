---
id: task.9
title: "Migrate leaf skills to skills-config.yaml platform-detection resolver"
type: task
category: refactoring
priority: High
status: 📋 Planned
created: 2026-05-06
assignee: TBD
effort: 1-1.5 days
depends_on: —
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #3)
---

# Task 9 — Migrate leaf skills to `skills-config.yaml` platform-detection resolver

## 1. Overview

`CLAUDE.md` (lines 56–69) declares a 4-level resolver order for platform detection: `skills-config.yaml` `tracker:`/`vcs:` keys → env vars → git remote → default. The canonical spec lives in `shared/resources/platform-detection.md`. CLAUDE.md explicitly notes that the leaf skills currently use **implicit detection only** (env var + git remote) and that honoring the config keys is a follow-up migration. This task is that follow-up.

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

**Affected skills** (per CLAUDE.md): `create-pr`, `create-task`, `finalise`, `review-story`, `review-task`, `qa-fix`, `ensure-epic-jira-issue`, `create-epic`. (`qa-task` writes co-located gates and does not currently route by platform; verify during audit.)

**Current pattern** (example from `create-task/SKILL.md:425`):

```bash
if [ -n "$JIRA_URL" ]; then
  TRACKER="jira"
else
  TRACKER="github"
fi
```

**Target pattern**:

```bash
# resolve-platform.sh — sourced or inlined
TRACKER=$(yq '.tracker // ""' skills-config.yaml 2>/dev/null)
VCS=$(yq '.vcs // ""' skills-config.yaml 2>/dev/null)
[ -z "$TRACKER" ] && TRACKER=$([ -n "$JIRA_URL" ] && echo jira || echo github)
[ -z "$VCS" ] && VCS=$(git remote get-url origin 2>/dev/null | grep -q bitbucket.org && echo bitbucket || echo github)
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

- [ ] Implement `resolve-platform.sh` exporting `TRACKER` and `VCS`
- [ ] Add `yq` graceful-degrade fallback (treat missing yq as "config not present")
- [ ] Add unit-style smoke test in skill comments (sample `skills-config.yaml` snippets + expected output)

### Phase 2 — Migrate read-heavy skills (Risk: Medium)

Files:

- `skills/create-pr/SKILL.md`
- `skills/create-task/SKILL.md`
- `skills/finalise/SKILL.md`
- `skills/qa-fix/SKILL.md`

Changes:

- [ ] Replace inline detection blocks with a `source` of the helper (path: `shared/resources/resolve-platform.sh` — `package_skill.py` rewrites at packaging time)
- [ ] Add a "Platform Detection" subsection that links to `platform-detection.md`
- [ ] Smoke-test each skill against a GH+GH project, GH+Jira project, and BB+Jira project

### Phase 3 — Migrate review/epic skills (Risk: Medium)

Files:

- `skills/review-story/SKILL.md`
- `skills/review-task/SKILL.md`
- `skills/ensure-epic-jira-issue/SKILL.md`
- `skills/create-epic/SKILL.md`

Changes:

- [ ] Same migration pattern as Phase 2
- [ ] Verify Jira-only paths still gate on `TRACKER=jira` after migration

### Phase 4 — CLAUDE.md update (Risk: Low)

Files:

- `CLAUDE.md`

Changes:

- [ ] Remove the "currently use implicit detection only" caveat from the Platform Detection section
- [ ] Note that the helper is the canonical entry point

## 7. Files Summary

**New**:

- `shared/resources/resolve-platform.sh`

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

- [ ] All 8 skills resolve platform via the helper
- [ ] `skills-config.yaml` `tracker:` / `vcs:` keys override env vars and git remote
- [ ] Behaviour unchanged when config keys absent

**Code Quality**:

- [ ] Single source of truth (`resolve-platform.sh`); no duplicated detection logic
- [ ] CLAUDE.md no longer describes detection as a "follow-up migration"
- [ ] Each migrated skill documents its detection point with a one-line link

**Migration**:

- [ ] `package_skill.py` correctly rewrites `shared/resources/resolve-platform.sh` paths into bundled zips

## 10. Risk Assessment

**Medium Risk** — Skill behaviour regression:

- Probability: Medium. Impact: skills fan out to wrong platform.
- Mitigation: per-skill smoke tests in 3 project shapes; keep env-var fallback as Tier 2.

**Low Risk** — `yq` not installed in some environments:

- Mitigation: helper degrades to env/git-remote path when `yq` missing; documented in `platform-detection.md`.

## 11. Rollback Plan

**Immediate (< 30 min)**: revert the per-skill commits; helper file can stay (unused). Each skill commit is independent.

**Triggers**: skill calls the wrong tracker / VCS in a real project; bug reports referencing platform misrouting.
