# QA Report: Task 165 - Close task.164's deferred follow-ups

**Task**: [task.165.task-164-deferred-follow-ups.md](./task.165.task-164-deferred-follow-ups.md)
**Gate File**: [task.165.gate.1.task-164-deferred-follow-ups.yml](./task.165.gate.1.task-164-deferred-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Testing Completed**: 2026-10-26
**Gate Status**: CONCERNS

---

## Executive Summary

Every phase is delivered, every functional criterion is held by a committed test, and all eight
mutation proofs go red. One MEDIUM finding stands. The two new review-skill gates are boundaries:
each decides on repository state whether the pipeline advances. Both refuse silently, so the
probe engine's `fence:` form declines every hostile case and `probes_executed` is 0. Two LOW
findings from the diff review are prose accuracy issues.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after the boundary is made probeable

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (20/20 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none — section 5)
- [x] Code on feature branch with open PR (#757)

### Testing Approach

- [x] Automated Testing (unit, executed prose)
- [x] Performance Testing (4b meta-test wall-clock)
- [x] Regression Testing (`ci:fast`)
- [x] Security Review (boundary rule, `fence:` probe)
- [x] Code Review (Step 3b, independent Explore reviewer)

### Review Methodology

Direct tools. The task has 5 phases in one area (pipeline-lock prose and its tests), Low risk.
First review, so the diff review read the whole branch diff (`origin/develop...HEAD`, 21 files).
The reviewer was dispatched at 15:28:58Z and returned at 15:32:04Z (`duration_ms` 176454).

Step 4b ran: the change set modifies two `SKILL.md` files and two `shared/resources/*.md` files with
fenced bash blocks. Only bash ran; zsh is not installed on this host (`zsh-unavailable`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Exception 2 wording | PASS | Verified | Banner source and three bundled copies match; pinned by the HALT pin |
| Phase 2: HALT pin and hook floor | PASS | Verified | Boundary-aware name match; mapping read from its own `case` block; floor checks both bindings |
| Phase 3: 4b meta-test early exit | PASS | Verified | Full lock test still 102/0; meta-test asserts the NOTE in all three cases |
| Phase 4: review-skill lock cooperation | PASS | Verified | Both blocks gated on outcome and promotion; `review-lock-cooperation.test.mjs` runs them as written |
| Phase 5: proof and gates | PASS | Verified | 8/8 mutations re-run by QA, all red, all restores `cmp`-clean |

**Overall Phase Completion**: 5/5 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Exception 2 wording pinned | 4 phrases pinned | Pinned | PASS | `step-8-completion-checklist.test.mjs` HALT pin; mutation M2 red |
| HALT pin refuses a plain-prose relisting | Red on relisting, not on `develop-*` | As stated | PASS | Positive-control assertion in the same test; mutation M1 red |
| Mapping parsed from its own `case` block | Decoy arm not read | As stated | PASS | Mutation M4: old parse read `x→9`, new parse ignores it |
| Hook floor names the binding | Red naming `ALREADY_DONE` | As stated | PASS | Loop over both bindings; mutation M3 red |
| Review skills advance only on a pass | READY/GO plus promoted → 3, else 2 | As stated | PASS | `review-lock-cooperation.test.mjs` 3/3; mutations M6, M7, M8 red |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| 4b meta-test wall-clock | ≤ half of 17.9s | 1.0s | PASS | Before: `54636ed0`, load 4.78–5.12. After: PR head `863f625d`, load 0.99. Recorded in the implementation report's Step 4 decisions, committed at Step 8 |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `ci:fast` with `.agents/skills` aside | pass | 6392 tests, 6378 pass, 0 fail (14 skipped) | PASS | Run by QA on the committed tree |
| `lint:shell` | clean | clean | PASS | Run at Step 3 |
| `bundle:check` | 0 problems | 0 problems | PASS | Re-run by QA |
| `quick_validate` review-task, review-story | ✓ | ✓ ✓ | PASS | Re-run by QA |
| Mutation proofs | 8/8 as stated | 8/8 | PASS | Re-run by QA |
| CHANGELOG entry | cites task 165 | Present | PASS | `[Unreleased]` › `### Fixed` |

---

## Breaking Changes Validation

None. Section 5 of the task records no breaking change. The review skills' self-advance moves the
lock less often than before, never more, and the orchestrator's own Step 2 → 3 advance is unchanged.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue QA-1: the review-skill gates are boundaries that no probe executed**

- **Severity**: MEDIUM
- **Category**: Security (boundary evidence)
- **Observation**: Both new blocks (`skills/review-task/SKILL.md` § Pipeline Lock Cooperation,
  `skills/review-story/SKILL.md` § Pipeline Lock Cooperation) refuse to advance the lock on
  repository state, the document's `status:`. That makes them boundaries under the repo-state signal.
  QA ran the engine's `fence:` form with slot `{outcome}` and eight cases: one legitimate, seven
  hostile (failed outcome, unpromoted, quoted status, suffixed status, lowercase outcome, trailing
  space, no lock). The legitimate case was accepted. Every hostile case was declined with
  `no-hostile-evidence`, because the guard prints nothing when it refuses. The engine scores a
  hostile `fence:` case only against the guard's own refusal output.
- **Impact**: `probes_executed` is 0 on a boundary, and `/finalise`'s zero-guard fails the same
  record. The committed executed-prose test covers four cases per skill. It is not a probe.
- **Recommendation**: In both blocks, print one refusal line when the lock exists and the review did
  not pass (an `elif [ -f .claude/state/develop-pipeline.lock ]` branch). Then re-run the `fence:`
  probe with each hostile case expecting that line, and record the run.
- **Priority**: P2

### LOW Severity Issues (2)

- **QA-2 (CR-1)** `skills/review-story/SKILL.md:2892`: the prose says every GO that did not promote
  HALTs. A GO on a story already `in-progress` proceeds (develop-story post-review table). In that
  case the self-advance does nothing and the orchestrator's own Step 2 → 3 advance moves the lock.
  The behaviour is correct but the sentence is not. review-task's prose already names the
  orchestrator's advance. Fix the wording, and add an `in-progress` row to the cooperation test.
- **QA-3 (CR-2)** `skills/review-task/SKILL.md:2325`: the heading names `/develop-story`, which
  never invokes review-task. Narrow it to `/develop-task`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

The 4b meta-test went from 17.9s to 1.0s. The full lock test file is unchanged at 102 scenarios.

### Reliability — PASS

Both gates fail safe. Any outcome text other than the exact pass token, or any status other than
`ready-for-development`, leaves the lock where it is, and the orchestrator still advances on a
proceed path. With no lock, both blocks are no-ops (tested).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: true`. The `fence:` probe ran (1 legitimate case accepted), and all 7 hostile cases
  were declined because the gate refuses silently. See QA-1.

### Maintainability — PASS

The mapping is still stated once, in the `--skill` case. The banner cites it rather than listing
it, and the test reads it from its own block.

---

## Code Review

Independent read-only Explore reviewer over the whole branch diff. Advisory unless promoted. No
finding was `category: bug` with `confidence: high`, so none was promoted under
`code_review_blocking`.

**Correctness bugs (1):**

- [low/medium] `skills/review-story/SKILL.md:2892` — the gate reports one "do not advance" for a
  failed or unpromoted story and for a GO on an `in-progress` story, which proceeds, so the prose
  that every unpromoted GO HALTs is inaccurate → reword, add an `in-progress` test row (QA-2)

**Cleanups (1):**

- `skills/review-task/SKILL.md:2325` — the heading names `/develop-story`, which never invokes
  review-task → narrow it to `/develop-task` (QA-3)

Anchors: `finding-anchors.js` → `ok` for both.

**Boundary:** `true` — the two review-skill gates (repo-state refusal). `probes_executed: 0`,
`escaped: 0`. The `fence:` run returned `no-hostile-evidence` (QA-1).

**Step 4b (executed prose):** changed blocks: 2 (one per `SKILL.md`), both classified `mutating`
(they call `advance-pipeline-lock.sh`), 0 executed by the engine. `changed-blocks-not-executed` and
`zero-blocks-executed` were reported for both `SKILL.md` files. The file-level blocks are the
skills' existing placeholder and mutating blocks. The two changed blocks are executed by the
committed `review-lock-cooperation.test.mjs`, which binds `{outcome}` and the document slot and runs
each block in a consumer-shaped temp root. `pipeline-lock-cooperation.md`: `no-executable-blocks`
(2 blocks, both mutating by design). Banner doc: no bash blocks.

**Mutation proofs (re-run by QA):**

- mutation-proven: Exception 2 relists develop and create-pr in plain prose → HALT pin → covered
- mutation-proven: Exception 2's contrast reverts to "every other block" → HALT pin → covered
- mutation-proven: `ALREADY_DONE` loses `--complete` while a new echo carries it → hook floor → covered
- mutation-proven: decoy `x) NEXT=9` in the early-exit arm → mapping parse (old reads it, new ignores it) → covered
- mutation-proven: 4b early exit removed → 4b meta-test → covered
- mutation-proven: review-task gate removed → review-lock-cooperation test → covered
- mutation-proven: review-story gate removed → review-lock-cooperation test → covered
- mutation-proven: review-task promotion check removed → review-lock-cooperation test → covered

8 of 8 proven.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full `ci:fast` suite, `.agents/skills` moved aside | PASS — 6392 tests, 0 fail, exit 0 |
| `advance-pipeline-lock.test.sh` full run (no seam) | PASS — 102 passed, 0 failed, no `4b-only` NOTE |
| Bundled copies vs sources (`bundle:check`) | PASS |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/develop-pipeline-remaining-work-banner.md`
- `shared/resources/pipeline-lock-cooperation.md`
- `shared/resources/advance-pipeline-lock.test.sh`
- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- `shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs`
- `shared/resources/tests/review-lock-cooperation.test.mjs`
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`

### Test Commands Executed

```bash
command node --test shared/resources/tests/step-8-completion-checklist.test.mjs \
  shared/resources/tests/review-lock-cooperation.test.mjs \
  shared/resources/tests/advance-pipeline-lock-4b-setup.test.mjs tests/bundled-links.test.js   # 77/77
bash shared/resources/advance-pipeline-lock.test.sh                                             # 102 passed, 0 failed
python3 skills/create-skill/scripts/quick_validate.py skills/review-task/                       # ✓
python3 skills/create-skill/scripts/quick_validate.py skills/review-story/                      # ✓
npm run bundle:check                                                                           # 0 problems
command node .claude/state/t165-mut.mjs                                                        # 8/8
npm run ci:fast   # with .agents/skills moved aside
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename \
  --entry 'fence:skills/review-task/SKILL.md#Pipeline Lock Cooperation (when invoked by `/develop-story` or `/develop-task`)' \
  --slot '{outcome}' --cases-file <8 cases> --repo-root . --json                               # no-hostile-evidence
```

Standards-named validation: `npm run validate -- skills/<changed-skill>/` ran for review-task and
review-story (via `quick_validate.py`, which is what it calls).

### Coverage Report

Not measured. This repository runs `node:test` without a coverage reporter.

---

## Recommendations

### Immediate Actions (Blocking)

1. QA-1: give both gates a refusal line and probe them with `fence:` (P2).

### Short-term Actions (Non-Blocking)

1. QA-2: reword review-story's "unpromoted GO HALTs" sentence and add an `in-progress` test row.
2. QA-3: narrow review-task's cooperation heading to `/develop-task`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One MEDIUM finding (the boundary has no executed probe) and the Security NFR at
CONCERNS. No HIGH finding.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA-1 closed by a recorded `fence:` probe run with `executed` > 0.

---

**QA Report**: co-located at `task.165.qa.1.task-164-deferred-follow-ups.md`
**Gate File**: co-located at `task.165.gate.1.task-164-deferred-follow-ups.yml`
**Next Steps**: `/qa-fix` for QA-1 to QA-3, then QA cycle 2
