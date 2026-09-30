---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Low'
created: '2026-09-30'
related: 'none — cross-cutting (no single owner)'
description: 'Under zsh, choose_candidate() accepts a candidate whose task_or_story_directory is the doc dir followed by a NUL byte and anything'
---

**Bug ID**: bug.17.zsh-nul-truncates-candidate-directory
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
**Priority**: Low
**Severity**: Minor
**Created**: 2026-09-30
**Assigned To**: unassigned
**QA Engineer**: task.133 `/finalise` re-run (§5.1 by-hand probe)

---

## Bug Description

**Summary**: Under zsh, `advance-pipeline-lock.sh --restore` (`choose_candidate()`) treats a halt snapshot or orphaned claim whose `task_or_story_directory` is `<doc-dir>` + NUL + anything as a match for `<doc-dir>`. The provenance check then passes for a candidate that names a different string.

**Expected Behavior**: A candidate whose `task_or_story_directory` holds a control character is refused, as bash already refuses it: `'<candidate>' is for '<doc-dir>x', not '<doc-dir>' — refusing to restore from it`.

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

[This section will be filled by developer during fix process]

---

## Status History

| Date       | Status | Changed By                          | Notes       |
| ---------- | ------ | ----------------------------------- | ----------- |
| 2026-09-30 | New    | task.133 `/finalise` re-run session | Bug created |

---

## Resolution Summary

[Will be completed when bug is closed]
