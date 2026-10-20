# QA Report: Task 219 - General-bug registry status: one writer at every transition

**Task**: [Task document](./task.219.bug-registry-status-mirror.md)
**Gate File**: [task.219.gate.1.bug-registry-status-mirror.yml](./task.219.gate.1.bug-registry-status-mirror.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: PASS

---

## Executive Summary

All three phases are complete, and every success criterion is verified from a test, a command or a cited line, not from its checkbox. The diff review returned three low-severity findings (two medium-confidence bugs and one cleanup). None reaches the gate, and each is recorded below as a future recommendation. The new `--bug-status` classifier was probed with 7 hostile and legitimate inputs. It refused every hostile one and wrote nothing outside its sandbox. Three QA mutations each turned a named committed test red.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (15/15 plan items)
- [x] Tests passing
- [x] Breaking changes documented (none; the default tick mode is unchanged)
- [x] Code on feature branch with open PR (#708, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration, e2e)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools first, plus one read-only Explore subagent for the Step 3b diff review. This is a first review of a medium task: 3 phases across shared/resources, two skills and evals, with no auth, payment or credential path. The reviewer was dispatched at 13:31:20Z and returned at 13:35:06Z (`duration_ms` 197324). Mutation proofs ran after it returned.

Step 4b ran over `skills/qa-fix/SKILL.md` and `skills/develop-bug/SKILL.md`, the two changed in-scope files. The develop-bug step docs are skill-local `references/` files and are outside the rule's scope.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: `--bug-status` engine mode | PASS | Verified | `registry-tick.test.mjs` 68/68; 27 bug-status tests; mutation `covered` |
| Phase 2: call sites (develop-bug, qa-fix) | PASS | Verified | `develop-bug.test.js` 24/24; no hand edit of the Status cell remains; mutation `covered` |
| Phase 3: drift test + CHANGELOG | PASS | Verified | `bug-registry-drift.test.mjs` 4/4; mutation `covered` |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| `reopened` row + `ready-for-qa` file → Status cell only, `mirrored` | `registry-tick.test.mjs:1297` (token registry, one line changed, all five statuses) | PASS |
| Emoji-vocabulary registry writes `🔍 Ready for QA` | `registry-tick.test.mjs:1327` (label registry, one line changed) | PASS |
| Task bug → `not-a-general-bug`, nothing written; bug without the flag → `not-a-task` | `registry-tick.test.mjs:1437`, `:1482` | PASS |
| qa-fix's In Progress and Ready for QA steps call the CLI | `develop-bug.test.js` "qa-fix mirrors both of its bug status writes…" (mutation `covered`) | PASS |
| Drift test reads the label map through `registry-tick.js`'s exports; no second map in code | `bug-registry-drift.test.mjs:59` (`createRequire`). A `git grep` over `*.js`/`*.mjs` finds no other token-to-label map for the registry. `status-history.js` maps the body **header** vocabulary, a different field | PASS |
| develop-bug has no hand edit of the Status cell | `develop-bug.test.js` "no develop-bug step edits the registry row's Status cell by hand" | PASS |
| Drift test passes, and goes red when one row changes | Passes on this branch; changing bug 5's row to `reopened` reds the corpus test (Step 3 report); the QA mutation of the comparison reds the fixture test | PASS |

**Performance Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| One registry read, at most one write per call | `registry-tick.js:612` is the only registry read in `bugStatus`, `:674` the only write (skipped on `--dry-run`) | PASS |
| No change to the task tick's output on existing cases | The diff to `registry-tick.test.mjs` removes one import line and one comment line; no existing case was edited, and all pass | PASS |

**Code Quality Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| `npm run ci` passes | `npm run ci` exit 0 (symlink aside): node tests 5,990 pass / 0 fail; eval:all, validate:all, check:generated, bundle:check, lint:shell all pass; log `.claude/state/test-output-qa1-full-ci.log` | PASS |
| `quick_validate.py` for qa-fix, develop-bug, finalise | `npm run validate -- skills/<s>/`: ✓ for qa-fix, develop-bug, finalise, develop-next, develop-batch | PASS |
| Every change mutation-proven | 6 engine mutations in Step 3 plus 3 here, each `covered` | PASS |

**Migration Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| CHANGELOG `[Unreleased]` cites `(task 219)` and names the flag | `CHANGELOG.md` `### Added` entry | PASS |
| Bundled copies regenerated in the same commit as the source | Commit `686c2d5b` carries the source and all 5 copies; `bundle:check` reports 0 problems | PASS |

---

## Breaking Changes Validation

None. The default tick mode answers `not-a-task` for a bug document as before (`registry-tick.test.mjs:1482`), so `finalise --bug` is unchanged. `--bug-status` is a new flag.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3)

The three diff-review findings below are advisory. None is `bug` + `confidence: high`.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS

There is one registry read and at most one write per call (cited above). No loop is unbounded: the vocabulary is read from the parsed rows once.

### Reliability — PASS

Every outcome has a named `reason`, and every reason exits 0, the same as the task tick. Usage errors exit 2. A missing `--file` is a usage error, not a crash. `--dry-run` leaves the registry byte-identical (`registry-tick.test.mjs:1559`). A CRLF registry keeps its line endings (`:1415`).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 7 (run record `task.219.qa.1.security.run.json`, `totals.executed` 7, `escaped` 0)
- **Boundary**: true. The general-bug classifier in `bugStatus` decides whether a file may write a registry row.
- Probed with `--entry 'cli:shared/resources/registry-tick.js' --argv '["--bug-status","--file","{input}"]' --sink filename --name bug-status-classifier`. Every refusal exits 0, so each case carries the exact stdout its contract requires: the `not-a-general-bug` line for a hostile case, and `no-registry` for a legitimate one, which proves the classifier let it through.
- Hostile cases: a task bug, a story bug, a prefix lookalike (`xbug.5.y.md`), digits with no dot (`bug.5x.y.md`) and a command-substitution name (`$(touch PWNED).md`, with `PWNED` asserted absent). All five were rejected.
- Legitimate cases: a typed and an untyped general bug. Both were accepted. Verdict: `engages`.
- The type-based arms (a `bug.{N}.` sibling report, a non-`bug` `type:`) need file content, which the `cli:` form cannot supply (observation #58, recurrence logged). They are held by committed tests at `registry-tick.test.mjs:1454` and `:1467`, and the QA mutation that drops the type check reds `:1467`. A survey of `docs/bugs/` found that every sibling artefact with frontmatter carries a non-`bug` `type:`, and those without frontmatter have no status.

### Maintainability — PASS

The call and its reason table are written once in develop-bug (the Step 3 callout); the other sites link to it. qa-fix carries its own copy because it is a separate skill. The label map has one definition, which is exported and imported by the drift test. CR-3 is a wording cleanup in step 7.

---

## Code Review

Advisory, with blocking resolved on (`code_review_blocking=true` from the pipeline, no per-doc flag). No finding is `bug` + `confidence: high`, so none was promoted to `top_issues[]`. All three anchors check `ok`.

**Correctness bugs (2):**
- [low/medium] `shared/resources/registry-tick.js:564`: One reason, `not-a-general-bug`, covers two cases. A story or task bug correctly has no row; a `bug.{N}.` file whose `type:` is not `bug` means the wrong file was passed. The reason tables say "Nothing" for both, so a call made on the wrong file would leave the row unmoved, silently. → Give the type mismatch its own reason with a fix-the-call action.
- [low/medium] `skills/develop-bug/references/develop-bug-step-3-investigate-fix.md:43`: `no-registry` shares a table row with genuine failures, and that row says to hand-edit a row in a registry that does not exist (the same row is at `skills/qa-fix/SKILL.md:1338`). → Split `no-registry` into its own row with a log-only action.

**Cleanups (1):**
- `skills/develop-bug/references/develop-bug-step-7-close-bug.md:89`: The paragraph names earlier writes in the emoji labels, but in a token registry such as this repository's the row reads `in-progress` / `ready-for-qa` / `reopened` / `new`. → Phrase the references in both vocabularies, or neutrally.

**Provenance**: all three are new to this change. The reason tables and the CLI's reasons did not exist on `develop`.

**Boundary**: `true`. probes_executed: 7. escaped: 0. Details under Security.

**Mutation proofs (QA cycle 1):**
- mutation-proven: drop the `type:` check from the general-bug classifier → `--bug-status: a \`bug.N.\` file whose type is not \`bug\` answers \`not-a-general-bug\`` → covered
- mutation-proven: qa-fix's Ready for QA section no longer writes frontmatter `status:` → `qa-fix mirrors both of its bug status writes through registry-tick.js --bug-status` → covered
- mutation-proven: the drift comparison ignores a status difference → `the comparison reports a changed row, a row-less bug and a file-less row` → covered

Three of three proofs were reverted and each reddened its predicted committed test. Step 3 adds six engine proofs, all `covered`. `git diff` was clean after each restore.

**Platform variance**: there is no environment-derived value in the diff. The drift test's sandboxes use `os.tmpdir()` only as a scratch parent, with no containment check on it.

**Step 4b (runnable prose):**
- `skills/qa-fix/SKILL.md`: 1 changed block, 0 executed. It is the mirror call, classified `mutating` because it writes the registry, so it is refused by design. The same CLI call is executed end to end by `bug-registry-drift.test.mjs`'s reopen-cycle test, in both vocabularies. File level: 11 blocks (0 runnable, 2 placeholder, 9 mutating), plus `zero-blocks-executed` (medium) for the 2 placeholder blocks. Those blocks are unchanged by this diff, so the finding is pre-existing and not a gate item.
- `skills/develop-bug/SKILL.md`: 0 changed blocks. File level: 8 blocks (1 runnable, 7 mutating); no findings.
- Shells: bash and zsh available.

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Task tick (`finalise`, `develop-next`, `develop-batch` copies) | The existing `registry-tick.test.mjs` cases are untouched and pass; the row rewrite is shared through `rewriteStatusCell` | PASS |
| `finalise --bug` | A bug without `--bug-status` still answers `not-a-task` (`:1482`) | PASS |
| Doc-id chokepoint (new regex) | `tests/doc-id-chokepoint.test.js` 14/14 | PASS |
| Whole suite | `npm run ci` exit 0 (symlink aside): node tests 5,990 pass / 0 fail; eval:all, validate:all, check:generated, bundle:check, lint:shell all pass; log `.claude/state/test-output-qa1-full-ci.log` | PASS |

---

## Test Artifacts

### Files Reviewed

`shared/resources/registry-tick.js`, `shared/resources/tests/registry-tick.test.mjs`, `evals/shared/tests/bug-registry-drift.test.mjs`, `skills/develop-bug/SKILL.md`, `skills/develop-bug/references/develop-bug-step-{3,5-6,7}-*.md`, `skills/develop-bug/tests/develop-bug.test.js`, `skills/qa-fix/SKILL.md`, `CHANGELOG.md`, and the five bundled copies (`bundle:check`).

### Test Commands Executed

```bash
npm run ci                       # with the gitignored .agents/skills symlink moved aside
npm run validate -- skills/qa-fix/   # and develop-bug, finalise, develop-next, develop-batch
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-fix/SKILL.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'cli:shared/resources/registry-tick.js' --argv '["--bug-status","--file","{input}"]' --cases-file <cases.json> --name bug-status-classifier --record task.219.qa.1.security.run.json --json
node --test shared/resources/tests/registry-tick.test.mjs skills/develop-bug/tests/develop-bug.test.js evals/shared/tests/bug-registry-drift.test.mjs   # under each mutation
```

### Coverage Report

Not measured: the repository's test runner (`node --test`) has no coverage configured. Coverage of the changed behaviour is shown by the mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1: give a `bug.{N}.` file with a non-`bug` `type:` its own reason, so a call made on the wrong file is not read as "nothing to do".
2. CR-2: split `no-registry` out of the hand-edit row in both reason tables.
3. CR-3: phrase the step 7 references to earlier writes in both vocabularies.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every phase and success criterion is verified from evidence. No finding is medium or high severity. All NFRs pass, and security is measured (7 probes, 0 escaped).
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.219.qa.1.bug-registry-status-mirror.md`
**Gate File**: co-located at `task.219.gate.1.bug-registry-status-mirror.yml`
**Next Steps**: Step 5c PR conformance review (`/review-pr`), then `/finalise`.
