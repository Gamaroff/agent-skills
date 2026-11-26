# Task Review Report: Task 320 - Task 319's leftover findings are closed

**Reviewed:** 2026-11-25
**reviewed_blob:** 463cb82c1fbc5bc69178026e908ed6cb6945ece3
**Review Depth:** Standard
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD
**Pre-pass:** both Explore agents ran. B: `drift`, three low findings. C: `not-implemented`, no finding.

> **Implementation Status**: ✅ All 3 Important recommendations implemented — 2026-11-25

---

## Executive Summary

The task is precise and its claims hold where they were run. Three Important gaps were found and fixed
in the document: one named mutation would have turned nothing red, the two linters the merge gate runs
were missing from the testing strategy, and the timing criterion did not say where it is measured.

**Critical Issues:** 0
**Important Issues:** 3 (fixed)
**Optional Improvements:** 3

**User Clarifications:** none asked — autonomous run (`develop-next`)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

None asked — autonomous run. The one decision the document leaves to its owner (refuse a control
character at the edge of `ci.skipMarker`, or document that it is dropped) is stated in § 3 as
"refuse", reversible by the owner. This review did not reopen it.

---

## 1. Template Structure Compliance

**Status:** PASS

- All eleven numbered sections, frontmatter (`type`, `description`, `tags`) and Change Log present
- Issue #938 exists, is open, and the body link matches; the board Priority is P3
- Card preflight: 3 of 3 blocks resolve, no finding
- Links: 8 of 8 in the task and 1 of 1 in the plan resolve (`doc-links.js`)

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Pre-pass B measured against `source: architecture`, axes: What this repo produces, SKILL.md authoring,
File naming, Status lifecycle, Cross-skill resources, Plan files, Registries, Validation before commit,
Do not.

What was run, not read:

| Claim | Command or input | Result |
| --- | --- | --- |
| Source anchors in § 3's first table | `grep -n` / `sed -n` at `eb0226de6` | all resolve; `shared/resources` unchanged since `b005792a9` |
| Copies per file: 1, 6, 3, 2, 6 | `git ls-files 'skills/*/references/<name>' \| wc -l` | 1, 6, 3, 2, 6 |
| `normKey` has no other caller | `git grep -n normKey` | 6 use sites in the two engines, as stated |
| "`joined` has one entry per criterion, in the reader's order" | a scratch script over 353 documents with criteria, and 8 crafted sections (fence, indented fence, CRLF, numbered, comment, empty item) | 0 mismatches |
| `readCriteriaEntries` is `null` for no work item | the § 10 definition | 0 of 342 (337 when authored) |
| Escaped `ci`, `pipeline` are ignored today | `parseConfig` / `parsePipelineConfig` | reproduced |
| BOM and tab at the marker's edge are dropped today | `parseConfig` | reproduced |
| The planned marker change keeps CRLF, spaces and a trailing comment | the one-identifier change on a scratch copy, 11 inputs | accepted; BOM and tab refused |
| Pinned messages | `push-policy.test.mjs:1286`, `finalise-rerun-at-head.test.mjs:848` | the first is a fetch that brought nothing, and stays; the second asserts the class, not the text |
| Banned names | the four `CONSUMER_NAMES` patterns over both documents | 0 hits |

### Issues

#### Important

- **I-1: the shared escape helper is held by no test in `listKeyRows`.** After Phase 3, `normKey`
  refuses every case of the T319-CR-406 test before `listKeyRows` is reached. On a scratch copy with
  `normKey` decoding and `listKeyRows` not decoding, all four escaped-key cases are still refused, while
  `notes:` holding `"rerun\x41tHead":` goes from refused (today) to **accepted**. So the mutation
  "revert each remedy alone" turns nothing red for that half, and a regression there is silent.
  - **Location:** § 8 Unit Tests, plan Phase 3
  - **Recommendation:** add that input as a test case, and name its mutation

#### Optional

- **O-1:** the § 10 population is 342 today, not 337. The definition is stated, so the number only
  decayed. Re-measured at QA anyway.
- **O-2:** the released baseline of Breaking Change 2 is not cited: `ci.skipMarker` first shipped in `v0.69.0`.
- **O-3:** a single-quoted `'c\x69'` is literal text in YAML, and is refused too, because the parse does
  not keep the quote. It names nothing the engine reads, and the refusal is loud.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Files, changes and dependencies are explicit. The rubric estimate is 8 h, as in the frontmatter.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **I-2: the merge gate runs two checks the task does not.** `ci:fast` is `format:check` and `npm test`.
  `develop-next` merges on `npm run ci`, which also runs `lint:shell` and `lint:secrets`, and
  `coding-standards.md` requires ShellCheck after any `.sh` edit. This task edits two. A warning would
  stop the run after acceptance.
  - **Recommendation:** name both commands in § 8
- **I-3: the performance criterion is wall-clock and does not say where it is measured.** `/finalise`
  fails such a figure when it was not taken on the PR's head, with the load beside it.
  - **Recommendation:** say both in the criterion

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

No remedy deletes, overwrites or pushes anything that is not pushed today. The refusals are widened, not
narrowed, so no differential oracle is needed. The one answer that becomes softer, T319-CR-1303's `124`
in place of `137`, asks the remote before it answers, and has its control (a kill inside the bound).

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues

1. I-1: a test case for `listKeyRows`' decoding
2. I-2: `lint:shell` and `lint:secrets` in § 8
3. I-3: where the durations are measured

### Consider (Optional) - 3 items

1. O-1: the population figure — re-measured at QA
2. O-2: cite `v0.69.0` — applied
3. O-3: single quotes — applied as a clarification

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 10/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 8/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** every remedy is specified with its reproduction and control, the claims that could be
run were run, and the three gaps are closed in the document.

---

## Next Steps

1. Write each test first and record its red run
2. Phase 1, 2, 3, then 4
3. `npm run bundle` before the gate

---

## Review Metadata

- **Reviewer:** review-task (develop-task Step 2)
- **Review Date:** 2026-11-25
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md
- **Review Duration:** (not measured)
