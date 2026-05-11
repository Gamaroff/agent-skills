---
id: story.178.8.example-feature
status: draft
jira_key: null
jira_url: null
epic: epic.178.feature-ui
acceptance_criteria:
  - Component renders given valid props
  - Failure path emits typed error
---

# Story 178.8 — Example feature

## Status

Draft

## Story

**As a** consumer of the example feature,
**I want** the component to render given valid props,
**so that** downstream callers can rely on a typed surface.

## Acceptance Criteria

1. Component renders given valid props.
2. Failure path emits a typed `ExampleError`.

## Tasks / Subtasks

- [ ] Wire props interface — [Source: docs/architecture/tech-stack.md#typescript]
- [ ] Implement render path
- [ ] Add failure path with typed error
- [ ] Author unit tests covering both paths

## Dev Notes

Naming follows kebab-case per [Source: docs/architecture/coding-standards.md#naming].
Implementation should live under `packages/example/src/`. No new dependencies required.
