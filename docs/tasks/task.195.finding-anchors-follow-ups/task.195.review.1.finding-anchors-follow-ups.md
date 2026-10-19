# Task Review Report: Task 195 - Finding-anchors follow-ups

**Reviewed:** 2026-10-19
**reviewed_blob:** 29dc358575420bc3a37a8226a5a48c76cbac8432
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 critical + important recommendations implemented — 2026-10-19

---

## Executive Summary

The task is well specified and its engine claims verify, but the tree moved under it. Phase 3 (the `/review-pr` head SHA) was shipped the same day by `319bf779` (`scripts/resolve-head-rev.sh`), which covers more routes than Phase 3 planned, so the phase is rescoped to "no work". The Breaking Changes claim that dispatchers "key on the set, not the names" is false: nine prose sites enumerate the three malformed verdicts by name, and an existing unit test pins the range case to `no-line`.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — autonomous run (`/develop-next` → `/develop-task --defaults`); each decision below is answered from the codebase and recorded.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the fixes below, which were applied)

---

## User Decisions & Clarifications

Autonomous pipeline run — no user present. Decisions taken from the codebase:

**D1: Phase 3 is superseded by `319bf779` — rescope or re-implement?**
- **Decision**: Rescope. `resolve-head-rev.sh` resolves the PR head via `head-branch`, `pull-ref`, `fork-branch`, `source-commit` and `merge-commit`, with `skills/review-pr/tests/resolve-head-rev.test.js` (bash and zsh). The planned Phase 3 block (`headRefOid` then fetch `pull/<n>/head` or the branch) covers a strict subset and would replace a tested mechanism with a weaker one.
- **Impact**: Phase 3 has no work. SC-6 is held by the existing `resolve-head-rev.test.js` plus Phase 2's `reason` decision at review-pr's block, which keeps `--rev "$HEAD_REV"`.

**D2: Malformed-set enumeration sites — update them or rely on "keyed on the set"?**
- **Decision**: Update every enumeration. The dispatchers are prose executed by a reader, and each names the three verdicts.
- **Impact**: Phase 2 gains a sweep of the nine sites (search recorded below); qa-task / qa-story's `file: null` rule extends to `unparseable`.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; frontmatter carries `type: task`, `description`, `tags`, `github_issue: 597`.
- Tracker linkage: issue #597 exists (`OPEN`); body link `[#597](…/issues/597)` matches.
- Card preflight (`sync-jira-task.js --check-card`): no problems, 3 card blocks resolve.
- Change Log present (`change-log` not configured → advisory default); sign-off not enabled.
- `doc-links.js`: 1 relative link resolves.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0

Pre-pass: Agents B and C were not dispatched; both passes were run inline (independence loss recorded). Architecture axes: shell/Node skills repository, Node built-ins only — the task adds no dependency.

### Verified

- `anchorOf` (`finding-anchors.js:83`) reads `file_line ?? ref`; `no-line` returned at `:100`; `MALFORMED` at `:80`; `checkTree` at `:160`; engine reasons `ok`, `malformed-anchors`, `usage`, `bad-root`, `bad-rev` (`:171`, `:180`, `:273`, `:334`).
- Invariants (check 11), run in a scratch repository 2026-10-19: `git cat-file blob :./a.js` from a subdirectory → `staged` while the work tree holds `worktree`; `git cat-file -t HEAD:./` → `tree` from a tracked subdirectory and the top; from an untracked `newdir` → `fatal: path 'newdir/' exists on disk, but not in 'HEAD'` rc 128.
- Population (check 20) re-measured with the task's own `comm` command: 11 files, identical to the §3 table.
- Test reach (check 18): `shared/resources/tests/*.test.mjs`, `evals/shared/tests/*.test.mjs`, `skills/review-pr/tests/*.test.js`, `skills/review-code/tests/*.test.js` are all globs in `package.json` `test`.
- Producer field names (check 21): `code-review-prompt.md:113` emits `file_line`; `pr-conformance-prompt.md:140` emits `ref`. Lens-by-key matches both schemas.

### Important

- **I1 — Phase 3 is superseded (problem 5).** `skills/review-pr/SKILL.md:601-616` already binds `HEAD_REV` from `scripts/resolve-head-rev.sh` (commit `319bf779`, 2026-10-07 20:07, after this task was written), including the Bitbucket source and merge commits. The plan's Phase 3 block would regress it. → Rescoped (D1).
- **I2 — "They key on the set, not the names" is false (§5, §3 Important Clarifications).** Search: `git grep -n 'text-mismatch' -- 'skills/*/SKILL.md'` → `qa-task/SKILL.md:652,786`, `qa-story/SKILL.md:1142,1272`, `review-code/SKILL.md:100,120,213`, `review-pr/SKILL.md:624,781`. Each enumerates the malformed verdicts by name, so `unparseable` would read as neither clean nor malformed at every one. → Sweep added to Phase 2 (D2).
- **I3 — Removed literal pinned by a test (check 15).** `shared/resources/tests/finding-anchors.test.mjs:145` asserts `verdictOf({ file_line: "src/long.js:42-58" }) === "no-line"`; under the new rule it is `unparseable`. The plan did not list it. → Added to Phase 1.

### Optional

- **O1 — Drifted line anchors.** qa-task `:637` → `:645`; qa-story `:1104` → `:1135`; review-pr checker comment `:598` → `:617`, `--inline` FINDINGS_JSON `:890` → `:936`; review-code `:93` and `:156` unchanged. Claims true, coordinates moved. → Corrected.
- **O2 — `unparseable` and the `file` field.** qa-task/qa-story set `file: null` only for `no-such-file`; an `unparseable` anchor has no path either. → Stated in Phase 2.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after rescoping)

Phases name files, functions and the exact blocks; dependencies explicit. With Phase 3 removed, three phases remain. `estimated_effort_hours: 8` is plausible for the reduced scope.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after fixes)

- Every behaviour criterion names its test; the blocks test carries a control case (clean finding set must continue). SC-7 is a documentation criterion held by the population test.
- No criterion depends on merge.
- SC-6 now cites the existing `resolve-head-rev.test.js` and Phase 2's review-pr block.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risks have mitigations (control case, never-drop rule). Rollback is per-phase `git revert` + `npm run bundle`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues

1. Rescope Phase 3 to no work; cite `resolve-head-rev.sh` for SC-6.
2. Add the malformed-set enumeration sweep to Phase 2 and correct §5.
3. List `finding-anchors.test.mjs:145` in Phase 1.

### Consider (Optional) - 2 items

1. Correct drifted line anchors.
2. Extend the `file: null` rule to `unparseable`.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the three important findings are scope corrections applied to the document in this review.

---

## Review Metadata

- **Reviewer:** Claude (review-task, develop-task Step 2, autonomous)
- **Review Date:** 2026-10-19
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.195.finding-anchors-follow-ups/task.195.finding-anchors-follow-ups.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load)
- **Review Duration:** ~20 minutes
