# QA Report: Task 148 - qa-fix and the QA loop: offer a structural move before another prose patch

**Task**: [task.148.structural-move-before-prose-patch.md](./task.148.structural-move-before-prose-patch.md)
**Gate File**: [task.148.gate.1.structural-move-before-prose-patch.yml](./task.148.gate.1.structural-move-before-prose-patch.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Testing Completed**: 2026-09-25
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #492. All five phases are implemented as planned, all 36 new tests pass, and
every success criterion holds as written. The diff code review found two high-confidence correctness
bugs in the new runnable prose: the Step 3.5 population misses hand-authored reference documents
(CR-1), and the 5b offer snippet fails silently on bad input (CR-2). Under `code_review_blocking`
both enter the gate as MEDIUM findings.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix CR-1 and CR-2)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All implementation phases completed (12/12 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on the feature branch with PR #492 open

### Testing Approach

- [x] Automated Testing (unit, snippet execution, fixture git repo)
- [x] Regression Testing
- [x] Security Review (boundary rule applied)
- [x] Code Review (Step 3b, one Explore subagent over the whole branch diff)
- [x] Runnable-prose execution (Step 4b, plus hand runs under bash and zsh)

### Review Methodology

Direct tools plus one code-review subagent. The task has 5 phases across three modules, which falls
under the Adaptive Review Strategy's default row. The traceability matrix was supplied by the
pipeline (`.summaries/qa-traceability-matrix.md`). First review, so there is no re-review scope.

**Step 4b.** `qa-execute-snippets.mjs` ran over both changed prose files. Loop doc: 22 blocks (1
runnable, 1 placeholder, 20 mutating); no findings. qa-fix: 9 blocks (0 runnable, 2 placeholder, 7
mutating); finding `zero-blocks-executed` (medium). The two placeholder blocks predate this change
(`:282` PR vars, `:1031` TRACKER/STORY_FILE). The two blocks this change added are refused
fail-closed: loop `:886` (`node`) and qa-fix `:684` (`git grep`). That is by design; `node` must
never join the allow-list (probe-boundary-rule §2). Both new blocks were therefore run by hand under
**bash and zsh**. Offer snippet, task.143 cycle 6: `SIGNAL=true`, file `skills/qa-next/SKILL.md`, in
both shells. Population command in a fixture repo: 3 hits in both shells. The shells agree. The
tests also execute both blocks under bash.

---

## New Findings This Cycle

First review. All findings are new.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine predicate | PASS | Verified | 15 rows + 5; source guard (group 7) green |
| Phase 2: route-table pins | PASS | Verified | 2 rows; see CR-7 on how strong the pin is |
| Phase 3: loop wiring | CONCERNS | Verified | CR-2 (silent failure), CR-4 (binding is prose only), CR-6 |
| Phase 4: qa-fix | CONCERNS | Verified | CR-1 (population), CR-3, CR-5 |
| Phase 5: docs and validation | PASS | Verified | CHANGELOG cites task 148; bundle:check clean |

**Overall Phase Completion**: 5/5 implemented; 2 with findings

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Fires on task.143 at cycles 2, 3, 6 only | PASS | rows 1–7 plus the whole-run test |
| Declines on HIGH present, differing files, missing file, unreadable; counts closed | PASS | rows 8, 10, 11, 12, 13 (plus 14, 15) |
| `classifyLoopRoute` unchanged on task.143's shape | PASS | 2 ROWS; CR-7 notes the pin is weaker than its comment claims |
| 5b offer runs from a consumer cwd, `signal: true` at cycle 3 | PASS | wiring test; hand run under bash and zsh |
| Step 2.6 triggers, moves, summary shape | PASS | qa-fix-structural-move.test.js |
| Population returns exactly 3 in the fixture repo | PASS | executed; but see CR-1 on the population's definition |
| Row 1 requires `Probe:` and cites obs #177 | PASS | test |
| Predicate and route tests under 1s | PASS | 109 tests in 0.36s |
| Temp dir only, no network | PASS | read from the tests |
| Every assertion mutation-proved | PASS | 14 recorded; 1 re-proved independently (below) |
| Group 7 source guard green | PASS | yes |
| ci:fast, bundle:check, validate | PASS | recorded at develop (4140/0); bundle:check re-run clean |
| CHANGELOG cites (task 148) | PASS | yes |
| Step 2.6 hand run recorded | PASS | desk application, disclosed as such |
| Observations actioned on merge | N/A | post-merge |

---

## Breaking Changes Validation

None declared, and none found: the new export is additive, and no route, row or trigger changes.
**Overall**: PASS

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue: Step 3.5 population misses hand-authored references (CR-1)**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.148.bug.1.population-misses-hand-authored-references.md](./task.148.bug.1.population-misses-hand-authored-references.md)
- **Observation**: 70 of 478 tracked `skills/*/references/*.md` are hand-authored (no AUTO-GENERATED marker), and the population never searches them.
- **Recommendation**: add the glob and exclude files by marker; strengthen the test decoy.

**Issue: offer snippet fails silently on a malformed HIGH sequence (CR-2)**
- **Severity**: MEDIUM · **Category**: Reliability
- **Bug Report**: [task.148.bug.2.offer-snippet-silent-on-bad-input.md](./task.148.bug.2.offer-snippet-silent-on-bad-input.md)
- **Observation**: `HIGH_SEQUENCE_JSON=''` → `rc=0 JSON=[] SIGNAL=[]`.
- **Recommendation**: parse inside a `try`, let the engine answer `high-counts-missing`, state the empty-output branch.

### LOW Severity Issues (advisory; see Code Review)

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: advisory only (CR-3 to CR-7)

---

## NFR Assessment

### Performance — PASS
The predicate is pure. 109 tests run in 0.36s.

### Reliability — CONCERNS
CR-2: the snippet reports "no offer" when it could not run.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary rule applied: `classifyNarrowingResidue` is an exported verdict predicate, so the first signal matches. No corpus sink applies, though. Its input is gate YAML written by the pipeline's own QA step, not untrusted input, and its verdict gates only whether an advisory prompt block is appended. Recorded as `boundary: false` with that reason. No input reaches a shell: the snippet passes values as argv to `node -e`, never through `eval`.

### Maintainability — PASS
The menu is a single statement held by a test. The rules are mutation-proved.

---

## Code Review

Whole branch diff (3199 lines, 32 files), one Explore subagent, first review.
`code_review_blocking=true` (pipeline override). CR-1 and CR-2 are `bug` + `high` confidence and
are promoted to gate `top_issues` as TASK-148-CR-1 and TASK-148-CR-2. Provenance (step 5b): both are
in code this branch added, not pre-existing.

**Correctness bugs (5):**
- [medium/high] `skills/qa-fix/SKILL.md:688` — the population leaves out 70 hand-authored `skills/*/references/*.md`; the test decoy cannot catch it → include them, exclude by marker. **Promoted (CR-1).**
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:894` — `JSON.parse` of the HIGH sequence sits outside the engine guard; a bad value gives empty output and rc 0 → parse in a `try`, state the empty branch. **Promoted (CR-2).**
- [medium/medium] `skills/qa-fix/SKILL.md:680` — "a population above 1 is Step 2.6's consolidate move" contradicts Step 2.6's "forbids nothing", and it is evaluated after Step 3 → reword it as a re-offer, or record the chosen move in `Probe:`.
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:899` — the four inputs are bound only in a prose table, not in the block; `$GATE_N` duplicates 5a's `$LATEST_GATE` → bind them in the block or reword "bound here".
- [low/low] `skills/qa-fix/SKILL.md:680` — the Step 7 fix-summary template has no slot for `Probe:` / `Narrowing residue:`.

**Cleanups (2):**
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:907` — the prompt shows "Narrowing residue: Narrowing residue — …" because the describer already starts with that prefix.
- `shared/resources/tests/qa-loop-route.test.mjs:348` — the "offer, not a route" pins are weaker than their comment says. A route folded in after the token check would not turn them red, and the engine test compares no pair.

**Boundary rule:** `boundary: false` (reason above). `probes_executed: 0`.

**Platform variance:** the new tests use `os.tmpdir()` only to build scratch repos, and no consumer validates that path. They were still re-run as `TMPDIR=/tmp node --test <3 new suites>`: 34/34, exit 0.

**Mutation spot-check (Step 3c):**
mutation-proven: HIGH condition narrowed to the latest gate only (`highPair[1] !== 0`) → row 8 → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `qa-diminishing-returns.test.mjs` (existing engine suite, incl. group 7) | PASS |
| `qa-loop-route.test.mjs` (existing 32 rows) | PASS |
| `tests/identity-rule-probe.test.js` (task.146, same Step 3.5) | PASS 7/7 |
| `npm run bundle:check` | PASS (129 skills, 0 problems) |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-narrowing-residue.test.mjs shared/resources/tests/qa-loop-route.test.mjs shared/resources/tests/qa-diminishing-returns.test.mjs evals/shared/tests/qa-narrowing-offer-wiring.test.mjs tests/qa-fix-structural-move.test.js tests/identity-rule-probe.test.js   # 109/109
TMPDIR=/tmp command node --test shared/resources/tests/qa-narrowing-residue.test.mjs evals/shared/tests/qa-narrowing-offer-wiring.test.mjs tests/qa-fix-structural-move.test.js   # 34/34
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
npm run bundle:check
```

### Coverage Report
Not measured. This repository's node suites have no coverage instrumentation. Coverage is by fixture rows and by mutation.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: widen the population to hand-authored references (P2).
2. CR-2: make the offer snippet fail loudly (P2).

### Short-term Actions (Non-Blocking)
1. CR-3 to CR-7 (advisory), listed above. The fixer may take CR-4 and CR-6 alongside CR-2, since they are in the same block.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two MEDIUM, high-confidence correctness bugs in new runnable prose. No HIGH finding. Every criterion is met as written.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed.

---

**Next Steps**: `/qa-fix` against gate 1.
