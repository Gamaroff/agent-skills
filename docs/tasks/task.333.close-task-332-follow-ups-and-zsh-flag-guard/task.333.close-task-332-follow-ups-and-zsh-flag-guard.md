---
id: task.333
title: "Close task 332's follow-ups and guard the zsh flag trap"
type: task
description: "The two review-story ${X:+--flag \"$X\"} sites use the array form and a guard test fails on any new one; /finalise discloses every unverified AC hand copy, keys its re-run-at-head files by work item, states what merge refuses exactly, and parses the AC answer once."
tags: [review-story, finalise, observation, zsh, follow-up]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-11-28
updated: 2026-11-28
assignee:
estimated_effort_hours: 8
github_issue: 965
---

# Close task 332's follow-ups and guard the zsh flag trap

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.333.review.1.close-task-332-follow-ups-and-zsh-flag-guard.md` implemented 2026-11-28

**GitHub Issue**: [#965](https://github.com/Gamaroff/agent-skills/issues/965)

---

## 1. Overview

This task closes the follow-ups task 332 left (PR #964): observation #202's zsh trap and gate 3's
five advisories.

**Scope:**

- Observation #202: the two live `${PIN_BRANCH:+--doc-branch "$PIN_BRANCH"}` sites in
  `skills/review-story/SKILL.md` move to the array form. A guard test then fails on any new
  `${X:+--flag …}` in a fenced `bash` block of a canonical source.
- Gate 3 CR3-1 and CR3-2: an AC hand copy made **after** a successful extract discloses itself in the
  DoD, as one after a failed extract already does. The blocks test asserts `verified: false`.
- Gate 3 CR-2: `finalise-dod-ac-prompt.md` states what `merge` actually refuses.
- Gate 3 CR-3: the Step 3a re-run-at-head state files are keyed by work-item stem and run number,
  like the scope, extract, result and merged files.
- Gate 3 CR-4: `merge` parses the AC answer once, not twice.

**Key deliverables:**

1. The review-story fix, the guard test (calibrated red on the live sites) and a `traps.md` entry.
2. The finalise changes, each held by a test that a named mutation turns red.
3. A CHANGELOG entry with the resume path for the renamed re-run-at-head files.

**Expected outcome:** zsh can no longer merge a flag and its value into one word in a shipped
`bash` block without a test going red. Every `/finalise` gate 3 advisory from task 332 is closed.

## 2. Motivation

### Current Problems

- **zsh passes a flag and its value as one word.** bash word-splits an unquoted
  `${X:+--flag "$X"}`; zsh does not. The trap has been fixed one site at a time four times:
  `shared/resources/develop-pipeline-step-8-commit.md:256`, `shared/resources/resolve-platform.sh:670`,
  `shared/resources/tracker-access.test.sh:1669` and `skills/finalise/SKILL.md:1068` (task 332, T332-CR2-2).
  It is still live at `skills/review-story/SKILL.md:2398` and `:2483`: under zsh, a pinned branch reaches
  `sync-jira-story.js` as the one argument `--doc-branch <branch>`. No test stops a fifth site
  (observation #202).
- **A hand copy after a successful extract is not disclosed.** `skills/finalise/SKILL.md:1035` asks for
  the line "AC YAML hand-copied (unverified): {reason}" only after a failed extract. Since task 332, a
  hand copy over an extracted file (with the extract record removed, `:1043`) merges as
  `verified: false` and prints nothing to say so (gate 3 CR3-1).
- **The hand-copy test checks less than it claims.**
  `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:462`
  (*`a corrected hand copy HALTs in the hash arm …`*) asserts only that the record exists at `:518`.
  It never asserts `result.verified === false` (gate 3 CR3-2).
- **The AC prompt over-claims.** `shared/resources/finalise-dod-ac-prompt.md:153` says `/finalise`
  "refuses an answer that leaves it out or spells it any other way". `sameDocument`
  (`shared/resources/finalise-rerun-scope.js:767`) accepts an absolute and a relative spelling of the same
  file, and a symlinked spelling whose real path matches (gate 3 CR-2).
- **Two runs on different work items share re-run-at-head files.** `skills/finalise/SKILL.md:600-605`
  and `:641` write and read `.claude/state/finalise-rerun-at-head-${DOD_N}.json` and its `.d` directory.
  Two items on the same DoD run number in one checkout use the same files. Task 332 stem-keyed the
  scope, extract, result and merged files (`:1063-1073`) but not these (gate 3 CR-3, pre-existing).
- **`merge` parses the agent YAML twice.** The CLI calls `readAnswer(agentYaml)` at
  `finalise-rerun-scope.js:1265` for the document checks, then `merge()` calls it again at `:787`.
  `readAnswer` is the only caller of `parseYamlSubset` (`:732`) (gate 3 CR-4).

### Benefits of Solution

- The zsh trap is caught by a test the first time it is written, not by an operator's failed run.
- Every AC record with `verified: false` is disclosed in the DoD, whichever route made it.
- The prompt tells the AC agent the rule the engine applies, so an agent never "fixes" a correct path.
- No `/finalise` state file can be shared by two work items.
- One parse means one reading of the answer: the document check and the merge cannot disagree.

## 3. Technical Background

### Current Architecture

**The zsh population, measured.** The definition is every line inside a fenced ` ```bash ` block,
as `extractBlocks` in `shared/resources/qa-execute-snippets.mjs:70` reads it, in
`git ls-files 'skills/*/SKILL.md' 'shared/resources/*.md'` with any `/references/` path removed.
That is 233 files and 804 blocks on 2026-11-28. `extractBlocks` returns only `bash` fences. Fences
tagged `sh`, `zsh` or `shell` appear once in the population (`shared/resources/security-input-corpus.md`)
and none of them holds the pattern.

Two keys were measured over that population:

- **Wide key** `\$\{NAME:\+[^}]*\s[^}]*\}` (an alternative containing whitespace) gives 9 hits. Two are
  the live review-story sites and two are comments (step-8 `:256`, finalise `:1068`). Five are correct
  and must stay legal: `finalise/SKILL.md:2419` is inside a double-quoted `echo`, `:2710-2711` are in a
  heredoc body, and `review-prd/SKILL.md:392` and `:433` are inside double quotes. In every one of these
  the alternative is meant as one word, so zsh's behaviour is correct.
- **Flag key** `\$\{NAME:\+["']?-` (an alternative that opens with a flag) gives 4 hits: the two
  comments and the two live sites. With comment lines (`^\s*#`) excluded, the 2 hits are exactly the
  live sites. This is the key the guard uses (obs #135: a key shared with correct uses would be red
  at the wrong sites).

**A spelling the flag key does not see** is an alternative that opens with a variable, such as
`${X:+$FLAG "$X"}`. The guard does not claim it, and the `traps.md` entry states the rule (an
array) so that a reviewer catches it. No such spelling exists in the population today; the wide
key's nine hits show this.

**The fence-guard precedent.** `shared/resources/tests/halt-snippet-glob-safe.test.mjs` already runs
fenced blocks under zsh with `extractBlocks`. It carries a reconstructed bad form that must fail
under zsh (its block C). The new guard follows the same shape. `shared/resources/tests/*.test.mjs` is
in `test:suite`, so the guard runs on every PR.

**The AC hand-copy routes** (`skills/finalise/SKILL.md` Step 3c, `:1026-1050`):

1. `extract` fails, the agent's YAML is saved by hand and `AC_SHA256` is empty. The DoD line is
   required (`:1035`).
2. `extract` succeeds, the result file is replaced by hand, and the extract record is removed
   (`:1043`, the `result-hash-mismatch` remedy). `AC_SHA256` reads empty and `merge` records
   `verified: false`. No DoD line is asked for.

The record's shape is `{"result":{"bytes":…,"sha256":…,"verified":true|false}}`, read from
`docs/tasks/task.332.ac-merge-closes-task-331-follow-ups/task.332.dod.1.ac.json`.

**Re-run-at-head files.** Written by the Step 3a block at `skills/finalise/SKILL.md:590-606`, which binds
only `DOC_PATH` and `DOD_N`. Read by the scope block at `:641`, which already binds `STEM` (its
`RERUN_SCOPE_FILE` is stem-keyed). `git grep -n "finalise-rerun-at-head-" -- ':!docs/tasks' ':!**/references/**'`
returns those four lines and nothing else. No other skill reads the files.

**The double parse.** `readAnswer` (`finalise-rerun-scope.js:729`) wraps `parseYamlSubset`. It is
called at `:787` (inside `merge(s, agentYaml, opts, io)`) and at `:1265` (the CLI's
`result-document-unnamed` and `result-document-mismatch` checks).

### Target Architecture

- `review-story/SKILL.md:2398` and `:2483` build
  `PIN_ARGS=(); [ -n "$PIN_BRANCH" ] && PIN_ARGS=(--doc-branch "$PIN_BRANCH")` and pass `"${PIN_ARGS[@]}"`.
  This is the form finalise Step 3c uses (`AC_SHA_ARGS`, `:1070`).
- A new `shared/resources/tests/zsh-flag-expansion-guard.test.mjs` scans the population with the flag
  key and comment lines excluded, and asserts zero hits. It also asserts a non-vacuity floor (at least
  700 blocks read). Under zsh it shows that a reconstructed `${X:+--flag "$X"}` passes one argument and
  the array form passes two.
- The Step 3c block prints `AC_YAML_VERIFIED=<true|false>`, read from `$AC_RECORD`'s
  `.result.verified` on `merged`. The prose rule at `:1035` becomes route-independent: whenever the
  record reads `verified: false`, the DoD says "AC YAML hand-copied (unverified): {reason}". The reason
  is the extract's failure reason, or `extract record removed for a hand copy` on route 2.
- `finalise-dod-ac-prompt.md:153` says that `story_file` must be the exact path you were given. It
  says `/finalise` refuses an answer that leaves the field out, or names a path that does not resolve
  to the same file. It does not claim that every other spelling is refused.
- The Step 3a re-run-at-head block binds `STEM` (the same guard lines as Step 3c) and uses
  `finalise-rerun-at-head-${STEM}-${DOD_N}.json` and `finalise-rerun-at-head-${STEM}-${DOD_N}` (the
  `--out-dir`). The `:641` reader uses the same name.
- `merge(s, agentYaml, opts, io)` accepts an already-read answer. The CLI reads it once and passes it
  in. The exported `merge` keeps its current signature for its callers in
  `shared/resources/tests/finalise-rerun-scope.test.mjs`, and an optional `opts.answer` skips the re-read.

### Important Clarifications

- **Only the flag-opening form is guarded.** The wide key would ban five correct expansions. The
  guard's scope is the spelling that has failed four times.
- **The per-site comments stay.** They explain the trap where a reader sees it, and they are comment
  lines, which the guard excludes. `traps.md` gets one entry for the rule, and the guard test cites it.
- **This is one task, at the owner's request.** It covers two independent outcomes (the zsh guard and
  the finalise advisories), and its phases can land in any order.

## 4. Scope

### In Scope

✅ `skills/review-story/SKILL.md` (two sites)
✅ `shared/resources/tests/zsh-flag-expansion-guard.test.mjs` (new)
✅ `docs/contributing/traps.md` (one entry)
✅ `skills/finalise/SKILL.md` Steps 3a and 3c
✅ `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-rerun-scope.js`
✅ `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, `shared/resources/tests/finalise-rerun-scope.test.mjs`
✅ `CHANGELOG.md`, the regenerated `references/` copies

### Out of Scope

❌ `shared/resources/finalise-ci-poll.sh:121` (`${BB_DESTINATION:+--destination …}`). The file runs
under `#!/usr/bin/env bash`, so it is safe. The guard reads fenced blocks, not `.sh` files.
❌ Alternatives that open with a variable (`${X:+$FLAG …}`). There is no instance, and §3 states
why the guard does not claim them.
❌ Removing the four per-site explanatory comments (§3).

## 5. Breaking Changes

### Breaking Change 1: the re-run-at-head state files carry the stem

- **Before:** `.claude/state/finalise-rerun-at-head-${DOD_N}.json` and its `.d` out-dir.
- **After:** `.claude/state/finalise-rerun-at-head-${STEM}-${DOD_N}.json` and the matching out-dir.
- **Affected:** a `/finalise` run that is halted between the Step 3a re-run-at-head block and the
  scope block when the new skill is installed.
- **Migration:** re-run the Step 3a re-run-at-head block. It is idempotent and rewrites the file under
  the new name. The CHANGELOG entry states this. Old files are inert and are cleaned up by
  `.claude/state` hygiene like any stale state file.

No other interface changes: `merge`'s CLI flags and exit codes are unchanged, and `AC_YAML_VERIFIED`
is a new output line.

## 6. Implementation Plan

> Detailed implementation guide: [task.333.plan.close-task-332-follow-ups-and-zsh-flag-guard.md](task.333.plan.close-task-332-follow-ups-and-zsh-flag-guard.md)

### Phase 1: The zsh guard and the review-story fix (observation #202)

**Risk:** Low. **Files:** `shared/resources/tests/zsh-flag-expansion-guard.test.mjs`,
`skills/review-story/SKILL.md`, `docs/contributing/traps.md`.

- [x] Write the guard first and run it on the unfixed tree: it must fail and name exactly
      `skills/review-story/SKILL.md:2398` and `:2483`. Record the output in the QA report.
- [x] Add the zsh case: a reconstructed `${X:+--flag "$X"}` gives one argument, and the array form
      gives two. It is skipped with a named reason only when zsh is absent.
- [x] Fix both review-story sites with the `PIN_ARGS` array, and re-run the guard (green).
- [x] Add the `traps.md` entry next to the zsh `nomatch` entry, and cite it from the guard's header.

### Phase 2: Disclose every unverified hand copy (CR3-1, CR3-2)

**Risk:** Low. **Files:** `skills/finalise/SKILL.md` Step 3c,
`evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`.

- [x] On `merged`, the Step 3c block prints `AC_YAML_VERIFIED=$(jq -r '.result.verified' "$AC_RECORD")`.
- [x] Rewrite the `:1035` rule to cover both routes, each with the reason it names.
- [x] In the `:462` test, assert `result.verified === false` in the record, and assert that the block
      printed `AC_YAML_VERIFIED=false`. In an extracted-route case, assert `AC_YAML_VERIFIED=true`.

### Phase 3: Exact refusal wording, stem-keyed re-run-at-head files, one parse (CR-2, CR-3, CR-4)

**Risk:** Low. **Files:** `shared/resources/finalise-dod-ac-prompt.md`, `skills/finalise/SKILL.md`
Step 3a, `shared/resources/finalise-rerun-scope.js`, both finalise test files.

- [x] Reword `finalise-dod-ac-prompt.md:153` to match `sameDocument`, keeping the "exact path you were
      given" instruction.
- [x] Bind and guard `STEM` in the Step 3a re-run-at-head block. Rename the file and its out-dir in
      the writer (`:600-605`) and the reader (`:641`).
- [x] Extend the run-number-keyed-path assertion (`finalise-rerun-scope-blocks.test.mjs:316`) to
      `finalise-rerun-at-head-`. (The out-dir half is held in the T319-CR-5 case, the only one that
      runs a listed command: with none, no out-dir is written and M5 on it stayed green.)
- [x] Have the CLI read the answer once and pass it to `merge` through `opts.answer`. Add a test that
      counts `parseYamlSubset` calls on one `merge` CLI run (exactly 1).

### Phase 4: CHANGELOG, bundle, full suite

**Risk:** Low.

- [x] Add a CHANGELOG `[Unreleased]` entry that names the guard, the disclosure line, the prompt wording,
      the renamed files with their resume path, and the single parse.
- [x] `npm run bundle`, then `npm run bundle:check`.
- [x] `npm run test:remote` on the LAN server.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-story/SKILL.md`: two sites move to the array form
2. ✅ `skills/finalise/SKILL.md`: Step 3a stem key; Step 3c `AC_YAML_VERIFIED` and the rule
3. ✅ `shared/resources/finalise-rerun-scope.js`: single parse via `opts.answer`
4. ✅ `shared/resources/finalise-dod-ac-prompt.md`: refusal wording

### Files to Create (Tests)

5. ✅ `shared/resources/tests/zsh-flag-expansion-guard.test.mjs`

### Files to Modify (Tests)

6. ✅ `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`
7. ✅ `shared/resources/tests/finalise-rerun-scope.test.mjs`

### Files to Modify (Documentation)

8. ✅ `docs/contributing/traps.md`
9. ✅ `CHANGELOG.md`

### Generated

10. ✅ The `references/` copies of the files above, written by `npm run bundle`

## 8. Testing Strategy

### Unit Tests

- **Guard:** zero flag-key hits outside comments across the population, and at least 700 blocks read.
  It names each hit as `path:line`.
- **zsh premise:** the reconstructed bad form gives 1 argument under zsh, and the array form gives 2
  under bash and zsh.
- **Blocks test:** the hand-copy route gives `verified: false` and prints `AC_YAML_VERIFIED=false`. The
  extracted route prints `AC_YAML_VERIFIED=true`. No re-run-at-head path is keyed by `DOD_N` alone.
- **Engine:** one `merge` CLI run calls `parseYamlSubset` once. All existing `merge` refusals are unchanged.
- **Command:** `npm run test:remote` (LAN server).

### Mutation Tests

Each mutation is recorded in the QA report with the test it turned red:

| # | Mutation | Must turn red |
| - | -------- | ------------- |
| M1 | Revert one review-story site to `${PIN_BRANCH:+--doc-branch "$PIN_BRANCH"}` | the guard, naming that line |
| M2 | Make the guard skip every line (an always-empty scan) | the non-vacuity floor |
| M3 | Remove the `AC_YAML_VERIFIED` echo | the blocks hand-copy case |
| M4 | Make the `merge` CLI record `verified: true` on an empty `--sha256` (`verified: opts.sha256 !== undefined`, `finalise-rerun-scope.js:1300`) | the new `verified === false` assertion |
| M5 | Restore `finalise-rerun-at-head-${DOD_N}` in Step 3a | the run-number-keyed-path assertion |
| M6 | Restore the second `readAnswer` call in `merge` | the parse-count test |

### Consumer Tests

`review-story`'s Jira sync blocks are not run end to end (no Jira). The zsh premise test exercises the
array form they now use.

### Performance Tests

Not applicable: no bound is claimed.

## 9. Success Criteria

### Functional

- [ ] `zsh-flag-expansion-guard.test.mjs` fails on the unfixed tree and names exactly
      `skills/review-story/SKILL.md:2398` and `:2483`. The output is recorded in the QA report.
- [ ] After the fix, the guard passes, and its zsh premise case shows 1 argument (bad form) and 2
      (array form).
- [ ] Step 3c prints `AC_YAML_VERIFIED=false` after a hand copy over an extracted file and
      `AC_YAML_VERIFIED=true` after an extract. The record's `result.verified` matches in both cases
      (blocks test).
- [ ] No re-run-at-head path in Step 3a is keyed by `DOD_N` alone: the blocks test's run-number-keyed-path
      assertion (`finalise-rerun-scope-blocks.test.mjs`, extended in Phase 3) runs the re-run-at-head
      block, asserts the stem-keyed file exists and the `finalise-rerun-at-head-1.json` file does not,
      and mutation M5 turns it red. `git grep -nE 'finalise-rerun-at-head-\$\{DOD_N\}' -- skills/finalise/SKILL.md`
      matches nothing.
- [ ] One `merge` CLI run calls `parseYamlSubset` exactly once (engine test).

### Performance

- [ ] Not applicable: no bound is claimed.

### Code Quality

- [ ] All 6 mutations in §8 are recorded in the QA report, each with the test it turned red.
- [ ] The PR's CI run is green on its head commit (`bundle:check` runs inside it). The `npm run test:remote`
      result on the LAN server (command, exit status, pass/fail counts) is recorded in the QA report.
- [ ] `finalise-dod-ac-prompt.md`'s `story_file` rule matches `sameDocument`. It names the exact-path
      instruction and the two refusals: a missing field, and a path that does not resolve to the same
      file.

### Migration

- [ ] The CHANGELOG `[Unreleased]` entry names the renamed re-run-at-head files and their resume path.
- [ ] `docs/contributing/traps.md` has the zsh flag-expansion entry, and the guard cites it.

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The guard's key misses a new spelling.**
   - Probability: Low. Impact: Medium (a zsh defect ships).
   - Mitigation: §3 names the unguarded spelling, and `traps.md` states the rule, not the regex.

### Low Risk Areas

1. **A halted `/finalise` run across the rename.** Mitigation: the resume path is in the CHANGELOG.
2. **`opts.answer` drifts from `agentYaml`.** Mitigation: the CLI derives both from one buffer. The
   existing `merge` tests call without `opts.answer` and keep the re-read path.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** the guard is red on a correct expansion, or Step 3c HALTs on a run that passed before.
- **Steps:** `git revert` the task's merge commit on `develop`, `npm run bundle:check`, push.
- **Validation:** `npm run test:remote` is green on the reverted tree.

### Partial Rollback

Each phase stands alone. Revert one phase's commit to back out only that outcome.

### Forward Fix

A false positive in the guard is fixed by narrowing the key, with the new case added to the test.

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-11-28 | 1.0 | Initial draft — cut from observation #202 | create-task |
| 2026-11-28 | 1.1 | Review passed (9/10) — two criteria now name their evidence (the stem-key test; CI plus test:remote in the QA report), M4's target line named | review-task |
|  |  | Status → ready-for-development | review-task |
| 2026-11-28 |  | Implemented — 13 files, 6 tests added (guard 5 cases; 1 blocks case + 3 assertion sets; 1 parse-count) | develop |
|  |  | Status → ready-for-review | develop |

<!-- change-log-end -->

## Progress Tracking

### Phase 1: The zsh guard and the review-story fix

- [x] Guard calibrated red, then the review-story sites fixed, then `traps.md`

### Phase 2: Disclose every unverified hand copy

- [x] `AC_YAML_VERIFIED` and the route-independent rule, with tests

### Phase 3: Wording, stem key, one parse

- [x] Prompt wording, Step 3a rename, single parse, with tests

### Phase 4: CHANGELOG, bundle, full suite

- [x] CHANGELOG, bundle, `test:remote`

## References

- Observation #202: zsh does not word-split `${X:+--flag "$X"}`; fixed site by site four times, still
  live in review-story, no guard
- Task 332 gate 3: `docs/tasks/task.332.ac-merge-closes-task-331-follow-ups/task.332.gate.3.ac-merge-closes-task-331-follow-ups.yml`
  (`recommendations.future`: CR3-1, CR3-2, CR-2, CR-3, CR-4, review-story zsh)
- Task 332: [PR #964](https://github.com/Gamaroff/agent-skills/pull/964)
- Precedent guard: `shared/resources/tests/halt-snippet-glob-safe.test.mjs`

## Notes

- Depends on task 332 (merged to `develop` as `77bbde27`).
- Gate 3's actions are all `remedy: unverified`. Each was checked against the code on 2026-11-28 (§2
  and §3 cite the lines). None has been run as a fix yet, and Phase 1's calibration is the first run
  of the guard.
- QA artefacts will be written to this directory: `task.333.qa.{N}.*.md`, `task.333.gate.{N}.*.yml`
  and any `task.333.bug.{N}.*.md`.
