---
title: "`tracker-workflow.yaml` reference"
type: reference
description: "The consumer-owned status ladder the develop pipelines read: file format, the three properties that fall out of ordering, the moment vocabulary, and worked examples for bespoke board columns."
tags: [configuration, tracker, jira, github, pipeline]
updated: 2026-08-04
---

# `tracker-workflow.yaml`

Your board has columns the pipelines have never heard of — "Ready for Showcase", "Waiting for merge",
"Ready for Testing". This file is where you tell them.

It lives at the root of your repo, next to `skills-config.yaml`, and declares two things: your
board's statuses **in order**, and which status each pipeline moment should move a card to.

```yaml
statuses:
  - Backlog
  - In Progress
  - Waiting for Review
  - Done

pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  done: Done
```

That is a complete, working file.

**The file is optional.** With no file at all, the pipelines use a built-in default ladder that
reproduces their historical behaviour exactly. Adding one is how you opt into describing your own
board; it is never a prerequisite.

> **Status**: shipped in task.37 as format + engine only. Nothing reads it yet — Jira execution is
> task.38, GitHub is task.39, step-file wiring is task.40. You can author and validate the file today;
> it starts affecting board moves when those land.

---

## Order is the whole design

Three properties fall out of writing the statuses in board order, and between them they replace three
separate config mechanisms.

### 1. Order is rank

A rung's index is its rank. That is what stops a resumed run from dragging a card backwards.

Before this file existed, rank came from `DEFAULT_STATUS_RANK`, which is derived from the built-in
candidate lists — so a column nobody had heard of was unranked, and the backward-move guard had *no
opinion about it at all*:

```js
resolveStatusRank("READY FOR SHOWCASE", record); // → null  (guard allows anything)
```

List it in `statuses:` and it is ranked, because it has a position:

```yaml
statuses:
  - In Progress
  - Waiting for Review
  - Ready for Showcase # ← rank 2, simply by being third
  - Done
```

No `statusRank:` block to hand-author, and no way for the rank to drift out of sync with the order,
because they are the same fact.

### 2. Order is the path

The rungs between where a card sits and where it must go are already declared, so multi-hop movement
needs no transition graph.

This matters on a board where a status is only reachable through another one. `resolveTransition`
does exactly one hop; a board that gates Done behind a showcase column would skip the move entirely —
and because every later move resolves from wherever the card actually sits, one missed hop silently
disables every moment after it.

Given the ladder above, moving a card from `In Progress` to `Done` walks:

```
Waiting for Review  →  Ready for Showcase  →  Done
```

You authored that path by writing four lines in order.

### 3. Omission is disablement

A moment absent from `pipeline:` does not fire. There is no `enabled: false`, no `defaultEnabled` to
reason about, and no second place a moment can be switched off from.

```yaml
pipeline:
  work-started: In Progress
  done: Done
  # in-review omitted → the pipeline never touches the board when a PR opens
```

### 4. Off-ladder is free

A status named under `pipeline:` but *absent* from `statuses:` is a **side-state**: entered directly,
never walked to, and never ranked. `Blocked` and `Cancelled` are the usual ones.

```yaml
statuses:
  - In Progress
  - Done

pipeline:
  blocked: Blocked # ← not in statuses, so it is a side-state
  done: Done
```

There is no second list to declare side-states in, and no way for the two lists to disagree.

---

## The moments

Moments are a **closed set**. Each one is a point in the pipeline where a step signals progress — a
line of code in a step file. This file chooses which status a moment targets; it can never invent a
new moment.

| Moment              | Fires when                                     | Wired |
| ------------------- | ---------------------------------------------- | ----- |
| `work-started`      | branch created, development begins             | ✅    |
| `in-review`         | pull request opened                            | ✅    |
| `in-qa`             | QA review starts                               | ✅    |
| `ready-for-merge`   | QA passed, awaiting merge                      | ✅    |
| `blocked`           | a pipeline gate failed and needs a human       | ✅    |
| `done`              | Definition of Done met, work accepted          | ✅    |
| `changes-requested` | a reviewer requests changes on the PR          | task.41 |
| `pr-merged`         | the PR merges                                  | task.41 |

`changes-requested` and `pr-merged` are declared by the engine but nothing fires them yet. Setting
them today is a harmless no-op, which is why the [shipped template](../examples/tracker-workflow.default.yaml)
leaves them out.

---

## Where does my bespoke column go?

This is the question the whole file answers, and a custom column can play three different roles.
Pick by asking what you want to *happen* at that column.

### As a gate en route — the pipeline moves through it

Your board has "Ready for Showcase" between testing and done, and cards must pass through it.

```yaml
statuses:
  - In Progress
  - Waiting for Review
  - Ready for Testing
  - Ready for Showcase # ← a rung like any other
  - Done

pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  in-qa: Ready for Testing
  done: Done
```

Because it is a rung between `Ready for Testing` and `Done`, `planMove` walks it on the way to
`done`. You did not have to say so anywhere — it follows from the order.

### As the terminal — the pipeline stops there and a human takes over

You want the pipeline to park work in "Ready for Showcase" and a person to decide when it is really
done.

```yaml
statuses:
  - In Progress
  - Waiting for Review
  - Ready for Showcase

pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  done: Ready for Showcase # ← `done` targets the showcase column
  # No rung after it, so nothing ever moves past it.
```

Point `done:` at it and declare no rung beyond it. This is the "we stop at Showcase; a human moves it
to Done" workflow, and the comment you write next to it is the reason the file is YAML rather than
JSON.

### As an off-ladder side-state — entered directly, out of band

"Blocked" is not a step *towards* done; it is somewhere a card goes sideways when something breaks.

```yaml
statuses:
  - In Progress
  - Waiting for Review
  - Done

pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  blocked: Blocked # ← named here, absent from statuses
  done: Done
```

Side-states are unranked (`rankOf` → `null`), so the backward-move guard has no opinion about them —
which is correct, because moving to Blocked is neither forwards nor backwards. `planMove` never
routes *through* one.

---

## Rungs with alternatives

A rung may carry several acceptable names for the same position:

```yaml
statuses:
  - Backlog
  - names:
      - In Progress
      - Doing
      - Development
  - Done
```

All three names rank identically, and the pipeline tries them in the order written when moving a card
there. Use this when your board's column has been spelled differently over time, or when one config
serves several boards.

The plain-string form is sugar: `- Backlog` and `- names: [Backlog]` mean the same thing. Internally
a rung is always `{ names: [...] }`.

This is not decoration. The built-in defaults are candidate *lists*, and flattening them to one name
per rung would change behaviour for every consumer with no file — a board whose column is
`Waiting for Review` would start being moved to `In Review` instead.

---

## Per-issue-type overlay (Jira only)

One board routinely gives different issue types genuinely different workflows. Keyed on the **live
tracker issue type name**, matched case-insensitively:

```yaml
byIssueType:
  "IT / DevOps Task":
    statuses:
      - Selected for Development
      - In Progress
      - In Review
      - Done
    pipeline:
      in-qa: ~ # disable QA for this type only
```

**The overlay replaces, it does not merge.** A type's `statuses:` is its whole ladder, so it cannot
inherit a rung its own workflow has never had. Setting a moment to `~` (or `null`, or empty) disables
it for that type alone.

Quote any key containing spaces or a slash — and Jira issue type names usually do.

---

## Document status mapping

Optional. Maps your local document lifecycle onto board statuses, for the `/sync-*` skills:

```yaml
documentStatus:
  ready-for-development: Selected for Development
  in-progress: In Progress
  ready-for-review: Waiting for Review
  accepted: Done
  cancelled: Cancelled
```

The keys are the canonical lifecycle from
[`document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md). A document
status is a word in a *file*; a board status is a column on a *board*. They are related but not the
same, which is why this mapping is explicit.

---

## Format rules

**Block sequences only.** The parser (`shared/resources/yaml-subset.js`) reads a deliberate subset of
YAML — no anchors, no multi-line strings, and **no flow collections**. Write:

```yaml
statuses:
  - Backlog
  - Done
```

not:

```yaml
statuses: [Backlog, Done] # ✗ rejected
```

Flow collections are rejected with an explicit error rather than accepted, because an unsupported one
would otherwise come back as the *plain string* `"[Backlog, Done]"` — building a one-rung ladder with
a nonsense name, silently. `validateWorkflow` names the problem when it sees one.

**Quote keys with spaces or slashes.** Bare keys may contain word characters, dots and hyphens.
Anything else — notably `byIssueType` keys — needs quoting:

```yaml
byIssueType:
  "IT / DevOps Task": # ✓
  IT / DevOps Task: # ✗ unparseable
```

**Comments are encouraged.** They are why this file is YAML and not JSON: the reason a board stops at
a showcase column is exactly the kind of thing that gets lost otherwise.

---

## Where the file lives

Default: `tracker-workflow.yaml` at your repo root.

Override with `tracker.workflowFile` in `skills-config.yaml`, or the `TRACKER_WORKFLOW_FILE`
environment variable (which wins):

```yaml
tracker:
  workflowFile: config/board.yaml
```

> **If you already set `tracker: jira` as a scalar**, that is a *different* key — the platform
> override documented in [`configuration.md`](./configuration.md#key-reference). The two cannot
> coexist under one `tracker:` key in YAML. Use `TRACKER_WORKFLOW_FILE`, or keep the workflow file at
> its default path (the common case, and why most projects set nothing).

---

## Precedence

```
tracker-workflow.yaml  >  jira.workflowRecord  >  jira.statusMap  >  built-in defaults
```

`jira.workflowRecord` and `jira.statusMap` both keep working, at lower precedence. Nothing is
removed, and no migration is required — a project with no `tracker-workflow.yaml` resolves exactly as
it did before.

---

## Failure behaviour

The engine never throws. A missing, unreadable, malformed or wrong-shaped file resolves to the
built-in default ladder with a warning you may print. That is what makes "no file → today's
behaviour" safe to depend on, and it means a typo in this file can degrade a board move but can never
crash a pipeline step.

Check a file before relying on it:

```js
const { loadWorkflow, validateWorkflow } = require("./shared/resources/tracker-workflow.js");
const wf = loadWorkflow({ repoRoot: process.cwd() });
console.log(wf.source); // "file" or "default"
console.log(validateWorkflow(wf)); // [{ level, message }, …]
```

`validateWorkflow` reports unknown moments, a status appearing on two rungs, flow collections, and —
as `info`, not an error — pipeline targets that are off-ladder, since that is a legitimate pattern
rather than a mistake.

---

## The shipped template

`docs/examples/tracker-workflow.default.yaml`, in full. Copy it and edit:

```bash
cp docs/examples/tracker-workflow.default.yaml tracker-workflow.yaml
```

```yaml
# tracker-workflow.yaml — copy-paste starter.
#
#   cp docs/examples/tracker-workflow.default.yaml tracker-workflow.yaml
#
# Then edit `statuses:` to match your board's columns, in the order they appear
# on it, and point each moment at the column it should move a card to.
#
# Full reference, including the three ways to handle a bespoke column:
#   docs/reference/tracker-workflow.md
#
# The file is optional. With no file at all, the pipelines use a built-in default
# ladder that reproduces their historical behaviour exactly.

# ── The ladder ───────────────────────────────────────────────────────────────
# Your board's columns, in board order. Order IS the workflow:
#
#   • Order is rank.        A rung's index is its rank, so a resumed run cannot
#                           drag a card backwards out of a column.
#   • Order is the path.    Moving two rungs walks the rung between. No transition
#                           graph to author.
#
# Block sequences only — one `- Name` per line. A flow sequence (`[A, B, C]`) is
# NOT supported and is rejected with an error rather than silently misread.
statuses:
  - Backlog
  - Selected for Development
  - In Progress
  - Waiting for Review
  - Ready for Testing
  - Done

# A rung may carry ALTERNATIVES when your board's column has been spelled several
# ways over time, or when one config serves several boards. All names on a rung
# share its rank, and the pipeline tries them in the order written:
#
#   statuses:
#     - Backlog
#     - names:
#         - In Progress
#         - Doing
#     - Done

# ── The moments ──────────────────────────────────────────────────────────────
# Which status each pipeline moment targets.
#
#   • Omission is disablement. A moment not named here does not fire. There is no
#                              `enabled: false` and no second place to switch it off.
#   • Off-ladder is free.      A status named here but absent from `statuses:` is a
#                              side-state: entered directly, never walked to.
#
# The moments are a closed set — each one is a point in the pipeline where a step
# signals progress. Config chooses the target; it cannot invent a new moment.
#
#   work-started     branch created, development begins
#   in-review        pull request opened
#   in-qa            QA review starts
#   ready-for-merge  QA passed, awaiting merge
#   blocked          a pipeline gate failed and needs a human
#   done             Definition of Done met, work accepted
pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  in-qa: Ready for Testing
  done: Done
  # blocked: Blocked        # ← off-ladder side-state; uncomment if your board has one
  # ready-for-merge: ...    # ← omitted here; add the column and the line together

# ── Document status mapping (optional) ───────────────────────────────────────
# Local document status -> board status, used by the /sync-* skills. The local
# names are the canonical lifecycle from
# shared/resources/document-status-lifecycle.md.
documentStatus:
  ready-for-development: Selected for Development
  in-progress: In Progress
  ready-for-review: Waiting for Review
  accepted: Done

# ── Per-issue-type overlay (optional; Jira only) ─────────────────────────────
# Keyed on the LIVE tracker issue type name, matched case-insensitively. Quote any
# key containing spaces or a slash.
#
# The overlay REPLACES `statuses:` for that type rather than merging into it, so a
# type cannot inherit a rung its own workflow has never had. Setting a moment to
# `~` disables it for that type only.
#
# byIssueType:
#   "IT / DevOps Task":
#     statuses:
#       - Selected for Development
#       - In Progress
#       - In Review
#       - Done
#     pipeline:
#       in-qa: ~
```

> This block is asserted byte-equal to the file by
> `shared/resources/tests/tracker-workflow.test.mjs`, so the two cannot drift apart.

---

## See also

- [`docs/examples/tracker-workflow.default.yaml`](../examples/tracker-workflow.default.yaml) — annotated copy-paste starter
- [`docs/reference/configuration.md`](./configuration.md) — `skills-config.yaml` schema, including `tracker.workflowFile`
- [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md) — the local status lifecycle `documentStatus:` maps from
- [`shared/resources/tracker-workflow.js`](../../shared/resources/tracker-workflow.js) — the engine
