# Sprint Review Summary - QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Story/Task ID:** task.170
**Epic:** _(standalone task)_
**Completed Date:** 2026-10-04
**Completed By:** develop-task pipeline (Claude Code)
**Pull Request:** [#563](https://github.com/Gamaroff/agent-skills/pull/563)

---

## Summary

When `/finalise` halts on Definition of Done gaps and the fix changes code, the resume used to re-run `/finalise` at step 7 over a head that no QA gate had read. The resume contract now has a sanctioned, recorded 7 → 5 re-entry: `reenter-qa-after-finalise.sh` measures whether code moved since the gate's `head:`, lowers the lock to step 5 / `qa_phase: 5a`, sets the QA budget and records `qa_reentry`. Document-only fixes and seven other states are refused with a named reason and route (observation #235).

The task exercised its own mechanism. Its first `/finalise` run halted on two gaps. Gap 1 was a bash 3.2 parse failure, fixed in code, and this script re-entered QA for cycle 7. Gap 2 (the probe zero-guard) was resolved by an operator decision.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A step-7 GAPS halt plus a code change re-enters at step 5 / 5a
- [x] A document-only fix is refused (`no-code-moved`) and resumes at step 7
- [x] An uncommitted tracked change is refused (`uncommitted-fix`). Untracked files are named but never counted.
- [x] A resume after the re-entry, before the new QA Cycle entry, re-enters at 5a (Second precedence, `report_entries`)
- [x] A snapshot for another document, or a `halt_step` other than 7, is refused
- [x] The lock records `qa_reentry` with the gate head
- [x] The Stop hook names `/qa-task` / `/qa-story` on a re-entered lock, never `/finalise`
- [x] The contract's refusal list equals the script's reasons (parity test)
- [x] Atomic lock write, with no temp file left on failure
- [x] ShellCheck, Prettier, `npm test` and `bundle:check` are green
- [x] Each refusal reason is mutation-proven
- [x] The CHANGELOG `[Unreleased]` entry records the new resume case
- [x] No consumer migration (one optional lock field)

### Key Features Implemented

- `shared/resources/reenter-qa-after-finalise.sh`: the only writer that may lower `current_step`, and only from 7 to 5. It has eight refusals, each with its route.
- Resume contract: the "Re-entry after a finalise DoD-gaps halt" section and the Second precedence for 5c readings that predate a re-entry.
- develop-task / develop-story Phase 0b: the "Re-enter QA at 5a" option.

---

## Technical Details

### Files Modified/Created

See the task's §7 Files Summary. The core files are the new script and its test suite, the parity test, the resume contract, the step-7, step-5-6 and pause docs, `finalise` Step 8, the two orchestrator SKILL.md files, `package.json` and `CHANGELOG.md`, plus the re-bundled `references/` copies.

### Architecture/Design Decisions

- Movement is measured as **committed history** outside the work-item directory since the gate's `head:`. It fails toward one extra QA cycle, never toward an ungated head.
- The budget is `max(existing, base + 2)`, where `base` is reconstructed from disk exactly as `grant-qa-cycles.sh` reconstructs it.

### Dependencies

None added.

---

## Testing & Quality Assurance

### Test Coverage

- Re-entry suite: 53 cases (under bash 5.3, and under bash 3.2 first on PATH). Parity: 5. Stop hook: case 12.
- `npm run ci:fast` at `f4f2cf85`: 5264 pass, 0 fail.

### Code Review

- 7 QA cycles. Gate 7: PASS 100.
- 5c PR review 2: CONCERNS (2 medium, 3 low). These are non-blocking, and the follow-ups are in the task's Deferred Work.

---

## Security & Compliance

### Security Review

The checks pass: no secrets, no unsafe patterns, hostile `head:` values never execute, and the script parses under bash 3.2. Probe mode is **unverified by the engine**: the script takes two positional arguments and `security-probe.mjs` has no entry form for that shape. The operator accepted this on 2026-10-04, following the task.130 precedent, on the executed suite evidence of eight hostile-head cases that run on every PR. Follow-up: task.181 (#564).

### Compliance Review

Not applicable. This is an internal pipeline change.

---

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]`
- `shared/resources/develop-pipeline-resume-contract.md`, `develop-pipeline-step-7-finalise.md`, `develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-pause.md`
- `skills/finalise/SKILL.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`

### Documentation Links

- DoD: [`task.170.dod.2.qa-reentry-after-finalise-gaps.md`](./task.170.dod.2.qa-reentry-after-finalise-gaps.md)
- Implementation report: [`task.170.implementation.1.qa-reentry-after-finalise-gaps-initial-run.md`](./task.170.implementation.1.qa-reentry-after-finalise-gaps-initial-run.md)

---

## Demo Notes

### How to Verify

1. `bash shared/resources/reenter-qa-after-finalise.test.sh` should report 53 passed.
2. `command node --test evals/shared/tests/reenter-qa-refusals-parity.test.mjs` should report 5 passed.
3. This task's own implementation report shows the script running live: after the DoD-gaps halt, the lock went from 7 to 5 / 5a with `qa_max_cycles=8`.

### Screenshots/Visuals

N/A

---

## Impact & Value

### User Impact

An operator who fixes a DoD gap with code no longer gets a `/finalise` acceptance over code that QA never reviewed.

### Technical Impact

A backward lock move now has one recorded writer instead of a hand-edited lock.

---

## Known Limitations & Future Work

### Current Limitations

- The bash 3.x parse guard runs only where `/bin/bash` is 3.x, and it checks parsing only (gate 7 CR-1).
- The `no-gate` refusal drops `qa-cycle.sh`'s stderr (PR review 2 CR-1).
- `qa_reentry` is not yet named in `develop-pipeline-hooks.md` or the resume detector prompt (PR review 2 CR-2).

### Suggested Follow-Up Stories

- task.181: a `shell-argv:` probe entry form (#564)
- The PR review 2 and gate 6/7 follow-ups listed in the task's Deferred Work

---

## Metrics _(if applicable)_

- QA cycles: 7. DoD runs: 2.
