# Sprint Review Summary - loop-supervisor: find select-next.mjs wherever the skills are installed

**Story/Task ID:** task.214
**Epic:** none (standalone task)
**Completed Date:** 2026-10-21
**Completed By:** Lorien Gamaroff
**Pull Request:** [#722](https://github.com/Gamaroff/agent-skills/pull/722)

---

## Summary

The loop-supervisor `develop-next` and `develop-batch` adapters no longer hardcode `skills/develop-next/scripts/select-next.mjs` as their probe. They use the first copy that exists under `.agents/skills/`, `.claude/skills/` or `skills/`, and fall back to the old path when none exists. A configured `probeScript` override still wins and is used verbatim.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A project holding only an `.agents/skills` copy resolves the probe to that copy.
- [x] A project holding only a `.claude/skills` copy, or only a `skills` copy, resolves to that copy.
- [x] With no copy present, the `skills/…` default is kept and the probe error is unchanged.
- [x] A configured `probeScript` override is returned verbatim and never searched.
- [x] One adapter resolution makes at most three existence checks.
- [x] The loop-supervisor unit suite passes locally and in CI without relying on the gitignored symlink.
- [x] `npm run validate -- skills/loop-supervisor/` passes.
- [x] Two documentation sentences state the search order and that an override wins.

### Key Features Implemented

- **Probe-path search**: `firstExisting(cwd, PROBE_SCRIPT_CANDIDATES)` runs for adapters marked `defaultProbe: true`, before the override loop, so an override still replaces the result.

---

## Technical Details

### Files Modified/Created

- `skills/loop-supervisor/references/adapters.js`: `PROBE_SCRIPT_CANDIDATES`, `firstExisting` (with an injectable `exists`), and `resolveAdapter(name, config, { cwd })`
- `skills/loop-supervisor/scripts/run-loop.mjs`: passes `{ cwd }` to `resolveAdapter`
- `evals/loop-supervisor/unit/adapters.test.mjs`: 14 new tests (29 → 43), and the existing override test now uses a temp `cwd`
- `skills/loop-supervisor/README.md`, `docs/reference/configuration.md`: the search order and the override rule
- `CHANGELOG.md`: an `[Unreleased]` Fixed entry

### Architecture/Design Decisions

The search runs before the override loop, so a configured `probeScript` is never searched. The fallback is the old literal, so a project with no copy fails exactly as it did before.

### Dependencies

- **New Dependencies Added:** None. Only the Node built-ins `node:fs` and `node:path`.
- **Breaking Changes:** None.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 14 new tests in `evals/loop-supervisor/unit/adapters.test.mjs`. The loop-supervisor suites ran 231 tests with 0 failures.
- **Mutation proof:** At QA, three of four mutations went red. The fourth, not passing `cwd` from `main`, is an equivalent mutant because `main` binds `cwd = process.cwd()`.

### Code Review

- **Reviewers:** The QA diff reviewer raised 2 advisory findings. The `/review-pr` conformance lens returned ✅ APPROVE with 1 low finding (PC-1, `pr_number`), which was closed at acceptance.
- **Approval Status:** ✅ Approved. The repository requires no human reviews.
- **Review Comments Addressed:** PC-1 closed. CR-1 and CR-2 are carried as future work.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Not a boundary deliverable: the code picks among three fixed paths and refuses nothing
- [x] No secrets, eval or exec. The probe still spawns through an argv array with no shell.
- [x] No dependency change

### Compliance Review

✅ **Not applicable.** This is internal skill tooling with no PII, payment, UI or PHI.

---

## Documentation

### Updated Documentation

- [x] `skills/loop-supervisor/README.md`: search order and override rule
- [x] `docs/reference/configuration.md`: the `loopSupervisor.adapters.<name>` row
- [x] CHANGELOG `[Unreleased]` entry

---

## Demo Notes

### How to Verify

1. Create an empty project directory containing only `.agents/skills/develop-next/scripts/select-next.mjs`.
2. Run the loop supervisor with the `develop-next` adapter from that directory.
3. Expect the probe to reach the selector, where before it reported `probe produced no output`.

---

## Impact & Value

### User Impact

A consumer repo that installs the skills under `.agents/skills/` or `.claude/skills/` can run `/loop-supervisor` with `develop-next` or `develop-batch` without configuring a `probeScript` override.

### Technical Impact

Unit tests no longer depend on the gitignored `.agents/skills` symlink, so local runs and CI resolve the same path.

---

## Known Limitations & Future Work

### Current Limitations

- When no copy exists, the error is still the generic probe failure rather than "selector not found" (CR-1).

### Suggested Follow-Up Stories

- CR-1: a distinct "selector not found" error.
- CR-2: derive the fallback literal from the candidates constant.

---

## Metrics

- **Time to Complete:** 1 day
- **Lines of Code Changed:** +179 / -8 (excluding this task's own records)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
