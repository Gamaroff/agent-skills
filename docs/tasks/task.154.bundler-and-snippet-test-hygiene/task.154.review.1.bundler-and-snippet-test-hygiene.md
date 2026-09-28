# Task Review Report: Task 154 - Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Reviewed:** 2026-09-28
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 1 important and 2 optional recommendations implemented — 2026-09-28

---

## Executive Summary

The task is precise, measured and well-anchored: every file:line citation checked resolves to what it names, the
card preflight and link check are clean, and the two load-bearing invariants (the clone keeps tags and ignore-matched
tracked files; the brace placeholder still matches `SHARED_REF_RE`) were executed and hold. One Important finding: the
Target Architecture promises a warning "once per `(origin, name)`", which the plan's own `seen` rule cannot deliver
for a second origin inside one skill.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (autonomous run — `/develop-task` Step 2, invoked by `/develop-next`)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Autonomous pipeline run: no questions were asked. Output format "Comprehensive report", Step 8.5 "apply all critical +
important fixes" and Step 9 "fixes complete" were auto-answered per `develop-pipeline-autonomous-defaults.md`. No
finding required a decision only the user could make — each fix below is a clarification of intent already stated in
the document.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 mandatory sections present; no placeholders; filename follows `task.{n}.{name}.md`.
- OKF frontmatter: `type: task`, `description`, `tags` all present.
- Tracker linkage: `github_issue: 484`, body link `[#484](…/issues/484)` matches.
- Card preflight (`sync-jira-task.js --check-card`): 3 card blocks resolve, no findings (Breaking Changes shows
  "+2 more", informational).
- Sign-off: not configured (`sign-off` absent from `skills-config.yaml`) — not checked.
- Change Log: present, current for `planned`.

## 2. Technical Accuracy

**Status:** ACCURATE — **Hallucinations Detected:** 0

Pre-pass B (`prepass-axes.js` source: `architecture`): `aligned`, axes checked — What this repo produces, File naming,
Cross-skill resources, Plan files, Validation before commit, Do not. Its three low notes (symlink rule is about skill
references not test fixtures; `test.yml` summary omits `format:check`; the attributed warning is an undocumented
contract) were weighed and are not findings.

Anchors verified (`sed -n`, `grep -n` on the live tree at `12b8fb78`):

- `observation-log-contract.md:290` carries the `` `shared/resources/<name>` `` literal ✅
- `bundle_skill.py` `:27` import, `:35` `SHARED_REF_RE`, `:71` `INVOKE_REF_RE`, `:134` `comment_only_refs`, `:153`
  `_WARNED_COMMENT_ORIGINS`, `:156` `warn_comment_only_refs`, `:468` `discover_needed`, `:509` `pending`, `:520`/`:559`
  `pending.extend`, `:552` the warning, `:998`/`:1255` call sites ✅
- `quick_validate.py:42` `collect_shared_refs` ✅; `scripts/release.sh:185–190` in-place `npm test` ✅
- `skills/finalise/references/newest-numbered.sh` defines `newest_numbered` (`:20`) ✅

Invariants executed (check 11):

- `collect_shared_refs('`shared/resources/{name}`')` → `['{name}']`; the proposed words-only phrasing → `[]` ✅
- `git clone -q --local --shared . .clean-probe`: tags 83 in the clone = 83 in the source; `.clean-probe/CLAUDE.md`
  present ✅ (the two clone-design premises of § 3)
- `bundle_skill.py --check` today: exactly one `not found` line, then `129 skill(s) checked, 0 problems` ✅

Same-class inventory (check 6): present — the task extends `warn_comment_only_refs`/`_WARNED_COMMENT_ORIGINS` rather
than adding a second mechanism. CI trigger (check 8): `test.yml` runs on `push`/`pull_request` with no `paths` filter.

### Important

- **Per-origin dedupe promise is unreachable within one skill** (check 10). Target Architecture says the warning
  "prints once per `(origin, name)` per run", but Phase 2 keeps `seen` keyed on the name alone (deliberately — Risk 2).
  So when two files in one skill's closure cite the same missing name, the second citation is skipped by `seen` before
  it reaches the warning, and only one origin is ever printed for that skill. The behaviour is right; the promise is
  wrong. **Fix applied:** Target Architecture and Phase 2 now say the warning names the citation discovery reaches
  first in each skill, and is deduplicated per `(name, origin)` across skills.

### Optional

- **§2 key** (check 13): `/not found/` also matches `bundle_skill.py:775` (`❌ SKILL.md not found in …`). That line
  cannot appear in a healthy `--check` run, so the broad key is stricter, not wrong — but a red at that site would
  read as this test's failure. **Fix applied:** Phase 3 §2 now matches `shared/resources/.* not found`.
- **Runner without `node_modules`**: `ln -s "$REPO/node_modules"` against a missing directory makes a dangling link
  and a confusing `npm test` failure. **Fix applied:** Phase 5 adds a named refusal when `$REPO/node_modules` is absent.
- Brace placeholders elsewhere in skill prose (task Notes) remain out of scope — agreed.

## 3. Implementation Plan Completeness

**Status:** COMPLETE — six phases, each with files, checkboxes and risk; the plan file carries code for every change.
Effort `16h` is within 2× of the rubric (6 phases, 5 functional criteria, Medium risk).

## 4. Consistency & Completeness

**Status:** CONSISTENT — Files Summary matches the phases; every success criterion names its test; the mutation table
covers each new behaviour. Two independent halves, marked as such; one PR is acceptable at 16h.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE — the Medium clean-checkout risk has a baseline and a pre-`release.sh` dry run; rollback is
per-hunk.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 1 issue

1. Restate the dedupe promise to match `seen` semantics — ✅ applied.

### Consider (Optional) - 3 items

1. Narrow the §2 key to the shared-resources warning — ✅ applied.
2. Refuse a missing `node_modules` in the runner — ✅ applied.
3. Placeholder rewrites in skill prose — deferred (out of scope, as the task says).

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the one Important finding was a wording mismatch between a promise and the
plan, fixed in the document.

---

## Next Steps

Follow the plan phase by phase; record each mutation proof in the implementation report.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, `/develop-task` Step 2)
- **Review Date:** 2026-09-28
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.154.bundler-and-snippet-test-hygiene/task.154.bundler-and-snippet-test-hygiene.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/coding-standards.md` (via pre-pass B)
