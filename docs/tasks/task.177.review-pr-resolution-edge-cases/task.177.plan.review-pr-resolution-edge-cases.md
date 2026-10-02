---
id: task.177.plan
title: "Implementation Plan: /review-pr resolution edge cases"
type: plan
description: "Code-level guide for task 177: scheme-less URLs in parse-target.sh, the .env inline comment, the docs-less fallback, and the rung-2 work-item filter."
task-ref: task.177.review-pr-resolution-edge-cases.md
created: 2026-10-02
updated: 2026-10-02
---

# Implementation Plan: /review-pr resolution edge cases

> Requirements and success criteria:
> [task.177.review-pr-resolution-edge-cases.md](task.177.review-pr-resolution-edge-cases.md)

## Overview

Four small, independent fixes, all in `/review-pr`. Each one gets an executed test, under bash and zsh,
that goes red when its fix is reverted.

## Phase 1: Parser — scheme-less URLs

In `parse-target.sh`, inside `parse_target()`, after the control-character refusal and before the
`case "$TARGET" in '')` block:

```sh
# A URL pasted without its scheme: re-parse it as https://<target>.
case "$TARGET" in
  *://*) ;;
  github.com/* | www.github.com/* | bitbucket.org/* | api.bitbucket.org/* | *.atlassian.net/*)
    TARGET="https://$TARGET" ;;
  *.*/*/pull/[0-9]* | *.*/*/pull-requests/[0-9]* | *.*/*/pullrequests/[0-9]* | *.*/*/issues/* | *.*/browse/*)
    # Only when the FIRST segment holds the dot — a host, not a branch like release/v1.2.
    case "${TARGET%%/*}" in *.*) TARGET="https://$TARGET" ;; esac ;;
esac
```

Check that the first-segment rule keeps `release/v1.2/pull/3`, should one exist, a branch: its first
segment is `release`, which holds no dot. Keep every expansion quoted and add no arrays — the
script's bash/zsh rule.

Tests (in `review-pr.test.js`, extending `PARSER_CASES` and the malformed list):

- `github.com/o/r/pull/12` → `{kind: pr, pr: 12, host: github.com, repo: o/r}`
- `acme.atlassian.net/browse/RAPP-702` → `{kind: jira, jira_key: RAPP-702, host: acme.atlassian.net}`
- `bitbucket.org/ws/r/pull-requests/7` → `{kind: pr, pr: 7, host: bitbucket.org, repo: ws/r}`
- stays a branch: `feature/task.1.x`, `release/v1.2`, `hotfix/v1.2.1`
- `github.com/o/r/tree/main` → refused `url-no-target`, the same as its `https://` form

Add the three scheme-less URLs to `PARSER_PROBE_CASES` as legitimate cases.

## Phase 2: Skill prose

**`.env` (Step 0b).** Replace the final `sed` of the `JIRA_URL_SEEN` pipeline with a parse that takes
the inside of the first quote pair when the value opens with a quote, and otherwise strips an unquoted
` #…` tail:

```sh
| tr -d '\r' | tail -1 \
| sed -E "s/^[[:space:]]+//; s/^\"([^\"]*)\".*$/\1/; t; s/^'([^']*)'.*$/\1/; t; s/[[:space:]]+#.*$//; s/[[:space:]]+$//")
```

`t` branches past the remaining expressions once a quote pair has matched. Verify the `t` behaviour
under BSD sed (macOS) as well as GNU sed. If they differ, use two steps instead.

**Docs-less fallback.** In Step 1a rung 1's table cell and in Step 2 rung 4, add before the §0a citation:

> When `docs/` does not exist at the repository root (`[ -d "$(git rev-parse --show-toplevel)/docs" ]`),
> there is no document: bind `DOC_FILE=""` and continue at rung 4 (Step 1a) or rung 5 (Step 2). Do
> not call the §0a lookup — its HALT is for the develop pipelines, which cannot proceed without a
> document.

**Rung 2 filter.** Rewrite the rung 2 cell as the grep piped through the §0a rule, citing it: keep a hit
named after its own directory; otherwise drop a basename carrying a kind segment. Do not restate the
kind list — Step 2's "Exclusion filter" paragraph already cites §0a.

Tests:

- Step 0b block in a consumer repo whose `.env` is `JIRA_URL="https://acme.atlassian.net" # prod`, with
  target `https://acme.atlassian.net/browse/RAPP-702`: exit 0 and no `⚠️` line.
- A docs-less consumer repo, target `RAPP-702`: the Step 1a rung-1 decision binds `DOC_FILE=""`, and the
  rungs 3–4 block (stub `gh`) reports `RUNG=key search`.
- A fixture where only `bug.3.dod.1.x.md` carries `pr_number: 290`: the rung 2 command returns nothing.

## Phase 3

`npm run bundle:check`. No shared source changes, so no bundle churn is expected. Add a CHANGELOG
`[Unreleased]` › Fixed entry citing (task 177).
