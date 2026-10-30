# Implementation Report: Wireframe mapping setup offer and first-run candidates

**Task**: `task.246.wireframe-mapping-setup-offer.md`
**Run Number**: 1
**Started**: 2026-10-29 21:48
**Status**: Completed

---

## Summary

Add the `declined`/`partial` states, `detect` and `configure` to `wireframe-map.js`, catalogue-derived candidates in `resolve`, the setup offer in `create-story`/`create-task`, and a "Writing map rows by hand" guide.

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
| Tracker Issue       | #792 (GitHub)                                                              |
| Board status        | In Progress ✅                                                             |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.{id}.*` exists in git                             | Existing branch reused at `a1cfc945` (cut from develop); pushed with tracking | —                    | 2026-10-29T21:49Z |
| 2. review-task             | ✅ Done    | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | skipped — already reviewed (`task.246.review.1.wireframe-mapping-setup-offer.md`) | —                    | 2026-10-29T21:50Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | inline (plan + surface map); 1 iteration, 5/5 phases; gate green on run 2 | —                    | 2026-10-29T22:09Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #793: https://github.com/Gamaroff/agent-skills/pull/793 | —                    | 2026-10-29T22:11Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 4 cycles; gate.4 PASS (100); cosmetic-residue exit (CR4-1 carried); PR review APPROVE (`task.246.pr-review.1…`). Re-entered after DoD run 1: cycle 5 gate.5 PASS (100), PR review 2 APPROVE | —                    | 2026-10-29T23:10Z |
| 7. finalise                | ✅ Done    | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      | DoD run 1: 3 gaps (#11, #12, #13; test-only), fixed and re-gated (cycle 5). DoD run 2: ACCEPTED 18/18; acceptance commit `e0eec8fe`; CI 2 SUCCESS; #792 closed | —                    | 2026-10-30T04:04Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed (the acceptance artefacts went in finalise 6a, `e0eec8fe`) | —                    | 2026-10-30T04:04Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-29

- Feature branch base: develop — source: asked. The task branch `feature/task.246.wireframe-mapping-setup-offer` already exists, cut from develop, carrying the two task-doc commits (create-task, review 1); it is reused.
- PR target branch: develop — source: asked (standard Gitflow).
- Mode: standard — source: detector. Phase 0 run inline (no subagents): risk_level absent (risk_ok), phase_count 5 (not < 3), single_module false (engine + two skills + docs) → standard.
- Skips: none. Refused flags: none.
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: Q1 (base) → develop; Q2 (PR target) → develop. Count 2, matches `questions[]`.
- Wireframe 0c-wire: skipped — this repo's `skills-config.yaml` sets no `ui.wireframeMap`; `WIREFRAME_OPEN=[]`.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: Ready for Development (review 1 already ran: `task.246.review.1.wireframe-mapping-setup-offer.md`).

### Step 1 — create-branch

- Branch `feature/task.246.wireframe-mapping-setup-offer` already existed (create-task/review-task commits, 1 ahead of origin/develop, contains it); reused rather than recreated, pushed with `-u`.
- Implementation report stashed before, restored after.
- Tracker comment `work-started`: posted.

### Step 2 — review-task

- review-task skipped — task status is `Ready for Development` and review report exists at `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.review.1.wireframe-mapping-setup-offer.md`.
- Wireframe writes: skipped (no `ui.wireframeMap` in this repo). Tracker key re-read: unchanged (#792). Skip notice: posted.

### Step 3 — develop

- Plan file found: `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.plan.wireframe-mapping-setup-offer.md` — included as implementation context.
- Pre-develop surface map: done inline, not by an Explore subagent (independence loss recorded). The task's § 3 and the plan name every file: `shared/resources/wireframe-map.js`, its test, `wireframe-component-mapping.md`, `skills/create-{story,task}/SKILL.md`, `evals/shared/tests/wireframe-mapping-hooks.test.mjs`, `docs/reference/configuration.md`, `CHANGELOG.md`.
- Step 3 inline — /develop not invoked: plan names every hunk, and the surface map is recorded above.
- Fast gate: `develop.fastGateCommand` unset → `npm run ci:fast` (defined). Run with `.agents/skills` and `.claude/skills` moved aside, per this repo's practice.
- Engine mutation proofs: 10 on scratch copies, all killed after one survivor (the `exists` check) gained its same-value case. Hooks mutation 4c killed.
- Gate iteration 1: red, 1 of 6879 — `tests/skill-protocol.test.js` compared first occurrences; anchored on the config-load step, mutation-proven. Test-failure triage done inline from the log's failure lines (no subagent).
- Gate iteration 2: green — 6879 tests, 6865 pass, 0 fail, 14 skipped (symlinks moved aside, restored).
- Loop audit done inline (no subagent): status `ready-for-review`, Implementation Plan 5/5 phases, 0 unchecked boxes left in the task. Change Log row written by the inline path (one row).
- Development completion comment posted to github issue 792. GitHub board: work-started → transitioned to In Progress (re-check: `already`). Priority default block not run: the issue was created by `ensure-task-github-issue`, which sets Priority.

### Step 4 — create-pr

- SCOPE_PATHS (17): the work-item dir, `CHANGELOG.md`, `docs/reference`, `evals/shared/tests`, `shared/resources/tests`, `shared/resources`, `skills/{create-story,create-task}` and their `references`, `skills/{develop-story,develop-task,qa-story,qa-task,review-story,review-task}/references`, `tests`. Pre-flight guard: nothing held (the only untracked file was this report, in scope).
- Report links checked after staging: ok (0 relative links). Task doc: 3 links ok.
- Commits: `fbc881e7` feat(wireframe-map) — the feature, tests, docs, bundled copies; `91b0c468` docs(task.246) — task record and this report. The pre-commit bundle check passed on both. Leak check: OK.
- PR body written by the orchestrator from the task record, not by the summariser subagent: the diff is 10.5k lines, mostly bundled copies, and the task's Implementation Record already states every change.
- PR #793: https://github.com/Gamaroff/agent-skills/pull/793 (base develop). Issue #792 comment `in-review`: posted. Lock `pr_url` set.
- GitHub board: in-review → stage-disabled (this board's `tracker-workflow.yaml` sets no in-review moment).
- Post-PR state check (inline `gh pr view`, not the poller subagent): PR #793 state = OPEN. errors = 0.

### qa-fix — cycle 1

- QA Cycle 1 — changes-requested: stage-disabled.
- fix_cycle: not supplied — derived from the gate (1).
- Findings ingested inline (Step 1b), not by the ingester subagent: the gate was written in this session and holds 5 entries. PR review report: none. Pre-fix surface map inline: every fix is in `wireframe-map.js` and its test.
- Fixed: CR-1 (`stripJsonc`, string-aware, drops trailing commas); CR-2 (`configure` uses `presentKeys`, fills a blank key where it stands; `readsBack` skips written keys); PROBE-1 (NEL in `LINE_TERMINATOR`); PROBE-2 widened to the class — any character `JSON.stringify` escapes is a usage error naming its code point; QA-1 (PR body lists both breaking changes). Advisory CR-3 (blank `--map` is usage) and CR-4 (configure flags refused by other commands) also fixed.
- The restore test now forces `write-failed` with `--map off` (written, reads back as a decline), since a backslash is a usage error.
- Mutation proofs: 9, all killed — old strip, no trailing-comma drop, old presence rule, blank key written twice, old read-back, NEL removed, character refusal off, stray-flag check off, untrimmed map check.
- Probe (doc sweep): phrases `tsconfig`, `U+2028`, `write-failed`, `must be one line` over executed docs. Hits: `wireframe-component-mapping.md` — updated (a `usage` row in the configure reason table); `finalise/SKILL.md` — unaffected (another engine's `write-failed`); the `tsconfig` hits — unaffected (unrelated skills). CHANGELOG entry updated. Population 1 for the subject → patch.

### qa-fix — cycle 2

- QA Cycle 2 — changes-requested: stage-disabled.
- fix_cycle: not supplied — derived from the gate (2).
- Findings ingested inline: the gate was written in this session and holds 6 entries. PR review report: none. Every fix is in `wireframe-map.js` and its test.
- Fixed: CR2-1 (`importOf` proposes only an exact alias; a wildcard gives `null` with evidence); CR2-2 (`isDecline` folds `false` as well as `off`; `configure --map false` is a usage error); CR2-3 (`presentKeys` matches `readUiConfig` — a list is a value only for `componentExclude`; a blank key's list lines are replaced with it); CR2-4 (one `UI_LINE` accepts a BOM); CR2-5 (comments at any indent are skipped by the block scan); CR2-6 (NEL moved to a configure-only `YAML_LINE_BREAK`).
- Found while fixing CR2-4: a quoted `"ui":` key read `unset` to `detect` while yaml-subset parsed it, and `configure` then appended a second block (`write-failed`). Same class; `UI_LINE` accepts a quoted key too.
- The cycle 1 JSONC test pinned the wrong value for a wildcard alias (`@app/components/*` → `@app/components`); that case was removed and the wildcard behaviour has its own test.
- The restore test now forces `write-failed` with two top-level `ui:` blocks, since `--map off` is a usage error.
- Literal U+FEFF bytes written by an Edit into the engine and the test were replaced with `String.fromCharCode(0xfeff)`; `grep -P '\x{FEFF}'` finds none.
- Mutation proofs: 10, all killed — any alias proposed, `false` not folded, decline `--map` accepted, list counts as a path, list left under a filled key, BOM not allowed, quotes not allowed, indent from a comment, configure on the shared terminator set, NEL back in the shared set.
- Probe (doc sweep, cycle 2): phrases `off` (any case), `wildcard`, `path alias`, `reads as a decline`. Hits: `wireframe-component-mapping.md` — updated (`usage` row names a decline `--map`); `docs/reference/configuration.md` — already says "any case", now true; CHANGELOG — updated (exact alias only, quoted/BOM key, any-case `false`). Population 1 → patch.

### qa-fix — cycle 3

- QA Cycle 3 — changes-requested: not signalled separately (stage-disabled on this board, as in cycles 1–2).
- fix_cycle: not supplied — derived from the gate (3). Findings ingested inline (2 entries).
- Fixed: CR3-1 (the list removal under a blank key skips blank and comment lines, stopping only at a line that is neither deeper nor a same-indent list item); CR3-2 (comments are kept). Also: a file that ended without a newline still does, and blank keys are filled before the missing keys are inserted, so an insert follows the filled key directly (the old order left a stray blank line in that case).
- Mutation proofs: 3, all killed — stop at a blank/comment, remove comments with the list, add a final newline. The fill-before-insert order is held by the last-line test's second case but was not separately mutated.
- Probe (doc sweep): no doc restates the list removal; the "keeps every other byte" promise is now true for comments. Population 0.

### QA cycle 4 and Step 5c

- QA cycle 4 scoped reviewer (79,954 ms) returned one low finding (CR4-1), QA-reproduced; gate PASS 100. The route classifier returned `cosmetic-residue`: CR4-1 carried to gate 4 `recommendations.future`, closed in `top_issues`, recorded under the task's `## Deferred Work`.
- BUG-5 closed; all five bug reports closed.
- 5c `/review-pr --effort medium --comment --no-code`: conformance lens (39,592 ms) returned no findings; anchors checked against `12d6bf03` (`head-branch`); verdict APPROVE; OPEN_COVERAGE=0. Report `task.246.pr-review.1.wireframe-mapping-setup-offer.md` staged for the acceptance commit. GitHub board ready-for-merge: stage-disabled.
- The `qa-gate-4` stakeholder lead reads "The checks found no problems" for a PASS gate that carried one LOW, because the lead is keyed on the verdict alone.

### Step 7 — finalise (DoD run 1)

- The four DoD agents returned:
  - AC traceability (204,136 ms): PARTIAL, 15/18; the merge wrote `task.246.dod.1.ac.json`.
  - Security (332,097 ms): `boundary: true`, a 10-control plan.
  - Compliance (19,752 ms): NOT_APPLICABLE.
  - Docs (34,617 ms): PASS.
- Probe run by `/finalise` from the security agent's plan: 146 executed, 0 reproduced, 0 escapes, 0 refusals. Record: `task.246.dod.1.security.run.json`.
- CI reading 1: SUCCESS @ `12d6bf03f177`, over 6 checks.
- Orchestrator slip, caught and corrected: the first AC merge input left out #14–#18. Those five read FAIL until they were restored verbatim and the merge re-run.
- Decision: GAPS (3). Fix-and-recheck (8a) was not taken: there are three findings, inspection found them, and none has a severity.
- Gaps PR comment: issuecomment-6510775286. The lock is held at 7.

### Resume — QA re-entry after finalise DoD gaps

- The HALT had not snapshotted or removed the lock (still live at 7), so `reenter-qa-after-finalise.sh` would have refused `lock-present`. The orchestrator wrote the snapshot (`halt_step` 7) and removed the lock, as the HALT rule says, then ran the script.
- QA re-entry after finalise DoD gaps: "re-entered QA at step 5 / qa_phase 5a — qa_max_cycles=10 (base 8), gate_head=a0073d014200". Code moved: `ff3fb83c` changed `evals/shared/tests/wireframe-mapping-hooks.test.mjs` and `shared/resources/tests/wireframe-map.test.mjs`.
- The base 8 is wrong: the script counts every `### QA Cycle` heading, and this report had two per cycle (Decisions Log and QA Iteration History). `report-lint` flags the same defect (`qa-cycle-duplicated` ×4). Repaired: the four Decisions Log headings are renamed `### qa-fix — cycle N`, and the lock corrected to `qa_reentry.report_entries` 4 and `qa_max_cycles` 6 (base 4 + 2). The next cycle is 5. Logged as observation #135.
- QA cycle 5 (`/qa-task`, re-review scoped to the 2 test files changed since gate 4's head): PASS 100. The scoped reviewer took 71,394 ms and returned one advisory finding, CR5-1 (medium/medium). It is not promoted, and is carried to future work: skill-local develop step docs are outside the hooks test, which matches the criterion as written. Three mutations were all `covered`. `ci:fast` 6876 pass, 0 fail. CI on `ff3fb83c`: pending at gate time. The traceability mapper was skipped because the Success Criteria are a checklist, not a table. Committed `93ebdb87` and pushed.
- 5c `/review-pr --effort medium --comment --no-code`, second pass: the conformance lens took 45,490 ms and returned no findings; verdict APPROVE; OPEN_COVERAGE=0. Report `task.246.pr-review.2.wireframe-mapping-setup-offer.md` is staged for the acceptance commit; the carry list is empty. GitHub board ready-for-merge: stage-disabled.

### Step 7 — finalise (DoD run 2)

- **ACCEPTED.** The re-run was scoped from `task.246.dod.1.ac.json`: 14 criteria re-judged, 4 carried, 18/18 PASS. The three run-1 gaps are closed. Security PASS. Compliance NOT_APPLICABLE. Docs PASS, with CHANGELOG citing task 246.
- **Security probe.** The agent's plan is run 1's 10 `cli:` controls with their inline cases. Before the run, the orchestrator verified the on-disk plan byte-identical to the `dod.1` cases files, so no hand-retyping happened. The probe executed 146 cases: 0 reproduced, 0 escapes, 0 refusals. Record: `task.246.dod.2.security.run.json`, committed with its cases, the same way run 1's was.
- **CI.** Reading 1: SUCCESS @ `93ebdb87b7d8` over 6 checks; the first sample was PENDING on `test`. Reading 2: SUCCESS (tree-equivalent to `93ebdb87b7d8`) @ `e0eec8fe9a1f`; the acceptance commit changes only files under `docs/`.
- **Acceptance commit.** `e0eec8fe`, pushed. It contains the DoD, the sprint review, the AC record, the security record, the registry tick (`ticked`, planned → accepted), and the carried 5c PR review 2. Run 1's gap section in the task body is retitled historical/superseded.
- **Side effects.** PR canonical comment: issuecomment-6514664781 (posted). Tracker #792: Document link already on `develop`; completion comment `posted`; closed and verified CLOSED. Board `done`: `already`.
- DoD summary: `docs/tasks/task.246.wireframe-mapping-setup-offer/task.246.dod.2.wireframe-mapping-setup-offer.md`
- CI reading 1: SUCCESS @ `93ebdb87b7d8`; CI reading 2: SUCCESS (tree-equivalent to `93ebdb87b7d8`) @ `e0eec8fe9a1f`
- DoD body posted to PR: https://github.com/Gamaroff/agent-skills/pull/793#issuecomment-6514664781
- GitHub Issue #792 — close: CLOSED ✅ (state read back with `gh issue view`; errors = 0)
- GitHub Issue #792 — board: done → already (`gh-stage.js` read the column as `Done`)
- Accept gap: the tracker-actions journal is empty (`access.tracker` = full), so there is no tracker debt
- ✅ Task completed — DoD run 2 accepted

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Finalise DoD gaps (Step 7, DoD run 1)**. All three are test-coverage gaps, and each was verified in the code by the orchestrator.
  1. **#11**: `evals/shared/tests/wireframe-mapping-hooks.test.mjs:127-130` hard-codes develop-story, develop-task and develop-bug. The criterion names `skills/develop-*/SKILL.md`, so `skills/develop-next/SKILL.md` and `skills/develop-batch/SKILL.md` are unchecked. Fix: enumerate the glob.
  2. **#12**: no test names `libs/`, although `WORKSPACES = ["packages", "libs"]` (`shared/resources/wireframe-map.js:1013`). Fix: add a found case at `libs/a/src/index.ts` and a not-found case at `libs/a/b/src/index.ts` to the bounded-set test, then mutation-prove it.
  3. **#13**: the cycle-3 fill-before-insert order fix is not mutation-proven. Fix: swap the order, see the last-line test go red, and record the proof.
  - These fixes change code outside the work item's directory, so the resume re-enters QA at 5a (`reenter-qa-after-finalise.sh`) before `/finalise` re-runs.
  - **Fixed** (on request, after the HALT). Each fix was mutation-proven by snapshotting the file, mutating it, running the test, then restoring with `cp`:
    - #11: the hooks test enumerates all five `skills/develop-*/SKILL.md`. A `detect` line added to develop-next turns it red.
    - #12: a `libs/` found and not-found pair. `WORKSPACES = ["packages"]` turns it red.
    - #13: the pre-cycle-3 insert-before-fill order turns the blank-key list test red.
    - Both suites: 86/86.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-30
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 5 — CR-1 tsconfig comment strip eats `/*` aliases and `**` globs (medium, BUG-1); CR-2 an empty `ui:` key is missing to `detect` and present to `configure` (medium, BUG-2); PROBE-1 NEL accepted in a `configure` value (low); PROBE-2 a double quote refused as write-failed (low); QA-1 PR body omits the breaking changes (low)
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: qa-fix (cycle 1 of 5) — all 5 findings plus CR-3 and CR-4 fixed; fast gate green (6883, 0 fail); `11b1cfd2` pushed; PR and `qa-fix-1` comments posted

### QA Cycle 2 — 2026-10-30
**Gate Result**: CONCERNS (70/100)
**Issues Found**: 6 — CR2-1 wildcard alias proposed as bare prefix (medium, BUG-3); CR2-2 `False`/`FALSE`/`"false"` not a decline (medium, BUG-4); CR2-3 block-list path key crashes `detect` (medium, BUG-5); CR2-4 BOM hides `ui:` (low); CR2-5 indent taken from a comment (low, BUG-2 reopened); CR2-6 NEL in the shared terminator refuses `record --label` (low, from a cycle 1 fix)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: qa-fix (cycle 2 of 5) — all 6 findings plus a quoted `ui:` key fixed; fast gate green (6889, 0 fail); `1f6477a9` pushed; PR and `qa-fix-2` comments posted. Route classifier: `continue` (not-a-pass-gate; route 2 declined: below-cycle-floor). Convergence: HIGH `0, 0`, no trip. Narrowing residue offered: every MEDIUM on gates 1–2 names `shared/resources/wireframe-map.js` at HIGH 0.

### QA Cycle 3 — 2026-10-30
**Gate Result**: CONCERNS (90/100)
**Issues Found**: 2 — CR3-1 the list under a blank path key survives a blank line or comment, so `configure` answers `write-failed` on a valid file (medium, BUG-5 reopened); CR3-2 the same removal deletes a comment under the key (low). BUG-2, BUG-3, BUG-4 closed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: qa-fix (cycle 3 of 5) — CR3-1 and CR3-2 fixed; blank keys now filled before inserts; 3 mutations killed; fast gate green (6890, 0 fail); `a0073d01` pushed; PR and `qa-fix-3` comments posted. Route classifier: `continue` (not-a-pass-gate; route 2 declined: product-defect-signal). Convergence: HIGH `0, 0, 0`, no trip (`HIGH_N = 0`). Scoped reviewer 119,600 ms; probe re-run 17/0 escaped; CI on `1f6477a9` pending at gate time.

### QA Cycle 4 — 2026-10-30
**Gate Result**: PASS (100/100)
**Issues Found**: 1 — CR4-1 a blank line inside a removed final list is dropped and a final newline added (low, reviewer confidence medium, QA reproduced). BUG-5 closed; all five bugs closed.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.246.pr-review.1.wireframe-mapping-setup-offer.md` (conformance lens only, `--no-code`; 0 findings, OPEN_COVERAGE=0; comment issuecomment-6510595565)
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 4 with HIGH 0 for cycles 3 and 4; all 1 open findings are LOW and are carried to the gate's recommendations.future by id (TASK-246-CR4-1). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

### QA Cycle 5 — 2026-10-30
**Gate Result**: PASS (100/100)
**Issues Found**: 0 gated. Re-entry after finalise DoD run 1; DoD #11, #12 and #13 verified fixed. 1 advisory finding (CR5-1, medium/medium): skill-local develop step docs are outside the hooks test, which matches the criterion as written. Carried to `recommendations.future` and the task's `## Deferred Work`.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.246.pr-review.2.wireframe-mapping-setup-offer.md` (conformance lens only, `--no-code`; 0 findings, OPEN_COVERAGE=0; comment issuecomment-6510595565 updated in place)
**Loop exit**: route 1 — PASS with no open entry
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-30T04:04Z
**Final Status**: Completed
**Branch**: `feature/task.246.wireframe-mapping-setup-offer`
**PR**: [#793](https://github.com/Gamaroff/agent-skills/pull/793)
**QA Iterations**: 5. Cycles 1–3 were CONCERNS and fixed through qa-fix. Cycle 4 was PASS. Cycle 5 was the PASS re-entry after DoD run 1's three test gaps.
**DoD Summary**: `task.246.dod.2.wireframe-mapping-setup-offer.md` (ACCEPTED; run 1 `task.246.dod.1…` found 3 gaps)
**Tracker debt**: none

**Completion Summary**: Implemented the wireframe mapping setup offer. `wireframe-map.js` gains the `declined` and `partial` states, a read-only bounded `detect`, and a comment-preserving `configure` (with `--decline`). `resolve` offers catalogue-derived candidates on an empty map. `create-story` and `create-task` step 3 now run `detect` and offer setup once. The mapping procedure gains a "Writing map rows by hand" guide. The run took 5 QA cycles and fixed 5 bugs, mainly in the edge cases of `configure`'s line-level YAML editing: quoting, CRLF, BOM, NEL, and blank keys carrying lists. Notable decisions: the setup offer stays out of every develop pipeline step, and a test enforces that. DoD run 1 found three test-coverage gaps; they were fixed, re-gated in QA cycle 5, and accepted in DoD run 2. Three advisories are carried to future work: CR5-1, CR4-1, and map-path containment.
