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

> **Status**: **Both trackers read this file.** Jira (task.38) resolves every moment's target from the
> ladder and walks the rungs between; GitHub (task.39) resolves the target the same way and sets the
> Projects v2 Status field, with no walking — see below for why. **Step-file wiring is task.40**, so on
> a GitHub board you can author, validate and probe the file today, and `gh-stage.js` will move a card
> when you call it directly, but the pipeline steps still use their own inline GraphQL.
> See [Jira execution semantics](#jira-execution-semantics) and
> [GitHub execution semantics](#github-execution-semantics) for what each path does with it.

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
disables every moment after it. On Jira this is no longer a promise about the format: the ladder is
walked, rung by rung. See [Jira execution semantics](#jira-execution-semantics).

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

The plain-string form is sugar: a bare `- Backlog` and a `names:` rung listing only `Backlog` mean the
same thing. Internally a rung is always `{ names: [...] }` — but that is the *parsed* shape, not
something you write: in the file, every list is a block sequence (see Format rules below).

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

### What "opts in" actually means

**An authored `pipeline:` block is the switch.** A file with no `pipeline:` — one that declares only
`statuses:`, or is empty, or is malformed — leaves every moment's target at the built-in default. Those
defaults were not chosen by you, so they sit *below* your `jira.workflowRecord`, and the record decides
every moment exactly as it did before this file existed. Declaring a ladder alone changes nothing about
where cards go.

Write one `pipeline:` line per moment and the file takes over — for **every** moment, including the
ones you leave out. Within an authored pipeline, **omission is disablement**: a moment you do not name
does not fire, and does not fall through to the record. That is the whole mechanism for switching a
moment off, so a fall-through would make it unusable.

`byIssueType` is resolved the same way, but **per moment**. An overlay that authors its own `pipeline:`
opts that issue type in for the moments it actually names, even when the file has no top-level block.
Moments the overlay does not name are not authored for that type, so the record keeps deciding them —
which matters because the documented per-type *disable* (`in-qa: ~`) is itself a one-line overlay
pipeline, and it must not silently take over the seven moments it says nothing about.

Once there **is** a top-level `pipeline:`, it is authored for every moment, and an overlay refines it.

| Your file | Who decides the target | Does it walk? |
| --- | --- | --- |
| No file | record → built-in | no |
| `statuses:` only (or empty / malformed) | record → built-in | no |
| `statuses:` + `pipeline:` | the file; omitted moments are **off** | yes |
| `byIssueType` overlay with its own `pipeline:`, no top-level block | the file for the moments the overlay names; record for the rest | yes, for the named moments |

---

## Jira execution semantics

What the Jira path actually does with the ladder. Everything here is
`shared/resources/jira-stage.js` plus `walkLadder` in `jira-sync.js`.

### The target comes from the ladder

`jira-stage.js --issue K --stage <moment>` resolves the moment against your ladder when your file has
an authored `pipeline:` for that issue type (see [What "opts in" actually means](#what-opts-in-actually-means)),
and against the workflow record otherwise. The rung's **full name list** is used as the candidate list,
in order, so a rung declared with alternatives works whichever spelling your board uses.

`--print-plan` reports which of the two answered, as `source` (`file` or `record`) and `authored`.

### Unreachable targets are walked to

When the target is not directly reachable, the rungs the ladder declares between the card's position
and the target are walked in order:

```
In Progress ──▶ Ready for Showcase ──▶ Waiting for Review
             hop 1                  hop 2
```

**The available transitions are re-read after every hop**, because they are position-dependent — the
set offered from `In Progress` is not the set offered from `Ready for Showcase`. This is why a walk
cannot be planned once up front and then executed, and why the API cost is `1 + 2n` for an `n`-hop
walk rather than a constant.

A one-rung walk issues exactly the calls the single-hop implementation always did — including the two
paths that never reach the network at all. A card **already** at the target, and a move the
monotonicity guard **refuses**, both short-circuit before any request, exactly as before. The walk
does not read the transition list in front of those checks, because doing so would spend a call to
learn nothing on the most common invocation there is: a resumed pipeline re-firing a stage the card
has already passed.

If a board puts a time-spent validator on more than one transition in a walk, the configured
`jira.worklogTimeSpent` is booked once per such transition. Worklogs are cumulative, so set it low.

### Three outcomes, three shapes

A partial walk is neither success nor "nothing happened", and `--json` distinguishes them:

| Outcome | `reason` | Shape |
| --- | --- | --- |
| Reached the target | `walked` | `landed` = target |
| Parked mid-ladder | `walk-incomplete` | `landed` = the rung it stopped in, `remaining` = the rungs it did not reach |
| Never moved | the existing reasons (`no-transition`, `already`, `would-regress`, …) | unchanged |

**A gate is a legitimate board shape.** If a column is gated behind a human, every card will park
there and `walk-incomplete` is the correct outcome, not a failure — the exit code stays 0. A walk
aborted by the cycle guard reports the same shape, because an aborted cycle is a blocked walk.

There is **no rollback** on a partial walk: the reverse transition may not exist, and attempting one
fights the guard that just allowed the forward move.

### Guards

- **Monotonicity, once, at entry** — against the target's rank. Intermediate rungs bypass it, because
  a rung below the target is by construction "backwards" relative to it, and a per-hop guard would
  refuse the gate itself.
- **Ranks come from the ladder.** A rung you declare is ranked by its index, which is what finally
  makes a bespoke column defensible: previously a column no built-in stage named was unranked, and a
  resumed run would drag a card straight back out of it.
  > Off-ladder statuses rank as *no opinion* in ladder mode, exactly as side-states always have. The
  > ladder's indices and the built-in ranks are different scales and are never mixed.
- **One hop per rung, and no status is visited twice** in a single walk.

### Terminality is two conditions

The done-category fallback — "if exactly one transition leads to a `done` status, use it" — asks *is
there exactly one way to finish?* That question only has a right answer when the target **is** the
finish. So it now requires both:

1. the moment is one the defaults mark terminal (today, `done` alone), **and**
2. its resolved target is the ladder's **last rung**.

Point `done` at a gate column and the fallback stays shut: the moment skips, listing what the board
did offer, rather than confidently firing your real Done transition. A skip is recoverable; a wrong
terminal transition is not.

Last-rung is measured against **the ladder in play for that issue type**, so a `byIssueType` overlay
that lengthens or shortens the ladder moves the terminal with it.

Both conditions require your ladder to be driving in the first place. When it is not — no authored
`pipeline:` for this issue type — terminality comes from the workflow record exactly as it did before,
and `--print-plan` reports `isLastRung: null` to say the ladder had no opinion.

### Inspecting without moving anything

```bash
# No credentials, no network. Reads the file and prints the plan.
jira-stage.js --stage done --from "In Progress" --print-plan

# Touches the board read-only. Verifies hop 1 against live transitions;
# later hops are reported as "unverified (depends on hop 1)".
jira-stage.js --issue K-1 --stage done --dry-run
```

`--from` tells `--print-plan` where the card is. Without it there is no starting point to measure
from, so the plan is the target rung alone and `spansFrom: false` says so.

`--dry-run` cannot honestly do better than one hop: the transitions available after a hop do not
exist until that hop fires.

### The credential-free fallback is one hop only

Consumers with the Atlassian MCP connector but no API token follow
`shared/resources/jira-transition-protocol.md`. That path reads `--print-plan` for its candidates but
**performs at most one transition**. If the plan needs more than one hop it logs and leaves the card
for a human — firing hop 1 and stopping, or jumping the gate, are both worse than not trying.

---

## GitHub execution semantics

What the GitHub path does with the ladder. Everything here is
`shared/resources/gh-stage.js`, which depends on `tracker-workflow.js` and nothing else — a
GitHub-only consumer never bundles the Jira engine.

### There is no workflow, so there is no walking

This is the asymmetry to internalise before reading anything else here. A Jira workflow is a graph:
it can refuse a transition, which is why the Jira path walks the rungs between two positions and
re-reads the available transitions after every hop. **A Projects v2 Status field is a single-select
list.** Every option is settable from every other one. There is no transition graph, no "not reachable
from here", and therefore no walking and no `--print-plan`.

The ladder still matters, for two things: **rank**, and **which option each moment names**.

### The guard is the only brake

On Jira the workflow refuses illegal moves, so the backward-move guard is a second line of defence.
On GitHub there is no first line — `updateProjectV2ItemFieldValue` will cheerfully move a card from
Done back to In Progress, and a resumed pipeline run does exactly that. So the guard here is
**mandatory, not advisory**:

```bash
gh-stage.js --issue 123 --stage work-started      # refused if the card is past In Progress
gh-stage.js --issue 123 --stage work-started --allow-regress   # override, deliberately
```

Ranks come from your ladder, and unranked either side means no opinion — allow. That is the same
semantics as the Jira guard, and it has a sharper consequence here: **on a board with no
`tracker-workflow.yaml`, every bespoke column is unranked and the guard is inert.** Declaring the
ladder is what switches the protection on. (GitHub's own default first column, `Todo`, is not on the
built-in ladder either — it has `To Do`, with a space. A stock board with no file therefore starts
unranked. Fixing that is a change to the shared default ladder and is tracked separately.)

### A skip means something different from Jira's

On Jira, "no transition from here" is frequently correct — the board genuinely cannot get there from
where the card sits. On GitHub, `no-option` can only mean **the Status field has no such option at
all**, which is always a configuration error. The message says so, and lists what the board did
offer:

```
⚠️  no option matching [In Review] on board "Agent Skills" — board offers: Todo, In Progress, Ready for Showcase, Done
   ↪ "Ready for Showcase" is present and is the target for moment pr-merged
```

Do not reuse Jira's "a skip is often correct" wording for this outcome.

### Never fan out across boards

An issue can sit on several project boards. `set-github-project-priority.sh` and
`set-github-project-estimate.sh` write to **every** one of them, which is fine for an estimate and
wrong for a status: a status change is a claim about where the work is, visible to whoever reads that
board. `gh-stage.js` picks exactly one, in this order:

1. exactly one board → use it
2. `--board <number|name>`
3. `github.projectBoard`
4. `project.yml` → `project_board_number` / `project_board_name`
5. otherwise → skip with `ambiguous-board`, **naming the candidates** rather than guessing

**An unmatched hint fails closed.** These tiers are consulted in order only while each is *unset*.
The first one that IS set is authoritative: if it names a board the issue is not on, the result is
`ambiguous-board` — it does **not** fall through to the next tier. "No hint given" and "the hint you
gave was wrong" are different questions, and answering the second by quietly consulting a lower tier
is how a mistyped `--board` ends up changing the status on somebody else's board.

`--add-to-board` follows the same discipline. It needs a board *number*, so a title-valued hint is
resolved against the boards actually read; a hint that cannot be resolved to a number skips the add
with a warning rather than substituting whatever `project.yml` happens to name.

### Matching is exact, case-insensitive, emoji-stripped — and never prefix

One discipline everywhere. `🚧 In Progress` matches `In Progress`; `done` matches `Done`. **`In
Review` does not match `In Review (blocked)`** — prefix matching is what makes that go wrong, so
there is none. Candidates are tried in the order the rung declares them, first hit wins.

### Inspecting without moving anything

```bash
# Read-only. Prints the board's real options in board order, and how every
# moment resolves against them.
gh-stage.js --probe-board --issue 123

# Read-only. Resolves the target and applies the guard, then stops.
gh-stage.js --issue 123 --stage in-review --dry-run
```

`--dry-run` issues **no** write — including no `gh project item-add`. This is worth stating because
the inline step-0 block it replaces runs `item-add` *before* its read query, so a naive port would
write during a read-only check. Under `--dry-run --add-to-board` it prints `would add issue #N to
board X` instead. A test stubs `gh` and fails on any write verb, because a comment is not a guarantee.

### `--write-ladder`: the ergonomic win over Jira

Jira needs `statusRank` hand-authored, because a workflow graph has no inherent order. **A
single-select field is a list, and your team already put it in the order work flows through it** — so
the ladder can simply be read off the board:

```bash
gh-stage.js --probe-board --write-ladder --issue 123
```

It writes `tracker-workflow.yaml` with your board's Status options as `statuses:`, in board order.
**It never overwrites an existing file** — a hand-authored ladder encodes intent a board read cannot
recover, so an existing one is left untouched and you are told why. Combined with `--dry-run` it
prints the ladder it would have written and writes nothing: the no-write contract covers the
filesystem, not just the board.

### Exit codes

Identical to the Jira path, and for the same reason — pipeline steps run inside shells:

| Code | Meaning |
| --- | --- |
| 0 | `transitioned`, `already`, `stage-disabled`, `no-option`, `not-on-board`, `ambiguous-board`, `no-status-field`, `no-credentials`, `would-regress`, `dry-run`, and any unhandled throw |
| 1 | a skip, **only** under `--strict` |
| 2 | usage error (unknown moment, missing or non-numeric `--issue`) |

`would-regress` and `already` stay exit 0 even under `--strict`: both mean the board is at or past
where the moment wanted it, which is not a skip worth escalating.

### No credentials is a dead end, not a handoff

`gh` is either authenticated or it is not. Unlike Jira there is **no MCP fallback and no second
transport**, so `no-credentials` logs one line and exits 0. Do not look for a fallback protocol
document for the GitHub path — none exists, and none should.

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

`validateWorkflow` reports unknown moments, a status appearing on two rungs, and flow collections as
errors. An off-ladder pipeline target is reported as `info`, not an error — declaring a side-state is
a legitimate pattern rather than a mistake.

Two cases sit between the two and are reported as `warn`. Both are the same thing: a target **nobody
chose for the ladder it is being resolved against**.

1. You declared `statuses:` but no `pipeline:`, and a default moment matches no rung on your ladder.
2. A `byIssueType` overlay replaced `statuses:` for a type, and a moment it did not re-declare
   inherits a base target that type's ladder does not have:

   ```
   warn: `in-qa` for issue type "Ops Request" inherits the base target "Ready for Testing", which
         is not on that type's ladder — declare it under `byIssueType."Ops Request".pipeline`, or
         set it to `~` to disable it for this type
   ```

### Inherited targets and aliases

Most boards need no `pipeline:` block at all. An **inherited** target — one from the built-in default,
or from the base pipeline applied to an overlay-replaced ladder — is matched against your ladder by
name, and if that misses, against the other historical names on the same rung. So all of these wire
`work-started` correctly with nothing written:

```yaml
# Any of these three ladders wires `work-started` with no `pipeline:` block:
statuses:
  - Backlog
  - In Progress # direct match
  - Done
# …or…
statuses:
  - Backlog
  - Doing # alias on the same rung
  - Done
# …or…
statuses:
  - Backlog
  - Development # alias on the same rung
  - Done
```

Two limits worth knowing:

- **`blocked` never alias-resolves.** It has no rung on the default ladder — it is a side-state by
  nature — so an inherited miss there stays off-ladder, which is the correct answer.
- **An overlay that restates the base ladder inherits nothing.** If a `byIssueType` block declares the
  same statuses the base already has, its targets were chosen against exactly the ladder still in use,
  so they are treated as authored rather than inherited.

**An authored target never takes this path.** If you write `done: Ready for Showcase` on a board that
also has a `Closed` column, it resolves to Showcase or to nothing — an explicit choice is never
silently rerouted through an alias list. That is the difference between a target you chose and one
you inherited, and it is the whole reason the two behave differently.

---

## Scaffolding it from your board

Everything the ladder needs — your columns, their order, and the statuses behind each — is already in
your tracker. `/scaffold-tracker-workflow` reads it and writes the file:

```bash
node skills/scaffold-tracker-workflow/scripts/scaffold-tracker-workflow.js --print
```

`--print` writes nothing, and reading the output first is the point: the **ladder** it produces is
observed, but the **`pipeline:` mapping is inferred** from column names, and it annotates each choice
with the evidence. It flags the four things it cannot decide — moments that come out in the wrong
order for your column arrangement, columns that matched two moments, moments no column matched, and
whether `done` should fire at all on a board with a merge queue. It validates its output through the
engine below before writing.

Prefer it to the template on any board with more than a handful of columns. The template stays the
right answer for a small board, or where you would rather write the file than review one.

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

- [`skills/scaffold-tracker-workflow`](../../skills/scaffold-tracker-workflow/SKILL.md) — generate this file from a live board
- [`docs/examples/tracker-workflow.default.yaml`](../examples/tracker-workflow.default.yaml) — annotated copy-paste starter
- [`docs/reference/configuration.md`](./configuration.md) — `skills-config.yaml` schema, including `tracker.workflowFile`
- [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md) — the local status lifecycle `documentStatus:` maps from
- [`shared/resources/tracker-workflow.js`](../../shared/resources/tracker-workflow.js) — the engine
