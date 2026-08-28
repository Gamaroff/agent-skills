# QA Report: Task 64 — Publish the supervisor run over HTTP, and the operator docs that make an overnight run repeatable

**Task**: [task.64.loop-supervisor-dashboard-and-docs.md](./task.64.loop-supervisor-dashboard-and-docs.md)
**Gate File**: [task.64.gate.1.loop-supervisor-dashboard-and-docs.yml](./task.64.gate.1.loop-supervisor-dashboard-and-docs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-29
**Gate Status**: CONCERNS
**Quality Score**: 50/100

---

## Executive Summary

The implementation is complete and CI is fully green. All five phases landed, all eight success criteria are met in substance, and the documentation is unusually thorough and internally consistent. The gate is CONCERNS rather than PASS for one reason and one only: **this is a task whose entire stated thesis is that the failure policy is proved rather than assumed, and three of its proofs do not reach as far as they claim.** One of them cannot fail at all.

Plus one real bug that no criterion would have caught: a dashboard frame publishes the whole append-only ledger rather than this run's rows, which breaks the payload contract the same change authored.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All five implementation phases completed and checked
- [x] Tests passing — 1856/1856 locally, and the same suite green in CI
- [x] Breaking changes documented (none — two optional flags, inert without `--dashboard`)
- [x] Code on `feature/task.64.loop-supervisor-dashboard-and-docs` with open PR [#278](https://github.com/Gamaroff/agent-skills/pull/278)

### Testing Approach

- [x] Automated testing (unit) — full suite plus the new 22-test file
- [x] **Mutation proving** — three deliberate mutations to confirm the new tests can fail
- [x] Diff code review (Step 3b, adversarial, read-only subagent, blocking mode)
- [x] Traceability mapping of all 8 success criteria to evidence
- [x] Regression testing (full suite)
- [x] Security review
- [ ] Performance testing — not applicable; the push is bounded and off by default

### Review Methodology

Direct tools for the document-anchored checks, plus two independent read-only subagents: a traceability mapper over the eight success criteria and an adversarial diff code review. **Every finding either subagent returned was re-verified against the source before being accepted into this report** — three were checked line by line (`pushFrame`'s ledger call, the `spawn` options object, the double-SIGINT handler), and the `collectDocs()` scope claim was read directly out of `tests/executable-instructions.test.js`. Nothing here rests on a subagent's word.

Traceability matrix: [`.summaries/qa-traceability-matrix.md`](./.summaries/qa-traceability-matrix.md).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1 — the push | CONCERNS | Verified | Lands as designed, but the frame is built from an unscoped ledger (QA-1) |
| Phase 2 — prove the failure policy | CONCERNS | Verified (partial) | Proved at `pushDashboard`; the criterion states it at the run level (QA-3) |
| Phase 3 — the contract in the README | PASS | Verified | Complete, accurate, both consumer warnings present |
| Phase 4 — the runbook | PASS | Verified | Complete and indexed; not covered by the gate the task named (QA-4) |
| Phase 5 — cross-references and gates | PASS | Verified | Both pointers land; bundle clean; CI green |

**Overall Phase Completion**: 5/5 complete, 2 with issues.

---

## Success Criteria Verification

| # | Criterion | Coverage | Status |
|---|---|---|---|
| 1 | Posts the documented payload each boundary, ending `active: false` | partial | CONCERNS — builder well covered; `pushFrame` and its three call sites have no test, and the frame is built from an unscoped ledger |
| 2 | Three failure modes each warn once, run outcome + exit status unchanged, **proved by test** | partial | CONCERNS — the warn-once half is proved and mutation-proven; the "run outcome and exit status" half is asserted nowhere |
| 3 | README documents the payload well enough to build the consumer, both warnings | full | PASS |
| 4 | Runbook takes an operator from nothing to a completed run | full | PASS |
| 5 | `claude --resume <uuid>` documented | full | PASS |
| 6 | Per-iteration re-prime cost stated plainly with the prompt-cache caveat | full | PASS — stated in three places that agree rather than compete |
| 7 | develop-next SKILL.md and README point at the fresh-context alternative | full | PASS |
| 8 | executable-instructions, link check, `npm test`, `format:check` green | partial | CONCERNS — all four are green, but the named gate does not scan the artefacts it was named for |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Test suite | green | 1856/1856 | PASS |
| CI (4 checks) | green | test, link-check, validate, branch-policy all pass | PASS |
| Formatting | clean | `prettier --check .` clean | PASS |
| Bundle sync | no drift | `npm run bundle` in sync | PASS |
| Link integrity | no dead links | 94 paths + 26 anchors verified; CI link-check green | PASS |

> The link check earned its place this cycle. The first push went red on a dead in-page anchor: an em-dash in `## Rehearse first — it costs cents` makes GitHub's slug `rehearse-first--it-costs-cents` with a doubled hyphen. The pre-push check stripped `#fragments` and so verified paths only. Fixed in `c3532e9`, and the check was widened to resolve anchors — including cross-file `file.md#heading` targets.

---

## Breaking Changes Validation

### Breaking Change: none declared

Documented: Yes (explicitly "None")
Migration Path Provided: N/A
Consumer Code Updated: N/A
**Verified**: The two flags default to `null`; `pushFrame` returns immediately when `opts.dashboard` is unset. Existing behaviour is unreachable from the new code path.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### MEDIUM Severity Issues (5)

**QA-1 — Dashboard frames publish the entire append-only ledger, not this run's rows**
- **Category**: Functional
- **Observation**: `pushFrame` passes `readLedger(cwd)` straight into `buildDashboardPayload`. `readLedger` contains no `runId` filter, and `runs.jsonl` is append-only across runs — nothing truncates it per run.
- **Impact**: On any second run in the same working tree, the frame's six outcome counts and its `recent` rows span every previous run, while `totals.iterations` comes from this run's live counter. The two disagree. This breaks the contract the same change authored in README — *"cumulative for the run"* and *"sum to `iterations`"* — and a fresh run's first frames render last night's iterations as current.
- **Recommendation**: `readLedger(cwd).filter((r) => r && r.runId === runId)`. Every ledger row already carries `runId`.
- **Ref**: `skills/loop-supervisor/scripts/run-loop.mjs:1150`

**QA-2 — The token-absence test cannot fail**
- **Category**: Quality / Security
- **Observation**: The test builds a payload with no token input of any kind — `buildDashboardPayload` has no token parameter — and asserts the literal `"s3cret"` is absent from the serialisation.
- **Mutation-proved**: deleting `if (token) headers[DASHBOARD_TOKEN_HEADER] = token;` from `pushDashboard` entirely left this test **green**; only the separate header test went red.
- **Impact**: The Risk Assessment rates this leak Low/**HIGH** and mitigates it with "asserted by test". No such assertion exists. A future field that copied `opts.dashboardToken` into the frame would ship green.
- **Recommendation**: Drive it through the real path — assert the `pushDashboard` request **body** is token-free while the header carries it.
- **Ref**: `evals/loop-supervisor/unit/dashboard.test.mjs:170`

**QA-3 — SC2 is proved one level below where the criterion states it**
- **Category**: Quality
- **Observation**: SC2 requires each failure mode to "leave the run's outcome and exit status unchanged — each proved by a test, not by inspection". The three tests assert only `res.pushed === false` and `warnings.length === 1` on `pushDashboard`. No test exercises `pushFrame` or a run.
- **Impact**: The guarantee rests on reading that `await pushDashboard(...)` has no `catch` at its call site. That is inspection — the posture the task's own Motivation says it is closing.
- **Recommendation**: A runner-level test driving the loop with an unresolvable dashboard URL, asserting the run's outcome and exit status match the same run without `--dashboard`.
- **Ref**: `evals/loop-supervisor/unit/dashboard.test.mjs:242,264,282`

**QA-4 — The gate named as the runbook mitigation does not scan the runbook**
- **Category**: Quality
- **Observation**: `collectDocs()` collects `shared/resources/*.md`, `skills/*/SKILL.md` and `skills/*/references/*.md`. It does not collect `docs/runbooks/**` or `skills/*/README.md`.
- **Impact**: The Risk Assessment says "`tests/executable-instructions.test.js` is exactly this gate" for *"Runbook documents commands that do not ship"*. The two documents this task created and expanded — both full of `node .agents/skills/.../run-loop.mjs` invocations — are not scanned by it. A stated mitigation that does not fire is worse than none, because it stops anyone looking further.
- **Recommendation**: Extend `collectDocs()` to include `docs/runbooks/*.md` and `skills/*/README.md` and fix what it surfaces; or correct the Risk Assessment to stop claiming coverage that does not exist.
- **Ref**: `tests/executable-instructions.test.js:105-127`

**QA-5 — The dashboard token is inherited by every spawned child**
- **Category**: Security
- **Observation**: `applyConfig` reads `$LOOP_SUPERVISOR_DASHBOARD_TOKEN` into the supervisor's environment; each iteration is spawned with `spawn(claudeBin, args, { cwd, stdio })` — **no `env` option** — so the child inherits it, as does anything the child shells out to.
- **Impact**: The child is an agent with Bash access writing `iter-NNN.txt` and `iter-NNN.jsonl` to disk. One `env` or `printenv` in a tool call writes the token into a log file, contradicting the README's "never in a log line". Latent in this repo (no token is set), live for anyone who follows the documented env-var recommendation.
- **Recommendation**: Pass an explicit child `env` to `spawn` that strips the variable.
- **Ref**: `skills/loop-supervisor/scripts/run-loop.mjs:1230`

### LOW Severity Issues (6)

- **QA-6** — Double-SIGINT calls `cleanup()` then `process.exit(130)` without a final frame, leaving the dashboard at `active: true` with a live `current` forever — the exact state the final-frame comment says it prevents. `run-loop.mjs:1079`
- **QA-7** — `pushFrame` has no `try`/`catch` and the async IIFE awaiting it has no rejection handler, so a throw from its inputs (or an EPIPE from the default stderr `warn`) could abort before the run's summary and `process.exit`. The invariant "the observer can never affect the run" is not airtight. `run-loop.mjs:1364`
- **QA-8** — The env fallback gates on `!opts.dashboardToken` (falsiness) while `dashboardUrl` above it uses the tracked `explicit` set, so `--dashboard-token ''` is silently overridden. This is the "presence must be TRACKED, never inferred" failure the comment at `run-loop.mjs:186` warns about. `run-loop.mjs:345`
- **QA-9** — `repoUrl` is published verbatim, so an HTTPS remote with embedded credentials would ship them to the dashboard each boundary. Latent here (SSH remote). `run-loop.mjs:1132`
- **QA-10** — The live-network test performs a real DNS lookup inside the default `npm test` glob; a resolver that hijacks NXDOMAIN fails it for environmental reasons. `dashboard.test.mjs:305`
- **QA-11** — The unserialisable-payload test asserts only `pushed`/`warnings`, unlike its siblings which pin `res.reason`; deleting the inner `JSON.stringify` guard produces an identical observable result. `dashboard.test.mjs:322`

**Total Issues**: HIGH: 0, MEDIUM: 5, LOW: 6

---

## NFR Assessment

### Performance — PASS
The push is bounded by a 5s timeout and fires only at iteration boundaries, three times per iteration at most. One eager `git remote get-url origin` runs per invocation even without `--dashboard`; negligible, noted as a cleanup.

### Reliability — CONCERNS
The warn-and-continue policy is genuinely proved at the `pushDashboard` level, and **mutation-proving confirms it**: rethrowing instead of warning kills 3 tests; dropping the non-2xx check kills 1. Against that, `pushFrame` is unguarded (QA-7) and the double-SIGINT path leaves a stale active frame (QA-6).

### Security — CONCERNS
Three latent paths, none live in this repo: the token reaching every child process (QA-5), `repoUrl` userinfo (QA-9), and a mitigation asserted by a test that cannot fail (QA-2). The design intent — token in a header only, never in config, never in a frame — is right; the enforcement has gaps.

### Maintainability — CONCERNS
Documentation is thorough, accurate, and consistent across README, SKILL.md and the runbook, with measured figures rather than hand-waving. The concern is narrower: two tests report coverage that is not there, on a task whose thesis is proving rather than assuming.

---

## Code Review

Adversarial diff review over 14 files, blocking mode (`code_review_blocking=true`). **11 findings — 4 bugs, 7 cleanups.** Five were promoted to gate `top_issues`.

**Correctness bugs (4):**
- [medium/high] `run-loop.mjs:1150` — frame publishes the whole append-only ledger → filter by `runId` (**QA-1**)
- [medium/medium] `run-loop.mjs:1230` — token inherited by every spawned child → strip from child env (**QA-5**)
- [low/medium] `run-loop.mjs:1132` — `repoUrl` published unredacted → strip userinfo (**QA-9**)
- [low/high] `run-loop.mjs:1079` — double-SIGINT skips the final frame (**QA-6**)

**Cleanups (7):** vacuous token test (**QA-2**); unserialisable test survives removal of its guard (**QA-11**); live-network test in the default glob (**QA-10**); unguarded `pushFrame` (**QA-7**); env fallback not using the `explicit` set (**QA-8**); eager `git` subprocess; JSDoc for `startedAt` disagrees with the published contract.

### Mutation proving (Step 3c)

| Invariant | Mutation applied | Tests killed | Proven |
|---|---|---|---|
| Warn-and-continue on any failure | `throw e` in the outer catch | 3 | ✅ yes |
| Non-2xx detected as failure | `if (false)` for the `!res.ok` check | 1 | ✅ yes |
| Token sent in the header | header assignment deleted | 1 (the *header* test) | ✅ yes |
| **Token absent from the frame** | header assignment deleted | **0** | ❌ **no — vacuous** |

Source file restored and re-verified green (22/22) after each mutation.

---

## Regression Testing

Full suite run twice (pre-PR and during QA): 1856/1856 both times, 8 suites. CI ran the same suite independently on `c3532e9` and passed. The change adds new exported functions and two new flags; no existing export signature or code path was modified, and `git diff` confirms every edit to `run-loop.mjs` is additive apart from the three `pushFrame` call sites.

---

## Test Artifacts

### Test Commands Executed

```bash
npm test                              # 1856/1856, exit 0
npm run format:check                  # clean
npm run bundle                        # in sync, no drift
node --test evals/loop-supervisor/unit/dashboard.test.mjs   # 22/22
gh pr checks 278                      # 4/4 green
```

### Files Reviewed

`skills/loop-supervisor/scripts/run-loop.mjs`, `evals/loop-supervisor/unit/dashboard.test.mjs`, `skills/loop-supervisor/README.md`, `skills/loop-supervisor/SKILL.md`, `skills/develop-next/{SKILL.md,README.md}`, `docs/runbooks/unattended-overnight-runs.md`, `docs/runbooks/README.md`, `skills-config.yaml`, `docs/reference/configuration.md`, `tests/executable-instructions.test.js`, `package.json`

---

## Recommendations

### Immediate (blocking)

1. **QA-1** — scope the ledger to this run before building a frame.
2. **QA-2** — make the token-absence assertion capable of failing, and strip the token from the child env (QA-5).
3. **QA-3** — prove SC2 at the run level, not only at `pushDashboard`.
4. **QA-4** — widen `executable-instructions` to cover runbooks and skill READMEs, or stop claiming it covers them.

### Short-term (non-blocking)

1. Guard `pushFrame` (QA-7); handle the double-SIGINT final frame (QA-6).
2. Use the `explicit` set for the env fallback (QA-8); redact `repoUrl` userinfo (QA-9).
3. Pin `res.reason` in the unserialisable test (QA-11); gate the live-network test (QA-10).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 50/100
**Rationale**: Zero HIGH-severity issues, complete implementation, green CI, and documentation that is genuinely good. But the task's central claim is that its one load-bearing property is *proved rather than assumed* — and of the three proofs, one is vacuous, one stops a level short of the criterion it serves, and a third names a gate that does not scan the file it protects. Plus a real contract-breaking bug in the frame itself. Every one of these is cheap to fix, and none of them would be caught by a re-run of the suite that is already green.

**Deployment Recommendation**: CONDITIONAL — merge after the five MEDIUM issues are closed.

**Next Steps**: `/qa-fix` on the five MEDIUM issues, then re-review.
