# Sprint Review Summary - Secret-scan CI lane over tracked files

**Story/Task ID:** task.229
**Completed Date:** 2026-10-22
**Completed By:** Lorien Gamaroff (pipeline: `/develop-next` → `/develop-task`)
**Pull Request:** [#733](https://github.com/Gamaroff/agent-skills/pull/733)

---

## Summary

Every PR now runs a `Secret scan` CI lane that uses a pinned gitleaks 8.30.1. It scans the tracked
tree, the PR's commit messages and the PR body, and fails the build on a secret-shaped string.
`npm run lint:secrets` runs the same check locally.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A clean tree passes. A runtime token in a staged file fails, and so does one in a commit message or the PR body.
- [x] A self-check plant runs first. The lane fails before the real scan if gitleaks does not catch the plant.
- [x] With gitleaks absent, the local run skips with a message. A repository with no tracked files fails.
- [x] The `Secret scan` workflow is green on the PR head. It is the per-PR guard for task.228's three scan criteria.
- [x] No matched value is printed: every gitleaks call passes `--redact`.
- [x] `npm test`, `lint:shell` and `format:check` pass. The lane's CI wall time (20–26 s) is recorded.
- [x] CHANGELOG, CONTRIBUTING and releases.md name the lane.

### Key Features Implemented

- **`Secret scan` workflow**: runs on `pull_request` (opened, synchronize, reopened, edited) with no path filter. It installs the pinned binary and passes PR text through `env:` only.
- **`scripts/lint-secrets.sh`**: scans a copy of the tracked tree. Rules are pinned with `--config`, and the ignore list is pinned empty. The commit-message and PR-body scans run from outside the repository, so a tracked `.gitleaksignore` cannot silence them. A scanner error is distinguished from a leak.
- **Parity**: `lint:secrets` is part of `npm run ci`, and the job is in `ci-gate-parity`'s GREEN_JOBS.

---

## Technical Details

### Files Modified/Created

- `.github/workflows/secret-scan.yml` (new): the CI lane
- `scripts/lint-secrets.sh` (new): the scan, the self-check and the PR text scan
- `evals/shared/tests/lint-secrets.test.mjs` (new): stub-driven tests for every exit path
- `package.json`: the `lint:secrets` script and the `ci` entry
- `evals/shared/tests/ci-gate-parity.test.mjs`, `scripts/release-ci-verdict.mjs`, `tests/release-ci-verdict.test.js`: the lane wired into the gates
- `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/contributing/{releases,traps}.md`, `docs/contributing/evals/README.md`, `docs/architecture/concepts/{tech-stack,coding-standards}.md`: docs

### Architecture/Design Decisions

The threat model is accidental commits, not deliberate bypass. On `pull_request`, the PR's own
workflow and script run, so branch review is what catches a deliberate bypass. Rules and the ignore
list are pinned because gitleaks reads both from the scanned source as well as from its flags.

### Dependencies

- **New Dependencies Added:** none in npm. gitleaks 8.30.1 is a pinned CI binary.
- **Breaking Changes:** none. A secret-shaped string in a future PR now fails the build.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 19 tests in `evals/shared/tests/lint-secrets.test.mjs`, plus a release-verdict test
- **Probe:** a shell-argv boundary probe with 11 cases, 0 reproduced and 0 escaped, at every QA cycle and at DoD
- **Fast gate:** 6221 tests, 0 failed

### Code Review

- **QA loop:** 4 cycles. Gates: CONCERNS 80, FAIL 70, CONCERNS 90, PASS 96.
- **PR review (5c):** APPROVE, with 3 low conformance notes
- **Approval Status:** ✅ Approved. The host requires no reviews; the 5c report stands in.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Untrusted PR text never reaches a `run:` line
- [x] Output is redacted, and no secret value is in version control
- [x] No new npm dependencies
- [x] The boundary probe held

### Compliance Review

✅ Not applicable: this is an internal CI lane with no personal, payment, UI or health data.

---

## Demo Notes

### How to Verify

1. Run `npm run lint:secrets` on a clean checkout. It exits 0 and prints the gitleaks version.
2. Stage a scratch file holding a runtime-generated `api_key = …` token, then re-run. It exits 1 and names the file, line and rule, never the value.
3. Open any PR and confirm the `Secret scan` check appears.

---

## Impact & Value

### User Impact

Contributors learn about an accidentally committed credential before it merges, not after.

### Technical Impact

Per-PR enforcement replaces task.228's one-off scan. The local twin keeps CI and local runs aligned.

---

## Known Limitations & Future Work

### Current Limitations

- CR-1/CR-2 (low): the tree-scan copy can still read a tracked `.gitleaksignore`. That is not exploitable today, because the fingerprint embeds a random path. See the task's Deferred Work.
- The gitleaks tarball is not sha256-verified. `shellcheck.yml` does not verify its tarball either.

### Suggested Follow-Up Stories

- Rename the tree copy's `.gitleaksignore` before the scan, and assert it in the test (CR-1, CR-2).
- Run the scanner from the base ref, so a PR cannot change the script that judges it.
