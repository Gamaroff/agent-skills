# Sprint Review Summary - Hierarchical story ids in the pipeline

**Story/Task ID:** task.206
**Epic:** none (a standalone task, roadmap T206; depends on task.202 and task.203)
**Completed Date:** 2026-10-16
**Completed By:** develop-task pipeline (autonomous run, dispatched by develop-next)
**Pull Request:** [#677](https://github.com/Gamaroff/agent-skills/pull/677)

---

## Summary

The story pipeline now runs on hierarchical ids: a story is `story.{P}.{E}.{S}` and its branch is
`feature/story.{P}.{E}.{S}.slug`. Every story-side reader and writer of a story or epic id gets it
from `doc-id.js`, not from its own regex. An epic is found by its (P, E) pair, and Step 0 stops on
zero or several matches instead of taking the first.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Step 0 and Step 0a read `(P, E, S)` through `doc-id parse`; a snippet test feeds `story.1.2.3.x.md`
- [x] Step 0 epic resolution HALTs on zero matches and on two or more for `(P, E)`
- [x] `uat-status.mjs` lists `story.1.2.3` and reports an unparseable story file instead of skipping it
- [x] `isCoLocatedArtifact` no longer admits `story.1.2.4.*` (or `story.1.2.30.*`) artifacts for `story.1.2.3`
- [x] `continuation.mjs` writes `story.1.2.3.handoff.*` from a `feature/story.1.2.3.*` branch
- [x] `select-next.mjs` keys `## Epic 1.2` and reports a legacy `## Epic 2` as an error
- [x] `bug-doc.js` resolves `story.1.2.3A.bug.1.x.md` to parent `story.1.2.3A`
- [x] `create-story` allocates S with `doc-id next story --epic-dir` and HALTs on an existing `(P, E, S)`
- [x] `npm test` wall time +1.7% against base (bound: 10%); `eval:all` scenario count 44 → 44
- [x] No § 3 code site keeps its own id regex (measured; the repository-wide guard is task.207)
- [x] Every Phase 1–2 site has a mutation-proved test
- [x] Fixtures renamed by `migrate-doc-numbering.mjs`; CHANGELOG lists four breaking changes; `configuration.md` documents `{p}`

### Key Features Implemented

- **One id definition**: 11 code sites and 9 executable skill blocks now call `doc-id.js`
- **(P, E) epic resolution**: E restarts in every PRD, so a bare E is never enough to find an epic
- **Self-binding blocks**: each tracker and branch block derives its own ids, and a test runs each one from a real branch
- **Clear refusals**: a legacy story name, a `{p}`-less branch pattern and an old-shape `qa-next` surface key each fail with a message naming the migration

---

## Technical Details

### Files Modified/Created

70 canonical files changed (+2106/−702), not counting the bundled `references/` copies, the migrated
replay fixture trees and this directory. See the task document's §7 Files Summary. The main ones:

- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `review-pipeline-step-0a-branch-setup.md` — Step 0/0a blocks
- `shared/resources/finalise-fix-and-recheck.mjs`, `bug-doc.js` — artifact and bug-parent rules
- `skills/{create-story,create-branch,ensure-story-github-issue,sync-github-story}/` — allocation, branches, tracker titles
- `skills/session-handoff/scripts/continuation.mjs`, `skills/qa-next/scripts/uat-status.mjs`, `skills/develop-next/scripts/select-next.mjs`
- `evals/shared/tests/step-0-epic-resolution.test.mjs` — the new suite that runs the blocks

### Architecture/Design Decisions

Every site asks `doc-id.js` what an id is and does not decide for itself. A site that keeps a
shape-tolerant pattern on purpose (`sync-jira-story.js`, `select-next.mjs` `ID_RE_SRC`) is listed in
the task and excluded from the sweep.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** Yes, four, listed in `CHANGELOG.md`. Migrate first, then upgrade: story and branch names, the `branchPattern` `{p}` token, `qa-next` surface keys, and roadmap epic headings

---

## Testing & Quality Assurance

### Test Coverage

- **Tests:** fast gate 5756 tests, 0 failures at gate 3. CI green over 5 checks at `acf2e2e1`
- **QA:** 3 cycles (CONCERNS 60 → FAIL 80 → PASS 100); bugs 1–5 closed
- **Mutation proofs:** every Phase 1–2 site, plus 4 of 4 spot checks in QA cycle 3

### Code Review

- **Reviewers:** QA diff reviewer, every cycle; Step 5c conformance review (`task.206.pr-review.1`)
- **Approval Status:** ⚠️ CONCERNS (non-blocking). The repository requires no human review
- **Review Comments Addressed:** PC-1 (implementation report status line) fixed; PC-2 and PC-3 (two files missing from the Files Summary, low) recorded

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] `isWorkItemDocument` and the id boundaries probed: 40 cases at QA, 20 at DoD, 0 reproduced
- [x] No secrets; no new network or shell surface
- [x] No dependency changes

### Compliance Review

⚠️ Not applicable (internal id-parsing refactor)

---

## Documentation

### Updated Documentation

- [x] CHANGELOG breaking entry with the migrate-first order
- [x] `docs/reference/configuration.md` documents `{p}` and the refusal of a pattern without it
- [x] Story-pipeline skill files updated and bundles regenerated

---

## Demo Notes

### How to Verify

1. `command node shared/resources/doc-id.js parse story.1.2.3.example.md --json` prints `"prd": 1, "epic": 2, "story": 3` and `"id": "story.1.2.3"`
2. `command node --test evals/shared/tests/step-0-epic-resolution.test.mjs` passes 12/12; it runs the Step 0, 0a and tracker blocks from real story branches

---

## Impact & Value

### User Impact

Stories can be numbered under a PRD and an epic without collisions, and the pipeline runs end to end on them.

### Technical Impact

One id definition replaces about a dozen local patterns, which removes a class of near-miss matches (`1.2.3` vs `1.2.30`).

---

## Known Limitations & Future Work

### Current Limitations

- Step 0's `find` hides an unreadable directory as "no epic" (CR-1, low)
- `qa-next` gives one remedy for registry errors and scan errors (CR-3, low)
- Six story-bug reader prose sites still describe the old shape

### Suggested Follow-Up Stories

- task.207: repository-wide id-regex guard and the remaining prose sweep
- The CR-1..CR-5 and CR2-2/CR2-3 follow-ups in gate 3's `recommendations.future`
- A consumer smoke test of the migrate-then-upgrade order

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
