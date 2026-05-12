---
id: story.4.3.plan
title: "Implementation Plan: Day 3 — Messy path"
type: plan
story-ref: story.4.3.day-3-messy-path.md
---

# Implementation Plan: Day 3 — Messy path

> Requirements: [story.4.3.day-3-messy-path.md](story.4.3.day-3-messy-path.md)

## Overview

Day-doc with controlled-FAIL recipe. References Epic 2.3 worked example if landed, falls back to disclaimer if 2.3 descoped.

## Recipe for inducing a controlled FAIL

The user creates a story with a deliberately-tight AC that the first implementation pass will miss. Example: "Doc body ≤ 50 lines." First write 80 lines. `qa-gate` will FAIL on AC4. The fix is to trim. Re-run `qa-gate` → PASS.

This is a teaching device, not manufactured QA fraud — the AC is real, the FAIL is mechanical, the fix is concrete.

## Doc skeleton

```markdown
# Day 3 — Messy path

**Status:** Draft

> By the end of today you will have produced a `qa-gate: FAIL` artifact and recovered to PASS on your own story. The messy path will stop being a surprise.

## Prerequisites

- [ ] Completed [Day 2](./day-2-stories.md)
- [ ] You have a working repo with at least 1 merged story PR from Day 2

## Why this day?

Most of `develop-story`'s value is in the iteration loop. If your first 5 stories all PASS first time, you don't learn the recovery shape — and the first surprise FAIL feels catastrophic. Day 3 surfaces it in a low-stakes setting.

## Reference: a real messy-path example

[`examples/story-messy-path/`](../../../examples/story-messy-path/) captures a real story that failed and recovered during this repo's own dogfood run. Read it first — 5 min — to see the artifact shapes.

> _If `examples/story-messy-path/` does not yet exist, the worked example is still pending capture (Epic 2 Story 2.3). Proceed with the recipe below; it stands alone._

## Hour 1 — Set up a controlled FAIL (~30 min)

**Story:** "Add a one-paragraph 'About this repo' section to `docs/concepts/overview.md`. AC: paragraph ≤ 50 words."

- [ ] `/create-story` with this AC.
- [ ] Open the story and **deliberately write 100 words** on the first draft.
- [ ] `/develop-story` — let it run through to `qa-gate`.
- [ ] Observe the FAIL gate artifact.

## Hour 2 — Recover (~30 min)

- [ ] Read the FAIL findings.
- [ ] Trim the paragraph to ≤ 50 words.
- [ ] Re-run `qa-gate` (or let `qa-fix` chain handle it via `/develop-story`'s loop).
- [ ] Observe the PASS gate artifact.

## End of day — Verify

- [ ] You have at least one `*.gate.1.*.yml` with FAIL status.
- [ ] You have at least one `*.gate.2.*.yml` with PASS status.
- [ ] The revision diff is visible in your branch's commit log.

## What you learned

- `qa-gate` is mechanical — it checks ACs literally.
- `qa-fix` loops up to 5 iterations; usually 1 is enough.
- The messy path is just normal engineering: read the failure, change the code, re-run.

## Next: [Day 4 — Parallel + change-mgmt](./day-4-parallel.md)
```

≈ 60 lines. Well under 300.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 2.3 descoped — no worked example | Medium | Low | Disclaimer in "Reference" section; recipe stands alone |
| Controlled FAIL recipe fails to FAIL | Low | High (story can't complete) | Pick an AC type qa-gate verifies mechanically (line count, file existence) |
| User finds the deliberate-FAIL device condescending | Low | Low | Frame as "induced practice" not "trick" |
