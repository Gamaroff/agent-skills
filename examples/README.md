# Examples

Worked examples of the skills in this repository being applied to real work.

This repo dogfoods itself — the story, epic, PRD, and task pipelines have all been run against it. Task artifacts live in [`docs/tasks/`](../docs/tasks/); PRD, epic, and story artifacts live in [`examples/prd-example/`](./prd-example/), [`examples/epic-examples/`](./epic-examples/), and the canonical story directories under [`docs/prd/onboarding/epics/`](../docs/prd/onboarding/epics/).

> **Path note:** All links below use this repo's default `PRD_ROOT=docs/prd`. In a project with a custom `prd.prdShardedLocation`, mentally substitute your root for `docs/prd/` in any path. See [Configuration](../docs/reference/configuration.md#configurable-roots-and-fixed-conventions).

## Start here: one task end-to-end

[`task.6.create-epic-jira-tracker-path`](../docs/tasks/task.6.create-epic-jira-tracker-path/) is a representative full lifecycle. Walk it in this order:

1. [`task.6.create-epic-jira-tracker-path.md`](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.create-epic-jira-tracker-path.md) — task spec produced by `create-task`.
2. [`task.6.*.review.2026-05-05.md`](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.create-epic-jira-tracker-path.review.2026-05-05.md) — `review-task` output: clarifications, gaps, recommendations.
3. [`task.6.plan.*.md`](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.plan.create-epic-jira-tracker-path.md) — co-located plan file (see [plan-file-locations](../docs/standards/plan-file-locations.md)).
4. [`task.6.implementation.1.*.md`](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.implementation.1.create-epic-jira-tracker-path-initial-run.md) — what `develop-task` actually did.
5. [`task.6.qa.1.*.md`](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.qa.1.create-epic-jira-tracker-path.md) — `qa-task` findings, severity, NFR coverage, traceability.
6. [`task.6.gate.1.*.yml`](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.gate.1.create-epic-jira-tracker-path.yml) — `qa-gate` PASS/CONCERNS/FAIL decision.
7. [`task.6.dod.1.*.md`](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.dod.1.create-epic-jira-tracker-path.md) — `finalise` DoD checklist.
8. [`sprint-review-summary.md`](../docs/tasks/task.6.create-epic-jira-tracker-path/sprint-review-summary.md) — Sprint Review artifact.

## Or: one story end-to-end

For the story pipeline, walk [`story.2.3.capture-story-messy-path/`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/) in this order:

1. [`story.2.3.capture-story-messy-path.md`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.capture-story-messy-path.md) — story spec produced by `create-story`.
2. [`story.2.3.review.1.*.md`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.review.1.capture-story-messy-path.md) — `review-story` interactive review.
3. [`story.2.3.plan.*.md`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.plan.capture-story-messy-path.md) — co-located implementation plan.
4. [`story.2.3.implementation.1.*.md`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.implementation.1.capture-story-messy-path.md) — what `develop-story` actually did.
5. [`story.2.3.qa.1.*.md`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.qa.1.capture-story-messy-path-descoped.md) — `qa-story` report.
6. [`story.2.3.gate.1.*.yml`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.gate.1.capture-story-messy-path-descoped.yml) — `qa-gate` decision (this story was **descoped** rather than passing QA — the gate shows the descope rationale).
7. [`story.2.3.dod.1.*.md`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.dod.1.capture-story-messy-path.md) — `finalise` DoD checklist.
8. [`sprint-review-summary.md`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/sprint-review-summary.md) — Sprint Review artifact.

> **Note:** This story was **descoped** during the pipeline run — no `examples/story-messy-path/` directory was produced. The full artifact set (including the descoped gate) lives at the path above and shows what happens when a story is cancelled rather than completed.

## Artifact reference

| Artifact | Pattern | Produced by |
|---|---|---|
| Task spec | `task.{n}.{name}.md` | `create-task` |
| Review | `task.{n}.{name}.review.{date}.md` | `review-task` |
| Plan | `task.{n}.plan.{name}.md` | `develop-task` (Phase 0) |
| Implementation log | `task.{n}.implementation.{m}.{name}.md` | `develop-task` |
| QA report | `task.{n}.qa.{m}.{name}.md` | `qa-task` |
| Gate file | `task.{n}.gate.{m}.{name}.yml` | `qa-gate` |
| DoD checklist | `task.{n}.dod.{m}.{name}.md` | `finalise` |
| Sprint review | `sprint-review-summary.md` | `finalise` |

Not every task directory has every artifact — paths vary (some skip QA cycles, some stall before finalise). Treat absences as signal, not bugs.

## Look up by skill

Arrived here from a specific skill? Jump straight to a representative output:

- **`create-task`** → [task.6 spec](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.create-epic-jira-tracker-path.md)
- **`review-task`** → [task.6 review](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.create-epic-jira-tracker-path.review.2026-05-05.md)
- **`develop-task`** → [task.6 implementation report](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.implementation.1.create-epic-jira-tracker-path-initial-run.md)
- **`qa-task`** → [task.6 QA report](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.qa.1.create-epic-jira-tracker-path.md)
- **`qa-gate`** → [task.6 gate file](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.gate.1.create-epic-jira-tracker-path.yml)
- **`finalise`** → [task.6 DoD](../docs/tasks/task.6.create-epic-jira-tracker-path/task.6.dod.1.create-epic-jira-tracker-path.md), [sprint review](../docs/tasks/task.6.create-epic-jira-tracker-path/sprint-review-summary.md)
- **Multi-task plan decomposition** → [`index.subagent-pipeline-improvements.md`](../docs/tasks/index.subagent-pipeline-improvements.md) — single plan split into tasks 16–31 with dependency waves.
- **`create-prd`** → [PRD example](./prd-example/prd.onboarding.md)
- **`create-epic`** → [Epic examples (×4)](./epic-examples/)
- **`create-story`** → [Story 2.3 — full lifecycle (descoped)](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/)
- **`develop-story`** → [Story 2.3 — implementation report + gate + DoD](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/)

## Worked PRD example

[`examples/prd-example/`](./prd-example/) — a real PRD produced by `/create-prd` brownfield mode against this repo. See its [narrative README](./prd-example/README.md) for what was easy, what required iteration, and what `pm-checklist` flagged.

## Worked epic examples

[`examples/epic-examples/`](./epic-examples/) — four real epic docs from the same PRD, one per epic in the onboarding pipeline. Read them side-by-side for cross-pattern comparison, or via the [epic README](./epic-examples/README.md).

## Worked story walkthrough

[`docs/prd/onboarding/epics/.../story.2.3.capture-story-messy-path/`](../docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/) — a real story that ran through the full `develop-story` pipeline and was **descoped** at QA. Shows the complete lifecycle: spec → review → plan → implement → QA → gate (descoped) → DoD → sprint review.

The story had no copy placed in `examples/story-messy-path/` because the descope decision happened during the pipeline run — the canonical artifact set lives at the path above. This is the messy path: not every story ships.

## Recency

Tasks are numbered globally and monotonically (see [task-registry](../docs/standards/task-registry.md)). Higher numbers = more recent = closer to current skill behavior. If benchmarking what the pipeline produces *today*, prefer task.30+ over task.1–10.

## Caveats

Real artifacts, not curated demos — expect inconsistencies, abandoned branches, dead-ends. They show how the skills perform in practice, not on a polished happy path.
