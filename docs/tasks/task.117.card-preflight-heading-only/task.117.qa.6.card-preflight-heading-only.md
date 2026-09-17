# QA Report: Task 117 - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it (cycle 6)

**Task**: [Link to task document](./task.117.card-preflight-heading-only.md)
**Gate File**: [task.117.gate.6.card-preflight-heading-only.yml](./task.117.gate.6.card-preflight-heading-only.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle-5 findings are fixed and bug.7 is closed: `beneath` is fence-aware and excludes labels,
and the heading-only `omitted` matches the prose path. Every one of the three bug.7 shapes was
reproduced from a clean process; the three cycle-5 mutation proofs re-run red; 499/499 across the
card and sync suites; 91 boundary probes with no deviation. **No open entry this cycle.** The
independent reviewer surfaced one medium — a fence glued directly to a prose or label line is
joined into the sentence and the preflight reports `ok` — which reproduces, but byte-identically
on `develop` and in 0 of 120 corpus documents: pre-existing, out of this task's scope, recorded as
reliability CONCERNS and a follow-up rather than gated. This cycle ran on a budget the user
extended after the cycle-5 escalation; the loop now exits to Step 5c.

**Overall Assessment**: CONCERNS (no open entry)
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified
- [x] Task `ready-for-review`; 5/5 phases; bug.7 Ready for QA on entry
- [x] PR #416 OPEN, head `329b4a65` = local HEAD
- [x] Cycle-5 fix `aa9cf43c` on the branch; fast gate recorded green there (3367/3368)

### Testing Approach
- [x] Automated Testing (card + sync suites, 499)
- [x] Regression Testing (`npm run ci:fast` at HEAD — see below)
- [x] Security Review (executed boundary probe — 91 inputs)
- [x] Code Review (independent Explore diff reviewer)

### Review Methodology
Direct tools plus one read-only Explore diff reviewer over the narrowed set. Reviewer dispatched
03:37 UTC → returned 03:41 UTC (4 min; within the 10-minute budget). Every candidate it returned was
re-executed in-line before classification.
**Re-review scope: since 2026-09-16T22:02:56Z (gate 5) — 49 paths, of which 4 canonical
(`jira-sync.js`, the two card test files, `tracker-card-summary.md`); the 45 bundled `references/`
copies were excluded from the reviewer's patch and checked by `bundle:check` (128 skills, 0
problems) instead.** Safety re-probe not triggered (gate 5 security `PASS measured`; no
`top_issues` on a safety axis; the criteria are card-content, not safety).
Traceability mapper not dispatched: the task has no Success Criteria table (as cycles 1–5).

---

## Re-Review Context

| Cycle-5 finding | Status | Evidence (clean process, `command node -e`) |
| :--- | :--- | :--- |
| CR5-1 `beneath` not fence-aware | **FIXED** | `summariseSection("**Before** (GitHub):\n\n```\nx\n\ny\n```")` → `{kind: heading-only, omitted: 1, beneath: 0}`; message reads "nothing under it"; M14 red |
| CR5-2 heading-only `omitted` after-only | **FIXED** | table + label + list → `omitted: 2`; table + sentence + list → `omitted: 2` (prose path) — same pointer for the same shape; M16 red |
| CR5-3 labels counted beneath | **FIXED** | `"**Before** (GitHub):\n\nKey points:"` → `beneath: 0`; M15 red |
| CR5-4 in-test requires (cleanup) | **FIXED** | `card-preflight.test.mjs` uses its existing imports; 0 `require(` in the file's test bodies |
| CR5-5 API row (cleanup) | **FIXED** | `tracker-card-summary.md:120` documents `transform` and `beneath` |

Bug report `task.117.bug.7`: **Closed**.

---

## New Findings This Cycle

- **[medium / confidence medium — advisory, pre-existing]** `jira-sync.js:1341` — `splitBlocks`
  starts a new block only on a blank line, so a fence opening directly beneath a prose or label
  line is glued into that block; `isProseBlock` tests the block's first line, and the card
  publishes the code as sentence text: `summariseSection("**Before** (GitHub):\n```\nx\n```")` →
  `{kind: prose, text: "**Before** (GitHub): ``` x ```"}`, and `checkCardSections` reports the block
  `ok`. **Verified**, and verified identical on `origin/develop` (the naive split had the same
  blank-line-only model); a fence-tracked scan of the 120 task documents' three card sections finds
  no line glued to an opening fence except two bold-only labels, which `dropHeadingLines` removes.
  Not introduced by this branch and outside its scope (bold labels / heading-only), so it does not
  enter the gate; the reviewer's own confidence of `medium` is left as returned. → flush `cur` on the
  fence transition in `splitBlocks` so a fenced block is its own block without a blank line;
  fixtures for label + glued fence and sentence + glued fence. **CR6-1** — file separately.
- **[low / confidence low — advisory, pre-existing class]** `jira-sync.js:1297` — on CRLF input
  `makeFenceTracker`'s `(.*)$` never matches, so `dropHeadingLines` (switched from parity to the
  tracker in cycle 2) deletes fenced content on a CRLF document; unreachable through
  `checkCardSections` because `extractSection`'s heading regex already fails on `\r` (every section
  `missing`). Joins the carried CRLF item from gate 1. → normalise `\r\n` once at the top of
  `extractSection` / `summariseSection`. **CR6-2**
- cleanup — `splitBlocks`'s `.filter(Boolean)` and the `first.trim()` at :1473 are dead (every
  block is trimmed and non-empty by construction). → drop them or comment the invariant. **CR6-3**

---

## Implementation Verification

| Phase | Status | Notes |
| :--- | :--- | :--- |
| 1 corpus test | PASS | 0 of 120 |
| 2a summariser | PASS | card output correct on every reviewed shape (six cycles) |
| 2b `heading-only` | PASS | advisory wording keyed on a fence-aware, non-label `beneath`; both messages read correctly on their shapes |
| 2c scope | PASS | |
| 3 mutation proofs | PASS | M14–M16 re-run this cycle |

## Success Criteria — criteria 1–4 PASS; 5 pending finalise (observations #43, #49 close naming PR #416)
## Breaking Changes Validation — PASS (unchanged; none declared, body diff on next sync noted in CHANGELOG)

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0 open (1 advisory, pre-existing — CR6-1), LOW: 0 open (1 advisory, pre-existing — CR6-2; +1 cleanup; 1 pre-existing carried — review-story:2321)

No bug file is created for CR6-1: a co-located `task.117.bug.N` would bind a pre-existing,
out-of-scope defect to this PR. Recommended vehicle: `/create-bug-report` (general) or
`/create-task` after the merge — see Recommendations.

---

## NFR Assessment

### Performance — PASS — unchanged; `splitBlocks` is one linear pass
### Reliability — CONCERNS — this change is correct on every shape reviewed; CONCERNS records the verified pre-existing glued-fence limitation (CR6-1), 0 corpus hits
### Security — PASS — **Evidence**: measured, **Probes executed**: 91 (73 corpus cases across five sinks + 18 hand-written shapes, against `summariseSection` and `checkCardSections`; 0 deviations, 0 throws)
### Maintainability — PASS — CR5-4/5 fixed; one advisory cleanup (CR6-3)

---

## Code Review

Narrowed scope (4 canonical files, 928-line patch). `code_review_blocking=true`: no finding met
`category: bug` + `confidence: high`, so none entered the gate. Findings CR6-1..3 above.
**Boundary rule**: `boundary: true` (`isLabelOnly`, `splitBlocks`, `summariseSection` accept/reject
text); `probes_executed: 91`.
**Mutation proofs** (source snapshotted with `cp`, restored byte-identical, `git status` clean):
- mutation-proven: `splitBlocks` replaced by the naive blank-line split (M14) → `H3: beneath is fence-aware and excludes labels; omitted matches the prose path (CR5-1, CR5-2, CR5-3)` → **covered**
- mutation-proven: `!isLabelOnly(p)` dropped from the `beneath` filter (M15) → same fixture → **covered**
- mutation-proven: heading-only `omitted` back to `after.length` (M16) → same fixture → **covered**
**Platform variance**: not applicable — no environment-derived value reaches a validating consumer.
**Step 4b**: `tracker-card-summary.md` — 1 bash block, refused `mutating` (`write-redirection`, line 154): `no-executable-blocks`, exit 0; zsh available. The cycle-5 hunk in that file is a table row.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| card suites + four `sync-jira-*` suites | 499/499 |
| `npm run ci:fast` (at `329b4a65`) | 3367/3368 (1 skipped), exit 0 |
| `bundle:check` | OK — 128 skills, 0 problems |

---

## Test Artifacts

### Files Reviewed
`shared/resources/jira-sync.js` (`splitBlocks`, `summariseSection`, `dropHeadingLines`, `isLabelOnly`, `checkCardSections`, `summaryBlockNodes`), `shared/resources/tests/jira-sync-card-summary.test.mjs`, `shared/resources/tests/card-preflight.test.mjs`, `shared/resources/tracker-card-summary.md`

### Test Commands Executed
```bash
command node --test --test-concurrency=4 shared/resources/tests/card-preflight-corpus.test.mjs shared/resources/tests/jira-sync-card-summary.test.mjs shared/resources/tests/card-preflight.test.mjs 'skills/sync-jira-*/tests/*.test.js'
command node --test --test-reporter=tap --test-name-pattern='CR5-1, CR5-2, CR5-3' shared/resources/tests/jira-sync-card-summary.test.mjs   # M14–M16
command node <probe.mjs>   # 91 boundary probes
command node references/qa-execute-snippets.mjs --file shared/resources/tracker-card-summary.md --json
npm run ci:fast
npm run bundle:check
```

---

## Recommendations

### Immediate (Blocking)
None.

### Short-term
1. File CR6-1 (glued fence joined into the sentence; pre-existing) as its own task or general bug and fix it with fixtures — a ~4-line change in `splitBlocks`, but it alters `omitted` on the prose path for every card with a fence adjacent to prose, so it deserves its own review.
2. CR6-2 with the carried CRLF item; CR6-3 cleanup; review-story:2321.

---

## Final Assessment

**Gate Status**: CONCERNS (no open entry)
**Rationale**: The deliverable is correct on the card path and the preflight advisory now reads correctly on every shape reviewed. The one medium is real but not this change's, and is recorded rather than gated.
**Quality Score**: 90/100
**Deployment Recommendation**: APPROVED

---

**QA Report**: `task.117.qa.6.card-preflight-heading-only.md` · **Gate**: `task.117.gate.6.card-preflight-heading-only.yml`
**Next Steps**: Step 5c `/review-pr --comment` on PR #416, then `/finalise`.
