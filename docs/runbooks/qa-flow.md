# Runbook — QA Flow

> **Audience:** developers running QA without the full develop-story / develop-task orchestrator.

When you only need the QA half of the pipeline — produce a gate file, run NFR / traceability assessments, or rework on existing findings — bypass the orchestrators and drive the QA skills directly.

## When to use this runbook

- A story or task is already implemented (by hand or by an earlier `develop-*` run) and you need a fresh QA pass.
- You need to do **pre-implementation** QA planning (risk profile, test design) before development starts.
- You're reworking on QA findings without re-running the full pipeline.

If you're shipping new work end-to-end, use [Story Development](./story-development.md) or [Task Development](./task-development.md) instead — they invoke the QA skills automatically.

## Pipeline

```mermaid
flowchart TD
    A[qa-planning] -->|risk profile + test design| B[qa-story / qa-task]
    B -->|gate file + NFR + traceability| C[qa-gate]
    B -->|CONCERNS/FAIL| D[qa-fix]
    D --> B
```

## Phase 1 — Pre-implementation (optional)

`qa-planning` produces a risk profile and test design before code is written.

```bash
/qa-planning <story-or-task-path>
```

Outputs (co-located with the story or task):

- `story.{E}.{S}.risk.{N}.{name}.md` / `task.{id}.risk.{N}.{name}.md`
- `story.{E}.{S}.test-design.{N}.{name}.md` / `task.{id}.test-design.{N}.{name}.md`

These feed into the gate decision later (risk score ≥9 → FAIL, ≥6 → CONCERNS).

## Phase 2 — Review the implementation

```bash
/qa-story <story-path>     # for stories
/qa-task <task-path>       # for tasks
```

Produces (co-located with the story or task):

- QA narrative report (includes NFR + traceability) — `story.{E}.{S}.qa.{N}.{name}.md` / `task.{id}.qa.{N}.{name}.md`
- Gate file — `story.{E}.{S}.gate.{N}.{name}.yml` / `task.{id}.gate.{N}.{name}.yml` (**owned by QA skills — never edit from dev**)

## Phase 3 — Fix cycle

If the gate is `CONCERNS` or `FAIL`:

```bash
/qa-fix <story-or-task-path>
```

`qa-fix` ingests the gate file, prioritises findings risk-first, applies fixes, and updates the story/task. Re-run `qa-story` / `qa-task` after fixes land. Repeat until `PASS` or `WAIVED`.

## Phase 4 — Gate decision (manual override only)

`qa-gate` is normally invoked by `qa-story` / `qa-task`. Call it directly only when you need to record a `WAIVED` decision or revise an existing gate after out-of-band review.

```bash
/qa-gate <story-or-task-path>
```

## File organisation

**All QA artifacts are co-located with the story or task they belong to.** There is no central `docs/qa/` directory.

```
docs/prd/[domain]/[feature]/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/
├── story.{E}.{S}.{name}.md                       # the story
├── story.{E}.{S}.qa.{N}.{name}.md                # QA narrative + NFR + traceability
├── story.{E}.{S}.dod.{N}.{name}.md               # Definition of Done
└── story.{E}.{S}.gate.{N}.{name}.yml             # gate decision (QA-owned)
```

Tasks follow the same pattern under `docs/tasks/task.{N}.{name}/`. See [Story documents](../standards/story-documents.md#co-located-artifacts) and [Task documents](../standards/task-documents.md#co-located-artifacts) for the full artifact list.

> **Legacy note:** older skill text references `{qa.qaLocation}/gates/...` or `{qa.qaLocation}/assessments/...`. Those paths are deprecated; co-location is the canonical layout.

## Cross-skill data flow

- `qa-planning` → `qa-story`: risk profile and test design feed into review assessments.
- `qa-story` → `qa-gate`: NFR validation, trace data, and issues feed into gate decisions.
- `qa-planning` → `qa-gate`: risk summary directly influences gate status (≥9 → FAIL, ≥6 → CONCERNS).

## See also

- [`qa-planning` SKILL.md](../../skills/qa-planning/SKILL.md)
- [`qa-story` SKILL.md](../../skills/qa-story/SKILL.md)
- [`qa-task` SKILL.md](../../skills/qa-task/SKILL.md)
- [`qa-gate` SKILL.md](../../skills/qa-gate/SKILL.md)
- [`qa-fix` SKILL.md](../../skills/qa-fix/SKILL.md)
- [Story Development Runbook](./story-development.md)
- [Task Development Runbook](./task-development.md)
- [Operations / Workflows](../operations/workflows.md)
