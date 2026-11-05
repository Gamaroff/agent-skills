---
type: review
status: complete
description: 'review-bug fix-readiness report for bug.20 — READY TO FIX'
---

# Bug Review — bug.20.change-log-blank-date-row-floats-to-top

**Reviewed:** 2026-11-05
**reviewed_blob:** 3ae78d97cd2f585e70cc44c8a5b65cf4898cb865
**Mode:** validate-and-apply (develop-bug Step 2), general bug

## Executive Summary

**Fix-readiness: 9/10 — ✅ READY TO FIX.** Critical 0 · Important 0 · Optional 1.

| Dimension       | Score |
| --------------- | ----- |
| Completeness    | 9     |
| Reproducibility | 10    |
| Classification  | 9     |
| Linkage         | 10    |

## Pre-pass (run in-line, read-only)

- **Duplicate:** none. Bugs 13 and 19 touch `change-log.js` / the registry parser but concern prose dropping and `no-row` reporting, not row order.
- **Already fixed / stale:** `reproduces: likely`. The reproduction command was run on `develop` (`8e22fd50`) and printed the blank-date row first. `change-log.js` line 98 `isUnparsedRow` and line 856 ("Unparsed rows lead") are the cause.
- **Reachability walk:** the Expected outcome (row stays in place, new row at the bottom) is reachable. The fix only has to stop `isUnparsedRow` claiming a blank-date continuation row. No stated contract rules it out.

## Findings

- Frontmatter complete (`type: bug`, status, severity Minor, priority Low, created, related, description).
- Registry row 20 exists and agrees with the file (`new`, Minor, Low).
- Reproduction is a self-contained command with printed output and a stated frequency.
- Optional: the report names the `| Version | Date | … |` layout as the first risk, but gives no example. The fix must keep that layout's unparsed rows in place.

## Next Steps

Proceed to Step 2b, then Step 3.
