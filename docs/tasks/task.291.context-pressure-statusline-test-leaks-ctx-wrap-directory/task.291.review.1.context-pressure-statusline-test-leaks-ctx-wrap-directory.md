# Task Review Report: Task 291 - The context-pressure statusline test leaks a ctx-wrap- temp directory

**Reviewed:** 2026-11-11
**reviewed_blob:** 63b265adcc0a9a41605f345f94ef47daa0eb13dc
**Review Depth:** Standard
**Task Status:** planned (promoted to ready-for-development after fixes)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is small and well scoped. Its hypothesis (the `:85` test ends before its background recorder, whose `mkdirSync(..., { recursive: true })` recreates the removed `ctx-wrap-X` directory) matches the code read in this review: `context-pressure-statusline.sh:30` backgrounds the recorder and `context-pressure.mjs:229` creates the state directory and any missing parent. Four Important findings, all in the plan's testability, were fixed in place.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️ (all fixed)
**Optional Improvements:** 1 💡 (applied)

**User Clarifications:** 0 questions asked (pipeline run, `--defaults`; no ambiguity needed a human)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

**Independence note:** pre-pass Agents B and C were not dispatched; the architecture and codebase passes were done in-line by the orchestrating session (one reader, so no independent second opinion on either axis). The code facts above were read directly.

---

## User Decisions & Clarifications

None. No question was asked; each finding below had a single defensible resolution.

---

## 1. Template Structure Compliance

**Status:** PASS (one gap fixed)

- All 11 mandatory sections present; no placeholders; sign-off disabled so not checked; OKF `type: task` present.
- Change Log present with the canonical columns; this review added the verdict row and the status row.
- Tracker linkage: `github_issue` was missing. Created and linked issue #882 (dedup search found no `[Task 291]` issue first), added to the board with priority and estimate.
- Card preflight (`sync-jira-task.js --check-card`): 3 blocks resolve. `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ACCURATE

- File paths and line anchors checked: `context-pressure-statusline.test.mjs:17,19,38,85,93`, `context-pressure-statusline.sh:30`, `context-pressure.mjs:91,229` all name what the task says.
- Check 9 (config keys): `CONTEXT_PRESSURE_STATE_DIR` and `CONTEXT_PRESSURE_ENGINE` both have readers (`context-pressure.mjs:91`, the wrapper at `:23`).
- Check 25 (new member of an enumerated class): a new helper under `shared/resources/tests/lib/` is not matched by the runner's glob `shared/resources/tests/*.test.mjs` and is not a test, so nothing enumerates it; `ctx-wrap` is created only by this test file (`git grep -n ctx-wrap` shows no other creator).
- Check 28 (planned temp directories name their removal): the regression test's own directory had no stated removal. Fixed: the plan now says `finally`.
- Check 18 (test reached by the runner): the regression test lives in the existing file, which the glob reaches. The helper is imported, not run.
- Checks 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 21, 23, 24, 26, 27, 29, 30: not applicable (no outcome claim over a named function, no compatibility handling, no removed literal, no engine call-site list, no parity claim, no prescribed fixture literal, no async external read, no directory with other readers, no tool over an ignored file type).
- Pre-pass B/C (in-line): the architecture standards impose nothing on this test-only change; no part of the task is already implemented (the `:85` test still has no wait).

### Optional

- The recorder's prune step writes a `.pruned` marker after the state file appears, so a removal can meet a concurrent write (ENOTEMPTY). Applied: the plan now specifies `maxRetries: 3` on the removal and states that only the wait, not the retry, is the fix.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (one gap fixed)

### Important

- **I1. The regression test's cleanup hook had no importable home.** The plan said "put the hook logic in a function the test can call", but a `*.test.mjs` cannot be imported without registering its tests. Fixed: the plan and Files Summary now name `shared/resources/tests/lib/tmp-state-cleanup.mjs` (beside the existing `executed-prose.mjs` and `rm-invocation.mjs`).

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (three gaps fixed)

### Important

- **I2. A "before" count above 0 is not guaranteed for an intermittent leak.** The criterion required the unloaded reproduction to print a number above 0 before the fix. Fixed: the "before" figure is taken with the slow-recorder stub against the unfixed test (deterministic); the unloaded count is recorded as well.
- **I3. A negative-content criterion with no holder.** "No test in the file starts a background recorder without waiting" is a claim over a population with no scan. Fixed: rescoped to a documentation criterion held by a list in the QA report (each state-directory test with the line of its wait or settle call).
- **I4. The performance bound named no command.** Fixed: the criterion now gives the exact `time command node --test …` command, five alternating runs, `uptime` beside each figure, the head commit named.

The regression-test criterion now names the test and requires the QA report to name the red test on revert. Mutation design checked: with the cleanup reverted to a bare `rmSync`, the slow stub recreates the directory after the removal, so the test goes red.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE. The one MEDIUM risk (a second cause) is mitigated by the 100-run count; rollback is a revert with no consumer state.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 4 (all applied)

1. Name the helper module location (I1).
2. Make the "before" evidence deterministic (I2).
3. Rescope the negative-content criterion (I3).
4. Give the performance bound its command (I4).

### Consider (Optional) - 1 (applied)

1. `maxRetries` on the removal.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The cause is read from the code, the plan is one phase with a reproduction, fix, regression test and mutation proof, and the four Important findings are fixed in the documents.

---

## Next Steps

Develop per the plan: reproduce and count, prove the cause with the slow-recorder stub, fix, add the regression test, mutation-prove it, run `CI=true npm test`, add the CHANGELOG line.

---

## Review Metadata

- **Reviewer:** review-task (pipeline run, `--defaults`)
- **Review Date:** 2026-11-11
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory/task.291.context-pressure-statusline-test-leaks-ctx-wrap-directory.md
- **Architecture Docs Consulted:** none needed (test-only change); `scripts/test-tmpdir.mjs` and `tests/tmp-leak-ratchet.json` read for the ratchet rule
