# Task Review Report: Task 307 - Instrument-read guard quote and redirect edges

**Reviewed:** 2026-11-14
**reviewed_blob:** 33122755f106806d5c5944c4b731b568d3d5a692
**Review Depth:** Standard
**Task Status:** planned
**Overall Assessment:** GOOD

---

## Executive Summary

The task's claims all reproduce on the matcher as it stands. Two small defects were fixed in the document: a drifted line anchor and an empty plan file.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️ (plan file held only `[]`; fixed)
**Optional Improvements:** 1 💡 (line anchor `:64` → `:63`; fixed)

**User Clarifications:** 0 (pipeline run, no questions needed)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## Evidence (check 11, run on 2026-11-14 against `wrappedStatus`)

| Line | Verdict | Matches the task? |
| --- | --- | --- |
| `cmd; echo foo'bar; baz' $?` | false | yes (miss) |
| `cmd; echo "a"'s; b' $?` | false | yes (miss) |
| `cmd; echo foo 'bar; baz' $?` | true | yes (control) |
| `cmd; echo "rc=$?" &> log` | true | yes (false positive) |
| `cmd; echo "rc=$?" 1> log` | true | yes (false positive) |
| `cmd; echo "rc=$?" 1>> log` | false | yes |
| `x=$(cmd; echo $?)` | true | yes |

`command node --test tests/orchestration-instrument-reads.test.js`: 4 pass, 0 fail.

## 1. Template Structure Compliance

PASS. Sections 1-11, Change Log, Progress Tracking, References present. `type: task`, `description`, `tags` present. No placeholders. No tracker issue linked (`github_issue` absent); no remote sync offered in the pipeline run.

## 2. Technical Accuracy

Anchors checked with `grep -n`: `maskQuoted:53`, `ECHO_AFTER_OPERATOR:70`, `REDIRECT:73`, `wrappedStatus:74` are right. The glued-quote boundary is at `:63`, not `:64` (Optional, fixed). The header range `:3` to `:34` holds. No invented libraries or paths. `.prettierignore` excludes only Markdown, YAML and JSON, so `format:check` does reach the `.js` file (check 30 passes). The guard is reached by the `tests/*.test.js` glob (check 18). No new member of an enumerated class (check 25). `doc-links.js` not run: the task adds no relative links beyond the plan file, which exists.

## 3. Implementation Plan Completeness

Important: the linked plan file contained only `[]`. A developer following the link found nothing. Fixed by writing the plan: recommends option 2 (balance), states the known limit (two apostrophes on one line pair up), fixes the captured-status decision as "leave flagged, name in header", and lists the fixtures and mutation proofs.

## 4. Consistency & Completeness

Success criteria are measurable. The Performance criterion states a bound and its command (check 4, measured form) and names the QA report. The behaviour criteria name fixtures. The task 299 apostrophe cases are named as controls.

## 5. Risk & Rollback

Adequate. The medium risk (a looser quote rule hiding a real status) has its mitigation. A differential note: the redirect change flags less, and each form has an unredirected twin.

## Summary of Recommendations

- Must fix: none.
- Fixed in this review: plan file written; anchor `:64` → `:63`.
- Consider: record in the QA report which option was chosen and the two-apostrophe limit.

## Implementation Readiness Assessment

**Score:** 8/10 — Template 9, Accuracy 9, Clarity 8 (after the plan fix), Consistency 9, Risk 8.
**Recommendation:** ✅ READY TO IMPLEMENT
