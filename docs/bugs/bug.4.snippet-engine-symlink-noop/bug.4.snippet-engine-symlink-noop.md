---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
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
**Status**: ✅ Ready for QA
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

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-01
**Developer**: develop-bug

**Reproduction**: Ran the engine twice against the same file, varying only the invocation
path. Through the documented symlinked path the process is completely silent; through the
real path it emits the full report and the correct non-zero exit code:

```
$ node .agents/skills/qa-task/references/qa-execute-snippets.mjs \
    --file shared/resources/develop-pipeline-step-3-develop-loop.md --json
exit=0                          # ← zero bytes of stdout and stderr

$ node skills/qa-task/references/qa-execute-snippets.mjs \
    --file shared/resources/develop-pipeline-step-3-develop-loop.md --json
{ "file": "...", "blocks": 5, "counts": {...}, "findings": [ zero-blocks-executed ] }
exit=1
```

Confirmed `.agents/skills -> ../skills` and `.claude/skills -> ../skills` are both symlinks.

**Root Cause Analysis**: `shared/resources/qa-execute-snippets.mjs:996` guards its CLI
entrypoint with a raw string comparison:

```js
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
```

Node realpath-resolves `import.meta.url` when it loads the module, but `process.argv[1]`
is passed through verbatim as the user typed it. When the invocation path contains a
symlink the two sides describe the same file by different names, the comparison is false,
`main()` is never called, and the module falls off the end having done nothing —
exiting 0 with no output, which is indistinguishable from a clean run.

The repo already carries the correct form in three sibling CLIs
(`select-next.mjs:1492`, `run-loop.mjs:1578`, `schedule.mjs:627`), each using an
`isInvokedDirectly()` helper that realpaths both sides. `qa-execute-snippets.mjs` was
written later and did not pick it up.

**Proposed Fix**: Adopt the same `isInvokedDirectly()` helper in the shared source, then
`npm run bundle` to propagate to the four generated copies; guard it with both a
behavioural test (invoke through a symlink) and a structural scan (no naive guard may
reappear in any ESM CLI).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-01

**Root Cause**: The ESM entrypoint guard at `shared/resources/qa-execute-snippets.mjs:996`
compared `import.meta.url` — which Node has already realpath-resolved — against
`pathToFileURL(process.argv[1])`, which is whatever the caller typed. Any symlink in the
invocation path made the two sides name the same file differently, so the guard was false
and `main()` was never called.

**Fix Description**:

- Replaced the raw comparison with an `isInvokedDirectly()` helper that resolves **both**
  sides through `realpathSync`, falling back to a plain `resolve()` comparison if realpath
  throws (deleted or unreadable path). This is the same helper already used by
  `select-next.mjs`, `run-loop.mjs` and `schedule.mjs`; the engine is now the fourth
  identical copy rather than the one outlier.
- Swapped the now-unused `pathToFileURL` import for `fileURLToPath`, and added
  `realpathSync` / `resolve` to the existing `node:fs` / `node:path` imports.
- Ran `npm run bundle` to propagate to the four generated copies. The bundled copies are
  what the documented invocations actually name, so a source-only fix would have left every
  real caller broken.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs` — realpath-resolved entrypoint guard (the only
  hand-edited source)
- `skills/qa-task/references/qa-execute-snippets.mjs` — bundle output
- `skills/qa-story/references/qa-execute-snippets.mjs` — bundle output
- `skills/develop-task/references/qa-execute-snippets.mjs` — bundle output
- `skills/develop-story/references/qa-execute-snippets.mjs` — bundle output
- `shared/resources/tests/qa-execute-snippets.test.mjs` — added three regression tests (see below)

**Testing**:

Three tests were added, and they are deliberately a pair-plus-one rather than a single check.
The suite's other 1100 lines test the engine's exported functions in-process and therefore
never reach the module-level guard — which is exactly why this bug survived in a
well-tested file.

| Test | Kind | What it holds |
| --- | --- | --- |
| `CLI: runs when invoked through a symlinked path` | behavioural | Symlinks the module into a temp dir, invokes it through the link, and asserts non-empty stdout **first, by length** — the failure mode is silence, and an empty-string assertion reports it far more legibly than a `JSON.parse` throw. |
| `CLI: the symlinked and real invocation paths agree exactly` | behavioural | Pins stdout and exit status to be identical through both paths, so any future *divergence* fails, not only total silence. |
| `CLI: no engine copy carries a naive entrypoint guard` | structural | Scans the source and all four bundled copies for the naive comparison, and requires a realpath-resolved guard that is actually wired up. Catches a source-only fix that was never bundled. |

All three fail on the pre-fix code and pass after it.

The three CLI tests fork a real node process (which itself forks a shell per block), so they
are exactly the spawn-heavy shape `shared/resources/tests/spawn-budget.mjs` exists for —
bug.2's remedy. They therefore spawn through a `runCli()` helper that takes its timeout and
retry count from `spawnBudget("SNIPPETS")` and retries **only** when `neverRan()` says the
child never produced an answer; a child that ran and exited non-zero is a result and is never
retried away. They also pass `--no-zsh`: these tests assert the CLI runs *at all* through a
symlink, and the dual-shell behaviour is already covered elsewhere in the suite, so forcing the
bash arm halves the subprocesses each one costs.

This was not cosmetic. A first cut without the budget ran at 1.5s / 30.3s under load; with it
the same three run in 0.13s / 0.29s / 0.002s, and the engine suite as a whole is 69/69 in 1.7s.
Left as they were, three slow spawn-heavy tests would have been added to a suite that runs four
files concurrently — pushing on the very timeout pressure bug.2 fixed and B5 still exhibits.

**Mutation proof** — four mutations, each confirming a different assertion is load-bearing:

| # | Mutation | Result |
| --- | --- | --- |
| 1 | Restore the naive guard in the source | All three tests go **red** |
| 2 | Source fixed, one bundled copy left naive (a stale bundle) | Behavioural tests pass; **structural test alone goes red** — proving the two guards cover genuinely different failures and that scanning the copies is load-bearing |
| 3 | Delete the guard function entirely | Structural test goes **red** |
| 4 | Guard defined but never called (`if (true)`) | Structural test goes **red** |

Mutation 3 initially **passed**, and that is worth recording. The first cut of the
anti-vacuous assertion matched the bare token `/realpathSync/`, which still appears in the
`node:fs` import list after the guard function is deleted — so the scan reported success on
a file with no entrypoint guard at all. This is precisely the vacuous pass this bug's own
report warned a structural scan can give (and that bug.3 shipped). The assertion was
tightened to match the full `realpathSync(fileURLToPath(import.meta.url))` comparison plus a
reachable `if (isInvokedDirectly())` call site, after which mutations 3 and 4 both go red.

**Verification Steps for QA**:

1. Run the original reproduction from this report and confirm the two invocations now agree —
   the `.agents/skills/...` path must emit the JSON report and exit 1, not exit 0 silently.
2. Run `node --test --test-name-pattern='CLI:' shared/resources/tests/qa-execute-snippets.test.mjs`
   and confirm three passes.
3. Re-run mutation 1 (restore the naive guard in `shared/resources/qa-execute-snippets.mjs`)
   and confirm all three tests go red, then restore.
4. Run `npm run bundle` and confirm it reports the four skills **in sync** — i.e. the
   committed bundle output matches the source.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

### Iteration 2

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-01
**Trigger**: Verify Cycle 1, signal 3 (`/review-code` on the PR #292 diff).

The fix itself was reviewed clean — the `isInvokedDirectly()` port is line-for-line faithful to
`select-next.mjs`, `pathToFileURL` has no remaining references, no new import shadows an existing
binding (`resolve` was checked against every occurrence in the ~1030-line file), and bug.3's
`process.exitCode` chain is untouched. The reviewer independently re-ran the engine through the real
`.agents/skills` symlink and confirmed it now emits its report.

**The blocking finding was in the regression tests, not the fix.** `CLI: the symlinked and real
invocation paths agree exactly` was still calling `spawnSync` directly, bypassing the
`spawnBudget` helper the other test had adopted — so it ran with no timeout, no `neverRan()` retry,
and no `--no-zsh` (4 shells instead of 1). Under load that test would report *a behavioural
divergence that never happened*, which is precisely the false positive `neverRan()` exists to
prevent and the same class of failure B5 exhibits.

**Root cause of the miss**: the edit that introduced `runCli` used exact-string replacement, and an
earlier `prettier --write` had already reflowed those `spawnSync` calls across multiple lines. The
replacement silently found no match. The script asserted only that *some* replacement had occurred,
not that *each* had — so one of two edits landed and the run reported success. Fixed by asserting
per replacement and writing after each.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-01

**Fix Description** — five review findings applied to `shared/resources/tests/qa-execute-snippets.test.mjs`:

1. **(blocking)** Routed `the symlinked and real invocation paths agree exactly` through `runCli`
   with `--no-zsh`, giving it the same budget, retry and cost profile as its sibling.
2. Added an anti-vacuous guard to that test: it previously passed if the entrypoint block were
   deleted outright, since both arms fall silent and `"" === ""` holds. Now asserts the real path
   produced output before comparing the two.
3. Added a `neverRan()` check ahead of the stdout-length assertion in
   `runs when invoked through a symlinked path`. An exhausted retry leaves `stdout === null`, so
   the length assertion threw a `TypeError` and never printed its message — losing exactly the
   legibility it exists for. Now distinguishes "never ran" (load) from "ran and said nothing" (this bug).
4. Made the structural scan's `naive` regex symmetric. It anchored on
   `import.meta.url === pathToFileURL(argv[1])`, but the operands commute:
   `pathToFileURL(argv[1]).href === import.meta.url` is the identical defect written the other way
   round, and no formatter would rewrite it for you. Now matches on the unresolved
   `pathToFileURL(process.argv[1])` alone, which is the real tell.
5. Corrected the `runCli` JSDoc, which claimed all three tests fork a process and pass `--no-zsh`;
   the copies scan does neither.

**Files Modified**:

- `shared/resources/tests/qa-execute-snippets.test.mjs` — the five changes above

**Testing**: engine suite 69/69 (exit 0), prettier clean. Mutations 1–4 re-proven red against the
tightened tests, plus a **fifth**: the commuted naive guard from finding 4, which the previous regex
passed and the symmetric one now fails.

**Verification Steps for QA**: as Iteration 1, plus — write
`if (pathToFileURL(process.argv[1] ?? "").href === import.meta.url) {` into the source and confirm
`CLI: no engine copy carries a naive entrypoint guard` goes red.

### Iteration 3

#### Re-Investigation (Ready for QA → Reopened)

**Date**: 2026-09-01
**Trigger**: Verify Cycle 2, signal 3 (re-review of the PR #292 diff).

The re-review confirmed all five Iteration 2 findings as genuinely fixed, and independently re-ran
the engine through the real `.agents/skills` symlink (exit 1, 1132 bytes — not exit-0-silent). It
found one new regression, and it is the same class as the one Iteration 2 had just removed:

`the symlinked and real invocation paths agree exactly` dereferenced `viaReal.stdout.length` with
no `neverRan()` check on either arm — nine lines below the guard Iteration 2 added to the sibling
test for exactly that reason. Two failures hid there. If `viaReal` never ran, the vacuity guard
throws a `TypeError` on null and prints nothing. Worse, if only `viaLink` never ran, control
reaches the equality assertion and `null !== "{…}"` is reported as **"the invocation path must not
change the report"** — a behavioural divergence that never happened, on a machine that was merely
loaded. That is the precise false positive `neverRan()` exists to prevent.

#### Fix Implementation (Reopened → Ready for QA)

**Date**: 2026-09-01

**Fix Description**: added `assert.ok(!neverRan(viaLink) && !neverRan(viaReal), …)` immediately
after both `runCli` calls and before any `stdout` dereference, with a message naming which arm
failed to start and stating that this is a load problem rather than a divergence.

**Files Modified**:

- `shared/resources/tests/qa-execute-snippets.test.mjs` — the guard above

**Two further review observations were considered and deliberately not actioned:**

- *The structural scan pins one exact idiom* (`realpathSync(fileURLToPath(import.meta.url))`), so a
  different but correct fix — e.g. `pathToFileURL(realpathSync(process.argv[1])).href ===
  import.meta.url` — would fail it. **The pin is intentional.** The looser alternative was tried
  first and is what let mutation 3 pass vacuously: the bare token `realpathSync` is satisfied by the
  `node:fs` import list alone. A scan that asserts a shape is the price of a scan that cannot be
  satisfied by an import statement. The behavioural tests are what admit any correct implementation;
  the scan exists to stop the one known-broken shape.
- *The scan does not strip comments before matching*, so a maintainer writing the naive expression
  verbatim inside a comment would turn it red. Not actioned: the repo's comment stripper is a private
  helper in another test file, and duplicating one here trades a self-explaining false red (the
  message names the file and the fix) for the risk that a mis-parsing stripper silently hides a real
  defect in code it mistook for a comment. Given this bug is *about* a silent false pass, the
  asymmetry favours leaving it. The engine's own guard comment does not contain the literal.

**Testing**: engine suite 69/69, prettier clean, `npm run ci:fast` green. Five mutations re-proven
against the final suite, with the differentiation intact:

| Mutation | Behavioural | Structural |
| --- | --- | --- |
| M1 naive guard (canonical order) | ✖ red | ✖ red |
| M5 naive guard (commuted order) | ✖ red | ✖ red |
| M3 guard deleted entirely | ✖ red | ✖ red |
| M4 guard defined but never called (`if (true)`) | ✔ pass (main still runs) | ✖ red |
| M2 stale bundle (source fixed, one copy naive) | ✔ pass (source is correct) | ✖ red |
| *(clean)* | ✔ pass | ✔ pass |

M4 and M2 turning **only** the structural test red is the point of having both: the behavioural
tests exercise the source, so neither a mis-wired guard nor an unbundled fix is visible to them.

---

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------ | ---------- | ----- |
| 2026-09-01 | New | QA Engineer | Filed from task.75 QA cycle 1 — found while running Step 4b |
| 2026-09-01 | In Progress | develop-bug | Reproduced through the symlinked path (exit 0, no output); root cause localised to `qa-execute-snippets.mjs:996` |
| 2026-09-01 | Ready for QA | develop-bug | Realpath guard applied + bundled to 4 copies; 3 regression tests added, 4 mutations proven |
| 2026-09-01 | Reopened | develop-bug | Verify cycle 1 signal 3: review-code found the fix clean but one regression test unbudgeted — false-positive risk under load |
| 2026-09-01 | Ready for QA | develop-bug | Iteration 2: 5 review findings applied to the tests; 5 mutations proven |
| 2026-09-01 | Reopened | develop-bug | Verify cycle 2: re-review confirmed all 5 fixes, found an unguarded stdout deref in the sibling test |
| 2026-09-01 | Ready for QA | develop-bug | Iteration 3: neverRan guard on both arms; 5 mutations re-proven |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]
