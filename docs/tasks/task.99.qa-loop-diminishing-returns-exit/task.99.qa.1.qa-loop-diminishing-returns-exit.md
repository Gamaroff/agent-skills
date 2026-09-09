# QA Report: Task 99 - A diminishing-returns exit for the QA loop

**Task**: [Link to task document](./task.99.qa-loop-diminishing-returns-exit.md)
**Gate File**: [task.99.gate.1.qa-loop-diminishing-returns-exit.yml](./task.99.gate.1.qa-loop-diminishing-returns-exit.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Testing Completed**: 2026-09-09
**Gate Status**: FAIL

---

## Executive Summary

The task is implemented completely and carefully: all 5 phases, all 12 success criteria, a pure
engine that matches the shape of its sibling, 32 tests over 12 fixtures, and a mutation-proving pass
that caught and fixed a false green in the suite before it ever reached QA. `npm run ci:fast` is
green at 2936/0.

One HIGH defeats it. The glob matcher **case-folds `file:` paths**, so any consumer whose
`qa.testArtifactGlobs` contains an uppercase character can never satisfy condition 2 and can never
take the exit. The failure is silent and indistinguishable from an unconfigured project, and the new
32-test suite cannot see it because every fixture path and every glob in it is lowercase — the
anti-vacuity fixture included. That is the exact failure mode the task's own reasoning warns about
("an empty result is a claim about the instrument"), reappearing one level down in the instrument
the task shipped.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5 ticked)
- [x] Tests passing (`npm run ci:fast` → 2936 tests, 0 failures, 1 skipped)
- [x] Breaking changes documented — none, and the `[]` default makes that verifiable rather than asserted
- [x] Code on feature branch `feature/task.99.qa-loop-diminishing-returns-exit` with open PR [#361](https://github.com/Gamaroff/agent-skills/pull/361)

### Testing Approach

- [x] Automated testing (unit — 32 new, 2936 total)
- [x] Regression testing (full suite; the modified shared resource is consumed by two skills)
- [x] Security review
- [x] Code review (Step 3b — see caveat below)
- [x] Documented-command execution (Step 4b)
- [x] Mutation-proof spot check (Step 3c)

### Review Methodology

Direct tools throughout. 5 phases across three modules puts this at the boundary of the Adaptive
Review Strategy's "large task" row; direct tools were sufficient because the change set is one new
module plus prose, and the module has an executable test surface that can be probed directly.

> **The Step 3b code review was NOT an independent pass, and that materially weakens it.** The
> contract calls for a read-only Explore subagent — an agent that did not write the code. This
> session ran the review in-line, in the same context that authored the change, because subagent
> dispatch was outside this session's remit. An author reviewing their own work is the weakest form
> of the check, and the one HIGH found below was reached by *executing* the module against a probe
> input rather than by reading it, which is the only reason it surfaced at all. Treat the code-review
> section as under-powered and weight the PR conformance review (Step 5c) accordingly.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :--- | :--- | :--- | :--- |
| Phase 1 — the rule (prose section) | CONCERNS | Verified by inspection | Section is correctly placed (L396, between Convergence check L311 and 5b L490) and states all three conditions plus the cycle floor. Two documentation defects: TASK-99-002, TASK-99-003 |
| Phase 2 — the config key | PASS | Verified by inspection | `qa.testArtifactGlobs` in the schema block, the key-reference table and a prose section. `[]` default stated as the fail-safe in all three places |
| Phase 3 — the surrounding prose | PASS | Verified by inspection | Preamble exit count, outcome-branching route, and a Loop Escalation note saying this exit is deliberately not one of its triggers. One wording nit recorded as `future` |
| Phase 4 — the engine and its tests | CONCERNS | 32/32 pass | The engine is well-shaped and its properties are argued, but TASK-99-001 makes its core matcher wrong for capitalised paths, and the suite is structurally unable to detect that |
| Phase 5 — `npm run bundle` | PASS | Verified | Both `references/` copies regenerated and committed; the bundler followed the new engine reference from the prose and bundled `qa-diminishing-returns.js` into both skills, which independently proves the reference path resolves |

**Overall Phase Completion**: 5/5 implemented; 3/5 clean.

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| :-- | :--- | :--- | :--- |
| 1 | Section placed correctly, states 3 conditions + cycle floor | PASS | L396; conditions enumerated; `CYCLE_FLOOR = 3` asserted by test |
| 2 | Fires on the reconstructed sequence at the end of cycle 3 | PASS | `fires at the end of the second consecutive zero-HIGH cycle`; the task's "cycle 2" was corrected during implementation and the correction is argued in the document |
| 3 | Never fires on `7,7,7,7,4`, at any cycle | PASS | Loop over all five cycles asserts CONTINUE at each |
| 4 | One HIGH does not fire it; production-path MEDIUM does not | PASS | Two dedicated tests, each naming its reason code |
| 5 | Anti-vacuity: every condition holds except the glob match | PASS **as written**, but see below | The test additionally proves the same gate DOES exit once the globs are widened, which is what makes it non-vacuous rather than merely green. **However** its fixture paths are lowercase, so it cannot catch TASK-99-001 |
| 6 | No `file:`, or unmatched, fails the condition | PASS | `finding-without-file` and `non-test-finding` are distinct reason codes with distinct tests |
| 7 | Config key documented with the fail-safe direction stated | PASS | Schema comment, key-reference row and prose section all state `[]` matches nothing |
| 8 | Escalation table and preamble distinguish the clean exit from a stall | CONCERNS | The prose does distinguish them. The **record** that a future reader would actually consult — the `**Loop exit**` row — is instructed but undefined in the template (TASK-99-002) |
| 9 | Convergence check byte-unchanged, verified by diff | PASS | 5624 bytes both sides, section-scoped diff against `origin/develop` |
| 10 | The engine exists and is what the criteria are asserted against | PASS | Every test calls `classifyDiminishingReturns` or a reader it exports; the two source-text assertions are deliberate negative properties (no fs API, no HIGH counting) and are labelled as such |
| 11 | The exit hands to 5c, not straight to Step 7 | PASS | Stated in the section with the reason; the preamble agrees |
| 12 | `npm run bundle` run and copies committed | PASS | Both copies in commit `e934cefc` |

**12/12 met**; two carry CONCERNS on the strength of the evidence rather than its absence.

---

## Breaking Changes Validation

The task declares none, and the claim is **verifiable rather than asserted**: `qa.testArtifactGlobs`
defaults to `[]`, an empty glob list matches nothing, condition 2 can therefore never be satisfied,
and a test asserts exactly that for `[]`, `undefined` and `null`. The Convergence check is
byte-unchanged. A project that pulls this change and configures nothing observes no behaviour
difference.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: Glob matching case-folds `file:` paths**

- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.99.bug.1.glob-matching-case-folds-file-paths.md](./task.99.bug.1.glob-matching-case-folds-file-paths.md)
- **Observation**: `readKeysInto` applies `.toLowerCase()` to every captured value. Three of the four
  keys are enumerations, where that is right; `file:` is a path, where it is not. Reproduced:
  `src/Components/Button/Button.spec.tsx` against glob `src/Components/**` yields
  `continue / non-test-finding`.
- **Impact**: The deliverable is inoperative for any consumer with a capital letter in their test
  paths, and says nothing. It also corrupts the report — `findings[].file` names a path that does not
  exist on disk.
- **Recommendation**: Fold only `severity`, `category`, `status`. Add a capitalised-path regression
  test and mutation-prove it.
- **Priority**: P1

### MEDIUM Severity Issues (2)

**Issue: the `**Loop exit**` row is instructed but not defined** — TASK-99-002. The new section tells
the reader to write the exit's reason into a `**Loop exit**` row of the `### QA Cycle {N}` entry; the
template for that entry, ~130 lines earlier in the same file, defines five rows and none is
`**Loop exit**`. Success criterion 8 rests on that row existing.

**Issue: the snippet's inputs have no documented source** — TASK-99-003. `$CYCLE`,
`$HIGH_SEQUENCE_JSON`, `$LATEST_GATE` and `$TEST_ARTIFACT_GLOBS_JSON` are consumed and never
resolved. Every other config-consuming step in this corpus names its source at the call site.

### LOW Severity Issues (3)

Recorded in the gate's `recommendations.future`, not filed as bugs:

1. `indentOf` reads a tab-indented line as column 0, ending the `top_issues` scan early. YAML forbids
   tab indentation, so latent.
2. `readNfrStatuses` would read a `notes:` block-scalar line beginning `status:` as an NFR status.
   Latent — no gate in the corpus does it.
3. The preamble's "two ways the loop reaches Step 7" reads awkwardly against "APPROVE or CONCERNS
   from 5c remains the only thing that opens Step 7". Both true; "reaches 5c" removes the friction.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS

Two single-pass line scanners over one gate file, plus one `RegExp` compile per configured glob per
candidate path. Gate files run to a few hundred lines and glob lists to a handful of entries, and the
check runs once per QA cycle. Its cost is invisible beside the ~19-minute CI cycle it exists to save.

### Reliability — CONCERNS

The never-throws property holds and is tested against eight malformed inputs (`undefined`, `null`,
`{}`, wrong types, a fractional cycle, a truncated `top_issues` list, a glob array of junk), and every
one returns a verdict rather than throwing — and never `exit`. Every ambiguity resolves toward
`continue`.

The CONCERNS is TASK-99-001's failure *mode*, not its existence: the feature stops working and emits
nothing. The task's own framing — an empty result is a claim about the instrument — applies to the
instrument the task shipped, and there is no counterpart here to the `scan-broken` / `empty`
distinction the observation log draws.

### Security — PASS

No security surface. The engine is pure: no filesystem access (asserted by a test that greps for
`node:fs` and the sync readers), no network, no child processes, no credential handling, no `eval`.
It parses text it is handed and returns an object. No new dependencies — the repo still declares zero
production runtime dependencies.

One thing worth naming rather than assuming: `globToRegExp` builds a `RegExp` from operator-supplied
config. The construction escapes every regex metacharacter outside the four glob tokens, so a glob
cannot smuggle in a pattern; and the inputs are a config file and a gate file, both already in the
repository, so there is no untrusted-input path here in any case.

### Maintainability — PASS

The engine follows `review-report-freshness.js` closely enough that a reader of one can read the
other, and each non-obvious property carries a comment saying which failure it exists to prevent
rather than what the line does. The gate scanner reuses the Convergence check's two indent rules
instead of re-deriving them, and says so. 32 tests grouped by defect class, mutation-proved eight
ways.

---

## Code Review

**Independence caveat applies — see Review Methodology.** This was an in-line pass by the author, not
an independent subagent. The one real finding was reached by executing the module against a probe
input, not by reading it.

**Correctness bugs (1):**

- [high/high] `shared/resources/qa-diminishing-returns.js:readKeysInto` — `.toLowerCase()` applied to
  `file:` as well as to the three enumerations → fold only the enumerations. **Promoted to gate
  `top_issues[]` as TASK-99-001** under `code_review_blocking=true`.

**Cleanups (2):**

- `shared/resources/qa-diminishing-returns.js:indentOf` — a tab-indented line reads as column 0 and
  ends the scan. Latent under YAML's own rules; a two-character fix if ever wanted.
- `shared/resources/qa-diminishing-returns.js:readNfrStatuses` — the `status:` matcher is anchored to
  leading whitespace only, so a block-scalar line beginning `status:` would be read as a field.

### Step 3c — Mutation-Proof Spot Check

**Eight mutations, one per condition, all recorded in the implementation report.** Seven went red
immediately. The eighth — replacing condition 1 with `hN !== 0`, dropping the *two consecutive* half
— **stayed green across all 31 tests then present**, because every fixture whose latest HIGH count is
zero also has a zero before it. A `2, 1, 0` case was added; it now goes red.

`mutation-proven: yes` for all eight conditions **as of the current suite**. This is the strongest
evidence in the change set, and it is also what makes TASK-99-001 pointed: mutation-proving tests
whether a test can fail when the behaviour is removed, and it cannot detect a fixture population that
never exercises the behaviour in the first place. Every path in every fixture is lowercase, so the
case-folding line is a no-op suite-wide and no mutation of it would have been visible either.

---

## Regression Testing

`shared/resources/develop-pipeline-step-5-6-qa-loop.md` is consumed by `develop-story` and
`develop-task` through their bundled copies. Both were regenerated and both are byte-consistent with
the source (`npm run bundle` re-run reports `in sync`).

- Full suite: 2936 tests, 0 failures — no regression in the protocol tests that assert the qa-loop
  document's shape (`evals/shared/tests/qa-execution-step-parity.test.mjs`,
  `evals/shared/tests/pr-review-loop-parity.test.mjs`, both green).
- `npm run format:check`: clean.
- The Convergence check is byte-identical, which is the strongest available statement that the
  sibling guard did not regress.

**Regression Assessment**: PASS

---

## Test Artifacts

### Files Reviewed

- `shared/resources/qa-diminishing-returns.js` (new)
- `shared/resources/tests/qa-diminishing-returns.test.mjs` (new)
- `shared/resources/tests/fixtures/qa-diminishing-returns/` (12 new files)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
- `docs/reference/configuration.md`
- `CHANGELOG.md`
- both `skills/*/references/` regenerated copies

### Test Commands Executed

```bash
npm run ci:fast                                              # 2936 tests, 0 fail; Prettier clean
node --test shared/resources/tests/qa-diminishing-returns.test.mjs   # 32/32
node shared/resources/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --json
npm run bundle                                               # both copies in sync
```

### Step 4b — Documented-Command Execution

The change set modifies a `shared/resources/*.md` containing fenced bash blocks, so the rule fires.

**Result: `no-executable-blocks` (information, exit 0).** 17 blocks found, **0 placeholder**, 17
correctly refused as mutating — `node`/`awk`/`command` unrecognised (fail-closed), write
redirections, `git push`, `git reset`, `mkdir`/`touch`. This is the second of the engine's two
zero-execution states: the file documents side-effecting commands because that is what the pipeline
does, and no `--bind` or `--copy` configuration would ever make them runnable. Recorded, not raised.

**The new section's own snippet was among the refusals** (`unrecognised-command: command`), so it
would have shipped unexecuted. It was therefore **run by hand** against the bundled path, and works:

```
verdict: exit | reason: diminishing-returns
detail: HIGH is 0 for cycles 2 and 3, and all 2 remaining findings are in test machinery
```

### Coverage Report

Not applicable — this repository does not collect coverage percentages (`node --test` without a
coverage reporter). Coverage is argued structurally instead: 32 tests grouped by defect class, each
group's guard mutation-proved.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-99-001** — fold only the enumerations; keep `file:` verbatim. Add a capitalised-path
   regression test and mutation-prove it by restoring the unconditional fold.
2. **TASK-99-002** — add `**Loop exit**` to the QA Cycle entry template.
3. **TASK-99-003** — state where the snippet's four variables come from, naming
   `qa.testArtifactGlobs` in `skills-config.yaml` as the source of the globs.

### Short-term Actions (Non-Blocking)

1. The three LOW items in `recommendations.future`.
2. Consider emitting `category:` from the QA skills, which would let condition 3 rest on a declared
   category rather than only on the `nfr_validation` signal.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH renders the deliverable inoperative for a class of consumers, silently, and
the new test suite is structurally unable to detect it. The two MEDIUMs leave the section instructing
a record the template does not define and a command whose inputs have no stated source. Everything
else about this change set is strong.
**Quality Score**: 50/100 — `100 - (20 × 1 HIGH) - (10 × [2 MEDIUM + 1 NFR CONCERNS])`

**Deployment Recommendation**: BLOCKED
**Conditions**: resolve TASK-99-001, -002 and -003.

---

**QA Report**: co-located at `task.99.qa.1.qa-loop-diminishing-returns-exit.md`
**Gate File**: co-located at `task.99.gate.1.qa-loop-diminishing-returns-exit.yml`
**Next Steps**: `/qa-fix` cycle 1 against the three immediate actions, then re-review.
