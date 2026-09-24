# QA Report: Task 143 - qa-next: `uat-status.mjs` owns the run state file (cycle 6)

**Task**: [task.143](./task.143.qa-next-state-file-owned-by-the-tool.md)
**Gate File**: [task.143.gate.6.qa-next-state-file-owned-by-the-tool.yml](./task.143.gate.6.qa-next-state-file-owned-by-the-tool.yml)
**Previous**: [task.143.qa.5.qa-next-state-file-owned-by-the-tool.md](./task.143.qa.5.qa-next-state-file-owned-by-the-tool.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-24
**Gate Status**: CONCERNS

This is the first cycle of a re-entered loop: 2 extra cycles were granted after the loop-limit halt, giving a budget of 7.

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-143-BUG-5: the `executed` resume ignored a file that an interrupted Step 4 wrote | **FIXED as specified** | The resume map now reuses `runs/<item>/<local start date>-<envLabel>.md` when it exists. The rule it adds causes TASK-143-BUG-6 |

## New Findings This Cycle

- **[medium]** `skills/qa-next/SKILL.md:88`: the reuse rule treats the existence of a file with the expected name as proof that this run wrote it. v0.51.0 set `phase: executed` *before* Step 4.1 wrote anything, so a run cut off in between has no file of its own. An earlier same-day run of the same item under the same env label will match the name. The resume then records that file as `runFile`. `priorRuns` drops the earlier run and loses its `unverifiable` flag, and Step 4 overwrites the earlier run's record (CR-1, **reproduced**; see bug 6). The date half is CR-2: v0.51.0 used the date of the Step 4 write, not the start date. → TASK-143-BUG-6
- **[low]** `evals/qa-next/unit/uat-status.test.mjs:2654`: the assertion "`--run-path` would hand out another name" compares against a fixture with the fixed date `2026-09-24`, while `--run-path` uses the UTC `today()`. The assertion exercises the collision only on 2026-09-24 (CR-3, low/high). → TASK-143-QA6-1

**Pattern, for the escalation reader.** This is the sixth consecutive finding in the v0.51.0 legacy-migration path. Each fix has added a more specific ownership rule for a file that v0.51.0 never recorded as its own. Each rule has matched a state it was not written for. Bug 6's recommendation is the first that does not add another such rule: stop asserting exactness where the evidence cannot support it.

## Review Methodology

Direct tools plus one read-only Explore subagent. The reviewer returned in about 2 minutes, and `waiting_on` was set and cleared. `SAFETY_REPROBE=false`: the prior security axis reads `CONCERNS measured`, so clause 1 does not fire, and clauses 2 and 3 do not apply to a prose resume rule.

Re-review scope: since 2026-09-24T05:46:30Z (default). That is 4 reviewable files (`CHANGELOG.md`, `skills/qa-next/SKILL.md`, `skills/qa-next/scripts/uat-status.mjs`, `evals/qa-next/unit/uat-status.test.mjs`), covered by the branch diff over those paths. The cycle-5 commit `386e586d` was named as the focus.

Step 4b: `no-executable-blocks`. There are 9 bash blocks in `skills/qa-next/SKILL.md`, all refused as mutating (write-redirection ×6, unparseable ×2, `node` ×1); both bash and zsh ran. This is unchanged from cycle 5.

Platform variance: `TMPDIR=/tmp` passes 62/62. Timezone sweep: 62/62 under `Pacific/Kiritimati` (+14), `Pacific/Pago_Pago` (−11) and `UTC`.

## Implementation Verification

Phases 1–4 remain complete. The cycle-5 change is one resume-map sentence, a `stateView` comment, a CHANGELOG sentence and one test (61 → 62).

## Issues Found

**MEDIUM (1)**: [task.143.bug.6.legacy-own-file-guess-overwrites-earlier-run.md](./task.143.bug.6.legacy-own-file-guess-overwrites-earlier-run.md).
**LOW (1)**: TASK-143-QA6-1 (date-dependent collision assertion). No separate bug file.
**Total**: HIGH 0, MEDIUM 1, LOW 1.

Provenance: bug 6 is attributable to this branch. The resume map does not exist on `origin/develop`, and the instruction was added in `386e586d`.

## NFR Assessment

- **Performance: PASS.** No network calls; 62 tests.
- **Reliability: CONCERNS.** TASK-143-BUG-6.
- **Security: CONCERNS.**
  - **Status**: CONCERNS
  - **Evidence**: measured
  - **Probes executed**: 19 (`task.143.qa.6.security.run.json`; env cases: traversal, separators, absolute path, `-NN`, two-digit, empty, whitespace, control characters, and four legitimate labels)
  - Verdict `present-but-inert`. The five reproduced labels are space-only, LF, CR, TAB and ESC. Each exits 0 identically on `origin/develop`, so they are pre-existing and routed to `recommendations.future`. There were no over-blocked legitimate labels.
- **Maintainability: PASS.** One advisory cleanup (CR-4).

## Code Review

**Correctness bugs (3):**

- [medium/medium] `skills/qa-next/SKILL.md:88`: an existing `<local start date>-<env>.md` is reached by two states, this run's interrupted Step 4 or an earlier same-day run. In the second case Step 4 overwrites it and `priorRuns` drops the earlier run without a flag. → Accept only a file shown to be this run's; otherwise use `--run-path`. **Reproduced by QA** (before: `priorRuns: []`, `unverifiable: ["priorRuns"]`; after following the map: `priorRuns: []`, no flag; `--run-path` would have given `-02` and the exact list) → promoted as **TASK-143-BUG-6**
- [medium/medium] `skills/qa-next/SKILL.md:88`: the file name is guessed from the start date, but v0.51.0 used the date of the Step 4 write. A miss plus `--run-path` clears the `unverifiable` flag on a wrong answer. → Folded into **TASK-143-BUG-6** (same mechanism)
- [low/high] `evals/qa-next/unit/uat-status.test.mjs:2654`: the collision assertion depends on the date. → **TASK-143-QA6-1** (`code_review_blocking`)

**Cleanups (1):**

- `skills/qa-next/SKILL.md:88`: the resume map does local-date arithmetic by hand, but `localDate()` already exists (`uat-status.mjs:1331`). → Expose the lookup through the tool. Routed to `future`.

`boundary: true`; `probes_executed: 19`.

mutation-proven: SKILL.md resume map reverted to its pre-`386e586d` text → no test went red (62/62, `check:generated` green) → no-red-untested. The reuse decision lives only in prose, and the cycle-5 test holds the tool behaviour it relies on, not the decision.

## Regression Testing

The qa-next suite passes 62/62 (plus the TMPDIR and timezone variants). `check:generated` is green. No other skill consumes `uat-status.mjs`.

## Test Artifacts

### Test Commands Executed

```bash
command node --test evals/qa-next/unit/uat-status.test.mjs
TMPDIR=/tmp command node --test evals/qa-next/unit/uat-status.test.mjs
TZ=Pacific/Kiritimati command node --test evals/qa-next/unit/uat-status.test.mjs   # and Pacific/Pago_Pago, UTC
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-next/SKILL.md --json
command node skills/qa-task/references/security-probe.mjs --sink path --entry cli:skills/qa-next/scripts/uat-status.mjs --argv '["--root","<fixture>","--run-path","D.1","--env","{input}"]' --cases-file <env-cases.json> --record task.143.qa.6.security.run.json --name "uat-status --env" --json
```

The bug-6 reproduction was a scratch copy of the suite with one added test. It was run and then deleted; `git status` matches the start of the cycle.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL (TASK-143-BUG-6)
