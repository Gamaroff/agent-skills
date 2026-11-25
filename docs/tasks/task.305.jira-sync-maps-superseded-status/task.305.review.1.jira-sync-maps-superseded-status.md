# Task Review Report: Task 305 - Jira sync maps the superseded status

**Reviewed:** 2026-11-23
**reviewed_blob:** 61b8be304af38377d2cf43fdc015e8157005df98
**Review Depth:** Standard (run inline by the autonomous pipeline: the two pre-pass subagents were not dispatched, and the checks were done by the orchestrator reading the code; independent subagent review did not run)
**Task Status:** planned (before this review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task is accurate and small: one map key and two set entries in `jira-sync.js`, one scaffold line in `gh-stage.js`. Every claim about the code held. The review found two open `(unverified)` items and two success criteria with no held test or location; all are fixed in the task document.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️ (all fixed)
**Optional Improvements:** 1 💡 (fixed)

**User Clarifications:** 0 questions asked. The run is autonomous (`/develop-next --defaults`); the one owner decision in the task was taken on its own recommendation (see below).
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No question was put to a person. One decision is recorded:

- **Jira landing state, option A or B.** The task recommends A (the `CANCELLED_CANDIDATES` family, negative resolution). Taken as decided under `--defaults`. **Impact:** Phase 1 adds `superseded: CANCELLED_CANDIDATES` and both set entries. A board that wants B overrides it in `jira.statusMap`. The owner can still overrule A when the PR is reviewed.

---

## 1. Template Structure Compliance

**Status:** PASS

- Frontmatter has `type: task`, `description` and `tags`. No placeholders. Eleven mandatory sections present.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, no finding.
- Relative links (`doc-links.js`): 1 link, resolves.
- No sign-off section and `change-log.enabled` default: Change Log present and now current.

---

## 2. Technical Accuracy

**Status:** ACCURATE, one claim was unverified and is now checked.
**Hallucinations Detected:** 0

Verified against the tree on `develop` (6013cd0b9):

| Claim | Result |
| --- | --- |
| `mapStatusCandidates` returns `[stripped]` for an unmapped key | True, at `jira-sync.js:3859` (the task said `:3857`; fixed) |
| `DEFAULT_STATUS_MAP` at `:3459`, `cancelled` at `:3467`, `CANCELLED_CANDIDATES` at `:3264` | True |
| `TERMINAL_LOCAL_STATUSES` `:3505`, `NEGATIVE_LOCAL_STATUSES` `:3524` hold no `superseded` | True |
| The map is overlaid by config (`loadStatusMap`) | True, at `:3716` (the task said `:3717`) |
| `gh-stage.js` scaffold writes `cancelled:` and no `superseded` | True, at `:1944` (the task said `:1946`; fixed) |
| `tracker-workflow.js` `documentStatus` accepts an unknown key | **True**: the loop at `:405` stores every non-empty pair and checks no key. This resolved the task's `(unverified)` note |
| The four `sync-jira-*` scripts use the shared map | All four reference `jira-sync.js`; `sync-jira-task.js:1081` passes `lib.DEFAULT_STATUS_MAP` |
| `superseded` is a valid terminal status | True: `document-status-lifecycle.md` lines 18-20 |

### Issues

#### Important (fixed)

- **I-1. The Phase 3 branch was open.** The plan file said "if an unknown key is rejected, add it to the allowed set; if accepted, add the scaffold line". The code answers it: accepted. Both documents now say so and name one action.
- **I-2. The documented Jira mapping was missed.** `document-status-lifecycle.md` § "External Tracker Mapping (Jira)" lists `cancelled` → `Cancelled` and no `superseded`. A reader of the doc would not learn where a superseded task lands. Added as Phase 3b and to Scope and the Files Summary; it replaces the task's `(unverified): grep for it`.

#### Optional (fixed)

- Two line anchors had drifted by two lines (`:3857`, `:1946`). Corrected.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases of one to three lines each, with files named. No vague change. The plan file's "do not add a new candidates list" instruction is correct and kept.

**Test reach (check 18/25).** The new test file `shared/resources/tests/jira-sync-superseded-status.test.mjs` is reached by the `shared/resources/tests/*.test.mjs` glob in `npm run test:suite`. Recorded in the Files Summary.

**Removed-literal sweep (check 15).** Not applicable: the task removes no behaviour or literal. It adds a key and a line. The existing `gh-stage.test.mjs` does not pin the scaffold's `documentStatus` block (`git grep` for `cancelled: ` in the tests found only `setup-consumer-config.test.mjs`, which is about `jira.statusMap`); the task now says to run `gh-stage.test.mjs` whole.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT, two criteria needed a held test or a location

#### Important (fixed)

- **I-3. "No extra network calls" held by nothing.** A non-functional criterion with no named test fails finalise by construction. It now names a test in the new file that drives the transition lookup for `accepted` and `cancelled` and asserts an unchanged lookup count. (A statement that the change adds a map key and set entries and no call is true by inspection; the test pins it.)
- **I-4. The migration criterion pointed at nothing.** It said "one line in `docs/reference` (`(unverified)`: grep for it)". The grep found the documented map is in `document-status-lifecycle.md`. The criterion now names that row and the `CHANGELOG.md` entry, both committed with the PR.

Checked and fine: every behaviour criterion names its test (map, both sets, scaffold); no criterion can only be met after merge; the mutation criteria name what each must turn red.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Rollback is a revert plus `npm run bundle`. The medium risk (the owner prefers B after shipping A) is covered by the config override. No database or API change.

One note for QA, not a finding: `NEGATIVE_LOCAL_STATUSES` drives the choice of a negative resolution. A board whose Cancelled transition requires a resolution picks "Won't Do" for a superseded task. That is option A's stated trade-off.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 4 issues

1. I-1 Resolve Phase 3 to one action. Done.
2. I-2 Add the `document-status-lifecycle.md` row (Phase 3b). Done.
3. I-3 Name the test that holds the no-extra-calls criterion. Done.
4. I-4 Give the migration criterion a location. Done.

### Consider (Optional) - 1 item

1. Correct the two drifted line anchors. Done.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issue, every code claim verified, and the four important findings are fixed in the document.

---

## Next Steps

Task is ready for implementation: follow the phases in order, mutation-prove each addition, run `CI=true` tests before pushing.

---

## Review Metadata

- **Reviewer:** Claude (autonomous pipeline, develop-task Step 2)
- **Review Date:** 2026-11-23
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.305.jira-sync-maps-superseded-status/task.305.jira-sync-maps-superseded-status.md
- **Architecture Docs Consulted:** none loaded in full; the task touches shared engines only, checked against the code and `document-status-lifecycle.md`
- **Tracker linkage:** no `github_issue` on the task. The create-and-link offer (Step 2 check 5) was **not taken**: the autonomous run does not create remote issues, and the task is purely local. Left unlinked; `/sync-github-task` can link it later.
