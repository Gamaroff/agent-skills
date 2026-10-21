# Sprint Review Summary - Migration engine: monolith and domain-less PRDs

**Story/Task ID:** task.211
**Epic:** none (standalone task, follow-up to task.204)
**Completed Date:** 2026-10-21
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#712](https://github.com/Gamaroff/agent-skills/pull/712)

---

## Summary

The doc-numbering migration engine can now migrate three legacy PRD shapes that review-prd's guard used to refuse: a PRD with no frontmatter, a `docs/prd.md` that files outside the PRD root link to, and a PRD with no domain. With all three handled, the guard was deleted.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A legacy PRD with no frontmatter migrates end to end, and the numbering check comes back clean. An unclosed fence blocks the plan, and nothing moves.
- [x] After `docs/prd.md` migrates, a README `[PRD](docs/prd.md)` and a `docs/` `[PRD](prd.md)` point at the new path.
- [x] A domain-less PRD blocks with `needs-domain`. With `--name <path>=<domain>/<slug>` it lands under that domain, and create-prd's keep block accepts it.
- [x] `migration-guard.mjs` no longer exists.
- [x] The prefilter adds reads only for files that name a move source outside the root.
- [x] `ci:fast`, `eval:all`, `bundle:check` and `validate -- skills/review-prd/` pass.
- [x] Every fix is mutation-proven.
- [x] review-prd's plan block documents `needs-domain` and the `<domain>/<slug>` form.

### Key Features Implemented

- **Frontmatter states**: `frontmatterState()` tells a closed, absent, unclosed or displaced block apart. `editFrontmatter` creates a block when the file has none.
- **Outside links**: move sources outside the PRD root join the prefilter and the literal pass, so the links that name them are re-pointed. An outside path that no pass can rewrite is a `stale-reference` blocker.
- **Domain placement**: the `--name <path>=<domain>/<slug>` form goes through one check, `parseNameValue`. A PRD landing directly under the root is `needs-domain`.
- **Four blockers**: `unclosed-frontmatter`, `displaced-frontmatter`, `stale-reference` and `needs-domain` replace the deleted guard's refusals. All four are raised before `--apply` writes anything.

---

## Technical Details

### Files Modified/Created

- `shared/resources/migrate-doc-numbering.mjs`: the engine (+369 lines). The bundled copy is `skills/review-prd/references/migrate-doc-numbering.mjs`.
- `shared/resources/tests/migrate-doc-numbering.test.mjs`: about 24 new task.211 rows (+599 lines).
- `evals/shared/tests/prd-skill-numbering.test.mjs`: the gate-8 and gate-9/10 rows, re-pointed at the engine.
- `skills/review-prd/SKILL.md`: the plan and apply blocks without the guard, plus instructions for each blocker.
- `skills/review-prd/scripts/migration-guard.mjs`: deleted.
- `CHANGELOG.md`, `docs/contributing/traps.md`

### Architecture/Design Decisions

- QA consolidated rather than patched. One `outsideReferences` tokeniser and one stale-scan predicate are shared by both scan loops, and one extension test decides which loop a file goes to.
- `type: prd` is written only into a block the engine creates, never over an existing `type:`.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** a bare `index.md=core` name now blocks with `needs-domain`. Use `index.md=<domain>/core`. This is marked BREAKING in the CHANGELOG.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** the engine file has 68 rows, all passing. The full `ci:fast` run has 6103 tests with 0 failures.
- **Integration Tests:** the eval rows run review-prd's live SKILL.md plan and apply blocks.
- **Test Coverage:** not measured; the repository runs `node --test` without coverage. Every fix was mutation-proven.

### Code Review

- **Reviewers:** six QA cycles, each with a code-review lens, and the Step 5c `/review-pr` conformance review.
- **Approval Status:** ✅ Gate 6 PASS (95/100). PR review: APPROVE.
- **Review Comments Addressed:** QA cycles 1–5 raised 20 findings, and all 20 were fixed. Three low items remain open (CR-1, CR-2, PC-1).

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Input validation: `parseNameValue` was probed on the path sink with 31 cases. It engages, with 0 reproduced and 0 escaped.
- [x] No shell or eval: the only child process is `spawnSync("git", args)`, which runs with no shell.
- [x] No secrets in the diff.
- [x] No new dependencies.

### Compliance Review

✅ **Compliance Requirements Met**: not applicable. The change touches no personal, payment or health data and no UI.

---

## Documentation

### Updated Documentation

- [x] CHANGELOG `[Unreleased]` BREAKING entry (task 211)
- [x] `skills/review-prd/SKILL.md` instructions for each blocker
- [x] `docs/contributing/traps.md`

### Documentation Links

- [Task document](./task.211.migration-engine-monolith-and-domainless-prds.md)
- [DoD summary](./task.211.dod.1.migration-engine-monolith-and-domainless-prds.md)

---

## Demo Notes

### How to Verify

1. In a scratch repository, add a `docs/prd.md` with no frontmatter, plus a README that links to it.
2. Run review-prd's migration plan block. It reports `needs-domain`.
3. Re-run the plan with `MIG_NAME='docs/prd.md=main/core'`, then apply.
4. Expected outcome: the PRD sits at `docs/prd/main/prd.1.core/`, it has a frontmatter block, the README link resolves, and the numbering check comes back clean.

### Screenshots/Visuals

Not applicable (CLI).

---

## Impact & Value

### User Impact

Projects whose PRD is a single `docs/prd.md`, carries no frontmatter, or has no domain can now migrate to numbered PRDs without hand-editing files first.

### Technical Impact

The engine replaces a separate guard script with its own blockers. That removes a second definition of the shapes the engine refuses.

---

## Known Limitations & Future Work

### Current Limitations

- CR-1 (low): a root-relative path into a dot-directory is resolved only against the file's directory. It matters only for a PRD root inside a dot-directory, and this repository has none.
- CR-2 (low, advisory): `editFrontmatter` called directly on a displaced block writes above it. The CLI never makes that call.

### Suggested Follow-Up Stories

- PC-1: bring task §3 Target in line with the shipped `BLOCKER_CODES`.
- CR-1 and CR-2 fixes, each with a row.

---

## Metrics _(if applicable)_

- **Story Points:** n/a (8 hours estimated)
- **Time to Complete:** 1 day (2026-10-21)
- **Lines of Code Changed:** +1404 / -333 outside `docs/tasks/`
- **Test Coverage Delta:** not measured

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
