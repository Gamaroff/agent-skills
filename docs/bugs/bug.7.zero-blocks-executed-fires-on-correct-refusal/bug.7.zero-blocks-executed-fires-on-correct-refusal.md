---
id: bug.7
title: "`zero-blocks-executed` fires on skills whose every documented command is correctly refused"
type: bug
description: "The Step 4b anti-vacuity guard reports a finding whenever no block ran, conflating an under-configured run (fixable with --bind/--copy) with a skill whose documented commands are all genuinely mutating and can never execute. Six of ten skills surveyed trip it permanently, and for two of them the finding carries no remediation at all."
tags: [qa, qa-task, snippet-engine, false-positive, anti-vacuity]
status: open
severity: Minor
priority: Medium
created: 2026-09-02
updated: 2026-09-02
found_by: task.73 pipeline run (QA Step 4b, incidental)
component: shared/resources/qa-execute-snippets.mjs
---

# Bug Report: `zero-blocks-executed` fires on correct refusal

**Status:** Open
**Severity:** Minor
**Priority:** Medium

---

## Summary

`qa-execute-snippets.mjs` raises a `zero-blocks-executed` finding whenever a file has bash blocks and
none classified `runnable`. That single condition covers two different situations:

| | Why nothing ran | Actionable? |
|---|---|---|
| **A** | Blocks are `placeholder` — the run did not supply the values they read | ✅ Yes — `--bind` / `--copy` fixes it |
| **B** | Blocks are `mutating` — every documented command is correctly refused by design | ❌ No — nothing can ever make them run |

Case **B** is permanent and correct, and it describes most of the orchestration library: those skills
document `gh`, `curl`, `rm`, and write redirections because that is what they *do*. `gh` and `curl` are
excluded from the allow-list deliberately — "a QA gate should not make network calls" — so no
configuration will ever move those blocks into `runnable`.

## Evidence

Surveyed ten `SKILL.md` files with the shipped engine. **Six trip the guard:**

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

**The remediation hint is inapplicable in case B, and for three of the six it is not even printed.**
The detail string appends *"supply the missing values with `--bind`"* only when
`counts.placeholder > 0` (`qa-execute-snippets.mjs:879-881`). So `develop-next`, `commit-changes` and
`tracker-reconcile` receive a bare finding with no stated way to resolve it — because there isn't one.

## Reproduction

```bash
node shared/resources/qa-execute-snippets.mjs --file skills/commit-changes/SKILL.md --json
# => findings[0].kind == "zero-blocks-executed", counts {runnable:0, placeholder:0, mutating:6}
```

## Why it matters

This is a noise problem, not a correctness one — the guard is `confidence: medium` by deliberate
choice (`qa-execute-snippets.mjs:864-872`), so it never gates a build. The cost is to the guard's
credibility: it exists to catch a step that reports success without having run anything, and a
finding that appears on most of the pipeline library every time, with no available fix, is one
reviewers learn to scroll past. The repository already makes this argument in its own words — *"an
ignored check is a check that does not exist"*.

## Root cause

One signal standing for two states. The condition at `qa-execute-snippets.mjs:865` is
`blocks.length > 0 && counts.runnable === 0`, which cannot distinguish "under-configured" from
"correctly refused".

> **The engine's own comment anticipates half of this.** It explains the `medium` confidence by
> reference to *"a skill whose snippets all read caller variables"* — case **A**. Case **B**, where
> the blocks are refused rather than unbound, is not considered, and it is the larger population.

**This is the same defect shape as `task.73`**, one layer over: there, `probes: []` stood for
not-a-boundary, probed-and-held, and probed-nothing at once, and the fix was to split the signal
(`boundary:` + `probes_executed:`) so each state could be reported as itself. The same remedy applies.

## Suggested fix

Discriminate on `counts.placeholder`, and report the two states differently:

- **`counts.placeholder > 0`** → keep `zero-blocks-executed` as a finding. The run was
  under-configured and `--bind` / `--copy` is the fix. This is the case the guard was written for.
- **`counts.placeholder === 0 && counts.mutating === blocks.length`** → emit an informational
  `no-executable-blocks` record instead of a finding: *"N blocks, all correctly refused as mutating —
  this file documents side-effecting commands and Step 4b cannot execute it."* Still recorded, so the
  step is never silently a no-op; no longer a finding, so it does not accumulate as noise.

Keep both in the JSON. The distinction the reader needs is *"the gate was misconfigured"* versus
*"the gate has nothing to run here, correctly"* — and only the first is worth anyone's attention.

## Change Log

| Date       | Version | Description                                                                       | Author       |
| ---------- | ------- | --------------------------------------------------------------------------------- | ------------ |
| 2026-09-02 | 1.0     | Filed — 6/10 skills surveyed trip the guard; root cause and split-signal fix proposed | develop-task |
