# QA Report: Task 284 - Migrate shipped payload heredocs to the file tool

**Task**: [Link to task document](./task.284.migrate-payload-heredocs-to-file-tool.md)
**Gate File**: [task.284.gate.4.migrate-payload-heredocs-to-file-tool.yml](./task.284.gate.4.migrate-payload-heredocs-to-file-tool.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Testing Completed**: 2026-11-20
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 checks the fixes made for the Step 5c PR review (commit a4e6dba8a). Three of the four hold. The citation added to `review-code` is wrong: that block builds a fresh `mktemp` body in the block that posts it, so the recipe does not apply and the new sentence contradicts the code.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Docs-only claim check, done directly (the delta is two prose sentences and work item edits): each claim was checked against the block or file it names.

Diff review: docs-only claim check (every changed path outside the task directory is `SKILL.md` prose and a bundled copy).
CI on a4e6dba8a1b6: pending (`CI_SUMMARY=CI on a4e6dba8a1b6: pending`). Recorded, not waited on.
Reviewer time: not measured (no reviewer was dispatched; the pass was done inline because the delta is two sentences).

Re-review scope: files changed since gate 3 (head 9cbd6f57a; 2 non-generated code files plus the task directory) — default.

### Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| PC-1 (citation sweep incomplete) | ⚠️ PARTIAL | `observe-work` is cited correctly. `review-code` is cited wrongly (see below). The four other sites are excluded with reasons (list below). |
| PC-2 (no `pr_number`) | ✅ FIXED | Frontmatter now reads `pr_number: 923`. |
| PC-3 (footer status) | ✅ FIXED | Both status lines read Ready for Review. |
| PC-4 (engine change not in scope note) | ✅ FIXED | Out of Scope now records the engine change and states `qa-read-back.js` is untouched (the PR does not touch it: 0 files). |

### Excluded body-file sites (criterion: cited or listed as excluded with a reason)

A population search of every `SKILL.md` and `shared/resources/*.md` that names `--body-file`, then each one without a `fresh-body-post` citation:

| Site | Reason it is excluded |
| --- | --- |
| `skills/review-code/SKILL.md` | The comment body is a fresh `mktemp` file written in the same block that posts it, so a stale body cannot be posted. **The cycle-3 sentence that cites the recipe here is wrong** (TASK-284-C4-CR-1). |
| `shared/resources/develop-pipeline-hooks.md`, `shared/resources/develop-pipeline-pause.md` | Describe the PreCompact hook. The hook script writes the body file and posts it in the same shell (`develop-pipeline-on-precompact.sh`, the `PR_BODY_FILE=…precompact-pr-comment.step-N.md` write at line 482 and the post below it), so there is no split write. |
| `shared/resources/observation-log-contract.md`, `shared/resources/tracker-access-record.md`, `shared/resources/tracker-issue-cli.md` | Contract text that describes a flag; they post nothing. |
| `shared/resources/file-write-rules.md` | The recipe itself. |

Cited: `qa-task`, `qa-story`, `review-pr`, `create-pr`, `finalise`, `ensure-*-github-issue`, `sync-github-*`, `review-bug`, `review-story`, `review-task`, `create-issue`, the pipeline step documents, and (cycle 3) `observe-work`.

---

## New Findings This Cycle

- **[medium]** `skills/review-code/SKILL.md:258` — the cited sentence contradicts the `mktemp` block above it → remove it and list the site as an exclusion (bug 4, gate issue TASK-284-C4-CR-1).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–5 | PASS | Verified | No behaviour change in this cycle |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

No criterion changed (`criteria-drift`: clean). The citation criterion is met once `review-code` is moved to the exclusions list.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: The review-code citation describes a write the block does not make**
- **Severity**: MEDIUM
- **Category**: Maintainability
- **Bug Report**: [task.284.bug.4.review-code-citation-tells-a-fresh-mktemp-body-to-use-the-split-write.md](./task.284.bug.4.review-code-citation-tells-a-fresh-mktemp-body-to-use-the-split-write.md)
- **Observation**: `PR_COMMENT_BODY_FILE="$(mktemp …)"` and the `{ … } > "$PR_COMMENT_BODY_FILE"` group sit at lines 244-248, above a sentence telling the reader to write the file with the file tool and post it in a later call.
- **Recommendation**: remove the sentence and the bundled copy it pulled in.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Measured in cycle 1.

### Reliability — PASS
No behaviour changed.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- Prose only; no boundary is added.

### Maintainability — CONCERNS
One instruction contradicts the block it sits in.

---

## Code Review

Route: docs-only claim check. Boundary: false; no code is added in this cycle.

**Correctness bugs (1):**
- [medium/high] `skills/review-code/SKILL.md:258` — the claimed write method is not the block's method → remove the sentence. Reproduced by reading; the control is `observe-work`, whose `$BODY` has no in-block write and whose citation is accurate.

**Cleanups (0):** none.

---

## Regression Testing

The full CI-parity gate on the LAN server for commit a4e6dba8a exited 0 (tmp-leak ratchet ok). Bundle check: 129 skills, 0 problems.

---

## Test Artifacts

### Test Commands Executed

```bash
git grep -l -e "--body-file" -- 'skills/*/SKILL.md' 'shared/resources/*.md'   # then: no fresh-body-post citation
git diff --name-only origin/develop...HEAD | grep -c "qa-read-back.js$"       # 0
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 923
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Remove the `review-code` sentence and its bundled `file-write-rules.md` copy (bug 4).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one open medium finding in cycle 3's own fix.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix TASK-284-C4-CR-1 before merge.

---

**QA Report**: co-located at `task.284.qa.4.migrate-payload-heredocs-to-file-tool.md`
**Gate File**: co-located at `task.284.gate.4.migrate-payload-heredocs-to-file-tool.yml`
**Next Steps**: `/qa-fix` for bug 4, then the next gate (the last of the budget of 5).
