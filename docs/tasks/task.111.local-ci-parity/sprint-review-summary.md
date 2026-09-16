# Sprint Review Summary - One local command that runs every CI lane, and two coverage gaps the sweep found

**Story/Task ID:** task.111
**Epic:** _(standalone technical task)_
**Completed Date:** 2026-09-16
**Completed By:** develop-task pipeline (autonomous run via develop-next)
**Pull Request:** [#412](https://github.com/Gamaroff/agent-skills/pull/412)

---

## Summary

`npm run ci` now runs every lane CI runs — format, test, evals, per-skill validation, generated-file drift, bundle freshness and ShellCheck — so a contributor cannot be green locally and red in CI on a lane they never ran. Two coverage gaps found while measuring parity are closed alongside: the three develop pipelines' hook wrappers are tested, and `quick_validate.py` enforces the Agent Skills spec's 1,024-character description cap.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-1 — `npm run ci` composes `ci:fast` + `eval:all` + `validate:all` + `check:generated` + `bundle:check` + `lint:shell`; the parity test asserts the set equals the three green-defining CI jobs in both directions
- [x] SC-2 — `develop-pipeline-hook-wrappers.test.mjs` covers `develop-story`, `develop-task` and `develop-bug` wrappers, population enumerated from the tree with a 3×3 floor
- [x] SC-3 — `quick_validate.py` rejects a description > 1,024 chars (measured on the parsed value); `develop-story`'s trimmed 1,025 → 907; every skill passes
- [x] SC-4 — a missing `shellcheck` binary is reported loudly and the lane exits 0; now covered by `lint-shell-absent-binary.test.mjs` (added at finalise)
- [x] SC-5 — `docs/contributing/releases.md`, `docs/contributing/evals/README.md` and `CONTRIBUTING.md` name `npm run ci`, the fast tier, and the lanes with no local form
- [x] SC-6 — `ci-gate-parity.test.mjs` reads `test.yml:test`, `validate.yml:validate` and `shellcheck.yml:shellcheck` and fails on any unclassified step

### Key Features Implemented

- **`npm run ci` composite**: every term an `npm run` of a named script; `ci:fast` unchanged for the develop loop
- **`scripts/lint-shell.sh`**: the ShellCheck lane's local twin — same file list, severity and guards as the workflow; loud skip when the binary is absent
- **`check:generated`**: regenerate catalog + skill-deps, then `git diff --exit-code` on the three generated files — the exact shape of CI's two drift steps
- **Parity test widened**: `GREEN_JOBS` / `LANE_TWINS` / `SETUP_STEPS` / declared exclusions; workflows read with a real YAML parser (PyYAML via python3, memoised) after four QA cycles of hand-rolled-parser edge cases
- **Description cap**: `DESCRIPTION_MAX_CHARS = 1024` in `quick_validate.py`, with tests for 1,025 / 1,024 / folded scalars / the whole corpus

---

## Technical Details

### Files Modified/Created

- `package.json` - `ci` recomposed; `lint:shell` and `check:generated` added
- `scripts/lint-shell.sh` - new: the `lint:shell` body
- `.github/workflows/shellcheck.yml` - header comment names the local twin (no behaviour change)
- `evals/shared/tests/ci-gate-parity.test.mjs` - widened to every green-defining job; real YAML reader
- `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs` - new: wrapper behaviour across the three pipelines
- `evals/shared/tests/lint-shell-absent-binary.test.mjs` - new: the absent-binary skip branch (finalise gap)
- `skills/create-skill/scripts/quick_validate.py` - description cap
- `tests/skill-frontmatter.test.js` - cap tests
- `skills/develop-story/SKILL.md` - description trimmed under the cap
- `docs/contributing/releases.md`, `docs/contributing/evals/README.md`, `CONTRIBUTING.md`, `CHANGELOG.md` - name the aggregate and the fast tier

### Architecture/Design Decisions

- The parity test was widened rather than CI changed — §4 forbids changing what CI runs. The twin map is keyed on step names the test asserts exist, so a rename fails loudly.
- Absent `shellcheck` is a loud skip with exit 0, not a failure: a contributor without the binary still gets every other lane, and CI holds the line.
- `validate.yml`'s regenerate-and-diff bundle step is a declared exclusion — the pre-commit hook re-bundles on every commit that can make the copies stale.
- QA cycle 6 replaced the hand-rolled workflow-step parser with a real YAML read after four consecutive cycles of new YAML shapes (third-strike replace-don't-patch).

### Dependencies

- **New Dependencies Added:** none (python3 + PyYAML already required by the repo's tooling)
- **Breaking Changes:** none — `npm run ci` is slower (four added lanes, ≈2 min); `ci:fast` unchanged

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 27 tests added across `evals/shared/tests/ci-gate-parity.test.mjs`, `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs`, `evals/shared/tests/lint-shell-absent-binary.test.mjs`, `tests/skill-frontmatter.test.js` — every one mutation-proven
- **Integration Tests:** the parity suite reads the real workflows (20 steps across three jobs)
- **Test Coverage:** all six success criteria traced to code and a per-PR test (or documentation for SC-5)

### Code Review

- **Reviewers:** QA code reviewer every cycle (9 cycles); Step 5c `/review-pr` conformance + code lenses
- **Approval Status:** QA gate 9 PASS 100/100; PR review CONCERNS (advisory, no high-confidence high-severity finding)
- **Review Comments Addressed:** every QA finding across cycles 1–8 fixed and re-verified; 5c follow-ups recorded

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No hardcoded secrets; no new dependencies
- [x] No shell interpolation — python3 spawned with a fixed program, YAML over stdin; wrapper test spawns bash with fixed argv
- [x] `lint-shell.sh` under `set -euo pipefail`, filenames array-quoted
- [x] Description cap probed as a boundary: 34 candidates executed, cap held on every length case (one pre-existing null/bool coercion outside this PR, logged as observation #107)

### Compliance Review

✅ **Compliance Requirements Met**

- [x] GDPR / PCI-DSS / WCAG / HIPAA — not applicable (internal CI tooling, no data, payments, UI or health data)

---

## Documentation

### Updated Documentation

- [x] `CHANGELOG.md` — `[Unreleased]` entry citing task 111
- [x] `docs/contributing/releases.md` — checklist names `npm run ci` and the lanes it does not mirror
- [x] `docs/contributing/evals/README.md`, `CONTRIBUTING.md` — the aggregate, the fast tier, `lint:shell` and the container form
- [x] Inline rationale in `scripts/lint-shell.sh` and the test headers

### Documentation Links

- [`task.111.local-ci-parity.md`](./task.111.local-ci-parity.md)
- [`task.111.dod.1.local-ci-parity.md`](./task.111.dod.1.local-ci-parity.md)
- [`task.111.pr-review.1.local-ci-parity.md`](./task.111.pr-review.1.local-ci-parity.md)

---

## Demo Notes

### How to Verify

1. `npm run ci` — every lane runs and the command exits 0 (≈22 min, dominated by `npm test`)
2. `PATH=/usr/bin:/bin bash scripts/lint-shell.sh` — prints the loud skip and exits 0
3. Add a `run: echo hi` step under a new name to `validate.yml` (uncommitted) → `node --test evals/shared/tests/ci-gate-parity.test.mjs` fails naming the unclassified step
4. Set a fixture description to 1,025 chars → `quick_validate.py` exits 1 with the count

### Screenshots/Visuals

_Not applicable._

---

## Impact & Value

### User Impact

A contributor has one command that predicts CI, and the release checklist's "run the gates locally" step means what it says.

### Technical Impact

Two silent-drift classes closed: a CI lane with no local twin, and an untested delegation wrapper. The parity test is now the single place that enumerates what CI's green jobs run.

---

## Known Limitations & Future Work

### Current Limitations

- `npm run ci` has been proven lane-by-lane and by CI; the single end-to-end local run on this host tripped a pre-existing session-handoff flake (PR review PC-1). The `develop-next` merge gate runs it as one command.
- `check:generated` mutates tracked files before diffing, so an unrelated dirty README/catalog reads as drift (PR review CR-1).
- `docs-link-check` and `branch-policy` have no local form by design.

### Suggested Follow-Up Stories

- Order the cheap lanes before `eval:all` in the composite (PR review CR-3)
- Align `validate:all`'s SKILL.md guard with the CI loop (PR review CR-2)
- Type-check `description` before measuring it in `quick_validate.py` (observation #107)

---

## Metrics _(if applicable)_

- **Story Points:** 4 h estimated
- **Time to Complete:** 1 day (2026-09-16), 9 QA cycles
- **Lines of Code Changed:** +2,989 / −134 (34 files, including the QA trail)

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
