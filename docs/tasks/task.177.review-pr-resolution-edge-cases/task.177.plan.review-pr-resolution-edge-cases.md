---
id: task.177.plan
title: "Implementation Plan: /review-pr resolution edge cases"
type: plan
description: "Code-level guide for task 177: scheme-less URLs in parse-target.sh, the .env inline comment, the docs-less fallback, and the rung-2 work-item filter."
task-ref: task.177.review-pr-resolution-edge-cases.md
created: 2026-10-02
updated: 2026-10-03
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

The first-segment rule keeps `release/v1.2/pull/3` a branch (its first segment, `release`, holds no
dot), and `v1.2/pull/3` stays a branch because every marker pattern needs `host/x/…`. What the arm
does misread is a dotted first segment plus two or more segments and a marker (`v1.2/x/pull/3`) —
measured under bash and zsh at review 1. Keep every expansion quoted and add no arrays — the
script's bash/zsh rule.

Tests (in `review-pr.test.js`, extending `PARSER_CASES` and the malformed list):

- `github.com/o/r/pull/12` → `{kind: pr, pr: 12, host: github.com, repo: o/r}`
- `acme.atlassian.net/browse/RAPP-702` → `{kind: jira, jira_key: RAPP-702, host: acme.atlassian.net}`
- `bitbucket.org/ws/r/pull-requests/7` → `{kind: pr, pr: 7, host: bitbucket.org, repo: ws/r}`
- stays a branch: `feature/task.1.x`, `release/v1.2`, `hotfix/v1.2.1`, `v1.2/pull/3`, `release/v1.2/pull/3`
- `github.com/o/r/tree/main` → refused `url-no-target`, the same as its `https://` form

Add the three scheme-less URLs to `PARSER_PROBE_CASES` as legitimate cases.

## Phase 2: Skill prose

**`.env` (Step 0b).** Replace the final `sed` of the `JIRA_URL_SEEN` pipeline with a parse that takes
the inside of the first quote pair when the value opens with a quote, and otherwise strips an unquoted
` #…` tail:

```sh
| tr -d '\r' | tail -1 \
| sed -E -e 's/^[[:space:]]+//' -e "s/^\"([^\"]*)\".*\$/\1/" -e t -e "s/^'([^']*)'.*\$/\1/" -e t \
        -e 's/[[:space:]]+#.*$//' -e 's/[[:space:]]+$//')
```

A bare `t` branches to the end of the script once a quote pair has matched. **Each `t` must be its
own `-e`**: written as `…; t; …` inside one script, BSD sed (macOS) reads the rest of the line as a
label name and fails with `undefined label` (measured at review 1). Verified under BSD sed:
`"…" # prod`, `'…' # prod`, `… # prod`, `"…"` and padded `"…"` all yield the bare URL;
`https://a.net#frag` keeps its `#frag` (no space before `#`); `"https://a.net#x" # c` → `https://a.net#x`.

**Docs-less fallback — a fenced docs guard block.** Prose alone cannot be executed, so a test could
not hold it. Add one bash block to Step 1a, which rung 1's table cell and Step 2 cite:

```bash
# No docs/ at the repository root → no document. §0a's HALT on a missing docs/ is for the develop
# pipelines, which cannot proceed without one; /review-pr can (Step 2 rung 6, code-only).
if [ -d "$(git rev-parse --show-toplevel)/docs" ]; then
  # … §0a Key → document lookup, cited (KEY_FIELD / KEY_VALUE bound by the caller) …
  DOC_FILE="$LOCAL_PATH"
else
  DOC_FILE=""
fi
printf 'DOC_FILE=%s\n' "$DOC_FILE"
```

How the block reaches §0a (source the bundled reference, or an instruction to run §0a's block at
that point) is the implementer's call; the constraint is that the docs-less branch is executable and
calls no §0a. Step 1a continues at rung 4 when `DOC_FILE` is empty. Step 2 skips rungs 1–4 when
`docs/` is missing and continues at rung 5/6.

**Rung 2 = §0a.** Rewrite the rung 2 cell as the §0a Key → document lookup with
`KEY_FIELD=pr_number KEY_VALUE=$PR_NUMBER`, cited. §0a's grep is generic in the field, anchored and
quote-tolerant, and carries the work-item filter — so nothing is restated. Measured at review 1 on the
live tree: `290` → `DOC_STATUS=none`, `554` → `found` (task.176). §0a HALTs when several documents
match; that is now rung 2's behaviour for a shared `pr_number` (recorded in the task's Breaking
Changes). Rung 2 runs after the docs guard.

Tests:

- Step 0b block in a consumer repo whose `.env` is `JIRA_URL="https://acme.atlassian.net" # prod`, with
  target `https://acme.atlassian.net/browse/RAPP-702`: exit 0 and no `⚠️` line.
- A docs-less consumer repo, target `RAPP-702`: the docs guard block (extracted by a helper shaped
  like `lookupBlock()`) exits 0 and prints `DOC_FILE=`, and the rungs 3–4 block (stub `gh`) reports
  `RUNG=key search`. Mutation: replace the guard with a bare §0a call → the test goes red.
- `lookupBlock()` with `KEY_FIELD=pr_number KEY_VALUE=290` against a fixture where only
  `bug.3.dod.1.x.md` carries `pr_number: 290` → `DOC_STATUS=none`; two work items sharing a
  `pr_number` → exit 1, `HALT: … matches 2 documents`.

## Phase 3

`npm run bundle:check`. No shared source changes, so no bundle churn is expected. Add a CHANGELOG
`[Unreleased]` › Fixed entry citing (task 177).
