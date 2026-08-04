---
id: task.37.sprint-review
title: "Sprint Review: Task 37 — tracker-workflow.yaml config engine"
type: sprint-review-summary
description: "Sprint Review summary for task.37: the consumer-owned status ladder format, its tracker-agnostic resolution engine, the shared YAML parser promotion, and .mjs support in the bundler."
tags: [sprint-review, task, configuration, tracker]
status: accepted
created: 2026-08-04
updated: 2026-08-04
task-ref: task.37.tracker-workflow-config-engine.md
github_issue: 185
---

# Sprint Review: Task 37 — `tracker-workflow.yaml`

**PR:** [#193](https://github.com/Gamaroff/agent-skills/pull/193) · **Issue:** [#185](https://github.com/Gamaroff/agent-skills/issues/185)
**Accepted:** 2026-08-04 · **Final Gate:** PASS 100/100

---

## Summary

A project can now describe its board as an **ordered list of columns** and get rank, multi-hop paths
and per-moment enablement out of that one list. `tracker-workflow.yaml` declares the statuses a board
actually has, in the order they appear on it, plus which status each pipeline moment targets.

**Nothing reads it yet, by design.** Jira execution is task.38, GitHub task.39, step-file wiring
task.40. Landing the format and engine unwired means a modelling mistake here cannot reach a real
board — which turned out to matter: five QA cycles found nine defects, none of which could touch a
live tracker.

## The problem it solves

Three things previously needed three separate mechanisms:

1. **Bespoke columns were unranked.** `resolveStatusRank("READY FOR SHOWCASE")` returns `null` today,
   so a resumed run could drag a card straight back out of that column.
2. **Multi-hop workflows could not be expressed.** `resolveTransition` does exactly one hop; a board
   gating Done behind a showcase column skipped the move — and because every later move resolves from
   wherever the card actually sits, one missed hop silently disabled every moment after it.
3. **Enablement lived in two places** (`enabled: false`, `defaultEnabled`).

Ordering replaces all three: a rung's index **is** its rank, the rungs between two positions **are**
the route, and a moment absent from `pipeline:` simply does not fire.

## Key features

- **Order is rank** — bespoke columns become guarded instead of unguarded, with nothing to hand-author.
- **Order is the path** — multi-hop movement with no transition graph.
- **Omission is disablement** — absence replaces two config switches.
- **Off-ladder is free** — a target absent from `statuses:` is a side-state; no second list to drift.
- **Rungs carry alternatives** — because today's defaults are candidate *lists*; flattening them would
  have moved a "Waiting for Review" board to "In Review".
- **Per-issue-type overlays** (Jira) that replace rather than merge.

## Technical details

| Artefact | Note |
| -------- | ---- |
| `shared/resources/tracker-workflow.js` | The engine. Pure — no HTTP, no `gh`, no `require` of `jira-sync.js`, so a GitHub-only consumer never pulls the Jira client in behind it. One shell-out: the `git rev-parse` fallback. |
| `shared/resources/yaml-subset.js` | `parseYamlSubset` promoted out of `develop-batch` — four hand-rolled YAML readers in the repo now instead of five. Gained quoted-key support, which `byIssueType` needs to be expressible at all. |
| `skills/create-skill/scripts/bundle_skill.py` | Taught `.mjs` and ESM. Without it, an ESM skill script importing a shared resource works in a checkout and is **broken in every tarball install** — invisible to `npm test`, which resolves the same un-bundled path. |
| `docs/reference/tracker-workflow.md` | Format, the three properties, the moment table, and the bespoke-column question worked end to end in all three shapes. |
| `tracker-workflow.yaml` | This repo's own three-column board, dogfooded and asserted parseable, deliberately unwired. |

## Testing & QA

- **840/840** tests passing, up from 760 at branch point, **no pre-existing test modified**
- **5 QA cycles**, 9 findings, all closed — gate history CONCERNS 80 → 90 → 90 → **FAIL** 80 → **PASS** 100
- **CI green** on the exact PR head
- The **default-ladder snapshot** derives its expectations from `jira-sync.js`'s exported constants
  rather than transcribing them, so a change to those constants fails loudly
- **Purity asserted behaviourally** — a clean child process loads the engine and its require cache is
  inspected — because a textual scan matched the module's own comment saying it does *not* do that

## Compatibility

**No breaking changes.** No consumer has the new file, so every one resolves exactly as today.
`jira.workflowRecord` and `jira.statusMap` keep loading at lower precedence. The built-in default was
re-verified byte-identical to the historical candidate lists at every gate.

## Demo notes

```bash
node -e '
const tw = require("./shared/resources/tracker-workflow.js");
const wf = tw.loadWorkflow({ repoRoot: process.cwd() });
console.log("source:", wf.source);
console.log("work-started ->", tw.resolveMoment("work-started", wf));
console.log("Todo → Done walks:", tw.planMove("Todo", "Done", wf).map(r => r.names[0]));
'
```

## Known limitations / future work

- The engine is **unwired** — tasks 38 (Jira), 39 (GitHub), 40 (step files) connect it.
- `changes-requested` and `pr-merged` are declared but not fired until task.41.
- Four other hand-rolled YAML readers remain; consolidation was explicitly out of scope.
- When task.38/39 land, `jira-sync.js` should re-export `stripStatusEmoji`/`eqName` from this module
  so there is one implementation rather than two (recorded in gate 5 as future work).

## Impact

A consumer whose board has "Ready for Showcase" between testing and done can now say so in four lines
and have the pipeline walk it — where previously the move was skipped and every later moment silently
disabled. The five-cycle QA history is itself the argument for the unwired-first sequencing.
