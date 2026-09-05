# QA Report: Task 92 — cycle 2 (refute pass)

**Task**: [task.92.shellcheck-ci-lane.md](./task.92.shellcheck-ci-lane.md)
**Gate File**: [task.92.gate.2.shellcheck-ci-lane.yml](./task.92.gate.2.shellcheck-ci-lane.yml)
**Previous Cycle**: [task.92.qa.1.shellcheck-ci-lane.md](./task.92.qa.1.shellcheck-ci-lane.md) (CONCERNS, 80/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-05
**PR**: [#322](https://github.com/Gamaroff/agent-skills/pull/322) · head `f7074d3f`
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 is the protocol's **refute pass** — the whole branch diff re-read to find the claim that is
false, rather than to confirm the change works. All three cycle-1 findings are verified fixed, and the
TASK-92-001 fix is mutation-proved rather than assumed.

The refute pass found **two new defects, both documentation accuracy in shipped artifacts**. Neither
affects the running lane; both would have been merged and believed. The sharper of the two is
TASK-92-004: a paragraph this task rewrote *specifically because it was stale* shipped a fresh error of
the same kind.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Review Methodology

**Re-review scope: unscoped — whole `origin/develop...HEAD` diff, refute pass (cycle 2).** Per the
Step 3b rule, cycle 2 is deliberately not narrowed to the cycle-1 fixes: narrowing would have re-read
only the repairs and never re-examined the original change with what cycle 1 taught. 21 hand-written
files reviewed; the 137 generated bundle copies were skipped as byte copies.

> **Honest limitation, recorded because it weakens this cycle's independence.** The protocol calls for
> the refute pass to be run by an agent that did not write the code. One was dispatched, hung without
> producing any output, and was terminated after roughly forty minutes; it returned zero findings. The
> pass below was therefore performed **in-line, by the same agent that wrote the change** — which is
> precisely the arrangement the refute directive exists to avoid. It still found two real defects, so
> it was not worthless, but it should be read as a weaker check than an independent pass, and that is
> why this is recorded here rather than quietly omitted.

---

## Re-Review Context — cycle 1 findings

| ID | Finding | Status | Verification |
| --- | --- | --- | --- |
| TASK-92-001 | Empty-list guard in `tracker-access.test.sh` fell through | **FIXED** | Restructured as `if/else`. **Mutation-proved**: forcing the glob to match nothing now prints `FAIL reader-key guard` and exits 1 in normal time. Pre-fix, the identical mutation fell through into the `sed`. |
| TASK-92-002 | Three pre-existing bare disables in `jira-sprint-lib.sh` | **FIXED** | `:133` (SC2034) and `:328`/`:365` (SC2064) annotated. |
| LOW (block-comment reasons) | 8 SC2034 directives read as bare under `grep` | **FIXED** | Inline tags added. **Zero bare disables** now remain across all 56 sources — verified by `grep '# shellcheck disable' | grep -v 'disable=SC[0-9]* *#'` returning nothing. |

---

## New Findings This Cycle

Two. Both MEDIUM, both documentation accuracy in artifacts that ship.

**TASK-92-003 · `CHANGELOG.md:70-72`** — the real-fix/annotation split is wrong everywhere it is stated.

Claimed: *"11 by a real fix … and 15 by a `# shellcheck disable`"*. Counted against the original 26:

| Code | Findings | Real fix | Annotated |
| --- | ---: | ---: | ---: |
| SC2034 | 15 | 3 (deleted) | 12 |
| SC1007 | 4 | 0 | 4 |
| SC2209 | 3 | 3 (quoted) | 0 |
| SC2211 | 2 | 2 (prose) | 0 |
| SC1090 | 1 | 0 | 1 |
| SC2010 | 1 | 1 (glob loop) | 0 |
| **Total** | **26** | **9** | **17** |

17 is independently confirmed by counting the directives the branch adds (12 SC2034 + 4 SC1007 +
1 SC1090; the 2 SC2064 and 1 further SC2034 in the diff are pre-existing directives given a reason in
cycle 1, not new findings resolved).

**Root cause**, which is the part worth keeping: *"five string literals quoted"* counted **assignments
quoted** — five `case` arms in `release.sh` alone, quoted for block uniformity — rather than
**findings resolved**, of which SC2209 contributed three. Editing more lines than the linter flagged
was the right call; counting them as findings was not.

Appears in `CHANGELOG.md:70-72`, the task document's Files Summary, the implementation report, and the
PR body.

**TASK-92-004 · `docs/architecture/concepts/tech-stack.md:54`** — the rewritten CI paragraph is itself
inaccurate.

It says *"five workflows in `.github/workflows/`"* and names test, validate, shellcheck, release and
docs-link-check. There are **six**: `branch-policy.yml` (job `base-branch`, `on: pull_request`, rejects
PRs into `main` from a head that is not develop/hotfix/release) is omitted entirely. Five was the count
*before* this task added `shellcheck.yml`.

This paragraph was rewritten by this task **because it was stale**, so shipping a new inaccuracy of the
same kind is the finding, not the off-by-one. Every other claim in the sentence was verified correct
against the workflow files by parsing each one's `on:` block:

| Workflow | Job | Triggers | Path-filtered | Paragraph correct? |
| --- | --- | --- | --- | --- |
| `test.yml` | `test` | PR + push | no | ✅ |
| `validate.yml` | `validate` | PR + push | **yes** | ✅ |
| `shellcheck.yml` | `shellcheck` | PR + push | no | ✅ |
| `release.yml` | `release` | push (tag) + dispatch | no | ✅ |
| `docs-link-check.yml` | `link-check` | PR + push | yes | ✅ |
| `branch-policy.yml` | `base-branch` | PR | no | ❌ **omitted** |

---

## What Was Attacked and Survived

Recorded so that "we found nothing here" is distinguishable from "we did not look".

| Claim attacked | How it was tested | Result |
| --- | --- | --- |
| The glob loop reproduces `ls "$HERE"/*.sh \| grep -v '\.test\.sh$'` exactly | Ran both forms over `shared/resources` and diffed the sorted output | **Byte-identical**, 16 files |
| The three deleted variables are genuinely unreferenced | `git grep -w` across the whole tree including bundled copies, tests and prose | `EPIC` 0 code refs, `TASK_ID` 0 code refs, `VALID_TYPES_RE` 0 code refs (only task-doc prose) |
| The SC2209 quoting changed no behaviour | Traced every consumer: `release.sh:340,368` compare `"$SYNC_DEVELOP" == true`; `:75` tests `-z "$BUMP"`; `_CONFIG_FILE_ORIGIN` has no external reader | No comparison observes the quoting; `VAR=x` and `VAR="x"` store identical bytes |
| The SC2211 prose fix did not change what the assertions assert | Read `assert_rc()`: `$1` is the label only; the comparison is `[ "$got" = "$exp" ]` on `$2`/`$3` | Label-only change — and an improvement, since the backticks were previously **executed** and their output stripped |
| The workflow's pinned-tarball install actually works | It ran in real CI — the `shellcheck` job is green on both branch heads and prints the version | Proven in the real environment, not by inspection |
| `set -euo pipefail` does not mask a failure in the job | `if ! shellcheck …` suspends errexit for the condition only; the count and empty-list guards `exit 1` explicitly; all three proven to fail in cycle 1 | No silent pass path found |
| The task document's "137 bundled copies" | `git show --stat d383fa90 \| grep -c references/` | **137** — exact |
| The lane still lints 56 files after the cycle-1 fixes | Re-ran the file-list logic and the container | 56 files, **0 findings**, exit 0 |

---

## Regression Testing

| Area | Result |
| --- | --- |
| 7 shell suites | PASS |
| `npm run ci:fast` | PASS — exit 0 |
| shellcheck over 56 sources | PASS — 0 findings |
| **Real CI on head `f7074d3f`** | **5/5 SUCCESS** — `shellcheck`, `test`, `validate`, `link-check`, branch policy |
| Head-SHA parity | local `f7074d3fb0f8` == PR head `f7074d3fb0f8` |

---

## NFR Assessment

- **Security — PASS.** Unchanged from cycle 1.
- **Performance — PASS.** Unchanged; no npm script joined `ci`/`ci:fast`.
- **Reliability — PASS.** The cycle-1 guard fix is mutation-proved, not assumed. All 5 CI jobs green.
- **Maintainability — CONCERNS.** Both new findings are inaccuracies in artifacts a reader would trust,
  one of them in the CHANGELOG.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the implementation is sound and independently verified in CI; the two new findings are
documentation accuracy, and one of them is in a paragraph this task rewrote to fix exactly that class
of problem.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL — merge after TASK-92-003 and TASK-92-004 are corrected.

**Next Steps**: `/qa-fix` for both, then cycle 3 verification, then Step 5c `/review-pr`.
