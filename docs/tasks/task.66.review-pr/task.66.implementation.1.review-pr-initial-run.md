# Implementation Report: Review a pull request against the paper trail that is supposed to justify it

**Task**: `task.66.review-pr.md`
**Run Number**: 1
**Started**: 2026-08-31 00:00
**Status**: In Progress

---

## Summary

Build the `review-pr` skill: resolve a PR back to its work item, collect the pipeline artifacts beside that document, and review the diff and the evidence together on GitHub and Bitbucket, with GitHub-issue or Jira-card context. Ten phases, two new files plus wiring and a standards doc sweep.

---

## Pipeline Configuration

| Setting             | Value                                                             |
| ------------------- | ----------------------------------------------------------------- |
| Feature branch base | `feature/task.66.review-pr` (already checked out)                 |
| PR target           | `develop`                                                         |
| qa-planning gate    | skipped (auto)                                                    |
| Task risk level     | medium                                                            |
| Pipeline mode       | standard                                                          |
| Always-load files   | 3 files — docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md |
| Tracker             | GitHub — issue [#282](https://github.com/Gamaroff/agent-skills/issues/282) |
| Board status        | In Progress (set in Step 1)                                       |

---

## Pipeline Progress

| Step                      | Status     | Required Artifacts                                                            | Notes | Subagent summary ref |
| ------------------------- | ---------- | ----------------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch          | ✅ Done    | Branch `feature/task.66.*` exists in git                                      | Auto-skipped — branch already checked out (cut by /review-task Step 0a) | — |
| 2. review-task            | ✅ Done    | `task.66.review.{N}.{name}.md` exists (or skip logged)                        | Skipped — `task.66.review.1.review-pr.md` from standalone run (8/10, READY TO IMPLEMENT, 6 fixes applied) | — |
| 3. develop                | ✅ Done    | Task status == `Ready for Review`                                             | 11 files; 40 contract tests green; 11 mutation proofs; Phase 10 doc sweep | — |
| 4. create-pr              | ✅ Done    | PR URL targets `develop`; issue comment posted                                | [#283](https://github.com/Gamaroff/agent-skills/pull/283) — 3 commits | — |
| 5–6. qa-task / qa-fix loop | 🔄 Cycle 1 | `task.66.qa.{N}.*.md`; `task.66.gate.{N}.*.yml`; PR comment posted            | Gate 1 CONCERNS (70/100) — 4 blocking, 7 advisory | — |
| 7. finalise               | ⏳ Pending | `task.66.dod.{N}.*.md`; task `status: accepted`                               |       | —                    |
| 8. commit-changes         | ⏳ Pending | All artifacts committed and pushed                                            |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-08-31

- **Phase 0a**: input was a direct file path — already resolved, resolver subagent not dispatched.
- **Phase 0a-parallel**: tracker state read directly via `gh issue view 282` (OPEN, labels `task` + `priority:high`, milestone `Technical Tasks (standalone)`, on board 1) rather than via the poller subagent — the issue was created minutes earlier in this session and its state is known. Lite-mode inputs read directly from frontmatter for the same reason.
- **PIPELINE_MODE = standard** — computed from `risk_ok = (risk_level "medium" ∈ {low, absent}) = false`. The AND short-circuits; phase_count (10) and single_module are moot.
- **Feature branch base**: `feature/task.66.review-pr` — already checked out. Cut from `develop` during `/review-task` Step 0a; carries commit ef15170.
- **PR target branch**: `develop`.
- **qa-planning gate**: skipped (auto — no prompt).
- **Phase 0b**: branch exists but no implementation report and no PR — this is a fresh run, not a resume. The branch predates the pipeline because `/review-task` created it.
- **Step 2 (`/review-task`)**: will be **skipped** — `task.66.review.1.review-pr.md` already exists from the standalone review run in this session (8/10, READY TO IMPLEMENT, all 6 Important fixes applied) and the task is already at `ready-for-development`. Re-running would produce a redundant `.review.2.` artifact against an unchanged document.

---

## Issues Log

| # | Issue | Resolution |
|---|---|---|
| 1 | Contract test regex spanned a hard line wrap in `pr-conformance-prompt.md`, failing 1/39. | Made the assertion whitespace-tolerant. Test bug, not a source bug — source text was correct. |
| 2 | **Mutation M5 exposed a weak assertion.** The cross-fork test matched `headRepositoryOwner` anywhere; the string also appears in Step 1's `--json` list, so deleting the entire cross-fork paragraph left the test green. | Scoped the assertion to the Step 4 section and added three more anchors. Re-proved: deleting the paragraph now goes red. |
| 3 | **Phase 10's glob-collision grep found a real collision in this skill's own Step 3.** `*.review.*.md` also matches `*.pr-review.*.md`, so a re-review would have collected its own prior report as the pre-implementation review report. | Split the glob and added `grep -v '\.pr-review\.'`, plus a regression test (mutation-proved). The grep was added to Phase 10 by the `/review-task` pass — it paid for itself on the first run. |
| 4 | **Full suite caught a dead reference**: SKILL.md linked `references/pipeline-artifacts.md`, but that doc lives in `docs/reference/`, not `shared/resources/`, so the bundler never bundled it — a silently unreadable reference in any installed skill. | Named the doc in prose instead of linking it. `tests/executable-instructions.test.js` is what caught it. |

---

## QA Iteration History

### Cycle 1 — gate: CONCERNS (70/100)

Document-anchored checks all passed (10/10 phases, 1986 tests green, standards sweep verified).
The diff code review found 10 correctness defects + 1 cleanup in the skill's own shell snippets
and test assertions; 4 were `confidence: high` and gated.

Every testable finding was confirmed empirically before being accepted — notably CR-2, where the
documented `docs/**/*.gate.*.yml` matches **0 of 110** gate files without `globstar`.

Two findings (CR-8, CR-9) are weak test assertions that would pass against a SKILL.md with the
behaviour deleted. The 11 mutation proofs run during development did not catch them, because
neither assertion was among the mutated behaviours — the honest limit of a mutation set is that it
proves the claims you thought to revert.

**Fix cycle 1 — all 11 findings addressed:**

| Finding | Fix |
|---|---|
| CR-1 | `pr_number` grep anchored: `grep -rlE "^pr_number:[[:space:]]*${PR_NUMBER}[[:space:]]*$"` |
| CR-2 | Both `docs/**/` globs replaced — rung 1 uses `find docs -type f`, rung 3 uses `grep -rl --include='*.gate.*.yml'` |
| CR-3 | `BODY_FILE` assigned via `mktemp` before the platform branches; Step 9 now removes it |
| CR-4 | New **Step 0b — Parse `target`** binds `PR` and `BRANCH` before Step 1 uses them |
| CR-5 | Fetch/diff wrapped in a conditional with `[ -s "$DIFF_FILE" ]`; any failure sets `USE_API_DIFF=1` |
| CR-6 | Verdict table names the field in every row; a `high`+`medium confidence` finding can no longer fall through to APPROVE |
| CR-7 | Bitbucket marker scan uses `?pagelen=100` |
| CR-8 | Vacuous assertion bound to the real sentence plus the shared key set |
| CR-9 | Artifact-kinds test scoped to the fenced bash block, matching glob forms not bare words |
| CR-10 | Step 8 heading no longer contradicts the Arguments rule |
| CR-11 | Test header documents the glob run form that actually works |

Each fix is held by a test (45 now, up from 40) and **each was mutation-proved**.

**One mutation came back NOT HELD on the first attempt.** CR-5's guard matched `USE_API_DIFF=1`,
which also appears in the cross-fork prose below the code block — so mutating the conditional left
the assertion satisfied. Identical in shape to M5 earlier in this run. The guard now asserts the
fenced conditional itself (`if git fetch`, the `&&` chain, the `-s` emptiness check) and goes red
when the conditional is removed.

That is twice in one task that an assertion matched a token appearing in more than one place. The
lesson is specific and worth carrying: **when a guard asserts a token, check how many times that
token occurs in the file** — if more than once, scope the assertion to the construct rather than
the string.
