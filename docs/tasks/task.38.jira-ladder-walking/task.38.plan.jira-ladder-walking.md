---
id: task.38.plan
title: "Implementation Plan: Jira ladder walking"
type: plan
task-ref: task.38.jira-ladder-walking.md
---

# Implementation Plan: Jira ladder walking

> Requirements and success criteria: [task.38.jira-ladder-walking.md](task.38.jira-ladder-walking.md)

## Overview

Resolve the Jira target from the ladder, walk intermediate rungs when it is not directly reachable,
and stop the done-category fallback firing when `done` has been retargeted away from the last rung.

## Phase-by-Phase Implementation Guide

> **Revised 2026-08-05** against `task.38.review.1.jira-ladder-walking.md`. The original snippets
> were written against a pre-merge model of task.37's API and called two functions that do not
> exist. All line references below were re-verified against the merged sources.

### Phase 1: Last-rung restriction on the terminal fallback

**Files:** `shared/resources/tracker-workflow.js`, `shared/resources/jira-sync.js`

`resolveStage` currently ends (`jira-sync.js:2028`):

```js
terminal: !!base.terminal,
```

There is **no** override path, so a `done` moment retargeted at "Ready for Showcase" still arrives
at `resolveTransition` with `terminal: true` and takes rule 4:

```js
if (terminal) {
  const done = avail.filter((t) => t.to?.statusCategory?.key === "done");
  if (done.length === 1) return { match: done[0], rule: "statusCategory=done (unambiguous)" };
```

On the RAPP fixtures, `In Progress` offers exactly one done-category transition (`id=161 → Done`),
so a board that retargeted `done` at the showcase column would silently be sent to Done. That is the
"confident wrong transition" the resolver's own comment (`jira-sync.js:2185-2192` and the doc at
`configuration.md:248`) says is worse than a skip.

**Change, part 1 — `tracker-workflow.js`.** Last-rung is decided *inside* the engine, because the
engine is the only place that knows which ladder is in play:

```js
// in describeTarget, which already has the resolved ladder in hand:
return { targets: ladder[rank].names.slice(), rank, offLadder: false,
         isLastRung: rank === ladder.length - 1 };
// off-ladder branch:
return { targets: [name], rank: null, offLadder: true, isLastRung: false };
```

This must **not** be computed at the jira-sync call site. The tempting one-liner —
`rankOf(target, workflow) === workflow.ladder.length - 1` — is wrong twice over:

- `workflow.ladder` is the **base** ladder from `buildWorkflow` (`:381`). The ladder actually in play
  is `ladderFor(workflow, issueType)` (`:523`), which a `byIssueType` overlay may replace with one of
  a different length. It is also not exported, so the comparison cannot be written correctly outside
  the module.
- `rankOf(status, workflow, opts)` (`:567`) resolves through `ladderFor(workflow, opts.issueType)`.
  Called without `opts` it ranks against the base ladder while the walk runs against the overlay —
  the two sides of the `===` end up measured against different ladders.

**Change, part 2 — `jira-sync.js`.** Thread `terminal` from the caller, as the conjunction of two
independent conditions:

```js
// Rule 4 asks "is there exactly one way to finish?" — a question that only has
// a right answer when the target IS the finish. Once a project points `done` at
// an earlier column, the single done-category transition is by definition NOT
// what was asked for.
//
// Base terminality comes from DEFAULT_STAGE_MAP, where `done` is the only moment
// carrying `terminal: true` (:1409-1414). Position comes from the ladder. Both,
// or neither.
const terminal = isTerminalMoment(momentKey) && moment.isLastRung;
```

Leave `jira-stage.js:249` alone:

```js
localStatus: spec.terminal ? "accepted" : args.stage,
```

With `terminal:false` this yields the literal `"done"`, which **is** in `TERMINAL_LOCAL_STATUSES`
(`jira-sync.js:1478`), so positive-resolution preference still applies when filling a required
`resolution` field. Correct by accident, but correct — "fixing" it breaks resolution filling on
retargeted terminals.

### Phase 2: `walkLadder`

**File:** `shared/resources/jira-sync.js`, beside `transitionToStatus`.

```js
// Walk the rungs between where the card is and where the moment wants it.
//
// Transitions are POSITION-DEPENDENT: the set available from "In Progress" is
// not the set available from "Waiting for Review". So the transition list is
// re-fetched after every hop. Caching the first one defeats the entire feature.
//
// Never throws. A hop that finds no transition ends the walk and is reported —
// a board that gates a column behind a human is a correct board, and stopping
// there is the right outcome, not a failure.
// EVERY rung is an ARRAY of candidate names, in preference order — never one
// name. `resolveMoment` returns `targets` (plural) and `planMove` returns
// `{ names: [...] }` per rung. Collapsing either to names[0] makes alternative
// spellings unreachable: a board whose column is "Waiting for Review" would be
// sent to "In Review". That is the regression task.37's plural return exists to
// prevent, and resolveTransition already takes an ordered candidate list, so the
// array passes straight through with no adaptation.
async function walkLadder({
  http, baseUrl, email, token, issueKey,
  from, targets, workflow, issueType, output,
  doneResolution, cancelledResolution, worklogTimeSpent,
  allowRegress = false,
}) {
  const key = (s) => stripStatusEmoji(s).toLowerCase();   // no `norm` helper exists
  const hops = [
    ...planMove(from, targets[0], workflow, { issueType }).map((r) => r.names),
    targets,
  ];
  const visited = new Set([key(from)]);
  const done = [];
  let current = from;

  const incomplete = (i, reason) => ({
    transitioned: false, reason,
    from, landed: current, remaining: hops.slice(i), hops: done,
  });

  for (let i = 0; i < hops.length; i++) {
    const rung = hops[i];                        // an array of names
    // Cycle guard. This RETURNS the walk-incomplete shape — it must never
    // `break` into the success return below, which would report an aborted
    // cycle as `walked` and erase the distinction three-outcome reporting
    // exists to preserve.
    if (rung.some((n) => visited.has(key(n)))) return incomplete(i, "walk-incomplete");
    const isLast = i === hops.length - 1;

    const transitions = await getTransitions({ http, baseUrl, email, token, issueKey });
    const res = await transitionToStatus({
      /* … */
      targetStatus: rung,
      currentStatus: current,
      // The guard runs ONCE, at entry, against the final target's rank. An
      // intermediate rung is by construction not that rank, so a per-hop guard
      // would refuse either the gate or the final hop.
      minRank: i === 0 ? rankOf(targets[0], workflow, { issueType }) : null,
      allowRegress: i === 0 ? allowRegress : true,
      transitions,
    });

    if (res.transitioned) {
      // `landed` is always a STRING. transitionToStatus returns `to` on success
      // (:2554), but fall back to the rung's first name rather than the rung
      // object — an object here propagates into the next hop's currentStatus.
      current = res.to || rung[0];
      visited.add(key(current));
      done.push({ index: i, to: current, result: "transitioned" });
      continue;
    }
    if (res.reason === "already") { done.push({ index: i, result: "already" }); continue; }

    done.push({ index: i, result: res.reason, candidates: rung });
    return incomplete(i, isLast && i === 0 ? res.reason : "walk-incomplete");
  }
  return { transitioned: current !== from, reason: "walked", from, landed: current, hops: done };
}
```

Notes:

- `transitionToStatus` has **no** `transitions` parameter today — the signature (`:2306-2323`) does
  not accept one and it always fetches its own at `:2388`. Add it. Passing one without adding it is
  silently dropped, giving two GETs per hop and `1 + 3n` calls against the `1 + 2n` the task asserts.
- **Do not** reimplement worklog retry, `buildTransitionFields`, or the required-field refusal.
  Every hop goes through `transitionToStatus` so those stay in one place.
- `reason` when the *first and only* hop fails is the existing reason (`no-transition`, etc.), not
  `walk-incomplete` — a one-rung ladder must produce byte-identical output to today.
- **Ladder-aware rank.** The monotonicity guard (`:2373-2386`) ranks via `resolveStatusRank`
  (`:2035`), which reads the JSON record's `statusRank` then `DEFAULT_STATUS_RANK` — and that
  constant's comment (`:1421-1423`) names "READY FOR SHOWCASE" as exactly the kind of column it
  leaves unranked. Insert a ladder lookup ahead of both so a declared rung finally has a rank:

  ```js
  function resolveStatusRank(statusName, record, workflow, issueType) {
    if (workflow) {
      const r = rankOf(statusName, workflow, { issueType });
      if (r != null) return r;
    }
    /* …existing record lookup, then DEFAULT_STATUS_RANK… */
  }
  ```

  Ladder first, existing chain preserved beneath: any status already ranked keeps its rank and its
  behaviour, so only previously-unranked declared columns change. This guard is shared by document,
  epic, story and task sync — the regression signal is their existing tests passing unchanged.

### Phase 3: `jira-stage.js` wiring

Resolve the target with a fallback chain:

```js
const workflow = tw.loadWorkflow({});                     // task.37
const moment = tw.resolveMoment(args.stage, workflow, { issueType });
const spec = moment
  ? {
      // `targets` — PLURAL. There is no `target` field on the result, and
      // reducing it to targets[0] is the regression task.37 exists to prevent.
      candidates: moment.targets,
      rank: moment.rank,
      // `done` is the only moment DEFAULT_STAGE_MAP marks terminal (:1409-1414);
      // position comes from the ladder. Both conditions, or rule 4 stays shut.
      terminal: lib.isTerminalMoment(args.stage) && moment.isLastRung,
      enabled: true,
    }
  : lib.resolveStage({ stage: args.stage, issueType, record });   // legacy JSON record
if (!moment && !spec.enabled) { /* stage-disabled, unchanged */ }
```

`--print-plan` — no credentials, no network, before `getAuth()`:

```js
if (args.printPlan) {
  const m = tw.resolveMoment(args.stage, workflow, { issueType: args.issueType || "" });
  const from = args.from || "";
  output.emit({
    stage: args.stage,
    targets: m ? m.targets : null,
    // planMove needs a starting point. Absent --from it returns [], so the plan
    // is the target rung alone — say so explicitly rather than letting a reader
    // mistake a one-element plan for "this moment is one hop from here".
    hops: m ? [...tw.planMove(from, m.targets[0], workflow,
                              { issueType: args.issueType || "" }).map((r) => r.names),
               m.targets] : [],
    from: from || null,
    spansFrom: !!from,
    isLastRung: m ? m.isLastRung : null,
    source: workflow.source,
  });
  return { exitCode: 0 };
}
```

`--from <status>` is a new flag in `parseArgs` (`jira-stage.js:34-43`). Without it every plan is a
single rung, which makes Phase 4's "more than one hop → hand it to a human" rule unreachable — the
condition it branches on can never be true. Add `--from` and `--print-plan` to the `USAGE` const
(`:84-85`) and to the header's usage and exit-code block (`:16-27`) in the same change.

This is what `jira-transition-protocol.md` consumes, so it must run before the `auth.ok` check —
the fallback exists *because* credentials are absent. Note `output.emit` writes unconditionally
(it does not check `--json`), which is what makes it usable as a machine-readable flag on its own.

`--dry-run` — amend the header comment, which currently claims:

> "so the whole ladder can be re-verified against a live board without moving anything"

That is no longer true with multi-hop. Replace with a note that hop 1 is verified against live
transitions and later hops are `unverified (depends on hop 1)`, because the transitions available
after a hop are not observable until it fires. Print them as such; never claim a destination.

### Phase 4: MCP fallback prose

`shared/resources/jira-transition-protocol.md`:

- §Inputs: candidates come from `jira-stage.js --stage X --from "<current status>" --print-plan`;
  keep the three hardcoded lists as the no-file default so `transition-protocol-parity.test.mjs`
  still binds. State that `--from` is required for the plan to span more than one rung — the model
  already has the card's status from the MCP read it performs first, so passing it costs nothing,
  and omitting it makes the ladder check below silently inert.
- §"What this fallback cannot do", two new bullets:
  - **Ladders.** If `--print-plan` returns more than one hop, log
    `"this moment needs a multi-hop walk the MCP fallback cannot perform; move the card by hand"`
    and return. A model firing hop 1 and stopping, or skipping the gate, is worse than not trying.
  - **The terminal override.** If the plan's target is not the ladder's last rung, treat `terminal`
    as false and do **not** use rule 5.
- Add to §"Hard rules — MUST NOT": *MUST NOT perform more than one transition per invocation, even
  when the plan lists several.*

### Phase 5: Tests

`shared/resources/tests/jira-stage.test.mjs` — hand-built transition lists for walking, partial
walks, cycles (asserting `walk-incomplete`, not `walked`), entry-only guard, multi-name rungs
resolving via a non-first name, and the retargeted-`done` skip.

`shared/resources/tests/tracker-workflow.test.mjs` — `isLastRung`, including under a `byIssueType`
overlay whose ladder is a different length from the base. That case is the whole reason the field
lives in the engine rather than at the call site, so it must be covered directly.

`shared/resources/tests/jira-stage-fixtures.test.mjs` — the real-payload proof.

**Only hop 1 is captured.** The two `Ready for Showcase` transitions in the existing data are both
transitions *into* the column:

| Fixture | Transition | From → To | Serves |
| --- | --- | --- | --- |
| `rapp-story-in-progress.json` | `id=21 "Ready for Showcase"` | In Progress → `READY FOR SHOWCASE` | **hop 1** ✓ |
| `rapp-story-waiting-for-review.json` | `id=151 "Ready for Showcase"` | Waiting for Review → `READY FOR SHOWCASE` | neither — wrong source column, wrong direction |

Hop 2 needs the transitions available **from** `READY FOR SHOWCASE`, which are captured nowhere.
Whether that column offers any route onward to `Waiting for Review` is unverified until the capture
is taken — if it does not, the demo walk must be re-chosen and §6 Phase 5 / §8 rewritten around
whatever path the board actually offers.

**Capture `rapp-story-ready-for-showcase.json` first**, using the query documented in the fixtures
test header. It needs a real issue parked in `READY FOR SHOWCASE`, so it is an external dependency —
start it before the rest of Phase 5.

Then add a ladder placing `Ready for Showcase` between `In Progress` and `Waiting for Review` and
assert the walk visits it. Note the destination is **UPPERCASE** on this board — that is the
case-insensitivity test, not an incidental detail.

`evals/shared/tests/transition-protocol-parity.test.mjs` — assert `--print-plan`'s default output
matches the prose literals for the three default moments, in both the `--from` and no-`--from`
shapes.

## Key Patterns and References

All line numbers re-verified 2026-08-05. Earlier drafts cited pre-task.37 positions in
`jira-sync.js`, roughly 130 lines low; the `jira-stage.js` references were and remain correct.

- `resolveTransition` — `jira-sync.js:2194-2252`. Unchanged; the walk calls it per hop, passing the
  rung's name array straight through as `candidates`.
- `transitionToStatus` — `:2306`. Reused per hop; add an optional `transitions` param (it has none
  today and fetches its own at `:2388`).
- Monotonicity guard — `:2373-2390`. Note `currentRank != null && currentRank > minRank`: unranked
  means allow. It ranks via `resolveStatusRank` (`:2035`), which is **ladder-blind** — teaching it
  the ladder is a Phase 2 change, not something the ladder delivers for free.
- `DEFAULT_STAGE_MAP` — `:1388-1415`. `done` carries the only `terminal: true`.
- `DEFAULT_STATUS_RANK` — `:1421-1437`, and read its comment: it names "READY FOR SHOWCASE" as the
  kind of column it deliberately leaves unranked.
- `describeAlternatives` — `jira-stage.js:87-110`. Keep it; on a partial walk it explains what the
  gate column *did* offer.
- Exit-code contract — `jira-stage.js:19-27`. Do not change it; four step files depend on it.
- `tracker-workflow.js`: `ladderFor` `:523` (unexported — hence `isLastRung` lives in the engine),
  `rankOf` `:567`, `resolveMoment` `:583`, `describeTarget` `:645` (the `targets`/`rank`/`offLadder`
  return this task extends), `planMove` `:681` (returns `{ names: [...] }` rungs), exports `:841`.
  There is **no** `namesFor` and **no** `norm`.

## Testing Approach

- `node --test 'shared/resources/tests/*.test.mjs'` throughout.
- `npm test` before commit; the existing fixture assertions passing **unchanged** is the primary
  regression signal. The guard tests of the other `transitionToStatus` callers — document, epic,
  story and task sync — are the regression signal for the ladder-aware rank change specifically.
- Assert API call counts: a one-rung ladder must issue exactly the calls it does today.
- Manual, read-only, against a real board: `--print-plan --from "<status>"` for every moment
  (offline), then `--dry-run` for one issue per column.
- `npm run bundle` before commit — `jira-sync.js`, `jira-stage.js` and `jira-transition-protocol.md`
  all have bundled `references/` copies across 6-11 skills, and `tracker-workflow.js` becomes a new
  transitive dependency once `jira-stage.js` requires it.
