# QA Report: Task 94 - Add the observe-work meta-skill (cycle 5)

**Task**: [task.94.observe-work-skill.md](./task.94.observe-work-skill.md)
**Gate File**: [task.94.gate.5.observe-work-skill.yml](./task.94.gate.5.observe-work-skill.yml)
**Previous Gate**: [gate.4](./task.94.gate.4.observe-work-skill.yml) — CONCERNS (90/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: PASS

---

## Executive Summary

TASK-94-007 is closed. The rewritten reference was verified by **executing its claims**, not by reading them — including two degradation branches the prose promises that no earlier cycle had run, plus a third invented for this pass. All five emit nothing, as the prose says they must.

No finding above LOW outstanding. Seven findings across five cycles, all closed.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Re-review scope: since 2026-09-08T15:20:00Z (default)** — one code-bearing file changed: `references/environments.md`.

- `REFUTE_PASS` = false · `SAFETY_REPROBE` = false (gate 4 `security.status` PASS)

Direct tools; no subagents, per the invoking session's instructions.

**The technique this cycle:** a rewritten reference makes *claims about the code*. Reading it can only confirm it is self-consistent. So each claim was executed against the shipped script.

---

## Re-Review Context

| Prev. issue | Severity | Status | Verification |
|---|---|---|---|
| **TASK-94-007** — reference documented the removed mechanism | MEDIUM | **FIXED** | Zero stale bullets remain. The path now resolves in the bundled skill. TOC anchors intact in both directions. `npm run bundle` reports "in sync", confirming it is an authored reference rather than a generated copy — so the edit is the source and will not be silently reverted. |

---

## New Findings This Cycle

**None above LOW.**

Searched by executing the reference's own assertions against the shipped script — the four degradation branches it names, the two code fragments it quotes, and the durable-anchor caveat it adds. One LOW, below.

### The claims, and how each was checked

| Claim in the reference | How verified | Result |
|---|---|---|
| Shipped at `references/observe-work-session-start.sh`, beside the engine | Both files listed in the bundled skill | ✓ |
| Emits `hookSpecificOutput.additionalContext`, writes nothing | Output parsed as JSON; workspace unchanged after run | ✓ |
| Transcribes `total` and the length of `open`; re-derives nothing | Source inspected — no `grep`/`awk` over the log survives | ✓ |
| Silent when there is **no engine file** | Ran with `OBS_ENGINE=/nonexistent` | ✓ silent |
| Silent when **`node` is unavailable** | Ran with `PATH` stripped | ✓ silent |
| Silent on an **unparseable payload** | Stub engine emitting `this is not json at all` | ✓ silent — **not previously executed** |
| Silent when the engine **refuses the anchor** | Workspace under `/private/tmp` | ✓ silent |
| ISO-date comparison snippet | Compared against script line 124 | ✓ verbatim |

**Two branches had never been run before this cycle.** The prose asserted them from cycle 3 onward and nothing had tested them. Both hold.

A fourth case was invented for this pass, because the prose does not name it and a reader might assume it: **an engine that exits non-zero while printing a plausible payload** (`{total:99,open:["a.md","b.md"]}`). The hook is silent — the non-zero exit is not trusted, which is correct and stronger than the prose promises.

A fifth: **valid JSON lacking the expected keys** (`{"reason":"ok"}`). Silent. ✓

### LOW (advisory, no action)

- `references/environments.md` — the quoted `queue_json=…` fragment omits the shipped script's `2>/dev/null`. An elision for readability in an illustrative snippet, not an instruction to run; the fragment is not executed by `tests/executable-instructions.test.js`. Recorded for completeness only.
- Carried from cycle 1, unchanged: the `{0,300}` bounded windows in two test scans. Still correct for the current file.

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| 1. Scaffold and frontmatter | PASS | `quick_validate` ✓; `invokes:` inline flow |
| 2. The lean core | PASS | 283 lines against a 500 ceiling; step 1 correct and exact against all four engine checks |
| 3. References | PASS | Five authored files, each with a load trigger and a pointer row; `environments.md` now describes what ships |
| 4. Tests | PASS | 22/22; both HIGHs carry mutation-proved regressions |
| 5. Registration | PASS | Catalog under *Skill Tooling*; generators and bundle all clean |
| 6. Activation | PASS | Hook agrees with the engine on twelve inputs; five degradation paths silent |

**6/6 complete, 0 carrying findings.**

---

## Code Review

Scoped to `environments.md`. **No correctness bugs.** One LOW elision, above.

### mutation-proven

| Invariant | mutation-proven |
|---|---|
| TASK-94-001 regression assertion | yes — original reason-keyed table restored → red |
| TASK-94-004 regression assertion | yes — catch-all restored → red |
| Hook date branches | yes — all four, from a durable anchor |
| Test glob runs at all | yes — assertion inverted → exit 1 |
| Pointer-row assertion | yes — row deleted, name left in prose → red |
| Remaining 18 assertions | **no** — not individually reverted |

Five invariants reverted and observed red across the loop; eighteen not. Stated rather than rounded up.

### The one gap, named again

The hook/engine agreement is **exercised** across twelve inputs in QA and **asserted nowhere**. The natural guard — "the hook contains no `grep` over the log" — is a source-text assertion, which this repo's standard rejects in favour of behaviour. A fixture-driven behavioural test would close it properly. Carried into the gate's `recommendations.future` rather than left in a report nobody re-reads.

---

## NFR Assessment

**Security — PASS.** No credentials, no network, no untrusted input; one JSON interpolation, escaped for backslash and quote; shellcheck clean across all tracked sources. The engine's ephemeral-anchor refusal fired three separate times during this loop — engaged, not merely present.

**Performance — PASS.** Body 283 lines against 500; authored footprint 49.1 KB against ~214 KB. The hook spawns `node` once per session start — the deliberate cost of the count being right.

**Reliability — PASS.** The queue rule lives in one place. Five degradation paths, all executed, all silent.

**Maintainability — PASS** (raised from CONCERNS). The reference now describes the shipped mechanism *and* records the three failed attempts, so the next editor is warned off the exact path that produced them.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — `npm run ci:fast` exit 0, **2885 pass / 0 fail** |
| Bundle idempotence | PASS — "in sync"; authored reference not clobbered |
| Catalog / dependency graph | PASS — no drift |
| shellcheck, all tracked sources | PASS |
| TOC anchors | PASS — both directions |

No regressions.

---

## Convergence

| Cycle | Gate | Score | HIGH |
|---|---|---|---|
| 1 | FAIL | 60 | 1 |
| 2 | FAIL | 70 | 1 |
| 3 | CONCERNS | 90 | 0 |
| 4 | CONCERNS | 90 | 0 |
| 5 | **PASS** | **100** | **0** |

Converging: HIGH 1 → 1 → 0 → 0 → 0. **No third strike** — `SKILL.md` carried a HIGH in gates 1 and 2 only, never three consecutive.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All seven findings closed. The final cycle executed the reference's claims rather than reading them, which surfaced two never-tested branches (both correct) and confirmed a third stronger than promised.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c — `/review-pr`, the loop's exit gate.
