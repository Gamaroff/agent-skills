---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Critical'
created: '2026-09-01'
updated: '2026-09-01'
related: 'none — cross-cutting (no single owner)'
description: 'Three shipped CLIs call process.exit() immediately after writing to stdout. When stdout is a pipe the write is asynchronous, so exit truncates the output at the ~64KB pipe buffer. select-next.mjs --lint has now crossed that threshold, so npm test is red — and npm test is the develop-next merge gate.'
---

**Bug ID**: bug.3.stdout-truncation-on-exit
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
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

_To be completed by `/develop-bug`._

---

## Status History

| Date       | Status | Changed By  | Notes                                                                 |
| ---------- | ------ | ----------- | --------------------------------------------------------------------- |
| 2026-09-01 | New    | QA Engineer | Found while filing task.77. Root cause identified; candidate fix verified and mutation-proven; two further latent instances located. Pre-existing — confirmed by stash. |

---

## Resolution Summary

_Pending._
