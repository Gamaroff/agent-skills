---
id: task.37.plan
title: "Implementation Plan: tracker-workflow.yaml config engine"
type: plan
task-ref: task.37.tracker-workflow-config-engine.md
---

# Implementation Plan: `tracker-workflow.yaml` config engine

> Requirements and success criteria: [task.37.tracker-workflow-config-engine.md](task.37.tracker-workflow-config-engine.md)

## Overview

Promote the most capable existing YAML reader into `shared/resources/`, then build a pure,
tracker-agnostic engine on top of it that turns an ordered list of statuses into rank, targets and
walk plans. Nothing calls it yet.

## Phase-by-Phase Implementation Guide

### Phase 1: Promote the YAML parser

**Files to modify:**

- `skills/develop-batch/scripts/schedule.mjs` — `parseYamlSubset` at L68, `readConfig` at L491
- `shared/resources/yaml-subset.js` — new

**Do first, before anything else:** confirm whether `parseYamlSubset` supports **flow sequences**
(`statuses: [A, B, C]`). Its header comment says "no flow collections", which would invalidate the
`byIssueType.*.statuses` example in the reference doc.

```bash
node -e '
const m = await import("./skills/develop-batch/scripts/schedule.mjs");
' 2>/dev/null || sed -n "68,200p" skills/develop-batch/scripts/schedule.mjs
```

Two acceptable outcomes:

1. Flow sequences work → document them.
2. They do not → **restrict the documented format to block sequences only** and add a validation
   warning when a `[` is seen where a list is expected. Do **not** extend the parser into general
   YAML; its narrowness is the reason it is trustworthy.

Move verbatim, preserving the header:

```js
// Deliberately NOT a general YAML parser — no anchors, no multi-line strings,
// no flow collections. It reads the subset this repo's config files use, with
// zero dependencies, which is the whole reason it exists.
```

`schedule.mjs` then does `import { parseYamlSubset } from "../../../shared/resources/yaml-subset.js"`
— check the relative depth against the installed `.agents/skills/...` layout, since `schedule.mjs`
runs from a consumer install, not from this repo. **If the relative path is not stable across both
layouts, bundle `yaml-subset.js` into `develop-batch/references/` instead and import from there** —
that is what `bundle_skill.py`'s sibling-require following is for.

### Phase 2: The engine — `shared/resources/tracker-workflow.js`

Pure module. No HTTP, no `gh`, no `require("./jira-sync.js")`.

```js
const MOMENTS = Object.freeze([
  "work-started",
  "in-review",
  "changes-requested", // declared here, wired in task.41
  "in-qa",
  "ready-for-merge",
  "pr-merged", // declared here, wired in task.41
  "blocked",
  "done",
]);
```

**The built-in default — the compatibility contract.** Today's defaults are candidate *lists*
(several acceptable names per moment), not single statuses. A ladder is ordered, but a rung may
still carry alternatives. So model a rung as `{ names: [...] }` and let the YAML's plain-string
form be sugar for a one-name rung:

```js
// A rung may carry alternatives. Collapsing today's candidate lists to a single
// name per rung would change behaviour for every consumer with no file — which
// is precisely what this default exists to prevent.
const DEFAULT_LADDER = Object.freeze([
  { names: ["To Do", "Backlog", "Open", "New", "Selected for Development"] },
  { names: ["In Progress", "Doing", "Started", "Development"] },
  { names: ["In Review", "Code Review", "Ready for Review", "Waiting for Review", "Peer Review", "Review"] },
  { names: ["Testing", "Ready for Testing", "In Testing", "QA", "In QA"] },
  { names: ["Waiting for merge", "Ready to Merge", "Ready for Merge", "Awaiting Merge"] },
  { names: ["Done", "Closed", "Resolved", "Complete", "Completed"] },
]);

const DEFAULT_PIPELINE = Object.freeze({
  "work-started": 1, // rung index
  "in-review": 2,
  done: 5,
  // in-qa, ready-for-merge, blocked, changes-requested, pr-merged: absent = off,
  // matching today's defaultEnabled:false on the three new v0.34.0 stages.
});
```

Cross-check this against `DEFAULT_STAGE_MAP` (`jira-sync.js:1366`) rung by rung before writing the
snapshot test. The three enabled-by-default moments must resolve to the same candidate lists.

**Public surface:**

```js
loadWorkflow({ repoRoot })            // → { ladder, pipeline, documentStatus, byIssueType, source }
rankOf(status, workflow)              // → index | null (off-ladder)
resolveMoment(moment, workflow, { issueType })
                                      // → { target, rank, offLadder } | null (moment disabled)
planMove(fromStatus, toStatus, workflow)
                                      // → [status, …] rungs strictly between, in order; [] if none
resolveDocumentStatus(local, workflow)
validateWorkflow(workflow)            // → [{level, message}], never throws
MOMENTS, DEFAULT_LADDER
```

**Path resolution** — mirror `loadWorkflowRecord` (`jira-sync.js:1820`) exactly, including the
worktree fix (`--git-common-dir` fallback; `.env` and gitignored files are absent from linked
worktrees, and the same trap applies to any root-relative read):

```js
const rel =
  loadScalarSetting(root, "tracker", "workflowFile", "TRACKER_WORKFLOW_FILE") ||
  DEFAULT_WORKFLOW_PATH; // "tracker-workflow.yaml"
```

**Swallow everything.** Missing file, unreadable file, malformed YAML, wrong shape → return the
default with `source: "default"` and a single warning the caller may print. Never throw. This is the
same contract as `loadWorkflowRecord`, and it is what makes "missing file → built-in defaults" safe.

**`planMove` is where the ladder earns its keep:**

```js
// The rungs strictly between `from` and `to`, in ladder order. This is the whole
// multi-hop story: a board that gates Done behind a showcase column needs no
// transition graph to be authored, because the ladder already says what lies
// between. Returns [] when already at target, when moving backwards, or when
// either end is off-ladder (a side-state is entered directly, never walked to).
function planMove(from, to, workflow) {
  const a = rankOf(from, workflow);
  const b = rankOf(to, workflow);
  if (a == null || b == null || b <= a) return [];
  return workflow.ladder.slice(a + 1, b).map((rung) => rung.names[0]);
}
```

**Overlay** — `byIssueType` replaces, never merges, matching `resolveStage`'s existing layer
semantics. Key lookup is case-insensitive, as `resolveStage` already does at `jira-sync.js:1866-1872`.
A `pipeline` entry of `~`/`null`/empty disables that moment for the type.

**Matching** — reuse the rules from `jira-sync.js` but do **not** import it. Copy `stripStatusEmoji`
and `eqName` into `yaml-subset.js`'s sibling or into this module, and have `jira-sync.js` re-export
from here in task.38 so there is one implementation. Real boards need this: RAPP's column is
literally `READY FOR SHOWCASE` and GitHub columns are routinely `🚧 In Progress`.

### Phase 3: Tests — `shared/resources/tests/tracker-workflow.test.mjs`

The header must say what each group exists to catch, following
`jira-stage-fixtures.test.mjs:1-29`.

Groups:

1. **Parser** — nested maps; block sequences; flow sequences (or the documented rejection); inline
   comments; a quoted key containing `/` and spaces; `~`, `null`, empty → disabled.
2. **Rank** — index for a rung; `null` off-ladder; case-insensitive; emoji-stripped.
3. **`planMove`** — rungs strictly between, in order; `[]` at target, backwards, or off-ladder.
4. **Overlay** — `byIssueType` replaces `statuses`; nulls a moment; unknown type falls through.
5. **Disablement** — an omitted moment resolves to `null`.
6. **Default snapshot** — assert `DEFAULT_LADDER` and `DEFAULT_PIPELINE` literally, and assert the
   three enabled moments resolve to the same candidate lists as `DEFAULT_STAGE_MAP`'s
   `work-started` / `in-review` / `done`. **This is the compatibility contract; write it first.**
7. **Failure modes** — missing, unreadable, malformed, wrong-shape → default, no throw.

### Phase 4: Documentation

**`docs/reference/tracker-workflow.md`** — the format, then the three bespoke-column shapes worked
end to end, because "where does my custom column go?" is the question this whole feature answers:

- **As a gate en route** — list it as a rung between review and done; `planMove` walks it.
- **As the terminal** — point `done:` at it and omit any later rung.
- **As an off-ladder side-state** — name it under `pipeline:` but not under `statuses:`.

State the three properties plainly: order is rank, omission is disablement, off-ladder is free.
Include the moment table with firing points.

**`assets/tracker-workflow.default.yaml`** — the shipped template, byte-equal to the doc's first
example, heavily commented. Task.41 scaffolds it.

**`configuration.md`** — a `tracker.workflowFile` row in the key table, and the precedence order
`tracker-workflow.yaml` > `jira.workflowRecord` > `jira.statusMap` > built-in, with both older keys
marked superseded but still read.

## Key Patterns and References

- `loadWorkflowRecord` — `jira-sync.js:1820-1835`. Copy the swallow-everything contract and the
  `--git-common-dir` worktree fallback.
- `resolveStage` — `jira-sync.js:1855-1898`. The layer-overlay shape and case-insensitive type key
  lookup.
- `parseYamlSubset` — `develop-batch/scripts/schedule.mjs:68`. The parser being promoted; read its
  header before changing anything.
- `DEFAULT_STAGE_MAP` / `DEFAULT_STATUS_RANK` — `jira-sync.js:1366-1415`. The behaviour the default
  ladder must reproduce.
- `bundle_skill.py` `JS_SIBLING_RE` — follows `require("./x.js")` transitively, so a new sibling
  module needs no bundler change, but it only fires once a *root* file references it.

## Testing Approach

- `node --test 'shared/resources/tests/tracker-workflow.test.mjs'` during development.
- `npm test` before commit — `develop-batch`'s suites are the regression signal for Phase 1.
- `npm run bundle && git diff --stat -- 'skills/*/references/*'` to see the fan-out before
  committing it.
- Dogfood: author a `tracker-workflow.yaml` for this repo's own board (columns from
  `project.yml`'s board 1) and assert it parses in the test suite. It stays unwired.
