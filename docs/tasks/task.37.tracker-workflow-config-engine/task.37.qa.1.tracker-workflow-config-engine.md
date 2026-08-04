---
id: task.37.qa.1
title: "QA Report: Task 37 — tracker-workflow.yaml config engine"
type: qa-report
description: "Fresh QA review of task.37: 4/4 phases verified, 816/816 tests passing, one medium correctness bug found by diff review that silently disables the `done` moment on a consumer's custom ladder."
tags: [qa, task, configuration, tracker]
status: accepted
created: 2026-08-04
updated: 2026-08-04
task-ref: task.37.tracker-workflow-config-engine.md
github_issue: 185
---

# QA Report: Task 37 — `tracker-workflow.yaml` config engine

**Task**: [task.37.tracker-workflow-config-engine.md](./task.37.tracker-workflow-config-engine.md)
**Gate File**: [task.37.gate.1.tracker-workflow-config-engine.yml](./task.37.gate.1.tracker-workflow-config-engine.yml)
**PR**: [#193](https://github.com/Gamaroff/agent-skills/pull/193)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-04
**Gate Status**: CONCERNS

---

## Executive Summary

Task 37 is well-built work: all four phases are complete, the suite grew from 760 to 816 with no
pre-existing test modified, and several of the tests are unusually well-chosen — the default-ladder
snapshot derives its expectations from `jira-sync.js`'s exported constants rather than transcribing
them, and module purity is asserted behaviourally through a clean child process's require cache
rather than by grepping source.

The gate is **CONCERNS** on one finding: a `tracker-workflow.yaml` that declares `statuses:` but
omits `pipeline:` inherits the built-in default pipeline, whose values are **rung indices** authored
against the built-in 6-rung ladder. Applied to a consumer's own ladder those indices mean nothing.
The failure is silent and, worse, *partially* silent — two moments land correctly by coincidence of
position while `done` never fires at all.

That this reaches no real board yet (the engine is deliberately unwired) is exactly why it is worth
fixing now rather than later.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1 and CR-2

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (22/22 checkboxes)
- [x] Tests passing (816/816)
- [x] Breaking changes documented — task declares **None**, and that claim was checked (below)
- [x] Code on feature branch with open PR #193

### Testing Approach

- [x] Automated Testing (unit + contract + regression)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (adversarial diff review, Step 3b)
- [ ] Manual Testing — n/a, no user-facing surface
- [ ] Performance Testing — covered by a cache-behaviour assertion rather than benchmarks; see NFR

### Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b diff review. Chosen per the
Adaptive Review Strategy: 4 phases is under the >5 threshold for parallel agents, the task touches no
auth/payments/security surface, and the change set is a self-contained pure module plus a bundler
tweak. Findings were **independently re-verified by executing the engine**, not accepted from the
subagent's report — CR-1 and CR-3 were reproduced live before being written into the gate.

---

## Implementation Verification

| Phase                                        | Status   | Test Result | Notes                                                                                                              |
| -------------------------------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Phase 1: Bundler `.mjs`, then promote parser | PASS     | Verified    | Bundler change correctly precedes the swap. 8 regression tests run the real bundler against temp fixtures.          |
| Phase 2: The engine                          | CONCERNS | Partial     | All public functions present and behaving; CR-1 and CR-2 found here.                                               |
| Phase 3: Tests                                | PASS     | Verified    | 56 engine + 18 parser tests. Snapshot derives from `jira-sync.js` constants, as §10 High Risk 1 requires.           |
| Phase 4: Documentation                        | PASS     | Verified    | Reference page, template, config schema, AGENTS.md, CHANGELOG. Template↔doc byte-equality is test-enforced.        |

**Overall Phase Completion**: 4/4 phases complete, 1 with concerns.

Spot-checks that mattered:

- **Phase 1 ordering was genuinely honoured**, not just claimed. `git log` confirms `d8491a4`
  (bundler) precedes `2476d6c` (parser swap). This is the sequencing §10 High Risk 2 exists to
  enforce, and getting it backwards would have shipped a broken install invisibly.
- **The bundled copy exists and is rewritten**: `skills/develop-batch/references/yaml-subset.js`
  present, and `schedule.mjs` imports `../references/yaml-subset.js`.
- **The promotion really was behaviour-neutral.** The two-step approach (verbatim body + contract
  tests green, *then* the quoted-key extension) means the claim is evidenced rather than asserted.

---

## Success Criteria Verification

### Functional

| Criterion                                              | Target  | Actual                     | Status |
| ------------------------------------------------------ | ------- | -------------------------- | ------ |
| Valid file parses; every exported function resolves     | Yes     | Yes                        | PASS   |
| Missing/unreadable/malformed → defaults, never a throw  | Yes     | Yes (4 tests)              | PASS   |
| `byIssueType` overlays `statuses` and can disable       | Yes     | Yes (replace, not merge)   | PASS   |
| Omitted moment → null; off-ladder target detected       | Yes     | Yes                        | PASS   |
| Rung alternatives match on any name, offer all          | Yes     | Yes                        | PASS   |
| `npm test` passes, existing suites unchanged            | Yes     | 816/816, 0 modified        | PASS   |
| `npm run bundle` carries `yaml-subset.js` rewritten     | Yes     | Yes                        | PASS   |

### Performance

| Criterion                                | Target        | Actual                            | Status |
| ---------------------------------------- | ------------- | --------------------------------- | ------ |
| Parse cached; at most one read per run   | 1 read        | 1 read (asserted by interception) | PASS   |
| No measurable change to develop-batch    | No regression | 41/41 unchanged                   | PASS   |

### Code Quality

| Criterion                                   | Target      | Actual                       | Status |
| ------------------------------------------- | ----------- | ---------------------------- | ------ |
| Engine pure; only permitted shell-out        | Yes         | Yes (both asserted by test)  | PASS   |
| Swallow-everything matches loadWorkflowRecord | Yes       | Yes                          | PASS   |
| New tests under an already-globbed directory | Yes         | Yes — no package.json change | PASS   |
| `npm run bundle` regenerates cleanly         | Yes         | Yes, idempotent              | PASS   |

Every declared success criterion is met. **CR-1 is not a missed criterion** — it is a defect in
behaviour the criteria do not describe, which is precisely the gap a diff review exists to cover.

---

## Breaking Changes Validation

### Breaking Change: None declared

- Documented: **Yes** — §5 declares None
- Migration Path Provided: N/A
- Consumer Code Updated: **Yes** — `schedule.mjs`, the parser's sole caller, updated in the same commit
- Verified: `parseYamlSubset` keeps its arity and behaviour; the export-form change is covered by the
  contract tests, and the re-export from `schedule.mjs` keeps the existing import path working for
  `evals/develop-batch/unit/schedule.test.mjs`.

**Assessment**: PASS — the "no breaking changes" claim holds under inspection.

One nuance worth recording: the quoted-key extension **is** a behaviour change to the parser, but a
strictly additive one — it makes previously-unparseable input parse. No existing input changes
meaning, which the "unquoted keys are unaffected" test pins directly.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**CR-1 — Default pipeline indices are applied to a consumer's custom ladder**

- **Severity**: MEDIUM · **Category**: Functional · **Priority**: P1
- **Location**: `shared/resources/tracker-workflow.js` — `DEFAULT_PIPELINE` and `resolveMoment`'s
  numeric branch
- **Observation**: `DEFAULT_PIPELINE` stores rung **indices** (`work-started: 1`, `in-review: 2`,
  `done: 5`) authored against the built-in 6-rung ladder. `buildWorkflow` replaces `ladder` when
  `statuses:` is present but leaves `pipeline` at the default when `pipeline:` is absent, so those
  indices are then resolved against a ladder they were never written for.
- **Reproduced live** on a 4-rung ladder `[Backlog, In Progress, In Review, Done]`:

  ```
  pipeline: {"work-started":1,"in-review":2,"done":5}
  resolveMoment(work-started) -> targets ["In Progress"], rank 1   ← right, by coincidence
  resolveMoment(in-review)    -> targets ["In Review"],   rank 2   ← right, by coincidence
  resolveMoment(done)         -> null                              ← never fires
  validateWorkflow errors: []                                      ← and nothing warns
  ```

- **Impact**: A consumer who declares their board's columns and relies on default moment wiring gets
  a card that advances through review and then **stops forever**, with no error. The partial
  correctness is what makes this dangerous: two moments working builds confidence that the third is
  wired too. `validateWorkflow` is silent because it skips numeric targets unconditionally.
- **Recommendation**: Make `DEFAULT_PIPELINE` name-based (`work-started: "In Progress"` etc.) so it
  resolves by name against whatever ladder is in play — which also fixes the case for any board using
  conventional column names — and delete the numeric special case from both `resolveMoment` and
  `validateWorkflow` so an unresolvable default moment is reported rather than silently dropped.

### LOW Severity Issues (1)

**CR-2 — `cloneWorkflow` does not deep-copy `byIssueType`**

- **Severity**: LOW · **Category**: Quality · **Priority**: P2
- **Location**: `shared/resources/tracker-workflow.js` — `cloneWorkflow`
- **Observation**: The function copies `ladder`, `pipeline`, `documentStatus` and `warnings` but
  assigns `byIssueType` by reference, while its own comment claims it is "deep enough that no caller
  can mutate the cached entry".
- **Impact**: Bounded — a caller must mutate a nested overlay for it to bite, and no caller does yet.
  It matters because the code *documents a guarantee it does not provide*, and the existing
  cache-poisoning test passes anyway because it only mutates the fields that are copied.
- **Recommendation**: Deep-copy `byIssueType`; extend the cache-poisoning test to mutate an overlay.

### Advisory (not gating)

**CR-3 — Wrong-shaped `pipeline:` disables everything instead of falling back** (medium confidence)

`buildWorkflow` sets `pipeline = {}` *before* checking the value's shape, so
`pipeline: In Progress` (a scalar) yields `{}` — every moment off — while the warning says "ignoring
it" and `docs/reference/tracker-workflow.md` promises a wrong-shaped file resolves to built-in
defaults. Reproduced live. Cheap to fix by reordering the reset after the shape check.

**CR-4 — Nothing asserts the bundled parser matches its shared source** (cleanup)

After the swap, `schedule.mjs` executes `skills/develop-batch/references/yaml-subset.js` even
in-repo. The only guard asserts that file *exists*. An edit to `shared/resources/yaml-subset.js`
without `npm run bundle` would leave `develop-batch` running a stale parser while every suite stays
green — the same class of invisible-in-repo failure Phase 1 was written to eliminate, arriving
through a different door.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1, Advisory: 2

---

## NFR Assessment

### Performance — PASS

Parse is cached per resolved path, asserted by a test that intercepts `fs.readFileSync` and requires
exactly one read across three `loadWorkflow` calls. `develop-batch`'s 41 unit tests — including three
CLI end-to-end cases — pass unchanged after the parser move, which is the meaningful regression
signal for scheduling time. No benchmark was run for a 100-rung ladder; the operation is an array
scan over a cached parse and the risk of it mattering is negligible.

### Reliability — CONCERNS

The swallow-everything contract holds: missing, unreadable, malformed and wrong-shaped inputs all
resolve to defaults and nothing throws, each covered by a test. The deduction is CR-1: the contract's
purpose is to convert crashes into safe defaults, and CR-1 produces the opposite failure mode — a
plausible, well-formed config that yields a *silently wrong* answer. CR-3 compounds it by making a
malformed block disable everything while claiming to ignore it.

### Security — PASS

No HTTP, no `gh`, no credential handling, no user input reaching a shell. The single `execSync` is a
fixed `git rev-parse --show-toplevel` with no interpolation, and a test asserts it is the only one.
Independence from `jira-sync.js` is asserted behaviourally, so a GitHub-only consumer cannot acquire
the Jira client transitively. The bundler regexes are applied to file content only and cannot execute
anything.

### Maintainability — CONCERNS

Genuinely strong on most axes: rationale is written down where it is non-obvious, the tests explain
what each group exists to catch, and two guards are better than the task asked for — the snapshot
deriving from `jira-sync.js`'s exported constants, and the template↔doc byte-equality assertion. The
deduction is CR-4's bundled-copy drift, which is a live hazard rather than a theoretical one now that
the in-repo execution path goes through `references/`.

---

## Code Review

From Step 3b. `code_review_blocking=true` was passed by the pipeline, so `bug` + `high`-confidence
findings were promoted to the gate; everything else is advisory.

**Correctness bugs (3):**

- [medium/high] `shared/resources/tracker-workflow.js:295` — a file with `statuses:` but no
  `pipeline:` inherits rung indices authored against the default ladder, silently disabling `done`
  → make `DEFAULT_PIPELINE` name-based and drop the numeric skip in `validateWorkflow`. **Promoted to
  gate as CR-1.**
- [low/high] `shared/resources/tracker-workflow.js:407` — `cloneWorkflow` assigns `byIssueType` by
  reference, so the documented cache-poisoning guarantee does not hold for overlays → deep-copy it.
  **Promoted to gate as CR-2.**
- [low/medium] `shared/resources/tracker-workflow.js:305` — a wrong-shaped `pipeline:` disables every
  moment rather than falling back to defaults as documented → reset `pipeline` only after the shape
  check. Advisory (confidence below the gating threshold).

**Cleanups (1):**

- `tests/bundle-mjs.test.js:263` — nothing asserts the bundled `yaml-subset.js` matches the shared
  source, so a missed `npm run bundle` leaves `develop-batch` on a stale parser with all suites green
  → assert equality modulo the AUTO-GENERATED header. Advisory.

All four were re-verified against the working tree before being recorded; CR-1 and CR-3 were
reproduced by executing the engine.

---

## Regression Testing

| Area                                    | Result | Notes                                                                                     |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `develop-batch` scheduling              | PASS   | 41/41 unchanged, including 3 CLI end-to-end cases — the parser's only production consumer |
| Bundler across all 113 skills           | PASS   | `npm run bundle` clean and idempotent; fan-out is exactly 1 new file                       |
| Full repo suite                         | PASS   | 816/816, 0 pre-existing tests modified                                                     |
| `skills-config.yaml` readers            | PASS   | A contract test parses the committed dogfood config through the promoted parser            |

A regression *was* caught during development and fixed before push: the promoted module's header
comment contained a literal `require("./x.js")`, which `JS_SIBLING_RE` matched as a real dependency,
making every bundle emit `⚠️ shared/resources/x.js not found`. Recorded in the implementation report.

---

## Test Artifacts

### Files Reviewed

- `shared/resources/tracker-workflow.js` (the engine)
- `shared/resources/yaml-subset.js` (promoted parser)
- `skills/create-skill/scripts/bundle_skill.py` (bundler)
- `skills/develop-batch/scripts/schedule.mjs` (the swap)
- `shared/resources/tests/tracker-workflow.test.mjs`, `shared/resources/tests/yaml-subset.test.mjs`,
  `tests/bundle-mjs.test.js`
- `tracker-workflow.yaml`, `docs/examples/tracker-workflow.default.yaml`,
  `docs/reference/tracker-workflow.md`

### Test Commands Executed

```bash
npm test                                                   # 816/816
npm run bundle                                             # clean, idempotent
node --test shared/resources/tests/tracker-workflow.test.mjs   # 56/56
node --test shared/resources/tests/yaml-subset.test.mjs        # 18/18
node --test tests/bundle-mjs.test.js                           # 8/8
node --test 'evals/develop-batch/unit/*.test.mjs'              # 41/41
```

### Coverage

No coverage instrumentation is configured in this repo (`node --test` without `--experimental-test-coverage`).
Coverage was assessed structurally instead: every exported function of the new engine is exercised,
and every documented failure mode has a test asserting it returns defaults rather than throwing.

---

## Recommendations

### Immediate (blocking)

1. **CR-1** — make `DEFAULT_PIPELINE` name-based; remove the numeric special case from
   `resolveMoment` and `validateWorkflow`. Add a test for "statuses declared, pipeline omitted".
2. **CR-2** — deep-copy `byIssueType` in `cloneWorkflow`; extend the cache-poisoning test.

### Short-term (non-blocking)

1. **CR-3** — reset `pipeline` only after the shape check, so behaviour matches the documented fallback.
2. **CR-4** — assert the bundled parser matches its shared source modulo the generated header.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Rationale**: Every declared success criterion is met and the test work is above the bar the task
set. One medium correctness defect produces a silently wrong board state for a plausible consumer
config, and one low defect documents a guarantee the code does not provide. Both are cheap to fix and
neither can reach a real board while the engine stays unwired — which is the argument for fixing them
now, not for deferring them.

**Deployment Recommendation**: CONDITIONAL — merge after CR-1 and CR-2 are fixed.

---

**Next Steps**: `/qa-fix` against this gate, then re-review.
