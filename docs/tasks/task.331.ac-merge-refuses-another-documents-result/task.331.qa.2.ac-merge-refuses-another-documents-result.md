# QA Report: Task 331 - The AC merge refuses another document's result (cycle 2)

**Task**: [task.331.ac-merge-refuses-another-documents-result.md](./task.331.ac-merge-refuses-another-documents-result.md)
**Gate File**: [task.331.gate.2.ac-merge-refuses-another-documents-result.yml](./task.331.gate.2.ac-merge-refuses-another-documents-result.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review at head `7e55819c967b`. Cycle 1's finding is fixed. The cycle-2 refute pass over the whole branch diff found one new MEDIUM, T331-CR-1, and two LOW documentation findings. The engine refusal and the stem-keyed paths still hold.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T331-CI-1: dead mailto autolink in the implementation report | ✅ FIXED | `7e55819c9`; CI's `markdown-link-check@3` with `.github/markdown-link-check.json`: committed report rc 1 (the same dead link), edited report rc 0 |

### Review Methodology

Re-review scope: unscoped, cycle 2. The whole `origin/develop...HEAD` diff was reviewed to refute it, by an independent Explore subagent given the refute directive. Dispatched 15:37:54Z, returned 15:41:11Z (`duration_ms` 177027). Diff review: code review.

CI on 7e55819c967b: head mismatch (PR head b4a0158c4130). The fix commit is local, so CI could not be read for this head. Push-policy `qa-cycle` deferred it as docs-only.

Step 4b: no change to runnable prose since cycle 1, so cycle 1's record stands.

---

## New Findings This Cycle

- **[MEDIUM]** `skills/finalise/SKILL.md:1064` — T331-CR-1. The HALT arm cannot tell a wrong result from a stale scope. `finalise-rerun-scope-${DOD_N}.json` (`:637`, `:1054`) is keyed by run number alone, so another item finalised in the same checkout can overwrite it. Merge then refuses this item's correct answer, and the remedies the HALT names reproduce the same refusal. → before merge, check the scope's `.document` against this item and HALT separately with "re-run Step 3a"; hold the check with a test.
- **[LOW]** `CHANGELOG.md:28` — T331-CR-2. The "resumed across the upgrade" sentence is wrong for a run that finished Step 3c before the upgrade. That run meets the Step 6 action 2a "record exists but merged result missing" HALT.
- **[LOW]** `skills/finalise/SKILL.md:1642` — T331-CR-3. The Step 6 action 2a prose still says the merged file is keyed by `DOD_N`.

QA confirmed the premises by reading the shipped text: `grep -n 'claude/state/finalise-' skills/finalise/SKILL.md` lists `:637 RERUN_SCOPE_FILE=".claude/state/finalise-rerun-scope-${DOD_N}.json"` and `:1054 --scope ".claude/state/finalise-rerun-scope-${DOD_N}.json"`. Provenance: `result-document-mismatch` does not exist on the base, so this finding is new to the change.

---

## Code Review

Anchors checked with `finding-anchors.js`: `ok` (CR-1 `unchecked-text`, others `ok`).

**Correctness bugs (4):**
- [medium/high] `skills/finalise/SKILL.md:1064` — T331-CR-1, promoted to the gate (code_review_blocking)
- [low/high] `CHANGELOG.md:28` — T331-CR-2, promoted
- [low/high] `skills/finalise/SKILL.md:1642` — T331-CR-3, promoted
- [low/low] `skills/finalise/references/finalise-rerun-scope.js:1225` — a bare basename or a case-variant `story_file` is refused for a correct answer. Advisory → recommendations.future

The reviewer probed these identity pairs through the merge CLI and found them correct: `./`, `..`, trailing slash, symlinked directory and absolute spellings match; different documents differ.

mutation-proven: cycle 1's fix reverted (committed report text) → CI's `markdown-link-check` red, rc 1 → dev-only. No committed test holds a link check on this file; CI's link-check job is the guard.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Next Steps**: `/qa-fix` for T331-CR-1, -2 and -3, then the cycle 3 re-review.
