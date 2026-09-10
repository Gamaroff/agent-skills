# QA Report: Task 94 - Add the observe-work meta-skill (cycle 2, refute pass)

**Task**: [task.94.observe-work-skill.md](./task.94.observe-work-skill.md)
**Gate File**: [task.94.gate.2.observe-work-skill.yml](./task.94.gate.2.observe-work-skill.yml)
**Previous Gate**: [task.94.gate.1.observe-work-skill.yml](./task.94.gate.1.observe-work-skill.yml) — FAIL (60/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: FAIL

---

## Executive Summary

All three of cycle 1's findings are genuinely closed, and each was re-verified against the case that produced it rather than against the suite alone.

The gate is **FAIL** again because the refute pass found **two new defects introduced by those fixes** — including a HIGH that would have silently disabled the entire feature on every fresh install. This is the outcome the cycle-2 rule is designed to produce: cycle 1's fixes are the least-reviewed code in the change set, and a fix is new code, not the closure of a finding.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

**Re-review scope: unscoped — whole `origin/develop...HEAD` diff (29 files, +5165/−133).**

Cycle 2 takes the whole branch diff by rule, not by exception: the files changed since the last gate are exactly cycle 1's own fixes, so a narrowed cycle-2 review reads only the repairs and never re-reads the original change with what cycle 1 learned.

- `REFUTE_PASS` = **true** (exactly one prior gate)
- `SAFETY_REPROBE` = **false** (prior gate's `security.status` was PASS)

**Direct tools throughout — no subagents dispatched**, per the invoking session's instructions; the refute directive was applied inline over the same diff. Recorded rather than left implicit.

**How both findings were reached.** Neither is visible in the diff by reading. Both came from asking the refute question — *what does this fix claim, and is that claim false?* — and then executing against the real engine:

- TASK-94-004: the fix claims `healthy: false` means "something is wrong, don't write". Reading `observation-log.js:1179` shows `healthy` folds in `activation-configured`, and running `doctor` on a fresh project shows all-green-but-activation. The claim is false on first run.
- TASK-94-005: the fix claims the hook now agrees with the engine. It does on the five cases cycle 1 tested. A sixth — a body line quoting `status: open` — breaks it in the opposite direction.

---

## Re-Review Context

| Prev. issue | Severity | Status | Verification |
|---|---|---|---|
| **TASK-94-001** — step 1 branched on a `doctor` reason the engine never emits | HIGH | **FIXED** | Regression assertion **mutation-proved**: restoring the original reason-keyed table turns it red naming the exact defect; reverted → green. *But the fix introduced TASK-94-004 — see below.* |
| **TASK-94-002** — hook undercounted open observations | MEDIUM | **FIXED** | Hook and engine agree on all five fixture cases: trailing-space, exact, statusless, actioned, parked → 3 open of 5 both sides. *Partially — an overcount remains; see TASK-94-005.* |
| **TASK-94-003** — six dangling links in the bundled contract | MEDIUM | **FIXED** | Re-bundled and rescanned: none broken. Verified the discrimination was correct rather than lucky — the six that dangled were demoted, and the **five** that legitimately resolve (`observation-log.js`, `resolve-observation-workspace.sh`, both bundled alongside) were correctly left as links. |
| LOW — `{0,300}` bounded windows in two test scans | LOW | **Open, advisory** | Unchanged. Still correct for the current file. |

---

## New Findings This Cycle

- **[HIGH]** `skills/observe-work/SKILL.md` — the TASK-94-001 fix's catch-all row blocks capture in every fresh install → enumerate the four checks; never let `healthy: false` alone stop a write. ([bug.4](./task.94.bug.4.healthy-false-blocks-fresh-install.md))
- **[MEDIUM]** `shared/resources/observe-work-session-start.sh` — status probes are not frontmatter-scoped; a body line reading `status: open` is counted as open → scope to the frontmatter block. ([bug.5](./task.94.bug.5.hook-grep-not-frontmatter-scoped.md))

### TASK-94-004 in detail — the fix that broke the feature

The cycle-1 fix correctly moved the missing-workspace branch onto `healthy`. It then added:

| `healthy: false` for any other failing check | Surface the check's `detail`; do not write until it is resolved |

`observation-log.js:1179` computes `healthy: failed.length === 0` over four checks, one of which is `activation-configured` — false whenever no `AGENTS.md`/`CLAUDE.md` in the cwd mentions the observation log.

Executed against a fresh project with an initialised log:

```
reason  = ok
healthy = False
  ok   workspace-exists       …/skill-observations
  ok   anchor-durable         …
  ok   no-fork                no second workspace found at another plausible anchor
  FAIL activation-configured  no agent-instruction file mentions the observation log
```

A completely healthy log, and `healthy: false`. The catch-all forbids writing — in every project on first install, which is every project the skill is installed into. Worse, Session Start step **4** is what suggests adding the activation instruction, and it runs *after* step 1: **the protocol blocks before reaching its own remedy.**

What is *not* wrong is worth stating, because it is what makes the fix small: `anchor-durable` and `no-fork` failing are already carried by `reason` (`ephemeral-workspace`, `fork-detected`, both exit 1) and genuinely should stop a write. The catch-all's only unique case is `activation-configured` — and it gives it the worst available instruction.

### The pattern behind TASK-94-002 and TASK-94-005

Two cycles, two counting bugs, one root cause: **the hook re-implements the engine's queue rule in `grep`.** Cycle 1 closed the undercount; cycle 2 found the overcount. Both are consequences of duplicating a rule rather than calling it.

The fix for TASK-94-005 is still a correction, and that is proportionate at instance two. Recorded in the gate's `recommendations.future`: **if a third arises, replace the mechanism rather than correct it again** — which is what the loop's own third-strike rule would require.

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| 1. Scaffold and frontmatter | PASS | Unchanged |
| 2. The lean core | **CONCERNS** | Step 1 now reads the right field, and reads it wrongly on first run — TASK-94-004. Body 260 lines |
| 3. References | PASS | Unchanged |
| 4. Tests | PASS | 21/21; the new assertion is mutation-proved |
| 5. Registration | PASS | `bundle` re-run and idempotent; catalog and deps unchanged |
| 6. Activation | **CONCERNS** | Hook correct on dates, JSON and five status cases; overcounts on a sixth — TASK-94-005 |

**6/6 complete, 2 carrying findings.**

---

## Code Review

Whole-diff refute pass, inline.

**Correctness bugs (2):** both new, both listed above.

**Cleanups (1):** unchanged from cycle 1 — the `{0,300}` bounded windows. Advisory.

**Re-examined and found sound:**
- The step-1 rewrite's *ordering* rationale ("read `healthy` first, then `reason`") is correct and well-argued; only the catch-all row is wrong. The fix for TASK-94-004 should preserve that framing rather than revert it.
- Fix 3's link discrimination is correct by reasoning, not by luck — verified explicitly, because "the scan reports none broken" would also be true if it had demoted *all* links, which would have been a worse outcome.

### mutation-proven

| Invariant | mutation-proven |
|---|---|
| The TASK-94-001 regression assertion catches its defect | **yes** — original table restored → red naming it; reverted → green |
| Test glob runs (carried from cycle 1) | yes |
| Pointer-row assertion (carried) | yes |
| Hook date branches, re-proved after the counting change | **yes** — all four, including the silent one |
| Remaining 18 assertions | **no** — not individually reverted |

---

## NFR Assessment

**Security — PASS.** Unchanged. No credentials, no network, no untrusted input; `shellcheck --severity=warning` clean after the edit.

**Performance — PASS.** Body 260 lines against a 500 ceiling after the step-1 rewrite; authored footprint materially unchanged.

**Reliability — CONCERNS.** Improved on cycle 1 — the startup path now reads the right field — but it fails in a *new* way on first run, and the hook still disagrees with the engine on a reachable input.

**Maintainability — PASS.** The step-1 rewrite records why it reads `healthy` before `reason`, which is the part a future editor would otherwise undo.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — `npm run ci:fast` exit 0, **2884 pass / 0 fail** |
| Formatting | PASS — after a first attempt that `prettier --check` correctly rejected |
| Bundle idempotence | PASS — "in sync" |
| Catalog / dependency graph | PASS — unchanged, no drift |
| Hook: dates, JSON, shellcheck | PASS |

No regressions. Note the fast gate did its job: `ci:fast` exited 1 on formatting alone before this review, the same prettier-only shape that once shipped a red build here after acceptance.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH introduced by cycle 1's own fix, which would silently disable capture on every fresh install. Cycle 1's findings are genuinely closed; the refute pass is what surfaced their cost.
**Quality Score**: 70/100 (was 60)

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-94-004 fixed and verified against a project carrying **no** activation instruction — not against this repo, which has one.

---

**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3. Cycle 3 narrows to files changed since this gate.
