# QA Report: Task 186 - Eval harness hardening and task.185 leftovers

**Task**: [Link to task document](./task.186.eval-harness-hardening-and-leftovers.md)
**Gate File**: [task.186.gate.1.eval-harness-hardening-and-leftovers.yml](./task.186.gate.1.eval-harness-hardening-and-leftovers.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-06
**Testing Completed**: 2026-10-06
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered as planned, `npm run ci` and the live `eval:review-pr:cli` run are
green, and every fix's guarding test was re-run as a mutation proof against the committed head. The
independent diff review found one medium defect inside A4's own fix — `repeat.mjs` counts
`liveAssertions` under replay, so a live-only scenario still scores a vacuous pass — and one low
portability defect in A5's jq probe.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 and CR-3 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Implementation Plan and Progress Tracking all `[x]`)
- [x] Tests passing
- [x] Breaking changes documented (exit-code defaults, `refusal` field)
- [x] Code on feature branch with open PR (#576, OPEN)

### Testing Approach

- [x] Automated Testing (unit, integration, e2e)
- [x] Regression Testing
- [x] Security Review (probe engine)
- [x] Code Review (independent Explore subagent)

### Review Methodology

First review (no prior gate). Direct tools plus one independent read-only Explore reviewer for
Step 3b (dispatched 05:40:04 UTC, `duration_ms` 240100). The reviewer did not write the code; the
QA engineer did (this pipeline implemented Step 3 inline), so the reviewer is the only independent
reader in this cycle. Traceability mapper not dispatched: the Success Criteria are a checklist, not
a table. Bundled `references/` copies were excluded from the review patch because
`npm run bundle:check` holds them byte-identical to their sources, which were reviewed.

Step 4b: ran `qa-execute-snippets.mjs` over the six changed SKILL.md files. All six numbering blocks
are refused fail-closed (`unrecognised-command: source, next_numbered`), so Step 4b executed none
of them: `review-pr`, `review-task` and `finalise` report `zero-blocks-executed` (their placeholder
blocks are pre-existing and outside this change); `qa-planning`, `review-bug` and `review-epic`
report `no-executable-blocks`. The numbering blocks are executed instead by
`shared/resources/tests/next-numbered.test.mjs`, which runs each skill's own call line under bash
and zsh (12 runs) and asserts `.4.` after `.1.` and `.3.`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Runner and repeat verdicts (A1–A6) | CONCERNS | Verified | A4's floor is driver-blind (CR-1); A5's probe breaks jq-less unit tests (CR-3) |
| Phase 2: Fake gh residue (B) | PASS | Verified | 33-form boundary probe, 0 mismatches |
| Phase 3: Inline comments read with GET (C) | PASS | Verified | Only REST read with `-f` in the tree; test pins `-X GET` |
| Phase 4: One next-number rule (D) | PASS | Verified | Probe engine: engages, 30/30 |

**Overall Phase Completion**: 4/4 delivered; 1 phase with open findings

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Hung setup → `repeat.mjs` exit 3 | 3 | 3 (`repeat.test.mjs` A1) | PASS |
| Unknown assertion fn → `repeat.mjs` exit 2 before any run; runner non-verdict before driver | 2 / 1 | 2 / 1, no sandbox | PASS |
| Opt-in codes outside 0–5, README matches | 64–113 | 73/74/75, README asserted | PASS |
| `refusal` on every refused entry; `gh version issue close 5` refused; `--version pr view` not a version | yes | yes (probe set) | PASS |
| `pr-inline-comment.js` never sends `-f` without `-X GET` | yes | yes (test) | PASS |
| Six call sites give `.4.` after `.1.` and `.3.` under bash and zsh | yes | yes (12 runs) | PASS |

**Code Quality:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `npm test`, `eval:all`, `bundle:check`, `lint:shell` | pass | `npm run ci` exit 0 (5395 pass) | PASS |
| `npm run validate -- skills/<skill>/` per changed SKILL.md | pass | 6/6 ok | PASS |

**Migration:** CHANGELOG `[Unreleased]` › Fixed cites task.186 (4 entries); README states the codes
and the `refusal` field — PASS.

---

## Breaking Changes Validation

### Breaking Change: repeat.mjs opt-in exit codes
Documented: Yes · Migration Path Provided: Yes (none needed — the runner honours 3–125) ·
Consumer Code Updated: Yes (no consumer outside `evals/shared`; population probe) · PASS

### Breaking Change: fake gh `refusal` field
Documented: Yes · Additive; scenario assertions match `"refused":true` by substring · PASS

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: A4's no-assertions floor is driver-blind (CR-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `repeat.mjs` sums `assertions` and `liveAssertions` whatever the driver; the
  runner runs `liveAssertions` only when the driver is not `replay`. Reproduced: a scenario with
  `assertions: []` and one failing `liveAssertion`, under `DRIVER=replay`, prints
  `0/0 assertions passed`, `run 1/1: pass`, exit 0. `repeat.test.mjs` asserts that case passes.
- **Impact**: the class A4 exists to close — a run that judged nothing scored as a pass — stays open
  for live-only scenarios under replay.
- **Recommendation**: count the assertions the resolved driver will run; expect exit 2 in the test.
- **Priority**: P1

### LOW Severity Issues (1)

**CR-3** — `installFakeGh` throws without `jq`, and every `fake-gh.test.mjs` test installs it, so a
host without `jq` errors the whole suite and the existing `skip: !hasJq` guard cannot fire.
Confirmed: with an empty `PATH`, `installFakeGh` throws `evalSkip: true`. CI has `jq`, so CI is
unaffected.

**Total Issues (gate)**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
No hot path changed. The jq probe is one `spawnSync` per sandbox install.

### Reliability — CONCERNS
CR-1 (above). CR-6 (advisory): a never-settling setup exits 1 without removing its sandbox.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 30 (copied from `task.186.qa.1.security.run.json` `totals.executed`)
- `next_numbered` was probed through `shell:.claude/state/t186-nn-probe.sh`, a script printing its
  highest member, with the `filename` corpus held to the function's own contract: the corpus's
  `eleven-digit-run` expectation encodes `qa-cycle.sh`'s ≤9-digit rule, while `next_numbered`
  documents ≤18 significant digits as a number (task.185 QA-1), so that one expectation was
  corrected and a 19-digit overflow case added. Verdict `engages`, 30/30, no escapes. The stock
  corpus run, before the correction, was 26/28, the two misses being that case under each shell.
- The fake `gh` classifier (an allow-list) was probed with 33 argv forms — every task.185 form named
  in `qa.5`–`qa.8` plus version, `-R`, glued-flag, field-gap and prototype-key forms — 0 mismatches.

### Maintainability — PASS
One dispatch table, one numbering helper, a derived call-site population.

---

## Code Review

Independent reviewer; `code_review_blocking=true` (pipeline override). Reviewed 22 files, 1676 lines.

**Correctness bugs (6):**
- [medium/high] `evals/shared/repeat.mjs:119` — the no-assertions floor counts `liveAssertions` under replay; a live-only scenario passes 0/0 → count per driver. **Promoted: CR-1.**
- [medium/medium] `shared/resources/tests/next-numbered.test.mjs:196` — the population is the set of skills already calling `next_numbered`, so a skill that numbers with no rule cannot fail it; `skills/review-story/SKILL.md` numbers `story.{epic}.{story}.review.{n}.` with none → build the population from report-name templates. Advisory (medium confidence); `recommendations.future`.
- [low/high] `evals/shared/lib/fake-gh.mjs:126` — the jq probe errors every fake-gh unit test on a jq-less host → gate those tests on `hasJq`. **Promoted: CR-3.**
- [low/medium] `evals/shared/lib/fake-gh.mjs:315` — `refusal: "write"` also covers an `api` GET refused for an off-list flag, so it cannot tell a write from an unmodelled read. Advisory. (The task specified the api allow-list refusal as `write`; the README states it.)
- [low/medium] `shared/resources/newest-numbered.sh:50` — an unsubstituted `{placeholder}` in `-name` matches nothing and prints 1 → refuse it. Advisory.
- [low/medium] `evals/shared/runner.mjs:185` — a never-settling run leaves its sandbox → `beforeExit` cleanup. Advisory.

**Cleanups (1):**
- `skills/review-epic/SKILL.md:542` — new placeholders (`{epic-directory}`, `{epic-number}`) differ from the section's `[N]` spelling; likewise review-task's `{task-directory}` vs `[task-directory]`.

**Provenance (5b):** CR-1 and CR-3 are new to this change — `repeat.mjs` had no floor and
`fake-gh.mjs` no jq probe on `origin/develop` (`git show origin/develop:evals/shared/lib/fake-gh.mjs | grep -c 'jq", \["--version'` → 0).

**Boundary record:** `boundary: true` for `next_numbered` (probed, above) and the fake `gh`
classifier (33-form probe set). `assertionListProblems` — `boundary: false`: it validates
repository-authored `scenario.json`, refusing as a usage check, not a trust boundary.

**Mutation proofs (re-run against committed head `f3c54e7`, working tree restored, `git status` unchanged):**
- mutation-proven: drop `process.exitCode = 1` → runner-setup and repeat "never settles" → covered
- mutation-proven: drop the runner's assertion-list `die` → "unknown assertion fn is refused" → covered
- mutation-proven: disable repeat's unknown-fn usage → "unknown assertion fn is a usage error" → covered
- mutation-proven: disable repeat's `judged === 0` → "no assertions is a usage error" → covered
- mutation-proven: `FAIL_EXIT = 5` → "opt-in exit codes" → covered
- mutation-proven: drop the `evalSkip` branch / the jq probe → "missing jq" → covered (×2)
- mutation-proven: drop the `why` in claude-cli → "killed by its timeout" → covered
- mutation-proven: drop `refusal` (write / not-a-served-read) → "carries refusal" → covered (×2)
- mutation-proven: `--version` on any argv → "one-element argv" → covered
- mutation-proven: re-add `-R`/`--repo` to `API_READ_FLAGS` → "api with -R" → covered
- mutation-proven: disable the missing-field check → "fixture lacks" → covered
- mutation-proven: `table[k]` without `hasOwn` → "prototype keys" → covered
- mutation-proven: `max+1` per member (count) → next_numbered "a gap" → covered
- mutation-proven: drop `10#` → "leading zero" → covered
- mutation-proven: drop the overflow guard → "past 18" → covered
- mutation-proven: drop the dir/kind guard → "missing directory" → covered
- mutation-proven: `sed -n …p` → `sed …` (keep non-members) → "dated report" → covered
- mutation-proven: remove review-epic's call → "population" → covered
- mutation-proven: widen review-bug's `-name` → "review-bug's own call line" → covered
- mutation-proven: restore finalise's count prose → "finalise no longer numbers by counting" → covered
- Phase 3: red before the fix, green after (test added before `-X GET`) → covered
- The unhandled-test log floor is a test-strength change with no behaviour to revert → not-run

---

## Regression Testing

| Area | Result |
| --- | --- |
| `eval:all` (43 replay scenarios) | PASS |
| Live `eval:review-pr:cli --runs 1` (4 scenarios) | PASS 4/4 |
| `review-pr` skill suite (Step 7 prose) | PASS |
| Full `npm run ci` | PASS (exit 0) |
| PR CI (#576) | test, validate, link-check, shellcheck — pass |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci                                   # exit 0, 5395 pass, 0 fail
EVAL_RUNS=1 env -u ANTHROPIC_API_KEY npm run eval:review-pr:cli   # 4/4
command node --test evals/shared/tests/{runner-setup,repeat,fake-gh}.test.mjs \
  shared/resources/tests/{pr-inline-comment,next-numbered}.test.mjs skills/review-pr/tests/review-pr.test.js  # 392/392
npm run validate -- skills/<skill>/          # 6 skills ok
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename \
  --entry shell:.claude/state/t186-nn-probe.sh --cases-file .claude/state/t186-nn-cases.json \
  --record docs/tasks/task.186.eval-harness-hardening-and-leftovers/task.186.qa.1.security.run.json --json   # engages 30/30
DRIVER=replay node evals/shared/repeat.mjs <live-only scenario> --runs 1 --min-pass 1   # CR-1 repro: pass, exit 0
```

### Coverage Report
Not instrumented (the repository has no coverage tool); every changed behaviour has a named,
mutation-proven test.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — driver-aware assertion floor in `repeat.mjs`; fix the test that asserts the vacuous pass.
2. CR-3 — gate the jq-dependent fake-gh and A5 tests on `jq`.

### Short-term Actions (Non-Blocking)
1. CR-2 — numbering population from report-name templates; `review-story` (follow-up task).
2. CR-4, CR-5, CR-6, CR-7 — as listed in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium finding (CR-1) inside A4's own fix; no high findings; NFR reliability CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-3 fixed

---

**QA Report**: co-located at `task.186.qa.1.eval-harness-hardening-and-leftovers.md`
**Gate File**: co-located at `task.186.gate.1.eval-harness-hardening-and-leftovers.yml`
**Next Steps**: `/qa-fix` for CR-1 and CR-3, then QA cycle 2 (refute pass).
