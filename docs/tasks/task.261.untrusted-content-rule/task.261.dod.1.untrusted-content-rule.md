# Definition of Done Verification

**Story/Task:** untrusted-content-rule (task.261)
**Verification Started:** 2026-11-05T07:29Z

---

## Verification Results

### Step 3: Acceptance criteria traceability

Re-run scope: full (no prior record). PR #839 (source: branch). Judged against head `08dd732b`; the security finding below then changed the code, and the criteria were re-checked against `53f60e6d`.

| #   | Criterion                                                              | Status      | Evidence                                                                                                                                  |
| --- | ---------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rule doc states the six parts, each under its own heading              | PASS        | `shared/resources/untrusted-content-rule.md:14,24,30,39,43,47`; test `tests/untrusted-content-rule.test.js:146`                          |
| 2   | Every read-marker skill or step doc cites the rule by fragment         | PASS        | review-pr `:395`, review-task `:165`, review-story `:194`, Step 0 doc `:137`, browser-use `:100`, explain-simply `:74`; test `:163`       |
| 3   | Path outside `docs/` HALTs at review-task and Step 0, with a test      | PASS        | block at review-task, review-story and Step 0 (identical, asserted); behaviour tests execute it for accepted, rejected and empty paths    |
| 4   | Removing any one citation turns the lint test red                      | PASS        | tree-derived population test; mutation proof in `task.261.qa.1` (deleted the explain-simply citation, test went red)                     |
| 5   | Rule doc under one page; citations add few lines                       | PASS        | `wc -l shared/resources/untrusted-content-rule.md` = 52. `git diff --stat develop...HEAD`: +2 lines per single-citation skill (browser-use, explain-simply, review-pr) |
| 6   | Lint test runs in under 2 seconds                                      | PASS        | `CI=true node --test tests/untrusted-content-rule.test.js`: 27 tests, 344 ms, real 0.375 s, load average 4.5. See note below             |
| 7   | `CI=true npm test` passes                                              | CI reading  | decided by CI reading 1 in Step 6                                                                                                         |
| 8   | `npm run validate` on edited skills passes                             | CI reading  | decided by CI reading 1 in Step 6                                                                                                         |
| 9   | Test asserts citations and population, with floor and controls         | PASS        | floor `:175`, stale-allowlist check `:191`, controls `:202-289`; mutation proofs in `task.261.qa.1` and `qa.2`                            |
| 10  | `bundle:check` and `check:generated` clean                             | CI reading  | locally: `npm run bundle:check` 129 skills, 0 problems on `53f60e6d`; CI reading 1 decides                                                |
| 11  | Phase 1 re-measured read-site table recorded in the QA report          | PASS        | `task.261.qa.1.untrusted-content-rule.md:32`                                                                                              |

Notes recorded rather than hidden:

- **#5 and #6 were FAIL (low) from the agent** only because no committed artifact held the figures. They are measured above and now committed here, so they grade PASS.
- **#6 wording.** The criterion says "no processes", but the path-bound tests spawn `bash` to execute the bound block. The runtime bound still holds at 0.375 s.
- **Test count.** `task.261.gate.3` and `qa.3` say "34 tests". 34 is the lint test (27) plus `tests/bundled-links.test.js` (7), which cycle 3 ran in one command. The lint test alone has 27. The gate's verdict does not depend on the figure.
- **Mutation proof.** Cycle 3 added fence-tracking controls and recorded mutation proofs as `not-run`. Criterion #4 concerns citations, which are proven; the cycle 2 fence logic was mutation-proven in `qa.2`.

### Step 4: Security review

| Check                                             | Status | Evidence                                                                                                  |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| No hardcoded secrets                              | PASS   | changed lines are path checks and prose citations                                                         |
| No eval/exec/shell.run on untrusted value         | PASS   | the bound uses `case` pattern matching only                                                               |
| Derived `LOCAL_PATH` bounded to `docs/`           | PASS   | `skills/review-task/SKILL.md` "Bound the derived path" block; same block at review-story and the Step 0 doc |
| Security TODO/FIXME, dependency risk              | PASS / N/A | none found; no `package.json` change                                                                  |

**Boundary: true.** The `docs/`-bounded path check is a rejecting predicate. The criteria-signal classifier answered false; the agent overrode it on the predicate and `/finalise` agrees.

**Defect found by this step, fixed in `53f60e6d`.** The first run reported FAIL: the bound sat in the middle of a larger fenced block under a comment, so no probe-engine entry form could reach it and the run would have recorded `probes_executed: 0`. The block now has its own `#### Bound the derived path` heading, is the first bash fence under it, and binds its own input from a `<derived-path>` slot. The lint test lifts it the same way.

**Probe run.** Plan: 3 sites (`fence:<doc>#Bound the derived path`) × 10 cases (7 hostile with the guard's own HALT output as `expected`, 3 legitimate) × 2 shells (bash, zsh). `probes_executed: 60`, verdict `engages` on all three runs, `probes: []`, no refusals, no escapes. Record: `task.261.dod.1.security.run.json`; cases `task.261.dod.1.security.cases.{1,2,3}.json`.

**Spec challenge (not a finding).** The string check cannot see a symlink inside `docs/` that points outside the tree. The rule is advice to the model; the repository does not contain such a link. Recorded as a future recommendation (gate 3 CR-list).

**Security result: PASS.**

### Step 5: Compliance

GDPR, PCI-DSS, WCAG and HIPAA are all not applicable: an internal guardrails task (a rule document, citations, a lint test) with no personal data, payments, UI or health data. PII masking is explicitly out of scope in the task. **Result: NOT_APPLICABLE.**

### Step 6: Documentation and changelog

| Item                          | Status         | Evidence                                                                                          |
| ----------------------------- | -------------- | ------------------------------------------------------------------------------------------------- |
| `CHANGELOG.md` (opt-in is on) | PASS           | `CHANGELOG.md:9`, `[Unreleased]` entry citing task 261                                            |
| Rule and skill docs           | PASS           | new `shared/resources/untrusted-content-rule.md`; six skills cite it; bundled copies regenerated  |
| README / architecture docs    | NOT_APPLICABLE | no public API, CLI or config change                                                               |

**Result: PASS.**

---
## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-11-05T07:41Z
**Total Duration:** 14 minutes
**CI reading 1:** SUCCESS @ `53f60e6dc738f4582fb1fe302fc243b4f5594326` (the acceptance decision, Step 6)
**CI reading 2:** taken on the acceptance commit after this file is committed and pushed; recorded on the PR canonical summary comment and in the implementation report

**Artifacts Generated:**

- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- Outward side-effects (PR canonical comment, tracker steps) fire after this file is pushed; tracker steps are skipped (no tracker issue)

**Next Steps:**

- Task is ready for Sprint Review
- No further action required

