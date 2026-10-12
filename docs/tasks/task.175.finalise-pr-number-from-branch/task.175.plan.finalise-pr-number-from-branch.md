---
id: task.175.plan
title: "Implementation Plan: Resolve finalise's PR number from the branch, not the task body"
type: plan
task-ref: task.175.finalise-pr-number-from-branch.md
---

# Implementation Plan: Resolve finalise's PR number from the branch, not the task body

> Requirements and success criteria: [task.175.finalise-pr-number-from-branch.md](task.175.finalise-pr-number-from-branch.md)

## Overview

One new shell resolver, called from finalise Step 3a, replaces three document-based derivations. Its rungs read sources that know the PR (the caller, the branch, the lock) before sources that may only mention one (frontmatter, then a confirmed body match).

## Phase-by-Phase Implementation Guide

### Phase 1: The resolver

**`shared/resources/resolve-pr-number.sh`** (new). Model the header comment, argument parsing and exit-code contract on `shared/resources/verify-push-state.sh` and `shared/resources/qa-cycle.sh` (exit 0 found, 1 refused, 2 usage).

```bash
#!/usr/bin/env bash
# resolve-pr-number.sh — the pull request a work item is being judged against.
# usage: resolve-pr-number.sh --doc <work-item.md> [--pr <N>] [--json]
# exit 0: prints N (or {"pr":N,"source":"<rung>"}); exit 1: no authoritative source (reason: none);
# exit 2: usage.
```

Rungs, first answer wins:

| Rung | Source | Answers when |
| --- | --- | --- |
| `explicit` | `--pr N` | N is a positive integer |
| `branch` | `pr_read` from the sibling `pr-read.sh`, no `--pr` (GitHub: the PR `gh` finds for the current branch; Bitbucket: the one open PR whose source branch is the current branch) | `pr_read` returns 0; `PR_READ_NUMBER` is the answer |
| `lock` | `.claude/state/develop-pipeline.lock` `.pr_url` → trailing number | the lock's `task_or_story_directory`, canonicalised, equals the `--doc` directory |
| `frontmatter` | `^pr_number:` in `--doc` | a positive integer |
| `body` | first `PR #N` / `pull/N` in `--doc` | the cited PR's head branch (GitHub `gh pr view N --json headRefName`; Bitbucket `GET …/pullrequests/N` `.source.branch.name`) equals the current branch |

Canonicalise directories the way `advance-pipeline-lock.sh --restore` does (strip `./`, trailing `/`, then `cd … && pwd -P`). Source the siblings from the script's own directory (`source "$(dirname "$0")/pr-read.sh" || exit 1`, likewise `resolve-platform.sh` for `$VCS` and, on Bitbucket, `bitbucket-auth.sh`); `jira-list-sprints.sh` sources a sibling the same way. A `pr_read` failure (exit 1 or 3) means "the branch rung did not answer", never an error of the resolver; log its `PR_READ_ERROR` to stderr. A missing Bitbucket credential likewise leaves rungs 2 and 5 unanswered.

**`pr-read.sh` is reused, not restated.** It already owns the current-branch PR query on both forges, the HTTP-status check and the control-character-safe JSON parse (develop-* Step 8 uses it). A second copy of the Bitbucket source-branch query inside the resolver would be a second mechanism for the same job.

### Phase 2: finalise uses it

**`skills/finalise/SKILL.md`** § Step 3a — replace:

```bash
PR_NUMBER=$(grep '^pr_number:' {story-file} | awk '{print $(2)}' | grep -oE '[0-9]+' | head -1)
[ -z "$PR_NUMBER" ] && PR_NUMBER=$(grep -oE 'PR #([0-9]+)|pull/([0-9]+)' {story-file} | grep -oE '[0-9]+' | head -1)
```

with:

```bash
# The PR this run judges — from the branch or the lock before the document (task 175).
PR_JSON=$(bash .agents/skills/finalise/references/resolve-pr-number.sh --doc {story-file} --json)
PR_NUMBER=$(printf '%s' "$PR_JSON" | jq -r '.pr // empty')
PR_SOURCE=$(printf '%s' "$PR_JSON" | jq -r '.source // "none"')
```

and add one line telling the agent to record `PR: #{PR_NUMBER} (source: {PR_SOURCE})` in the running summary's Step 2 header. **No `--pr`:** finalise takes no PR argument and no orchestrator passes one, so the block names no input it would read unbound; rung 1 is for direct callers of the resolver and its tests.

**Step 7.2** (§ "Update Frontmatter") — replace *"Ensure `pr_number` is present in frontmatter (add if only in body)"* with *"Write `pr_number: {PR_NUMBER}` from Step 3a's resolver; when it resolved none, write no `pr_number:` — never a number copied from the body."*

`skills/finalise/SKILL.md` bug-mode `read-document` note: replace *"`PR_NUMBER` comes from Step 3a's existing derivation over the document (`pr_number:` in frontmatter, else `PR #NNN` / `pull/NNN` in the body), which reads a bug file exactly as it reads a task"* with *"`PR_NUMBER` comes from Step 3a's resolver, which reads a bug's branch exactly as it reads a task's"*.

**`shared/resources/finalise-dod-ac-prompt.md`** Step 1 and **`shared/resources/finalise-dod-fix-evidence-prompt.md`** Step 1: replace the *"The PR number from frontmatter (`pr_number:`) or body text (…)"* bullet with *"The PR number is `<PR_NUMBER>`, resolved by the caller. Do not derive it from the document — a document cites other work's PRs (task 175). An empty `<PR_NUMBER>` means none was resolved: report `pr_status: NOT_FOUND`."*

### Phase 3: Tests

**`shared/resources/tests/resolve-pr-number.test.mjs`** (new). Use `fixtureRepo`, `ghStub`, `ghCalls`, `SHELLS` from `./lib/executed-prose.mjs`; run the script from the fixture's work tree with the stub's `bin` first on `PATH`. Cases:

1. `--pr 7` → `{"pr":7,"source":"explicit"}`, no `gh` call.
2. Branch PR 550 exists; document body cites `PR #505` → `branch`, 550.
3. No branch PR; lock `pr_url …/pull/550` with a matching directory → `lock`; with another work item's directory → skips to the next rung.
4. No branch PR, no lock; `pr_number: 550` → `frontmatter`.
5. Rungs 2–4 empty (the stub finds no PR for the branch, no lock, no `pr_number:`); body cites `PR #505`; stub answers PR 505's `headRefName` as another branch → exit 1, `reason: none`, stdout has no number.
6. Rungs 2–4 empty; body cites `PR #550`; stub answers the current branch → `body`, 550.
7. Usage: no `--doc`, `--pr abc` → exit 2.

Presence pin (same file, or `tests/finalise-pr-number-resolution.test.js`): Step 3a contains `resolve-pr-number.sh` (non-vacuity floor), and none of `skills/finalise/SKILL.md`, `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-dod-fix-evidence-prompt.md` carries the derivation regex `PR #([0-9]+)|pull/([0-9]+)`, the prose *"PR number from frontmatter"* or Step 7.2's *"add if only in body"*. No existing test pins any of these literals (`git grep -nF -e 'pull/([0-9]+)' -e 'PR number from frontmatter' -e 'add if only in body' -- '*.test.*' evals tests` → no hits, 2026-10-12).

### Phase 4: Proof and gates

| Mutation | Expected |
| --- | --- |
| Rung 5 accepts the body match without the `headRefName` check | case 5 red |
| Rungs 2 and 4 swapped | case 2 red (a document with a stale `pr_number:`) — add that variant |
| Rung 3 ignores the directory match | case 3's other-work-item variant red |
| The body regex restored in Step 3a | presence pin red |
| Step 7.2's "add if only in body" restored | presence pin red |
| The AC prompt's "from frontmatter or body text" bullet restored | presence pin red |

## Key Patterns and References

- Exit-code contract and header style: `shared/resources/qa-cycle.sh`, `shared/resources/verify-push-state.sh`.
- Directory canonicalisation: `advance-pipeline-lock.sh --restore`.
- Current-branch PR on both forges: `shared/resources/pr-read.sh` (`pr_read`), reused for rung 2.
- `newest-numbered.sh` shows how finalise sources a bundled helper from the repository root.

## Testing Approach

- `node --test shared/resources/tests/resolve-pr-number.test.mjs` under bash and zsh (`SHELLS`).
- Mutations per the table, with a `cp` snapshot and `cmp` restore; record each in the implementation report.
