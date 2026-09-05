# Implementation Report: Add a shellcheck CI lane for the repo's shell scripts

**Task**: `task.92.shellcheck-ci-lane.md`
**Run Number**: 1
**Started**: 2026-09-05 13:40
**Status**: In Progress

---

## Summary

First run: add a shellcheck job to CI over the 56 tracked source shell scripts (excluding the 191
bundled copies under `skills/*/references/`), annotate the identified false-positive families with
reasoned `# shellcheck disable` comments, and prove the gate can fail.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                                  |
| PR target           | develop                                                                                                                                  |
| qa-planning gate    | skipped (auto)                                                                                                                           |
| Task risk level     | not set (frontmatter); §10 declares MEDIUM RISK                                                                                          |
| Pipeline mode       | standard                                                                                                                                 |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (issue #321, created during Step 2)                                                                                        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.92.*` exists in git                               | `feature/task.92.shellcheck-ci-lane` created from `develop` at `4e37cbe9`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.92.review.1.shellcheck-ci-lane.md` exists                        | 8/10 READY TO IMPLEMENT; 1 Critical + 4 Important + 3 Optional, all applied. Status `planned` → `ready-for-development`. Issue #321 created + linked | 2 Explore pre-passes (inline) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 26 → 0 warnings (11 real fixes, 15 reasoned disables); lane added + mutation-proved red; 155 files (18 hand, 137 bundled) | none — Step 2 pre-passes reused |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #322 → `develop`. 5 commits, generated output isolated in `d383fa90`. Issue #321 commented (`posted`) | —                    |
| 5–6. qa-task / qa-fix loop | 🔄 Cycle 1 done | `task.92.qa.{N}.*.md`; `task.92.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.92.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-05

- Run invoked by `/develop-next` (roadmap item **T92**, PHASE 5 — Current frontier, no deps) under the
  AUTONOMOUS RUN directive: all Phase 0d questions auto-answered with the recommended option.
- Feature branch base: **develop** — auto-answered (recommended); current branch is `develop`.
- PR target branch: **develop** — auto-answered (recommended); standalone task, standard Gitflow.
- qa-planning gate: skipped (auto — no prompt).
- Pipeline mode: **standard** — the task defines 4 implementation phases (≥3) and spans
  `.github/workflows/`, `shared/resources/`, `skills/*/scripts/`, `scripts/` and docs, so neither the
  phase-count nor the single-module lite-mode condition holds.
- Tracker: `TRACKER=github`, no `github_issue` in frontmatter at startup — work-started signal and
  board move skipped; Step 2 (`/review-task`) will link the issue if it creates one.
- Task status at startup: `planned` — per Phase 0c, proceed; Step 2 promotes it to
  `Ready for Development`.

### Step 3 — develop — 2026-09-05

- **Pre-develop surface map: 20 files** — no Explore subagent dispatched. Step 2's two pre-pass
  Explore agents already returned a complete, verified map (all five workflows quoted, `package.json`
  scripts, CONTRIBUTING/coding-standards/tech-stack doc targets, the bundle fan-out, and all 26
  warning sites with file:line and code). Re-running discovery would re-confirm what is already in
  context. Map recorded here in full:
  - **New**: `.github/workflows/shellcheck.yml` (the lane).
  - **Annotate — 14 files, 26 findings**: `.agents/scripts/backfill-story-issues.sh:37` (SC2034 EPIC);
    `scripts/release.sh:55`, `scripts/setup-consumer.sh:269`, `shared/resources/read-config.sh:52`
    (SC2209); `shared/resources/bitbucket-auth.sh:75,76` (SC2034 array + scalar);
    `shared/resources/develop-pipeline-on-precompact.sh:85` (SC2034 TASK_ID);
    `shared/resources/jira-sprint-lib.sh:106` (SC1007), `:124` (SC1090), `:239,240` (SC2034
    JSM_DEFERRED*); `shared/resources/resolve-platform.sh:67`,
    `shared/resources/set-github-project-estimate.sh:114`,
    `shared/resources/set-github-project-priority.sh:75` (SC1007 `CDPATH=`);
    `shared/resources/tracker-access.test.sh:1034,1040` (SC2211 backticks in prose), `:1486` (SC2010
    `ls | grep` — the one real finding);
    `skills/jira-sprint-manager/scripts/manage-sprint-state.sh:45-48` and
    `move-sprint-issues.sh:49-52` (SC2034 JSM_DEFER_*);
    `skills/mermaid-architect/scripts/lint.sh:63` (SC2034 VALID_TYPES_RE).
  - **Docs**: `CHANGELOG.md` (`### Changed`), `CONTRIBUTING.md` § "Before you open a PR",
    `docs/architecture/concepts/coding-standards.md` § "Validation before commit",
    `docs/architecture/concepts/tech-stack.md` § "Infrastructure and CI".
  - **Generated**: 139 `skills/*/references/*.sh` copies via `npm run bundle`.
- Plan file found: `docs/tasks/task.92.shellcheck-ci-lane/task.92.plan.shellcheck-ci-lane.md` —
  included as implementation context for `/develop`.
- Always-load files: 3 (`coding-standards.md`, `tech-stack.md`, `source-tree.md`) — all present.
- Planned/Draft gate auto-answered: Yes — `/review-task` validation in Step 2 is sufficient.
- qa-planning: skipped (auto).

#### Step 3 implementation record

**Phase 1 — gate and wiring.** `--severity=warning` (error is 0 and would stay 0; info/style add 55
findings dominated by deliberate SC2016/SC2015). Host: **new `.github/workflows/shellcheck.yml`**, one
job, `on: pull_request` + `push: [main, develop]`, **no path filter** — see the Step 2 Critical finding.
ShellCheck **pinned to v0.11.0** via the official release tarball rather than the runner image, and the
version is printed: an unpinned linter going red on untouched code is §10 risk 1, and the natural
reaction (widen the excludes) weakens the lane permanently. No `.shellcheckrc` — severity is a job flag,
and `external-sources=true` would have changed the two pre-existing `# shellcheck source=` directives.

**Phase 2 — triage.** All 26 warnings resolved. The task's triage held for the *families* it named but
was wrong that all 25 non-SC2010 findings were false positives — **11 had a real fix**:

| Finding | Disposition |
| --- | --- |
| SC2034 `EPIC` (`backfill-story-issues.sh`), `TASK_ID` (`develop-pipeline-on-precompact.sh`), `VALID_TYPES_RE` (`mermaid-architect/scripts/lint.sh`) | **Genuinely dead — deleted.** These are executables, not sourced libraries, so "set for the caller" does not apply. `VALID_TYPES_RE` had also already **drifted** from the inline regex it duplicated (`\b` vs `([[:space:]]|$)`), so using it would have been a behaviour change — deleting the stale copy is the honest fix. |
| SC2209 ×5 (`release.sh` `patch`/`true`, `setup-consumer.sh` `command`, `read-config.sh` `env`) | **Quoted the literal** — ShellCheck's own suggested fix, and identical bytes at runtime. Whole `case` arms quoted so the blocks stay uniform. |
| SC2211 ×2 (`tracker-access.test.sh:1034,1040`) | **A real defect, not a false positive.** The backticks sit inside a **double-quoted** string, so bash was executing `? access` as a command and the emphasis was being silently stripped from the assertion message. Changed the prose to single quotes. |
| SC2010 ×1 (`tracker-access.test.sh:1486`) | **Fixed** — `ls \| grep` → glob loop into an array. This also removed a pre-existing `# shellcheck disable=SC2086` (the array needs no word-splitting) and added an explicit empty-list guard: with no matches, `sed` takes no file operands and reads STDIN, which the `ls` form was equally exposed to and never checked. |
| SC2034 ×15, SC1007 ×4, SC1090 ×1 | **Reasoned disables.** Sourced-file output contracts (`BB_*`, `JSM_DEFERRED*`, `JSM_DEFER_*`), the `CDPATH= cmd` one-command env prefix, and a resolver path computed from `BASH_SOURCE`. |

**`export` was rejected for `BB_CURL_AUTH`** per the Step 2 finding — it is a bash array, and bash
cannot export arrays, so it would have silenced the warning while doing nothing observable.

**Two mistakes caught by re-running the tool**, both worth recording because neither is obvious:

1. A `# shellcheck disable=` directive covers **only the next command**. A single directive above a
   four-assignment `JSM_DEFER_*` block silenced one of four. Each assignment now carries its own.
2. A prose comment that begins `# shellcheck` is parsed as a **directive**. Explaining SC2209 in a
   comment starting with that word produced SC1073/SC1072 parse *errors* in `read-config.sh`. Reworded
   to "ShellCheck".

**Phase 3 — proved the gate fires.** Three mutation proofs, all run locally against the exact job body:

| Proof | Result |
| --- | --- |
| Deliberate SC2034 appended to **`scripts/setup-consumer.sh`** — chosen because it sits *outside* `validate.yml`'s path filter, so this exercises the Critical finding rather than around it | **exit 1**, naming `scripts/setup-consumer.sh line 1906`. Reverted; tree back to **exit 0**. |
| Sources-only `grep` dropped, simulating a future "fix" that widens the glob | **exit 1** — `File list includes bundled copies (247 files, expected ~56)` |
| Empty file list | **exit 1** — the lane refuses to report success on having checked nothing |

Final state: **56 files linted, 0 findings at `--severity=warning`, exit 0.** All seven shell test
suites pass. Workflow YAML parses; the pinned tarball URL returns 200.

**Phase 4 — documentation.** CHANGELOG `### Changed`; `CONTRIBUTING.md` § "Before you open a PR" and
`docs/architecture/concepts/coding-standards.md` § "Validation before commit" updated **in the same
change** (they are two copies of one list); `tech-stack.md` § "Infrastructure and CI" rewritten — it
claimed a single `validate.yml` running `npm test` on pushes to `main`, describing neither workflow that
exists. The sources-only rule (81 vs 725) is written as a comment **at the glob**, per §9.

**Bundle**: `npm run bundle` regenerated **137** copies (the review estimated 139). Total diff 155 files
— 18 hand-edited, 137 generated.

**Gate**: `npm run ci:fast` — **exit 0** (`.claude/state/task92-cifast-1.log`). No failures.

### Steps 5–6 — QA cycle 1 + qa-fix — 2026-09-05

**QA cycle 1 → CONCERNS (80/100)**, artifacts `task.92.qa.1.*` / `task.92.gate.1.*`. All 11 success
criteria met; the central ones verified in **real CI** — 5/5 jobs green on PR #322, including the new
`shellcheck` job and `test` (which runs `eval:all`, closing criterion 8 that only `ci:fast` had
covered locally). Three of four mutation proofs held.

The fourth was the finding, and it was **my own code**:

- **TASK-92-001 (MEDIUM)** — the empty-list guard I added at `tracker-access.test.sh:1496` did not
  guard. Section 44 runs inside a **top-level** `if [ -d "$HERE" ]` block, not a function, so `return`
  there is illegal; the `2>/dev/null || true` I wrote after it hid both the error message and the
  status, so control fell through into the very `sed` the guard exists to skip — the STDIN hang its
  own comment claimed to prevent. Proven with a minimal repro before fixing.
  **Fix**: if/else instead of an early return, with the reason for the structure written in.
  **Mutation-proved**: forcing the glob to match nothing makes the suite print
  `FAIL reader-key guard` and exit 1 in normal time. Before the fix it fell through instead.
  Worth recording plainly: this is the same shape as `task.90`, in a task whose whole point is
  catching it, introduced while fixing a different finding. The guard was never exercised because
  the directory always has sibling `.sh` files — a green suite was not evidence.
- **TASK-92-002 (MEDIUM)** — three pre-existing bare `# shellcheck disable` directives in
  `jira-sprint-lib.sh` (:133 SC2034, :328/:365 SC2064) left criterion 6 ("No bare suppressions")
  unmet repo-wide, inside the change that introduces the rule. **Fix**: all three annotated.
- **LOW** — 8 new SC2034 directives carried their reason in a block comment above rather than inline,
  so a `grep '# shellcheck disable'` audit read them as bare. **Fixed too** rather than deferred: an
  audit that has to be told about an exception is not an audit. There are now **zero** bare disables
  in any of the 56 source scripts.

Post-fix: shellcheck exit 0 over 56 files, `npm run ci:fast` exit 0, shell suites pass,
`npm run bundle` re-run (3 further copies).

### Step 2 — review-task — 2026-09-05

- Output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds
  autonomously and needs the task corrected before Step 3.
- Step 9 auto-answered: **Yes, fixes complete** — outcome was READY TO IMPLEMENT, so the task was
  promoted `planned` → `ready-for-development`.
- Tracker sync auto-answered: **Sync to GitHub** — dedup search for `in:title "[Task 92]"` returned
  zero matches; created issue **#321**, added to the "Agent Skills" board, priority P2, milestone
  "Technical Tasks (standalone)". The deferred `work-started` signal from Step 1 was then fired
  (comment `posted`, board move `exitCode 0`).
- Review report: `docs/tasks/task.92.shellcheck-ci-lane/task.92.review.1.shellcheck-ci-lane.md`
  (8/10, READY TO IMPLEMENT).
- **Baseline re-measured** with `koalaman/shellcheck:stable` 0.11.0 (shellcheck is not installed on
  this host; Docker is). The task's §3 snapshot reproduces **exactly**: 247 tracked `.sh`, 56
  sources, 191 bundled, and 0 / 26 / 79 / 81 findings at error/warning/info/style with 14 files
  affected at `warning`.
- **Critical finding, applied to the task**: `validate.yml` — the task's recommended home — is
  path-filtered to `skills/**` / `shared/resources/**` and excludes `scripts/setup-consumer.sh`,
  `scripts/release.sh` and `.agents/scripts/backfill-story-issues.sh`, each of which carries a
  warning today. Decision for Step 3: **a separate one-job `shellcheck.yml`** with no path filter,
  triggers mirroring `test.yml`.

### Step 1 — create-branch — 2026-09-05

- Branch `feature/task.92.shellcheck-ci-lane` created from `develop` at `4e37cbe9` and pushed with
  upstream tracking. `/create-branch` was not re-prompted for a base (Q1 answer pre-supplied).
- Implementation report stashed before branch creation, restored after (`git stash pop`, clean).
- Work-started tracker signal **skipped**: `TRACKER=github` but no `github_issue` in the task
  frontmatter, so there is no issue to comment on or board item to move.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: _pending_
**Final Status**: _pending_
**Branch**: `feature/task.92.shellcheck-ci-lane`
**PR**: [#322](https://github.com/Gamaroff/agent-skills/pull/322)
**QA Iterations**: _pending_
**DoD Summary**: _populated after Step 7_
**Tracker debt**: _populated after Step 7_
