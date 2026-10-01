# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.1.ci-docs-only-tree-equivalence.yml](./task.172.gate.1.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: FAIL

---

## Executive Summary

The engine, the four call sites, the config documentation and the two extracted helpers are in place and
well tested: 51 new tests, 14 mutation proofs, and every other CI stage green. The independent diff review
found two HIGH bypasses of the engine's central property (exit 0 only when the delta is documentation) and
one MEDIUM recording gap. QA reproduced both HIGH findings.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4)
- [x] Tests passing (one file-time budget caveat, below)
- [x] Breaking changes documented (behaviour change, opt-out stated)
- [x] Code on feature branch with open PR 543

### Testing Approach

- [x] Automated Testing (unit, CLI against real git, Bitbucket, poll heredoc)
- [x] Regression Testing
- [x] Security Review (boundary probe attempted; see NFR)
- [x] Code Review (independent subagent, plus QA reproduction)

### Review Methodology

First review, direct tools plus one read-only Explore subagent for the diff review. The independence of the
review holds: the subagent did not write the code. The patch given to it excluded generated bundled copies
(byte-identical to `shared/resources`, enforced by `bundle:check`) and the work-item directory.

Step 4b: runnable prose is present. `skills/finalise/SKILL.md`: 36 blocks, 0 runnable, 2 placeholder, 34
mutating; the harness finding `zero-blocks-executed` applies. `skills/develop-next/SKILL.md` (14) and
`skills/develop-batch/SKILL.md` (11): `no-executable-blocks`. Because the harness cannot run the new blocks,
QA ran them by hand: the three PENDING/NONE arms were extracted, syntax-checked with `bash -n` and `zsh -n`,
and executed under both shells against a fake engine returning exit 0 and exit 1 (SUCCESS plus a 12-character
sha on 0, unchanged on 1). The 6c poll heredoc and its reader are run by committed tests.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: glob-match primitive | PASS | 71/71 QA suites unedited | matcher moved verbatim |
| Phase 2: the engine | CONCERNS | 51 tests green | CR-1, CR-2 |
| Phase 3: migrate the four sites | CONCERNS | wiring tests green | CR-3 |
| Phase 4: config, docs, repository | PASS | docs and config tests green | |

**Overall Phase Completion**: 2/4 clean, 2/4 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Two markdown commits over a green ancestor give `SUCCESS (tree-equivalent to <sha12>)` at all four sites | yes | yes (tests, snippets, poll run) | PASS |
| A FAILURE head is never tree-equivalent | never | never | PASS |
| A code path in the delta returns code-changed | always | always, except CR-1 | FAIL |
| A Bitbucket 403 is unverifiable | yes | yes | PASS |
| `enabled: false` restores today's behaviour | yes | yes | PASS |
| An all-skipped ancestor is not green | never | green (CR-2) | FAIL |

---

## Breaking Changes Validation

### Breaking Change: on-by-default docs-only rule

Documented: Yes. Migration path provided: Yes (`ci.docsOnly.enabled: false`, narrow `patterns`, set
`checkCommand`). CHANGELOG names it in its first line.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (2)

**CR-1: config read from the head being judged**
- **Bug Report**: [task.172.bug.1.config-read-from-head-tree.md](./task.172.bug.1.config-read-from-head-tree.md)
- **Observation**: a commit that edits code and widens `ci.docsOnly.patterns` returns tree-equivalent, exit 0. Reproduced by QA.
- **Recommendation**: any change to `skills-config.yaml` in the delta is code-changed.

**CR-2: all-skipped ancestor reads green**
- **Bug Report**: [task.172.bug.2.all-skipped-ancestor-reads-green.md](./task.172.bug.2.all-skipped-ancestor-reads-green.md)
- **Observation**: `reduceChecks` returns SUCCESS for an ancestor whose only checks were skipped. Reviewer confidence was medium; QA reproduced it, so it is recorded at high.
- **Recommendation**: all-skipped or all-neutral is NONE.

### MEDIUM Severity Issues (1)

**CR-3: Step 7 canonical comment drops the tree-equivalent record**
- **Bug Report**: [task.172.bug.3.step7-comment-drops-tree-equivalent.md](./task.172.bug.3.step7-comment-drops-tree-equivalent.md)
- **Recommendation**: add the reading 2 suffix; extend the publish-boundary test.

### LOW Severity Issues (2)

- CR-4: a changed path containing a backslash or leading whitespace is normalised by the matcher and can match `docs/**`. Low: needs a hostile file name in the PR.
- CR-5 (cleanup): `--pr` is parsed and documented but never read.

**Total Issues**: HIGH: 2, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
Reads are bounded at 20 ancestors; the walk stops on the first code path.

### Reliability — PASS
Every failure path exits 1 or 2, and 14 mutation proofs go red.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: reasoned
- **Probes executed**: 0
- The engine is a boundary, so `security-probe.mjs` was run on its path predicate (`filename` sink, 14 cases; record `task.172.qa.1.ci-docs-only-tree-equivalence.security.run.json`). The verdict is `unverifiable`: no corpus sink models a docs-membership predicate, so its legitimate controls are rejected as not-docs by design. No hostile name was accepted. The hostile inputs that matter were enumerated by hand, and CR-1 and CR-2 were found this way. Evidence stays `reasoned`.

### Maintainability — PASS
One definition of the rule; the matcher and Bitbucket helper are shared, not copied.

---

## Code Review

Advisory unless opted in; `code_review_blocking=true` was passed by the pipeline, so `category: bug` findings of high confidence enter the gate.

**Correctness bugs (4):**
- [high/high] `shared/resources/ci-tree-equivalence.js:436` — config read from the head being judged (CR-1) → treat a config change in the delta as code-changed. In gate.
- [high/high after reproduction] `shared/resources/ci-tree-equivalence.js:194` — all-skipped ancestor reads green (CR-2) → NONE. In gate.
- [medium/high] `skills/finalise/SKILL.md:1775` — Step 7 comment drops the tree-equivalent record (CR-3). In gate.
- [low/medium] `shared/resources/ci-tree-equivalence.js:139` — path normalisation (CR-4). Advisory.

**Cleanups (1):**
- `shared/resources/ci-tree-equivalence.js:388` — `--pr` is never read (CR-5) → drop it or echo it in the record.

Provenance: every finding is new to this change (the files did not exist on the base).
No mutation proofs were run this cycle, because no fix was made this cycle.

---

## Regression Testing

- Affected suites under the other platform value: `TMPDIR=/tmp node --test` over 7 files, 208/208 pass.
- `npm run ci:fast`: 4833/4836 pass. The two failing files (`bundle-missing-source`, `test-clean-checkout`) pass every assertion and trip only their 10 s file-time budget; both do so on pristine `develop` at this host's load (measured 11.6 to 13.9 s there).
- `eval:all`, `validate:all`, `check:generated`, `bundle:check`, `lint:shell`: pass.

---

## Test Artifacts

### Files Reviewed
`shared/resources/ci-tree-equivalence.js`, `glob-match.js`, `bb-auth.js`, the three SKILL.md call sites, `docs/reference/configuration.md`, `skills-config.yaml`.

### Test Commands Executed
```bash
npm run validate -- skills/finalise/   # also develop-next, develop-batch: pass
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --json
TMPDIR=/tmp node --test <7 affected suites>
node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'shared/resources/glob-match.js#matchesAnyGlob' --args-json '[["docs/**"]]'
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR-1 and CR-2 in the engine, each with a test that is red on revert.
2. Fix CR-3 in `skills/finalise/SKILL.md` and extend `finalise-publish-boundary.test.mjs`.

### Short-term Actions (Non-Blocking)
1. CR-4: match git paths verbatim.
2. CR-5: drop or echo `--pr`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced bypasses of the property the engine exists to hold.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.172.qa.1.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.1.ci-docs-only-tree-equivalence.yml`
**Next Steps**: qa-fix cycle 1
