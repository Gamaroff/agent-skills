---
id: task.137
title: "[Task 137] The obs #144 ratchet pins an inventory of ls-over-glob optional-file lookups that abort under zsh when the file is absent: sweep every pinned site to quoted find -name, delete its pin as it lands, and execute each rewritten block with the file absent under zsh"
type: task
description: "Rewrite every fenced-bash optional-file lookup pinned by tests/fenced-bash-optional-file-globs.test.js from `ls <dir>/<glob> 2>/dev/null` to quoted `find <dir> -maxdepth 1 -name \"<pattern>\"` — one commit per shared step doc plus its bundle, each deleting its pins from KNOWN so the ratchet tightens — and give every rewritten site the executed case the fixtures never had: the block run under zsh with the file absent, asserting the empty or zero value the following prose expects."
tags: [pipeline, zsh, shell, qa-task, qa-story, finalise, develop-task, develop-story, ratchet]
category: refactoring
status: planned
priority: Medium
created: 2026-09-21
updated: 2026-09-21
assignee:
estimated_effort_hours: 8
risk_level: medium
github_issue: 449
---

# Technical Task: Sweep the pinned `ls <glob>` optional-file sites to quoted `find -name`

**Status:** Planned
**GitHub Issue**: [#449](https://github.com/Gamaroff/agent-skills/issues/449)

---

## 1. Overview

Under zsh — the shell the Bash tool runs in this repository — an unmatched bare glob is an error, not an empty list: `ls dir/task.12.gate.*.yml 2>/dev/null` never runs `ls` when no gate exists, the shell prints `no matches found`, the whole command aborts, and `$(…)` is empty. Obs #144 recorded the rule (an optional file is found with quoted `find -name`, never a bare glob) and its staged install carries a **ratchet**, `tests/fenced-bash-optional-file-globs.test.js`, that scans fenced bash in `skills/*/SKILL.md` and `shared/resources/*.md` for the `ls … <glob> … 2>/dev/null` shape and pins today's inventory in a `KNOWN` set so it is green on install and red on any new site. A ratchet turns a corpus-wide rule into a rule that holds from today; the pinned inventory is separate work, and obs #145 says it must be tracked as such or the pins become an allow-list nobody revisits. This task is that work.

**Scope**: every site in the ratchet's `KNOWN` set — the definition is the test's `scan()` (fenced bash, the `ls` + glob + `2>/dev/null` shape) and the inventory is whatever `KNOWN` holds when the task starts; by file: `develop-pipeline-resume-contract.md`, `develop-pipeline-step-0-resolve-and-prepare.md`, `-step-2-review.md`, `-step-3-develop-loop.md`, `-step-5-6-qa-loop.md`, `-step-7-finalise.md`, `pipeline-resume-detector-prompt.md` under `shared/resources/`; `develop-story`, `develop-task`, `finalise`, `qa-story` and `qa-task` `SKILL.md`. The ratchet's `KNOWN` set itself. The bundled copies. One executed absent-file test per rewritten site.

**Key deliverables**: (1) Every pinned site reads `find "<dir>" -maxdepth 1 -name "<pattern>"` with the pattern quoted, and where the site picks the newest of a numbered series, the numeric-newest pipeline finalise 6b already uses (`sed -E 's/^(.*\.<kind>\.)([0-9]+)(\..*)$/\2 \1\2\3/' | sort -n | tail -1 | cut -d' ' -f2-`) replaces `sort | tail -1` — `gate.9` sorts after `gate.19` lexically and that bit the T125 merge-gate check. (2) `KNOWN` shrinks to empty in the same commits, so the second ratchet test ("a pinned site that is gone is deleted with its fix") is what proves each site moved. (3) For every rewritten site, a test row that slices the block, runs it under `bash` and `zsh -f` in a scratch directory with the file **absent**, and asserts the value the following prose expects — empty for a path, `0` for a `wc -l` count — and that zsh's own `no matches found` never appears on stderr. (4) `PRIOR_GATES` in qa-task / qa-story Step 3b, which today feeds an empty string into `[ … -ge 2 ]` when no gate exists, is the first site rewritten and the one whose absent-file row is named in the CHANGELOG.

**Expected outcome**: no fenced block in the two canonical trees globs for an optional file; the ratchet's `KNOWN` is empty and the test stays as the guard against a new one; a pipeline step on a document with no prior artefact reads an empty path or a zero count instead of aborting a command whose next line then reads an unset variable.

---

## 2. Motivation

### Current Problems

- **The abort is silent from the prose's side.** The pattern was written for bash, where an unmatched glob is passed to `ls` literally and `2>/dev/null` swallows the error. Under zsh the error is the shell's, `2>/dev/null` is never reached, and the assignment's right-hand side is empty — which the next line often treats as "no file", so the defect only shows on the sites where empty is not the same as zero.
- **`PRIOR_GATES` is such a site.** `$(ls "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null | wc -l | tr -d ' ')` yields `""` under zsh with no gate, and `[ "" -ge 2 ]` is a test error, not a comparison; the first QA cycle on any document then takes whichever branch the error falls into.
- **The pinned inventory is also a lexical-sort inventory.** Most pins end `| sort | tail -1`; on a numbered series that picks `gate.9` over `gate.19`. The rewrite touches exactly these lines, and leaving the sort as it was would ship a line known to be wrong.
- **A ratchet with 31 pins is an allow-list.** The second test — a pin whose site is gone must be deleted — is the mechanism that makes the sweep visible; it does nothing until someone sweeps.

### Benefits

- One shape for "find an optional file" across the pipeline prose, and it is the shape `create-skill` now documents.
- Every rewritten site has an executed absent-file case under the shell that broke it, not a fixture that always had the file.
- The ratchet becomes a pure guard (empty `KNOWN`), which is the state where a new site is red with nothing to compare against.
- Numbered-newest lookups are numeric wherever they were rewritten, closing the `gate.9`/`gate.19` trap at the same sites.

---

## 3. Technical Background

### Current Architecture

The staged ratchet's `scan()` walks fenced bash in `skills/*/SKILL.md` and `shared/resources/*.md` and keys each hit as `<file> :: <line-text>`; `KNOWN` lists the hits on the day it was written (task 108's bundled-copy rule keeps `references/` out of the scan, so a shared doc counts once). Two tests: no hit outside `KNOWN`; no `KNOWN` entry without a hit.

The sites fall into four shapes:

| Shape | Example (pinned text) | Where |
| --- | --- | --- |
| newest of a numbered series | `DOD_PATH=$(ls {document-directory}/${STEM}.dod.*.md 2>/dev/null \| sort \| tail -1)` | finalise 7.6b (2), step-7-finalise (5), step-2-review (4), develop-story/task Step 0 (2), qa-* `LATEST_GATE` (`ls -t`) / `LATEST_QA_NUM` (4) |
| first match / existence | `plan=$(ls {task-directory}/task.{id}.plan.*.md 2>/dev/null \| head -1)` | resume contract (2), step-0 (2), step-3 (2), qa-* `THIS_GATE` (2) |
| count | `PRIOR_GATES=$(ls "$TASK_DIR"/task.*.gate.*.yml 2>/dev/null \| wc -l \| tr -d ' ')` | qa-task, qa-story (2) |
| list for display | `ls "{DOC_DIR}/.summaries/step-*.json" 2>/dev/null \| sort`; `ls -t .claude/state/…lock.pausing.* 2>/dev/null \|\| true` | resume detector prompt (2), step-5-6 (2) |

Finalise Step 6b (task.125 cycles 4–8) already carries the target form for the first shape — `find "{document-directory}" -maxdepth 1 -name "${STEM}.dod.*.md"` piped through the numeric-newest `sed | sort -n | tail -1 | cut` — and `evals/shared/tests/finalise-bug-mode.test.mjs` already executes sliced blocks under both shells (`sliceBlock` + `spawnSync(shell, ["-s", "--"], { input })`, with a row asserting "zsh's own nomatch error never appears"). Both are the patterns this task copies, not invents.

### Target Architecture

Per shape:

```bash
# newest of a numbered series (kind = dod | gate | qa | review | implementation | plan)
X=$(find "<dir>" -maxdepth 1 -name "<stem>.<kind>.*.<ext>" 2>/dev/null \
  | sed -E 's/^(.*\.<kind>\.)([0-9]+)(\..*)$/\2 \1\2\3/' | sort -n | tail -1 | cut -d' ' -f2-)
# first match / existence
X=$(find "<dir>" -maxdepth 1 -name "<pattern>" 2>/dev/null | head -1)
# count
N=$(find "<dir>" -maxdepth 1 -name "<pattern>" 2>/dev/null | wc -l | tr -d ' ')   # "0", never ""
# list for display
find "<dir>" -maxdepth 1 -name "<pattern>" 2>/dev/null | sort
```

`{placeholder}` directories stay as they are (they are substituted before execution); the `-name` argument is always double-quoted so neither shell expands it. `ls -t` (mtime-newest) sites move to numeric-newest — the series is numbered and the number is the order the pipeline means; mtime was a proxy that a `git checkout` resets.

### Important Clarifications

- **Dependency on the staged ratchet.** The ratchet is in the staged skill-updates set (`skill-updates/shared-resources/tests/fenced-bash-optional-file-globs.test.js`, `PENDING.md` § shared-resources), **not yet installed** as of this task's creation. If it is still absent when this task starts, Phase 0 installs that one file from the staging directory as the first commit — the sweep's proof is the pin deletions, and there is nothing to delete from until the test exists.
- **The `newest_numbered` helper hoist is task.138's** (obs #146 item 5). This task uses the inline numeric pipeline at each site; if task.138 lands first and ships the `references/` script, use it. Do not hoist here.
- **`{story-directory}`-style placeholders in a `-name` pattern** are fine: `-name "story.{epic}.{story}.gate.*.yml"` is quoted text until the skill substitutes it, and after substitution it is a quoted pattern. The ratchet's own scan knows the placeholder spelling; the executed tests substitute a real stem.
- **Sites in `shared/resources/develop-pipeline-*.md` count once** but ship to two or three skills through the bundle. One commit per shared doc plus `npm run bundle` keeps each PR-reviewable diff to one source and its generated copies.

---

## 4. Scope

### In Scope

✅ Every site in the ratchet's `KNOWN` set at task start (definition and inventory: the test)
✅ `tests/fenced-bash-optional-file-globs.test.js` — `KNOWN` emptied one commit at a time; the two tests unchanged
✅ Numeric-newest at every rewritten site that picks the newest of a numbered series
✅ One executed absent-file row per rewritten site, under `bash` and `zsh -f`, in a new `evals/shared/tests/optional-file-lookups.test.mjs` that follows `finalise-bug-mode.test.mjs`'s slicing pattern
✅ `npm run bundle` after each shared-doc commit; CHANGELOG [Unreleased]
✅ Phase 0 (conditional): install the ratchet test from the staging directory if absent

### Out of Scope

❌ Globs that are not optional-file lookups (a `for f in dir/*.md` over a directory that always has files; `git ls-files` patterns; `find` calls already in place) — the ratchet's `scan()` defines the population and nothing outside it is touched
❌ The other six staged files in the #139/#133/#144 set — their install is its own PR
❌ Hoisting `newest_numbered` into a `references/` script — task.138
❌ `.sh` scripts under `shared/resources/` and `skills/*/scripts/` — the ratchet scans fenced Markdown only; a script-side sweep, if the same shape exists there, is a separate observation

---

## 5. Breaking Changes

None — API stable. Each rewritten line assigns the same variable the same meaning; the only behavioural change is on the absent-file path (empty/zero instead of an aborted command) and on numbered-newest (numeric instead of lexical order), both of which are the documented intent. No script, test or eval reads the pinned line text except the ratchet, which is updated in the same commit.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.137.plan.optional-file-glob-sweep.md](task.137.plan.optional-file-glob-sweep.md)

### Phase 0: Precondition — the ratchet exists (conditional)

**Risk**: Low
**Files**: `tests/fenced-bash-optional-file-globs.test.js`

- [ ] `[ -f tests/fenced-bash-optional-file-globs.test.js ]` — if present, skip this phase
- [ ] Otherwise copy it from `$OBS_STAGING_DIR/shared-resources/tests/`, run it (expect 2/2 green — the pins match the live tree), commit alone: `test: install the obs #144 optional-file-glob ratchet (prerequisite for task.137)`
- [ ] Record in the implementation report which it was

### Phase 1: The count site first — qa-task / qa-story Step 3b

**Risk**: Medium
**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, the ratchet, the new test file

- [ ] Test rows first: slice each skill's Step 3b lookup block; run under both shells in a scratch dir with no gate → `PRIOR_GATES` is `0`, `LATEST_GATE`/`LATEST_QA_NUM`/`THIS_GATE` empty, no `no matches found` on stderr (red today under zsh)
- [ ] Rewrite the 8 pins (4 per skill) per the shape table; `LATEST_GATE` from `ls -t` to numeric-newest; `LATEST_QA_NUM` derives from the numeric pipeline's number field
- [ ] Delete the 8 pins from `KNOWN`; both ratchet tests green
- [ ] Mutation: restore one `ls` glob → its absent-file row red under zsh; add one back → ratchet red

### Phase 2: finalise SKILL.md 7.6b and step-7-finalise (the DoD/gate lookups)

**Risk**: Medium
**Files**: `skills/finalise/SKILL.md`, `shared/resources/develop-pipeline-step-7-finalise.md`, ratchet, test file

- [ ] Rows for `DOD_PATH` and `FINAL_GATE` in 7.6b and the five step-7 sites: absent → empty; present as `.dod.9` and `.dod.19` → `.19` wins
- [ ] Rewrite to the 6b form (numeric-newest); delete 7 pins; `npm run bundle`

### Phase 3: The develop pipeline step docs and the two develop SKILLs

**Risk**: Low
**Files**: `develop-pipeline-step-0-resolve-and-prepare.md` (2), `-step-2-review.md` (4), `-step-3-develop-loop.md` (2), `-step-5-6-qa-loop.md` (2), `develop-pipeline-resume-contract.md` (2), `skills/develop-story/SKILL.md` (1), `skills/develop-task/SKILL.md` (1)

- [ ] One commit per shared doc (its rows, its rewrite, its pins, `npm run bundle`); the two SKILL sites in one commit
- [ ] Step-2's review lookups and Step-0's implementation-report lookups to numeric-newest; step-3 and resume-contract plan lookups to `find | head -1`

### Phase 4: The resume detector prompt, empty `KNOWN`, CHANGELOG

**Risk**: Low
**Files**: `shared/resources/pipeline-resume-detector-prompt.md`, ratchet, `CHANGELOG.md`

- [ ] The two display-list sites (`.summaries/step-*.json`; `ls -t` over the halt/pausing files) to `find … | sort` — the `|| true` on the second is kept, it guards the absent directory
- [ ] `KNOWN` is `new Set([])`; the non-vacuity assertion (`KNOWN.size > 0 && hits.size > 0`) is rewritten to assert `hits.size === 0` with a message naming this task — the ratchet is now a pure guard
- [ ] CHANGELOG [Unreleased]: the sweep, the `PRIOR_GATES` empty-vs-zero fix, numeric-newest at the rewritten sites

---

## 7. Files Summary

### Files to Modify (Core Implementation — canonical prose)

1. ✅ `skills/qa-task/SKILL.md` — 4 sites
2. ✅ `skills/qa-story/SKILL.md` — 4 sites
3. ✅ `skills/finalise/SKILL.md` — 2 sites (7.6b)
4. ✅ `skills/develop-story/SKILL.md` — 1 site
5. ✅ `skills/develop-task/SKILL.md` — 1 site
6. ✅ `shared/resources/develop-pipeline-step-7-finalise.md` — 5 sites
7. ✅ `shared/resources/develop-pipeline-step-2-review.md` — 4 sites
8. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — 2 sites
9. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` — 2 sites
10. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — 2 sites
11. ✅ `shared/resources/develop-pipeline-resume-contract.md` — 2 sites
12. ✅ `shared/resources/pipeline-resume-detector-prompt.md` — 2 sites

### Files to Modify (Tests)

13. ✅ `tests/fenced-bash-optional-file-globs.test.js` — `KNOWN` emptied; non-vacuity assertion inverted (installed in Phase 0 if absent)

### Files to Create (Tests)

14. ✅ `evals/shared/tests/optional-file-lookups.test.mjs` — one absent-file row per rewritten site, both shells; numeric-newest rows for the numbered shapes

### Files to Modify (Documentation)

15. ✅ `CHANGELOG.md`
16. ✅ `skills/*/references/` — regenerated by `npm run bundle` after each shared-doc commit

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the ratchet (both tests, every commit); the new `optional-file-lookups.test.mjs` — per site: absent-file under `bash` and `zsh -f` asserting the prose's expected value and no `no matches found` on stderr; for numbered shapes, the `9`-vs-`19` row.
- **Mutation proofs**: (a) restore one `ls` glob at a rewritten site → its zsh row red and the ratchet red; (b) change a numeric pipeline back to `sort | tail -1` → the `9`/`19` row red. Record one of each per phase.
- **Command**: `command node --test evals/shared/tests/optional-file-lookups.test.mjs tests/fenced-bash-optional-file-globs.test.js`; `npm run ci:fast`.

### Integration Tests

- `evals/shared/tests/finalise-bug-mode.test.mjs` and `qa-execution-step-parity.test.mjs` re-run after Phases 1–2: they execute the blocks this task rewrites.
- `npm run eval:develop-task` after Phase 3.

### Contract Tests

- `npm run bundle:check` 0 after every shared-doc commit; the bundled-parity test green.
- The `${1}`-style positional-token guard: the rewritten lines carry no bare `$1`.

### Performance Tests

Not applicable.

### Consumer Tests

- `develop-story` / `develop-task` / `develop-bug` read the step docs through their bundled copies; the parity test is the consumer check.

---

## 9. Success Criteria

### Functional

- [ ] Every site in the ratchet's starting `KNOWN` is rewritten; `KNOWN` is empty; the ratchet is green as a pure guard
- [ ] Every rewritten site has an executed absent-file row green under both shells
- [ ] `PRIOR_GATES` reads `0`, not `""`, with no gate present; every numbered-newest site picks `.19` over `.9`

### Performance

- [ ] Not applicable — `find -maxdepth 1` over a document directory

### Code Quality

- [ ] One mutation proof of each kind per phase recorded; `ci:fast`, `bundle:check`, Prettier, shellcheck-on-sliced-blocks green

### Migration

- [ ] The rule lives in `create-skill/SKILL.md` § "An optional file is found with `find -name`" (staged, #144) and is not restated in any swept file; CHANGELOG entry
- [ ] Obs #145 set `actioned` with the PR as resolution

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A rewritten site changes which file wins**
   - **Risk**: `ls -t` (mtime) → numeric-newest picks a different gate on a directory where the numbers and mtimes disagree (a checkout, a regenerated file).
   - **Probability**: Low · **Impact**: Medium — the wrong gate feeds a QA cycle.
   - **Mitigation**: the number is the pipeline's own order; mtime was the proxy. The `9`/`19` row is the check; the CHANGELOG names the change.
   - **Rollback**: per-site revert; the ratchet pin goes back with it.

2. **A `{placeholder}` pattern contains a shell-significant character after substitution**
   - **Risk**: a stem with a `[` or a space breaks `-name` quoting.
   - **Probability**: Low · **Impact**: Low — stems are kebab-case by the file-naming standard.
   - **Mitigation**: the executed rows use a real stem; a `documentation-standards-validator` run is the standing guard.

### Low Risk Areas

1. **The staged ratchet is installed by its own PR between task creation and task start** — Phase 0 is conditional and reports which branch it took.
2. **Bundle drift mid-task** — one `npm run bundle` per shared-doc commit; the pre-commit hook re-runs it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a pipeline step reads the wrong artefact after a rewrite, or a consumer eval goes red on a swept block.
- **Steps**: revert the phase's commit(s) — each is one source doc plus its bundle plus its pins, so the ratchet is green on either side; `npm run bundle`; push.
- **Validation**: the ratchet and `optional-file-lookups.test.mjs` both green (the reverted site's rows go with the revert).

### Partial Rollback (1-2 hours)

- **When to use**: one shape (e.g. `ls -t` → numeric) is wrong across sites while the `find` rewrite is right — revert the sort change only, keep the `find`, re-run the `9`/`19` rows to confirm they are red and note it.

### Forward Fix (< 4 hours)

- **When to use**: a single site's pattern is mis-quoted or a row's expected value is wrong.

### Rollback Triggers

- **Critical**: a swept step selects a different artefact than before on a real document directory.
- **Non-critical**: a row's message; a pattern's spelling.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-21 | 1.0 | Initial draft — obs #145 (the inventory the obs #144 ratchet pins); T125 merge-gate `gate.9`/`gate.19` instance | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 0: ratchet present (installed or confirmed)
- [ ] Phase 1: qa-task / qa-story Step 3b
- [ ] Phase 2: finalise 7.6b + step-7-finalise
- [ ] Phase 3: step docs + develop SKILLs
- [ ] Phase 4: resume detector prompt; `KNOWN` empty; CHANGELOG
- [ ] QA: `task.137.qa.[N].optional-file-glob-sweep.md`
- [ ] Gate: `task.137.gate.[N].optional-file-glob-sweep.yml`

## References

- Observation #145 (this sweep); #144 (the rule and the ratchet, staged 2026-09-21 — `skill-updates/PENDING.md` § shared-resources)
- `tests/fenced-bash-optional-file-globs.test.js` (staged) — `scan()` is the population's definition; `KNOWN` is the inventory
- `skills/finalise/SKILL.md` Step 6b — the target form for numbered-newest (task.125 cycles 4–8; TASK-125-BUG-14 is the lexical-sort instance)
- `evals/shared/tests/finalise-bug-mode.test.mjs` — `sliceBlock` + two-shell execution, the test pattern to copy
- `skills/create-skill/SKILL.md` § "An optional file is found with `find -name`, never a bare glob" (staged) — the rule, stated once

## Notes

- QA artifacts land beside this file: `task.137.qa.[N].*.md`, `task.137.bug.[N].*.md`, `task.137.gate.[N].*.yml`.
- Independent of tasks 136 and 138 in outcome. Touches `skills/finalise/SKILL.md` 7.6b, which task.138 also edits (its `[ -r ]` and template-satisfied assertion are in 7.6b and 6b) — land one, rebase the other; do not develop both in one worktree.
- Precondition: the obs #144 ratchet must exist (Phase 0). Its install is part of the staged skill-updates PR, deliberately not merged at task creation.
