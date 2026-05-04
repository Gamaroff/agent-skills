---
id: task.1
title: "Extract shared develop-pipeline body into shared/resources (Option C)"
type: task
category: refactoring
priority: Medium
effort: 4-8 hours
status: 🔄 In Progress
created: 2026-05-04
assignee: gamaroff
branch: chore/develop-skill-extract
github_issue: 1
github_issue_url: https://github.com/Gamaroff/agent-skills/issues/1
related-skills:
  - develop-story
  - develop-task
  - develop
  - qa-story
  - qa-task
depends_on: []
---

# Task 1: Extract shared develop-pipeline body into shared/resources (Option C)

**GitHub Issue**: [#1](https://github.com/Gamaroff/agent-skills/issues/1)
**Review**: ✅ All review recommendations from `task.1.review.2026-05-04.md` implemented 2026-05-04

## 1. Overview

`skills/develop-story/SKILL.md` (1192 lines) and `skills/develop-task/SKILL.md` (1153 lines) currently duplicate ~95% of their pipeline contract content. Recent fixes (cleanup-brief items 1-13) had to be applied to both files in lockstep, with active drift risk every time. This task extracts the shared pipeline contract blocks into `shared/resources/` per Option C from the original cleanup brief, leaving each SKILL.md to host only the genuinely variant material (file naming, tracker frontmatter handling, status state machine, sub-skill names).

**Scope**: extract 5 logical blocks into independent shared docs; rewrite both SKILLs to reference them; verify packager auto-bundles correctly.

**Key Deliverables**:
- 3-5 new files under `shared/resources/develop-pipeline-*.md`
- `develop-story/SKILL.md` and `develop-task/SKILL.md` slimmed to variant-only content + references
- All five affected skills (`develop-story`, `develop-task`, `develop`, `qa-story`, `qa-task`) re-validated and repackaged with shared docs bundled

**Expected Outcome**: a future fix to the autonomous-defaults table or resume-verification contract requires editing one shared file, not two SKILL.mds. Drift becomes structurally impossible for extracted blocks.

## 2. Motivation

### Current Problems

- **Duplication ~95%**: `diff -u skills/develop-story/SKILL.md skills/develop-task/SKILL.md` produced a 1048-line patch against ~1200-line files (commit `da90f9e` and follow-ups all required dual edits).
- **Drift risk in active maintenance**: The recent cleanup-brief items 1-13 batch changed status schemas, stall semantics, plan-freshness checks, lite-mode contracts — each fix had to be hand-applied twice, and reviewers had no structural guarantee both copies stayed aligned.
- **Variance points buried**: The genuinely different blocks (story uses `Status: Ready for Review`, task uses lowercase `accepted`; story requires `jira_key` frontmatter, task silent-skips when missing) are obscured by the surrounding duplicate prose.
- **Onboarding cost**: A reader trying to understand "what does the develop pipeline do" reads the same contract twice and has to spot the differences manually.

### Benefits of Solution

- **Drift becomes impossible** for extracted contract blocks (single source of truth).
- **Variance is visible**: with shared bodies extracted, the story-vs-task SKILL.mds shrink to the variant material, making it obvious where they actually differ.
- **Faster future fixes**: a bug like cleanup-brief item 11 (stall check) becomes one edit to one file instead of two coordinated edits.
- **Packager already supports this**: `package_skill.py` auto-bundles `shared/resources/X` references and rewrites paths in zips. Existing pattern (`develop-pipeline-pause.md` is referenced from 3 SKILLs today). No tooling change needed.
- **Lower review burden**: PRs that touch the contract show a single shared-resource diff, not two parallel SKILL.md diffs.

## 3. Technical Background

### Current Architecture

```
skills/develop-story/SKILL.md  (1192 lines)
  ├── PreCompact hook setup        ┐
  ├── Pipeline lock contract        │
  ├── Caller detection rules        │
  ├── Step 1-9 pipeline body        ├─── ~95% identical to develop-task
  ├── Resume verification table     │
  ├── Stall/loop semantics          │
  ├── Lite-mode contract            │
  ├── Autonomous-defaults table     ┘
  └── Story-specific bits           ←  variant: jira_key required, Status=Ready for Review

skills/develop-task/SKILL.md   (1153 lines)
  ├── (same blocks as above)
  └── Task-specific bits            ←  variant: jira_key optional silent-skip, status=accepted lowercase
```

`shared/resources/` already hosts:
- `develop-pipeline-pause.md` — pause/resume contract (pre-existing extraction)
- `code-vs-test-validation.md`
- `jira-sync.js`

### Target Architecture

```
shared/resources/
  ├── develop-pipeline-pause.md                    (existing)
  ├── develop-pipeline-autonomous-defaults.md      ←  NEW
  ├── develop-pipeline-resume-contract.md          ←  NEW   (verification table + plan freshness + stall semantics)
  ├── develop-pipeline-lite-mode.md                ←  NEW
  ├── develop-pipeline-bypass-contract.md          ←  NEW   (optional, may merge with lite-mode)
  └── develop-pipeline-hook-contract.md            ←  NEW   (optional, may merge with pause doc)

skills/develop-story/SKILL.md   (target ~400-500 lines)
  ├── Story-specific frontmatter handling (jira_key required)
  ├── Story status state machine (Draft → Ready for Review → Done)
  ├── Sub-skill references (review-story, qa-story, qa-fix)
  ├── File naming patterns for stories
  └── References to shared/resources/develop-pipeline-*.md

skills/develop-task/SKILL.md    (target ~400-500 lines)
  └── (parallel structure, task-specific variant)
```

### Packager Contract (already in place)

`skills/create-skill/scripts/package_skill.py` (lines 84-132) regex-scans every `.md` file in a skill for `shared/resources/X` references, copies referenced files into `references/X` inside the zip, and rewrites the SKILL.md path so installed skills are fully self-contained. **No packager change needed for this task.**

### Truly-Variant Content (stays per-skill, do NOT extract)

- File naming patterns: `story.{epic}.{story}.{name}.md` vs `task.{n}.{name}.md`
- Tracker frontmatter handling: story requires `jira_key`, task silent-skips when absent
- Status state machine: story uses `Draft → Ready for Review → Done`; task uses `Planned → In Progress → accepted`
- Sub-skill names: `review-story`/`qa-story`/`finalise` vs `review-task`/`qa-task`/`finalise`
- Error messages and prompts that name the artifact type
- QA gate path: story gates `docs/qa/gates/story.{epic}.{story}.gate.{N}.{name}.yml` vs task gates co-located in task dir

## 4. Scope

### In Scope

- ✅ Extract autonomous-defaults table → shared/resources/develop-pipeline-autonomous-defaults.md
- ✅ Extract resume verification table + plan freshness check + stall semantics → shared/resources/develop-pipeline-resume-contract.md
- ✅ Extract lite-mode pipeline contract → shared/resources/develop-pipeline-lite-mode.md
- ✅ Extract pipeline-bypass contract → shared/resources/develop-pipeline-bypass-contract.md (or merge with lite-mode)
- ✅ Extract hook contract block (if not already in pause doc) → shared/resources/develop-pipeline-hook-contract.md (or merge with pause doc)
- ✅ Update both `develop-story` and `develop-task` SKILL.md to reference extracted files
- ✅ Verify packager auto-bundles new shared docs into all five affected skill zips
- ✅ Validate all five affected skills with `quick_validate.py`
- ✅ Repackage all five affected skills with `package_skill.py`
- ✅ Mental dry-run of one full pipeline (review → develop → qa-review → finalise) against new docs before merge

### Out of Scope

- ❌ Changing pipeline behavior in any way (this is a pure refactor — content moves, semantics do not)
- ❌ Extracting variant blocks (file naming, tracker handling, status state machine — see "Truly-Variant Content" above)
- ❌ Changing the packager (`create-skill/scripts/package_skill.py`)
- ❌ Touching skills outside the affected five (`develop-story`, `develop-task`, `develop`, `qa-story`, `qa-task`)
- ❌ Renaming any existing shared resource files
- ❌ Merging or deleting any pre-existing shared resource (`develop-pipeline-pause.md` stays as-is)
- ❌ Running an actual pipeline end-to-end against new docs (deferred until extraction is complete; mental dry-run only is in-scope)

## 5. Breaking Changes

**None.** This is a documentation-internal refactor. The skills' external contracts (slash commands, generated artifacts, lock-file schema, hook surface) are unchanged. Bundled zip layouts will gain new `references/develop-pipeline-*.md` files, but the SKILL.md content reads identically from the agent's perspective because the packager rewrites paths.

If a downstream user has manually unpacked a skill and is referencing internal file paths from the unpacked tree (not a supported use case), they would see new files — but no existing path is removed or renamed.

## 6. Implementation Plan

> Detailed implementation guide: [task.1.plan.extract-shared-develop-pipeline-body.md](task.1.plan.extract-shared-develop-pipeline-body.md)

6 phases, executed strictly in order. Each phase commits independently so any single phase can be reverted in isolation if extraction breaks something downstream.

### Phase 1: Variance Audit (foundation)

**Risk**: Low

**Files**:
- `/tmp/develop-diff.patch` (working artifact, not committed)
- This task doc (annotate findings if surprises)

**Changes**:
- [x] Run `diff -u skills/develop-story/SKILL.md skills/develop-task/SKILL.md > /tmp/develop-diff.patch`
- [x] Categorize each hunk as: (a) token swap (story↔task, story-file↔task-file) — extractable with placeholder, (b) true variance — must stay per-skill, (c) accidental drift — should be reconciled before extraction
- [x] Document any (c) findings in this task's section 10 (Risk Assessment) before proceeding
- [x] Confirm the 5 candidate extraction blocks are actually duplicate (not variant) by reading both copies side-by-side

**Dependencies**: none — this is the first phase.

### Phase 2: Extract autonomous-defaults table (lowest risk)

**Risk**: Low

**Files**:
- `shared/resources/develop-pipeline-autonomous-defaults.md` (new)
- `skills/develop-story/SKILL.md`
- `skills/develop-task/SKILL.md`

**Changes**:
- [x] Create `shared/resources/develop-pipeline-autonomous-defaults.md` with the autonomous-defaults table content from develop-story (canonical version)
- [x] Replace the table block in `skills/develop-story/SKILL.md` with: `See \`shared/resources/develop-pipeline-autonomous-defaults.md\` for the autonomous-mode default behaviors.`
- [x] Replace the table block in `skills/develop-task/SKILL.md` with the same reference line
- [x] Run `python3 skills/create-skill/scripts/quick_validate.py skills/develop-story` and `… skills/develop-task`
- [x] Run `python3 skills/create-skill/scripts/package_skill.py skills/develop-story skills/develop-story` and confirm `references/develop-pipeline-autonomous-defaults.md` appears in the zip via `unzip -l`
- [x] Commit: `refactor(develop-pipeline): extract autonomous defaults table to shared resource`

**Dependencies**: Phase 1 audit complete (confirms autonomous-defaults table is identical across both skills).

### Phase 3: Extract lite-mode + bypass contract

**Risk**: Medium (recently changed in cleanup-brief items 9 and 6 — must not regress those fixes)

**Files**:
- `shared/resources/develop-pipeline-lite-mode.md` (new)
- `shared/resources/develop-pipeline-bypass-contract.md` (new, or merged into lite-mode if cohesive)
- `skills/develop-story/SKILL.md`
- `skills/develop-task/SKILL.md`
- `skills/qa-story/SKILL.md` (already references lite-mode contract, may benefit from re-pointing)
- `skills/qa-task/SKILL.md` (same)

**Changes**:
- [x] Decide: one combined file (`develop-pipeline-lite-mode.md` covers bypass too) or two separate files. Default: one combined unless content exceeds ~300 lines.
- [x] Extract the orchestrator directive format, PIPELINE_MODE=lite trigger conditions, override on Adaptive Review Strategy, and expected log line into the new file
- [x] Replace blocks in develop-story, develop-task with reference lines
- [x] Update qa-story and qa-task lite-mode subsections (added in commit `4dcedeb`) to reference the same new file rather than duplicating
- [x] Validate + package all four affected skills
- [x] Commit: `refactor(develop-pipeline): extract lite-mode and bypass contract to shared resource`

**Dependencies**: Phase 2 commit landed (avoids merge conflicts on the same SKILL files).

### Phase 4: Extract resume verification + plan freshness + stall semantics

**Risk**: Medium-High (this block was just hardened in cleanup-brief items 11 and 13 — most subtle of the five blocks)

**Files**:
- `shared/resources/develop-pipeline-resume-contract.md` (new)
- `skills/develop-story/SKILL.md`
- `skills/develop-task/SKILL.md`

**Changes**:
- [x] Extract: (a) resume verification table with all step rows, (b) plan-freshness `stat -f %m` check, (c) MAX_ITER=5 + loosened stall logic (any-indent `[x]` count OR new HEAD commit), (d) Step 7 status grep
- [x] Verify the extracted block uses placeholders (`{story-file}`, `{story-directory}`) consistently with how each SKILL substitutes them
- [x] Replace blocks in both SKILL.mds with reference lines
- [x] Validate + package
- [x] Mental dry-run: walk the resume contract from a paused state for both story and task — does the extracted file have everything an agent needs to resume correctly?
- [x] Commit: `refactor(develop-pipeline): extract resume + stall contract to shared resource`

**Dependencies**: Phase 3 commit landed.

### Phase 5: Extract hook contract (if not redundant with pause doc)

**Risk**: Low

**Files**:
- `shared/resources/develop-pipeline-hook-contract.md` (new — only if pause doc doesn't already cover this)
- `skills/develop-story/SKILL.md`
- `skills/develop-task/SKILL.md`

**Changes**:
- [ ] Re-read `shared/resources/develop-pipeline-pause.md` end-to-end — does it already cover the PreCompact hook setup contract that's currently duplicated in both SKILLs (lines 31 of each)?
- [ ] If yes: just update both SKILLs' hook block to reference pause doc; skip new file creation.
- [ ] If no: create `develop-pipeline-hook-contract.md` with the hook setup steps, pre-compact behavior, and `.claude/hooks` registration format
- [ ] Replace blocks in both SKILL.mds
- [ ] Validate + package five affected skills
- [ ] Commit: `refactor(develop-pipeline): consolidate hook contract` (one of two messages depending on outcome)

**Dependencies**: Phase 4 commit landed.

### Phase 6: Final validation + repackage all + merge readiness gate

**Risk**: Low

**Files**:
- All five affected skill zips

**Changes**:
- [ ] Run `python3 skills/create-skill/scripts/quick_validate.py` on all five skills
- [ ] Run `package_skill.py` on all five with explicit output dir
- [ ] `unzip -l skills/develop-story/develop-story.zip | grep references/` to confirm all extracted shared docs are bundled
- [ ] Repeat for develop-task, develop, qa-story, qa-task
- [ ] Confirm zipped SKILL.md path rewrites: `grep "references/develop-pipeline-" skills/develop-story/develop-story.zip` (extracted via `unzip -p`) — every `shared/resources/X` ref must have become `references/X`
- [ ] Compare line counts before/after: target develop-story and develop-task each at ~400-500 lines (down from ~1190)
- [ ] Commit: `chore(skills): repackage develop-pipeline family after shared extraction`
- [ ] **DO NOT MERGE** until at least one full pipeline run completes against the new docs (per original deferral note)

**Dependencies**: Phases 2-5 all committed.

## 7. Files Summary

### New Shared Resources

1. ✅ `shared/resources/develop-pipeline-autonomous-defaults.md` — autonomous-mode default-behavior table
2. ✅ `shared/resources/develop-pipeline-lite-mode.md` — lite-mode contract (orchestrator directive, override rules)
3. ✅ `shared/resources/develop-pipeline-bypass-contract.md` — pipeline bypass conditions (may merge into lite-mode)
4. ✅ `shared/resources/develop-pipeline-resume-contract.md` — resume verification table, plan freshness, stall semantics
5. ✅ `shared/resources/develop-pipeline-hook-contract.md` — PreCompact hook setup (only if not redundant with pause doc)

### Modified Skills

6. ✅ `skills/develop-story/SKILL.md` — slim to ~400-500 lines, replace duplicate blocks with shared refs
7. ✅ `skills/develop-task/SKILL.md` — same treatment
8. ✅ `skills/qa-story/SKILL.md` — re-point lite-mode subsection to shared file
9. ✅ `skills/qa-task/SKILL.md` — same
10. ➖ `skills/develop/SKILL.md` — likely unchanged (already references pause doc only); confirm during Phase 1 audit

### Repackaged Distributables

11. ✅ `skills/develop-story/develop-story.zip`
12. ✅ `skills/develop-task/develop-task.zip`
13. ✅ `skills/develop/develop.zip`
14. ✅ `skills/qa-story/qa-story.zip`
15. ✅ `skills/qa-task/qa-task.zip`

### Documentation

16. ✅ This task doc updated with Phase 1 audit findings (in section 12) before Phase 2 starts

### Deleted

None — extraction only moves content, does not delete files.

## 8. Testing Strategy

This is a documentation refactor. There are no runtime tests. Validation is structural and behavioral.

### Structural Validation (per phase)

- **Scope**: each modified skill passes the skill validator
- **Actions**:
  - [ ] `python3 skills/create-skill/scripts/quick_validate.py skills/<skill>` returns success for each affected skill
  - [ ] `package_skill.py` produces a valid zip with all referenced shared docs bundled under `references/`
  - [ ] `unzip -l <skill>.zip` shows expected `references/develop-pipeline-*.md` entries
  - [ ] `unzip -p <skill>.zip <skill>/SKILL.md | grep "shared/resources/"` returns nothing (all refs rewritten to `references/`)
- **Target**: 100% pass on validator, 100% of shared refs rewritten in zips

### Content Validation (per phase)

- **Scope**: extracted shared file is self-sufficient; reference line in SKILL.md is unambiguous
- **Actions**:
  - [ ] Read each new shared file end-to-end. Could a fresh agent execute the contract without reading the original SKILL.md? If no, fix.
  - [ ] Read each replaced reference block in SKILL.md. Is the surrounding context still coherent without the removed body? If no, leave a one-line summary above the reference.
- **Target**: zero ambiguity per reviewer judgment

### Regression Validation (end-to-end, gates merge)

- **Scope**: pipeline behavior unchanged after extraction
- **Actions**:
  - [ ] Mental dry-run: walk through Step 1-9 of develop-story using only the slimmed SKILL.md + bundled shared files. Does the agent have everything it needs at each step? Validate against current production behavior.
  - [ ] Repeat for develop-task
  - [ ] At least one full real pipeline run (`/develop-story` or `/develop-task` against a small story/task) completes successfully against the new docs **before merge**. This is the original deferral gate.
- **Target**: pipeline executes identically; no agent confusion at any step

### Drift Resistance Validation (proves the refactor's value)

- **Scope**: confirm that future fixes only need to be made once
- **Actions**:
  - [ ] After extraction, simulate a fix: edit a single line in `develop-pipeline-resume-contract.md`. Repackage. Confirm the change appears in **both** develop-story.zip and develop-task.zip without any further edits.
- **Target**: one shared-doc edit propagates to both skills via packager

## 9. Success Criteria

### Functional

- [ ] All five affected skills pass `quick_validate.py`
- [ ] All five repackaged zips contain expected `references/develop-pipeline-*.md` files
- [ ] No `shared/resources/` paths remain unrewritten in any zipped SKILL.md
- [ ] `develop-story` and `develop-task` slash commands work identically (mental dry-run passes; one real run gates merge)
- [ ] No regression in any of the cleanup-brief items 1-13 fixes that landed in the prior batch

### Performance

- [ ] `develop-story/SKILL.md` reduced from 1192 lines to ≤500 lines
- [ ] `develop-task/SKILL.md` reduced from 1153 lines to ≤500 lines
- [ ] Combined unique-content lines (sum of SKILL.mds + new shared docs) reduced by ≥30% vs current duplication

### Code Quality

- [ ] Every new shared file has a clear single responsibility (one of: defaults table, lite-mode, bypass, resume, hook)
- [ ] Every reference line in SKILL.md is grammatically self-contained (reads naturally even if the linked file weren't bundled)
- [ ] No dead links or broken `shared/resources/` references
- [ ] Each phase has its own commit (6 commits total on `chore/develop-skill-extract`); commits are independently revertable

### Migration

- [ ] No external migration needed (internal refactor only)
- [ ] Phase 1 audit findings documented in this doc's section 12 before Phase 2 begins
- [ ] Drift Resistance Validation (section 8) passes — proves single-edit propagation works

## 10. Risk Assessment

### High Risk

1. **Hidden variance masquerading as duplication**
   - **Risk**: A block that *looks* identical between develop-story and develop-task SKILLs may have intentional subtle differences (e.g., a token, a checkbox, a reference to a story-only artifact) that get silently flattened during extraction.
   - **Probability**: Medium
   - **Impact**: High — pipeline behavior changes for one of the two skills, possibly silently
   - **Mitigation**: Phase 1 variance audit is mandatory and produces a written categorization (token swap vs true variance vs accidental drift) before any extraction begins. Phase 4 (resume contract) is the highest-risk block and requires a dedicated mental dry-run of the pause/resume flow for both skills.
   - **Rollback**: revert the offending phase commit; phases are independent.

2. **Recent fixes (cleanup-brief items 11, 13, 9, 6) regressing during extraction**
   - **Risk**: The blocks targeted for extraction were just modified. Re-organizing them risks dropping a recent fix.
   - **Probability**: Medium
   - **Impact**: High — silently undoes a hardening fix
   - **Mitigation**: Each extracted block must be diff-compared against its pre-extraction form (`git show HEAD:skills/develop-story/SKILL.md` vs the new shared file) to confirm 100% content preservation. Extra scrutiny on Phase 4.
   - **Rollback**: revert phase commit; re-extract more carefully.

### Medium Risk

3. **Packager regex misses a new reference pattern**
   - **Risk**: `package_skill.py`'s regex (lines 84-132) was tested against `shared/resources/develop-pipeline-pause.md` only. New filenames like `develop-pipeline-autonomous-defaults.md` use the same prefix and should match, but unverified.
   - **Probability**: Low
   - **Impact**: Medium — zipped SKILL would have unrewritten paths, broken at install time
   - **Mitigation**: After Phase 2, manually verify the first new shared doc gets bundled and rewritten before proceeding to Phase 3+. Failure here halts further phases.
   - **Rollback**: revert phase; either fix packager regex or rename the new shared doc.

4. **Granularity dispute (one big file vs five small files)**
   - **Risk**: Splitting too finely creates chase-down-a-dozen-files cognitive cost; splitting too coarsely loses the single-responsibility benefit. Phase 5's hook-contract decision (merge with pause doc or stand alone) is the canonical instance.
   - **Probability**: Medium
   - **Impact**: Low — aesthetic, not functional
   - **Mitigation**: Default rule: combine if combined file stays under ~300 lines AND the topics are cohesive. Otherwise split. Bias toward fewer files.

### Low Risk

5. **Other skills referencing extracted blocks indirectly**
   - **Risk**: A skill outside the five affected ones might reference content that's about to move (e.g., a `qa-fix` block quoting from develop-story).
   - **Probability**: Low
   - **Impact**: Low — link rot in commentary, not in contract
   - **Mitigation**: `grep -r "develop-story" skills/ skills/*/references/` once before merging to surface any latent references; update comment-only references opportunistically.

6. **Phase 1 audit overrides this plan**
   - **Risk**: Variance audit reveals one of the 5 candidate blocks is actually variant, not duplicate.
   - **Probability**: Low-Medium
   - **Impact**: Low — task plan adjusts; extraction count drops to 3-4
   - **Mitigation**: This is an expected branch in the plan, not a failure. Phase 1's deliverable explicitly includes "drop blocks that turn out variant from the extraction list."

## 11. Rollback Plan

### Immediate Rollback (< 15 minutes)

- **Triggers**:
  - Any of `develop-story`, `develop-task`, `develop`, `qa-story`, `qa-task` fails `quick_validate.py` after a phase commit
  - Zipped SKILL.md contains unrewritten `shared/resources/` references
  - Mental dry-run reveals a missing instruction in the slimmed SKILL or extracted shared doc
- **Steps**:
  1. `git revert <phase-commit-sha>`
  2. Repackage affected skills: `python3 skills/create-skill/scripts/package_skill.py skills/<skill> skills/<skill>` for each
  3. Re-run validator on all five
- **Validation**: validator green; zips match pre-phase content; SKILL.md line counts match pre-phase

### Partial Rollback (15-60 minutes)

- **When to use**: Phase 4 (resume contract) extraction passes validation but a downstream pipeline run reveals a regression in resume behavior
- **Steps**:
  1. Revert only Phase 4 commit (not Phase 2-3)
  2. Repackage develop-story, develop-task
  3. Leave `develop-pipeline-autonomous-defaults.md` and `develop-pipeline-lite-mode.md` extractions in place (they passed)
  4. Investigate root cause; re-attempt Phase 4 with corrected extraction
- **Validation**: pipeline regression resolved; earlier extractions unaffected

### Forward Fix

- **When to use**: Validator passes but a small content omission is discovered post-merge (e.g., a stray reference, a missing example)
- **Approach**: amend the affected shared file, repackage, commit a follow-up fix. Do not revert.

### Rollback Triggers (escalation matrix)

- **Critical** (immediate revert): pipeline run fails on real story/task; SKILL.md fails validator; zip layout corrupted
- **Non-critical** (forward fix): wording inconsistency between shared doc and SKILL summary line; granularity disagreement after the fact; cosmetic redundancy with pause doc

## 12. Variance Audit Findings

> Phase 1 deliverable. Populate this section with the categorization table produced by `diff -u skills/develop-story/SKILL.md skills/develop-task/SKILL.md` before Phase 2 begins.

**Classification key**:
- **TS** (token swap) — differs only by `story↔task`, `Ready for Review↔accepted`, `story-file↔task-file`, etc. Extractable with placeholder.
- **TV** (true variance) — differs in structure, semantics, or required-vs-optional flow. Stays per-skill.
- **AD** (accidental drift) — looks like it should be identical but isn't (likely missed dual-edit). Reconcile to canonical version BEFORE extraction begins.

**Categorization table** _(Phase 1 complete — 2026-05-04)_:

| Block | Class | Notes |
|-------|-------|-------|
| Autonomous defaults table | Mixed (TS + TV) | ~10 identical rows; ~8 TS rows (story/task name swaps); story-only: 5 Register rows; task-only: 2 rows (Step 9 answer, completion status). Extract common+TS to shared file; keep TV rows per-skill as addendum. |
| Lite-mode contract | TS | "Tasks" vs "phases", "qa-story" vs "qa-task" — pure token swap, semantics identical |
| Pipeline bypass contract | TS | Inline with lite-mode; same file |
| Resume verification table | TS | File naming patterns differ (story.{epic}.{story}.* vs task.{id}.*) but table structure and semantics identical |
| Plan freshness check | TS | Path glob differs; bash logic identical |
| Stall semantics | TS | "tasks" vs "phases" naming; identical bounds and logic (MAX_ITER=5, any-indent `[x]` OR new commit) |
| Hook contract block | AD (vs pause.md) | Both SKILLs' Setup section duplicates `shared/resources/develop-pipeline-pause.md` §Setup (line 135-160) with minor drifts (no `"matcher"` field, no `bash` prefix). Phase 5: replace with reference to pause.md — no new file needed. |
| File naming patterns | TV (expected) | story.{epic}.{story} vs task.{n} |
| Tracker frontmatter handling | TV (expected) | jira required vs silent skip |
| Status state machine | TV (expected) | Draft→Ready vs Planned→accepted |

**AD findings (Phase 1.5 reconciliation)**:

- Hook setup AD: SKILL.md blocks omit `"matcher": "*"` and `bash` prefix vs pause.md. Non-blocking — these blocks will be replaced by a reference to pause.md in Phase 5. No fix needed before extraction.

**Adjustments to extraction plan**:

- Phase 2 (autonomous defaults): shared file contains common + TS rows; each SKILL.md keeps its own TV rows as a "Skill-specific defaults" addendum below the reference line. develop-story keeps 5 Register rows; develop-task keeps 2 rows (Step 9 answer, completion status).
- Phase 5 (hook contract): pause.md already covers hook setup — point both SKILLs to pause.md, skip new file creation.

---

## Notes

- **DO NOT MERGE** the feature branch until at least one full pipeline run completes successfully against the new docs (mental dry-run is not sufficient — this matches the original deferral gate from the cleanup brief).
- This task is GitHub-tracked in issue (link added at frontmatter `github_issue` after step 4.5).
- Related QA artifacts will land at:
  - QA report: `task.1.qa.{N}.extract-shared-develop-pipeline-body.md`
  - Bug reports (if found): `task.1.bug.{N}.{name}.md`
  - Quality gate: `docs/qa/gates/tasks/task.1.gate.{N}.extract-shared-develop-pipeline-body.yml`
