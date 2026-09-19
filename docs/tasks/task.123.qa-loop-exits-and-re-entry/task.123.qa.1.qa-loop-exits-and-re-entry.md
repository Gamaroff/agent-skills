# QA Report: Task 123 - The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Gate File**: [task.123.gate.1.qa-loop-exits-and-re-entry.yml](./task.123.gate.1.qa-loop-exits-and-re-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1 of the QA loop for task.123 (PR #435, commit `c6fdba3e`). The engine, the Stop hook and every suite are green — 3488 node tests, six bash suites, 34 replay scenarios, eight mutation proofs — and the three phases' file sets match the plan. The defects are in the **contracts the code serves**: the re-entry budget is fixed at `5 + k` while the cycle counter is reconstructed from gates on disk (a grant under-delivers in exactly the case it exists for, and fixture 12 contradicts the rule it ships); the `qa_phase` writer is a shell function defined in one fenced block and called from five others; the Stop hook's step-5 reason tells an orchestrator to leave the loop after any sub-skill; and seven consumers still say "three routes". Under `code_review_blocking=true` the HIGH gates the build.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`, 18/18 phases ticked)
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` green on `c6fdba3e`)
- [x] Breaking changes documented (none for consumers — absent fields read as today)
- [x] Code on feature branch with open PR (#435 → develop, OPEN)

### Testing Approach

- [x] Automated Testing (unit, bash suites, replay evals)
- [x] Regression Testing (full `ci:fast`; deliberately-untouched files verified untouched)
- [x] Security Review (reasoned — no boundary in the probe sense)
- [x] Code Review (Step 3b, whole-branch diff, read-only Explore reviewer)
- [x] Runnable-prose execution (Step 4b)
- [x] Mutation-proof spot check (Step 3c)
- [ ] Manual Testing — a live multi-cycle run is the consumer test, by definition a future run
- [ ] Performance Testing — not applicable (route 2c's cost is structural)

### Review Methodology

Direct tools first (default row of the Adaptive Review Strategy — 3 phases, medium risk, no auth/payments surface), plus one read-only Explore reviewer for Step 3b over the whole-branch diff (5960 lines with bundled `references/` copies excluded; 121 files). Standard mode, `code_review_blocking=true` from the pipeline. First review — no prior gate, no re-review scope.

Step 4b: runnable prose **applies** (four changed prose files with fenced bash). `qa-execute-snippets.mjs` refused every block of the step-5-6 doc (18 mutating — all `node`/`awk`/`jq`-bearing, fail-closed by the allow-list; 1 pre-existing template slot), so it reports `zero-blocks-executed`, which is the allow-list's own limitation rather than a defect of the diff. QA therefore executed the three new snippets **by hand under both shells**: `set_qa_phase` (5b written, `9` refused, no temp-file leak), the `MEDIUM_N` one-liner and the route-2c `classifyLoopRoute` invocation (both → `MEDIUM_N=1`, `route=gate-the-last-fix`), and the resume contract's reconstruction snippet on zero gates and on `1, 3, 10` — bash and zsh identical in every case. `develop-task/SKILL.md:48` and `develop-story/SKILL.md:51` (`cat .agents/skills/…/SKILL.md`) fail in the engine's temp directory; that block is pre-existing and unchanged by this diff.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Lock position (option B) | CONCERNS | Verified | Hook reads `qa_phase`, 5 → 7 advance, helper untouched — 23 + 37 bash tests green, 2 mutants caught. **CR-2**: the writer (`set_qa_phase`) cannot execute as documented. **CR-3**: the hook's reason text contradicts its own note. |
| Phase 2: Routes 2b and 2c | PASS | Verified | `classifyLoopRoute` fixture table (19 rows, 29 tests) green; 6 mutants caught; parity test extended; both runbook and §5c updated. CR-5 (fixture 11 asserts an invented gate key) and CR-7/CR-9 are low. |
| Phase 3: Re-entry | FAIL | Partial | Reconstruction from disk verified under both shells. **CR-1**: `QA_MAX_CYCLES = 5 + k` under-delivers the grant; fixture 12 contradicts the rule. CR-4: seven cardinality restatements, two in changed files. CR-6: escalation Action values have no row in the 5c sub-state table. |

**Overall Phase Completion**: 1/3 phases passed (1 CONCERNS, 1 FAIL)

Files deliberately not modified (`advance-pipeline-lock.sh`, `qa-task/SKILL.md`, `qa-story/SKILL.md`): confirmed untouched by `git diff origin/develop...HEAD --stat`.

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| PASS + LOW-only after two HIGH-0 cycles reaches 5c without 5b | route 2b | engine + fixture 10 (both sides) | PASS | PASS-only exclusion mutation-proven |
| HIGH-0, medium-falling loop at the budget gets one gated half-cycle before any escalation | route 2c | engine + fixture 11 (both sides) | PASS | fixture 11's gate-key assertion is vacuous (CR-5); the behaviour itself is pinned by the engine rows and `pipelineStepsRan` |
| `current_step` reads 5 for the whole loop; `qa_phase` names the sub-step; no hand `jq` on `current_step` | option B | hook + tests + parity test | CONCERNS | the writer is unreachable as documented (CR-2) |
| Re-invocation after a loop-limit halt offers the grant, counts on-disk gates, back-fills | Phase 3 | contract + SKILL.md + fixture 12 | FAIL | the grant's arithmetic is wrong (CR-1) |

**Performance**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Route 2c cost ≤ half a cycle | no fix, no suite re-run | one 5a, no 5b | PASS | structural |

**Code Quality**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every new route has a replay fixture and a mutation proof recorded | yes | 2 fixtures/route × 2 sides; 8 mutants in the Implementation Record | PASS | |
| Accepting-route set stated once (§5c) | consumers point, do not restate | seven consumers restate the **count** | CONCERNS | CR-4 |

**Migration**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Observations #72, #77, #95, #100, #112 close naming the PR | actioned | all five `actioned` naming PR #435 | PASS |

---

## Breaking Changes Validation

### Breaking Change: none declared
Documented: Yes (§5 — "None for consumers")
Migration Path Provided: N/A
Migration Tested: absent-field behaviour verified — a lock without `qa_phase` names 5a (on-stop scenario 10, absent rows); `extra_cycles_granted` absent → budget 5.
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: Grant budget is 5 + k while NEXT_CYCLE is reconstructed from disk**
- **Severity**: HIGH
- **Category**: Functional (contract)
- **Bug Report**: [task.123.bug.1.grant-budget-counts-from-five-not-from-disk.md](./task.123.bug.1.grant-budget-counts-from-five-not-from-disk.md)
- **Observation**: resume contract step 3, both SKILL.md Phase 0b blocks and Loop Setup fix `QA_MAX_CYCLES = 5 + extra_cycles_granted`; step 1 sets `NEXT_CYCLE = max gate + 1`. Fixture 12 runs `### QA Cycle 8` under `QA_MAX_CYCLES = 7` after `Running qa-fix (cycle 7 of 7)`.
- **Impact**: a grant of `k` delivers `k − (gates beyond 5)` cycles; after a route-2c half-cycle `k=1` re-escalates at once; a second grant can never extend past the first.
- **Recommendation**: `QA_MAX_CYCLES = QA_CYCLE at resume + extra_cycles_granted`; propagate to all four files and the parity pin; fix fixture 12 on both sides.
- **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: `set_qa_phase` defined in one fenced block, called bare from five others**
- **Severity**: MEDIUM · **Category**: Functional (contract) · **Bug Report**: [task.123.bug.2.set-qa-phase-defined-in-one-fence-called-in-others.md](./task.123.bug.2.set-qa-phase-defined-in-one-fence-called-in-others.md)
- **Observation**: each orchestrator Bash call is a fresh shell; the repo's own helpers (`high_files`, `_mtime`) define and call within one block. The function is unreachable at 5a, 5b, 5c, the half-cycle and the re-entry step.
- **Impact**: `qa_phase` is never written unless the agent re-pastes the function; the hook's default arm names `/qa-task` on a 5b/5c stall.
- **Recommendation**: `shared/resources/set-qa-phase.sh`, cited from the step doc so it bundles; invoked from the repository root at each call site; tested. · **Priority**: P1

**Issue: Stop hook's step-5 reason says "advance the lock to 7" after any sub-skill**
- **Severity**: MEDIUM · **Category**: Functional · **Bug Report**: [task.123.bug.3.stop-hook-step5-reason-tells-orchestrator-to-leave-loop.md](./task.123.bug.3.stop-hook-step5-reason-tells-orchestrator-to-leave-loop.md)
- **Observation**: rendered against a `qa_phase: 5b` lock: `Only once /qa-fix has actually completed: mark Step 5 ✅ … and advance the lock to 7`. The QA_LOOP_NOTE appended after it says the opposite. (Reviewer confidence medium; QA verified by rendering.)
- **Impact**: an orchestrator following the first sentence on a 5a/5b stall skips 5c.
- **Recommendation**: branch the sentence on `qa_phase`; scenario-10 rows for the negative. · **Priority**: P2

**Issue: "three routes" / "routes 1–3" survives in seven consumers**
- **Severity**: MEDIUM · **Category**: Quality (enumeration drift) · **Bug Report**: [task.123.bug.4.route-cardinality-restated-in-seven-unenumerated-sites.md](./task.123.bug.4.route-cardinality-restated-in-seven-unenumerated-sites.md)
- **Observation**: `grep -rn 'three routes\|routes 1–3'` — resume contract :129 (5c sub-state table), qa-flow.md:184, review-pr/SKILL.md:555, pr-conformance-prompt.md:64, qa-findings-ingester-prompt.md:28/:172, story-development.md:298, task-development.md:180.
- **Impact**: the conformance prompt and the findings ingester tell a reader a 2b/2c gate cannot reach 5c.
- **Recommendation**: fix every hit; `doesNotMatch(/three (accepting )?routes|routes 1–3/)` in the parity test's consumers loop. · **Priority**: P2

### LOW Severity Issues (5)

- **CR-5** (in `top_issues[]` — high-confidence bug): fixture 11 asserts `half-cycle: gate-the-last-fix` in `gate.6.yml`; no contract writes that key. Assert the implementation report's `**Half-cycle**` row instead.
- **CR-6** (advisory): the 5c sub-state table's `not reached` row sends both `Escalating —` Action values to 5a; give them a row pointing at the Re-entry rule.
- **CR-7** (advisory, verified): `KEY_RE` now captures ` id:` inside a preceding scalar — `readTopIssues` on `finding: "the user id: 42 is lost"` before the real `id:` yields `42 is lost"`. Anchor `id` to the key position; add a fixture row.
- **CR-8** (cleanup): CHANGELOG headline says "a lock position that can go backwards" — the design is the opposite.
- **CR-9** (cleanup): route-2c positive row label reads `4,3,2 → 1`; the engine evaluates `3 → 2 → 1`.
- (QA, documentation) the reconstruction snippet yields a **negative** `CYCLES_OUTSIDE_LOOP` when the report has entries with no gate on disk (measured: −2 on two entries / zero gates); the contract should say what that means.

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 5 (+1 doc note)

---

## NFR Assessment

### Performance — PASS
Route 2c is one 5a with no 5b and no extra suite run; the engine is linear in gate entries. Nothing in the diff runs on a hot path.

### Reliability — CONCERNS
CR-1 and CR-2 are both contract defects that make the shipped behaviour differ from the documented one in the re-entry and stall cases. The engine and hook are pinned by 64 node tests, 8 mutants and 2 bash suites; the rollback plan (revert the merge, re-bundle) is valid.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` for the probe rule: `classifyLoopRoute` is a route predicate over pipeline-authored artifacts, not a trust boundary; none of the corpus sinks is an input domain of this change. `set_qa_phase` validates its single argument against `5a|5b|5c`, writes through `mktemp` + `mv`, and interpolates nothing into a shell string. No network, no secrets.

### Maintainability — PASS
Fixture-first engine; one spelling of both lock fields enforced across eight files; the accepting-route set still stated once in §5c — with the seven cardinality restatements CR-4 names as the exception.

---

## Code Review

Step 3b — read-only Explore reviewer over the whole-branch diff (`code_review_blocking=true`, so `category: bug` + `confidence: high` entered the gate). `reviewed: 20 substantive files across the 5960-line diff, verified against the working tree; node suites executed (64/64 pass)`.

**Correctness bugs (7):**
- [high/high] `shared/resources/develop-pipeline-resume-contract.md:196` — `QA_MAX_CYCLES = 5 + extra_cycles_granted` while `NEXT_CYCLE` is highest gate + 1; fixture 12 contradicts the rule → budget relative to the reconstructed count. **→ gate TASK123-CR-1**
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:164` — `set_qa_phase` unreachable across fenced blocks → ship as a script. **→ gate TASK123-CR-2**
- [medium/medium] `shared/resources/develop-pipeline-on-stop.sh:206` — unconditional "advance the lock to 7" on a step-5 lock → branch on `qa_phase`. **→ gate TASK123-CR-3 (QA-verified)**
- [medium/high] `shared/resources/develop-pipeline-resume-contract.md:129` — route cardinality restated in seven unenumerated sites → fix + population check. **→ gate TASK123-CR-4**
- [low/high] `evals/develop-task/step-isolation/11-…/scenario.json:37` — vacuous gate-key assertion → assert the report row. **→ gate TASK123-CR-5**
- [low/medium] `shared/resources/develop-pipeline-resume-contract.md:130` — escalation Action values have no 5c sub-state row → add one. (advisory)
- [low/low] `shared/resources/qa-diminishing-returns.js:323` — `KEY_RE` captures ` id:` in a preceding scalar → anchor to the key position. (advisory; QA reproduced it)

**Cleanups (2):**
- `CHANGELOG.md:9` — headline says "a lock position that can go backwards" → reword to the `qa_phase` sub-position.
- `shared/resources/tests/qa-loop-route.test.mjs:200` — row label `4,3,2 → 1` vs evaluated `3 → 2 → 1` → relabel.

Promoted to `top_issues[]`: TASK123-CR-1, CR-2, CR-3, CR-4, CR-5. `probes_executed: 0`, `boundary: false` (see Security).

**Mutation-proof spot check (Step 3c)** — QA re-ran two of the eight proofs recorded in the Implementation Record, independently:
- mutation-proven: drop the PASS-only guard on route 2b → `2b is PASS-only: the same LOW-only queue under CONCERNS goes to 5b` (+5 more rows) → `covered`
- mutation-proven: Stop hook ignores `qa_phase` (`QA_PHASE=""`) → scenario-10 rows 5b/5c (task + story) → `covered`

**Platform variance**: no environment-derived value is passed to a validating consumer in this diff (the lock path is fixed, the fixtures are in-repo). Not applicable.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `qa-diminishing-returns.test.mjs` (34, pre-existing) incl. the group-7 "no HIGH counting" source check | PASS |
| `pr-review-loop-parity.test.mjs` (30) — extended, every pre-existing pin still holds | PASS |
| `advance-pipeline-lock.test.sh` (37) / `develop-pipeline-on-stop.test.sh` (23) | PASS |
| develop-bug's Stop-hook map (scenario 10 negative row) | PASS |
| `eval:all` — 34 replay scenarios incl. all pre-existing step-isolation fixtures | PASS |
| `bundle:check`, `check:generated`, `validate:all`, `lint:shell`, `format:check` | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-diminishing-returns.js`, `develop-pipeline-on-stop.sh` (+ test), `advance-pipeline-lock.test.sh`, `develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-hooks.md`, `pipeline-lock-cooperation.md`, `skills/develop-{task,story}/SKILL.md`, `shared/resources/tests/qa-loop-route.test.mjs` + 6 fixtures, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, `pr-review-loop-parity.test.mjs`, 6 replay fixtures, `docs/runbooks/qa-flow.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
npm run ci:fast                                   # 3488 pass / 0 fail / 1 skipped + 6 bash suites
node --test shared/resources/tests/qa-loop-route.test.mjs shared/resources/tests/qa-diminishing-returns.test.mjs
node --test evals/shared/tests/pr-review-loop-parity.test.mjs evals/shared/tests/qa-loop-lock-fields-parity.test.mjs
bash shared/resources/develop-pipeline-on-stop.test.sh; bash shared/resources/advance-pipeline-lock.test.sh
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
# manual bash+zsh execution of set_qa_phase, MEDIUM_N, route-2c invocation, reconstruction snippet
```

### Coverage Report
Not instrumented in this repository (node:test without coverage); the engine's 63 tests cover every exported function and every route arm, mutation-proven.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — budget relative to the reconstructed count; fix fixture 12 on both sides (P1)
2. CR-2 — `set-qa-phase.sh`, bundled, tested, invoked from the root (P1)
3. CR-3 — branch the hook's step-5 completion sentence on `qa_phase`; scenario-10 negatives (P2)
4. CR-4 — fix the seven restatements; population check in the parity test (P2)
5. CR-5 — assert the report's `**Half-cycle**` row instead of an invented gate key

### Short-term Actions (Non-Blocking)
1. CR-6, CR-7 (with a fixture row), CR-8, CR-9; state the meaning of a negative `CYCLES_OUTSIDE_LOOP`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence HIGH (the re-entry budget arithmetic) under `code_review_blocking=true`; three MEDIUMs in the contracts the green code serves.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-1 through CR-5 fixed and re-gated.

---

**QA Report**: co-located at `task.123.qa.1.qa-loop-exits-and-re-entry.md`
**Gate File**: co-located at `task.123.gate.1.qa-loop-exits-and-re-entry.yml`
**Next Steps**: `/qa-fix` on the gate; re-review (cycle 2 is a refute pass).
