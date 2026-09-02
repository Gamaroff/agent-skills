# Task Review Report: Task 70 — Build the inline PR comment primitive, on GitHub and Bitbucket

**Reviewed:** 2026-09-02
**Review Depth:** Standard
**Task Status:** Ready for Development
**Overall Assessment:** GOOD

---

## Executive Summary

Task 70 is a well-sourced, accurately-researched task: every premise it asserts about the current repository was verified true, and its API claims for both platforms are correct. Two defects were found — an internal contradiction between the Phase 1 re-run rule and the Out of Scope list, and an invalid `gh api` invocation in the illustrative snippet — both of which were fixed during this review. The remaining gap is that the task carries no tracker issue link.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — see Decisions below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively as Step 2 of the `/develop-task` pipeline, itself dispatched by `/develop-next`. Questions that would have been asked interactively were resolved as follows:

| Question point | Resolution | Rationale |
|---|---|---|
| Step 0 — output format | Comprehensive report | Pipeline audit trail requires a report artifact |
| Step 2 — tracker sync (no `github_issue`) | **Skip — leave unlinked** | Creating a remote GitHub issue is an outward-facing side effect that the autonomous-defaults table does not authorise. The skill provides an explicit non-halting skip path; the Important gap stays flagged. Run `/sync-github-task` to link it later. |
| Step 8.5 — apply fixes | Yes, all critical + important | Pipeline default — `/develop` must run against a corrected task |
| Step 9 — status update | N/A — already `Ready for Development` | No promotion needed |

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (minor)

All 11 mandatory numbered sections are present and filled: Overview, Motivation, Technical Background, Scope, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan — plus Progress Tracking, References and Notes. No `[TBD]`, `[TODO]` or placeholder markers anywhere.

- **Filename**: `task.70.inline-pr-comments.md` — dots as structural separators, hyphens within the name. ✅
- **OKF frontmatter**: `type: task` present and non-empty ✅; `description` present ✅; `tags` a proper YAML list ✅.
- **Change Log**: present, four canonical columns, current — the newest row (`1.1`) records the review that set `ready-for-development`, so the currency heuristic is satisfied. ✅
- **Stakeholder Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as specified.
- **Tracker card preflight**: `sync-jira-task.js --check-card` exits 0. All three blocks resolve (Summary 276 chars, Success Criteria 366, Breaking Changes 163), each with a `+N more` link. No card defect.

### Issues

#### Important
- **No tracker issue linkage.** Frontmatter has neither `github_issue:` nor `jira_key:`. The card will not exist on the board, and `/develop-task` skipped every tracker signalling step this run (work-started comment, board move, review comment) because `TRACKER_ISSUE` resolved empty. Not blocking — the pipeline degrades cleanly — but the work is invisible to anyone reading the board.
  - **Fix:** run `/sync-github-task docs/tasks/task.70.inline-pr-comments/task.70.inline-pr-comments.md`.

---

## 2. Technical Accuracy

**Status:** ACCURATE (one snippet defect)
**Hallucinations Detected:** 0

Every factual claim the task makes about this repository was verified against the tree:

| Claim | Verdict |
|---|---|
| `/review-code --comment` documents inline comments that do not exist | ✅ True — `skills/review-code/SKILL.md:101` says "post each finding as an inline review comment at its `file_line`"; no implementing code exists |
| No `pulls/*/comments` or `pulls/*/reviews` call exists anywhere | ✅ True — grep across the tree returns nothing |
| `/review-pr` scopes inline comments out and names this task | ✅ True — `skills/review-pr/SKILL.md:418` |
| `review-code` already names task 70 as the Bitbucket-inline owner | ✅ True — `skills/review-code/SKILL.md:104` |
| `shared/resources/tracker-comment.js` + contract exist as the model to copy | ✅ True — both present |
| `tracker_call_with_retry` / `ACCESS_TRACKER` gate exists | ✅ True — `shared/resources/resolve-platform.sh:669` and `:526` |
| Findings carry `file_line` | ✅ True — both lenses emit it |
| Bitbucket inline payload is `{content:{raw}, inline:{path, to}}` | ✅ Correct per the Bitbucket API |
| GitHub per-comment form requires `commit_id` = PR head SHA | ✅ Correct |

### Issues

#### Important
- **The batched-review `gh api` snippet is not a valid invocation.** §3 shows:
  ```
  gh api -X POST /repos/{owner}/{repo}/pulls/{n}/reviews \
    -f event=COMMENT -f body=… --input comments.json
  ```
  `--input` supplies the *entire* request body from a file and cannot be combined with `-f` field flags — `gh` rejects the combination. A developer following this literally hits an error on their first run of the very call the task prefers.
  - **Fix applied:** the snippet now builds one complete JSON body (`event`, `body`, `comments[]`) and pipes it through `--input -`, which is the form that actually works and matches the repo's existing `gh api --method POST` idiom in `tracker-issue.js:705`.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each with an explicit risk level, a named file list, checkbox-level changes, and stated dependencies. The dependency graph is a clean diamond: Phase 1 → {2, 3} → 4 → 5. Files Summary matches the files named in the phases exactly (3 created, 3 modified).

Effort estimate `8` hours against 5 phases, ~11 success criteria and medium risk sits within the rubric band — no divergence flag.

The one deferred decision (the re-run rule) is deliberately assigned to Phase 1 as a deliverable rather than left implicit, which is the right shape — but see §4 for the contradiction it created.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important
- **The suggested re-run rule contradicts the Out of Scope list.** §10 Medium Risk 1 suggests "a marker in each body plus **resolve-then-repost**", while §4 Out of Scope declares "**Resolving or replying to existing inline threads**" excluded. The suggested mechanism requires the capability the task forbids. Whoever implements Phase 1 must either widen the scope or pick a different rule — and discovering that at implementation time is exactly the failure the task's own Notes warn about ("Discovering it during code review is how the duplicate-comment problem gets shipped").
  - **Fix applied:** the suggestion is now **marker + update-in-place** (`PATCH` the existing comment by id when the marker matches, skip when the anchor is no longer valid), which needs no thread resolution and keeps §4 intact. §4 now says so explicitly.

#### Optional
- **The `package.json` modification is probably a no-op.** §7 lists `package.json` as a file to modify for the test glob. `shared/resources/tests/*.test.mjs` is *already* in the `test` script's glob list, so a new test file there is picked up with no edit. The task hedged correctly ("if not already covered"), so this is informational — but the Files Summary counts it as a modification that will likely not happen.
- **The Bitbucket deletion-anchor claim would benefit from a citation.** "`from` anchors the source side" is correct, but it is the one claim in the task with no in-repo precedent to check against, and the Bitbucket arm ships unexecuted (§10 Medium Risk 2 acknowledges this). A doc link in the fixture test would make the fixture auditable by someone who cannot run it.

### Testing completeness

Strong. The Testing Strategy names unit, contract and **mutation** proofs, and the two mutation proofs chosen ("remove the 422 fallback", "swap `to` for `from`") target precisely the two highest-risk behaviours. This matches the repo's standing rule that a fix is unheld until reverting it turns a test red.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The High Risk entry — a silently dropped finding — is correctly identified as the dominant failure mode, and the reasoning is right: a review that loses findings is worse than one that posts none, because the reader believes they have seen everything. The mitigation is not prose but a tested requirement plus a mandatory mutation proof, which is the strongest form available here.

Rollback is realistic and staged: full revert leaves the CLI in place unused; partial rollback disables the Bitbucket arm alone, which is genuinely independent of the GitHub arm. Both have verification steps.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 3 issues

1. ✅ **Fixed** — Re-run rule contradicted the Out of Scope list; narrowed to marker + update-in-place.
2. ✅ **Fixed** — Invalid `gh api --input` + `-f` combination in the batched-review snippet.
3. ⏭ **Skipped (needs your input)** — No tracker issue linkage; run `/sync-github-task` to create and link one.

### Consider (Optional) — 2 items

1. `package.json` edit is likely unnecessary — the test glob already covers `shared/resources/tests/`.
2. Cite the Bitbucket inline-comment API doc alongside the deletion-anchor fixture.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — complete and current; only the tracker link missing
- Technical Accuracy: 8/10 — every repo claim verified true; one invalid snippet (now fixed)
- Implementation Clarity: 8/10 — phases explicit and dependency-ordered; the re-run rule was deferred but is now bounded
- Consistency: 8/10 — one real contradiction (now fixed); Files Summary matches phases
- Risk Management: 9/10 — the dominant risk is correctly named and held by a mandatory mutation proof

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — score ≥ 8 with no critical issues. Both blocking-quality defects were corrected in this review; the remaining Important issue (tracker linkage) does not affect implementability.

**Justification:** The task is unusually well-grounded — its premises were checked against the tree and all held — and the two defects found were specification errors that would have surfaced as wasted implementation time rather than as design flaws.

---

## Next Steps

Task is ready for implementation. The developer should:

1. **Settle the re-run rule first** — Phase 1 now specifies marker + update-in-place; implement it as the contract says before writing either platform arm.
2. Follow the phases in dependency order: 1 → {2, 3} → 4 → 5.
3. Write the two mutation proofs (§8) as part of Phase 5, not after — they are the requirement, not a verification afterthought.
4. Expect the `package.json` change to be unnecessary; confirm rather than assume.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, `/develop-task` Step 2, dispatched by `/develop-next`)
- **Review Date:** 2026-09-02
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.70.inline-pr-comments/task.70.inline-pr-comments.md`
- **Sources consulted:** `skills/review-code/SKILL.md`, `skills/review-pr/SKILL.md`, `shared/resources/tracker-comment.js`, `shared/resources/tracker-comment-contract.md`, `shared/resources/resolve-platform.sh`, `shared/resources/tracker-issue.js`, `package.json`, `skills-config.yaml`
- **Card preflight:** `sync-jira-task.js --check-card` → exit 0, no findings
