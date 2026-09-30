---
type: review-report
status: complete
bug: 'bug.17'
mode: 'general'
reviewer: 'review-bug (validate-and-apply, develop-bug Step 2)'
created: '2026-09-30'
---

# Bug Review — bug.17

## Executive Summary

| Field | Value |
|---|---|
| Fix-readiness | 10/10 |
| Recommendation | ✅ READY TO FIX |
| Critical | 0 |
| Important | 1 (applied) |
| Optional | 0 |
| Duplicate | none |
| Reproduces | likely (confirmed by running the repro) |
| Stale source | none |

Score breakdown: Completeness 10 · Reproducibility 9 · Classification 10 · Linkage 10 (average 9.75, rounded to 10).

## Mode

Validate-and-apply, non-interactive. No user decisions were taken.

## Pre-pass results

The two checks ran in-line rather than as Explore subagents. The duplicate scan is one registry
file, and the stale check was settled more strongly by running the reproduction than a read-only
scan could settle it.

- **Duplicate scan**: `docs/bugs/bug-registry.md` holds one row that mentions NUL, `choose_candidate`
  or `--restore`, and that row is bug 17 itself. There are no sibling bug files on this code path.
  Result: `none`.
- **Stale scan**: `shared/resources/advance-pipeline-lock.sh` lines 176–180 (`canon()`) and 232–240
  (`choose_candidate()`) are unchanged from the report's description. There is no control-character
  check before `canon "$c_dir"`. The reproduction steps, run on `8d5ba45e`, gave zsh `rc=0`, printing
  the candidate, and bash `rc=1`, refusing it. Result: `reproduces: likely`, confirmed by running it.

## Findings

### Step 2 — Template & frontmatter

All required sections are present. `type: bug` and `status`/`severity`/`priority`/`created`/`related`/`description`
are well-formed. Filename, `Bug ID` and directory stem agree. No findings.

### Step 3 — Reproducibility

The steps are numbered, concrete and self-contained. The environment, frequency and the Reproducible
field are set, and evidence cites the task.133 by-hand probe record.

- **Important — Expected outcome text is not the fix's outcome (applied).** Expected Behavior
  quoted bash's current refusal message, which comes from the directory-compare branch at line 238.
  The report's own suggested fix (a `jq` control-character test before `canon()`) refuses the
  candidate **earlier**, under both shells. After the fix neither shell would print the quoted text,
  so the fix would fail a literal reading of its own Expected Behavior. The Expected outcome is still
  reachable: a new refusal branch returns it. The *message* is the unreachable part. The fix
  restated Expected Behavior as the refusal contract (skipped, never chosen, `--which` exits 1 when
  it is the only candidate) and kept the bash message as the description of today's behaviour.

### Step 4 — Severity / priority

Minor / Low matches the stated impact. Triggering it needs a hand-crafted file in trusted local
state, and it only happens under the test suite's zsh interpreter pass. No change.

### Step 5 — Linkage

General bug. The registry row for 17 exists and reads `new`, which matches the frontmatter. The
GitHub issue #529 was created by develop-bug Step 1 and written back. No findings.

## Applied

- ✅ Fixed: Expected Behavior restated as a refusal contract under both shells.

## Next Steps

develop-bug Step 3: add a control-character refusal ahead of `canon "$c_dir"` in
`choose_candidate()`, plus a regression case in `advance-pipeline-lock.test.sh` that runs under both
bash and zsh and fails under zsh without the fix.
