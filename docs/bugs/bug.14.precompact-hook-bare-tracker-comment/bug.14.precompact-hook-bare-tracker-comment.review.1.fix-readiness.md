---
type: review-report
status: complete
bug: 'bug.14.precompact-hook-bare-tracker-comment'
mode: 'general'
review_mode: 'validate-and-apply'
score: 9
recommendation: 'READY TO FIX'
date: '2026-09-12'
---

# Review Report — bug.14.precompact-hook-bare-tracker-comment

**Mode**: validate-and-apply (invoked by `/develop-bug` Step 2, autonomous run via `/develop-next`)
**Date**: 2026-09-12
**Reviewer**: review-bug (Claude)

## Executive Summary

| | |
|---|---|
| **Fix-readiness** | **9/10 — ✅ READY TO FIX** |
| Critical | 0 |
| Important | 0 |
| Optional | 1 |
| Duplicate | none |
| Reproduces | likely |

Score breakdown: Completeness 9 · Reproducibility 9 · Classification 9 · Linkage 10.

## Pre-pass Results

Both scans were run in-line (two greps each) rather than as Explore subagents — the search surface is one shell file and one registry table, and Explore subagents have hung repeatedly in this repo on searches this small.

- **Duplicate scan** — `docs/bugs/bug-registry.md` and every `docs/bugs/*/bug.*.md` searched for `precompact`, `on-precompact`, `gh issue comment`, `gh pr comment`, `access gate`, `tracker-comment`. Only bug.14's own row (registry line 43) matches. **duplicate: none.**
- **Already-fixed / stale scan** — `shared/resources/develop-pipeline-on-precompact.sh` on branch tip `30865480`: the bare `gh pr comment` (line 133) and `gh issue comment` (line 140) are still present; `grep -c 'resolve-platform\|tracker_write\|ACCESS_'` → 0. `tests/mutation-call-site-coverage.test.js` header still reads "CANONICAL PROSE ONLY: `skills/*/SKILL.md` plus `shared/resources/*.md`". **reproduces: likely** — `found_at`: `shared/resources/develop-pipeline-on-precompact.sh:133,140`.

## Step 2 — Template & Frontmatter Compliance

All required body sections present: Bug Description (Summary / Expected / Actual / Impact), Reproduction Steps, Evidence, **Scope & Impact** (correct heading for a general bug), Recommendation, Developer Fix Cycle (stub), Status History, Resolution Summary (stub). Frontmatter carries `type: bug`, `status: new`, `severity: 'Major'`, `priority: 'High'`, `created`, `updated`, `related`, `description`, and (since Step 1) `github_issue: 391`. Filename stem ↔ directory stem ↔ body `Bug ID` agree. No findings.

## Step 3 — Reproducibility Clarity

- Reproduction steps are four numbered, concrete actions, plus a two-command static confirmation that needs no consumer repo. ✅
- Environment stated ("any consumer repo with a develop-* pipeline lock present and `gh` on PATH"). ✅
- Expected vs Actual both explicit, each citing the governing contract file. ✅
- Frequency: Always; Reproducible: Yes. ✅
- Evidence: measured command output at a named commit, with the test's line range for the scan set. ✅

No findings. The stale scan re-confirmed the evidence against the current tip.

## Step 4 — Severity / Priority Correctness

`Major` / `High` is consistent with the stated impact: an access-mode bypass (a consumer's declared `read-only` restriction is silently overridden) is a correctness defect in a security-adjacent control, but it does not block the pipeline or lose data, so `Blocker` / `Critical` would overstate it. No correction; no Status History row needed.

## Step 5 — Mode & Linkage Correctness

General bug: `docs/bugs/bug-registry.md` line 43 carries row 14 with `new` / Major / High, matching the frontmatter. `related` correctly reads "none — cross-cutting". GitHub issue #391 linked in frontmatter and body. No findings.

## Optional

1. The Recommendation section offers two mutually exclusive designs for item 2 (source `resolve-platform.sh` inside the hook vs. read `access.*` directly) and item 3 (widen the scan vs. add a second assertion). Not a readiness gap — Step 3 of develop-bug chooses — but the Fix Implementation record should state which branch was taken and why so the report reads as one decision rather than two options.

## Fixes Applied to the Bug Report

None — no Critical or Important findings.

## Next Steps

Proceed to `develop-bug` Step 3 (investigate & fix). Mutation-prove the widened guard per Recommendation item 5.
