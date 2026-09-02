# Implementation Report: Build the inline PR comment primitive, on GitHub and Bitbucket

**Task**: `task.70.inline-pr-comments.md`
**Run Number**: 1
**Started**: 2026-09-02 16:50
**Status**: In Progress

---

## Summary

Build `shared/resources/pr-inline-comment.js` — a dual-platform CLI that posts review findings as inline PR comments anchored to their lines, degrading to a summary comment rather than dropping a finding — and wire it into `/review-code` and `/review-pr`.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                     |
| PR target           | develop                                                                     |
| qa-planning gate    | skipped (auto)                                                              |
| Task risk level     | medium                                                                      |
| Pipeline mode       | standard                                                                    |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                       |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.70.*` exists in git                               | `feature/task.70.inline-pr-comments` created at `e68a444`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.70.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT, 8/10. 0 Critical / 3 Important / 2 Optional. 2 fixes applied to the task doc | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 5 phases complete; `npm run ci:fast` green (2258 tests, 0 fail); 4 mutation proofs executed | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.70.qa.{N}.*.md`; `task.70.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ⏳ Pending | `task.70.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-02

- **Invocation context**: dispatched by `/develop-next` (roadmap item **T70**, PHASE 5 — Current frontier, no deps). Autonomous run directive in force.
- Feature branch base: **develop** — auto-answered (recommended option) per the develop-next autonomous directive; current branch was `develop`.
- PR target branch: **develop** — auto-answered (recommended option) per the develop-next autonomous directive.
- qa-planning gate: skipped (auto — no prompt).
- **Phase 0b**: no prior run detected (no `feature/task.70.*` branch, no PR, no prior implementation report) — starting fresh; the resume prompt did not arise.
- **Phase 0a-parallel**: run inline rather than via subagent dispatch. The session's operating rules forbid spawning agents that were not requested; the three Phase-0 agents are cheap disk reads whose outputs (file path, tracker issue, lite-mode booleans, always-load list) were obtained directly with equivalent fidelity. Resolver was unnecessary regardless — the task path was supplied explicitly by the selector.
- **Pipeline mode: standard** — computed from the three booleans: `risk_ok = false` (`risk_level: medium` ∉ {low, absent}), `phase_count = 5` (≥ 3), `single_module = false` (touches `shared/resources/`, `skills/review-code/`, `skills/review-pr/`, `package.json`). All three fail; lite mode would require all three to hold.
- **Tracker**: `TRACKER=github` (`JIRA_URL` unset). `TRACKER_ISSUE` is empty — the task frontmatter carries no `github_issue:`, so all tracker issue/board operations are skipped for this run, including 0c-reg "Signal Work Started".
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all three verified present on disk.
- Task status `ready-for-development` → proceed normally (Phase 0c status table).

### Step 2 — review-task — 2026-09-02

- review-task **run**, not skipped: status was `Ready for Development` but no review report file existed in the task directory (the Change Log recorded a v1.1 validation pass that left no artifact). Decision table row: `Ready for Development` + no report → run.
- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously.
- Step 9: not applicable — status was already `Ready for Development`, no promotion needed.
- **Tracker sync declined.** review-task Step 2 check 5 found no `github_issue:` and offers to create one. The autonomous-defaults table carries no row for this, and creating a remote issue is an outward-facing side effect, so the skill's documented non-halting skip path was taken: the Important gap stays flagged and no remote change was made. Run `/sync-github-task` to link it later.
- Review outcome: **READY TO IMPLEMENT**, readiness 8/10, 0 Critical / 3 Important / 2 Optional. Report: `task.70.review.1.inline-pr-comments.md`.
- Two Important defects fixed in the task document: (1) the suggested re-run rule (resolve-then-repost) contradicted the §4 Out of Scope exclusion of thread resolution — narrowed to marker + update-in-place; (2) the batched-review `gh api` snippet combined `--input` with `-f` field flags, which `gh` rejects — rewritten as a jq-built body piped through `--input -`.
- Anti-hallucination pass: every claim the task makes about this repository was verified against the tree and all held (no inline PR comment code exists anywhere; `review-code:101`/`:104` and `review-pr:418` say what the task says they say; `tracker_call_with_retry` at `resolve-platform.sh:669`). 0 hallucinations.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 before and after the edits.
- Implementation report stashed before branch creation, restored after (`git stash pop` clean).
- **0c-reg Signal Work Started: skipped** — `TRACKER_ISSUE` empty (task has no `github_issue:`), so there is no issue to comment on and no board item to move.

---

### Step 3 — develop — 2026-09-02

- **Pre-develop surface map: 16 files** across `shared/resources/` (the CLI, its model, the access/handover machinery) and `skills/{review-code,review-pr}/`. Built by targeted reading rather than an Explore subagent — the task's own Files Summary names its 3 created + 3 modified files, so the open question was never *which files* but *which patterns to mirror*, and that is answered by reading `tracker-comment.js` itself.
  - **Create**: `shared/resources/pr-inline-comment.js`, `pr-inline-comment-contract.md`, `tests/pr-inline-comment.test.mjs`
  - **Mirror**: `tracker-comment.js` (exit codes 0/1/2, `reason` vocabulary, access-gate placement between local and remote work, marker cardinality rule, `--body-file` only, lazy platform requires), `tracker-comment-contract.md` (contract shape), `tests/tracker-comment.test.mjs` (injected throwing transports so a network leak fails the test)
  - **Depend on**: `defer-mutation.js` (`resolveAccessTracker`, `defer`), `resolve-platform.sh` (VCS semantics), `bitbucket-auth.sh` (credential variable names)
  - **Wire into**: `skills/review-code/SKILL.md` Step 4, `skills/review-pr/SKILL.md` Step 4 + §out-of-scope note
- Plan file: none (`task.70.plan.*.md` absent) — proceeding from the task's own Implementation Plan.
- Always-load files read: 3.
- `package.json`: **no edit needed** — `shared/resources/tests/*.test.mjs` is already in the `test` script's glob, so a new test file there is collected automatically. The task hedged this correctly ("if not already covered"). Recorded in the review as an Optional finding.

#### What was built

| Phase | Outcome |
|---|---|
| 1 — Contract + skeleton | `pr-inline-comment-contract.md` (153 lines) and the CLI's local half: arg parsing (every value-taking flag fails closed), findings validation, `$VCS` resolution, marker construction. **Re-run rule decided and written down before any transport code**, as the task demanded: marker + update-in-place. |
| 2 — GitHub | Batched `POST /pulls/{n}/reviews` preferred (one call, one notification); wholesale rejection falls back to per-comment, which isolates the bad anchor instead of losing the batch; a 422 degrades that finding to the summary. `commit_id` is the PR head SHA from `gh pr view --json headRefOid`, never local `HEAD`. |
| 3 — Bitbucket | Per-finding `POST …/comments` with `{content:{raw}, inline:{path, to}}`; `from` instead of `to` for a `LEFT`-side (deleted-line) finding; single-shot, with degradation covering a transient failure. Credential resolution mirrors `bitbucket-auth.sh`'s variable names and Bearer→Basic order exactly. |
| 4 — Wire in | `review-code` Step 4's never-implemented prose replaced by the call; `review-pr` gains `--inline` and its "inline PR comments are out of scope" note is gone. Both state the degradation rule. |
| 5 — Tests | 38 tests, all green. Both mutation proofs executed (below). |

#### The one invariant, and how it is held

A finding is never dropped. Anchoring failure **degrades** to the summary comment and reports
`anchor-failed`, never `posted` — because a degraded finding reported as posted is, from the
reader's side, indistinguishable from a dropped one. Three §1 tests hold this: the degraded
finding's own *text* must appear in the summary body, not merely a count. When even the summary
cannot be posted, every undelivered finding is printed to stderr first, because stderr is the last
channel that cannot fail.

Two extensions of the same invariant that the task did not name but the code needed:

- **Unreadable existing comments degrade rather than post.** Posting blind is how a resumed run
  doubles every comment; degrading delivers without duplicating.
- **One deferred record per finding, not one per batch.** The journal fingerprints `command.stdin`,
  so a single batched record would collapse N findings into one and lose N−1 — the same drop,
  relocated into the handover.

#### Mutation proofs (both mandatory, both executed)

| Mutation | Result |
|---|---|
| Removed the 422 degradation (discard the finding instead of collecting it) | **3 tests went red** — §1 ×3, each naming the lost finding text |
| Swapped Bitbucket `from` for `to` on a deletion anchor | **1 test went red** — §3 deletion anchor |
| Un-awaited `postSummary` (the self-audit defect below) | **1 test went red** — §3 Bitbucket summary failure |

Reverting each mutation returned the suite to 38/38. A fix nobody can turn red is not held.

#### One defect found and fixed by self-audit, not by a test

`finishRun` called `postSummary(body)` inside a `try/catch` without awaiting it. On GitHub that arm
is synchronous and the code was correct. On **Bitbucket** `postSummary` is `async`, so a rejection
escaped the catch as an unhandled rejection while `summaryPosted = true` ran regardless — a run that
had lost every degraded finding would have reported success. That is the module's one invariant,
defeated by a missing keyword, on the arm this repo cannot exercise.

Fixed by making `finishRun` (and `runGithub`, for symmetry) `async` and awaiting the call. A 39th
test now covers it, and reverting the `await` turns exactly that test red — so the fix is held rather
than merely present.

The general lesson is worth recording: the Bitbucket arm's *payload shapes* were fixture-tested from
the start, but its *control flow* differed from GitHub's in a way no payload assertion could see.
A platform arm that cannot be run in anger needs its control flow read, not just its output asserted.

#### Scope addition, and why it is not scope creep

`defer-mutation.js` validates every emitted mutation `kind` against the roster in `tracker-access-record.md` and **throws** on an unknown one (`EXPECTED_KIND_COUNT = 23`). The roster has `github.pr.comment` but **no Bitbucket kinds at all**. The task requires the CLI to route through the `ACCESS_TRACKER` gate; a Bitbucket arm with no registered kind could not defer, and would either throw or — worse — bypass the gate and post under a restricted mode. Registering `bitbucket.pr.comment` (roster row, kind count, renderer case, verify case) is therefore *required to satisfy an in-scope requirement*, not an addition to it. Four small edits in three files beyond the task's Files Summary; recorded here so the diff is not a surprise at QA.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.70.inline-pr-comments`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
