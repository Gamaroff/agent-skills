# QA Report: Task 72 — Pin the bug-axis divergence exactly instead of asserting it loosely

**Task**: [task.72.pin-bug-axis-divergence.md](./task.72.pin-bug-axis-divergence.md)
**Gate File**: [task.72.gate.1.pin-bug-axis-divergence.yml](./task.72.gate.1.pin-bug-axis-divergence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-01
**PR**: [#296](https://github.com/Gamaroff/agent-skills/pull/296) → `develop`
**Gate Status**: CONCERNS

---

## Executive Summary

The core change is correct, complete, and unusually well proven. The bug half of `16/H1` now asserts the gap exactly, the anti-vacuity guard survives intact, and the rationale is recorded at all three sites a reader lands on. Five independent probes establish that the new assertion is non-vacuous **and correctly scoped** — it measures the gap rather than either set.

One MEDIUM issue was introduced by the change itself: an editing artifact in `select-next.mjs` left a pre-existing clause attached to the wrong antecedent, in the very comment block this task exists to make accurate.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — resolve TASK72-001, re-run suite

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3, all checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented — §5 declares none, and QA confirms none
- [x] Code on feature branch `feature/task.72.pin-bug-axis-divergence` with open PR #296

### Testing Approach

- [x] Automated Testing (unit + full hermetic suite)
- [x] Regression Testing
- [x] Code Review (diff, Step 3b)
- [x] Mutation / vacuity proving (Step 3c)
- [ ] Performance Testing — N/A, no runtime path changes
- [ ] Manual Testing — N/A, no user-facing surface

### Review Methodology

**Direct tools.** Adaptive Review Strategy: 3 phases, single module (`develop-next` plus its eval lane), `risk_level: low`, and a diff that is test-and-comment only. Not lite mode (`phase_count` is 3, so the pipeline computed `standard`), but the direct-tools row applies on task size and risk. Subagent dispatch was additionally unavailable in this session; all verification was performed directly against the files, which for a diff this size is stronger than a summary.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Pin the gap | PASS | Verified | Subset loop replaced by `assert.deepStrictEqual(gap, ["in-progress","ready-for-qa"], …)` on the sorted difference. Guard preserved **verbatim** — byte-compared against `origin/develop`. Test renamed. Failure message names the parsed set, the floor, the current gap and the meaning of each direction. |
| Phase 2: Record the rationale | CONCERNS | Verified | All three sites updated and the resume-affordance argument leads in each. **TASK72-001** — the `select-next.mjs` insertion stranded the trailing `Pinned by …` clause on the wrong antecedent. |
| Phase 3: Verify and mutation-prove | PASS | Verified | `npm run ci:fast` exit 0 — 2141 tests, 0 failures, `prettier --check` clean. Four mutations proved and reverted; QA added a fifth probe. |

**Overall Phase Completion**: 3/3 phases implemented; 1 phase carries a finding.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| No bug's selectability changes — `BUG_ELIGIBLE_STATUSES` byte-identical | unchanged | `git diff origin/develop...HEAD` shows no change to the constant | PASS |
| Task axis assertion unchanged and passing | unchanged | untouched in diff; passing | PASS |
| Full suite green | 0 failures | 2141 tests, 0 failures | PASS |

### Structural

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Gap asserted exactly, not as a subset | exact | `deepStrictEqual` on the sorted difference | PASS |
| Growing the gap fails the test | red | Mutation 2 → RED | PASS |
| Closing the gap fails the test | red | Mutation 1 → RED | PASS |
| Anti-vacuity guard preserved and still catches a wrong parse | preserved | byte-identical; Mutation 4 → RED **via the guard** | PASS |

### Documentation

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Comment leads with the resume-affordance reason, not risk | leads | Leads in all three sites | PASS |
| `roadmap-selection.md` / `select-next.mjs` no longer describe the bug axis as keeping "the weaker `⊆`" | removed | Removed; the one surviving mention is explicitly historical ("was *originally*") | PASS |
| Comment blocks are accurate | accurate | **TASK72-001** — one clause now reads against the wrong antecedent | CONCERNS |

---

## Breaking Changes Validation

### Breaking Change: none declared (§5)

- Documented: **Yes** — §5 states none, with reasoning
- Migration Path Provided: **N/A**
- Consumer Code Updated: **N/A**
- **QA verification**: independently confirmed. `BUG_ELIGIBLE_STATUSES` is byte-identical to `develop`, so the set of selectable bugs is unchanged. The only behavioural difference is in CI detection.
- **CHANGELOG exclusion verified correct.** §5 declines an entry because nothing observable changes. QA additionally confirmed the *existing* task-71 entry at `CHANGELOG.md:387` — which describes the gap as "left open on purpose" — is an append-only historical release record and correctly left untouched.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: TASK72-001 — inserted sentences stranded the `Pinned by …` clause on the wrong antecedent**

- **Severity**: MEDIUM
- **Category**: Quality / documentation accuracy
- **Location**: `skills/develop-next/scripts/select-next.mjs:69-76` (the defect is at line 73)
- **Observation**: The paragraph originally ran *"…would happily accept. Pinned by `evals/…/select-next.test.mjs` §\"eligibility floor vs dispatcher\", which parses `develop-task`'s own status table and fails on a divergence in EITHER direction."* — one continuous statement about the **task** axis. Two sentences about task 72 were inserted *between* "accept." and "Pinned by", so the block now reads *"…the bug axis asserts a known two-status gap. Pinned by `evals/…`, which parses `develop-task`'s own status table…"*
- **Impact**: A reader attaches the `Pinned by` clause to the bug-axis sentence immediately preceding it. That reading is wrong twice over — the bug assertion parses **`develop-bug`'s** table, not `develop-task`'s, and it is not the assertion that "fails on a divergence in EITHER direction … under-widening and over-widening both" (that phrasing describes the task axis's two-way equality). No runtime effect, but this is a comment block whose job is to tell the next maintainer which assertion pins which axis — and this task exists precisely because loosely-worded guarantees let drift through. Line 73 is also 89 characters against the block's 73–81 wrap.
- **Recommendation**: Move the two task-72 sentences to the **end** of the paragraph, after "…under-widening and over-widening both.", so the `Pinned by` clause keeps its original antecedent. Re-wrap to ~78 columns.
- **Priority**: P2

### LOW Severity Issues (0)

None.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
No runtime path changes; `select-next.mjs` behaviour is byte-identical apart from comments. The new assertion adds one filter+sort over a 4-element set at test time. The develop-next unit lane runs in 2.16s, unchanged.

### Reliability — PASS
The change strictly increases what the build detects and cannot reduce it. Rollback is one test file with no source change, exactly as §11 describes. Five probes (below) establish the assertion is neither vacuous nor over-tight.

### Security — PASS
No security surface: no auth, input handling, secrets, network or dependency changes. No new dependencies.

### Maintainability — CONCERNS
The rationale is now recorded at all three sites a maintainer would consult, and the guard carries a comment explaining why it is not redundant with `deepStrictEqual` — a question that would otherwise be re-litigated. Offsetting this, TASK72-001 leaves one comment block less accurate than it was before the change.

---

## Code Review

**Correctness bugs (0):** none identified. The assertion logic is sound — `.sort()` on `["in-progress","ready-for-qa"]` is stable and alphabetically correct, `proceedStatuses()` is reused unchanged with its own `sawRow` guard, and `STEP0_BUG` correctly resolves through the git-tracked `skills/` path rather than the gitignored `.agents/skills/` symlink (which the plan flags as a pass-locally-fail-in-CI trap).

**Cleanups (1):**
- `skills/develop-next/scripts/select-next.mjs:73` — inserted sentences stranded the `Pinned by …` clause on the wrong antecedent; over-long line. → Move the insertion to the end of the paragraph and re-wrap. **Promoted to gate `top_issues` as TASK72-001** on severity, not via `code_review_blocking` (which is not set for this task).

**Stale-reference sweep** (the drift class where documents restating changed behaviour are missed): searched the tree for the old test name and for other documents describing the bug axis as a subset. The only hits are `docs/tasks/task.65.*` and `CHANGELOG.md:387`, both historical records of earlier states and correctly untouched. **No live document still describes the bug axis as `⊆`.**

---

## Mutation and Vacuity Proving (Step 3c)

Five probes. Four were run during development and re-confirmed here from their recorded assertion output; the fifth was added by QA.

| # | Probe | Expected | Assertion that fired | Result |
|---|---|---|---|---|
| 1 | Add `in-progress` to the floor (gap shrinks) | red | gap assertion | ✅ RED |
| 2 | Add a 5th proceed-row to `develop-bug`'s table (gap grows) | red | gap assertion | ✅ RED |
| 3 | Delete `new` from the floor | red | gap assertion | ✅ RED |
| 4 | Rename the `new` row so the parse returns wrong rows | red **via the guard** | `parsed proceed-set looks wrong: brand-new, reopened, in-progress, ready-for-qa` | ✅ RED |
| 5 | **QA probe** — widen **both** sides by the same status (`awaiting-triage` added to the dispatcher table *and* the floor) | **green** | none — test passed | ✅ GREEN, correctly |

**mutation-proven: yes** — for the gap assertion (probes 1–3, 5) and for the anti-vacuity guard (probe 4). Both assertions in the test were individually driven red.

**Probe 5 is the one that establishes scope rather than sensitivity.** Probes 1–4 show the test is sensitive to change; none of them show *what it is measuring*. A coordinated widening of both sides leaves the gap at `{in-progress, ready-for-qa}` and the test correctly stays green — confirming the assertion pins the **difference** rather than either set, which is the semantics the task argues for: a consistent, deliberate policy change passes; a one-sided drift does not.

**On mutations 3 and 4 being separate.** The Step 2 review split what was originally a single mutation, and QA confirms the split was necessary rather than pedantic. Run in isolation, mutation 3 fires the *gap assertion* and leaves the guard entirely unexercised — the guard reads only the parsed dispatcher table and never `BUG_ELIGIBLE_STATUSES`. Had the two remained collapsed, the guard would have been recorded as proven while never having been driven red, which is the vacuous-coverage failure §10 Risk 2 nominates as this repo's recurring one. The correction was made before development, and the empirical result matches the prediction exactly.

---

## Regression Testing

| Area | Result |
|---|---|
| `develop-next` unit lane | PASS — 123/123 |
| Full hermetic suite (`npm test`) | PASS — 2141 tests, 0 failures |
| Formatting (`prettier --check`) | PASS — clean |
| Bug-selection tests (the 15 existing eligibility tests) | PASS — unmodified and passing, confirming no selectability change |
| Task-axis assertion | PASS — untouched, still passing |
| `develop-bug` dispatcher doc | PASS — `git diff` confirms byte-identical after all mutations reverted |

No regressions.

---

## Test Artifacts

### Files Reviewed
- `evals/develop-next/unit/select-next.test.mjs`
- `skills/develop-next/scripts/select-next.mjs`
- `skills/develop-next/references/roadmap-selection.md`
- `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` (read-only input)

### Test Commands Executed
```bash
node --test 'evals/develop-next/unit/*.test.mjs'   # 123/123
npm run ci:fast                                     # exit 0 — 2141 tests, 0 fail, prettier clean
git diff origin/develop...HEAD                      # code review + byte-identity checks
```

### Coverage
Not instrumented for this lane. Coverage is assessed here by mutation proving, which is the stronger signal for a change whose entire deliverable is an assertion: every assertion added or preserved was individually driven red.

**Step 4b (documented-command execution)**: **not applicable** — no `SKILL.md` and no `shared/resources/*.md` in the change set, and the one changed reference doc contains zero fenced bash blocks. Verified rather than assumed.

---

## Recommendations

### Immediate Actions (Blocking)
1. **TASK72-001** — move the task-72 sentences to the end of the `select-next.mjs` paragraph so the `Pinned by …` clause retains its task-axis antecedent; re-wrap to ~78 columns. P2.

### Short-term Actions (Non-Blocking)
None. The task's three deliberate exclusions — not widening `BUG_ELIGIBLE_STATUSES`, writing no integration test, adding no CHANGELOG entry — were each independently checked and are correct.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Every functional and structural success criterion is met and independently proven; the assertion does exactly what the task set out to make it do, and the proof is stronger than the task originally specified. The single MEDIUM finding is a documentation-accuracy regression introduced by the change, in the comment block this task exists to make trustworthy — cheap to fix, and worth one cycle rather than shipping.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK72-001 resolved; suite re-run green.

---

**Next Steps**: `/qa-fix` addresses TASK72-001, then QA cycle 2 re-reviews.
