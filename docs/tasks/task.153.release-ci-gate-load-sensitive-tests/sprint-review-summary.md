# Sprint Review Summary - Release gate reads CI's verdict; load-sensitive tests name themselves

**Story/Task ID:** task.153
**Epic:** _(none — standalone task; Phase 7 of the project completion roadmap)_
**Completed Date:** 2026-09-29
**Completed By:** Claude (develop-task pipeline, dispatched by develop-next)
**Pull Request:** [#515](https://github.com/Gamaroff/agent-skills/pull/515)

---

## Summary

`release.sh` now refuses to tag a release unless CI's recorded verdict for the commit is green, and
every timing assertion that depends on machine load says so in its own failure message, backed by
one list a test keeps equal to the code.

---

## What Was Delivered

### Acceptance Criteria Met

- ✅ `release.sh` refuses before its local test when CI is red, pending or unreadable
- ✅ `--skip-ci-check` proceeds with an explicit "unverified against CI" warning
- ✅ `--dry-run` prints the verdict and "Would have REFUSED"
- ✅ The verdict fails closed: `gh` missing, failing or unreadable is never green
- ✅ A red local test prints the load-sensitive re-run rule
- ✅ Session-handoff CR-6 retries only its precondition miss
- ✅ Every load-sensitive assertion carries the `LOAD-SENSITIVE` marker; `traps.md` lists exactly those files

### Key Features Implemented

- **CI verdict gate** — `scripts/release-ci-verdict.mjs` reads `gh run list --commit` and reduces it
  to green / red / pending / unverifiable; `release.sh` step 1b refuses on anything but green.
- **Load-sensitive marker** — `loadSensitive()` in `spawn-budget.mjs`; seven test files use it.
- **A three-direction guard** — `tests/load-sensitive-marker.test.js` checks by spelling, by the
  list, and by high-resolution clock source.
- **CR-6 fixed twice over** — it tolerates a slow fork, and its group-kill assertion now actually
  holds (it had passed with the kill broken).

---

## Technical Details

### Files Modified/Created

- New: `scripts/release-ci-verdict.mjs`, `tests/release-ci-verdict.test.js`,
  `tests/release-ci-gate.test.js`, `tests/load-sensitive-marker.test.js`
- Modified: `scripts/release.sh`, `shared/resources/spawn-budget.mjs` (+ 4 bundled copies), seven
  marked test files, `docs/contributing/{releases,traps}.md`, `CHANGELOG.md`

### Architecture/Design Decisions

- The workflow table is one constant, held to `.github/workflows/` by a parity test.
- The check runs before the multi-minute local test, so a red CI refuses in seconds.
- `gh` is pinned to the repository with `-R`; `--repo` is validated against GitHub's owner/name rules.

### Dependencies

- `gh` (authenticated) becomes a prerequisite of a fresh release; `--retry` is unaffected.

---

## Testing & Quality Assurance

### Test Coverage

- 59 new tests; `npm run ci` green; ten named mutations each turn a test red.

### Code Review

- 5 QA cycles (PASS 95 → CONCERNS 90 → PASS 95, then after acceptance CONCERNS 90 → PASS 100); `/review-pr` APPROVE, then a conformance re-review whose only substantive finding (a stale DoD) is answered by DoD run 2.

---

## Security & Compliance

### Security Review

- PASS — the release boundary was probed with 26 hostile and legitimate inputs; none reproduced.

### Compliance Review

- Not applicable — internal release tooling.

---

## Documentation

### Updated Documentation

- `docs/contributing/releases.md` — the CI gate, `--skip-ci-check`, the re-run rule
- `docs/contributing/traps.md` § Load-sensitive tests — the checked list

### Documentation Links

- [Task document](./task.153.release-ci-gate-load-sensitive-tests.md)
- [DoD summary (run 2)](./task.153.dod.2.release-ci-gate-load-sensitive-tests.md)

---

## Demo Notes

### How to Verify

1. `bash scripts/release.sh --dry-run --patch` on `main` prints `✓ CI green for <sha>` (or "Would have REFUSED").
2. `command node --test tests/release-ci-gate.test.js` exercises every refusal path offline.

### Screenshots/Visuals

_None — command-line tooling._

---

## Impact & Value

### User Impact

- The maintainer can no longer tag a release over a red CI run without typing a flag that names the risk.

### Technical Impact

- A load-timing red identifies itself, so it is re-run rather than re-diagnosed.

---

## Known Limitations & Future Work

### Current Limitations

- `gh run list` is capped at 50 runs with no truncation check (LOW).

### Suggested Follow-Up Stories

- Mention the CI gate and the `gh` prerequisite in `docs/runbooks/release-and-install.md`.
