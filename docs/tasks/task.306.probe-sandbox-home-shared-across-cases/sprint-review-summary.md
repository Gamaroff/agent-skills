# Sprint Review Summary - Probe sandbox HOME shared across cases

**Story/Task ID:** task.306
**Completed Date:** 2026-11-13
**Pull Request:** [#900](https://github.com/Gamaroff/agent-skills/pull/900)

---

## Summary

Each (case, shell) run of the `/finalise` security probe now gets its own `HOME` and `TMPDIR`, so a legitimate case on a state-changing control is no longer read as a defect.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A legitimate `take`-style case passes under bash and zsh with 0 escapes.
- [x] A hostile case that writes under its own `HOME` is still reported.
- [x] A write outside the case's `HOME` and the work dir is still an escape.
- [x] No existing test changed its assertion, bar the one that asserted the shared `HOME`.
- [x] The task.296 plan with legitimate `take` entries: 32 executed, 0 reproduced, 0 escaped.
- [x] Suite wall time: median of five paired ratios 1.07 (bound 1.10, as amended by the owner).
- [x] `bundle:check` passes; CI green; `CHANGELOG.md` cites task 306; traps entry rewritten; Phase 4 audit listed.

### Key Features Implemented

- **Per-run home**: `shell:`, `shell-fn:`, `shell-argv:` and `fence:` runs each get a fresh `HOME` and `TMPDIR`; `cli:` and `--fixture-setup` keep the run-wide one.
- **Hostile report**: a hostile run's write under its own `HOME` or `TMPDIR` is still reported as an escape.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` - per-run home, watch and snapshot (four bundled copies regenerated)
- `shared/resources/tests/security-probe.test.mjs` - 7 new tests, one assertion amended
- `docs/contributing/traps.md`, `CHANGELOG.md` - trap entry rewritten, release note

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Tests:** 319 in the probe suite pass; remote `ci:fast` 8468 pass, 0 fail
- **QA:** two gates PASS (95); PR review APPROVE, 0 findings
- **Security:** PASS (not a boundary deliverable)

## Known Limitations and Future Work

- The escape path of a per-run home carries a random suffix, and hidden `.probe-home-*` directories are visible to a case that lists its cwd. Both low, advisory.
- Wall time is noisy on the shared LAN server; the bound was amended to a paired ratio for that reason.
