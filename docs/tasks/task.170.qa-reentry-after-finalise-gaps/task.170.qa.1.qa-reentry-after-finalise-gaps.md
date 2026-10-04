# QA Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Gate File**: [task.170.gate.1.qa-reentry-after-finalise-gaps.yml](./task.170.gate.1.qa-reentry-after-finalise-gaps.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #563 at `b0e2bf10`. The re-entry writer, its suite, the contract case, the Stop-hook
case and the parity test all hold, and every success criterion is met. Two medium findings stop a
PASS: the DoD lookup is directory-wide, so a co-located bug's DoD can be read as the task's verdict
(reproduced), and the script's one untrusted input — the gate's `head:` — has no hostile cases in the
committed suite.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (12/12 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none — one optional lock field)
- [x] Code on feature branch with open PR (#563, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (shell suites, node parity tests)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (boundary probe — see NFR)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only Explore code reviewer (Step 3b) and the traceability mapper
(pre-step). First review — whole-branch diff (`origin/develop...HEAD`), with the 4 generated
`skills/*/references/` copies excluded (regenerated from `shared/resources/` by `npm run bundle`;
`bundle:check` green). Code reviewer: 187582 ms (`duration_ms` from its completion notice).
`code_review_blocking=true` (pipeline override). Step 4b ran over the 7 changed runnable-prose files.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: The re-entry writer | CONCERNS | Verified (25/25) | CR-1 (DoD lookup), QA-1 (hostile heads unpinned) |
| Phase 2: Contract and step docs | PASS | Verified | Bullet inside the `who-restores` marker; single-statement test green |
| Phase 3: Guards | PASS | Verified | Stop-hook case 2/2, parity 3/3, CHANGELOG entry present |

**Overall Phase Completion**: 3/3 phases delivered; 1 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| GAPS halt + code change → step 5 / 5a | accept test | "committed code fix" passes | PASS |
| GAPS halt + doc-only change refused | refuse test | `no-code-moved` | PASS |
| Uncommitted / untracked change counts as moved | accept cases | both pass | PASS |
| Other-document / `halt_step` ≠ 7 refused | refusal tests | `no-snapshot`, `not-a-finalise-halt` | PASS |
| `qa_reentry` with gate head | accept test | recorded, head asserted | PASS |
| Stop hook names `/qa-task` | on-stop case 12 | 2/2 | PASS |
| Contract list ≡ script refusals | parity test | 3/3 | PASS |
| Atomic write, no temp file on failure | failure-path test | passes | PASS |
| ShellCheck / Prettier / `npm test` (symlinks aside) | clean | clean; one LOAD-SENSITIVE timing test re-run alone green | PASS |
| `bundle:check` | green | 129 skills, 0 problems | PASS |
| Each refusal mutation-proven | recorded | 12 dev mutations; QA spot-checked 3 (below) | PASS |
| CHANGELOG `[Unreleased]` | entry | present | PASS |
| No consumer migration | optional field | Stop hook tolerates it | PASS |

---

## Breaking Changes Validation

None declared; the lock gains one optional field, `qa_reentry`, which no reader branches on. **PASS.**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: DoD lookup reads a co-located bug's DoD (CR-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.170.bug.1.dod-lookup-reads-colocated-bug-dod.md](./task.170.bug.1.dod-lookup-reads-colocated-bug-dod.md)
- **Observation**: `-name '*.dod.*.md'` is directory-wide; `task.42.bug.3.dod.2` outranked `task.42.dod.1` and the script refused `dod-not-gaps` (reproduced in a throwaway repo).
- **Impact**: the re-entry is refused and the run resumes at 7 over an ungated head.
- **Recommendation**: stem-keyed lookup as finalise does; a suite case with a co-located bug DoD.
- **Priority**: P2

**Issue: Hostile gate `head:` values unpinned (QA-1)**
- **Severity**: MEDIUM
- **Category**: Security / Quality
- **Bug Report**: [task.170.bug.2.hostile-gate-head-unprobed.md](./task.170.bug.2.hostile-gate-head-unprobed.md)
- **Observation**: eight hostile heads executed by hand were all safe; none is in the committed suite.
- **Impact**: a later edit to the head predicate can regress with no test going red.
- **Recommendation**: a table-driven hostile-head case group.
- **Priority**: P2

### LOW Severity Issues (1)

- **CR-3** — `develop-pipeline-pause.md`'s `qa_phase` row and `set-qa-phase.sh:9` still name one writer; `grant-qa-cycles.sh` and the new script also write it.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
A handful of git calls and one jq write, once per resume.

### Reliability — CONCERNS
CR-1 can send a code fix back to an ungated `/finalise`. Failure-path behaviour otherwise sound: a
failed write keeps the restored step-7 lock; refusals consume nothing.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: true` — the script refuses and fails closed by its own header. `security-probe.mjs
  --sink filename --entry 'shell:shared/resources/reenter-qa-after-finalise.sh'` executed 28 cases,
  but the `filename` corpus encodes `qa-cycle.sh`'s stdout contract (`12\n`), which this script does
  not have, so the `absent` verdict is a contract mismatch, not evidence; `--sink path` returned
  `entry-not-probeable`. QA executed eight hostile `head:` values by hand in throwaway repos —
  `$(touch PWNED)`, backticks, `--all`, `-n`, `HEAD~0`, a 40-hex non-commit, `x; touch PWNED3`, a
  quoted substitution: no `PWNED*` file appeared and every one was treated as moved (step 5). Not an
  engine count, so the evidence is `reasoned`; QA-1 asks for the cases to be committed.

### Maintainability — PASS
Same shape as `grant-qa-cycles.sh`; refusal list pinned by parity; CR-3 is documentation drift.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `shared/resources/reenter-qa-after-finalise.sh:107` — directory-wide DoD lookup reads a co-located bug DoD → stem-keyed lookup + test. **Promoted to gate (CR-1).**
- [low/medium] `shared/resources/reenter-qa-after-finalise.sh:128` — the untracked/uncommitted halves do not exclude `.claude/state`; where `.claude/` is not gitignored the consumed snapshot always counts as movement, so `no-code-moved` cannot fire (fails toward re-review) → add `":(exclude).claude/state"`. Advisory (medium confidence) — `recommendations.future` (CR-2).
- [low/high] `shared/resources/develop-pipeline-pause.md:113` — `qa_phase` writers under-listed → list all three. **Promoted to gate (CR-3).**

**Cleanups (0).**

Boundary probe: `boundary: true`, engine `probes_executed: 0` usable (see Security). Provenance
(5b): CR-1 and CR-2 are in lines this branch adds — new, not pre-existing; CR-3's under-listing
pre-dates the branch for `grant-qa-cycles.sh` and is extended by it.

Mutation spot-check (QA, snapshot/restore, tree clean after):

mutation-proven: `no-code-moved` guard → `true` → "document-only fix …" went red → covered
mutation-proven: `dod-not-gaps` guard → `true` → "newest DoD file accepted …" went red → covered
mutation-proven: `.current_step = 5` → `7` → "committed code fix …", "uncommitted code fix …" went red → covered

Step 4b (runnable prose): 7 files. `develop-pipeline-resume-contract.md` 2 runnable / 8 placeholder /
21 mutating, no finding; `step-5-6-qa-loop.md` 1/1/19, no finding; `pause.md` no blocks;
`step-7-finalise.md` and `finalise/SKILL.md` `zero-blocks-executed` (all placeholder/mutating —
under-configured, pre-existing shape); `develop-task/SKILL.md` and `develop-story/SKILL.md` line 48/51
(`cat .agents/skills/…/SKILL.md`) failed unseeded and passed with
`--copy-as skills/develop-task:.agents/skills/develop-task` — a harness-seeding result, not a prose
defect. The new `bash …/reenter-qa-after-finalise.sh` blocks are classified mutating (`bash` is
fail-closed), as every script invocation is. Shells: bash, zsh.

---

## Regression Testing

- `develop-pipeline-on-stop.test.sh` 49/49; `who-restores-single-statement`, `qa-loop-lock-fields-parity`, `reenter-qa-refusals-parity` 15/15.
- `npm run validate` — develop-task, develop-story, finalise ✓.
- `advance-pipeline-lock.sh` untouched (still monotonic).

---

## Test Artifacts

### Files Reviewed
`shared/resources/reenter-qa-after-finalise.sh`, its `.test.sh`, `develop-pipeline-resume-contract.md`, `develop-pipeline-step-7-finalise.md`, `develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-pause.md`, `develop-pipeline-on-stop.test.sh`, `evals/shared/tests/reenter-qa-refusals-parity.test.mjs`, `skills/develop-{task,story}/SKILL.md`, `skills/finalise/SKILL.md`, `package.json`, `CHANGELOG.md`.

### Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh
bash shared/resources/develop-pipeline-on-stop.test.sh
command node --test shared/resources/tests/who-restores-single-statement.test.mjs evals/shared/tests/qa-loop-lock-fields-parity.test.mjs evals/shared/tests/reenter-qa-refusals-parity.test.mjs
npm run -s validate -- skills/develop-task/   # and develop-story, finalise
shellcheck --severity=warning shared/resources/reenter-qa-after-finalise.sh shared/resources/reenter-qa-after-finalise.test.sh shared/resources/develop-pipeline-on-stop.test.sh
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'shell:shared/resources/reenter-qa-after-finalise.sh' --repo-root "$(pwd)" --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed doc> --json
```

### Coverage Report
Not measured — shell scripts; behaviour coverage per the traceability matrix (`.summaries/qa-traceability-matrix.md`): 9 full, 2 integration, 2 partial (SC11 claim-only, SC13 Stop hook only).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — stem-keyed DoD lookup + co-located-bug-DoD test.
2. QA-1 — hostile-head case group in the suite.

### Short-term Actions (Non-Blocking)
1. CR-3 — list all three `qa_phase` writers.
2. CR-2 — exclude `.claude/state` from the movement measure (here and in qa-task Phase 0).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two open medium findings (one functional, reproduced; one test-coverage) and one low.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and QA-1 fixed

---

**QA Report**: co-located at `task.170.qa.1.qa-reentry-after-finalise-gaps.md`
**Gate File**: co-located at `task.170.gate.1.qa-reentry-after-finalise-gaps.yml`
**Next Steps**: `/qa-fix` (5b), then a cycle-2 refute review.
