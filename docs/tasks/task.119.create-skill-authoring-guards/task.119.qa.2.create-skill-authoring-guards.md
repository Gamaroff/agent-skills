# QA Report: Task 119 - Four authoring rules the corpus already obeys by accident (cycle 2)

**Task**: [task.119.create-skill-authoring-guards.md](./task.119.create-skill-authoring-guards.md)
**Gate File**: [task.119.gate.2.create-skill-authoring-guards.yml](./task.119.gate.2.create-skill-authoring-guards.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review of PR #420 after qa-fix cycle 1 (commit `82451576`). All three cycle-1 findings are FIXED and independently verified. The cycle-2 refute pass — a full-branch review instructed to find the false claim, starting with the fixes — found one: the new §5 "opener parity" test counts fence *pushes*, not scanned *lines*, so it equals the naive count by construction and cannot detect the fence-state loss it was written to guard. The nesting fix itself is correct (§4's fixture and five adversarial shapes prove it); the test that claims to prove it at corpus scale is tautological. One medium, high-confidence finding; two advisory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-4

---

## Re-Review Context

**Re-review scope**: full `origin/develop...HEAD` diff (cycle 2 — refute pass; `SAFETY_REPROBE=false`: prior gate security `OK reasoned`)

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR-1 `runnableLines()` fence-state loss on nested fences | **FIXED** | Stack-based reader; naive-opener vs scanned count matches on all 100 `SKILL.md` (485/485; was 477); §4 nested fixtures pass; pop-rule-removed mutation reds §4; five adversarial shapes (tilde outer / backtick inner, longer bare closer, unclosed template, info string on a closing line, indented list fence) each surfaced every token |
| CR-2 `liveSources()` scope docstring; `references/` depth | **FIXED** | Docstring states a deliberate superset; `walk()` passes `skip` at every depth; 125 sources scanned, 0 under `references/` |
| CR-3 duplicate warnings under `--all` | **FIXED** | With one origin reintroduced, `bundle_skill.py --check` prints the warning once (was once per bundling skill) |

---

## New Findings This Cycle

- **[medium/high]** `tests/fenced-bash-positional-params.test.js` §5 — tautological: `blocks++` fires on every runnable info-string push regardless of stack state, so `scanned == naive` by construction; a reader with the pop rule removed entirely still matches on all 128 `SKILL.md` files (reviewer verified; QA re-verified that the same mutation reds §4 but not §5). The task document, QA report 1 and the fix commit cite §5 as the corpus-scale proof. → assert line-level coverage: for each naive opener whose next line is not a fence, that line must be among the scanned lines. **CR-4, gated.**
- **[low/medium]** `tests/fenced-bash-positional-params.test.js:125` — a fence-shaped line inside a *runnable* block (a bash heredoc writing a ```yaml fence) pushes a non-runnable entry and hides the shell lines until its bare closer. No live instance; a 4-backtick outer fence already handles the well-formed shape. → when the top of the stack is runnable, treat an info-string fence as content; add the heredoc shape to §4. **CR-5, advisory.**
- **[cleanup]** `skills/develop-next/references/document-status-lifecycle.md` — the rewritten comment at `select-next.mjs:154` was the only discovery edge that vendored this copy; it is now reached by no rule and survives only because `source_backed_on_disk()` refreshes on-disk copies. QA audit: 12 other skills carry pre-existing unreached copies (`set-github-project-priority.sh` ×2, `verify-push-state.sh` ×3, `yaml-subset.js` ×4, pipeline step docs in qa-story/qa-task, `resolve-paths.sh`, `review-story-prepass-prompts.md`) — pre-existing, out of this task's scope, worth a follow-up observation. → delete the develop-next copy. **CR-6, advisory.**

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: verify the harness premises | PASS | Verified | unchanged since cycle 1 |
| Phase 1: the guard | CONCERNS | Partial | reader fixed (CR-1 closed); §5's claim does not hold (CR-4) |
| Phase 2: rules in create-skill | PASS | Verified | unchanged |
| Phase 3: create-task | PASS | Verified | unchanged |
| Close-out | PASS | Verified | unchanged |

---

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | Guard runs under CI, has a floor, reasoned allowlist | CONCERNS | runs, floor 50 of 485, allowlist empty — but its corpus-scale parity test is vacuous (CR-4) |
| 2 | create-skill three rules; qa-task 4b limit | PASS | |
| 3 | bundler warning + comment-origin guard | PASS | dedupe verified |
| 4 | create-task §1.2 | PASS | |
| 5 | observations closed naming the PR | PASS | |

---

## Breaking Changes Validation

None. **PASS**.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1 (CR-4), LOW: 2 (CR-5, CR-6) — detail under *New Findings This Cycle*.

---

## NFR Assessment

### Performance — PASS
Unchanged; the dedupe set removes repeated prints.

### Reliability — PASS
`ci:fast`: 3410 pass / 0 fail / 1 skipped. Five adversarial fence shapes handled. The pop-rule-removed mutation reds §4 (fixture) — the nesting behaviour is held by a committed test even though §5 is not that test.

### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0
- `boundary: false`, unchanged. Refute pass probed `_WARNED_COMMENT_ORIGINS` for wrongful suppression: key is (repo-relative path, line, target), so the same origin seen from a second bundling skill is a genuine duplicate and distinct origins never collide.

### Maintainability — PASS
CR-4 is a test that overclaims, not lost coverage; §4 carries the nesting proof. CR-5/CR-6 cosmetic.

---

## Code Review

Dispatched read-only reviewer, **refute directive** (cycle 2), whole-branch diff; `dispatched 18:12 → returned 18:19` (budget 10 min). `CR_BLOCKING=true`.

**Correctness bugs (2):**
- [medium/high] `tests/fenced-bash-positional-params.test.js:281` §5 tautology → line-level coverage assertion. **CR-4, promoted.**
- [low/medium] `tests/fenced-bash-positional-params.test.js:125` info-string fence inside a runnable block → treat as content; heredoc fixture. CR-5, advisory.

**Cleanups (1):**
- `skills/develop-next/scripts/select-next.mjs:154` → orphaned vendored copy; delete it (CR-6).

**Mutation proofs (Step 3c, QA-run):**
- mutation-proven: stack push restricted to depth 0 → `§4 the fence parser sees tokens` and `§5` went red → `covered` (nesting behaviour) — but note §5 reds on *this* mutation only because pushes are dropped; it does **not** red when only the pop rule is removed (CR-4)
- mutation-proven (reviewer, QA re-ran): pop rule removed → §4 red, §5 green → §5 `mutation-void` for fence-state loss
- mutation-proven: `bundle-dependency:` line → prose path in `defer-mutation.js` → `bundle-comment-origin §2` red once (dedupe) → `covered`

---

## Step 4b: Documented Commands

Re-review scope (files changed since gate 1): `bundle_skill.py`, the two test files, task documents — **no runnable prose changed since cycle 1**; cycle 1's Step 4b results stand (every edited block was awk, refused fail-closed; equivalence verified by direct bash+zsh execution).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3410/0/1 |
| `bundle_skill.py --check` (read-only, with a reintroduced origin) | prints the origin once; live tree 0 problems |
| Guard self-checks §1–§5 | PASS on the live tree |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
node --test tests/fenced-bash-positional-params.test.js   # + pop-rule-removed and push-at-depth-0 mutations
node --test tests/bundle-comment-origin.test.js
python3 skills/create-skill/scripts/bundle_skill.py --check   # with one origin reintroduced, then restored
node -e '…runnableLines over five adversarial fence shapes…'
node -e '…discover_needed vs on-disk references/ for every skill…'   # CR-6 audit
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-4 — rewrite §5 as a line-level coverage assertion; mutation-prove it against the pop-rule-removed reader.

### Short-term Actions (Non-Blocking)
1. CR-5 — info-string fence inside a runnable block is content; add the heredoc fixture.
2. CR-6 — delete `skills/develop-next/references/document-status-lifecycle.md`; file the 12 pre-existing unreached copies as an observation.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: cycle-1 findings closed; one new medium finding — a parity test that cannot fail — promoted under `code_review_blocking`. NFRs PASS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-4 fixed.

---

**QA Report**: co-located at `task.119.qa.2.create-skill-authoring-guards.md`
**Gate File**: co-located at `task.119.gate.2.create-skill-authoring-guards.yml`
**Next Steps**: `/qa-fix` on CR-4 (plus CR-5/CR-6), then cycle 3 re-review.
