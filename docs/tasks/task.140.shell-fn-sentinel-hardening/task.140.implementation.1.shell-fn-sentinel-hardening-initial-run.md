# Implementation Report: Harden the shell-fn: sentinels and the fake-gh coverage

**Task**: `task.140.shell-fn-sentinel-hardening.md`
**Run Number**: 1
**Started**: 2026-09-30 07:43
**Status**: In Progress

---

## Summary

Close the seven limits recorded on task.136 (library EXIT trap, errexit source status, needs-fake-gh on both shell forms, detector terminators + one-level source, fixture lint lanes, dead clause, symlink containment).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (gh-stage: transitioned; re-check: already)                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.140.*` exists in git                             | Branch created at `1dce6511`; pushed with upstream | —                    |
| 2. review-task             | ✅ Done | `task.140.review.{N}.{name}.md` exists (or skip logged)               | `task.140.review.1.shell-fn-sentinel-hardening.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; audit 17/17 `ready-for-review` | `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.140.qa.{N}.*.md`; `task.140.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.140.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-30

- Dispatched by `/develop-next` (autonomous run): selected T140 from the task-registry fallback (no actionable roadmap phase row).
- Upfront Setup — questions asked: 2 (Q1, Q2), both auto-answered per the develop-next AUTONOMOUS RUN directive:
  - Q1 Feature branch base: develop — auto-derived recommended (on `develop`)
  - Q2 PR target branch: develop — auto-derived recommended
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no subagents dispatched — a first-class case per step-0 §0c). Lite-mode inputs derived from the document: risk_level=medium (not in {low,absent}), phase_count=4, single_module=false → PIPELINE_MODE=standard.
- Always-load files resolved: 3 files — from skills-config.yaml `devLoadAlwaysFiles`.
- Tracker: github, issue #464. Status at start: `planned` — Step 2 (`/review-task`) validates and promotes.

---

### Step 1 — create-branch

- Branch `feature/task.140.shell-fn-sentinel-hardening` cut from `develop` at `1dce6511` and pushed. Report stashed before branch creation, restored after.
- Pipeline lock written (`current_step: 2`).
- Tracker: work-started comment `posted` on #464; board work-started → `In Progress` (transitioned).
- Priority default block not run: the issue already carries Priority High (edit-task, 2026-09-22) and the block only writes when unset.

### Step 2 — review-task

- Ran `/review-task` (status `planned`, no report existed). Output: Comprehensive report (pipeline default). Step 8.5 auto-answered "apply all critical + important"; Step 9 auto-answered "fixes complete".
- Review report: `docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.review.1.shell-fn-sentinel-hardening.md` — 1 Critical (plan's `head -c 21` shebang test never matches — executed), 3 Important (source-follow base, `isWithin`, decayed counts), 3 Optional; all Critical/Important fixed in task + plan.
- Invariant executed: the plan's new `SHELL_FN_BODY` returns 97 for own-EXIT-trap and `set -e; false` libraries on bash 5.3 / bash 3.2 / zsh 5.9; clean 0 and collision 99 unchanged.
- Review Q1 (source-follow resolution base) auto-answered with the recommended option: library dir, then root.
- Pre-pass agents B/C not dispatched (inline) — independence loss recorded in the report.
- Planned promoted to Ready for Development by review-task. Tracker: `review-task` and `review` comments `posted` on #464; board Priority self-healed to P1.

### Step 3 — develop

- Fast gate: `develop.fastGateCommand` unset → `npm run ci:fast` (fallback); precondition passed (the script is defined).
- Pre-develop surface map: 8 files identified (inline — the Explore pass was not dispatched; the Step 2 review had already read every target): `shared/resources/security-probe.mjs` (SHELL_FN_BODY, GH_COMMAND_WORD, resolveEntry, needs-fake-gh gate), `shared/resources/tests/security-probe.test.mjs` (task.136 block, FN_FIXTURES/LABEL_CASES/FAKE_GH), `scripts/lint-shell.sh` + `.github/workflows/shellcheck.yml` (twin file lists), `shared/resources/probe-boundary-rule.md` §5, `CHANGELOG.md`, `tests/fixtures/fake-gh/gh`, `evals/shared/tests/lint-shell-absent-binary.test.mjs` (PATH-stubbed run of the lane).
- Plan file found: `docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.plan.shell-fn-sentinel-hardening.md` — included as implementation context.
- Step 3 inline — /develop not invoked: the plan names every hunk and the review had already executed its central claim; both preconditions (plan file + surface map) are recorded above.
- Branch-point count of pre-existing rows: `grep -cE '^\s*test\(' shared/resources/tests/security-probe.test.mjs` → 100.
- **Phase 1** — 5 rows added; all 5 red against the task.136 engine for the stated reason (own-trap/errexit/shell: → `absent` not `unverifiable`; gh shapes → `no-hostile-case-was-rejected` not `needs-fake-gh`; symlink → `ok: true`).
- **Phase 2** — body (shadowed `exit`, `src=$?`), gate on `isShellForm`, `namesGh` (terminators, `GH_VARIABLE`, one-level source: library dir then root, `isWithin`), dead clause removed, `realpathSafe` on root and entry. 105/105.
- **Mutation proofs** (`cp` snapshot → mutate → run → restore; engine `cmp`-identical after; log copied to `.claude/state/t140-mutations.log`):

  | Mutant | Reverts | Red row (only) |
  | --- | --- | --- |
  | M1 | `exit` shadow + `unset -f exit` | own EXIT trap (c3-CR-1) |
  | M2 | `src=$?` → `source "$1" \|\| exit 97` | set -e top-level failure (PR-review CR-1) |
  | M3 | gate → `kind === "shell-fn"` | `shell:` names gh (c3-CR-2) |
  | M4 | terminators → `(\s\|$)` | gh shapes (c3-CR-3) — `semi.sh` |
  | M5 | drop the one-level source follow | gh shapes (c3-CR-3) — `src-rel.sh` |
  | M6 | drop `realpathSafe` on the entry | symlink refused |
  | M7 | drop `GH_VARIABLE` | gh shapes (c3-CR-3) — `var.sh` |
  | P1 | `read -r first` → `frist` in the workflow only | lane parity: identical block |
  | P2 | shebang literal changed in both lanes | lane parity: selects the fake gh |

- **Phase 3** — identical `BEGIN/END extensionless-fixtures` block in both lanes; `npm run lint:shell` → 78 source shell scripts (77 at the branch point), clean. Red-lane proof in a scratch worktree (removed): fixture + `unused_t140=1` → SC2034 **red** with the block, **green** with the branch-point script.
- **Phase 4** — rule §5 (real-path containment; sentinel paragraph; fake-gh on both forms, detector definition; residual race stated); engine header; `npm run bundle` (6 bundled copies); `bundle:check` 0; CHANGELOG `[Unreleased]` › Fixed.
- task.136 green path: `--sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --fake-gh tests/fixtures/fake-gh --json` → `engages`, executed 20, shells bash+zsh, declined 0; without `--fake-gh` → `unverifiable` / `needs-fake-gh`, executed 0.
- Wall-clock: branch point 63.0 s vs branch 63.1 s for the probe test file (task's "~30 s" had decayed).
- `npm run ci:fast` → exit 0 (log removed).
- Loop audit iter 1 (Explore, 10 s): `{status: ready-for-review, completed: 17, total: 17}` → loop exit. Development-complete comment `posted` on #464.

## Issues Log

- **Step 3 — a success criterion the plan could not meet.** `"$GH" api` is an uppercase variable; the planned `GH_COMMAND_WORD` matches lowercase `gh` only, so the §9 criterion was unreachable by the plan. Added `GH_VARIABLE`. The Step 2 review's check 10 (outcome reachability) should have walked that input through the regex and did not.
- **Step 3 — the plan's red-lane proof used an info-tier finding.** SC2086 is `info`; both lanes gate at `--severity=warning`. Used SC2034. Also the plan's relative-source path was one directory short for a lib in a `mkdtemp` dir.

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.140.shell-fn-sentinel-hardening
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
