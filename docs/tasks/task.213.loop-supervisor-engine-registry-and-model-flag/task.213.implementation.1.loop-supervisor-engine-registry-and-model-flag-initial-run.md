# Implementation Report: loop-supervisor: an engine registry (claude, agy) and a --model flag

**Task**: `task.213.loop-supervisor-engine-registry-and-model-flag.md`
**Run Number**: 1
**Started**: 2026-10-21 08:40
**Status**: In Progress

---

## Summary

Move loop-supervisor's claude-specific argv, result envelope and transcript path into an engine registry, register `agy`, and add `--engine`, `--model` and `--effort` — first run, dispatched unattended by `/develop-next`.

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
| Board status        | #715 — work-started: transitioned (issue created at Step 2)                |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.213.*` exists in git                              | Branch created at `a721d28d` | —                    | 2026-10-21T06:37Z |
| 2. review-task             | ✅ Done    | `task.213.review.{N}.{name}.md` exists (or skip logged)                | `task.213.review.1.*.md` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-10-21T06:44Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan names every hunk); 13 files, 31 tests; ci:fast green; 10/10 mutations killed | —                    | 2026-10-21T07:03Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.213.qa.{N}.*.md`; `task.213.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.213.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-21

- Dispatched by `/develop-next` (autonomous run, `--defaults`); selection source `task-registry` (T213, registry line 257).
- Feature branch base: develop — source: recommended (`--defaults`, on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector. Phase 0 ran inline (no 0a-parallel agents dispatched); inputs derived from the document: `risk_level` absent (risk_ok true), phase_count 5 (≥ 3), single_module true → standard.
- Skips: none. Refused flags: none. Questions asked: 0 (`--defaults`, nothing in conflict).
- qa-planning gate: skipped (auto — no prompt)
- Status at start: `planned` — proceeding; Step 2 (`/review-task`) validates and promotes.
- Tracker: GitHub (no `JIRA_URL`); no `github_issue` linked — tracker signals skipped. Tracker poller not dispatched (no issue key).
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Branch: `feature/task.213.loop-supervisor-engine-registry-and-model-flag` from `develop` at `a721d28d`, pushed with tracking. Report stashed before branch creation and restored after.
- Pre-check: `agy` 1.4.2 is installed at `~/.local/bin/agy` and `agy models` answers (13 ids), so Phase 0's live capture is runnable.

### Step 2 — review-task

- review-task output: Comprehensive report — required for pipeline audit trail. Review report: `task.213.review.1.loop-supervisor-engine-registry-and-model-flag.md` (READY TO IMPLEMENT, 8/10, 0 critical / 8 important / 3 optional).
- Pre-pass agents B and C not dispatched; both axes checked inline (independence loss recorded in the review report).
- Auto-answers (autonomous run, each the recommended option): tracker sync → "Sync to GitHub" (issue #715 created, board Priority P2); Risk 1 → the task's recommended default (operator-only `--dangerously-skip-permissions`, refused on `claude`, never a config key); Medium Risk 1 → the document's own Phase 0 mitigation.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. Step 9 auto-answered: Yes, fixes complete.
- Planned promoted to Ready for Development by review-task. `reviewed_blob` stamped (`written`).
- work-started re-fired at Step 2 — issue 715 created by the review; lock updated. Comment: posted; board (`gh-stage.js`): transitioned.
- Review outcome comment skipped — review-task reported `posted`.

### Step 3 — develop

- Pre-develop surface map: `run-loop.mjs` (DEFAULTS, parseArgs/KEY_OF, applyConfig, buildClaudeArgs, renderStreamLine, main dry-run, iteration spawn/parse/ledger, transcriptPathFor), `classify.js` (`isChildError`), `render.js` (`money()` tolerates null), `adapters.js` (CommonJS style for `engines.js`) — inline, Explore not dispatched (independence loss).
- Plan file found: `task.213.plan.loop-supervisor-engine-registry-and-model-flag.md` — included as implementation context.
- Step 3 inline — `/develop` not invoked: plan names every hunk; surface map from the review.
- Phase 0 facts (agy 1.4.2, model `gemini-3.8-flash-low`), recorded in the plan's "Verified facts": SUCCESS exits 0; a bad `--model` gives `status: "ERROR"`, exit 1, empty `conversation_id`; `--conversation <fresh-uuid>` resumes only (warns "not found", runs under a new id), so it is never sent and the ledger id comes from the stream; `--mode accept-edits` ran a shell command unprompted in print mode; `--sandbox` did not hold (the agent re-ran outside it), so it is not emitted. Fixtures: `agy-result.ndjson` (real capture, cwd sanitised) and `agy-result-error.ndjson`.
- Characterisation first: three `t213:` tests pinned the claude dry-run argv (normalised session id and settings path) and passed on unchanged code before `engines.js` existed.
- `engines.js`: CommonJS, one row per engine, `{name, binary, supports, buildArgs, parseResult, renderLine, transcriptPath}`; `resolveEngine` (own-property lookup — `toString` is not an engine) and `assertSupported` (one `GATED_FLAGS` table). `run-loop.mjs` has no engine-name branch; `buildClaudeArgs`/`renderStreamLine`/`transcriptPathFor` kept as exported delegates.
- Decision: totals `costUsd` starts `null` (not `0`) for an engine without `supports.cost`, so the summary reads unknown rather than `$0.0000`. The run summary gained `engine`.
- Decision: a non-pinned engine gets `sessionId = null` before spawn; the ledger row takes `sessionId ?? env.sessionId ?? null`, and `transcriptPath` is computed only from a non-null id.
- Mutation proof (`scratchpad/t213-mutate.py`, sources sha1-verified restored): 10 of 10 killed — agy fail-closed `isError`, refusals removed, claude `--model` position, dry-run executes the engine, skip-permissions read from config, agy ledger gets a supervisor uuid, claude argv drift, agy `--conversation`, flag loses to config, agy cost reads as `$0`.
- Doc sweep: loop-supervisor `README.md` (options rows, new "Engines and models" section, resume note), `SKILL.md` (description, table, spawn step, resume), `docs/reference/configuration.md` (3 keys + example), `docs/reference/commands.md`, `docs/runbooks/unattended-overnight-runs.md`, develop-next `SKILL.md` + `README.md`. `generate-catalog` run; `validate` ✓.
- Performance criterion — the five pre-existing files, 5 runs each, bash `time` (`/usr/bin/time` absent): **base** `a721d28d`, load 2.33 → 0.292 / 0.305 / 0.298 / 0.287 / 0.280 s, median **0.292 s**, 185 pass; **head**, load 5.45, `--test-skip-pattern='^t213:'` so only pre-existing tests run → 0.285 / 0.275 / 0.280 / 0.293 / 0.282 s, median **0.282 s**, 185 pass. Within 10% (−3%), at roughly twice the load.
- Development completion comment posted to github issue 715 (`tracker-comment.js` reason `posted`, count=5).
- Gates: `npm run ci:fast` rc 0 — 6,136 tests, 6,122 pass, 0 fail, 14 skipped. Loop-supervisor unit suite 217 tests, 216 pass, 1 skipped (live-network case).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — `ci:fast` 1,576 failures from `/tmp` inode exhaustion (resolved).** `df -i /tmp` read 100% (1,048,575/1,048,576); 53,655 of 58,396 top-level entries carried a temp-dir prefix this repo's tests create. Removed only stale (> 60 min), my-owned entries matching those prefixes (≥ 5 chars; sockets and `claude-*` excluded) → 13% used. T213's own `runOnce`/`dryRun` helpers leaked too and now `rmSync` their root. Observation #83 logged for the repo-wide leak.
- **Step 3 — first `ci:fast` reported exit 0 from the background task while the gate failed** (the trailing `echo` owned the exit code). The log's own `rc=1` line was read; re-runs propagate the real code.
- **Step 3 — Prettier failed on the two test files**; fixed with `prettier --write`.
- **Step 3 — `ci:fast` run 2: 2 failures, both T213's.** `test-harness-concurrency` refused the literal `timeout: 30000` in `engines.test.mjs` → now `spawnBudget("LOOP_SUPERVISOR_ENGINES")`. `bundled-links` refused the README link to the then-untracked `references/engines.js` → new files marked intent-to-add (`git add -N`). Both guards re-run green on their own.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.213.loop-supervisor-engine-registry-and-model-flag`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
