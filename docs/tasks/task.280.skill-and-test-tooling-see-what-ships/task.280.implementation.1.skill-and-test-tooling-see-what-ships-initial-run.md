# Implementation Report: Skill and test tooling see what ships

**Task**: `task.280.skill-and-test-tooling-see-what-ships.md`
**Run Number**: 1
**Started**: 2026-11-18 03:20
**Status**: In Progress
**Report format**: 2

---

## Summary

Make three checks look at what actually ships: a `:?` word quote lint, a fence-balance check with a ratchet over hand-written fence readers in `tests/`, and `bundle:check` scanning skill-owned reference docs. The probe-mutant check (obs #102) was already fixed on `develop` and dropped (obs #47, #48, #112).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — defaults (docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md) |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.280.*` exists in git                              | Branch created at `ce2fed589` | —                    | 2026-11-18T03:21Z |
| 2. review-task             | ✅ Done    | `task.280.review.{N}.{name}.md` exists (or skip logged)                | Review 1: 8/10 READY after fixes; 1 critical, 6 important | —                    | 2026-11-18T03:45Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + map in log); phases 1–3 done; server gate 8587 tests, 0 fail | —                    | 2026-11-18T04:02Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #919: https://github.com/Gamaroff/agent-skills/pull/919 (no issue linked, no comment) | —                    | 2026-11-18T04:06Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.280.qa.{N}.*.md`; `task.280.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 4 gates (CONCERNS, CONCERNS, PASS, PASS 95); 5c CONCERNS then APPROVE; 5b ran twice for a code fix each and once for the review's doc findings | —                    | 2026-11-18T05:44Z |
| 7. finalise                | ✅ Done | `task.280.dod.{N}.*.md`; task `status: accepted` | DoD run 1 gaps (#4, #7) closed; run 2 ACCEPTED; PR comment posted; no tracker issue | —                    | 2026-11-18T06:40Z |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-18

- Feature branch base: develop — source: recommended (`--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (risk_level absent; 5 phases ≥ 3, so not lite)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 fan-out: run inline (no subagents dispatched); lite-mode inputs derived from the document by the orchestrator
- Always-load files: defaults — `devLoadAlwaysFiles` present in skills-config.yaml but resolved at Step 3
- Questions asked: 0 (`--defaults`, nothing in conflict)
- Tracker: github; no `github_issue` linked — tracker signals skipped
- Launched by `/develop-next` (run state `.claude/state/develop-next.state.json`)

### Step 2 — Review — 2026-11-18

- review-task invoked inline in the pipeline: Step 0 auto-answered "Comprehensive report"; Step 0a auto-skipped (already on `feature/task.280.*`); Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete" (status Planned → Ready for Development).
- Review report: `docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.review.1.skill-and-test-tooling-see-what-ships.md`.
- Findings applied to the task and plan: the plan's fence-count equality failed 5 balanced files (replaced by a fence-balance check); obs #47/#48 instances and obs #102 were already fixed on develop (Phase 4 dropped); Phase 2 population measured (43 lines, 20 files) and ratcheted; Phase 3 test path corrected; effort 8h → 12h.
- Pre-pass Agents B and C were performed inline, not dispatched: independent review of architecture alignment and the already-implemented question did not run.
- No tracker issue linked, so no review-outcome comment was posted.

### Step 3 — Develop — 2026-11-18

- Step 3 inline — /develop not invoked: the plan names every hunk and the surface was mapped while reviewing (no Explore subagent dispatched; independent map did not run).
- Plan file found: `task.280.plan.skill-and-test-tooling-see-what-ships.md` — used as implementation context.
- Pre-develop surface map: 12 files — `shared/resources/qa-execute-snippets.mjs`, `skills/create-skill/scripts/bundle_skill.py`, `skills/create-skill/SKILL.md`, 5 `tests/` files, 3 new tests, plus 7 regenerated bundled copies.
- Phase 1: `fenceProblems` shares one fence walk with `extractBlocks`; `tests/fence-balance.test.js`; `${NAME:?word}` quote lint in `tests/unbound-default-reads.test.js`.
- Phase 2: ratchet `tests/fence-reader-ratchet.test.js` with 17 reasoned entries; `halt-fence` and `worktree-root-coverage` migrated. The other 17 readers stay allowlisted (non-bash, sh too, line-state, or section slice).
- Phase 3: `skill_owned_invocations` in `bundle_skill.py` (vendor edge plus `UNVENDORED` class). Real-tree bundle changed only the 7 `qa-execute-snippets.mjs` copies.
- Mutation proofs: open-fence push off → 3 red; quote regex off → 1 red; stale entry and unlisted reader → ratchet red; bundler edge off → vendoring test red.
- Decision: allowlisted `scanFences` in the reader's `\s` allowlist (MARKDOWN reason).
- Issue: first server gate failed on Prettier (6 files) and then on `relationship-assertion-lint` (a quoted backtick blinded its scanner in `fence-balance.test.js`); both fixed, server gate green (8587 tests, 0 failed).
- Change Log row for the develop run still to be written by this orchestrator (inline path).

### Step 4 — Create PR — 2026-11-18

- SCOPE_PATHS: the task directory, `CHANGELOG.md`, `shared/resources`, `skills/create-skill`, seven `skills/*/references` directories and `tests`.
- Commit `56444d372`, 22 files; leak check: 0 leaks; no files held.
- PR created: https://github.com/Gamaroff/agent-skills/pull/919 (base `develop`, state OPEN). No tracker issue, so no comment or board move.
- Post-PR state poller not dispatched; state read inline with `gh pr view` (OPEN).

### Step 7 — Finalise — 2026-11-18

- DoD run 1 (`dod.1`) found two low gaps: #4 (method not followed) and #7 (command unrecorded). Run 2 (`dod.2`) ACCEPTED.
- #4: criterion amended to the stated bound, approved by the owner (2026-11-18). #7: ten parallel runs re-run and the command recorded in QA report 1.
- Run 2 carried the passing sections from run 1 (docs-only changes between) and re-verified #4 and #7 inline; independent review did not run for that re-check.
- CI reading 1: SUCCESS @ 50b002fa1dfc; CI reading 2: SUCCESS (tree-equivalent to 50b002fa1dfc) @ c59f3b63aad3.
- Canonical PR comment posted on #919. No `github_issue`, so the tracker comment, close and board move were skipped.
- Registry row 280 ticked `accepted` (`registry-tick.js`).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-18
**Gate Result**: CONCERNS
**Issues Found**: 1 medium (T280-CR-1, reproduced); four low or cleanup items advisory
**HIGH findings**: 0
**MEDIUM findings**: 1
**Traceability**: skipped (lite mode: no mapper dispatched)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)

- changes-requested: no tracker issue linked, skipped.
- Fixed T280-CR-1: `invoked_name()` in `bundle_skill.py` strips a sentence-final dot from an invocation capture, at both `INVOKE_REF_RE` sites; an all-dots capture is kept so the `..` guard still fires. First attempt (changing the regex) turned the `a .. leaf is refused` test red, so it was dropped.
- Tests: two cases in `tests/bundle-check-mode.test.js` (dotted defect, spaced control). Mutation: `invoked_name` made a no-op, dotted case red, control green; restored byte-identical.
- Fast gate (`npm run ci:fast` on the server): 8589 tests, 0 failed.
- Probe: population of `INVOKE_REF_RE` consumers in `bundle_skill.py`: 2 call sites, both updated. Population: 2. Move: patch — one defect in the new code, not a repeat subject.
- Advisory CR-2 to CR-5 left open for the gate's `recommendations.future`.

### QA Cycle 2 — 2026-11-18
**Gate Result**: CONCERNS
**Issues Found**: 1 medium (T280-CR-2, reproduced): an all-dots capture other than `..` (an ellipsis) is kept by `invoked_name` and reported UNVENDORED
**HIGH findings**: 0
**MEDIUM findings**: 1
**Traceability**: skipped (not re-run — cycle 2)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)

- changes-requested: no tracker issue linked, skipped.
- Fixed T280-CR-2: `skill_owned_invocations` skips a capture that is all dots (`...` or `..`): an ellipsis in prose is never a script name, and an UNVENDORED finding for it could not be cleared by a bundle run. The `..` refusal in `discover_needed` is untouched (its test still passes).
- Tests: two cases in `tests/bundle-check-mode.test.js` (ellipsis defect, real-name control). Mutation: skip disabled, only the ellipsis case red, control green; restored byte-identical.
- Fast gate (`npm run ci:fast` on the server): 8591 tests, 0 failed. `bundle -- --check`: 129 skills, 0 problems.
- Probe: `INVOKE_REF_RE` consumers: 2 sites (`skill_owned_invocations`, `discover_needed`); only the first reports UNVENDORED, so only it needed the skip. Population: 2. Move: patch — a second edge case of the same capture in new code, and the cycle 1 fix was a patch too; the repeat subject is `bundle_skill.py`, so next cycle is the place to ask for a structural move if a third edge turns up.

### QA Cycle 3 — 2026-11-18
**Gate Result**: PASS
**Issues Found**: none open; one low-confidence follow-up (nested invocation path, pre-existing regex limit, 0 corpus hits) recorded in the gate's `recommendations.future`
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (not re-run — cycle 3)
**PR Review**: CONCERNS — 1 open coverage finding (PC-1, medium) and two low (PC-2 consistency, PC-3 trail); report `task.280.pr-review.1.skill-and-test-tooling-see-what-ships.md`; PR comment posted; open-coverage check: 1
**Loop exit**: n/a — this exit not taken (open coverage finding sends CONCERNS back to 5b)
**Action**: Running qa-fix (cycle 3 of 5) with `pr_review=` — doc-only fixes: task Phase 2 / §7 wording (PC-1), `pr_number: 919` (PC-2), implementation report Summary (PC-3)

#### qa-fix (5b)

- changes-requested: no tracker issue linked, skipped. Findings ingester not dispatched: the three findings were already in context from the 5c review; independent ingestion did not run.
- Fixed PC-1: the task's Phase 2 line, scope bullet and §7 item 5 now say 2 readers migrated and 17 stay allowlisted with reasons, and that the two `sh`-reading ones (`unbound-default-reads`, `fenced-bash-optional-file-globs`) stay because `extractBlocks` returns `bash` only. No code changed: the allowlist already carried that reason.
- Fixed PC-2: `pr_number: 919` added to the task frontmatter. Fixed PC-3: this report's Summary rewritten to the three-check scope.
- Validation: `change-log.js` append-only and updated checks pass; `doc-links.js` clean; `npm run ci:fast` on the server: 8591 tests, 0 failed (a first run hit my own 580 s `timeout` and was discarded).
- Probe: documentation fix. Phrase `SH_TOO` / `bash only`: restated in `tests/fence-reader-ratchet.test.js` (the source of the claim, unchanged) and the task document (updated). Population: 2. Move: patch, since both sites now agree and one is the code the prose cites.

### QA Cycle 4 — 2026-11-18
**Gate Result**: PASS
**Issues Found**: none; the PR review's three findings (PC-1 to PC-3) were fixed by the cycle 3 qa-fix, and each claim in the new task text was checked against the code
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (not re-run — cycle 4)
**PR Review**: APPROVE — report `task.280.pr-review.2.skill-and-test-tooling-see-what-ships.md`; 2 low findings (PC-1 stale Implementation Summary, PC-2 `.sh` scan unstated); open-coverage check: 0; PR comment updated in place
**Loop exit**: 5c APPROVE after 4 gates (budget 5)
**Carried to 6a**: docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.skill-and-test-tooling-see-what-ships.md (PC-1 and PC-2 fixed, staged not committed)
**Action**: Proceeding to Step 7 (finalise)

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
