---
name: epic-registry
description: Central registry of all epics in this project. Epic numbers are globally unique and never reused.
type: registry
---

# Epic Registry

> **Source of truth for epic numbering across this project.**
> See [`docs/standards/epic-registry.md`](./standards/epic-registry.md) for rules.

## Next Available Epic Number

**5**

## Rules

- Append a row to the table below **in the same commit** as the new epic file.
- Increment the **Next Available Epic Number** when appending.
- Cancelled epics keep their number forever — never recycle.
- The `create-epic` skill delegates number assignment to `epic-registry-manager`.

## Registry

| Epic # | Tracker key | Domain / feature      | Folder                                              | Title                                       | Status      | Created    |
|-------:|-------------|------------------------|-----------------------------------------------------|---------------------------------------------|-------------|------------|
| 1      | gh#73       | onboarding/onboarding  | epic.1.quickstart-and-decision-tree-entry-point     | Quickstart & Decision-Tree Entry Point      | 📋 Planned | 2026-05-11 |
| 2      | gh#74       | onboarding/onboarding  | epic.2.worked-prd-epic-story-examples               | Worked PRD / Epic / Story Examples          | 📋 Planned | 2026-05-11 |
| 3      | gh#75       | onboarding/onboarding  | epic.3.runbook-tutorial-wrappers                    | Runbook Tutorial Wrappers                   | 📋 Planned | 2026-05-11 |
| 4      | gh#76       | onboarding/onboarding  | epic.4.first-week-guided-learning-path              | First-Week Guided Learning Path             | 📋 Planned | 2026-05-11 |
