---
id: task.210
title: "macOS check of the setup-consumer agent checkbox list"
type: task
description: "Run setup-consumer.sh's agent checkbox list in a real macOS terminal, under macOS's bash 3.2 and from zsh, at normal and narrow widths, and fix anything found through the pipeline — the part of task.209's criterion 6 the owner deferred."
tags: [setup-consumer, macos, bash-3.2, verification, follow-up]
category: testing
status: planned
priority: Low
created: 2026-10-14
updated: 2026-10-14
assignee:
depends_on: [task.209]
---

# Technical Task: macOS check of the setup-consumer agent checkbox list

**Status:** Planned

---

## 1. Overview

Task 209 added a checkbox list to `scripts/setup-consumer.sh`, drawn with raw key reads from
`/dev/tty`. Its success criterion 6 was a real-terminal check on Linux and macOS. The owner checked
Linux on 2026-10-14, which found and fixed a redraw bug in narrow terminals (TASK-209-BUG-5), and
deferred macOS to this task.

**Scope**: run the list in a real macOS terminal, record the result, and fix anything found.

**Key deliverables**: a recorded macOS run (pass or bugs filed); any fixes through `/develop-task`'s
pipeline.

---

## 2. Motivation

- **macOS ships bash 3.2.** The list avoids bash 4 features and reads an arrow key as ESC plus two
  bytes because 3.2 has no fractional `read -t`, but nothing has executed it under 3.2.
- **The wizard is usually run from zsh** (`bash <(curl …)`), macOS's default shell.
- **Pseudo-terminal tests missed a real bug once.** TASK-209-BUG-5 was invisible to the pty tests
  until the owner ran it; a real macOS terminal (Terminal.app, iTerm2) may differ again.

---

## 3. Technical Background

- `checklist()` and `_checklist_restore()` in `scripts/setup-consumer.sh` (`grep -n '^checklist() {'`):
  keys from `/dev/tty`; `stty -echo`; cursor hidden (`CSI ?25l`) and autowrap off (`CSI ?7l`) while
  drawing, both restored on exit and by an `INT` trap.
- Tests: `shared/resources/tests/setup-consumer-agent-links.test.mjs` drives the list through a
  Python pty on Linux CI, including a 40-column replay through a minimal terminal emulator.
- Linux result (owner, 2026-10-14): works after the TASK-209-BUG-5 fix.

---

## 4. Scope

**In scope**: Terminal.app and one other common terminal if available (iTerm2 or Ghostty);
`/bin/bash` 3.2 as the interpreter; zsh as the caller; normal and narrow (~60 column) widths.

**Out of scope**: Windows; `curl … | bash` (no terminal for the list, already skipped by design);
changing the list's design.

---

## 5. Breaking Changes

None — a verification task. Any fix found goes through the pipeline with its own review.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.210.plan.macos-check-of-agent-checkbox-list.md](task.210.plan.macos-check-of-agent-checkbox-list.md)

### Phase 1: Prepare (Low risk)

- [ ] A scratch git repo on the Mac with `AGENTS.md` and `.agents/skills/` (or a real consumer)
- [ ] Confirm `/bin/bash --version` reports 3.2

### Phase 2: Run the checks (Low risk)

- [ ] `/bin/bash <path>/setup-consumer.sh --links-only --dry-run` from zsh, normal width
- [ ] Same at ~60 columns
- [ ] Each key: ↑/↓ (and wrap), k/j, space, a, enter
- [ ] Ctrl-C mid-list: the prompt comes back with echo on, cursor visible, autowrap on (type a long line)
- [ ] Without `--dry-run` in a scratch repo: the ticked links are made and gitignored

### Phase 3: Record and fix (Low–Medium risk)

- [ ] Record the result in this task's QA report
- [ ] File a bug report per defect; fix through `/develop-task`

---

## 7. Files Summary

- `scripts/setup-consumer.sh` — only if a defect is found
- `shared/resources/tests/setup-consumer-agent-links.test.mjs` — a regression test per defect
- `docs/tasks/task.210.macos-check-of-agent-checkbox-list/` — results

---

## 8. Testing Strategy

Manual, in real terminals, per Phase 2. Any defect gets an automated regression test that runs on CI
(Linux) where the defect is reproducible there; where it is macOS-only, the bug report says so.

---

## 9. Success Criteria

- [ ] The list works in Terminal.app under bash 3.2, called from zsh, at normal and narrow widths
- [ ] Ctrl-C leaves the terminal usable (echo, cursor, autowrap restored)
- [ ] Every defect found is fixed with a regression test, or filed with the reason it cannot be tested on CI
- [ ] `npm test` passes

---

## 10. Risk Assessment

| Risk | Level | Mitigation |
| --- | --- | --- |
| No Mac available | Medium | The task stays planned; nothing else depends on it |
| A bash 3.2 defect that CI (bash 5) cannot reproduce | Low | Record the manual reproduction in the bug report |

---

## 11. Rollback Plan

Nothing to roll back unless a fix lands; a fix is reverted like any commit. The list can be bypassed
at any time with `--link-agents`.

---

## Change Log

<!-- change-log-start -->
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-10-14 | 1.0 | Initial draft — deferred from task.209 criterion 6 by the owner | create-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: Prepare
- [ ] Phase 2: Run the checks
- [ ] Phase 3: Record and fix

## References

- [task.209](../task.209.setup-consumer-agent-links/task.209.setup-consumer-agent-links.md) — the feature and criterion 6
- [TASK-209-BUG-5](../task.209.setup-consumer-agent-links/task.209.bug.5.list-stacks-frames-in-a-narrow-terminal.md) — the Linux finding

## Notes

QA artifacts land beside this document: `task.210.qa.{n}.*.md`, `task.210.gate.{n}.*.yml`,
`task.210.bug.{n}.*.md`.
