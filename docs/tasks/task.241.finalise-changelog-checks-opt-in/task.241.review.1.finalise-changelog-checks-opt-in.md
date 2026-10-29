# Task Review Report: Task 241 - Make /finalise changelog checks opt-in

**Reviewed:** 2026-10-28
**reviewed_blob:** 49952d7652f9756d8beea41db969760082bfeb96
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 recommendations implemented — 2026-10-28

---

## Executive Summary

The task is well scoped and its design was agreed with the user before it was written. Every current-state claim checked out against the tree. The findings were all about how the success criteria will be judged at `/finalise`: three criteria could not be held by a per-PR test as written, the hand-written sweep list had no recorded search, and the off-by-default gate needed a named differential oracle. All six were fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked. Run autonomously under `/develop-task` Step 2; the design (opt-in key, default off, this repo opts in, resolver shared by both sites) was settled with the user in the session that created the task.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were needed. The open design choices were decided by the user before `/create-task`:

- **Opt-in, off by default** rather than file-presence detection — the user does not want `/finalise` reading a consumer's changelog at all.
- **Remove the checks entirely** was rejected: the CI drift test fires only after merge.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present; `type: task`, `description`, `tags` present (OKF conformant).
- Change Log present; review rows added in this pass.
- Sign-off: `sign-off.enabled` not set — not checked.
- Tracker linkage: `github_issue: 772` exists (`gh issue view 772` → OPEN); body link `[#772]` matches.
- Card preflight: `No problems found. 3 card blocks resolve`.
- Effort `estimated_effort_hours: 16` equals the rubric value (13 → snaps to 16). Realistic effort is lower; left as the rubric figure.

## 2. Technical Accuracy

**Status:** ACCURATE

Pre-pass Agents B and C were **not dispatched**: the review ran inline, and the reviewer is the session that wrote the task, so this review is not independent of the author. Every claim was checked against the tree directly:

- `read-config.sh` `read_nested_config_key` exists and is bundled at `skills/finalise/references/read-config.sh`; it reads `skills-config.yaml` from the cwd (`read-config.sh:58`).
- Tier behaviour table (§ 3) re-measured: `yes` → `true` (python) / `yes` (awk). Invariant holds as stated (check 11).
- `finalise-publish-boundary.test.mjs`: `REPO_ROOT` (line 39), `between()` (52), `SHELLS` (532), `sixDBlock()` / `runSixD()` exist as described.
- `package.json` runs `shared/resources/tests/*.test.mjs` — the new suite is reached (check 18).
- `.github/workflows/shellcheck.yml` is unfiltered (`pull_request`, `push`) and lints `git ls-files '*.sh'` minus bundled copies, so `shared/resources/changelog-enforce.sh` is linted per PR (check 8).
- Relative links: `doc-links.js` — 1 link resolves.
- Check 14 (engine call sites): not applicable — the task names no `tracker-comment` / `gh-stage` / … population.
- Check 15 (removed literal): the only test literal the change touches is `6d: no CHANGELOG.md — not applicable` (`finalise-publish-boundary.test.mjs:612`), which the plan keeps byte-identical. Now stated in Phase 4.
- Check 21: the docs subagent's output item `CHANGELOG.md updated` matches the producer's schema (`finalise-dod-docs-prompt.md` Output block).

#### Important
- **Sweep list without its search** (check 20). The doc listed `releases.md` and "both runbook entries" from the author's grep without recording it. **Fixed**: the search and its full result are now in § 4.

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Four phases, each with files, checkbox changes and dependencies. The plan file gives the resolver, the 6d block shape, the dispatch line and the test layout.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND → fixed

#### Important
1. **zsh criterion cannot be held per PR** (obs #279). `SHELLS` drops zsh when absent, and CI's `ubuntu-latest` has none. **Fixed**: the criterion is scoped to bash per PR plus a recorded local zsh run; Phase 4 adds the local run.
2. **Docs-prompt criterion is a behaviour no test can run.** The subagent cannot run offline. **Fixed**: restated as a documentation criterion ("Step 2 instructs …; row 4 substitutes …") held by the wiring test.
3. **"No measurable change" states no bound** (obs #206). **Fixed**: marked not applicable; the agent-count criterion restated as a documentation criterion.
4. **"This repo's behaviour is unchanged" named no test.** **Fixed**: held by the this-repo assertion.
5. **Criteria now name their holding test** throughout the Functional list.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE after fix

#### Important
- **Guard exemption with no differential oracle** (Step 7). The off-by-default gate is an exemption to a refuse-by-default check. **Fixed**: Risk 4 names the oracle — with `enforce: true`, `task.303` (uncited) and `task.302` (released-only) must still HALT exactly as on `develop`.

#### Optional
- The partial-rollback path is coarse (revert Phase 2's 6d change). Acceptable for a change this size.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

### Should Fix (Important) - 6 — all applied
1. Scope the zsh criterion to a local run.
2. Restate the docs-prompt criterion as documentation.
3. Mark the performance bound not applicable.
4. Name the test behind "this repo unchanged".
5. Record the sweep search.
6. Name the differential oracle.

### Consider (Optional) - 1
1. Effort estimate is the rubric value (16h); realistic effort is 4–8h.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 7/10 (before fixes)
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ READY TO IMPLEMENT

**Justification:** No critical issues; the important ones were criteria-shape problems, fixed in place.

---

## Review Metadata

- **Reviewer:** review-task (inline, under /develop-task Step 2)
- **Review Date:** 2026-10-28
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.241.finalise-changelog-checks-opt-in/task.241.finalise-changelog-checks-opt-in.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md (by reference)
- **Independence:** not independent — reviewer authored the task; pre-pass subagents not dispatched
