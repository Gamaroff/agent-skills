---
id: task.319.plan
title: "Implementation Plan: Pipelines spend a CI run only where a run can answer something"
type: plan
task-ref: task.319.ci-runs-only-where-needed.md
---

# Implementation Plan: Pipelines spend a CI run only where a run can answer something

> Requirements and success criteria: [task.319.ci-runs-only-where-needed.md](task.319.ci-runs-only-where-needed.md)

## Overview

Record which step reads the remote after each push, put the push decision in one helper that every
site calls, then add the three smaller parts (skip marker, finalise fixes, Bitbucket arms), each
behind its own key.

## Phase-by-Phase Implementation Guide

### Phase 0: Who reads the remote

For each row of the task's § 3 push-site table, follow the pipeline forward from the push to the
next step that reads the **remote** head rather than the working tree. Candidates to check, each
with its `file:line`:

- 5c `/review-pr`: does it read the PR diff from the VCS API, or the local branch?
- `/finalise` Step 3a `resolve-ci` and Step 7.6c CI reading 2: both read CI on the PR head.
- The develop-next merge gate: compares the PR head with the local head and refuses a mismatch.

Write the result as a table in the plan's appendix (site → first remote reader → must push before it?).
It becomes the helper's site map, so a later change to a reader has one place to update.

### Phase 1: `push-policy`

`shared/resources/push-policy.sh`, sourced or run, in the style of `qa-cycle.sh` (one stdout token,
reasons on stderr, `--self-test`):

```
push-policy.sh --site <site-id> [--end] → prints push | defer, exit 0; exit 2 on usage
```

Decision, in order:

1. `pipeline.pushRecordCommits: eager` → `push`.
2. `--end` (Step 8, a HALT path, the escalation commit) → `push`.
3. The delta `@{upstream}..HEAD` has any path outside `ci.docsOnly.patterns` → `push`. Use
   `isDocsPath` and `readConfig` from `ci-tree-equivalence.js`; do not write a second matcher.
4. Phase 0's map says a remote reader runs before the next push from this site → `push`.
5. Otherwise → `defer`.

A site calls it and pushes only on `push`. A `defer` is logged in the implementation report's
Decisions Log, so the report shows what waited.

Config: add `pipeline.pushRecordCommits` to the schema beside `ci.docsOnly`, default `batched`.

### Phase 2: The sites

- `develop-pipeline-on-precompact.sh:418`: add a `batched` hold reason to the existing
  `PUSH_HOLD_REASON` case, ahead of the dangling-link probe as `step7` / `step8` are, so a pause at
  any step commits only. Add `**Pushed:** no — rides the next push` to the pause report header, so a
  resume on another machine knows.
- `develop-pipeline-pause.md:148`, `develop-pipeline-hooks.md:56`: the prose matches the hook.
- QA loop `:1176`: the one-push-per-cycle table becomes `push-policy --site qa-cycle`. A record-only
  cycle that reaches 5c defers unless Phase 0 shows 5c reads the remote.
- Finalise gaps `:75`, escalation `:2195`, Step 8 `:111`: `--end`.
- Finalise 6a: `--site finalise-accept`. CI reading 2 then runs on the newest pushed head through
  `ci-tree-equivalence.js`, as it already can.
- The three SKILL.md "Push after every commit" lines become one line pointing at the helper.

### Phase 3: Skip marker

When `ci.skipMarker` is set and the helper answers `push` for a delta that `ci-tree-equivalence.js`
calls `tree-equivalent` to the newest green ancestor, the commit subject gets the marker. Never on a
delta with code, and never on `--end` if the consumer's merge gate needs a status on the head (say so
in the reference).

### Phase 4: Finalise

- `finalise.rerunAtHead: [<command>, …]`. In Step 3a, for each success criterion that names a listed
  command, run it at the head from the repository root, save stdout, stderr and the exit code under
  the DoD's run directory, and pass the path to the AC agent. The AC prompt grades that run.
  Unlisted commands keep today's rule.
- `security-probe.mjs`: an `eslint:` entry. The fixture is written to a temp file inside the
  repository (so the repository's ESLint config applies), ESLint runs through its Node API, and
  `accepted` / `rejected` reads whether the named rule id is reported. Add the row to
  `probe-boundary-rule.md`.

### Phase 5: Bitbucket

- `finalise-ci-poll.sh`: an `if [ "$VCS" = bitbucket ]` arm that gets its rollup from
  `ci-tree-equivalence.js`'s `bitbucketRollup` / `reduceBitbucketStatuses` (the same reading the
  docs-only rule already uses), selecting the `prs:**:<destination>` key, and keeping the one-line
  result format. Credentials through `bitbucket-auth.sh`.
- develop-next Step 4: `tickVia: pr` creates `docs/<roadmap>-tick-<item>` off the base branch,
  commits the tick there, opens a PR, and merges it through Step 3's merge gate. `push` is unchanged.

### Phase 6: Ship

`npm run bundle`, `npm run bundle:check`, CHANGELOG `[Unreleased]`, configuration reference.

## Key Patterns and References

- One stdout token, reasons on stderr, `--self-test`: `shared/resources/qa-cycle.sh`.
- The docs-only matcher: `shared/resources/ci-tree-equivalence.js`. Reuse it.
- Bitbucket credentials and status keys: `shared/resources/bitbucket-auth.sh`.
- Never edit `skills/*/references/` by hand: `npm run bundle` writes them.

## Testing Approach

- `shared/resources/tests/push-policy.test.mjs`: the simulated runs in the task's § 8, in a temp
  repository with a bare remote; temp directories removed in `t.after`.
- Extend `security-probe.test.mjs` and the ci-poll tests; add a develop-next tick test with a fake VCS.
- `CI=true npm test` before the push.

## Appendix: Phase 0 — who reads the remote after each push site

Read at `0d5b5f71a`: the Phase 0 snapshot, kept as it was found. `push-policy.sh` started from it and has
since changed: the HALT sites became one (`halt`) and `finalise-entry` was added. The current table is
`bash shared/resources/push-policy.sh --list`; a step that starts reading the remote head changes its row
there.

| Site | Push (file:line) | First remote reader after it (file:line) | Must push before it |
| --- | --- | --- | --- |
| `pause` | `develop-pipeline-on-precompact.sh:432` | none: the resume reads the local commit. `qa-ci-read.sh:82,141` answers `HEAD_MISMATCH` (advisory) | no |
| `qa-cycle` | `develop-pipeline-step-5-6-qa-loop.md:1466`; `develop-bug-step-5-6-verify-loop.md:295` | none before the next push: 5a reads the local tree; `qa-ci-read.sh` is advisory | only when the delta has code |
| `qa-review-fix` | `develop-pipeline-step-5-6-qa-loop.md:1465` | none: the cycle's push was used before 5c | no |
| `qa-pre-5c` | `develop-pipeline-step-5-6-qa-loop.md:1232` | `develop-pipeline-step-5-6-qa-loop.md:1586` (`git show origin/<branch>:<artifact>`); `skills/review-pr/SKILL.md:530` (`git diff origin/<base>...origin/<head>`) | yes |
| `qa-halt`, `qa-escalation` | `develop-pipeline-step-5-6-qa-loop.md:1251`, `:2221` | a person reads the PR after the HALT | yes (end) |
| `finalise-gaps` | `develop-pipeline-step-7-finalise.md:76` | a person reads the PR after the HALT | yes (end) |
| `finalise-accept` | `skills/finalise/SKILL.md:2182` | `skills/finalise/SKILL.md:2264` (`git show origin/<branch>:<path>`), `:2292` (PR head), then the CI poll | yes |
| `finalise-fix` | `skills/finalise/SKILL.md:3534` | CI reading 1 on the fix head | yes |
| `step8` | `develop-pipeline-step-8-commit.md:118` | `verify-push-state.sh` (`:111`), then `skills/develop-next/SKILL.md:382` (`headRefOid`) | yes (end) |
| `tick` | `skills/develop-next/SKILL.md:691,743,754`; `skills/develop-batch/SKILL.md:661,675` | the next run's resume reads the row on `origin/<base>` (`skills/develop-next/SKILL.md:193`) | yes |
