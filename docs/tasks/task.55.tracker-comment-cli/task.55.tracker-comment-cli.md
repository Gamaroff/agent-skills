---
id: task.55
title: '[Task 55] Build the Jira comment endpoint that does not exist, and stop routing ~20 comments through prose'
type: task
description: 'jira-sync.js has no comment function at all — there is a deliberate refusal in the source. Every Jira comment in this repository is an Atlassian MCP call made by an agent following prose, because there is no code path to intercept. This adds addComment() and a tracker-comment.js CLI covering both trackers, then replaces the ~20 inline prose comment blocks with one CLI call each. The MCP path survives as the documented no-credentials fallback, exactly as jira-stage.js already established. Load-bearing for restricted access, and independently valuable: it lets comments be retried by code rather than by the model.'
tags: [restricted-access, jira, github, comments, cli, mcp]
category: refactoring
status: in-progress
priority: High
risk_level: high
created: 2026-08-17
updated: 2026-08-19
estimated_effort_hours: 12
github_issue: 233
---

# [Task 55] Build the Jira comment endpoint that does not exist, and stop routing ~20 comments through prose

**Task File**: [task.55.tracker-comment-cli.md](./task.55.tracker-comment-cli.md)

**GitHub Issue**: [#233](https://github.com/Gamaroff/agent-skills/issues/233)

**Status**: In Progress

**Review**: ✅ All critical + important recommendations from `task.55.review.1.tracker-comment-cli.md` implemented 2026-08-19

## Overview

Fifth of seven (51–57), and the load-bearing one. Depends on 51, 52 and 53.

## Motivation

### There is nothing to intercept

`shared/resources/jira-sync.js` contains no comment endpoint — no `addComment`, no comment POST, nothing
in the export block at `:4686-4822`. The nearest thing is a refusal at **`jira-sync.js:3374`**
(`// No 'comment' (API v3 wants ADF there, and a fabricated comment is worse than none)`), and note what
it is actually scoped to: it sits inside `buildTransitionUpdate()` (`:3377`) and declines a `comment`
field on a **transition payload**. It is not a refusal to build a comment endpoint — that endpoint was
simply never written. So **every Jira comment in this repository is an MCP call** — roughly 20 `addCommentToJiraIssue` invocations spread across eight
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
`resolve-platform.sh:518-521` currently apologises for, where the shell retry helper "is shell-only and
cannot wrap Atlassian MCP tool invocations".

## Technical Background

### Current architecture

| Concern | Today |
| ------- | ----- |
| Jira comment | **No code path.** `jira-sync.js` has no `addComment`; the only comment mention is the transition-payload refusal at `:3374`. Every Jira comment is an `addCommentToJiraIssue` MCP call the agent makes by following prose. |
| GitHub issue comment | Also no JS. `gh-stage.js` sets the board Status field and nothing else. Every issue comment is a bare `gh issue comment` in prose, wrapped only by the generic `tracker_write()` in `resolve-platform.sh:522`, which infers the record kind from argv. |
| Interception | Task 53's gate sits in `makeHttp` (`jira-sync.js:1846-1863`), above the retry loop — it covers anything routed through `http()`. Comments route through neither `http()` nor `gh`, so nothing sees them. |
| Idempotency | An identity-marker convention exists for **PR** comments only: `<!-- finalise-canonical-summary -->` (`skills/finalise/SKILL.md:937,962,992`), prose-only, and it resolves multiple matches with `\| head -1`. |

### Target architecture

| Concern | After this task |
| ------- | --------------- |
| Jira comment | `addComment()` in `jira-sync.js`, a transcription of `putIssueAtomic` (`:4542-4592`) against `POST /rest/api/3/issue/{key}/comment`, going through `http()` so task 53's gate covers it for free. |
| Both trackers | `tracker-comment.js`, a peer of `jira-stage.js` / `gh-stage.js` with the same flags, the same exit codes and the same exit-0-with-`reason` contract. |
| Interception | Automatic on the Jira side via `http()`; explicit on the GitHub side via the same pre-credential deferral gate `gh-stage.js:925-1070` uses. |
| Idempotency | A marker per tracker, with an explicit cardinality rule that replaces `\| head -1`. |

### Reuse map — the exact symbols this task builds on

| Need | Existing symbol | Location |
| ---- | --------------- | -------- |
| markdown → ADF | `textToAdfNodes(text, linkResolver)` | `jira-sync.js:753` |
| ADF node builders | `adf` object (`doc`, `paragraph`, `heading`, `text`, `link`, `table`, …) | `jira-sync.js:649-674` |
| inline marks | `inlineMarkdownToAdf(text, linkResolver)` — bold, code, link | `jira-sync.js:683` |
| write-endpoint shape | `putIssueAtomic({http, baseUrl, email, token, issueKey, fields, skill})` | `jira-sync.js:4542-4592` |
| HTTP + access gate | `makeHttp({...})`, gate at `:1846-1863`, `deferredResponse()` `:1654`, `recordRefusal()` `:1678` | `jira-sync.js:1792` |
| auth | `getAuth()` `:1587`, `authHeader(email, token)` `:1611` | `jira-sync.js` |
| deferral | `defer(input, {cwd})`, `resolveAccessTracker(env, {cwd})` | `defer-mutation.js:1110`, `:835` |
| record kinds | `jira.comment.add`, `github.issue.comment` — **already in the roster**, inside `EXPECTED_KIND_COUNT = 22`; no roster edit needed | `tracker-access-record.md:239,262` |
| arg parsing / emit / access snapshot | `parseArgs` `:605-693`, `emit` `:766-769`, access-env snapshot **before** `loadDotEnv` `:742-748` | `gh-stage.js` |

**Two gaps in that reuse map — see Decisions.** The `adf` builder set has **no `codeBlock`** and
`blockToAdf` (`:809-843`) has **no fence branch**; and there is **no `em`/italic mark helper**. Both are
new renderer work, not reuse.

## Scope

**In scope:** two ADF renderer extensions (`codeBlock` builder + `blockToAdf` fence branch; an `em`
mark helper); `addComment()` in `jira-sync.js` with ADF rendering; `tracker-comment.js` covering Jira
and GitHub issue comments; replacing the **23** prose sites plus the stray `curl` and the 8 README
mentions; the comment-identity marker; the parity guard.

**Out of scope:** PR comments (VCS). The MCP fallback itself stays, documented and narrowed.

## Breaking Changes

One, and it is deliberate: `skills/review-task/SKILL.md:1652` currently posts its review comment through
Jira **REST v2** with a plain-string `body`. Folding it into `addComment()` moves it to **v3 + ADF**.
The rendered comment will look different — headings and tables become real ADF nodes rather than raw
markdown characters — which is the improvement, but it is a visible change to anyone reading those
comments, and it is why this site is a genuine behaviour change rather than a mechanical swap.

No API, schema or config breaks. The MCP fallback path is preserved verbatim for `no-credentials`.

## Decisions

| Decision | Why |
| -------- | --- |
| **Build `addComment()` rather than keep MCP as primary** | You cannot intercept what has no code path. Everything else follows from this. |
| **A `tracker-comment.js` CLI, peer of `jira-stage.js` / `gh-stage.js`** | Same exit-0-with-`reason` contract, same `--json`, same vocabulary. The step docs already know how to consume that shape, so ~20 rewrites are mechanical rather than inventive. |
| **MCP demoted to the `no-credentials` fallback** | Preserves today's behaviour for MCP-only consumers while removing MCP from the primary path. Reuses a compliance pattern that already works instead of inventing one. |
| **A comment-identity marker, and Jira needs a different one** | Idempotency requires knowing "have I already posted this?". GitHub and Bitbucket take an invisible HTML comment. **Jira does not** — ADF drops unknown nodes — so Jira gets a small italic footer, visible but unobtrusive, which survives a human pasting the body by hand. |
| **An ambiguous marker match resolves to `unverifiable`, never `satisfied`** | Directly descended from the "picked To Do because it was first" bug. On two or more matches, do not guess. |
| **A parity guard asserting no bare `addCommentToJiraIssue` in canonical prose** | Extends the existing `transition-protocol-parity.test.mjs` idea. Without it the sites grow back one PR at a time. Allowlist: `jira-transition-protocol.md` (its own examples) and `develop-pipeline-lite-mode.md` if that site is kept as prose rather than rewritten. |
| **The ADF renderer is extended, not merely reused** | `adf` (`jira-sync.js:649-674`) has no `codeBlock` and `blockToAdf` (`:809-843`) has no fence branch, so "round-trips code fences" is new work; and there is no `em` mark, which the italic Jira footer needs. Extending the shared renderer also benefits every existing caller — `sync-jira-{task,story,epic}` currently flatten fenced blocks. |
| **`--stage`, not `--moment`** | The peers both take `--stage` (`jira-stage.js:78-82`, `gh-stage.js:634`) and no `--moment` flag exists anywhere in `shared/resources/*.js`. The whole point of "same contract" is that a step doc author does not have to remember which CLI spells it which way. |
| **The Jira `require` is lazy, inside the Jira branch** | `gh-stage.js:34-38` forbids requiring `jira-sync.js` at all, because the bundler copies whatever a module requires into every consuming skill's `references/` — 4,822 lines plus `change-log.js` and `defer-mutation.js`, across ~10 skills, for a tracker half of them do not use. A both-tracker CLI cannot honour that rule with a top-level `require`, but a lazy one inside the Jira branch honours its intent: a GitHub-only run never loads it. The bundler still copies the file (it scans source text, not runtime paths), so this bounds the runtime cost, not the bundle size — accept the latter, and keep `tracker-comment.js` itself free of any other `shared/` dependency. |
| **The marker inherits the `finalise` naming shape, and replaces its `\| head -1`** | `<!-- finalise-canonical-summary -->` (`skills/finalise/SKILL.md:937`) already establishes `<!-- {producer}-{purpose} -->`, prepended as the body's first line and matched with `startswith`. That convention resolves 2+ matches with `\| head -1` — literally the bug this task's ambiguity rule exists to prevent — so it is the anti-pattern to name, not a precedent to copy wholesale. |

## Implementation Plan

0. **Extend the ADF renderer first** — a prerequisite for both the fence round-trip test and the Jira
   footer marker, and neither capability exists today. Add a `codeBlock` builder to the `adf` object
   (`jira-sync.js:649-674`), a fence branch to `blockToAdf` (`:809-843`), and an `em` mark helper. Every
   existing caller benefits: `sync-jira-{task,story,epic}` currently flatten fenced blocks.
1. **`addComment()`** in `jira-sync.js` — transcribe `putIssueAtomic` (`:4542-4592`) against
   `POST /rest/api/3/issue/{key}/comment` with `body: JSON.stringify({ body: adfDoc })` and
   `defer.kind: "jira.comment.add"`; render via `textToAdfNodes` (`:753`). Goes through `http()`, so
   task.53's gate at `:1846-1863` covers it for free. Take `skill` as the first argument, per the
   convention `transitionToStatus` (`:3399`) sets. Export it under the `// jira api` group.
2. **`shared/resources/tracker-comment.js`** — the peer CLI. Contract pinned below, because 23
   mechanical rewrites consume it, and getting it wrong means redoing all of them.

   **Flags** — `--issue <key|#N>` `--body-file <path>` `--stage <name>` `[--json] [--quiet]`
   `[--dry-run] [--strict]`. Note `--stage`, matching `jira-stage.js:78-82` and `gh-stage.js:634`;
   there is no `--moment` flag anywhere in `shared/resources/*.js`.

   **Exit codes** — transcribed from the peers (`jira-stage.js:20-27`, `gh-stage.js:25-30`):

   | Code | When |
   | ---- | ---- |
   | `0` | Every outcome the pipeline should shrug at — posted, already, deferred, no-credentials, dry-run, stage-disabled, unverifiable |
   | `1` | A skip, **only** under `--strict` |
   | `2` | Usage error — unknown flag, unknown stage, **missing `--issue`**, missing `--body-file` |

   **Reason vocabulary** — `posted` | `already` | `unverifiable` | `deferred` | `no-credentials` |
   `stage-disabled` | `dry-run`. Emitted via the peers' `emit(payload, exitCode)` shape
   (`gh-stage.js:766-769`), so `--json` yields `{ posted, reason, stage, exitCode, ... }`.

   `no-issue` is **not** a reason: a missing `--issue` is a usage error and exits `2`, as it does in
   both peers. An issue that is merely unlinked is the *caller's* branch — the step doc skips the call
   entirely when `TRACKER_ISSUE` is empty, exactly as it does today.

   **`unverifiable` vs `satisfied` — two axes, easily conflated.** `unverifiable` is a CLI `reason`:
   the marker search found 2+ matches, so the CLI did not post and does not claim the comment is
   present. `satisfied` is a **boolean field on the deferred-mutation record**
   (`tracker-access-record.md:75,114`) meaning "already correct, collapse me in the renderer". An
   ambiguous match sets `reason: "unverifiable"` and leaves `satisfied` **false** — never true, because
   the whole point is that we could not verify it. (Task 57 builds a richer verification state machine
   using the same word; this task needs only the reason, and must not wait on 57.)
3. **The marker** — an HTML comment for GitHub, prepended as the body's **first** line and matched
   with `startswith` (inheriting the shape of `<!-- finalise-canonical-summary -->`,
   `skills/finalise/SKILL.md:937,962,992`); a small italic footer for Jira, because ADF drops unknown
   nodes. **Cardinality rule, replacing that convention's `| head -1`:** 0 matches -> post; 1 match ->
   `reason: "already"`; 2+ matches -> `reason: "unverifiable"`, do not post, do not guess.

   Pass the body via `command.stdin` on the deferred record, never interpolated into an argv string —
   `command.argv` is an array and `stdin` carries bodies, per the roster's own worked example
   (`tracker-access-record.md:47-90`). This also gets correct fingerprinting for free: `fingerprint`
   already includes `command.stdin` (`:126-135`), precisely because two comments to the same issue with
   identical argv once collapsed to one record id and a wanted action vanished silently.
4. **Rewrite the sites.** Verified inventory — 24 `addCommentToJiraIssue` occurrences across 15 files
   outside bundled `references/` (23 rewritten, 1 allowlisted), plus 8 README mentions:

   | File | Sites | Action |
   | ---- | ----- | ------ |
   | `develop-pipeline-step-2-review.md` | 3 | rewrite |
   | `develop-pipeline-step-7-finalise.md` | 3 | rewrite |
   | `develop-pipeline-step-3-develop-loop.md` | 2 | rewrite |
   | `develop-pipeline-step-5-6-qa-loop.md` | 2 | rewrite |
   | `develop-pipeline-step-0-resolve-and-prepare.md` | 1 | rewrite |
   | `develop-pipeline-step-4-create-pr.md` | 1 | rewrite |
   | `skills/qa-fix/SKILL.md` | 2 | rewrite |
   | `skills/qa-story/SKILL.md` | 2 | rewrite |
   | `skills/qa-task/SKILL.md` | 2 | rewrite |
   | `skills/create-pr/SKILL.md` | 1 | rewrite |
   | `skills/finalise/SKILL.md` | 1 | rewrite |
   | `skills/review-bug/SKILL.md` | 1 | rewrite |
   | `skills/review-story/SKILL.md` | 1 | rewrite |
   | `shared/resources/develop-pipeline-lite-mode.md` | 1 | rewrite **or allowlist** — a normative "the orchestrator MUST still..." instruction at `:31`, not a call block |
   | `shared/resources/jira-transition-protocol.md` | 1 | **allowlist** — the protocol doc's own example |
   | `skills/develop-story/README.md` | 4 | rewrite — documentation tables that go stale, and that the guard will flag |
   | `skills/develop-task/README.md` | 4 | rewrite — same |

   Each inline MCP block becomes one CLI call plus a `reason` branch. Note `skills/review-task/SKILL.md`
   has **zero** MCP calls — its site is the `curl` in step 5 below, so "eight canonical files" counts it
   via that.
5. **`skills/review-task/SKILL.md:1652`** — the stray `curl` REST v2 site folds into the CLI, removing
   the inconsistency.
6. **The parity guard**, extending the existing test.
7. Tests, docs, `npm run bundle`.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/jira-sync.js` | ADF renderer extensions (`codeBlock`, fence branch, `em` mark) + `addComment()` |
| `shared/resources/tracker-comment.js` | **new** CLI |
| `shared/resources/develop-pipeline-step-{0,2,3,4,5-6,7}*.md` | 12 sites |
| `skills/{finalise,qa-story,qa-task,qa-fix,review-story,review-bug,create-pr}/SKILL.md` | 10 sites |
| `skills/review-task/SKILL.md` | the stray `curl` REST v2 site at `:1652` |
| `shared/resources/develop-pipeline-lite-mode.md` | 1 site (`:31`) — rewrite or allowlist |
| `skills/develop-story/README.md` | 4 doc-table mentions |
| `skills/develop-task/README.md` | 4 doc-table mentions |
| `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` | 1 site — **an authored file inside a `references/` dir**, missed by every inventory pass |
| `shared/resources/tracker-comment-contract.md` | **new** — the reason table and MCP-fallback rule, referenced by every site instead of repeated at each |
| `skills/{qa-story,qa-task}/references/develop-pipeline-step-0-*.md` | **deleted** — orphaned stale bundles |
| `shared/resources/jira-transition-protocol.md` | narrow the fallback's remit; document the comment fallback; **allowlisted** in the guard |
| `evals/shared/tests/transition-protocol-parity.test.mjs` | extend with the bare-MCP guard |
| `shared/resources/tests/tracker-comment.test.mjs` | **new** — already covered by the `shared/resources/tests/*.test.mjs` glob at `package.json:24`, no `package.json` edit needed |

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
| Missing `--issue` | Exits **2**, not 0 — matches both peers |
| `--dry-run` | No network, `reason: "dry-run"`, exit 0 |
| Two comments, same issue, different bodies | Two distinct record ids — `command.stdin` is in the fingerprint |
| Markdown fence -> ADF | Renders a `codeBlock` node, not a paragraph of hard breaks |
| Jira footer marker | Carries `marks: [{ type: "em" }]` and survives an ADF round-trip |

**Mutation-prove:** keep MCP primary at one site → the parity guard → red · drop the marker → the
idempotency test → red · pick the first of two matches → the ambiguity test → red · post under
`manual` → the no-network test → red · use the HTML marker for Jira → the ADF round-trip test → red.

## Success Criteria

- [x] `addComment()` exists and posts a correctly rendered ADF comment
- [x] `tracker-comment.js` covers both trackers with the established `reason` contract
- [x] All 25 prose sites route through the CLI; the stray `curl` site is gone
- [x] MCP survives **only** as the `no-credentials` fallback, documented as such — and the guard proves it
- [x] Comments are idempotent via a marker; ambiguity resolves to `unverifiable`
- [x] The parity guard fails if a bare MCP comment call reappears
- [x] Under a deferring mode nothing is posted and one record is written per comment
- [x] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

### Verification record

**Tests**: 1483/1483 node tests pass (30 new in `tracker-comment.test.mjs`, 25 in the extended parity
guard). All 9 shell suites green (473 assertions). `npm run validate:all` — 115 passed, 0 failed.

**Mutation-prove** — every invariant was watched failing before being trusted:

| Mutation | Result |
| -------- | ------ |
| Resolve 2 marker matches by taking the first (`\| head -1`) | ✖ 1 test red |
| Drop the marker from the posted body | ✖ 1 test red |
| Remove the access gate (post under a restricted mode) | ✖ 6 tests red |
| Use the HTML marker for Jira instead of an `em` footer | ✖ 1 test red |
| Remove the fence branch from `textToAdfNodes` | ✖ 4 tests red |

Each was applied, observed red, and reverted; the suite returns to 30/30 after each.

**Behaviour verified end-to-end, not just asserted**: all four restricted access modes defer with
exit 0 and a throwing transport injected, so "no network" is proven rather than counted; and two
different bodies on the same issue produce two distinct record ids while an identical re-run dedups —
the exact property `tracker-access-record.md` documents as a past bug.

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-19
**Quality Score**: 55/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.55.qa.1.tracker-comment-cli.md](./task.55.qa.1.tracker-comment-cli.md)
- **Gate File**: [task.55.gate.1.tracker-comment-cli.yml](./task.55.gate.1.tracker-comment-cli.yml)

### Test Coverage Summary
- **Tests Executed**: 1483 node + 9 shell suites + validate:all (115) — all green
- **Phases Verified**: 8/8 (4 PASS, 3 CONCERNS, 1 FAIL)
- **Critical Issues**: 2 HIGH, 5 MEDIUM, 5 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings

Two HIGH bugs, both causing **silent content loss**, both invisible to a fully green suite — each found by executing the shipped code rather than by reading it:

1. **Marker prefix collision** — `--stage review` prefix-matches an existing `review-story` marker, so the Step 2 review comment reports `already` and is never posted. The exact "silent failure looks like success" harm this task exists to remove.
2. **Multi-word fence info string** — ` ```js title="x" ` is not recognised as a fence, so the closing fence is read as an opening one and everything after it is swallowed.

## Risk Assessment

**High** — 24 `addCommentToJiraIssue` occurrences across 15 files (23 to rewrite, 1 allowlisted), plus
a stray `curl` site and 8 README mentions, on the pipeline's most frequently exercised path.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **A rewritten site posts nothing and nobody notices** | Comments are non-blocking by policy, so a silent failure looks like success | Each site branches on `reason`; the parity guard catches un-rewritten sites; the eval suite asserts the comment moments still fire |
| **ADF rendering differs from the MCP-rendered comment** | Different renderer, same content | Round-trip tests on headings, tables, fences and links; the existing ADF renderer is reused rather than rewritten |
| **A visible Jira footer annoys consumers** | It is visible by necessity | Small, italic, one line; documented, and it is what makes "already posted?" answerable without paging every comment |
| **The sites regrow** | The next feature adds a comment the old way | The parity guard; a note at the top of the protocol doc |
| **A fix is applied to a bundled `references/` copy and silently reverted** | This task edits `shared/resources/*.md` that are bundled into ~10 skills. `npm run bundle` overwrites any edit made to a bundled copy, with no error — a known failure mode in this repo | Edit `shared/resources/` sources only, never `*/references/`; run `npm run bundle` and commit the result; the parity guard scans both trees, so a reverted rewrite shows up as a failure rather than as silence |
| **The renderer extensions are larger than "reuse" implies** | The `adf` builders have no `codeBlock` and `blockToAdf` no fence branch, so the fence round-trip is new work, not reuse | Sequenced first as plan step 0, with its own round-trip tests, before anything depends on it |
| **`tracker-comment.js` drags `jira-sync.js` into every consuming skill's `references/`** | The bundler copies whatever a module requires; `gh-stage.js:34-38` forbids exactly this | Lazy `require` inside the Jira branch bounds the runtime cost; keep `tracker-comment.js` free of any other `shared/` dependency; accept the bundle size as the documented price of one CLI over two |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. The revert restores the MCP-primary path, which is today's
behaviour — so a `full`-access consumer is unaffected either way.

## Progress Tracking

- [x] 0. ADF renderer extensions — `codeBlock` builder, fence branch, `em` mark
- [x] 1. `addComment()` in `jira-sync.js`
- [x] 2. `shared/resources/tracker-comment.js` against the pinned contract
- [x] 3. The marker, both trackers, with the cardinality rule
- [x] 4. Rewrite the 25 sites
- [x] 5. Fold the stray `curl` at `skills/review-task/SKILL.md:1652` into the CLI
- [x] 6. Extend the parity guard
- [x] 7. Tests, docs, `npm run bundle` committed

### Implementation notes — where the plan and the code diverged

Three corrections, each made because the plan as written could not be implemented correctly:

1. **The fence branch went into `textToAdfNodes`, not `blockToAdf`.** That loop splits
   on blank lines before `blockToAdf` ever sees a block, so a fenced listing containing a blank line
   would be torn into pieces and each piece re-parsed as prose — the pipe row as a table, the `#`
   comment as a heading. Tracking the fence in the line loop is the only placement that can keep a
   listing intact, and there is a test that fails if it moves.
2. **`stage-disabled` was dropped from the reason vocabulary.** It appeared in the pinned contract by
   analogy with the stage CLIs, but those read `pipeline:` to find a *column*. An omitted moment there
   means "do not move the card"; it does not mean "do not say anything". Honouring it would have
   silenced the PR-opened comment on any board without a review column. `--stage` on this CLI is the
   comment's identity only, and `COMMENT_STAGES` is a documented superset of the board moments.
3. **A 25th call site existed that no inventory found.**
   `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:68` is an *authored* file that
   happens to live in a `references/` directory — it has no `shared/resources/` twin. Every count in
   this document (and all three inventory passes behind them) excluded `references/` paths as
   "bundled copies", so this site was invisible to all of them. The parity guard found it, which is
   the argument for the guard in one line.

Two adjacent defects surfaced, one of them pre-existing and worth its own follow-up:

- **A bundler gap that leaves transitively-referenced files permanently stale.**
  `skills/{qa-story,qa-task}/references/develop-pipeline-step-0-resolve-and-prepare.md` were shipping
  the *pre-rewrite* text. The bundler discovers dependencies by scanning a skill's own sources for the
  literal `shared/resources/X`; here step-0 is reached only from the **bundled** copy of
  `develop-pipeline-step-1-create-branch.md`, whose link the bundler had already rewritten to
  `references/develop-pipeline-step-0-…`. Once rewritten, the original path is gone, so the file can
  never be re-discovered and `npm run bundle` reports "in sync" while shipping stale instructions.
  Refreshed by hand here; the bundler needs to follow bundled-doc links transitively, which is a
  change to `bundle_skill.py` and belongs in its own task.
  > Initially misdiagnosed as orphans and deleted, which broke a cross-reference that
  > `tests/executable-instructions.test.js` catches. Restored — the test was right.
- The existing `--stage` guard validated every literal against the *board* stage set. Now it resolves
  which CLI each literal belongs to first, so the two namespaces can differ without either going
  unchecked.

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-19 | 1.1 | Review found 3 critical, 7 important issues (6/10) — pinned the CLI contract to `--stage` + peer exit codes, corrected the false ADF-reuse claim into two renderer extensions, decided the `jira-sync.js` module-boundary question, fixed two misdirected citations, completed the call-site inventory, and added Technical Background, Breaking Changes, Progress Tracking and this log | review-task |
| 2026-08-19 |  | Status → ready-for-development | review-task |
| 2026-08-19 |  | Implemented — 45 files, 30 new tests (25 parity assertions), full suite green | develop |
| 2026-08-19 |  | QA gate FAIL (55/100) — 2 HIGH, 5 MEDIUM, 5 LOW findings | qa-task |

## References

- [`shared/resources/jira-transition-protocol.md`](../../../shared/resources/jira-transition-protocol.md) — the fallback pattern and its guard rails
- [`shared/resources/resolve-platform.sh:64-68`](../../../shared/resources/resolve-platform.sh) — the MCP-retry gap this closes
