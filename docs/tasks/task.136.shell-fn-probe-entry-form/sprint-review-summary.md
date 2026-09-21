# Sprint Review Summary - A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Story/Task ID:** task.136
**Epic:** _(standalone task)_
**Completed Date:** 2026-09-21
**Completed By:** Claude (develop-task pipeline, dispatched by /develop-next)
**Pull Request:** [#462](https://github.com/Gamaroff/agent-skills/pull/462)

---

## Summary

The security probe engine can now execute a **sourced shell library** — `shell-fn:<path>#<function>` sources the file and calls the function with each corpus case as argv under bash and zsh — and a `--fake-gh <dir>` affordance lets a function that consults `gh` be probed against a fixture instead of the network. The finalise security gate now counts real executions for `gh-labels.sh#gh_labels_filter` (engages, 20/20, 0 escapes), the boundary class that forced a human override on task.125.

---

## What Was Delivered

### Success Criteria Met

- [x] `shell-fn:shared/resources/gh-labels.sh#gh_labels_filter` with the label cases file and `--fake-gh` → `engages`; a `gh`-naming library without `--fake-gh` → named `needs-fake-gh` decline, no hang
- [x] echo library → `absent`; syntax-error library → `unverifiable` with exit 97 on every case; top-level `exit` and `set -e` libraries handled (EXIT trap; errexit snapshot/restore)
- [x] every pre-existing engine row unchanged and green (50); 66/66 total
- [x] runs inside the default timeout under both shells
- [x] mutation proofs recorded (5 develop + 8 qa-fix + 9 QA); ci:fast, bundle:check, Prettier, shellcheck green
- [x] header signal stated once in `probe-boundary-rule.md` §5; four prompt sites cite it under a mutation-proved pin; CHANGELOG
- [ ] obs #138 → `actioned` with PR #462 — **deferred to post-merge** (the record's own `parked_until`)

### Key Features Implemented

- **`shell-fn:` entry form**: third `resolveEntry` branch (same containment, function-name regex); runner arm with rc files off, the library/function/input as argv, an EXIT trap around the `source`, the function in a subshell with errexit restored inside, reserved exits 97/98 (→ one named decline) and 99 (function's own 97/98, scored); no per-case fixture file (slash-bearing labels probeable)
- **`--fake-gh`**: validated before anything spawns (repo-contained, executable `gh`), `PATH` prepend + `FAKE_GH=1`, recorded as `fake_gh`; declined on a JS-form entry; a `gh`-naming library without it is `needs-fake-gh`
- **Fixtures**: `tests/fixtures/fake-gh/gh` (answers `label list` one-per-line under `-q`, `issue create`; refuses everything else and refuses without `FAKE_GH=1`), `tests/fixtures/shell-fn/gh-labels.cases.json` (the one `expected` for the green row and the finalise command), `echo-unfiltered.sh`

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` - the form, the affordance, the sentinels
- `shared/resources/tests/security-probe.test.mjs` - 16 rows; `shared/resources/tests/probe-boundary-signals.test.mjs` - site-parity pin extended
- `tests/fixtures/fake-gh/gh`, `tests/fixtures/shell-fn/{gh-labels.cases.json,echo-unfiltered.sh}` - fixtures
- `shared/resources/{probe-boundary-rule,finalise-dod-security-prompt,security-review-prompt}.md`, `skills/{qa-task,qa-story}/SKILL.md` - the rule once, four citations
- `CHANGELOG.md`; 10 bundled `skills/*/references/` copies
- `skills/qa-next/assets/run.template.md` - incidental one-cell fix for a pre-existing red link on `develop` (separate commit `ce45625e`)

### Architecture/Design Decisions

A function's `expected` is not the sink corpus's (which describes a script printing a gate number) — the caller names a cases file, and the test row and the documented finalise command read the same file. The fake `gh` is a directory on `PATH`, not a mock framework. Reserved exits make a broken library a *named decline* rather than a scored `absent` — the task.125 shape this task exists to end.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None — additive; the result/record gain `fakeGh`/`fake_gh` (null for other forms)

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 16 rows added in `shared/resources/tests/security-probe.test.mjs` (66 total); pin extended in `probe-boundary-signals.test.mjs`
- **Integration Tests:** live probe of `gh-labels.sh#gh_labels_filter` from the repo root — `engages`, executed 20, escaped 0 (recorded in `task.136.dod.1.security.run.json`)
- **Test Coverage:** every new branch has a row and a killed mutant

### Code Review

- **Reviewers:** Step 3b diff reviewer ×3 cycles (cycle 2 a full refute pass); Step 5c `/review-pr` (code + conformance lenses)
- **Approval Status:** ⚠️ CONCERNS (5c) — actionable findings applied; advisories recorded
- **Review Comments Addressed:** 2 bugs found and fixed across the QA loop (bug 1: `--fake-gh` recorded on a JS entry; bug 2: top-level `exit` / `set -e` escaping the sentinels); 8 advisories closed; 6 recorded for a follow-up

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — boundary probed via the engine (41 executed, measured)

- [x] No string-built shell commands — argv only; fixed body; function name regex-gated
- [x] Fixture `gh` fails closed (`FAKE_GH=1` guard; unknown subcommands exit 2)
- [x] No secrets introduced; no dependency change
- [x] One reproduction — the documented pre-existing `resolveEntry` symlink limit (carried since task.128)

### Compliance

NOT_APPLICABLE — no data, payments, UI or PHI.

---

## Documentation

- `probe-boundary-rule.md` §5 (the one statement); finalise + security-review prompts and both QA Step 3b sites cite it; CHANGELOG [Unreleased]

---

## Demo Notes

`command node shared/resources/security-probe.mjs --sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --fake-gh tests/fixtures/fake-gh --json` → `engages`, shells `[bash, zsh]`, executed 20. Drop `--fake-gh` → `unverifiable / needs-fake-gh`, executed 0, immediately.

## Known Limitations & Future Work

Follow-up task (all recorded with concrete fixes): a library that installs its own EXIT trap displaces the source guard; `needs-fake-gh` covers `shell-fn:` only; the `gh` detector misses `gh;`/`gh>`/`$GH`/transitive `source`; `source … ||` ignores errexit for the library's top-level commands; dead `!isShellFn &&` clause; the extensionless fixture `gh` is outside the ShellCheck lanes; the pre-existing `resolveEntry` symlink limit. Post-merge: set obs #138 `actioned` with PR #462.
