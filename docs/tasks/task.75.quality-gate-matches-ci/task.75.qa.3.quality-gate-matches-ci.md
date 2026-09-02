# QA Report: Task 75 — Cycle 3 (Verification)

**Task**: [task.75.quality-gate-matches-ci.md](./task.75.quality-gate-matches-ci.md)
**Gate File**: [task.75.gate.3.quality-gate-matches-ci.yml](./task.75.gate.3.quality-gate-matches-ci.yml)
**Review Date**: 2026-09-01
**PR**: [#291](https://github.com/Gamaroff/agent-skills/pull/291) · `ccc62d9`
**Gate Status**: **PASS** (100/100)

---

## Re-Review Context

Cycle 3 is scoped to what changed since `gate.2` — cycle 2's fixes.

| Finding | Cycle | Severity | Status |
| --- | --- | --- | --- |
| **TASK-75-001** — fast-gate block ordered before step 0 | 1 | medium | **FIXED** — verified `0 → 0a → 1` at lines 506 / 511 / 547, not regressed by cycle 2 |
| LOW — `workflowScripts()` dropped unknown scripts | 1 | low | **FIXED** — `workflowInvocations()` split out, assertion added |
| **TASK-75-002** — parity scan read the whole file, not the `test` job | 2 | medium | **FIXED** — `jobBlock()` at :124, both call sites scoped at :147 and :172 |
| **TASK-75-003** — step 0a claimed a bound MAX_ITER never gave it | 2 | low | **FIXED** — explicit 2-attempt budget at :531 |

**The one occurrence of the old false phrase is deliberate.** `grep` still finds "the MAX_ITER cap still bounds the loop" once, at line 535 — inside the replacement, negated: *"An earlier revision of this block claimed … it does not bound this retry."* Verified in context rather than counted; a naive grep would have read this as an incomplete fix.

---

## Verification

| Check | Result |
| --- | --- |
| Parity suite | 10/10 PASS |
| `npm run ci:fast` (gate attempt 2) | prettier clean, **2094 pass / 0 fail**, zero timeouts |
| TASK-75-001 not regressed by cycle 2's edits to the same file | PASS |
| Success criteria (all functional / regression / safety) | PASS — re-verified mechanically |

### Mutation proofs — 10 across three cycles

| # | Mutation | Result |
| --- | --- | --- |
| M1–M3 | Remove `format:check` / `npm test` / `eval:all` from the composite | 🔴 5 / 3 / 7 tests |
| M4 | CI step added that the composite does not call | 🔴 |
| M5 | CI collapsed into one opaque step | 🔴 |
| M6 | `develop-batch` table left at `npm test` | 🔴 |
| M7 | Step doc hardcodes the literal instead of the config key | 🔴 |
| M8 | Workflow invokes a nonexistent script | 🔴 |
| M9 | Second job invoking an unrelated npm script | 🟢 *(correct — CI is happy, so the test must be)* |
| M10 | `test` job renamed → scan would go empty | 🔴 |
| **M9-pre** | **M9 with the cycle-2 scoping fix reverted** | 🔴 — wrongly demands `validate:all` of the composite |

M9-pre is the load-bearing one: it proves the cycle-2 fix removes a real false failure rather than restating behaviour the test already had. Baseline green before and after every mutation.

---

## NFR Assessment — all PASS

Both cycle-2 CONCERNS are resolved. **Reliability**: the inner gate retry now carries a real budget instead of naming a bound that never governed it. **Maintainability**: the parity scan reads what it documents. Security and Performance unchanged from cycle 1; tiering was additionally verified at runtime in cycle 2.

---

## A note on the process, since it is the point of this task

The gate this task introduces governed its own delivery three times:

1. **`npm run ci` went red on first run**, on `prettier --check` against the new test file — the exact task-67 shape, caught before push instead of in CI afterwards.
2. **The cycle-2 fast gate went red**, and no commit was made on it. The 2-attempt budget added *in that same cycle* is what decided the retry.
3. **The cycle-2 refute pass** found two defects a narrowed re-read would have walked past — both correct in the state that exists today and wrong the moment a second job or an unfixable gate appears.

---

## Carried forward — three out-of-scope findings

None gate this task; all are recorded in `gate.3` under `recommendations.future`.

1. **`qa-execute-snippets.mjs` silently no-ops through its own documented symlinked path** (HIGH). Exit 0, zero output. `select-next.mjs:1486` already carries the exact fix *and a comment describing this defect*. Warrants a general bug report.
2. **`access-config-parity` flake on the merge path.** Failed 2 of 3 full runs under load (`spawnSync ETIMEDOUT`), 32/32 in isolation twice. This task promotes that suite to a mandatory pre-merge gate — which is precisely what makes its reliability matter.
3. **`develop-bug`'s per-cycle fix loop has no fast gate.** Its develop loop does, via the shared step-3 document.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

**Rationale**: Every finding raised across three cycles is closed and independently verified. The work is complete against its own success criteria, the contract test that holds it is genuinely mutation-proved rather than merely green, and the three residual findings are honestly scoped out rather than quietly folded in.
