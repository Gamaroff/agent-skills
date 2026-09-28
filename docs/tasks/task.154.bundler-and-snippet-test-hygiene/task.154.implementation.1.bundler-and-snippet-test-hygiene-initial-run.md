# Implementation Report: [Task 154] Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Task**: `task.154.bundler-and-snippet-test-hygiene.md`
**Run Number**: 1
**Started**: 2026-09-28 23:35
**Status**: In Progress

---

## Summary

First pipeline run for task 154: remove the placeholder literal behind the bundler's unattributed `not found` warning, attribute that warning and give it a CI reader (obs #151), and add a shared consumer-root helper plus a clean-checkout test runner wired into the release gate (obs #149).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (gh-stage work-started → transitioned; tracker comment posted) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.154.*` exists in git                             | Branch created at `12b8fb78` (develop tip); pushed with upstream | —                    |
| 2. review-task             | ✅ Done    | `task.154.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 9/10; Planned → Ready for Development; 1 Important + 2 Optional fixed | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; audit 28/28 Ready for Review @ `63d039b6`; 6 mutation proofs | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #513: https://github.com/Gamaroff/agent-skills/pull/513 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.154.qa.{N}.*.md`; `task.154.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 5 cycles (FAIL → CONCERNS ×3 → PASS 100); 8 bugs closed; runner redesigned at cycle 3; 5c APPROVE | —                    |
| 7. finalise                | ⏳ Pending | `task.154.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-28

- Dispatched by `/develop-next` (roadmap item T154, source `roadmap`) under the AUTONOMOUS RUN directive.
- Feature branch base: develop — auto-answered (Q1 recommended; current branch is `develop`), per develop-next directive.
- PR target branch: develop — auto-answered (Q2 recommended), per develop-next directive.
- Questions asked: 0 (Q1, Q2 both auto-answered; count matches the 2-question table for develop-task).
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 resolution run inline (no Explore agents dispatched): path given directly; tracker issue #484 read from frontmatter; lite-mode inputs derived from the document — risk_level=absent (risk_ok=true), phase_count=6 (not < 3), single_module=false (bundler, evals, scripts, create-skill, docs) → PIPELINE_MODE=standard.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from skills-config.yaml devLoadAlwaysFiles).
- Branch: `feature/task.154.bundler-and-snippet-test-hygiene` from `develop` @ `12b8fb78`. Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment → posted; GitHub board: work-started → transitioned. Priority-default block not run (task carries `priority: Medium`; board priority set at authoring).
- Task status at start: Planned — noted; Step 2 (/review-task) validates and promotes.

### Step 2 — review-task

- review-task invoked; output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously.
- Review report: `docs/tasks/task.154.bundler-and-snippet-test-hygiene/task.154.review.1.bundler-and-snippet-test-hygiene.md` (9/10, READY TO IMPLEMENT, 0 Critical / 1 Important / 3 Optional).
- Pre-pass: B aligned (source `architecture`), C not-implemented. Invariants run: clone keeps 83/83 tags and ignore-matched `CLAUDE.md`; brace placeholder still matches the collector.
- Planned promoted to Ready for Development by review-task. Tracker key unchanged (#484) — no work-started re-fire.
- Review outcome comments posted to github issue 484 (`review-task` and `review` stages → posted).

### Step 3 — develop

- Pre-develop surface map: 20 files identified in create-skill/scripts, tests/, evals/shared/{lib,tests}, scripts/, shared/resources, docs/contributing (Explore). Findings: no test walks the repo root itself; `prettier --check .` would walk `.clean-checkout/` but honours `.gitignore`; the create-skill section heading moved to :213 (task cited :206).
- Plan file found: docs/tasks/task.154.bundler-and-snippet-test-hygiene/task.154.plan.bundler-and-snippet-test-hygiene.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: the plan names every hunk (code for all six phases), and the surface map was recorded; the Task Completion Checklist is satisfied below.
- Planned/Draft gate: not reached (inline path). Alignment: code aligned to document.
- Fast-gate precondition: `develop.fastGateCommand` resolves to `ci:fast` (defined).
- Phase 2 deviation from the plan, recorded: the now-unused `collect_shared_refs` import in bundle_skill.py was dropped (package_skill.py and quick_validate.py keep using it; signature unchanged).
- Phase 3 deviation: §2 uses `spawnSync`, not `execFileSync`. The first M1 proof went red only because `--check` exits non-zero on the STALE bundled copy and execFileSync threw — the missing-source assertion never ran. With spawnSync M1 is red on the assertion itself, in both shapes (stale copy, and re-bundled as pre-commit would).
- Phase 4: migrated-file counts are 88 (finalise-bug-mode) and 84 (optional-file-lookups) — identical to `develop` before the change (measured with the change stashed). The task's "71" was the count when obs #149 was written.
- Phase 5 additions beyond the plan's fixture: a positive control (the clone runs committed content, keeps the tag and the tracked-but-ignored file, has no `.agents/skills`), the dirty-tree warning, both temp-dir refusals, and the missing-`node_modules` refusal (review fix).
- Fast gate: `npm run ci:fast` rc=0 — 4415 tests, 4414 pass, 0 fail, 1 skipped, 250s wall.

#### Mutation proofs (task § 8) — log: `.claude/state/t154-mutations.log`

| Revert | Test | Observed |
| --- | --- | --- |
| Restore the `shared/resources/<name>` literal at contract :290 | bundle-missing-source §2 | ✖ §2 — actual holds `⚠️  shared/resources/<name> not found — cited at shared/resources/observation-log-contract.md:290` (stale and re-bundled shapes both red) |
| Restore the unattributed print | bundle-missing-source §1a | ✖ §1a — actual `'⚠️  shared/resources/missing.md not found'` vs expected `'… — cited at shared/resources/a.md:3'` |
| Drop the dedupe set | bundle-missing-source §1b | ✖ §1b — `actual: 2` (two identical lines for two skills) |
| Remove `symlinkSync` from makeConsumerRoot | consumer-root.test.mjs | ✖ helper-root case — `newest-numbered.sh is not reachable from the consumer root` |
| Runner copies the working tree (`cp -R`) instead of cloning | test-clean-checkout.test.js | ✖ 3 cases — the check passes in the copy; positive control and dirty-tree case red |
| Point finalise-bug-mode back at REPO_ROOT as cwd | npm run test:clean-checkout | ✖ in the clean clone: 88 tests, 42 pass, **46 fail**; in place the same commit reads 88/88 pass — the point of the runner. Proven on a temporary commit, then `git reset --soft` to `63d039b6` and the file restored; tree clean |

All restored; each file re-run green after restore.

#### Verification on the committed branch (`63d039b6`)

- `npm run test:clean-checkout`: rc=0 — 4415 tests, 4414 pass, 0 fail, 1 skipped; **279s** wall. In place, `npm run ci:fast` (prettier + the same `npm test`) was 4415 / 0 fail / 1 skipped in **250s**, so the clone costs no more than the format check it skips plus ~30s. Same pass count both ways.
- New test files: bundle-missing-source 5.3s (5 tests), consumer-root 0.23s (2), test-clean-checkout 1.3s (6) — all under 10s.
- `npm run -s bundle` prints 0 `not found` lines; `bundle:check` 129 skills, 0 problems; `lint:shell` clean (76 scripts); `quick_validate` create-skill ✓, observe-work ✓.
- The pre-commit hook's bundle run on each of the five commits printed no `not found` line.
- Loop audit iter 1 (Explore): `{"status":"ready-for-review","completed":28,"total":28,"last_commit_hash":"63d039b6…"}` → exit loop. Change Log row written by the inline path (one row). Development completion comment posted to github issue 484 (develop-complete → posted).

### Step 4 — create-pr

- SCOPE_PATHS: docs/tasks/task.154…, .gitignore, CHANGELOG.md, docs/contributing, evals/shared/lib, evals/shared/tests, package.json, scripts, shared/resources, skills/create-skill/scripts, skills/create-skill, skills/observe-work/references, tests. Pre-flight guard: no untracked files, nothing held.
- /create-pr --base develop (pre-supplied) --issue 484. Auto-commit `adfa7992` (task doc + report only); leak check OK. Branch pushed; remote tip verified equal to local HEAD.
- PR body written by the orchestrator from the recorded verification rather than by the diff-summariser subagent — every figure in it is measured above; noted as a deviation from create-pr Step 5.
- PR created: https://github.com/Gamaroff/agent-skills/pull/513 (state OPEN). Lock `pr_url` set.
- Tracker: in-review comment → posted; GitHub board: in-review → stage-disabled (the ladder has no `in-review` target — correct no-op).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **QA cycle 4 (5a)**: bug reports for the two MEDIUM findings were not written at 5a (qa-task Step 9); filed at 5b as bugs 7–8 together with their fix, and linked from QA report 4.
- **Reviewer independence**: gates 1–4 were written by the orchestrator, so qa-fix's findings ingester (Step 1a) was not dispatched — the findings were already in context. Each cycle's diff review was an independent Explore subagent; the fixes were not.
- **Spec change**: the clean-checkout runner's design changed in QA cycle 3 (per-run `mktemp -d` directory inside a base) after three cycles of findings on the named-location design; task §3 was brought into line in cycle 4.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-29
**Gate Result**: FAIL
**Issues Found**: 2 — T154-QA1-1 (HIGH, `scripts/test-clean-checkout.sh`: `rm -rf "$DIR"` deletes whatever CLEAN_CHECKOUT_DIR names — repo, ancestor, unrelated dir; reproduced by hand), T154-QA1-2 (MEDIUM, `tests/bundle-missing-source.test.js` §2 needs the zero-problem summary line)
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: T154-QA1-1 — runner resolves CLEAN_CHECKOUT_DIR and refuses the repo, `/`, an ancestor, an ephemeral path (engine `ephemeralReason()`, as-given and resolved — macOS `/var/tmp` → `/private/var/tmp` is missing from the engine's list, pre-existing) and an unmarked existing dir; `.git/` marker; absolute trap. T154-QA1-2 — §2 `readCheckOutput()` + filesystem skill count; §1e stale fixture. CR-2 and CR-6 folded in. Mutation proofs F1–F5 each red → restored green (`.claude/state/t154-mutations.log`). Findings ingested inline (the orchestrator wrote gate 1; no ingester dispatched — independence loss recorded). Fast gate: `ci:fast` 4419 tests, 0 fail, 1 skipped, 248s. PR state after push: OPEN (polled inline with `gh pr view`, not the poller subagent). Change Log `qa-fix` row deferred to loop exit (one row per loop, precedent task.150).
**Commit**: `77250a8a`

### QA Cycle 2 — 2026-09-29
**Gate Result**: CONCERNS
**Issues Found**: 9 — T154-QA2-1 (MEDIUM, §2 passes a scan of zero resolved skills), T154-QA2-2 (MEDIUM, concurrent runner invocations delete each other's clone), QA2-3..9 (LOW: APFS case variant, /private/var/tmp spelling, marker written after checkout, unreadable dir reads empty, test base under /tmp, tab garbles message, nested parent left behind). Cycle 1's HIGH/MEDIUM verified fixed (18-candidate by-hand re-probe; QA mutation spot check F2, F5); bugs 1–2 closed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: QA2-1 — `check_all` prints `N skill(s) checked, U unresolved` on the problem path; §2 reads the scan count from `--check`, fails on any unresolved; §1f. QA2-2 — `<dir>.lock` (mkdir + owner PID; live owner refused, dead owner taken over, pid-less lock refused). QA2-3..9 — one node location decision (realpathSync.native both sides, control chars, /private/var normalised, missing parent, unlistable dir), marker before checkout, test scratch-base precondition. Mutation proofs G1, G3–G9 red → restored green; G10 (marker-before-checkout) no-red-untested. Findings ingested inline (orchestrator wrote gate 2; independence loss recorded). Fast gate: `ci:fast` 4424 tests, 0 fail, 1 skipped, 244s. PR state after push: OPEN, head `5b1e3d91` (ls-remote; `gh pr view` lagged one read).
**Commit**: `5b1e3d91`

### QA Cycle 3 — 2026-09-29
**Gate Result**: CONCERNS
**Issues Found**: 6 — T154-QA3-1 (MEDIUM, stale-lock takeover not atomic), T154-QA3-2 (MEDIUM, ownership decided before the lock is read), QA3-3..6 (LOW: pid-less lock ambiguity, marker written after checkout, lock path unchecked, dangling symlink reads absent). All in `scripts/test-clean-checkout.sh`'s shared-location protection — third consecutive cycle on that subject. Cycle 2 fixes verified (21-candidate by-hand re-probe; 20/20 incl. TMPDIR=/tmp); bugs 3–4 closed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: Structural move (qa-fix Step 2.6, repeat subject — the runner's shared-location protection drew findings in cycles 1, 2 and 3). `CLEAN_CHECKOUT_DIR` is now a base; each run clones into its own `mktemp -d` directory and deletes only that, so the lock, marker, takeover and ownership checks were removed rather than patched (T154-QA3-1..6). Tests rewritten: concurrency (two runs at once), never-deletes-base / foreign `run.*`, unusable-base refusals. Mutation proofs H1–H4 red → restored byte-identical green. Spec deviation recorded for /finalise: task §3 Target Architecture still describes a named clone location removed at start/exit. Fast gate: `ci:fast` 4422 tests, 0 fail, 1 skipped, 250s. PR OPEN, remote head `480782e4`.
**Commit**: `480782e4`

### QA Cycle 4 — 2026-09-29
**Gate Result**: CONCERNS
**Issues Found**: 4 — T154-QA4-1 (MEDIUM, test: base-is-empty checks pass on a deleted base), T154-QA4-2 (MEDIUM, test: relative-base case cannot discriminate), QA4-3 (LOW, spec text lags the per-run redesign), QA4-4 (LOW, test guard checks one spelling). No runner defect; 16-candidate by-hand re-probe left the filesystem unchanged; bugs 5–6 closed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: QA4-1 (`entries()` throws on a missing base; created-base case), QA4-2 (relative base from a subdirectory), QA4-3 (task §3 / Phase 5 / risk note 2 rewritten for the per-run design), QA4-4 (guard checks both spellings); cleanups CR-5, CR-6. Mutation proofs J1 (4 tests red) and J2 (1 red) — each a mutation the old assertions passed. qa-fix run inline by the orchestrator (fix was four small edits; independence loss recorded). Bugs 7–8 filed late (QA Step 9 missed at 5a; filed with the fix) — noted in the Issues Log. Fast gate: `ci:fast` 4422 tests, 0 fail, 1 skipped, 249s. PR OPEN, remote head `1b245db7`.
**Commit**: `1b245db7`

### QA Cycle 5 — 2026-09-29
**Gate Result**: PASS
**Issues Found**: none — 4 advisory cleanups (CR-1..4) in gate 5 `recommendations.future`; bugs 7–8 verified and closed
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.154.pr-review.1.bundler-and-snippet-test-hygiene.md` (0 conformance findings; 3 low code findings: CR-1 clone origin refs, CR-2 inherited CLEAN_CHECKOUT_CMD in release.sh, CR-3 duplicated regex); ready-for-merge → stage-disabled
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.154.bundler-and-snippet-test-hygiene`
**PR**: https://github.com/Gamaroff/agent-skills/pull/513
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

---

## Pipeline Paused — 2026-09-28T23:01:48Z

⏸️ **Context compaction imminent.** The `/develop-task` orchestrator was halted by the PreCompact hook before Claude's context could be summarised.

**State at pause**:

- Skill: `/develop-task`
- Branch: `feature/task.154.bundler-and-snippet-test-hygiene`
- Last step boundary: Step 7
- PR: https://github.com/Gamaroff/agent-skills/pull/513
- Tracker: github #484

**Resume**: re-invoke `/develop-task <path>` (same path) and choose **Resume from last completed step** when prompted. Phase 0b will read this report, verify completed-step artifacts, and re-run Step 7.

**Pipeline Progress** for this step is now `⏸️ Paused` — equivalent to `⏳ Pending` for resume purposes (the step will re-run from the start).

