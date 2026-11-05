# QA Report: Task 261 - Untrusted-content rule

**Task**: [Link to task document](./task.261.untrusted-content-rule.md)
**Gate File**: [task.261.gate.1.untrusted-content-rule.yml](./task.261.gate.1.untrusted-content-rule.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-05
**Gate Status**: CONCERNS

---

## Executive Summary

The change adds the rule doc, six citations, a path bound at three sites and a lint test. All four phases and every success criterion hold. One medium finding in the lint test keeps the gate at CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, standard mode. The Step 3b diff review was performed inline by the QA author, not by an independent subagent, so independent review did not run for this cycle. Step 4b ran over `review-task` and `review-story`: the changed block (the path bound) is classified `mutating` because it shares a fence with `gh issue view`, so the engine did not execute it; the committed behaviour tests execute the bound itself.

CI on 76f90d6d: `test` pending; `link-check`, `secret-scan`, `shellcheck`, `validate` pass. Pending is recorded, not waited on.

Re-review scope: not applicable (first review).

---

## Re-measured read-site table (Phase 1)

Command: `grep -rnE "gh (pr|issue) view[^|]*(body|comments)|getJiraIssue|WebSearch|WebFetch|browser-use get text|get_page_text" skills/*/SKILL.md shared/resources/*.md`

| Site | Class | Witness |
| --- | --- | --- |
| review-pr | member, cited | `skills/review-pr/SKILL.md:391` (PR body) |
| review-task | member, cited, bounded | `skills/review-task/SKILL.md:150` (issue body) |
| review-story | member, cited, bounded (found this task) | `skills/review-story/SKILL.md:179` |
| develop Step 0 | member, cited, bounded | `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:126` |
| browser-use | member, cited | `skills/browser-use/SKILL.md:78` |
| explain-simply | member, cited | `skills/explain-simply/SKILL.md:72` |
| create-issue | excluded: reads back its own body | `skills/create-issue/SKILL.md:317` |
| finalise | excluded: own marker lookup, body round-trip | `skills/finalise/SKILL.md:2352,2603` |
| sync-github-{bug,epic,story,task} | excluded: body diffed against the local document | `skills/sync-github-*/SKILL.md` |
| tracker poller, access record, pause doc, resume contract | excluded: count or match own comments, example record | allowlist in the test |
| `getJiraIssue` users | not keyed: every use requests named `fields` | blind spot, stated in the test header |

`LOCAL_PATH` was unbounded before this change (`skills/review-task/SKILL.md:156-159`: `sed` output opened with no check). It is now bounded at review-task, review-story and Step 0.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Rule doc exists with the six headings | `tests/untrusted-content-rule.test.js` "carries the six headings" | PASS |
| Every read site cites the rule | "every file that reads third-party prose cites" | PASS |
| Path outside docs/ HALTs at review-task and Step 0, with a test | 3 sites x accepted / 4 rejected / empty cases | PASS |
| Removing a citation turns the test red | mutation below | PASS |
| Rule doc under one page; lint test under 2 seconds | 52 lines; tree scan, no processes | PASS |
| `CI=true npm test` passes | `ci:fast` run: 7863 tests, 1 failure (`bundled-links`, new copies untracked), fixed by tracking them, 7 of 7 pass | PASS |
| `bundle:check` clean | 129 skills, 0 problems | PASS |

---

## Mutation proofs

mutation-proven: delete the citation in `skills/explain-simply/SKILL.md` → "every file that reads third-party prose cites" went red, naming the file and line → covered
mutation-proven: move `shared/resources/untrusted-content-rule.md` away → "carries the six headings" went red (10 pass, 1 fail) → covered
mutation-proven: neuter the `docs/*` case in `skills/review-task/SKILL.md` → the review-task path-bound test went red (19 pass, 1 fail) → covered

Each mutation was applied from a snapshot and restored; the suite was green again after each (20 of 20).

---

## Issues Found

### MEDIUM Severity Issues (1)

**T261-QA-1: lint filter silently drops a real read line containing "no"**
- **Severity**: MEDIUM
- **Category**: Quality (test blind spot)
- **Observation**: `FORBIDDING` in `tests/untrusted-content-rule.test.js` includes the bare word `no`, and is applied to every line including fenced code. `markerLines("gh issue view 5 --json body  # no filter applied")` returns no hit (probe: `FORBIDDING.test(...)` is true). A read site with such a trailing comment passes uncited. It drops 2 lines in the tree today, both in a file already allowlisted, so there is no false pass now.
- **Recommendation**: remove the bare `no`, apply the forbidding filter to prose lines only (outside fences), add a control case.

### LOW

None.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Tree scan, no processes.

### Reliability — PASS
An empty derived path still falls through to the key lookup.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The path bound is a boundary. The fence entry form cannot reach it (its block sits under a bold label, not a heading), so it is held by 9 committed behaviour tests and the mutation above. Not covered: symlinks inside `docs/`, and a PRD root other than `docs/` (recorded as a future recommendation).

### Maintainability — PASS
Allowlist entries carry reasons and must still match a marker.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `tests/untrusted-content-rule.test.js` — see T261-QA-1.

**Cleanups (0):** none.

---

## Test Artifacts

### Test Commands Executed
```bash
node --test tests/untrusted-content-rule.test.js
CI=true npm run ci:fast
npm run bundle:check
python3 skills/create-skill/scripts/quick_validate.py skills/<each changed skill>
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — fix T261-QA-1 first.
