# QA Report: Task 201 - Pipeline up-front answers and speed modes

**Task**: [task.201.pipeline-upfront-answers-and-speed-modes.md](./task.201.pipeline-upfront-answers-and-speed-modes.md)
**Gate File**: [task.201.gate.1.pipeline-upfront-answers-and-speed-modes.yml](./task.201.gate.1.pipeline-upfront-answers-and-speed-modes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-10
**Testing Completed**: 2026-10-10
**Gate Status**: FAIL

---

## Executive Summary

First review of PR #632. The engines are sound and well tested, but the §0d prose block that calls the
resolver cannot run as written (it reads two values no line of the block binds), so the headline
behaviour — answers resolved before Phase 0d asks — does not happen. Resume ignores a changed mode or
skip, and branch flag values are not validated before they reach git.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Progress Tracking 5/5)
- [x] Tests passing (`npm run ci:fast`: 5263 pass, 0 fail, at the reviewed head)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#632, OPEN)

### Testing Approach

- [x] Automated Testing (unit + doc guards)
- [x] Regression Testing (full fast gate)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b subagent)

### Review Methodology

Direct tools for the document checks; one Explore subagent for the diff review (returned in 162 s,
from its `duration_ms`). The diff given to the reviewer excluded the generated `skills/*/references/`
copies (`npm run bundle` output, checked separately by `bundle:check`); the sources under
`shared/resources/` were reviewed instead. **Independence note:** the same session wrote the code,
so this cycle's own findings (QA-3) carry no independence.

Step 4b: `qa-execute-snippets.mjs` over the ten changed prose files. Runnable blocks executed: 3
(step-1, step-5-6, develop-bug step-0). `zero-blocks-executed` on step-0, step-2, review-task and
review-story — every new block there is placeholder or mutating (writes `.claude/state`, calls
`node`), so the run was under-configured rather than failing; the resolve call's flags are held
instead by `pipeline-answers-docs.test.mjs` 2. One execution failure, at
`develop-bug-step-0-resolve-bug.md:39`, is **pre-existing**: the same block fails identically on
`origin/develop` (routed to `recommendations.future`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Step timestamps | PASS | Verified | `pipeline-answers-docs.test.mjs` 1a/1b |
| 2: Answer resolution and `--defaults` | FAIL | Partial | Engine PASS (44 tests); §0d block cannot run (QA-1); resume (QA-2) |
| 3: Step 2 reuse | PASS | Verified | freshness 7a–7h, writer 1a–3; CR-4 low |
| 4: Speed modes and waivers | CONCERNS | Verified | gateFor 6a–6e; QA-3 |
| 5: develop-bug parity and close-out | PASS | Verified | resolver 8a–8e; docs present |

**Overall Phase Completion**: 3/5 phases passed

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| No flags, no policy → unchanged | PASS | `pipeline-answers.test.mjs` 2a |
| `--defaults` → zero questions, sources shown | **FAIL** | engine 1a passes, but the §0d block aborts on `${PIPELINE_MODE:?}` before calling it (QA-1) |
| Flag contradicting `branch_model` is asked | **FAIL** | engine 3a passes, but §0d always passes an empty `--epic-branch` (QA-1) |
| `--skip` outside allow-list refused | PASS | 4a, 4c, 4d |
| Skip → `WAIVED` with reason and approver; DoD shows it | PASS | 6a–6e; docs test 3a/3b |
| No floor step skippable | PASS | 4c |
| Resume reuses persisted answers | CONCERNS | Q keys: 7a–7d PASS; mode/skips not persisted on resume (QA-2) |
| Step 2 skipped on a current review | PASS | freshness 7a–7h; docs test 4a/4b |
| ISO timestamp per step | PASS | docs test 1a/1b |
| No consumer-specific names | PASS | read of the diff |
| `npm run ci` green | not run | `ci:fast` green; the eval tier runs at the merge gate |
| Orchestrators no longer restate the questions | PASS | directive guard (task.201 cases) |

---

## Breaking Changes Validation

None declared. With no flags and no policy the resolver returns today's questions (2a). PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**QA-1: The §0d resolve block reads values it does not bind**
- **Category**: Functional
- **Observation**: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:706` reads `${PIPELINE_MODE:?…}` and `:714` reads `${EPIC_BRANCH:-}`; neither is assigned in the block, and every fenced block runs as its own shell.
- **Impact**: every story/task Phase 0d aborts at the guard; when bound by hand, `EPIC_BRANCH` is still empty, so an epic-integration conflict is never detected and develop-batch's HALT cannot fire. The two INPUTS entries added to `tests/unbound-default-reads.test.js` made the guard test pass over the defect.
- **Recommendation**: pass both as `{placeholders}`; remove the INPUTS entries; assert in the docs test that the resolve block reads no unbound variable.

### MEDIUM Severity Issues (2)

**QA-2: Resume re-resolves mode and skips** — `pipeline-answers.js` reads only the question keys from `persisted`; a resume with a different `--mode`/`--skip` reports one value in 0f while Steps 2/5/5c read the lock's old one. Read them as `persisted` and refuse a disagreeing flag with the reason.

**QA-3: Branch flag values are not validated** — `--base=-f`, whitespace or shell metacharacters are accepted and later interpolated into git commands. Add an exported `isRefName` predicate and probe it.

### LOW Severity Issues (1)

**CR-4**: `record-reviewed-blob.js` removes only one spelling of the stamp the reader accepts four ways; re-stamping a bare or list-item stamp yields `report-blob-ambiguous`.

Bug report files: not created — each finding is carried in the gate's `top_issues[]`, which `/qa-fix` consumes.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
Pure engines, a handful of string operations per call.

### Reliability — CONCERNS
QA-1 (Phase 0d aborts), QA-2 (resume silently ignores a changed setting).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- Boundary: `resolveAnswers` accepts or refuses flags (`boundary: true`), but it exports no boolean predicate the probe engine can score, and no corpus sink models a git ref name — so nothing was executed. QA-3 names the remedy (export `isRefName`, probe it with a cases file).

### Maintainability — CONCERNS
Two definitions of the stamp line (CR-4). Otherwise clear headers, tests beside each engine.

---

## Code Review

Advisory except where promoted. `code_review_blocking=true` (pipeline override).

**Correctness bugs (4):**
- [high/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:714` — `${EPIC_BRANCH:-}` has no writer in the block → bind it from a placeholder. (Confirmed by QA → QA-1.)
- [medium/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:706` — `${PIPELINE_MODE:?}` has no writer → bind from a placeholder. (Confirmed → QA-1.)
- [medium/medium] `shared/resources/pipeline-answers.js:492` — persisted mode/skips not reused on resume. (Confirmed → QA-2.)
- [low/high] `shared/resources/record-reviewed-blob.js:43` — writer and reader disagree on the stamp's spellings. **Promoted to `top_issues` as CR-4.**

**Cleanups (1):**
- `shared/resources/record-reviewed-blob.js:35` — anchor search sees fenced lines → use the blanked-prose view (`recommendations.future`).

All five anchors: `anchor_check: ok`.

mutation-proven: (not run this cycle — no fix was made this cycle; the engine's own mutation group 10 covers six rules and passed)

---

## Regression Testing

Full fast gate at the reviewed head: 5263 pass, 0 fail. `lint:shell` clean, `bundle:check` 0
problems, `validate:all` 129 passed. PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
npm run validate:all
npm run lint:shell
npm run bundle:check
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings> --root . --rev HEAD --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. QA-1 — bind the §0d block's inputs as placeholders; remove the INPUTS entries.
2. QA-2 — persist and reuse mode/skips on resume.
3. QA-3 — validate branch values; export and probe the predicate.
4. CR-4 — one matcher for the stamp line.

### Short-term Actions (Non-Blocking)
1. CR-5 — anchor on blanked prose.
2. Pre-existing `develop-bug-step-0-resolve-bug.md:39` block failure — separate follow-up.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH (QA-1) — the feature's entry point does not run.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.201.qa.1.pipeline-upfront-answers-and-speed-modes.md`
**Gate File**: co-located at `task.201.gate.1.pipeline-upfront-answers-and-speed-modes.yml`
**Next Steps**: `/qa-fix` cycle 1, then re-review (cycle 2, refute pass).
