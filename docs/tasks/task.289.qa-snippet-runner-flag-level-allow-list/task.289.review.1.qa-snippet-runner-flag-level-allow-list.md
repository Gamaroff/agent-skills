# Task Review Report: Task 289 - QA snippet runner allows flags, not just commands

**Reviewed:** 2026-11-09
**reviewed_blob:** f39264eaeffead1b19e547ca15ff1dc679ac08f7
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD (after fixes)

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-11-09

---

## Executive Summary

The task is well scoped and every code anchor resolves (`SAFE_COMMANDS:407`, `DENY_PATTERNS:712`, `VARIABLE_ARGUMENT_COMMANDS:751`, `couldBeFlag:767`, `classifyBlock` loop `:1903`). But the plan tables only `sed`, `find` and `sort` and leaves the other 28 `SAFE_COMMANDS` members on "today's behaviour", which does not meet its own "fail-closed by construction" goal. Probing the current engine found writes the plan misses.

**Critical:** 0. **Important:** 6. **Optional:** 2. **Questions asked:** 2. **Readiness:** 8/10. **Recommendation:** READY TO IMPLEMENT (after the fixes below, all applied).

Pre-pass: the two Explore pre-pass agents were not dispatched; both passes were done in-line. Independent review did not run. Architecture axes (`prepass-axes.js`, source `architecture`): Runtimes, Languages, SKILL.md authoring, File naming, Status lifecycle, Cross-skill resources, Registries, Validation before commit, Do not. No conflict found.

## User Decisions & Clarifications

- **Q1 Table scope:** every `SAFE_COMMANDS` member, flags and operands; a member with no entry is refused. Impact: Phase 2, scope and success criteria rewritten.
- **Q2 Gap 7:** use the `function cat { …; }` spelling as the failing case; keep `cat() {…}` as a held control.

## 1. Template Structure Compliance — PASS

Card preflight: 3 blocks resolve, no findings. `doc-links.js`: 2 links resolve. OKF `type`/`description` present. Change Log present. Sign-off not enabled. Effort 16h is plausible (not checked against rubric divergence).

## 2. Technical Accuracy — ISSUES FOUND

Evidence: `classifyBlock` run over the plan's blocks on develop (`probe.mjs` in the session scratchpad).

| Block | develop result |
| --- | --- |
| `sort --compress-program=./x f`, `find docs -fprint0 out`, `sed '1e touch x' f`, `cat <> out`, brace and `${IFS}` forms | `runnable` (gaps confirmed) |
| `cat() { touch x; }; cat f` | **`mutating`** (unparseable, fail-closed) — gap 7 as written is already closed |
| `function cat { touch x; }; cat f` | `runnable` (the real gap) |
| `find docs/$X -name z` (named control) | **`placeholder`**, not `runnable` |

- **[Important]** Gap 7's reproduction is wrong (above). Fixed: function-keyword form is the failing case.
- **[Important]** Check 10, outcome reachability: the control `find docs/$X -name z` cannot return `runnable` for that input. Fixed: assert what the run returns, or bind `X`.
- **[Important]** Check 11, invariant run: the plan assumes "a command without an entry keeps today's behaviour" is safe. It is not: `uniq in out` (runnable; `uniq in.txt out.txt` created `out.txt`), `file -C -m magic`, `sed --expression=1e f`, `sort -S 1 --compress-program=x f` are all `runnable` today. `uniq` writes through an **operand**, so a flag table alone cannot close it. Fixed: table covers every member, flags and operands, fail-closed.
- **[Important]** Check 15, removed-literal sweep: Phase 3 removes `DENY_PATTERNS` entries whose reason text (`deny-list: …`) tests pin. Fixed: Phase 3 lists the `git grep -n 'deny-list:'` sweep.
- **[Optional]** The plan's "same-class" question (check 6): `SAFE_FLAGS` sits beside `DENY_PATTERNS` and `VARIABLE_ARGUMENT_COMMANDS`. Fixed: Phase 2 states replace/extend/beside for each.
- **[Optional]** The Phase 5 anchor `:19` was stale (the `tmpdir()` helper). Fixed; the `scripts/test-tmpdir.mjs` ratchet is now named.

Checks with no finding: test reach (existing `shared/resources/tests/` suite, no new file); parity claims (none); fixture literals (none prescribed); CI path filters (no new path); call-site population (no engine named); `prettier` criterion (none).

## 3. Implementation Plan Completeness — GOOD

Phases are specific and ordered. Scope covered by the fix above.

## 4. Consistency & Completeness

- **[Important]** Performance criterion 2 ("no measurable time") had no bound. Fixed: under 10% of the median, five alternating pairs, `uptime`, command and figures in the QA report.
- **[Important]** "Each fix has a mutation proof" named no location. Fixed: the QA report's findings table.
- Success criteria now include named tests per member and for `uniq`/`file -C`.

## 5. Risk & Rollback — ADEQUATE

The high risk (incomplete table) is now reduced by the fail-closed rule. Rollback is concrete.

## Summary of Recommendations (all applied)

1. Table covers every `SAFE_COMMANDS` member, flags and operands, fail-closed.
2. Correct gap 7 and add the probed extra cases as failing-first tests.
3. Correct the control's expected class.
4. Sweep tests that pin `deny-list:` reasons before removing patterns.
5. Bound the scan-time criterion.
6. Name the QA report as the mutation-proof record.
7. State the relation of `SAFE_FLAGS` to the existing deny-list and shape 4.
8. Fix the Phase 5 anchor.

Still open for the developer: the owner's decision on the 17 refused blocks (Phase 1, by design).

## Implementation Readiness

**Score:** 8/10 — Template 9, Technical accuracy 7 (before fixes), Clarity 8, Consistency 8, Risk 8.
**Confidence:** High.

## Review Metadata

- **Reviewer:** review-task
- **Task File:** docs/tasks/task.289.qa-snippet-runner-flag-level-allow-list/task.289.qa-snippet-runner-flag-level-allow-list.md
