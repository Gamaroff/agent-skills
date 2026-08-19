---
id: story.178.9.signed-feature
status: draft
jira_key: null
jira_url: null
epic: epic.178.feature-ui
acceptance_criteria:
  - Component renders given valid props
  - Failure path emits typed error
---

# Story 178.9 — Signed feature

## Status

Draft

## Story

**As a** consumer of the signed feature,
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

## Stakeholder Sign-off

Sign when you have reviewed this document: replace your **Signature** cell with your name and today's date, then commit the change yourself — your commit authorship is the audit trail, which is why an agent scaffolds these rows and never fills them.

**This gate is `advisory` by default, and does not block development.** The authority is `sign-off.enforcement` in `skills-config.yaml`. Under `advisory` an unsigned required row is raised as an **Important** review finding and docks the readiness score, but the verdict may still be GO and `/develop-*` proceeds. Only if that key is set to `blocking` does an unsigned row become a **Critical** finding that withholds the status promotion and halts the pipeline at Step 2.

| Role              | Signature | Date |
| ----------------- | --------- | ---- |
| Product Owner     |           |      |
| Tech Lead         |           |      |
| Design (optional) |           |      |

**Sign-off status:** Pending — 0 of 2 required signatures

## Change Log

| Date       | Version | Description           | Author       |
| ---------- | ------- | --------------------- | ------------ |
| 2026-08-06 | 1.0     | Initial draft created | scrum-master |
