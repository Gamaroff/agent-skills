# Bug Report: Task 116 - The loop document's §5c, shapes table and commit-point section disagree with its own Outcome-branching arms

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-5
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 reviewer, CR-3 / CR-4 / CR-5)
**Date Found**: 2026-09-13

## Description

The Outcome branching arms are now the router, and the preamble names §5c as the receiver that "states the set once". But inside the same file: (a) §5c route 1 still reads an unqualified "`PASS` or `WAIVED`" (:889) while the arms send a `PASS` with an open LOW and an inactive `WAIVED` with an open entry to 5b, and admit an inactive `WAIVED` with no open entry; (b) the "what the gate carries" shapes table says a `PASS` arrives "empty" rather than "no open entry"; (c) the commit-point section's path 1 reads "`PASS` / `WAIVED` → 5c" (:712, and :692), so on routes 2–3 the router demands a commit the commit-point section forbids; (d) arm 5's heading says "with an open entry" while its body also routes the inactive-`WAIVED`-**no**-open cell — a reader matching by heading falls to the malformed HALT.

## Expected Behavior

One file, one rule: §5c route 1, the shapes table, the commit-point paths and every arm heading describe the same set the arms route.

## Recommendation

Qualify §5c route 1 as the arms do; shapes table `PASS` row → "no open entry"; commit-point path 1 → "any gate that reaches 5c from 5a (§5c routes 1–3)" and :692 to match; retitle arm 5 "Any other gate — read by its queue" and update the parity test's arm prefix.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-13 (qa-fix, cycle 3)

**Fix Description**: §5c route 1 qualified as "a gate with **no open finding**" (PASS with no open entry; active WAIVED; inactive WAIVED with no open entry arrives as a PASS does); shapes-table `PASS` row → "no open entry — empty, or only `status: closed` entries"; commit-point path 1 → "any gate that reaches 5c from 5a — §5c routes 1–3" and the one-push sentence to match; arm 5 retitled "**Any other gate — read by its queue.**" so its heading covers both outcomes; the preamble names the mechanical record (`Action` row).

**Testing**: arm-5 prefix updated in the parity test; §5c route-1 qualification pinned (mutation → red). `pr-review-loop-parity` 29/29; `npm run ci:fast` 3269/3268/0.

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-13 | New          | QA         | Cycle 3 reviewer (CR-3/4/5) |
| 2026-09-13 | Ready for QA | qa-fix     | Cycle 3: fix |
