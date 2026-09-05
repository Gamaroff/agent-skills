# Implementation Report: Reconcile install-time and run-time tracker resolution

**Task**: `task.91.reconcile-tracker-resolution.md`
**Run Number**: 1
**Started**: 2026-09-05 07:52
**Status**: In Progress

---

## Summary

Reconcile `setup-consumer.sh`'s `_resolve_install_tracker` with the run-time resolver
`shared/resources/resolve-platform.sh`, so install-time skill filtering and run-time platform
resolution cannot disagree about which tracker a repo uses.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                  |
| PR target           | `develop`                                                                  |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set (frontmatter `risk_level:` absent)                                 |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | Issue #319 created in Step 2, board Priority P2 ✅                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.91.*` exists in git                               | `feature/task.91.reconcile-tracker-resolution` created from `develop` at `a51e4fe9`; pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.91.review.{N}.{name}.md` exists (or skip logged)                 | `task.91.review.1.reconcile-tracker-resolution.md` — READY TO IMPLEMENT, 9/10, 0 critical / 3 important / 1 optional; 3 fixes applied; status promoted | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | A+B implemented; 7/7 divergence rows OK; 4 mutation proofs; shellcheck 0 new; bundle re-run | — (inline surface map) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.91.qa.{N}.*.md`; `task.91.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.91.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Step 3 — develop — 2026-09-05

- **Pre-develop surface map**: built inline, not via an Explore subagent. The task's scope is five
  named files, all of which Step 2 had already opened and verified line-by-line during the
  anti-hallucination pass. Dispatching a fresh Explore to re-derive a surface already in context
  would have re-read the same files to reach the same list.
  Surface: `scripts/setup-consumer.sh` (`_resolve_install_tracker`, its two call sites at the dry-run
  and real-install branches), `shared/resources/resolve-platform.sh` (the identity block, line 438),
  `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` (§4b `PARITY_CASES` + the fixture
  install helpers), `docs/reference/configuration.md`, `shared/resources/platform-detection.md`,
  `CHANGELOG.md`.
- **Plan file found**: `task.91.plan.reconcile-tracker-resolution.md` — included as implementation
  context. Its divergence table was used as the acceptance harness throughout.
- **Always-load files**: 3 read from `devLoadAlwaysFiles`.
- **Phase 1 — decided empirically, recorded in the task's §3 before any code was written.** Resolver
  reachability was established by *running* the paths and downloading the real v0.45.0 archive:
  sites 1 (real install) and 2 (`--update`) reachable, site 3 (`--dry-run` via the documented
  `bash <(curl …)`) not.
- **The finding that changed the approach**: Options A and B are **not alternatives**. Rows 6 and 7 of
  the divergence table are config-*parsing* divergences (fixed by A); row 5 is a *source* divergence
  that A cannot fix — delegating wholesale would delete the installer's `.env` probe, which is
  Option C, explicitly rejected. **Decision: A + B**, with B first so that delegation preserves the
  probe instead of removing it.
- **A second design correction, caught by testing rather than reading**: an earlier attempt delegated
  only `read_config_key`. For `tracker:<TAB>jira` that returns `jira` while the resolver's full
  resolution returns `github` — pyyaml rejects the tab, so the typed bulk read reports the file
  unparseable and the resolver falls back to detection rather than to its tier-2 grep. Delegating a
  *part* of the resolution moves the divergence one layer down. Only the exported `TRACKER` is
  authoritative. This is recorded in the code comment so the next reader does not retry it.
- **Acceptance**: all **7** rows of the plan's divergence table read `OK` (they read 4 OK / 3 DIVERGES
  before the change). Four extra shapes checked too — single-quoted, map form, lone unmatched quote,
  `access.tracker`-only — all OK.
- **Mutation proofs — 4, each reverting the *specific* behaviour:**

  | # | Mutation | Result |
  |---|---|---|
  | 1 | `.env` probe → `elif false` in `resolve-platform.sh` | 2 red, incl. `install and run time agree on a \`.env\`-only JIRA_URL` |
  | 2 | installer coerces an unrecognised scalar to `github` instead of `return 2` | 2 red, incl. `install and run time agree on \`unrecognised scalar\`` |
  | 3 | delegate `read_config_key` instead of the whole resolution | 10 red, incl. `install and run time agree on \`tab separator\`` |
  | 4 | `.env` probe reverted, against the new integration test | 3 red, incl. `a \`.env\`-only JIRA_URL installs the set its skills will actually resolve` |

- **Two pre-existing tests deliberately inverted**, both because they pinned divergences this task
  removes — the task document's Known Issues predicted the first:
  - `the .env probe is a DELIBERATE asymmetry, not an oversight` → replaced by
    `install and run time agree on a \`.env\`-only JIRA_URL`, with the history kept in a comment.
  - `the resolver only ever returns jira or github` → replaced by
    `the resolver never emits a raw config token as a tracker`. This one was **not** predicted: it
    asserted the installer coerces a garbage scalar to `github`, which is the silent-default
    behaviour Phase 3 replaces with a refusal. The property it protected (a raw token never reaches
    the filter as a tracker) is preserved and now guaranteed more strongly.
- **`shellcheck` — run, not written off.** `docker info` failed at first; the Docker daemon was
  started rather than recording the criterion unrunnable. Result: **branch 1 finding, baseline
  (`origin/develop`) 1 finding, both the same pre-existing `SC2209` — 0 new.**
- `npm run bundle` re-run; 38 skills carry the updated resolver, 38 the updated `platform-detection.md`.

### Step 2 — review-task — 2026-09-05

- **review-task output format** auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- **Tracker sync** auto-answered: **Sync to GitHub**. The task had no `github_issue:`, while siblings task 83 (#316) and task 84 (#317) both do; Steps 4 and 7 need an issue to comment on and close. Dedup search returned zero matches, then created [#319](https://github.com/Gamaroff/agent-skills/issues/319) (labels `task`, `priority:medium`; milestone `Technical Tasks (standalone)`), added it to the *Agent Skills* board and set Priority **P2**. `TRACKER_ISSUE` is now `319` and the pipeline lock was updated to match.
- **review-task Step 8.5** auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously.
- **review-task Step 9** auto-answered: **Yes, fixes complete** — `planned` → `ready-for-development`.
- **Review outcome**: READY TO IMPLEMENT, readiness **9/10**, 0 critical / 3 important / 1 optional. Report: `task.91.review.1.reconcile-tracker-resolution.md`.
- **Three fixes applied**: linked issue #319 (frontmatter + body link); added `risk_level: medium`; corrected two stale line references (`setup-consumer.sh:820`→`878`, `configuration.md:148`→`153`).
- **One finding deliberately not applied**: `estimated_effort_hours: 3` diverges from the rubric's 8h by >2×. Non-blocking by spec, and silently overwriting an author's own estimate is not a reviewer's call — flagged in the report for the author.
- **Zero hallucinations.** Every technical claim in the task document was verified against source. The `shellcheck` baseline claim (1 pre-existing SC2209) could not be re-run — the Docker daemon is down on this host — but is corroborated by commit `c5ca3ec7`, which measured `origin/develop` independently and got the same result. **Phase 4 must run it for real.**
- Review comment posted to issue #319 (`reason: posted`).

### Pipeline Startup — 2026-09-05

- **Invocation**: dispatched by `/develop-next` (roadmap item **T91**, PHASE 5, deps `T83` satisfied, source `roadmap`).
- **Autonomous run directive active** — Phase 0d questions auto-answered with the recommended option, no prompts.
- Feature branch base: `develop` — auto-answered (develop-next autonomous directive; auto-derived recommendation for a standalone task).
- PR target branch: `develop` — auto-answered (develop-next autonomous directive; auto-derived recommendation).
- qa-planning gate: skipped (auto — no prompt).
- **Phase 0a**: resolver subagent not dispatched — the task file path was supplied explicitly by the selector and verified to exist on disk.
- **Phase 0a lite-mode detection**: performed inline rather than via subagent. The step-0 protocol references a "production lite-mode CLI"; **no such script exists in this repo** (`skills/develop-task/scripts/` holds only the three hook scripts, and a repo-wide search for `*lite-mode*` returns only the contract `.md` in `shared/resources/` and its bundled copies). Inputs were read directly from the task document.
- **Pipeline mode: standard** — computed from the three booleans: `risk_ok = true` (frontmatter `risk_level:` absent, which is in the accepting set `{low, absent}`), `phase_count = 4` (§6 Implementation Plan Phases 1–4) which is **not** `< 3`, and `single_module = false` (scope spans `scripts/setup-consumer.sh`, `shared/resources/resolve-platform.sh`, the eval/test harness and config docs). Two of three conditions fail, so lite mode does not apply.
- **Tracker**: `TRACKER=github`, `VCS=github`, `ACCESS_TRACKER=full`, `ACCESS_VCS=full` (resolved via `references/resolve-platform.sh`; `JIRA_URL` unset).
- **No linked tracker issue** — the task frontmatter carries no `github_issue:`. Tracker comments and board moves are skipped until Step 2 (`/review-task`) links one via `ensure-task-github-issue`.
- **Task status `planned`** — noted, not a halt. Per the Phase 0c status table, `Planned` proceeds and Step 2 promotes it to `Ready for Development`.
- **Environment**: the login shell's `node` is an nvm lazy-load *function* that prints the full nvm help text to **stdout** before exec'ing node, which corrupts any command whose stdout is parsed as JSON. All node invocations in this run use the absolute binary `/Users/gamaroff/.nvm/versions/node/v24.13.1/bin/node`.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 1 — Signal Work Started skipped (not an error).** The 0c-reg tracker signal fires only when
  `TRACKER_ISSUE` is set. Task 91 has no `github_issue:` in its frontmatter, so there is no issue to
  comment on or move. Step 2 (`/review-task`) is expected to create and link one via
  `ensure-task-github-issue`; the signal is re-evaluated from Step 4 onward.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.91.reconcile-tracker-resolution`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
