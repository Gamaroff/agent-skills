---
id: task.55
title: '[Task 55] Build the Jira comment endpoint that does not exist, and stop routing ~20 comments through prose'
type: task
description: 'jira-sync.js has no comment function at all — there is a deliberate refusal in the source. Every Jira comment in this repository is an Atlassian MCP call made by an agent following prose, because there is no code path to intercept. This adds addComment() and a tracker-comment.js CLI covering both trackers, then replaces the ~20 inline prose comment blocks with one CLI call each. The MCP path survives as the documented no-credentials fallback, exactly as jira-stage.js already established. Load-bearing for restricted access, and independently valuable: it lets comments be retried by code rather than by the model.'
tags: [restricted-access, jira, github, comments, cli, mcp]
category: refactoring
status: planned
priority: High
risk_level: high
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 12
github_issue: 233
---

# [Task 55] Build the Jira comment endpoint that does not exist, and stop routing ~20 comments through prose

**Task File**: [task.55.tracker-comment-cli.md](./task.55.tracker-comment-cli.md)

**GitHub Issue**: [#233](https://github.com/Gamaroff/agent-skills/issues/233)

## Overview

Fifth of seven (51–57), and the load-bearing one. Depends on 51, 52 and 53.

## Motivation

### There is nothing to intercept

`shared/resources/jira-sync.js` contains no comment endpoint. There is a deliberate refusal in the
source around `:3073` (`// No 'comment' (API v3 wants ADF there…)`). So **every Jira comment in this
repository is an MCP call** — roughly 20 `addCommentToJiraIssue` invocations spread across eight
canonical files, each written out as prose the agent follows, plus one stray `curl` at
`skills/review-task/SKILL.md:1652` that does it differently from all the others.

This is not a stylistic accident to be tidied. It is a **missing function**, and it is why comments
cannot be intercepted by any of the chokepoints tasks 53 and 54 use.

### Why a prose rule will not do

The obvious alternative — instruct the agent "when access is manual, record instead of calling" —
fails, and this repo has already written down why, twice:

- `jira-transition-protocol.md`: the matching loop *"is delegated to an LLM… Without explicit guard
  rails the model has been observed picking a non-matching transition… **Moving the primary path
  into `jira-stage.js` is the more durable fix** — the guard rails below only bind a model that
  reads them."*
- `verify-push-state.sh`: *"the failure mode is not disobedience, it is reporting an intention as an
  accomplishment without looking."*

An access mode enforced only by prose fails the same way, and it fails **silently** — which is the
specific harm this sequence exists to remove.

### The move: delete the choice rather than govern it

Make the CLI the primary path. Then the MCP call is no longer a decision the model makes under a
policy; it is the same documented `no-credentials` fallback `jira-stage.js` already established — a
pattern the step docs already use in six places, and which the agent is already trained by those
docs to follow: run the CLI, read `reason`, branch to MCP only on `no-credentials`.

### Worth doing even with full access

Independently of restricted access this removes a hard MCP dependency from the credentialed path,
consolidates 20 hand-written call sites that have already drifted (one of them uses `curl` and REST
v2 while the rest use MCP), and lets the comment be retried **by code** — closing the gap
`resolve-platform.sh:64-68` currently apologises for, where the shell retry helper "cannot wrap
Atlassian MCP tool invocations".

## Scope

**In scope:** `addComment()` in `jira-sync.js` with ADF rendering; `tracker-comment.js` covering Jira
and GitHub issue comments; replacing the ~20 prose sites; the comment-identity marker; the parity
guard.

**Out of scope:** PR comments (VCS). The MCP fallback itself stays, documented and narrowed.

## Decisions

| Decision | Why |
| -------- | --- |
| **Build `addComment()` rather than keep MCP as primary** | You cannot intercept what has no code path. Everything else follows from this. |
| **A `tracker-comment.js` CLI, peer of `jira-stage.js` / `gh-stage.js`** | Same exit-0-with-`reason` contract, same `--json`, same vocabulary. The step docs already know how to consume that shape, so ~20 rewrites are mechanical rather than inventive. |
| **MCP demoted to the `no-credentials` fallback** | Preserves today's behaviour for MCP-only consumers while removing MCP from the primary path. Reuses a compliance pattern that already works instead of inventing one. |
| **A comment-identity marker, and Jira needs a different one** | Idempotency requires knowing "have I already posted this?". GitHub and Bitbucket take an invisible HTML comment. **Jira does not** — ADF drops unknown nodes — so Jira gets a small italic footer, visible but unobtrusive, which survives a human pasting the body by hand. |
| **An ambiguous marker match resolves to `unverifiable`, never `satisfied`** | Directly descended from the "picked To Do because it was first" bug. On two or more matches, do not guess. |
| **A parity guard asserting no bare `addCommentToJiraIssue` in canonical prose** | Extends the existing `transition-protocol-parity.test.mjs` idea. Without it the 20 sites grow back one PR at a time. Allowlist: the protocol doc's own examples. |

## Implementation Plan

1. **`addComment()`** in `jira-sync.js` — reuse the existing markdown→ADF renderer; goes through
   `http()`, so task.53's layers cover it for free.
2. **`shared/resources/tracker-comment.js`** — `--issue <key|#N> --body-file <path> --moment <name>
   [--json] [--dry-run]`. Branches on `TRACKER`; reason vocabulary `posted` | `no-credentials` |
   `deferred` | `already` (marker found) | `no-issue`.
3. **The marker** — HTML comment for GitHub; italic footer for Jira; fingerprint from the record.
4. **Rewrite ~20 sites** across the eight canonical files: the six `develop-pipeline-step-*.md`, plus
   `finalise`, `qa-story`, `qa-task`, `qa-fix`, `review-story`, `review-task`, `review-bug`,
   `create-pr`. Each inline MCP block becomes one CLI call plus a `reason` branch.
5. **`skills/review-task/SKILL.md:1652`** — the stray `curl` REST v2 site folds into the CLI, removing
   the inconsistency.
6. **The parity guard**, extending the existing test.
7. Tests, docs, `npm run bundle`.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/jira-sync.js` | `addComment()` + ADF |
| `shared/resources/tracker-comment.js` | **new** CLI |
| `shared/resources/develop-pipeline-step-{0,2,3,4,5-6,7}*.md` | ~12 sites |
| `skills/{finalise,qa-story,qa-task,qa-fix,review-story,review-task,review-bug,create-pr}/SKILL.md` | ~8 sites |
| `shared/resources/jira-transition-protocol.md` | narrow the fallback's remit; document the comment fallback |
| `evals/shared/tests/transition-protocol-parity.test.mjs` | extend with the bare-MCP guard |
| `shared/resources/tests/tracker-comment.test.mjs` | **new** |

## Testing Strategy

| Case | Asserted |
| ---- | -------- |
| `full` + Jira credentials | Posts via REST; **no MCP call** |
| `full` + GitHub | Delegates to `gh issue comment` |
| `full`, Jira, no credentials | `reason: "no-credentials"` — and only then may the step doc use MCP |
| `manual` / `command` / `read-only` | `reason: "deferred"`; one record; no network |
| Marker already present | `reason: "already"`; not posted twice |
| Two markers match | `unverifiable`, never `satisfied` |
| Markdown → ADF | Round-trips headings, tables, code fences and links |
| Body with backticks, `$(…)`, CRLF | Passed by file, never interpolated into a shell string |
| Canonical prose | **No bare `addCommentToJiraIssue`** outside the allowlist |

**Mutation-prove:** keep MCP primary at one site → the parity guard → red · drop the marker → the
idempotency test → red · pick the first of two matches → the ambiguity test → red · post under
`manual` → the no-network test → red · use the HTML marker for Jira → the ADF round-trip test → red.

## Success Criteria

- [ ] `addComment()` exists and posts a correctly rendered ADF comment
- [ ] `tracker-comment.js` covers both trackers with the established `reason` contract
- [ ] All ~20 prose sites route through the CLI; the stray `curl` site is gone
- [ ] MCP survives **only** as the `no-credentials` fallback, documented as such
- [ ] Comments are idempotent via a marker; ambiguity resolves to `unverifiable`
- [ ] The parity guard fails if a bare MCP comment call reappears
- [ ] Under a deferring mode nothing is posted and one record is written per comment
- [ ] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

## Risk Assessment

**High** — 20 call sites across eight files, on the pipeline's most frequently exercised path.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **A rewritten site posts nothing and nobody notices** | Comments are non-blocking by policy, so a silent failure looks like success | Each site branches on `reason`; the parity guard catches un-rewritten sites; the eval suite asserts the comment moments still fire |
| **ADF rendering differs from the MCP-rendered comment** | Different renderer, same content | Round-trip tests on headings, tables, fences and links; the existing ADF renderer is reused rather than rewritten |
| **A visible Jira footer annoys consumers** | It is visible by necessity | Small, italic, one line; documented, and it is what makes "already posted?" answerable without paging every comment |
| **The 20 sites regrow** | The next feature adds a comment the old way | The parity guard; a note at the top of the protocol doc |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. The revert restores the MCP-primary path, which is today's
behaviour — so a `full`-access consumer is unaffected either way.

## References

- [`shared/resources/jira-transition-protocol.md`](../../../shared/resources/jira-transition-protocol.md) — the fallback pattern and its guard rails
- [`shared/resources/resolve-platform.sh:64-68`](../../../shared/resources/resolve-platform.sh) — the MCP-retry gap this closes
