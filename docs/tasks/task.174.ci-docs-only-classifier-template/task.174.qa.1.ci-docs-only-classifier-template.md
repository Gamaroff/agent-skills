# QA Report: Task 174 - Publish the docs-only CI classifier as an optional consumer template

**Task**: [Link to task document](./task.174.ci-docs-only-classifier-template.md)
**Gate File**: [task.174.gate.1.ci-docs-only-classifier-template.yml](./task.174.gate.1.ci-docs-only-classifier-template.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: CONCERNS

---

## Executive Summary

QA covered both classifier variants, their specs and snippets, the parity test, the guide and the test wiring on PR #808 at `b5bfc3fb`. All four phases are delivered, every success criterion holds on evidence, and the boundary (`is_docs` in both variants) passed 28 executed probes. One medium finding: the GitHub snippet's `concurrency` block cancels push runs on the base branch. The lifted classifier assumes those runs always complete, and its source does not cancel them.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — on TASK-174-QA-1

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`)
- [x] All implementation phases completed (14/14 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none — opt-in template)
- [x] Code on feature branch with open PR (#808)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit — real scripts against temp git repos)
- [ ] Performance Testing (measured upstream; quoted, see Success Criteria)
- [x] Regression Testing
- [x] Security Review (executed boundary probes)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only diff reviewer (Step 3b). This is a first review, the work is low risk, and 4 phases touch only `docs/examples/`, `docs/runbooks/`, `package.json` and `CHANGELOG.md`. `code_review_blocking=true` comes from the develop-task pipeline. Reviewer dispatched 2026-11-02T14:02Z; it returned in 118.8 s (`duration_ms` 118821).

CI on b5bfc3fb70df: pending.

Step 4b: not applicable. No runnable prose in the change set: no `SKILL.md` or `shared/resources/*.md` changed, and the guide has no fenced bash block.

Criteria drift: `clean` against the `reviewed-blob` base. The stamped `reviewed_blob` (`40dbf136…`) was never committed, because the review report and the review-fixed document landed in separate commits. So the engine first fell back to the pre-review commit and reported `/review-task`'s own fixes as 6 reworded criteria and 1 added. QA rebuilt the reviewed bytes by reverting only the Step 3 edits (ticks, status, the develop Change Log row, the Phase 0/3 wording). The rebuild hashed to exactly `40dbf1362b03a8fc21aaebb69d84be8d843d4b2c`, and QA wrote that object to the local store with `git hash-object -w`. Against it, drift is clean: no criterion moved after review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: precondition | PASS | Verified | task.127 accepted, PR #984 merged; runs measured and quoted in the guide |
| Phase 1: GitHub Actions template | CONCERNS | Verified | Script, 45-case spec, snippet and glob are all present; the snippet's `concurrency` block is TASK-174-QA-1 |
| Phase 2: guide and parity | PASS | Verified | Guide linked from the runbook index; parity test (2 cases) green |
| Phase 3: Bitbucket variant | PASS | Verified | Script, 22-case spec, snippet; 403 and own-hash checks are mutation-proven |

**Overall Phase Completion**: 4/4 delivered; 3 PASS, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Phase 0 evidence in the guide's "Measured" section | `docs/runbooks/ci-docs-only-skip.md` § Measured: PR #984, runs 41439187444 / 41444278348 / 41445192250 | PASS |
| Docs-only `synchronize` over a successful run of `CI_WORKFLOW_PATH` → `code=false` | `classify-changes.test.js` "docs increment on a successful PR run of the workflow → false…" and "CI_WORKFLOW_PATH non-default…" | PASS |
| Every lookup failure and an unset `CI_WORKFLOW_PATH` → `code=true`, both platforms | GitHub: lookup-file-missing, unparseable, API error body, curl non-zero, jq absent, unset/empty `CI_WORKFLOW_PATH`. Bitbucket: 401, 403, 404, non-JSON, empty, FAILED, in-progress, branch-only, other commit, curl failing, jq absent, no credential | PASS |
| Parity test passes on the fixed path list | `docs-set-parity.test.js`: 2/2; non-vacuity asserts both verdicts appear | PASS |
| Guide quotes measured before/after, not an estimate | 37 min 27 s against 2 min 52 s and 3 min 42 s, with run IDs | PASS |
| Specs run in `npm test` | `package.json` `test:suite` glob `'docs/examples/ci/*/*.test.js'`; `tests/test-runner-reach.test.js` names all 3 suites when it is removed (M7) | PASS |
| Each § 8 mutation proof turns a test red, recorded in the QA report | § Code Review below: 8 proofs, all `covered` | PASS |
| `npm run ci` green; `docs-link-check` clean on the guide | `ci:fast` 7114/0 fail at Step 3; `doc-links.js` clean on the guide. Full `npm run ci` and CI's link check run at the merge gate (CI pending at this head) | PASS (local) |
| Guide states adoption is optional, and the fail-safe contract | Guide's audience note and "The contract" section | PASS |
| CHANGELOG entry | `changelog-cites.sh task.174` → `cites (task 174)` | PASS |

Each test-free criterion cites the file that makes it true. None rests on its checkbox.

---

## Breaking Changes Validation

None. The template is opt-in, and no skill, installer or config key references it. **Assessment: PASS (N/A).**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: The GitHub snippet cancels push runs on the base branch**

- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.174.bug.1.snippet-cancels-base-branch-push-runs.md](./task.174.bug.1.snippet-cancels-base-branch-push-runs.md)
- **Observation**: `changes-job.yml:18-19` sets `cancel-in-progress: true` for every event. The classifier's push path skips a docs-only diff without green evidence for `before`. tinker-city's `ci.yml:193-196` supersedes PR runs only.
- **Impact**: A docs-only merge can cancel a code merge's run on the base branch and then skip, so the code never gets a full run there.
- **Recommendation**: Cancel only PR runs, keyed on the PR number, and correct the guide's `cancel-in-progress` section.
- **Priority**: P2

### LOW Severity Issues (1)

- **TASK-174-QA-2**: the cross-variant `is_docs` test in `bitbucket-pipelines/classify-changes.test.js` re-spreads `process.env`, so a `DOCS_PATTERNS` set in the runner's environment leaks into its default case.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS

Measured upstream on the same PR and the same workflow: a full run takes 37 min 27 s, and a docs-only push skips in 2 min 52 s or 3 min 42 s. The classifier adds one API call, with a 5 s connect and 20 s total timeout.

### Reliability — CONCERNS

Every uncertain path emits `code=true`, and `code` is written on every exit (each `classify()` call asserts exactly one `code=` line). TASK-174-QA-1 is a reliability gap in the snippet, not in the classifier.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 28 (`task.174.qa.1.security.run.json`, `totals.executed`), escaped 0, reproduced 0
- **Boundary**: true. `is_docs` is a predicate whose `true` (docs) leads to `code=false`, which skips the tests. Probed via `shell-fn:` in both variants, 14 cases each, under `bash`. `zsh` is absent on this host, and the scripts run under `bash` by design.
- **Hostile cases, all rejected as code**: `src/a.ts`, `.github/workflows/ci.yml`, `docsx/a.ts`, `docs`, `a.md.sh`, the C-quoted name, `*`, `-n`, `../docs/x.ts`, and the empty name.
- **Legitimate cases, all accepted**: `README.md`, `skills/x/SKILL.md`, `docs/a/b.yml`, and `$(touch PWNED).md` (the substitution never ran).
- Criteria boundary signals: `[]`.
- Tokens reach `curl` on stdin (`-H @-`), never argv. Both specs assert this against a fake `curl`.

### Maintainability — PASS

The lifted spec is kept whole except the `engine` cases. The parity test ties the default docs set to `ci-tree-equivalence.js` `DEFAULT_PATTERNS`, and a cross-variant test keeps the two `is_docs` functions identical.

---

## Code Review

Reviewer: 13 files. Advisory except where promoted.

**Correctness bugs (1):**

- [medium/medium] `docs/examples/ci/github-actions/changes-job.yml:19`: `cancel-in-progress` also covers push runs on the base, and the push path then skips without green evidence for `before`. → Cancel PR runs only. *Not promoted by the blocking rule (confidence medium). QA verified it independently and raised it as TASK-174-QA-1 (medium). The reviewer's rating is unchanged.*

**Cleanups (1):**

- `docs/examples/ci/bitbucket-pipelines/classify-changes.test.js:380`: `verdicts` re-spreads `process.env` over the cleaned env. → Pass `env` directly. Recorded as TASK-174-QA-2 (low).

All anchors checked by hand against the head: both lines match.

**Mutation proofs.** M1–M7 ran in Step 3 against tests whose content is now committed unchanged at `b5bfc3fb`. M5 was re-run in this cycle against the committed tree, then restored, with `git diff --quiet` and 22/22 green.

```
mutation-proven: GitHub lookup failure (curl non-zero / unreadable file) returns 0 → lookup-file-missing, curl-non-zero → covered
mutation-proven: GitHub CI_WORKFLOW_PATH guard disabled → CI_WORKFLOW_PATH unset, empty → covered
mutation-proven: GitHub `set -f` removed from is_docs → "a pattern is matched, never glob-expanded" → covered
mutation-proven: GitHub default narrowed to `*.md` → docs-set-parity "agree on the fixed path list" → covered
mutation-proven: Bitbucket 403 treated as 200 → "403 → true, named as a missing scope" → covered (re-run cycle 1)
mutation-proven: Bitbucket own target.commit.hash check dropped → "a successful pipeline of ANOTHER commit" → covered
mutation-proven: package.json test:suite glob removed → test-runner-reach names all 3 suites → covered
```

8 of 8 § 8 proofs are `covered` (the spec's "lookup failure → false" item is M1).

Provenance: neither finding exists on the base. The files are new in this PR.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` (full hermetic suite, prettier) | PASS: 7114 tests, 0 failures, 14 skipped; tmp-leak ratchet ok |
| `npm run lint:shell` | PASS: 110 scripts clean |
| `tests/test-runner-reach.test.js` | PASS (4/4) |
| Runbook index link | PASS once tracked (`doc-links.js`) |

---

## Test Artifacts

### Files Reviewed

`docs/examples/ci/github-actions/{classify-changes.sh, classify-changes.test.js, changes-job.yml, docs-set-parity.test.js}`, `docs/examples/ci/bitbucket-pipelines/{classify-changes.sh, classify-changes.test.js, bitbucket-pipelines.yml}`, `docs/runbooks/ci-docs-only-skip.md`, `docs/runbooks/README.md`, `CHANGELOG.md`, `package.json`.

### Test Commands Executed

```bash
command node --test docs/examples/ci/github-actions/classify-changes.test.js        # 45/45
command node --test docs/examples/ci/github-actions/docs-set-parity.test.js         # 2/2
command node --test docs/examples/ci/bitbucket-pipelines/classify-changes.test.js   # 22/22
npm run ci:fast                                                                     # 7114, 0 fail
npm run lint:shell                                                                  # clean
node security-probe.mjs --sink filename --entry 'shell-fn:<variant>/classify-changes.sh#is_docs' --cases-file is-docs.cases.json   # 14 + 14
```

### Coverage Report

Not instrumented, because the units are shell scripts run as subprocesses. Coverage is by case: every `emit` exit in both scripts is reached by at least one named case.

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-174-QA-1: restrict `cancel-in-progress` to PR runs and correct the guide (P2).

### Short-term Actions (Non-Blocking)

1. TASK-174-QA-2: stop re-spreading `process.env` in the cross-variant test.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The deliverable is complete and well-tested. One snippet setting contradicts the classifier's own assumption and the source workflow.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-174-QA-1 fixed.

---

**QA Report**: co-located at `task.174.qa.1.ci-docs-only-classifier-template.md`
**Gate File**: co-located at `task.174.gate.1.ci-docs-only-classifier-template.yml`
**Next Steps**: `/qa-fix` for TASK-174-QA-1 and QA-2, then QA cycle 2 (refute pass).
