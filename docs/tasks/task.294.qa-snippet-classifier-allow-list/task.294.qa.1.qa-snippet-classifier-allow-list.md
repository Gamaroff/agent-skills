# QA Report: Task 294 - QA snippet classifier allow-list

**Task**: [Link to task document](./task.294.qa-snippet-classifier-allow-list.md)
**Gate File**: [task.294.gate.1.qa-snippet-classifier-allow-list.yml](./task.294.gate.1.qa-snippet-classifier-allow-list.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Testing Completed**: 2026-11-10
**Gate Status**: PASS

---

## Executive Summary

The allow-list is the last layer of `classifyBlock`. The three task-293 residual shapes now classify `mutating`, ordinary blocks stay `runnable`, and the suite, formatting and bundle checks are green. The independent diff review found one high-severity gap (git evaluating a plain-literal config string). It reproduces, but it is identical on the base and outside this task, so it is recorded as a follow-up.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (five docs blocks become `mutating`)
- [x] Code on feature branch with open PR (#874)

### Testing Approach

- [x] Automated Testing
- [x] Performance Testing
- [x] Regression Testing
- [x] Security Review (boundary probe)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only Explore reviewer over the branch diff. Adaptive strategy override: lite mode was not set; the task is a single module, so direct tools. Diff review: code review (the diff touches `.mjs`). Step 4b ran on `shared/resources/qa-runnable-prose-detection.md`: 2 fenced blocks, 0 changed by this diff, so 0 executed on the changed side.

CI on 291d7750a4db: pending (CI is gated once, at `/finalise`).

Reviewer: dispatched about 21:28Z, returned in 80.9 s (`duration_ms` 80955).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Decide the admitted words | PASS | Verified | Decision recorded in the plan, with the revision |
| 2: Tests first | PASS | Verified | Residual table run under real bash; red on the old engine |
| 3: Implement | PASS | Verified | `allowListViolation`, called last in `classifyInternal` |
| 4: Measure and document | PASS | Verified | Docs scan 256 to 251; section 2a-iii; CHANGELOG |
| 5: Two cleanups | PASS | Verified | Helper-call reason pinned; six unrecognised commands pinned |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Three residuals classify `mutating`, each shown to write first | `task.294 every residual shape writes under real bash, was admitted before, and is refused now` | PASS |
| Control table stays `runnable` | `task.294 control blocks` and the task.293 control table (both verdicts) | PASS |
| Differential writes nothing | `residual` set added: old engine 10 writes in 5000 blocks, new engine 0; slice test green | PASS |
| Docs-scan median within +10% | base 1160 ms, new 1102 ms (5 runs each: base 1160 1127 1193 1377 1139, new 1102 1225 1085 1131 1024; load 3.0 to 3.2) | PASS |
| Differential slice under 10 s | 4406 4380 4302 4287 4325 ms, median 4380 ms (load 2.8 to 3.0) | PASS |
| `CI=true` suite green, prettier, lint | 392/392 in the file; `ci:fast` on the LAN server 8371 pass, 0 fail; prettier clean | PASS |
| `bundle:check` 0 problems | 129 skills checked, 0 problems | PASS |
| Every change mutation-proven | Six development proofs in the implementation report, plus one re-run here (below) | PASS |
| Two cleanups done, mutation-proven | `set`/`shift` and six-word tests; helper-order proof | PASS |
| `CHANGELOG.md` cites `(task 294)` | `changelog-cites.sh`: cites (task 294) | PASS |
| Newly refused docs blocks listed, 0 newly runnable | Implementation report: 5 blocks refused, 0 newly runnable | PASS |

Criteria drift: clean (reviewed-blob base, no changed criteria).

---

## Breaking Changes Validation

### Breaking Change: five documentation blocks classify `mutating`
Documented: Yes
Migration Path Provided: Yes (rewrite to literals, or accept they no longer run; a refused block is never executed)
Migration Tested: Yes (docs scan, 256 to 251)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)
None in the gate. See CR-1 below: reproduced, pre-existing, routed to `recommendations.future`.

### MEDIUM Severity Issues (0)
### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance: PASS
Docs-scan and differential-slice timings are in the criteria table.

### Reliability: PASS
Fail-closed on any word the lists cannot classify. One linear sweep.

### Security: PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 31
- `isRunnableBlock` run through `security-probe.mjs --sink shell-exec`: executed 31, reproduced 0, escaped 0. The run record is `task.294.qa.1.qa-snippet-classifier-allow-list.security.run.json`. `boundary: true` (the classifier is an accept-or-reject predicate). `boundary_signals: ["refused"]`.

### Maintainability: PASS
Closed lists in constants; one tokenization; docs and CHANGELOG updated; generated copies current.

---

## Code Review

Anchors: both findings `ok` under `finding-anchors.js`.

**Correctness bugs (2):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:3617` — CR-1: a plain-literal env prefix or `git -c` value that git itself executes classifies `runnable` and writes under bash. → refuse `GIT_*` env prefixes and `git -c` / `--config-env`, or give git a subcommand and option allow-list.
- [medium/medium] `shared/resources/qa-execute-snippets.mjs:3352` — CR-2: `git` sits in `NON_EVALUATING_COMMANDS`, so its operands skip the plain-text check. → same remedy as CR-1.

**Reproduction and provenance (5b, 5d).** Run in a scratch repository under real bash, each with a control:

| Block | Classified | Marker written |
| --- | --- | --- |
| `git -c core.fsmonitor='touch M' status` | runnable | yes |
| `GIT_TRACE=$PWD/M git log -1` | runnable | yes |
| `GIT_EXTERNAL_DIFF='touch M' git diff --ext-diff HEAD~1` | runnable | no (history had no diff to run it on) |
| `git log -1` (control) | runnable | no |
| `echo hi` (control) | runnable | no |

The same script against `origin/develop` gave the identical verdicts and the identical writes, so both findings are `pre-existing`. They are not in the task's scope: the task closes the word-shape residuals from QA report 9 and its non-goals do not include per-command evaluation inside git. A literal word such as `core.fsmonitor='touch M'` is a provable literal by this task's own bar. Corpus scan: the docs hold no hostile shape, but `git -c core.quotePath=false diff` appears in shipped blocks, so a blanket `git -c` refusal has a real cost and needs a measurement first. Severity and confidence are kept as the reviewer returned them. Both go to `recommendations.future`, not `top_issues[]`.

**Cleanups (0).**

mutation-proven: allow-list call in `classifyInternal` replaced by `null` → 7 committed tests red (`arithmetic expansion is arithmetic, not an invocation`, `BUG-6/verify: a glued arithmetic evaluation is not an invocation`, `task.292 control (T292-QA-2): plain arithmetic stays runnable`, `task.292 differential slice`, `task.293 safe blocks near the class stay runnable…`, `task.294 every residual shape writes under real bash…`, `task.294 each refusal is held on an input where it alone decides`) → covered. Restored; `cmp` against the snapshot printed nothing, and the file then passed 392/392. The other five proofs are development-time (in the implementation report) and are not re-run here, so this report claims one re-proven and five `dev-only`.

The five `dev-only` proofs, copied from the implementation report's Decisions Log (reverted behaviour → red test), are:

- `$((` name check removed → 4 tests red.
- `[[` arithmetic-operand check removed → 2 tests red.
- `=` command-word check removed → 3 tests red.
- Helper rule and start-up rule swapped in order → the Phase 5 helper-call test red.
- `mapfile` added to the command table → the six-word unrecognised-command test red.

**Documentation blocks newly refused** (docs scan, 256 runnable before, 251 now, 0 newly runnable). The scan reports each file and line with `runnable` before and `mutating` now; it does not print the reason, which the classifier gives per block as `not-allow-listed: <class>`:

| File | Line |
| --- | --- |
| `docs/tasks/task.148.structural-move-before-prose-patch/task.148.bug.1.population-misses-hand-authored-references.md` | 17 |
| `docs/tasks/task.185.review-pr-eval-suite/task.185.plan.review-pr-eval-suite.md` | 28 |
| `docs/tasks/task.193.scripts-reach-only-skills-that-run-them/task.193.plan.scripts-reach-only-skills-that-run-them.md` | 45 |
| `docs/tasks/task.36.setup-consumer-statusmap-fix/task.36.plan.setup-consumer-statusmap-fix.md` | 34 |
| `docs/tasks/task.92.shellcheck-ci-lane/task.92.plan.shellcheck-ci-lane.md` | 47 |

---

## Regression Testing

Whole `qa-execute-snippets` suite: 392 pass, 0 fail. `bundle:check`: 0 problems. Step 4b on the changed doc: nothing changed on the block side.

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-execute-snippets.mjs`, its test file, `scripts/qa-snippets-differential.mjs`, `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/qa-execute-snippets.test.mjs     # 392 pass, 0 fail
./node_modules/.bin/prettier --check <three changed .mjs files>                      # clean
npm run -s bundle:check                                                              # 0 problems
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --repo-root "$PWD" --record <run.json> --json   # executed 31
command node scripts/qa-snippets-docscan.mjs                                         # 5 runs, base and new
```

Standards-named validation: `npm run validate -- skills/<changed-skill>/` was not run. The diff changes no `SKILL.md`, only generated `references/` copies and shared sources, so the per-skill validator has nothing new to read. Recorded as not run, with that reason.

### Coverage Report
Not measured (no coverage tool configured for this module).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. File a task: give `git` a subcommand and option allow-list and refuse `GIT_*` env prefixes (CR-1, CR-2). Measure the cost on the docs corpus first.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every success criterion is evidenced. The one high review finding is pre-existing and out of scope.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.294.qa.1.qa-snippet-classifier-allow-list.md`
**Gate File**: co-located at `task.294.gate.1.qa-snippet-classifier-allow-list.yml`
**Next Steps**: review-pr exit gate (Step 5c), then finalise.
