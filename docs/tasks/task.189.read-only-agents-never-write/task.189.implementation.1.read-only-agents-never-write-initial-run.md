# Implementation Report: Read-only agents never write

**Task**: `task.189.read-only-agents-never-write.md`
**Run Number**: 1
**Started**: 2026-10-16 22:26
**Status**: In Progress

---

## Summary

Make every pipeline step that dispatches a read-only Explore subagent the only writer: the QA traceability mapper returns its matrix, the DoD security agent returns a probe plan that finalise runs, the DoD docs agent runs no generator, and a guard test keeps Explore prompts write-free (obs #191, #218).

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
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; priority already P2 Medium) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.189.*` exists in git                             | Branch created at `b996b1de`; pushed with upstream | —                    | 2026-10-16T20:27Z |
| 2. review-task             | ✅ Done    | `task.189.review.{N}.{name}.md` exists (or skip logged)               | `task.189.review.1.read-only-agents-never-write.md` — READY TO IMPLEMENT 9/10 after 7 Important fixes; Planned → Ready for Development | — (pre-pass B/C inline in review) | 2026-10-16T20:32Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; audit ready-for-review 17/17; ci:fast 5797/0 | `.summaries/step-3-loop-audit-1.json` | 2026-10-16T21:09Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.189.qa.{N}.*.md`; `task.189.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.189.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-16

- Invoked by `/develop-next` (registry fallback, task-registry row 189) with `--defaults`; AUTONOMOUS RUN directive applied.
- Phase 0 run inline: the input was a full file path, so no resolver was needed; the lite-mode inputs were derived from the document directly (risk_level absent, 4 implementation phases, multi-module: prompts in `shared/resources/` + `skills/finalise/` + `tests/`) → `standard`.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Feature branch base: develop — source: recommended (`--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector
- Skips: none; refused: none; AskUserQuestion not called (0 questions open)
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `planned` — Step 2 `/review-task` validates and promotes it.
- Branch: `feature/task.189.read-only-agents-never-write` from `develop` (`b996b1de`); report stashed before branch creation, restored after.
- Tracker #588: work-started comment posted; board → In Progress (transitioned).

### Step 2 — review-task — 2026-10-16

- review-task run (Planned + no report → run). Output format auto-answered: Comprehensive report — required for pipeline audit trail.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously. Planned promoted to Ready for Development by review-task.
- Review report: docs/tasks/task.189.read-only-agents-never-write/task.189.review.1.read-only-agents-never-write.md (reviewed_blob stamped).
- Pre-pass B: aligned (axes source: architecture). Pre-pass C: partial — finalise already has the obs #10 probe fallback the task did not know about; the task was rescoped to replace it (Step 3b.1).
- Key scope changes from review: Phase 2 replaces the obs #10 fallback; `<DOD_N>` record/cases paths kept; argv built as an array; guard population adds inline Explore dispatch bodies and `> <` redirects; `code-review-prompt.md` § Scoping gets a caller-runs marker; `finalise-dod-prompt-contract.test.mjs` obs #10 test is rewritten.
- Tracker key re-read at Step 2: unchanged (#588). Review comment posted by review-task Step 10 (`posted`), so the step-2 orchestrator comment is skipped.

### Step 3 — develop — 2026-10-16

- Pre-develop surface map: 20 files identified in shared/resources prompts + step docs, skills/finalise, evals/shared/tests, shared/resources/tests (Explore; included the security-probe.mjs record shape: one folded record per --record path, `cases[]` carries no `input`, exit 2 = stderr-only refusal).
- Plan file found: docs/tasks/task.189.read-only-agents-never-write/task.189.plan.read-only-agents-never-write.md — included as implementation context.
- Always-loaded files: the 3 devLoadAlwaysFiles (not re-read; standards already in context from CLAUDE.md).
- Step 3 inline — /develop not invoked: plan file + surface map both recorded, and the review had already read every target file; the Task Completion Checklist is satisfied below.
- Fast gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`, which resolves.
- **Decision — one run record per DoD run, not one per plan entry.** The engine's `--record` folds every control into one snapshot and keeps `totals.executed` across them; review 1's per-entry records were unnecessary. Cases stay per entry (`…security.cases.<i>.json` when several). Task doc § 3 updated with the dated decision.
- **Decision — a runner script, `shared/resources/security-probe-plan.mjs`, not a long fenced block.** Building the argument array (I4) and mapping reproduced ids back to their inputs (the engine's `cases[]` has no `input`) do not fit shell; the Step 3b.1 block calls the script. Bundled into finalise. Added to Files Summary.
- **Decision — the docs agent gets `<DIFF_FILE>`** (finalise Step 3a already writes it) instead of a `gh pr diff` call, so the catalog rule is platform-neutral.
- **Decision — Step 3b.1 re-dispatches the security agent to grade reproduced probes.** A probe built by finalise has no `severity`, so without grading every reproduced probe would halt at Step 8a and the low-severity fix-and-recheck path would never open. Grading is a read; the agent runs nothing. Pinned in the contract test.
- Guard test redirect pattern tightened during development: the first form (`>` followed by a quote or `<`, with no whitespace requirement) reported 39 false positives on placeholders such as `"<a>", "<b>"`; the shipped form requires shell redirect syntax (whitespace or an fd before `>`). `npm run bundle:check` is excluded from the generator shape (read-only).
- Contract tests updated: `finalise-dod-prompt-contract.test.mjs` (obs #10 test → "the agent plans the probe and /finalise always runs it"; "Plan the run" heading; read-only clause; "The total is"), `probes-executed-population.test.mjs` (invocation-walk floor 4 → 3).
- Development completion comment posted to github issue 588 (develop-complete).
- Mutation proofs (each file backed up, mutated, test run, restored): M1 mapper prompt "Write the matrix file" restored → guard fail 2; M2 inline dispatch write restored → fail 2; M3 code-review caller-runs marker removed → fail 1; M4 docs agent told to run `npm run generate-catalog` → fail 1; M5 runner counts an exit-2 entry as a run → read-only-agent-writes fail 1; M6 runner composes the count instead of reading the record → fail 3; M7 matrix block discards a returned matrix → fail 1.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3, fast gate iter 1 — 1 failure of 5811** (`entrypoint-guard-realpath.test.mjs`): the new `security-probe-plan.mjs` compared `process.argv[1]` with `import.meta.url` without `realpathSync`, so invoked through the `.agents/skills` symlink — exactly how finalise Step 3b.1 calls it — it would run nothing and exit 0 (obs #126). The lifted-block test bound the runner to its `shared/resources` path, so it could not see this; the repository's realpath guard did. Fixed to the `security-probe.mjs` pattern; verified by running the bundled copy through the symlink (`reason: empty-plan`). Re-ran the gate.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.189.read-only-agents-never-write
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
