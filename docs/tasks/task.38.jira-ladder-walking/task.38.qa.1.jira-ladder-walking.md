---
id: task.38.qa.1
title: "QA Report: Task 38 — Jira ladder walking"
type: qa-report
description: "First QA review of task.38. Three high-confidence correctness bugs found in the primary feature path, each verified by execution. Gate FAIL."
tags: [qa, task.38, jira, tracker-workflow]
task-ref: task.38.jira-ladder-walking.md
created: 2026-08-05
updated: 2026-08-05
---

# QA Report: Task 38 — Jira: walk the status ladder

**Task**: [task.38.jira-ladder-walking.md](./task.38.jira-ladder-walking.md)
**Gate File**: [task.38.gate.1.jira-ladder-walking.yml](./task.38.gate.1.jira-ladder-walking.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-05
**PR**: [#194](https://github.com/Gamaroff/agent-skills/pull/194)
**Gate Status**: **FAIL**

---

## Executive Summary

The implementation is complete against all five phases and the whole suite is green — 870/870. The
design is sound, the comments are unusually good, and two defects in the task's own plan were caught
and corrected during development rather than shipped.

It nonetheless fails, on the strength of an adversarial diff review that found **three
high-confidence correctness bugs in the primary feature path**, each reproduced by executing the
shipped code. The green suite is not evidence against them: every new test calls `walkLadder` and the
helpers *directly*, and two of the three bugs live in `jira-stage.run()`'s branch ordering and in
`resolveMomentSpec`'s fallback — paths no test exercises end to end.

One of them (CR-3) fires a real **Done** transition on a board whose author explicitly disabled that
moment. That is the same class of unrecoverable wrong move the task was written to prevent, arriving
through a different door.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Phase 5 partial — one fixture blocked externally, disclosed)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#194, OPEN)

### Review Methodology

Direct tools + one read-only Explore subagent for the diff code review (Step 3b). Task is 5 phases
across one module family (`shared/resources/`), which the Adaptive Review Strategy puts below the
parallel-agent threshold. `code_review_blocking=true` supplied by the pipeline, and no
`code_review_blocking:` in the task frontmatter → **CR_BLOCKING = true**, so high-confidence bug
findings gate the build.

**Every finding below was independently re-verified by executing the shipped library**, not accepted
from the subagent's report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Last-rung terminal restriction | PASS | Verified | `isLastRung` additive, computed against the issue type's ladder. Overlay coverage both lengthening and shortening. |
| Phase 2: `walkLadder` | **CONCERNS** | Partial | Walking, re-fetch, guards and `1+2n` all correct and asserted. **CR-1** (cycle guard) and **CR-5** (lost diagnostics) found here. |
| Phase 3: `jira-stage.js` wiring | **FAIL** | Partial | `--print-plan` / `--from` / honest `--dry-run` all correct. **CR-2** (branch ordering) and **CR-3/CR-4** (precedence + disablement) found here. |
| Phase 4: MCP fallback prose | PASS | Verified | One-hop rule, terminal override, `--from` requirement all stated; parity test binds the literals. |
| Phase 5: Tests | PASS* | Verified | 24 new tests, all pre-existing fixture assertions unchanged. *One fixture blocked externally and honestly disclosed; substitution covers the same property. |

**Overall Phase Completion**: 3/5 clean, 2 with issues.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Intermediate rung walked through | yes | yes | PASS |
| Blocked hop reports `walk-incomplete` + `landed`/`remaining`, exit 0 | yes | shape correct, **not surfaced** | **FAIL** (CR-2) |
| Cycle-aborted walk reports same shape, never `walked` | yes | yes | PASS |
| Retargeted `done` skips | yes | yes | PASS |
| `isLastRung` measured against the issue type's ladder | yes | yes | PASS |
| Ladder-only rung is ranked and guards a regress | yes | yes | PASS |
| Every rung resolves via any of its names | yes | yes | PASS |
| `--print-plan` credential-free, network-free, honours `--from` | yes | yes | PASS |
| `rapp-story-ready-for-showcase.json` captured | yes | **no** | BLOCKED (external, disclosed) |
| All existing fixture assertions pass unchanged | yes | yes | PASS |
| **Card already at target reports `already`** | implicit | **`walk-incomplete`** | **FAIL** (CR-1) |
| **An omitted moment does not fire** | task.37 contract | **fires built-in default** | **FAIL** (CR-3) |

### Performance

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Default one-rung path — same API calls as today | 1 GET + 1 POST | 1 GET + 1 POST | PASS |
| `getTransitions` re-fetched once per hop | n | n | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `walkLadder` reuses `transitionToStatus` | yes | yes | PASS |
| Never throws; exit codes unchanged | yes | mostly — CR-1 changes `--strict` exit for the already-case | CONCERNS |
| Header no longer overpromises `--dry-run` | yes | yes | PASS |
| `npm run bundle` run and committed | yes | yes (idempotent on re-run) | PASS |
| Test suite | 0 failures | 870/870 | PASS |

---

## Breaking Changes Validation

### Breaking Change: the done-category fallback narrows

Documented: **Yes** · Migration path: **N/A by design, and correctly argued** · Consumer code: N/A

Validated. The narrowing is correct and the CHANGELOG explains why a skip beats a wrong terminal.

### Breaking Change: a previously-skipped moment may move a card further

Documented: **Yes** · Migration path: **Yes** (`--print-plan`, `--dry-run`)

Validated for the walking path itself.

### ⚠️ Undocumented breaking change found — CR-4

The task claims **"None for a consumer with no `tracker-workflow.yaml`"**. That does not hold: with
no file, `loadWorkflow` returns the *built-in default ladder*, `resolveMoment` resolves against it,
and the JSON workflow record is bypassed. A consumer who configured `jira.workflowRecord` and never
adopted the new format silently loses `enabled`, `candidates`, `rank` and `byIssueType` for
`work-started`, `in-review` and `done`.

**Overall Breaking Changes Assessment**: **FAIL** — one undisclosed regression against the stated
compatibility guarantee.

---

## Issues Found

### HIGH Severity (3)

**CR-1 — the already-at-target case reports `walk-incomplete`**
`shared/resources/jira-sync.js` (cycle guard, first iteration)
The guard runs at `i===0` against a `visited` set pre-seeded with `key(from)`. When the card is
already where the moment wants it, the target rung contains `from`, so the guard fires before
`transitionToStatus` is ever reached.

```
walkLadder({from:"Waiting for Review", targets:["Waiting for Review"]})
  → { reason: "walk-incomplete", landed: "Waiting for Review", transitioned: false }
```

This is the most common pipeline outcome — every resumed run re-firing a stage. It now prints a
self-contradictory `⏸️ … walked as far as "Waiting for Review" — Waiting for Review not reachable
from there`, and exits **1 under `--strict`** where it previously exited 0. It also makes both
`already` branches (in `jira-stage.js` and in `walkLadder`) dead code.
**Fix**: skip the cycle check on `i===0`. `planMove` returns rungs *strictly between* from and to, so
an intermediate rung can never contain `from` — the guard is only meaningful from `i>=1`.

**CR-2 — a partial walk is emitted as a success, with no warning**
`shared/resources/jira-stage.js` (branch ordering)
`if (res.reason === "walked" || res.transitioned)` is evaluated *before* the `walk-incomplete`
branch, but `incomplete()` sets `transitioned: current !== from`. A genuine partial walk therefore
has `transitioned: true` and takes the success path. The `walk-incomplete` branch only fires when the
card did **not** move — the exact inverse of its own comment. The operator gets no signal that a card
is parked in a gate, which is the one thing three-outcome reporting exists to provide.
**Fix**: test `res.reason === "walk-incomplete"` before the success branch.

**CR-3 — an explicitly disabled moment still fires**
`shared/resources/jira-stage.js` (`resolveMomentSpec` fallback)
`resolveMoment` returning null means *"this moment is disabled"* — omission from `pipeline:` is the
only way to switch a moment off, per task.37 and this repo's own `tracker-workflow.yaml` comments.
The fallback reads null as "no opinion" and drops through to `resolveStage`:

```
authored yaml declaring only work-started:
  resolveMoment("done")   → null
  resolveMomentSpec(done) → { enabled: true, candidates: ["Done","Closed",…], terminal: true }
```

So `--stage done` fires the board's real Done transition on a board that switched it off. Same
severity class as the bug this task exists to fix.
**Fix**: take the ladder branch only when `workflow.source === "file"`; when authored and the moment
is null, return `enabled: false` naming the omission.

### MEDIUM Severity (2)

**CR-4 — the built-in default ladder outranks the JSON workflow record** — see Breaking Changes
above. Fixed by the same change as CR-3.

**CR-5 — a partial walk discards the underlying failure** `shared/resources/jira-sync.js`
`incomplete()` drops `res.reason` and `res.detail`, so a hop-0 `http-400`/`http-500`,
`required-fields`, or `no-transition` is flattened to `walk-incomplete`. `jira-stage` keys its
`describeAlternatives` diagnostics on `reason === "no-transition"`, and the HTTP detail is the only
place a workflow validator surfaces at all — so a 500 from Jira reads as "the card is parked
mid-ladder" at exit 0.
**Fix**: carry the failure through as a `cause` field and branch diagnostics on it.

### LOW Severity (2)

- **Exit-code comment contradicts the code.** The comment says "Both are exit 0" while the code
  returns `args.strict ? 1 : 0`. The *code* matches the task spec ("walk-incomplete is exit 0, or 1
  under `--strict`"); the comment is wrong. Fix the comment.
- **Hop construction implemented twice** — `planHops` in `jira-stage.js` and inline in `walkLadder`,
  already drifted on null-workflow handling. `--print-plan` prints one while the live run walks the
  other.

### Test coverage gap

Every new test calls `walkLadder` / `resolveMomentSpec` / `planHops` **directly**; nothing exercises
`jira-stage.run()` end to end. That is precisely why a 24-test addition passes with CR-1, CR-2 and
CR-3 present. There is no test at all for "the card is already at the target".

**Total**: HIGH 3, MEDIUM 2, LOW 2.

---

## NFR Assessment

**Performance — PASS.** `1+2n` met and asserted; the optional `transitions` parameter genuinely
suppresses the second GET; a one-rung walk is at the documented baseline.

**Reliability — FAIL.** Three confirmed correctness bugs on the primary path, one causing an
unrecoverable wrong transition into Done — the failure mode the task's own risk assessment rates
Critical.

**Security — PASS.** No new credential handling. `--print-plan` verified credential-free and
network-free by a test that injects a throwing `fetchImpl`. No secrets in the diff.

**Maintainability — CONCERNS.** Duplicated hop construction that has already drifted; lost
diagnostics in `incomplete()`. Otherwise the commenting and documentation are a strength — the
"two rank scales, never mixed" comment in particular pre-empts a whole class of future error.

---

## Code Review

From Step 3b. `CR_BLOCKING=true`, so `bug` + `confidence: high` findings were promoted to gate
`top_issues` (CR-1…CR-5).

**Correctness bugs (5):**

- [high/high] `jira-sync.js` (cycle guard) — already-at-target returns `walk-incomplete` → skip the guard at `i===0` (**CR-1**)
- [high/high] `jira-stage.js` (branch order) — partial walk emitted as success → order `walk-incomplete` first (**CR-2**)
- [high/high] `jira-stage.js` (`resolveMomentSpec`) — disabled moment still fires → gate on `source === "file"` (**CR-3**)
- [medium/high] `jira-stage.js` (`resolveMomentSpec`) — default ladder outranks the JSON record → same fix (**CR-4**)
- [medium/high] `jira-sync.js` (`incomplete`) — underlying failure reason discarded → carry a `cause` (**CR-5**)

**Cleanups (2):**

- `jira-stage.js` / `jira-sync.js` — hop construction duplicated and already drifted → one exported helper
- `jira-stage.js` — exit-code comment contradicts the code → fix the comment

**Verified correct** (checked and explicitly cleared): `transitionsIn || await getTransitions(...)`
is safe for an empty array (`[]` is truthy, so a board offering zero transitions correctly yields
`no-transition` with no second fetch); both `already` shapes carry `to`, so `landed` is always a
string and never an object; `resolveStatusRank`'s ladder-mode early return has one internal call site
and no external caller passes `workflow`, so legacy mode is genuinely untouched; `planMove` with a
null workflow returns `[]` rather than throwing; `--print-plan` does precede both the auth check and
the issue fetch.

---

## Regression Testing

- Full suite: **870/870**, exit 0 — includes document/epic/story/task sync guard tests, the regression
  signal for the ladder-aware rank change. No regressions.
- Pre-existing fixture assertions: all 8 pass **unchanged**.
- `npm run bundle`: idempotent on re-run — no drift between sources and the 47 bundled copies.
- `tracker-workflow` purity test still passes, confirming the new `require` direction
  (jira-sync → tracker-workflow) did not pull the Jira client into the pure module.

---

## Test Artifacts

**Commands executed**

```bash
npm test                                  # 870/870, exit 0
npm run bundle                            # idempotent — zero changes on re-run
node -e '<walkLadder already-at-target>'  # reproduced CR-1
node -e '<resolveMomentSpec disabled>'    # reproduced CR-3 and CR-4
git diff origin/develop...HEAD            # diff code review scope
```

**Coverage**: this repo has no coverage instrumentation configured; test count and suite-level pass
rate are the available signal (870/870).

---

## Recommendations

### Immediate (blocking)

1. **CR-1** — skip the cycle guard on the first hop.
2. **CR-2** — order the `walk-incomplete` branch before the success branch.
3. **CR-3 + CR-4** — gate the ladder branch on `workflow.source === "file"`; an authored omission disables.
4. **CR-5** — carry the underlying failure reason through a partial walk.
5. Add `run()`-level tests: already-at-target, partial walk, hop-0 HTTP failure on a multi-hop plan.

### Short-term (non-blocking)

1. De-duplicate hop construction into one exported helper.
2. Fix the exit-code comment.
3. Correct the task's "no breaking changes" claim once CR-4 is fixed, or document the record interaction.

---

## Final Assessment

**Gate Status**: **FAIL**
**Quality Score**: 20/100
**Rationale**: Three high-severity, high-confidence correctness bugs on the primary feature path,
each reproduced by execution. Gate rule 1 (any high `top_issue` → FAIL) and rule 3 (Reliability NFR
FAIL) both apply independently.

**Deployment Recommendation**: **BLOCKED**
**Conditions**: CR-1, CR-2 and CR-3 fixed and covered by `run()`-level tests.

This is a fixable FAIL, not a design failure. The architecture, the guards, the API-cost work and the
documentation are all sound; what is wrong is branch ordering in three places and one fallback that
reads "disabled" as "unspecified". None requires rethinking the approach.

**Next Steps**: `/qa-fix` against this gate, then re-review.
