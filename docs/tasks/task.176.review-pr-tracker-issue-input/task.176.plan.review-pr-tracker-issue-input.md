---
id: task.176.plan
title: "Implementation Plan: /review-pr accepts a Jira card or GitHub issue and resolves it to its PR"
type: plan
description: "Code-level guide for task 176: the pure target parser, the card-to-PR resolution order and selection rules, and the host check."
task-ref: task.176.review-pr-tracker-issue-input.md
created: 2026-10-02
updated: 2026-10-02
---

# Implementation Plan: /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

> Requirements and success criteria:
> [task.176.review-pr-tracker-issue-input.md](task.176.review-pr-tracker-issue-input.md)

## Overview

Keep the network out of the parser and the parser out of the prose. A pure script decides *what the
user gave us*; the skill decides *which PR that means*. Everything after Step 1 is untouched.

## Phase 0: Verify the one unverified call

Record the working query here, with its output, before Phase 2 is written.

- Bitbucket: `GET /2.0/repositories/{ws}/{repo}/pullrequests` with a `q=` filter on `title` /
  `description` containing the key (`~` operator), `state` unfiltered so merged PRs are found, and
  `pagelen`/`next` handled — the existing marker scan already pages, copy its loop. Check status codes,
  never list length: Bitbucket answers a bad credential on a private repo with 404.
- GitHub: `gh issue view N --json closedByPullRequestsReferences` — shape verified empty-array on
  `gh` 2.94.0; confirm the populated shape on an issue closed by a merged PR.

## Phase 1: The parser

`skills/review-pr/scripts/parse-target.sh "$TARGET"` prints key=value lines and exits 0, or exits 2
with a named reason on stderr.

| Input | Output |
|---|---|
| *(empty)* | `kind=pr-for-current-branch` |
| `123` | `kind=pr` `pr=123` |
| `…/pull/N`, `…/pull-requests/N`, `…/pullrequests/N` | `kind=pr` `pr=N` `host=<host>` |
| `RAPP-702` | `kind=jira` `jira_key=RAPP-702` |
| `…/browse/RAPP-702` | `kind=jira` `jira_key=RAPP-702` `host=<host>` |
| `…/boards/407?selectedIssue=RAPP-702` | `kind=jira` `jira_key=RAPP-702` `host=<host>` |
| `#536`, `…/issues/536` | `kind=github-issue` `issue_num=536` |
| anything else non-numeric | `kind=branch` `branch=<target>` |

Rules: the key pattern is `[A-Z][A-Z0-9]+-[0-9]+`, anchored; a URL's `host` is reported, not judged —
the skill compares it to the remote. Must behave identically under bash and zsh (the repo's existing
trap; no multi-glob `ls`).

## Phase 2: Resolution in the skill

1. **Host check** — `host` vs `git remote get-url origin`; mismatch → HALT naming both.
2. **Card → doc** — anchored, recursive grep for `^jira_key:[[:space:]]*KEY[[:space:]]*$` or
   `^github_issue:[[:space:]]*N[[:space:]]*$` under `docs/`; apply Step 2's exclusion filter so the
   document is found, not its artifacts. No doc → continue to PR search by key alone, and expect the
   later review to be code-only.
3. **Doc → PR** in the order in the task's Target Architecture; first hit wins; record the rung.
4. **Select** — count open PRs among the hits.
5. Hand `PR_NUMBER` and the pre-resolved doc to Step 1/2 with a `resolved_via` of
   `jira key → <rung>` or `github issue → <rung>`.

Tests pin prose, so each rule above needs a case that fails if the sentence is removed.

## Phase 3: Bundle, docs, changelog

`npm run bundle` copies `shared/resources/*` into `references/`; `scripts/` under the skill is not
bundled, so check `bundle:check` does not report the new script as `UNREACHED` — cite it from
SKILL.md.

## Open decisions

- **Non-interactive "several PRs"**: halt with the list (proposed) vs. pick the newest open. Halt is
  proposed because a wrong pick yields a confident review of the wrong change.
- **Parser as a script vs. inline shell**: script proposed so the forms are testable; revisit if the
  repo's convention is against `skills/*/scripts/` for a prose-only skill.
