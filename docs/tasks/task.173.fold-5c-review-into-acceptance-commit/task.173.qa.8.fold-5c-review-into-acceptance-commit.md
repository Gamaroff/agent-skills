# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 8)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.8.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.8.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Gate Status**: FAIL

---

## Executive Summary

The run re-entered QA after `/finalise` DoD run 3 found a boundary defect: `isDocsPath` accepted an
embedded NUL. The fix (`3d49e349`) holds, both under the engine probe and in the committed tests. The
unscoped safety re-probe then found a second defect of the same class. The classifier judges a `ref`
as a literal filename, but it hands that `ref` to git, which reads it as a pathspec. `:!*.md` passes
under the default patterns and names every non-markdown file.

**Overall Assessment**: FAIL · **Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| DoD run 3 security: an embedded NUL clears a code file under zsh | FIXED. The SEC-5 unit test and the zsh classify case were mutation-proved. The engine probe engages (28/0) |
| CR7-1, CR6-2 (advisory) | NOT FIXED. Still advisory |

---

## Review Methodology

Re-review scope: unscoped (safety re-probe by judgement). Clause 1 is false (gate 7's security
status was PASS), and clauses 2–3 do not hold literally. The re-entry itself came from a boundary
defect in this surface, so QA chose to search the whole surface again.

The diff reviewed was `origin/develop...HEAD`, excluding `*/references/*`: 45 files, 4,452 lines. One
Explore reviewer ran with the safety re-probe directive; its duration was 279.6 s (completion notice
`duration_ms`).

**Boundary: true** (obs #298 applied: QA, not only the DoD, now records the 5c classifier as a
boundary). The engine probed `shared/resources/ci-tree-equivalence.js#isDocsPath` with `--args-json`
under the repo patterns and the default patterns. The cases file is persisted at
`task.173.qa.8.security.cases.json` (obs #299). The run record is `task.173.qa.8.security.run.json`,
with `totals.executed` 28 and 0 reproduced; both controls engage. Discrimination check: with the
control-character guard reverted, the verdict became `present-but-inert`.

The git-state arms of the classify and stage blocks are fenced Markdown, which no engine form
reaches. CR8-1 was reproduced by hand under bash and zsh, and is not counted as a probe.

Step 4b: no `SKILL.md` or `shared/resources/*.md` changed since gate 7. The step 5-6 document last
ran in cycles 6–7 and is unchanged. Validation (`npm run validate`): develop-task, develop-story,
finalise, develop-next and develop-batch all pass. Fast gate on `3d49e349`: 5,552 pass, 0 fail.

---

## New Findings This Cycle

- **[high/high]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1509` — the tracked-and-clean
  test passes the `ref` to git as a pathspec. `:!*.md`, `:(exclude)*.md` and `:^*.md` pass
  `isDocsPath` under the default patterns, and git reads them as every non-markdown file. The
  orchestrator reproduced this: both shells print `CLEARED`, and git matches 2,256 files. The stage
  block's `git add`, `restore` and `checkout` would then act on all code. → Use literal pathspecs,
  require exactly one path, and refuse `:` or glob characters in `isDocsPath`. (CR8-1, promoted;
  bug: [task.173.bug.3](./task.173.bug.3.classifier-clears-pathspec-magic-refs.md).)
- **[medium/low, advisory]** same line — the file mode is not checked, so a tracked symlink in
  `docs/` pointing at code would be cleared. This was not reproduced: the repository tracks no
  symlinks. (CR8-2, in `recommendations.future`.)

Both anchors resolve at `HEAD` (`finding-anchors.js`, `ok`). Provenance: the classify block was added
by this task, so neither finding is pre-existing.

---

## NFR Assessment

Security FAIL (evidence measured, `probes_executed` 28, CR8-1). Performance PASS. Reliability PASS.
Maintainability PASS.

---

## Final Assessment

**Gate Status**: FAIL · **Quality Score**: 70/100 · **Next Steps**: `/qa-fix` cycle 8 (CR8-1), then
QA cycle 9, the last budgeted cycle.
