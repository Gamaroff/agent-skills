# Sprint Review Summary - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it

**Story/Task ID:** task.117
**Epic:** _(standalone technical task — milestone "Technical Tasks (standalone)")_
**Completed Date:** 2026-09-17
**Completed By:** Claude (develop-task pipeline, invoked by /develop-next)
**Pull Request:** [#416](https://github.com/Gamaroff/agent-skills/pull/416)

---

## Summary

The card summariser now drops standalone bold labels (`**Functional**:`) the way it drops `###` sub-headings, so the list under a label reaches the tracker card; the card preflight gains a `heading-only` finding kind for a section that is nothing but labels, and its clean output states its own scope. A population-form corpus test proves the fix: 29 of 120 task documents published a label-only block before, 0 after.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC1 — `heading-only` is a finding kind and the corpus test reports 0 (15 recorded on 2026-09-10; 29 of 120 measured by the test on 2026-09-17, same root cause)
- [x] SC2 — `summariseSection` renders the list under a bold label
- [x] SC3 — the preflight's clean output names its scope ("3 card blocks resolve — not a template-completeness check"), in the display and as `scope` in `--json` (also on the four `sync-jira-* --check-card --json`)
- [x] SC4 — the one-definition property test still passes; bundled copies match (`bundle:check` 0 problems)
- [x] SC5 — observations #43 and #49 closed naming PR #416

### Key Features Implemented

- **Bold-label drop**: `RE_BOLD_LABEL` (column-0 anchored; a trailing sentence terminator disqualifies, so `**None.**` stays content) consumed by `dropHeadingLines`, fence-aware via `makeFenceTracker`
- **`heading-only` finding**: `isLabelOnly(paragraph)` — one line, no terminator, no list item, a label's shape — plus the by-construction case where a section is nothing but labels/sub-headings; severity follows the block (critical, or important on an optional block); two messages keyed on `beneath` (content stopped in front of vs nothing written)
- **Fence-aware `splitBlocks`**: a fence containing a blank line is one block on every path; `beneath` excludes tables, fences and labels; `omitted` stays honest so the live card's `+N more` pointer announces every cut
- **Scope statement**: `describeCardScope` in `formatCardCheck` and `card-preflight --json`

---

## Technical Details

### Files Modified/Created

- `shared/resources/jira-sync.js` — `RE_BOLD_LABEL`, `dropHeadingLines`, `splitBlocks`, `summariseSection` (`heading-only` kind, `beneath`), `isLabelOnly`, `checkCardSections` (`heading-only` finding), `describeCardScope`
- `shared/resources/card-preflight.js` — `scope` in `--json`
- `shared/resources/tests/card-preflight-corpus.test.mjs` (new) — population check, floor 100, count 0
- `shared/resources/tests/jira-sync-card-summary.test.mjs`, `shared/resources/tests/card-preflight.test.mjs` — fixtures C2 / H / H2 / H3, sync-scope test, `--json` scope
- `shared/resources/authoring-card-preflight.md`, `shared/resources/tracker-card-summary.md` — contract + vocabulary
- `skills/create-{task,story,epic}/SKILL.md`, `skills/review-{task,story,epic}/SKILL.md` — preflight prose
- `skills/sync-jira-{task,story,epic,bug}/scripts/*.js` — `scope` in `--check-card --json`
- `docs/tasks/task.{42,43,44,104}.…/*.md` — Breaking Changes given a lead sentence (each resolved to `**Before** (…):` and stopped); real Change Log sections for task.42/43
- `CHANGELOG.md` — Fixed entry (task 117)
- 44 bundled `references/` copies regenerated

### Architecture/Design Decisions

- Every bold-only label line is dropped, not only a leading one (review Q3) — the 15 documents carry several labels in sequence.
- Scope is a statement, not a mandatory-section count (review Q2) — a count in `shared/resources/` would need a second copy of the heading list.
- `transform` (the epic spec's `**Label:**` flattening) runs after the label drop, never before (cycle-1 CR-2).
- `omitted` and `beneath` are separate fields: the card's pointer and the preflight's advisory answer different questions (cycle-4 CR4-1).

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none — the preflight stays advisory at authoring; cards synced after the change render the list (a body diff on their next sync, noted in the CHANGELOG)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 16 new tests across the three card suites; 499/499 across the card + four `sync-jira-*` suites; `npm run ci:fast` 3367/3368 (1 skipped)
- **Mutation proofs:** 16 across the loop (each fix reverted and its fixture red; M14–M16 re-run at cycle 6)
- **Boundary probes:** 91 (QA cycle 6) + 1113 (DoD security), 0 reproduced

### Code Review

- **Reviewers:** independent Explore diff reviewer each QA cycle (6); Step 5c `/review-pr` code + conformance lenses
- **Approval Status:** ✅ APPROVE (`task.117.pr-review.1.card-preflight-heading-only.md`)
- **Review Comments Addressed:** 26 gate findings across six cycles, all closed (bug.1–7); 5c: 2 report findings applied, 2 low cleanups recorded for follow-up

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets introduced
- [x] No new unsafe patterns (`eval`/`exec`/`execSync`); the corpus test walks with `node:fs`
- [x] Untrusted-Markdown handling: no catastrophic backtracking on 200k-char pathological inputs; control characters, NUL, bidi overrides and `__proto__` labels are plain text
- [x] Dependencies unchanged

### Compliance Review

✅ **Compliance Requirements Met** — NOT_APPLICABLE (no data, payments, UI or PHI)

---

## Documentation

### Updated Documentation

- [x] CHANGELOG.md — Fixed entry under [Unreleased]
- [x] `authoring-card-preflight.md` contract — vocabulary `missing / empty / heading-only / no-body`; scope statement
- [x] `tracker-card-summary.md` — `summariseSection` return shape (`kind`, `beneath`); finding vocabulary
- [x] create-* and review-* SKILL.md preflight prose
- [ ] README — not applicable (AGENTS.md points to the contract without enumerating kinds)

### Documentation Links

- `shared/resources/authoring-card-preflight.md`
- `docs/tasks/task.117.card-preflight-heading-only/` — QA reports 1–6, gates 1–6, bugs 1–7, pr-review.1, dod.1

---

## Demo Notes

### How to Verify

1. `command node shared/resources/card-preflight.js docs/tasks/task.3.*/task.3.*.md` — clean, and the last line names its scope
2. `command node -e 'const l=require("./shared/resources/jira-sync.js");console.log(l.summariseSection("**Functional**:\n\n- one\n- two\n"))'` → `{ kind: "list", text: "- one\n- two", omitted: 0 }`
3. `command node --test shared/resources/tests/card-preflight-corpus.test.mjs` → 0 of ≥100 task documents publish a label-only block

---

## Impact & Value

### User Impact

Tracker cards for the 29 affected task documents (and any future document with the same shape) publish their actual criteria instead of a 14-character bold label; an author writing that shape is told so at authoring time, with a fix that names what is beneath the label.

### Technical Impact

The preflight's vocabulary can now say "present but useless"; its clean result no longer reads as a template-completeness all-clear; the corpus test keeps the population at zero.

---

## Known Limitations & Future Work

### Current Limitations

- A fence opening directly beneath a prose or label line, with no blank line, is joined into that block and published as sentence text; the preflight reports `ok`. Pre-existing (identical on `develop`), 0 of 120 corpus documents (CR6-1).
- CRLF documents: `makeFenceTracker`, `RE_BULLET` and `extractSection` all stop at `\r` (carried from gate 1; CR6-2).

### Suggested Follow-Up Stories

- One task: flush on the fence transition in `splitBlocks` (CR6-1); normalise line endings once (CR6-2); drop the dead `.filter(Boolean)` / `.trim()` (CR6-3); update the `dropHeadingLines` API row (5c CR-1); document or remove the `transform` skip on the bold-without-colon early return (5c CR-2).
- `skills/review-story/SKILL.md:2321` trailing guard exits 1 (pre-existing, carried from gate 1).

---

## Metrics

- **Time to Complete:** 2026-09-16 20:36Z → 2026-09-17 (two sessions; six QA cycles)
- **Lines of Code Changed:** +9035 / −704 (89 files incl. 44 bundled copies; +3815 / −73 canonical)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
