---
id: task.179.plan
title: "Implementation Plan: /review-pr resolution follow-ups"
type: plan
description: "Code-level guide for task 179: one host_of for both parser arms, the known-host prose, the comment-only .env value, test comments, and §0a's KEY_FIELD contract."
task-ref: task.179.review-pr-resolution-follow-ups.md
created: 2026-10-03
updated: 2026-10-03
---

# Implementation Plan: /review-pr resolution follow-ups

> Requirements and success criteria:
> [task.179.review-pr-resolution-follow-ups.md](task.179.review-pr-resolution-follow-ups.md)

## Overview

Six small fixes. One is a behaviour fix (a single host reading in the parser), one is a pre-existing
`.env` edge, and four are text that drifted from task.177's final rule. Each behaviour fix gets an
executed test under bash and zsh that goes red when it is reverted.

## Phase 1: Parser — one host reading

Lift the URL arm's host derivation (`parse-target.sh:196-200`) into a function, keeping it POSIX
(no arrays, every expansion quoted — the script's bash/zsh rule):

```sh
# The host of "<host>[/…]": ?… and #… cut, userinfo@ dropped, :port dropped, lowercased.
# ONE reading, used by both arms — two readings let ghe.corp#.atlassian.net pass the known-host
# check on its raw text and parse as host ghe.corp (task.177 PR review CR-1).
host_of() {
  _h="${1%%/*}"
  _h="${_h%%\?*}"
  _h="${_h%%\#*}"
  _h="${_h##*@}"
  printf '%s' "${_h%%:*}" | tr '[:upper:]' '[:lower:]'
}
```

The URL arm becomes `HOST=$(host_of "$REST")`, and the `HOSTPORT` lines go: `grep -n HOSTPORT`
finds them only at `:196-200`, where they build `HOST` (measured 2026-10-03). The scheme-less arm becomes:

```sh
case "$TARGET" in
  *://*) ;;
  ?*/*)
    case "$(host_of "$TARGET")" in
      github.com | www.github.com | bitbucket.org | www.bitbucket.org | api.bitbucket.org | ?*.atlassian.net)
        TARGET="https://$TARGET" ;;
    esac ;;
esac
```

Header line `:31`: "a URL with a scheme, or a scheme-less URL on a known platform host, never falls
through to the branch arm; a scheme-less self-hosted URL is a branch."

Tests (extend `PARSER_CASES`; add the two bypass shapes to `PARSER_PROBE_CASES` as hostile, expecting
`kind=branch`):

- `ghe.corp#.atlassian.net/o/r/pull/7` → branch
- `ghe.corp?.atlassian.net/browse/AB-1` → branch
- `github.com:1@evil.com/o/r/pull/3` → branch
- `x@github.com/o/r/pull/1` → `{kind: pr, pr: 1, host: github.com, repo: o/r}`

Prototype measured 2026-10-03 on a scratch copy, bash and zsh: both bypass shapes and
`github.com:1@evil.com/…` → branch; `x@github.com/o/r/pull/1` → PR 1; `acme.atlassian.net:443/…`,
`GitHub.com/…` and `feature/foo.atlassian.net/x` unchanged. Mutation: restore the raw `_host`
reading → the two bypass cases go red.

## Phase 2: Skill prose and `.env`

- `SKILL.md:105` — same sentence as the parser header.
- `SKILL.md:204` — `branch` row: "anything else — including a scheme-less URL whose host is not a
  known platform host".
- `SKILL.md:40` — `target` row: add "A GitHub, Bitbucket or `*.atlassian.net` URL may omit
  `https://`; a self-hosted one may not."
- `SKILL.md:144` — `-e 's/[[:space:]]+#.*$//'` → `-e 's/(^|[[:space:]]+)#.*$//'`. Check under BSD
  sed: measured 2026-10-03 on BSD sed, `JIRA_URL= # prod` and `JIRA_URL=   # set me` give `""`,
  `https://a.net#frag` keeps its fragment and `"https://a.net#x" # c` gives `https://a.net#x`.
- The Step 0b comment above it: "a value that is only a comment reads as unset".
- Test: the Step 0b block in a consumer repo with `.env` `JIRA_URL= # prod` and target
  `https://acme.atlassian.net/browse/RAPP-702` → stdout matches
  `/JIRA_URL is not set .* not checked/`, never `/differs/`.
- Test comments `review-pr.test.js:880`, `:886`, `:891-892` → the known-host rule. Rename the test at
  `:2242` to "the present branch prints an empty DOC_FILE and ignores an inherited one" (or chain
  `lookupBlock()` after the guard in a docs fixture, if the handover is worth an executed test).

## Phase 3: §0a contract, bundle, CHANGELOG

In `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` § Key → document lookup:

- intro (`:102`): "The one lookup from a key — a tracker key, an issue number or a PR number — to its
  work-item document."
- comment (`:106`): `# KEY_FIELD: jira_key | github_issue | pr_number.`
- `:?` message (`:116`): `bind KEY_FIELD (jira_key, github_issue or pr_number)`.

Then `npm run bundle` and `npm run bundle:check`. Edit the shared source only — a fix applied to a
bundled `references/` copy is reverted by the next bundle run.

CHANGELOG `[Unreleased]` › Fixed: one entry citing (task 179).
