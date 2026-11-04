# Sprint Review Summary - security-probe: a uniform failure is declined, not scored

**Task ID:** task.256
**Completed Date:** 2026-11-04
**Pull Request:** [#827](https://github.com/Gamaroff/agent-skills/pull/827)

---

## Summary

The security probe no longer reports a missing control when every case failed the same way before reaching it. It now declines the run as unverifiable, so `/finalise` stops publishing false findings for scripts probed with the wrong entry form.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `resolve-pr-number.sh` under `shell:` declines (`unverifiable` / `entry-not-probeable`, executed 0, exit 1)
- [x] The decline detail names the exit and the shared stderr line
- [x] Declined under `shell:`, `shell-fn:`, `shell-argv:`, `cli:` and `fence:`
- [x] Accept-all, silent failure, exit 126/127, a usage error quoting its input and a hostile-only corpus still score
- [x] A run that reaches `gh` stays `needs-fake-gh`; no private key or raw stderr leaves the engine
- [x] 18 of 18 mutations of the engine turn a test red; CHANGELOG and the boundary rule updated

### Key Features Implemented

- **`uniformFailure`**: a pure, exported check that reads results the arms already hold, with no extra process per case.
- **One decline path**: the decline reuses the existing all-errored fold.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` - `uniformFailure`, private failure record, reclassification before the fold
- `shared/resources/tests/security-probe.test.mjs` - 10 new tests, extended spawn test
- `shared/resources/tests/fixtures/security-probe/` - 12 fixtures
- `shared/resources/probe-boundary-rule.md` - the rule and its four limits
- `CHANGELOG.md` - the changed verdict
- `skills/{finalise,qa-story,qa-task,review-security}/references/` - regenerated bundled copies

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** the verdict for this shape changes from `absent` to `unverifiable`; no committed run record changes.

---

## Testing & Quality Assurance

- **Unit Tests:** 10 new tests; probe suite 301/301
- **Mutation proof:** 18 of 18 red, repeated by QA
- **CI:** all 6 checks green on the final pushed head, including the zsh lane
- **QA gate:** PASS, 95/100; **PR review:** APPROVE

## Security & Compliance

Not a boundary deliverable and no PII, payment, UI or PHI scope. Inline checks of the diff found no secrets, no new `eval`/`exec` and no dependency change.

---

## Known Limitations and Follow-ups

- A usage error that quotes its input, and a hostile-only corpus, still score; both are stated limits in the boundary rule.
- Advisory (QA CR-1): when one case genuinely errored, the fold overwrites its own detail with the uniform message.
- Task 257 (parked) is the follow-up cut from the same observations.
