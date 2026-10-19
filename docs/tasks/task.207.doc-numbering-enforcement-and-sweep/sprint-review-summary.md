# Sprint Review Summary - Doc numbering enforcement and sweep

**Story/Task ID:** task.207
**Epic:** n/a (standalone technical task)
**Completed Date:** 2026-10-16
**Completed By:** Lorien Gamaroff (pipeline: /develop-next → /develop-task)
**Pull Request:** [#682](https://github.com/Gamaroff/agent-skills/pull/682)

---

## Summary

The hierarchical document numbering (`prd.{P}`, `epic.{P}.{E}`, `story.{P}.{E}.{S}`) is now enforced by two CI guards, and the repository's skills, shared resources and docs no longer teach the retired flat scheme.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `evals/shared/tests/doc-numbering-corpus.test.mjs` — every document under the PRD root is numbered, matches its frontmatter, is registered and unique (22-document floor, three mutation cases)
- [x] `tests/doc-id-chokepoint.test.js` — no id regex, string-built id regex or positional `awk -F.` split outside `doc-id.js`; allowlist entries carry reasons and fail when stale; scans ≥ 400 code files
- [x] §5 prose guard over every tracked `*.md` / `*.yaml` / `*.yml`: placeholders, title forms, two-level ids, flat layouts, tree diagrams and literal flat ids
- [x] Both new tests add < 2 s to `npm test` (1.26 s measured on the PR head)
- [x] Section 7 population: placeholder files 19/11/20 → 0/0/1, literal-id files 25/4/3 → 3/1/0, every remaining hit explained
- [x] AGENTS.md § PRD Registry replaces the global Epic Registry; CHANGELOG `[Unreleased]` entry with a consumer upgrade note

### Key Features Implemented

- **One parser, held by two tests**: `doc-id.js` is the only place PRD/epic/story ids are parsed or built
- **Parser moves**: `sync-jira-story` related-doc links and summary ids, the epic-index test and the story-issue backfill script now read ids through `doc-id.js` (sub-stories included)
- **review-epic step 0a fix**: the `awk -F.` split that mis-read hierarchical epic ids is replaced, with an executed test

---

## Technical Details

### Files Modified/Created

- `tests/doc-id-chokepoint.test.js` — the chokepoint and prose guard (new)
- `evals/shared/tests/doc-numbering-corpus.test.mjs` — the corpus guard (new)
- `tests/ingester-prompt-placeholders.test.js`, `tests/lib/strip-js-comments.js` — contract test and shared JS tokenizer (new)
- `skills/sync-jira-story/scripts/sync-jira-story.js` — `relatedDocInfo` on `doc-id.js`, plain-basename guard
- `shared/resources/review-pipeline-step-0a-branch-setup.md`, `shared/resources/qa-findings-ingester-prompt.md` — executable prose fixes
- ~60 skills, shared resources and docs — prose sweep; bundled `references/` regenerated

### Architecture/Design Decisions

Inside a PRD, epic and story numbers in titles are relative by documented design; the prose guard exempts those exact lines by anchor, with a stale-anchor test. `create-parallel-stories` keeps its scheme (Deferred Work: a design change, not a rewrite).

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none for consumers; the CHANGELOG upgrade note covers `migrate-doc-numbering.mjs --check/--apply`

---

## Testing & Quality Assurance

### Test Coverage

- **New tests:** chokepoint (18 incl. ingester contract), corpus (5), `relatedDocInfo` plain-basename test
- **Mutation proofs:** every guard change in QA cycles 1–8 and the finalise fix was reverted and seen red

### Code Review

- **Reviewers:** QA code reviewer (8 cycles), PR conformance review (`/review-pr`, APPROVE)
- **Approval Status:** ✅ Approved (no required human review on this repository)
- **Review Comments Addressed:** all HIGH/MEDIUM; three LOW cleanups in Deferred Work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — `relatedDocInfo` probed with 12 cases; four low findings (a `../` prefix, a newline, NUL, `$(…)`) fixed at finalise and re-probed: 0 reproduced.

### Compliance Review

⚠️ Not applicable — internal tooling.

---

## Documentation

### Updated Documentation

- [x] AGENTS.md § File Naming and § PRD Registry
- [x] `docs/standards/` (file naming, PRD registry, epic/story/PRD documents)
- [x] Runbooks, reference docs and ~35 SKILL.md files
- [x] CHANGELOG `[Unreleased]`

---

## Demo Notes

### How to Verify

1. `command node --test tests/doc-id-chokepoint.test.js evals/shared/tests/doc-numbering-corpus.test.mjs` — 19/19 pass
2. Re-introduce a flat id in any skill (e.g. `story.2.3.auto-hide.md`) — §5 fails naming the line
3. Restore it — green

---

## Impact & Value

### User Impact

Agents following the skills now write correctly numbered PRD, epic and story documents; a drifted spelling fails CI at the line that introduced it.

### Technical Impact

One id parser, enforced; the flat scheme cannot creep back into prose or code unnoticed.

---

## Known Limitations & Future Work

### Current Limitations

- `create-parallel-stories` still uses its own `{epic}.1-{n}` scheme
- `prd-structure-guide.md` draws story files loose in `stories/`; ASCII trees are not checked

### Suggested Follow-Up Stories

- Move `create-parallel-stories` to sub-stories; redraw the guide's story layout; the remaining items in the task's Deferred Work

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
