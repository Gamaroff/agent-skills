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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #308](https://github.com/Gamaroff/agent-skills/pull/308); 3 commits; issue comment skipped (none linked) | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.70.qa.{N}.*.md`; `task.70.gate.{N}.*.yml`; PR comment posted     | 2 cycles: FAIL 50/100 → PASS 92/100. 17 issues, 16 fixed, 7 mutation proofs | 2 Explore reviewers |
| 7. finalise                | ✅ Done    | `task.70.dod.{N}.*.md`; task `status: accepted`                        | DoD PASSED; CI SUCCESS on final head; 29 boundary probes, 0 reproduced | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | 4 commits: `c55e1c2`, `f3adeff`, `de4b484`, `b56cb5a`, `ebd7352`, `deb111d` — pushed to origin | —                    |

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

### Cycle 1 — qa-task — 2026-09-02 — **FAIL (50/100)**

5 HIGH, 4 MEDIUM, 3 LOW. Gate: `task.70.gate.1.inline-pr-comments.yml`.

**The independent reviewer earned its cost.** Three of the four highest-severity findings came from
the Step 3b Explore subagent, not from the self-check — and it verified two of them by *executing*
`runGithub` rather than reading it. The suite was 40/40 green and the module still dropped findings
on a reachable path. A pipeline that writes code and then reviews its own code with the same context
will confirm what it already believes; this is the concrete instance of that.

**Two findings I should have caught and did not:**

- `TASK70-001` — the duplicate-marker branch drops the finding entirely. I wrote the adjacent
  unreadable-list branch to degrade, then wrote this one not to, in the same function, in the same
  sitting. The asymmetry was invisible to me because I *knew* what I meant.
- `TASK70-004/005` — I wrote the jq wiring from memory of the findings schema instead of opening
  `code-review-prompt.md`. Both field references are wrong. The irony is exact: this task exists
  because `/review-code` documented behaviour that was never built, and I wired it up with a snippet
  that cannot run.

**Why the local gate passed and CI did not** (`TASK70-003`): `stdout-drain-on-exit.test.mjs`
enumerates shipped CLIs from the **tracked** tree. `npm run ci:fast` ran while the new file was still
untracked, so the guard could not see it; CI checks out only tracked files and went red at once.
Re-running the identical command post-commit reproduces it locally. Known shape in this repo — a
working-tree gate is blind to a file git does not yet know about — and worth remembering as: *run the
guard suite again after the first commit of a new shipped file.*


---

## Completion

**Finished**: 2026-09-02
**Final Status**: Completed
**Branch**: `feature/task.70.inline-pr-comments`
**PR**: [#308](https://github.com/Gamaroff/agent-skills/pull/308)
**QA Iterations**: 2 (cycle 1 FAIL 50/100 → cycle 2 refute PASS 92/100)
**DoD Summary**: `task.70.dod.1.inline-pr-comments.md`
**Tracker debt**: none deferred — but the task has **no linked tracker issue** at all (no `github_issue`), so no issue was closed and no board card moved. Flagged Important in the cycle-1 review; run `/sync-github-task` to link one.

### Cycle 1 — qa-fix — 2026-09-02 — all 9 issues resolved

Every fix mutation-proven; four mutations run, each turning exactly its own assertion red and each
restored to green (A: duplicate-marker degrade; B: id body-hash; C: the jq snippet; D: Bitbucket
update-in-place). Suite 40 → 46 tests, plus a new executable guard in both skill suites.

**The one structural fix, not just a bug fix:** TASK70-004/005 were invisible to every existing
check. `qa-execute-snippets` skips those blocks as `mutating` (they redirect to a file), and a human
reading them sees plausible jq. The fix therefore is not "correct the two snippets" — it is the new
guard that **extracts the jq program from SKILL.md and runs it against a schema-shaped fixture**. A
snippet that is only ever read will drift again; one that is executed cannot.

**Two cleanups deliberately deferred**, both recorded in the QA report: the summary comment's own
marker (changes the summary's identity semantics) and threading the injected `env` through
`loadDotEnv` (touches credential resolution). Each is a legitimate change that does not belong at the
end of a fix cycle.

### Cycle 2 — qa-task (refute pass) + qa-fix — 2026-09-02 — **PASS (92/100)**

Eight further issues, 2 HIGH. All fixed; one deferred with a stated reason. Three more mutation
proofs (seven across both cycles). Gate: `task.70.gate.2.inline-pr-comments.yml`.

**The refute rule paid for itself, and it is worth recording why.** The skill mandates that cycle 2
re-reads the *whole* branch diff rather than narrowing to files changed since the last gate. Two of
the eight findings — `gh api --paginate` needing `--slurp`, and the jq aborting the entire array on
one malformed `file_line` — were present in the **original commit** and invisible to cycle 1. A
narrowed cycle 2 would have read only cycle 1's repairs and passed clean.

**Cycle 1's fixes created two of cycle 2's defects**, which is the honest headline:

- `TASK70-C2-005` — cycle 1 correctly made every `unverifiable` site also push to `degraded`. That
  silently made the run-level `unverifiable` branch unreachable, because it tested `!degraded.length`.
  A documented reason could no longer be emitted and `--strict` could never report the condition it
  exists for. The suite stayed green throughout: nothing covered the branch.
- `TASK70-C2-003` — cycle 1 added the stale-anchor check to the GitHub arm only, and I wrote a
  contract paragraph excusing the gap ("Bitbucket has no equivalent of `position: null`") that was
  true and beside the point. The comparisons that actually fire are path and line, which Bitbucket
  returns on every inline comment. I documented a limitation instead of noticing it was not one.

**The worst finding was a false claim in my own docstring.** `findingId` said the caller "knows
better than we do which findings are the same finding across runs". Both real producers emit
`CR-{n}`, commented *"stable within this run"* in their own prompt files. I asserted a property the
schema explicitly denies, and the cycle-1 body-hash fix therefore protected nothing for either real
caller. Checking the two producer schemas would have taken one grep.

**Deferred, with reasons** — the summary comment's own marker (changes identity semantics), and
extracting one `partitionFindings()` so a rule cannot be added to one arm and missed by the other.
The latter is the direct structural cause of `TASK70-C2-003` and is recorded as the standing
Maintainability CONCERNS rather than waved at.

---

## Retrospective — what this run actually demonstrates

The pipeline worked, and the interesting part is *how* it worked rather than that it did.

**Development produced a 40/40-green suite and a module that dropped findings.** Not through
carelessness — the invariant was stated in the docstring, the contract, and three tests. It was
violated on a branch I wrote minutes after writing the branch beside it that handles the same
situation correctly. Self-review could not see it because I knew what I meant.

**The independent reviewers found what the self-check could not.** Three of cycle 1's four worst
defects, and both of cycle 2's HIGH findings, came from an Explore agent that had not written the
code — and it verified several by *executing* the module rather than reading it. Two agents across
two cycles is the entire reason this task did not merge broken.

**Cycle 1's fixes created cycle 2's defects.** Making every `unverifiable` site also degrade was
correct, and it silently made a neighbouring branch unreachable. Adding the stale-anchor check to
one arm was correct, and I then wrote a contract paragraph excusing its absence from the other —
documenting a limitation instead of noticing it was not one. This is the specific value of the
refute rule: a fix is new code, and it is the least-reviewed code in the change set.

**Two defects were in the original commit and survived cycle 1 entirely.** `gh api --paginate`
needing `--slurp`, and the jq aborting on one malformed `file_line`. A narrowed cycle 2 — scoped to
files changed since the last gate — would have read only cycle 1's repairs and passed clean. The
whole-diff rule is what caught them.

**The most useful artifact is a guard, not a fix.** `TASK70-004/005` were invisible to every
existing check: `qa-execute-snippets` skips those blocks as `mutating`, and a reader sees plausible
jq. Correcting the two snippets would have left the next edit free to break them again. Extracting
the jq from SKILL.md and executing it against a fixture is the change that persists.

**Three claims I asserted as fact and did not check.** That the caller's `id` was stable across runs
(both producer schemas say otherwise, in a comment, one grep away). That `gh api --paginate` merges
pages (its own `--help` says otherwise). That Bitbucket could not detect a moved anchor (it returns
`inline.path` on every comment). Each cost a QA cycle. The pattern is not carelessness about code —
it is treating a remembered API contract as verified.
