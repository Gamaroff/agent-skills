# Implementation Report: [Task 60] Give the config reader's awk tier a grammar, or make it refuse

**Task**: `task.60.config-reader-strict-subset.md`
**Run Number**: 1
**Started**: 2026-08-18 07:20
**Status**: In Progress

---

## Summary

Narrow the awk tier of `shared/resources/read-config.sh` to a documented strict subset and make it refuse anything outside it, turning silent permissive escalations into loud, correct refusals.

---

## Pipeline Configuration

| Setting | Value |
| ------- | ----- |
| Feature branch base | `feature/task.60.config-reader-strict-subset` (already checked out) |
| PR target | `develop` |
| qa-planning gate | skipped (auto) |
| Task risk level | medium |
| Pipeline mode | standard |
| Always-load files | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status | In Progress ✅ (already; `gh-stage.js` reason=`already`) |

---

## Pipeline Progress

| Step | Status | Required Artifacts | Notes | Subagent summary ref |
| ---- | ------ | ------------------ | ----- | -------------------- |
| 1. create-branch | ✅ Done | Branch `feature/task.60.*` exists in git | Pre-existing branch at `7ebb509`, tracks `origin/feature/task.60.config-reader-strict-subset`, develop is ancestor | — |
| 2. review-task | ✅ Done | `task.60.review.{N}.{name}.md` exists (or skip logged) | Skipped — already reviewed; report at `task.60.review.1.config-reader-strict-subset.md` | — |
| 3. develop | ✅ Done | Task status == `Ready for Review` | 6/6 phases; 371/371 tracker-access (baseline 285), 1287/1287 npm test, 115/115 validate:all, Prettier clean, bundle idempotent; 21 mutations / 0 survivors | — |
| 4. create-pr | ✅ Done | PR URL; issue comment posted | PR #248 → develop, OPEN; 3 commits (feat / docs / bundle regen); issue #247 commented | — |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.60.qa.{N}.*.md`; `task.60.gate.{N}.*.yml`; PR comment posted | 2 cycles: CONCERNS 80 → PASS 95; 4 findings closed | — |
| 7. finalise | ✅ Done | `task.60.dod.{N}.*.md`; task `status: accepted` | DoD 23/23, CI SUCCESS on `e1f16bc`; issue #247 closed; board `done`=already | — |
| 8. commit-changes | ✅ Done | All artifacts committed and pushed | | — |

---

## Decisions Log

### Pipeline Startup — 2026-08-18

- Phase 0 subagent fan-out: **not dispatched**. Session-level policy forbids Agent-tool dispatch unless the user requests it; the resolver, tracker-poller and lite-mode inputs were gathered inline instead (same inputs, same aggregation rule).
- Resolver: input was a task directory; file resolved to `docs/tasks/task.60.config-reader-strict-subset/task.60.config-reader-strict-subset.md`.
- Tracker: `JIRA_URL` unset → `TRACKER=github`, `TRACKER_ISSUE=247` (OPEN).
- Pipeline mode: **standard** — computed from `risk_ok=false` (`risk_level: medium` ∉ {low, absent}), `phase_count=6` (≥3), `single_module=false`.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`; all verified present on disk.
- Previous-run check: branch `feature/task.60.config-reader-strict-subset` exists and is checked out; **no PR**, **no implementation report** → no pipeline state to resume. Started fresh on the existing branch rather than prompting, since there were no recorded steps to resume from.
- Q1 Feature branch base: `feature/task.60.config-reader-strict-subset` — already checked out; carries the uncommitted review report.
- Q2 PR target branch: `develop` — standard Gitflow for tasks.
- qa-planning gate: skipped (auto — no prompt)
- Step 1: `/create-branch` **not invoked** — the target branch `feature/task.60.config-reader-strict-subset` already existed, was already checked out, tracked `origin`, and sat at develop's tip (`7ebb509`). Step 1's required artifact was already satisfied; invoking the skill would only have raised its interactive "switch to existing branch?" prompt in a hands-free run. No stash/restore was needed.
- Tracker signal: issue #247 comment posted; `gh-stage.js --stage work-started` returned `reason=already` (board already In Progress). Priority already `P1 High` — left untouched (never overwrite a human's choice).

- **Step 2 — `/review-task` skipped**: task status is `Ready for Development` and a review report exists at `docs/tasks/task.60.config-reader-strict-subset/task.60.review.1.config-reader-strict-subset.md` (Skip/Run decision table, row 2). The report records 5 Critical + 5 Important findings, all marked implemented in the task and plan on 2026-08-18. Skip notice posted to issue #247.

- **Pre-develop surface map**: 11 files identified in `shared/resources/` (the config reader and its resolver), the test suite, CI, and the docs that specify the subset. Gathered inline from the task's §7 Files Summary and the plan, then verified on disk (no Explore subagent — same session policy as Phase 0):
  1. `shared/resources/read-config.sh` (581 lines) — tiered YAML reader; gains `__UNSUPPORTED__`, the source-time subset scan, and the `__ERR__` reason field
  2. `shared/resources/resolve-platform.sh` (401) — hoisted refusal check above the identity block; `__UNREADABLE__` branch folded in
  3. `shared/resources/tracker-access.test.sh` (1059) — §30 awk arm inverted, §41 migrated, two new matrices
  4. `shared/resources/resolve-platform.test.sh` — regression only
  5. `shared/resources/resolve-paths.sh` (61) — never-fail contract must survive
  6. `shared/resources/platform-detection.md` (286) — subset spec replaces the *Known limit* section
  7. `docs/reference/configuration.md` (857) — canonical example config (~lines 40–125) is the primary validation corpus
  8. `.github/workflows/test.yml` (37) — install `gawk` + `mawk`
  9. `docs/tasks/task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md` — mark LIMIT-1/2 closed
  10. `skills-config.yaml` — read-only corpus, must stay in-subset unchanged
  11. `skills/*/references/{read-config.sh,resolve-platform.sh,platform-detection.md}` — regenerated by `npm run bundle`, never hand-edited
- **Plan file found**: `docs/tasks/task.60.config-reader-strict-subset/task.60.plan.config-reader-strict-subset.md` (516 lines) — included as implementation context for `/develop`.
- **Always-load files**: all 3 read and passed as context to `/develop`.

- **Step 3 — `/develop`, 1 iteration.** All six phases implemented. Three decisions the plan left open are recorded in the task's *Implementation Record*: (1) the subset splits into non-local (file-wide) and local (guarded-key-only) constructs, because a uniformly file-wide radius refused `"my key": 1` beside a readable `access:` block; (2) a file outside the subset that provably declares no `access` warns and degrades rather than halting, matching the documented file-state table and avoiding the over-refusal R-1 names; (3) the tier-1 `__MAP__` fix was needed in the **bulk** path too, not only in `read_nested_config_key_strict` where the plan located it.
- **Mutation audit: 21 mutations, 0 survivors.** Three survived a first pass and were closed by adding the missing witness, not by accepting the count — M1/M6 (masked by the resolver-level refusal answering first → `§42e` calls the readers directly), M14 (no independent witness, since every legal alias needs an anchor and the anchor rule fires first → the classifier is asserted construct-by-construct), and M21 (**a failed `awk` produced no output, byte-identical to "found nothing outside the subset"** — this task's own defect one layer down; the fallback verdict is now a refusal, with a test).
- **Performance measured, not assumed.** `awk` invocations per `source`: awk tier 8 → 9 (the one scan pass), python tier 13 → 13 (unchanged). No added `python` spawns. The tier-1 path first measured 15 because the new `__MAP__` check asked for each record twice (`_rp_val` then `_rp_sig`, each spawning its own awk); folded into one `_rp_acc` lookup.

---

## Issues Log

- **Two `§46` assertions initially passed for the wrong reason.** macOS `/etc/zshrc` prepends `/usr/local/bin`, putting a real `python3` back in front of the test's shim, so the "no python at all" section was silently exercising tier 1. Fixed by re-asserting `PATH` inside the `-c` body and adding an assertion that the shim **is** the `python3` on `PATH`.
- **`gawk`/`mawk` are not installed on this host**, so `§45` skips with a printed notice. The CI step installing both is added but has not yet run — flagged in the Success Criteria rather than claimed as verified.
- **Board `in-review` is `stage-disabled`** — `gh-stage.js` exits 0 and the pipeline proceeds; that moment is not opted into in this project's workflow record. Correct outcome, not a failure.
- **A `git stash` collided with a concurrent git process** during performance measurement, leaving a stash entry. Verified byte-identical to the working tree before dropping it; the baseline was then re-measured via `git show HEAD:…` into a temp dir, without touching the working tree.

_Problems encountered and how they were resolved or escalated._

- **Step 7 — `/finalise`.** DoD verified 23/23 across functional, performance, code-quality and migration criteria. **CI rollup read rather than assumed**: it was `PENDING` on first sample (the `test` job still running), so the pipeline waited rather than accepting — which is exactly what that gate exists for. It resolved `SUCCESS` on `e1f16bc`, the commit at HEAD. That run also **discharged a carry-forward**: §45 passed under `gawk` and `mawk` in CI, the first observation of them. Local and CI skip *different* sections (local: gawk/mawk absent; CI: zsh absent), so between the two every assertion is exercised and none is skipped in both — reconciling 375 (CI) against 378 (local) exactly.
- **Step 4 — `/create-pr`.** Base `develop` and issue `247` pre-supplied, so no interactive prompt. Staged via `--scope`; the implementation report was deliberately held back (`git restore --staged`) since Step 8 owns its final state. Split into three commits so the 92-file bundle regeneration is skippable in review — verified as a pure regeneration (each bundled copy differs from its shared source by exactly one generated header line) rather than assumed.
  - `b3ea262` feat(task.60)! — the functional change + suite + CI
  - `4630652` docs(task.60) — subset spec, retired warnings, task.51 closure, CHANGELOG
  - `c0f1710` chore(task.60) — regenerated bundled references

---

## QA Iteration History

### QA Cycle 1 — 2026-08-18

**Gate Result**: CONCERNS (80/100)
**Issues Found**: 2 MEDIUM, 2 LOW
- **TASK-60-QA1-1** (medium) — a duplicated `access:` key was not in the refused set, so the tier-2 scan reported the file clean and the first-wins block matcher returned the permissive value at rc=0 while tier 1 halted. YAML is last-wins. The same escalation class this task closes, one spelling further along, on the tier a stock macOS host runs — `read-config.sh:81` names this exact shape as why tier 1 rejects duplicates.
- **TASK-60-QA1-2** (medium) — the awk-variant CI install had no `apt-get update` and sits before `npm test`, so a stale runner index reddened the whole job.
- **LOW-1** — the else-branch of the hoisted refusal was indented at the outer level, reading as unconditional on a skim of a security-relevant branch.
- **LOW-2** — the alias rule's deliberate narrowness was undocumented.

**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: duplicate detection added to `_config_subset_scan`, scoped to the **consumed** keys (a repeated top-level guarded key, and a repeated first-level child under one); `apt-get update` added to CI; else-branch re-indented; alias-rule comment added. Also fixed a live hazard found while writing the new matrix rows — `OUT_OF_SUBSET` is a double-quoted shell string, so a backtick in a construct label is command substitution: the first version executed the label and left the stderr assertion matching a shorter needle, i.e. a test that passes while asserting less than it claims.
**Commit**: `1ab4ab7`
**Suite**: 371 → 378. Three new mutations, all red — including one witnessing the **over-refusal** direction.

### QA Cycle 2 — 2026-08-18

**Gate Result**: PASS (95/100)
**Issues Found**: none
**Verification**: all four cycle-1 findings re-tested and closed. The fix was reviewed as *new code* — nine transition probes against the new scanner state (block-scalar bodies, comments, blank lines mid-block, sequence items, parent reset, flow form, childless parent, deeper nesting, anchor-before-duplicate) all correct. Anti-over-refusal asserted in both directions. NFR Security and Maintainability both upgraded CONCERNS → PASS.
**Commit**: `e1f16bc`
**Action**: Proceeding to finalise

- **Two residual gaps recorded rather than glossed** in the DoD and the task's own DoD section: no human has reviewed PR #248 (both QA cycles and the DoD were pipeline-run — the same condition task.51 was accepted under), and duplicates deeper than the first child level are not refused (not an escalation: tier 2 resolves correctly there and tier 1 halts).

---

## Completion

**Finished**: 2026-08-18 13:25
**Final Status**: Completed
**Branch**: `feature/task.60.config-reader-strict-subset`
**PR**: [#248](https://github.com/Gamaroff/agent-skills/pull/248)
**QA Iterations**: 2 (CONCERNS 80/100 → PASS 95/100)
**DoD Summary**: `docs/tasks/task.60.config-reader-strict-subset/task.60.dod.1.config-reader-strict-subset.md`
