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

## Phase 0: Verify the unverified calls — DONE 2026-10-02

Run read-only against `mediastream_ag/rebirth-wallet` (Bitbucket, card RAPP-702) and
`Gamaroff/agent-skills` (GitHub). Status codes read, never list lengths.

**Bitbucket — the query works.** `GET /2.0/repositories/{ws}/{repo}/pullrequests` answered 200 for:

| Intent | `q=` (URL-encoded) |
|---|---|
| title names the key | `title ~ "RAPP-702"` |
| description names the key | `description ~ "RAPP-702"` |
| source branch contains the doc stem | `source.branch.name ~ "task.101"` |

Pass `state=OPEN&state=MERGED&state=DECLINED` explicitly (merged PRs are a supported target), and
`fields=values.id,values.title,values.state,values.source.branch.name,size,next` to keep the payload
small. `next` is the paging cursor; the existing marker scan's loop is the one to copy.

**GitHub — the field works, with a limit.** `gh issue view N --json closedByPullRequestsReferences`
returned `[{number: 549, …}]` for issue 491 (PR 549 says `Closes #491`) and `[]` for open issues with no
PR. It lists only PRs that use a **closing keyword**, so it cannot be the only rung.

**Four findings that change the design** (each is now in the task's Phase 2):

1. **"Several PRs" is the normal case, not the edge.** RAPP-702 matched 3 merged PRs by title and 5 by
   description, including two docs-only PRs (a tracker reconcile, a card sync). The key search is a
   *candidate list*, never an answer. The doc's own `pr_number:` and branch stem must outrank it, and
   an auto-pick from key matches alone is not acceptable.
2. **`pr_number:` is often absent.** task.101 (RAPP-702) is `ready-for-review` with no `pr_number`.
   Rung 2 will frequently miss; rung 3 (branch stem) is the working route there.
3. **`jira_key` is always quoted in frontmatter.** 358 docs single-quoted, 444 double-quoted, **0
   unquoted** (rebirth-wallet). The pattern `^jira_key:[[:space:]]*KEY[[:space:]]*$` matches nothing.
   Use `^jira_key:[[:space:]]*['"]?KEY['"]?[[:space:]]*$`. Check `github_issue:` the same way before
   assuming it is a bare integer.
4. **The Step 2 exclusion filter is missing `.request.`.** `task.101.request.1.*.md` carries the same
   `jira_key`, so a key lookup returns two files. Without the filter the work item is ambiguous; with
   `.request.` added it is unique. This is an existing gap the new lookup exposes — fix it here.

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
2. **Card → doc** — anchored, recursive, **quote-tolerant** grep:
   `^jira_key:[[:space:]]*['"]?KEY['"]?[[:space:]]*$` (and the `github_issue:` equivalent) under
   `docs/`; apply Step 2's exclusion filter — **with `.request.` added** — so the document is found,
   not its artifacts. No doc → continue to PR search by key alone, and expect the
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
