---
type: review-report
status: complete
bug: 'bug.7.zero-blocks-executed-fires-on-correct-refusal'
mode: 'general'
reviewed: '2026-09-06'
description: 'Fix-readiness review of bug.7 (validate-and-apply mode, invoked by develop-bug Step 2)'
---

# Bug Review — bug.7.zero-blocks-executed-fires-on-correct-refusal

## Executive Summary

| | |
|---|---|
| **Fix-readiness** | **10/10** |
| **Recommendation** | ✅ **READY TO FIX** |
| **Mode** | general (cross-cutting) |
| **Issues** | Critical 4 · Important 3 · Optional 1 — all applied |
| **Duplicate** | none |
| **Reproduces** | likely (verified in-line) |

## Pre-pass Results

**Duplicate scan.** `docs/bugs/bug-registry.md` rows 1–12 and every sibling bug file were checked.
Bugs 4, 6 and 10 also live in the snippet engine but are distinct defects (symlinked-path no-op;
classifier fail-open routes; `sed -w` glued filename) — their mentions of `zero-blocks-executed` are
incidental, quoting the finding in their own output. Bug 8 references bug.7 only as a status-lifecycle
example. **Verdict: `duplicate: none`.**

**Already-fixed / stale scan.** `grep -n "zero-blocks-executed\|no-executable-blocks"
shared/resources/qa-execute-snippets.mjs` returns one hit at line 1307 and **no** `no-executable-blocks`
symbol — the split-signal fix has not been implemented. The reproduction command was executed against
current `develop`:

```
blocks 6, counts {runnable:0, placeholder:0, mutating:6},
findings[0].kind == "zero-blocks-executed", detail with no --bind hint
```

Exactly the behaviour the report describes. **Verdict: `reproduces: likely`.**

> Both pre-pass axes were checked **in-line** rather than via Explore subagents. The two checks are two
> greps and one command over a single known file, and this session's memory records Explore subagents
> hanging repeatedly on this repo. The evidence for each verdict is quoted above so the shortcut is
> auditable.

## Findings by Dimension

### Completeness / Template Compliance — was 5/10, now 10/10

| Sev | Finding | Action |
|-----|---------|--------|
| Critical | No `## Developer Fix Cycle` section | ✅ Fixed — stub added |
| Critical | No `## Status History` section | ✅ Fixed — table added, seeded with the filing row |
| Critical | No `## Resolution Summary` section | ✅ Fixed — stub added |
| Critical | No explicit **Expected Behavior** / **Actual Behavior** — both were implicit in the Summary table and Suggested Fix | ✅ Fixed — derived from the report's own case-A/case-B table and the `counts.placeholder > 0` condition; nothing invented |
| Important | No template header block (Bug ID / Related / Status / Priority / Severity / Created) | ✅ Fixed |
| Important | General-mode heading `## Scope & Impact` absent (`## Why it matters` carried the impact argument) | ✅ Fixed — impact moved to `**Impact**` under Bug Description; `## Scope & Impact` added with Reference + How It Failed |
| Important | `related:` missing from frontmatter | ✅ Fixed — `none — cross-cutting (no single owner)` |
| Optional | Bug carried a `## Change Log`, which the canonical spec excludes for bug reports | ✅ Fixed — the single row migrated into `## Status History`; Change Log removed |

### Reproducibility — 10/10

Numbered, self-contained, single-command reproduction; expected output now quoted verbatim from a real
run. Environment stated. Frequency `Always`, Reproducible `Yes`. Evidence includes the ten-skill survey
that establishes the scale (6/10 trip permanently) and the spot-check of `finalise`'s 17 refusals that
establishes each is correct.

One drift noted and left uncorrected as harmless: the original report cited engine lines `:865`,
`:864-872`, `:879-881`. Those are now `:1307` and the surrounding block — the engine grew via the bug.6
and bug.10 fixes. The rewritten report cites the guard by its condition rather than by line number, so
it cannot go stale again.

### Classification — 10/10

`severity: Minor` / `priority: Medium` are correct and unchanged. The report argues its own severity
well: the guard is `confidence: medium` deliberately, so it never gates a build — the damage is to
reviewer attention, not to correctness. Neither field was touched.

### Linkage — 10/10

General bug. `docs/bugs/bug-registry.md` row 7 exists, links the correct path, and carries
`status: new`, consistent with frontmatter. No parent story/task to back-link.

## Next Steps

Proceed to `develop-bug` Step 3. The fix is the one the report already specifies: discriminate on
`counts.placeholder`, keep `zero-blocks-executed` as a finding when the run was under-configured, and
emit an informational `no-executable-blocks` record when every block was correctly refused as mutating.
A regression test must fail without the fix on both branches of that discrimination.
