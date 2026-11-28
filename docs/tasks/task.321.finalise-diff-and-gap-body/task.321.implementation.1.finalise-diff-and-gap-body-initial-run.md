# Implementation Report: finalise's diff fallback is one commit, and its gap body leaks a marker

**Task**: `task.321.finalise-diff-and-gap-body.md`
**Run Number**: 1
**Started**: 2026-11-28 11:41
**Status**: In Progress
**Report format**: 2

---

## Summary

Give `/finalise` one reader for the PR's whole change (`finalise-diff.sh`) that names its source or refuses, and end `dod-gap-count.sh --body` at the change-log marker.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (work-started → transitioned)                               |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.321.*` exists in git                             | Branch created at `1fd2cc223`; pushed with tracking | —                    | 2026-11-28T11:42Z |
| 2. review-task             | ✅ Done    | `task.321.review.{N}.{name}.md` exists (or skip logged)               | `task.321.review.1.finalise-diff-and-gap-body.md` — READY TO IMPLEMENT 8/10; 0 critical, 3 important fixed; Planned → Ready for Development | —                    | 2026-11-28T11:58Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan names every hunk); 17 files, 21 tests; `ci:fast` 9045/0 fail after a format-only re-run; develop-complete posted | —                    | 2026-11-28T12:15Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.321.qa.{N}.*.md`; `task.321.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.321.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-28

- Dispatched by `/develop-next` (item T321, source `task-registry`) with `--defaults`; autonomous run.
- Phase 0 run inline (path given): no 0a-parallel agents dispatched. Lite-mode inputs derived from the document: risk_level `low`, phase_count 4, single_module false → PIPELINE_MODE `standard`.
- Feature branch base: develop — source: recommended (`--defaults`, no question asked)
- PR target branch: develop — source: recommended (`--defaults`, no question asked)
- Mode: standard — source: detector. Skips: none. Refused: none.
- AskUserQuestion: 0 questions (`questions[]` empty under `--defaults`).
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `planned` — proceeding; Step 2 `/review-task` validates and promotes.
- Tracker: github, issue #941.
- Branch: `feature/task.321.finalise-diff-and-gap-body` from `develop` (`1fd2cc223`). Implementation report stashed before branch creation, restored after.
- Tracker comment `work-started`: posted. GitHub board: work-started → transitioned.
- Priority-default block not run at Step 1; review-task's `set-github-project-priority.sh 941` then set the board Priority to P2.

### Step 2 — review-task

- review-task ran (status `planned`, no review report existed). Output format: Comprehensive report (pipeline default).
- Pre-pass B: `aligned` (axes source `architecture`); pre-pass C: `not-implemented`.
- Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete → `ready-for-development`.
- Fixes: I1 prompts' own status words (no `NEEDS_MANUAL_REVIEW` token exists); I2 fix-evidence check 5 reads `<DIFF_FILE>.names`; I3 eleven pattern-pinning tests listed; O1 anchor `:1281`→`:1345`; O2 criterion names its test. Plan file corrected for I1/I2.
- Review report: `docs/tasks/task.321.finalise-diff-and-gap-body/task.321.review.1.finalise-diff-and-gap-body.md`; `reviewed_blob` stamped.
- Review outcome comment skipped — review-task reported `posted` (stage `review-task-1`).
- Tracker key unchanged (941 at Step 1) — no work-started re-fire.

### Step 3 — develop

- Plan file found: `docs/tasks/task.321.finalise-diff-and-gap-body/task.321.plan.finalise-diff-and-gap-body.md` — included as implementation context for /develop.
- Pre-develop surface map: inline (independence loss recorded) — `finalise-diff.sh` (new), `skills/finalise/SKILL.md` Steps 3a/3e, the AC/docs/fix-evidence prompts, `dod-gap-count.sh`, three test files.
- Step 3 inline — /develop not invoked: the plan names every hunk. Inline path owes /develop's Task Completion Checklist; written below.
- Phase 3 test-first: the marker cases were red (4 of 5; the parity floor green) before the rule, green after.
- Phase 1 was **not** test-first: the script was written before `finalise-diff.test.mjs`, whose cases were green on first run. Each rule was mutation-proven instead, each alone and restored:
  - exclusion lookup disabled → "a bundled copy is excluded …" and "every changed file is a bundled copy …" red (bash + zsh);
  - `[ ! -s "$OUT" ]` empty-patch rule disabled → "every changed file is a bundled copy …" red;
  - forge-arm empty check disabled → "the branch adds nothing and the forge diff is empty" red;
  - `dod-gap-count.sh` marker rule disabled → "--body stops at every start marker …" and "--body keeps a fenced marker …" red;
  - the marker rule's `!infence` dropped → "--body keeps a fenced marker …" red.
- Beyond the plan: an executed-prose case cuts Step 3a's diff lines out of `SKILL.md` and runs them in bash and zsh for merge-base, forge, unresolved and a usage error (exit 2 → HALT, no `**PR diff:**` line).
- `SRC_DIR="shared/resources"` held in a variable: the literal `shared/resources/${rel}` read to the bundler as a file to bundle (`bundle:check` warned). The bundled copy was not rewritten (only `.md`/`.js` are), so behaviour was unaffected.
- shellcheck at the lane's `--severity=warning`: clean. One SC1091 info (`pr-read.sh` not followed), the same as `pr-read.sh`'s own sourcing.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 fast gate, iteration 1 — failed at `format:check`**, before any test ran: Prettier flagged the three test files this run wrote (`finalise-dod-prompt-contract.test.mjs`, `finalise-diff.test.mjs`, `finalise-gaps-path.test.mjs`). The background command had reported exit 0 because a trailing `echo` owned the exit code; the log's own `rc=1` showed the failure. Fixed with `prettier --write` on the three files, then `prettier --check .` was clean; gate re-run with its own exit code.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.321.finalise-diff-and-gap-body`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
