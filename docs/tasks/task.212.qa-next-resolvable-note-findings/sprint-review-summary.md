# Sprint Review Summary - qa-next: a note finding can be resolved, with evidence

**Story/Task ID:** task.212
**Completed Date:** 2026-10-16
**Completed By:** Lorien Gamaroff (develop-next autonomous run)
**Pull Request:** [#680](https://github.com/Gamaroff/agent-skills/pull/680)
**Tracker:** [#679](https://github.com/Gamaroff/agent-skills/issues/679)

---

## Summary

A `/qa-next` Findings-table row filed as a **note** (no bug) can now be closed. A
`— resolved YYYY-MM-DD by \`<evidence>\`` marker in its Filed as cell closes it, but only while the
evidence verifies: a real commit sha, or a later run file. `--findings` counts it as closed and
`--check` re-verifies every marker.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A note resolved by an existing commit sha is closed; `--all` shows it resolved
- [x] A sha that names no commit leaves the row open; `--check` reports `commit-not-found`
- [x] A later run file closes the row; self, earlier, missing and free-text evidence are refused by name
- [x] A marker on a bug-linked row is ignored (the bug decides); `--check` reports `on-a-bug-link`
- [x] `--resolve-finding` writes one cell, is idempotent, and leaves both files byte-identical on every refusal
- [x] Run files with no markers produce unchanged `--findings`, `--json` and `--check` output
- [x] `isOpenFinding` is pure
- [x] Template, SKILL.md and README define the grammar identically; Step 5 stages the edited run files; the "never does" exception is stated

### Key Features Implemented

- **`--resolve-finding <run> <n> --by <evidence> [--date]`**: the only writer of the marker. It verifies the evidence before writing, reads its row back, and replaces a marker that no longer holds.
- **`verifyResolution` / `isLaterRun`**: named reasons for each refusal (`commit-not-found`, `run-is-self`, `run-not-later`, `run-not-found`, `bad-evidence`, `bad-date`, `on-a-bug-link`, `not-a-git-repo`). A run is later only when its date is real and later, or it has the same date, function and environment with a higher sequence number.
- **`--changed-runs`**: lists the run files changed under the configured registry, so SKILL.md Step 5 stages exactly the files a run edited, including after a resume and with a non-default `qaNext.registryPath`.

---

## Technical Details

### Files Modified/Created

- `skills/qa-next/scripts/uat-status.mjs` — parser, verifier, writer, `--changed-runs`
- `evals/qa-next/unit/uat-status.test.mjs` — 16 task-212 tests (85 qa-next tests in total)
- `skills/qa-next/SKILL.md`, `skills/qa-next/README.md`, `skills/qa-next/assets/run.template.md` — grammar, writer, Step 5 staging, the "never does" exception
- `CHANGELOG.md` — [Unreleased] entry (task 212)

### Architecture/Design Decisions

The marker is verified every time it is read, never trusted as written. Commit evidence is checked with `git cat-file -e <sha>^{commit}`, run with a 10-second timeout and `GIT_NO_LAZY_FETCH`. A missing repository is never treated as valid evidence.

### Dependencies

- **New Dependencies Added:** None (`node:child_process` built-in)
- **Breaking Changes:** None — unmarked run files read as before

---

## Testing & Quality Assurance

- **Unit Tests:** 16 new, in `evals/qa-next/unit/uat-status.test.mjs`. Every QA-cycle fix was mutation-proven.
- **QA:** 4 cycles — CONCERNS 70 → CONCERNS 80 → FAIL 80 → **PASS 100**
- **Code Review:** Step 5c `/review-pr` ✅ APPROVE (2 LOW doc-only findings recorded)
- **CI:** green on PR #680 (test, link-check, shellcheck, validate)

---

## Security & Compliance

✅ **Security Review Completed.** The `--resolve-finding --by` boundary was probed: 27 cases executed, 0 reproduced (verdict `engages`). The hostile cases covered traversal, absolute paths, table-injecting pipes, backticks and newlines, a tree object posing as a commit, ref names, and non-canonical sha spellings. Git is called without a shell, and the evidence is grammar-checked before it reaches git.

Compliance: not applicable (local developer tooling).

---

## Known Limitations and Future Work

These come from gate 4 `recommendations.future` and are all low/advisory:

- `--changed-runs` lists every diff status, not only modifications (`--diff-filter=M`)
- A registry outside `--root` yields an empty list rather than a refusal
- No test sets `--root` to a subdirectory
- A git timeout reads as a refusal (`not-a-git-repo` / `commit-not-found`)
