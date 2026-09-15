# Bug Report: Task 110 - Read-only whitelist admits mutating command shapes

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-09-15

## Description

`isAllowed()` in `skills/session-handoff/scripts/handoff-verify.mjs` is the safety boundary the task's
§10 names as the one real risk of running commands read from a Markdown file. Executing 56 hostile
inputs against it (31 from `shared/resources/security-input-corpus.mjs` `shell-exec` + 25
whitelist-specific) and the independent diff review (CR-1, CR-2, CR-5, CR-10) found it porous in four
places:

1. `gh api` flag matching is space-separated only — `-XPOST`, `--method=DELETE`, `--field=…` pass.
2. `git branch`, `git tag`, `git remote` are admitted unconditionally — `git branch -D develop`,
   `git tag v9`, `git tag -d v1`, `git remote add/set-url/remove` execute; `--output=<file>` on
   log/show/diff writes a file (corpus case `shell-exec.git-diff-output` accepted).
3. `node`/`python3` are `() => true` — `node -e "…"`, `node --eval`, `python3 -c "…"` run inline code;
   `npx <anything> --check|--dry-run` runs any package, and `npx prettier --write --check .` passes.
4. `find` omits `-fprint`, `-fprint0`, `-fprintf`, `-fls`, `-okdir`.

An embedded newline (`git log\nrm -rf /`) is also not refused by `SHELL_OPERATOR`; it is harmless
today only because the argv is re-joined with quoting.

## Steps to Reproduce

```bash
command node /private/tmp/…/probe-isallowed.mjs   # QA probe script; or:
command node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(m.isAllowed("gh api -XPOST repos/x/y/issues").ok, m.isAllowed("git branch -D main").ok, m.isAllowed("node -e process.exit(1)").ok))'
# → true true true
```

## Expected Behavior

Every input above is refused with `not on whitelist: <bin>` (or `shell operator`); the corpus's
hostile direction yields zero acceptances.

## Actual Behavior

11 hostile shapes accepted; the command would be spawned.

## Impact

A handoff committed to the repo could execute a mutating command on the reader's machine under a
skill whose contract says "never executes anything that is not read-only". Exploitation needs a
malicious or careless commit to `.agents/handoff.md`, so the blast radius is the repo's own authors —
but the contract is the deliverable, and it does not hold.

## Recommendation

Prefix-match `gh` flags; restrict `branch`/`tag`/`remote` to list/inspect shapes and refuse
`--output` on every git subcommand; refuse node/python3 eval and preload flags and require a relative
script path without `..`; refuse `npx` with `--write`/`-w` and restrict its binary to a known set;
extend the `find` deny-list; add `\n` to `SHELL_OPERATOR`. Commit the probe as a test so the
corpus's hostile direction is asserted on every run.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 1)

**Root Cause**: the first whitelist enumerated *binaries* and trusted their arguments — `node: () => true`, `GIT_READ_ONLY` as a flat set of subcommands, `gh api` flags matched only in their space-separated spelling — while running everything through `bash -c`, which also made quoting a second attack surface.

#### Fix Implementation (In Progress → Ready for QA)

**Fix Description**:
- Every rule is now a predicate over the argv, fail-closed per axis: `gitRule` refuses `--output`/`-o` everywhere, admits `branch`/`tag` only in listing form and `remote` only for `-v`/`show`/`get-url`; `ghRule` allows `api` only with an enumerated set of read-shaping flags (so `-XPOST`, `--method=`, `--field=`, `--input` are refused by absence); `interpreterRule` (node, python3) refuses every inline/preload flag and requires a relative script path without `..`; `npxRule` requires a known read-only tool and refuses `--write`/`--fix`/`-p`/`-c`/`-y`; `find` refuses `-fprint*`/`-fls`/`-okdir`; `date` refuses `-s`.
- `SHELL_OPERATOR` now includes newlines; tokens carrying `*`, `~` or `$` are refused as `shell expansion not supported` — because **the command is spawned directly, with no shell** (also the fix for bug.3), so nothing expands and there is no quoting.
- The QA probe is now a committed test: the `shell-exec` corpus's hostile direction must be refused in full, and every shape gate 1 found accepted is in the refused list.

**Files Modified**: `skills/session-handoff/scripts/handoff-verify.mjs`, `skills/session-handoff/tests/handoff-verify.test.js`, `skills/session-handoff/SKILL.md` (whitelist table).

**Testing**: 23/23; mutation-proved — gh flag guard removed → `mutating shapes` red; interpreter rule forced true → red; re-probe: 0/31 corpus mismatches, 0 hostile extras accepted.

**Verification Steps for QA**: re-run the 56-probe script; `command node -e 'import("./skills/session-handoff/scripts/handoff-verify.mjs").then(m=>console.log(m.isAllowed("gh api -XPOST x").ok, m.isAllowed("git branch -D main").ok, m.isAllowed("node -e 1").ok))'` → `false false false`.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-15 | New | QA Engineer | Found by 56 executed probes + diff review (CR-1, CR-2, CR-5, CR-10) |
| 2026-09-15 | In Progress | Claude (qa-fix) | Investigation |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Whitelist rewritten per-axis; probe committed as a test |
| 2026-09-15 | Closed | QA Engineer | Verified in QA cycle 2 (gate 2): shape refused / behaviour proved; corpus 0/73 hostile accepted |
