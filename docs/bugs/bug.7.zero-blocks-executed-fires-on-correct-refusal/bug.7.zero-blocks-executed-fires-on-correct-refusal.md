---
id: bug.7
title: "`zero-blocks-executed` fires on skills whose every documented command is correctly refused"
type: bug
description: "The Step 4b anti-vacuity guard reports a finding whenever no block ran, conflating an under-configured run (fixable with --bind/--copy) with a skill whose documented commands are all genuinely mutating and can never execute. Six of ten skills surveyed trip it permanently, and for two of them the finding carries no remediation at all."
tags: [qa, qa-task, snippet-engine, false-positive, anti-vacuity]
status: ready-for-qa
severity: Minor
priority: Medium
related: 'none — cross-cutting (no single owner)'
created: 2026-09-02
updated: 2026-09-06
found_by: task.73 pipeline run (QA Step 4b, incidental)
component: shared/resources/qa-execute-snippets.mjs
---

**Bug ID**: bug.7
**Related**: None — cross-cutting (no single owner)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Minor
**Created**: 2026-09-02
**Assigned To**: develop-bug pipeline
**QA Engineer**: —

---

## Bug Description

**Summary**: `qa-execute-snippets.mjs` raises a `zero-blocks-executed` finding whenever a file has bash
blocks and none classified `runnable`. That single condition covers two different situations:

| | Why nothing ran | Actionable? |
|---|---|---|
| **A** | Blocks are `placeholder` — the run did not supply the values they read | ✅ Yes — `--bind` / `--copy` fixes it |
| **B** | Blocks are `mutating` — every documented command is correctly refused by design | ❌ No — nothing can ever make them run |

Case **B** is permanent and correct, and it describes most of the orchestration library: those skills
document `gh`, `curl`, `rm`, and write redirections because that is what they *do*. `gh` and `curl` are
excluded from the allow-list deliberately — "a QA gate should not make network calls" — so no
configuration will ever move those blocks into `runnable`.

**Expected Behavior**: The engine reports the two states as two different things. An under-configured
run (`placeholder > 0`) is a **finding** with an actionable remediation hint. A file whose every block
is correctly refused as `mutating` is an **informational record** — still emitted, so the step is never
silently a no-op, but not a finding, because there is nothing anyone can do about it.

**Actual Behavior**: Both states emit the same `zero-blocks-executed` finding. The remediation hint
(*"supply the missing values with `--bind`"*) is appended only when `counts.placeholder > 0`, so the
case-**B** files receive a bare finding with no stated way to resolve it — because there isn't one.

**Impact**: A noise problem, not a correctness one — the guard is `confidence: medium` by deliberate
choice, so it never gates a build. The cost is to the guard's credibility: it exists to catch a step
that reports success without having run anything, and a finding that appears on most of the pipeline
library every time, with no available fix, is one reviewers learn to scroll past. The repository already
makes this argument in its own words — *"an ignored check is a check that does not exist"*.

---

## Reproduction Steps

**Environment**: macOS (darwin), Node v26.x, repo root `agent-skills` @ `develop`; engine
`shared/resources/qa-execute-snippets.mjs`.

**Steps to Reproduce**:

1. From the repo root, run the engine against a skill whose documented commands are all mutating:

   ```bash
   node shared/resources/qa-execute-snippets.mjs --file skills/commit-changes/SKILL.md --json
   ```

2. Read the `counts` and `findings` keys of the emitted JSON.
3. Observe `counts` is `{runnable: 0, placeholder: 0, mutating: 6}` and `findings[0].kind` is
   `zero-blocks-executed` — a finding on a file where every block was correctly refused, with a
   `detail` string carrying no remediation.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Screenshots/Videos/Test Output**: verified 2026-09-06 on `develop`; the reproduction command emits:

```json
{
  "blocks": 6,
  "counts": { "runnable": 0, "placeholder": 0, "mutating": 6 },
  "findings": [
    {
      "kind": "zero-blocks-executed",
      "confidence": "medium",
      "detail": "6 bash block(s) found, none classified runnable (0 placeholder, 6 mutating)"
    }
  ]
}
```

Note the `detail` string ends after the counts — no `--bind` hint, because `counts.placeholder === 0`.

**Survey** — ten `SKILL.md` files run through the shipped engine. **Six trip the guard:**

| Skill | Blocks | runnable / placeholder / mutating | Trips? |
|---|---|---|---|
| `qa-task` | 15 | 0 / 4 / 11 | ⚠️ yes |
| `develop-next` | 8 | 0 / 0 / 8 | ⚠️ yes — **no placeholders** |
| `finalise` | 18 | 0 / 1 / 17 | ⚠️ yes |
| `commit-changes` | 6 | 0 / 0 / 6 | ⚠️ yes — **no placeholders** |
| `tracker-reconcile` | 1 | 0 / 0 / 1 | ⚠️ yes — **no placeholders** |
| `qa-story` | 14 | 0 / 5 / 9 | ⚠️ yes |
| `create-branch` | 9 | 1 / 0 / 8 | no |
| `develop-task` | 6 | 1 / 1 / 4 | no |
| `create-pr` | 14 | 2 / 1 / 11 | no |
| `sync-jira-task` | 7 | 2 / 0 / 5 | no |

Spot-checking `finalise`'s 17 refusals: `gh pr comment`, `curl write method`, `rm -rf`,
write-redirection, `gh issue`, and several `unrecognised-command (fail-closed)`. Every one is a
correct refusal.

**Logs and Stack Traces**: none — the engine exits 0 and emits well-formed JSON. The defect is in what
that JSON says, not in a crash.

**Related Files**:

- `shared/resources/qa-execute-snippets.mjs` — the guard (`zero-blocks-executed` finding push)
- `shared/tests/qa-execute-snippets.test.mjs` — engine test suite
- `skills/qa-task/SKILL.md` — Step 4b, the consumer that reads these findings

---

## Scope & Impact

**Reference**: QA Step 4b snippet engine — `shared/resources/qa-execute-snippets.mjs`, consumed by
`qa-task`, `qa-story` and every pipeline that runs the snippet gate.

**How It Failed**: The affected area is the *reporting contract* of the snippet engine, not any single
story or task — every skill whose `SKILL.md` documents side-effecting commands is a victim, and no
single work item owns it. Six of the ten skills surveyed trip the guard permanently, which is why this
is filed as a cross-cutting general bug rather than against the skill that happened to surface it
(`task.73`).

---

## Root Cause

One signal standing for two states. The guard condition is `blocks.length > 0 && counts.runnable === 0`,
which cannot distinguish "under-configured" from "correctly refused".

> **The engine's own comment anticipates half of this.** It explains the `medium` confidence by
> reference to *"a skill whose snippets all read caller variables"* — case **A**. Case **B**, where
> the blocks are refused rather than unbound, is not considered, and it is the larger population.

**This is the same defect shape as `task.73`**, one layer over: there, `probes: []` stood for
not-a-boundary, probed-and-held, and probed-nothing at once, and the fix was to split the signal
(`boundary:` + `probes_executed:`) so each state could be reported as itself. The same remedy applies.

---

## Suggested Fix

Discriminate on `counts.placeholder`, and report the two states differently:

- **`counts.placeholder > 0`** → keep `zero-blocks-executed` as a finding. The run was
  under-configured and `--bind` / `--copy` is the fix. This is the case the guard was written for.
- **`counts.placeholder === 0 && counts.mutating === blocks.length`** → emit an informational
  `no-executable-blocks` record instead of a finding: *"N blocks, all correctly refused as mutating —
  this file documents side-effecting commands and Step 4b cannot execute it."* Still recorded, so the
  step is never silently a no-op; no longer a finding, so it does not accumulate as noise.

Keep both in the JSON. The distinction the reader needs is *"the gate was misconfigured"* versus
*"the gate has nothing to run here, correctly"* — and only the first is worth anyone's attention.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-06

**Reproduction**: `node shared/resources/qa-execute-snippets.mjs --file skills/commit-changes/SKILL.md
--json` on `develop`. Observed `counts {runnable:0, placeholder:0, mutating:6}` and
`findings[0].kind == "zero-blocks-executed"` with a `detail` string that stops after the counts — the
`--bind` hint is suppressed precisely because there is no placeholder to bind. Exit status `1`.

**Root Cause Analysis**: `shared/resources/qa-execute-snippets.mjs`, the anti-vacuity guard in
`executeFile()`. The condition `blocks.length > 0 && counts.runnable === 0` is one signal standing for
two states, and the branch pushes a `zero-blocks-executed` finding for both. Every block produces
exactly one `results` entry (verified: the per-block loop `continue`s into `results.push` on the
non-runnable path), so `runnable === 0 && placeholder === 0` implies `mutating === blocks.length` —
the two states are cleanly separable on `counts.placeholder` alone.

The report's line citations (`:865`, `:879-881`) had drifted to `:1307` and its surrounding block; the
engine grew through the bug.6 and bug.10 fixes. The guard is unchanged in substance since filing.

**Proposed Fix**: split the signal on `counts.placeholder` — keep the finding for the under-configured
case, emit an informational `no-executable-blocks` record for the correctly-refused case.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-06

**Root Cause**: one condition (`counts.runnable === 0`) reported two different states — an
under-configured run, which `--bind` / `--copy` fixes, and a file whose every documented command is
deny-listed by design, which nothing can fix — as the same finding.

**Fix Description**:

- `executeFile()` gained a `notes[]` array alongside `findings[]`: informational records the reader
  must be told but cannot act on. It is returned in the report and rendered as `INFO` lines.
- The guard now branches on `counts.placeholder`:
  - `placeholder > 0` → `zero-blocks-executed` finding, `confidence: medium`, **always** carrying the
    `--bind` remedy (the conditional suffix is gone — in this branch the remedy always applies).
  - `placeholder === 0` → `no-executable-blocks` note: *"N bash block(s), all correctly refused as
    mutating (0 placeholder) — this file documents side-effecting commands and the snippet step cannot
    execute it."*
- **The note carries a per-reason refusal breakdown with counts**, beyond what the report proposed. An
  `unrecognised-command (fail-closed)` refusal is not the same thing as a deny-listed one — the first
  may be an over-refusal the classifier should learn (bug.6, bug.10), and summarising both as
  "correctly refused" is how that would stop being visible. The `commit-changes` run that reproduces
  this bug turns out to be *entirely* fail-closed (`git add ×4`, `git restore ×1`, `bash ×1`), which
  the old bare finding never showed.
- The split reaches the **exit code**: a correctly-refused file now exits `0` rather than `1`, because
  `exitCode` is derived from `findings.length` and the note is not a finding. Splitting the JSON but
  leaving both at exit `1` would have left the noise untouched for every non-JSON caller.
- Nothing is suppressed. The second state is still recorded, still in the JSON, still printed — it is
  no longer a *finding*.

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs` — `notes[]` added to the report; guard split on
  `counts.placeholder`; `render()` prints `INFO` lines before the findings verdict
- `shared/resources/qa-runnable-prose-detection.md` — §4 rewritten around the two-state contract with
  a condition/kind/gate table; §5 requires `notes[]` in the report; §6 documents the exit-code
  consequence
- `skills/qa-task/SKILL.md` (Step 4b) and `skills/qa-story/SKILL.md` (Phase 1.7) — both blockquotes
  now state both halves, the discriminator, and why the refused case has no remedy
- `shared/resources/tests/qa-execute-snippets.test.mjs` — four regression tests (below)
- `evals/shared/tests/qa-execution-step-parity.test.mjs` — the rule-doc coverage assertion no longer
  pins the old single-signal heading; a new parity test requires **both** skills to state both halves
- `skills/{qa-task,qa-story,develop-task,develop-story,double-check}/references/` — regenerated by
  `npm run bundle` (5 engine copies, 5 rule-doc copies)

**Testing**:

- Four regression tests added, named for this bug:
  1. `bug.7: all-mutating with zero placeholders is information, not a finding`
  2. `bug.7: the informational record names each refusal reason and its count`
  3. `bug.7: a placeholder present keeps it a finding, with the --bind remedy`
  4. `bug.7: the split reaches the exit code — refused-only is clean, unbound is not`
- **Mutation-proven.** Reverting the discrimination to the pre-fix single branch
  (`if (counts.placeholder > 0)` → `if (true)`) turns 1, 2 and 4 red; restoring it returns 89/89.
  Test 3 stays green under both by design — it is the over-correction guard, so that "delete the
  guard" cannot pass in place of "split the guard".
- The parity/prose fix is separately mutation-proven: renaming `no-executable-blocks` back in
  `qa-task/SKILL.md` and restoring the old §4 heading turns 2 of the 11 parity tests red.
- Pre-existing suites unaffected: the existing `zero runnable blocks … is itself a finding` test uses
  a document with a placeholder, so it exercises the branch that kept its behaviour.

**Verification Steps for QA**:

1. `node shared/resources/qa-execute-snippets.mjs --file skills/commit-changes/SKILL.md --json` →
   `findings: []`, one `notes[]` record of kind `no-executable-blocks`, exit `0`.
2. Same command against a file with an unbound variable or `{slot}` → `zero-blocks-executed` still
   present, `detail` contains `--bind`, exit `1`.
3. `node --test shared/resources/tests/qa-execute-snippets.test.mjs` → 89/89.
4. `node --test evals/shared/tests/qa-execution-step-parity.test.mjs` → 11/11.
5. Confirm the 5 bundled engine copies and 5 rule-doc copies carry the change (`npm run bundle` is
   idempotent; re-running must produce no diff).

---

## Status History

| Date       | Status | Changed By   | Notes |
| ---------- | ------ | ------------ | ----- |
| 2026-09-02 | New    | develop-task | Bug filed — 6/10 skills surveyed trip the guard; root cause and split-signal fix proposed |
| 2026-09-06 | New    | review-bug   | Fix-readiness review: reproduction verified in-line; report restructured to the bug template (Expected/Actual, Scope & Impact, Developer Fix Cycle, Status History, Resolution Summary added); `related` frontmatter added; `## Change Log` migrated into this table per the bug-report exclusion. Severity/priority unchanged (Minor/Medium). |
| 2026-09-06 | In Progress | develop-bug | Reproduced on `develop`; root cause localised to the single-signal guard in `executeFile()` |
| 2026-09-06 | Ready for QA | develop-bug | Signal split on `counts.placeholder`; 4 regression tests added and mutation-proven; prose + parity eval updated; bundled copies regenerated |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: —
**Total Iterations**: —
**Time to Resolution**: —
**Final Fix Details**: —
**Lessons Learned**: —
