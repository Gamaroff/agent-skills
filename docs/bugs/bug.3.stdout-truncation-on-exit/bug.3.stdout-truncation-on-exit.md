---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Critical'
created: '2026-09-01'
updated: '2026-09-01'
related: 'none — cross-cutting (no single owner)'
description: 'Three shipped CLIs call process.exit() immediately after writing to stdout. When stdout is a pipe the write is asynchronous, so exit truncates the output at the ~64KB pipe buffer. select-next.mjs --lint has now crossed that threshold, so npm test is red — and npm test is the develop-next merge gate.'
---

**Bug ID**: bug.3.stdout-truncation-on-exit
**Related**: None — cross-cutting bug (no single owner)
**Status**: ✅ Ready for QA
**Priority**: Critical
**Severity**: Major
**Created**: 2026-09-01
**Assigned To**: Unassigned
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: Three shipped CLIs end an output path with `process.stdout.write(...)` or
`console.log(...)` immediately followed by `process.exit(code)`. When stdout is a **pipe**, Node's
writes are asynchronous; `process.exit()` terminates the process before the pipe drains, silently
truncating output at the ~64KB pipe buffer. When stdout is a **file or TTY**, writes are synchronous
and the same command produces complete output — which is why the defect stayed invisible.

**Expected Behavior**: A CLI that emits JSON emits *all* of it, or fails loudly. Output must not
depend on whether the caller redirects to a file or reads a pipe.

**Actual Behavior**: `select-next.mjs --lint` emits 68,006 bytes to a file and **65,266 bytes to a
pipe**, cut mid-string. `JSON.parse` then throws `Unterminated string in JSON at position 65266`.

**Impact**: `npm test` is currently **red** on a clean tree, and
`developNext.qualityGateCommand` defaults to `npm test`. `develop-next` SKILL.md:156 says that gate
runs **"Always** … on the PR branch. This is the real gate". So `/develop-next` will refuse to merge
**any** PR until this is fixed — the whole roadmap frontier is blocked behind it.

This is a defect in the **gate**, like [`bug.2`](../bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md),
and it carries the same secondary cost: a suite that is red for reasons unrelated to the change in
hand teaches everyone to merge over red.

---

## Reproduction Steps

**Environment**: macOS (Darwin 25.5.0), Node v24.13.1. Platform-independent — this is Node semantics,
not a macOS quirk.

**Steps to Reproduce**:

1. Check out a clean `develop`.
2. Run `npm test`. Observe one failure:
   `evals/develop-next/unit/select-next.test.mjs:389` —
   `SyntaxError: Unterminated string in JSON at position 65266`.
3. Compare the two capture modes directly:

```bash
# file redirect — synchronous writes, complete output
node skills/develop-next/scripts/select-next.mjs --lint \
  --roadmap evals/develop-next/unit/fixtures/10-real-world.md > /tmp/f.json
python3 -c "raw=open('/tmp/f.json').read(); print('FILE', len(raw[raw.index('{'):]))"

# pipe — asynchronous writes, truncated at the buffer
node -e 'const{execFileSync}=require("child_process");
const o=execFileSync(process.execPath,["skills/develop-next/scripts/select-next.mjs","--lint",
"--roadmap","evals/develop-next/unit/fixtures/10-real-world.md"],{encoding:"utf-8"});
console.error("PIPE", o.length);'
```

Observed: `FILE 68006`, `PIPE 65266`.

**Frequency**: Always, once the output crosses ~64KB
**Reproducible**: Yes — deterministic

---

## Evidence

### The three instances

| # | File | Site | Output size | Status |
| - | ---- | ---- | ----------- | ------ |
| 1 | `skills/develop-next/scripts/select-next.mjs` | `process.exit(model.errors.length ? 1 : 0)` after the `--lint` write (~L1462) | **68 KB — over the limit** | 🔴 Manifesting: breaks `npm test` |
| 2 | `skills/develop-next/scripts/select-next.mjs` | `process.exit(result.status === "halt" ? 1 : 0)` after the selection write (~L1474) | 742 B today | 🟡 Latent — grows with the registry |
| 3 | `shared/resources/qa-execute-snippets.mjs` | `console.log(...JSON.stringify(r.report, null, 2)...)` then `process.exit(r.exitCode)` (L1006–1007) | Report-sized | 🟡 Latent — **highest consequence** |
| 4 | `shared/resources/generate-prd-epic-index.mjs` | `console.log(...)` then `process.exit(0)` (L185–186) | One line | 🟢 Latent, low risk |

> **Correction (review-bug, 2026-09-01): the table above undercounts.** It names the four sites that
> were obvious on first reading; a full `grep` of the three files finds **ten** `process.exit()` calls
> that follow a write, and the fix must cover all of them — §Suggested fix point 1 already says "at
> **every** site that follows a write", so this is the table catching up with the stated intent, not a
> scope change. Note that `process.stderr` is asynchronous on a pipe for the same reason `process.stdout`
> is, so an exit after `console.error` is the same defect and is included.
>
> | File | Lines | Preceding write |
> | ---- | ----- | --------------- |
> | `skills/develop-next/scripts/select-next.mjs` | 1384 | `process.stderr.write` — unknown-argument message |
> | | 1411 | `process.stdout.write` — the `status: "halt"` unreadable-roadmap JSON |
> | | **1462** | `process.stdout.write` — the `--lint` payload · **🔴 manifesting** |
> | | 1474 | `process.stdout.write` — the selection payload |
> | `shared/resources/qa-execute-snippets.mjs` | 1000 | `console.error(r.error)` |
> | | 1004 | `console.log(r.usage)` |
> | | **1007** | `console.log(report)` · **highest consequence** |
> | `shared/resources/generate-prd-epic-index.mjs` | 186 | `console.log` — no-PRD-root message |
> | | 254 | `console.error` — `--strict` skipped-epics message |
> | | 263 | `console.log` — `--check` staleness verdict |

**Instance 3 deserves emphasis.** `qa-execute-snippets.mjs` is the task-67 machinery that makes the
QA gate *execute* a prose skill rather than read it. Its `--json` report scales with the number of
snippets in the skill under test. If that report crosses 64KB the QA gate receives truncated JSON —
so the gate built to stop unverified work would itself fail on a parse error, on the largest skills,
which are exactly the ones most worth checking.

### Why it surfaced now

Nothing changed in the code. `--lint` output grows with the roadmap and task registry, and it crossed
64KB as Phase 5 filled up. Verified pre-existing by stashing all local changes and re-running: the
test fails identically on a clean tree (position 65264 without local edits, 65266 with — the two-byte
delta is the registry row, confirming the linter reads the real registry).

### Candidate fix, verified

Replacing the two `select-next.mjs` exits with `process.exitCode = …` (and an early `return` on the
lint path) gives:

- Pipe capture: **68,006 bytes, parses clean, `errors: 0`**
- `node --test evals/develop-next/unit/select-next.test.mjs` → **123 pass / 0 fail** (was 122/1)

**Mutation proof**: restoring the original `process.exit(...)` returns the suite to **122 pass /
1 fail**. The test genuinely holds the fix rather than passing vacuously.

Both exit codes are preserved — `--lint` must still exit 1 on a broken roadmap, and the test that
asserts it passes under the fix.

---

## Scope & Impact

**Reference**: `skills/develop-next/scripts/select-next.mjs`,
`shared/resources/qa-execute-snippets.mjs`, `shared/resources/generate-prd-epic-index.mjs`.

**Why it has no single owner**: the defect is one Node idiom repeated across three unrelated CLIs
owned by different skills. No story or task introduced it; fixing one instance leaves the pattern
free to reappear. That is what makes it a general bug rather than a task-scoped one.

**How It Failed**: `process.exit()` does not flush pending asynchronous writes. Node makes
`process.stdout` synchronous for files and TTYs but **asynchronous for pipes**. Every one of these
CLIs is designed to be piped — that is how the orchestrators and the QA gate consume them — so the
one caller shape that matters is the one shape that truncates.

**Suggested fix** (for the developer — not prescriptive):

1. **Replace `process.exit(code)` with `process.exitCode = code`** at every site that follows a
   write, letting the event loop drain naturally. One line each; verified above for instances 1–2.
2. **Add a regression guard for the general pattern**, not just for the 64KB case that happens to be
   live: a test that spawns each CLI with a piped stdout, forces an over-buffer payload, and asserts
   the captured output parses. Without it, instance 3 stays a time bomb.
3. **Consider a lint rule or a shared `exitWith(code)` helper** so a fourth instance cannot be added
   silently. Prefer this over fixing three sites and trusting memory.
4. Do **not** "fix" this by shrinking `--lint` output. The output size is legitimate; the flush is
   the bug.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-01

**Reproduction**: Reproduced directly, before any edit, by spawning the CLI with a piped stdout:

```
node -e 'execFileSync(node, ["skills/develop-next/scripts/select-next.mjs","--lint",
  "--roadmap","evals/develop-next/unit/fixtures/10-real-world.md"])'
→ PIPE bytes: 65268
→ PARSE FAIL: Unterminated string in JSON at position 65268
```

The same command redirected to a file emits the complete document. That asymmetry is the defect.

**Root Cause Analysis**: Node makes `process.stdout` synchronous for files and TTYs but
**asynchronous for pipes**. `process.exit()` terminates the process without flushing a pending
asynchronous write, so any `write(...); process.exit(code)` pair truncates at the ~64KB pipe buffer
— and only for callers that pipe, which is every orchestrator and the QA gate.

**Scope correction**: the report's Evidence table named 4 sites; a full scan found **10** across the
three files (review-bug applied the correction). A wider scan of the repo then found the same idiom
in **15 further files** — see Lessons Learned.

**Proposed Fix**: replace every `process.exit(code)` that follows a write with
`process.exitCode = code` plus normal control flow, so the event loop drains the buffer; then add a
structural guard so a new instance cannot be introduced silently.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-01

**Root Cause**: `process.exit()` does not flush asynchronous (piped) stdio.

**Fix Description**:

- All **10** exit-after-write sites in the three named CLIs now set `process.exitCode` and return.
  Every exit code is preserved — verified explicitly, since `--lint` exiting 1 on a broken roadmap is
  a contract `/develop-next` depends on.
- `generate-prd-epic-index.mjs` had its imperative body wrapped in `main()`. Top-level `return` is
  illegal in an ES module, so the wrapper is what makes the correct idiom expressible there at all;
  it also brings the file into line with its two siblings, which already had `main()`.
- A new suite, `shared/resources/tests/stdout-drain-on-exit.test.mjs`, guards the fix in four layers:
  the mechanism (synthetic proof that exit truncates and exitCode drains on *this* Node), the live
  >64KB `--lint` case, pipe-vs-file byte equivalence, and a **structural guard** that scans every
  shipped CLI for the idiom.

**Files Modified**:

- `skills/develop-next/scripts/select-next.mjs` — 4 sites; `parseArgs` now returns `null` on a bad
  argument and `main()` returns early rather than the process exiting mid-parse.
- `shared/resources/qa-execute-snippets.mjs` — 3 sites collapsed into one `else if` chain with a
  single `process.exitCode` assignment.
- `shared/resources/generate-prd-epic-index.mjs` — 3 sites; body wrapped in `main()`.
- 7 bundled copies under `skills/*/references/` regenerated via `npm run bundle`.
- `shared/resources/tests/stdout-drain-on-exit.test.mjs` — **new**, 10 tests. Lands in the existing
  `shared/resources/tests/*.test.mjs` glob, so no `package.json` change was needed and the suite
  cannot be orphaned.

**Testing**:

- `npm test` — the gate the bug blocked — is green again; `select-next.test.mjs` passes.
- **Mutation-proven three times.** Reverting the `--lint` site turns 3 tests red (the live case and
  both guards). Reverting the `qa-execute-snippets` site and the `generate-prd-epic-index` site each
  turn the guards red. Restoring all three returns 10/10.
- The first version of the structural guard **passed under mutation A** — it walked back six *lines*,
  and the write it needed to see is a ~20-line `JSON.stringify`, so it never reached it. The guard was
  rewritten to scan by character offset. A guard that passes on the defect it was written to catch is
  worse than no guard, and only the mutation step exposed it.

**Verification Steps for QA**:

1. `node --test shared/resources/tests/stdout-drain-on-exit.test.mjs` → 10/10 pass.
2. Pipe the manifesting command and confirm it parses:
   `node -e '...execFileSync(select-next.mjs --lint --roadmap evals/.../10-real-world.md)'` →
   ~68KB, `JSON.parse` succeeds.
3. Confirm exit codes: clean roadmap → 0, unreadable roadmap → 1 (with halt JSON), bad argument → 1.
4. Re-mutate any one site back to `process.exit()` and confirm the guard goes red.

#### QA Verification (✅ Fixed)

**Date**: 2026-09-01
**Verified by**: develop-bug Steps 5–6, verify cycle 1 (PASS on first cycle)

**Bug scenario re-tested**: `select-next.mjs --lint` piped now emits **68,812 bytes** and `JSON.parse`
succeeds; pre-fix it emitted 65,268 and threw. The reported failure no longer occurs.

**Signals**:

| Signal | Result |
| ------ | ------ |
| Regression test (`stdout-drain-on-exit.test.mjs`) | 10 / 10 pass |
| `generate-prd-epic-index.test.mjs` | 12 / 12 pass |
| `qa-execute-snippets.test.mjs` | 66 / 66 pass |
| shared/resources + develop-next node suites | 998 / 998 pass |
| skills node suites | 641 / 641 pass |
| evals node suites | 445 pass, 1 pre-existing skip, 0 fail |
| 9 shell suites (incl. `tracker-access` 401) | all pass |
| `prettier --check .` | clean repo-wide |
| Diff code review | no blocking correctness findings |

**Regressions**: none. Control-flow equivalence was checked directly rather than inferred —
`parseArgs` has exactly one caller and it handles the new `null` return;
`generate-prd-epic-index.mjs` is never imported as a module, so wrapping its body in `main()` changes
nothing at import time; and its three exit paths were exercised by hand and return 0, 2 and 1 as
before. The `else if` chain in `qa-execute-snippets.mjs` writes on exactly one branch and sets
`exitCode` on all three.

**Non-blocking observation**: the drain-equivalence layer is deterministic in the green state but
racy as a *mutation* detector — it caught mutation A on one run and not another, because how much of
an over-buffer write survives `process.exit()` depends on scheduling. It is therefore documented in
the suite as characterisation rather than regression; the structural guard is what actually holds the
two CLIs whose output is too small to truncate today.

---

## Status History

| Date       | Status | Changed By  | Notes                                                                 |
| ---------- | ------ | ----------- | --------------------------------------------------------------------- |
| 2026-09-01 | New    | QA Engineer | Found while filing task.77. Root cause identified; candidate fix verified and mutation-proven; two further latent instances located. Pre-existing — confirmed by stash. |
| 2026-09-01 | New    | review-bug  | Fix-readiness 10/10 — READY TO FIX. Reproduced independently (pipe 65,268 B, `JSON.parse` throws). No duplicate; not stale. Evidence table corrected: **10** exit-after-write sites, not 4. Severity/priority unchanged. |
| 2026-09-01 | In Progress | develop-bug | Reproduced through a pipe; root cause confirmed as `process.exit()` not flushing async stdio. Investigation opened. |
| 2026-09-01 | Ready for QA | develop-bug | 10 sites fixed across 3 CLIs + 7 bundled copies; new 10-test guard suite; mutation-proven 3×. Full `npm test` chain green (2,085 node tests, 9 shell suites, 0 failures). |

---

## Resolution Summary

_Pending._
