# QA Report: Task 185 - review-pr eval suite

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Gate File**: [task.185.gate.1.review-pr-eval-suite.yml](./task.185.gate.1.review-pr-eval-suite.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: FAIL

---

## Executive Summary

The task delivers everything it planned. The report number is computed. The harness gained an opt-in
setup hook, a fake `gh` and a repeat runner. Four scenarios pass in replay and 20/20 live runs. One
high-confidence bug blocks the gate: the repeat runner counts a **skipped** run as a pass, so the
pass rate it reports can be green when no agent ran. Two low findings ride with it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (23/23 boxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#574)

### Testing Approach

- [x] Automated Testing (unit, replay, live)
- [x] Performance Testing (eval:all wall time; live run time)
- [x] Regression Testing (eval:all, npm test)
- [x] Security Review (probe + hostile-name run)
- [x] Code Review (Step 3b)

### Review Methodology

Direct tools plus one read-only code-review subagent (Step 3b, full branch diff, first review).
Reviewer dispatched 2026-10-05T15:57:03Z; completion notice `duration_ms` 124777 (125 s).
Step 4b ran: the diff changes `skills/review-pr/SKILL.md`, which holds fenced bash.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: deterministic report number | PASS | Verified | 15 tests, bash + zsh; count + 1 mutant → 6 red |
| Phase 2: harness extensions | CONCERNS | Verified | TASK-185-CR-1 in `repeat.mjs` |
| Phase 3: the four scenarios | PASS | Verified | replay 4/4; live N=5 20/20 |
| Phase 4: wiring and docs | PASS | Verified | scripts, READMEs, reference.md, tech-stack.md, CHANGELOG |

**Overall Phase Completion**: 4/4 delivered; 1 with a blocking finding.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `next-report-number.sh` gives 4 for `.1.`+`.3.`, bash and zsh | 4 | 4, both shells | PASS |
| `npm run eval:review-pr` in replay | 4/4 | 4/4 | PASS |
| Live N=5: 02, 03 at 5/5; 01, 04 at ≥ 4/5 | as stated | 5/5 each, all four | PASS — but the tool that measured it has CR-1; these runs were real (logs show `[claude-cli]` runs of 92–177 s, not skips) |
| No live run logs a refused or unhandled `gh` call | 0 | 0 in 20 runs | PASS |
| Live scenario inside default timeout | ≤ 300 s | 92–177 s | PASS |
| `eval:all` growth | < 10 s | +2.8–3.2 s | PASS |
| `npm test` | pass | 5339, 0 fail | PASS |
| `quick_validate`, `lint:shell`, `bundle:check` | pass | pass | PASS |
| CHANGELOG, shared README, existing scenarios unchanged | yes | yes (39 prior scenarios still pass) | PASS |

---

## Breaking Changes Validation

None declared, none found. Every harness change is keyed on a new `scenario.json` field; the 39
existing `eval:all` scenarios pass unchanged.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: repeat.mjs counts a skipped run as a pass (TASK-185-CR-1)**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.185.bug.1.repeat-counts-skips-as-passes.md](./task.185.bug.1.repeat-counts-skips-as-passes.md)
- **Observation**: with no `claude` on PATH, `repeat.mjs … --runs 2 --min-pass 2` prints `passed 2/2`, exit 0.
- **Impact**: the live pass rate, the only layer that judges the skill, can be green with no agent run.
- **Recommendation**: a skip must not count as a pass; see the bug report.
- **Priority**: P1

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **TASK-185-QA-2** — `live.minPass` above `--runs` is a usage error, so `EVAL_RUNS=3 npm run eval:review-pr:cli` cannot run 02 or 03 (minPass 5).
- **TASK-185-QA-1** — `next-report-number.sh` overflows on an `{n}` ≥ 2^63 (prints `-9223372036854775808`, exit 0) instead of refusing.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
`eval:all` 4.77 s → 7.59 / 7.92 s, inside the 10 s bound. Live runs 92–177 s.

### Reliability — CONCERNS
TASK-185-CR-1: the pass-rate tool can report a skip as a pass.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 28 (copied from the run record `task.185.qa.1.security.run.json` `totals.executed`)
- The `filename` sink ran against `next-report-number.sh` with verdict `absent`. Its corpus models
  `.gate.{N}.` cycle selection: every legitimate case is a gate file this script must ignore. So the
  verdict measures a contract the script does not have, and the evidence is recorded as `reasoned`,
  not `measured`. The real contract was tested ad hoc under bash and zsh with hostile `.pr-review.`
  names (command substitution, newline, `;rm`, leading dash). No command ran and no `PWNED` file was
  created. The fake `gh` refuses every write. In a built sandbox, a real `gh` with the setup env
  reports "You are not logged into any GitHub hosts".
- **Boundary decision**: `boundary: internal` for `next-report-number.sh`. Its only input is a
  directory of `.pr-review.` reports that this pipeline writes, and no corpus sink's legitimate
  cases are inputs it is meant to accept. `fake-gh.mjs`'s write refusal is test-harness code. Its
  refusals are held by `fake-gh.test.mjs`, eight write shapes each logged `refused`, and a
  fake-accepts-`comment` mutant turns that test red.

### Maintainability — PASS
Each addition is opt-in, documented in `evals/shared/README.md`, tested, and mutation-proven.

---

## Code Review

Code-review blocking is on (`code_review_blocking=true` from the pipeline). Only `bug` + `confidence: high` enters the gate.

**Correctness bugs (4):**
- [high/high] `evals/shared/repeat.mjs:76` — a skipped runner exit 0 counts as a pass → give a skip its own status and count it as not passed. **Promoted to gate as TASK-185-CR-1.** Reproduced.
- [medium/medium] `evals/shared/assertions.mjs:60` — `noFileMatching` passes on a missing directory, so 03's only "no file" assertion has no non-vacuity floor → assert `docs/` exists in 03. Advisory (the task specified "missing dir passes" for the assertion itself; the floor belongs in the scenario).
- [medium/medium] `skills/review-pr/SKILL.md:633` — the obs #272 fix covers one site; `review-task/SKILL.md:2130`, `review-epic/SKILL.md:535` and `qa-planning/SKILL.md:649` still use count-style prose for their artifact numbers. Verified by `grep -rn 'starts at 1 and increments' skills/*/SKILL.md`. Advisory and out of scope (task §4 keeps the script review-pr's); recorded as a follow-up.
- [low/medium] `evals/shared/repeat.mjs:63` — `--min-pass 0` is accepted, so the threshold can never fail → reject below 1.

**Cleanups (1):**
- `evals/shared/lib/fake-gh.mjs:158` — `pick()` drops a `--json` field the fixture lacks instead of reporting the gap as `unhandled`.

**Step 4b (runnable prose):** `qa-execute-snippets.mjs --file skills/review-pr/SKILL.md` found 17
blocks: 16 `mutating`, 1 placeholder (line 466, `unbound-variable: DOC_FILE`), so the first run
reported `zero-blocks-executed`. Re-run with `--bind DOC_FILE=… --copy-as docs:docs`, the line-466 block
was runnable and ran under bash and zsh with 0 findings. The new Step 7 block (line 635) is refused as
`mutating` (`bash` is fail-closed). `review-pr.test.js` executes that exact line under bash and zsh
with the slot substituted (15 tests).

**Standards-named validation:** `npm run validate -- skills/review-pr/` → `✓ review-pr`.

**Mutation proofs (this cycle):** first review, so no fix from this cycle to prove. The development
proofs are on committed tests:
- mutation-proven: next-report-number count + 1 → review-pr.test.js gap/`.9.`+`.10.` cases → covered
- mutation-proven: fake gh accepts `pr comment` → fake-gh.test.mjs "every write is refused" → covered
- mutation-proven: liveAssertions under replay → runner-setup.test.mjs → covered
- mutation-proven: PATH appended not prefixed → runner-setup.test.mjs → covered
- mutation-proven: no empty call log at install → fake-gh.test.mjs → covered
- mutation-proven: git-sandbox cleanup deletes a caller-owned dir → git-sandbox.test.mjs → covered
- mutation-proven: noFileMatching not recursive → assertions.test.mjs → covered
- mutation-proven: Step 7 reverted to prose (live, scenario 02) → no red, 3/3 still wrote `.4.` → absorbed (the model applies highest + 1 unaided; the unit tests hold the script)

**Platform variance:** none of the new tests passes an environment-derived path to a validating
consumer. The zsh cases are gated on zsh being present (`SHELLS`). Nothing to re-run under another
`TMPDIR`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `eval:all` (39 prior scenarios + 4 new) | PASS |
| `npm run ci:fast` (format + 5339 tests) | PASS |
| Changed suites with `.agents/skills` symlink moved aside | PASS (845 tests, 4/4 replay) |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast
npm run eval:all
npm run eval:review-pr
env -u ANTHROPIC_API_KEY DRIVER=claude-cli node evals/shared/repeat.mjs evals/review-pr/scenarios/<s> --runs 5
npm run validate -- skills/review-pr/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-pr/SKILL.md --bind DOC_FILE=… --copy-as docs:docs --json
node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'shell:skills/review-pr/scripts/next-report-number.sh' --record …qa.1.security.run.json --json
```

### Coverage Report

Not measured (no coverage tooling in this repository).

---

## Recommendations

### Immediate Actions (Blocking)

1. Fix TASK-185-CR-1: a skipped live run must not count as a pass.

### Short-term Actions (Non-Blocking)

1. TASK-185-QA-2: cap a `live.minPass` taken from the scenario at `--runs`.
2. TASK-185-QA-1: refuse an `{n}` longer than 18 digits.
3. CR-2: assert `docs/` exists in 03-unanchored. CR-4: reject `--min-pass 0`. CR-5: report a missing `--json` fixture field as unhandled.
4. CR-3: follow-up task for the other skills' count-style artifact numbers.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence correctness bug in the pass-rate tool (rule 1).
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.185.qa.1.review-pr-eval-suite.md`
**Gate File**: co-located at `task.185.gate.1.review-pr-eval-suite.yml`
**Next Steps**: `/qa-fix` for TASK-185-CR-1 and the two lows; re-review in cycle 2.
