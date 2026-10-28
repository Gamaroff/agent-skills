# Implementation Report: Make /finalise changelog checks opt-in

**Task**: `task.241.finalise-changelog-checks-opt-in.md`
**Run Number**: 1
**Started**: 2026-10-28 10:06
**Status**: Completed

---

## Summary

First run: gate /finalise's two CHANGELOG checks (docs subagent and 6d) behind `changelog.enforce` in `skills-config.yaml`, off by default.

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
| Board status        | In Progress ✅ (gh-stage work-started: transitioned)                       |
| Tracker Issue       | #772 (GitHub)                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.{id}.*` exists in git                             | Branch created at `fe152f8a`, pushed with tracking | —                    | 2026-10-28T10:07Z |
| 2. review-task             | ✅ Done    | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | `task.241.review.1.finalise-changelog-checks-opt-in.md` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-10-28T10:09Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 22/22 plan items; fast gate green on the rerun (iter 1 red: guarded-key pin, fixed); zsh arm unverified | `.summaries/step-3-test-triage-1.json` | 2026-10-28T10:22Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #773](https://github.com/Gamaroff/agent-skills/pull/773) → develop; commits `e7c12316` (feat), `4ade4faf` (docs); #772 in-review comment posted | —                    | 2026-10-28T10:23Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 3 cycles: gates CONCERNS 70 → CONCERNS 90 → PASS 96 (route 2b, 2 LOWs carried); fixes `f530a532` and `93fb2108`; 5c `pr-review.1` CONCERNS (no coverage finding; 3 doc findings fixed by the carry) | — | 2026-10-28T11:00Z |
| 7. finalise                | ✅ Done    | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      | DoD ACCEPTED (`dod.1`); acceptance commit `a9c13140`; CI reading 2 SUCCESS (tree-equivalent); #772 closed, board Done | —                    | 2026-10-28T11:18Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-28T11:19Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-28

- Q1 Feature branch base: develop — source: asked (user picked the Recommended option)
- Q2 PR target branch: develop — source: asked (user picked the Recommended option)
- Mode: standard — source: detector. Phase 0 run inline (no subagent fan-out: the task file was given as a path). Inputs derived from the document: risk_level absent, phase_count 4, single_module false (shared/resources, skills/finalise, evals, docs) → standard.
- Skips: none.
- qa-planning gate: skipped (auto — no prompt)
- Status at start: Planned — Step 2 (`/review-task`) promotes it.
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Tracker poller run inline: TRACKER=github, TRACKER_ISSUE=772.
- The base `develop` carries the task-docs commit `fe152f8a`, which is not yet on `origin/develop`; it rides into this PR.
- `.claude/settings.json` has no PreCompact/Stop hooks installed; the pipeline relies on the prose transition protocol.
- Branch: `feature/task.241.finalise-changelog-checks-opt-in` from `develop` at `fe152f8a`. Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment posted on #772; GitHub board: work-started → transitioned. Priority already P2 (set at issue creation), so the P2 default block was not needed.

### Step 2 — review-task

- review-task output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: `docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.review.1.finalise-changelog-checks-opt-in.md` — READY TO IMPLEMENT, 8/10, 0 critical / 6 important (all applied) / 1 optional.
- Planned promoted to Ready for Development by review-task.
- **Independence loss:** pre-pass Agents B and C were not dispatched (review ran inline), and the reviewer is the session that authored the task.
- Tracker key re-read: unchanged (#772) — no re-fire needed.
- Review outcome comment skipped — review-task reported `posted`.

### Step 3 — develop

- Plan file found: `docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.plan.finalise-changelog-checks-opt-in.md` — included as implementation context for /develop.
- Pre-develop surface map: 12 files identified in shared/resources, skills/finalise, evals/shared/tests, docs, root config. It was mapped inline during task creation and review (no Explore dispatch), which is an independence loss.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already in hand.
- Fast gate: `develop.fastGateCommand` is unset, so the fallback `npm run ci:fast` applies; that script exists.
- Resolver rule corrected from "literal `true` only" to "any YAML true spelling". The task's own § 3 table shows the python tier returns `true` for `yes`, so a true-only rule would answer differently per tier. The task doc was updated to match (§ 3, Phase 1/4 items, criteria).
- Mutation proofs (each went red, then green once restored):
  - Resolver answering `on` for an unrecognised value: 4 red.
  - 6d gate removed: 5 red.
  - `<CHANGELOG_ENFORCE>` dropped from row 4: 1 red.
- Fast gate iter 1: **red**. `tracker-access.test.sh` § 44 reported `missing: changelog enforce`: the new resolver is a `read-config.sh` call site, and its keys were not in `_CONFIG_GUARDED_KEYS`. Fixed in `shared/resources/read-config.sh` and rebundled (49 copies). That red run is the fix's own mutation proof.
- Fast gate rerun: `TEST_EXIT=0`, 6,567 tests, 0 failed, 14 skipped. `eval:all`, `bundle:check`, `check:generated`, `generate-catalog` (no diff) and `validate skills/finalise` are all green. shellcheck is clean at CI's `--severity=warning`; one SC1091 is info-level only.
- **zsh arm not run.** zsh is installed neither on this laptop nor on `ci@192.168.1.249`. The task assumed it was. Recorded as a residual in the task doc.
- Development completion comment posted to github issue 772 (`reason: posted`).

### Step 4 — create-pr

- Base branch pre-supplied: develop — skipping interactive prompt.
- Two commits: `e7c12316` feat (implementation, tests, bundled copies, docs) and `4ade4faf` docs (task doc, review report, implementation report). The PR also carries `fe152f8a` (the task docs, which were not yet on `origin/develop`).
- PR body written by the orchestrator from its own Step 3 record, not by the `pr-body-summariser` subagent. The diff was already fully in context, so that subagent's purpose, keeping the diff out of main context, did not apply.
- PR #773 opened → develop. Issue #772 `in-review` comment: `reason: posted`.

### Steps 5–6 — QA loop

- QA Cycle 1 (5a): gate CONCERNS 70/100, with 3 medium findings and 1 low.
  - Code review ran as one Explore subagent (89.7 s).
  - Probe: 15 cases executed, 1 reproduced, 0 escaped.
  - CI pending, so it adds nothing to the gate.
  - Traceability mapper skipped: the task has no criteria table for it.
- QA Cycle 1 — changes-requested: `stage-disabled`.
- QA Cycle 1 (5b), qa-fix:
  - The findings ingester was not dispatched. This session wrote the gate, so the findings were
    already in context, and an ingester would only restate them. This is an independence loss.
  - The pre-fix Explore mapping was not dispatched either: the 4 files were already mapped in Step 3.
  - `pr-review-current`: `none`.
  - `fix_cycle`: not supplied, so it is derived from the gate.
- BUG-1 decision: an unreadable config still answers `off`, now with a named warning. Failing closed
  would put changelog checks on consumers, which reverses the task. This follows the resolver's
  existing unknown-value rule; no user question was needed.
- BUG-2 move: **consolidate**. Agent 4 is the one changelog owner, rather than a second gate on agent 1.
- PROBE-1 move: **scope the claim**. A block scalar is named on the awk tier, and "same answer under
  every tier" is narrowed to single-line values.
- Mutation proofs, each red then green once restored:
  - BUG-1, plain reader restored: 3 red.
  - BUG-3, scopes emptied: 3 red.
  - BUG-2, AC line restored: 1 red; fix-evidence item restored: 1 red; a deferral line with a
    second, checking mention: 1 red. The test's first draft passed that last mutation, so the test
    was tightened to uppercase-only mentions, one per line.
- QA Cycle 2 (5a), the refute pass over the whole branch: gate CONCERNS 90/100, with 1 medium
  finding and 4 low.
  - Code review ran as one Explore subagent (170.5 s): 4 bugs and 1 cleanup. QA entered all 4 bugs
    at low; the reviewer's ratings are recorded in the gate.
  - Probe: 15 cases executed, 0 escaped.
  - CI was red on `f530a532`. All 7,086 tests passed, but the tmp-leak ratchet tripped
    (`finalise-6d` at 20, over its limit of 10). Found by reading the job log: the node summary said
    `# fail 0`, and the ratchet line was the only red.
  - BUG-1, BUG-2 and BUG-3 reproduced as fixed and are closed.
- QA Cycle 2 (5b), qa-fix: BUG-4 and CR2-1 to CR2-5 fixed in commit `93fb2108`.
  - CR2-1 decision: the resolver answers `unknown` only when its own install is broken, and the
    callers HALT on it. An unreadable *project* config still answers `off` (the BUG-1 decision
    stands).
  - CR2-3: documented and pinned rather than changing the shared reader's nesting rule, which every
    nested key uses.
  - Mutation proofs, 8 in all, each red:
    - 6d guard: 2. 3b guard: 1.
    - Resolver `unknown`→`off`: 1 in the 6d test and 1 in the resolver test.
    - A lower-case read: 1. A second mention beside an allowed span: 1. Template reverted: 1.
    - Cleanup removed: ratchet `new prefix`, exit 1.
  - The first mutation harness run errored (it spawned `command`, which is not a binary). No file
    was left changed; the run was fixed and repeated.
- QA Cycle 3 (5a), scoped to `f530a532..93fb2108`: gate PASS 96/100.
  - Code review ran as one Explore subagent (89.4 s) and found 2 LOWs (CR3-1 and CR3-2).
  - CI green on `93fb2108`, so BUG-4 is closed.
  - Route classifier → `cosmetic-residue` (2b): the LOWs went to `recommendations.future` and
    `## Deferred Work`, and no 5b ran.
- 5c `/review-pr --effort medium --comment --no-code`: CONCERNS. The conformance lens took 86.5 s;
  all 3 anchors are `ok`.
  - Carry fixes in the task document: PC-3 (the Breaking Changes entry said `enforce: yes` is off;
    the resolver reads it as on), and PC-1/PC-2 (the "CI has no zsh lane" claim is false, since
    `test.yml` installs zsh).
  - The develop-time claim that CI has no zsh was itself the error, and two QA cycles repeated it
    from the task document without checking `test.yml`.

### Step 7 — finalise

- `/finalise` was invoked through the Skill tool. DoD verdict: ACCEPTED (`task.241.dod.1.finalise-changelog-checks-opt-in.md`).
  - AC: 12/12 PASS.
  - Docs: PASS. Changelog checks are on, and the entry cites (task 241).
  - Compliance: NOT_APPLICABLE.
  - Security: PASS. The agent returned `boundary: true`, and /finalise ran its plan: 31 probes over 2 controls (the resolver and the Step 3b guard), 0 reproduced, 0 escapes, 0 refusals. Record: `task.241.dod.1.security.run.json`.
- PR review column: `reviewDecision` is null (single maintainer), so the 5c report `pr-review.1` stands in for it (CONCERNS, no coverage finding).
- CI reading 1: SUCCESS @ 8754c848127b (6 checks); CI reading 2: SUCCESS (tree-equivalent to 8754c848127b) @ a9c131402f4a (6 checks, docs-only acceptance commit)
- The acceptance commit `a9c13140` carried the task document (`status: accepted`, Change Log 1.2, DoD section), the DoD file and its probe record, the sprint review, the registry tick (`planned` → `accepted`), and the staged 5c review report together with its carry fixes.
- 6d: `(task 241)` is cited under `[Unreleased]`.
- Canonical PR comment: #issuecomment-6467616102. DoD body posted to the PR: #issuecomment-6467629847.
- Tracker #772:
  - The `done` comment was `posted`.
  - The issue is closed, confirmed as CLOSED.
  - Board `done` returned `already`, because the card was already in Done.
  - The Document link already pointed at a durable branch.
- The Pipeline Progress row for steps 5–6 was first written with a guessed completion time (12:05Z). It was corrected to 11:00Z against `date -u` before commit.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3: the fast gate's first run was red: the `_CONFIG_GUARDED_KEYS` pin, `tracker-access.test.sh` § 44. Triage: 1 real, 0 flaky, 0 unrelated. Fixed the same iteration.
- Step 3: the task's zsh verification could not run on any available host. Left as a residual; nothing escalated.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 3 medium:
- CR-1: an unreadable config resolves to a silent `off`
- CR-2: two dispatched prompts still read `CHANGELOG.md`
- CR-3: guarding the bare key `enforce` refuses unrelated configs (a regression)

Plus 1 low: PROBE-1, a block-scalar value gets a different answer from each tier.
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-10-28
**Gate Result**: CONCERNS
**Issues Found**: 1 medium:
- BUG-4 / CI-1: the 6d test helper leaked temp dirs, so CI's tmp-leak ratchet failed

4 low:
- CR2-1: a missing resolver read as "not enabled"
- CR2-2: the bug DoD template's changelog placeholder
- CR2-3: the tiers split on deeper nesting
- CR2-4: the enumeration matched upper-case only

Plus 1 cleanup.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-10-28
**Gate Result**: PASS
**Issues Found**: 2 low, both carried:
- CR3-1: the allow-list span `.*?` is too broad
- CR3-2: `changelog-unknown` is not named in the 6d heading, checklist or runbook
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — `task.241.pr-review.1.finalise-changelog-checks-opt-in.md`. Conformance lens only (`--no-code`). PC-3 is medium consistency; PC-1 and PC-2 are low trail. There is no coverage finding, so the loop exits to Step 7. All three were doc-only and were fixed by the carry.
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 3 with HIGH 0 for cycles 2 and 3; all 2 open findings are LOW and are carried to the gate's recommendations.future by id (TASK-241-CR3-1, TASK-241-CR3-2). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-28 11:19 UTC
**Final Status**: Completed
**Branch**: feature/task.241.finalise-changelog-checks-opt-in
**PR**: [#773](https://github.com/Gamaroff/agent-skills/pull/773)
**QA Iterations**: 3
**DoD Summary**: `task.241.dod.1.finalise-changelog-checks-opt-in.md`
**Tracker debt**: none

**Completion Summary**: This run implemented the opt-in for /finalise's two changelog checks.
- One resolver, `changelog-enforce.sh`, turns `changelog.enforce` into `on`, `off` or `unknown`.
- Step 3b (the docs agent) and 6d both read that answer, and both HALT `changelog-unknown` on a broken install.
- The setting is off by default, and this repository opts in.

QA took 3 cycles:
- Cycle 1 (CONCERNS 70) found three medium bugs: a non-strict config read, two prompts still reading the changelog, and an over-broad guard.
- Cycle 2 (CONCERNS 90) found a temp-dir leak that tripped the CI ratchet with 0 failing tests, plus a missing resolver reading as "not enabled".
- Cycle 3 passed at 96, and route 2b carried two lows.

5c found that the task document wrongly claimed CI has no zsh lane, and that claim was corrected. The DoD accepted on its first run.
