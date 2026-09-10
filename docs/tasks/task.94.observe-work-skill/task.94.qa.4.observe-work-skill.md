# QA Report: Task 94 - Add the observe-work meta-skill (cycle 4)

**Task**: [task.94.observe-work-skill.md](./task.94.observe-work-skill.md)
**Gate File**: [task.94.gate.4.observe-work-skill.yml](./task.94.gate.4.observe-work-skill.yml)
**Previous Gate**: [gate.3](./task.94.gate.3.observe-work-skill.yml) — CONCERNS (90/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: CONCERNS

---

## Executive Summary

TASK-94-006 is closed **by replacement rather than correction**, which was the gate's stated condition, and the replacement was probed against every input from all three prior cycles plus three new edges. Hook and engine agree on all twelve. Reliability rises to PASS: the duplication that produced three cycles of defects is gone.

One MEDIUM remains, and it is the mirror image of the last three: the code is now right and **the reference describing it is wrong**. `environments.md` still documents the mechanism cycle 3 removed — in the voice of hard-won guidance, which is what makes it a trap rather than a typo.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

**Re-review scope: since 2026-09-08T14:45:00Z (default)** — two files changed since gate 3: `observe-work-session-start.sh` (rewritten) and `SKILL.md` (step 4).

- `REFUTE_PASS` = false · `SAFETY_REPROBE` = false (gate 3 `security.status` PASS)

Direct tools; no subagents, per the invoking session's instructions.

---

## Re-Review Context

| Prev. issue | Severity | Status | Verification |
|---|---|---|---|
| **TASK-94-006** — third counting divergence | MEDIUM | **FIXED, by replacement** | Twelve-case probe; hook and engine agree on every one. Three degradation paths all silent. |

### Verifying a replacement, not a patch

The condition was explicit: *addressed by replacing the mechanism, not by a third correction.* Checked structurally, not by reading the commit message — `frontmatter_status()`, the whitespace handling, the statusless rule and every `grep` over the log directory are **gone** from the file, and what remains is one `queue --json` call plus transcription of `total` and the length of `open`.

**All nine inputs from cycles 1–3**, re-run against the new mechanism:

| Case | Engine | Hook |
|---|---|---|
| trailing space, exact, statusless, actioned, parked, body-quote, empty value, quoted value, no frontmatter | 5 open of 8 | **5 open of 8** ✓ |

**Three new edges**, chosen because they exercise the transcription rather than the queue rule:

| Edge | Result |
|---|---|
| Everything resolved → `open: []` | 0 open of 2, and still nags — correct, the nag is about the review date, not the backlog |
| Fresh review **and** empty queue | **Fully silent** ✓ |
| Filenames carrying dots and hyphens (`0002-c.d.md`) | 2 open of 2 ✓ |

**Three degradation paths**, each of which must emit nothing rather than a guess:

| Path | Result |
|---|---|
| Engine path missing | **Silent** ✓ |
| `node` unavailable | **Silent** ✓ |
| Ephemeral anchor (engine refuses it) | **Silent** ✓ — new behaviour, and correct |

The last is worth naming: before cycle 3 the hook would have counted files under `/tmp` and nagged about them. It now defers to the engine's refusal. That surfaced during this review as an *apparent* regression — four date-branch fixtures all fell silent — until the fixtures were moved to a durable anchor and passed. The fixtures were wrong, not the hook.

### The two defects found inside the cycle-3 fix

Both were recorded by the fix rather than fixed silently, and both were verified here:

1. **The transcription's own off-by-one** — the segment regex captured the `"open"` key, so counting quoted strings counted it too (hook 6, engine 5). Fixed by stripping to `[` first; confirmed by the twelve-case probe.
2. **The hook was never bundled** — a skill-only install could neither reach it nor satisfy its `${script_dir}/observation-log.js` default. `SKILL.md` now references it, which is what the bundler keys on. Verified: with **no** `OBS_ENGINE` set, `references/observe-work-session-start.sh` resolves its sibling engine and agrees with it.

That first one is the more interesting of the two. The replacement's *transcription* step reintroduced a counting error — which is the strongest available argument for the fallback being silence rather than a best guess.

---

## New Findings This Cycle

- **[MEDIUM]** `skills/observe-work/references/environments.md` — documents the mechanism cycle 3 removed → rewrite against what ships. ([bug.7](./task.94.bug.7.environments-documents-removed-mechanism.md))

### TASK-94-007

Two of the section's four "details that decide whether it works" describe code that no longer exists:

- *"Count `status: open` files, never the directory"* — the hook counts nothing; it asks the engine.
- *"`grep -c` exits 1 on zero matches"* — there is no `grep` in the hook.

And it omits the two properties that now matter: the count comes from the engine, and the fallback is silence.

**This is worse than absent documentation.** The stale bullets are written in the voice of earned guidance — "four details decide whether it works, each from a recorded failure" — so they read as authoritative. They are, precisely, instructions for reimplementing the mechanism that produced three defects in three cycles. A future editor following them would restore the `grep` and the whole class with it.

The section also still points at `shared/resources/observe-work-session-start.sh`; since the hook is now bundled, a skill-only install wants `references/observe-work-session-start.sh`. Same shape as TASK-94-003 — a path that resolves in the repo and not in the artifact a consumer installs.

Two of the four bullets remain true and earned, and should survive the rewrite: the ISO-date comparison without `<` inside `[ ]`, and "prove the branches fire, including the one that must stay silent".

---

## Implementation Verification

| Phase | Status | Notes |
|---|---|---|
| 1–5 | PASS | Untouched since cycle 2 |
| 6. Activation | **CONCERNS** | Hook mechanism now correct and thoroughly probed; its reference documentation is stale — TASK-94-007 |

---

## Code Review

Scoped to the two files changed since gate 3.

**Correctness bugs (0 new in code).** TASK-94-007 is a documentation defect.

**Re-examined and found sound:**
- The awk transcription handles an empty `open` array, multi-line JSON (`tr -d '\n'` first), and filenames with dots and hyphens. Verified by execution, not by reading the regex.
- `unset CDPATH` before `cd` rather than an inline `CDPATH= cd` — the inline form is what shellcheck flags as SC1007, and the replacement is not merely quieter but unambiguous.
- The engine-missing / node-missing / unparseable branches all `exit 0` silently. Confirmed each fires.

### mutation-proven

| Invariant | mutation-proven |
|---|---|
| TASK-94-001 regression assertion (carried) | yes |
| TASK-94-004 regression assertion (carried) | yes |
| Hook date branches, re-proved after the replacement | **yes** — all four, from a durable anchor |
| Remaining 20 assertions | **no** — not individually reverted |

No new assertion was added this cycle, because TASK-94-006's remedy was a deletion. The property that would guard it — "the hook contains no `grep` over the log" — is a source-text assertion, and this repo's own standard is to assert behaviour rather than source text. The behavioural guard is the twelve-case agreement with the engine, which is exercised here rather than encoded; that is a gap, and it is named rather than papered over.

---

## NFR Assessment

**Security — PASS.** Unchanged; `shellcheck --severity=warning` clean across all tracked sources.

**Performance — PASS.** Body 283 lines against a 500 ceiling. The hook now spawns `node` once per session start — a real cost, and the right trade against three cycles of wrong answers.

**Reliability — PASS** (raised from CONCERNS). The duplication is gone; the queue rule lives in one place; every degradation path is silence rather than a guess.

**Maintainability — CONCERNS** (lowered from PASS). The shipped code is right and its reference is wrong, authoritatively. This is the one axis where this change made things worse.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — `npm run ci:fast` exit 0, **2885 pass / 0 fail** |
| Hook: 12 cases, 4 date branches, 3 degradation paths, JSON | PASS |
| shellcheck, all tracked sources | PASS |
| Bundle / catalog / dependency graph | PASS — hook now bundled; no other drift |

No regressions.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH outstanding, and the mechanism that caused three cycles of defects is gone rather than corrected again. The remaining MEDIUM is documentation that would lead the next editor to rebuild what was just removed.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-94-007 corrected.

---

**Next Steps**: `/qa-fix` cycle 4 rewrites the reference. Then Step 5c (`/review-pr`) is the loop's exit gate.
