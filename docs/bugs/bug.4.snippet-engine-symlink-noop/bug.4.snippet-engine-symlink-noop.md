---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: '2026-09-01'
updated: '2026-09-01'
related: 'none — cross-cutting (no single owner)'
description: "qa-execute-snippets.mjs guards its CLI entrypoint by comparing import.meta.url against pathToFileURL(process.argv[1]) without resolving either through realpath. .agents/skills and .claude/skills are symlinks, so when the engine is invoked through the path its own documentation prescribes the guard is false: main() never runs and the process exits 0 with no output. The QA step built to catch prose that is never executed is itself never executed, and reports success."
---

# Bug Report: Snippet engine silently no-ops when invoked through a symlinked path

**Bug ID**: bug.4.snippet-engine-symlink-noop
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
**Priority**: High
**Severity**: Major
**Created**: 2026-09-01
**Assigned To**: Unassigned
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: `shared/resources/qa-execute-snippets.mjs` ends with the ESM entrypoint idiom

```js
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
```

`import.meta.url` is already realpath-resolved by Node; `process.argv[1]` is not. `.agents/skills`
and `.claude/skills` are both symlinks to `../skills` in this repo, and consumer installs symlink the
same way. So when the engine is invoked through the path **its own documentation prescribes** —
`node .agents/skills/qa-task/references/qa-execute-snippets.mjs …` — the two sides differ, the guard
is false, `main()` never runs, and the process exits **0 with zero bytes of output**.

**Expected Behavior**: The engine runs and emits its report regardless of whether it was reached
through a symlink, exactly as `select-next.mjs`, `run-loop.mjs` and `schedule.mjs` already do.

**Actual Behavior**: Exit 0, no stdout, no stderr. Indistinguishable from a clean run with nothing to
report.

**Impact**: This is the failure mode `qa-task` Step 4b exists to eliminate, reproduced inside the
remedy. The step's own rule says *"a run where zero blocks executed is a finding, not a pass"* — but
the engine never gets far enough to raise it. Every `qa-task` / `qa-story` run since task 67 that
reached Step 4b via the documented path has recorded a pass for a check that did not execute, so the
Step 4b line in those QA reports is unsupported. Nothing is *wrong* in the code they reviewed; the
evidence for one axis simply is not there.

---

## Reproduction Steps

**Environment**: macOS (Darwin 25.5.0), Node v24.13.1. Platform-independent — this is Node module
resolution plus a symlink, not an OS behaviour.

**Steps to Reproduce**:

```bash
cd <repo root>
ls -ld .agents/skills          # → .agents/skills -> ../skills   (symlink)

# 1. Through the documented path — silent success
node .agents/skills/qa-task/references/qa-execute-snippets.mjs \
  --file shared/resources/develop-pipeline-step-3-develop-loop.md --json
echo "exit=$?"                 # → exit=0, and NOTHING was printed

# 2. Through the real path — correct behaviour
node skills/qa-task/references/qa-execute-snippets.mjs \
  --file shared/resources/develop-pipeline-step-3-develop-loop.md --json
echo "exit=$?"                 # → exit=1, 1132 bytes of JSON incl. zero-blocks-executed
```

| Invocation | Exit | Real stdout |
| --- | --- | --- |
| `.agents/skills/…` (documented) | **0** | none |
| `skills/…` (realpath) | **1** | 1132 B JSON |

**Frequency**: Always, whenever the invocation path contains a symlink
**Reproducible**: Yes — deterministic

---

## Evidence

### The repo already knows about this defect

`skills/develop-next/scripts/select-next.mjs:1486` carries the fix **and a comment describing this
exact failure**:

```js
// Resolve BOTH sides through realpath: consumer projects symlink
// `.claude/skills` -> `.agents/skills`, so argv[1] arrives symlinked while
// import.meta.url is already real. Comparing them raw makes this guard false
// and main() never runs: exit 0, no output. That reads as "no item selected"
// rather than as a failure, so the loop silently does nothing.
function isInvokedDirectly() { … fs.realpathSync on both sides … }
```

`qa-execute-snippets.mjs` was written later and used the naive comparison.

### Scope — an outlier, not a pattern

A scan of every ESM CLI in the repo:

| File | Guard |
| --- | --- |
| `shared/resources/qa-execute-snippets.mjs` | **naive** ← the only real source |
| `skills/{qa-task,qa-story,develop-task,develop-story}/references/qa-execute-snippets.mjs` | **naive** — bundle output of the above |
| `skills/develop-next/scripts/select-next.mjs` | resolved ✅ |
| `skills/loop-supervisor/scripts/run-loop.mjs` | resolved ✅ |
| `skills/develop-batch/scripts/schedule.mjs` | resolved ✅ |

Three of four CLIs already do it correctly. One source file needs the fix; `npm run bundle`
propagates it to the four generated copies.

### How it was found

During `/qa-task` cycle 1 of **task 75**, running Step 4b over the change set. The engine returned
nothing through the documented path; the run would have recorded "Step 4b: passed" had the empty
output not been questioned.

---

## Scope & Impact

**Reference**: `shared/resources/qa-execute-snippets.mjs` (~line 997)

**Why it has no single owner**: the engine is shared machinery invoked by `qa-task` and `qa-story`,
bundled into four skills. It belongs to no story or task.

**Blast radius**: one silent QA check. It does not affect merged code correctness — it affects
whether the evidence behind a QA verdict exists.

---

## Suggested Fix

1. Replace the guard with `select-next`-style realpath resolution — lift `isInvokedDirectly()` from
   `select-next.mjs:1492` verbatim, comment included, including its `catch` fallback to a plain
   `path.resolve` comparison for a deleted or unreadable path.
2. `npm run bundle` to propagate to the four generated copies.
3. **Two guards, because a structural scan alone is not enough here** — this repo has already shipped
   a structural guard that passed under mutation on the exact bug it named (bug.3):
   - **Behavioural**: invoke the CLI through a symlinked path in a temp tree and assert non-empty
     output and the expected exit code. This is the test that actually holds the bug.
   - **Structural**: scan every ESM CLI for the naive comparison and fail on any match, so the class
     cannot return in a new file.
4. **Mutation-prove**: revert the source to `pathToFileURL(process.argv[1])` and confirm *both*
   guards go red.

---

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------ | ---------- | ----- |
| 2026-09-01 | New | QA Engineer | Filed from task.75 QA cycle 1 — found while running Step 4b |
