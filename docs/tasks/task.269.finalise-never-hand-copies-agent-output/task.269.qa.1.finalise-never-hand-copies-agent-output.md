# QA Report: Task 269 - finalise never hand-copies agent output

**Task**: [Link to task document](./task.269.finalise-never-hand-copies-agent-output.md)
**Gate File**: [task.269.gate.1.finalise-never-hand-copies-agent-output.yml](./task.269.gate.1.finalise-never-hand-copies-agent-output.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: FAIL

---

## Executive Summary

All four phases are implemented and the full fast gate is green (7997 tests, 0 failed). The diff review found one high-confidence defect in the new reuse block of `skills/finalise/SKILL.md` (it reads variables no line in its own block binds) and two medium ones in the plan runner. The gate is FAIL until those are fixed.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b), a first review of the whole branch diff against `origin/develop`. Adaptive strategy: direct tools. The review was dispatched at the head `625f92f5` and returned before this gate was written.

CI on 625f92f5: not read in this run (PR #857 had just opened; no completed check to map).

Step 4b: not applicable beyond the `SKILL.md` edits, which the diff review read as executed prose (finding T269-QA-1 comes from that lens).

---

## New Findings This Cycle

First review; every finding below is new.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: measure how the reply reaches the orchestrator | PASS | Verified | Finding recorded in the plan; transcript route confirmed |
| Phase 2: probe plan route | CONCERNS | Verified | `cases_file`, entity refusal, reuse built; reuse has T269-QA-1 and T269-QA-2 |
| Phase 3: AC YAML route | CONCERNS | Verified | `extract` and `merge --sha256` built; T269-QA-5 on the transcript reader |
| Phase 4: evidence, bundle, sweep | PASS | Verified | Five pinning tests updated; bundle check clean |

**Overall Phase Completion**: 4/4 built; 2 with findings

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `cases_file` copied byte for byte (seven control characters) | identical | identical (test: `cases_file: the numbered cases file is the source file byte for byte`) | PASS |
| Escaped plan refused; control accepted | refused / accepted | both shown | PASS |
| Extracted AC block hash recorded; one-byte change refused | refused | shown (`extract: the AC block is written byte for byte…`) | PASS |
| Reuse path: matching hash reused, changed cases byte or engine path re-plans | as stated | shown by test, but the SKILL.md block that calls it cannot run (T269-QA-1) and a nonexistent engine path reads reusable (T269-QA-2) | CONCERNS |
| `cases_file` outside the work directory or a symlink refused | refused | shown | PASS |
| No new test case over 1 s | under 1 s | 145 ms slowest, five runs, load average 6.09 | PASS |
| Mutation proofs for each refusal | red per proof | six proofs, each turned only its named test red | PASS |
| `bundle --check`, `npm test`, `quick_validate` | clean | clean | PASS |

---

## Issues Found

### HIGH Severity Issues (1)

**T269-QA-1** — `skills/finalise/SKILL.md:646`. The reuse block reads `$DOC_DIR`, `$STEM`, `$DOD_N`, none bound in that block; `DOC_DIR` is first set at line 666. Fenced blocks run as separate shells, so the prior-plan path collapses. `DOD_N` of 1 gives a prior run of 0. Fix: bind all three as placeholders with the unsubstituted-placeholder HALT; skip at `DOD_N` 1.

### MEDIUM Severity Issues (2)

**T269-QA-2** — `security-probe-plan.mjs` `reusePlan`. `git diff --quiet <head> HEAD -- <path>` exits 0 for a path that does not exist (reproduced), so a mistyped `--engine-path` answers `reusable`; uncommitted engine edits are also ignored.

**T269-QA-3** — `resolveCasesFile` is a path-confinement boundary the probe engine cannot reach (object return, not boolean), so `probes_executed` is 0 for it. Fix: export a boolean predicate and run the engine on it.

### LOW Severity Issues (2)

**T269-QA-4** — `planHasLiteralAngle` is measured over the whole plan JSON, which holds argv and not a `cases_file` entry's cases.

**T269-QA-5** — `agent-reply-block.js` `replyText` joins segments with no separator and resets the tail on any non-assistant line; real transcripts also hold `attachment` lines.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
Slowest new case 145 ms.

### Reliability — CONCERNS
Reuse can read `reusable` on a path that matches nothing (T269-QA-2). Extraction itself fails safe to the recorded hand copy.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `cases_file` confinement is held by committed tests; the engine run is the open item (T269-QA-3).

### Maintainability — PASS
One extractor, one hash check, pinning tests updated.

---

## Code Review

**Correctness bugs (4):**
- [high/high] `skills/finalise/SKILL.md:646` — reuse block reads unbound `DOC_DIR`/`STEM`/`DOD_N` → bind them in the block (T269-QA-1)
- [medium/high] `shared/resources/security-probe-plan.mjs:630` — `git diff --quiet` passes on a nonexistent path → require each path to exist and diff the working tree (T269-QA-2)
- [medium/medium] `shared/resources/security-probe-plan.mjs:336` — entity heuristic measured over the whole plan → judge per entry (T269-QA-4)
- [low/medium] `shared/resources/agent-reply-block.js:128` — segments joined without a separator → join with a newline, skip metadata lines (T269-QA-5)

**Cleanups (0):** none.

mutation-proven: byte copy replaced by re-serialisation → `cases_file: the numbered cases file is the source file byte for byte` → covered
mutation-proven: cases entity refusal disabled → the two `entity:` tests → covered
mutation-proven: symlink refusal removed → `cases_file: refused when absolute, climbing out, a symlink…` → covered
mutation-proven: engine-changed check removed → `reuse: an unchanged plan is reusable…` → covered
mutation-proven: merge hash check disabled → `extract: the AC block is written byte for byte…` → covered
mutation-proven: extract entity refusal disabled → `extract: an escaped block is refused…` → covered

Provenance: all four findings are in code this task added; none exists on the base.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true command npm run ci:fast        # 7997 tests, 0 failed
command npm run bundle -- --check      # 0 problems
python skills/create-skill/scripts/quick_validate.py skills/finalise
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence defect makes the reuse path of Step 3b.1 unrunnable as written; two medium findings weaken the reuse check and leave a boundary unprobed.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` for T269-QA-1 to T269-QA-5, then re-review.
