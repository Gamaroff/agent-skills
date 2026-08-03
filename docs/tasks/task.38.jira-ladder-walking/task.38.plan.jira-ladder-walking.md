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

### Phase 1: Last-rung restriction on the terminal fallback

**File:** `shared/resources/jira-sync.js`

`resolveStage` currently ends (L1896):

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
"confident wrong transition" the resolver's own comment (L2085-2092 and the doc at
`configuration.md:248`) says is worse than a skip.

**Change**: compute `terminal` at the call site from the ladder, not from `DEFAULT_STAGE_MAP`:

```js
// Rule 4 asks "is there exactly one way to finish?" — a question that only has
// a right answer when the target IS the finish. Once a project points `done` at
// an earlier column, the single done-category transition is by definition NOT
// what was asked for.
const isLastRung = rankOf(target, workflow) === workflow.ladder.length - 1;
const terminal = spec.terminal && isLastRung;
```

Leave `jira-stage.js:249` alone:

```js
localStatus: spec.terminal ? "accepted" : args.stage,
```

With `terminal:false` this yields the literal `"done"`, which **is** in `TERMINAL_LOCAL_STATUSES`
(L1452), so positive-resolution preference still applies when filling a required `resolution` field.
Correct by accident, but correct — "fixing" it breaks resolution filling on retargeted terminals.

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
async function walkLadder({
  http, baseUrl, email, token, issueKey,
  from, target, workflow, output,
  doneResolution, cancelledResolution, worklogTimeSpent,
  allowRegress = false,
}) {
  const hops = [...planMove(from, target, workflow), target];
  const visited = new Set([norm(from)]);
  const done = [];
  let current = from;

  for (let i = 0; i < hops.length; i++) {
    const rung = hops[i];
    if (visited.has(norm(rung))) break;          // cycle guard
    const isLast = i === hops.length - 1;

    const transitions = await getTransitions({ http, baseUrl, email, token, issueKey });
    const res = await transitionToStatus({
      /* … */
      targetStatus: namesFor(rung, workflow),
      currentStatus: current,
      // The guard runs ONCE, at entry, against the final target's rank. An
      // intermediate rung is by construction not that rank, so a per-hop guard
      // would refuse either the gate or the final hop.
      minRank: i === 0 ? rankOf(target, workflow) : null,
      allowRegress: i === 0 ? allowRegress : true,
      transitions,
    });

    if (res.transitioned) {
      current = res.to || rung;
      visited.add(norm(current));
      done.push({ index: i, to: current, result: "transitioned" });
      continue;
    }
    if (res.reason === "already") { done.push({ index: i, result: "already" }); continue; }

    done.push({ index: i, result: res.reason, candidates: namesFor(rung, workflow) });
    return {
      transitioned: false,
      reason: isLast && i === 0 ? res.reason : "walk-incomplete",
      from, landed: current, remaining: hops.slice(i), hops: done,
    };
  }
  return { transitioned: current !== from, reason: "walked", from, landed: current, hops: done };
}
```

Notes:

- `transitionToStatus` needs an optional `transitions` parameter so the walk can supply the list it
  already fetched, avoiding a duplicate GET per hop. If threading it is awkward, accept `2n+1` calls
  and assert the count in a test — correctness first.
- **Do not** reimplement worklog retry, `buildTransitionFields`, or the required-field refusal.
  Every hop goes through `transitionToStatus` so those stay in one place.
- `reason` when the *first and only* hop fails is the existing reason (`no-transition`, etc.), not
  `walk-incomplete` — a one-rung ladder must produce byte-identical output to today.

### Phase 3: `jira-stage.js` wiring

Resolve the target with a fallback chain:

```js
const workflow = tw.loadWorkflow({});                     // task.37
const moment = tw.resolveMoment(args.stage, workflow, { issueType });
const spec = moment
  ? { candidates: tw.namesFor(moment.target, workflow), rank: moment.rank, terminal: … }
  : lib.resolveStage({ stage: args.stage, issueType, record });   // legacy JSON record
if (!moment && !spec.enabled) { /* stage-disabled, unchanged */ }
```

`--print-plan` — no credentials, no network, before `getAuth()`:

```js
if (args.printPlan) {
  const m = tw.resolveMoment(args.stage, workflow, { issueType: args.issueType || "" });
  output.emit({ stage: args.stage, target: m?.target ?? null,
                hops: m ? [...tw.planMove(args.from || "", m.target, workflow), m.target] : [],
                source: workflow.source });
  return { exitCode: 0 };
}
```

This is what `jira-transition-protocol.md` consumes, so it must run before the `auth.ok` check —
the fallback exists *because* credentials are absent.

`--dry-run` — amend the header comment, which currently claims:

> "so the whole ladder can be re-verified against a live board without moving anything"

That is no longer true with multi-hop. Replace with a note that hop 1 is verified against live
transitions and later hops are `unverified (depends on hop 1)`, because the transitions available
after a hop are not observable until it fires. Print them as such; never claim a destination.

### Phase 4: MCP fallback prose

`shared/resources/jira-transition-protocol.md`:

- §Inputs: candidates come from `jira-stage.js --stage X --print-plan`; keep the three hardcoded
  lists as the no-file default so `transition-protocol-parity.test.mjs` still binds.
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
walks, cycles, entry-only guard, and the retargeted-`done` skip.

`shared/resources/tests/jira-stage-fixtures.test.mjs` — the real-payload proof. Both hops already
exist in the captured RAPP data:

| Fixture | Transition | → |
| --- | --- | --- |
| `rapp-story-in-progress.json` | `id=21 "Ready for Showcase"` | `READY FOR SHOWCASE` |
| `rapp-story-waiting-for-review.json` | `id=151 "Ready for Showcase"` | `READY FOR SHOWCASE` |

Add a ladder that places `Ready for Showcase` between `In Progress` and `Waiting for Review`, then
assert the walk visits it. Note the destination is **UPPERCASE** on this board — that is the
case-insensitivity test, not an incidental detail. One new fixture is needed
(`rapp-story-ready-for-showcase.json`) for the transitions available *from* the showcase column;
capture it with the query documented in the fixtures test header.

`evals/shared/tests/transition-protocol-parity.test.mjs` — assert `--print-plan`'s default output
matches the prose literals for the three default moments.

## Key Patterns and References

- `resolveTransition` — `jira-sync.js:2062-2095`. Unchanged; the walk calls it per hop.
- `transitionToStatus` — `:2174`. Reused per hop; add an optional `transitions` param.
- Monotonicity guard — `:2241-2256`. Note `currentRank != null && currentRank > minRank`: unranked
  means allow. The ladder is what finally gives bespoke columns a rank.
- `describeAlternatives` — `jira-stage.js:87-110`. Keep it; on a partial walk it explains what the
  gate column *did* offer.
- Exit-code contract — `jira-stage.js:19-27`. Do not change it; four step files depend on it.

## Testing Approach

- `node --test 'shared/resources/tests/*.test.mjs'` throughout.
- `npm test` before commit; the existing fixture assertions passing **unchanged** is the primary
  regression signal.
- Assert API call counts: a one-rung ladder must issue exactly the calls it does today.
- Manual, read-only, against a real board: `--print-plan` for every moment (offline), then
  `--dry-run` for one issue per column.
