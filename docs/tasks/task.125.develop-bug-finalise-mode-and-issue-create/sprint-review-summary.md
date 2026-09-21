# Sprint Review Summary - develop-bug's only DoD path is documented as a fallback, and its issue create fails whole on a label case mismatch while swallowing the line that says so — and its verify loop calls /qa-fix with no gate to derive a cycle from

**Story/Task ID:** task.125
**Epic:** — (standalone technical task)
**Completed Date:** 2026-09-21
**Completed By:** Claude (develop-next → develop-task pipeline, autonomous; operator-granted QA cycles 6–11)
**Pull Request:** [#447](https://github.com/Gamaroff/agent-skills/pull/447)

---

## Summary

The bug pipeline now has a first-class Definition-of-Done path (`/finalise --bug`) instead of a hand-written "fallback", its GitHub issue create tolerates labels the repository lacks and says which label was dropped, and its verify loop tells `/qa-fix` which cycle it is on so the bug issue gets a fix-cycle comment every time. Closes observations #65, #69, #122 on merge.

---

## What Was Delivered

### Success Criteria Met

- [x] SC1 — `/finalise --bug` produces the bug-shaped DoD file, both CI readings and the canonical PR comment, and writes no Change Log row (forbidden on a bug report)
- [x] SC2 — develop-bug Step 7 has no inline DoD fallback paragraph
- [x] SC3 — a label absent from the repository never fails an issue create; the warning names it
- [x] SC4 — every `tracker-issue.js` failure message carries gh's own first stderr line
- [x] SC5 — the verify loop passes `fix_cycle={N}` so `/qa-fix` posts `qa-fix-{N}` per cycle with no gate file
- [x] SC6 — one extra `gh label list` per bug create
- [x] SC7 — the bug-mode skip list is stated once and mutation-proved
- [x] SC8 — observations #65/#69/#122 parked on this PR; close on merge

### Key Features Implemented

- **`finalise --bug`**: a Document-kind block resolves story/task/bug once from substituted inputs; a 16-row skip table states every step a bug run runs or skips, with each row's marker asserted in both directions by an executed test; every Step 7 block re-binds its inputs, refuses placeholders, branches on the kind in-block, locates DoD/report/gate zsh-safely and by number, and reads the verify loop's verdict as an exact first word.
- **Tolerant label handling**: one shared `gh-labels.sh` (read the repository's labels once, normalise case, drop absent labels with a named warning) sourced at nine `gh issue create/edit` sites with a population guard; `tracker-issue.js` pipes stderr on every mutating call and leads its failure message with gh's first line.
- **Explicit `fix_cycle`**: `/qa-fix` accepts `fix_cycle=<N>` (positive integer, 9-digit cap, rejected value named) ahead of the gate-derived cycle; develop-bug's verify loop passes it.
- **`{bug-prefix}` defined once**: the short id (`bug-doc.js` `bug_id`) for every artefact the pipeline writes; `{bug-file-stem}` for links to the bug file; readers accept both historical shapes.

---

## Technical Details

### Files Modified/Created

- `skills/finalise/SKILL.md` — kind block, skip table, bug-mode markers, self-binding Step 7 blocks (7.2/7.3/7.6a/7.6b/7.7), `newest_numbered` helper
- `skills/finalise/assets/bug-dod-template.md` — the bug-shaped DoD template (lifted from bug.13/14's hand-written DoDs)
- `shared/resources/finalise-dod-fix-evidence-prompt.md` — the agent that takes the AC agent's slot in bug mode
- `shared/resources/gh-labels.sh` (new) — the shared label filter; sourced by `ensure-{bug,epic,story,task}-github-issue`, `sync-github-{bug,epic,story,task}`, `create-issue`
- `shared/resources/tracker-issue.js` — stderr capture + first-line failure message; `shared/resources/registry-tick.js` — bug-stem rule
- `skills/qa-fix/SKILL.md` — `fix_cycle` contract in both Step 7 blocks
- `skills/develop-bug/SKILL.md` + `references/develop-bug-step-{0,2,5-6,7}*.md` — no fallback; `fix_cycle={N}`; one definition of `{bug-prefix}` + `{bug-file-stem}`
- `docs/runbooks/bug-fix.md`, `docs/runbooks/hotfix.md`, `CHANGELOG.md`
- Tests: `evals/shared/tests/finalise-bug-mode.test.mjs` (59 cases, bash + zsh), `tests/gh-labels.test.js`, `tests/ensure-bug-label-tolerance.test.js`, `tests/qa-cycle.test.js`, `shared/resources/tests/tracker-issue.test.mjs`, `shared/resources/tests/registry-tick.test.mjs`
- 39 bundled `references/` copies regenerated

### Architecture/Design Decisions

- The bug/story/task difference lives in **one table** with a marker per row, asserted both ways by a test — "does this apply to a bug?" is a lookup, not a judgement.
- Every fenced block is its own shell: inputs are **substituted placeholders re-bound per block**, refused when empty or left verbatim; nothing is inherited from an earlier block. Eleven QA cycles found this class repeatedly (BUG-12, 15, 16, 19, 20, 22) until every Step 7 block carried it.
- Optional files are found with quoted `find -name` and ordered by their number — bash and zsh disagree about an unmatched glob, and a path sort put `gate.9` after `gate.19`.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none — `/finalise <file>` without `--bug` is unchanged (executed at every cycle)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit/Executed Tests:** +87 across the branch; `npm run ci:fast` 3741/3741 (1 pre-existing skip) at the last fix
- **Mutation proofs:** every fix across 11 cycles reverted and shown red (2–6 red per proof; one arm recorded `absorbed`)
- **QA:** 11 `/qa-task` cycles — gates FAIL 20 → FAIL 50 → CONCERNS 90 → FAIL 70 → CONCERNS 60 → CONCERNS 80/80/80/90/90 → PASS 100; 24 bug reports filed and closed, each verified by the cycle after its fix

### Code Review

- **Reviewers:** the shared adversarial diff reviewer at every QA cycle (11 runs) + Step 5c `/review-pr` (code + conformance lenses)
- **Approval Status:** ⚠️ 5c CONCERNS, non-blocking — its actionable findings (bug reports left Ready for QA; a stale progress row) closed before finalise
- **Review Comments Addressed:** all gate `top_issues[]` across cycles 1–10 fixed and verified; low residuals carried as observation #146

## Security & Compliance

### Security Review

Checklist clean (no secrets, no unsafe patterns, no dependency change). The probe engine could not reach `gh_labels_filter` — a **sourced shell function** (obs #138) — so its record is unverifiable for this shape; the boundary was accepted on committed executed tests (`tests/gh-labels.test.js`, bash + zsh, hostile inputs, fake `gh`) and QA cycle 2's 20 by-hand executions, by explicit operator override recorded in the DoD file.

### Compliance Review

NOT_APPLICABLE — no personal data, payments, UI or health data.

## Documentation

### Updated Documentation

- `CHANGELOG.md` — three entries under `[Unreleased]`
- `skills/finalise/SKILL.md`, `skills/qa-fix/SKILL.md`, `skills/develop-bug/SKILL.md` + step docs, `skills/ensure-bug-github-issue/SKILL.md`, the sync/ensure GitHub skills
- `docs/runbooks/bug-fix.md`, `docs/runbooks/hotfix.md`

### Documentation Links

- DoD: `task.125.dod.1.develop-bug-finalise-mode-and-issue-create.md`
- Implementation report: `task.125.implementation.1.develop-bug-finalise-mode-and-issue-create-initial-run.md`
- PR review: `task.125.pr-review.1.develop-bug-finalise-mode-and-issue-create.md`

## Demo Notes

### How to Verify

1. `node --test evals/shared/tests/finalise-bug-mode.test.mjs` — the skip table ↔ markers, the template, and the executed Step 7 blocks under bash + zsh.
2. `node --test tests/gh-labels.test.js tests/ensure-bug-label-tolerance.test.js` — absent and mis-cased labels dropped with a named warning.
3. `node --test tests/qa-cycle.test.js` — `fix_cycle=N` wins over the gate; invalid values named and ignored.

### Screenshots/Visuals

N/A — skill prose, scripts and tests.

## Impact & Value

### User Impact

A develop-bug run reaches a real DoD, its issue create no longer fails on a label the repo spells differently, and every fix cycle is visible on the bug's issue.

### Technical Impact

The finalise skill's bug path is self-binding and placeholder-refusing block by block; the label boundary is one shared helper; the "both filename shapes" contract has an enumeration test.

## Known Limitations & Future Work

### Current Limitations

- No end-to-end `/finalise --bug` run in a scratch clone was executed (every cycle executed the blocks against fixtures and real reports) — observation #146.
- The probe engine cannot reach a sourced shell function — observation #138.
- 31 pre-existing `ls <glob>` optional-file sites remain, pinned by a ratchet — observation #145.
- Low residuals in the bug-mode finalise path (template-satisfied 7.6b assertion, 7.1 append-vs-fill, reworded placeholder verdicts, the `newest_numbered` hoist, the duplicated `fix_cycle` guard) — observation #146.
