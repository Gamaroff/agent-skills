# Bug Report: Task 209 - the checkbox list stacks frames in a terminal narrower than its lines

**Task**: [Link](./task.209.setup-consumer-agent-links.md)
**Bug ID**: TASK-209-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: Owner (success criterion 6, real-terminal check on Linux)
**Date Found**: 2026-10-14

## Description

The owner's first real-terminal run showed the list redrawn on top of itself, each keypress adding
a mashed copy. The longest lines (`nothing to link: reads AGENTS.md and .agents/skills`, about 87
characters) wrapped onto a second row in a terminal about 84 columns wide. The redraw moves up one
row per item, so it landed too high and each frame overwrote half of the last.

The pseudo-terminal tests ran at an unset width, which the driver never constrained, so they could
not see it.

## Expected Behavior

The list redraws in place at any width.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-10-14

**Fix**: autowrap is turned off (`CSI ?7l`) while the list is drawn and back on (`CSI ?7h`) in
`_checklist_restore`, which also runs on Ctrl-C. A line wider than the terminal is clipped at the
edge, so the row count the redraw relies on always holds. The descriptions are shortened to
`nothing to link` (the intro explains what that means), so lines fit in 80 columns anyway.

**Testing**: `the list redraws in place in a terminal narrower than its lines` drives the real list
in a pseudo-terminal set to 40 columns and replays the output through a minimal terminal emulator:
each of the ten rows shows one agent, in order, with the cursor on the fourth. With autowrap left on
the test fails (`row 0 … got "ll · enter confirms"`). Replayed by hand at 84 columns (the owner's
case) and 50: clean.

**Files Modified**: `scripts/setup-consumer.sh`, `shared/resources/tests/setup-consumer-agent-links.test.mjs`

## Status History

| Date | Status | Changed By | Notes |
| :--- | :--- | :--- | :--- |
| 2026-10-14 | New | Owner | Screenshot of stacked frames from the first real-terminal run |
| 2026-10-14 | Ready for QA | qa-fix | Autowrap off while drawing; shorter labels; narrow-terminal test |
