---
id: task.312.plan
title: "Implementation Plan: Allow-list and timing criteria name what they need"
type: plan
task-ref: task.312.allow-list-and-timing-criteria-name-what-they-need.md
---

# Implementation Plan: Allow-list and timing criteria name what they need

> Requirements and success criteria: [task.312.allow-list-and-timing-criteria-name-what-they-need.md](task.312.allow-list-and-timing-criteria-name-what-they-need.md)

## Overview

Add `review-task` check 32 and extend the existing timing rule (obs #31) in `create-task` and `review-task` check 22.

## Phase-by-Phase Implementation Guide

### Phase 1: The allow-list check

**Files to modify:**
- `skills/review-task/SKILL.md` — new check after 31 (line 1280 onward): "32. **An allow-list replacing a deny-list covers the whole set** (obs #159)", plus its three companions as task 298 did for 31: a bullet in "Common Hallucination Patterns to Detect", the clause in Step 3's "Issues to Flag", and rule 16 in the Anti-Hallucination Protocol.
- `skills/review-story/SKILL.md` — a sibling note in its Step 4 (`### Step 4: Technical Accuracy and Anti-Hallucination Review`) list, not Step 3.
- `tests/review-allow-list-timing-checks.test.js` — new. Do not place it under `skills/review-task/tests/`: `test:suite` has no glob for it.

**Exact changes:**

Check 32 wording: when a plan replaces a deny-list with an allow-list, (a) the table lists every member of the set it gates, or states the count and the command that measured it; (b) for each member the plan leaves on "today's behaviour", run a write-by-operand probe, since a flag table cannot express a write through an operand. The measured example: `uniq in.txt out.txt` then `ls out.txt` shows the file created. Report an unaudited member as Important; never auto-fix, put it to the author.

### Phase 2: The timing statistic

**Files to modify:**
- `skills/create-task/SKILL.md:582` — extend the obs #31 bullet. `tests/create-task-authoring-evidence.test.js` reads this file: run it after the edit.
- `skills/review-task/SKILL.md` — the wall-clock note in Step 6 check 4 (lines 1483–1487; `grep -n "wall-clock runtime" skills/review-task/SKILL.md`). `tests/review-task-measured-criterion.test.js` pins that check: run it after the edit.

**Exact changes:** add to both: the criterion names where it is measured and how load is controlled, and on a shared host prefers a paired, interleaved ratio or CPU time (user + sys) over a ratio of medians. Task 306's ten runs: ratio of medians 1.22, paired-ratio median 1.07, CPU time 1.016.

## Key Patterns and References

- Check 13 (`review-task` line 990) is the shape to copy: a trigger, a probe, a named failure.
- The create-task/review-task parity test pattern for one rule stated in two skills.

## Testing Approach

Presence tests in `tests/review-allow-list-timing-checks.test.js`, in the style of `tests/review-run-and-parity-checks.test.js`: check 32's trigger, coverage rule, operand probe, `uniq in out` example and severity; a test that executes `uniq in out` in a temp directory and asserts the file appears; a parity test that reads both skills' timing sentence. Temp directories get a `t.after` removal.
