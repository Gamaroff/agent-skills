---
type: review
description: "Review 1 of task 176 — /review-pr accepts a Jira card or GitHub issue: 0 critical, 10 important, 6 optional; needs revision before development."
task-ref: task.176.review-pr-tracker-issue-input.md
created: 2026-10-02
updated: 2026-10-02
---

# Task Review Report: Task 176 - /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Reviewed:** 2026-10-02
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** NEEDS IMPROVEMENT

---

## Executive Summary

> **Implementation Status**: ✅ All 9 open important recommendations implemented — 2026-10-02 (plus optional items 1–5; item 6 deferred to the follow-up task)

The task is well scoped and its Phase 0 findings are real. But four parts of the parser and resolution spec
would misbehave as written: an epic check the offline parser cannot make, a host check that halts every
Jira URL, URL arms that collide, and a second key lookup beside an existing broken one. Two success
criteria cannot be met before merge as worded.

**Critical Issues:** 0 🚨
**Important Issues:** 10 ⚠️ (1 fixed during review — tracker linkage)
**Optional Improvements:** 6 💡

**User Clarifications:** 7 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

**Q1: No `github_issue` (TRACKER=github). Create and link one?**
- **User Decision**: Sync to GitHub.
- **Impact**: Dedup search found no match. Created [#553](https://github.com/Gamaroff/agent-skills/issues/553), milestone "Technical Tasks (standalone)", on board 1, Priority P2. `github_issue: 553` and the body link were written. The board has no `Estimate` field, so the estimate was not set.

### Question Point 2: Technical & Implementation

**Q2: A Jira-key → doc lookup already exists in `develop-pipeline-step-0-resolve-and-prepare.md` §0a. What should the task do?**
- **User Decision**: Fix §0a and share it.
- **Impact**: One anchored, quote-tolerant lookup in the shared step-0 source. review-pr cites it rather than restating it. Scope widens to `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` and its bundled copies.

**Q3: Where should the parser cases live?**
- **User Decision**: In `review-pr.test.js`.
- **Impact**: The node test spawns the script under bash and zsh. It is already in the `npm test` glob, so no `package.json` edit is needed. `tests/parse-target.test.sh` is dropped.

**Q4: How should `#N` resolve when VCS=bitbucket?**
- **User Decision**: Doc routes only.
- **Impact**: On Bitbucket, a GitHub issue resolves via the doc's `pr_number:` and then its branch stem. The `closedByPullRequestsReferences` rung is GitHub-only and is skipped. If nothing resolves, the halt names that rung as GitHub-only.

### Question Point 3: Completeness & Safety

**Q5: A branch literally named like a Jira key would change meaning.**
- **User Decision**: Fall back to branch.
- **Impact**: When `kind=jira` finds no doc and no PR, the input is retried as a branch before halting, and `resolved_via` says so. Breaking Changes stays "None", and the fallback is stated there.

**Q6: The same unanchored grep is restated in review-task and review-story.**
- **User Decision**: Name them and defer to a follow-up task.
- **Impact**: A Deferred Work entry lists `skills/review-task/SKILL.md:99,134` and `skills/review-story/SKILL.md:189`.

(Q0: comprehensive report; branch `feature/task.176.review-pr-tracker-issue-input` cut from `develop`.)

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (one fixed)

All 11 numbered sections are present, along with Progress Tracking and References. The filename is
correct, OKF `type: task` and `description` are present, and there are no placeholders. Card preflight:
3 blocks resolve (Summary +5 omitted, Success Criteria +5, Breaking Changes +1). `doc-links.js`: 1
relative link, and it resolves. Sign-off is not configured, so that check was skipped. Change Log is
present and current for `planned`.

#### Important
- **No tracker linkage**: `github_issue` was absent. **Fixed during review** → #553.

#### Optional
- **Files Summary**: `tests/parse-target.test.sh` is listed under "Files to Modify (Tests)" although it is new. Moot after Q3.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (one unreachable outcome, check 10)

Pre-pass B (architecture): `drift`. Axes checked: What this repo produces, SKILL.md authoring, File
naming, Cross-skill resources, Platform branching, Plan files, Validation before commit, Do not.
`prepass-axes.js` source: `architecture`. Its two medium findings, an unwired `.test.sh` and missing
ShellCheck, are covered below. Pre-pass C (codebase): `not-implemented`.

#### Important
- **Epic-key refusal is unreachable in the parser (check 10).** Phase 1 says the parser refuses "an epic-shaped … key", and Testing Strategy has an "epic-shaped key" case. A Jira key's type is not visible offline: `RAPP-702` and an epic key have the same shape. The parser is pure, so no branch can return that refusal.
  - **Fix:** remove it from Phase 1 and the parser cases. Detect an epic in Phase 2 instead, either when the resolved doc is an `epic.*` file or `type: epic`, or from the Step 3b `issuetype`. The parser refuses only *malformed* input.
- **The host check halts every Jira URL.** Plan Phase 2.1 compares `host` with `git remote get-url origin`. The parser reports `host` for Jira URLs too, and `*.atlassian.net` never matches a git remote. With VCS=bitbucket and TRACKER=github, a GitHub issue URL would also halt.
  - **Fix:** compare only PR URL hosts with the VCS remote. Compare a Jira URL's host with `JIRA_URL` and warn on a mismatch. A GitHub issue URL is checked against the `owner/repo` of the GitHub tracker, not the code remote.
- **The URL arms collide, and one old form is already broken.** Measured by running today's Step 0b `case` under bash and zsh:
  - Jira Cloud's issue view `https://x.atlassian.net/jira/software/c/projects/RAPP/issues/RAPP-702` contains `/issues/`. A path-ordered parser would read it as a GitHub issue.
  - `/browse/RAPP-702?focusedCommentId=1` carries a query string the table does not mention.
  - `https://github.com/o/r/pull/12/files` → `PR=files` **today** (`${TARGET##*/}`).
  - **Fix:** decide the platform by **host** first, then extract the key or number with an anchored pattern and strip `?…` and `#…`. Add all three cases to the suite. The `/pull/N/files` repair is a fix, not a regression of "resolves exactly as before".
- **A second key lookup beside an existing broken one (check 6).** `develop-pipeline-step-0-resolve-and-prepare.md:27,70` uses `grep -rl "jira_key: ${JIRA_KEY}"`, and `:29,72` uses `grep -rl "github_issue: {N}"`. Both are unanchored, so a lookup for `RAPP-70` also matches `RAPP-702`. Both miss quoted keys, and both use a 3-kind exclusion list. review-pr Step 2 rung 4 says it reuses §0a, so it inherits the defect. The task proposes a new correct grep and does not name §0a.
  - **Fix (per Q2):** fix §0a: anchored, quote-tolerant, with the full exclusion list plus `.request.`. review-pr cites it. Add Phase 2 items, a Files Summary row and a test. (Per Q6) Defer the restatements in review-task and review-story.
- **The planned `.test.sh` would run nowhere.** `package.json` `test` lists each `.test.sh` by hand, and the task does not touch it (repo trap, memory: npm test globs orphan new suites).
  - **Fix (per Q3):** put the parser cases in `skills/review-pr/tests/review-pr.test.js`, spawning the script under `bash` and `zsh`.
- **Two resolution routes are unspecified.**
  - (a) With VCS=bitbucket, `#N` resolution has no route. (Per Q4) Doc routes only; the closing-PR rung is GitHub-only.
  - (b) Rung 3 on GitHub, "a PR whose source branch contains the doc's stem", names no command, and `gh pr list --head` is an exact match.
  - **Fix:** state the GitHub command, e.g. `gh pr list --state all --limit 100 --json number,headRefName,state` filtered on `headRefName` containing `STEM`.

#### Optional
- `gh pr view N` on an issue number fails exactly as it does for a missing number (`GraphQL: Could not resolve to a PullRequest…`, verified on 551 and 9999). The "retry as an issue" fallback must call `gh issue view N` to tell the two apart. State that.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

#### Optional
- **Phase 3 docs sweep.** `grep -rn review-pr docs/` finds no page listing `target` forms. `docs/reference/invocation.md:89,98` only names Step 5c. Say so, so Phase 3 does not look for a page that does not exist. If the SKILL.md description gains a card trigger, run `npm run generate-catalog`.
- **Validation list.** Add `shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh`. The ShellCheck workflow is unfiltered and would catch it in CI, but the coding standard requires it locally after any `.sh` edit.
- **Plan "Open decisions".** Both are now decided: halt on several PRs (already the task's rule), and a script tested from node (Q3). Close them in the plan.
- `estimated_effort_hours: 10` is plausible. Q2 adds the §0a fix, so 12h is closer.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Important
- **Behaviour criteria with no per-PR test, and a post-merge check (obs #222).** SC1 ("reaches Step 3 … writes the same report") and SC2 ("each selection outcome behaves as documented") are behaviour claims. The only planned evidence is a prose pin, or the Consumer Tests, which need the release installed and so can only happen after merge, while finalise runs before merge.
  - **Fix:** reword SC1 to "every listed form parses to the documented `kind` (parser cases) and SKILL.md routes each `kind` to a named rung (prose pin)". Reword SC2 to "SKILL.md states each selection outcome (prose pin per outcome)". Move the consumer runs to a Deferred Work / post-release note.
- **The performance criterion names no test.** "No extra network call when `target` is already a PR number or URL" is a bound a per-PR test can assert.
  - **Fix:** name the test: a `review-pr.test.js` case that the card-resolution block is gated on `kind=jira|github-issue` and the `kind=pr` arm goes straight to Step 1.
- **Breaking Changes "None" is not quite true.** A branch named like a Jira key changes meaning. (Per Q5) Add the branch fallback to Phase 2, a parser/prose case, and a sentence under Breaking Changes.

#### Optional
- `.request.` is not an artifact kind any skill in this repo writes. It is consumer-specific (rebirth-wallet). Exclusion lists will keep missing new kinds. A positive filter would not: a filename `{kind}.{N}.{slug}.md` whose parent directory is the same stem. Consider it for the follow-up.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The wrong-PR risk is identified, with an observed figure behind it, and mitigated by rung order plus no
auto-pick on key match alone. Partial rollback by rung is feasible. Q2 adds a shared-resource change that
the develop pipelines read at Step 0. Add a Low/Medium risk line: a stricter §0a lookup could stop
resolving a doc that the loose grep found by prefix. That outcome is correct, but it is visible to
pipeline users. Note it in CHANGELOG.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 9 open

1. Move epic detection out of the parser into Phase 2 (doc type or issuetype).
2. Scope the host check: PR URL vs VCS remote; Jira URL vs `JIRA_URL`.
3. Parse by host first; strip query and fragment; add cases for the Jira `/issues/KEY`, `/browse/KEY?…` and `/pull/N/files` forms.
4. Fix §0a's key and issue lookup and have review-pr cite it; defer the review-task and review-story restatements (Q2, Q6).
5. Parser cases in `review-pr.test.js` under bash and zsh; drop `parse-target.test.sh` (Q3).
6. Specify `#N` on Bitbucket (doc routes only) and the GitHub rung-3 command (Q4).
7. Reword SC1/SC2 to testable forms; move consumer runs to post-release.
8. Name the test behind the performance criterion.
9. Add the Jira-key-branch fallback and state it under Breaking Changes (Q5).

### Consider (Optional) - 6 items

1. Files Summary: the test file is not "modify" (moot after Q3).
2. Phase 3: no doc lists target forms today; regenerate the catalog if the description changes.
3. ShellCheck in the validation list.
4. Close the plan's two open decisions.
5. Retry-as-issue must use `gh issue view` to tell an issue from a missing number.
6. Positive work-item filter instead of a growing exclusion list (follow-up).

---

## Implementation Readiness Assessment

**Score:** 7/10

- Template Compliance: 9/10
- Technical Accuracy: 6/10
- Implementation Clarity: 7/10
- Consistency: 6/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium → High once the fixes land.

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** No critical defects. But four spec points would produce wrong behaviour if built as
written, and two criteria cannot pass finalise as worded. All have agreed fixes.

---

## Review Metadata

- **Reviewer:** Claude (review-task)
- **Review Date:** 2026-10-02
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.review-pr-tracker-issue-input.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md`
- **Code consulted:** `skills/review-pr/SKILL.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `package.json`, `.github/workflows/{shellcheck,validate,docs-link-check}.yml`
