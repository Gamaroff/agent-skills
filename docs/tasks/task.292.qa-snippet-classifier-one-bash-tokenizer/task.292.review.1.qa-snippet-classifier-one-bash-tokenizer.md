# Task Review Report: Task 292 - One bash tokenizer for the QA snippet classifier

**Reviewed:** 2026-11-10
**reviewed_blob:** 092976bf2fdabcf5dd36d06ffcb64f465e4490d0
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** EXCELLENT

---

## Executive Summary

The task replaces several regex copies of bash's lexical rules with one tokenizer and closes T290-QA-3. Every line anchor, the `\s` count (52), the commit `4223cfac` and the test anchors in the document resolve against the tree. No invented technology, path or config key was found. The plan is phased with risk levels, mutation proofs and a calibrated instrument.

**Critical Issues:** 0 🚨
**Important Issues:** 0 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (pipeline mode, `--defaults`)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

**Independence note:** the two pre-pass Explore subagents did not run. Architecture alignment and the codebase scan were done inline by the orchestrator, so this review has no independent second reader.

---

## User Decisions & Clarifications

None. The pipeline answers Step 0 (Comprehensive report), Step 8.5 and Step 9 autonomously.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking and References. Sign-off is disabled for this repository (`sign-off.enabled` unset), so check 4a does not apply.
- Frontmatter carries `type: task`, `description`, `tags`, `github_issue: 868`.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, no problems.
- `doc-links.js`: 2 relative links resolve.
- Change Log present with four columns.

#### Optional
- `estimated_effort_hours: 16` was not recomputed against the rubric; non-blocking.

---

## 2. Technical Accuracy

**Status:** ACCURATE. **Hallucinations Detected:** 0

Verified against the tree (`shared/resources/qa-execute-snippets.mjs`):

| Claim | Result |
| --- | --- |
| `closingParen` `:1479`, `startsComment` `:1520`, blank class regex `:1523` | match |
| `maskSubstitutions` `:1529`, `stripCommentQuoteAware` `:1970`, `blankQuotedSpans` `:2027`, `stripProse` `:2156`, `stripNonCode` `:2236`, `commandInvocations` `:2327`, `sedScan` `:1299` | match |
| Join regexes `:2335` (odd run, `\n`) and `:2915` (`\r?\n`) | match; the disagreement the task names is real |
| `classifyBlock` `:2805`, `classifyFailClosed` `:2815`, `isRunnableBlock` `:2831` | match |
| `\s` count 52 | `grep -c '\\s'` returns 52 |
| Test anchors `:4681` (differential), `T290_GAPS :4513`, `T290_CONTROLS :4542` | match |
| `scripts/test-tmpdir.mjs` ratchet | exists |
| Two throws to delete (`:1991`, `:2167`) | exist, "escaped quote outside quotes" and "backslash-newline before a comment" |

Check 11 (invariant): the bash rules the task states (blank set; backslash-newline join only on an odd run; `#` only at a word start) are the standard POSIX/bash rules and agree with task.290's recorded findings. The task also commits a differential against real bash as its own proof, which is the strongest available check.

Check 14 (call-site population): not applicable, the task names none of the five tracker engines.

Check 15 (removed literals): the task removes two throw sites and the `\r?\n` join. `git grep` for the internal scan names across test trees finds only `shared/resources/tests/qa-execute-snippets.test.mjs`, which the task already edits. No other test pins them.

Check 18 (test reach): the new tests go into the existing suite file, already reached. The two new scripts are run by `package.json` scripts and through the fixed-seed slice.

Check 25 (enumerating tests): tests that enumerate `scripts/` filter on `.sh` (`epic-numbering-retirement`, `mutation-call-site-coverage`), so two new `.mjs` files do not trip them.

Pre-pass B (architecture alignment, inline): aligned. The task changes no module boundary and keeps the exported API.
Pre-pass C (already implemented, inline): not implemented. No `tokenize` function exists in the engine.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases with risk levels, files, checkbox changes and dependencies. Phase 3 migrates one scan per commit with a gate after each, which matches the High risk it declares.

#### Optional
- **Phase 1 commits red rows.** Phase 1 adds T290-QA-3 gap rows that are red until the tokenizer lands, and a differential slice that reports writes on the current engine. Committed on their own they fail `ci:fast` on that commit. State that they land with the first migration commit, or are marked as expected failures until then. Developer to decide; the pipeline gates on the final state.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, scope, phases and Files Summary agree.
- Success criteria are measurable. Performance criteria name their measuring method (median of five, `uptime` beside each) and the QA report as their record. The "full differential reports 0 writes" criterion names its record location (QA report), seed and command.
- Mutation proof is planned per migration.

#### Optional
- The "never throws" test is referenced by name in prose only; name it in the Testing Strategy so a reader can find it.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

High, Medium and Low risks each carry a mitigation. Rollback covers the whole merge, a single scan, and a forward fix, with triggers and a validation command. The exemption-differential rule is met: the docs scan against `develop` must show 0 newly runnable blocks.

---

## Summary of Recommendations

### Must Fix (Critical): 0
### Should Fix (Important): 0
### Consider (Optional): 3

1. Say when the red Phase 1 rows land so no intermediate commit fails the fast gate.
2. Name the "never throws" test.
3. Recompute `estimated_effort_hours` against the rubric if the estimate matters to planning.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** every anchor and count verifies, there are no critical or important issues, and the plan includes its own instrument calibration and mutation proofs.

---

## Next Steps

Promote to Ready for Development and begin Phase 1 with `/develop`.

---

## Review Metadata

- **Reviewer:** review-task (pipeline mode, run by the develop-task orchestrator)
- **Review Date:** 2026-11-10
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.qa-snippet-classifier-one-bash-tokenizer.md
- **Architecture Docs Consulted:** none loaded in full; pre-pass done inline
