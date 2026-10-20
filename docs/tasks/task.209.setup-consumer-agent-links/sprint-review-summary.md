# Sprint Review Summary - setup-consumer.sh links each user's agents to AGENTS.md and .agents/skills

**Task:** [task.209](task.209.setup-consumer-agent-links.md) · **Status:** Accepted (2026-10-14) · **PR:** #660 (implementation #659)

## Summary

setup-consumer.sh links each user's agents to AGENTS.md and .agents/skills. Built by hand and merged as #659; the PR review, QA (8 cycles) and acceptance ran afterwards on #660, and the fixes they found are in that PR.

## What Was Delivered

### Acceptance Criteria Met

SC1–SC6 all pass. Every guard has a committed mutation record (qa.1, qa.3, qa.8); SC6 is the owner's Linux real-terminal run (macOS deferred to task.210); tests pass in CI.

### Key Features Implemented

- A checkbox list of ten agents in setup-consumer.sh (↑/↓, space, a, enter); redraws in place at any width
- Local, gitignored links per ticked agent; nothing existing replaced; no dangling links; a failed link fails the run
- `--link-agents a,b` (ids checked before any step; commas or newlines) and `--links-only` for new clones and worktrees
- getting-started §1a lists what each of the ten agents needs

## Technical Details

### Files Modified/Created

See the task's Files Summary and the QA reports in this folder.

### Architecture/Design Decisions

See the task's Technical Background; QA-driven decisions are recorded in the bug reports beside the task.

### Dependencies

None added.

## Testing & Quality Assurance

### Test Coverage

Per-PR tests hold every success criterion; every guard is mutation-proved (QA reports). `npm test`: 5502, 5484 pass, 4 worktree-only failures (obs #39) that pass in the main checkout.

### Code Review

`task.209.pr-review.1.setup-consumer-agent-links.md` and the QA refute passes.

## Security & Compliance

### Security Review

PASS — 9 probes (`task.209.dod.2.security.run.json`), 0 reproduced; the run-1 newline case is refused.

### Compliance Review

Not applicable.

## Documentation

### Updated Documentation

PASS — CHANGELOG Added entry; getting-started §1a, step 8b and usage (section carried from dod.1; docs unchanged since).

### Documentation Links

- [Task document](task.209.setup-consumer-agent-links.md)
- [DoD verification](task.209.dod.2.setup-consumer-agent-links.md)

## Demo Notes

### How to Verify

See the task's Testing Strategy; the QA reports list the exact commands.
