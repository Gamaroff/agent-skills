# Implementation Report: Make an unattended run watchable from a second terminal, and audible when it stops

**Task**: `task.63.loop-supervisor-status-views.md`
**Run Number**: 1
**Started**: 2026-08-28 13:05
**Status**: In Progress

---

## Summary

Adds the loop-supervisor terminal views — `status`, `watch`, and terminal-stop notification
(`--notify` / `--webhook`) — as pure readers over the `current.json` / `runs.jsonl` artifacts
that task 62 writes.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                            |
| PR target           | develop                                                                                                                            |
| qa-planning gate    | skipped (auto)                                                                                                                     |
| Task risk level     | low                                                                                                                                |
| Pipeline mode       | standard                                                                                                                           |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.63.*` exists in git                               | Branch created at `94a8653`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.63.review.1.loop-supervisor-status-views.md` exists              | 8/10; 1 Critical + 4 Important + 5 Optional, all applied; Draft → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration, no rework; 5 phases; 8 files; 30 new tests; 5 mutations proved; npm test 1824/1824 | — (surface map built inline) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #277](https://github.com/Gamaroff/agent-skills/pull/277) → `develop`; no issue linked, Step 6b skipped | — (PR body written directly) |
| 5–6. qa-task / qa-fix loop | ✅ Done    | qa.1 + qa.2, gate.1 + gate.2, bug.1; PR comments posted                | 2 cycles: CONCERNS 90 → **PASS 100**. 1 MEDIUM found, fixed, verified, closed | — |
| 7. finalise                | ✅ Done    | `task.63.dod.1.*.md`; task `status: accepted`                          | CI waited on (was PENDING) → SUCCESS on head 7fcc302; sprint-review-summary.md written | — |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final state committed | — |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Step 2 — review-task — 2026-08-28

- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 0a branch setup auto-skipped — already on `feature/task.63.*`.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds
  autonomously and needs the task corrected before `/develop` runs.
- review-task Step 9 auto-answered: **Yes, fixes complete** — `Draft` → `Ready for Development`.
- review-task Step 10 (tracker comment) skipped silently — no linked issue.
- Pre-pass Agents B/C not dispatched as subagents; architecture-alignment and already-implemented checks
  were run inline against `skills/loop-supervisor/` and `package.json`, which is the whole surface this
  task touches. Implementation status: **not started** — no `status`/`watch` subcommand exists.
- Sign-off check skipped — `sign-off.enabled` absent from `skills-config.yaml`.

### Step 3 — develop — 2026-08-28

- Draft/Planned gate: not reached — `/review-task` promoted the task to `Ready for Development` in
  Step 2, so `/develop` proceeded without prompting.
- High-risk gate: not applicable (`risk_level: low`).
- Alignment: **greenfield** — no `status`/`watch` subcommand existed, so no code-vs-document conflict
  arose and the alignment prompt never fired.
- **Phase 1 open decision resolved: renderer extracted** to `skills/loop-supervisor/references/render.js`.
  It reached ~230 lines and `run-loop.mjs` was already 923. Skill-owned and CommonJS, matching
  `classify.js`/`adapters.js`; deliberately **not** `shared/resources/`, which `npm run bundle` owns.
- **One pre-existing test changed deliberately:** `run-loop.test.mjs` used `parseArgs(["watch"])` as its
  example of an *unknown* subcommand. Shipping `watch` made that assertion false, so the example was
  swapped for `sprint` and the reason recorded inline. Intent preserved, fixture moved.
- Test loop: 1 iteration, no stall, no three-strikes escalation.

- **Pre-develop surface map: 8 files** across `skills/loop-supervisor/`, `evals/loop-supervisor/` and
  the repo doc/gate surface. Built inline from the Step 2 review rather than by dispatching a fresh
  Explore subagent — Step 2 had just read every one of these files to verify the task document against
  them, so a re-scan would have re-derived a map already in hand.
  - `skills/loop-supervisor/scripts/run-loop.mjs` (923 L) — the CLI. `parseArgs` (closed subcommand
    allowlist L165, closed flag switch L176–250), `DEFAULTS` L63, `writeCurrent` L646, `appendLedger`
    L899 with two call sites (L711 thin, L826 full), `isPidAlive` L422 (exported), `renderStreamLine`
    L393, summary write L869, SIGINT handler L611.
  - `skills/loop-supervisor/references/classify.js` — `classify`/`shouldStop`; outcome vocabulary the
    renderer displays.
  - `skills/loop-supervisor/references/adapters.js` — adapter names/probes; `adapter` appears in current.json.
  - `skills/loop-supervisor/references/yaml-subset.js` — **bundled from `shared/resources/`**; do not
    hand-edit, and do not put a new module there.
  - `skills/loop-supervisor/README.md` — §Reading a run (L117), §Limits (L186, stale bullet L189).
  - `skills/loop-supervisor/SKILL.md` — §Artifacts (L108), §Limits (L131, stale bullet L135).
  - `evals/loop-supervisor/unit/{classify,adapters,run-loop}.test.mjs` — node:test, inline objects,
    no on-disk fixtures. Already in the `npm test` glob.
  - `docs/reference/commands.md` L25–26 — the two existing run-loop rows to pattern-match.
- No plan file (`task.63.plan.*.md`) exists — optional, proceeding without.
- Always-load files (3) passed to `/develop` as initial context.

### Pipeline Startup — 2026-08-28

- **Invoked by `/develop-next`** (roadmap item T63) in autonomous mode — Phase 0d questions
  auto-answered with the recommended option, no prompting.
- Feature branch base: `develop` — auto-answer (recommended); current branch was `develop`.
- PR target branch: `develop` — auto-answer (recommended); standard Gitflow for a task.
- qa-planning gate: skipped (auto — no prompt).
- Phase 0 fan-out: resolver not dispatched (explicit file path supplied and verified on disk);
  tracker poller not dispatched (no `github_issue`/`jira_key` in frontmatter — nothing to poll);
  lite-mode inputs read directly from the task document.
- Pipeline mode: **standard** — computed from `risk_ok = true` (risk_level `low`),
  `phase_count = 5` (**not** < 3), `single_module = true`. The phase count alone forces standard.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`, all present on disk.
- Tracker: `github` (no `JIRA_URL`), but the task has no `github_issue` — all tracker signalling
  (0c-reg work-started comment, board move, priority default) skipped. Consistent with task 62,
  which shipped unlinked in this repo.
- Branch: `feature/task.63.loop-supervisor-status-views` created from `develop` at `94a8653`, pushed.
- Tracker signal (0c-reg) skipped — no linked issue.
- Task status is `Draft` — proceeding per the Phase 0c autonomous status table; Step 2 `/review-task`
  promotes it to `Ready for Development`.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Step 3 — develop, 2026-08-28

- **[Resolved]** First draft of `render.js` was written as ESM and would not load: the repo root
  `package.json` is `"type": "commonjs"`, so a `.js` file under `references/` is CJS regardless of the
  `.mjs` importing it. Rewritten to match `classify.js` and `adapters.js`. Caught by a smoke test
  before any test was written against it.
- **[Resolved]** `runStatus` initially built the display model for `--json` but re-read both files for
  the text path — two reads at different instants, so the two modes could disagree about an iteration
  that finished between them. Collapsed to a single `snapshot()`; `watch` uses the same call.
- **[Not a regression — established, not assumed]** Two full-suite runs reported 1 failure of
  1824: `shared/resources/tests/jira-interception.test.mjs` §8b, `exitCode null` at exactly 30003ms.
  A clean-`develop` control run in a separate worktree was **1794/1794 green**, so "pre-existing" could
  not simply be asserted — the failure did appear only on this branch. Investigated rather than
  dismissed:

  | Evidence | Finding |
  | --- | --- |
  | Three full runs on this branch | **fail, fail, pass** (1824/1824, exit 0 on run 3) — nondeterministic |
  | `jira-interception.test.mjs` alone | 48/48, twice |
  | `move-sprint-issues.sh` standalone | ~100ms; the test's `spawnSync` timeout is 30s |
  | Failure mode | `exitCode null` = killed by wall-clock timeout, never an assertion |
  | File overlap with this diff | none — the test drives a `jira-sprint-manager` script |

  **Cause: a load-sensitive test, surfaced by scheduling rather than by this code.** Adding
  `render.test.mjs` puts one more file in `node --test`'s parallel pool; a test that shells out with a
  30s wall-clock budget for ~100ms of work is the first thing to tip when the machine is busy. Runs 1
  and 2 overlapped other work in this session; run 3 ran alone and passed.

  **Final state: `npm test` green, 1824/1824.** The fragility is real but belongs to
  `jira-interception.test.mjs` §8b, not to this task — flagged for a separate bug report rather than
  fixed here, since widening someone else's timeout under cover of an unrelated task is how a suite
  loses the signal it was built to give.

### Step 2 — review-task, 2026-08-28

- **[Resolved]** Task document listed a `runs.jsonl` field `numTurns` that the ledger does not write
  (the field is `turns`, `run-loop.mjs:833`). Both deliverables are pure readers over that record, so
  the wrong name would have propagated into the renderer *and* into the assertion written from the same
  list. Corrected in the task document.
- **[Resolved]** The ledger has a second, undocumented row shape (`spawned: false` probe-stop rows,
  `run-loop.mjs:711`) that omits seven of the fields the task described as always present — and it is
  the normal last line of a healthy run. Documented, and added as a sixth renderer fixture.

---

## QA Iteration History

### Cycle 1 — gate CONCERNS (90/100)

The diff code review found a defect the success criteria did not cover: `readCurrent` collapsed
"absent" and "unparseable" into `null`, so a torn heartbeat rendered as **"no run in flight"** — the
reassuring answer, at the moment it was least deserved. `writeCurrent` wrote non-atomically every ~5s,
so the window was real. Filed as TASK-63-BUG-1 (MEDIUM), promoted to the gate under
`code_review_blocking`.

`qa-fix` fixed both ends: the reader distinguishes the two cases from one `readFileSync` and the error
code (an `exists()` probe would race the runner's own clean-exit delete), and the writer became atomic
via temp-then-rename. A fourth render state was added. 9 tests; both halves mutation-proved.

### Cycle 2 — gate PASS (100/100)

QA verified the fix independently across all four states and four lifecycle transitions rather than
accepting the fix report — including the over-correction check that a clean-exit teardown still reports
"no run in flight" and was not swept into the new state.

Cycle 2 also found a fragility **introduced by the fix**: the sentinel was duck-typed across a module
boundary, so a valid heartbeat carrying that key was misreported as unreadable — the same
state-the-opposite-of-the-truth shape, pointed the other way. Demonstrated, then fixed by moving the
sentinel to `render.js` and comparing by identity, then pinned by a test. LOW severity (unreachable via
the writer), so it did not gate; fixed anyway because it is six lines.

**Net:** 150 tests for the skill, 7 invariants mutation-proved, 0 open issues.

---

## Completion

**Finished**: 2026-08-28
**Final Status**: Completed
**Branch**: `feature/task.63.loop-supervisor-status-views`
**PR**: [#277](https://github.com/Gamaroff/agent-skills/pull/277)
**QA Iterations**: 2 (cycle 1 CONCERNS 90/100 → cycle 2 PASS 100/100)
**DoD Summary**: `task.63.dod.1.loop-supervisor-status-views.md`
**Tracker debt**: none — this task has no linked tracker issue, consistent with task 62 and this repo's convention for technical tasks. No mutations were deferred.
