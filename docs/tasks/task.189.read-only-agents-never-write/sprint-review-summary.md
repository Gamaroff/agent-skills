# Sprint Review Summary - Read-only agents never write

**Story/Task ID:** task.189
**Epic:** none (standalone task)
**Completed Date:** 2026-10-17
**Completed By:** develop-task pipeline (Lorien Gamaroff, operator)
**Pull Request:** [#683](https://github.com/Gamaroff/agent-skills/pull/683)

---

## Summary

No pipeline prompt now asks a read-only Explore subagent to write. The QA traceability mapper returns its matrix and the orchestrator writes it; the finalise DoD security agent returns a probe plan and `/finalise` runs it; the DoD docs agent runs no generator; and a guard test keeps every Explore-dispatched prompt free of write instructions.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The mapper prompt contains no write instruction, and both dispatch sites say to return the matrix
- [x] The lifted extract-and-write block writes the marked matrix byte for byte and warns without writing when no markers are present
- [x] The DoD security prompt contains no `--record` and no cases-file write, and returns `probe_plan[]`
- [x] Finalise Step 3b.1 sets `probes_executed` from the record's `totals.executed`, and records an engine refusal without counting it
- [x] The DoD docs prompt instructs no generator run
- [x] Performance not applicable; `npm test`, `bundle:check`, `prettier --check .` and `quick_validate.py skills/finalise` pass
- [x] CHANGELOG states the security agent's YAML drops `probes_executed`, `probe_command` and `probe_cases`

### Key Features Implemented

- **Mapper returns, orchestrator writes**: the step-5 matrix block extracts the marked matrix from the mapper's reply, refusing a malformed reply.
- **Probe plan runner**: `shared/resources/security-probe-plan.mjs` runs the security agent's plan as argument arrays, owns the record flags, refuses duplicate case ids and bounds each engine run.
- **Step 3b.1, backgrounded**: finalise runs the plan in the background, marks and clears its own wait, and writes the result atomically.
- **Guard test**: `tests/explore-prompts-no-write.test.js` fails on any write instruction in an Explore-dispatched prompt.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe-plan.mjs` - new probe-plan runner (+399)
- `shared/resources/finalise-dod-security-prompt.md` - returns `probe_plan[]`, never runs the engine
- `shared/resources/qa-traceability-mapper-prompt.md` - returns the matrix between markers
- `shared/resources/finalise-dod-docs-prompt.md` - catalog staleness judged from the diff; no generator
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - matrix write block
- `shared/resources/code-review-prompt.md` - caller-runs marker
- `skills/finalise/SKILL.md` - Step 3b.1 replaces the obs #10 fallback
- `tests/explore-prompts-no-write.test.js`, `shared/resources/tests/read-only-agent-writes.test.mjs` - new suites
- `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `evals/shared/tests/probes-executed-population.test.mjs` - updated contracts

### Architecture/Design Decisions

One run record per DoD run, not one per plan entry; a runner script rather than a long fenced block, because argv arrays and id-to-input mapping do not fit shell; the docs agent reads `<DIFF_FILE>` so the catalog rule is platform-neutral.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** a custom dispatcher of `finalise-dod-security-prompt.md` must run Step 3b.1's block after the agent returns (CHANGELOG).

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 56 tests across `read-only-agent-writes.test.mjs` and `finalise-dod-prompt-contract.test.mjs`, plus `explore-prompts-no-write.test.js`
- **Full suite:** `npm run ci:fast` 5811 pass, 0 fail
- **Security probes:** 30 executed across 2 controls at the DoD, 0 reproduced

### Code Review

- **Reviewers:** QA code reviewer every cycle (6 cycles); Step 5c conformance review (`task.189.pr-review.1.read-only-agents-never-write.md`, CONCERNS)
- **Approval Status:** single-maintainer repo — accepted on the 5c report
- **Review Comments Addressed:** every gate finding fixed; CR6-1's fix verified by mutation proof, not a gate

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets
- [x] No shell-interpreted spawns (`spawnSync` with an argv array)
- [x] Owned-flag refusal and matrix-reply refusal probed: both engage
- [x] No dependency changes

### Compliance Review

✅ **Not applicable** — internal pipeline refactor; no personal data, payments, UI or health data.

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` entry (task 189)
- [x] finalise SKILL.md Step 3b.1 and the four shared prompts

---

## Demo Notes

### How to Verify

1. `command node --test tests/explore-prompts-no-write.test.js shared/resources/tests/read-only-agent-writes.test.mjs`
2. Read finalise SKILL.md Step 3b.1: the security agent returns a plan; `/finalise` runs it.
3. Expected: all tests pass; no Explore-dispatched prompt tells the agent to write.

---

## Impact & Value

### User Impact

Pipeline runs no longer stall or report false security FAILs when a read-only agent refuses an instruction to write.

### Technical Impact

Write ownership is now the orchestrator's by construction, and a guard test keeps it that way.

---

## Known Limitations & Future Work

### Current Limitations

- The QA loop ended at its limit (6 cycles, HIGH 0 throughout); the last fix (CR6-1, test-only) was verified by mutation proof, not a gate. `task.189.bug.6` stays at Ready for QA.
- CR6-2: a runner that loads without a numeric `ENGINE_TIMEOUT_MS` is reported as not loaded (unreachable with the shipped runner).

### Suggested Follow-Up Stories

- Extract Step 3b.1's shell (run, wait, atomic result) into a tested script, and settle CR6-2 there.
- CR3-4: the engine's SIGKILL on timeout skips its sandbox cleanup.

---

## Metrics _(if applicable)_

- **QA Cycles:** 6 (5 + 1 granted)
- **Lines of Code Changed:** +6390 / -833 across 69 files (+1930 / -247 excluding generated copies and docs)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
