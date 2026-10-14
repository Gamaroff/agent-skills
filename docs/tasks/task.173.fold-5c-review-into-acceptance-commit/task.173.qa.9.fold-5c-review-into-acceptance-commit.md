# QA Report: Task 173 - Fold the 5c review and its doc-only fixes into the acceptance commit (cycle 9)

**Task**: [Link to task document](./task.173.fold-5c-review-into-acceptance-commit.md)
**Gate File**: [task.173.gate.9.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.9.fold-5c-review-into-acceptance-commit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-08
**Gate Status**: PASS (with 2 open LOW entries)

---

## Executive Summary

CR8-1's fix holds. Every pathspec form, glob, directory and case variant is recorded, and only exact
tracked paths clear; the NUL fix holds too. The re-probe found two new LOW defects of the same
"spelling disagreement" class, both promoted. First, the resume probe reads `git status` with C-quoted
paths, so a carried path with a space never matches. Second, zsh's `echo` interprets backslashes in a
`ref`, which can print a fake classify line. Two more findings are advisory.

**Overall Assessment**: PASS · **Deployment Recommendation**: CONDITIONAL (LOWs)

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| CR8-1 a ref read as a pathspec (`:!*.md`) | FIXED — verified under bash and zsh against the real index; mutation-proved in the suite |
| CR8-2, CR7-1, CR6-2 (advisory) | NOT FIXED — advisory |

---

## Review Methodology

Re-review scope: unscoped (prior gate failed on security). This is a mandatory safety re-probe:
clause 1 is true. The diff is `origin/develop...HEAD`, excluding `*/references/*` (48 files). One
Explore reviewer ran with the safety re-probe directive in 260.6 s (completion notice `duration_ms`).
The reviewer was read-only, so it could not build scratch repositories. It verified against the real
index and through shell echo/read checks.

**Boundary: true.** The engine probed `isDocsPath` with the persisted cases
(`task.173.qa.9.security.cases.json`, the same set as cycle 8). The record is
`task.173.qa.9.security.run.json`, with `totals.executed` 28 and 0 reproduced. The pathspec class lives
in fenced Markdown, which the engine cannot reach; the committed suite pins it under both shells.

Step 4b ran `qa-execute-snippets.mjs` under bash and zsh with 0 findings:
`develop-pipeline-step-5-6-qa-loop.md` (1 runnable / 1 placeholder / 22 mutating) and
`develop-pipeline-resume-contract.md` (2 runnable / 8 placeholder / 21 mutating). The fast gate on
`c2d063ba` passed 5,556 with 0 failures.

---

## New Findings This Cycle

- **[low/high, promoted]** `shared/resources/develop-pipeline-resume-contract.md:283` — the resume
  probe reads `git status --porcelain` with the default quotePath, so a carried path with a space or
  non-ASCII character is C-quoted and never matches the raw eligible list. The resume then HALTs as
  class (c), so it fails loud. → Read status with `core.quotePath=false -z`. (CR9-2)
- **[low/high, promoted]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1512` — the
  classify loop prints the untrusted `ref` with `echo`. Under zsh, `\n` prints a fake
  `doc-only … src/evil.js` line. The orchestrator reproduced it: bash prints the line literally,
  zsh splits it. → Use `printf '%s'`. (CR9-4)
- **[medium/medium, advisory]** `…qa-loop.md:1477` — patterns are read from the working-tree
  `skills-config.yaml`. Only the operator writes that file, and no pipeline step edits it. → Read at
  `HEAD`. (CR9-1, in `recommendations.future`)
- **[low/medium, advisory]** `…qa-loop.md:1516` — the clean test ignores the index. (CR9-3, in
  `recommendations.future`)

All four anchors resolve at `HEAD` (`ok`). Provenance: every finding is in lines this task added.

---

## NFR Assessment

Security PASS (measured, 28 probes; CR9-4 is LOW). Performance PASS. Reliability PASS (CR9-2 fails
loud). Maintainability PASS.

---

## Final Assessment

**Gate Status**: PASS with 2 open LOW · **Quality Score**: 100/100 · **Next Steps**: The orchestrator
routes on the queue. The open LOW entries go to 5b unless the route classifier offers an exit; this is
the last budgeted cycle.
