---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Low'
created: '2026-09-30'
related: 'none — cross-cutting (no single owner)'
description: 'Under zsh, choose_candidate() accepts a candidate whose task_or_story_directory is the doc dir followed by a NUL byte and anything'
github_issue: 529
---

**Bug ID**: bug.17.zsh-nul-truncates-candidate-directory
**Related**: None — cross-cutting bug (no single owner)
**GitHub**: [#529](https://github.com/Gamaroff/agent-skills/issues/529)
**Status**: ✅ Closed
**Priority**: Low
**Severity**: Minor
**Created**: 2026-09-30
**Assigned To**: unassigned
**QA Engineer**: task.133 `/finalise` re-run (§5.1 by-hand probe)

---

## Bug Description

**Summary**: Under zsh, `advance-pipeline-lock.sh --restore` (`choose_candidate()`) treats a halt snapshot or orphaned claim whose `task_or_story_directory` is `<doc-dir>` + NUL + anything as a match for `<doc-dir>`. The provenance check then passes for a candidate that names a different string.

**Expected Behavior**: A candidate whose `task_or_story_directory` holds a control character is refused under **both** shells. It is skipped with a stderr line naming the candidate and is never chosen, so `--restore --which <doc-dir>` exits 1 when it is the only candidate. bash refuses it today through the directory compare: `'<candidate>' is for '<doc-dir>x', not '<doc-dir>' — refusing to restore from it`. The fix may refuse it earlier with its own message. The contract is the refusal, not that exact text.

**Actual Behavior**: Under zsh, `--restore --which <doc-dir>` prints the candidate and exits 0, and `--restore <doc-dir>` would rebuild the lock from it. zsh keeps the NUL through `c_dir=$(jq -r '.task_or_story_directory // ""' "$c")`, the `cd "$stripped"` inside `canon()` truncates the path at the NUL, and `canon()` returns `<doc-dir>`. bash drops the NUL in command substitution, so it compares `<doc-dir>x` and refuses.

**Impact**: Low. Exploiting it needs a hand-crafted file in `.claude/state/`, which is trusted local state. The script's shebang is bash, and zsh runs it only in the test suite's interpreter pass. It is still a provenance guard that passes on input it was written to refuse, under one of the two shells the suite claims to support.

---

## Reproduction Steps

**Environment**: macOS 26 (Darwin 25.6.0), zsh 5.9 (`/bin/zsh`), jq 1.7.1, `env -i PATH=/usr/bin:/bin HOME=$(mktemp -d) LC_ALL=C`

**Steps to Reproduce**:

1. `R=$(mktemp -d); mkdir -p "$R/docs/d1" "$R/.claude/state"; cd "$R"`
2. `printf '%s' "{\"task_or_story_directory\":\"$R/docs/d1\\u0000x\",\"current_step\":5}" > .claude/state/develop-pipeline.lock.pausing.1`
3. `PIPELINE_LOCK=.claude/state/develop-pipeline.lock PIPELINE_HALT_SNAPSHOT=.claude/state/develop-pipeline.last-halt.json zsh <repo>/shared/resources/advance-pipeline-lock.sh --restore --which "$R/docs/d1"`
4. Repeat step 3 with `bash` in place of `zsh`.

**Frequency**: Always
**Reproducible**: Yes. zsh accepted in 3 of 3 full probe runs; bash refused in 5 of 5 runs and 6 of 6 isolated runs.

---

## Evidence

**Screenshots/Videos/Test Output**: [`task.133.dod.security.by-hand-probe.md`](../../tasks/task.133.task-130-residue-cleanup/task.133.dod.security.by-hand-probe.md). Out of 48 cases per shell, bash matched all 48 and zsh matched 47. The zsh miss is the `d1\u0000x` candidate-content case.

**Logs and Stack Traces**:

```
zsh:  MISMATCH which accept rc=0 --restore --which <scratch>/docs/d1  | ''
bash: advance-pipeline-lock: '.claude/state/develop-pipeline.lock.pausing.1' is for '<R>/docs/d1x', not '<R>/docs/d1' — refusing to restore from it
```

**Related Files**: `shared/resources/advance-pipeline-lock.sh` (`canon()`, `choose_candidate()`), `shared/resources/advance-pipeline-lock.test.sh`

---

## Scope & Impact

**Reference**: the `--restore` provenance guard (task.130), shared by `--restore`, `--restore --which` and `grant-qa-cycles.sh`'s never-lower guard.

**How It Failed**: the compare between `canon "$c_dir"` and `canon "$doc_dir"` trusts that `c_dir` is a plain path. Under zsh it can hold a NUL, and `cd` silently truncates at it. It predates task.133, whose diff only moves where the legacy advice prints. task.130 introduced the compare, and that task is accepted, so the bug has no open owner. Suggested fix: refuse a `task_or_story_directory` that contains a control character before calling `canon()`. For example, `jq -e '(.task_or_story_directory // "") | test("[\\u0000-\\u001f]") | not'` alongside the existing object check. Add a case to `advance-pipeline-lock.test.sh` that runs under both shells.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Reproduction**: The report's steps, run against `8d5ba45e` with `--restore --which`: zsh printed the `d1\u0000x` candidate and exited 0, and bash refused it and exited 1. A second probe with the directory spelled `<doc-dir>` + a trailing `\n` was **accepted under both shells** (rc 0 in bash and zsh). A `\u001f` suffix is refused by both, through the directory compare.

**Root Cause Analysis**: `shared/resources/advance-pipeline-lock.sh` `choose_candidate()` reads the directory with `c_dir=$(jq -r '.task_or_story_directory // ""' "$c")` and compares `canon "$c_dir"` to `canon "$doc_dir"`. Command substitution is not a faithful copy of the JSON string. zsh keeps an embedded NUL, and `cd` inside `canon()` then truncates the path at it. Both shells strip trailing newlines, so `<doc-dir>\n` reads back as `<doc-dir>`. Either way, the compare sees a string the candidate does not hold. The provenance guard trusts that the directory read is a plain path, and nothing checks that.

**Proposed Fix**: In `choose_candidate()`, before the read, refuse a candidate whose `task_or_story_directory` string contains a control character (U+0000–U+001F or U+007F). Test it on the JSON value with `jq` (`explode | any(. < 32 or . == 127)`) so no shell sees the raw string. Skip the candidate with a named stderr line, the way the other refusals are handled.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Root Cause**: `choose_candidate()` compared a lossy shell read of `task_or_story_directory`. An embedded NUL under zsh, or a trailing newline under either shell, read back as the document's own directory.

**Fix Description**:

- Before the shell reads the directory, a `jq -e` test on the JSON value refuses any string that contains U+0000–U+001F or U+007F. It prints `'<candidate>' has a task_or_story_directory containing a control character — refusing to restore from it` and skips the candidate. A skipped candidate is never added to `MINE`, so it is never chosen and never consumed as a losing candidate.
- The check runs in the one selection function. That covers `--restore`, `--restore --which` and `grant-qa-cycles.sh`'s never-lower guard together. A non-string directory is left on the existing path, unchanged.

**Files Modified**:

- `shared/resources/advance-pipeline-lock.sh`: the control-character refusal in `choose_candidate()`, plus 12 bundled `skills/*/references/` copies regenerated by `npm run bundle`.
- `shared/resources/advance-pipeline-lock.test.sh`: regression cases in `run_restore_scenarios` under bash and zsh. Four directory suffixes (`\u0000x`, `\n`, `\u001f`, `\u007f`) must be refused by name, never chosen, with nothing written and the claim kept. A newer NUL-directory claim beside a matched snapshot must lose and must not be consumed.
- `CHANGELOG.md`: an `[Unreleased]` › Fixed entry.

**Testing**:

- Before the fix, the new cases failed 9 of 10 (the NUL case under zsh, the `\n` case under both shells, and the message assertion elsewhere). After the fix, `advance-pipeline-lock.test.sh` passes 109 of 109.
- Mutation check. Each mutant turns its own cases red: dropping `< 32` fails the NUL, `\n` and `\u001f` cases; dropping `== 127` fails the `\u007f` cases; narrowing to NUL only fails `\n`, `\u001f` and `\u007f`; disabling the check fails all 9.
- `npm run ci:fast` (format check + full `npm test`) passes. `npm run lint:shell` reports shellcheck clean.

**Verification Steps for QA**:

1. `bash shared/resources/advance-pipeline-lock.test.sh`. Expect `Results: 109 passed, 0 failed`, including the `[zsh]` control-character lines.
2. Run the report's reproduction steps under zsh. Expect exit 1, empty stdout, and the stderr line naming the control character.
3. Repeat step 2 with `task_or_story_directory` set to `<doc-dir>` followed by `\n`, under bash. Expect the same refusal. Before the fix this returned rc 0.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-09-30
**Verified by**: develop-bug

**Verification Result**: ✅ Fixed

**Notes**: The regression cases in `advance-pipeline-lock.test.sh` pass under bash and zsh (109/109); 9 of the 10 new cases failed before the fix. The affected suites are green: `grant-qa-cycles.test.sh` (46/46), which reads the same selection, and `detector-candidate-rule` plus `who-restores-single-statement` (12/12). Shellcheck is clean. Lite mode ran signals 1 and 2 only, with no diff code review. The reported failure no longer reproduces.

**Decision**: Closed (finalised in Step 7)

---

## Status History

| Date       | Status | Changed By                          | Notes       |
| ---------- | ------ | ----------------------------------- | ----------- |
| 2026-09-30 | New    | task.133 `/finalise` re-run session | Bug created |
| 2026-09-30 | New | ensure-bug-github-issue | GitHub issue created (#529) |
| 2026-09-30 | In Progress | develop-bug | Reproduced; investigation started |
| 2026-09-30 | Ready for QA | develop-bug | Fix implemented + regression test |
| 2026-09-30 | Ready for QA | develop-bug | Fix verified — bug scenario gone |
| 2026-09-30 | Ready for QA | finalise | DoD incomplete — 1 gap(s) — bug.17.dod.1.zsh-nul-truncates-candidate-directory.md |
| 2026-09-30 | Ready for QA | finalise | DoD verified — bug.17.dod.2.zsh-nul-truncates-candidate-directory.md (security zero-guard overridden by operator) |
| 2026-09-30 | Closed | develop-bug | Fix verified and accepted |

---

## Resolution Summary

**Final Status**: Closed — Fixed
**Total Iterations**: 1
**Time to Resolution**: same day (filed 2026-09-30, closed 2026-09-30)
**Final Fix Details**: `choose_candidate()` compared a lossy shell read of `task_or_story_directory`. zsh kept an embedded NUL that `canon()`'s `cd` then truncated at, and both shells strip trailing newlines, so `<doc>` + NUL + anything, or `<doc>\n`, matched `<doc>`. A `jq -e` test on the JSON value now refuses any U+0000–U+001F or U+007F before the shell reads it, in the one selection function behind `--restore`, `--restore --which` and `grant-qa-cycles.sh`'s guard. PR #530.
**Lessons Learned**: The `$(…)` read is not a faithful copy of the JSON string, so a value must be validated where it is still JSON, before any shell sees it. The report named zsh only, but probing showed bash also accepted a NUL at the end and a trailing newline. A shell-divergence bug is worth probing under both shells for the whole value class, not just the reported instance. The security DoD needed an operator override because the probe engine cannot call a flag + positional shell script (obs #231).
