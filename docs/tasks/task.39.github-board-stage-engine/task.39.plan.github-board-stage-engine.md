---
id: task.39.plan
title: "Implementation Plan: gh-stage.js GitHub board engine"
type: plan
task-ref: task.39.github-board-stage-engine.md
---

# Implementation Plan: `gh-stage.js`

> Requirements and success criteria: [task.39.github-board-stage-engine.md](task.39.github-board-stage-engine.md)

## Overview

A Node CLI isomorphic to `jira-stage.js` that resolves a target from the ladder and sets a Projects
v2 Status single-select. No transition graph, so no walking — but the backward-move guard becomes
mandatory, because nothing else prevents a regression.

## Phase-by-Phase Implementation Guide

### Phase 1: `resolveOption` and the CLI skeleton

**File:** `shared/resources/gh-stage.js` (new)

Header comment must state the asymmetry up front, because the next person will arrive from
`jira-stage.js` and assume the same model:

```js
/**
 * gh-stage — set the GitHub Projects v2 Status field a pipeline MOMENT implies.
 *
 * The Jira twin walks a ladder because a Jira workflow can refuse a move. A
 * Projects v2 single-select cannot: every option is settable from every other.
 * So there is no transition graph, no "not reachable from here", and no walking.
 *
 * The consequence is that the backward-move guard is the ONLY thing stopping a
 * resumed run from dragging a card out of Done. On Jira the workflow is a second
 * brake; here there is none. The guard is therefore mandatory, not advisory.
 *
 * A skip here also means something different. On Jira "no transition from here"
 * is frequently correct. On GitHub `no-option` can only mean the Status field
 * has no such option at all — always a configuration error. Say so loudly.
 */
```

`resolveOption` — pure, ~15 lines, and deliberately dumber than `resolveTransition`:

```js
// 1 already · 2 exact case-insensitive match per candidate in order · 3 stop.
// No prefix matching (that is what makes "In Review" match "In Review (blocked)"),
// no fuzzy matching, no status-category analogue — there are no categories.
function resolveOption(options, candidates, current) {
  const opts = options || [];
  if ((candidates || []).some((c) => eqName(c, current)))
    return { match: null, reason: "already" };
  for (const c of candidates || []) {
    const hit = opts.find((o) => eqName(o.name, c));
    if (hit) return { match: hit, rule: `option="${c}"` };
  }
  return { match: null, reason: "no-option" };
}
```

`eqName` / `stripStatusEmoji` come from `tracker-workflow.js` (task.37 moved them there). Do **not**
`require("./jira-sync.js")` — keeping this module free of it is what stops GitHub-only consumers
bundling ~3,100 lines of Jira code.

Exit codes, transcribed from `jira-stage.js:19-27`:

```js
// Zero non-transition exit codes matter: pipeline steps run inside shells, and
// a non-zero exit on "this board has no review column" would kill the run.
//   0  transitioned | already | stage-disabled | no-option | not-on-board
//      | no-credentials | would-regress | dry-run  — and any unhandled throw
//   1  a skip, but only under --strict
//   2  usage error
```

`no-credentials`: `gh` missing, or `gh auth status` non-zero. Unlike Jira this is a **dead end, not
a handoff** — there is no MCP fallback. One warning, exit 0, and the message must not imply a
fallback exists.

### Phase 2: Board read, guard, mutation

**One read** — the existing query plus the current value, which steps 0, 4 and 7 do not fetch today:

```graphql
{ repository(owner:"OWNER", name:"REPO") { issue(number:N) {
  projectItems(first:10) { nodes {
    id
    fieldValueByName(name:"STATUS_FIELD") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
    project { id title number
      fields(first:20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } } }
  } } } } }
```

Transport is `execFileSync("gh", ["api", "graphql", "-f", `query=${q}`])` — auth stays in `gh`,
matching every other GitHub call in the repo. Interpolate `OWNER`/`REPO`/`N` after validating `N` is
numeric; do not build the query from unvalidated input.

**Board selection** — the rule that matters most, because getting it wrong writes to a board nobody
asked about:

```js
// set-github-project-*.sh fan out to EVERY board the issue is on. That is fine
// for an estimate and wrong for a status: a status change is a claim about where
// the work is, visible to whoever reads that board. So: never fan out.
//   1 exactly one board            → use it
//   2 --board                      → that one
//   3 github.projectBoard          → that one
//   4 project.yml project_board_number / project_board_name  → that one
//   5 otherwise                    → skip, reason "ambiguous-board", naming them
```

`project.yml` is read as the last fallback exactly as steps 0 and 4 do today
(`grep 'project_board_number:' project.yml | awk '{print $2}'`) — do a proper read here, but do not
migrate the file.

**The guard** — ranks come from the ladder:

```js
const curRank = tw.rankOf(current, workflow);
const tgtRank = tw.rankOf(target, workflow);
if (!allowRegress && curRank != null && tgtRank != null && curRank > tgtRank) {
  return emit({ transitioned: false, reason: "would-regress", from: current, to: target }, 0);
}
```

Unranked either side → no opinion, allow — same semantics as the Jira guard at `jira-sync.js:2241`.
Note this is exactly why the ladder matters on a tracker with no graph: without a declared order,
`rankOf` returns `null` for every bespoke column and the guard is inert. Worth a comment.

**Mutation, then verify:**

```graphql
mutation { updateProjectV2ItemFieldValue(input:{
  projectId:"…" itemId:"…" fieldId:"…" value:{ singleSelectOptionId:"…" } })
  { projectV2Item { id } } }
```

Then re-read `fieldValueByName` and report the landed option. Retry the mutation with the same
backoff `tracker_call_with_retry` uses (3×, 1s/2s/4s) — that helper wraps `gh issue` calls but no
board mutation today, and board mutations fail transiently at least as often.

**`ensureOnBoard`** — port, don't reinvent, from `develop-pipeline-step-0-resolve-and-prepare.md:376-444`:

```
gh project item-add "$BOARD_NUM" --owner "$OWNER" --url ".../issues/N"
sleep 3                       # Projects API propagation
<read>                        # if projectItems empty: sleep 5, re-read once
```

Only under `--add-to-board`. `not-on-board` is returned only if the item is still absent after that.

### Phase 3: `--dry-run` and `--probe-board`

**`--dry-run` must not write.** This is the one place a naive port of `jira-stage.js` is unsafe: the
Jira dry-run is GET-only because the whole flow is GET-then-POST, but step-0's GitHub block runs
`gh project item-add` **before** its read query. So:

```js
if (args.dryRun && args.addToBoard) {
  output.info(`🔎 would add issue #${n} to board ${boardNum} (skipped: --dry-run)`);
}
```

Assert it: stub the `gh` invocation in tests and fail on any argv containing `item-add`, `mutation`
or `--method POST`. A comment is not a guarantee.

Skip output ports `describeAlternatives` (`jira-stage.js:87-110`) — the single highest-value thing
to bring across, because it turns "nothing moved" into a one-line diagnosis:

```
🔎 #123 [board "Agent Skills"] @ "In Progress" — moment in-review: would set "In Review"
⚠️  no option matching [In Review] — board offers: Todo, In Progress, Ready for Showcase, Done
   ↪ "Ready for Showcase" is present and is the target for moment pr-merged
```

**`--probe-board`** mirrors `probeWorkflow`'s three-verdict shape (`disabled` / `→ "X"` /
`skip (no-option)`) so the two outputs read side by side.

**`--write-ladder`** — the ergonomic win over Jira. A Projects board's option order **is** its
workflow order, so the ladder can simply be read:

```js
// Jira needs statusRank hand-authored because a workflow graph has no inherent
// order. A single-select field is a list, and the team already put it in the
// order work flows. Read it.
statuses: options.map((o) => o.name);
```

Write only when no ladder exists; preserve an existing one verbatim, matching
`buildWorkflowRecord`'s preserve-hand-authored-intent discipline (`jira-sync.js:2731`).

### Phase 4: Fixtures and tests

`shared/resources/tests/fixtures/gh-*.json` — real captured envelopes, trimmed to the fields the
matcher reads. The test header must document the exact capture query and the trimming rule, as
`jira-stage-fixtures.test.mjs:1-29` does; otherwise nobody can re-capture and the fixtures rot.

| Fixture | Pins |
| --- | --- |
| `gh-two-boards-done-ids.json` | option ids are **per-project** — anything caching one corrupts a real board while passing hand-written tests |
| `gh-issue-on-two-boards.json` | the multi-board rule; today's steps take `nodes[0]` by accident |
| `gh-bespoke-columns.json` | `Backlog / In Development / Ready for Showcase / Shipped` — without it nothing proves the ladder does anything |
| `gh-no-status-field.json` | skip, not a crash |
| `gh-not-on-board.json` (`nodes: []`) | the `not-on-board` path `/finalise` escalates on |
| `gh-done-case-variants.json` | an option named `done` beside one named `Done` — pins the case-sensitivity fix at `skills/finalise/SKILL.md:1061` |
| `gh-status-unset.json` (`fieldValueByName: null`) | the unset branch |
| `gh-mutation-error.json` | retry logic, testable with no network |

## Key Patterns and References

- `jira-stage.js` — the CLI shape, exit-code table, `describeAlternatives`, `--json` emit pattern.
  Duplicate the ~40 lines of arg parsing rather than extracting a shared runner; sharing it would
  couple this module to a 3,100-line Jira file for no benefit. Assert the *contract* in a test
  instead.
- `set-github-project-priority.sh:62-67` — repo context via `gh repo view`; the always-`exit 0`
  discipline; the `-f query=` invocation shape.
- `set-github-project-estimate.sh:29-61` — the env → `skills-config.yaml` → default field-name
  resolution to mirror for `github.projectStatusField`.
- `tracker_call_with_retry` — `shared/resources/resolve-platform.sh:69-80`.
- `buildWorkflowRecord` — `jira-sync.js:2731-2769`. The preserve-existing-intent rule for
  `--write-ladder`.

## Testing Approach

- `node --test 'shared/resources/tests/gh-stage.test.mjs'` throughout.
- Stub `gh` via an injectable `execImpl` so every test runs offline; the write-free assertion for
  `--dry-run` depends on that stub.
- `npm test` before commit. Nothing existing should change — this task adds a file.
- Manual, read-only: `--probe-board` against this repo's board 1 ("Agent Skills", from
  `project.yml`), then `--dry-run` for each moment.
- Pre-adoption ritual to document: a scratch Projects v2 board with the consumer's exact column
  names, one dummy issue, and a real ladder run. Free and disposable, unlike a Jira sandbox.
