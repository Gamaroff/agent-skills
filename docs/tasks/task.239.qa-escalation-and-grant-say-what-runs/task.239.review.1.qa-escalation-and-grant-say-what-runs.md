# Task Review Report: Task 239 - QA escalation and grant say what will run

**Reviewed:** 2026-10-28
**reviewed_blob:** a1921b57e3605c77e93a1acd8456b271319105ec
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-10-28

---

## Executive Summary

The task is well scoped, its claims about `grant-qa-cycles.sh`, the Convergence check and the third-strike rule hold against the tree, and its label-site list matches the `git grep` it records. Two Important gaps were fixed in place: the window change listed no reconstruction states (check 19), and the other `qa_max_cycles` writer, `reenter-qa-after-finalise.sh`, was not named. Line anchors had drifted after task.238 merged.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked (autonomous develop-task pipeline; decisions recorded below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside the autonomous `/develop-task` pipeline (`/develop-next`, `--defaults`), so no question was put to the user. The reviewer took these decisions and records them here for audit:

- **D1 — `reenter-qa-after-finalise.sh` is out of scope.** It writes `qa_max_cycles` but re-enters QA after a loop that exited accept-eligible; obs #72's defect is a grant after a stall. Recorded as an explicit exclusion with its reason rather than widening the task.
- **D2 — The window governs the Convergence trip only.** `classifyLoopRoute` keeps reading the whole sequence: its exits end a finished loop, so a pre-grant reading cannot spend a grant's budget.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; Progress Tracking, References and Notes present. No placeholders. OKF `type: task`, `description`, `tags` present.
- Sign-off: `sign-off` not enabled in `skills-config.yaml` — not checked.
- Change Log: present and current after this review's rows.
- Tracker: `github_issue: 769` exists (OPEN); body link `[#769](…/issues/769)` matches; board Priority self-healed to P2.
- Card preflight (`sync-jira-task.js --check-card`): no problems, 3 card blocks resolve.
- `doc-links.js`: 1 relative link, resolves.

---

## 2. Technical Accuracy

**Status:** ACCURATE (anchors drifted)
**Hallucinations Detected:** 0

Pre-pass B/C were not dispatched: performed inline (independence loss recorded). Axes checked inline: the shell/Node engine conventions in `shared/resources/` (jq atomic writes, result lines read back from the lock), and the bundle rule (edit sources, never `skills/*/references/`).

Verified:
- `grant-qa-cycles.sh:240-241` is the one atomic `jq` write (`extra_cycles_granted`, `qa_max_cycles`, `qa_phase`); `:252` prints the result line; `:68-:79` documents the 5a/5b choice and the output line; `:6` carries the label.
- Convergence check at `develop-pipeline-step-5-6-qa-loop.md:541`; step 3's formula and worked-examples table as described. No engine computes the trip (`grep -l not-converging` over `shared/resources/*.{js,mjs,sh}` → only `grant-qa-cycles.sh` and its test).
- Third-strike rule at `:900`, `high_files()` at `:928`, the `comm -12` block at `:946`; it already requires naming the mechanism from the `finding:` texts.
- Lock schema row at `develop-pipeline-pause.md:114`. Parity test asserts the label at `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:724`.
- Label sites: the recorded `git grep` re-run returns the same 14 file:line hits the task lists (plus line drift).
- `reenter_at=` consumers: `grant-qa-cycles.test.sh:84,104` match with unanchored `grep -q`, so appending a `convergence_from_cycle=` token does not break them (check 15).
- New test `evals/shared/tests/qa-escalation-template.test.mjs` is reached by `test:suite`'s `'evals/shared/tests/*.test.mjs'` glob (check 18).

### Optional
- **Drifted line anchors** (check 2): `SKILL.md:332→334`, `develop-story/SKILL.md:345→347`, `resume-contract:631→634`, step-5-6 `:899→:900`, `:1876→:1969`, `:1912→:2005`, `:1986→:2079`, `:2009→:2102`. Corrected in the task and plan.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with files, changes and dependencies; the plan file gives the exact `jq` extension and result-line change. Effort 8h is within the rubric's range for 13 criteria / 4 phases / Medium risk.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND → fixed

### Important
- **I-1 — Reconstruction states not listed** (check 19). The task changes a resume rule (a lock field the Convergence check reads) without listing the states it must hold in. **Fixed:** § 3 Important Clarifications now lists seven: legacy lock, restored lock, existing lock, second grant, hand-run cycle before the grant, report ahead of/behind the gates, and a Step 7 DoD re-entry.
- **I-2 — The other `qa_max_cycles` writer is unnamed** (check 16 shape). `reenter-qa-after-finalise.sh` also re-enters QA and sets the budget. **Fixed:** named in Out of Scope with the reason (D1), and its interaction listed as reconstruction state 7.

### Optional
- **O-1 — Window scope.** Stated that the window governs the Convergence trip only (D2).
- **O-2 — SC-2's test mirrors prose.** The window rule is prose run by an agent; the planned unit test evaluates a function defined in the test and asserts the prose carries the clause. That is the strongest guard available without an engine (which § 4 rules out). Recorded, not changed.
- **O-3 — SC-6/SC-7 are documentation criteria** ("one script call", "at most one comparison"). Each is checkable as "file F says S"; no change.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The one Medium risk (a reset hides a stall for up to two post-grant cycles) is bounded by the granted budget and re-armed by three post-grant readings. Rollback is a revert plus re-bundle; a lock without the field resumes as today.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 2 issues
1. List the reconstruction states (I-1) — done.
2. Name `reenter-qa-after-finalise.sh` and decide it (I-2) — done, excluded with reason.

### Consider (Optional) - 4 items
1. Re-measure drifted anchors — done.
2. Scope the window to the Convergence trip — done.
3. SC-2 mirror test — recorded.
4. SC-6/SC-7 as documentation criteria — recorded.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10 (anchor drift)
- Implementation Clarity: 9/10
- Consistency: 7/10 (before fixes)
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; both Important gaps were documentation gaps fixed in place, and every technical claim checked against the tree held.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, develop-task Step 2)
- **Review Date:** 2026-10-28
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.239.qa-escalation-and-grant-say-what-runs/task.239.qa-escalation-and-grant-say-what-runs.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load)
- **Pre-pass:** Agents B and C not dispatched; performed inline — independence loss recorded.
