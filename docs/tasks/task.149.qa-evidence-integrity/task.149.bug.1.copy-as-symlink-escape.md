# Bug Report: Task 149 - `--copy-as` DEST containment is lexical, so a seeded symlink writes outside the sandbox

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (qa-task cycle 1, Step 3b probe; code review CR-3)
**Date Found**: 2026-09-26

## Description

`executeFile`'s `--copy-as` guard checks `resolve(tmp, dest)` as a **string**: it must equal `tmp` or
start with `tmp + sep`. `mkdirSync(dirname(target))` and `cpSync(src, target)` then follow any
symlink already in the working copy. `--copy <dir>` copies symlinks as symlinks, so a seeded
directory holding `out -> /somewhere/outside` lets `--copy-as SRC:out/sub` pass the check and write
`/somewhere/outside/sub`.

## Steps to Reproduce

```bash
S=$(mktemp -d); mkdir -p "$S/src" "$S/seed" "$S/outside"; echo x > "$S/src/a"
printf '```bash\necho ok\n```\n' > "$S/SKILL.md"; ln -s "$S/outside" "$S/seed/out"
node shared/resources/qa-execute-snippets.mjs --file "$S/SKILL.md" --no-zsh \
  --copy "$S/seed" --copy-as "$S/src:out/sub"; echo "exit $?"
ls "$S/outside"   # → sub   (written outside the temp root)
```

Reproduced through the probe engine: `security-probe.mjs --entry cli:shared/resources/qa-execute-snippets.mjs`,
case `copy-as.symlink-through` → `accepted`, verdict `present-but-inert` (12/13 held). Record:
`task.149.qa.1.security.run.json`.

## Expected Behavior

A DEST whose resolved location — after following symlinks already in the working copy — is outside
the temp root is refused with exit 2, and nothing is written.

## Actual Behavior

Exit 0; `sub` is created outside the sandbox.

## Impact

The task's own Rollback Plan lists "any write outside the snippet sandbox" as a **critical** trigger.
The guard it added is a boundary that holds against every lexical escape and fails against the one
the filesystem supplies.

## Recommendation

Resolve the deepest **existing** ancestor of `target` with `realpathSync` and require it to be
`realpathSync(tmp)` or under it; refuse otherwise. Add a test that seeds a symlink with `copyFrom`
and asserts the refusal and that nothing appears at the link's target.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Root Cause**: the containment test compared `resolve(tmp, dest)` as a string; `mkdirSync` and
`cpSync` then follow any symlink already under `tmp` — one `--copy` seeded, or one an earlier
`--copy-as` pair placed.

#### Fix Implementation (In Progress → Ready for QA)

- `shared/resources/qa-execute-snippets.mjs`: `refuseSymlinkedPath(tmp, target, dest)` walks each
  existing component from the working copy down to the DEST with `lstatSync` and refuses any symlink —
  dangling or not, final component included — before anything is created. Exit 2 via `main`, temp root
  removed (inside the existing try).
- `shared/resources/tests/qa-execute-snippets.test.mjs`: QA-22 (a `--copy`-seeded link, dangling link and
  final-component link all refused; nothing lands at the link's target; no temp leak; a real sibling
  directory still accepted) and QA-23 (a link placed by an earlier pair).
- Mutation-proved: removing the call turns QA-22 and QA-23 red.
- Probe re-run with the same 13 cases: **engages 13/13** (was present-but-inert 12/13), nothing written
  outside.

**Verification Steps for QA**: re-run the probe from the QA report with `copy-as.cases.json`; run
`node --test --test-name-pattern='QA-2[23]' shared/resources/tests/qa-execute-snippets.test.mjs`.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 1 |
| 2026-09-26 | In Progress | qa-fix | Investigation started |
| 2026-09-26 | Ready for QA | qa-fix | Fix implemented (qa-fix cycle 1) |
