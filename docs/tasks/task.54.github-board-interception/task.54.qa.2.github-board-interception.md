# QA Report: Task 54 — Re-review after cycle-1 fixes

**Task**: [task.54.github-board-interception.md](./task.54.github-board-interception.md)
**Gate File**: [task.54.gate.2.github-board-interception.yml](./task.54.gate.2.github-board-interception.yml)
**Previous Gate**: [task.54.gate.1.github-board-interception.yml](./task.54.gate.1.github-board-interception.yml) (FAIL, 70/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-19
**PR**: [#255](https://github.com/Gamaroff/agent-skills/pull/255) (OPEN → `develop`)
**Gate Status**: PASS

---

## Re-Review Context

| Gate-1 issue | Severity | Status | Verified how |
| ------------ | -------- | ------ | ------------ |
| **TASK-54-BUG-1** — `defer-mutation.js` not bundled beside the three shell files | HIGH | **FIXED** | Re-ran the bug report's own reproduction steps; re-executed the full-mode regression against three separate bundled skills |
| **TASK-54-BUG-2** — `--print-plan` skips moment validation under `--probe-board`/`--check` | MEDIUM | **FIXED** | Re-ran all three bypass flags plus the casing case |

**Everything was verified by re-execution, not by reading the diff.** A diff shows what the developer
intended; running the bug report's own steps shows what a consumer gets. Both bug reports listed
explicit verification steps, and those steps are what was run.

**Scope**: files changed since gate 1 — `gh-stage.js`, `resolve-platform.sh`, the two board helpers,
two test files, and the co-located QA artifacts. Plus a full regression run, because BUG-1 changed
what 125 bundled files contain.

---

## Verification of TASK-54-BUG-1 (HIGH)

### 1. Co-location restored

| Check | Gate 1 | Now |
| ----- | ------ | --- |
| Bundled `resolve-platform.sh` with the writer beside it | 18 / 35 | **35 / 35** |
| Bundled board helpers with the writer beside them | 0 / 11 | **11 / 11** |

### 2. The `full`-mode regression is gone

This was the serious half — board Priority/Estimate writes silently stopping in the default,
unrestricted configuration. Re-tested against **three independent bundled skills** rather than one,
because a single sample would not distinguish "fixed" from "that one happened to work":

```
sync-github-task:          ⚠️ GraphQL fetch failed for #232 — skipped   ← reached the write
review-task:               ⚠️ GraphQL fetch failed for #232 — skipped   ← reached the write
ensure-story-github-issue: ⚠️ GraphQL fetch failed for #232 — skipped   ← reached the write
```

All three now reach the graphql call, matching the in-tree copy. (The "fetch failed" is the stubbed
`gh` returning nothing — which is the point: execution got that far.)

### 3. The audit gap is closed

From a bundled skill under `manual`, with a `gh` stub that exits 99 on any write verb:

```
⏸️  access.tracker=manual — not setting Priority on issue #232; recorded as d4f4fc54.
    recorded: {"kind":"github.board.field-set","desired":{"Priority":"P1"}}
    write verbs issued: 0
```

Refuses **and** records, from an installed skill. That is the property gate 1 found missing.

### 4. The fix is the right shape

Verified by diffing the fix commit rather than taking the claim on trust:

- `set-github-project-{priority,estimate}.sh`, `resolve-platform.sh` — **comments only**, zero
  executable lines changed.
- That is correct for a packaging defect. The runtime logic was never wrong; only its dependency
  *declaration* was. A fix that had changed logic here would have been treating the symptom.

### 5. The deliberate non-change is sound

The cycle-1 fix **declined** the gate-1 future item of making the missing-writer branch fail *open*
under `full`, and said why in the bug report. Confirmed still fail-closed, and confirmed the right
call: weakening a fail-closed access gate to compensate for a packaging bug would trade a real
security property for a hypothetical convenience, and the co-location test now makes that bug
unreachable. Recording the rejection in the bug report — rather than silently not doing it — is what
let this be reviewed rather than assumed.

---

## Verification of TASK-54-BUG-2 (MEDIUM)

The bug report's own three steps, re-run:

| Step | Expected | Actual |
| ---- | -------- | ------ |
| `--check --stage nonsense --print-plan` | exit 2, "unknown moment" | ✅ exit 2 |
| `--probe-board --stage DONE --print-plan` | `"stage": "done"` | ✅ `done` |
| `--probe-board` without `--print-plan` | still probes | ✅ probes (with `--issue`, its documented form) |

All three bypass flags (`--probe-board`, `--check`, `--init-workflow`) now validate. The fix is 7
executable lines and does not touch the probe path's own argument contract.

**One clarification on step 3.** `--probe-board` alone exits 2 with
`--probe-board needs --issue <N>`. That guard is **pre-existing** — confirmed present at the merge
base (`origin/develop:gh-stage.js:1397`) and absent from this task's diff. The documented form
`--probe-board --issue N` exits 0 and probes correctly. An earlier expectation of exit 0 for the bare
form was wrong about the contract, not a finding against the code.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `npm test` — JS | **1448 passed, 0 failed** (was 1441; +7 from the BUG-2 tests) |
| `npm test` — shell suites | 401 / 6 / 6 / 3, all 0 failed |
| `npm run validate:all` | 115 passed, 0 failed |
| `npx prettier --check .` | clean |
| `npm run bundle` | **0 warnings** (was ~30 after the first fix — see below) |
| Co-location invariant | 0 missing across 35 skills |

### The self-inflicted warning, and its fix

The cycle-1 fix explained the bundler's discovery rule by *quoting the pattern it matches* —
`shared/resources/<file>` — inside the very files the bundler scans. The matcher duly tried to
resolve a file named `<file>`, and every `npm run bundle` printed ~30 unactionable warnings.

Caught by the **pre-commit hook**, not by review, and fixed in a follow-up commit. Harmless to the
bundle, which was correct throughout — but on a task whose entire subject is warnings that overstate
or understate what happened, a warning nobody can act on is exactly the wrong thing to ship. Verified
gone, and verified that the rephrase did not undo the fix it explains (the co-location test still
passes, which is the assertion that would catch it).

---

## Code Review

Diff scoped to the fix commits (`1555b01`, `760c189`).

**Correctness bugs (0).**

**LOW severity observations (1)** — documented here, no bug file, no gate impact:

- `shared/resources/gh-stage.js` — `--probe-board --print-plan` with **no** `--stage` reports
  `Error: unknown moment ""` where the non-probe path reports the clearer
  `Error: --stage is required`. Both exit 2, so the behaviour is correct and the guard works; only
  the message is less helpful on one of two paths that reach the same conclusion. Carried to the
  gate's `future` list.

**Cleanups (0 new).** The two noted in gate 1 remain advisory and were not required for this gate.

---

## Success Criteria — the one that failed in gate 1

| Criterion | Gate 1 | Now |
| --------- | ------ | --- |
| **`full` mode byte-identical; existing suite green unchanged** | **FAIL** | **PASS** — verified across three bundled skills; suite green at 1448/0 |

All other criteria were PASS in gate 1 and are unaffected by a comments-only fix plus 7 lines of
argument validation. Re-confirmed by the full regression run rather than assumed.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

**Rationale**: Both findings are fixed, and fixed in the right shape — the packaging defect got a
packaging fix (comments plus a test), not a logic change papering over it. The cycle also declined a
suggestion it judged wrong and recorded why, which is better than silently complying; and it caught
and fixed a defect its own fix introduced.

The 5 points withheld are for the LOW message-quality item and for the durable gap that remains
unaddressed by design: the bundler still has no rule for a shell script invoking a sibling `.js`, so
the convention is held by a comment and a test rather than by the tool. That is a reasonable place to
stop for this task — the test makes the failure impossible to reintroduce silently — but it is a
convention, not a mechanism, and the gate should say so.

---

**Next Steps**: `/finalise` — verify the Definition of Done and mark the task accepted.
