# QA Report: Task 101 — fail fast on a missing `fastGateCommand`

**Task**: [task.101.fast-gate-command-existence-check.md](./task.101.fast-gate-command-existence-check.md)
**Gate File**: [task.101.gate.1.fast-gate-command-existence-check.yml](./task.101.gate.1.fast-gate-command-existence-check.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-10
**Testing Completed**: 2026-09-10
**Gate Status**: CONCERNS

---

## Executive Summary

The implementation is correct and was verified by **execution rather than reading** — the precondition
was run against seven command shapes and two fixture projects in both shells, and all five success
criteria hold. One MEDIUM finding: the task's own Testing Strategy asserts a verification route that
does not exist, which execution disproves. The coverage it claimed is nonetheless present and stronger
than the claim, so this is a false statement about *how* the work is verified, not a gap in verification.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — correct the §8 claim before acceptance.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (3/3 checkboxes)
- [x] Tests passing — `npm run ci:fast` green, 3033 passing / 0 failing
- [x] Breaking changes documented (§5, behavioural and intended)
- [x] Code on feature branch with open PR — #371, state OPEN

### Testing Approach

- [x] Automated Testing (unit, integration)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review
- [ ] Performance Testing — not applicable; no measurable runtime surface
- [ ] Manual Testing — subsumed by direct execution of the deliverable

### Review Methodology

**Direct tools.** Single module, Low risk, first review (0 prior gates → `PRIOR_GATES=0`,
`REFUTE_PASS=false`, `SAFETY_REPROBE=false`). Not a re-review, so no Re-Review Context section applies.

**Deviation recorded:** the Step 3b diff code review is specified as a read-only Explore subagent. This
session's operating instructions forbid the Agent tool unless the user requested it, so the review was
performed inline over the same `origin/develop...HEAD` diff. The lens was not skipped; only the
dispatch mechanism differs. The same substitution was made at Phase 0a and Phase 1.5 of this run.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 — add the resolve check to the fast-gate subsection | PASS | Verified by execution | Present at `develop-pipeline-step-3-develop-loop.md:153`, above the Output Capture Pattern |
| Phase 2 — reword the default's presentation | PASS | Verified by sweep | Six authoring sites, not the two the plan named |
| Phase 3 — `npm run bundle`; commit regenerated `references/` | PASS | Verified | Re-ran `npm run bundle`: in sync, no drift |

**Overall Phase Completion**: 3/3 passed.

---

## Success Criteria Verification

Each criterion was **executed**, not read off the document.

| # | Criterion | Method | Result | Status |
| --- | --- | --- | --- | --- |
| 1 | A consumer with a missing `fastGateCommand` script HALTs **before** the first iteration | Ran the extracted block against a fixture project defining only `test`; separately asserted the block's index in the document precedes `### Output Capture Pattern` | `exit 1`; placement `True` | PASS |
| 2 | The HALT message names `develop.fastGateCommand` and `skills-config.yaml` | Captured stdout+stderr of the HALT run | both substrings present | PASS |
| 3 | A compound or non-npm command is left alone, not guessed at | Ran five unreadable shapes plus the empty string; ran the `npm run`-leading compound both ways | all five skip (exit 0); compound checks its first script and HALTs only when that script is missing | PASS |
| 4 | The document no longer implies `npm run ci:fast` exists everywhere | `git ls-files`, excluding bundled `references/` and historical task/bug records, grepped for `defaulting to` near `ci:fast` and for ``default `npm run ci:fast` `` | zero hits in live authoring docs | PASS |
| 5 | Both shells agree | The dedicated test runs every case under `bash` **and** `zsh` (zsh 5.9 present) | 10/10 passing, no disagreement | PASS |

---

## Breaking Changes Validation

### Breaking Change: a consumer whose `fastGateCommand` does not resolve now HALTs at startup

Documented: **Yes** (§5, and repeated in CHANGELOG.md and the PR body)
Migration Path Provided: **Yes** — set `develop.fastGateCommand` in `skills-config.yaml`; the HALT
message itself names both the key and the file, so the migration path is delivered at the point of
failure rather than only in a document.
Migration Tested: **Yes** — the fixture project defining `ci:fast` passes the same check that HALTs
the project without it, which is the migration in both directions.
Consumer Code Updated: **N/A** — this repo defines `ci:fast`, so it is unaffected; the named consumer
(tinker-city) already set the key explicitly.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: §8 Testing Strategy asserts a verification route that does not exist**

- **Severity**: MEDIUM
- **Category**: Quality (documentation accuracy)
- **Observation**: §8 states *"The snippet is runnable prose, so `qa-task` Step 4b will execute it
  under `bash` and `zsh`."* Executed:

  ```
  qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-3-develop-loop.md
    → line 158  klass: mutating  reason: "unrecognised-command: npm (fail-closed)"  skipped: true
  ```

  `npm` is deliberately absent from the engine's `SAFE_COMMANDS` allow-list — the list is an
  allow-list precisely so that anything nobody classified fails closed. Step 4b therefore cannot and
  will not execute this block, in this or any future cycle.
- **Impact**: Bounded but real. The *coverage* the claim promised exists and is stronger than the
  claim: `evals/shared/tests/fast-gate-precondition.test.mjs` executes the block in both shells,
  against controlled fixture projects, inside `npm test`. So nothing is unverified. What is wrong is
  the recorded reason to believe it is verified — a future author reading §8 would plan the next
  change around a step that will silently skip their block, which is the exact failure mode Step 4b
  itself exists to eliminate.
- **Recommendation**: Correct §8 to attribute the both-shells coverage to the dedicated test, and
  record why Step 4b cannot be the route.
- **Priority**: P2

### LOW Severity Issues (0)

None.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS

The check runs `npm run` once per pipeline run, before the loop's first iteration. Verified
structurally rather than by assertion: the block's offset in the document precedes
`### Output Capture Pattern`, which is the per-iteration block. Placing it inside that block was the
specific mistake the review's third finding pre-empted.

### Reliability — PASS

The fail-safe direction is explicit, documented in a table, and tested in both directions. Six command
shapes skip; two check. Four mutations were applied to the document and each reddened the expected
subset — notably, removing the `[ -n "$GATE_SCRIPT" ]` guard reddened **only** the skip cases (2 of
10), isolating the fail-safe inversion rather than producing an undifferentiated red.

### Security — PASS

- **Status**: PASS
- **Evidence**: `reasoned`
- **Probes executed**: 0
- No credential, network or authorization surface is touched. The one new executable construct
  interpolates `${GATE_SCRIPT}` into a `grep -E` pattern; the extracting character class
  `[A-Za-z0-9:_-]` excludes `.` and `/`, so no regex metacharacter can reach `grep`. This verdict was
  reached by reading the extraction and executing seven command shapes — not by running hostile
  candidates against it — so `reasoned` is the accurate value, not a downgrade.

### Maintainability — PASS

The doc sweep went beyond the plan's file list (six sites, found by `git ls-files | grep -v
'^skills/[^/]*/references/' | xargs grep -ln 'ci:fast'`), catalog and bundle freshness were both
re-verified, and the guard narrowing ships with a unit test asserting both directions so it cannot
widen unnoticed.

---

## Code Review

Inline adversarial pass over `origin/develop...HEAD` (see Review Methodology for why not a subagent).

**Correctness bugs (0):**

None identified. Two candidates were probed and cleared:

- `isFdRedirect` could have suppressed a real invocation. Probed seven shapes: the decisive case
  `npm run build 2>/dev/null` — a real script with stderr discarded — is still **SEEN** as `build`.
  `npm run 2fast` and `npm run ci:fast > log` are also still seen. No coverage lost.
- The `${GATE_SCRIPT}` interpolation into `grep -E` could inject a metacharacter. The extracting
  character class excludes `.` and `/`, so it cannot.

**Cleanups (0):** none worth raising. The table added to the loop document replaces what would
otherwise be prose enumeration and is the cheaper form.

**Step 4b (Execute the Documented Commands):** fired — the change set modifies
`shared/resources/*.md` files containing fenced bash blocks. Results across the four changed
prose files:

| File | Blocks | runnable / placeholder / mutating | Engine finding |
| --- | --- | --- | --- |
| `develop-pipeline-step-3-develop-loop.md` | 6 | 0 / 2 / 4 | `zero-blocks-executed` (medium) |
| `develop-pipeline-step-5-6-qa-loop.md` | — | 0 runnable | `zero-blocks-executed` (medium) |
| `skills/develop/SKILL.md` | — | 0 runnable | `zero-blocks-executed` (medium) |
| `skills/develop-next/SKILL.md` | — | 0 runnable | `zero-blocks-executed` (medium) |

**Every skipped block is accounted for**, per the step's rule that a silent skip recreates the failure
it exists to prevent. In the step-3 document: lines 51 and 59 `placeholder` (template slot); lines 158,
203, 247, 270 `mutating` — line 158 is the new precondition (`unrecognised-command: npm`), the other
three are `write-redirection` and pre-date this change.

**`zero-blocks-executed` is pre-existing, not introduced here.** Measured against the same file on
`develop`: baseline `blocks=5, {runnable:0, placeholder:2, mutating:3}` with the identical finding;
current `blocks=6, {runnable:0, placeholder:2, mutating:4}`. The change adds one skipped block and
alters neither the finding nor the runnable count. It is therefore **not** raised as a finding against
this task — but it is what disproves §8, which is raised.

Shells: `bash` and `zsh` both available; `zshAvailable: true`, no `zsh-unavailable` note.

---

## Mutation-Proof Spot Check (Step 3c)

Every invariant the new test claims was reverted in the source and the suite re-run.

| Mutation | Predicted red | Observed | `mutation-proven` |
| --- | --- | --- | --- |
| `exit 1` → `exit 0` | the HALT cases | 6 fail / 4 pass — skip cases stayed green, correctly | yes |
| `sed` pattern made unmatchable | the HALT cases | 5 fail / 5 pass | yes |
| `[ -n "$GATE_SCRIPT" ]` guard removed | the **skip** cases only | 2 fail / 8 pass | yes |
| `FAST_GATE_COMMAND="$fastGateCommand"` restored | the HALT cases | 5 fail / 5 pass | yes |
| `isFdRedirect` → `return false` | the guard's 2 tests | 2 fail / 2 pass | yes |

All five predicted red, in the predicted places, and the document was restored and re-run green after
each. **5/5 mutation-proven** — no vacuous coverage credited.

The fourth row is the one worth keeping: it re-introduces the exact defect the review caught before
implementation, and confirms the drafted snippet would have passed vacuously.

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| CI/gate parity | `ci-gate-parity.test.mjs` asserts `configuration.md` keeps `develop.fastGateCommand … npm run ci:fast` on one line, and that all three loop documents retain `<fastGateCommand>` + `develop.fastGateCommand`. The reword touched exactly those lines | PASS |
| Executable-instructions guard | Narrowed; own unit test added; whole file green | PASS |
| Bundle freshness | `npm run bundle` re-run after commit — in sync, no drift | PASS |
| Catalog freshness | `generate_catalog.py` re-run — `skill-catalog.md` unchanged (two SKILL.md bodies edited, no frontmatter) | PASS |
| Tracked-tree link check | `git worktree add --detach` at HEAD; relative links in the three changed docs resolved against the **tracked** tree, not the dirty working tree | PASS — none broken |
| Full hermetic suite | `npm run ci:fast` | PASS — 3033 passing, 0 failing |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/develop-pipeline-step-3-develop-loop.md` (the precondition)
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `skills/develop/SKILL.md`, `skills/develop-next/SKILL.md`, `docs/reference/configuration.md` (the sweep)
- `evals/shared/tests/fast-gate-precondition.test.mjs` (new)
- `tests/executable-instructions.test.js` (guard narrowing)
- the five regenerated `skills/*/references/` copies

### Test Commands Executed

```bash
npm run ci:fast                                                    # 3033 pass / 0 fail
node --test evals/shared/tests/fast-gate-precondition.test.mjs     # 10/10
node --test tests/executable-instructions.test.js                  # 4/4
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --json
python3 skills/create-skill/scripts/generate_catalog.py            # no drift
npm run bundle                                                     # in sync
git worktree add --detach /tmp/t101tracked HEAD                    # tracked-tree link check
```

### Coverage Report

Not applicable — the deliverable is documentation plus runnable prose; there is no instrumented
source module. Coverage is expressed instead as the five success criteria, each executed, and the
five mutations, each proven.

---

## Recommendations

### Immediate Actions (Blocking acceptance)

1. **[MEDIUM]** Correct §8 Testing Strategy: attribute the both-shells coverage to
   `evals/shared/tests/fast-gate-precondition.test.mjs`, and record that Step 4b cannot execute the
   block because `npm` is not on the snippet engine's allow-list.

### Short-term Actions (Non-Blocking)

1. Consider whether the snippet engine should treat a bare `npm run` — no script argument, a pure
   read of `package.json` — as runnable. That is a change to a safety allow-list and belongs in its
   own task, not here.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Zero HIGH findings; implementation verified by execution against all five success
criteria; five of five mutations proven. One MEDIUM documentation-accuracy finding in the task's own
Testing Strategy, which rule 2 of the deterministic gate rules maps to CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: Correct the §8 claim before acceptance.

---

**QA Report**: co-located at `task.101.qa.1.fast-gate-command-existence-check.md`
**Gate File**: co-located at `task.101.gate.1.fast-gate-command-existence-check.yml`
**Next Steps**: one `/qa-fix` cycle for the §8 correction, then Step 5c PR conformance review.
