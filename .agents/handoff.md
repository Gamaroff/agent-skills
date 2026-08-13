# Session Handoff — 2026-08-13

Read this first if you are picking up work in `agent-skills`. It records where things stand, the
one open decision, and the traps that cost time in the previous session.

**State at handoff:** branch `develop` @ `9b01ef5` · working tree clean · `npm test` **1193/1193** ·
both eval suites green · `npm run bundle` idempotent · **zero open PRs**.

---

## 1. Nothing is blocking

The roadmap is complete and archived. `select-next.mjs` reports `roadmap-complete`, which is the
correct terminal state, not an error. There is no frontier to pick up.

If you ran `/develop-next` right now it would stop cleanly and do nothing. That is expected.

---

## 2. The one open decision — a release

This is the only outstanding action, and it needs a human call.

| Fact | Value |
| --- | --- |
| `develop` ahead of `main` | **67 commits** |
| Last tag | `v0.37.4` |
| `## [Unreleased]` in `CHANGELOG.md` | **~1,153 lines** |
| Release trigger | push a `v*.*.*` tag, or `workflow_dispatch` (`.github/workflows/release.yml`) |

**The version choice is not yours to make.** Both roadmap phases shipped breaking changes — task.45
alone documents three (marker-pair unification, sync stops writing body-update rows, task.42 wrappers
deleted), plus `transitionToStatus` now returns `to: null` where it previously returned a transition
name. On `0.x` that is a minor bump at minimum; whether it is the moment for `1.0` is a product
decision. **Ask before tagging.**

**Watch the diff's shape, not just its content.** Open issue
[#179](https://github.com/Gamaroff/agent-skills/issues/179) is a complaint that *"v0.29.5 shipped a
whole-file reformat alongside a 40-line fix, unannounced"*. This release carries 67 commits including
several full-file rewrites produced by the bundler — the same shape that generated that complaint.
Separate mechanical churn from behavioural change in the release notes.

**Caveat:** the previous session reviewed only the commits it authored. Roughly 55 of the 67 are
unreviewed by any agent in that session.

---

## 3. Carried follow-ups — real, not blocking

None of these has a task document yet. Each would need `/create-task` (read
`docs/standards/task-registry.md` first — task numbers are globally unique and the registry is the
source of truth).

### 3a. Two pre-existing defects in `shared/resources/change-log.js`

Both found by an adversarial diff review during task.45 QA, both **deliberately not fixed** to avoid
expanding a PR into engine surgery mid-QA-cycle. Documented in
`docs/tasks/task.45.change-log-pipeline-and-sync/task.45.bug.3.row-loss-on-unparsed-rows.md`.

1. **Content loss on the hand-written-heading path (MEDIUM).** When `findChangeLog` returns
   `hasMarkers: false`, the whole span to the next heading is replaced by the regenerated block —
   destroying prose, authoring comments and any nested `###` subsection under that heading. This is
   the path every not-yet-migrated document takes on its first write. **This is the more serious of
   the two** and is the natural next task.
2. **`collapseOtherLegacyBlocks` skips the chosen block's own pair (LOW).** A document holding *two*
   blocks of the same legacy pair keeps both for one write, self-healing on the next. The guard
   contradicts the loop directly below it (`shared/resources/change-log.js`, 3 references).

### 3b. Live Jira verification (task.45, unticked by design)

Four-step check against a real Jira issue, in
`docs/tasks/task.45.change-log-pipeline-and-sync/task.45.plan.change-log-pipeline-and-sync.md`:
two no-op syncs leave the file byte-identical → a body edit writes **no** row → a status change writes
**exactly one** → `--check-card` still clean.

Cannot run here: `JIRA_URL` is unset and this repo is GitHub-tracked. It was carried openly through
review, both QA cycles, the gate and the DoD rather than quietly ticked. Gate 2 assessed it as
**staging APPROVED, production CONDITIONAL**. Run it before relying on the sync narrowing in a
Jira-tracked consumer.

### 3c. Missing `run()`-level tests

Two behaviours task.45 changed but tested only at unit level, with a stubbed `fetchImpl`:
- `sync-jira-story`'s write gate on the **skipped-but-transitioned** path (the case that matters —
  body unchanged, status moved, must still write)
- `sync-jira-epic`'s fast-path transition

### 3d. Deferred / human-gated roadmap rows

`T41-fixtures` and `T38-fixtures` — both need credentials or a scratch Projects v2 board this repo
does not hold. They live under `## Deferred / human-gated` and are invisible to selection by design.

---

## 4. Traps that cost time — read before touching anything

These are environment and codebase specific. Each one bit the previous session.

### `node` is shadowed by an nvm shell function

`type node` resolves to a shell function that prints nvm's help and swallows your arguments. **Use
`/usr/local/bin/node` explicitly** for every script invocation. `npm` is fine.

### Never edit `skills/*/references/` — it is generated

`shared/resources/` is the single source of truth. A pre-commit hook (`.git/hooks/pre-commit`) runs
`npm run bundle` whenever `shared/resources/` or any `SKILL.md` is staged, and **re-stages the
result** — so a fix applied only to a bundled copy is silently reverted. Edit the source, then
bundle. A second `npm run bundle` must be a clean no-op.

**Exception:** `skills/develop-next/scripts/select-next.mjs` and
`.agents/skills/develop-next/scripts/select-next.mjs` are the *same file* (linked). Editing one edits
both. Only the `skills/` path is git-tracked.

### Do not use a next-heading lookahead to replace a markdown section

This caused two separate defects in one session. A regex like:

```js
/## Section Name\n[\s\S]*?(?=\n## )/
```

matches its terminating lookahead against a `##` heading **inside a fenced code sample**, stops early,
and leaves the tail of the old section behind — including an unbalanced ` ``` ` fence that makes the
rest of the file render as code. It also fires on a *prose mention* of a heading name.

The Change Log engine guards against exactly this (`fencedRanges` / `insideProtected`); one-off edit
scripts do not. **Locate the boundaries, assert both, and cut by explicit line range.** Verify after
with fence parity: `$(grep -c '^```' "$f") % 2` must be `0`.

### CI: `link-check` is `paths:`-filtered

`.github/workflows/docs-link-check.yml` only runs on `.md` changes. A PR touching no markdown shows
**two** checks, not three. That is a legitimate skip, not a missing check — but a skipped check and a
check that failed to start look identical in `gh pr checks`. Confirm via the rollup.

### `gh pr view --json mergeable` returns `UNKNOWN` before GitHub computes it

Not a conflict. Re-query, or use `git merge-tree --write-tree` for a definitive local answer.

---

## 5. What shipped in the previous session

For context when reading recent history.

| PR | What |
| --- | --- |
| [#213](https://github.com/Gamaroff/agent-skills/pull/213) | **task.45** — pipeline, QA, finalise and tracker sync write the Change Log. Completes the T42–T45 series and Phase 2. Gate PASS 95/100 after 1 fix cycle, 3 bugs closed |
| [#214](https://github.com/Gamaroff/agent-skills/pull/214) | `jira-sync` reports the landed **status**, never the transition **name** — a verb was being written into permanent history |
| [#212](https://github.com/Gamaroff/agent-skills/pull/212) | `qa-fix` Step 3.5 (adversarial pass over the fixes themselves) + `finalise` test-execution rule. Authored elsewhere; merged after verifying it did not collide with task.45 |
| — | Roadmap Phases 1 and 2 archived to `docs/development/roadmap-history.md`, plus the selector fix that archiving made necessary |

### The one worth knowing about

During task.45's QA, a diff review found that `upsertChangeLog` **silently deleted every Change Log
row it could not parse** — any log ordered `| Version | Date | ... |` lost its entire history on first
write, and this repo's own roadmap template shipped with that column order. Pre-existing in task.42.
Fixed in #213 along with the template.

The lesson worth carrying: the task's own risk register claimed *"`upsertChangeLog` never drops a row
it parsed"* — true, and hollow, because the rows it drops are the ones it **fails** to parse. A
mitigation that is technically true can still be worthless.

---

## 6. Where the artifacts are

```
docs/development/project-completion-roadmap.md   live roadmap (no frontier; deferred rows only)
docs/development/roadmap-history.md              archived Phases 1 & 2 — resolve any `deps:` here
docs/tasks/task.45.change-log-pipeline-and-sync/ review, QA ×2, gates ×2, 3 bug reports, DoD,
                                                 implementation report, sprint-review summary
shared/resources/document-change-log.md          canonical Change Log spec
shared/resources/change-log.js                   the engine (3a's defects live here)
```

Pipeline conventions: `AGENTS.md`. Anti-patterns: `docs/reference/anti-patterns.md`.
