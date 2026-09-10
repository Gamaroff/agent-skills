---
name: day-3-messy-path
description: Day 3 of the agent-skills first-week onboarding — deliberately reproduce a QA-gate failure and recover from it so the messy path stops being scary.
type: guide
status: draft
version: 0.1.0
created: 2026-05-13
---

# Day 3 — Messy path

**Status:** Draft

> By the end of today you will have produced a `qa-gate: FAIL` artifact and recovered to PASS on your own story. The messy path will stop being a surprise.

## Prerequisites

- [ ] Completed [Day 2](./day-2-stories.md)
- [ ] You have a working repo with at least 1 merged story PR from Day 2

---

## Why this day?

Most of `/develop-story`'s value is in the iteration loop. If your first 5 stories all PASS first time, you don't learn the recovery shape — and the first surprise FAIL feels catastrophic. Day 3 surfaces it in a low-stakes setting.

---

## Reference: a real messy-path example

> ⚠️ **Descoped notice:** Story 2.3 (capture a real messy-path artifact) was cancelled before completion. The `examples/story-messy-path/` directory does not exist in this repo. The recipe below is standalone — you do not need that example to complete today's exercise.

---

## Hour 1 — Set up a controlled FAIL (~30 min)

**What you're building:** A tiny story with a deliberately-tight line-count AC that your first implementation pass will miss.

**Story:** "Add a short 'About this repo' section to `docs/concepts/overview.md`. AC: section body ≤ 50 lines (verified by `wc -l`)."

**Why line count?** `qa-gate` checks ACs mechanically. Line count is verifiable with a single shell command (`wc -l`), so the FAIL is deterministic — you control it.

**Steps:**

- [ ] `/create-story` using the AC above
- [ ] Open the story file and deliberately write **100 lines** of content for the first draft (padding with comments, blank lines, or verbose prose — it does not matter)
- [ ] `/develop-story` — let the pipeline run through to `qa-gate`
- [ ] Observe the FAIL gate artifact in your story directory

**Expected artifact:** `story.{epic}.{story}.gate.1.*.yml` with `decision: FAIL` (or `CONCERNS` flagging line-count overage)

---

## Hour 2 — Recover (~30 min)

- [ ] Read the FAIL findings in the gate file
- [ ] Trim the section to ≤ 50 lines
- [ ] Re-run `qa-gate` (or let the `/develop-story` `qa-fix` loop handle it automatically)
- [ ] Observe the PASS gate artifact

**Expected artifact:** `story.{epic}.{story}.gate.2.*.yml` with `decision: PASS`

---

## End of day — Verify

Run these checks before calling Day 3 done:

- [ ] You have at least one gate file with `FAIL` (or `CONCERNS`) status
- [ ] You have at least one gate file with `PASS` status from the same story
- [ ] The revision diff is visible in your branch's commit log (`git log --oneline`)

---

## What you learned

- `qa-gate` is mechanical — it checks ACs literally, including line counts via `wc -l`
- `qa-fix` loops up to 5 iterations; usually 1 is enough. A clean gate then hands to `review-pr` (Step 5c), which can send the run back into `qa-fix` on the same budget
- The messy path is just normal engineering: read the failure, change the code, re-run
- A FAIL gate is not a sign something is broken — it is the pipeline doing its job

---

## Next: [Day 4 — Parallel + change-mgmt](./day-4-parallel.md)
