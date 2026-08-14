---
id: task.47
title: '[Task 47] The `--json` samples under-document the payload, and nothing checked'
type: task
description: 'Documenting the task.46 change removed the *_bitbucket_url keys from the --json output samples in all three sync-jira-* SKILL.md files. Removing them from the frontmatter samples was right — the scripts genuinely stopped writing those keys. Removing them from the --json samples was wrong: all three still emit them there, because that payload reports the URL used for the Jira link rather than anything written to the file. Two identically-named things with different lifetimes, edited as if they were one. Restores the keys, says in each document why the two differ, and adds a guard so a sample cannot drift from its script again.'
tags: [documentation, jira-sync, testing]
category: documentation
status: in-progress
priority: Medium
risk_level: low
created: 2026-08-14
updated: 2026-08-14
estimated_effort_hours: 2
---

# [Task 47] The `--json` samples under-document the payload, and nothing checked

**Task File**: [task.47.json-output-sample-fidelity.md](./task.47.json-output-sample-fidelity.md)

## Overview

A documentation defect introduced by [task.46](../task.46.relative-doc-links-and-fence-aware-sections/task.46.relative-doc-links-and-fence-aware-sections.md),
found while closing out the consumer-side card that motivated it.

## Motivation

task.46 stopped the three `sync-jira-*` scripts **writing** `*_bitbucket_url` keys into documents.
Updating the **frontmatter** samples in `SKILL.md` to match was correct. Updating the **`--json`
output** samples the same way was not: all three scripts still emit those keys there, because the
`--json` payload reports the absolute URL used for the **Jira** link — built at ADF-render time —
which is a different thing from what lands in the file.

| Script | Line | Still emitted |
| ------ | ---- | ------------- |
| `sync-jira-task.js` | 923 | `task_bitbucket_url` |
| `sync-jira-story.js` | 1141–1142 | `epic_bitbucket_url`, `story_bitbucket_url` |
| `sync-jira-epic.js` | 1345–1346 | `epic_bitbucket_url`, `prd_bitbucket_url` |

**Nothing caught it.** Every existing test asserts on behaviour; none compared a documented payload
against the emitted one. So all three skills shipped a sample that under-documents their own output,
and a consumer scripting against `--json` would have discovered the extra keys only by printing them.

The root cause is worth naming precisely, because it will recur otherwise: the frontmatter key and the
`--json` key have the **same name and different lifetimes**. One was removed, one was not. An edit
that treats the name as the identity gets it wrong every time.

## Scope

**In scope:** restoring the keys to the three `--json` samples; a note in each explaining why the two
samples disagree; a drift guard.

**Out of scope:**

- **Making `sync-jira-epic`'s two payloads consistent.** Its no-change fast path emits
  `action: "skip"` with fewer keys than the main path. That is defensible — there is no new URL to
  report — and the guard accommodates it explicitly rather than forcing the script to pad with nulls.
  Recorded here because the guard surfaced it, not because this card changes it.
- **The frontmatter samples**, which task.46 updated correctly.

## Implementation Plan

1. **Restore the keys** to the `--json` sample in each of the three `SKILL.md` files.
2. **Add the distinguishing note** beneath each sample: these keys report the URL used for the Jira
   link and are *not* written to the document. Without it the next reader deletes them again for
   exactly the reason they were deleted the first time.
3. **Add `tests/json-output-fidelity.test.js`**, modelled on `tests/executable-instructions.test.js`
   — the repo's existing "bundled prose must match shipped reality" guard, including its deliberate
   scope-narrowing rationale.
4. **Mutation-test the guard in both directions** before trusting it.

## Files Summary

| File | Change |
| ---- | ------ |
| `skills/sync-jira-task/SKILL.md` | restore `task_bitbucket_url`; add the note |
| `skills/sync-jira-story/SKILL.md` | restore `epic_bitbucket_url`, `story_bitbucket_url`; add the note |
| `skills/sync-jira-epic/SKILL.md` | restore `epic_bitbucket_url`, `prd_bitbucket_url`; add the note |
| `tests/json-output-fidelity.test.js` | **new** — 7 tests |
| `docs/tasks/task-registry.md` | row 47; next number → 48 |
| `CHANGELOG.md` | `[Unreleased]` → `### Fixed` |

No `npm run bundle` — nothing under `shared/resources/` changes.

## Testing Strategy

The guard compares the keys of the **main** `--json` payload against the keys of the fenced ```json
sample in the skill's `SKILL.md`, in both directions: emitted-but-undocumented, and
documented-but-not-emitted.

**Selecting the right block is the whole difficulty**, and two weaker selectors were tried and
rejected — by the guard itself, on its first run:

- `output.emit({` alone matches `{ version: VERSION }` and the `check-card` payload, whichever comes
  first in the file;
- the first `change_summary` matches `sync-jira-epic`'s `action: "skip"` fast path, which
  legitimately omits the URL keys — so the guard failed against **correct** documentation.

The selector is now `action: isUpdate ? "update" : "create"`, the main path's signature in all three
scripts. A guard that compares the wrong block is worse than none: it fails on healthy docs and gets
deleted.

A second assertion holds every *other* document-sync payload to a **subset** of the documented keys,
so a secondary path cannot invent a field no document mentions — while still allowing the skip path
to emit fewer.

A third asserts the extractor parsed something real (≥5 keys, including `action`). A parser that
silently returns `[]` would make every assertion above vacuously true, which is the characteristic
failure of a guard written against code it cannot actually parse.

**Mutation-tested both ways**: deleting a documented key — the original defect — fails 2 tests;
adding a key the script never emits fails 1. Restored, all 7 pass.

## Success Criteria

- [x] All three `--json` samples list exactly the keys their script emits
- [x] Each sample carries the note distinguishing the `--json` key from the frontmatter key
- [x] A guard exists and was **watched failing** on a reintroduction of the original defect, not
      merely watched passing
- [x] The guard tolerates `sync-jira-epic`'s legitimate `skip` payload rather than forcing it to change
- [x] `npm test` green; `npm run validate:all` green

## Risk Assessment

**Low** — documentation and one test; no shipped code path changes.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **The guard fails on legitimate variation** | Scripts may add a payload shape the guard did not anticipate — it already met one | Subset rule for secondary payloads; the main path selected by an exact signature; scope limited to the three `sync-jira-*` skills |
| **The extractor silently parses nothing** | A regex-based reader of JS source is brittle across reformatting | A dedicated test asserts ≥5 keys including `action`, so a broken extractor fails loudly instead of passing vacuously |

## Rollback Plan

`git revert <sha>`. Documentation and one test file; no state, no migration, no bundled output.

## Progress Tracking

- [x] Step 1 — keys restored in all three samples
- [x] Step 2 — distinguishing note added
- [x] Step 3 — `tests/json-output-fidelity.test.js` added
- [x] Step 4 — mutation-tested in both directions
- [ ] Release and consumer pull-through

## References

- [task.46](../task.46.relative-doc-links-and-fence-aware-sections/task.46.relative-doc-links-and-fence-aware-sections.md) — introduced the defect
- [`tests/executable-instructions.test.js`](../../../tests/executable-instructions.test.js) — the guard pattern this follows
