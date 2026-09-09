# Task Review Report: Task 99 — A diminishing-returns exit for the QA loop

**Reviewed:** 2026-09-09
**Review Depth:** Standard
**Task Status:** Draft (at review time) → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 9 recommendations implemented — 2026-09-09

---

## Executive Summary

The task is well-argued and unusually well-evidenced — it is filed from a measured run, states its
own single-data-point caveat, and correctly identifies that it must sit *beside* the Convergence
check rather than modify it. Two problems blocked implementation as written, and both are of the
same kind: **the Testing Strategy demanded a replay, and neither the thing to replay nor the thing
to replay it through existed.** Four further issues were corrections to prose that had drifted or
was underspecified. All were fixed in this review.

**Critical Issues:** 2 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 — autonomous pipeline run (`/develop-next` → `/develop-task` Step 2);
all questions auto-answered with the documented pipeline defaults.
**Implementation Readiness:** 8/10 (post-fix; 6/10 as filed)
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively inside the `develop-task` pipeline. Per
`references/develop-pipeline-autonomous-defaults.md` and the develop-next autonomous directive, the
three prompts were auto-answered:

| Prompt | Auto-answer | Why |
| :--- | :--- | :--- |
| Step 0 — output format | Comprehensive report | Required for the pipeline audit trail |
| Step 8.5 — apply fixes | Yes, apply all critical + important fixes | The pipeline needs the task corrected before Step 3 runs `/develop` |
| Step 9 — update status | Yes, fixes complete | Outcome is READY TO IMPLEMENT; `develop-task` gates on `Status:` |

No user clarification was sought, so every fix below is a **conservative** reading of the task's own
stated intent — none of them changes what the task is trying to achieve.

**Phase 1.5 pre-pass**: the two Explore subagents were **not dispatched**. Both axes were checked
in-line instead (architecture alignment against `shared/resources/`, and the already-implemented scan
against the live `develop-pipeline-step-5-6-qa-loop.md`), because both reduce to reading three files
in this repository and the session has a standing instruction against spawning subagents that were
not asked for. Recorded here rather than left silent: an in-line check is a narrower instrument than
an independent read, and this is the axis where that matters.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory sections present, plus `## Change Log`, `## Progress Tracking`, `## References` and
`## Notes`. Filename follows `task.{number}.{descriptive-name}.md` with dots as structural separators.
No placeholders (`TBD`, `TODO`, `???`) anywhere in the document.

**OKF frontmatter**: `type: task` present and non-empty ✅; `description` present ✅; `tags` a proper
YAML list ✅; `updated` present ✅.

**Sign-off / Change Log config**: `skills-config.yaml` declares neither `sign-off:` nor
`change-log:`. Sign-off is therefore **not checked** (absent ⇒ disabled); Change Log defaults to
`enabled: true, enforcement: advisory` and the document already carries a well-formed four-column log
with one row. No finding.

### Issues

#### Important
- **I5 — No tracker linkage.** Frontmatter carries no `github_issue:`. Flagged per the template
  contract; **not fixed** — creating a remote issue requires the opt-in prompt, which an autonomous
  run must not answer on the user's behalf. The pipeline logged the skip and every tracker signal in
  this run is a no-op. Run `/sync-github-task` to link it later.

**Score: 9/10**

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 invented technologies — but 2 unresolvable references

Every file path the task names exists and every technical claim about the Convergence check verifies
against the live document: it does count HIGH per gate (line 311 ff.), it does escalate rather than
exit, the `7, 7, 7, 7, 4` sequence is recorded there, and the proposed insertion point (after
*Convergence check*, before `### 5b. Run QA Fix (shared)`) is real — lines 311 and 396 respectively.
The `HIGH_N` awk the task proposes to reuse is present and documented. This part of the task is
accurate.

### Issues

#### Critical
- **C2 — The replay fixtures do not exist in this repository, and the reference is ambiguous.**
  §9 and §10.2 name *"tinker-city `task.103.gate.{1..4}.*.yml`, all committed"*. They are committed
  in **tinker-city**, not here. Worse, this repo has its own `docs/tasks/task.103.*` —
  `task.103.pipeline-owns-the-registry-tick` — so an implementer following the reference lands on an
  unrelated task. Five of the ten success criteria depended on replaying files that cannot be opened.
  - **Fix applied:** §9 now requires vendored fixtures under
    `shared/resources/tests/fixtures/qa-diminishing-returns/` that reproduce the **documented shape**
    of the recorded run, **labelled in-file as reconstructions**. Criterion 2 was restated against
    them. The task now says plainly that the original gates live in another repository and are not
    vendored — an honest reconstruction beats a fixture that claims to be someone else's artifact.

#### Important
- **I1 — Scope item 4 targets prose that no longer exists.** §4 said *"Updating the 'three exits'
  sentence in the section preamble — there are now four."* The preamble was rewritten when 5c became
  the loop's exit gate; it now reads *"There is **one way the loop exits to Step 7**"* and *"There
  are **two ways it escalates**"*. There is no "three exits" sentence to update, and an implementer
  searching for one finds nothing and must guess.
  - **Fix applied:** §4 now states the current wording verbatim and says exactly what changes — the
    exit count goes **one → two**; the escalation count is unchanged.
- **I4 — Condition 3 is undefined against the gate schema.** *"`category: bug` against a non-test
  path"* — `category:` is not a documented field of gate `top_issues[]` entries in this repository.
  - **Fix applied:** condition 3 now requires verifying the field against the QA skills' actual gate
    schema before implementing, and adds the missing fail-safe: **a finding whose category cannot be
    determined fails the condition** — the same "positive evidence, never absence" rule condition 2
    already states, which the original condition 3 did not inherit.

**Score: 7/10**

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Critical
- **C1 — The Testing Strategy has nothing to test.** §9 calls for replaying gate sequences "through
  the rule", and §10 hangs five criteria on that replay — but §8 Files Summary listed only prose:
  the qa-loop document, `configuration.md`, and the regenerated `references/` copies. There is no
  artifact a fixture can be run through. The only test such a deliverable admits is a grep over the
  new section, which proves the string exists and not that the rule works; this repository has
  already paid for that mistake (`docs/reference/anti-patterns.md` — *assert behaviour, not source
  text*, which caught 0 of 27 defects on task.84).
  - **Fix applied:** §4, §6, §8 and §10 now require
    **`shared/resources/qa-diminishing-returns.js`** — a pure library, not a CLI, modelled on
    `shared/resources/review-report-freshness.js`, which solves the structurally identical problem
    (a prose gate whose verdict must be computable). New criterion 10 makes the module the thing
    every other criterion is asserted against. §9 additionally requires mutation-proving each
    condition.

#### Important
- **I3 — `qa.testArtifactGlobs` had no shape and no default.** Criterion 7 required "the fail-safe
  direction stated" while the key itself was undefined — glob strings or regexes? matched against
  what, how? default what?
  - **Fix applied:** Phase 2 now specifies a **list of glob strings**, matched against
    `top_issues[].file` interpreted as a **repo-relative path**, defaulting to **`[]`**. The empty
    default is what makes the fail-safe direction the default rather than an opt-out: an empty list
    can never satisfy condition 2, so an unconfigured consumer keeps today's behaviour exactly.

**Score: 8/10** (post-fix; 5/10 as filed)

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important
- **I2 — §7's exit bypassed 5c, the loop's designated exit gate.** The rule said *"do not run 5b;
  proceed to Step 7 with the current gate."* But the document this task edits states, in its own
  preamble, that *"There is one way the loop exits to Step 7: 5c returning APPROVE or CONCERNS"* —
  5c is the exit gate, and its conformance lens has no counterpart elsewhere in the pipeline (lite
  mode degrades it to `--effort low` rather than skipping it, for exactly this reason). As written,
  the diminishing-returns exit would have been the **only** path reaching Step 7 without a PR
  conformance review — a strictly weaker exit than a clean `PASS` takes.
  - **Fix applied:** the exit now **hands to 5c exactly as a `PASS` gate does**; only 5b is skipped.
    The rationale is written into §7 so the next reader cannot re-introduce the bypass as a
    simplification.

**Everything else is internally consistent.** The Overview, Motivation and §3 comparison table agree;
§5 (no breaking changes) is correct given the `[]` default; the Files Summary now matches the phases;
§10.3 correctly guards against the two instruments claiming the same run.

**Score: 8/10** (post-fix; 6/10 as filed)

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE — the strongest section of the document as filed.

The risk analysis is genuinely good: it names the direction of the risk ("this exit ends a loop
early, so a wrong rule ships work that a later cycle would have caught"), and each of the four
mitigations answers a specific failure rather than restating the risk. The `⚠️` note in §14 —
that the ~70 min saving is extrapolated from one run and should be re-measured — is the kind of
self-limiting statement most task documents omit.

### Issues

#### Optional
- **O1 — "verified by diff, not by assertion" named no diff.** Criterion 9 is the right criterion;
  it just had no mechanism.
  - **Fix applied:** it now asks for one — a test pinning the *Convergence check* section's content,
    or a recorded `git diff` over its line range in the PR.
- **O2 — Effort estimate.** `estimated_effort_hours: 6` predated the engine, the fixtures and the
  test file now in scope. Rubric against the revised document (12 success criteria, 5 phases, medium
  risk) lands nearer 9–10h.
  - **Fix applied:** raised to **9**.

The rollback plan was updated to cover the new files, and now names the cheaper partial rollback:
setting `qa.testArtifactGlobs: []` disarms the exit without deleting anything.

**Score: 9/10**

---

## Summary of Recommendations

### Must Fix (Critical) — 2 issues, both fixed

1. ✅ **C1** — Add `shared/resources/qa-diminishing-returns.js` (pure library, peer of
   `review-report-freshness.js`) plus `shared/resources/tests/qa-diminishing-returns.test.mjs`.
   Without it the Testing Strategy has no subject and the only available test is a grep.
2. ✅ **C2** — Vendor reconstructed fixtures under
   `shared/resources/tests/fixtures/qa-diminishing-returns/`, labelled as reconstructions; the
   tinker-city gates are in another repository and `task.103` here is a different task.

### Should Fix (Important) — 5 issues, 4 fixed

3. ✅ **I1** — Restate the preamble scope item against the current text (one exit → two).
4. ✅ **I2** — The exit hands to **5c**, not straight to Step 7.
5. ✅ **I3** — Specify `qa.testArtifactGlobs` as a glob list matched on repo-relative
   `top_issues[].file`, default `[]`.
6. ✅ **I4** — Verify `category:` against the real gate schema; an undeterminable category **fails**
   the condition.
7. ⏭ **I5** — No `github_issue:` linkage. **Not fixed by design** — creating a remote issue needs
   the opt-in prompt, which an autonomous run must not answer for the user.

### Consider (Optional) — 2 items, both fixed

8. ✅ **O1** — Name the diff mechanism for criterion 9.
9. ✅ **O2** — Effort 6h → 9h.

---

## Implementation Readiness Assessment

**Score:** 8/10 (as filed: 6/10)

**Scoring Breakdown:**

| Axis | As filed | Post-fix |
| :--- | :--- | :--- |
| Template Compliance | 9/10 | 9/10 |
| Technical Accuracy | 5/10 | 7/10 |
| Implementation Clarity | 5/10 | 8/10 |
| Consistency | 6/10 | 8/10 |
| Risk Management | 9/10 | 9/10 |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Both critical issues were structural rather than conceptual — the rule the task
describes is sound and correctly scoped; what was missing was an executable artifact to express it in
and honest fixtures to test it against. With those named, all twelve success criteria are now
verifiable by something other than reading the document back to itself.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Build **Phase 4 first, not last** — the module and one failing fixture — so every subsequent phase
   has something to prove itself against. The phase list is written 1→5 for narrative order, not
   execution order.
2. Write the prose section (Phase 1) as the contract the module implements, and keep the two in
   agreement; the section is what a pipeline reader executes.
3. Mutation-prove each of the three conditions before believing the tests hold them.
4. Confirm the new test file actually runs (`shared/resources/tests/*.test.mjs` is already in the
   `npm test` glob — confirm, do not assume; this repo has had 232 tests silently unrun).
5. Run `npm run bundle` and commit the regenerated `references/` copies (Phase 5).

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous — `develop-task` Step 2)
- **Review Date:** 2026-09-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.99.qa-loop-diminishing-returns-exit/task.99.qa-loop-diminishing-returns-exit.md`
- **Documents Consulted:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
  `shared/resources/review-report-freshness.js`, `docs/reference/configuration.md`,
  `skills-config.yaml`, `package.json`, `docs/tasks/task.103.pipeline-owns-the-registry-tick/`
- **Pre-pass subagents:** not dispatched — both axes checked in-line (see *User Decisions*)
