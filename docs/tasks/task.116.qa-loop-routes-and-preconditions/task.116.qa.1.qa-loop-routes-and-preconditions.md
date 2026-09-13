# QA Report: Task 116 - The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Task**: [Link to task document](./task.116.qa-loop-routes-and-preconditions.md)
**Gate File**: [task.116.gate.1.qa-loop-routes-and-preconditions.yml](./task.116.gate.1.qa-loop-routes-and-preconditions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: CONCERNS

---

## Executive Summary

Every success criterion the task states is present in the tree, the suite is green (3267 tests, 3266 pass, 1 skipped, exit 0), the new parity tests are mutation-proven, and the replay fixture runs 5/5. Two MEDIUM findings keep this at CONCERNS: the rewritten §5b/§5c router — the task's headline change — leaves two legal gate shapes with **no** arm (a `PASS` carrying open LOW entries; a `WAIVED` with an inactive waiver), and five runbook lines still restate the `CONCERNS → qa-fix` rule the task removed. Both are one-cycle fixes. Two LOW findings ride along (stale "step 4" cross-references after the 3b renumbering; `subagents.wallClockMinutes` undocumented).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after CR-1 and DOC-1 close

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`)
- [x] All implementation phases completed (5/5 checkboxes)
- [x] Tests passing (`npm run ci:fast` exit 0)
- [x] Breaking changes documented (one, in §5 and CHANGELOG)
- [x] Code on feature branch with open PR (#404, OPEN, head `508d3b32`)

### Testing Approach

- [x] Automated Testing (hermetic suite + replay fixture)
- [x] Regression Testing (full `npm test` glob)
- [x] Security Review (boundary rule applied — `boundary: false`)
- [x] Code Review (Step 3b — one read-only Explore reviewer)
- [x] Mutation-proof spot check (Step 3c — three reverts)
- [x] Documented-command execution (Step 4b)

### Review Methodology

Direct tools plus one Step 3b reviewer subagent (standard mode; 4 phases across ~12 source files, medium risk — the "default" row of the Adaptive Review Strategy). No traceability mapper (Success Criteria is a list, not a table). First review — no re-review scope.

**Step 3b timing (dogfooding this task's own post-condition):** reviewer dispatched 08:03:30 UTC, returned 08:06:44 UTC (3 m 14 s; budget 10 m). Gate written 08:08:50 UTC, **after** the `code_review:` block was in hand. `Step 3b: no review outstanding` at Step 10 and Step 13.

**Step 4b:** runnable prose fires — the diff touches 8 files with fenced bash. Bound runs over the two QA skills: `qa-task` 17 blocks (2 runnable → executed bash+zsh, exit 0, no disagreement; 2 placeholder [`TRACKER`/`GITHUB_ISSUE_QA` unbound; one template slot]; 13 mutating — including the one fence this diff adds, `TMPDIR=/tmp node --test …`, correctly refused as `node` fail-closed), `qa-story` 15 blocks (2 runnable → exit 0; 3 placeholder; 10 mutating). The other six changed files gained no fence from this diff; their unbound runs report `zero-blocks-executed` on pre-existing placeholders — recorded as information, not attributed to this change. `zsh` available and run.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: routes | CONCERNS | Verified | Route 3 present in Outcome branching and §5c (3 mentions); 5b entry keyed on open entry; `pr-review-loop-parity` +2 tests, mutation-proven. **But** the arm set is not closed — see CR-1 |
| Phase 2: preconditions | PASS | Verified | Post-condition byte-identical in qa-task 3b / qa-story 1.6; gate-write precondition opens Step 10 / Output 2; publish precondition under Step 13 / Post QA Summary. Parity test pins all three |
| Phase 3: what QA runs, not reads | PASS | Verified | Boundary item points at `probe-boundary-rule.md` + corpus, reports `probes_executed`; platform-variance item with the `TMPDIR=/tmp` reproduction in 3b, 3c and `code-review-prompt.md` (as a `category: bug` note — schema unchanged) |
| Phase 4: subagents | CONCERNS | Verified | §Subagents table (unavailable / failed / slow), 10-min budget, liveness rule; 7/7 sites carry the pointer. **But** `subagents.wallClockMinutes` is undocumented in `configuration.md` (CR-3, low) |

**Overall Phase Completion**: 4/4 phases complete; 2 with findings

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | CONCERNS + empty `top_issues[]` reaches 5c; 5b entered only on an open finding | present + tested | present; 2 tests | PASS (with CR-1 caveat) | The set of routed shapes is not closed |
| 2 | Cannot write / publish a gate while a review is outstanding | both skills | both skills, verbatim; pinned | PASS | |
| 3 | 3b executes candidates when the boundary rule fires, reporting `probes_executed` | present | present, both skills | PASS | |
| 4 | Platform-variance check + command in 3b/3c and the review prompt | 3 sites | 5 mentions (task 2, story 2, prompt 1) | PASS | |
| 5 | Autonomous-defaults names unavailable / failed / slow; liveness sentence at every dispatch site | table + sites | table; 7/7 sites | PASS | |
| 6 | Observations #17 #20 #44 #51 #56 #62 close naming this PR | post-merge | not yet | N/A | Operator action after merge (review report noted this) |

**Code Quality:** `prettier --check .` clean; `npm run bundle` in sync (0 drift); `.gitignore` negation covers the new fixture (`git ls-files` shows all 5 files).

---

## Breaking Changes Validation

### Breaking Change: a CONCERNS / empty-queue gate now reaches 5c instead of halting
Documented: Yes (§5, CHANGELOG `### Changed`)
Migration Path Provided: N/A — behavioural, no consumer action
Migration Tested: Yes — replay fixture `09-qa-concerns-empty-gate-routes-to-5c` (qa-task → review-pr, qa-fix ×0)
Consumer Code Updated: **Partially** — `develop-next`'s merge gate already keys on open findings (task.113), but three runbooks still restate the old rule (DOC-1)

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: Outcome branching leaves two gate shapes unrouted**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.116.bug.1.unrouted-gate-shapes.md](./task.116.bug.1.unrouted-gate-shapes.md)
- **Observation**: the four arms cover `PASS`/no `top_issues`, `WAIVED`/active waiver, `CONCERNS`/no open entry, and `FAIL` or `CONCERNS`/open entry. A `PASS` with open LOW entries (legal under gate rule 5) and a `WAIVED` with `waiver.active: false` match none. The old catch-all sent both to the Convergence check.
- **Impact**: an orchestrator executing the prose meets an unrouted gate and improvises — the defect class this task exists to remove.
- **Recommendation**: add the closing arm and pin the closed set in the parity test.
- **Priority**: P1

**Issue: Consumer docs still restate "CONCERNS → qa-fix"**
- **Severity**: MEDIUM
- **Category**: Quality (documentation drift)
- **Bug Report**: [task.116.bug.2.consumer-docs-restate-old-route.md](./task.116.bug.2.consumer-docs-restate-old-route.md)
- **Observation**: `story-development.md:235,272`, `task-development.md:114,149`, `qa-flow.md:21` (mermaid).
- **Impact**: readers predict a halt the pipeline no longer produces.
- **Recommendation**: reword to key on an open finding; split the mermaid edge.
- **Priority**: P2

### LOW Severity Issues (2)

- **CR-2** — `skills/qa-task/SKILL.md:42` "Step 3b step 4" and `skills/qa-story/SKILL.md:82` "Phase 1.6 step 4" now point at the platform-variance item; Gate mapping is step 6. Update or anchor by name.
- **CR-3** — `subagents.wallClockMinutes` is named as a `skills-config.yaml` override but absent from `docs/reference/configuration.md` (Full schema + Key reference).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
Two hermetic test files (+10 assertions) and one replay scenario; `ci:fast` wall time unchanged in practice. The Step 3b wait is bounded by the budget, not additive.

### Reliability — PASS
Route 3 and the preconditions are mutation-proven by QA independently of the developer's proofs (below). Fast gate exit 0. Replay fixture 5/5. The parity test asserts exact prose, which is deliberate: two paraphrases are two rules.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned — no boundary delivered (`boundary: false`): the change set is prose, tests and a fixture; no predicate, parser, sanitiser or allow/deny-list. Nothing to probe.
- **Probes executed**: 0
- The one new fenced command (`TMPDIR=/tmp node --test …`) is refused by `qa-execute-snippets` as `node` fail-closed — the boundary rule holding on its own author.

### Maintainability — PASS
One-source rule held: the Subagents table lives once and seven sites point at it. The cost is real — 15–16 transitive bundled files into `qa-fix`, `review-task`, `review-story` (the closure `qa-task` already ships) — and is logged as observation #83 for the bundler rather than worked around by forking the table.

---

## Code Review

Reviewer: one read-only Explore subagent, whole branch diff excluding bundled `references/` (1395 lines, 17 files). Returned 3 findings; `code_review_blocking=true` (pipeline override) promotes `category: bug` + `confidence: high` to the gate — all three are, so **CR-1, CR-2, CR-3 entered `top_issues[]`** at their reviewer-assigned severities.

**Correctness bugs (3):**
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:259` — Outcome branching drops the old catch-all, leaving `PASS`+open LOW and `WAIVED`+inactive waiver unrouted → add the closing arm and pin the closed set.
- [low/high] `skills/qa-task/SKILL.md:488` (and `qa-story:82`) — "step 4" cross-references now point at the wrong item → update to step 6 or anchor by name.
- [low/high] `shared/resources/develop-pipeline-autonomous-defaults.md:54` — `subagents.wallClockMinutes` undocumented in `configuration.md` → add schema block + key row.

**Cleanups (0)**

**Boundary rule (3b item 3):** `boundary: false`, `probes_executed: 0` — legitimate skip, recorded.
**Platform variance (3b item 4):** no environment-derived value reaches a validating consumer in this diff (the new tests read files under `repoRoot`; the fixture runs in the runner's sandbox). Not applicable.

**Mutation proofs (Step 3c, run by QA):**
```
mutation-proven: §5c route-3 list entry reduced to bare `CONCERNS` → "5b is entered on an open finding, never on the verdict token" (+1) → covered
mutation-proven: qa-story publish precondition demoted to "Note." → "the publish step refuses to post a gate the gate step could not have written — both skills" (+1) → covered
mutation-proven: wall-clock default sentence removed → "autonomous-defaults carries the unavailable / failed / slow table, the budget, and the liveness rule" (+1) → covered
```
Each: mutation applied 1→0, predicted test red first, baseline `fail 0` after restore from `cp` snapshot. Developer's own proofs (router revert; 10 single-behaviour reverts) recorded in the implementation report; QA re-ran three, not all — three of thirteen.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm test` via `ci:fast`) | PASS — 3267 / 3266 / 0 fail / 1 skipped |
| `prettier --check .` | PASS |
| Bundle freshness (`npm run bundle` → `git status`) | PASS — 0 drift |
| Existing parity tests (`qa-execution-step-parity`, `pr-review-loop-parity` ×25 pre-existing) | PASS |
| Replay scenario `09-qa-concerns-empty-gate-routes-to-5c` | PASS 5/5 |
| Tracked-tree link test | PASS (bundled refs staged before the run) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-autonomous-defaults.md`, `develop-pipeline-step-3-develop-loop.md`, `code-review-prompt.md`; `skills/{qa-task,qa-story,qa-fix,review-task,review-story}/SKILL.md`; `evals/shared/tests/{pr-review-loop-parity,qa-gate-preconditions-parity}.test.mjs`; `evals/develop-task/step-isolation/09-*/`; `CHANGELOG.md`; `docs/runbooks/{story-development,task-development,qa-flow}.md` (sweep).

### Test Commands Executed
```bash
npm run ci:fast                                  # → .claude/state/t116-qa-testlog.txt, TEST_EXIT=0
node --test evals/shared/tests/pr-review-loop-parity.test.mjs        # 27 pass
node --test evals/shared/tests/qa-gate-preconditions-parity.test.mjs # 8 pass
node evals/shared/runner.mjs evals/develop-task/step-isolation/09-qa-concerns-empty-gate-routes-to-5c
node shared/resources/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --bind TASK_FILE=… --bind TASK_DIR=… --json
node shared/resources/qa-execute-snippets.mjs --file skills/qa-story/SKILL.md --bind STORY_FILE=… --bind STORY_DIR=… --json
```

### Coverage Report
Not instrumented (prose + `node --test`); assertion-level coverage is the mutation-proof record above.

---

## Recommendations

### Immediate Actions (Blocking)
1. **CR-1** — close the unrouted shapes in Outcome branching; extend `pr-review-loop-parity.test.mjs` to assert the arm set is exhaustive over `{PASS, WAIVED, CONCERNS, FAIL} × {no open, open}`.
2. **DOC-1** — reword the five runbook lines; split the `qa-flow.md` mermaid edge.

### Short-term Actions (Non-Blocking)
1. **CR-2** — fix the two "step 4" cross-references.
2. **CR-3** — document `subagents.wallClockMinutes` in `configuration.md`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: rule 2 — two MEDIUM entries in `top_issues[]` (no HIGH; no NFR below PASS). The work delivers every criterion; the router's arm set is simply not yet closed, and the docs that restate the router have not caught up.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 closed; DOC-1 closed

---

**QA Report**: co-located at `task.116.qa.1.qa-loop-routes-and-preconditions.md`
**Gate File**: co-located at `task.116.gate.1.qa-loop-routes-and-preconditions.yml`
**Next Steps**: `/qa-fix` on the gate (cycle 1 of 5) → re-review
