# Bug Report: Task 149 - The Step 12b / 3e decision passes on empty output and exempts an untracked residue nobody staged

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-3
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 2, refute review CR-2 and CR-5; verified)
**Date Found**: 2026-09-26

## Description

Two gaps in the decision cycle 1 moved into the block:

1. **Empty output reads as clean (CR-2).** When `doc-links.js` fails to load it exits 1 with nothing
   on stdout, which passes `[ "$LINKS_RC" -le 1 ]`. `jq` on empty input exits 0 and prints nothing,
   so `BLOCKING` is empty, and under zsh `[ "" -eq 0 ]` is **true**. The link check is skipped with no
   message. Bash errors instead (rc 2) and lands in the "missing or ignored" halt with the wrong message.
   Verified: `zsh -c '[ "" -eq 0 ] && echo TRUE'` → TRUE; `printf '' | jq -r …` → rc 0.
2. **The `untracked` exemption now excuses only what nobody staged (CR-5).** The block stages the
   document, gate, report and bug reports, so an `untracked` link left after staging is a file the
   block did not stage. The closing line says it "rides in this cycle's commit", but nothing stages it.

3. **A failed stage is ignored (observed live, QA cycle 2 Step 12b).** All four `git add` calls in this
   cycle’s own read-back failed on a transient `.git/index.lock`. The block went on to list the four
   artifacts as `untracked` and print **"read-back clean"** with exit 0. Nothing it claimed to stage
   was staged, and gaps 1 and 2 together hid that.

## Expected Behavior

Empty or non-JSON output halts as "could not look". After staging, any broken link — whatever its
state — is either staged by the block and re-checked, or halts.

## Recommendation

Check every `git add` it runs and halt when one fails; require non-empty output and a numeric `BLOCKING` (`jq -e`); stage every `untracked` target the JSON
names, re-run `doc-links`, and halt on any broken link in the second pass. Tell change-log's
`stale-updated` apart from a load failure by its `--json` reason, not by rc 1. Add block-test
scenarios for an unloadable engine and for an unstaged linked file.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation

Both read-back blocks were rewritten as two passes:
- **Staging.** `stage()` halts on a failed `git add`.
- **Engine output.** `ran()` halts when doc-links exits above 1 or prints nothing ("nothing was checked").
- **Pass 1** stages what the run wrote, then every link the JSON reports `untracked`.
- **Pass 2** re-runs doc-links and halts on **any** broken link. `jq -e` enforces a numeric count.
- **change-log** is read by its `--json` reason: `stale-updated` names `bumpUpdated`, and anything
  else halts as "did not answer".

`tests/qa-read-back-block.test.js` gained six scenarios per skill and shell: a linked file nobody
staged (clean, and staged), a case-mismatched link, a failed stage, doc-links not loading, and
change-log not loading. That makes 40 cases, run concurrently in about 3.5 s. Mutation-proved: a
tolerated stage failure, tolerated empty output, and no pass-1 staging each turn cases red. The
explicit bug-report `find` was removed, since pass 1 stages every linked file (QA-2-M1 is moot). The
input guard is documented as a block input under the same contract Steps 13 / 13b state (CR-6).

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 2 |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 2 |
