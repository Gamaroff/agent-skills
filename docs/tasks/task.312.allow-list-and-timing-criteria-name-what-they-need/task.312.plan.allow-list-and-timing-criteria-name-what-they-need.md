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
- `skills/review-task/SKILL.md` — new check after 31 (line 1269 onward): "32. **An allow-list replacing a deny-list covers the whole set** (obs #159)".
- `skills/review-story/SKILL.md` — a sibling note in the same Step 3 list.

**Exact changes:**

Check 32 wording: when a plan replaces a deny-list with an allow-list, (a) the table lists every member of the set it gates, or states the count and the command that measured it; (b) for each member the plan leaves on "today's behaviour", run a write-by-operand probe, since a flag table cannot express a write through an operand. The measured example: `uniq in.txt out.txt` then `ls out.txt` shows the file created. Report an unaudited member as Important; never auto-fix, put it to the author.

### Phase 2: The timing statistic

**Files to modify:**
- `skills/create-task/SKILL.md:569` — extend the obs #31 bullet.
- `skills/review-task/SKILL.md` — check 22's wall-clock note (around 1472–1478).

**Exact changes:** add to both: the criterion names where it is measured and how load is controlled, and on a shared host prefers a paired, interleaved ratio or CPU time (user + sys) over a ratio of medians. Task 306's ten runs: ratio of medians 1.22, paired-ratio median 1.07, CPU time 1.016.

## Key Patterns and References

- Check 13 (`review-task` line 990) is the shape to copy: a trigger, a probe, a named failure.
- The create-task/review-task parity test pattern for one rule stated in two skills.

## Testing Approach

A fixture task document with a partly tabled allow-list and one fully tabled control; a parity test that reads both skills' timing sentence. Temp directories get a `t.after` removal.
