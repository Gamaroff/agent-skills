# QA Report: Task 151 - review-task: stack-neutral pre-pass, executed invariants, released-shape diff (cycle 2)

**Task**: [task.151.review-verifies-claimed-properties.md](./task.151.review-verifies-claimed-properties.md)
**Gate File**: [task.151.gate.2.review-verifies-claimed-properties.yml](./task.151.gate.2.review-verifies-claimed-properties.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Testing Completed**: 2026-09-28
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate 1](./task.151.gate.1.review-verifies-claimed-properties.yml) — CONCERNS (90), 1 medium in the queue.

| Gate 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 no-H2 file reads as `architecture` | FIXED | reproduction now returns `fallback`; test + mutation proof (`covered`) |
| CR-2 read errors collapse to absence | FIXED | EACCES throws; EISDIR → CLI exit 1, empty stdout; `covered` |
| CR-3 heading regex indentation/tab | FIXED | indented/tabbed forms accepted, 4-space rejected; `covered` |
| CR-4 hand-run grep claim for `bug` | FIXED | implementation report corrected |
| CR-5 FALLBACK_AXES restates axes 3–4 | FIXED | former axis-2 list only; `covered` |

TASK-151-BUG-1 → verified; remains `Ready for QA` for closure at acceptance.

---

## Executive Summary

Every gate-1 finding is fixed and held by a test that goes red when the fix is reverted. The cycle-2
refute pass found that the CR-1 fix closed only the zero-heading case: a heading line with no text
still yields a blank axis (C2-CR-1, medium, high confidence), which re-creates the blank-slot outcome.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — C2-CR-1 fixed

---

## Testing Scope

### Review Methodology

Re-review scope: unscoped — cycle 2 refute pass over the whole branch diff (2,327 lines, bundle copies
excluded); prior security `PASS measured`, so no safety re-probe. One read-only refute subagent;
direct tools for the rest. Step 4b: the two new documented blocks run from the repository root under
bash and zsh (`reason: architecture`); the engine still refuses them (`unrecognised-command: node`).

---

## New Findings This Cycle

- **[medium/high]** `shared/resources/prepass-axes.js` (`h2s`) — an H2 with no text (`##  `, `##\t`,
  `## #`, `## ##`) counts as an axis → trim, strip a whole-content closing `#` run, drop empties
  (C2-CR-1, promoted; [task.151.bug.2.blank-h2-counts-as-an-axis.md](./task.151.bug.2.blank-h2-counts-as-an-axis.md)).
- **[medium/medium]** both prompt files — in `fallback`/`partial` the slot sentence states the web-stack
  lists as "this repository's domains" and "documented standards", and "reviewed exactly as before" is
  not literally true (C2-CR-2, advisory).
- **[low/medium]** `prepass-axes.js` — a non-existent `--arch` root returns `fallback`, exit 0,
  identical to a repository with no concepts docs (C2-CR-3, advisory).
- **[low/medium]** `prepass-axes.js` — `, ` / `; ` joiners inside a heading make distinct heading sets
  render identically (C2-CR-4, advisory).
- **[cleanup]** task document plan item 1 still defines `source` by file presence (C2-CR-5).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1: Stack-neutral pre-pass | CONCERNS | C2-CR-1 |
| 2: Invariant verification | PASS | unchanged since cycle 1 |
| 3: Released-shape diff | PASS | unchanged since cycle 1 |
| 4: Tests, bundle, docs | PASS | bundle:check 0 problems |

---

## Success Criteria Verification

SC1–SC15 as in [QA report 1](./task.151.qa.1.review-verifies-claimed-properties.md); all still met.
SC8: `prepass-axes.test.mjs` now ~0.9 s (14 tests), `review-property-checks.test.js` ~0.13 s.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2 (1 promoted), LOW: 2, cleanup: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
C2-CR-1; C2-CR-3 advisory.
### Security — PASS
- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 5
- argv probe re-run: `engages`. The two `errored` cases are inputs the `filename` sink cannot
  materialise as fixture names (`""` → EISDIR, `--arch=/etc` → path separator); both exit 2 run directly.
### Maintainability — PASS

---

## Code Review

**Correctness bugs (4):** C2-CR-1 (promoted), C2-CR-2, C2-CR-3, C2-CR-4 — above.
**Cleanups (1):** C2-CR-5.

Mutation proofs for cycle 1's fixes (Step 3c):

- mutation-proven: `hasDomains = ts !== null` (revert CR-1) → "a concepts file with no H2 heading is absent…" → covered
- mutation-proven: catch-all `return null` (revert CR-2) → "a read error that is not absence throws…" → covered
- mutation-proven: old H2 regex (revert CR-3) → "CommonMark H2 forms…" → covered
- mutation-proven: old FALLBACK_AXES (revert CR-5) → "no concepts/ docs → fallback…" → covered

4 of 4 fixes proven. Provenance: C2-CR-1..4 are in code this branch adds.

---

## Regression Testing

Fast gate at `c9ff5f47`: 4362 pass, 0 fail. Targeted re-run this cycle: 6 files, 64 tests green.
`npm run validate` ✓ for review-task, review-story, create-task.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — C2-CR-1 fixed

**Next Steps**: `/qa-fix` cycle 2 for C2-CR-1 (plus C2-CR-2, C2-CR-3, C2-CR-5 where cheap), then QA cycle 3.
