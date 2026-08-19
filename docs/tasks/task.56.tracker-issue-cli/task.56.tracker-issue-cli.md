---
id: task.56
title: '[Task 56] One CLI for the GitHub issue lifecycle, and honest handling of the mutations that return a value'
type: task
description: 'Consolidates the last prose-driven tracker mutations — GitHub issue create, edit, close, reopen, milestone and sub-issue link — behind a tracker-issue.js CLI on the same reason contract as its siblings. Also confronts the class this sequence has deferred: mutations whose stdout the caller consumes. Wrapping gh issue create under a deferring mode returns nothing and the caller captures empty. The resolution is a dependency edge and an honest two-run convergence, not a fabricated placeholder key, because a placeholder written to frontmatter would defeat the idempotent create guard on the next run.'
tags: [restricted-access, github, issues, cli]
category: refactoring
status: ready-for-review
priority: Medium
risk_level: high
created: 2026-08-17
updated: 2026-08-20
estimated_effort_hours: 12
github_issue: 234
---

# [Task 56] One CLI for the GitHub issue lifecycle, and honest handling of the mutations that return a value

**Start Date**: 2026-08-19

**Completion Date**: 2026-08-20

**Task File**: [task.56.tracker-issue-cli.md](./task.56.tracker-issue-cli.md)

**GitHub Issue**: [#234](https://github.com/Gamaroff/agent-skills/issues/234)

**Status**: Ready for Review

**Review**: ✅ All review recommendations from `task.56.review.1.tracker-issue-cli.md` implemented 2026-08-19

## Overview

Sixth of seven (51–57). Completes coverage of the tracker mutation roster — 22 kinds today, 23 once
this task adds `github.milestone.create`. Depends on 51, 52, 54 and 55.

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

## Technical Background

### Current

`tracker_write` (`shared/resources/resolve-platform.sh:522`) is the task.54 chokepoint. Under a
non-`full` mode it writes a record via `defer-mutation.js`, prints its notice **to stderr only**, and
`return 0`. That is correct for the ~38 sites whose stdout nobody reads. It is exactly wrong for the
ones that do: `X=$(tracker_write gh issue create …)` binds `X` to the empty string, and the caller
proceeds to write nothing — or garbage — into frontmatter.

The wrapper already *recognises* these calls — its argv inference covers `create`, `edit`, `close`
and `reopen` (`resolve-platform.sh:574-580`) — so the gap is not detection. It is that a shell
function cannot both refuse a call and return the value the call would have produced.

Two files state this gap as deliberate and still-open, and both are load-bearing rather than
descriptive:

- `resolve-platform.sh:494` — the `PARTIALLY ENFORCED` notice, which names `gh issue create` and the
  sub-issue link as *"still proceed normally"*. Its own comment reads *"Keep this notice accurate as
  each one lands"*.
- `platform-detection.md:197-201` — *"Those get a purpose-built CLI instead rather than a wrapper
  that silently lies."*

### Target

A purpose-built CLI on the sibling contract. `tracker-issue.js` performs the call under `full` and
prints the value the caller captures; under a deferring mode it writes a record carrying `produces`,
prints nothing to stdout, and exits 0 with `reason: "deferred"`. The caller's capture is empty *by
design and by contract* rather than by accident, and the `ensure-*` skills' existing
*"all failures are non-blocking"* tolerance is what makes an empty capture safe to continue past.

The convergence is the second run: the operator performs the checklist's first item, writes the key
into the document, and re-runs. The sync skill then takes its existing update path.

## Decisions

| Decision | Why |
| -------- | --- |
| **Never fabricate a placeholder key** | Writing `jira_key: <pending>` or `github_issue: 0` to frontmatter would corrupt the document and, worse, defeat the idempotent `synced-from-*` label search that stops the next run creating a duplicate. A wrong key is worse than no key. |
| **Two-run convergence, stated plainly** | Under a deferring mode the create is recorded, frontmatter is left unwritten, and the checklist's first line is: create the issue, write the key into the document, re-run the sync skill. The second run takes the existing update path and converges. This is honest and uses machinery that already exists — it is exactly what the current "Skip — docs only" option leads to, except now the consumer is *told*. |
| **Dependency edges, not orphan records** | Every later action on that issue records `dependsOn` the create, so the checklist renders them nested and the human cannot post a comment on an issue that does not exist yet. |
| **One composite record for the multi-call blocks** | The sub-issue link is a fetch-then-mutate pair; emitting two records would produce two checklist items neither of which can be performed alone. |
| **`blocking: true` earns a banner, not a silent note** | These are the only in-scope records that stop the run being a clean batch. The checklist and the inline summary both call them out at the top. **`blocking` is a NEW schema field** — it exists in neither `tracker-access-record.md`'s field table nor `defer-mutation.js` nor `handover-render.js`, so introducing it is a three-file change, not a use of something already there. |
| **`github.milestone.create` is a new, 23rd kind** | Milestone appears in the roster only as a parenthetical on `github.issue.edit`. `defer-mutation.js` **refuses** a record whose `kind` is off-roster (`:172`) and asserts `roster.size === EXPECTED_KIND_COUNT` (`:64`), so a `milestone` mode with no kind throws at the writer. Folding it into `github.issue.edit` was the alternative and is rejected: four sites create a milestone that does not exist yet, which is a create, and `produces: github.milestoneNumber` is the whole reason it belongs to this task's class. |
| **Flat `--kind` flag, not subcommands** | No CLI in `shared/resources/` takes a positional verb — all three siblings are flat flag parsers, and `gh-stage.js` expresses its second mode as `--probe-board`. `tracker-comment.js:14-16` names *"a step doc author who has read one of these CLIs has read all three"* as a design property. A subcommand CLI would be the first to break it, for no gain. |
| **Sprint operations fold in here** | `jsm_curl` was covered in task.53, but the sprint *skills* still need their `reason` branch and checklist rendering. Small, and it finishes the Jira side. |

## Scope

**In scope:** `tracker-issue.js` covering create / edit / close / reopen / milestone / sub-issue link;
the six bare **board** sites (`gh project item-add` ×5 and the one bare `updateProjectV2ItemFieldValue`);
wrapping the **28** unwrapped `gh` sites; the blocking-record contract; the sprint skills' `reason`
branches.

**Out of scope:** PR create/merge/comment and `git push` — VCS, and the reason the scope line was
drawn there.

### The 28 bare sites

Counted over **canonical prose only** — `skills/*/SKILL.md` plus `shared/resources/*.md`. The
`skills/*/references/` tree is `npm run bundle` output of those same sources and would inflate every
count ~30×; it is not a call-site corpus.

| Verb | Sites | Where |
| ---- | ----: | ----- |
| `gh issue create` | 4 | `create-issue:279`, `ensure-{epic:87,story:102,task:114}-github-issue` |
| `gh issue edit` | 4 | `sync-github-{story:150,task:117,epic:151}`, `finalise:1140` |
| `gh issue close` | 3 | `sync-github-{story:196,task:162,epic:197}` |
| `gh issue reopen` | 3 | `sync-github-{story:198,task:164,epic:199}` |
| `gh issue comment` | 3 | `review-task:1712`, `finalise:1150`, `create-pr:369` |
| milestone create | 4 | `ensure-{story:88,epic:74,task:61}-github-issue`, `sync-github-epic:162` |
| sub-issue link | 1 | `ensure-story-github-issue:167` (with its `SUB_ID` fetch at `:165`) |
| `gh project item-add` | 5 | `ensure-{story:143,epic:120,task:162}-github-issue`, `review-story:2288`, `review-task:1701` |
| `gh api graphql` field-set | 1 | `develop-pipeline-step-0-resolve-and-prepare.md:467` (Priority default) |

The last two rows are why the board sites are in scope rather than left for later. `task.57` is
verification-and-reconcile, not more interception — anything bare when this task lands is bare
permanently. They are also cheap: `github.board.item-add` and `github.board.field-set` are already on
the roster, so they need wrapping, not new kinds. And leaving them would put six entries into the
guard's allowlist on its first run, which is precisely the dumping-ground failure the Risk Assessment
warns about.

Already wrapped and covered free by task.54, requiring no work here:
`develop-pipeline-step-7-finalise.md:170,173,180,183`; `qa-story:1373,1431`; `qa-task:784,837`;
`qa-fix:739`; `review-story:2301`.

## Implementation Plan

**Order matters: item 0 first.** The CLI cannot write a record for a kind the roster does not carry,
so the schema work precedes the code that depends on it.

0. **The roster and the record schema** — `shared/resources/tracker-access-record.md` gains a
   `github.milestone.create` row (consequence `state-drift`, `produces: github.milestoneNumber`) and a
   `blocking` field in the field-reference table; `defer-mutation.js` bumps `EXPECTED_KIND_COUNT`
   22 → 23 and writes the new field. Both are load-bearing: the writer *parses* the roster out of the
   doc, so the two must land together or the suite fails closed.
1. **`shared/resources/tracker-issue.js`** — a flat flag parser taking
   `--kind create|edit|close|reopen|milestone|sub-issue-link`; same exit-0-with-`reason` contract;
   `--json`. Under a deferring mode it writes a record with `produces` set and prints **nothing to
   stdout**. Place the access gate exactly where the siblings do — `dm.resolveAccessTracker(...)`
   between the local work and the first network call, compared `!== "full"`, never truthiness — which
   is what makes "a gated run demonstrably issues no network call" testable rather than asserted.
2. **Wrap the unwrapped `gh` sites** — the 28 enumerated in Scope. The issue-lifecycle verbs route
   through the new CLI; the six board sites go through `tracker_write`, which already infers their
   kinds. Mechanical, and covered by task.54's gate.
3. **The blocking contract** — `blocking` is new (item 0). `produces` and `dependsOn` are **not**:
   `defer-mutation.js` already writes both, and `handover-render.js` already topologically sorts on
   `dependsOn` (`:157`), nests dependants beneath their dependency (`:515`), warns on cycles and
   dangling ids (`:187,197`), and prints `Yields \`…\`` (`:479`) and `# after:` / `# yields:`
   (`:741-743`). What remains is the **banner** and the "write the key, re-run" instruction. Copy the
   shape of the existing `## ⚠️ UNRECORDED` section (`handover-render.js:439-447`) and its summary
   twin (`:871`) rather than inventing a second callout idiom.
4. **`ensure-{story,task,epic}-github-issue`** — return an empty id under a deferring mode, which
   their failure tables already tolerate: *"All failures are non-blocking."* That existing tolerance
   is what makes this safe.
5. **Sprint skills** — `reason` branches and rendering. `jsm_curl` already gates
   (`jira-sprint-lib.sh:30`, task.53); the skills simply never read its result.
6. **A repo-wide guard** — no bare mutating `gh` verb in canonical prose outside an allowlist, with
   each allowlist entry carrying a stated reason. Keeps the call-site count a maintained number
   rather than a one-off audit.

   **Scope it before writing it, or it is unshippable.** Canonical prose is `skills/*/SKILL.md` plus
   `shared/resources/*.md`. Exclude `skills/*/references/` (bundle output) and the roster's own
   *Underlying call* column — ~30 bundled copies of `tracker-access-record.md` contain the literal
   `gh issue create` as documentation, and a naive grep opens with 20+ false positives. Two
   precedents in-repo already solve this exact shape: `tests/executable-instructions.test.js` (greps
   bundled prose against an allowlist, and states the classification-is-the-point rationale verbatim)
   and `tests/restricted-access-docs.test.js`.
7. **The coverage notices** — `resolve-platform.sh:494` and `platform-detection.md:197-201` both
   currently state this gap as open. Update both; see Testing Strategy for the test that pins the
   first.
8. Tests, docs, `npm run bundle` (the `shared/resources/` edits propagate into ~30 skill
   `references/` directories).

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/tracker-issue.js` | **new** — the CLI |
| `shared/resources/tracker-access-record.md` | `github.milestone.create` row; `blocking` in the field table; total 22 → 23 |
| `shared/resources/defer-mutation.js` | `EXPECTED_KIND_COUNT` 22 → 23; write `blocking` |
| `shared/resources/handover-render.js` | the blocking banner (md + summary); renderer arm for the new kind; fix the stale *"21 kinds"* header at `:17` in the same commit |
| `shared/resources/resolve-platform.sh` | the `PARTIALLY ENFORCED` notice at `:494` — the gap it names is the one this task closes |
| `shared/resources/platform-detection.md` | `:197-201` documents the gap as deliberate-and-open |
| `shared/resources/tests/jira-interception.test.mjs` | §10 (`:930-954`) pins the old notice text — see Testing Strategy |
| `shared/resources/tests/tracker-issue.test.mjs` | **new** — the CLI's unit suite, beside its siblings |
| `skills/ensure-{story,task,epic}-github-issue/SKILL.md` | route through the CLI; empty-id path; milestone + sub-issue link + board add |
| `skills/sync-github-{story,task,epic}/SKILL.md` | route through the CLI |
| `skills/create-issue/SKILL.md`, `skills/review-{story,task}/SKILL.md` | route through the CLI; board add |
| `skills/finalise/SKILL.md` | 4 bare sites (`:1140`, `:1150`) — named in Motivation, previously absent here |
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | the bare `updateProjectV2ItemFieldValue` at `:467` |
| `skills/jira-sprint-manager/SKILL.md` | `reason` branches |
| `tests/mutation-call-site-coverage.test.js` | **new** repo-wide guard (already inside the `tests/*.test.js` npm glob) |
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
| Roster | 23 kinds parsed; `github.milestone.create` renders in all four formats |
| `blocking` record | Banner appears at the top of the checklist **and** the inline summary |

**Mutation-prove:** write a placeholder key on defer → the frontmatter test → red · drop `dependsOn`
→ the ordering test → red · split the sub-issue link into two records → the composite test → red ·
make `ensure-*` halt on an empty id → the non-blocking test → red · unwrap one call site → the guard
→ red · leave `EXPECTED_KIND_COUNT` at 22 → the roster parse → red.

### Expected red — one existing assertion, deliberately

`shared/resources/tests/jira-interception.test.mjs` §10 (`:930-954`) asserts that
`resolve-platform.sh` contains the literal `gh issue create`, as the name of a path that is **not**
gated. Closing that gap is this task's purpose, so the assertion must go red and be updated — it is
not collateral damage and must not be worked around by weakening the change.

Update all three statements of the gap together, or the suite and the prose disagree:

| Site | Currently says | Must say |
| ---- | -------------- | -------- |
| `resolve-platform.sh:494` | `gh issue create`, sub-issue links "still proceed normally" | those paths are now gated via `tracker-issue.js` |
| `jira-interception.test.mjs:930-954` | asserts the literal above is present | assert the new wording, both directions |
| `platform-detection.md:197-201` | "deliberately *not* wrapped … get a purpose-built CLI instead" | the CLI exists; describe it |

The `assert.doesNotMatch` guard in that test is the pattern to preserve: it pins **both** directions
so the notice cannot drift into overstating or understating coverage. Keep that property when
rewriting it.

## Success Criteria

- [x] All remaining in-scope GitHub kinds route through the CLI; all 28 bare sites covered, zero
      remaining outside the guard's allowlist
- [x] No placeholder key is ever written; frontmatter is left untouched on defer
- [x] Dependent actions render after their prerequisite, never before
- [x] A second run with the key present converges without creating a duplicate
- [x] Blocking records are called out in both the checklist and the inline summary
- [x] The repo-wide guard fails when a bare mutating `gh` verb appears in canonical prose, and does
      **not** fire on bundled `references/` copies or on the roster's own *Underlying call* column
- [x] The two-run convergence is documented where a consumer will meet it, not only in this task
      document — a run that appears to do nothing twice is indistinguishable from a broken one
- [x] `full` mode byte-identical — no behavioural change for an unrestricted consumer
- [x] The three statements of the old gap (`resolve-platform.sh:494`,
      `jira-interception.test.mjs` §10, `platform-detection.md:197-201`) are updated together and
      agree with each other
- [x] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

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

## Progress Tracking

- [x] 0. Roster + record schema — `github.milestone.create`, `blocking`, count 22 → 23
- [x] 1. `shared/resources/tracker-issue.js`
- [x] 2. Wrap the 28 bare sites
- [x] 3. The blocking banner + the "write the key, re-run" instruction
- [x] 4. `ensure-{story,task,epic}-github-issue` empty-id path
- [x] 5. Sprint skills `reason` branches
- [x] 6. Repo-wide guard
- [x] 7. The three coverage notices updated together
- [x] 8. Tests, docs, `npm run bundle`

## Implementation Notes

### What the work found that the plan did not predict

**The `⏸️` notice was on stdout.** The first implementation copied `makeOutput`
verbatim from `tracker-comment.js`, whose `info()` writes via `console.log`. In
that CLI stdout is inert; here it is the value channel. A caller doing
`N=$(tracker-issue.js --kind create …)` would have captured the sentence
*"⏸️ access.tracker=manual — not performing create a GitHub issue; recorded as
d5b82bfe."* and written it into frontmatter as an issue number — the exact class
of failure this task exists to remove, reintroduced by the act of matching the
sibling contract too closely. `info`/`warn`/`err` now go to stderr; only the
produced value and the `--json` payload reach stdout. §2 of the test suite
asserts stdout is **byte-empty** under every deferring mode, and the mutation
that restores `console.log` turns it red.

**Two pinned assertions had to move, not one.** The review predicted
`jira-interception.test.mjs` §10. There was a second, in
`tracker-access.test.sh`, asserting the same stale sentence — and a third
(`§12`) hard-coding `EXPECTED_KIND_COUNT = 22`. All three pinned a fact this task
changes. Each was updated to keep its both-directions property rather than being
loosened: §10 and the shell suite now also assert the *understating* wording is
absent, because claiming a gated path is ungated sends an operator hunting for a
mutation the run already recorded.

**Three test literals were replaced by derivations.** `handover-render.test.mjs`
hard-coded the roster size in three places and `jira-interception.test.mjs` in two
more, so adding one kind turned a two-file change into a seven-file one and the
extra edits carried no information. They now read the count from the fixture and
from the source, and §12 additionally cross-checks that the roster doc's total and
`EXPECTED_KIND_COUNT` agree **in the source** — one fact stored twice, which the
writer already throws over at run time.

**The guard found two call sites the audit missed.** `create-pr:369` and
`review-task:1712` both carried a bare `gh issue comment`. Neither appeared in the
28-site inventory because both were counted as already-covered comment sites. They
were not: they bypassed `tracker-comment.js` entirely, so they were unmarked as
well as ungated — an unmarked comment recurs on every resume. That is precisely
the "maintained number rather than a one-off audit" the guard was specified for,
and it earned its place on its first run.

**`--remove-label ""` would have failed every priority-preserving sync.** The
`sync-github-*` skills spell the flag as `--remove-label "$OLD_PRIORITY_LABEL_IF_DIFFERENT"`,
which expands to the empty string on the common path where priority did not
change. `gh` reads that as a request to remove a label named `""`, fails the whole
edit, and takes the title/body/milestone changes in the same call down with it.
The builder drops empty label values.

### Deferred

Nothing. Every scope item landed, including the six board sites the review
brought in.

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-19 | 1.1 | Review (8.5/10) — 3 critical, 5 important fixed: `blocking` and `github.milestone.create` named as new schema work; the "existing suites green unchanged" criterion corrected against the assertion it contradicts; Files Summary +9 files; count 20 → 28; subcommands → flat `--kind`; board sites brought in scope; guard scoping rule stated | review-task |
| 2026-08-19 |  | Status → ready-for-development | review-task |
| 2026-08-20 |  | Implemented — tracker-issue.js + 23rd roster kind + blocking banner; 28 call sites routed; repo-wide guard added; 31 new tests, 1564 passing | develop |

## References

- [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) — `produces` / `dependsOn` in the record
- [task.54](../task.54.github-board-interception/task.54.github-board-interception.md) — `tracker_write`, which covers the wrapped sites
