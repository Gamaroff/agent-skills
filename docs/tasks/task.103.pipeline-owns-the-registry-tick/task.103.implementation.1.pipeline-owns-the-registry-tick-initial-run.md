# Implementation Report: Nothing updates the task-registry row after a task is accepted

**Task**: `task.103.pipeline-owns-the-registry-tick.md`
**Run Number**: 1
**Started**: 2026-09-10 09:25
**Status**: In Progress

---

## Summary

Give the task-registry status tick an owner: land a mutation-proven drift check first, measure the sibling registries, then decide and implement (or deliberately decline) the automated write.

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
| Board status        | In Progress ✅ (issue #374 created in Step 2; work-started signal deferred from Step 1 and run then) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.103.*` exists in git                              | `feature/task.103.pipeline-owns-the-registry-tick` created at `1e2f4787`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.103.review.{N}.{name}.md` exists (or skip logged)                | `task.103.review.1.pipeline-owns-the-registry-tick.md` — READY TO IMPLEMENT, 9/10, 0 critical / 4 important / 1 optional, all fixed in place. Status Draft → Ready for Development | — (pre-pass run inline) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 5 phases. Added the drift check (3 tests) + `registry-tick.js` (11 tests); wired into `finalise`; standard rewritten. 8 mutations run, each red the correct test. Fast gate caught prettier on the two new files — fixed, re-bundled. | — (inline) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.103.qa.{N}.*.md`; `task.103.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.103.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-10

- Invoked from `/develop-next` (item T103, `source: task-registry` — no roadmap phase held an actionable row).
- **AUTONOMOUS RUN directive in force**: Phase 0d questions auto-answered with the recommended option; no prompt issued.
  - Q1 Feature branch base: **develop** — auto-derived recommended option (current branch is `develop`).
  - Q2 PR target branch: **develop** — auto-derived recommended option.
- qa-planning gate: skipped (auto — no prompt).
- Phase 0a-parallel: subagents **not** dispatched. Resolver unnecessary (an explicit, existing file path was supplied); tracker poller and lite-mode detector performed inline instead — both are single-file reads, and this session's operating instructions restrict subagent use. Inputs read directly from the task document.
- Pipeline mode: **standard** — computed from `risk_ok = ("medium" ∈ {low, absent}) = false`, `phase_count = 5` (§ 6 Phases 1–5, not < 3), `single_module = false` (scope spans `shared/resources/`, `skills/`, `docs/standards/` and a test suite). All three booleans fail; `standard` on any one.
- Always-load files resolved: 3 files — `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present).
- Tracker: `TRACKER=github`, `TRACKER_ISSUE=` (empty) — task document carries no `github_issue:`. Tracker signalling skipped at Phase 0; Step 2 (`/review-task`) may create the issue via `ensure-task-github-issue`.
- Task status at entry: `draft` — permitted for `develop-task`; Step 2 promotes it. Noted, not halted.
- **Step 2 review-task auto-answers** (pipeline mode, per `develop-pipeline-autonomous-defaults.md` and review-task's own pipeline notes):
  - Step 0 output format: **Comprehensive report**.
  - Step 0a branch setup: auto-skipped — already on `feature/task.103.*`.
  - Step 2 check 5 tracker sync: **Sync to GitHub** — *not covered by the defaults table*. Decided from the corpus rather than invented: 5 of the last 6 tasks (97, 98, 100, 101, 102) carry `github_issue`, and the pipeline's own tracker signalling is inert without one. Dedup search (`gh issue list --search 'in:title "[Task 103]"' --state all`) returned zero matches before creating. Issue **#374** created, added to board "Agent Skills", Priority P2. Estimate field not present on that board — warned and continued.
  - Step 8.5 apply fixes: **Yes, apply all critical + important**.
  - Step 9 status update: **Yes, fixes complete** → `draft` → `ready-for-development`.
- **Phase 1.5 pre-pass subagents not dispatched.** review-task specifies two parallel Explore agents (B: architecture alignment, C: codebase already-implemented). Both axes were established inline instead, for two reasons: this session's operating instructions restrict subagent use, and both questions reduce to bounded greps over a known tree. Substitute evidence is recorded in the review report §2 — `alignment: no-drift` from the test-glob and step-file checks; `implementation_status: not-implemented` from `grep -rl task-registry` over `evals/`, `shared/resources/tests/` and `scripts/`, which found only a selector-parsing test, a status-vocabulary corpus test, and the consumer installer. Recorded as a deviation so a reader does not read "pre-pass complete" into a step that ran differently.
- Step 1: implementation report stashed before branch creation, restored cleanly after.
- Step 1 "Signal Work Started": skipped — `TRACKER_ISSUE` empty (no `github_issue:` on the task document), so per the 0c-reg contract the entire section is skipped with no fallback register.

---

### Step 3 — Develop — 2026-09-10

- Fast-gate precondition (run once, before iteration 1): `develop.fastGateCommand` is unset in
  `skills-config.yaml`, so the suggested fallback `npm run ci:fast` applies. Extracted
  `GATE_SCRIPT=ci:fast` and confirmed `npm run` lists it. ✅ resolves — no HALT.
- Plan file discovery: none. No `task.103.plan.*.md` exists beside the task; proceeding without one
  (plan files are optional).
- **Pre-develop surface map: 11 files** — established inline rather than by an Explore subagent, same
  reason and same deviation record as the Phase 1.5 pre-pass above.

  | File | Why it matters |
  | :--- | :--- |
  | `docs/tasks/task-registry.md` | The registry under test. 96 data rows; columns `# \| Title \| Status \| Category \| Priority \| Created \| Issue \| Depends on`; the "Quick commands" block is **fenced** and must not be parsed as data. |
  | `skills/develop-next/scripts/select-next.mjs` | **The reuse target.** Already exports `parseRegistry(text, kind, registryPath)` (fence-aware, header-mapped, returns `{rows, malformed, warnings}` with `registryStatus` + resolved `path`), `parseFrontmatterStatus(text)`, and `TASK_LIFECYCLE_STATUSES`. The drift check imports these — it must not restate the vocabulary or re-implement the table parser. |
  | `evals/shared/tests/document-status-lifecycle-corpus.test.mjs` | The nearest sibling and the convention to mirror: `node:test`, `REPO_ROOT` via `fileURLToPath`, dynamic `import(pathToFileURL(SELECT_NEXT))`, and an explicit "imported, never restated" comment. Already parses this exact registry — but compares row status against the *lifecycle vocabulary*, not against the document. That is the gap. |
  | `package.json` | `test` script enumerates globs by hand; `evals/shared/tests/*.test.mjs` is present, which is why the new suite goes there. |
  | `docs/standards/task-registry.md` | Phase 5 target (48 lines). |
  | `docs/bugs/bug-registry.md`, `docs/development/epic-registry.md` | Phase 2 measurement targets. `parseRegistry(…, "bug", …)` handles the first; the epic registry has no `parseRegistry` kind. |
  | `skills/finalise/SKILL.md` | Candidate § 3 owner — 1783 lines, zero registry references today. |
  | `shared/resources/develop-pipeline-step-7-finalise.md` | Where a `finalise`-owner change would actually be authored (bundled → `references/`). |
  | `skills/develop-next/SKILL.md` | Candidate § 3 owner — Step 4 is the post-merge tick moment. |
  | `shared/resources/yaml-subset.js` | CommonJS `parseYamlSubset`; available if richer frontmatter is needed than `parseFrontmatterStatus` gives. |

### Registry-tick ownership decision (task § 3, Phase 3) — 2026-09-10

**Chosen: `finalise` owns the write.** The Phase 1 check is retained as the backstop, not replaced.

**Why, in the order the reasons actually carry weight:**

1. **One event, one writer.** `finalise` already writes the document's `status: accepted` and
   `completed_date`. Folding the row write into the same step means the row and the document cannot
   disagree *by construction*. A check is strictly weaker: it can only report a disagreement that
   already exists.
2. **The "runs before merge" objection in the task's own table does not survive contact with the
   two columns.** It reads: *"it runs before merge, so `accepted` precedes the merge PR the row wants
   to cite."* That conflates the **Status** column with the **notes/Issue** column. The Status column
   mirrors the document's status — which is *also* set pre-merge — so a pre-merge tick keeps them
   consistent rather than breaking them. The PR citation lives in a prose column that no check and no
   consumer reads. Separating the two dissolves the objection instead of trading it away.
3. **The post-merge owner would make the new check fire on a legitimate workflow.** Its stated
   weakness — "a manually-run `finalise` would not tick" — is worse than it sounds once the check
   exists: anyone finalising outside `/develop-next` accepts a task, the row stays behind, and CI goes
   red on correct work. That buys enforcement by manufacturing false failures.
4. **"A check, not a write" was the option most likely to be right, and implementation is what ruled
   it out.** The task explicitly warned not to skip past it, so it was taken seriously. What settles
   it: once the check exists, *every* task acceptance reds CI until someone hand-edits the row in the
   same PR. That is not the status quo made visible — it is a new mandatory manual step on every task,
   forever, at the exact moment the pipeline is otherwise hands-free. The check turns out to be the
   thing that makes automation necessary rather than optional.

**Rejected, explicitly:** post-merge ownership in `develop-task`/`develop-next` (reason 3); check-only
(reason 4).

**What was built to make § 8's tests possible.** The write is a CLI —
`shared/resources/registry-tick.js` — not a paragraph in `finalise/SKILL.md`. § 8 demands proof of two
behaviours: that lite mode still ticks, and that a story run does not attempt a task-registry write.
Both are claims about what the code does. Implemented as prose, the only available test is a grep of
that prose, which proves the sentence exists and not that the behaviour holds — the failure this
repo has already recorded (0 of 27 defects caught on task.84). As a CLI, both are ordinary tests that
run the thing and inspect the bytes.

The lite-mode test is worth naming because it asserts an *absence*: the CLI has no mode input, so the
test pins its entire argument surface (`--dry-run --file --help --json --registry`). A future
`--skip-in-lite` cannot be added without that test failing and the question being answered
deliberately. Lite mode has skipped Step 7 side-effects in this pipeline before; that is why the task
asked.

### Sibling registry measurement (task § 3 Scope, Phase 2) — 2026-09-10

Same comparison, run as a one-off probe rather than a committed test — the task's § 4 keeps both
registries out of scope *pending evidence*, and a check is a scope decision, not a measurement.

| Registry | Rows | Documents unreadable | Terminal-status drift | Terminal value compared |
| :--- | ---: | ---: | ---: | :--- |
| `docs/tasks/task-registry.md` | 105 | 0 | **0** | `accepted` |
| `docs/bugs/bug-registry.md` | 12 | 0 | **0** | `closed` |
| `docs/development/epic-registry.md` | 4 | 0 | **1** (epic 3) | `accepted` |

**Bug registry: clean.** No evidence, so scope stays as § 4 says — nothing built, nothing changed.

**Epic registry: one stale row of four.** Epic 3's row read `📋 Planned` while its document read
`✅ Accepted` and all three of its stories read `accepted`. **Corrected in this PR.** Leaving a row
known to be wrong is worse than the drift this task was written about, and the registry's own notes
set that precedent (rows 56–58 / 62–64, swept 2026-08-29 for the same reason).

**No epic drift *check* was built, and that is a deliberate stop rather than an omission.** Building
one needs a decision this task has no mandate to make: epic documents carry
`status: "✅ Accepted"` — an emoji-decorated Title Case string — while
`shared/resources/document-status-lifecycle.md` specifies `lowercase-kebab-case` for frontmatter. Any
epic check must either normalise that or fix it, and fixing it touches every epic document and the
`review-epic` / `sync-*-epic` path. **Filed as a deferred follow-up** below.

**My first epic measurement was wrong in both directions**, and the correction is recorded because it
is the same class of defect this task exists to prevent. The probe compared
`parseFrontmatterStatus(...) === "accepted"` without stripping the emoji, so it reported epics 1, 2
and 4 as DRIFT (they agree) and epic 3 as *agree* (it was the only real drift) — a confidently
formatted table, entirely inverted. It was caught only by reading the raw `status:` lines rather than
trusting the summary. An instrument that returns a clean answer has not thereby been shown to work.

### Deferred follow-ups (not in this task's scope)

1. **Epic frontmatter status violates the documented lifecycle.** All four epic documents carry
   `status: "✅ Accepted"`; the lifecycle spec says `lowercase-kebab-case`. Until that is settled,
   an epic drift check cannot be written without embedding a second normalisation rule. Worth a task.
2. **The epic registry has no `parseRegistry` kind.** `select-next.mjs` knows `task` and `bug`; the
   epic table has a different column set (`Epic # | Tracker key | Domain / feature | Folder | Title |
   Status | Created`) and links a *folder*, not a document. A check would need parser support, which
   is the same "import, never restate" argument as everywhere else.
3. **The registry's notes/`Issue` column is still hand-written.** `registry-tick.js` writes only the
   Status cell. Citing the merge PR in the row remains manual and is the one part of the original
   "post-merge owner" argument that survives — a post-merge step could fill it. Nothing reads it, so
   it is not urgent.

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 1 tracker signal deferred, not skipped.** Phase 0c found no `github_issue:` on the task, so
  Step 1's "Signal Work Started" had nothing to address and was skipped per contract. Step 2's
  review-task check 5 then created issue **#374**, at which point the signal became possible; it was
  run immediately after (work-started comment posted, board `Todo → In Progress`, verified). The lock's
  `tracker_issue` was backfilled to `374` in the same turn. Recorded because the pipeline contract says
  the signal runs "exactly once per pipeline", and this run's single execution happened at Step 2
  rather than Step 1.
- **The fast gate caught a formatting failure the test suite would have let through.** `npm run ci:fast`
  exited 1 on `prettier --check` for `shared/resources/registry-tick.js` and
  `shared/resources/tests/registry-tick.test.mjs` while every functional test was green. This is
  precisely the task-67 failure the gate's formatting half was added for — a branch that passes
  `npm test` locally and goes red in CI. Fixed with `prettier --write`, then `npm run bundle` re-run
  so the generated `skills/finalise/references/registry-tick.js` matched its reformatted source.
- **My first Phase 2 epic measurement was inverted, and a formatted table made it look authoritative.**
  Detailed under "Sibling registry measurement" above. Recorded here too because the lesson is the
  operative one for this task: a clean-looking result is a claim about the instrument, not a finding.
- **`estimated_effort_hours: 4` sits exactly on the rubric's divergence threshold.** Recomputed rubric
  is 8h; `|4−8|/8 = 0.50`, which does not exceed the `> 0.5` trigger, so no finding was raised. Left
  as authored. Worth revisiting after the § 3 decision — the true cost depends on whether a write is
  implemented.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.103.pipeline-owns-the-registry-tick`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
