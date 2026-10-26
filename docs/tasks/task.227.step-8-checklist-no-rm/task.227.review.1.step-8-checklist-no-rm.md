# Task Review Report: Task 227 - Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block

**Reviewed:** 2026-10-24
**reviewed_blob:** 319e17b134595bf996e04089823a7dcfe2be0f4a
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-10-24

---

## Executive Summary

The task is small, well scoped and its anchors and population claims check out against the tree: both `--complete` arms are where it says, the checklist block's two `rm -f` lines are at `:284`/`:287`, and the plan's own population scan re-measures to 8 blocks with one `--complete` block. Four Important findings, all in the plan's test and criteria wording: the guard snippet names two helpers that do not exist, two Performance criteria and one Code Quality criterion would fail at finalise as written, and the script's header comment also describes `--complete` but the plan updates only `usage()`.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (autonomous run — develop-task pipeline Step 2, `--defaults`; every fix below has one correct answer from the tree)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No question points were raised. The run is autonomous (`/develop-next --defaults` → `/develop-task --defaults`), and none of the findings needed a choice: each is a name, an anchor or a criterion shape that the tree or finalise's criterion kinds settle.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References, Notes. No placeholders.
- File name follows `task.{N}.{name}.md`; frontmatter carries `type: task`, `description`, `tags` (OKF v0.1).
- Sign-off: not configured (`sign-off.enabled` absent) — not checked.
- Change Log: present, one row, current for `status: planned` (`change-log.enforcement` default `advisory`).
- Tracker linkage: `github_issue: 728` (OPEN), body link `[#728](…/issues/728)` matches. Board Priority self-heal: `set-github-project-priority.sh 728` → P2.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve (Summary +5, Success Criteria +6, Breaking Changes +3 omitted to `+N more`) — informational.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)
**Hallucinations Detected:** 0

Pre-pass B (architecture alignment, `prepass-axes.js` source `architecture`): **aligned**, axes checked — What this repo produces, Cross-skill resources, File naming, Validation before commit, Do not, Status lifecycle. Two low notes (ShellCheck not named — `npm run ci`'s `lint:shell` covers it; tech-stack.md understates Bash), no action.

Pre-pass C (codebase scan): **not-implemented** — neither `--complete` arm names the records, both `rm -f` lines are still in the block, no guard test, no 5c record in the checklist test, no record case in `advance-pipeline-lock.test.sh`. Population diff: not applicable (no engine call sites enumerated).

Verified in-line:

- `advance-pipeline-lock.sh:120` `LOCK=…`, `:174` `--complete) exit 0 ;;`, `:190` the lock-present arm — all as cited.
- `develop-pipeline-step-8-commit.md:284`, `:287`, `:292`, `:144`, `:163` — all as cited.
- `step-8-completion-checklist.test.mjs:255` (`blockBy(…, "✅ Step 8 post-conditions verified")`), `:626` (orchestrator-mention test), `:581` (the `develop-pipeline-*.md` filter) — as cited. The checklist binds `LOCK_HELPER` to the real script (`:242`, `:261`), so after Phase 2 the extended records test exercises `--complete`'s removal, as the plan says.
- Population (check 7/20): the plan's scan, run from a Write-tool file, prints 8 blocks; only `develop-pipeline-step-8-commit.md:178` carries `--complete` (rm at `284, 287`). Matches the task.
- Check 15 (removed literal): `git grep` for `rm -f .claude/state/(step4|5c-carry)` in tests → no test locates a block by the removed lines; the only test asserting their effect is `a passing checklist removes Step 4's records`, which the plan already lists. `acceptance-commit-carries-5c.test.mjs` reads `5c-carry-eligible.txt` but never runs the checklist.
- Check 18 (runner reach): no new test file; `advance-pipeline-lock.test.sh` is in `npm test`, and `shared/resources/tests/*.test.mjs` is a runner glob.
- Other `--complete` callers: none in tracked shell/JS outside the script itself; the orchestrators' post-Step-8 `--complete` is a no-op after the checklist and removes already-removed records.

### Issues

#### Important

- **I1 — The guard snippet names two helpers that do not exist.** The plan's guard calls `pipelineDocs()` and `fencedRanges(text)`. The test file has neither: the list helper is `developPipelineDocs()` (`:573`), which also returns `skills/develop-*/SKILL.md`, and the fenced-block parser is `extractBlocks` from `shared/resources/qa-execute-snippets.mjs` (what `blockBy` uses, via `lib/executed-prose.mjs`), returning `{code, …}` per block. A developer following the snippet verbatim gets a `ReferenceError`; one improvising may hand-roll a third fence parser.
  - **Recommendation:** name `developPipelineDocs()` and `extractBlocks()` in §8 and the plan, and say the guard's scope is therefore the shared `develop-pipeline-*.md` docs **plus** the develop orchestrators' `SKILL.md` files (strictly wider; neither SKILL.md has a fenced `--complete` block today).
  - **Correction (Step 3, 2026-10-24):** half of this finding was wrong. `fencedRanges` does exist in the test file — it is imported from `../change-log.js` at `:42` — and this review missed it by searching for a function definition rather than the import. Only `pipelineDocs()` was a bad name. `extractBlocks` also returns `bash` fences only, so it would miss an `sh` or unlabelled block. The task and plan now name `developPipelineDocs()` and `fencedRanges()`, the plan's original parser.
- **I4 — The script's header comment also describes `--complete`.** `advance-pipeline-lock.sh:15` (`--complete  # remove lock (Step 8's Completion Checklist passed)`) and `:31` describe the mode; Phase 3 updates only `usage()` (`:128`). Two descriptions in one file, one updated, drift silently.
  - **Recommendation:** Phase 3 updates the header lines too.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Three phases, test-first, each with concrete files and checkboxes; the placement constraint (before the no-lock `case`) is stated with its reason and a test. Effort: frontmatter 16h; rubric recomputed — 2 base + 4 (11 criteria) + 4 (13 plan checkboxes) + 1 (>5 files) + 2 (body mentions "migration") = 13 → snaps to **16h**. No divergence.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Important

- **I2 — The two Performance criteria are held neither way.** "No measurable change: five `rm -f` calls move…" and "The checklist test file's run time is unchanged within normal variance" state no numeric bound and name no test. Finalise's AC agent sends an unbounded criterion down the behaviour path, finds no test, and fails it.
  - **Recommendation:** replace both with one explicit "Not applicable" line (finalise's "no unit tests applicable" kind): the change moves five `rm -f` calls from one shell to another and adds one file-scan test; no performance-sensitive path changes.
- **I3 — "Both mutations in Phase 2 turn a test red" is a process criterion.** Finalise has no path for "mutation-proven" (obs #82 in the observation log) — it is neither a behaviour a per-PR test holds nor a file that says something.
  - **Recommendation:** re-scope it as a documentation criterion: "The implementation report records both Phase 2 mutations, the test that went red for each, and the revert."

#### Optional

- **O1 — Two line anchors drifted by one.** `a passing checklist removes Step 4's records` is at `step-8-completion-checklist.test.mjs:1688`, not `:1687`; the 5c records are at `develop-pipeline-step-5-6-qa-loop.md:1517`/`:1518`, not `:1516`/`:1517`. The claims are true; the coordinates moved.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The one real risk (removal in one arm only) is named, rated Medium, and mitigated by a dedicated no-lock test and the placement rule. Rollback is a revert plus bundle; the partial rollback correctly notes the guard must be reverted with the `rm` lines. No guard exemption is introduced (the new guard is refuse-only), so no differential oracle is needed.

#### Optional

- **O2 — Pre-pass B's ShellCheck note.** `npm run ci` runs `lint:shell`, which the Phase 3 `npm run ci` checkbox covers. No change.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 4 issues

1. I1 — name `developPipelineDocs()` and `extractBlocks()` in the guard, and state the widened scope.
2. I2 — replace the two Performance criteria with one "Not applicable" line.
3. I3 — re-scope the mutation criterion as an implementation-report documentation criterion.
4. I4 — Phase 3 updates the script's header comment as well as `usage()`.

### Consider (Optional) - 2 items

1. O1 — correct the two drifted anchors.
2. O2 — none (covered).

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the four Important findings are wording and naming fixes with one correct answer each, applied in Step 8.5 of this review.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Follow the implementation plan phase by phase (tests first).
2. Check off progress tracking checkboxes.
3. Run the two named test files after each phase, then `npm run ci`.
4. Record both Phase 2 mutations in the implementation report.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2, autonomous)
- **Review Date:** 2026-10-24
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.227.step-8-checklist-no-rm/task.227.step-8-checklist-no-rm.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
- **Review Duration:** ~15 minutes
