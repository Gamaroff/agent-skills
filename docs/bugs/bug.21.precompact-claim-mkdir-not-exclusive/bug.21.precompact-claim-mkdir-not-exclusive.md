---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-11-11'
related: 'none — cross-cutting (no single owner)'
description: 'The PreCompact hook claims the pause with mkdir, which is not exclusive on some kernels, so two concurrent runs both append a pause block and CI Test goes red'
github_issue: 880
---

**Bug ID**: bug.21.precompact-claim-mkdir-not-exclusive
**GitHub**: [#880](https://github.com/Gamaroff/agent-skills/issues/880)
**Related**: None — cross-cutting bug (no single owner)
**Status**: ✅ Ready for QA
**Priority**: High
**Severity**: Major
**Created**: 2026-11-11
**Assigned To**: Unassigned
**QA Engineer**: Unassigned

---

## Bug Description

**Summary**: `shared/resources/develop-pipeline-on-precompact.sh` claims the pause with `mkdir "$CLAIM_DIR"` (line 177), on the premise that `mkdir` is atomic and exclusive. On the kernels below two concurrent `mkdir` calls of the same name both return success, so both hook runs take the claim and both run the whole pause flow.

**Expected Behavior**: of N concurrent hook runs, exactly one takes the claim and appends one `## Pipeline Paused` block; the rest exit 0 with the empty signal.

**Actual Behavior**: both runs take the claim. The report gets two `## Pipeline Paused` headings, and both runs run the report lint, the commit and the tracker calls.

**Impact**: the Test workflow is red on `develop` (commits `e5d32eab` and `b767b065`, both docs-only) and on every PR head, so no PR can show a green check. In a real session a doubled pause entry, commit and tracker comment is possible when two PreCompact hooks fire together (the situation task.110 and task.120 were written for).

---

## Reproduction Steps

**Environment**: LAN server `ci@192.168.1.249`, WSL2 kernel 6.18.33.2-microsoft-standard-WSL2, 8 cores, idle (load 0.3). The laptop kernel does not reproduce it. The GitHub runners are not measured, but the CI failure matches (see Evidence).

**Steps to Reproduce**:

1. Sync the tree to the server. From the repository root run `bash shared/resources/develop-pipeline-on-precompact.test.sh` 12 times.
2. Read the result line of each run.
3. To isolate the primitive, run two concurrent `mkdir` calls of one name, 300 times, and count the runs where both return 0 (script kept by the reporter in the task 304 scratchpad; five lines of bash).

**Frequency**: Sometimes (7 of 12 runs of the test on the LAN server).
**Reproducible**: Yes on the affected kernel, No on the laptop kernel.

---

## Evidence

**Test output** (LAN server, 12 runs): 7 runs end `Results: 30 passed, 1 failed` with `FAIL concurrent: exactly one report block appended`, 5 runs end `31 passed, 0 failed`.

**Trace** (a copy of the hook that logs the claim decision): in every failing run both processes logged `won-claim` within microseconds of each other and neither logged `lost-claim`.

**Primitive race, 300 iterations each, count of runs where both racers succeeded**:

| Primitive | LAN server (ext4) | LAN server (tmpfs) | Laptop (tmpfs) |
| --- | --- | --- | --- |
| `mkdir` | 298 | 228 to 255 | 0 |
| `set -o noclobber` file create | 0 | not run | 0 |
| `ln src dst` | 0 | not run | 0 |
| `ln -s x dst` | 0 | not run | 0 |

**CI**: Test workflow on `develop` passed at `98d6529e`, failed at `e5d32eab` and `b767b065` (docs-only commits, run 42959047359), and failed on PR #876 heads `d611a3c7` and `abe0575b` with the same message: `found 2 '## Pipeline Paused' headings`. The hook itself last changed in `840b85f4` (2026-11-10), before the passing run, so the change is in the environment, not the code.

**Related Files**:

- `shared/resources/develop-pipeline-on-precompact.sh` (claim at line 177, stale-steal at lines 181 to 208, release trap at 211)
- `shared/resources/develop-pipeline-on-precompact.test.sh` (the concurrent scenario, around lines 405 to 445)
- bundled copies under `skills/develop-{bug,story,task}/references/` (regenerate with `npm run bundle`, never hand-edit)

---

## Scope & Impact

**Reference**: the pipeline pause machinery (`develop-pipeline-on-precompact.sh`, `advance-pipeline-lock.sh`, the Stop hook) and the CI Test workflow.

**How It Failed**: the design (task.120, task.110) relies on `mkdir` being an atomic claim. That holds on most kernels and is false on at least one current one. It belongs to no single story or task: it is a shared-hook defect that surfaced as a red CI check during task 304. A search of tracked shell for `mkdir` used as a lock (`git grep` for `if mkdir` / `mkdir … || return` on `LOCK` and `CLAIM` names) finds only this hook.

**Suggested fix** (not decided; `review-bug` and `develop-bug` own the design): claim by an exclusive file create (`set -o noclobber`) or `ln`, both measured exclusive on the affected kernel. Keep the pid record and the stale-claim steal. The steal currently renames the claim directory, so it needs the same exclusivity. Add a regression test that reproduces the double claim by calling the claim step from many concurrent racers and asserting exactly one wins, and prove it red against the `mkdir` claim on the affected kernel or against a stand-in that returns success twice.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-11-11
**Developer**: Claude (develop-bug)

**Reproduction**: the primitive race, run on the LAN server (`ci@192.168.1.249`, WSL2 6.18.33.2) with `race.sh` (two concurrent claimers, N runs, count of runs where both succeed). `mkdir` doubled in 264 of 300 runs on ext4 and 65 of 300 on tmpfs; a noclobber create and `ln` doubled in 0 of 300 on both. The laptop kernel doubled in 0 of 200 for all three, so the failure is kernel-specific, as the report said.

**Root Cause Analysis**: `take_claim` in `shared/resources/develop-pipeline-on-precompact.sh` took the claim with `mkdir "$CLAIM_DIR" 2>/dev/null || return 1` and relied on `mkdir` returning non-zero for the loser. On the affected kernel it returns 0 for both, so both runs took the claim and ran the whole pause flow. The stale-steal path (`mv` of the claim directory, then `take_claim` once more) calls the same function, so it inherits the fix.

**Proposed Fix**: take the claim with an `ln` of a file holding this run's pid onto `$CLAIM_DIR/pid`, keeping the directory and `pid` names every reader already uses; `mkdir -p` only makes the directory.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-11-11

**Root Cause**: `mkdir` is not exclusive on some kernels, and the claim's exclusivity came from `mkdir`.

**Fix Description**:

- `take_claim` writes the run's pid to a per-pid temp file, `mkdir -p`s the claim directory, and `ln`s the temp file to `$CLAIM_DIR/pid`. Only the run whose `ln` lands owns the claim; the pid is published in the same step, so a reader never sees a claimed directory with no pid.
- The comments in the hook and the four docs that described the `mkdir` claim now describe the `ln` claim. `CHANGELOG.md` has an entry. The bundled copies are regenerated.
- The restricted-PATH scenario (jq absent) lists the coreutils the hook needs; `ln` is added.

**Files Modified**:

- `shared/resources/develop-pipeline-on-precompact.sh` — `take_claim` uses `ln`; comments updated
- `shared/resources/develop-pipeline-on-precompact.test.sh` — new scenario 12a (a `mkdir` stand-in that succeeds twice); `ln` added to the jq-absent PATH
- `shared/resources/develop-pipeline-pause.md`, `shared/resources/develop-pipeline-hooks.md`, `docs/reference/pipeline-artifacts.md`, `CHANGELOG.md` — wording
- `skills/develop-{bug,story,task}/references/*`, `skills/develop/references/develop-pipeline-pause.md` — bundled copies (`npm run bundle`)

**Testing**:

- Regression test: scenario 12a. Against the old hook it fails 12 of 12 runs on the affected kernel and 3 of 3 on the laptop (where `mkdir` is exclusive, because the test supplies the broken primitive); against the fix it passes.
- Mutation: the old hook against the new test gave scenario 12 red 7 of 12 and scenario 12a red 12 of 12 on the affected kernel.
- After the fix the whole suite (32 tests) ran 0 red in 20 runs on the affected kernel at load average 8.6, and 32/32 three times on the laptop.
- `npm run bundle:check` is clean.

**Verification Steps for QA**:

1. On the LAN server run `bash shared/resources/develop-pipeline-on-precompact.test.sh` 20 times: expect `32 passed, 0 failed` each time.
2. Revert `take_claim` to `mkdir "$CLAIM_DIR" 2>/dev/null || return 1` and rerun: scenario 12a must fail.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-11-11
**QA Engineer**: Claude (develop-bug verify cycle 1)

**Verification Result**: ✅ Fixed

**Notes**: regression scenario 12a green (red 12 of 12 on the old hook on the affected kernel); hook suite 32/32 and 0 red in 20 runs on the affected kernel; full suite 8371 pass, 0 fail; `lint:shell` and `bundle:check` clean; `/review-code` returned no blocking finding (one comment applied, two findings declined with reasons in the implementation report).

**Decision**: Closed

---

## Status History

| Date       | Status | Changed By | Notes                                   |
| ---------- | ------ | ---------- | --------------------------------------- |
| 2026-11-11 | New    | Claude     | Bug created, found during task 304 DoD |
| 2026-11-11 | New | ensure-bug-github-issue | GitHub issue created (#880) |
| 2026-11-11 | In Progress | develop-bug | Reproduced on the LAN kernel; investigation started |
| 2026-11-11 | Ready for QA | develop-bug | Fix implemented + regression test (scenario 12a) |
| 2026-11-11 | Ready for QA | finalise | DoD verified — bug.21.dod.1.precompact-claim-mkdir-not-exclusive.md |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
