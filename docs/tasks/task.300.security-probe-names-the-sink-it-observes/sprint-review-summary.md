# Sprint Review Summary - security-probe names the sink it observes

**Story/Task ID:** task.300
**Completed Date:** 2026-11-13
**Pull Request:** [#896](https://github.com/Gamaroff/agent-skills/pull/896)

---

## Summary

A clean security-probe result now says what the run could not observe. The Probe Results line in the DoD prints those limits beside the "candidates executed / reproduced" count.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Phase 1's finding on the premise is recorded in the QA report.
- [x] An entry form with a stated limit yields `observation_limits` in the run record and on the DoD Probe Results line.
- [x] Every form carries the universal "effects after an accepted value" limit; only `fence:` adds the out-of-sandbox-write limit; the counts a gate reads are unchanged.
- [x] No extra probe executions.
- [x] `bundle:check`, `format:check` and `ci:fast` pass.
- [x] CHANGELOG entry; readers of the record tolerate the new field.

### Key Features Implemented

- **Observation limits**: `OBSERVATION_LIMITS` in the runner is the one definition of the two limit sentences. `observationLimitsFor(entry)` picks them by entry form.
- **Report line**: the finalise Probe Results block prints `**Not observed by this run:**` when the plan reported limits, and never inside the zero-executed branch.
- **Premise correction**: the filed premise was wrong in part. A validator that accepts a hostile value already counts as reproduced, so this is a reporting change, not a new observable sink.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` - `OBSERVATION_LIMITS`, `observationLimitsFor`, the record field and block output (bundled into finalise, qa-story, qa-task, review-security)
- `shared/resources/security-probe-plan.mjs` - plan output carries `observation_limits`
- `skills/finalise/SKILL.md` and `shared/resources/finalise-dod-security-prompt.md` - Probe Results line
- `shared/resources/probe-boundary-rule.md` - section 5 cites `OBSERVATION_LIMITS`
- `shared/resources/tests/security-probe.test.mjs` and `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` - behaviour tests, mutation-proved
- `CHANGELOG.md`

### Architecture/Design Decisions

A fixed run-level list keyed by entry form. A per-entry "sink observable?" field was rejected because the runner has no input that decides it. The field is not called `sink`, which already means the corpus input class.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none (an extra field in the run record; readers tolerate it)

---

## Testing & Quality Assurance

### Test Coverage

- Behaviour tests for the form-to-limit mapping, the record and block output, the plan output, a legacy-record read-back and the DoD render pin.
- `ci:fast` green on the LAN server (8450 pass, 0 fail); PR CI green on all 6 checks.

### Code Review

- QA gate 1 PASS (95/100), then 5c CONCERNS (3 findings) fixed in `88ddf934`; QA gate 2 PASS (96/100); 5c APPROVE.

---

## Security & Compliance

### Security Review

✅ Not a boundary deliverable (the change accepts or rejects no input). No secrets or unsafe patterns added.

### Compliance Review

Not applicable (no personal data, payments, UI or health data).

---

## Documentation

- [x] CHANGELOG entry (task 300)
- [x] `skills/finalise/SKILL.md` and shared resources updated

---

## Demo Notes

### How to Verify

1. Run a finalise probe plan over a `fence:` entry.
2. Open the DoD Probe Results: the line `Not observed by this run:` lists the out-of-sandbox-write limit and the after-accept limit.
3. Over any other entry form, only the after-accept limit appears.

---

## Known Limitations & Future Work

### Suggested Follow-Up

- A cosmetic double import in `readExecuted` (`security-probe-plan.mjs`).
- Other stated limits (gh-path bypass in shell forms, usage echoing the input) are not yet listed.
- Adding a new observable sink stays a separate, larger task.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
