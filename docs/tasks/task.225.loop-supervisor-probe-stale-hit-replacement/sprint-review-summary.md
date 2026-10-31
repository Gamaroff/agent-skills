# Sprint Review Summary - loop-supervisor: find a replacement probe script after a stale hit

**Story/Task ID:** task.225
**Completed Date:** 2026-10-31
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#798](https://github.com/Gamaroff/agent-skills/pull/798)

---

## Summary

The loop supervisor no longer reports a probe script as missing when it was replaced by a different file Node resolves to (a directory's `index.js` in place of a `.js` file, or the reverse). Before this change the probe said "not found" until the loop restarted.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC1: file → directory swap in one process reads as present
- [x] SC2: directory → file swap reads as present
- [x] SC3: a stale hit with no replacement still reports `probe script not found`
- [x] SC4: the five agreement tests and the QA-3 pair pass unchanged
- [x] SC5: a fresh resolution runs only on a stale hit (0 on a live hit or a miss)
- [x] SC6: mutation-proven (the fallback replaced by `return false` turns the swap tests red)
- [x] SC7: the loop-supervisor suite passes locally and in CI; validate passes
- [x] SC8: CHANGELOG `[Unreleased]` cites task 225

### Key Features Implemented

- **Fresh-process fallback**: `resolvesAsMain` re-runs `require.resolve` in a fresh `node` process when the in-process cached hit no longer exists (`Module._pathCache` keeps the stale hit on Node v26.8.2).
- **Testable seam**: `resolvesAsMain(file, freshResolve = resolveInFreshNode)` takes the resolver as a parameter and is exported.

---

## Technical Details

### Files Modified/Created

- `skills/loop-supervisor/references/adapters.js` - stale-hit fallback, `resolveInFreshNode`, doc comments, export
- `evals/loop-supervisor/unit/adapters.test.mjs` - two swap tests and a spawn-count test
- `CHANGELOG.md` - `### Fixed` entry citing task 225

### Architecture/Design Decisions

A fresh process is the only reliable way to drop the cached resolution; the spawn happens only on a stale hit, so a live hit and a miss cost nothing. The child uses `execFileSync` with an argv array and no shell, a constant `-e` script and a 10 s timeout.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None (`resolvesAsMain` gains an optional parameter and an export)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 3 tests added in `evals/loop-supervisor/unit/adapters.test.mjs`; suite 255 pass / 0 fail / 1 skipped (pre-existing live-network case)
- **Mutation proofs:** 2 of 2 covered
- **QA Gate:** PASS 100/100 (`task.225.gate.1.loop-supervisor-probe-stale-hit-replacement.yml`)

### Code Review

- **Reviewers:** Step 5c `/review-pr` (conformance) and the QA diff reviewer
- **Approval Status:** ✅ APPROVE (host requires no human review)
- **Review Comments Addressed:** 2 advisory findings routed to follow-up (below)

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No shell, no `eval`; argv-array spawn with a timeout
- [x] Boundary probe on `resolvesAsMain`: 8 cases, 0 reproduced, 0 escaped (`task.225.dod.1.security.run.json`)
- [x] No secrets, no dependency changes

### Compliance Review

Not applicable — internal tooling, no personal, payment, UI or health data.

---

## Documentation

- [x] CHANGELOG updated
- [x] Doc comments on `resolvesAsMain` and `resolveInFreshNode` explain the fallback
- README and configuration reference unchanged (out of scope; they already describe "present" as what Node would run)

---

## Demo Notes

### How to Verify

1. `command node --test --test-name-pattern='replacement after a stale hit|spawns a fresh resolve' evals/loop-supervisor/unit/adapters.test.mjs`
2. Expected: both swap tests and the spawn-count test pass.

---

## Known Limitations and Future Work

- **CR-1:** a spawn failure or timeout reads as "probe script not found" (the pre-change answer); could be reported as its own probe error.
- **CR-2:** after one swap, each later probe of that path spawns again; could remember the last fresh-resolved path.
- **Security advisory:** pass `--` before `file` in `resolveInFreshNode` so an option-shaped name can never be read as a Node option (today's only caller passes absolute paths, so it cannot occur).

**DoD log:** `task.225.dod.1.loop-supervisor-probe-stale-hit-replacement.md`
