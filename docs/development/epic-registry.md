---
name: epic-registry
description: Retired — epic numbers now count within their parent PRD.
type: registry
status: retired
---

# Epic Registry (retired)

Epic numbers count within their PRD (`epic.{P}.{E}`). Allocate a PRD number from
[`docs/prd/prd-registry.md`](../prd/prd-registry.md); the epics of a PRD are listed in that PRD's
epics-index block. `create-epic` allocates an epic's number with `doc-id.js next epic`
(**task.205**); nothing reads a counter here.

See [`docs/standards/epic-registry.md`](../standards/epic-registry.md) for the history of this registry.

## Historical mapping

| Old epic # | New id | Folder | Tracker key | Title | Status |
|---:|---|---|---|---|---|
| 1 | 1.1 | epic.1.1.quickstart-and-decision-tree-entry-point | gh#73 | Quickstart & Decision-Tree Entry Point | ✅ Accepted |
| 2 | 1.2 | epic.1.2.worked-prd-epic-story-examples | gh#74 | Worked PRD / Epic / Story Examples | ✅ Accepted |
| 3 | 1.3 | epic.1.3.runbook-tutorial-wrappers | gh#75 | Runbook Tutorial Wrappers | ✅ Accepted |
| 4 | 1.4 | epic.1.4.first-week-guided-learning-path | gh#76 | First-Week Guided Learning Path | ✅ Accepted |
