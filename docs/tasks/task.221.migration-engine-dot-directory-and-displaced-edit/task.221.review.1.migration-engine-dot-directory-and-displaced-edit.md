# Task Review Report: Task 221 - Migration engine: dot-directory references and displaced-block edits

**Reviewed:** 2026-10-21
**reviewed_blob:** e332484d70b5cb270b98f046ee0a83d803d2ec6e
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** EXCELLENT

> **Implementation Status**: ✅ No critical or important recommendations to implement — 2026-10-21

---

## Executive Summary

The task is small, exact and verified. Both fixes were run on a scratch copy of the engine during
this review: they produce the outcomes the success criteria state, and all 68 existing tests pass
against the patched copy. Every line anchor resolves to the code it names.

**Critical Issues:** 0 🚨
**Important Issues:** 0 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (pipeline run; nothing needed a decision)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No question points fired. Step 0 output format and Steps 8.5 / 9 were auto-answered by the
`/develop-task` pipeline (Comprehensive report; apply all critical + important fixes; promote on
READY TO IMPLEMENT).

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections, Progress Tracking and References are present. No placeholders.
- Frontmatter: `type: task`, `description`, `tags` list, `github_issue: 713` all present (OKF conformant).
- File name follows `task.{N}.{name}.md`.
- Tracker linkage: issue #713 exists (OPEN); body link `[#713](https://github.com/Gamaroff/agent-skills/issues/713)` matches frontmatter.
- Card preflight (`sync-jira-task.js --check-card`): exit 0 — Summary, Success Criteria and Breaking Changes resolve (4, 7 and 4 items fall behind "+N more").
- Sign-off: not configured (`sign-off` absent from `skills-config.yaml`) — not checked.
- Change Log: present, one row, consistent with `status: planned`.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

- **Line anchors** (check 2): `:864` `frontmatterState`, `:895` docstring, `:897` `editFrontmatter`,
  `:1087` `PATH_TOKEN`, `:1090` `VARIABLE_BEFORE`, `:1108` `outsideReferences`, `:1140` the `forms`
  line, `:1336` / `:1341` the blocker and the only caller; test rows `:1157`, `:1394`, `:1488`,
  `:1543` — every one resolves on `feature/task.221.*` @ `7619df82`.
- **Links** (`doc-links.js`): 4 relative links resolve.
- **Bundled copy**: `skills/review-prd/references/migrate-doc-numbering.mjs` differs from the source
  only in line 1 (AUTO-GENERATED header), as stated.
- **Invariant verification** (check 11) — run, not read. Both fixes applied to a scratch copy, then
  the plan's inputs run through current and patched code:

  | Input | Current | Patched |
  | --- | --- | --- |
  | `scripts/run.sh`: `cat .docs/prd.md` | `[]` | `[".docs/prd.md"]` |
  | `scripts/run.sh`: `cat ${ROOT}/.docs/prd.md` | `[]` | `["/.docs/prd.md"]` |
  | `scripts/run.sh`: `cat $ROOT/.docs/prd.md` | `[]` | `["ROOT/.docs/prd.md"]` |
  | `scripts/run.sh`: `cat ../.docs/prd.md` | `["../.docs/prd.md"]` | same |
  | `scripts/run.sh`: `cat ./.docs/prd.md` | `[]` | `[]` |
  | `scripts/run.sh`: `cat docs/prd.md` | `[]` | `[]` |
  | `editFrontmatter` displaced / BOM / unclosed unchanged? | false / false / true | true / true / true |

  The existing suite, pointed at the patched copy: `ℹ tests 68 … ℹ pass 68 ℹ fail 0`.
- **Outcome reachability** (check 10): each success criterion's outcome is the branch that fires on
  the patched copy (table above).
- **Same-class mechanisms** (check 6): §3 names `replaceTargets` and states `outsideReferences` is
  the only resolver of non-link mentions; no new mechanism is added.
- **Removed literal** (check 15): the plan removes `if (close < 0) return text;`. `git grep` over
  `*.test.*` for `close < 0` and `rest.startsWith` → no hits.
- **Test reach** (check 18): new rows go in `shared/resources/tests/migrate-doc-numbering.test.mjs`,
  reached by the `shared/resources/tests/*.test.mjs` glob in `package.json` `test`.
- Checks 12, 13, 14, 16, 17, 19, 20, 21: not applicable (no compatibility shape, no single-statement
  test key, no engine call-site list, no replaced region, no shell-command identity key, no resume
  rule, no hand-written site list, no cross-skill field consumption).
- Architecture axes (`prepass-axes.js`, source `architecture`): the relevant axes are "Cross-skill
  resources" (edit the `shared/resources/` source, regenerate the bundled copy — the plan does) and
  "Validation before commit" (`bundle:check`, `npm run ci` — both in Phase 3). Aligned.

### Optional

- **O-1**: the CR-1 test could also hold the `$ROOT/.docs/prd.md` form (a `$`-rooted token takes a
  different branch from `${ROOT}/…`). Verified above that the fix covers it.
- **O-2**: a variable-rooted `./` or `../` (`${ROOT}/./docs/prd.md`) still resolves only against the
  file's directory. Pre-existing, and §4 puts other path shapes out of scope; noted for a later task
  if one is ever reported.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Three phases, each with files, a test-first step, the exact change and a red-first expectation. The
plan file gives the code. Effort 2h agrees with the rubric for 2 one-line fixes plus tests.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Files Summary matches the phases. Each behaviour criterion names the test that holds it; each has
  a control (`./.docs/prd.md` and `docs/prd.md` for CR-1; the existing `none`/`closed` rows for CR-2).
- Performance criteria are held by the existing linearity row (`:1543`).
- No criterion depends on merge.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low risk throughout; the one behaviour widening (a new `stale-reference` hit for a dot-directory
mention) is named in §3 and §10 with its consumer fix. Rollback covers full and partial revert.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 0 issues

### Consider (Optional) - 2 items

1. O-1: add the `$ROOT/.docs/prd.md` row to the CR-1 test.
2. O-2: variable-rooted `./`/`../` stays directory-relative — out of scope, recorded only.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Both fixes were executed and behave as claimed, with no regression in the
existing suite; nothing needs a decision before development.

---

## Next Steps

1. Follow the plan phase by phase, test first.
2. Mutation-prove each fix and record the red lines in the implementation report.

---

## Review Metadata

- **Reviewer:** review-task (Claude, develop-task pipeline Step 2)
- **Review Date:** 2026-10-21
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.221.migration-engine-dot-directory-and-displaced-edit/task.221.migration-engine-dot-directory-and-displaced-edit.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md (via `prepass-axes.js`)
- **Pre-pass:** Agents B and C were not dispatched; both passes were performed inline (architecture
  axes above; codebase scan = the scratch-copy run and greps). Independence loss: no separate agent
  checked the document. Reason: two one-line fixes, and Explore subagents hung three times in an
  earlier session.
