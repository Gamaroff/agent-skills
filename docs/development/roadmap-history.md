# Roadmap History

Completed phases from [`project-completion-roadmap.md`](./project-completion-roadmap.md), archived
at phase close so the live roadmap shows only what is still in play.

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

## Where the narrative lives

Each row above has a corresponding entry in the **Change Log** of
[`project-completion-roadmap.md`](./project-completion-roadmap.md), recording what shipped, what was
found on the way, and what was left open. That log is append-only and is deliberately **not** moved
here — a document's own history stays with the document.

Per-item detail sits in the task directories under [`docs/tasks/`](../tasks/), each with its review,
QA, gate, DoD and implementation-report artifacts.
