# QA Report: Task 64 — Cycle 3 (final re-review)

**Task**: [task.64.loop-supervisor-dashboard-and-docs.md](./task.64.loop-supervisor-dashboard-and-docs.md)
**Gate File**: [task.64.gate.3.loop-supervisor-dashboard-and-docs.yml](./task.64.gate.3.loop-supervisor-dashboard-and-docs.yml)
**Previous**: [gate 1](./task.64.gate.1.loop-supervisor-dashboard-and-docs.yml) CONCERNS 50/100 → [gate 2](./task.64.gate.2.loop-supervisor-dashboard-and-docs.yml) CONCERNS 90/100
**Review Date**: 2026-08-29
**Gate Status**: PASS
**Quality Score**: 100/100

---

## Executive Summary

All twelve findings across three cycles are closed, and every one that can be held by a test **is** held by a test that has been shown to fail. The single outstanding item from cycle 2 — a credential boundary enforced by nothing — is now a pure exported function with the mutation that previously killed zero tests killing two.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

Scope: `a568539` (the only commit since gate 2).

| Cycle-2 issue | Status | Verified by |
|---|---|---|
| QA-12 child-env token strip held by nothing | ✅ **CLOSED** | mutation — removing the strip kills **2** (was 0); over-stripping the environment also kills **2** |

No regressions. No new findings.

### Why the second mutant matters

A single "the token is gone" assertion would have passed against a `childEnvFor` that returned `{}`
— stripping the token *and* `PATH`, the API key and `TERM`, breaking every spawned iteration while
looking correct to the test. The over-stripping mutant is what makes the boundary meaningful in both
directions, and it was added because the first direction alone is the shape of a test that passes for
the wrong reason.

---

## Adversarial pass over the cycle-2 fix

`childEnvFor` is a pure function over a plain object; the four transition probes (bulk teardown,
in-flight computation, error path, reconnect) have no purchase on it. The `spawn` call site is a
straight substitution — verified by reading `git diff c717386..a568539`, which is 21 added lines and
one changed option. Nothing introduced.

---

## Findings across all three cycles

Twelve findings, all closed. The through-line is a single failure mode, and it is precisely the one
this task was written to prevent: **coverage claimed where none existed.**

| # | Finding | Cycle | Closed by |
|---|---|---|---|
| QA-1 | Frame published the whole append-only ledger, breaking the contract this change authored | 1 | `pushRunFrame` filters on `runId` |
| QA-2 | Token-absence test could not fail | 1 | replaced with one driving the real push path |
| QA-3 | SC2 proved one level below where the criterion states it | 1 | six run-level failure modes via `assert.doesNotReject` |
| QA-4 | Risk Assessment named a gate that never opened the file it protected | 1 | `collectDocs()` widened; mutation-proved on both file classes |
| QA-5 | Token inherited by every spawned child | 1 | stripped from the child environment |
| QA-6 | Double-SIGINT left the dashboard live forever | 1 | best-effort closing frame on a 1.5s leash |
| QA-7 | `pushFrame` unguarded | 1 | folded into `pushRunFrame` |
| QA-8 | Env fallback inferred presence instead of tracking it | 1 | `explicit.has(...)` |
| QA-9 | `repoUrl` published unredacted | 1 | `redactRemoteUrl()` |
| QA-10 | Live-network test in the default glob | 1 | gated behind an env var |
| QA-11 | Unserialisable test survived removal of its guard | 1 | `res.reason` pinned |
| QA-12 | Child-env strip real but held by nothing | 2 | `childEnvFor()` extracted + 3 tests |

**Two further defects were introduced by the fixes themselves** and caught before CI — a third-SIGINT
re-entrancy bug (found by the dev-side adversarial pass) and a QA report linking gitignored scratch
(found by checking the tracked tree rather than the working tree). Both are recorded as findings of
their cycle rather than fixed silently.

---

## Success Criteria — final

| # | Criterion | Status |
|---|---|---|
| 1 | Posts the documented payload each boundary, ending `active: false` | ✅ PASS |
| 2 | Three failure modes warn once, run outcome + exit status unchanged, **proved by test** | ✅ PASS — six modes, at the run level |
| 3 | README documents the payload, both consumer warnings | ✅ PASS |
| 4 | Runbook: nothing → completed run, halts, caps, triage | ✅ PASS |
| 5 | `claude --resume <uuid>` documented | ✅ PASS |
| 6 | Per-iteration cost stated plainly with the prompt-cache caveat | ✅ PASS |
| 7 | develop-next points at the fresh-context alternative | ✅ PASS |
| 8 | executable-instructions, link check, `npm test`, `format:check` green | ✅ PASS — and the gate now scans the artefacts it names |

**8/8 full.**

---

## NFR Assessment

**Security — PASS.** Both leak paths closed and both mutation-proved: the token never reaches the
frame body, the child environment, or a log; `repoUrl` userinfo is stripped.
**Performance — PASS.** The push is bounded and off by default; `repoUrl` resolves only under `--dashboard`.
**Reliability — PASS.** `pushRunFrame` is mutation-proved to swallow every failure mode including
throwing inputs, so the observer cannot reach the run's exit path.
**Maintainability — PASS.** Every test that reported coverage it did not have is replaced, and each
replacement has been shown to fail.

---

## Verification

```
npm test                 1870 — 1869 pass, 1 skipped (gated live-network), 0 fail
format:check             clean
npm run bundle           no drift
links                    100 paths + 26 anchors; verified in the TRACKED tree
mutation proving         8 invariants probed across cycles 2–3, all 8 proved
```

CI on the head commit is recorded in the gate file's `evidence.ci` field.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100

**Rationale**: Zero outstanding findings, 8/8 criteria full, all four NFRs PASS, and — the standard
this particular task set for itself — every load-bearing property proved by a test that has been
demonstrated capable of failing.

**Deployment Recommendation**: APPROVED.
