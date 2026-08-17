---
id: task.56
title: '[Task 56] One CLI for the GitHub issue lifecycle, and honest handling of the mutations that return a value'
type: task
description: 'Consolidates the last prose-driven tracker mutations — GitHub issue create, edit, close, reopen, milestone and sub-issue link — behind a tracker-issue.js CLI on the same reason contract as its siblings. Also confronts the class this sequence has deferred: mutations whose stdout the caller consumes. Wrapping gh issue create under a deferring mode returns nothing and the caller captures empty. The resolution is a dependency edge and an honest two-run convergence, not a fabricated placeholder key, because a placeholder written to frontmatter would defeat the idempotent create guard on the next run.'
tags: [restricted-access, github, issues, cli]
category: refactoring
status: planned
priority: Medium
risk_level: high
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 12
github_issue: 234
---

# [Task 56] One CLI for the GitHub issue lifecycle, and honest handling of the mutations that return a value

**Task File**: [task.56.tracker-issue-cli.md](./task.56.tracker-issue-cli.md)

**GitHub Issue**: [#234](https://github.com/Gamaroff/agent-skills/issues/234)

## Overview

Sixth of seven (51–57). Completes coverage of the 20 in-scope tracker mutation kinds. Depends on 51,
52, 54 and 55.

## Motivation

After tasks 53–55 the remaining uncovered kinds are the GitHub issue lifecycle: create, edit, close,
reopen, milestone create, and sub-issue link. They live as `gh` invocations in prose across
`ensure-{story,task,epic}-github-issue`, `sync-github-{story,task,epic}`, `create-issue`,
`review-story`, `review-task` and the finalise step doc.

Some are already wrapped in `tracker_call_with_retry` and are therefore covered for free by task.54's
`tracker_write`. **The rest are not, and a specific subset cannot be.**

### The class this sequence has been deferring

`gh issue create` returns an issue number the caller captures and writes to frontmatter. The
sub-issue link needs an internal database id fetched by a preceding `gh api` call and fed to the next
one in the same block. Wrapping either under a deferring mode returns nothing, `$( )` captures empty,
and the caller writes garbage or silently skips.

This is the same shape as `create-pr` returning a PR URL — the reason VCS is out of scope. But issue
creation is *in* scope, so it has to be answered rather than avoided.

## Decisions

| Decision | Why |
| -------- | --- |
| **Never fabricate a placeholder key** | Writing `jira_key: <pending>` or `github_issue: 0` to frontmatter would corrupt the document and, worse, defeat the idempotent `synced-from-*` label search that stops the next run creating a duplicate. A wrong key is worse than no key. |
| **Two-run convergence, stated plainly** | Under a deferring mode the create is recorded, frontmatter is left unwritten, and the checklist's first line is: create the issue, write the key into the document, re-run the sync skill. The second run takes the existing update path and converges. This is honest and uses machinery that already exists — it is exactly what the current "Skip — docs only" option leads to, except now the consumer is *told*. |
| **Dependency edges, not orphan records** | Every later action on that issue records `dependsOn` the create, so the checklist renders them nested and the human cannot post a comment on an issue that does not exist yet. |
| **One composite record for the multi-call blocks** | The sub-issue link is a fetch-then-mutate pair; emitting two records would produce two checklist items neither of which can be performed alone. |
| **`blocking: true` earns a banner, not a silent note** | These are the only in-scope records that stop the run being a clean batch. The checklist and the inline summary both call them out at the top. |
| **Sprint operations fold in here** | `jsm_curl` was covered in task.53, but the sprint *skills* still need their `reason` branch and checklist rendering. Small, and it finishes the Jira side. |

## Scope

**In scope:** `tracker-issue.js` covering create / edit / close / reopen / milestone / sub-issue link;
wrapping the ~20 unwrapped `gh` sites in `tracker_write`; the blocking-record contract; the sprint
skills' `reason` branches.

**Out of scope:** PR create/merge/comment and `git push` — VCS, and the reason the scope line was
drawn there.

## Implementation Plan

1. **`shared/resources/tracker-issue.js`** — subcommands for each kind; same exit-0-with-`reason`
   contract; `--json`. Under a deferring mode, records with `produces` set where a value is returned.
2. **Wrap the unwrapped `gh` sites** in `tracker_write` — mechanical, and covered by task.54's gate.
3. **The blocking contract** — `produces`, `dependsOn`, the banner in the checklist and the inline
   summary, and the "write the key, re-run" instruction.
4. **`ensure-{story,task,epic}-github-issue`** — return an empty id under a deferring mode, which
   their failure tables already tolerate: *"All failures are non-blocking."* That existing tolerance
   is what makes this safe.
5. **Sprint skills** — `reason` branches and rendering.
6. **A repo-wide guard** — no bare mutating `gh` verb in canonical prose outside an allowlist, with
   each allowlist entry carrying a stated reason. Keeps the call-site count a maintained number
   rather than a one-off audit.
7. Tests, docs, `npm run bundle`.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/tracker-issue.js` | **new** |
| `skills/ensure-{story,task,epic}-github-issue/SKILL.md` | route through the CLI; empty-id path |
| `skills/sync-github-{story,task,epic}/SKILL.md` | route through the CLI |
| `skills/create-issue/SKILL.md`, `skills/review-{story,task}/SKILL.md` | route through the CLI |
| `skills/jira-sprint-manager/SKILL.md` | `reason` branches |
| `tests/mutation-call-site-coverage.test.js` | **new** repo-wide guard |
| `docs/reference/troubleshooting.md` | the two-run convergence, and why no placeholder key is written |
| `docs/reference/configuration.md` | which kinds are covered, and which return values are not |

## Testing Strategy

| Case | Asserted |
| ---- | -------- |
| `full`, each kind | Behaves as today; existing suites green unchanged |
| `manual`, create | Recorded with `produces`; **frontmatter unwritten**; no placeholder anywhere |
| `manual`, dependent actions | `dependsOn` the create; rendered nested, never before it |
| Sub-issue link | **One** composite record, not two |
| `ensure-*` under a deferring mode | Returns empty; caller continues, per its existing non-blocking contract |
| Second run with the key present | Takes the update path and converges — no duplicate created |
| Canonical prose | No bare mutating `gh` verb outside the allowlist |

**Mutation-prove:** write a placeholder key on defer → the frontmatter test → red · drop `dependsOn`
→ the ordering test → red · split the sub-issue link into two records → the composite test → red ·
make `ensure-*` halt on an empty id → the non-blocking test → red · unwrap one call site → the guard
→ red.

## Success Criteria

- [ ] All remaining in-scope GitHub kinds route through the CLI
- [ ] No placeholder key is ever written; frontmatter is left untouched on defer
- [ ] Dependent actions render after their prerequisite, never before
- [ ] A second run with the key present converges without creating a duplicate
- [ ] Blocking records are called out in both the checklist and the inline summary
- [ ] The repo-wide guard fails when a bare mutating `gh` verb appears in canonical prose
- [ ] The two-run convergence is documented where a consumer will meet it, not only in this task
      document — a run that appears to do nothing twice is indistinguishable from a broken one
- [ ] `full` mode byte-identical; existing suites green unchanged
- [ ] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

## Risk Assessment

**High** — touches issue creation, which every downstream tracker action depends on.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **A duplicate issue on the second run** | The convergence story depends on the idempotent create guard | The existing `synced-from-*` label search is why no placeholder may be written; a dedicated two-run test |
| **A caller captures empty and writes it** | `$( )` returns empty under defer | The `ensure-*` skills already document empty-and-continue; every other site is audited in this task and covered by the guard |
| **The two-run story is not communicated** | A consumer re-runs and wonders why nothing changed | It is the checklist's first line and appears in the inline summary; documented in the runbook |
| **Allowlist becomes a dumping ground** | Guards that cry wolf get disabled | Each entry states why the call is not a mutation; the classification is the point |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. Consumers on `full` are unaffected; restricted consumers
lose GitHub issue-lifecycle coverage and retain everything from tasks 53–55.

## References

- [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) — `produces` / `dependsOn` in the record
- [task.54](../task.54.github-board-interception/task.54.github-board-interception.md) — `tracker_write`, which covers the wrapped sites
