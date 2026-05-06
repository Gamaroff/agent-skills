---
id: task.15
title: "Delete develop-task shadow directory and gitignore unpacked skill artifacts"
type: task
category: cleanup
priority: Low
status: 📋 Planned
created: 2026-05-06
assignee: TBD
effort: 0.1 day
depends_on: —
source_plan: ~/.claude/plans/review-the-develop-task-and-reactive-boot.md (Finding #9)
---

# Task 15 — Delete `develop-task` shadow directory and gitignore unpacked skill artifacts

## 1. Overview

`skills/develop-task/develop-task/` (containing its own `SKILL.md`, `references/`, `scripts/`, `develop-task.zip`) exists locally but isn't git-tracked (`git ls-files` shows only the top-level `SKILL.md` + `scripts/`). It's almost certainly a leftover from a prior `package_skill.py` install or local test extraction. It's confusing during audits because the nested directory has the same name as its parent.

**Scope**: delete the shadow directory and extend `.gitignore` to prevent re-introduction.

**Key deliverables**:

- Shadow directory removed
- `.gitignore` updated to ignore unpacked-skill output (e.g. `skills/*/<same-name>/` or any nested duplicate)
- Optionally: a guard in `package_skill.py` warning when output would land inside the source dir

**Expected outcome**: clean repo, audits no longer trip over the duplicate.

## 2. Motivation

**Current Problems**:

- Audits report the shadow dir as a separate skill source, leading to confusing "two SKILL.md" findings
- Risk that someone edits the shadow copy thinking it's canonical
- Drift: the shadow's content can fall behind the parent

**Benefits**:

- Trivial cleanup with outsized clarity benefit
- Prevents repeat occurrence

## 3. Technical Background

**Verified state** (2026-05-06):

```
$ ls skills/develop-task/develop-task/
develop-task.zip  references  scripts  SKILL.md

$ git ls-files skills/develop-task/
skills/develop-task/SKILL.md
skills/develop-task/scripts/on-precompact.sh
```

The nested directory is entirely untracked.

**Likely cause**: someone ran `unzip skills/develop-task/develop-task.zip` from inside `skills/develop-task/` — the zip's top-level entry is `develop-task/`, producing `skills/develop-task/develop-task/...`.

**Current `.gitignore`** (relevant lines):

```
skills/*/*.zip
```

This ignores zips at one level but not the unpacked content.

## 4. Scope

**In Scope**:

- ✅ Delete `skills/develop-task/develop-task/`
- ✅ Extend `.gitignore` with a pattern that catches nested-duplicate skill dirs
- ✅ Sanity-check other skills for the same shadow pattern

**Out of Scope**:

- ❌ Refactoring `package_skill.py` (file a follow-up if a guard is desired)
- ❌ Running a full repo cleanup of other untracked artifacts

## 5. Breaking Changes

None. Untracked content removal doesn't affect any tracked file.

## 6. Implementation Plan

### Phase 1 — Audit other skills (Risk: Low)

Files:

- (read-only)

Changes:

- [ ] `for d in skills/*/; do name=$(basename "$d"); [ -d "$d$name" ] && echo "shadow: $d$name"; done` — list any other shadow dirs
- [ ] Document findings in implementation report

### Phase 2 — Delete shadow + gitignore (Risk: Low)

Files:

- `.gitignore`
- `skills/develop-task/develop-task/` (delete)

Changes:

- [ ] `rm -rf skills/develop-task/develop-task/`
- [ ] Add to `.gitignore`:
  ```
  # Unpacked skill output — never check in
  skills/*/*/SKILL.md
  skills/*/*/develop-task.zip
  ```
  (refine based on Phase 1 audit; ideally a single pattern catches the nested-duplicate case)
- [ ] Verify `git status` is clean after

### Phase 3 — package_skill.py guard (optional, Risk: Low)

Files:

- `skills/create-skill/scripts/package_skill.py`

Changes:

- [ ] Add a check: if output path is inside the source skill dir, warn loudly and abort
- [ ] Defer to a follow-up task if more involved

## 7. Files Summary

**Deleted**:

- `skills/develop-task/develop-task/` (entire untracked subtree)

**Modified**:

- `.gitignore`
- (optionally) `skills/create-skill/scripts/package_skill.py`

## 8. Testing Strategy

- **After delete**: `ls skills/develop-task/` shows only tracked files (`SKILL.md`, `scripts/`, `develop-task.zip`)
- **After gitignore**: re-create a shadow dir manually and verify `git status` does not list it
- **Audit**: run the Phase 1 audit script after the change to confirm no other shadows

## 9. Success Criteria

**Functional**:

- [ ] `skills/develop-task/develop-task/` no longer exists
- [ ] `.gitignore` prevents future re-introduction
- [ ] No other skills have a shadow dir (or, if they do, they're cleaned in the same PR)

**Code Quality**:

- [ ] `git status` clean after the change

## 10. Risk Assessment

**Low Risk** — Accidental deletion of a real skill copy:

- Probability: Very low. Impact: medium.
- Mitigation: confirm the dir is fully untracked (`git ls-files` zero hits inside it) before `rm -rf`.

## 11. Rollback Plan

**Immediate (< 5 min)**: re-extract the zip if anyone needs the unpacked tree locally:
```bash
unzip skills/develop-task/develop-task.zip -d skills/develop-task/
```
The deleted content is reproducible from the canonical source. No durable state lost.
