# Sprint Review Summary - The Change Log engine is unreachable from a skill whose prose runs it

**Story/Task ID:** task.139
**Epic:** _none — standalone task_
**Completed Date:** 2026-09-22
**Completed By:** develop-next pipeline (session_01LHx8dNVaPzZy56Q5TZnWdS)
**Pull Request:** [#465](https://github.com/Gamaroff/agent-skills/pull/465)

---

## Summary

`develop` told the agent to append a Change Log row through `change-log.js` and did not ship the engine, so the documented one-liner failed `MODULE_NOT_FOUND` in every consumer install and the row was silently skipped. The contract's one-liner now spells the writer alternation `{develop|finalise}` — the discovery form the bundler already follows — and a parity test derives the writer population from the prose so the two cannot drift. At finalise the owner widened scope (obs #154) to land a Markdown relative-link engine, `doc-links.js`, so a dead link inside a work-item document is caught at review and at finalise rather than by CI after the whole pipeline.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC1 — `skills/develop/references/change-log.js` exists after `npm run bundle`, byte-identical to the shared source (header stripped)
- [x] SC2 — `shared/resources/document-change-log.md:192` reads `require("./.agents/skills/{develop|finalise}/references/change-log.js")`; no skill outside the alternation gained a copy
- [x] SC3 — the one-liner run verbatim with the `develop` path appends a row (pre-fix `Cannot find module` and post-fix row recorded side by side)
- [x] SC4 — bundle wall-clock unchanged within noise (one 37 KB file; accepted on the task's own NOT_APPLICABLE statement)
- [x] SC5 — parity test red pre-fix naming `develop`, green after; four mutants each red their own assertion
- [x] SC6 — `ci:fast`, `bundle:check` (0 problems, no UNREACHED), Prettier green
- [x] SC7 — CHANGELOG entry; obs #152 actioned; § Notes names the eight hand-appending writers
- [x] SC8 — `doc-links.js` engine (exit 0/1/2, repo-root anchored), work-item corpus guard with a KNOWN ratchet, `review-task` / `review-story` check 2, `finalise` Step 8a docs-link clause, evaluator `documentPath`

### Key Features Implemented

- **Writer alternation in the contract**: `{develop|finalise}` is the bundler's alternation, not a placeholder — every skill named there ships the engine, and a paragraph after the block says so
- **Two-way parity test** (`tests/change-log-engine-reachability.test.js`): population derived from `skills/*/SKILL.md` (phrase-anchored, wrap-tolerant, floor ≥ 2), each member's copy asserted byte-identical, alternation ⊆ population and population ⊆ alternation, naming the missing side
- **`doc-links.js`**: CommonMark-aware (fences, per-paragraph code spans, CRLF), extracts inline / reference-definition / HTML links, resolves against the tracked tree from the repository root, prints `✖ file:line → target` and `FAIL doc-links: N` markers; bundled into `review-task`, `review-story`, `finalise`
- **Finalise Step 8a docs-link clause**: a CI red on the docs link checker alone, reproduced by the engine on the work item's own document and nowhere else, is a fixable Docs finding rather than a halt; `documentPath` admits the document to the fix scope only when it is shaped like a work-item document under `docs/`
- **`isWorkItemDocument` exported** (finalise run 3, Step 8a): the boundary the admission rests on is now probeable — 18 candidates, 0 reproduced — and a null-byte hole in its regex is closed

---

## Technical Details

### Files Modified/Created

- `shared/resources/document-change-log.md` — `{skill}` → `{develop|finalise}` on the `require` line, plus the alternation paragraph; 42 bundled copies re-rendered
- `skills/develop/references/change-log.js` — new bundled copy (generated)
- `tests/change-log-engine-reachability.test.js` — 4 tests (floor, identity, two-way parity, wrap-tolerant phrase)
- `shared/resources/doc-links.js` — new engine; bundled into `skills/{review-task,review-story,finalise}/references/`
- `shared/resources/tests/doc-links.test.mjs` — 15 fixture tests + the work-item corpus guard
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md` — check 2 link-resolution bullet
- `skills/finalise/SKILL.md` — Step 6 `FAILURE` row pointer; Step 8a docs-link clause
- `shared/resources/finalise-fix-and-recheck.mjs`, `-preconditions.json`, `tests/finalise-fix-and-recheck.test.mjs` — `documentPath` admission; `isWorkItemDocument` exported and null-byte-safe (24 tests)
- `CHANGELOG.md` — two `[Unreleased] › Fixed` entries
- Task document, implementation report, qa.1–qa.5, gate.1–gate.5, pr-review.1–2, dod.1–dod.3, security probe cases + record

### Architecture/Design Decisions

- The population of writers is **derived from the prose, never listed**: two enumerations of "who runs the engine" drift silently (anti-patterns § enumeration). The alternation is the one authored list, and the test checks it against what the SKILL.md files actually say.
- The link engine anchors on the **tracked tree** from the repository root (`git ls-files -z --full-name`, realpath both ends) because a working-tree check passes locally on an untracked target that CI cannot see — the exact asymmetry that produced runs 1 and 2's reds.
- Step 8a's scope claim is **enforced by the evaluator, not declared by the record**: `documentPath` admits only a path `isWorkItemDocument` accepts, and that predicate is exported so the security probe can execute against it.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none — additive; the one-liner's alternation renders identically for a reader

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 43 across three files (`tests/change-log-engine-reachability.test.js` 4, `shared/resources/tests/doc-links.test.mjs` 15, `shared/resources/tests/finalise-fix-and-recheck.test.mjs` 24), all in the per-PR `npm test` lanes; `ci:fast` 3909 tests, 0 fail
- **Integration Tests:** the contract's one-liner run verbatim from the bundle (Phase 3 evidence); the security probe against the exported predicate (18 cases, recorded)
- **Test Coverage:** every engine and prose defect found in five QA cycles (20) was closed with a mutation-proven test

### Code Review

- **Reviewers:** QA (`/qa-task`, 5 cycles), `/review-pr` (5c, 2 runs), finalise DoD (4 agents × 3 runs)
- **Approval Status:** ✅ 5c run 1 APPROVE; run 2 CONCERNS applied in `4871a174`
- **Review Comments Addressed:** all promoted findings closed; low advisories recorded in task § Notes

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets across the changed source files
- [x] No shell-string execution — every child process is argv-array `spawnSync` / `execFileSync`
- [x] Boundary `isWorkItemDocument` probed by `security-probe.mjs`: `engages`, 18 executed (8 hostile corpus + 10 domain), 0 reproduced, 0 over-blocked
- [x] No dependency change

### Compliance Review

✅ **Compliance Requirements Met**

- [x] GDPR / PCI-DSS / WCAG / HIPAA — NOT_APPLICABLE (internal skills-library change; no data, UI, payments or health data)

---

## Documentation

### Updated Documentation

- [x] `CHANGELOG.md` `[Unreleased] › Fixed` — two entries (reachability; doc-links widening)
- [x] `shared/resources/document-change-log.md` — alternation + explanatory paragraph, re-bundled into 42 skills
- [x] `review-task` / `review-story` / `finalise` SKILL.md prose where behaviour changed
- [x] README / architecture — not applicable

### Documentation Links

- `shared/resources/document-change-log.md` § How a writer appends a row
- `skills/create-skill/SKILL.md` § "A bundled copy nothing reaches is `UNREACHED`"

---

## Demo Notes

### How to Verify

1. `npm run bundle && git status --porcelain | grep change-log.js` — no output (already bundled, idempotent)
2. `command node --test tests/change-log-engine-reachability.test.js` — 4/4
3. Edit the alternation to `{finalise}` and re-run — parity red naming `develop`; restore
4. `command node .agents/skills/finalise/references/doc-links.js --file docs/tasks/task.139.change-log-engine-reachability/task.139.change-log-engine-reachability.md` — exit 0, `ok doc-links`
5. `command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.139.change-log-engine-reachability/task.139.dod.security.cases.json --entry 'shared/resources/finalise-fix-and-recheck.mjs#isWorkItemDocument' --repo-root "$(git rev-parse --show-toplevel)" --json` — `engages`, executed 18

### Screenshots/Visuals

Not applicable.

---

## Impact & Value

### User Impact

Every consumer install of `develop` now carries the engine its prose runs: the Change Log row the pipeline promises is appended rather than silently skipped. A dead relative link in a task or story document is caught by `review-*` and `finalise` instead of by CI after a full push round trip.

### Technical Impact

Two enumeration classes replaced by derivation (writer population; the docs-link fix scope), one more boundary made probeable by the security engine, and the finalise fix-and-recheck path exercised end to end on a real finding — with its own record catching a stale-record misread on the first attempt.

---

## Known Limitations & Future Work

### Current Limitations

- Eight skills still hand-append Change Log rows (named in task § Notes) — a migration task moves them onto the one-liner and then into the alternation
- The evaluator and the corpus guard each keep an artifact deny-list (C5-CR-2); the export is in place, the consolidation into one shared predicate is not

### Suggested Follow-Up Stories

- Migrate the eight hand-appending writers onto `change-log.js` and join the alternation
- One shared "is a work-item document" predicate for the evaluator and the corpus guard; C5-CR-1 / C5-CR-3 / C5-CR-4; 5c CR-2 (`review-epic` / `review-prd` / `review-bug` link check); 5c CR-3 (`untracked: true` annotation)
- Obs #155: extend the Step 8a docs-link clause and the corpus guard to co-located pipeline artifacts

---

## Metrics _(if applicable)_

- **Story Points:** estimated 4 h (original scope); widened at finalise by owner decision
- **Time to Complete:** 1 day (2026-09-22)
- **Lines of Code Changed:** +5,993 / −92 over 76 files (28 files / +3,487 / −45 excluding generated `references/` copies)
- **Test Coverage Delta:** +43 tests

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
