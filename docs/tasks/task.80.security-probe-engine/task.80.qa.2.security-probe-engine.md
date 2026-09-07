# QA Report: Task 80 — Cycle 2 (refute pass)

**Task**: [task.80.security-probe-engine.md](./task.80.security-probe-engine.md)
**Gate File**: [task.80.gate.2.security-probe-engine.yml](./task.80.gate.2.security-probe-engine.yml)
**Previous Gate**: [task.80.gate.1.security-probe-engine.yml](./task.80.gate.1.security-probe-engine.yml) — CONCERNS, 60/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-07
**PR**: [#337](https://github.com/Gamaroff/agent-skills/pull/337) — OPEN · fix commit `0495eed1`
**Gate Status**: CONCERNS

---

## Executive Summary

**All four gate-1 findings are genuinely fixed** — each re-executed independently, and each mutation-proved by reverting it and confirming exactly the guarding test goes red.

The refute pass found **two new MEDIUM issues, both latent and both pointed at the declared consumer**. Neither is visible from the tests, and neither would have surfaced by re-reading cycle 1's fixes in isolation:

1. The timeout fix closed the **CLI** path and left the **API** path open — and `task.81` calls the API.
2. The new import into `tests/` will **crash `npm run bundle`** the moment any skill references this module.

That is what a refute pass is for. Both are the same shape: a fix that satisfies the finding as written while leaving the mechanism reachable by the route the consumer actually takes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Gate-1 finding | Status | Verification |
| --- | --- | --- |
| **TASK80-001** `--timeout` unvalidated | **PARTIAL** | CLI verified fixed: all eight bad values (`abc`, `0`, `-1`, `1.5`, `1e3`, `0x10`, `+5`, and the flag with no value) return **exit 2**, no crash. But the *mechanism* the finding named survives on the API path → **TASK80-005**. |
| **TASK80-002** `escapes` undefined on 4/5 paths | **FIXED** | All five result paths return an **identical key set**, and `escapes` is an array on every one. |
| **TASK80-003** escape invisible in default output | **FIXED** | The summary now reads `… declined 0, ESCAPED 12`, and an escape forces **exit 1 even on an `engages` verdict**. Consistent between the plain and `--json` paths. |
| **TASK80-004** parity block's scope claim | **FIXED** | Comment narrowed; five destructive commands with no deny-pattern (`rm README.md`, `mv`, `cp -r`, `truncate`, `install -m 777`) all classify `mutating`. |
| *(new in cycle 1, from a repo guard)* exit-after-write in the child runner | **FIXED** | Faithful reversion reds `stdout-drain-on-exit.test.mjs` at the restored line. All four runner arms remain distinguishable. |

Grading TASK80-001 **PARTIAL rather than FIXED** is deliberate. The finding's text named `:460`, and `:460` is fixed. Its *impact* statement — "silently removes the containment §9 criterion 6 requires" — is still reachable, just not through the flag. Grading the wording rather than the mechanism is how a loop closes findings while the defect stays.

---

## New Findings This Cycle

**TASK80-005 — the timeout fix is CLI-only; the API the consumer uses is still unvalidated** `[MEDIUM]`

`shared/resources/security-probe.mjs:294` — `const perCaseTimeout = timeoutMs ?? budget.timeoutMs;`

Validation was added to `main()`, so the *flag* is safe. `runProbeSpec` still accepts `timeoutMs` from a programmatic caller and passes it to `spawnSync` unchecked. Demonstrated:

```
runProbeSpec({..., timeoutMs: NaN})  with a non-empty case list
  → RangeError: The value of "timeout" is out of range. It must be an integer. Received NaN
runProbeSpec({..., timeoutMs: 0})
  → reaches spawnSync as "no timeout"
```

`task.81` is the declared consumer and will call the function, not the CLI — so the fix landed on the path that was reported and missed the path that matters.

→ Move the check to where `perCaseTimeout` is resolved, keeping the CLI's `return 2` on top for the argument-shaped report.

**TASK80-006 — the new `tests/` import will crash `npm run bundle`** `[MEDIUM]`

`shared/resources/security-probe.mjs:46` — `import { spawnBudget, neverRan, readInt } from "./tests/spawn-budget.mjs";`

Two problems, one of which is a hard failure:

- A **production module importing from a `tests/` directory** is an inverted dependency. Cycle 1 widened it by exporting `readInt` specifically so production could use it.
- `bundle_skill.py` **will fail** on it. Its `JS_ESM_SIBLING_RE` allows `/` in the captured path, so it picks up `tests/spawn-budget.mjs` as a transitive dep; the copy loop then does `dst = refs_dir / name` → `references/tests/spawn-budget.mjs`, while only `references/` is ever created. Reproduced deterministically:

  ```
  FileNotFoundError: [Errno 2] No such file or directory:
    .../references/tests/spawn-budget.mjs
  ```

This does not fire today only because **no skill references `security-probe.mjs` yet**. `task.81` is precisely the change that triggers it — so the failure is scheduled to land on the consumer's first integration, not on this task's tests.

→ Preferred: move the budget helpers out of `tests/` into a non-test shared module. Also worth doing (but outside this task's scope): `dst.parent.mkdir(parents=True, exist_ok=True)` in the bundler, which fixes the whole class.

**LOW — the exit-after-write guard is proximity-based**

`shared/resources/tests/stdout-drain-on-exit.test.mjs:319` — `LOOKBACK_CHARS = 1200`. `findExitAfterWrite` reports a `process.exit(` only when a write appears within the preceding 1200 characters. An exit-after-write separated by more than that is not detected. Found while mutation-proving: a first reversion attempt placed the exit outside the window and the guard stayed green; a faithful reversion reds it correctly. **Not a task.80 defect**, and no change requested here — recorded because the guard's reach is easy to over-estimate.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: Extract the containment | **PASS** | Unchanged since cycle 1 apart from the parity-test additions. 98/98. |
| Phase 2: The probe runner | **CONCERNS** | Both new findings live here — the timeout validation boundary and the import direction. |
| Phase 3: Verdicts | **PASS** | Untouched by cycle 1's fixes; re-verified across all four verdicts. |
| Phase 4: Tests and mutation proofs | **PASS** | 21 tests (was 18). Every cycle-1 fix has a guarding test, and each was proved by reversion. |

**Overall**: 4/4 complete, 1 with concerns.

---

## Code Review

**Step 3b — whole-branch diff, refute pass** (`PRIOR_GATES=1` → `REFUTE_PASS=true`). Reviewed to find the false claim, starting with cycle 1's fixes as the least-reviewed code in the change set.

The four lifecycle transitions were probed where the diff touches them:

| Transition | Result |
| --- | --- |
| **Bulk teardown** | `rmSync(sandboxRoot, {recursive, force})` runs in a `finally`, so the temp tree is removed even when a case throws. Verified empirically: **zero `security-probe-*` directories left behind** after an escaping run that writes on all 12 cases. |
| **In-flight** | Not applicable in the meaningful sense — cases run strictly serially and each child is independent. No queue, no shared mutable state between cases. |
| **Error path** | This is where TASK80-005 lives: a bad `timeoutMs` throws *out of* `runProbeSpec` rather than being reported as a decline, so the caller gets an exception instead of a result. Note the `finally` still runs, so no temp dir is stranded. |
| **Reconnect** | Not applicable — no connection is held. |

**Combination of the fixes** (reviewed as one change, per the directive): the escape-exit rule and the uniform result shape interact correctly — `escapes` is always an array, so `result.escapes?.length ?? 0` in `main()` cannot throw regardless of which path produced the result. Had TASK80-002 been fixed without TASK80-003, or vice versa, this would have been a live crash on the decline paths. They were landed together, which is why it is not.

**Correctness bugs (2):**

- [medium/high] `shared/resources/security-probe.mjs:294` — `timeoutMs` unvalidated on the API path → validate where `perCaseTimeout` resolves. **Promoted to gate as TASK80-005.**
- [medium/high] `shared/resources/security-probe.mjs:46` — production import from `tests/` breaks `bundle_skill.py` on a nested sibling dep → move the helpers, and/or create nested parents in the bundler. **Promoted to gate as TASK80-006.**

**Cleanups (1):**

- `shared/resources/security-probe.mjs` — `escapes` accumulates one entry **per case** for the same escaped path (12 entries for one file across a 12-case run). Harmless, and the count is arguably informative, but a consumer wanting "which paths escaped" must de-duplicate. Advisory only.

### Step 3c — Mutation-Proof Spot Check

Every test guarding a cycle-1 fix was proved by reversion, independently of the fix summary:

| Reverted behaviour | Tests red | `mutation-proven` |
| --- | --- | --- |
| `--timeout` validation → bare `Number()` | 1 | **yes** |
| `escapes: []` removed from `base` | 1 | **yes** |
| escape exit-code guard removed | 1 | **yes** |
| exit-after-write restored in the runner | 1 (`stdout-drain-on-exit`) | **yes** |

The last one required care and is worth recording: a first, **unfaithful** reversion placed `process.exit(0)` more than 1200 characters after the write and the guard stayed green. A faithful reversion — restoring the per-arm `emit(); process.exit(0);` shape — reds it at `security-probe.mjs:L100`. Reporting the first attempt as "not proven" would have been wrong; so would reporting a green suite as proof.

---

## Success Criteria Verification

All seven §9 safety criteria re-verified on the post-fix tree; all still hold. Cycle 1 **strengthened** the safety axis rather than weakening it — an escaping probe can no longer exit 0 on an `engages` verdict, closing a route by which a contained-but-escaping run could report success.

| Criterion | Cycle 1 | Cycle 2 |
| --- | --- | --- |
| No interpreter on `SAFE_COMMANDS` | PASS | **PASS** (+ allow-list fail-closed now tested) |
| Out-of-root rejected before import | PASS | **PASS** (re-proved with the top-level-sentinel fixture) |
| Inputs never reach a shell | PASS | **PASS** |
| Zero cases → `unverifiable`, exit 1 | PASS | **PASS** |
| `declined` its own state | PASS | **PASS** |
| Timeout from `spawnBudget()` | PASS w/ caveat | **PASS** on the CLI; caveat moved to TASK80-005 for the API |
| Extraction behaviour-preserving | PASS | **PASS** — 98/98 + replay 8/8 |

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` | **PASS** — 21/21 |
| `qa-execute-snippets.test.mjs` | **PASS** — 98/98 |
| `snippet-classifier-fail-open-replay.test.mjs` | **PASS** — 8/8 |
| `stdout-drain-on-exit.test.mjs` | **PASS** — 10/10 |
| `test-harness-concurrency.test.js` | **PASS** — 16/16 |
| Full `npm run ci:fast` | **PASS** — 2568 tests, 0 failures |

**Targeted total: 153/153.** No regression from cycle 1's fixes; `spawn-budget.mjs` gaining an export changed nothing for its existing callers (every suite that imports it is green).

---

## Review Methodology

Direct tools. **Re-review scope: unscoped (cycle 2 refute pass)** — the whole `origin/develop...HEAD` diff, per the Step 3b rule that cycle 2 re-reads the original change with what cycle 1 learned rather than reading only the repairs.

`SAFETY_REPROBE=false` — gate 1's `nfr_validation.security.status` is PASS and no `top_issue` named a safety-criterion failure. The unscoped cycle-2 diff already covered the full surface.

**Step 4b: not applicable** — no runnable prose in the change set (`probe-boundary-rule.md` carries 0 fenced bash blocks; no `SKILL.md` touched).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100 *(100 − 10 × 2 MEDIUM; was 60)*

**Rationale**: Cycle 1 closed every finding it was given and did so properly — each fix is real, each is mutation-proved, and the safety axis is stronger than before. The gate stays CONCERNS because the refute pass found two *new* MEDIUM issues rather than because the old ones persist. Both are latent, both target the declared consumer, and both share a shape worth naming: **a fix that satisfies the finding as written while leaving the mechanism reachable by the route the consumer actually takes.**

**Deployment Recommendation**: CONDITIONAL
**Conditions**:
- **TASK80-005** — `task.81` calls the API, and the API can still crash on a bad timeout.
- **TASK80-006** — `npm run bundle` will fail on the first skill that references this module, which is `task.81`.

---

**Next Steps**: `/qa-fix` for the two new findings, then re-review (cycle 3).
