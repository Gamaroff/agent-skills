# QA Report: Task 193 - Scripts reach only the skills that run them (cycle 2)

**Task**: [task.193.scripts-reach-only-skills-that-run-them.md](./task.193.scripts-reach-only-skills-that-run-them.md)
**Gate File**: [task.193.gate.2.scripts-reach-only-skills-that-run-them.yml](./task.193.gate.2.scripts-reach-only-skills-that-run-them.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's fix holds: a cite-wrapped script literal is now reported, and the premise was checked end to end (`npm run bundle:skill skills/qa-task` copies a cite-wrapped `grant-qa-cycles.sh`). The cycle-2 refute pass found two more ways the guard is narrower than the bundler it polices: nested `shared/resources/…/x.mjs` paths, and prose that the run rule still reads as a command.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1, CR-2 fixed)

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 — cite wrapper exempts a script literal | ✅ FIXED | `<!-- cite: shared/resources/grant-qa-cycles.sh -->` restored at resume contract `:614` (scratch worktree, `beb68968`) → §2 live tree + §2 mutation red; §1 fixtures assert it on one line and across lines |
| CR-2 (advisory) — English "source"/"import … from" | ⚠️ PARTIAL | "the single source `…`" now reported; the refute pass found three shapes still exempt (gate 2 CR-2) |
| CR-3 (advisory) — `.sh` comment literals | not changed | scope stated in the test header |

---

## Testing Scope

### Review Methodology

Re-review scope: unscoped — cycle 2 refute pass over the whole `origin/develop...HEAD` diff (7 files), per Step 3b. One Explore reviewer with the REFUTE PASS directive, 175,030 ms (`duration_ms`). It compared `SCRIPT_LITERAL` with the bundler's `SHARED_REF_RE` / `SHARED_REF_LINE_RE` on every line of `shared/resources/*.md` and ran `RUN_PREFIX` on 13 probe lines. QA mutation proofs ran in a scratch worktree (obs #266).

Step 4b: no runnable prose changed since cycle 1 (the fix touched a test file and task docs only).

---

## New Findings This Cycle

- **[medium]** `tests/shared-script-literals.test.js:53` — `SCRIPT_LITERAL` has no `/` in its name class, so a nested literal (`shared/resources/tests/x.test.mjs`) is never seen, though the bundler copies it → match with the bundler's class, then filter by extension. **Promoted (CR-1).**
- **[medium]** `tests/shared-script-literals.test.js:64` — `RUN_PREFIX` exempts `(source \`…\`)`, a line-initial `source \`…\``, and a closing backtick read as opening → accept a command only after `$(` or an opening backtick. **Promoted (CR-2).**
- **[medium, pre-existing]** `tests/shared-script-literals.test.js:137` — fenced literals are exempt, but `probe-boundary-rule.md:66` quotes `shared/resources/tests/qa-execute-snippets.test.mjs` in a plain fence and copies it into qa-story and qa-task. Measured: the literal and both copies are identical on `origin/develop` (`git show origin/develop:shared/resources/probe-boundary-rule.md`, `git ls-tree origin/develop skills/qa-task/references/tests/` → 2 files). The task's population excludes fences by design (§ 8). Routed to `recommendations.future` (CR-3); severity and confidence unchanged.
- **[medium/medium]** `tests/shared-script-literals.test.js:72` — `ALLOWED` reasons assert a bundler set the test never checks; a new bundler of the document would receive the copy silently (CR-4, advisory).
- **[low cleanup]** `tests/shared-script-literals.test.js:53` — no end boundary after the extension (`foo.json` reads as `foo.js`) (CR-5).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1–2, 4 | PASS | unchanged since cycle 1 |
| Phase 3: Guard and pin | CONCERNS | CR-1, CR-2 |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Every prose script literal is bare or ALLOWED | §2 per-PR; blind to nested paths and three prose shapes (CR-1, CR-2) | CONCERNS |
| Others | unchanged from cycle 1; `ci:fast` 5903/0 on `beb68968` | PASS |

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

- **CR-1** — nested-path literals invisible to the guard. Recommendation: the bundler's capture class plus an extension filter.
- **CR-2** — prose still exempt as a command. Recommendation: opening-code-span or `$(` only.

### LOW Severity Issues (1)

- CR-5 (cleanup).

**Total Issues**: HIGH: 0, MEDIUM: 2 (+2 advisory/pre-existing), LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` — `scan` and `RUN_PREFIX` classify a CI lint finding; no external input, no runtime action.

### Maintainability — CONCERNS
CR-1, CR-2.

---

## Code Review

**Correctness bugs (4):** CR-1 [medium/high], CR-2 [medium/high] — promoted; CR-3 [medium/high] — pre-existing, routed to future; CR-4 [medium/medium] — advisory.
**Cleanups (1):** CR-5.

All five anchors `ok` (`finding-anchors.js --rev HEAD`).

mutation-proven: cite-wrap `grant-qa-cycles.sh` at resume contract `:614` → §2 live tree → covered
mutation-proven: "the single source `shared/resources/grant-qa-cycles.sh`" at `:614` → §2 live tree → covered

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1, CR-2.

### Short-term Actions (Non-Blocking)
1. CR-4 — check each `ALLOWED` entry's bundler set against the live tree.
2. CR-5 — extension end boundary.
3. CR-3 — follow-up for fenced literals (pre-existing).

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed and re-reviewed.

---

**QA Report**: co-located at `task.193.qa.2.scripts-reach-only-skills-that-run-them.md`
**Gate File**: co-located at `task.193.gate.2.scripts-reach-only-skills-that-run-them.yml`
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3.
