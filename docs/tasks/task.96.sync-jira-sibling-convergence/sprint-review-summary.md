# Sprint Review Summary — Task 96

**Task:** sync-jira-story/task/epic never converge — label diff and post-transition timestamp
**PR:** [#346](https://github.com/Gamaroff/agent-skills/pull/346) · **Issue:** [#343](https://github.com/Gamaroff/agent-skills/issues/343)
**Accepted:** 2026-09-07 · **Gate:** PASS 93/100

---

## Summary

Three of the four `sync-jira-*` scripts shared two defects the fourth had already fixed. Both broke
the property every sync skill claims: **run it twice and the second run should change nothing.**

- **The label diff could never match.** Each script rebuilt its diff input from frontmatter while the
  payload appended a `synced-from-*` label, so `labels` was reported changed on *every* run — a PUT
  every time on story and epic, and a permanently wrong change summary on task.
- **The post-transition timestamp was stale.** A transition is a write and bumps Jira's `updated`;
  persisting the pre-transition value made the *next* run abort on the tool's own change. Cards
  synced once, then refused every subsequent run — recoverable only with `--force`, which is the one
  habit that makes the guard useless when a real concurrent edit happens.

Both are fixed in all three siblings, and all four scripts now route through one shared
`diffAgainstPayload` so the fifth divergence has nowhere to start.

## Demo notes

Sync any story, task or epic twice. The second run reports `Sync (no field changes detected)` and, on
story and epic, issues no PUT. Transition a card, sync again: no `--force` needed. Edit a `due_date`
and sync: it now reaches Jira instead of being silently dropped.

## Impact

- **Spurious writes gone.** Story and epic issued a PUT on every sync regardless of change.
- **`--force` is no longer a habit.** Cards stop refusing their own edits, so the guard is available
  for the case it exists for.
- **A silent data-loss path closed.** `assignee`, `due_date`, `components` and `fix_versions` were
  being dropped without error once the skip gate became reachable.

## What shipped

| Area | Detail |
|---|---|
| Shared library | `diffAgainstPayload`, `normaliseListForHash`; stale header corrected |
| Scripts | All four `sync-jira-*` migrated; story's two-pass build; `hashMeta` extended on story + epic |
| Test infrastructure | Fake Jira lifted into `shared/resources/fake-jira.js`, vendored into four skills |
| Tests | 40 new — 17 e2e, 14 unit, 8 contract, 1 deferred-run |
| Docs | CHANGELOG, two SKILL.md, migration cost disclosed |

## Migration note

Extending `hashMeta` changes the stored hash for **every already-synced story and epic**, so the next
sync of each reports `Updated: metadata` and issues one PUT — then converges. One redundant write per
document, once, is the price of closing a path that dropped real edits while reporting success.

## Known limitations

- No human code review — accepted on automated evidence and self-review.
- The fake Jira proves what the scripts send, not that a live tenant accepts it.
- `sync-jira-task` and `sync-jira-bug` still have no skip gate; the contract test pins that a future
  one cannot be added without the `hashMeta` work.
- A failed post-transition re-read warns, and `--json` suppresses warns.

## Future work

The family registry entry is deferred to task.93, which owns `skill-families.md` and its schema. The
drafted entry is parked in task.96's §Notes.
