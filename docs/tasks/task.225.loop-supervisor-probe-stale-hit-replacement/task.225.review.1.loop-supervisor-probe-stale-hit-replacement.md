# Task Review Report: Task 225 - loop-supervisor: find a replacement probe script after a stale hit

**Reviewed:** 2026-10-31
**reviewed_blob:** 44acf1486b00b86c5ebfb3cf3633c989bc6447e1
**Review Depth:** Standard
**Task Status:** Planned (at review start)
**Overall Assessment:** EXCELLENT

---

## Executive Summary

A small, precise follow-up to task.224's QA gate 4 CR-1. Every code and test anchor resolves, and the core claims were run, not read: on Node v26.8.2 a stale `require.resolve` hit survives a file → directory swap (and the reverse), and a fresh `node -e` process resolves the replacement and returns `null` when nothing is left. No blocking findings; three optional notes.

**Critical Issues:** 0 🚨
**Important Issues:** 0 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — `develop-task` Step 2, `develop-next --defaults`)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked. The review ran inside the `develop-task` pipeline with the documented auto-answers: output format "Comprehensive report", Step 8.5 "apply all critical + important fixes", Step 9 "Yes, fixes complete" on READY TO IMPLEMENT. No finding needed a human decision.

**Pre-pass:** Agents B and C were not dispatched; both passes were performed inline by the reviewer. Independence loss recorded: no reviewer independent of this session checked architecture alignment or prior implementation. Architecture axes source: `prepass-axes.js` → `architecture` (10 axes). Alignment: the change uses only `node:child_process` / `node:fs`, already required in `adapters.js:21-22`, and keeps the module's no-shell `execFileSync` pattern (`adapters.js:152`). Implementation status: not implemented — `resolvesAsMain` (`adapters.js:378-386`) has no fallback and is not exported (`adapters.js:423-429`).

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References, Notes. No placeholders.
- Frontmatter: `type: task`, `description`, `tags` list, `github_issue: 725`, `estimated_effort_hours: 2`. OKF conformant.
- File naming follows `task.{N}.{name}.md`.
- Tracker linkage: `gh issue view 725` → OPEN; body link `[#725](…/issues/725)` matches frontmatter. Board Priority already `P3 Low`.
- Card preflight: `sync-jira-task.js --check-card` → exit 0, 3 card blocks resolve.
- Sign-off: `sign-off.enabled` unset → not checked. Change Log: present, current for `planned`.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

- **Anchors** (check 2): `adapters.js:378` (`function resolvesAsMain`), `:381` (`require.resolve(file)`), `:385` (`return fs.existsSync(resolved)`), `:402` (`probeMissing`), `:236` / `:251` (`findExisting` / `firstExisting`); `adapters.test.mjs:15` (the `node:fs` import), `:534`, `:571`, `:597` — all resolve to what they name.
- **Doc links:** `doc-links.js` → 3 relative links resolve.
- **Invariants run** (check 11), in a scratch script, `command node` v26.8.2:
  - `tools/select.js -> tools/select/index.js | inproc: tools/select.js then tools/select.js exists: false | fresh: tools/select/index.js`
  - `tools/select/index.js -> tools/select.js | inproc: tools/select/index.js then tools/select/index.js exists: false | fresh: tools/select.js`
  - nothing left → `fresh: null` in both directions.
  - `node -e '…' foo` → `process.argv` is `[execPath, "foo"]`, so `process.argv[1]` is the file, as the plan states.
- **Outcome reachability** (check 10): SC1/SC2 `null` is reached by the planned stale-hit branch (Phase 1 names the condition — resolved file gone — and the outcome — `freshResolve(file) !== null`). SC3 reaches `probe script not found:` because the fresh resolve returns `null`.
- **Same-class inventory** (check 6): § 3 "Existing mechanisms this task sits beside" names `findExisting` / `firstExisting` and states the new code extends `resolvesAsMain`, adding no second check.
- **Export shape:** no test pins the `adapters.js` export keys (`adapters.test.mjs:193` pins `ADAPTERS` keys, not `module.exports`), so exporting `resolvesAsMain` breaks nothing.
- **Test reach** (check 18): no new test file; `evals/loop-supervisor/unit/*.test.mjs` is already in `package.json` `test:suite`.
- Checks 12–17, 19–21: not applicable (no compat shape, no removed literal, no region replacement, no shell-string identity, no resume rule, no engine call-site list, no cross-skill field consumption).

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Both phases name the file, the function, the exact code, and the test placement. The plan file gives drop-in code for `resolveInFreshNode`, the new `resolvesAsMain`, and the SWAPS tests. Effort (2 h) is plausible for one function and four tests.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Files Summary matches the phases (adapters.js, adapters.test.mjs, CHANGELOG.md).
- Success criteria classify cleanly: SC1–SC3, SC5 are behaviour criteria each held by a named planned test; SC4 is held by existing tests; SC6 is a recorded mutation run; SC7 is a test/CI run; SC8 is a documentation criterion.
- Control case present: the QA-3 delete/restore pair and the five agreement cases must pass unchanged, and SC3 is a correct instance the fallback must leave alone (stale with no replacement stays missing).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low-risk items are identified with mitigations (timeout, `null` on any failure, no shell, argument not code). Rollback is a single `git revert`. No guard is widened in a refuse-by-default sense: the fallback only turns "missing" into "present" where a fresh `node` agrees.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 0 issues

None.

### Consider (Optional) - 3 items

1. **CHANGELOG has no `### Fixed` under `[Unreleased]`.** It currently holds `### Added` and `### Changed` only. The developer creates `### Fixed` after `### Changed` (Keep a Changelog order).
2. **"It took 31 ms in the repro"** (§ 3) carries no command. It is illustrative and no criterion depends on it, so no change is needed; a future reader should not treat it as a bound.
3. **Stray child stdout reads as "present".** `resolvesAsMain` tests `freshResolve(file) !== null`; a `NODE_OPTIONS=--require …` hook that prints to stdout would make any output count. A cheap hardening is `const f = freshResolve(file); return f !== null && fs.existsSync(f);`. Optional — the input is operator config and the environment is the operator's.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Every cited anchor resolves and every behavioural claim was executed and holds on the Node version in use; the plan supplies the code and the tests.

---

## Next Steps

1. Implement Phase 1 (`resolveInFreshNode`, the stale-hit branch, the export).
2. Implement Phase 2 (SWAPS tests, spawn-count test, mutation proof, CHANGELOG `### Fixed`).
3. Run the loop-supervisor suite with `.agents/skills` moved aside, and `npm run validate -- skills/loop-supervisor/`.

---

## Review Metadata

- **Reviewer:** review-task (Claude, inside develop-task Step 2)
- **Review Date:** 2026-10-31
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.225.loop-supervisor-probe-stale-hit-replacement/task.225.loop-supervisor-probe-stale-hit-replacement.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (via `prepass-axes.js`)
- **Pre-pass:** performed inline (no Explore dispatch) — independence loss noted above
