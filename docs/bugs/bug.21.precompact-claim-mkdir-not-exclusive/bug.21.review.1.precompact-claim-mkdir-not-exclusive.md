---
type: review
status: accepted
bug: 'bug.21'
description: 'review-bug validate-and-apply report for bug 21'
---

# Bug Review — bug.21 (general)

**Reviewed:** 2026-11-11
**reviewed_blob:** e59b865554ed03ace5f06466488434e864a49cdf
**Mode:** validate-and-apply (`develop-bug` Step 2)

## Executive Summary

**Fix-readiness: 9/10 — ✅ READY TO FIX.** Critical 0 · Important 0 · Optional 2. No edits were needed, so none were applied.

| Dimension | Score | Note |
|---|---|---|
| Completeness | 9 | all required sections, `type: bug` frontmatter, mode-correct `Scope & Impact` |
| Reproducibility | 9 | 12-run counts on the affected kernel, a primitive-race table, CI run ids; the suggested fix is marked as not decided |
| Classification | 9 | Major / High matches a red CI check on every PR head |
| Linkage | 9 | general bug; registry row 21 present and `new` |

## Pre-pass (run in-line, not by subagents)

- **Duplicate: none.** The registry has one PreCompact claim entry besides this one, bug 14 (bare `gh issue comment` in the same hook), which is a different defect.
- **Reproduces: likely.** `shared/resources/develop-pipeline-on-precompact.sh:177` still reads `mkdir "$CLAIM_DIR" 2>/dev/null || return 1`; `git log` shows the hook last changed in `840b85f4`, before the report. The stale-steal path (lines 181 to 208) renames the claim directory and is subject to the same exclusivity question.
- Independent review by Explore subagents did **not** run; both scans were done in-line against the cited lines.

## Findings

**Optional**

1. The reproduction needs the LAN server kernel. Step 3 must say how the regression test proves red on a kernel where `mkdir` is exclusive (the report already suggests a stand-in that returns success twice).
2. The `Assigned To` and `QA Engineer` fields are placeholders. Harmless.

## Next Steps

Proceed to Step 2b (open the tracker issue), then Step 3. Design notes for Step 3: claim with an exclusive file create (`set -o noclobber`) or `ln`; both measured exclusive on the affected kernel. Keep the pid record and the stale-claim steal, and make the steal exclusive too.
