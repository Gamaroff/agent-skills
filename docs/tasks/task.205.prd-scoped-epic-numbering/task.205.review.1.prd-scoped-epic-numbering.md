# Task Review Report: Task 205 - PRD-scoped epic numbering

**Reviewed:** 2026-10-15
**reviewed_blob:** 133e98bc65f02c0e914977629c8182277b54b642
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 recommendations implemented — 2026-10-15

---

## Executive Summary

A detailed, well-sourced plan whose §3 inventory holds up against the tree. The defects were at the
seams: the allocator call used a flag the task.202 engine does not have, a vendored CommonJS file
would break in an ESM consumer, and several behaviour criteria lived in `SKILL.md` prose that no
planned test would execute. All were fixable in the document; none needed the owner.

**Critical Issues:** 0 🚨
**Important Issues:** 7 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 — autonomous run (develop-next → develop-task `--defaults`); every
decision below is a default recorded here, not a user answer.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No questions were asked. The pipeline auto-answered: output format **Comprehensive report**;
Step 8.5 **apply all critical + important fixes**; Step 9 **Yes, fixes complete**.

Defaults chosen where a question would otherwise have been asked:

- **Interim "until task.205" notices** (three sites) are updated by this task, because its landing
  falsifies them. The rest of `coding-standards.md` stays with task.207 as §3 already says.
- **Consumer vendoring** of `doc-id.js` is `scripts/doc-id.cjs`, loaded by the generator through
  `createRequire` with a `./doc-id.js` fallback for this repository.

---

## Pre-pass

- **PREPASS_B** (architecture, `prepass-axes.js` source `architecture`): `drift`. Axes checked: What
  this repo produces, SKILL.md authoring, File naming, Cross-skill resources, Registries, Validation
  before commit, Do not. Findings: ShellCheck missing from validation (medium); `coding-standards.md`
  interim and "Do not" lines stale (low); interim `/create-epic` line not updated (low);
  `--rename-from` not in architecture docs (low — `tracker-issue-cli.md` is the CLI's documented
  home, no finding).
- **PREPASS_C** (codebase): `not-implemented`, no findings.

---

## 1. Template Structure Compliance

**Status:** PASS

All eleven numbered sections present; `type: task`, `description`, `tags` present; no placeholders.
`github_issue: 648` exists and the body link matches. Card preflight: 3 card blocks resolve
(Summary +4, Success Criteria +12, Breaking Changes +9 omitted behind "+N more" — information, not a
defect). Change Log present and current. Sign-off not enabled.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND — 0 hallucinations

#### Important

1. **Allocator flag does not exist.** The task and plan call `doc-id.js next epic --prd P`; the
   engine's CLI is `next epic --prd-dir <dir>` (`shared/resources/doc-id.js:28`, `:1061-1064`), and
   prints `{ next, id }`. Verified: `next epic --prd-dir docs/prd/onboarding/prd.1.onboarding --json`
   → `"next": 5, "id": "epic.1.5"`. **Fixed** at every site in both documents.
2. **Helper count inconsistent.** §3 said "two helpers"; Phase 1 adds three (`epicSummary` too).
   **Fixed.**
3. **Vendored `doc-id.js` breaks an ESM consumer.** The generator will import `doc-id.js`, which is
   CommonJS (`require`). `setup-consumer.sh` copies files into a consumer's `scripts/`; under a
   consumer `package.json` with `"type": "module"`, a `.js` there is parsed as ESM and fails on
   `require`. **Fixed:** vendor as `scripts/doc-id.cjs`, load via `createRequire(import.meta.url)`
   with `./doc-id.cjs` then `./doc-id.js`; risk entry updated.
4. **Guard test would trip on task.203's migration.** `shared/resources/migrate-doc-numbering.mjs:88`
   holds `docs/development/epic-registry.md` (it writes the retired pointer there), inside the guard's
   `shared/resources/*.{md,js,mjs,sh}` scan. **Fixed:** allowlisted as a writer, with the reason.
5. **Interim notices this task falsifies were unowned.** `docs/development/epic-registry.md`, its
   generator text (`migrate-doc-numbering.mjs:1232`) and `docs/architecture/concepts/coding-standards.md:64`
   each say "until task 205, do not run `/create-epic`". **Fixed:** added to Phase 6.

#### Optional

1. **Drifted anchors** — `setup-consumer.sh:705-710` → `:810-815`, `:1570-1580` → `:1681-1685`.
   **Fixed.**

Check 14 (call-site population): the task does not enumerate an engine's call sites — not
applicable. Check 18 (runner reach): `tests/epic-numbering-retirement.test.js` is reached by
`'tests/*.test.js'`; `skills/jira-epic-creator/tests/*.test.js` and
`shared/resources/tests/*.test.mjs` are both in `package.json` `test`.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important

6. **Removed-literal test sweep missing (check 15).** The plan named no test that pins what it
   removes. Found by literal: `sync-jira-epic.test.js:763-788` (`normaliseEpicSummary`; `:787`
   **inverts** — it pins the prefix-id fallback this task forbids), `:792-867` (`findChildStories`
   two-segment fixtures), `generate-prd-epic-index.test.mjs` (flat fixtures, `[Epic N]`, single
   number), `skill-protocol.test.js:331`, `:489`, `skill-doc-coverage.test.js:96`. **Fixed:** listed
   under Files to Modify (Tests), with the search recorded.
7. **ShellCheck not run** although Phase 6 edits `setup-consumer.sh`. **Fixed:** `npm run lint:shell`
   added to Phase 6 and the Code Quality criteria.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

8. **Behaviour criteria held by prose (obs #222, #258).** `create-epic` halting with no PRD,
   `review-epic 3` refused / `1.3` resolved, and the GitHub milestone rename were criteria with no
   planned test, and their fixes land in `SKILL.md`. **Fixed:** a §8 "Executable skill blocks"
   subsection — the three blocks are fenced `bash` that the guard test extracts and runs (or, for the
   `gh`-dependent block, asserts); each criterion now names its test. `review-epic`'s Critical-check
   criterion is restated as a documentation criterion. The < 1 s performance criterion is now a
   measured bound with its command and `uptime`; the no-new-network-call criterion names the
   `tracker-issue.test.mjs` call-count assertions.

Scope: 7 phases, ~16 h, one coherent concern (epic numbering) — no split recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

High risks (milestone fork, story-side milestone lag) are named with mitigations; rollback is per
phase. No guard exemption is added, so no differential oracle is required.

---

## Summary of Recommendations

### Should Fix (Important) — 7 issues, all applied

1. `next epic --prd-dir <dir>` everywhere (task + plan).
2. Vendor `doc-id` as `scripts/doc-id.cjs`; generator loads it with `createRequire`.
3. Allowlist `migrate-doc-numbering.mjs` in the guard as a writer.
4. Update the three interim "until task 205" notices.
5. List the tests that pin removed literals, including the inverted `:787` case.
6. Run `npm run lint:shell`.
7. Hold SKILL.md behaviour criteria with extracted, executed blocks; name every criterion's test.

### Consider (Optional) — 1, applied

1. Correct the two drifted `setup-consumer.sh` anchors.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 7/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** Medium-High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No Critical findings; every Important finding was a document fix now applied. The
remaining risk is breadth (≈30 files), which the per-phase green rule contains.

---

## Next Steps

1. Follow the plan phase by phase; run `npm run bundle` after each phase that touches `shared/resources/`.
2. Mutation-prove each new guard (§8).
3. Confirm the local green with the gitignored `.agents/skills` symlink moved aside.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous via develop-task)
- **Review Date:** 2026-10-15
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.205.prd-scoped-epic-numbering/task.205.prd-scoped-epic-numbering.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md (via pre-pass B)
