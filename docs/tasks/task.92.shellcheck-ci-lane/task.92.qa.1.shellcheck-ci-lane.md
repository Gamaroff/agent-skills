# QA Report: Task 92 — Add a shellcheck CI lane for the repo's shell scripts

**Task**: [task.92.shellcheck-ci-lane.md](./task.92.shellcheck-ci-lane.md)
**Gate File**: [task.92.gate.1.shellcheck-ci-lane.yml](./task.92.gate.1.shellcheck-ci-lane.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-05
**PR**: [#322](https://github.com/Gamaroff/agent-skills/pull/322)
**Gate Status**: CONCERNS

---

## Executive Summary

All 11 success criteria are met, and — unusually for a CI task — the central one is verified in the
real environment rather than by proxy: **the new `shellcheck` job ran on PR #322 and passed**, as did
all four other jobs including `test`, which runs `npm run eval:all`. The three mutation proofs are
real, were re-executed during this review, and one of them was deliberately sited outside
`validate.yml`'s path filter so that it exercises the finding that reshaped the task rather than
routing around it.

Two MEDIUM findings, both in code this task **introduced** rather than in the tree it inherited. The
more interesting one is a guard that does not guard: the empty-list check added to
`tracker-access.test.sh` reports a failure and then continues into the exact `sed` hang its own
comment claims to prevent. It is unreachable in practice, which is why the suite is green — and it is
the same shape as the defect `task.90` is this repo's precedent for.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (v1.1, post-`/review-task`)
- [x] All 4 implementation phases completed and checked
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#322, OPEN)

### Testing Approach

- [x] Automated testing (7 shell suites + full `npm run ci:fast` + real CI)
- [x] Regression testing
- [x] Code review (Step 3b)
- [x] Mutation-proof spot check (Step 3c)

### Review Methodology

Direct tools. First review — no prior gate. The change set is large by file count (155) but the
reviewable surface is 18 files, the other 137 being generated output isolated in a single commit; the
task is well-bounded and every claim in it is mechanically checkable, so direct verification beat
fanning out. Every assertion below was re-executed during this review rather than read from the
implementation report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 — Choose the gate and the wiring | PASS | Verified | `--severity=warning`; own unfiltered workflow; ShellCheck pinned to v0.11.0 and printed. Decision and reasoning recorded in the task, not just the commit. |
| Phase 2 — Triage and annotate | CONCERNS | Verified | 26 → 0 findings. 11 fixed for real, 15 annotated. The SC2010 fix introduced TASK-92-001. |
| Phase 3 — Add the lane and prove it fires | PASS | Verified | Three mutation proofs re-run during this review; all reproduce. Plus a real CI run. |
| Phase 4 — Documentation | PASS | Verified | All four pinned targets updated, including the stale `tech-stack.md` paragraph. |

**Overall Phase Completion**: 4/4 phases complete; 1 with a finding.

---

## Success Criteria Verification

### Functional

| # | Criterion | Target | Actual | Status |
| --- | --- | --- | --- | --- |
| 1 | Lane runs on every tracked source script, no path filter | no filter | `on: pull_request` + `push: [main, develop]`, no `paths:` key — YAML parsed and confirmed | PASS |
| 2 | Lints 56 files, not 247 | 56 | 56 (`mapfile` logic re-run under bash) | PASS |
| 3 | Green on the tree as it stands | green | **`shellcheck` job COMPLETED/SUCCESS on PR #322**; local container run exit 0, 0 findings | PASS |
| 4 | Observed failing on a deliberate finding, evidence recorded | observed | 3 proofs, re-run during review — see below | PASS |
| 5 | Version pinned or printed | either | **both** — pinned `v0.11.0`, `shellcheck --version` printed | PASS |

**Criterion 4 — the proofs, re-executed during this review:**

| Proof | Expected | Observed |
| --- | --- | --- |
| Deliberate SC2034 in `scripts/setup-consumer.sh` | non-zero | exit 1, naming `scripts/setup-consumer.sh line 1906`. Reverted → exit 0 |
| Sources-only `grep` dropped (widened glob) | non-zero | exit 1 — `File list includes bundled copies (247 files, expected ~56)` |
| Empty file list | non-zero | exit 1 |

The choice of `scripts/setup-consumer.sh` for proof 1 is the part worth crediting. It is one of the
three source scripts outside `validate.yml`'s path filter, so the proof demonstrates the lane firing
in exactly the region the task's original design would have left uncovered. A proof sited in
`shared/resources/` would have passed while showing nothing about that.

### Code Quality

| # | Criterion | Target | Actual | Status |
| --- | --- | --- | --- | --- |
| 6 | Every `# shellcheck disable` carries a stated reason | all | 12 of 15 new ones do inline; 8 carry theirs in a block comment directly above; **3 pre-existing ones carry none** | CONCERNS |
| 7 | The single SC2010 is fixed or explicitly justified | either | Fixed (`ls \| grep` → glob loop), but the fix introduced TASK-92-001 | CONCERNS |
| 8 | `npm run ci` still green; no change to local gate duration | green | **CI `test` job COMPLETED/SUCCESS** — that job runs `format:check`, `npm test` and `eval:all`, i.e. the composite. Locally only `ci:fast` was run (exit 0). No npm script added to `ci`, so local duration is unchanged and `ci-gate-parity.test.mjs` stays green | PASS |

> Criterion 8 deserves a note because the implementation only ran `ci:fast` locally, and `ci` =
> `ci:fast && eval:all`. That gap is closed by evidence rather than assumption: CI's `test` job ran
> the whole composite on this head and passed. Had that job still been pending, this criterion would
> read CONCERNS, not PASS.

### Migration

| # | Criterion | Actual | Status |
| --- | --- | --- | --- |
| 9 | CHANGELOG states gate level + that new findings fail CI | `### Changed` entry names `--severity=warning`, the pin, the 11/15 split, and the consequence | PASS |
| 10 | Local invocation documented, container form included | Both forms, in **both** copies of the pre-PR list (`CONTRIBUTING.md`, `coding-standards.md`) | PASS |
| 11 | Sources-only rule documented where the glob lives | 10-line comment directly above the `mapfile`, carrying the 81-vs-725 reasoning | PASS |

---

## Breaking Changes Validation

### Breaking Change: New warning-tier findings now fail CI

- Documented: **Yes** — task §5 and the CHANGELOG `### Changed` entry
- Migration path provided: **Yes** — local invocation in two forms, and the lane's own failure message
  tells the reader to run it locally and how to annotate a genuine false positive
- Migration tested: **Yes** — the deliberate-regression proof is the migration path exercised
- Consumer code updated: **N/A** — this is a library repo; the lane governs this repo only

**Overall**: PASS

---

## Issues Found

### MEDIUM Severity (2)

**TASK-92-001 — the empty-list guard does not guard**

- **Severity**: MEDIUM · **Category**: Correctness · **Confidence**: high
- **Location**: `shared/resources/tracker-access.test.sh:1496-1499`
- **Observation**: the guard added by this task reads

  ```bash
  if [ ${#READER_SOURCES[@]} -eq 0 ]; then
    bad "reader-key guard" "no production resolvers found beside $HERE"
    return 1 2>/dev/null || true
  fi
  ```

  Section 44 sits inside a top-level `if [ -d "$HERE" ]` block, **not inside a function**. `return` at
  the top level of a script executed as `bash file.sh` is illegal; the `2>/dev/null` hides the error
  message and the `|| true` discards the non-zero status, so control **falls through** to the
  `sed … "${READER_SOURCES[@]}"` on the next line. With an empty array that sed receives no file
  operands and reads STDIN — the hang the guard's own comment says it prevents.
- **Verified by**: minimal repro — a top-level `if` block with the identical construct executes the
  statement after it and exits 0.
- **Impact**: low in practice (the directory always contains sibling `.sh` files, so the branch is
  unreachable and the suite is correctly green) but the code is wrong and, worse, **its comment
  asserts that it works**. This is the shape `task.90` is this repo's precedent for: a guard that
  reports success for something that did not happen.
- **Recommendation**: drop the `return` and make the `sed` conditional —
  `if [ ${#READER_SOURCES[@]} -eq 0 ]; then bad …; else READER_CALLS=$(sed …); fi`. Then
  mutation-prove it: force the array empty, confirm the suite reports the failure and does not hang.
- **Priority**: P2

**TASK-92-002 — three bare suppressions survive a change whose own criterion forbids them**

- **Severity**: MEDIUM · **Category**: Quality
- **Location**: `shared/resources/jira-sprint-lib.sh:133` (SC2034), `:328` and `:365` (SC2064)
- **Observation**: criterion 6 says "Every `# shellcheck disable` carries a stated reason. No bare
  suppressions." It is written about the repo, not about newly added disables. These three pre-date
  the task and carry no reason.
- **Impact**: the lane is what makes this rule enforceable, and the change that introduces the rule
  leaves three counter-examples inside it. That is the weakest possible precedent, and the §10
  "suppressions accumulate into a lane that checks nothing" risk begins exactly here.
- **Recommendation**: annotate all three, **or** amend criterion 6 to scope it to newly added disables
  and state why these are out of scope. Either is defensible; leaving it ambiguous is not.
- **Priority**: P2

### LOW Severity (1)

- **8 of the new SC2034 disables state their reason in a three-line block comment above the
  directives rather than inline** (`manage-sprint-state.sh:48-54`, `move-sprint-issues.sh:52-58`).
  The block is accurate and explains why each assignment needs its own directive, which is genuinely
  useful — but anyone auditing with `grep '# shellcheck disable'` sees eight bare lines. Consider a
  short inline tag on each in addition to the block.

**Total**: HIGH 0, MEDIUM 2, LOW 1.

---

## NFR Assessment

### Performance — PASS

Separate ~15s job, so no wall-clock added to `test.yml`. No npm script joined `ci`/`ci:fast`, so the
local gate is unchanged — which is also what keeps `ci-gate-parity.test.mjs` green, a constraint the
implementation correctly treated as decisive rather than incidental.

### Reliability — PASS

The gate is proven to fail three ways and proven to pass on the clean tree. Pinning to v0.11.0 removes
the single most likely cause of an unattended red lane. The count assertion and the empty-list check
in the **workflow** are both correct (`exit 1` is legal in a workflow `run:` block — the defective
guard is in the test script, not here).

### Security — PASS

No security surface touched. The pinned tarball is fetched over HTTPS from the official release
(URL verified, HTTP 200). The workflow declares no `permissions:` block and requires none.

### Maintainability — CONCERNS

Driven by both findings: a guard whose comment overstates it, and three unexplained suppressions in
the change that forbids them. Everything else in the change is unusually well documented — the
sources-only comment at the glob, and the workflow header explaining why it is not a step in
`validate.yml`, both answer the question a future maintainer will actually ask.

---

## Code Review

**Correctness bugs (1):**

- [medium/high] `shared/resources/tracker-access.test.sh:1496` — top-level `return` swallowed by
  `2>/dev/null || true`; execution falls through into the guarded `sed` → TASK-92-001.

**Cleanups (1):**

- `skills/jira-sprint-manager/scripts/{manage-sprint-state,move-sprint-issues}.sh` — reasons live
  above the directives rather than on them; a grep-based audit reads them as bare.

**Verified sound (checked, no finding):**

- `JSM_DEFER_*` is annotated at the **writing** sites (the two sprint scripts), not at
  `jira-sprint-lib.sh`, which reads them. The task's original triage had this backwards; the
  implementation followed the corrected version, and the clean shellcheck run is the proof — an
  annotation in the library would have silenced nothing and left 8 findings.
- `export` was correctly **not** used for `BB_CURL_AUTH`. It is a bash array and bash cannot export
  arrays; the disable with a reason is the honest form.
- The three deleted variables (`EPIC`, `TASK_ID`, `VALID_TYPES_RE`) are genuinely unreferenced —
  confirmed by grep across the tree. `VALID_TYPES_RE` had additionally drifted from the inline regex
  it duplicated (`\b` versus `([[:space:]]|$)`), so deleting the stale copy rather than wiring it up
  was the correct call; wiring it up would have been the behaviour change §4 puts out of scope.
- SC2211 was correctly reclassified as a **real defect** rather than a false positive: the backticks
  sat inside a double-quoted string and were being executed. Both messages now read as intended.
- The count assertion threshold (`>= 200`) sits well clear of both 56 and 247, and the separate
  empty-list check means a `grep` that matches nothing fails rather than passing vacuously.

### Mutation-Proof Spot Check (Step 3c)

| Behaviour | Reverted? | Result | Verdict |
| --- | --- | --- | --- |
| Lane fails on a new warning-tier finding | yes | exit 1, correct file named | **mutation-proven: yes** |
| Lane rejects a widened (bundled-inclusive) glob | yes | exit 1 at 247 files | **mutation-proven: yes** |
| Lane rejects an empty file list | yes | exit 1 | **mutation-proven: yes** |
| `tracker-access.test.sh` empty-list guard | yes | **falls through** | **mutation-proven: NO — this is TASK-92-001** |

Three of four proven. The fourth is the finding: proving it is exactly what exposed it, and it is
recorded as not covered rather than assumed good.

---

## Regression Testing

| Area | Result |
| --- | --- |
| 7 shell test suites | PASS — all green |
| `npm run ci:fast` (format + full hermetic suite) | PASS — exit 0 |
| `npm run eval:all` | PASS — via CI `test` job |
| `validate.yml` bundle-freshness check | PASS — 137 copies regenerated and committed |
| `ci-gate-parity.test.mjs` | PASS — no npm script added to `ci` |
| `docs-link-check` | PASS |
| Branch policy | PASS |

**Real CI on PR #322: 5/5 jobs green** — `shellcheck`, `test`, `validate`, `link-check`, branch policy.

---

## Test Artifacts

### Test Commands Executed

```bash
# the lane's own gate, over the sources-only list
docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable \
  --severity=warning $(git ls-files '*.sh' | grep -v '^skills/[^/]*/references/')   # exit 0

# mutation proofs (all reverted afterwards)
#   1. deliberate SC2034 appended to scripts/setup-consumer.sh   -> exit 1
#   2. sources-only grep dropped (247 files)                     -> exit 1
#   3. empty file list                                           -> exit 1

npm run ci:fast                                                   # exit 0
gh pr view 322 --json statusCheckRollup                           # 5/5 SUCCESS
```

### Coverage Report

Not applicable — the deliverable is a CI workflow plus comment-only annotations. Coverage is expressed
as the mutation proofs above.

---

## Recommendations

### Immediate (blocking)

1. **TASK-92-001** — fix the vacuous empty-list guard in `tracker-access.test.sh` so it actually skips
   the `sed`, and mutation-prove the fix.
2. **TASK-92-002** — annotate the three pre-existing bare disables, or scope criterion 6 explicitly.

### Short-term (non-blocking)

1. Add a short inline reason to the 8 block-annotated SC2034 directives.
2. Consider an `info`-tier lane later; §4 already scopes it out of this task.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: every success criterion is met and the central ones are verified in real CI rather than
by proxy. Two MEDIUM findings sit in code this task introduced, and one of them is a guard that
reports a failure and then continues — small in blast radius, but exactly the class of defect this
task exists to make visible.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL — merge after TASK-92-001 and TASK-92-002 are addressed.

---

**Next Steps**: `/qa-fix` for the two MEDIUM findings, then QA cycle 2.
