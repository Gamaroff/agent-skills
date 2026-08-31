# Bug Report: Task 67 — Fence desync, resource leak, credential leak, and coverage gaps

**Task**: [Link](./task.67.execute-the-skill-qa-gate.md)
**Bug ID**: TASK-67-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA (Step 3b diff code review)
**Date Found**: 2026-08-31

## Description

Four MEDIUM and six LOW issues in `qa-execute-snippets.mjs` and its test suite. None is a safety
hole (those are [BUG-1](./task.67.bug.1.classifier-fails-open.md)), but two of them cause the gate to
**silently cover nothing**, which is the failure mode this task exists to eliminate.

## Issues

### M1 — An attributed fence desynchronises the whole file (`qa-execute-snippets.mjs:49`)

The fence regex rejects any info string carrying attributes — ` ```bash showLineNumbers `,
` ```bash title="x" `. Such an opener is not recognised as a fence, its body is dropped, **and its
closing ``` is then read as an opening fence**, inverting fence state for the rest of the document.

Verified: a document with one attributed bash block followed by a plain bash block extracts **zero**
blocks. The gate reports nothing to run and moves on.

**Fix**: capture the language as the first word of the info string and ignore the remainder —
`/^(\s*)(`{3,}|~{3,})\s*([A-Za-z0-9_+-]*)([^`]*)$/`, using group 3 as `info`.

### M2 — Temp directory leaks on a bad `--copy` (`qa-execute-snippets.mjs:416`)

`mkdtempSync` and `cpSync` both sit **outside** the `try` whose `finally` removes the directory. A
missing `--copy` path, `EACCES`, or a symlink loop throws with the temp dir already created and never
removed; `main` swallows it into exit 2, so the leak is silent and repeats every run.

**Fix**: move `cpSync` inside the `try`, or wrap the copy in its own try/catch that removes `tmp`
before rethrowing.

### M3 — Every snippet inherits the full parent environment (`qa-execute-snippets.mjs:335`)

`env = { ...process.env, ...bindings }` hands each block `GITHUB_TOKEN`, Jira/Bitbucket credentials,
npm tokens — directly contradicting the file's own header claim that *"the execution environment
carries no credentials"* and the task's High-risk mitigation of the same wording.

Inherited `PWD`/`OLDPWD` also disagree with the `cwd: tmp` the block actually runs in, which can
manufacture shell-disagreement noise on its own.

**Fix**: build a minimal allow-listed env (`PATH`, `HOME`, `LANG`, `TERM`, `TMPDIR`) plus the caller
bindings, and set `PWD` to `cwd`.

### M4 — Skip reason misreports a template as a command (`qa-execute-snippets.mjs:222`)

`commandWords` splits on `|`, so the alternation inside a template slot becomes command words. In
`shared/resources/develop-pipeline-step-5-6-qa-loop.md:31`,
`node .agents/skills/{develop-story|develop-task|develop-bug}/references/jira-stage.js` reports
`unrecognised-command: node, develop-task` — naming `develop-task` as a command it is not.

The classification outcome is unaffected (`node` is unrecognised regardless), so this is a **reason
accuracy** defect. It still matters: the skip record is the deliverable of §5, and a misleading
reason erodes exactly the evidence the step exists to produce.

**Fix**: exempt `|` inside a brace-delimited template slot from the segment split, or check
`PLACEHOLDER_PATTERNS` before `unrecognised-command` when the unknown word came from inside braces.

### L1 — `unboundVariables` scans single-quoted spans (`:259`)

`ls | awk '{print $NF}'` classifies `placeholder: unbound-variable: NF` and is skipped — literal
`$NAME` text inside single quotes is treated as a variable read. Conversely `${#FOO}` is not
recognised as a read at all and slips through as runnable.

**Fix**: scan `stripProse(code)` with single-quoted spans blanked, and extend the read pattern to
`\$\{[#!]?([A-Za-z_]\w*)`.

### L2 — Timeout detection mislabels self-sent SIGTERM (`:344`)

`r.error?.code === "ETIMEDOUT"` is correct and sufficient. The `|| r.signal === "SIGTERM"` arm
additionally reports any block that terminates itself (`kill -TERM $$`) as a timeout, at `high`
confidence.

**Fix**: drop the disjunct.

### L3 — `--timeout` is unvalidated (`:498`)

`Number(argv[++i])` accepts `abc` (NaN) and `-1`; both make `spawnSync` apply **no timeout at all**,
silently disabling hang protection on a typo.

**Fix**: reject non-finite or non-positive values with exit 2.

### L4 — `git` subcommand resolved from segment start, not from the `git` token (`:247`)

`FOO=1 git push` resolves the subcommand to `git` itself, yielding `git:git`. It stays fail-closed
here, but the reason is wrong and a differently shaped prefix could pick up an unrelated word.

**Fix**: track the index of the `git` token and search after it, skipping `-c k=v` / `-C dir`.

### L5 — Eight tests vanish silently without zsh (`tests:192`)

`{ skip: !zshAvailable() }` gates the **entire task-66 regression fixture**, the `executeFile`
end-to-end case, and the `MUTATION: dropping the zsh arm` proof. On a CI image without zsh they all
disappear and the suite still reports green — so the only tests holding the dual-shell mechanism are
absent exactly where regressions land. CI runs `ubuntu-latest`.

**Fix**: make zsh a declared prerequisite — skip only when `process.env.CI` is unset, and install zsh
in the CI image. (Note this is the *test* side of the guard; the *runtime* zsh guard is correct and
deliberate.)

### L6 — Two weak tests (`tests:266`, `tests:392`)

- The hanging-block test accepts `execution-timeout` **or** `execution-failure`, so it passes even if
  timeout classification regresses; and it never asserts the run finished near `BLOCK_TIMEOUT_MS`, so
  "the block was cut off rather than waited out" is unmeasured.
- `MUTATION: removing the fail-closed default` asserts against a locally defined `denyListOnly` fake
  that can never fail regardless of module behaviour. Its only real assertion duplicates the loop at
  line 106.

**Fix**: assert `execution-timeout` specifically plus a `Date.now()` delta; delete or rewrite the
second test to assert a property of the module.

### L7 — `zshAvailable()` spawns a subprocess per call (`:322`)

Called once per `executeFile` and once per `{ skip: !zshAvailable() }` predicate — eight extra bash
spawns per test run. **Fix**: memoise at module level.

### L8 — The CLI surface is untested

`main()` (argument parsing, `--bind` validation, `--help`, unknown-argument exit 2, exit-code
mapping) and `render()` have no coverage, though exit codes `0`/`1`/`2` are the documented contract
callers depend on. **Fix**: a small table-driven test over `main([...])`.

## Impact

M1 is the most consequential: it makes the gate report a clean run on a document it never read. M2
and M3 are hygiene defects with real consequences (disk leak; credentials handed to executed
snippets). The LOW items reduce coverage and accuracy but do not compromise safety.

## Recommendation

Fix M1–M3 before merge; M4 and the LOW items may follow. Each fix needs a regression test and a
mutation proof.


---

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-08-31

| ID | Status | Fix |
|---|---|---|
| M1 attributed fence | ✅ Fixed | Language is now the first word of the info string; the remainder is ignored. Verified: a doc with an attributed block plus a plain one extracts **2** blocks, was 0 |
| M2 temp-dir leak | ✅ Fixed | `mkdirSync`/`cpSync` moved inside the `try`; the `finally` removes the temp **root**. Verified on both the happy and the failing path — engine temp dirs before and after are equal |
| M3 environment leak | ✅ Fixed | Minimal env (`PATH`, `HOME`, `LANG`, `TERM`, `TMPDIR`, `PWD`) plus caller bindings. Verified: a secret set in the parent is invisible to the snippet |
| M4 skip reason names a template as a command | ⏭ Deferred | Reason-accuracy only; classification is unaffected (`node` is unrecognised regardless). Filed as remaining work |
| L1 quoted-span variable scan | ⏭ Deferred | Reduces coverage slightly; no safety impact |
| L2 SIGTERM mislabelled | ✅ Fixed | Dropped the `\|\| r.signal === "SIGTERM"` disjunct |
| L3 unvalidated `--timeout` | ✅ Fixed — **finding partly incorrect** | See correction below |
| L4 git subcommand window | ⏭ Deferred | Stays fail-closed; reason string only |
| L5 zsh-gated tests vanish on CI | ⏭ Deferred | Needs a CI image change; filed as remaining work |
| L6 two weak tests | ✅ Fixed | Hanging-block test now asserts `execution-timeout` specifically **and** a wall-clock bound; the vacuous `denyListOnly` assertion was removed |
| L7 unmemoised `zshAvailable()` | ✅ Fixed | Memoised at module level |
| L8 CLI surface untested | ✅ Fixed | Table-driven test over `main([...])` covering exit codes 0/1/2, `--bind` validation, `--help` and unknown arguments |

#### Correction to finding L3

The finding stated that `--timeout abc` and `--timeout -1` "make `spawnSync` apply no timeout at all —
the hang protection is silently disabled by a typo". **That mechanism is wrong**, and it was caught
because the mutation proof came back UNHELD: removing the validation changed no behaviour.

Measured directly — `spawnSync` **throws `ERR_OUT_OF_RANGE`** for both `NaN` and a negative timeout, so
the run already failed loudly (exit 2) with or without a check. Nothing was silently disabled.

The underlying concern is real, but for a value the finding did not name: **`--timeout 0` is accepted**
and means *no timeout*. That is the input that silently disables hang protection.

The validation is kept and now earns its place: it rejects `0` with a message naming the constraint,
and turns the `NaN`/negative cases into a clear error instead of an opaque `ERR_OUT_OF_RANGE`. The
regression test asserts the `0` case, because that is the one where removing the check changes what the
tool does.

**Testing**: 61 tests, 0 failures. Each fix above carries a regression test and a mutation proof.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-08-31 | New | QA | 4 MEDIUM + 8 LOW |
| 2026-08-31 | Ready for QA | qa-fix | 3 MEDIUM + 4 LOW fixed; 5 deferred with rationale |

| 2026-08-31 | Closed | QA | Fix verified in cycle 2 — gate.2 PASS |
