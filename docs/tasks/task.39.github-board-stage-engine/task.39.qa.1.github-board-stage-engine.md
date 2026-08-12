# QA Report: Task 39 — `gh-stage.js`, a GitHub Projects board engine

**Task**: [task.39.github-board-stage-engine.md](./task.39.github-board-stage-engine.md)
**Gate File**: [task.39.gate.1.github-board-stage-engine.yml](./task.39.gate.1.github-board-stage-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-12
**PR**: [#206](https://github.com/Gamaroff/agent-skills/pull/206) (OPEN)
**Gate Status**: FAIL

---

## Executive Summary

The module is well-built and unusually well-reasoned — the Jira asymmetry is stated up front, the
dependency boundary is enforced by a test rather than a comment, and the write-free `--dry-run`
contract is asserted by a stub that fails on any write verb. Performance criteria were met and
measured rather than assumed.

Two things stop it passing. First, **board selection can write a status to a board the operator
explicitly did not name**: `selectBoard` chains its precedence tiers with `||`, so an unmatched
`--board` falls through to the next hint instead of failing closed. That is the precise failure the
never-fan-out rule exists to prevent, and it is reachable with a typo. Second, **four of the 51 tests
pass vacuously** — including the two that claim to cover the backward-move guard and the one covering
the post-mutation verify re-read — so the suite currently overstates its coverage of the three
highest-risk behaviours in the module.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4; the one unchecked box is an annotated operator ritual)
- [x] Tests passing
- [x] Breaking changes documented (None — nothing calls the CLI yet)
- [x] Code on feature branch with open PR

### Testing Approach

- [x] Automated Testing (unit, integration, contract)
- [x] Regression Testing (full suite)
- [x] Code Review (adversarial diff review, Step 3b)
- [x] Manual verification of the specific defects found
- [ ] Performance Testing — measured by call count rather than timing (appropriate here)
- [ ] Security Review — scoped: no secrets handled, auth delegated to `gh`

### Review Methodology

Direct tools for the document-anchored checks, plus one read-only Explore subagent for the Step 3b
adversarial diff review. **Every high-confidence finding was then re-verified independently** by
executing the code paths directly rather than accepting the subagent's report — CR-1, CR-2 and CR-3
were each reproduced before being admitted to the gate.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: `resolveOption` + CLI skeleton | PASS | Verified | Pure, exact-case-insensitive, no prefix matching. Arg parsing mirrors `jira-stage.js` including the unknown-option throw. |
| Phase 2: Read, guard, mutate | CONCERNS | Partial | Single read including current value ✅. **Multi-board rule defective (CR-1, CR-2).** Guard logic itself is correct; its tests are not. Retry does not cover the error-envelope path (CR-3). |
| Phase 3: `--dry-run` + `--probe-board` | PASS | Verified | Write-free dry-run genuinely asserted and confirmed against the live board. `--write-ladder` correctly preserves an existing file. Minor: writes under `--dry-run` (CR-8, advisory). |
| Phase 4: Fixtures and tests | CONCERNS | Partial | 8 fixtures are well-chosen and each pins a real failure mode. **Four tests pass vacuously (CR-3/4/5/6).** |

**Overall Phase Completion**: 4/4 implemented, 2/4 with defects

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| `--probe-board` prints options in board order + each moment's resolution | Yes | Verified against live board 1 | PASS |
| `--write-ladder` round-trips through `tracker-workflow.js` | Yes | Asserted by test | PASS |
| Guard refuses a backward move; `--allow-regress` overrides | Yes | Behaviour correct; **one of its two tests is vacuous (CR-5)** | CONCERNS |
| `no-option` names the options the board offered | Yes | Returned as `offered` and printed | PASS |
| `--dry-run` provably issues no write | Yes | Stub fails on any write verb; live board unchanged after all 8 moments | PASS |

### Performance

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| One read + one mutation + one verify read per move | 3 calls | 3 measured | PASS |
| `item-add` only under `--add-to-board` | 0 otherwise | 0 measured | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| No `jira-sync.js` dependency | Required | Enforced by test | PASS |
| Always exits 0 outside `--strict`/usage | Required | Verified incl. the `require.main` shim as a subprocess | PASS |
| Single matching discipline, no prefix matching | Required | Verified | PASS |
| Tests under an already-globbed directory | Required | No `package.json` change needed | PASS |
| Full suite | 0 failures | 1051/1051 | PASS |

### Migration

| Criterion | Status |
| --------- | ------ |
| `configuration.md` documents both keys **and** `project.yml` | PASS |
| `tracker-workflow.md` states the no-graph asymmetry | PASS |
| `CHANGELOG.md` `### Added` | PASS |

---

## Breaking Changes Validation

**None declared, and none found.** Nothing calls `gh-stage.js`; the change is purely additive. The
`npm run bundle` pass reported no drift, confirming no skill picked up a reference. N/A → PASS.

---

## Issues Found

### HIGH Severity (1)

**CR-1 — an unmatched explicit board hint falls through and writes to a board nobody named**

- **Severity**: HIGH · **Category**: Functional/Reliability
- **Location**: `shared/resources/gh-stage.js:401`
- **Observation**: `selectBoard` chains its four precedence tiers with `||`. `tryHint` returns `null`
  both when a hint is *absent* and when it is *present but matches nothing* — the chain cannot tell
  these apart. Reproduced directly:
  `selectBoard(twoBoards, {board:"999", projectYml:{boardNumber:"12"}})` → **Org Portfolio**, rule
  `project.yml project_board_number`.
- **Impact**: An operator who mistypes `--board` gets a status change on a *different* board, visible
  to whoever reads it. This is exactly the outcome the module's own never-fan-out rule exists to
  prevent, and the task's Risk Assessment rates it Critical impact.
- **Why the test suite missed it**: `selectBoard: an unmatched hint is ambiguous, never a guess`
  passes `projectYml: {}` — there is nothing to fall through *to*, so the test cannot observe the
  bug it is named for.
- **Recommendation**: Fail closed. If the highest-precedence hint that is present matches nothing,
  return `ambiguous-board` rather than consulting lower tiers.

### MEDIUM Severity (5)

**CR-2 — a title-valued `--board` sends `item-add` to the wrong board**
`gh-stage.js:864`. `boardHintNumber` accepts only a numeric hint and otherwise falls back to
`project.yml`'s number. Since `selectBoard` accepts a *title*, `--add-to-board --board "Team Sprint"`
adds the issue to one board and sets the status on another.

**CR-3 — a mutation error envelope is never retried, contrary to the task's own criterion**
`gh-stage.js:428`. `setOption` wraps only the `exec` call in `withRetry`; a GraphQL error envelope is
a successful *process* exit, so the retry never fires and the throw happens outside it. Reproduced:
**1 attempt, not 3**. The task's Integration Test criterion states "Mutation error envelope → retried,
then a warning and exit 0", so the implementation does not meet a criterion it ticked.

**CR-4 — the verify re-read is not actually tested**
`gh-stage.test.mjs:345`. The queued verify fixture contains no item whose id matches the first read's,
so `landed` silently falls back to the requested name. The assertion passes with the re-read deleted.

**CR-5 — `guard: refuses a lower-ranked target` tests the allow path**
`gh-stage.test.mjs:459`. It asserts `transitioned === true`. The board it selects sits at Todo and
moves *forward*. Its own inline comment concedes this. (Refusal *is* covered by the adjacent
`would-regress` test, so this is a naming/coverage defect rather than an untested behaviour.)

**CR-6 — `guard: unranked either side` never reaches the guard**
`gh-stage.test.mjs:514`. The card's current value equals the moment's only candidate, so
`resolveOption` short-circuits to `already` and `run()` returns before the rank comparison.

### LOW Severity (4, advisory — not gating)

- **CR-7** `gh-stage.js:833` — the verify re-read has no propagation delay (unlike `ensureOnBoard`,
  which deliberately sleeps for the same API), so a stale read can report the *previous* status as
  `landed`, inverting the silent-no-op detection it exists for.
- **CR-8** `gh-stage.js:958` — `--write-ladder` writes to disk even under `--dry-run`.
- **CR-9** `gh-stage.js:604` — the `--issue` numeric check sits inside the non-probe branch, so the
  probe path interpolates an unvalidated value into the GraphQL document.
- **CR-10** `gh-stage.js:338` — `readBoard` ignores `doc.errors` (which `setOption` checks), so a real
  API error degrades into a benign `not-on-board` skip.

**Total**: HIGH: 1, MEDIUM: 5, LOW: 4

No separate bug-report files were created: every issue is a small, precisely-located defect in this
change set and is being handed straight to `qa-fix` in the same pipeline cycle.

---

## NFR Assessment

### Performance — PASS

Measured, not asserted: 3 `gh api` calls per move (read + mutation + verify), 0 `item-add` without
the flag. A net reduction against the inline block being replaced.

### Reliability — FAIL

CR-1 (wrong board), CR-3 (no retry on the failure mode most likely to be transient), CR-7 (stale
verify), CR-10 (real errors reported as benign skips). The always-exit-0 discipline is correct and
well-implemented, but it raises the cost of these gaps: a wrong board write is silent by design.

### Security — CONCERNS

No secrets handled; auth is delegated entirely to `gh`; no MCP fallback surface. The single concern
is CR-9 — unvalidated `--issue` interpolation into the GraphQL document on the probe path, which the
plan explicitly said to guard against. Operator-supplied local input, so impact is low.

### Maintainability — CONCERNS

The module is genuinely well-documented — the comments explain *why*, not *what*, and the dependency
boundary is enforced by an assertion rather than a convention. But four vacuous tests mean the suite's
51-green signal overstates real coverage precisely where risk is highest, and that is a
maintainability problem: the next person will trust those names.

---

## Code Review

Step 3b, `code_review_blocking=true` (pipeline Skill args; no per-doc override).

**Correctness bugs (10):**

- [high/high] `gh-stage.js:401` — unmatched explicit board hint falls through → fail closed as `ambiguous-board`
- [medium/high] `gh-stage.js:864` — title-valued board hint discarded in `boardHintNumber` → resolve or reject it
- [medium/high] `gh-stage.test.mjs:657` — error-envelope retry never exercised; only 1 attempt issued → assert call count, retry inside the closure
- [medium/high] `gh-stage.test.mjs:345` — verify re-read unasserted → queue a matching-itemId fixture
- [medium/high] `gh-stage.test.mjs:459` — guard-refusal test asserts the allow path → rename or re-fixture
- [medium/high] `gh-stage.test.mjs:514` — unranked-guard test short-circuits at `already` → use a different off-ladder target
- [medium/medium] `gh-stage.js:833` — verify re-read may report a stale status as `landed`
- [low/medium] `gh-stage.js:958` — `--write-ladder` writes under `--dry-run`
- [low/medium] `gh-stage.js:604` — `--issue` unvalidated on the probe path
- [low/medium] `gh-stage.js:338` — `readBoard` ignores `doc.errors`

**Cleanups (2):**

- `gh-stage.js:620` — `configuredBoard = args.board || resolveConfiguredBoard(root)` makes the second
  precedence tier dead whenever `--board` is given → pass the raw configured value separately
- `gh-stage.test.mjs:353` — two tests build an unused `root` temp repo and pass a `board` that
  `boardQueue` overrides → delete the dead setup

**Promoted to gate** (`bug` + `confidence: high`): CR-1, CR-2, CR-3, CR-4, CR-5, CR-6.
**Advisory**: CR-7 … CR-12.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full suite (`npm test`) | PASS — 1051/1051, 0 failures |
| `tracker-workflow.js` consumers | PASS — no change to that module; `clearWorkflowCache()` is called only on a fresh write |
| Bundled skill references | PASS — `npm run bundle` reports no drift; nothing references the new file yet |
| Live board side effects | PASS — board still reads `In Progress` after all read-only exercises |

---

## Test Artifacts

### Files Reviewed

`shared/resources/gh-stage.js`, `shared/resources/tests/gh-stage.test.mjs`, all 8
`shared/resources/tests/fixtures/gh-*.json`, `docs/reference/tracker-workflow.md`,
`docs/reference/configuration.md`, `CHANGELOG.md`, the task and plan documents.

### Commands Executed

```bash
npm test                                                  # 1051/1051
node --test shared/resources/tests/gh-stage.test.mjs      # 51/51
git diff origin/develop...HEAD                            # 3439-line diff, reviewed via subagent
# direct reproduction of CR-1, CR-2, CR-3 against the real module
```

### Coverage

No coverage instrumentation is configured in this repo (`node --test` without `--experimental-test-coverage`).
Coverage was assessed structurally instead — which is how the four vacuous tests were found.

---

## Recommendations

### Immediate (Blocking)

1. **CR-1** — fail closed on an unmatched explicit board hint (`gh-stage.js:401`).
2. **CR-2** — resolve or reject a title-valued board hint (`gh-stage.js:864`).
3. **CR-3** — retry the mutation error envelope, per the task's own criterion (`gh-stage.js:428`).
4. **CR-4/5/6** — make the four tests exercise what their names claim.

### Short-term (Non-Blocking)

1. CR-7 — trust the verify re-read only when it matches the requested option.
2. CR-8 — skip `writeLadder` under `--dry-run`.
3. CR-9 — hoist the `--issue` validation to cover the probe path.
4. CR-10 — check `doc.errors` in `readBoard`.
5. CR-11/12 — the two cleanups.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH-severity correctness bug that can write a board status the operator did not
ask for, plus four tests that pass without exercising their stated behaviour. Reliability NFR is FAIL.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

**Conditions to clear**:
1. CR-1 fixed — an explicit unmatched hint must not fall through.
2. CR-3 fixed, or the task's Integration Test criterion amended to match the implementation.
3. The four vacuous tests genuinely exercise the guard, the retry and the verify re-read.

> Worth saying plainly: none of this is architectural. The design is sound and the module is better
> documented than most of what it sits beside. Every finding is a small, local fix, and the fact that
> the vacuous tests were findable at all is because the suite is otherwise specific enough to read.

---

**Next Steps**: `/qa-fix` against this gate file, then re-review as QA cycle 2.
