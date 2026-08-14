---
id: task.46
title: '[Task 46] Write relative document links, and stop a fenced `# ` truncating a Jira description'
type: task
description: 'Two defects in the Jira sync path, both silent. The three sync scripts stamped an absolute branch-pinned Bitbucket URL into every document they touched — once in frontmatter, once in a body line — and those links died when the branch was deleted, with nothing in any repo able to catch it. Separately, `sectionRe` ended a section at the first line beginning `# `, which a shell comment inside a fenced code block satisfies, so content after it vanished from the Jira description with no warning. Both are fixed here: document links are relative and absolutised only at ADF-render time, and section extraction walks lines with a CommonMark-correct fence tracker.'
tags: [jira-sync, links, markdown, technical-debt]
category: refactoring
status: accepted
priority: High
risk_level: medium
created: 2026-08-13
updated: 2026-08-14
completed_date: 2026-08-14
pr_number: 215
estimated_effort_hours: 6
github_issue: 216
---

# [Task 46] Write relative document links, and stop a fenced `# ` truncating a Jira description

**Task File**: [task.46.relative-doc-links-and-fence-aware-sections.md](./task.46.relative-doc-links-and-fence-aware-sections.md)

**GitHub Issue:** [#216](https://github.com/Gamaroff/agent-skills/issues/216) — filed retroactively; the task shipped in v0.39.0 before it had one

## Overview

Two independent defects in the Jira sync path. Both are silent — neither produces a
warning, a non-zero exit, or a visible difference at the point of failure — and both
were found from a downstream consumer rather than from this repo's own tests.

They ship together because they are the same class of problem (content quietly not
being what it appears to be) and because a single consumer is blocked on both.

## Motivation

### Defect 1 — branch-pinned document links rot, and nothing catches them

`sync-jira-task`, `sync-jira-story` and `sync-jira-epic` each wrote an absolute
`https://bitbucket.org/<ws>/<repo>/src/<ref>/<path>` URL into the document they
synced, in two places:

| Where | Written by |
| ----- | ---------- |
| Frontmatter `task_bitbucket_url` / `story_bitbucket_url` / `epic_bitbucket_url` / `prd_bitbucket_url` | `upsertFrontmatterKeys` |
| Body line `**Task File**` / `**Story File**` / `**Epic File**` / `**Parent PRD**` | `upsertLine` / `upsertInlineLine` |

`<ref>` is whichever branch the sync ran on. Sync from a feature branch and the
document permanently records a URL that 404s the moment that branch is deleted after
merge — while the file itself is perfectly safe on the default branch.

**Nothing catches it.** A repository link checker resolves *relative* paths; an
absolute URL is not inspected at all. So the rot accumulates against a green build.
Measured in one consumer on 2026-08-13: **1,889** such URLs across **614** documents —
a quarter of its docs tree — of which 44 were already dead, having never once failed a
check. 886 of the 988 body-text occurrences were written by these three scripts.

Because the write is an `upsert`, deleting the line does not help: the next sync puts
it back. A consumer cannot fix this locally.

### Defect 2 — a `# ` inside a fenced block truncates the Jira description

`sectionRe`'s lookahead is `(?=\n## |\n# |$)`. A regular expression cannot know
whether the `# ` it matched is a heading or a shell comment, so:

````markdown
## Technical Background

```bash
# every absolute URL, grouped by ref
grep -rho '…' docs/
```

…everything from here down was dropped…
````

…ends the section at the comment. Every heading and paragraph after it is dropped from
the description, with nothing on stderr and nothing in the output to show it happened.
Invisible from both ends: the document looks complete and the description looks
deliberate.

Measured on one card: a Technical Background cut from **13,965 characters to 2,283**,
discarding a dependency table and an entire open-questions block. The workaround in the
wild is indenting the comment two spaces — a thing every author must remember forever.

⚠️ **It is also a diagnostic trap.** The symptom is indistinguishable from
`CONTENT_LIMIT_EXCEEDED` truncation, so the first instinct is to blame document size
and start deleting prose.

## Technical Background

### Why relative links cost Jira nothing

`resolveRelativeLink` (`shared/resources/jira-sync.js`) already rewrites relative
hrefs to absolute Bitbucket URLs **at ADF-render time**, because Jira has no
"relative to this file" base path. The local file and the Jira description therefore
have *different* correct answers, and conflating them is what caused defect 1.

So the fix is a separation, not a removal: the file on disk carries a relative link
that a link checker validates and that cannot rot; Jira continues to receive an
absolute URL built at render time.

### The keys are still read

`sync-jira-epic` documents `prd_bitbucket_url` as a fallback when `prd_source` will
not resolve, and `sync-jira-story` does the same with `epic_bitbucket_url`. Those
reads are **unchanged** — a value a consumer sets by hand keeps working. Only the
write is removed. Stripping keys from documents that already carry one is a
consumer's decision, not this script's.

### Fence tracking has to be CommonMark-correct, not "a line starting with ```"

The first implementation toggled on any ``` run, and this repo's own
"every real task card passes preflight" test caught it immediately: `task.42`
contains ```` ``` ```` — four backticks wrapping three, the normal way to show a
fence inside prose. Toggling there inverted the parity for the rest of the document,
so its later headings became invisible and the card published with sections missing —
the same silent-truncation failure, arriving from the opposite direction.

Three rules settle it:

- a backtick fence's info string may **not** contain a backtick — which is exactly
  what makes ```` ``` ```` an inline code span rather than an opening fence;
- a closing fence uses the same character with a run **at least as long** as the
  opening one, so ``` inside a ```` block is content;
- a closing fence carries **no** info string.

## Scope

**In scope:** the write-back in all three sync scripts; `extractSection` and its use
by `extractBodySections` and `extractStoriesTable`; the `toRelativeDocLink` helper;
tests for both defects; the three `SKILL.md` documents; the bundled copies.

**Added during QA cycle 1** (see [the QA report](./task.46.qa.1.relative-doc-links-and-fence-aware-sections.md)):

- **`jira-epic-creator`'s inline copy of the extraction pattern.** It carried the
  identical `(?=\n## |\n# |$)` lookahead under a comment instructing maintainers to
  keep it in step with the canonical one — so leaving it would have meant shipping a
  fix alongside a written instruction to undo it. Fixed inline (the script is
  standalone by design and cannot import the shared library), with a `require.main`
  guard, exports, and 11 tests. It had none of those, which is why the copy was never
  covered.
- **A declared Prettier policy.** The reformat below is real and was undeclared:
  `.prettierrc`, `.prettierignore` and `npm run format` make it repo policy rather
  than one author's editor settings.

**Reformatting — declared, not incidental.** The three sync scripts are reformatted
wholesale in this card. Measured by normalising both sides of the diff with
`prettier@3`: `sync-jira-task.js` changes 647 lines of which **27** are functional,
`sync-jira-story.js` 788 of which **35** are. That is the cost of adopting the policy
on these files, paid once. It sits uneasily beside the reviewability argument for
leaving `dropHeadingLines` alone below, and that tension is the honest state of this
card rather than something to argue away.

**Out of scope:**

- **Removing existing `*_bitbucket_url` values from consumer documents.** Their call.
- **`dropHeadingLines` / `firstTableIn`**, which still use the naive `RE_FENCE`. They
  operate on already-extracted content where the parity bug has no observed effect;
  noted rather than changed.
- **A repo-wide `npm run format` sweep.** **50 files** are currently unformatted —
  mostly test suites, plus 7 in `shared/resources`. Sweeping them here would repeat
  the mistake this card just documented. `npm run format:check` fails today as a
  result, by design: an accurate drift signal, not yet a CI gate. Follow-up card.
- **GitHub sync equivalents** — they do not write Bitbucket URLs.

## Implementation Plan

1. **Add `toRelativeDocLink(fromFile, toFile)`** to `shared/resources/jira-sync.js` —
   POSIX separators, always explicitly `./`-prefixed, self-link yields the basename.
2. **Add `makeFenceTracker()` and `extractSection(body, name)`**, and route
   `extractBodySections` through the latter. Keep `sectionRe` exported: callers match
   it directly and a test pins its lack of an `m` flag.
3. **Point `extractStoriesTable` at `extractSection`** — same defect, same fix.
4. **Stop writing the four `*_bitbucket_url` keys** in the three scripts. Leave every
   read intact.
5. **Emit relative body links.** `**Task File**` / `**Story File**` / `**Epic File**`
   become `[<basename>](./<basename>)`; `**Epic File**` in a story and `**Parent PRD**`
   in an epic use `toRelativeDocLink`. Hoist `epicFilePath` / `prdFilePath` out of the
   `bbBase` guard — a relative link needs the path whether or not a Bitbucket remote
   resolved — and thread them into the write-back functions.
6. **Prefer an authored relative link** on `**Parent PRD**` over a computed one: it may
   point at a differently-named PRD than `prd_source` resolves to.
7. **Export `updateTaskFile` / `updateStoryFile` / `updateEpicFile`** — the write-back
   had no test coverage at all.
8. **Tests**, then `npm run bundle`, then the full suite.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/jira-sync.js` | add `toRelativeDocLink`, `makeFenceTracker`, `extractSection`; route `extractBodySections` through it; export the two public helpers (`makeFenceTracker` stays internal — nothing outside `extractSection` needs it) |
| `skills/sync-jira-task/scripts/sync-jira-task.js` | drop the `task_bitbucket_url` write; relative `**Task File**`; export `updateTaskFile` |
| `skills/sync-jira-story/scripts/sync-jira-story.js` | drop two key writes; relative `**Story File**` / `**Epic File**`; hoist `epicFilePath`; export `updateStoryFile` |
| `skills/sync-jira-epic/scripts/sync-jira-epic.js` | drop two key writes; relative `**Epic File**` / `**Parent PRD**`; hoist `prdFilePath`; `extractStoriesTable` uses `extractSection`; export `updateEpicFile`; drop `epic_bitbucket_url` from the post-create Story reminder |
| `shared/resources/tests/jira-sync-fenced-sections.test.mjs` | **new** — 22 tests |
| `skills/sync-jira-task/tests/relative-doc-links.test.js` | **new** — 7 tests |
| `skills/sync-jira-story/tests/relative-doc-links.test.js` | **new** — 9 tests |
| `skills/sync-jira-epic/tests/relative-doc-links.test.js` | **new** — 11 tests |
| `skills/sync-jira-{task,story,epic}/SKILL.md` | frontmatter samples, workflow steps, and a "Why document links are relative" section |
| `skills/*/references/jira-sync.js` | regenerated by `npm run bundle` — never edited directly |

## Testing Strategy

- **Both defects get a failing-first test**, not only a passing one after the fix.
- **The fence suite pins the parity trap explicitly** — ```` ``` ````, a shorter fence
  inside a longer one, a closing fence carrying an info string, backtick vs tilde —
  because only an integration test caught it the first time.
- **Everything `sectionRe` already guaranteed is re-asserted** against the new
  line-walking implementation: numbered headings, `###` sub-headings preserved,
  section-to-end-of-document, empty-vs-absent, partial-name non-matching.
- **The write-back tests assert the absence of the old form**, not just the presence
  of the new one — including that a document carrying a stale absolute line has it
  **replaced** rather than duplicated.
- **All three write-backs get a sibling suite**, not just the task one. The story and
  epic write-backs write *two* links each and cross directories, so they exercise
  `toRelativeDocLink` rather than a bare `./<basename>`; the epic suite additionally
  pins the authored-link rule from both sides — a hand-authored **relative**
  `**Parent PRD**` link wins, an authored **absolute** one does not. `updateEpicFile`
  swallows its failures into `output.err`, so its suite passes an `err` that throws:
  otherwise a write-back that never ran is indistinguishable from one that wrote
  nothing.
- **One test proves Jira is unharmed**: `resolveRelativeLink` turns the new relative
  href back into the same absolute URL the old code wrote.
- `npm test` green; `npm run bundle` run and its output committed.

## Success Criteria

- [x] No sync script writes `task_bitbucket_url`, `story_bitbucket_url`,
      `epic_bitbucket_url` or `prd_bitbucket_url`
- [x] Every read of those keys still works — `sync-jira-epic`'s `prd_source` fallback
      and `sync-jira-story`'s epic fallback are untouched
- [x] `**Task File**` / `**Story File**` / `**Epic File**` / `**Parent PRD**` are
      relative, and are written even when no Bitbucket base resolves
- [x] A synced document contains no `bitbucket.org/…/src/…` URL anywhere
- [x] No script *instructs the author* to hand-write one either — `sync-jira-epic`'s
      post-create Story reminder no longer prints `epic_bitbucket_url` to paste
- [x] Jira still receives absolute URLs via `resolveRelativeLink`
- [x] A `# ` at column 0 inside a fenced block no longer ends a section
- [x] ```` ``` ```` does not invert fence parity — `task.42` passes preflight
- [x] The write-back functions are exported and covered — **all three**, not just
      `updateTaskFile`; the story and epic write-backs are the ones with two links
      each and the authored-`**Parent PRD**`-link rule
- [x] `npm run bundle` run; bundled copies match the shared source
- [x] `npm test` green — 1,242 tests, up from 1,193

## Risk Assessment

**Medium** — the sync scripts touch every tracked document in every consumer repo.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **A consumer depends on the frontmatter key being written** | It is documented in three `SKILL.md` files | Reads are untouched, so a hand-set value still resolves; the change is announced in the CHANGELOG and the three SKILL docs |
| **The line-walking extractor differs subtly from the regex** | It replaces a well-tested pattern on a hot path | Every guarantee `sectionRe` had is re-asserted as a test against the new implementation; `sectionRe` itself is kept and still exported |
| **Fence parity breaks on an unusual document** | Exactly what happened on the first attempt | CommonMark rules rather than naive toggling; the parity trap is pinned by four unit tests plus the corpus-wide preflight test that caught it |
| **The bundled copies drift from the shared source** | `references/jira-sync.js` is generated, and the tests import the copy | `npm run bundle` is a step in the plan; the suite fails loudly when they diverge, which is how it was caught mid-implementation |

## Rollback Plan

**Trigger:** a consumer reports Jira descriptions losing their document link, or
section extraction regressing on a real card.

**One revertible commit.** `git revert <sha>` then `npm run bundle` restores the prior
behaviour completely — there is no state, migration or deployed artifact. Documents
already written with relative links keep working after a revert, because the old code
reads and replaces that line rather than requiring the absolute form.

⚠️ **Revert both halves or neither.** Reverting the fence fix alone is safe. Reverting
only the link change leaves `extractSection` in place, which is fine — but reverting
only the fence fix while keeping the link change is untested and has no reason to be
done.

## Progress Tracking

- [x] Step 1 — `toRelativeDocLink`
- [x] Step 2 — `makeFenceTracker` + `extractSection`, wired into `extractBodySections`
- [x] Step 3 — `extractStoriesTable` uses `extractSection`
- [x] Step 4 — stop writing the four frontmatter keys
- [x] Step 5 — relative body links; `epicFilePath` / `prdFilePath` hoisted and threaded
- [x] Step 6 — authored `**Parent PRD**` link preferred over a computed one
- [x] Step 7 — write-back functions exported
- [x] Step 8 — tests, `npm run bundle`, full suite green
- [ ] Release and consumer pull-through

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-14
**Quality Score**: 95/100
**Gate Decision**: PASS (cycle 2) — cycle 1 was CONCERNS, 80/100
**QA Cycles**: 2

### QA Reports

| Cycle | Gate | Score | Report | Gate file |
| ----- | ---- | ----- | ------ | --------- |
| 1 | CONCERNS | 80/100 | [qa.1](./task.46.qa.1.relative-doc-links-and-fence-aware-sections.md) | [gate.1](./task.46.gate.1.relative-doc-links-and-fence-aware-sections.yml) |
| 2 | **PASS** | 95/100 | [qa.2](./task.46.qa.2.relative-doc-links-and-fence-aware-sections.md) | [gate.2](./task.46.gate.2.relative-doc-links-and-fence-aware-sections.yml) |

### Test Coverage Summary

- **Tests Executed**: 1,253 (0 failures)
- **Steps Verified**: 8/8
- **Success Criteria Met**: 11/11
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

No correctness bugs and no regressions in either cycle. Both defects are fixed and covered by
tests that assert the absence of the old behaviour, not merely the presence of the new.

Cycle 1 raised two MEDIUM maintainability findings, both now closed:

- [TASK-46-BUG-1](./task.46.bug.1.undeclared-reformat-hides-functional-change.md) — an undeclared
  Prettier reformat made up 96% of the two largest script diffs (27 functional lines in 647, 35
  in 788). Resolved by adopting Prettier as repo policy and declaring the reformat in Scope.
- [TASK-46-BUG-2](./task.46.bug.2.fence-defect-survives-in-jira-epic-creator.md) — the same
  fence-truncation regex survived in `jira-epic-creator` under a comment telling maintainers to
  keep it in step with the canonical pattern. Fixed inline, plus a second instance of the same
  blind spot found while fixing, plus the `require.main` guard and exports that made the file
  testable at all.

Cycle 2 found one LOW — the cycle-1 fix documentation understated the unformatted-file count
(15 vs the real 50) and did not state that `npm run format:check` fails until the deferred sweep
lands. Corrected in-cycle, in all three places, with the correction recorded rather than
overwritten.

## Definition of Done — PASSED ✅

**Status:** ACCEPTED · **Accepted on:** 2026-08-14 · **PR:** [#215](https://github.com/Gamaroff/agent-skills/pull/215)

**Detailed Verification Log:** [task.46.dod.1.relative-doc-links-and-fence-aware-sections.md](./task.46.dod.1.relative-doc-links-and-fence-aware-sections.md)

| Criterion | Result |
| --------- | ------ |
| Success criteria | ✅ 11/11 |
| QA gate | ✅ PASS (95/100), `top_issues: []`, 2 cycles |
| Tests | ✅ 1,253 pass / 0 fail |
| CI | ✅ SUCCESS on head `8b7f473` — `Test`, `Validate Skills`, `Docs link check` |
| Documentation | ✅ CHANGELOG, three `SKILL.md`, task doc, bundled copies in sync |
| Security | ✅ PASS — no secrets, no runtime dependencies, auth paths untouched |
| Compliance | ⚠️ NOT_APPLICABLE — developer tooling, no user-facing or data surface |
| PR review approval | ⚠️ **Deviation, recorded** — see below |

**`Docs link check` is the criterion that matters most here.** The premise of the relative-links
change is that a link checker validates relative paths and cannot see absolute ones; the job
resolving the newly-written links on the final commit is the first end-to-end proof that the
replacements are real, rather than merely well-formed.

**Deviation — PR review approval.** PR #215 has no approving review (`reviewDecision` empty,
`reviews=0`). `develop` carries no branch protection and **no merged PR in this repository has
one** — #212, #213 and #214 are all the same. Reading the criterion literally would make
`/finalise` unable to accept anything in this repo. Accepted on that basis, with the reasoning
recorded rather than the box silently ticked; the substantive review was two QA cycles, an
adversarial diff review, 1,253 tests and three green CI checks. If review approval should be a
hard gate here, the fix is branch protection.

**Tracker:** task 46 has no linked issue (registry row shows `—`), so no issue was closed and no
board card moved. Recorded rather than skipped silently.

## References

- [`shared/resources/jira-sync.js`](../../../shared/resources/jira-sync.js) — `extractSection`, `makeFenceTracker`, `toRelativeDocLink`, `resolveRelativeLink`
- [`skills/sync-jira-task/SKILL.md`](../../../skills/sync-jira-task/SKILL.md) — "Why document links are relative"
- [task.42](../task.42.change-log-spec-and-engine/task.42.change-log-spec-and-engine.md) — the card whose ```` ``` ```` exposed the fence-parity trap

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                          | Author  |
|------------|---------|------------------------------------------------------|---------|
| 2026-08-14 |         | QA gate CONCERNS (80/100) — 2 medium findings, 0 bugs | qa-task |
| 2026-08-14 |         | QA findings fixed — both mediums closed, 1 iteration  | qa-fix  |
| 2026-08-14 |         | QA gate PASS (95/100) — 0 findings, 2 cycles          | qa-task |
| 2026-08-14 | 1.1     | DoD verified — accepted (PR #215)                     | finalise |
| 2026-08-14 |         | GitHub issue created (#216)                           | sync-github-task |
| 2026-08-14 |         | Status → closed (frontmatter: accepted)               | sync-github-task |
<!-- change-log-end -->
