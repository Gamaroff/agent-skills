# QA Report: Task 96 — sync-jira sibling convergence

**Task**: [task.96.sync-jira-sibling-convergence.md](./task.96.sync-jira-sibling-convergence.md)
**Gate File**: [task.96.gate.1.sync-jira-sibling-convergence.yml](./task.96.gate.1.sync-jira-sibling-convergence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**Gate Status**: FAIL

---

## Executive Summary

The two defects this task exists to fix are genuinely fixed, and the evidence behind them is unusually strong: every claim in the task was verified against HEAD before implementation, all six fixes were mutation-proven, and the counterweight tests confirm the concurrent-edit guard is still armed. The suite is green at 2675 tests with Prettier clean.

The gate is FAIL because the change introduces two HIGH regressions of its own, both invisible to that green suite. One ships a test suite that cannot run where it is installed. The other silently disabled a documented flag.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases completed and ticked
- [x] Tests passing (2675 pass / 0 fail / 1 pre-existing skip)
- [x] Breaking changes documented (§5 — none to any interface)
- [x] Code on feature branch with open PR #346

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b), and one for the traceability matrix. Standard mode — 4 phases across 4 skills plus a shared library warranted the full pass.

First review; no prior gate, so the whole `origin/develop...HEAD` diff was reviewed (4675 lines, with the 22 bundled `jira-sync.js` copies verified byte-identical to source rather than re-reviewed 22 times).

**Every finding below was independently verified by QA before being recorded** — three were confirmed, and one was confirmed with a correction to the reviewer's stated mechanism.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Reproduce, then decide on extraction | PASS | Verified | Harness generalised; 12 tests written red-first; extraction decided on evidence |
| Phase 2: The label diff | PASS | Verified | All three migrated to `diffAgainstPayload`; story's two-pass build handled correctly |
| Phase 3: The transition timestamp | PASS | Verified | Added to story, task and epic's update path at `:1428` |
| Phase 4: Extraction, docs and changelog | CONCERNS | Partial | Helper extracted and all four migrated, but the test helper's location breaks consumer installs |

**Overall Phase Completion**: 4/4 completed, 1 with concerns

---

## Success Criteria Verification

Traceability matrix: [`.summaries/qa-traceability-matrix.md`](./.summaries/qa-traceability-matrix.md) — 17 criteria, 14 full / 3 partial / 0 uncovered.

Two criteria were **uncovered** when the matrix was first built (SC8 "no new network call on a deferred run", SC17 "no frontmatter backfill needed — confirmed, not assumed") and were closed with real tests before this review ran. SC17 is worth noting: its own wording forbids the form of evidence it had, which was a ticked box.

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Unchanged doc synced twice reports no field changes | all three | all three | PASS |
| Second run issues no PUT | story + epic | story + epic | PASS |
| Transitioned card syncs again without `--force` | all three | all three | PASS |
| Epic fixed on update path as well as skip path | both | code yes, **test does not exercise it** | CONCERNS |
| Genuine remote edit still trips the guard | must abort | aborts in all three | PASS |
| `npm test` / bundle / catalog / skill-deps | no drift | no drift | PASS |
| `sync-jira-bug` assertions unchanged | unchanged | unchanged | PASS |

---

## Breaking Changes Validation

§5 states **"None to any interface."** That claim does not survive review.

### Breaking Change: `--force` on an unchanged story

- **Documented**: No — this was not intended or declared
- **Migration Path Provided**: N/A
- **Consumer Code Updated**: N/A
- **Assessment**: **FAIL** — see TASK96-002. `--force` is a documented flag whose behaviour silently changed.

**Overall Breaking Changes Assessment**: FAIL

---

## Issues Found

### HIGH Severity Issues (2)

**TASK96-001 — the end-to-end suites cannot run in a consumer install**

- **Severity**: HIGH · **Category**: Quality / Packaging
- **Observation**: All four suites require `../../../tests/lib/fake-jira.js`. `bundle_skill.py` vendors only `shared/resources/*`, so a consumer's `.agents/skills/sync-jira-task/tests/` resolves that to `.agents/tests/lib/fake-jira.js`, which does not exist.
- **Why the green suite missed it**: `.agents/skills` in this repo is a **symlink to `../skills`**, so Node resolves the real path and the require succeeds locally. Proven by copying the skill into a plain directory:
  ```
  Error: Cannot find module '../../../tests/lib/fake-jira.js'
  code: 'MODULE_NOT_FOUND'
  ```
- **Impact**: `sync-jira-task/SKILL.md:415` instructs users to run exactly the command that now fails, in every consumer install.
- **Recommendation**: Move to `shared/resources/fake-jira.js`. The bundler then vendors and path-rewrites it, which is the precedent `relative-doc-links.test.js` already follows with `../references/jira-sync.js`.

**TASK96-002 — `--force` silently stopped working on an unchanged story**

- **Severity**: HIGH · **Category**: Functional regression
- **Observation**: Story's gate is `changedFields.length === 0`; epic's is `current && changedFields.length === 0 && !args.force`. Story never had the force term, but until this change the gate was **unreachable** (defect 1 guaranteed `labels` always differed), so the omission was inert. Fixing defect 1 activated it.
- **Verified behaviourally**: PUT count 0 before a `--force` run and 0 after; summary reports `Sync (no field changes detected)`.
- **Impact**: The documented repair path for a card blanked or corrupted in the Jira UI is gone, and the run reports success. A defect that reports success is the expensive kind.
- **Recommendation**: Add `&& !args.force` to story's skip condition, and a test asserting `--force` pushes a PUT on an unchanged document.

### MEDIUM Severity Issues (1)

**TASK96-003 — the epic UPDATE-path test does not exercise the update path**

- **Severity**: MEDIUM · **Category**: Test validity
- **Observation**: On the update run, `syncDocumentStatus` returns `transitioned: false, reason: "already"` — run 1 already moved the card, and the fixture edit changes only body text. So the re-read at `:1428` never fires during the run the test is named for.
- **Correction to the reviewer's account**: the finding stated the test "passes verbatim with that whole block deleted". It does **not** — disabling the block turns it red, because run 1 (the CREATE path) needs the same block. The defect is narrower but still real: the test does not cover the epic **update-path** site that §2.4 identifies as the never-fixed one.
- **Recommendation**: Advance frontmatter status in the fixture edit so the update run genuinely transitions, and assert `statusOutcome.transitioned === true` so the test cannot silently stop exercising the path.

### LOW Severity Issues (5)

- **TASK96-004** — `the diff is fed the label set that is actually sent` compares two payloads from the same builder, so it asserts determinism, not the diff. **Verified: stays green with the label defect restored.**
- The hoist comment at `sync-jira-epic.js:923` claims the moved build is "pure — no network"; `buildDescriptionAdf` and `collectCommonFields` can emit advisory warnings, so a no-op skip sync now prints warnings it did not before.
- `countRequests` (`tests/lib/fake-jira.js:294`) carries a comment describing an over-count its body does nothing about, and its substring match makes `PROJ-901` a prefix match for `PROJ-9012`.
- Two fixtures in the bug suite (`:223`, `:275`) still hand-roll `mkdtempSync` + `git init` rather than using the new `gitRepo` helper the file now imports.
- `assert.ok(key, "sanity: a card was created")` at `sync-jira-epic/tests/end-to-end.test.js:234` is dead weight.

**Already fixed before this review**: the tautological `assert.equal(putCount(x), putCount(x))` the traceability mapper found — replaced with `putCount === 0`.

**Total Issues**: HIGH: 2, MEDIUM: 1, LOW: 5

---

## NFR Assessment

### Performance — PASS
The stated target is met where it applies. Story and epic issue one PUT instead of two across two unchanged syncs, asserted as a count rather than a duration (the repo has been bitten twice by load-flaky timing assertions). Task is correctly excluded and documented as such — it has no skip gate.

### Reliability — CONCERNS
TASK96-002. A documented flag became a silent no-op. The re-read itself is correctly best-effort — it warns and keeps the earlier value rather than throwing — though see the future recommendation about `--json` suppressing that warn.

### Security — PASS
No credential handling changed. The critical risk this task named for itself — that the fix might quietly disable `guardConcurrentEdit` rather than fix its inputs — does not materialise: the guard call sites are byte-identical, still compare `current.updated` against `frontmatter.jira_last_synced_at`, and three counterweight tests assert a genuine remote edit still aborts. That was the right risk to name and it is properly closed.

### Maintainability — CONCERNS
TASK96-001 ships a suite that cannot run where it is installed. TASK96-003 and TASK96-004 are tests that report coverage they do not provide — worse than missing tests, because they are counted.

---

## Code Review

Step 3b, one read-only Explore subagent over the full branch diff. 11 findings: 7 correctness bugs, 4 cleanups.

**Correctness bugs (7):**
- [medium/high] `skills/sync-jira-task/tests/end-to-end.test.js:39` — consumer-install require failure → promoted to **TASK96-001** (HIGH after QA verification)
- [medium/high] `skills/sync-jira-epic/tests/end-to-end.test.js:199` — update-path test does not transition → **TASK96-003** (mechanism corrected)
- [medium/medium] `skills/sync-jira-story/scripts/sync-jira-story.js:943` — missing `!args.force` → promoted to **TASK96-002** (HIGH after QA verified it behaviourally)
- [low/high] `skills/sync-jira-epic/tests/end-to-end.test.js:162` — tautological assertion → already fixed
- [low/high] `skills/sync-jira-task/tests/end-to-end.test.js:170` — asserts builder determinism → **TASK96-004**
- [low/medium] `sync-jira-story.js:1204` — `output.warn` suppressed under `--json`, so a failed re-read is silent in the pipeline's own mode → recorded as future work; fixing it adds a JSON field, which §5 promises not to do
- [low/low] `sync-jira-task.js:979` — read-after-write race between the transition POST and the re-read GET → inherent to refreshing; documented

**Cleanups (4):** the epic hoist comment overclaiming purity; `countRequests`'s unimplemented comment and prefix-match; the half-ported bug fixtures; the dead `assert.ok`.

### Mutation-Proof Spot Check (Step 3c)

QA independently re-ran the mutation proofs rather than accepting the implementation report's attestation:

| Fix | Mutation | Result |
|---|---|---|
| story label diff | reverted to frontmatter rebuild | 3 → 1 pass ✅ red |
| task label diff | reverted to frontmatter rebuild | 5 → 2 pass ✅ red |
| epic label diff | reverted to frontmatter rebuild | 5 → 1 pass ✅ red |
| story re-read | guard forced false | 3 → 1 pass ✅ red |
| task re-read | guard forced false | 5 → 1 pass ✅ red |
| epic re-read | guard forced false | 5 → 1 pass ✅ red |
| deferred-run test | `ACCESS_TRACKER=full` | ✅ red |

`mutation-proven: yes` for all six fixes. **But mutation-proving is not the same as covering the named site** — TASK96-003 and TASK96-004 are both tests that survive their own mutation for the wrong reason, which is exactly what a per-fix mutation proof cannot detect.

---

## Executed Documented Commands (Step 4b)

`skills/sync-jira-task/SKILL.md` was modified and contains 7 fenced `bash` blocks, so the rule fires.

- **Blocks**: 7 — runnable 2, placeholder 0, mutating 5 (refused fail-closed)
- **Skipped, with reasons**: `:78` unrecognised-command curl/node; `:136` write-redirection; `:146`, `:212`, `:414` unrecognised-command node
- **Shells**: bash and zsh both ran (zsh available) — no disagreement between them
- **Finding**: `:129` exits 2 in *both* shells (`grep` on an absent `.env`). Identical across shells, so not a portability defect, and it is **pre-existing content this diff never touched**. Recorded as LOW and deliberately **not** gated on — gating this task on an unrelated documentation snippet would be wrong.

---

## Regression Testing

| Area | Result |
|---|---|
| `sync-jira-bug` (the reference implementation) | PASS — 91 tests, assertions unchanged after both the harness extraction and the helper migration |
| Full suite | PASS — 2675 tests, 0 failures, 1 pre-existing skip |
| Formatting | PASS — `prettier --check` clean |
| Generators | PASS — bundle, generate-catalog, generate-skill-deps produce no drift |
| 22 bundled `jira-sync.js` copies | PASS — byte-identical to source modulo the generated banner |

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 50/100 — `100 − (20 × 2 HIGH) − (10 × 1 MEDIUM)`

**Rationale**: The task's own work is sound and well-evidenced; the failure is in what it introduced alongside. TASK96-001 and TASK96-002 are both regressions that a green suite structurally cannot see — one because a symlink hides it locally, the other because it only became reachable when the fix landed. Both are silent, and both reach consumers.

Worth stating plainly: the reason these were caught is that the review was adversarial by construction and that findings were verified rather than accepted. Two of the four confirmed findings concern tests that pass for the wrong reason, which is the failure mode this entire task was written about.

**Deployment Recommendation**: BLOCKED until TASK96-001 and TASK96-002 are resolved.

**Next Steps**: `/qa-fix` cycle 1 — address TASK96-001 through TASK96-004 and the accepted cleanups, then re-review.
