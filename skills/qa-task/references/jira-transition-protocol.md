---
name: jira-transition-protocol
description: Deterministic Jira transition matching algorithm. Referenced by every develop-pipeline step that transitions a Jira issue via the Atlassian MCP tools. Prevents the LLM from inventing a fallback transition when no name matches.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/jira-transition-protocol.md. Regenerate via `npm run bundle`. -->

# Jira Transition Protocol — strict matching, no fallbacks

This protocol defines exactly how to transition a Jira issue via `getTransitionsForJiraIssue` + `transitionJiraIssue`. **Every develop-pipeline step that performs a Jira transition MUST follow it verbatim.**

The matching loop is delegated to an LLM. Without explicit guard rails the model has been observed picking a non-matching transition (e.g. selecting `To Do` because it was first in the returned list when `In Review` was absent). The MUST-NOT clauses below close that hole.

## Inputs

- `cloudId`: derived from `JIRA_URL` hostname (e.g. `mediastreamag.atlassian.net`).
- `issueIdOrKey`: the Jira key (e.g. `RB-15`).
- `candidates`: ordered list of acceptable transition names (case-insensitive). Examples:
  - Signal Work Started → `["In Progress"]`
  - PR opened → `["In Review", "Code Review", "Ready for Review"]`
  - Finalise → `["Done", "Closed", "Resolved"]`

## Algorithm (MUST follow exactly)

1. Call `getTransitionsForJiraIssue` with `cloudId` and `issueIdOrKey`. Capture the returned `transitions` array.
2. For each `candidate` in `candidates` (in order):
   1. Find `t` in `transitions` where `t.to.name.toLowerCase() === candidate.toLowerCase()`. If found, record `matched = t` and break.
   2. Else find `t` in `transitions` where `t.name.toLowerCase() === candidate.toLowerCase()`. If found, record `matched = t` and break.
3. If `matched` is unset after the loop:
   - Log `⚠️ No transition matching [<candidates>] available for <issueKey>. Available: [<list of t.to.name>]. Skipping.`
   - **Return without calling `transitionJiraIssue`.** Non-blocking — the pipeline continues.
4. If `matched` is set:
   - Call `transitionJiraIssue` with `cloudId`, `issueIdOrKey`, and `transition: { id: matched.id }`.
   - Log `✅ Jira issue <issueKey> moved to <matched.to.name>`.
5. Post-condition: call `getJiraIssue` with `fields: ["status"]` and confirm `fields.status.name` equals `matched.to.name`. If mismatch, log a warning and continue.

## Hard rules — MUST NOT

- **MUST NOT** call `transitionJiraIssue` with any transition id that was not produced by the exact-name match in step 2.
- **MUST NOT** pick the first / closest / "most plausible" transition as a fallback.
- **MUST NOT** infer a transition by status-category (`new` / `indeterminate` / `done`) — match the **name** only.
- **MUST NOT** silently retry with a different transition id after a successful API call. One transition per step invocation.
- **MUST NOT** treat the absence of a matching transition as a failure — it is a documented non-blocking skip. The pipeline continues.

## Anti-example (what the bug looked like)

Workflow has transitions `[To Do (id=11), In Progress (id=21), Done (id=31)]`. Step 4 tries `candidates = ["In Review", "Code Review", "Ready for Review"]`. None match. Buggy LLM behaviour: calls `transitionJiraIssue` with `transition.id = "11"` ("To Do") as a "reasonable default", silently reverting an `In Progress` issue back to `To Do`. Correct behaviour: log the skip and return without calling `transitionJiraIssue`.

## Workflow without a review state

If the Jira workflow legitimately lacks a review-phase transition (small projects often do), Step 4 SHOULD be a no-op for the transition portion — the `addCommentToJiraIssue` portion still runs. The issue remains `In Progress` through QA and is moved to `Done` at Step 7. This is the intended fallback.
