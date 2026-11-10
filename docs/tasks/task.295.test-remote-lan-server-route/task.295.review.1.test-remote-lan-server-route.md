# Task Review Report: Task 295 - Run the test suite on the LAN server (test:remote)

**Reviewed:** 2026-11-10
**reviewed_blob:** 2382848cac384f5dc36893fea8582487bd5311d4
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-11-10

---

## Executive Summary

The task is well scoped and its risks are named. One plan step was falsified by measurement: `rsync --files-from` with `--delete` leaves stale files on the destination. The criteria for the real-server runs named no place for their evidence. Both are fixed in the document and its plan.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions (pipeline mode: autonomous)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

Pre-pass subagents (Agents B and C) were not dispatched: the review ran them inline. Independent review did not run for those two passes.

---

## User Decisions & Clarifications

None asked. The owner's three decisions (container, `ci:fast` default, agents use the route) are already recorded in Notes › Owner Decisions.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; sign-off not enabled; Change Log present with four columns.
- Frontmatter has `type`, `description`, `tags`.
- Card preflight (`--check-card`): 3 card blocks resolve.
- `doc-links.js`: 1 relative link resolves.
- Change Log is stale by check 4b (newest row `Initial draft`, status about to advance). Fixed by the Step 8.5 rows.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)

#### Important

- **A planned sync step does not do what the plan says (check 11, invariant run).** The plan used `rsync -a --delete --from0 --files-from=-` and said to "confirm stale files are removed". Measured: with `printf 'a/keep\0' | rsync -a --delete --from0 --files-from=- ./ dst/` and `dst/a/stale` and `dst/rootstale` present, both survive. The plan's fallback (`--delete-excluded`) would also delete the remote `node_modules/` and `.lock-hash` it relies on for the install cache.
  - **Fix applied:** plan and task now specify `--delete` with `--exclude-from` built from `git ls-files --others --ignored`, and plain `--exclude` for `node_modules/`, `.home/`, `.lock-hash`; plus a stale-file test.
- **Server facts are from the handoff, not re-measured here.** Phase 0 re-measures them by design. `package-lock.json` has `lockfileVersion` 3 (measured), which npm 9.2.0 reads.

#### Verified without findings

- `package.json` line numbers cited (24–27, 51) match; `test:suite` already includes `tests/*.test.js` (check 18: the new test is reached).
- `tests/no-consumer-names.test.js` scans `skills/` and `shared/` only; the plan's `scripts/` and `docs/` additions are outside it (check 26).
- `AGENTS.md` is the real file; `CLAUDE.md` is a symlink to it.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Phases are specific and ordered, with a per-phase risk. The exit-code rule (`STATUS=$?` on the next line) and the validated `--run` grammar match the reference runner's known defects.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **Criteria that only the real server can meet named no record (check 22).** Success criteria 1, 2 and 5 cannot be held by a per-PR test, and said nothing about where their evidence lives, so `/finalise` would have to guess. **Fix applied:** each now names the QA report's "Acceptance runs" section, and criteria 3 and 4 are tied to the offline guard test.
- **A new `npm run test:remote` mention must follow the script (check 25).** `tests/executable-instructions.test.js` (line 374) checks that documents' `npm run <name>` mentions name a real script. **Fix applied:** Phase 5 now orders the `package.json` edit before the docs.

#### Optional

- Phase 4 could add a stale-file case to the guard test; the rsync fix names it as an acceptance check instead.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Both High risks have mitigation and a rollback. The shared-host risk names the 2026-11-04 overlap. No gaps.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 3 issues

1. Replace the `--files-from` plan with an exclude-list sync — done.
2. Name the evidence location for server-only criteria — done.
3. Order the `package.json` script before docs that mention it — done.

### Consider (Optional) - 1 item

1. Add a stale-file case to the guard test.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the one falsified step is corrected in both documents.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Review Date:** 2026-11-10
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.295.test-remote-lan-server-route/task.295.test-remote-lan-server-route.md
- **Architecture Docs Consulted:** none read in full; `package.json`, `scripts/lint-shell.sh`, `tests/no-consumer-names.test.js`, `.prettierignore`
