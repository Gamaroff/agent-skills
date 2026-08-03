---
name: jira-transition-protocol
description: Jira transition matching algorithm for the MCP fallback path. Used by a develop-pipeline step ONLY when jira-stage.js reports no-credentials. Prevents the LLM from inventing a fallback transition when no name matches, and fills the fields a transition screen requires.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/jira-transition-protocol.md. Regenerate via `npm run bundle`. -->

# Jira Transition Protocol — strict matching, no fallbacks

> **This is the fallback path, not the primary one.** A develop-pipeline step first runs
> `references/jira-stage.js --issue <KEY> --stage <stage>`, which implements everything below
> in code. Follow this document **only** when that CLI reports `reason: "no-credentials"` — i.e. the
> project has the Atlassian MCP connector but no `JIRA_*` env. Do not run both: the CLI is
> authoritative whenever credentials exist.

This protocol defines exactly how to transition a Jira issue via `getTransitionsForJiraIssue` + `transitionJiraIssue` when that fallback applies.

The matching loop is delegated to an LLM. Without explicit guard rails the model has been observed picking a non-matching transition (e.g. selecting `To Do` because it was first in the returned list when `In Review` was absent). The MUST-NOT clauses below close that hole. Moving the primary path into `jira-stage.js` is the more durable fix — the guard rails below only bind a model that reads them.

This mirrors `resolveTransition` / `buildTransitionFields` in `jira-sync.js`. **The two must stay in step** — same order, same rules, same refusals. That is asserted by a test (`evals/shared/tests/transition-protocol-parity.test.mjs`), not left to discipline: the candidate lists quoted below are compared against the JS constants on every run.

### What this fallback cannot do

- **Workflow validators.** A transition that demands time logged (see below) cannot be satisfied through the MCP tools, which offer no way to attach a worklog to the transition request. The CLI can; this path cannot. Move such a card by hand.
- **The monotonicity guard.** The CLI refuses to move a card backwards down the stage ladder. Following this document, that check is yours to make: read the current status first, and do not transition an issue that is already past the stage you were asked to signal.

## Inputs

- `cloudId`: derived from `JIRA_URL` hostname (e.g. `your-site.atlassian.net`).
- `issueIdOrKey`: the Jira key (e.g. `RB-15`).
- `candidates`: ordered list of acceptable status names (case-insensitive). Jira workflows name the same stage very differently, so each list covers the common vocabularies:
  - Signal Work Started → `["In Progress", "Doing", "Started", "Development"]`
  - PR opened → `["In Review", "Code Review", "Ready for Review", "Waiting for Review", "Peer Review", "Review"]`
  - Finalise → `["Done", "Closed", "Resolved", "Complete", "Completed"]`
- `terminal`: `true` only for the Finalise step (and any cancel/won't-do step). Unlocks rule 4 below.

## Algorithm (MUST follow exactly)

1. Call `getTransitionsForJiraIssue` with `cloudId`, `issueIdOrKey`, and **`expand: "transitions.fields"`**. Capture the returned `transitions` array. The expand is what makes a transition's required fields visible; without it, a transition screen that requires a field returns a bare HTTP 400 with no way to know what was missing.
2. **Already satisfied.** Read the issue's current status. If it case-insensitively equals any `candidate`, log `✅ <issueKey> is already <status>` and **return without calling `transitionJiraIssue`**.
3. **Destination match.** For each `candidate` in order, find `t` in `transitions` where `t.to.name.toLowerCase() === candidate.toLowerCase()`. First hit wins; record `matched`.
4. **Action match.** Only if step 3 found nothing: for each `candidate` in order, find `t` where `t.name.toLowerCase() === candidate.toLowerCase()`. First hit wins.
   > Destinations are exhausted across **all** candidates before any action name is considered. Workflows routinely name the action rather than the destination — an `Implemented` transition leading to `Waiting for Review` — but where both exist the destination is the more reliable signal.
5. **Terminal-only category fallback.** Only if `terminal` is true and steps 3–4 found nothing: collect the transitions whose `t.to.statusCategory.key === "done"`. If **exactly one** exists, use it. If two or more exist, do **not** guess — treat as no match.
6. If nothing matched:
   - Log `⚠️ No transition matching [<candidates>] available for <issueKey>. Available: [<t.name → t.to.name list>]. Skipping.`
   - **Return without calling `transitionJiraIssue`.** Non-blocking — the pipeline continues.
7. If `matched` is set, inspect `matched.fields` for entries with `required: true`:
   - **`resolution`** — pick from that transition's own `allowedValues` by name: prefer `Done` / `Resolved` / `Fixed` for a positive finish, `Won't Do` / `Cancelled` / `Declined` for a cancellation. If none of those appear, use the first entry in `allowedValues`. Send it as `fields: { resolution: { id: "<id>" } }`.
   - **Any other required field** — do **not** call `transitionJiraIssue`. Log `⚠️ Transition "<name>" requires field(s) this pipeline cannot fill: [<keys>]. Skipping.` and return. Firing a request the workflow has already declared incomplete buys nothing.
8. Call `transitionJiraIssue` with `cloudId`, `issueIdOrKey`, `transition: { id: matched.id }`, and the `fields` object from step 7 **only if it is non-empty**. Log `✅ Jira issue <issueKey> moved to <matched.to.name>`.
9. Post-condition: call `getJiraIssue` with `fields: ["status"]` and confirm `fields.status.name` equals `matched.to.name`. If mismatch, log a warning and continue.

## Hard rules — MUST NOT

- **MUST NOT** call `transitionJiraIssue` with any transition id that was not produced by steps 3–5.
- **MUST NOT** pick the first / closest / "most plausible" transition as a fallback.
- **MUST NOT** infer a transition by status-category for a **non-terminal** step — match the **name** only. Step 5 is a deliberately narrow exception: terminal steps only, and only when exactly one done-category transition exists.
- **MUST NOT** invent a value for a required field that is not `resolution`, and MUST NOT send a value that is absent from that field's own `allowedValues`.
- **MUST NOT** silently retry with a different transition id after a successful API call. One transition per step invocation.
- **MUST NOT** treat the absence of a matching transition as a failure — it is a documented non-blocking skip. The pipeline continues.

## Why the category fallback is restricted to terminal steps

Allowing a status-category fallback for `new` and `indeterminate` was tried and rejected. Dry-run against a real board: `ready-for-review` resolved to **In Progress**, and `in-progress` resolved to **Waiting for Review**, because those categories routinely hold several unrelated states and "the only indeterminate transition" is not the same thing as "the right one". A skipped status change is recoverable; a confident wrong transition is not.

`done` is different: a workflow has one way to be finished far more often than not, and the "exactly one" condition makes the ambiguous case a skip anyway.

## Anti-example (what the bug looked like)

Workflow has transitions `[To Do (id=11), In Progress (id=21), Done (id=31)]`. The PR-opened step tries its review candidates. None match. Buggy LLM behaviour: calls `transitionJiraIssue` with `transition.id = "11"` ("To Do") as a "reasonable default", silently reverting an `In Progress` issue back to `To Do`. Correct behaviour: log the skip and return without calling `transitionJiraIssue`.

## Workflow validators are invisible here

A required **field** shows up in `matched.fields`. A workflow **validator** (e.g. "time spent must be logged before this transition") does not — it surfaces only as an HTTP 400 on the transition call, naming the thing it wants. When that happens, the value must be supplied **in the same request** as the transition; posting it separately first and then re-transitioning does not satisfy the validator. Log the message verbatim so the cause is visible, and treat it as a non-blocking skip.

## Workflow without a review state

If the Jira workflow legitimately lacks a review-phase transition (small projects often do), the PR-opened step SHOULD be a no-op for the transition portion — the `addCommentToJiraIssue` portion still runs. The issue remains `In Progress` through QA and is moved to `Done` at Finalise. This is the intended fallback.
