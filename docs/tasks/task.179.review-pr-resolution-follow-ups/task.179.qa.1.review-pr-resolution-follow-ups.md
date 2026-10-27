# QA Report: Task 179 - /review-pr resolution follow-ups

**Task**: [task.179.review-pr-resolution-follow-ups.md](./task.179.review-pr-resolution-follow-ups.md)
**Gate File**: [task.179.gate.1.review-pr-resolution-follow-ups.yml](./task.179.gate.1.review-pr-resolution-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-27
**Testing Completed**: 2026-10-27
**Gate Status**: PASS

---

## Executive Summary

QA cycle 1 checked the three phases against PR #764 at `ce069bb6`. The checks were the diff code review, a probe-engine run on the parser, Step 4b, a mutation spot check and the review-pr suite. Every success criterion is held by a committed test. The one finding is low-severity and advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (10/10 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (three target shapes, § Breaking Changes)
- [x] Code on feature branch with open PR (#764, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [x] Performance Testing (offline-parser test)
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only diff reviewer (Step 3b). The task has 3 phases, a single module plus one shared doc, and no risk level, so no parallel agents ran. Code review blocking was resolved to `true` by the develop-task run-level override; the document has no `code_review_blocking:` flag. The reviewer was dispatched at 2026-10-27T08:38:52Z and took 81932 ms (the completion notice's `duration_ms`).

First review: no prior gate; whole branch diff (`origin/develop...HEAD`, 1134 lines).

Step 4b ran on both changed prose files. Each has one changed block, and neither changed block could execute here:

- `skills/review-pr/SKILL.md:96` (Step 0b) was refused as `mutating`. It sources `references/resolve-platform.sh`, which contains `gh issue`, a deny-listed command. This is by design, and no binding makes it runnable.
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:137` (§0a) was refused as `unrecognised-command: <unparseable>` (fail-closed).

The engine reported `zero-blocks-executed` and `changed-blocks-not-executed` for both files. Both changed blocks are still executed per PR by committed tests that extract them from the prose: Step 0b at `review-pr.test.js:1099`, and §0a (from the bundled copy) at `review-pr.test.js:1429`. Shells: bash only, because zsh is not installed on this host. CI's test job runs zsh.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: one host reading | PASS | Verified | `host_of` used by both arms (`parse-target.sh:53`, `:195`, `:208`); no `HOSTPORT` remains |
| Phase 2: skill prose and `.env` | PASS | Verified | target row, KIND row, Step 0b comment and strip; stale test comments and title fixed |
| Phase 3: §0a contract, bundle, CHANGELOG | PASS | Verified | shared source + 6 bundled copies (`bundle:check` 0); CHANGELOG entry |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| CR-1 bypass shapes parse as branch | branch | branch | PASS | parser cases `ghe.corp#…`, `ghe.corp?…` (bash; zsh in CI) |
| One host reading for both arms | `host_of` only | `host_of` only | PASS | mutation below reds the bypass cases |
| `x@github.com/…` → PR 1; `github.com:1@evil.com/…` → branch | as stated | as stated | PASS | parser cases |
| `JIRA_URL= # prod` → "not set" | not set | not set | PASS | executed Step 0b test (`review-pr.test.js:2368`) |
| SKILL.md states the known-host rule | stated | stated | PASS | `SKILL.md` target row and KIND `branch` row |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| No extra network call | 0 calls | 0 calls | PASS | test "no target makes a network or git call" (`review-pr.test.js:994`) |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| review-pr suite | green | 172/172 | PASS | run this cycle at `ce069bb6` |
| shellcheck | clean | clean | PASS | `--severity=warning` |
| validate / bundle:check | green | green | PASS | `npm run validate -- skills/review-pr/`, `npm run bundle:check` |
| Full suite / lint:secrets | green | green | PASS | develop Step 3 `ci:fast` 6415/0; CI `secret-scan` pass |

---

## Breaking Changes Validation

### Breaking Change: three target shapes change kind
Documented: Yes
Migration Path Provided: Yes (none needed: no real branch has these shapes, and the `https://` form already behaved this way)
Migration Tested: Yes (parser cases)
Consumer Code Updated: N/A
Notes: `ghe.corp#.atlassian.net/…` and `ghe.corp?.atlassian.net/…` change from URL to branch, and `x@github.com/…` changes from branch to PR.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- **CR-1**: `JIRA_URL=#bare` reads as unset, but a shell reads it as `#bare`, so the test comment "as a shell reads it" is wrong for this one case. Impact: a non-URL value gets the "not set" warning instead of "differs". Advisory; see Code Review.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
The offline-parser test runs every parser case with `gh`, `curl`, `wget` and `git` replaced by logging stubs, and none is called. It was calibrated in develop by injecting a `curl` into `host_of`, which turned it red.

### Reliability — PASS
Both arms now read the host the same way, so the known-host check and the parse can no longer disagree.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 21 (run record `totals.executed`; `escaped: 0`)
- `security-probe.mjs --sink filename --entry 'shell-fn:skills/review-pr/scripts/parse-target.sh#parse_target'` ran with the 21 committed `PARSER_PROBE_CASES`, which include the two new CR-1 bypass shapes. Result: verdict `engages`, 0 reproduced, 0 overblocked, 0 escaped. Record: `task.179.qa.1.security.run.json`.

### Maintainability — PASS
Stale comments now describe the known-host rule, the docs-guard test title says what it checks, and the §0a contract names `pr_number`.

---

## Code Review

Advisory except where noted. Code review blocking was resolved to `true`, but no finding is `bug` + `high` confidence, so nothing was promoted.

**Correctness bugs (1):**
- [low/medium] `skills/review-pr/SKILL.md:145`: the strip `(^|[[:space:]]+)#.*$` also clears `JIRA_URL=#bare`. A sourcing shell reads that value as `#bare`, and the test at `review-pr.test.js:2368` asserts "unset … as a shell reads it". Fix: treat `#` as a comment only after whitespace in the raw value (decide before the first sed eats the space after `=`), or drop `#bare` from the test and reword the comment.
  - Provenance: new to this change. On base, the strip `[[:space:]]+#.*$` left `#bare` as the value.
  - Reproduced: `printf 'JIRA_URL=#bare\n' > e.env; . e.env` gives `[#bare]`.

**Cleanups (0)**

**Boundary:** `boundary: true`, because `parse_target` classifies `target` and refuses malformed input. It was probed with the `shell-fn:` form: `probes_executed: 21`, `escaped: 0`.

**Mutation proofs:**
- mutation-proven: scheme-less arm's `host_of "$TARGET"` → raw `${TARGET%%/*}` (scratch worktree at HEAD) → parser cases `ghe.corp#.atlassian.net/…`, `ghe.corp?.atlassian.net/…`, `x@github.com/…` and the `shell-fn:` probe test went red (6 red) → covered

Proved 1 of 1 this cycle. The develop-time proofs (the `.env` strip, and the injected `curl`) are in the task's Implementation Summary and were not repeated.

---

## Regression Testing

| Area | Result |
| --- | --- |
| review-pr parser, Step 0b, Step 1a/2 rungs | PASS (172/172) |
| §0a consumers (develop-*, review-task, review-story bundled copies) | PASS (`bundle:check` 0; full suite 6415/0 in develop Step 3) |

---

## Test Artifacts

### Files Reviewed
`skills/review-pr/scripts/parse-target.sh`, `skills/review-pr/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, `CHANGELOG.md`

### Test Commands Executed
```bash
command node --test skills/review-pr/tests/review-pr.test.js
npm run validate -- skills/review-pr/
shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh
npm run bundle:check
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-pr/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills/review-pr/references:references --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-0-resolve-and-prepare.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'shell-fn:skills/review-pr/scripts/parse-target.sh#parse_target' --cases-file parse-target.cases.json --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.179.review-pr-resolution-follow-ups/task.179.qa.1.security.run.json --json
```

### Coverage Report
Not measured (shell and prose under `node --test`; no coverage tool configured for shell).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: align `JIRA_URL=#bare` with how a shell reads it, or narrow the test's claim.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is held by a committed per-PR test, the main fix is mutation-proven, and the boundary probe is measured and clean. The single finding is low-severity and advisory.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.179.qa.1.review-pr-resolution-follow-ups.md`
**Gate File**: co-located at `task.179.gate.1.review-pr-resolution-follow-ups.yml`
**Next Steps**: Step 5c `/review-pr` (the QA loop's exit gate), then finalise.
