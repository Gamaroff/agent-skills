# Roadmap History

Completed phases from [`project-completion-roadmap.md`](./project-completion-roadmap.md), archived
at phase close so the live roadmap shows only what is still in play.

**Phases 1, 2, 3 and 4 are archived here.**

**These rows still satisfy `deps:`.** A `deps:` entry naming a row that appears in no current phase
means _already shipped_, not a dangling reference — this file is where to resolve it.

Rows are preserved verbatim, including their `touches:` tags and acceptance annotations. The
delivery narrative for each item — what was found on the way, what was waived, what was deferred —
lives in the roadmap's own append-only Change Log, which is not duplicated here.

---

## PHASE 1 — tracker workflow: consumer-owned status ladder

A hand-authored `tracker-workflow.yaml` in the consumer repo declares the project's statuses **in
order** and maps each pipeline moment to one of them. Order is rank (a resumed run cannot drag a
card backwards) and order is the walk path (a gate column needs no graph authored).

Ordered so risk front-loads into the reversible parts: T36 is a pure deletion of generated text;
T37–T39 were inert until T40 wired the first live behaviour change. **As of T40 the GitHub path
is live** — a consumer's `tracker-workflow.yaml` now drives their board.

**The series is complete as of T41.** All eight moments have a call site, the file is scaffolded on
install without ever overwriting one, `--check` fails CI on drift, and all three develop pipelines
signal the same moments. Both moments T41 added remain **off by default** — absent from the built-in
`pipeline:` map — so a consumer who upgrades and changes nothing sees no new card movement.

### Independent fix

- [x] **T36** Stop `setup-consumer.sh` generating a narrowing `jira.statusMap` · deps: none · touches: setup-consumer!, docs-config~ · /develop-task docs/tasks/task.36.setup-consumer-statusmap-fix/task.36.setup-consumer-statusmap-fix.md

### Engine

- [x] **T37** `tracker-workflow.yaml` config engine + promoted YAML parser · deps: none · touches: workflow-engine!, docs-config~ · /develop-task docs/tasks/task.37.tracker-workflow-config-engine/task.37.tracker-workflow-config-engine.md

### Per-tracker execution ‖ (dependency-independent once T37 lands)

- [x] **T38** Jira: walk the status ladder + last-rung terminal restriction · deps: T37 · touches: jira-sync!, workflow-engine~, docs-config~ · /develop-task docs/tasks/task.38.jira-ladder-walking/task.38.jira-ladder-walking.md
- [x] **T39** `gh-stage.js` — GitHub Projects board engine · deps: T37 · touches: gh-stage!, workflow-engine~, docs-config~ · /develop-task docs/tasks/task.39.github-board-stage-engine/task.39.github-board-stage-engine.md

### Wiring — first live behaviour change

- [x] **T40** Replace the five inline GitHub GraphQL board blocks with `gh-stage.js` calls · deps: T39 · touches: pipeline-steps!, bundles!, gh-stage~ · /develop-task docs/tasks/task.40.github-pipeline-step-wiring/task.40.github-pipeline-step-wiring.md

### Capstone

- [x] **T41** New pipeline moments, workflow-file scaffolding, `--check`, `develop-bug` parity · deps: T38, T40 · touches: orchestrators!, pipeline-steps!, setup-consumer!, bundles!, docs-config~ · /develop-task docs/tasks/task.41.pipeline-moments-and-scaffolding/task.41.pipeline-moments-and-scaffolding.md

---

## PHASE 2 — document history: one canonical section across PRD / epic / story / task

<!-- Heading names in this phase deliberately avoid the words "change log", "deferred",
     "human-gated" and "housekeeping": select-next.mjs excludes any section whose heading
     matches EXCLUDED_HEADING_RE, and a matching heading drops its rows silently, with no
     lint warning. A `## PHASE …` heading is exempt (the phase branch resets the flag), but
     `###` sub-headings are not. -->


Stakeholders want a readable history of changes on the work-item documents. A Change Log already
exists in four incompatible shapes, on two of the four document types, written by nine skills that
disagree — plus a placement bug that inserts a duplicate block above the Epic Goal. This is a
consolidation. Series rationale: `.agents/plans/document-change-log-series.md`.

Strictly sequential — each row depends on the one above it. T42 ships back-compat wrappers so no
caller changes until T45 removes them.

> **Dogfooding note.** T43–T45 modify skills this pipeline runs on itself: T43 the `create-task` /
> `review-task` templates, T44 `review-task`'s grading (invoked at Step 2 of every later run), T45
> the `develop-pipeline-step-*` docs and the `sync-jira-*` scripts. Each task's changes take effect
> for the next task's run — which is why T45 is gated below.

### Foundation

- [x] **T42** Canonical Change Log spec + shared engine extracted from `jira-sync.js` · deps: none · touches: jira-sync!, change-log!, docs-config~, bundles~ · /develop-task docs/tasks/task.42.change-log-spec-and-engine/task.42.change-log-spec-and-engine.md

### Emit

- [x] **T43** Templates and `create-*` skills emit the canonical section · deps: T42 · touches: templates!, bundles~ · /develop-task docs/tasks/task.43.change-log-templates-and-creation/task.43.change-log-templates-and-creation.md

### Record and grade

- [x] **T44** `review-*` / `edit-*` skills log their document mutations · deps: T43 · touches: review-skills!, bundles~ · /develop-task docs/tasks/task.44.change-log-review-and-edit/task.44.change-log-review-and-edit.md

### Capstone — operator gate

- [x] **T45** Pipeline, QA, finalise, and tracker sync write the Change Log · deps: T44 · touches: pipeline-steps!, jira-sync!, bundles! · gate cleared 2026-08-12 — T44's `change-log.enforcement: advisory` default was verified against a pre-T43 document (`task.22`): check 4b graded its non-canonical Change Log **Important, not Critical**, verdict **GO** at 9/10, so this row's own Step 2 review did not HALT on the new check · ✅ **accepted + merged** ([PR #213](https://github.com/Gamaroff/agent-skills/pull/213), QA PASS 95/100 after 1 fix cycle) — the run also closed a pre-existing T42 engine defect that silently dropped Change Log rows it could not parse · /develop-task docs/tasks/task.45.change-log-pipeline-and-sync/task.45.change-log-pipeline-and-sync.md

---

## PHASE 3 — loop-supervisor: fresh-context sequential loop runner

Design: [`.agents/plans/loop-supervisor.md`](../../.agents/plans/loop-supervisor.md). T62 is the only
unit that has to exist — it delivers a usable runner with log files alone. T63 and T64 both depend on
it and are independent of each other, but they hard-conflict on `run-loop.mjs`, so `--batch` will
correctly take only one of them at a time.

- [x] **T62** Run each loop iteration in a fresh Claude process, and classify the outcome from the filesystem · deps: none · touches: loop-supervisor!, docs-config~ · /develop-task docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md
- [x] **T63** Make an unattended run watchable from a second terminal, and audible when it stops · deps: T62 · touches: loop-supervisor!, docs-config~ · /develop-task docs/tasks/task.63.loop-supervisor-status-views/task.63.loop-supervisor-status-views.md ✅ **accepted + merged** ([PR #277](https://github.com/Gamaroff/agent-skills/pull/277), QA PASS 100/100)
- [x] **T64** Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable · deps: T62 · touches: loop-supervisor!, orchestrators~, docs-config~ · /develop-task docs/tasks/task.64.loop-supervisor-dashboard-and-docs/task.64.loop-supervisor-dashboard-and-docs.md ✅ **accepted + merged** ([PR #278](https://github.com/Gamaroff/agent-skills/pull/278), QA PASS 100/100)


---

## Where the narrative lives

Each row above has a corresponding entry in the **Change Log** of
[`project-completion-roadmap.md`](./project-completion-roadmap.md), recording what shipped, what was
found on the way, and what was left open. That log is append-only and is deliberately **not** moved
here — a document's own history stays with the document.

Per-item detail sits in the task directories under [`docs/tasks/`](../tasks/), each with its review,
QA, gate, DoD and implementation-report artifacts.

---

## PHASE 4 — maintenance backlog (retired)

A **standing** phase rather than a planned sequence: it held whatever was currently outstanding so
that `/develop-next` always had a frontier. Its ordering rule was that a known-broken thing outranks
intended work.

**It is retired, not merely emptied.** Its own preamble named T65 as the reason it existed — and T65
removes the need for it, because selection now falls through to `docs/bugs/bug-registry.md` and
`docs/tasks/task-registry.md` directly. A filed bug or task is visible to the loop without anyone
hand-writing a row here, which is the transcription step this phase *was*. Leaving it standing would
also have suppressed the new fallback outright: roadmap precedence is absolute, so while this phase
held any actionable row the registries could never be reached.

T65's row was archived **unticked** because it was in flight when the phase was retired — the archival
is part of T65's own delivery, so ticking it then would have attested to a merge that had not happened.
It merged as PR #281 on 2026-08-29 and is **now ticked**, with the acceptance recorded in the roadmap
Change Log as promised. Nothing depends on it, so no `deps:` resolution was ever affected.

- [x] **B2** `npm test` runs `node --test` unbounded, so spawn-heavy suites breach their timeouts and the suite fails for environmental reasons · deps: none · touches: test-harness! · /develop-bug docs/bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md
- [x] **T65** Derive the selection frontier from the registries, so an outstanding bug or task cannot be invisible to `/develop-next` · deps: none · touches: orchestrators!, docs-config~ · /develop-task docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md
