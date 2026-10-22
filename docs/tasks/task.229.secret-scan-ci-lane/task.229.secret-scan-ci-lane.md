---
id: task.229
title: "Secret-scan CI lane over tracked files"
type: task
description: "Add a pinned-gitleaks CI lane and its local twin so a secret-shaped string in a tracked file fails the build."
tags: [gitleaks, secret-scan, ci, guard]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-22
updated: 2026-10-22
assignee:
estimated_effort_hours: 4
github_issue: 731
---

# Technical Task: Secret-scan CI lane over tracked files

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.229.review.1.secret-scan-ci-lane.md` implemented 2026-10-22
**GitHub Issue**: [#731](https://github.com/Gamaroff/agent-skills/issues/731)

---

## 1. Overview

Nothing in CI runs a secret scanner, so the false positive task.228 removes could come back
unnoticed, and so could a real credential. This task adds a `Secret scan` workflow that runs a
pinned gitleaks over the **tracked** tree on every PR and push. It also adds the local twin,
`npm run lint:secrets`, which joins `npm run ci` the way `lint:shell` mirrors `shellcheck.yml`.
Before trusting a green result, the lane proves it can catch a token planted at runtime.

**Scope:** a new workflow, a new script, `package.json`, the CI-parity test's lane tables, and the
contributor docs that list the CI lanes.

**Key deliverables:**

- `.github/workflows/secret-scan.yml`: pinned gitleaks, unfiltered, same triggers as `shellcheck.yml`.
- `scripts/lint-secrets.sh` (`npm run lint:secrets`): the local twin. It scans the same file set and
  skips loudly when the binary is absent.
- A self-check in the script: a token generated at runtime must make the scan fail, or the lane exits
  non-zero, whatever the real scan says.

**Expected outcome:** a PR that adds a secret-shaped string to a tracked file goes red, and a
contributor can see that before pushing.

---

## 2. Motivation

### Current Problems

1. **No guard.** `.github/workflows/` holds `branch-policy.yml`, `docs-link-check.yml`,
   `release.yml`, `shellcheck.yml`, `test.yml` and `validate.yml` (`ls .github/workflows/`). None
   calls gitleaks (`grep -rln gitleaks .github scripts package.json` returns nothing).
2. **Consumers find out first.** The testing-guide hit was found by a downstream repository's scan,
   not here. Every vendored skill directory is a place this can happen again.
3. **A fix without a guard decays.** task.228 makes the tree clean once. Nothing keeps it clean.

### Benefits

1. **Caught at the PR**, not in a consumer's pre-publish scan.
2. **Real credentials are caught too**, not only sample values.
3. **Same answer locally and in CI**: one file-set definition, one pinned version.
4. **The guard proves itself**: the planted-token self-check fails the lane if the scanner, its
   config or the file list ever stops catching anything.

---

## 3. Technical Background

### Current Architecture

- The CI lanes that must be green for a PR into develop are listed in `GREEN_JOBS`,
  `evals/shared/tests/ci-gate-parity.test.mjs:94` (`const GREEN_JOBS = [`). It holds `test.yml`,
  `validate.yml` and `shellcheck.yml`.
- That test asserts set equality between what the green jobs run and the `ci` composite in
  `package.json` (`"ci": "npm run ci:fast && … && npm run lint:shell"`). A step that is not an
  `npm run` call must be named in `LANE_TWINS` (`ci-gate-parity.test.mjs:105`), which maps the
  step name to the npm script that reproduces it. Today that includes
  `"Lint source shell scripts": "lint:shell"`.
- `shellcheck.yml` is the pattern to copy. It is a separate, unfiltered workflow. It installs a
  **pinned** binary from the release tarball, builds its file list from `git ls-files`, and fails on
  an empty list. Its local twin, `scripts/lint-shell.sh`, skips loudly with exit 0 when the binary is
  absent. The header comments of both files explain why: a path-filtered workflow would never fire
  for `scripts/`, and adding a step to `test.yml` would force the binary install into `npm run ci`.
- `docs/contributing/releases.md` § "`npm run ci` is the local form…" and `CONTRIBUTING.md`
  § "Before you open a PR" both list every lane in the composite.

### Target Architecture

- **`secret-scan.yml`**: job `secret-scan`. Steps: `actions/checkout@v7` with `fetch-depth: 0`
  (the PR text scan needs the base commit; the default depth of 1 has no range to read),
  `Install gitleaks (pinned)`, `Scan tracked files for secrets`. The last step runs
  `npm run lint:secrets`, so the lane and the twin share one file-set definition instead of two
  copies kept in step. It passes the PR text scan's inputs as step `env:`, never as `${{ }}`
  inside `run:` (a PR body is attacker-controlled text, and interpolating it into the script is
  script injection):
  - `pull_request`: `SECRET_SCAN_RANGE: ${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }}`
    and `SECRET_SCAN_PR_BODY: ${{ github.event.pull_request.body }}`.
  - `push`: `SECRET_SCAN_RANGE: ${{ github.event.before }}..${{ github.event.after }}`, no body.
    A `before` of all zeros (a new branch) has no range: the script skips the commit-message scan
    with a message and still runs the tree scan.
- **`scripts/lint-secrets.sh`**:
  1. `cd "$(git rev-parse --show-toplevel)"`.
  2. Binary absent → print `gitleaks not installed — lane skipped (CI runs it)` and exit 0.
  3. **Self-check.** Write a scratch file holding `const api_key = '<value>';`, where `<value>` is
     generated at runtime from `/dev/urandom` (32 base64url characters). Scan it, and require exit
     non-zero. If the scan passes, print `self-check failed: the scanner caught nothing` and exit 1.
     The value is generated, never committed, so the repository never holds a string the lane
     would flag.
  4. **Tracked files only.** Copy the tracked set into a scratch directory with
     `git ls-files -z | tar --null -T - -cf - | tar -xf - -C "$tmp"`. This works with GNU and BSD
     tar, and with a working tree that has uncommitted edits. Fail when the list is empty.
     `gitleaks dir .` cannot be used: on a contributor's machine it also reads untracked,
     gitignored files (`.claude/state/` gave three hits on 2026-10-22) and `node_modules/`.
     **A tracked file deleted in the working tree is filtered out** before `tar` (keep a path only
     when `[ -e "$path" ]`), so an uncommitted deletion does not fail the lane: a file that is not
     there holds nothing to scan, and CI's checkout never has one.
  5. `gitleaks dir "$tmp" --no-banner --redact --exit-code 1`. Report hits by file, line and rule
     only; never print a value.
  6. **PR text scan.** Inputs come from the environment so CI and the twin run the same code:
     - `SECRET_SCAN_RANGE` (`<base>..<head>`): when set, `git log --format=%B "$SECRET_SCAN_RANGE"`
       is piped to `gitleaks stdin --no-banner --redact --exit-code 1`. When unset (local runs),
       the range defaults to `$(git merge-base origin/develop HEAD)..HEAD` if `origin/develop`
       resolves; otherwise the commit-message scan is skipped with a message. A base of all zeros
       is skipped with a message.
     - `SECRET_SCAN_PR_BODY`: when non-empty, `printf '%s' "$SECRET_SCAN_PR_BODY"` is piped to
       `gitleaks stdin` with the same flags. It is never expanded unquoted or `eval`'d.
     - A hit in either fails the lane with `gitleaks found a secret-shaped string in the PR's
       commit messages / PR body`, redacted.
     Every `gitleaks` call in the script carries `--redact`.
- **`package.json`**: `"lint:secrets": "bash scripts/lint-secrets.sh"`, appended to `ci`.
- **`ci-gate-parity.test.mjs`**: add `{ workflow: ".github/workflows/secret-scan.yml", job: "secret-scan" }`
  to `GREEN_JOBS`. If the step calls `npm run lint:secrets`, no `LANE_TWINS` entry is needed;
  otherwise add `"Scan tracked files for secrets": "lint:secrets"`. Add `Install gitleaks (pinned)`
  to `SETUP_STEPS` (`ci-gate-parity.test.mjs:131`), beside `"Install ShellCheck (pinned)"`.

### Important Clarifications

- **The binary is installed in CI, never in `npm run ci`.** That mirrors the ShellCheck decision.
- **A false positive is reworded**, as task.228 does, or carries an inline `gitleaks:allow` with
  a reason in the same comment. A path allowlist is not added: it hides everything in that path.
- **History is not scanned.** `gitleaks git` would find the values task.228 removed. The lane
  guards the tree, not the past.
- **(unverified)** Whether `release.sh`'s CI-verdict check (`scripts/release-ci-verdict.mjs`, task
  153) should also require this lane. See Out of Scope.

---

## 4. Scope

### In Scope

✅ **Workflow**: `.github/workflows/secret-scan.yml`, with a pinned gitleaks version.
✅ **Local twin**: `scripts/lint-secrets.sh`, plus the `package.json` `lint:secrets` script and its place in `ci`.
✅ **Self-check**: a planted runtime token must trip the scan.
✅ **PR text scan** (from task.228, re-scoped 2026-10-22): the PR's own commit messages (`git log --format=%B <base>..<head>`) and its PR body, each piped to `gitleaks stdin --redact`. Only the PR's range, which is not a history scan. This is the per-PR guard for task.228's commit-message / PR-text criterion.
✅ **Parity**: `GREEN_JOBS`, plus a `LANE_TWINS` entry if needed, in `ci-gate-parity.test.mjs`.
✅ **Behaviour test**: `evals/shared/tests/lint-secrets.test.mjs`, which runs the script against a stub `gitleaks` on a replaced `PATH` (the pattern of `lint-shell-absent-binary.test.mjs`) so every exit path is held per PR without the real binary in `test.yml`.
✅ **Docs**: `CONTRIBUTING.md` "Before you open a PR", the `releases.md` lane list and CI checklist, `SECURITY.md` § "Secret scanning" (it documents only the pre-commit hook), `docs/architecture/concepts/tech-stack.md` (the CI line says "six workflows" and describes each), `docs/architecture/concepts/coding-standards.md` § "Validation before commit" (lists ShellCheck beside the lanes a contributor runs), and `CHANGELOG.md` `### Added`.

### Out of Scope

❌ **Fixing the current hits**: task.228, which must merge first.
❌ **Scanning git history.**
❌ **Making `release.sh` require the lane.** It is a follow-up once the lane has a green record;
changing the release gate in the same PR that creates the lane would gate releases on a lane with
no history.
❌ **A repository `.gitleaks.toml`** with path allowlists. Add one only if a real false positive
appears that cannot be reworded, and say why.
❌ **Bumping the pre-commit hook's gitleaks pin.** `.pre-commit-config.yaml` pins `rev: v8.21.2`
for the opt-in staged-change hook; the CI lane pins 8.30.1. The docs name CI's pin as the
authority and note the hook's older pin; aligning the hook is a follow-up (see Notes).

---

## 5. Breaking Changes

None for consumers. For contributors, `npm run ci` gains a lane, which skips when gitleaks is not
installed.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.229.plan.secret-scan-ci-lane.md](task.229.plan.secret-scan-ci-lane.md)

### Phase 0: Precondition

**Risk Level**: Low

**Changes**:
- [x] Confirm task.228 is `accepted` and merged to `develop`. Otherwise HALT: the lane is red on the current tree.

**Dependencies**: task.228

---

### Phase 1: Local twin script

**Risk Level**: Medium

**Files**:
- `scripts/lint-secrets.sh` (new)
- `package.json`

**Changes**:
- [x] Write the script: root cd, absent-binary skip, self-check, tracked-file copy, empty-list guard, scan.
- [x] Add `lint:secrets` and append it to `ci`.
- [x] Mutation-prove the self-check: replace the planted value with a low-entropy one and confirm the script exits 1 with the self-check message.
- [x] Mutation-prove the scan: add a scratch tracked file with a runtime-generated token (staged, never committed) and confirm the script exits 1. Then remove it.
- [x] Add the PR text scan: commit messages of `<base>..<head>` and, when a PR body is available (CI event payload), the body, each through `gitleaks stdin --redact`, with inputs from `SECRET_SCAN_RANGE` / `SECRET_SCAN_PR_BODY` as Target Architecture step 6 specifies. Mutation-prove it with a runtime-generated token in a scratch message.
- [x] Write `evals/shared/tests/lint-secrets.test.mjs` (reached by `npm test`'s `evals/shared/tests/*.test.mjs` glob). Each case runs `scripts/lint-secrets.sh` on a replaced `PATH` holding the externals it calls and, where the case needs one, a stub `gitleaks` whose exit code depends on its arguments and which logs every invocation:
  1. No `gitleaks` on `PATH` → exit 0, skip message.
  2. Stub exits 0 for everything (a scanner that catches nothing) → exit 1, self-check message, tree never scanned.
  3. Stub fails the self-check dir and passes the rest → exit 0 (the happy path).
  4. Stub also fails the tree scan → exit 1, tree-hit message.
  5. Stub fails `stdin` when given a set `SECRET_SCAN_RANGE` / `SECRET_SCAN_PR_BODY` → exit 1, PR-text message.
  6. Run inside a temporary git repository with no tracked files → exit 1, empty-list message.
  7. Every logged stub invocation carries `--redact`.
  Mutation-prove it: delete the self-check block → case 2 goes red; drop `--redact` from one call → case 7 goes red.

**Dependencies**: Phase 0

---

### Phase 2: CI workflow and parity

**Risk Level**: Medium

**Files**:
- `.github/workflows/secret-scan.yml` (new)
- `evals/shared/tests/ci-gate-parity.test.mjs`

**Changes**:
- [x] Workflow: same `on:` as `shellcheck.yml`, pinned install step that prints `gitleaks version`, scan step calling the twin.
- [x] Add the job to `GREEN_JOBS`, and to `LANE_TWINS` if the step is not an `npm run` call.
- [x] Confirm the parity test goes red before the `GREEN_JOBS` edit or before the `ci` composite edit, then green after both.
- [x] Classify the new push-triggered workflow in `scripts/release-ci-verdict.mjs`: `tests/release-ci-verdict.test.js` requires every push-triggered branch workflow to be in `WORKFLOWS` ("a new one is a decision, not a default"). Added `WORKFLOWS.notGating: ["Secret scan"]`, which `ciVerdict` never reads, so the release gate is unchanged (Out of Scope); parity cases extended to the new list, plus a verdict case that a red `Secret scan` run leaves the verdict green. *(Found at develop, 2026-10-22.)*

**Dependencies**: Phase 1

---

### Phase 3: Docs and CHANGELOG

**Risk Level**: Low

**Files**:
- `CONTRIBUTING.md`, `docs/contributing/releases.md`, `SECURITY.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md`, `CHANGELOG.md`

**Changes**:
- [x] Add `lint:secrets` to every lane list that names `lint:shell` (found with `grep -rn 'lint:shell' CONTRIBUTING.md docs/ --include='*.md'`, excluding `docs/tasks/`).
- [x] Add a `Secret scan` line to the releases.md CI checklist.
- [x] `SECURITY.md` § "Secret scanning": add the CI lane and `npm run lint:secrets`; say CI's pin is the authority and the pre-commit hook pins an older version.
- [x] `tech-stack.md` CI line: seven workflows, and one clause describing `secret-scan.yml`.
- [x] `coding-standards.md` § "Validation before commit": add `npm run lint:secrets` beside the ShellCheck entry.
- [x] `docs/contributing/traps.md` workflow-filter table and check counts, and `docs/contributing/evals/README.md`'s lane-for-lane list: add `secret-scan.yml`. *(Found at develop, 2026-10-22.)*
- [x] CHANGELOG `[Unreleased]` → `### Added` entry citing task 229.

**Dependencies**: Phase 2

---

## 7. Files Summary

### New Files

1. ✅ `.github/workflows/secret-scan.yml`: the CI lane.
2. ✅ `scripts/lint-secrets.sh`: the local twin and the single file-set definition.
3. ✅ `evals/shared/tests/lint-secrets.test.mjs`: the per-PR behaviour test for the script's exit paths.

### Files to Modify

4. ✅ `package.json`: `lint:secrets` script, appended to `ci`.
5. ✅ `evals/shared/tests/ci-gate-parity.test.mjs`: `GREEN_JOBS`, `SETUP_STEPS`, plus `LANE_TWINS` if needed.
6. ✅ `CONTRIBUTING.md`: the "Before you open a PR" lane list.
7. ✅ `docs/contributing/releases.md`: the lane list and the CI checklist.
8. ✅ `SECURITY.md`: § "Secret scanning".
9. ✅ `docs/architecture/concepts/tech-stack.md`: the CI workflow line.
10. ✅ `docs/architecture/concepts/coding-standards.md`: § "Validation before commit".
11. ✅ `CHANGELOG.md`: `### Added`.
12. ✅ `scripts/release-ci-verdict.mjs`: `WORKFLOWS.notGating` (non-gating classification of `Secret scan`).
13. ✅ `tests/release-ci-verdict.test.js`: parity cases read `notGating`; verdict ignores it.
14. ✅ `docs/contributing/traps.md`, `docs/contributing/evals/README.md`: workflow lists.

---

## 8. Testing Strategy

### Unit / lane tests

**Scope**: the twin script's three outcomes.

**Actions**:
- [x] Clean tree (after task.228): exit 0.
- [x] Planted tracked token: exit 1, hit reported by file and rule, value redacted.
- [x] Self-check broken (low-entropy plant): exit 1 with the self-check message.
- [x] Binary absent (`PATH` without gitleaks): exit 0 with the skip message.
- [x] Empty file list (run outside a git work tree or with a forced-empty list): exit 1.

**Command**: `node --test evals/shared/tests/lint-secrets.test.mjs` holds these per PR with a stub
`gitleaks` (Phase 1's seven cases). The two real-binary outcomes, a clean tree and a planted tracked
token, are also run by hand with the real `gitleaks` and recorded with their exit codes in the
implementation report; in CI the self-check proves on every run that the real pinned binary
catches a planted token. ShellCheck lints the new script through `npm run lint:shell`.

### Integration

**Scope**: CI parity and the workflow itself.

**Actions**:
- [ ] `npm test` (includes `ci-gate-parity.test.mjs`) is green.
- [ ] The PR's `Secret scan` check runs and is green on the PR head.

### Performance Tests

**Metrics**: lane wall time in CI. A full-tree local scan with untracked files took 2m22s
(138 MB, 2026-10-22). The tracked set is much smaller, but record the CI time and keep the lane
in the same order as ShellCheck's.

---

## 9. Success Criteria

### Functional

- [ ] On the post-task.228 tree, `npm run lint:secrets` exits 0 (the `Secret scan` lane on the PR head, and `lint-secrets.test.mjs` case 3).
- [ ] With a runtime-generated token in a staged scratch file, `npm run lint:secrets` exits 1 (Phase 1's scan mutation, recorded; `lint-secrets.test.mjs` case 4 holds the exit path).
- [ ] With the self-check plant replaced by a low-entropy value, the script exits 1 before the real scan (Phase 1's self-check mutation, recorded; `lint-secrets.test.mjs` case 2 holds it).
- [ ] With gitleaks off `PATH`, the script exits 0 and prints the skip message (`lint-secrets.test.mjs` case 1).
- [ ] With no tracked files, the script exits 1 (`lint-secrets.test.mjs` case 6).
- [ ] The `Secret scan` workflow is green on the PR head.
- [ ] With a runtime-generated token in a scratch commit message, the PR text scan exits 1 (recorded; `lint-secrets.test.mjs` case 5 holds the exit path); on the real PR range and body it exits 0 (the lane on the PR head).
- [ ] This lane is the per-PR guard for task.228's three scan criteria (the testing guide, the tracked tree, commit messages / PR text). Each runs on every PR.

### Performance

- [ ] The lane's CI wall time is recorded in the implementation report.

### Code Quality

- [ ] `npm test` passes, including `ci-gate-parity.test.mjs`.
- [ ] `npm run lint:shell` passes with the new script in its file set.
- [ ] `npm run format:check` passes.
- [ ] No matched value is printed anywhere: lane output, reports or PR text (every `gitleaks` call carries `--redact`, held by `lint-secrets.test.mjs` case 7).

### Migration

- [ ] CHANGELOG `### Added` entry cites task 229.
- [ ] CONTRIBUTING.md and releases.md list `lint:secrets` wherever they list `lint:shell`.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

**1. Pinned version drift**
- **Risk**: a new gitleaks rule fires on untouched text after a bump.
- **Probability**: Medium (on each bump)
- **Impact**: Major. Every PR goes red for a reason unrelated to the PR.
- **Mitigation**: pin the version, as ShellCheck is pinned. Bump in its own commit along with whatever the bump flags.
- **Rollback**: revert the bump commit.

**2. Local and CI disagree**
- **Risk**: the local binary version (8.30.1 on the owner's machine, `pacman -Q gitleaks`) differs from the CI pin, so the twin passes and CI fails, or the reverse.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: the script prints the version it ran. The docs say CI's pin is the authority.
  A third version exists: the opt-in pre-commit hook pins `v8.21.2` (`.pre-commit-config.yaml`).
  `SECURITY.md` names it; aligning it is out of scope.

### Low Risk Areas

**1. A false positive in a future PR**
- **Mitigation**: reword it, or add `gitleaks:allow` with a reason. The docs state this rule.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The lane is red on PRs that add nothing secret-shaped, and a reword is not quick.

**Steps**:
1. `git revert` the task's merge commit on `develop`. This removes the workflow, the script, the `ci` entry and the parity rows together, so the parity test stays consistent.

**Verification**: `npm test` green. The `Secret scan` check no longer appears on new PRs.

### Partial Rollback

**When to Use**: only the CI workflow is the problem. Do not remove the workflow alone: the parity
test would then fail on the orphaned `lint:secrets`. Revert as a whole.

### Forward Fix

**When to Use**: a single false positive. Reword it in the PR that introduced it.

### Rollback Triggers

**Critical**: the lane blocks every PR. **Non-critical**: one false positive.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-22 | 1.0     | Initial draft | create-task |
| 2026-10-22 | 1.1 | Took over the per-PR guard for task.228's scan criteria (human decision): added the PR text scan (commit messages and PR body of the PR range) to scope, Phase 1 and Success Criteria | Claude |
| 2026-10-22 | 1.2 | Review passed (8/10) — specified the PR text scan inputs (env-only, fetch-depth 0), added lint-secrets.test.mjs for the exit paths, widened the doc sweep (SECURITY.md, tech-stack.md, coding-standards.md), acknowledged the pre-commit hook pin, filtered deleted tracked files | review-task |
| 2026-10-22 |  | Status → ready-for-development | review-task |
| 2026-10-22 |  | Implemented — 15 files (3 new), 9 new tests (8 lint-secrets, 1 release-ci-verdict) | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Precondition
- [x] task.228 merged

### Phase 1: Local twin script
- [x] Script
- [x] `package.json`
- [x] Two mutations proven
- [x] `lint-secrets.test.mjs`

### Phase 2: CI workflow and parity
- [x] Workflow
- [x] Parity tables

### Phase 3: Docs and CHANGELOG
- [x] Lane lists
- [x] SECURITY.md, tech-stack.md, coding-standards.md
- [x] CHANGELOG

---

## References

- **Depends on**: task.228 (clean baseline)
- **Pattern**: `.github/workflows/shellcheck.yml`, `scripts/lint-shell.sh`
- **Parity rules**: `evals/shared/tests/ci-gate-parity.test.mjs` (task 111)

---

## Notes

### Future Improvements

- Have `release.sh` require a green `Secret scan` once the lane has a record.
- Align the pre-commit hook's gitleaks pin (`v8.21.2`) with the CI lane's.

---

**Status:** Ready for Review

**Next Steps**:
1. After task.228 merges: `/develop-task docs/tasks/task.229.secret-scan-ci-lane/task.229.secret-scan-ci-lane.md`
2. QA artifacts land beside this file.
