# Examples

Worked examples of the skills in this repository being applied to real work.

This repo dogfoods itself: the pipeline that runs `develop-task` / `qa-task` / `finalise` on *this codebase* writes its artifacts to [`docs/tasks/`](../docs/tasks/). Those artifacts are the examples.

> No story, epic, or PRD examples live here — this repo is a skill library, not a product, so the story/epic/PRD pipelines aren't exercised against it. Look at a product repo that consumes these skills for those.

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

## Recency

Tasks are numbered globally and monotonically (see [task-registry](../docs/standards/task-registry.md)). Higher numbers = more recent = closer to current skill behavior. If benchmarking what the pipeline produces *today*, prefer task.30+ over task.1–10.

## Caveats

Real artifacts, not curated demos — expect inconsistencies, abandoned branches, dead-ends. They show how the skills perform in practice, not on a polished happy path.
