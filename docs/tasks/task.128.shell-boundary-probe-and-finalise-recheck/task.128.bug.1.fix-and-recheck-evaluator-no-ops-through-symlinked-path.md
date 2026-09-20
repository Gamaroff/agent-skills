# Bug Report: Task 128 - fix-and-recheck evaluator silently no-ops when invoked through a symlinked path — exit 0 reads as "proceed"

**Task**: [Link](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Bug ID**: TASK-128-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-09-20

## Description
`shared/resources/finalise-fix-and-recheck.mjs` guards its CLI entry with `fileURLToPath(import.meta.url) === process.argv[1]`. `import.meta.url` is the realpath; `process.argv[1]` is whatever the caller typed. Through `.agents/skills/…` — a symlink to `skills/` on every consumer that installs this way, and the path Step 8a's own prose uses — the two differ, `main()` never runs, nothing is printed, and the process exits 0. Step 8a reads exit 0 as "every precondition holds". This is the bug.4 class (`qa-execute-snippets.mjs`, fixed with a realpath compare at `:1858`), reintroduced in new code, and it fails **open**.

## Steps to Reproduce
```bash
printf '{}' > /tmp/f.json
node .agents/skills/finalise/references/finalise-fix-and-recheck.mjs --finding /tmp/f.json; echo "rc=$?"   # no output, rc=0
node skills/finalise/references/finalise-fix-and-recheck.mjs --finding /tmp/f.json; echo "rc=$?"           # halt — 5 fail, rc=1
```

## Expected Behavior
The same finding halts (exit 1) whichever path names the script; a run that evaluated nothing never exits 0.

## Actual Behavior
Silent no-op, exit 0, on the symlinked path — the precondition gate is bypassed by construction on exactly the invocation the prose documents.

## Impact
The bounded fix-and-recheck path can be taken with zero preconditions checked. Every other exit code in this file is unreachable on that path.

## Recommendation
Compare realpaths as `qa-execute-snippets.mjs` does (`realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))`, falling back to the plain compare if realpath throws), and add a test that invokes the CLI through a symlink to a temp dir and asserts non-empty output + the documented exit code. The same guard shape exists in `security-probe.mjs:1043` (pre-existing on base — see the QA report's provenance note).

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)
**Date**: 2026-09-20 · **Root cause**: the CLI entry guard compared `process.argv[1]` (symlinked as typed) to `fileURLToPath(import.meta.url)` (realpath) raw; `.agents/skills → ../skills` makes them differ, so `main()` never ran and the process exited 0 with nothing printed.

#### Fix Implementation (In Progress → Ready for QA)
**Fix**: `isInvokedDirectly()` resolves both sides through `realpathSync` (fallback to a plain `resolve` compare when realpath throws) — the bug.4 pattern from `qa-execute-snippets.mjs`.
**Files**: `shared/resources/finalise-fix-and-recheck.mjs`; test `CLI: invoked through a SYMLINKED path it still runs and exits per the verdict (BUG-1)` in `shared/resources/tests/finalise-fix-and-recheck.test.mjs` (symlinks `shared/resources` into a temp dir and invokes through it; asserts non-empty output and exit 1 on a failing finding).
**Mutation proof**: raw compare restored → that test red.
**Verify**: `node .agents/skills/finalise/references/finalise-fix-and-recheck.mjs --finding <f>` now prints the verdict and exits per it.

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-20 | In Progress | qa-fix | Investigation |
| 2026-09-20 | Ready for QA | qa-fix | realpath guard + symlinked-invocation test |
