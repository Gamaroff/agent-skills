# Task Review Report: Task 85 — Give `/review-pr` a machine-readable findings block

**Reviewed:** 2026-09-09
**Review Depth:** Standard
**Task Status:** Draft (as found) → Ready for Development (after fixes)
**Overall Assessment:** NEEDS IMPROVEMENT (as found) → GOOD (after fixes)

> **Implementation Status**: ✅ All 8 Critical + Important recommendations implemented — 2026-09-09

---

## Executive Summary

Task 85 identifies a real and well-argued defect: on the Step 5c `REQUEST CHANGES` path the PR review
report is the *sole* carrier of findings, and it is parsed by prose description of a rendered text
shape. The diagnosis is correct and the proposed remedy is the right one.

The document, however, was an **80-line stub** against this repository's 11-section task template —
it carried no Implementation Plan, no Testing Strategy, no Files Summary, no Risk Assessment and no
Rollback Plan. Every accepted task in the corpus (66, 77, 82, 93) carries all eleven. More seriously,
the change it proposes **falsifies an assertion in the very test file it lists in scope**, and the
scope line said only "Update the pin" without naming which assertion or how.

All Critical and Important findings were fixed in place under the pipeline's Step 8.5 auto-answer.

**Critical Issues:** 3 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked — this review ran inside the `/develop-task` pipeline under
the `/develop-next` autonomous directive, which auto-answers every gate. Every decision taken in place
of a user answer is recorded in "Decisions Taken Autonomously" below.
**Implementation Readiness:** 5/10 as found → **9/10** after fixes
**Recommendation:** **READY TO IMPLEMENT** (post-fix)

---

## Decisions Taken Autonomously

This review had no interactive Question Points. The three that would have fired, and what was decided:

| Would-be question | Decision | Basis |
| --- | --- | --- |
| QP1 — the task is missing 7 of 11 template sections. Add them, or accept a lean doc? | **Add them.** | Not a judgement call: tasks 66, 77, 82 and 93 — every accepted task inspected — carry the full numbered set. A lean doc here would be the outlier, and Step 3 `/develop` has no phases to execute without §6. |
| QP2 — the block's schema lists `ref`, but `code_review` emits `file_line`. Rename, or carry both? | **Normalise to `ref`.** | Carrying both re-creates the polymorphism §2 names as the defect. The task's own In Scope line already said `ref`; the fix was to state that this is a *rename*, not a passthrough. |
| QP3 — no `github_issue`. Create and link one? | **No — flagged as an Important gap, left unlinked.** | `review-task` Step 2 check 5 says a remote issue is *never* created unprompted, and the pipeline cannot prompt. The recent corpus agrees: tasks 77, 82 and 103 carry no tracker issue. Run `/sync-github-task` later if a card is wanted. |

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND → FIXED

### Issues

#### Critical

- **[C-2] No `## 6. Implementation Plan`.** The document stated *what* should change but never *how*,
  in phases, with files and dependencies. `/develop-task` Step 3 runs `/develop` against exactly this
  section; without it there is nothing to execute and no order to execute it in.
  **Fixed** — three phases added (emit / ingest / re-pin), each with files, checkboxes and explicit
  dependencies.

- **[C-3] No `## 8. Testing Strategy`.** Success criteria ended at *"Full `npm run ci` green"*, which
  is a statement that nothing broke, not that anything works. For a task whose entire purpose is
  making a parse **deterministic**, shipping with no new assertion would leave the claim unverified —
  and the fallback path (criterion 3, the real legacy report) had no test named at all.
  **Fixed** — 8 named assertions, each with the regression it guards, plus the repo's standing
  mutation-proof requirement.

#### Important

- **[I-4] Seven template sections absent and headings unnumbered** — Technical Background, Breaking
  Changes, Files Summary, Risk Assessment, Rollback Plan, Progress Tracking, plus `## 1.`–`## 11.`
  numbering. **Fixed** — all present and numbered.

- **[I-3] No `github_issue:` in frontmatter.** **Not fixed** by design — see QP3 above. Non-blocking.

#### Optional

- **[O-1] `estimated_effort_hours: 4`** was set against a document with no plan. Recomputed against
  the now-explicit 3 phases / 8 assertions / 10 success criteria, 4h remains reasonable. Left as is.

### Compliance detail

- Filename `task.85.review-pr-machine-readable-findings.md` ✅ dots-as-separators, hyphens within.
- **OKF conformance** ✅ `type: task` present and non-empty; `description` present; `tags` a YAML list.
- **Placeholders** ✅ none (`[TBD]`, `[TODO]`, `???`) before or after.
- **Stakeholder Sign-off** — check skipped: `sign-off.enabled` is absent from `skills-config.yaml`.
- **Change Log** (check 4b, `advisory` default) — present with one row as found; **not stale**, since
  `status` had not advanced past draft. Two rows appended by this review (verdict + transition).
- **Tracker Card Preflight** ✅ exit 0 both before and after the rewrite. All three card blocks
  resolve: Summary (prose, +2 omitted), Success Criteria (list, +5 omitted), Breaking Changes (prose,
  +2 omitted — this block was `absent-optional` before the rewrite and now resolves).

---

## 2. Technical Accuracy

**Status:** ACCURATE — no hallucinations
**Hallucinations Detected:** 0

Every technical claim was verified against the tree, not accepted:

| Claim in the task | Verified against | Result |
| --- | --- | --- |
| 5c runs only on a `PASS`/`WAIVED` gate, so no gate `top_issues` carry findings | `qa-findings-ingester-prompt.md`, "The **PR Review** report … is the ONLY carrier" | ✅ |
| The ingester once described the subagent YAML (`severity:`, `file:line`) | `pr-review-loop-parity.test.mjs:512` comment block | ✅ |
| "A test now pins the two together" | `pr-review-loop-parity.test.mjs:512-575` | ✅ |
| The rendered shape is `[PC-1] coverage · high · confidence: high — AC-3` | `skills/review-pr/SKILL.md:272-279`; real report `task.66.pr-review.1:63` | ✅ |
| `ref` is polymorphic | `pr-conformance-prompt.md:106` (`ref`), `code-review-prompt.md:67` (`file_line`) | ✅ — and see I-1 |
| Files listed in §5 References all exist | `ls` on each path | ✅ all four |

### Issues

#### Critical

- **[C-1] The change falsifies a test assertion the task does not name.**
  `pr-review-loop-parity.test.mjs:558` asserts, verbatim:

  ```js
  assert.match(ingester, /there is no `severity:` key anywhere in the file/i,
    "the ingester must warn against searching for the YAML key that never reaches disk");
  ```

  A `findings:` block **puts a `severity:` key in that file**. So the sentence becomes false — and,
  worse, the test keeps *passing* on a now-false sentence, because it asserts the string's presence,
  not its truth. Scope said only "Update the pin in `pr-review-loop-parity.test.mjs`", which reads as
  routine maintenance rather than "this specific claim inverts."

  The dangerous resolution is deletion: the wrong turn the sentence forbids (searching the *rendered*
  text for a `severity:` key) is still a wrong turn after this change, and deleting the warning
  removes the guard while the test goes green.

  **Fixed** — §3 Target Architecture and §6 Phase 2 now require the sentence to be **re-scoped to the
  rendered shape**, Phase 3 forbids deleting it by name, and Testing Strategy #7 asserts a scoped
  sentence exists.

#### Important

- **[I-1] The proposed schema silently renames a field across the two lenses.** In Scope listed one
  block with `ref`, but `code_review` emits **`file_line:`** (`code-review-prompt.md:67`) while
  `pr_conformance` emits **`ref:`** (`pr-conformance-prompt.md:106`). Step 6 of `review-pr` describes
  the two schemas as "deliberately parallel (`id` / `category` / `severity` / `confidence` /
  `finding` / `suggested_action`)" — a list that **omits the location field entirely**, which is
  exactly how the discrepancy stayed invisible. An implementer reading only the task would plausibly
  emit `file_line` for `CR-*` entries and reproduce the polymorphism the task exists to remove.
  **Fixed** — §3 carries a side-by-side field table, states the normalisation as the single most
  likely error, §10 rates it Medium/High, and Testing Strategy #4 asserts the rule is written down.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND → FIXED

### Issues

#### Important

- **[I-2] Block placement, fence tag and emptiness semantics unspecified.** Step 7's template is
  introduced with *"ALWAYS use this exact template structure"*, so a new block must be placed in it
  precisely — but the task said only "alongside the rendered text". Three sub-questions had no
  answer: one block or one per section; tagged fence or untagged (the rendered findings already sit
  in **untagged** ``` fences — `task.66.pr-review.1:62`, so an untagged block would be
  indistinguishable from them); and what an empty review emits.

  That last one is the subtle half: if a findings-free report **omits** the section, then "section
  absent" means both "legacy report" and "no findings", and the ingester's fallback fires on a report
  that had a block. A block-emission bug then presents as a legacy report.
  **Fixed** — one section, named `## Machine-Readable Findings`, between Code Review Findings and
  Recommended Actions; ```` ```yaml ```` tagged; **always emitted**, as `findings: []` when empty.
  Pinned by Success Criteria and Testing Strategy #1–#3.

- **[I-5] `truncated_count` unaddressed.** Both subagent schemas carry it and Step 6 says *"If
  `truncated_count > 0`, note the omitted count"* — as rendered prose, which a machine consumer would
  have to parse out of a sentence. The ingester's own output schema has a `truncated_count` field
  waiting for it. **Fixed** — a top-level `truncated_count:` in the block, defined as the **sum** of
  both lenses' counts.

### Verified as adequate

- Files Summary now names the bundling fan-out (`skills/*/references/…`) explicitly, which the repo's
  standing rule requires: edit `shared/resources/`, never the bundled copy, or `npm run bundle`
  reverts the fix.
- Phase dependencies are explicit and correctly ordered (3 depends on 1 and 2; 2 depends on 1).

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Motivation, Scope and Success Criteria agree with one another after the rewrite; each
  success criterion maps to a phase and to at least one assertion.
- **Scope sizing** — 3 phases, 3 files, ~4h. Well under the >8-phase / >1-sprint split threshold. No
  split recommended.
- **Testing sufficiency** — the 8 assertions cover both arms (block, fallback), the schema, the
  normalisation rule and the warning's survival. The one gap is honestly stated rather than papered
  over: no test executes a real `/review-pr` run, which is the pre-existing limit of every contract
  test in that file and is neither widened nor narrowed here.
- **Success criteria measurability** — all 10 are checkable by running a command or grepping a file.

#### Optional

- **[O-2] Fence tagging as a parser affordance.** Noted rather than filed as a defect: tagging the
  new fence ```` yaml ```` while the rendered fences stay untagged gives the ingester a
  discriminator that does not depend on section-heading text alone. Adopted in the fix.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND → FIXED

Neither section existed. Both now do.

The rollback story is genuinely clean and worth stating plainly: the change is **additive** — three
edited files, no new files, no data migration, no state to unwind. Reports written while the block
existed carry a section a reverted ingester simply ignores. Rollback is a single revert commit plus
`npm run bundle`, under 10 minutes.

The five risks now recorded are all specification risks rather than runtime ones, which is correct for
a prose-contract change: the `file_line`/`ref` trap, deletion-instead-of-rewording of the warning, the
empty-report omission, a missed `npm run bundle`, and rendered/structured drift.

---

## Summary of Recommendations

### Must Fix (Critical) — 3 issues

1. **[C-1]** Name the falsified assertion and require the `severity:` sentence to be **re-scoped, not
   deleted**. ✅ Fixed
2. **[C-2]** Add `## 6. Implementation Plan` with phases, files and dependencies. ✅ Fixed
3. **[C-3]** Add `## 8. Testing Strategy` naming the assertions that prove the feature. ✅ Fixed

### Should Fix (Important) — 5 issues

1. **[I-1]** State the `CR-*` `ref` ← `file_line` normalisation; the two schemas are not
   field-identical. ✅ Fixed
2. **[I-2]** Specify block placement, fence tag, and that an empty review still emits the section.
   ✅ Fixed
3. **[I-5]** Carry `truncated_count` in the block as the sum of both lenses. ✅ Fixed
4. **[I-4]** Add the seven missing template sections and number the headings. ✅ Fixed
5. **[I-3]** No `github_issue:` linkage. ⏭ Not fixed — never created unprompted; see QP3.

### Consider (Optional) — 2 items

1. **[O-1]** `estimated_effort_hours: 4` — recomputed against the new plan, still reasonable. No change.
2. **[O-2]** Tag the new fence `yaml` to distinguish it from the untagged rendered fences. ✅ Adopted.

---

## Implementation Readiness Assessment

**Score:** 5/10 as found → **9/10** after fixes

| Dimension | As found | After fixes |
| --- | --- | --- |
| Template Compliance | 3/10 | 9/10 |
| Technical Accuracy | 8/10 | 9/10 |
| Implementation Clarity | 3/10 | 9/10 |
| Consistency | 7/10 | 9/10 |
| Risk Management | 2/10 | 9/10 |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — score ≥ 8 and no Critical issues remain. The one
unfixed Important issue (I-3, tracker linkage) is non-blocking and matches the recent corpus.

**Justification:** The task's diagnosis was correct from the start and verified against the tree
without a single hallucination; what it lacked was executable specification and an acknowledgement
that it inverts an existing test assertion. Both are now explicit, and the riskiest detail — that the
two subagent schemas differ in exactly the field being unified — is stated where an implementer will
hit it rather than left to be rediscovered.

Points withheld from 10/10: no test exercises a real `/review-pr` run, so the contract remains
prose-to-prose; and I-3 is open.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Work §6 phases in order — Phase 3 asserts against both files, so it must come last.
2. Treat §3's field-comparison table as the specification for the normalisation; do not re-derive it
   from the two prompt files.
3. Run `npm run bundle` after Phase 2 and commit the regenerated `references/` copies.
4. Mutation-prove each new assertion and record the result in the implementation report.
5. Tick §Progress Tracking as each phase closes.

---

## Review Metadata

- **Reviewer:** `/review-task` (autonomous, inside `/develop-task` Step 2, dispatched by `/develop-next`)
- **Review Date:** 2026-09-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.85.review-pr-machine-readable-findings/task.85.review-pr-machine-readable-findings.md`
- **Sources consulted:** `skills/review-pr/SKILL.md` (Steps 6–8),
  `shared/resources/qa-findings-ingester-prompt.md`, `shared/resources/code-review-prompt.md`,
  `shared/resources/pr-conformance-prompt.md`,
  `evals/shared/tests/pr-review-loop-parity.test.mjs`,
  `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md`, `package.json` (test globs),
  `skills-config.yaml`, and the task documents for tasks 66/77/82/93/103 (corpus convention).
- **Pre-pass:** the two Explore pre-pass agents (architecture alignment, codebase already-implemented)
  were **not dispatched** — this session runs under a standing instruction not to use the Agent tool
  unless asked. Both axes were covered inline instead: architecture alignment by reading the four
  contract files directly, and already-implemented status by confirming no `Machine-Readable` /
  `findings:` block exists in `skills/review-pr/SKILL.md` or any `.pr-review.*.md` report on disk.
