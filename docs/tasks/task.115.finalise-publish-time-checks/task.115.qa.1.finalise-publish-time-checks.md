# QA Report: Task 115 - finalise publishes before it verifies

**Task**: [Link to task document](./task.115.finalise-publish-time-checks.md)
**Gate File**: [task.115.gate.1.finalise-publish-time-checks.yml](./task.115.gate.1.finalise-publish-time-checks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-13
**Testing Completed**: 2026-09-13
**Gate Status**: CONCERNS

---

## Executive Summary

The change set is prose (`skills/finalise/SKILL.md`, three `shared/resources/` step docs, `releases.md`) plus two new tests and a CHANGELOG entry. All four phases are implemented, the full hermetic suite is green (3249 tests, 3248 pass, 0 fail — one pre-existing skip), and both new tests were mutation-proved by the developer and re-run here. The two defects found are both in the new Step 7 prose and both were found by **executing** it rather than reading it: 6d's task-number extraction uses `BASH_REMATCH`, which zsh does not populate, so the CHANGELOG warning can never fire in the shell this pipeline actually runs in; and 6c's CI wait is a foreground `sleep` loop bounded at 25 minutes, contradicting the note beneath it. Both are bounded, both have a verified fix, and neither touches the correctness of the reorder itself.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1 and CR-2

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`; all 5 Progress Tracking boxes `[x]`)
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` recorded green on commit `c7c13fce` by the developer; targeted suites re-run here)
- [x] Breaking changes documented (two new HALT reasons; none for consumers)
- [x] Code on feature branch with open PR (#402)

### Testing Approach

- [x] Automated Testing (node --test; 97 targeted tests re-run: publish-boundary, changelog-drift, finalise-dod-prompt-contract, transition-protocol-parity, ci-gate-parity, work-item-artifact-naming, mutation-call-site-coverage)
- [x] Regression Testing (the parity/contract suites that read `finalise/SKILL.md`)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b — in-line adversarial read of the diff; Step 4b — executed the documented commands)
- [ ] Manual Testing — N/A (no runtime)
- [ ] Performance Testing — N/A

### Review Methodology

Direct tools. First review; docs-and-tests change set touching one skill and three shared step docs; medium risk. **Step 3b ran in-line by the QA pass rather than as an independent Explore subagent** (stated so the reader can weigh it — 5c's `/review-pr` is the independent lens on this PR). **Step 4b fired** (SKILL.md + shared/resources with fenced bash): `qa-execute-snippets.mjs --file skills/finalise/SKILL.md` — 28 blocks, 0 runnable / 3 placeholder / 25 mutating; shells bash + zsh (zsh available). Baseline on `develop` is 2 placeholder / 22 mutating with the same `zero-blocks-executed` finding, so that finding is structural to `/finalise` (it documents `gh`, `curl`, `git push` — deny-listed by design) and not introduced here; recorded, not counted. The four new blocks (l.1040 6a, 1074 6b, 1098 6c, 1146 6d) were extracted and syntax-checked with `bash -n` and `zsh -n` (all clean), and 6d's grep and regex were executed in both shells — which is how CR-1 was found.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: one status location | PASS | Verified | `**Status:** IN PROGRESS` gone from the Step 0 template; flip instructions retired at Step 7/8; the document-body gap section's `**Status:** IN PROGRESS` (l.1565) correctly retained — it is the work item's DoD section, not the running summary. Shape test asserts both. |
| Phase 2: verify the head that carries the acceptance | CONCERNS | Verified with 2 findings | Order 6→6a→6b→6c→6d→7→8 asserted; `CI_HEAD_1` at Step 6, `CI_HEAD_2` at 6a; PR head equality before the read; both readings on the PR comment. CR-2: the 6c wait is foreground. Pipeline step-7/step-8 docs updated coherently (Step 8 = implementation report only). |
| Phase 3: tracked-and-pushed + no-suppression | PASS | Verified | `git ls-files --error-unmatch` + `git show origin/<branch>:<path>` at 6b, the DoD-to-PR post, and 5c; no fenced `git commit` suppressed (asserted with a non-vacuity check that 6a's commit exists). Registry add split behind an existence check. |
| Phase 4: CHANGELOG mechanism | CONCERNS | Verified with 1 finding | Convention + test + owner + flip line present; drift test green and red-on-mutation (task 114). CR-1: 6d's number extraction is empty under zsh. |

**Overall Phase Completion**: 4/4 implemented; 2/4 carry a MEDIUM finding.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | DoD body carries status in exactly one place | one line | one line (`**Final Status:**`) | PASS | Shape test; mutation-proved (header restored → red) |
| 2 | Two CI readings with heads; second on the pushed acceptance commit; no side-effect before it reads SUCCESS | as stated | ordered and asserted | PASS (CR-2 on the wait's shape) | The design residue (Step 8's docs-only commit) is stated in the task and both step docs |
| 3 | Step 7 and 5c assert tracked-and-pushed; no suppressed `git commit` | as stated | three sites + fenced-line scan | PASS | Mutation-proved (5c `ls-files` dropped → red; commit suppressed → red) |
| 4 | Drift test fails naming an uncited accepted task since the last tag; `/finalise` warns; `(bug N)` documented | as stated | test green, red on mutation; 6d present; releases.md convention + follow-on | PASS (CR-1 on 6d under zsh) | |
| 5 | Observations #40, #48, #57, #59 close naming this PR | closed | `parked` — `parked_until: task.115 merged to develop` | DEFERRED (correct) | Post-merge action by design; the parked_until already names the trigger |

---

## Breaking Changes Validation

### Breaking Change: two new `/finalise` HALT reasons
Documented: Yes (§5, §6d, CHANGELOG) · Migration Path Provided: Yes — `ci-not-green-on-acceptance-head` blocking from day one (it is the gate this task exists for); `no-changelog-entry` advisory with the flip carried as a `releases.md` checklist line · Migration Tested: N/A · Consumer Code Updated: N/A (consumers receive the bundled `references/`, regenerated and in sync).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: CR-1 — 6d's task number is empty under zsh, so the CHANGELOG warning can never fire there**
- **Severity**: MEDIUM · **Category**: Functional (shell disagreement)
- **Observation**: `[[ "$STEM" =~ ^task\.([0-9]+)$ ]]` then `N="${BASH_REMATCH[1]}"`. bash → `N=115`; zsh → `N=""` (zsh populates `$match`). With `N` empty the pattern becomes `\(task \b|\btask[ .]\b`, which matches any `[Unreleased]` text — the check reports "cited" for every task.
- **Impact**: The owner half of Phase 4 is inert in the pipeline's actual shell; only the drift test (CI) would catch a missing entry.
- **Recommendation**: `case "$STEM" in task.*) N=${STEM#task.};; esac; [[ "$N" =~ ^[0-9]+$ ]]` — verified identical in both shells.
- **Priority**: P1

**Issue: CR-2 — 6c waits for CI in a foreground `sleep` loop bounded at 1500s**
- **Severity**: MEDIUM · **Category**: Reliability
- **Observation**: `while [ "$WAITED" -lt "$MAX_WAIT" ]; do … sleep 30 …` in the foreground; the note beneath it says never to poll in the foreground of a tool call that can time out, and develop-next Step 3 forbids `--watch` for the same reason.
- **Impact**: An agent executing the block as written spends one tool timeout per attempt and learns nothing, then improvises — the exact shape the note warns about.
- **Recommendation**: emit the loop to `.claude/state/finalise-ci-poll.sh`, run with `nohup … &` writing `STATE HEAD` to a result file, read the file on a later turn; assert in the shape test that 6c has no foreground `sleep`.
- **Priority**: P1

### LOW Severity Issues (2)

- 6a's commit subject appends `; registry ticked` whenever `docs/tasks/task-registry.md` exists — on a story run in a repo with a registry the message is wrong. Test the staged diff instead.
- `changelog-entry-drift.test.mjs` recognises merges by the `Merge pull request #N` subject; a squash-merge repository would compute an empty window. State the assumption in the header.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — CONCERNS
The second CI reading adds wall-clock to every finalise by design (task §10). The bound is stated; the wait is foreground as written (CR-2). Resolves with CR-2.

### Reliability — PASS
Exit codes of commit and push are read; HALT reasons are named; registry add cannot abort the whole `git add`; rollback is one revert restoring Step 8 as the commit point.

### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0
- Docs and tests only; no credential paths added; 6a removes a silent-failure path (`>/dev/null 2>&1 || true` on commits is now a tested rule).

### Maintainability — PASS
Both mechanisms carry tests with mutation proofs; the bundle is in sync; the flip is a checklist line rather than a memory.

---

## Code Review

_In-line adversarial read of `origin/develop...HEAD` (23 files; 12 are regenerated `references/` copies). Promoted to `top_issues` via `code_review_blocking=true`: CR-1, CR-2._

**Correctness bugs (2):**
- [medium/high] `skills/finalise/SKILL.md:1150` — `BASH_REMATCH[1]` empty under zsh → 6d never warns → parameter expansion (CR-1)
- [medium/high] `skills/finalise/SKILL.md:1108` — foreground `sleep` poll up to 1500s contradicts its own note → background job + result file (CR-2)

**Cleanups (2):**
- `skills/finalise/SKILL.md:1049` — `; registry ticked` keyed on file existence, not on a staged change → `git diff --cached --quiet -- docs/tasks/task-registry.md || echo …`
- `evals/shared/tests/changelog-entry-drift.test.mjs:131` — merge detection assumes merge commits → state it

**Mutation-proof spot check (Step 3c)** — the developer's proofs re-run by QA on the committed tests:
- mutation-proven: task 114 citation removed from `[Unreleased]` → `every accepted task merged since the last tag is cited` → `covered`
- mutation-proven: `**Status:** IN PROGRESS` restored in the Step 0 template → `the DoD running-summary template carries no **Status:** header line` → `covered`
- mutation-proven: 6a…6d moved after action 7 → `Step 7 orders …` → `covered`
- mutation-proven: `git commit` suppressed → `no fenced git commit line suppresses …` → `covered`
- mutation-proven: 5c `git ls-files` dropped → `artefact checks assert tracked-and-pushed …` → `covered`
- mutation-proven: `CI_HEAD_1` removed from Step 6 → `both CI readings carry a head …` → `covered`
- mutation-proven: releases.md flip line removed → `/finalise warns no-changelog-entry, and the release checklist …` → `covered`
Seven of seven reverted; all sources restored byte-identical (`cmp`).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `finalise-dod-prompt-contract`, `transition-protocol-parity`, `ci-gate-parity` (read `finalise/SKILL.md`) | PASS |
| `work-item-artifact-naming`, `mutation-call-site-coverage` (scan canonical sources incl. the edited step docs) | PASS |
| Full `npm run ci:fast` on `c7c13fce` (developer, logged) | 3249 / 3248 pass / 0 fail |
| `npm run bundle` freshness | in sync (pre-commit hook on `c7c13fce`) |

---

## Test Artifacts

### Files Reviewed
`skills/finalise/SKILL.md` (Step 0, 6, 7 incl. 6a–6d, checklist), `shared/resources/develop-pipeline-step-{5-6,7,8}*.md`, `docs/contributing/releases.md`, `evals/shared/tests/{changelog-entry-drift,finalise-publish-boundary}.test.mjs`, `CHANGELOG.md`, task/review/implementation docs.

### Test Commands Executed
```bash
node --test evals/shared/tests/finalise-publish-boundary.test.mjs evals/shared/tests/changelog-entry-drift.test.mjs \
  evals/shared/tests/finalise-dod-prompt-contract.test.mjs evals/shared/tests/transition-protocol-parity.test.mjs \
  evals/shared/tests/ci-gate-parity.test.mjs tests/work-item-artifact-naming.test.js tests/mutation-call-site-coverage.test.js
node references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --json
bash -n / zsh -n on the four new fenced blocks; the 6d regex and grep executed under bash and zsh
```

### Coverage Report
N/A — prose and node:test files; no instrumented runtime.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — derive `N` with `${STEM#task.}` (P1)
2. CR-2 — background the 6c poll; extend the shape test (P1)

### Short-term Actions (Non-Blocking)
1. Key the `; registry ticked` suffix on the staged diff
2. State the merge-commit assumption in the drift test header
3. Backfill `(bug 13)` / `(bug 15)` and widen the drift test to bugs

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two MEDIUM high-confidence defects in the new prose, both found by executing it, both with verified fixes; no HIGH; every success criterion met or correctly deferred.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed; publish-boundary shape test extended to hold both.

---

**QA Report**: co-located at `task.115.qa.1.finalise-publish-time-checks.md`
**Gate File**: co-located at `task.115.gate.1.finalise-publish-time-checks.yml`
**Next Steps**: `/qa-fix` on CR-1, CR-2 → re-review
