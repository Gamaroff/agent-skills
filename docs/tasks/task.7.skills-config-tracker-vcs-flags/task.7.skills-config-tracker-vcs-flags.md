---
id: task.7
title: "skills-config: document explicit tracker and vcs flags"
type: task
category: documentation
priority: Low
status: accepted
completed_date: 2026-05-06
pr_number: 13
created: 2026-05-05
assignee: TBD
effort: 0.5 day
depends_on: —
github_issue: 12
---

# Task 7 — skills-config: document explicit tracker and vcs flags

**Tracker**: [#12](https://github.com/Gamaroff/agent-skills/issues/12)
**Review**: ✅ All review recommendations from `task.7.skills-config-tracker-vcs-flags.review.2026-05-06.md` implemented 2026-05-06

## 1. Overview

Skills currently detect tracker (Jira vs GitHub) by checking `JIRA_URL`, and detect VCS (Bitbucket vs GitHub) by parsing `git remote get-url origin`. There is no explicit override and no documentation of this convention in `skills-config.sample.yaml`. Two failure modes:

- **Ambiguity**: a project with both `JIRA_URL` set *and* a github.com remote (e.g. mirror, migration in progress) gets routed inconsistently across skills
- **Onboarding**: teams have no documented switch — they discover the convention by reading skill bodies

**Scope**: Add explicit `tracker:` and `vcs:` keys to `skills-config.sample.yaml` (with `auto` defaults preserving current behavior) and document in CLAUDE.md.

**Key deliverables**:

- New keys documented in `skills-config.sample.yaml`
- Resolver order documented (config > env > git remote > default)
- CLAUDE.md updated with platform-detection convention
- Optional: a small shared snippet `shared/resources/platform-detection.md` that skills can reference

**Expected outcome**: teams can explicitly opt in/out of platform paths regardless of git remote or env state.

## 2. Motivation

**Current Problems**:

- Implicit detection is invisible to users — surprising failures
- Mirror repos (BB primary, GH read-only) get detected as GitHub by `git remote` even when intent is BB+Jira
- Migration scenarios (moving from GH to BB or vice versa) have no clean override
- Skill authors duplicate detection blocks — drift potential

**Benefits**:

- Single documented convention
- Explicit override removes ambiguity
- New skills (and the audit task task.8) can reference one canonical spec instead of re-deriving

## 3. Technical Background

**Current detection** (across multiple skills):

```bash
# Tracker
if [ -n "$JIRA_URL" ]; then TRACKER="jira"; else TRACKER="github"; fi

# VCS
REMOTE_URL=$(git remote get-url origin)
if echo "$REMOTE_URL" | grep -qi "github\.com"; then PLATFORM="github"
elif echo "$REMOTE_URL" | grep -qi "bitbucket\.org"; then PLATFORM="bitbucket"; fi
```

**Target convention** (resolver order):

1. Read `tracker:` and `vcs:` from `skills-config.yaml` if present
2. If unset or `auto`, fall back to current detection (env var + git remote)
3. Honor explicit values: `tracker: jira | github` and `vcs: bitbucket | github`

**Sample config additions**:

```yaml
# Platform routing — controls which tracker/vcs surfaces skills target
# Default `auto` preserves current implicit detection (JIRA_URL env + git remote URL)
tracker: auto   # auto | jira | github
vcs: auto       # auto | bitbucket | github
```

## 4. Scope

**In scope**:

- ✅ `skills-config.sample.yaml` — add documented keys
- ✅ `CLAUDE.md` — document platform-detection convention and resolver order
- ✅ Optional `shared/resources/platform-detection.md` — single canonical spec referenced by skills

**Out of scope**:

- ❌ Migrating existing skills to read the new keys (that's a follow-up — this task documents the contract; migration is per-skill and is implicit in tasks 3-6)
- ❌ Adding a skills-config loader if one doesn't exist (current skills read the file ad-hoc; not changing that pattern)

## 5. Breaking Changes

None. New keys are additive. Default `auto` preserves all current behavior. Skills that don't yet read the keys are unaffected.

## 6. Implementation Plan

> Detailed implementation guide: [task.7.plan.skills-config-tracker-vcs-flags.md](task.7.plan.skills-config-tracker-vcs-flags.md)

**Phase 1 — Update sample config (Low risk)**

- Files: `skills-config.sample.yaml`
- Changes:
  - [x] Add `tracker:` and `vcs:` keys with comments explaining values and resolver order

**Phase 2 — Document in CLAUDE.md (Low risk)**

- Files: `CLAUDE.md`
- Changes:
  - [x] Add a "Platform Detection" subsection under "Configuration"
  - [x] Spell out resolver order (config > env > git remote > default)
  - [x] List which skills currently honor the convention

**Phase 3 — Author shared canonical spec (Low risk, optional)**

- Files: `shared/resources/platform-detection.md` (new)
- Changes:
  - [x] Document detection logic, code snippet, env vars, and edge cases
  - [x] Skills (qa-fix, finalise, create-pr, create-task, create-epic, ensure-epic-*) can reference this file via the explicit `shared/resources/platform-detection.md` path — `package_skill.py` will auto-bundle on package

**Phase 4 — Validate (Low risk)**

- Files: build artifact verification
- Changes:
  - [x] Spot-check that adding the shared resource (if Phase 3) doesn't break package_skill.py path rewrites
  - [x] Lint sample.yaml for valid YAML

## 7. Files Summary

**Modified**:

1. ✅ `skills-config.sample.yaml` — add `tracker:` and `vcs:` keys
2. ✅ `CLAUDE.md` — document the convention

**New (optional)**:

3. ✅ `shared/resources/platform-detection.md` — canonical spec

**No build artifacts** — config and docs only

## 8. Testing Strategy

- YAML validity: `python -c "import yaml; yaml.safe_load(open('skills-config.sample.yaml'))"`
- Markdown lint: visual review of CLAUDE.md changes
- Cross-reference: if Phase 3 done, verify any skill that adds a reference to `shared/resources/platform-detection.md` gets it bundled via `package_skill.py`

## 9. Success Criteria

**Functional**:

- [x] `skills-config.sample.yaml` documents both keys with `auto` default
- [x] CLAUDE.md describes the resolver order
- [x] (Optional) `shared/resources/platform-detection.md` exists and is referenced by at least one skill

**Code quality**:

- [x] Sample YAML parses
- [x] No invalid markdown

**Migration**:

- [x] No code changes required for skills to keep working — they continue using current implicit detection
- [x] Future skills can opt into reading the keys

## 10. Risk Assessment

**LOW**

1. **Drift between documented convention and skill implementations**
   - Probability: Medium
   - Impact: Low (docs are leading; skills migrate later)
   - Mitigation: list non-honoring skills explicitly in CLAUDE.md so the gap is visible

## 11. Rollback Plan

**Immediate rollback**: revert sample.yaml and CLAUDE.md edits. No runtime impact.

**Triggers**: none expected — pure documentation change.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-05-06
**Quality Score**: 97/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.7.qa.1.skills-config-tracker-vcs-flags.md](./task.7.qa.1.skills-config-tracker-vcs-flags.md)
- **Gate File**: [task.7.gate.1.skills-config-tracker-vcs-flags.yml](./task.7.gate.1.skills-config-tracker-vcs-flags.yml)

### Test Coverage Summary
- **Tests Executed**: 4 (YAML lint + content verification checks)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. All success criteria met. Pure additive docs/config — zero regression risk.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: [task.7.qa.1.skills-config-tracker-vcs-flags.md](./task.7.qa.1.skills-config-tracker-vcs-flags.md)
**Gate File**: [task.7.gate.1.skills-config-tracker-vcs-flags.yml](./task.7.gate.1.skills-config-tracker-vcs-flags.yml)
**Gate Status**: ✅ PASS
**Quality Score**: 97/100

All Definition of Done criteria verified:

✅ **Implementation Phases:** All 4/4 complete — sample yaml, CLAUDE.md, platform-detection.md, validation
✅ **Tests/Validation:** YAML lint passes; no test suite needed (docs-only)
✅ **Success Criteria:** All 7 criteria met
✅ **PR:** #13 OPEN — feat(skills-config): document explicit tracker and vcs platform flags
✅ **Documentation:** CLAUDE.md Platform Detection section + canonical spec in shared/resources/
✅ **Security Review:** PASS — no auth/data/permission changes
✅ **Compliance Review:** N/A — no PII, no UI, no financial data
✅ **NFR:** Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

**Task marked as ACCEPTED on:** 2026-05-06

**Detailed Verification Log:** See [task.7.dod.1.skills-config-tracker-vcs-flags.md](./task.7.dod.1.skills-config-tracker-vcs-flags.md)
