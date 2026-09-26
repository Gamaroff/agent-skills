# QA Report: Task 152 - finalise: bug-mode gaps path and co-located artifacts in 8a and link guard

**Task**: [Link to task document](./task.152.finalise-gaps-path-and-artifact-links.md)
**Gate File**: [task.152.gate.3.finalise-gaps-path-and-artifact-links.yml](./task.152.gate.3.finalise-gaps-path-and-artifact-links.yml)
**Previous Gate**: [task.152.gate.2.finalise-gaps-path-and-artifact-links.yml](./task.152.gate.2.finalise-gaps-path-and-artifact-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Gate Status**: CONCERNS

---

## Executive Summary

All three cycle-2 findings are fixed and CI is green on `80ef8f8f`. The scoped review found one
medium defect: the fill helper prints its refusals to stdout. The 8.3 command substitution captures
stdout, so it swallows the reason and exits silently. There are also three low findings. This is
the second cycle in a row with no HIGH finding.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Prior finding (gate 2) | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1 zero-gap refusal after irreversible writes | medium | FIXED | The helper refuses before writing, and 8.3 derives its values. Removing the refusal turns the "BEFORE writing" test red (G1), and supplying a constant count turns the 8.3 test red (G2). |
| CR-2 unprefixed sprint-review summary outside the set | medium | FIXED | `UNPREFIXED_ARTIFACTS` is shared by the evaluator and the walk. Removing it from either turns a test red (G3, G4). |
| CR-3 unreachable `unchanged` documented | low | FIXED | 8.3, the CLI header and the CHANGELOG now say a repeat appends. |

---

## Testing Scope

### Review Methodology

Direct tools, plus one independent code-review subagent over the scoped diff: the 9 source files
cycle 2's fix changed, 1,446 lines.

```
Re-review scope: since 2026-09-26T21:52:00Z (default) — files changed by 80ef8f8f
```

Step 4b ran on `finalise`. With `DOC_FILE` bound, 1 block executed under bash and zsh with no
findings; the other 33 blocks are mutating and 1 is a placeholder. The new helper calls are covered
by the committed executed tests. The fast gate was not re-run by QA. `80ef8f8f` is the tree the 5b
fast gate ran on (4,270 pass, 0 fail, symlink aside), and CI `test` passed on the same commit.

---

## New Findings This Cycle

- **[medium]** `shared/resources/fill-verification-complete.sh` (and its call at `skills/finalise/SKILL.md:2222`) — HALT reasons go to stdout, so 8.3's `$(… count)` swallows them. → Send them to stderr. (CR-1)
- **[low]** `fill-verification-complete.sh` — `count` prints 0 both when the Step 5 heading is missing and when there are no gaps, and 8.3 does not refuse 0. → Halt when the heading is missing, and refuse 0 in 8.3. (CR-4)
- **[low]** `skills/finalise/SKILL.md:2337` — 8.5's bug branch keeps its own copy of the gap count. → Use the helper's `count`. (CR-6)
- **[low]** `shared/resources/tests/doc-links.test.mjs:816` — the walk comment claims the walk and 8a cover the same set; the walk is a superset. → Reword the comment. (CR-7)

Advisory, routed to `future`:

- Cycle-3 CR-2 (medium/high): `docs/bugs` artifacts are not walked. Task § 4 names this as a
  follow-up.
- CR-3 (medium/medium): finalise uses two engine-path conventions (the gate-1 CR-3 carry-over).
- CR-5 (low): the 8.3 re-run guard exists only in prose.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: fill helper | CONCERNS | CR-1, CR-4 |
| Phase 2: Step 8 rows + markers | CONCERNS | CR-6 |
| Phase 3: status-history.js | PASS | |
| Phase 4: evaluator | PASS | 49 probes engage |
| Phase 5: 8a + corpus guard | CONCERNS | CR-7 (comment) |
| Phase 6: writer sites | PASS | |
| Phase 7: docs + validation | PASS | CI green |

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 49 (`task.152.qa.3.security.run.json` `totals.executed`)
- The probe was re-run because `isCoLocatedArtifact` gained the unprefixed branch. The new cases
  were one legitimate unprefixed summary and hostile variants: other directory, subdirectory,
  lookalike name, `.yml`, `..`, NUL, and case variant. Verdict `engages`: 0 reproduced, 0
  over-blocked.

### Reliability — CONCERNS

CR-1.

### Performance — PASS · Maintainability — PASS

---

## Code Review

**Correctness bugs (5):** CR-1 [medium/high] **promoted**; CR-2 [medium/high] routed to `future`
(out of scope by § 4); CR-3 [medium/medium] advisory; CR-4 [low/medium] **promoted as low**; CR-5
[low/medium] advisory.

**Cleanups (2):** CR-6 and CR-7, both **promoted as low**.

**Boundary rule:** `boundary: true`, `isCoLocatedArtifact`, `probes_executed: 49`. The fill helper
refuses by its own header, but it takes two positionals, so the engine declines it. Its refusals
are covered by executed tests in bash and zsh.

**Provenance (5b):** cycle-3 CR-2 is not a regression introduced by this change. The walk never
covered `docs/bugs`, on the base or on the branch, and the task scoped it out.

**Mutation spot checks:** the qa-fix proofs G1–G4 stand (each reverted fix turned its named test red).

---

## Test Artifacts

### Test Commands Executed

```bash
gh pr checks 495                                     # all pass on 80ef8f8f
node .agents/skills/qa-task/references/security-probe.mjs --sink path \
  --entry '.claude/state/t152-probe-wrapper.mjs#admitsArtifact' \
  --cases-file .claude/state/t152-probe-cases-3.json --record task.152.qa.3.security.run.json --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md \
  --bind "DOC_FILE=<task doc>" --copy-as docs:docs --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings; one medium (CR-1).
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL. Condition: CR-1 fixed.

---

**QA Report**: co-located at `task.152.qa.3.finalise-gaps-path-and-artifact-links.md`
**Gate File**: co-located at `task.152.gate.3.finalise-gaps-path-and-artifact-links.yml`
**Next Steps**: `/qa-fix` cycle 3
