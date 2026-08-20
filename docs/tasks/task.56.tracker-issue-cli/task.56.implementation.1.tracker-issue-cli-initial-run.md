# Implementation Report: [Task 56] One CLI for the GitHub issue lifecycle, and honest handling of the mutations that return a value

**Task**: `task.56.tracker-issue-cli.md`
**Run Number**: 1
**Started**: 2026-08-19 22:50
**Status**: Completed

---

## Summary

First automated pipeline run for task 56 — build `shared/resources/tracker-issue.js` covering the GitHub issue lifecycle (create / edit / close / reopen / milestone / sub-issue link), wrap the remaining unwrapped `gh` call sites, and introduce the blocking-record + two-run convergence contract for mutations that return a value.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                            |
| PR target           | develop                                                                                                                            |
| qa-planning gate    | skipped (auto)                                                                                                                     |
| Task risk level     | high                                                                                                                               |
| Pipeline mode       | standard                                                                                                                           |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (Todo → In Progress, verified)                                                                                        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.56.*` exists in git                               | `feature/task.56.tracker-issue-cli` created at `59e5ec9`, pushed to origin | —                    |
| 2. review-task             | ✅ Done    | `task.56.review.{N}.{name}.md` exists (or skip logged)                 | `task.56.review.1.tracker-issue-cli.md` — 8.5/10 READY TO IMPLEMENT; 3 critical + 5 important fixed in place; status promoted | 2 Explore pre-pass agents (arch alignment: drift; codebase scan: not-started) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 9 phases; 1564 tests pass, validate:all 115/115, prettier clean, bundle committed | Explore pre-develop surface map |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #265 → develop; 4 commits; issue commented; board in-review `stage-disabled` (correct) | PR body summariser (inline) |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.56.qa.{N}.*.md`; `task.56.gate.{N}.*.yml`; PR comment posted     | 5 cycles: gate 1 FAIL (70) → gate 2 PASS (94); 25 defects fixed | 5 Explore code-review agents |
| 7. finalise                | ✅ Done    | `task.56.dod.{N}.*.md`; task `status: accepted`                        | DoD PASSED; 2 gaps found and closed (CHANGELOG, slug shape check); issue #234 closed, board Done | 4 parallel DoD Explore agents |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | 15 commits, all pushed; working tree clean | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-08-19

- Questions asked (2, matching the develop-task required count):
  - Q1 Feature branch base: **develop** — current branch is `develop`; standard Gitflow base for a task branch.
  - Q2 PR target branch: **develop** — standard Gitflow; task PRs merge back into `develop`.
- qa-planning gate: skipped (auto — no prompt)
- Phase 0a-parallel: resolver not dispatched (task file supplied directly and verified on disk); tracker state polled inline via `gh issue view 234` (OPEN, labels `task`, `priority:medium`); lite-mode inputs read inline from frontmatter.
- Pipeline mode computed **standard** from: `risk_ok = false` (risk_level `high` ∉ {low, absent}), `phase_count = 7` (≥ 3), `single_module = false` (touches `shared/resources/`, 10+ skills, `tests/`, `docs/`).
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all verified present on disk.
- Task status `planned` — proceeding per Phase 0c status table; Step 2 (`/review-task`) will promote it.
- Dependencies verified accepted before start: task.51, task.52, task.53, task.54, task.55.

### Step 1 — create-branch — 2026-08-19

- Implementation report stashed before branch creation, restored after (`git stash pop` clean).
- Branch `feature/task.56.tracker-issue-cli` cut from `develop` at `59e5ec9` and pushed with tracking.
- Pipeline lock written at `.claude/state/develop-pipeline.lock` (`current_step: 2`).
- Tracker signal: `tracker-comment.js --stage work-started` → `reason: posted`; `gh-stage.js --stage work-started --add-to-board` → `transitioned` (Todo → In Progress, verified).
- Board Priority already `P2 Medium` — left untouched (never overwrite a human's choice).

---

### Step 2 — review-task — 2026-08-19

- Gate check: status `planned`, no review report → ran `/review-task` (per Step 2 decision table).
- review-task Step 0 output format auto-answered: **Comprehensive report** — required for pipeline audit trail.
- review-task Step 0a branch setup auto-skipped — already on `feature/task.56.*`.
- Phase 1.5 pre-pass: 2 Explore agents dispatched in parallel, both returned. Agent B `alignment: drift`; Agent C `implementation_status: not-started`, `bare_gh_mutation_sites: 28`.
- Outcome: **READY TO IMPLEMENT**, 8.5/10 (6/10 before fixes). 3 Critical, 5 Important, 3 Optional.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously. All 8 applied, 0 skipped; 3 optional also applied.
- review-task Step 9 auto-answered: **Yes, fixes complete** — status `planned` → `ready-for-development`.
- Review report: `docs/tasks/task.56.tracker-issue-cli/task.56.review.1.tracker-issue-cli.md`
- Review outcome comment posted to GitHub issue 234 (`reason: posted`).

**Substantive findings the review changed:**
1. `blocking: true` was specified as a contract but is not a field in the record schema, the writer, or either renderer — now named as a three-file change.
2. `milestone create` had no roster kind; `defer-mutation.js` refuses off-roster kinds and asserts `EXPECTED_KIND_COUNT = 22`. Resolved as a new 23rd kind.
3. "Existing suites green unchanged" contradicted the task's own scope (`jira-interception.test.mjs` §10 pins the notice this task must update). Narrowed, with an explicit expected-red row.
4. Files Summary +9 files; bare site count 20 → 28; board sites brought in scope; guard scoping rule stated; subcommands → flat `--kind`.

---

### Step 4 — create-pr — 2026-08-20

- Base `develop`, issue 234 — both pre-supplied by the orchestrator, no prompt.
- 4 logical commits: `feat` (engine), `refactor` (call sites + guard), `docs`, `chore` (bundle).
- PR #265 opened. Issue commented (`reason: posted`).
- 191 files, +19190/-832 (160 of them generated bundle output).

### Step 3 — develop — 2026-08-19/20

- Pre-develop surface map: 1 Explore subagent, 8 areas, exact line numbers. No plan file (none exists) — proceeded without.
- Planned/high-risk gates: auto-answered per pipeline defaults (`risk_level: high` → qa-planning auto-skipped; "Skip, I've already planned").
- Alignment: greenfield for the CLI; `align code to document` for the schema/roster changes.
- **9 phases complete.** Final: `npm test` 1564/1564, `npm run validate:all` 115/115, `npx prettier --check .` clean, `npm run bundle` committed (191 files).

**Four findings the plan did not predict:**

1. **The `⏸️` notice was on stdout.** `makeOutput` was copied verbatim from `tracker-comment.js`, whose `info()` uses `console.log`. In that CLI stdout is inert; in this one it is the value channel — a caller's `$( )` would have captured the notice sentence and written it into frontmatter as an issue number. Fixed (stderr), and pinned by a byte-empty-stdout test that goes red when `console.log` is restored.
2. **Three pinned assertions had to move, not one.** The review predicted `jira-interception.test.mjs` §10; there were also `tracker-access.test.sh` and a hard-coded `EXPECTED_KIND_COUNT = 22` in §12. Each was updated keeping its both-directions property — the *understating* wording is now asserted absent too.
3. **The new guard found 2 call sites the 28-site audit missed** — bare `gh issue comment` in `create-pr:369` and `review-task:1712`, miscounted as already-covered. They bypassed `tracker-comment.js` entirely, so they were unmarked as well as ungated and recurred on every resume.
4. **`--remove-label ""` would have broken every priority-preserving sync** — the sync skills pass an empty string on the common path, and `gh` fails the whole edit over it. The builder now drops empty label values.

**Test literals replaced by derivations:** five hard-coded roster counts across two suites now read from the fixture/source, so the next kind addition is a two-file change rather than a seven-file one. §12 additionally cross-checks the roster doc's total against `EXPECTED_KIND_COUNT` in the source.

---

## Issues Log

- **Step 4 — implementation report committed early.** `/create-pr` was invoked with `--exclude` for the implementation report, but the final `git add -A` in the bundle commit swept it in anyway, so it landed at Step 4 instead of Step 8. Benign — the file belongs on the branch either way and Step 8 commits its final state on top — but the exclusion did not hold, and it is recorded here rather than passed over. History was not rewritten for it.
- **Step 4 — board `in-review` is `stage-disabled`** on this project's ladder. Exit 0, correct outcome per the gh-stage contract; no action needed.

---

### Step 7 — finalise — 2026-08-20

- 4 DoD Explore agents dispatched in parallel (AC traceability, security, compliance, docs); all 4 returned, none failed.
- QA gate PASS (94/100) · CI SUCCESS 4/4 on `52299a7` = HEAD (waited for a `PENDING` rollup to settle rather than concluding from the first sample) · 10/10 success criteria with code **and** test citations.
- **Two gaps found and closed rather than waived:**
  1. No CHANGELOG entry — the sibling task.55 (`tracker-comment.js`) set the precedent.
  2. The repo slug reached a recorded `bash -c` string unchecked. Advisory per the reviewer; fixed because a generated script an operator runs is itself a mutation path.
- Task accepted: `status: accepted`, `completed_date`, `pr_number`, DoD PASSED section, Change Log v1.2 — all in one edit.
- Issue #234 closed and verified; board `already` Done; canonical PR comment posted.
- The close ran through `tracker-issue.js --kind close` and the comment through `tracker-comment.js` — finalise exercised this task's own CLI end to end against a real issue.

## QA Iteration History

| Cycle | Outcome | Found |
| ----- | ------- | ----- |
| 1 | **FAIL** (70/100) | 3 high, 6 medium, 2 low. Two indented heredocs silently swallowing tracker calls; an issue URL built from two never-assigned variables |
| 2 | fixes | The cycle-1 slug fix was a **regression**: dropping `gh repo view` lost fork / `set-default` resolution, so a fork clone would create issues in the wrong repo. Two guards found vacuous |
| 3 | fixes | The replacement resolver ran `gh` against `process.cwd()` — the exact hazard the local reader documents and guards against |
| 4 | fixes | Anchoring the resolvers was not enough: every perform-path exec ran with no `cwd`, so a slugless `close` mutated whatever repo the process was in and reported success. `--repo` had no validation but outranked every validated source |
| 5 | **PASS** (94/100) | No production defect with a named trigger and an observable wrong outcome. 192-run sweep: 0 network calls, 0 stdout bytes, 0 malformed records |

**The finding worth carrying forward:** this was *one* hazard, not four. The wrong-repo
failure re-emerged one layer below each fix — record → resolver → resolver's cwd → every
exec below it. Each cycle fixed where it had been seen and the next found where it had
moved. A fix that closes a symptom at the layer it surfaced is not evidence the class is
closed.

**Second:** four tests were vacuous, each caught by reverting the behaviour they named
rather than by reading them. One guarded this CLI's entire contract — that stdout carries
the issue number a caller binds — by asserting the JSON payload instead. Reading a test
does not tell you whether it would fail.

---

## Completion Summary

**What shipped.** `shared/resources/tracker-issue.js` — a CLI for the six GitHub issue-lifecycle
mutations whose stdout a caller binds, on the same contract as its three siblings. Plus the 23rd
roster kind (`github.milestone.create`), the `blocking` record field and its banner, 28 routed call
sites, and `tests/mutation-call-site-coverage.test.js` — five guards that keep the call-site count a
maintained number rather than a one-off audit.

**The design decision at the centre of it.** A wrapper cannot both refuse a call and return the
value the call would have produced. So under a deferring mode the CLI prints *nothing* to stdout,
records the mutation with `produces` and `blocking: true`, and the checklist tells the operator to
perform it, write the value into the document, and re-run. **No placeholder is ever written** — a
wrong key defeats the duplicate guard and converts a recoverable state into a permanent one.

**Three things worth carrying forward:**

1. **The QA loop found one hazard, not twenty-five.** The wrong-repo failure re-emerged one layer
   below each fix: deferred record → the resolver that replaced it → that resolver's working
   directory → every exec beneath it. Cycle 2 caught that the cycle-1 fix was itself a *regression*
   that would have created issues in a fork rather than the base repo. Closing a symptom at the
   layer it surfaced is not evidence the class is closed.

2. **Five tests were vacuous** — four found in QA, one more in finalise — and every one was caught
   by reverting the behaviour it named and re-running, never by reading it. One guarded this CLI's
   entire contract (that stdout carries the issue number) by asserting the JSON payload instead.

3. **The indented-heredoc defect was repo-wide.** Two introduced here; six already on `develop`,
   each silently swallowing a `tracker-comment.js` call — the comment never posted, the run
   reporting success. Fixing all eight and guarding the class went beyond this task's stated scope,
   and is flagged rather than folded in.

**Scope note.** Everything in the task's Files Summary landed. Two additions beyond it: the six
pre-existing heredocs, and the CHANGELOG entry plus slug shape check that DoD verification surfaced.

## Completion

**Finished**: 2026-08-20 02:45
**Final Status**: Completed
**Branch**: `feature/task.56.tracker-issue-cli`
**PR**: https://github.com/Gamaroff/agent-skills/pull/265
**QA Iterations**: 5 (gate 1 FAIL 70/100 → gate 2 PASS 94/100)
**DoD Summary**: `docs/tasks/task.56.tracker-issue-cli/task.56.dod.1.tracker-issue-cli.md`
